import { useState } from 'react';
import { Log, TodoItem, ParsedTimeEntry, ActiveSession } from '../types';
import { useData } from '../contexts/DataContext';
import { imageService } from '../services/imageService';
import { useNavigation } from '../contexts/NavigationContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useToast } from '../contexts/ToastContext';

export const useLogManager = () => {
    const { logs, setLogs, setTodos } = useData();
    const {
        setIsAddModalOpen,
        setEditingLog,
        setInitialLogTimes,
        currentDate
    } = useNavigation();
    const { categories } = useCategoryScope();
    const { addToast } = useToast();

    // Helper to close modal (local needed if we want to bundle actions)
    const closeModal = () => {
        setIsAddModalOpen(false);
        setEditingLog(null);
        setInitialLogTimes(null);
    };

    const handleSaveLog = (log: Log) => {
        const existingLog = logs.find(l => l.id === log.id);

        if (log.linkedTodoId || (existingLog && existingLog.linkedTodoId)) {
            setTodos(prevTodos => {
                const newTodos = [...prevTodos];

                // Revert Old Progress (if exists AND had link)
                if (existingLog && existingLog.linkedTodoId) {
                    const oldTodoIndex = newTodos.findIndex(t => t.id === existingLog.linkedTodoId);
                    if (oldTodoIndex > -1 && newTodos[oldTodoIndex].isProgress) {
                        newTodos[oldTodoIndex] = {
                            ...newTodos[oldTodoIndex],
                            completedUnits: Math.max(0, (newTodos[oldTodoIndex].completedUnits || 0) - (existingLog.progressIncrement || 0))
                        };
                    }
                }

                // Apply New Progress (if has link)
                if (log.linkedTodoId) {
                    const newTodoIndex = newTodos.findIndex(t => t.id === log.linkedTodoId);
                    if (newTodoIndex > -1 && newTodos[newTodoIndex].isProgress) {
                        newTodos[newTodoIndex] = {
                            ...newTodos[newTodoIndex],
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
            return [log, ...prev];
        });
        closeModal();
    };

    const handleDeleteLog = (id: string, shouldCloseModal = true) => {
        const logToDelete = logs.find(l => l.id === id);

        if (logToDelete?.linkedTodoId && logToDelete.progressIncrement) {
            setTodos(prevTodos => prevTodos.map(t => {
                if (t.id === logToDelete.linkedTodoId && t.isProgress) {
                    return {
                        ...t,
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
        if (shouldCloseModal) closeModal();
    };

    const handleQuickPunch = () => {
        const now = new Date();
        const endTimestamp = now.getTime();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayStartTimestamp = todayStart.getTime();

        const allLogs = [...logs].sort((a, b) => b.endTime - a.endTime);
        const lastLog = allLogs[0];

        let startTimestamp: number;

        if (lastLog) {
            if (lastLog.endTime > endTimestamp) {
                addToast('error', 'Cannot punch: Future logs exist.');
                return;
            }
            startTimestamp = Math.max(lastLog.endTime, todayStartTimestamp);
        } else {
            startTimestamp = todayStartTimestamp;
        }

        if (endTimestamp <= startTimestamp) {
            addToast('info', 'Already up to date.');
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

        setLogs(prev => [newLog, ...prev]);
        addToast('success', 'Quick Punch Recorded!');
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

        setLogs(prev => [...newLogs, ...prev]);
        addToast('success', `Successfully backfilled ${newLogs.length} logs!`);
    };

    const openAddModal = (startTime?: number, endTime?: number) => {
        setEditingLog(null);
        if (startTime && endTime) {
            // Gap filling: use provided times
            setInitialLogTimes({ start: startTime, end: endTime });
        } else {
            // New log from button: calculate smart defaults
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);

            const now = new Date();
            const isToday = dayStart.getDate() === now.getDate() &&
                dayStart.getMonth() === now.getMonth() &&
                dayStart.getFullYear() === now.getFullYear();

            let dayEnd: Date;
            if (isToday) {
                dayEnd = now;
            } else {
                dayEnd = new Date(currentDate);
                dayEnd.setHours(23, 59, 59, 999);
            }

            // Find the last log on the current day
            const logsOnDay = logs.filter(log =>
                log.endTime >= dayStart.getTime() &&
                log.endTime <= dayEnd.getTime()
            );

            let newStart = dayStart.getTime();

            if (logsOnDay.length > 0) {
                // Use the end time of the last log on this day
                newStart = logsOnDay.reduce((max, log) => Math.max(max, log.endTime), dayStart.getTime());
            }

            setInitialLogTimes({ start: newStart, end: dayEnd.getTime() });
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
