import React from 'react';
import { Trash2, AlertTriangle, Info } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = '确认',
    cancelText = '取消',
    type = 'danger'
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger':
                return <Trash2 size={24} className="text-red-500" />;
            case 'warning':
                return <AlertTriangle size={24} className="text-amber-500" />;
            case 'info':
                return <Info size={24} className="text-blue-500" />;
        }
    };

    const getIconBg = () => {
        switch (type) {
            case 'danger': return 'bg-red-100';
            case 'warning': return 'bg-amber-100';
            case 'info': return 'bg-blue-100';
        }
    };

    const getConfirmBtnClass = () => {
        switch (type) {
            case 'danger': return 'text-red-500 hover:bg-red-50 active:bg-red-100';
            case 'warning': return 'text-amber-500 hover:bg-amber-50 active:bg-amber-100';
            case 'info': return 'text-blue-500 hover:bg-blue-50 active:bg-blue-100';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center space-y-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${getIconBg()}`}>
                        {getIcon()}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-stone-900">{title}</h3>
                        <p className="text-stone-500 text-sm mt-2">
                            {description}
                        </p>
                    </div>
                </div>
                <div className="flex border-t border-stone-100">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 text-stone-600 font-medium hover:bg-stone-50 transition-colors active:bg-stone-100"
                    >
                        {cancelText}
                    </button>
                    <div className="w-px bg-stone-100"></div>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-4 font-medium transition-colors ${getConfirmBtnClass()}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
