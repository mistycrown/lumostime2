/**
 * @file useDeepLink.ts
 * @input CategoryScopeContext (categories), SessionContext (activeSessions), SettingsContext (autoLinkRules), DataContext (logs), ToastContext (addToast), handleQuickPunch callback, handleStartActivity callback, handleStopActivity callback
 * @output Deep Link Listener (appUrlOpen event handler), NFC Listener (nfcTagScanned event handler)
 * @pos Hook (System Integration)
 * @description 深度链接和 NFC Hook - 处理应用的深度链接和 NFC 标签扫描，支持快速打点和活动启动
 * 
 * 设计说明：
 * - 支持通过 URL Scheme 启动应用并执行操作
 * - 支持 NFC 标签扫描触发快速打点或活动切换
 * - 使用 ref 确保回调函数始终是最新版本
 * - 处理冷启动和热启动两种场景
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { NfcService } from '../services/NfcService';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useSession } from '../contexts/SessionContext';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { useLogManager } from './useLogManager'; // Need this for handleQuickPunch

export const useDeepLink = (
    handleQuickPunch: () => void,
    /* 
     * We need to pass the wrapped session handlers because App.tsx uses a wrapper 
     * that injects autoLinkRules and updates local state.
     */
    handleStartActivity: (activity: any, categoryId: string, todoId?: string, scopeIdOrIds?: string | string[], note?: string) => void,
    handleStopActivity: (sessionId: string) => void
) => {
    const { categories } = useCategoryScope();
    const { activeSessions } = useSession();
    const { logs } = useData(); // Used in dependency array in App.tsx
    const { autoLinkRules } = useSettings();
    const { addToast } = useToast();

    // Quick Punch Ref - 确保使用最新的回调函数
    const quickPunchRef = useRef(handleQuickPunch);
    useEffect(() => {
        quickPunchRef.current = handleQuickPunch;
    }, [handleQuickPunch]);

    useEffect(() => {
        const setupDeepLink = async () => {
            const listener = await CapacitorApp.addListener('appUrlOpen', (data) => {
                console.log('🔗 Deep Link received:', data.url);
                try {
                    const urlObj = new URL(data.url);

                    // Quick Punch Check
                    if (data.url.includes('action=quick_log')) {
                        console.log('⚡ Executing Quick Punch via Deep Link');
                        setTimeout(() => {
                            quickPunchRef.current();
                        }, 300);
                        return; // Done
                    }

                    // NFC/Other Deep Link Check
                    if (urlObj.protocol.includes('lumostime') && urlObj.host === 'record') {
                        const action = urlObj.searchParams.get('action');

                        if (action === 'quick_punch') {
                            quickPunchRef.current();
                            addToast('success', 'NFC: Quick Punch Recorded');
                        } else if (action === 'start') {
                            const catId = urlObj.searchParams.get('cat_id');
                            const actId = urlObj.searchParams.get('act_id');

                            if (catId && actId) {
                                const cat = categories.find(c => c.id === catId);
                                const act = cat?.activities.find(a => a.id === actId);

                                if (cat && act) {
                                    if (activeSessions.length > 0) {
                                        activeSessions.forEach(session => {
                                            handleStopActivity(session.id);
                                        });
                                    }
                                    handleStartActivity(act, cat.id);
                                    addToast('success', `NFC: Started ${act.name}`);
                                } else {
                                    addToast('error', 'NFC: Activity not found');
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('Deep link processing error', e);
                }
            });
            return listener;
        };

        const setupNfcScanListener = async () => {
            const listener = await NfcService.addListener('nfcTagScanned', (data: { type: string, value?: string }) => {
                console.log('NFC Scanned:', data);

                if (data.type === 'uri' && data.value) {
                    const urlObj = new URL(data.value);
                    if (urlObj.protocol.includes('lumostime') && urlObj.host === 'record') {
                        const action = urlObj.searchParams.get('action');

                        if (action === 'quick_punch') {
                            quickPunchRef.current();
                            addToast('success', 'NFC: Quick Punch Recorded');
                        } else if (action === 'start') {
                            const catId = urlObj.searchParams.get('cat_id');
                            const actId = urlObj.searchParams.get('act_id');
                            if (catId && actId) {
                                const cat = categories.find(c => c.id === catId);
                                const act = cat?.activities.find(a => a.id === actId);
                                if (cat && act) {
                                    const existingSession = activeSessions.find(s => s.activityId === actId);

                                    if (existingSession) {
                                        handleStopActivity(existingSession.id);
                                        addToast('success', `NFC: Stopped ${act.name}`);
                                    } else {
                                        if (activeSessions.length > 0) {
                                            activeSessions.forEach(session => handleStopActivity(session.id));
                                        }
                                        handleStartActivity(act, cat.id);
                                        addToast('success', `NFC: Started ${act.name}`);
                                    }
                                } else {
                                    addToast('error', 'NFC: Activity not found');
                                }
                            }
                        }
                    } else {
                        addToast('info', `NFC Scanned: ${data.value}`);
                    }
                } else {
                    addToast('info', 'NFC Tag Scanned (No actionable URI)');
                }
            });
            return listener;
        };

        let listenerHandle: any = null;
        let scanListenerHandle: any = null;

        setupDeepLink().then(h => listenerHandle = h);

        // Cold Start Check
        CapacitorApp.getLaunchUrl().then(url => {
            if (url && url.url.includes('action=quick_log')) {
                console.log('⚡ Launched with Quick Punch URL');
                setTimeout(() => {
                    quickPunchRef.current();
                }, 800);
            }
        });

        const platform = Capacitor.getPlatform();
        if (platform === 'android' || platform === 'ios') {
            setupNfcScanListener().then(h => scanListenerHandle = h);
        }

        return () => {
            if (listenerHandle) listenerHandle.remove();
            if (scanListenerHandle) scanListenerHandle.remove();
        };
    }, [categories, activeSessions, logs, autoLinkRules]); // Dependencies match App.tsx
};
