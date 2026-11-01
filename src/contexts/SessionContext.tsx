/**
 * @file SessionContext.tsx
 * @updated 2026-11-01: Persists timer edits immediately and publishes local attachments on completion.
 * @description 绠＄悊娲诲姩璁℃椂浼氳瘽鐨勭姸鎬佸拰閫昏緫
 * @updated 2026-08-26: Invokes the completion callback for every stopped session so Routine transitions wait for the current step's save path.
 * @updated 2026-09-12: Removes stopped sessions before Routine transition callbacks so repeated steps receive a live session ID.
 * @updated 2026-08-24: Preserves Activity custom attribute values when an active focus session becomes logs.
 * @updated 2026-06-21: Returns started session ids so app-awareness overlay workflows can keep overtime reminders and native prompts linked to the exact active session.
 * @updated 2026-05-14: Prevents duplicate active sessions for the same category/activity pair so repeated NFC/deep-link deliveries cannot leave one timer still running after the other is stopped.
 * @updated 2026-05-09: Syncs app-origin active sessions into the native notification plugin so Android can render timer labels in the persistent status notification.
 * @updated 2026-05-09: Removed direct floating-window mutations so the shared sync hook remains the single source of truth for Android focus-state reconciliation.
 */
import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { imageService } from '../services/imageService';
import { hasPendingSessionImages, waitForSessionImages } from '../utils/sessionImageOperations';
import { ActiveSession, Activity, AppAwarenessSessionMeta, AutoLinkRule } from '../types';
import { Capacitor } from '@capacitor/core';
import FocusNotification from '../plugins/FocusNotificationPlugin';
import {
    clearPersistedActiveSessions,
    loadPersistedActiveSessions,
    savePersistedActiveSessions
} from '../utils/sessionPersistence';

interface SessionContextType {
    activeSessions: ActiveSession[];
    setActiveSessions: React.Dispatch<React.SetStateAction<ActiveSession[]>>;
    focusDetailSessionId: string | null;
    setFocusDetailSessionId: React.Dispatch<React.SetStateAction<string | null>>;
    startActivity: (
        activity: Activity,
        categoryId: string,
        autoLinkRules: AutoLinkRule[],
        todoId?: string,
        scopeIdOrIds?: string | string[],
        note?: string,
        appAwarenessMeta?: AppAwarenessSessionMeta
    ) => string;
    stopActivity: (
        sessionId: string,
        finalSessionData?: Partial<ActiveSession>,
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
    const [activeSessions, setActiveSessionsState] = useState<ActiveSession[]>(() => loadPersistedActiveSessions());
    const activeSessionsRef = useRef(activeSessions);
    const [focusDetailSessionId, setFocusDetailSessionId] = useState<string | null>(null);

    // Persist before returning to native camera/background or accepting another update.
    // Using the ref also keeps async photo appends and same-tick stop actions current.
    const setActiveSessions = useCallback<React.Dispatch<React.SetStateAction<ActiveSession[]>>>((update) => {
        const next = typeof update === 'function' ? update(activeSessionsRef.current) : update;
        activeSessionsRef.current = next;
        if (next.length === 0) {
            clearPersistedActiveSessions();
        } else {
            savePersistedActiveSessions(next);
        }
        setActiveSessionsState(next);
    }, []);

    useEffect(() => {
        if (Capacitor.getPlatform() !== 'android') {
            return;
        }

        const sessions = activeSessions
            .filter((session) => session.source !== 'widget')
            .map((session) => ({
                id: session.id,
                label: session.activityName,
                startTime: session.startTime
            }));

        FocusNotification.syncActiveSessions({ sessions }).catch((error) => {
            console.error('Sync active sessions failed', error);
        });
    }, [activeSessions]);

    const startActivity = (
        activity: Activity,
        categoryId: string,
        autoLinkRules: AutoLinkRule[],
        todoId?: string,
        scopeIdOrIds?: string | string[],
        note?: string,
        appAwarenessMeta?: AppAwarenessSessionMeta
    ): string => {
        let appliedScopeIds: string[] | undefined;

        if (Array.isArray(scopeIdOrIds)) {
            appliedScopeIds = scopeIdOrIds;
        } else if (scopeIdOrIds) {
            appliedScopeIds = [scopeIdOrIds];
        }

        if ((!appliedScopeIds || appliedScopeIds.length === 0) && autoLinkRules.length > 0) {
            const matchingRules = autoLinkRules.filter((rule) => rule.activityId === activity.id);
            if (matchingRules.length > 0) {
                appliedScopeIds = matchingRules.map((rule) => rule.scopeId);
            }
        }

        const existingSameActivitySession = activeSessionsRef.current.find((session) =>
            session.activityId === activity.id
            && session.categoryId === categoryId
        );
        if (existingSameActivitySession) {
            return existingSameActivitySession.id;
        }

        const resolvedStartTime = appAwarenessMeta?.startedAt && Number.isFinite(appAwarenessMeta.startedAt)
            ? appAwarenessMeta.startedAt
            : Date.now();

        const newSession: ActiveSession = {
            id: crypto.randomUUID(),
            activityId: activity.id,
            categoryId,
            activityName: activity.name,
            activityIcon: activity.icon,
            activityUiIcon: activity.uiIcon,
            startTime: resolvedStartTime,
            linkedTodoId: todoId,
            scopeIds: appliedScopeIds,
            note,
            source: 'app',
            appAwarenessMeta
        };

        setActiveSessions((prev) => {
            const existingSession = prev.find((session) =>
                session.activityId === activity.id
                && session.categoryId === categoryId
            );

            if (existingSession) {
                return prev;
            }

            return [...prev, newSession];
        });

        return newSession.id;
    };

    const stopActivity = (
        sessionId: string,
        finalSessionData?: Partial<ActiveSession>,
        onSaveLog?: (logs: any[]) => void,
        onUpdateTodo?: (linkedTodoId: string, progressIncrement: number) => void
    ) => {
        if (hasPendingSessionImages(sessionId)) {
            void waitForSessionImages(sessionId).then(() => {
                stopActivity(sessionId, finalSessionData, onSaveLog, onUpdateTodo);
            });
            return;
        }
        const session = activeSessionsRef.current.find((item) => item.id === sessionId);
        let logs: any[] = [];
        if (session) {
            const endTime = Date.now();
            const duration = (endTime - session.startTime) / 1000;

            const images = session.images ?? finalSessionData?.images;
            if (duration > 1 || images?.length) {
                const baseLog = {
                    activityId: session.activityId,
                    categoryId: session.categoryId,
                    startTime: session.startTime,
                    endTime,
                    duration,
                    linkedTodoId: session.linkedTodoId,
                    title: finalSessionData?.title || session.title,
                    note: finalSessionData?.note || session.note,
                    images,
                    attributeValues: finalSessionData?.attributeValues || session.attributeValues,
                    progressIncrement: finalSessionData?.progressIncrement,
                    focusScore: finalSessionData?.focusScore || session.focusScore,
                    moodScore: finalSessionData?.moodScore || session.moodScore,
                    scopeIds: session.scopeIds,
                    reactions: finalSessionData?.reactions || session.reactions,
                    appAwarenessMeta: finalSessionData?.appAwarenessMeta || session.appAwarenessMeta
                };

                logs = splitLogByDays(baseLog);

                logs.forEach((log, index) => {
                    if (index > 0) {
                        delete log.progressIncrement;
                    }
                });

                if (
                    !onSaveLog &&
                    logs[0].progressIncrement &&
                    logs[0].progressIncrement > 0 &&
                    session.linkedTodoId &&
                    onUpdateTodo
                ) {
                    onUpdateTodo(session.linkedTodoId, logs[0].progressIncrement);
                }

            }

            // Remove the old session before invoking Routine's transition callback.
            // Otherwise a repeated activity can be deduplicated to this session ID,
            // which is immediately removed after the callback and cannot be stopped.
            setActiveSessions((prev) => prev.filter((item) => item.id !== sessionId));

            if (onSaveLog) {
                onSaveLog(logs);
            }
            if (logs.length > 0) {
                images?.forEach((filename) => imageService.addToReferencedList(filename));
            }
        } else {
            setActiveSessions((prev) => prev.filter((item) => item.id !== sessionId));
        }

        if (focusDetailSessionId === sessionId) {
            setFocusDetailSessionId(null);
        }
    };

    const cancelSession = (sessionId: string) => {
        setActiveSessions((prev) => prev.filter((item) => item.id !== sessionId));
        if (focusDetailSessionId === sessionId) {
            setFocusDetailSessionId(null);
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
