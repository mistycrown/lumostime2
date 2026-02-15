/**
 * @file MoodPicker.tsx
 * @description 心情选择器组件 - 用于每日回顾
 */
import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import { IconRenderer } from './IconRenderer';

// 心情 emoji 列表（参考图片中的样式）
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

interface MoodPickerProps {
    selectedMood?: string;
    onSelect: (emoji: string) => void;
    onClear?: () => void;
}

export const MoodPicker: React.FC<MoodPickerProps> = ({ selectedMood, onSelect, onClear }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={containerRef}>
            {/* 触发按钮 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                    selectedMood
                        ? 'bg-stone-100 hover:bg-stone-200'
                        : 'bg-white border border-stone-200 hover:border-stone-300'
                }`}
                title="选择今日心情"
            >
                {selectedMood ? (
                    <span className="text-2xl">
                        <IconRenderer icon={selectedMood} />
                    </span>
                ) : (
                    <Smile size={20} className="text-stone-400" />
                )}
            </button>

            {/* 心情选择器弹窗 */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-stone-100 p-6 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right w-80">
                    <h3 className="text-center text-stone-400 text-xs font-bold tracking-widest mb-6">
                        SELECT YOUR MOOD
                    </h3>

                    {/* Emoji 网格 */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        {MOOD_EMOJIS.map(({ emoji, label }) => (
                            <button
                                key={emoji}
                                onClick={() => {
                                    onSelect(emoji);
                                    setIsOpen(false);
                                }}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:bg-stone-50 ${
                                    selectedMood === emoji ? 'bg-stone-100 ring-2 ring-stone-300' : ''
                                }`}
                            >
                                <span className="text-4xl">
                                    <IconRenderer icon={emoji} />
                                </span>
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
                                setIsOpen(false);
                            }}
                            className="w-full text-center text-red-400 hover:text-red-500 text-sm font-medium py-2 transition-colors"
                        >
                            CLEAR MOOD
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
