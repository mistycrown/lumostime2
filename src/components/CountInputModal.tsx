/**
 * @file CountInputModal.tsx
 * @description Modal for inputting custom count value for check items
 */
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface CountInputModalProps {
    isOpen: boolean;
    currentCount: number;
    targetCount: number;
    itemContent: string;
    onClose: () => void;
    onConfirm: (count: number) => void;
}

export const CountInputModal: React.FC<CountInputModalProps> = ({
    isOpen,
    currentCount,
    targetCount,
    itemContent,
    onClose,
    onConfirm
}) => {
    const [inputValue, setInputValue] = useState(currentCount.toString());

    useEffect(() => {
        if (isOpen) {
            setInputValue(currentCount.toString());
        }
    }, [isOpen, currentCount]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        const value = parseInt(inputValue, 10);
        if (!isNaN(value) && value >= 0 && value <= targetCount) {
            onConfirm(value);
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleConfirm();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 px-4" onClick={onClose}>
            <div 
                className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-stone-900 mb-1">设置次数</h3>
                        <p className="text-sm text-stone-500">{itemContent}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-stone-400 hover:text-stone-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                            当前次数 / 目标次数
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="0"
                                max={targetCount}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="flex-1 px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent text-center text-lg font-medium"
                                autoFocus
                            />
                            <span className="text-stone-400 text-lg">/</span>
                            <div className="w-20 px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-center text-lg font-medium text-stone-600">
                                {targetCount}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
                        >
                            确定
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
