/**
 * @file InputModal.tsx
 * @description A modal dialog for text input with validation
 * @input title, placeholder, validation rules
 * @output User input text
 * @pos Component (Modal)
 */
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface InputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: string) => void;
    title: string;
    placeholder?: string;
    initialValue?: string;
    maxLength?: number;
    validateFn?: (value: string) => string | null; // Returns error message or null
}

export const InputModal: React.FC<InputModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    placeholder = '',
    initialValue = '',
    maxLength = 50,
    validateFn
}) => {
    const [value, setValue] = useState(initialValue);
    const [error, setError] = useState<string | null>(null);

    // Reset value when modal opens
    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
            setError(null);
        }
    }, [isOpen, initialValue]);

    const handleConfirm = () => {
        const trimmedValue = value.trim();
        
        // Validate only on confirm
        if (validateFn) {
            const errorMsg = validateFn(trimmedValue);
            if (errorMsg) {
                setError(errorMsg);
                return;
            }
        }

        onConfirm(trimmedValue);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleConfirm();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    // Check if input is valid (not empty after trimming)
    const isValid = value.trim().length > 0;

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="bg-[#fdfbf7] w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-8 pb-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-stone-800">{title}</h3>
                        <button
                            onClick={onClose}
                            className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
                            aria-label="关闭"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Input Field */}
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => {
                                setValue(e.target.value);
                                // Clear error when user types
                                if (error) setError(null);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            maxLength={maxLength}
                            autoFocus
                            className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 transition-all"
                            aria-label={title}
                            aria-invalid={!!error}
                            aria-describedby={error ? 'input-error' : 'char-count'}
                        />
                        
                        {/* Character Count and Error */}
                        <div className="flex items-center justify-between text-xs">
                            {error ? (
                                <span id="input-error" className="text-red-500 font-medium" role="alert">
                                    {error}
                                </span>
                            ) : (
                                <span className="text-stone-400">
                                    {/* Empty space to maintain layout */}
                                </span>
                            )}
                            <span id="char-count" className="text-stone-400">
                                {value.length}/{maxLength}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-5 bg-white border-t border-stone-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold hover:bg-stone-50 transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!isValid}
                        className={`flex-1 py-3.5 rounded-2xl font-bold transition-all ${
                            isValid
                                ? 'bg-stone-800 text-white hover:bg-stone-900 hover:scale-[1.01] active:scale-[0.99] shadow-lg'
                                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        }`}
                    >
                        确认
                    </button>
                </div>
            </div>
        </div>
    );
};
