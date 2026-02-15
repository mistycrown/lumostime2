/**
 * @file MoodPicker.tsx
 * @description 心情选择器组件 - 用于每日回顾（全屏模态框样式）
 * 支持 emoji 和自定义贴纸组
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconRenderer } from './IconRenderer';
import { stickerService } from '../services/stickerService';
import { useSettings } from '../contexts/SettingsContext';

// 默认心情 emoji 列表（只存储 emoji，不需要 label）
const DEFAULT_MOOD_EMOJIS = [
    '🤩', '🥰', '😎', '😊', '😌', '😐', 
    '😴', '😰', '☹️', '😠', '🤢', '😖', 
    '🤗', '😇', '🥳'
];

// 从 localStorage 获取当前选中的 emoji 组
const getMoodEmojis = () => {
    const groupId = localStorage.getItem('lumostime_mood_emoji_group') || 'default-moods';
    const customGroups = localStorage.getItem('lumostime_custom_emoji_groups');
    
    // 预设组
    const presetGroups: Record<string, string[]> = {
        'default-moods': DEFAULT_MOOD_EMOJIS,
        'activities': [
            '📚', '💼', '🎨', '🎵', '🏃', '🧘', 
            '🍳', '🎮', '📺', '✈️', '🛌', '☕', 
            '🍕', '🎉', '💪'
        ]
    };
    
    // 检查是否是预设组
    if (presetGroups[groupId]) {
        return presetGroups[groupId];
    }
    
    // 检查自定义组
    if (customGroups) {
        try {
            const groups = JSON.parse(customGroups);
            const group = groups.find((g: any) => g.id === groupId);
            if (group) {
                return group.emojis;
            }
        } catch (e) {
            console.error('Failed to parse custom emoji groups:', e);
        }
    }
    
    return DEFAULT_MOOD_EMOJIS;
};

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
    const { defaultSelectorPage } = useSettings();
    const [isCustomMode, setIsCustomMode] = React.useState(false);
    const [customEmoji, setCustomEmoji] = React.useState('');
    const [moodEmojis, setMoodEmojis] = useState(getMoodEmojis());
    
    // 获取 sticker sets
    const [stickerSets, setStickerSets] = useState(stickerService.getAllStickerSets());
    
    // 根据 defaultSelectorPage 计算初始页面索引
    const getInitialPageIndex = () => {
        if (defaultSelectorPage === 'emoji') {
            return 0;
        }
        // 查找对应的 sticker set 索引
        const stickerIndex = stickerSets.findIndex(set => set.id === defaultSelectorPage);
        // 如果找到，返回索引 + 1（因为 0 是 emoji 页）；否则返回 0
        return stickerIndex >= 0 ? stickerIndex + 1 : 0;
    };
    
    // 页面切换状态
    const [currentPageIndex, setCurrentPageIndex] = useState(getInitialPageIndex());
    
    // 总页数 = 1 (Emoji) + N (Sticker sets)
    const totalPages = 1 + stickerSets.length;

    // 当 modal 打开时，重置到默认页面
    useEffect(() => {
        if (isOpen) {
            setCurrentPageIndex(getInitialPageIndex());
            setIsCustomMode(false);
            setCustomEmoji('');
        }
    }, [isOpen, defaultSelectorPage]);

    // 监听 emoji 组和贴纸集变化
    useEffect(() => {
        const handleGroupChange = () => {
            setMoodEmojis(getMoodEmojis());
        };
        
        const handleStickerSetsChange = () => {
            setStickerSets(stickerService.getAllStickerSets());
        };
        
        window.addEventListener('moodEmojiGroupChanged', handleGroupChange);
        window.addEventListener('stickerSetsChanged', handleStickerSetsChange);
        
        return () => {
            window.removeEventListener('moodEmojiGroupChanged', handleGroupChange);
            window.removeEventListener('stickerSetsChanged', handleStickerSetsChange);
        };
    }, []);
    
    // 获取当前页面标题
    const getCurrentPageTitle = () => {
        if (currentPageIndex === 0) {
            return 'Emoji';
        }
        const stickerSetIndex = currentPageIndex - 1;
        return stickerSets[stickerSetIndex]?.name || 'Stickers';
    };
    
    // 获取当前页面描述
    const getCurrentPageDescription = () => {
        if (currentPageIndex === 0) {
            return null;
        }
        const stickerSetIndex = currentPageIndex - 1;
        return stickerSets[stickerSetIndex]?.description;
    };
    
    // 上一页
    const goToPreviousPage = () => {
        setCurrentPageIndex(Math.max(0, currentPageIndex - 1));
    };
    
    // 下一页
    const goToNextPage = () => {
        setCurrentPageIndex(Math.min(totalPages - 1, currentPageIndex + 1));
    };

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
                <p className="text-center text-stone-400 text-xs font-bold tracking-widest mb-4">
                    SELECT YOUR MOOD
                </p>

                {/* 页面导航 */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={goToPreviousPage}
                        disabled={currentPageIndex === 0}
                        className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    >
                        <span className="text-xl">←</span>
                    </button>
                    
                    <div className="text-center flex-1">
                        <h3 className="text-sm font-bold text-stone-800">
                            {getCurrentPageTitle()}
                        </h3>
                        {getCurrentPageDescription() && (
                            <p className="text-xs text-stone-400 mt-0.5">
                                {getCurrentPageDescription()}
                            </p>
                        )}
                    </div>
                    
                    <button
                        onClick={goToNextPage}
                        disabled={currentPageIndex === totalPages - 1}
                        className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    >
                        <span className="text-xl">→</span>
                    </button>
                </div>

                {!isCustomMode ? (
                    <>
                        {/* Emoji 页面 (currentPageIndex === 0) */}
                        {currentPageIndex === 0 && (
                            <div className="grid grid-cols-4 gap-2 mb-6">
                                {moodEmojis.map((emoji) => (
                                    <button
                                        key={emoji}
                                        onClick={() => {
                                            onSelect(emoji);
                                            onClose();
                                        }}
                                        className="flex items-center justify-center p-2 transition-all hover:bg-stone-50 rounded-2xl relative"
                                    >
                                        {/* Emoji 容器 */}
                                        <div className="relative flex items-center justify-center w-14 h-14">
                                            <span className="text-4xl flex items-center justify-center">
                                                <IconRenderer icon={emoji} />
                                            </span>
                                        </div>
                                    </button>
                                ))}

                                {/* 自定义按钮 */}
                                <button
                                    onClick={() => setIsCustomMode(true)}
                                    className="flex items-center justify-center p-2 transition-all hover:bg-stone-50 rounded-2xl relative border-2 border-dashed border-stone-300"
                                >
                                    <div className="relative flex items-center justify-center w-14 h-14">
                                        <span className="text-3xl text-stone-400">+</span>
                                    </div>
                                </button>
                            </div>
                        )}

                        {/* Sticker 页面 (currentPageIndex > 0) */}
                        {currentPageIndex > 0 && (
                            <>
                                {(() => {
                                    const stickerSetIndex = currentPageIndex - 1;
                                    const currentStickerSet = stickerSets[stickerSetIndex];
                                    
                                    if (!currentStickerSet) {
                                        return (
                                            <div className="text-center py-12 text-stone-400">
                                                <p className="text-sm">贴纸集不存在</p>
                                            </div>
                                        );
                                    }
                                    
                                    return (
                                        <div className="grid grid-cols-4 gap-2 mb-6 max-h-[320px] overflow-y-auto">
                                            {currentStickerSet.stickers.map((sticker) => {
                                                const stickerIcon = `image:${sticker.path}`;
                                                const isSelected = selectedMood === stickerIcon;
                                                
                                                return (
                                                    <button
                                                        key={sticker.path}
                                                        onClick={() => {
                                                            onSelect(stickerIcon);
                                                            onClose();
                                                        }}
                                                        className="flex flex-col items-center justify-center gap-1 p-2 transition-all hover:bg-stone-50 rounded-2xl relative"
                                                    >
                                                        {/* 贴纸容器 */}
                                                        <div className="relative flex items-center justify-center w-14 h-14">
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <IconRenderer icon={stickerIcon} size="100%" />
                                                            </div>
                                                        </div>
                                                        {/* 贴纸标签（可选） */}
                                                        {sticker.label && (
                                                            <span className="text-[9px] text-stone-400 font-medium">
                                                                {sticker.label}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </>
                        )}

                        {/* 页码指示器 */}
                        <div className="flex justify-center gap-1 mb-4">
                            {Array.from({ length: totalPages }).map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentPageIndex(index)}
                                    className={`h-2 rounded-full transition-all ${
                                        index === currentPageIndex
                                            ? 'bg-stone-800 w-6'
                                            : 'bg-stone-300 hover:bg-stone-400 w-2'
                                    }`}
                                />
                            ))}
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
