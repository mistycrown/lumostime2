/**
 * @file SessionContext.tsx
 * @description 管理活动计时会话的状态和逻辑
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ActiveSession, Activity, AutoLinkRule } from '../types';
import { Capacitor } from '@capacitor/core';
import FocusNotification from '../plugins/FocusNotificationPlugin';
import {
    clearPersistedActiveSessions,
    loadPersistedActiveSessions,
    savePersistedActiveSessions
} from '../utils/sessionPersistence';

interface SessionContextType {
    // 会话状态
    activeSessions: ActiveSession[];
    setActiveSessions: React.Dispatch<React.SetStateAction<ActiveSession[]>>;

    focusDetailSessionId: string | null;
    setFocusDetailSessionId: React.Dispatch<React.SetStateAction<string | null>>;

    // 会话操作
    startActivity: (
        activity: Activity,
        categoryId: string,
        autoLinkRules: AutoLinkRule[],
        todoId?: string,
        scopeIdOrIds?: string | string[],
        note?: string
    ) => void;

    stopActivity: (
        sessionId: string,
        finalSessionData?: ActiveSession,
        onSaveLog?: (logs: any[]) => void,
        onUpdateTodo?: (linkedTodoId: string, progressIncrement: number) => void
    ) => void;

    cancelSession: (sessionId: string) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = () => {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
};

interface SessionProviderProps {
    children: ReactNode;
    splitLogByDays: (baseLog: any) => any[];
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children, splitLogByDays }) => {
    const [activeSessions, setActiveSessions] = useState<ActiveSession[]>(() => loadPersistedActiveSessions());
    const [focusDetailSessionId, setFocusDetailSessionId] = useState<string | null>(null);

    useEffect(() => {
        if (activeSessions.length === 0) {
            clearPersistedActiveSessions();
            return;
        }

        savePersistedActiveSessions(activeSessions);
    }, [activeSessions]);

    const startActivity = (
        activity: Activity,
        categoryId: string,
        autoLinkRules: AutoLinkRule[],
        todoId?: string,
        scopeIdOrIds?: string | string[],
        note?: string
    ) => {
        let appliedScopeIds: string[] | undefined;

        if (Array.isArray(scopeIdOrIds)) {
            appliedScopeIds = scopeIdOrIds;
        } else if (scopeIdOrIds) {
            appliedScopeIds = [scopeIdOrIds];
        }

        // 应用自动关联规则
        if ((!appliedScopeIds || appliedScopeIds.length === 0) && autoLinkRules.length > 0) {
            const matchingRules = autoLinkRules.filter(rule => rule.activityId === activity.id);
            if (matchingRules.length > 0) {
                appliedScopeIds = matchingRules.map(rule => rule.scopeId);
            }
        }

        const newSession: ActiveSession = {
            id: crypto.randomUUID(),
            activityId: activity.id,
            categoryId: categoryId,
            activityName: activity.name,
            activityIcon: activity.icon,
            activityUiIcon: activity.uiIcon,
            startTime: Date.now(),
            linkedTodoId: todoId,
            scopeIds: appliedScopeIds,
            note: note,
            source: 'app'
        };

        setActiveSessions(prev => [...prev, newSession]);

        // Android 浮动窗口更新
        if (Capacitor.getPlatform() === 'android') {
            const floatingWindowEnabled = localStorage.getItem('floating_window_enabled') === 'true';
            if (floatingWindowEnabled && newSession && newSession.startTime) {
                FocusNotification.updateFloatingWindow({
                    icon: activity.icon,
                    isFocusing: true,
                    startTime: newSession.startTime.toString(),
                    sessionId: newSession.id
                }).catch((e) => console.error("Update FW failed", e));
            }
        }
    };

    const stopActivity = (
        sessionId: string,
        finalSessionData?: ActiveSession,
        onSaveLog?: (logs: any[]) => void,
        onUpdateTodo?: (linkedTodoId: string, progressIncrement: number) => void
    ) => {
        const session = activeSessions.find(s => s.id === sessionId);
        if (session) {
            const endTime = Date.now();
            const duration = (endTime - session.startTime) / 1000;

            if (duration > 1) {
                const baseLog = {
                    activityId: session.activityId,
                    categoryId: session.categoryId,
                    startTime: session.startTime,
                    endTime: endTime,
                    duration: duration,
                    linkedTodoId: session.linkedTodoId,
                    title: finalSessionData?.title || session.title,
                    note: finalSessionData?.note || session.note,
                    progressIncrement: finalSessionData?.progressIncrement,
                    focusScore: finalSessionData?.focusScore || session.focusScore,
                    moodScore: finalSessionData?.moodScore || session.moodScore,
                    scopeIds: session.scopeIds,
                    reactions: finalSessionData?.reactions || session.reactions
                };

                const logs = splitLogByDays(baseLog);

                // 跨天拆分时，进度增量只应保留在首条日志，避免重复累计
                logs.forEach((log, index) => {
                    if (index > 0) {
                        delete log.progressIncrement;
                    }
                });

                // 仅在未提供日志保存回调时，才使用直接更新待办进度作为兜底
                if (
                    !onSaveLog &&
                    logs[0].progressIncrement &&
                    logs[0].progressIncrement > 0 &&
                    session.linkedTodoId &&
                    onUpdateTodo
                ) {
                    onUpdateTodo(session.linkedTodoId, logs[0].progressIncrement);
                }

                // 保存日志
                if (onSaveLog) {
                    onSaveLog(logs);
                }
            }
        }

        setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
        if (focusDetailSessionId === sessionId) {
            setFocusDetailSessionId(null);
        }

        // Android 浮动窗口恢复 - 仅在用户启用悬浮球时更新
        if (Capacitor.getPlatform() === 'android') {
            const floatingWindowEnabled = localStorage.getItem('floating_window_enabled') === 'true';
            if (floatingWindowEnabled) {
                FocusNotification.updateFloatingWindow({ isFocusing: false }).catch(() => { });
            }
        }
    };

    const cancelSession = (sessionId: string) => {
        setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
        if (focusDetailSessionId === sessionId) {
            setFocusDetailSessionId(null);
        }

        // Android 浮动窗口恢复 - 仅在用户启用悬浮球时更新
        if (Capacitor.getPlatform() === 'android') {
            const floatingWindowEnabled = localStorage.getItem('floating_window_enabled') === 'true';
            if (floatingWindowEnabled) {
                FocusNotification.updateFloatingWindow({ isFocusing: false }).catch(() => { });
            }
        }
    };

    return (
        <SessionContext.Provider value={{
            activeSessions,
            setActiveSessions,
            focusDetailSessionId,
            setFocusDetailSessionId,
            startActivity,
            stopActivity,
            cancelSession
        }}>
            {children}
        </SessionContext.Provider>
    );
};
