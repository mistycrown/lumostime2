/**
 * @file MoodPicker.tsx
 * @description 心情选择器组件 - 用于每日回顾（全屏模态框样式）
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
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
    { emoji: '😖', label: 'Awful' },
    { emoji: '🤗', label: 'Grateful' },
    { emoji: '😇', label: 'Blessed' },
    { emoji: '🥳', label: 'Excited' }
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
    const [isCustomMode, setIsCustomMode] = React.useState(false);
    const [customEmoji, setCustomEmoji] = React.useState('');

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
                {/* 关闭按钮 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-all"
                    aria-label="关闭"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* 标题 */}
                <h2 className="text-2xl font-bold text-stone-900 text-center mb-2">
                    How was {formatDate(date)}?
                </h2>

                {/* 副标题 */}
                <p className="text-center text-stone-400 text-xs font-bold tracking-widest mb-8">
                    SELECT YOUR MOOD
                </p>

                {!isCustomMode ? (
                    <>
                        {/* Emoji 网格 - 15 个预设 + 1 个自定义 */}
                        <div className="grid grid-cols-4 gap-2 mb-6">
                            {MOOD_EMOJIS.map(({ emoji, label }) => (
                                <button
                                    key={emoji}
                                    onClick={() => {
                                        onSelect(emoji);
                                        onClose();
                                    }}
                                    className="flex flex-col items-center justify-center gap-1 p-2 transition-all hover:bg-stone-50 rounded-2xl relative"
                                >
                                    {/* Emoji 容器 - 选中时显示圆形边框 */}
                                    <div className="relative flex items-center justify-center w-14 h-14">
                                        {selectedMood === emoji && (
                                            <div className="absolute inset-0 border-4 border-stone-300 rounded-full"></div>
                                        )}
                                        <span className="text-4xl flex items-center justify-center">
                                            <IconRenderer icon={emoji} />
                                        </span>
                                    </div>
                                    <span className="text-[9px] text-stone-400 font-medium">
                                        {label}
                                    </span>
                                </button>
                            ))}

                            {/* 自定义按钮 */}
                            <button
                                onClick={() => setIsCustomMode(true)}
                                className="flex flex-col items-center justify-center gap-1 p-2 transition-all hover:bg-stone-50 rounded-2xl relative border-2 border-dashed border-stone-300"
                            >
                                <div className="relative flex items-center justify-center w-14 h-14">
                                    <span className="text-3xl text-stone-400">+</span>
                                </div>
                                <span className="text-[9px] text-stone-400 font-medium">
                                    Custom
                                </span>
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* 自定义 Emoji 输入 */}
                        <div className="mb-8 space-y-4">
                            <div className="text-center">
                                <p className="text-sm text-stone-600 mb-4">输入你的自定义 emoji</p>
                                <input
                                    type="text"
                                    value={customEmoji}
                                    onChange={(e) => setCustomEmoji(e.target.value)}
                                    className="w-full text-center text-5xl bg-stone-50 border-2 border-stone-200 rounded-2xl py-6 outline-none focus:border-stone-400 transition-colors"
                                    placeholder=""
                                    maxLength={2}
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setIsCustomMode(false);
                                        setCustomEmoji('');
                                    }}
                                    className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-colors"
                                >
                                    返回
                                </button>
                                <button
                                    onClick={() => {
                                        if (customEmoji.trim()) {
                                            onSelect(customEmoji.trim());
                                            setIsCustomMode(false);
                                            setCustomEmoji('');
                                            onClose();
                                        }
                                    }}
                                    disabled={!customEmoji.trim()}
                                    className="flex-1 py-3 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    确认
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* 清除按钮 */}
                {!isCustomMode && selectedMood && onClear && (
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
