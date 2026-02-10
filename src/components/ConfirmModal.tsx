/**
 * @file ConfirmModal.tsx
 * @input title, description, actions
 * @output Confirmation Dialog
 * @pos Component (Modal)
 * @description A generic modal for confirming user actions (e.g., delete, archive) with configurable types (danger, warning, info).
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useRef } from 'react';
import { Trash2, AlertTriangle, Info, X } from 'lucide-react';

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
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    // Keyboard support: ESC to close, Enter to confirm
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                onConfirm();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, onConfirm]);

    // Focus management: auto-focus confirm button when modal opens
    useEffect(() => {
        if (isOpen && confirmButtonRef.current) {
            confirmButtonRef.current.focus();
        }
    }, [isOpen]);

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
            case 'danger': return 'bg-red-50';
            case 'warning': return 'bg-amber-50';
            case 'info': return 'bg-blue-50';
        }
    };

    const getConfirmBtnClass = () => {
        switch (type) {
            case 'danger': return 'bg-white border border-red-200 text-red-500 hover:bg-red-50 shadow-sm';
            case 'warning': return 'bg-white border border-amber-200 text-amber-500 hover:bg-amber-50 shadow-sm';
            case 'info': return 'bg-white border border-blue-200 text-blue-500 hover:bg-blue-50 shadow-sm';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#fdfbf7] w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header / Content Wrapper */}
                <div className="p-8 flex flex-col items-center text-center">

                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${getIconBg()}`}>
                        {getIcon()}
                    </div>

                    <h3 className="text-xl font-bold text-stone-800 mb-3">{title}</h3>

                    <div className="text-stone-500 leading-relaxed whitespace-pre-wrap text-left text-sm max-h-[50vh] overflow-y-auto w-full bg-stone-50 p-3 rounded-lg border border-stone-100 select-all">
                        {description}
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-5 bg-white border-t border-stone-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold hover:bg-stone-50 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        ref={confirmButtonRef}
                        onClick={onConfirm}
                        className={`flex-1 py-3.5 rounded-2xl font-bold hover:scale-[1.01] active:scale-[0.99] transition-transform shadow-xl ${getConfirmBtnClass()}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
