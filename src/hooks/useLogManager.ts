/**
 * @file useLogManager.ts
 * @input DataContext (logs, setLogs, setTodos), NavigationContext (modal states, currentDate), CategoryScopeContext (categories), ToastContext (addToast)
 * @output Log CRUD Operations (handleSaveLog, handleDeleteLog, handleQuickPunch, handleBatchAddLogs), Modal Control (openAddModal, openEditModal, closeModal), Image Management (handleLogImageRemove)
 * @pos Hook (Data Manager)
 * @description 日志数据管理 Hook - 处理日志的增删改查、快速打点、批量添加、图片管理等操作，并统一维护 NFC 快速打点的文案与时间补记逻辑。时间戳由 DataContext 自动管理。
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 * @updated 2026-07-30: Blocks deletion of recurring auto-Plan logs while their Repeat todo auto-Plan switch remains enabled.
 * @updated 2026-08-10: Excluded timeline Plan blocks from smart backfill defaults and quick-punch start inference.
 * @updated 2026-06-06: Added hard-field duplicate protection for new log insertions so floating-window stop races cannot append identical timeline records twice.
 * @updated 2026-05-16: Dispatches a shared assistant log-submission event only for brand-new logs so post-save AI triggers can ignore edits.
 * @updated 2026-05-10: Let callers override the date used for backfill defaults so widget supplement-log launches can force today even when the timeline was left on an older day.
 */
import { useState } from 'react';
import { Log, TodoItem, ParsedTimeEntry, ActiveSession } from '../types';
import { useData } from '../contexts/DataContext';
import { imageService } from '../services/imageService';
import { useNavigation } from '../contexts/NavigationContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { getTodoProgressTrackingMode } from '../utils/todoProgressUtils';
import {
    dispatchAssistantLogSubmittedEvent,
    isNewLogInsertion
} from '../utils/assistantLogSubmissionTrigger';
import {
    hasHardDuplicateLog,
    prependLogsWithDedupe
} from '../utils/logInsertionUtils';
import { isAutoRecurringPlanDeleteLocked } from '../utils/todoRecurringPlanUtils';
import { filterActualLogs, getLatestActualLogEndTimeInRange } from '../utils/statLogUtils';

export const useLogManager = () => {
    const { logs, todos, setLogs, setTodos } = useData();
    const {
        setIsAddModalOpen,
        setEditingLog,
        setInitialLogTimes,
        currentDate
    } = useNavigation();
    const { categories } = useCategoryScope();
    const { addToast } = useToast();
    // Note: updateDataLastModified removed - DataContext automatically tracks changes

    const notifySkippedDuplicateLogs = (count: number) => {
        if (count > 0) {
            addToast('info', `已跳过 ${count} 条重复记录`);
        }
    };

    // Helper to close modal (local needed if we want to bundle actions)
    const closeModal = () => {
        setIsAddModalOpen(false);
        setEditingLog(null);
        setInitialLogTimes(null);
    };

    const handleSaveLog = (log: Log) => {
        const existingLog = logs.find(l => l.id === log.id);
        const shouldDispatchAssistantTrigger = isNewLogInsertion(existingLog);
        const isDuplicateInsertion = shouldDispatchAssistantTrigger && hasHardDuplicateLog(logs, log);

        if (log.linkedTodoId || (existingLog && existingLog.linkedTodoId)) {
            setTodos(prevTodos => {
                const newTodos = [...prevTodos];

                // Revert Old Progress (if exists AND had link)
                if (existingLog && existingLog.linkedTodoId) {
                    const oldTodoIndex = newTodos.findIndex(t => t.id === existingLog.linkedTodoId);
                    if (oldTodoIndex > -1 && getTodoProgressTrackingMode(newTodos[oldTodoIndex], newTodos) === 'manual') {
                        newTodos[oldTodoIndex] = {
                            ...newTodos[oldTodoIndex],
                            isProgress: true,
                            progressTrackingMode: 'manual',
                            completedUnits: Math.max(0, (newTodos[oldTodoIndex].completedUnits || 0) - (existingLog.progressIncrement || 0))
                        };
                    }
                }

                // Apply New Progress (if has link)
                if (log.linkedTodoId) {
                    const newTodoIndex = newTodos.findIndex(t => t.id === log.linkedTodoId);
                    if (newTodoIndex > -1 && getTodoProgressTrackingMode(newTodos[newTodoIndex], newTodos) === 'manual') {
                        newTodos[newTodoIndex] = {
                            ...newTodos[newTodoIndex],
                            isProgress: true,
                            progressTrackingMode: 'manual',
                            completedUnits: Math.max(0, (newTodos[newTodoIndex].completedUnits || 0) + (log.progressIncrement || 0))
                        };
                    }
                }
                return newTodos;
            });
        }

        setLogs(prev => {
            const exists = prev.find(l => l.id === log.id);
            if (exists) {
                return prev.map(l => l.id === log.id ? log : l);
            }
            const insertionResult = prependLogsWithDedupe(prev, [log]);
            return insertionResult.skippedLogs.length > 0 ? prev : insertionResult.logs;
        });
        // Timestamp automatically updated by DataContext
        closeModal();

        if (isDuplicateInsertion) {
            notifySkippedDuplicateLogs(1);
            return;
        }

        if (shouldDispatchAssistantTrigger) {
            dispatchAssistantLogSubmittedEvent({ log });
        }
    };

    const handleDeleteLog = (id: string, shouldCloseModal = true) => {
        const logToDelete = logs.find(l => l.id === id);
        const linkedTodo = logToDelete?.linkedTodoId
            ? todos.find((todo) => todo.id === logToDelete.linkedTodoId)
            : null;

        if (logToDelete && isAutoRecurringPlanDeleteLocked(logToDelete, linkedTodo)) {
            addToast('info', '该循环计划已锁定，取消自动生成后可删除。');
            if (shouldCloseModal) closeModal();
            return;
        }

        if (logToDelete?.linkedTodoId && logToDelete.progressIncrement) {
            setTodos(prevTodos => prevTodos.map(t => {
                if (t.id === logToDelete.linkedTodoId && getTodoProgressTrackingMode(t, prevTodos) === 'manual') {
                    return {
                        ...t,
                        isProgress: true,
                        progressTrackingMode: 'manual',
                        completedUnits: Math.max(0, (t.completedUnits || 0) - (logToDelete.progressIncrement || 0))
                    };
                }
                return t;
            }));
        }

        if (logToDelete?.images && logToDelete.images.length > 0) {
            logToDelete.images.forEach(img => {
                imageService.deleteImage(img).catch(err => console.error('Failed to cleanup image file:', img, err));
            });
        }

        setLogs(prev => prev.filter(l => l.id !== id));
        // Timestamp automatically updated by DataContext
        if (shouldCloseModal) closeModal();
    };

    /**
     * 快速打点功能
     * 
     * 逻辑说明：
     * 1. 获取当前时间作为结束时间
     * 2. 查找最后一条日志的结束时间作为开始时间
     * 3. 如果最后一条日志在未来，则报错
     * 4. 如果最后一条日志在今天之前，则从今天 00:00 开始
     * 5. 创建一个新的"快速打点"日志填充时间间隙
     */
    const handleQuickPunch = () => {
        const now = new Date();
        const endTimestamp = now.getTime();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayStartTimestamp = todayStart.getTime();

        const lastLog = filterActualLogs(logs).sort((a, b) => b.endTime - a.endTime)[0];

        let startTimestamp: number;

        if (lastLog) {
            if (lastLog.endTime > endTimestamp) {
                addToast('error', '无法快速打点：存在未来时间的记录');
                return;
            }
            startTimestamp = Math.max(lastLog.endTime, todayStartTimestamp);
        } else {
            startTimestamp = todayStartTimestamp;
        }

        if (endTimestamp <= startTimestamp) {
            addToast('info', '当前没有需要补记的时间');
            return;
        }

        const newLog: Log = {
            id: crypto.randomUUID(),
            categoryId: 'uncategorized',
            activityId: 'quick_punch',
            title: '快速打点',
            startTime: startTimestamp,
            endTime: endTimestamp,
            duration: (endTimestamp - startTimestamp) / 1000,
            note: ''
        };

        let quickPunchSkippedCount = 0;
        setLogs(prev => {
            const insertionResult = prependLogsWithDedupe(prev, [newLog]);
            quickPunchSkippedCount = insertionResult.skippedLogs.length;
            return insertionResult.logs;
        });
        // Timestamp automatically updated by DataContext
        if (quickPunchSkippedCount > 0) {
            notifySkippedDuplicateLogs(quickPunchSkippedCount);
            return;
        }
        addToast('success', '快速打点已记录');
    };

    const handleBatchAddLogs = (entries: ParsedTimeEntry[]) => {
        const newLogs: Log[] = entries.map(entry => {
            let cat = categories.find(c => c.name === entry.categoryName);
            if (!cat) cat = categories.find(c => c.name.includes(entry.categoryName)) || categories[0];

            let act = cat.activities.find(a => a.name === entry.activityName);
            if (!act) act = cat.activities.find(a => a.name.includes(entry.activityName)) || cat.activities[0];

            const actId = act?.id || 'unknown';
            const start = new Date(entry.startTime).getTime();
            const end = new Date(entry.endTime).getTime();
            const duration = (end - start) / 1000;

            return {
                id: crypto.randomUUID(),
                categoryId: cat.id,
                activityId: actId,
                title: act?.name || 'Unknown',
                startTime: start,
                endTime: end,
                duration: duration,
                note: entry.description,
                ...(entry.scopeIds && entry.scopeIds.length > 0 ? { scopeIds: entry.scopeIds } : {})
            };
        });

        let skippedCount = 0;
        let insertedCount = 0;
        setLogs(prev => {
            const insertionResult = prependLogsWithDedupe(prev, newLogs);
            skippedCount = insertionResult.skippedLogs.length;
            insertedCount = insertionResult.insertedLogs.length;
            return insertionResult.logs;
        });
        // Timestamp automatically updated by DataContext
        if (insertedCount > 0) {
            addToast('success', `Successfully backfilled ${insertedCount} logs!`);
        }
        notifySkippedDuplicateLogs(skippedCount);
    };

    const openAddModal = (
        startTime?: number,
        endTime?: number,
        prefilledData?: { categoryId?: string; activityId?: string; linkedTodoId?: string },
        referenceDate?: Date
    ) => {
        setEditingLog(null);
        if (startTime && endTime) {
            // Gap filling or backfill: use provided times
            setInitialLogTimes({ start: startTime, end: endTime, prefilledData });
        } else {
            // New log from button: calculate smart defaults
            const effectiveDate = referenceDate || currentDate;
            const dayStart = new Date(effectiveDate);
            dayStart.setHours(0, 0, 0, 0);

            const now = new Date();
            const isToday = dayStart.getDate() === now.getDate() &&
                dayStart.getMonth() === now.getMonth() &&
                dayStart.getFullYear() === now.getFullYear();

            let dayEnd: Date;
            if (isToday) {
                dayEnd = now;
            } else {
                dayEnd = new Date(effectiveDate);
                dayEnd.setHours(23, 59, 59, 999);
            }

            // Find the last log on the current day
            const latestActualLogEndTime = getLatestActualLogEndTimeInRange(
                logs,
                dayStart.getTime(),
                dayEnd.getTime()
            );

            let newStart = dayStart.getTime();

            if (latestActualLogEndTime !== undefined) {
                // Use the end time of the latest actual log on this day.
                newStart = latestActualLogEndTime;
            }

            setInitialLogTimes({ start: newStart, end: dayEnd.getTime(), prefilledData });
        }
        setIsAddModalOpen(true);
    };

    const openEditModal = (log: Log) => {
        setEditingLog(log);
        setInitialLogTimes(null);
        setIsAddModalOpen(true);
    };

    const handleLogImageRemove = (logId: string, filename: string) => {
        setLogs(prev => prev.map(log =>
            log.id === logId && log.images && log.images.includes(filename)
                ? { ...log, images: log.images.filter(img => img !== filename) }
                : log
        ));
        // Timestamp automatically updated by DataContext
    };

    return {
        handleSaveLog,
        handleDeleteLog,
        handleQuickPunch,
        handleBatchAddLogs,
        openAddModal,
        openEditModal,
        closeModal,
        handleLogImageRemove
    };
};
