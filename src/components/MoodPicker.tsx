/**
 * @file MoodPicker.tsx
 * @description 心情选择器组件 - 用于每日回顾（全屏模态框样式）
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { IconRenderer } from './IconRenderer';

// 心情 emoji 列表（参考 Daylio 样式）
export const MOOD_EMOJIS = [
    { emoji: '🤩', label: 'Radical' },
    { emoji: '🥰', label: 'Loved' },
    { emoji: '😎', label: 'Proud' },
    { emoji: '😊', label: 'Happy' },
    { emoji: '😌', label: 'Calm' },
    { emoji: '😐', label: 'Meh' },
    { emoji: '😴', label: 'Tired' },
    { emoji: '😰', label: 'Anxious' },
    { emoji: '☹️', label: 'Sad' },
    { emoji: '😠', label: 'Angry' },
    { emoji: '🤢', label: 'Sick' },
    { emoji: '😖', label: 'Awful' }
];

interface MoodPickerModalProps {
    isOpen: boolean;
    date: string; // YYYY-MM-DD 格式
    selectedMood?: string;
    onSelect: (emoji: string) => void;
    onClear?: () => void;
    onClose: () => void;
}

export const MoodPickerModal: React.FC<MoodPickerModalProps> = ({
    isOpen,
    date,
    selectedMood,
    onSelect,
    onClear,
    onClose
}) => {
    if (!isOpen) return null;

    // 格式化日期显示为中国格式：YYYY/MM/DD
    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    };

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-[90%] max-w-md p-8 animate-in zoom-in-95 duration-200 relative">
                {/* 标题 */}
                <h2 className="text-2xl font-bold text-stone-900 text-center mb-2">
                    How was {formatDate(date)}?
                </h2>

                {/* 副标题 */}
                <p className="text-center text-stone-400 text-xs font-bold tracking-widest mb-8">
                    SELECT YOUR MOOD
                </p>

                {/* Emoji 网格 */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {MOOD_EMOJIS.map(({ emoji, label }) => (
                        <button
                            key={emoji}
                            onClick={() => {
                                onSelect(emoji);
                                onClose();
                            }}
                            className="flex flex-col items-center justify-center gap-2 p-4 transition-all hover:bg-stone-50 rounded-2xl relative"
                        >
                            {/* Emoji 容器 - 选中时显示圆形边框 */}
                            <div className="relative flex items-center justify-center w-16 h-16">
                                {selectedMood === emoji && (
                                    <div className="absolute inset-0 border-4 border-stone-300 rounded-full"></div>
                                )}
                                <span className="text-5xl flex items-center justify-center">
                                    <IconRenderer icon={emoji} />
                                </span>
                            </div>
                            <span className="text-[10px] text-stone-400 font-medium">
                                {label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* 清除按钮 */}
                {selectedMood && onClear && (
                    <button
                        onClick={() => {
                            onClear();
                            onClose();
                        }}
                        className="w-full text-center text-red-400 hover:text-red-500 text-sm font-bold tracking-wider py-3 transition-colors"
                    >
                        CLEAR LOG
                    </button>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
