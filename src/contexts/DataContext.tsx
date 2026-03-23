/**
 * @file DataContext.tsx
 * @description 管理应用核心数据状态（logs, todos, todoCategories）及其持久化逻辑
 */
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Log, TodoItem, TodoCategory } from '../types';
import { INITIAL_LOGS, INITIAL_TODOS, MOCK_TODO_CATEGORIES } from '../constants';
import { storage, USER_DATA_KEYS } from '../constants/storageKeys';

interface DataContextType {
    // Logs 状态
    logs: Log[];
    setLogs: React.Dispatch<React.SetStateAction<Log[]>>;

    // Todos 状态
    todos: TodoItem[];
    setTodos: React.Dispatch<React.SetStateAction<TodoItem[]>>;

    // Todo Categories 状态
    todoCategories: TodoCategory[];
    setTodoCategories: React.Dispatch<React.SetStateAction<TodoCategory[]>>;

    // Local Modification Timestamp
    localDataTimestamp: number;
    setLocalDataTimestamp: React.Dispatch<React.SetStateAction<number>>;

    // Control Function
    disableTimestampUpdateRef: React.MutableRefObject<boolean>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Load from localStorage or use initial data
    const [logs, setLogs] = useState<Log[]>(() => {
        return storage.getJSON<Log[]>(USER_DATA_KEYS.LOGS, INITIAL_LOGS) || INITIAL_LOGS;
    });

    const [todos, setTodos] = useState<TodoItem[]>(() => {
        const stored = storage.getJSON<TodoItem[]>(USER_DATA_KEYS.TODOS);
        if (stored) {
            return stored;
        }
        return INITIAL_TODOS.map(todo => {
            if (!todo.isProgress) return todo;
            // Systemic Fix: Recalculate progress from logs to ensure consistency
            const calculatedProgress = INITIAL_LOGS
                .filter(log => log.linkedTodoId === todo.id)
                .reduce((acc, log) => acc + (log.progressIncrement || 0), 0);
            return { ...todo, completedUnits: calculatedProgress };
        });
    });

    const [todoCategories, setTodoCategories] = useState<TodoCategory[]>(() => {
        return storage.getJSON<TodoCategory[]>(USER_DATA_KEYS.TODO_CATEGORIES, MOCK_TODO_CATEGORIES) || MOCK_TODO_CATEGORIES;
    });

    // Local Timestamp State
    const [localDataTimestamp, setLocalDataTimestamp] = useState<number>(() => {
        const stored = storage.get(USER_DATA_KEYS.LOCAL_TIMESTAMP);
        return stored ? Number(stored) : Date.now();
    });

    // Control ref to prevent timestamp updates during restore
    const disableTimestampUpdateRef = useRef(false);

    // Refs to skip initial render updates
    const isFirstRun = useRef(true);

    // 持久化 logs 到 localStorage
    useEffect(() => {
        storage.setJSON(USER_DATA_KEYS.LOGS, logs);
    }, [logs]);

    // 持久化 todos 到 localStorage
    useEffect(() => {
        storage.setJSON(USER_DATA_KEYS.TODOS, todos);
    }, [todos]);

    // 持久化 todoCategories 到 localStorage
    useEffect(() => {
        storage.setJSON(USER_DATA_KEYS.TODO_CATEGORIES, todoCategories);
    }, [todoCategories]);

    // 监控数据变化并更新时间戳
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        // Check if we should update timestamp
        if (disableTimestampUpdateRef.current) {
            // Skip update if disabled
            console.log('[DataContext] Skipping timestamp update (locked during restore)');
            return;
        }

        // 任何数据变化都更新时间戳
        const now = Date.now();
        setLocalDataTimestamp(now);
        storage.set(USER_DATA_KEYS.LOCAL_TIMESTAMP, now.toString());
        console.log(`[DataContext] Data changed, updated local timestamp: ${localDataTimestamp} -> ${now} (${new Date(now).toLocaleTimeString()})`);
    }, [logs, todos, todoCategories]);

    return (
        <DataContext.Provider value={{
            logs,
            setLogs,
            todos,
            setTodos,
            todoCategories,
            setTodoCategories,
            localDataTimestamp,
            setLocalDataTimestamp,
            disableTimestampUpdateRef
        }}>
            {children}
        </DataContext.Provider>
    );
};
