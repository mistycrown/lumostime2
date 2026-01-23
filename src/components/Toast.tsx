/**
 * @file Toast.tsx
 * @input toast messages list
 * @output Notification Overlay
 * @pos Component (Global UI)
 * @description Renders a stack of temporary notification toasts (success, error, info) with optional actions.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastContainerProps {
    toasts: ToastMessage[];
    onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
    return (
        <div className="fixed top-[calc(1rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
    useEffect(() => {
        // If there is an action, we might want to keep it longer or until interaction?
        // For now, keep standard 5s if action, 3s otherwise.
        const duration = toast.action ? 8000 : 3000;
        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, duration);
        return () => clearTimeout(timer);
    }, [toast.id, onRemove, toast.action]);

    const icons = {
        success: <CheckCircle size={18} className="text-green-500" />,
        error: <AlertCircle size={18} className="text-red-500" />,
        info: <Info size={18} className="text-blue-500" />,
        warning: <AlertCircle size={18} className="text-amber-500" />
    };

    const bgColors = {
        success: 'bg-white border-green-100',
        error: 'bg-white border-red-100',
        info: 'bg-white border-blue-100',
        warning: 'bg-white border-amber-100'
    };

    return (
        <div className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${bgColors[toast.type]} animate-in slide-in-from-top-2 fade-in duration-300 min-w-[300px]`}>
            <div className="shrink-0">{icons[toast.type]}</div>
            <p className="text-sm font-medium text-stone-700 flex-1">{toast.message}</p>

            {toast.action && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toast.action?.onClick();
                        onRemove(toast.id);
                    }}
                    className="px-3 py-1 bg-stone-800 text-white text-xs rounded-lg hover:bg-stone-700 transition-colors whitespace-nowrap shadow-sm active:scale-95"
                >
                    {toast.action.label}
                </button>
            )}

            <button onClick={() => onRemove(toast.id)} className="text-stone-400 hover:text-stone-600">
                <X size={16} />
            </button>
        </div>
    );
};
