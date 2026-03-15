/**
 * @file useDeepLink.ts
 * @input CategoryScopeContext (categories), SessionContext (activeSessions), ReviewContext (daily reviews and templates), ToastContext (addToast), callbacks for quick punch and activity control
 * @output Deep Link Listener (appUrlOpen event handler), NFC Listener (nfcTagScanned event handler)
 * @pos Hook (System Integration)
 * @description Handles app deep links and NFC scans. Supports quick punch, activity start/stop, and NFC daily-check actions.
 */
import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { NfcService } from '../services/NfcService';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useSession } from '../contexts/SessionContext';
import { useReview } from '../contexts/ReviewContext';
import { useToast } from '../contexts/ToastContext';
import { getLocalDateStr } from '../utils/dateUtils';
import { applyDailyCheckActionForDate } from '../utils/dailyCheckUtils';

export const useDeepLink = (
    handleQuickPunch: () => void,
    handleStartActivity: (activity: any, categoryId: string, todoId?: string, scopeIdOrIds?: string | string[], note?: string) => void,
    handleStopActivity: (sessionId: string) => void
) => {
    const { categories } = useCategoryScope();
    const { activeSessions } = useSession();
    const { dailyReviews, setDailyReviews, checkTemplates, reviewTemplates } = useReview();
    const { addToast } = useToast();

    const quickPunchRef = useRef(handleQuickPunch);
    useEffect(() => {
        quickPunchRef.current = handleQuickPunch;
    }, [handleQuickPunch]);

    useEffect(() => {
        const handleDailyCheck = (checkItemId: string) => {
            const result = applyDailyCheckActionForDate({
                dateStr: getLocalDateStr(new Date()),
                dailyReviews,
                checkTemplates,
                reviewTemplates,
                checkItemId,
                actionMode: 'complete_once'
            });

            if (result.updatedReviews) {
                setDailyReviews(result.updatedReviews);
            }

            if (result.status === 'not_found') {
                addToast('error', 'NFC 标签配置已失效，请重新写入');
                return;
            }

            if (result.status === 'unsupported_type') {
                addToast('error', '该日课类型暂不支持 NFC 打卡');
                return;
            }

            if (result.status === 'already_completed') {
                addToast('info', '今日已完成，无需重复打卡');
                return;
            }

            if (result.status === 'limit_reached') {
                addToast('info', '今日已达到最大次数');
                return;
            }

            if (result.status === 'incremented' || result.status === 'completed') {
                const content = result.item?.content || '日课';
                if (result.item?.manualMode === 'count') {
                    addToast(
                        'success',
                        `已打卡：${content}（${result.item.currentCount || 0}/${result.item.targetCount || 1}）`
                    );
                    return;
                }

                addToast('success', `已完成：${content}`);
            }
        };

        const handleStartAction = (catId: string, actId: string, toggleExisting: boolean) => {
            const category = categories.find(entry => entry.id === catId);
            const activity = category?.activities.find(entry => entry.id === actId);

            if (!category || !activity) {
                addToast('error', 'NFC: Activity not found');
                return;
            }

            const existingSession = activeSessions.find(session => session.activityId === actId);
            if (toggleExisting && existingSession) {
                handleStopActivity(existingSession.id);
                addToast('success', `NFC: Stopped ${activity.name}`);
                return;
            }

            if (activeSessions.length > 0) {
                activeSessions.forEach(session => handleStopActivity(session.id));
            }

            handleStartActivity(activity, category.id);
            addToast('success', `NFC: Started ${activity.name}`);
        };

        const handleRecordUrl = (urlObj: URL, toggleExistingActivity: boolean) => {
            if (!(urlObj.protocol.includes('lumostime') && urlObj.host === 'record')) {
                return false;
            }

            const action = urlObj.searchParams.get('action');
            if (action === 'quick_punch') {
                quickPunchRef.current();
                addToast('success', 'NFC: Quick Punch Recorded');
                return true;
            }

            if (action === 'start') {
                const catId = urlObj.searchParams.get('cat_id');
                const actId = urlObj.searchParams.get('act_id');
                if (catId && actId) {
                    handleStartAction(catId, actId, toggleExistingActivity);
                }
                return true;
            }

            if (action === 'daily_check') {
                const checkItemId = urlObj.searchParams.get('check_item_id');
                if (checkItemId) {
                    handleDailyCheck(checkItemId);
                } else {
                    addToast('error', 'NFC 标签配置缺少日课目标');
                }
                return true;
            }

            return false;
        };

        const setupDeepLink = async () => {
            const listener = await CapacitorApp.addListener('appUrlOpen', (data) => {
                console.log('Deep Link received:', data.url);
                try {
                    if (data.url.includes('action=quick_log')) {
                        setTimeout(() => {
                            quickPunchRef.current();
                        }, 300);
                        return;
                    }

                    const urlObj = new URL(data.url);
                    handleRecordUrl(urlObj, false);
                } catch (error) {
                    console.error('Deep link processing error', error);
                }
            });

            return listener;
        };

        const setupNfcScanListener = async () => {
            const listener = await NfcService.addListener('nfcTagScanned', (data: { type: string; value?: string }) => {
                console.log('NFC Scanned:', data);

                if (data.type !== 'uri' || !data.value) {
                    addToast('info', 'NFC Tag Scanned (No actionable URI)');
                    return;
                }

                try {
                    const urlObj = new URL(data.value);
                    const handled = handleRecordUrl(urlObj, true);
                    if (!handled) {
                        addToast('info', `NFC Scanned: ${data.value}`);
                    }
                } catch (error) {
                    console.error('NFC URL parse error', error);
                    addToast('info', `NFC Scanned: ${data.value}`);
                }
            });

            return listener;
        };

        let listenerHandle: any = null;
        let scanListenerHandle: any = null;

        setupDeepLink().then(handle => {
            listenerHandle = handle;
        });

        CapacitorApp.getLaunchUrl().then(url => {
            if (url && url.url.includes('action=quick_log')) {
                setTimeout(() => {
                    quickPunchRef.current();
                }, 800);
            }
        });

        const platform = Capacitor.getPlatform();
        if (platform === 'android' || platform === 'ios') {
            setupNfcScanListener().then(handle => {
                scanListenerHandle = handle;
            });
        }

        return () => {
            if (listenerHandle) listenerHandle.remove();
            if (scanListenerHandle) scanListenerHandle.remove();
        };
    }, [activeSessions, addToast, categories, checkTemplates, dailyReviews, handleStartActivity, handleStopActivity, reviewTemplates, setDailyReviews]);
};
