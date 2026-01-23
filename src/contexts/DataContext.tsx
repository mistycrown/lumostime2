/**
 * @file DataContext.tsx
 * @description 管理应用核心数据状态（logs, todos, todoCategories）及其持久化逻辑
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Log, TodoItem, TodoCategory } from '../types';
import { INITIAL_LOGS, INITIAL_TODOS, MOCK_TODO_CATEGORIES } from '../constants';

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
        const stored = localStorage.getItem('lumostime_logs');
        return stored ? JSON.parse(stored) : INITIAL_LOGS;
    });

    const [todos, setTodos] = useState<TodoItem[]>(() => {
        const stored = localStorage.getItem('lumostime_todos');
        if (stored) {
            return JSON.parse(stored);
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
        const stored = localStorage.getItem('lumostime_todoCategories');
        return stored ? JSON.parse(stored) : MOCK_TODO_CATEGORIES;
    });

    // 持久化 logs 到 localStorage
    useEffect(() => {
        localStorage.setItem('lumostime_logs', JSON.stringify(logs));
    }, [logs]);

    // 持久化 todos 到 localStorage
    useEffect(() => {
        localStorage.setItem('lumostime_todos', JSON.stringify(todos));
    }, [todos]);

    // 持久化 todoCategories 到 localStorage
    useEffect(() => {
        localStorage.setItem('lumostime_todoCategories', JSON.stringify(todoCategories));
    }, [todoCategories]);

    return (
        <DataContext.Provider value={{
            logs,
            setLogs,
            todos,
            setTodos,
            todoCategories,
            setTodoCategories
        }}>
            {children}
        </DataContext.Provider>
    );
};
