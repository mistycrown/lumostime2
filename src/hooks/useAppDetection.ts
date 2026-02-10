/**
 * @file useAppDetection.ts
 * @input SessionContext (activeSessions), SettingsContext (appRules), CategoryScopeContext (categories), ToastContext (addToast), handleStartActivity callback
 * @output App Detection Listener (startFocusFromPrompt event handler)
 * @pos Hook (System Integration)
 * @description 应用检测 Hook - 监听悬浮球触发的应用启动事件，自动关联并启动对应的活动计时
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSession } from '../contexts/SessionContext';
import { useSettings } from '../contexts/SettingsContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useToast } from '../contexts/ToastContext';

export const useAppDetection = (
    handleStartActivity: (activity: any, categoryId: string, todoId?: string, scopeIdOrIds?: string | string[], note?: string) => void
) => {
    const { activeSessions } = useSession();
    const { appRules } = useSettings();
    const { categories } = useCategoryScope();
    const { addToast } = useToast();
    const lastPromptTimeRef = useRef(0);

    useEffect(() => {
        const setupAppDetectionListener = () => {
            const handleStartFromPrompt = (event: any) => {
                try {
                    const now = Date.now();
                    if (now - lastPromptTimeRef.current < 3000) {
                        console.log('⏳ 忽略重复点击事件 (Debounced)');
                        return;
                    }
                    lastPromptTimeRef.current = now;

                    console.log('📥 收到悬浮球开始计时事件:', event);

                    let packageName = '';
                    let appLabel = '';
                    let realAppName = '';
                    let eventActivityId = '';

                    if (event.detail) {
                        const data = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail;
                        packageName = data.packageName;
                        appLabel = data.appLabel;
                        realAppName = data.realAppName;
                        eventActivityId = data.activityId;
                    } else {
                        // Keep compatibility with potential raw events
                        packageName = event.packageName;
                        appLabel = event.appLabel;
                        realAppName = event.realAppName;
                        eventActivityId = event.activityId;
                    }

                    if (!packageName) {
                        console.warn('⚠️ packageName为空');
                        return;
                    }

                    console.log('🚀 开始计时:', packageName, appLabel, realAppName, eventActivityId);

                    const activityId = eventActivityId || appRules[packageName];
                    if (activityId) {
                        let foundCat = null;
                        let foundAct = null;
                        for (const cat of categories) {
                            const act = cat.activities.find(a => a.id === activityId);
                            if (act) {
                                foundCat = cat;
                                foundAct = act;
                                break;
                            }
                        }

                        if (foundCat && foundAct) {
                            console.log(`✅ 找到关联活动: ${foundAct.name}, 准备开始...`);
                            const appNameForNote = realAppName || appLabel || packageName;
                            handleStartActivity(foundAct, foundCat.id, undefined, undefined, `关联启动: ${appNameForNote}`);
                            addToast('success', `已开始: ${foundAct.name}`);
                        } else {
                            console.warn('⚠️ 未找到关联的Activity:', activityId);
                        }
                    } else {
                        console.warn('⚠️ 未找到应用关联规则:', packageName);
                    }

                } catch (e) {
                    console.error('处理开始计时事件失败:', e);
                }
            };

            window.addEventListener('startFocusFromPrompt', handleStartFromPrompt);
            return () => {
                window.removeEventListener('startFocusFromPrompt', handleStartFromPrompt);
            };
        };

        const platform = Capacitor.getPlatform();
        if (platform === 'android') {
            const cleanup = setupAppDetectionListener();
            return cleanup;
        }
    }, [activeSessions, appRules, categories]);
};
