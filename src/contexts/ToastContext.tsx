/**
 * @file ToastContext.tsx
 * @input Toast messages (type, message, action)
 * @output Toast display operations, Toast removal
 * @pos Context (UI Feedback)
 * @description Toast 消息上下文 - 管理全局的 Toast 消息显示
 * 
 * 核心功能：
 * - Toast 消息队列管理
 * - 添加/移除 Toast
 * - 支持操作按钮
 * - 自动消失机制
 * 
 * Toast 类型：
 * - success: 成功消息
 * - error: 错误消息
 * - info: 信息提示
 * - warning: 警告消息
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ToastContainer, ToastMessage, ToastType } from '../components/Toast';

interface ToastContextType {
    addToast: (type: ToastType, message: string, action?: { label: string, onClick: () => void }) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((type: ToastType, message: string, action?: { label: string, onClick: () => void }) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, type, message, action }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
};
