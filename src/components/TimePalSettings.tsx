/**
 * @file TimePalSettings.tsx
 * @description 时光小友设置组件 - 可在多个页面复用
 * 
 * 功能：
 * 1. 选择小动物类型
 * 2. 统计时长设置 - 限定标签筛选（仅统计选中活动标签的时间）
 * 3. 自定义名言功能
 */
import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Category } from '../types';
import { TIMEPAL_OPTIONS, TimePalType, getTimePalEmoji } from '../constants/timePalConfig';
import { TIMEPAL_KEYS, storage } from '../constants/storageKeys';

interface TimePalSettingsProps {
    categories: Category[];
    /** 是否显示为卡片样式（带边框和阴影） */
    asCard?: boolean;
}

export const TimePalSettings: React.FC<TimePalSettingsProps> = ({ categories, asCard = false }) => {
    // 当前选择的小动物类型（'none' 表示不使用）
    const [selectedType, setSelectedType] = useState<TimePalType | 'none'>(() => {
        const saved = storage.get(TIMEPAL_KEYS.TYPE);
        if (!saved || saved === 'none') return 'none';
        return saved as TimePalType;
    });

    // 是否启用标签筛选
    const [isFilterEnabled, setIsFilterEnabled] = useState<boolean>(() => {
        return storage.getBoolean(TIMEPAL_KEYS.FILTER_ENABLED, false);
    });

    // 选中的标签 ID 列表
    const [filterActivityIds, setFilterActivityIds] = useState<string[]>(() => {
        return storage.getJSON<string[]>(TIMEPAL_KEYS.FILTER_ACTIVITIES, []);
    });

    // 当前选择的分类 ID（用于展开活动列表）
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

    // 自定义名言功能
    const [customQuotesEnabled, setCustomQuotesEnabled] = useState<boolean>(() => {
        return storage.getBoolean(TIMEPAL_KEYS.CUSTOM_QUOTES_ENABLED, false);
    });

    const [customQuotes, setCustomQuotes] = useState<string>(() => {
        const quotes = storage.getJSON<string[]>(TIMEPAL_KEYS.CUSTOM_QUOTES, []);
        return quotes.join('\n');
    });

    // 保存小动物类型
    const handleSelectType = (type: TimePalType | 'none') => {
        setSelectedType(type);
        storage.set(TIMEPAL_KEYS.TYPE, type);
        window.dispatchEvent(new Event('timepal-type-changed'));
    };

    // 保存筛选设置
    useEffect(() => {
        storage.setBoolean(TIMEPAL_KEYS.FILTER_ENABLED, isFilterEnabled);
    }, [isFilterEnabled]);

    useEffect(() => {
        storage.setJSON(TIMEPAL_KEYS.FILTER_ACTIVITIES, filterActivityIds);
    }, [filterActivityIds]);

    // 保存自定义名言设置
    useEffect(() => {
        storage.setBoolean(TIMEPAL_KEYS.CUSTOM_QUOTES_ENABLED, customQuotesEnabled);
    }, [customQuotesEnabled]);

    const handleCustomQuotesChange = (value: string) => {
        setCustomQuotes(value);
        // 将文本按行分割，过滤空行
        const quotesArray = value.split('\n').map(q => q.trim()).filter(q => q.length > 0);
        storage.setJSON(TIMEPAL_KEYS.CUSTOM_QUOTES, quotesArray);
    };

    const containerClass = asCard ? 'space-y-6' : 'space-y-6';

    return (
        <div className={containerClass}>
            {/* 选择小动物 - 自适应网格布局 */}
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))' }}>
                {/* 不使用选项 */}
                <button
                    onClick={() => handleSelectType('none')}
                    className={`relative rounded-lg border-2 transition-all overflow-hidden ${
                        selectedType === 'none'
                            ? 'border-stone-400 ring-2 ring-stone-200'
                            : 'border-stone-200 hover:border-stone-300'
                    }`}
                    style={{ aspectRatio: '4/5' }}
                >
                    <div className="w-full h-full flex items-center justify-center p-1">
                        <span className="text-xs text-stone-400">不使用</span>
                    </div>
                    {selectedType === 'none' && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg">
                            <Check size={12} className="text-white" />
                        </div>
                    )}
                </button>
                
                {TIMEPAL_OPTIONS.map(option => {
                    const isSelected = selectedType === option.type;
                    return (
                        <button
                            key={option.type}
                            onClick={() => handleSelectType(option.type)}
                            className={`relative rounded-lg border-2 transition-all overflow-hidden ${
                                isSelected
                                    ? 'border-stone-400 ring-2 ring-stone-200'
                                    : 'border-stone-200 hover:border-stone-300'
                            }`}
                            style={{ aspectRatio: '4/5' }}
                        >
                            {/* 预览图 */}
                            <div className="w-full h-full flex items-center justify-center p-1">
                                <img
                                    src={option.preview}
                                    alt={option.name}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const parent = e.currentTarget.parentElement;
                                        if (parent) {
                                            parent.innerHTML = `<span class="text-3xl">${getTimePalEmoji(option.type)}</span>`;
                                        }
                                    }}
                                />
                            </div>

                            {/* 选中标记 - 黑色对勾 */}
                            {isSelected && (
                                <div className="absolute top-1 right-1 w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center shadow-lg">
                                    <Check size={12} className="text-white" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 统计时长设置 */}
            <div className="pt-4 border-t border-stone-200 bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                        限定标签（Activity）
                        <span className="text-stone-300 ml-1">（可选）</span>
                    </label>
                    {/* Toggle 开关 */}
                    <button
                        type="button"
                        onClick={() => {
                            setIsFilterEnabled(!isFilterEnabled);
                            if (isFilterEnabled) {
                                // 关闭时清空选择
                                setFilterActivityIds([]);
                                setSelectedCategoryId('');
                            }
                        }}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${isFilterEnabled
                            ? 'bg-stone-900 text-white'
                            : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                            }`}
                    >
                        {isFilterEnabled ? '已开启' : '关闭'}
                    </button>
                </div>
                <p className="text-xs text-stone-500 mb-3">
                    仅统计选中标签的时间记录
                </p>

                {isFilterEnabled && (
                    <>
                        {/* Category Grid */}
                        <div className="grid grid-cols-4 gap-2 mb-3">
                            {categories.map(cat => {
                                const isSelected = selectedCategoryId === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setSelectedCategoryId(isSelected ? '' : cat.id)}
                                        className={`
                                            px-2 py-2 rounded-lg text-[10px] font-medium text-center border transition-colors flex items-center justify-center gap-1.5 truncate
                                            ${isSelected
                                                ? 'bg-stone-900 text-white border-stone-900'
                                                : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'}
                                        `}
                                    >
                                        <span>{cat.icon}</span>
                                        <span className="truncate">{cat.name}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Activity Grid */}
                        {selectedCategoryId && (
                            <div className="grid grid-cols-4 gap-3 pt-2 animate-in slide-in-from-top-2">
                                {categories
                                    .find(c => c.id === selectedCategoryId)
                                    ?.activities.map(act => {
                                        const isActive = filterActivityIds.includes(act.id);
                                        return (
                                            <button
                                                key={act.id}
                                                type="button"
                                                onClick={() => {
                                                    if (isActive) {
                                                        setFilterActivityIds(filterActivityIds.filter(id => id !== act.id));
                                                    } else {
                                                        setFilterActivityIds([...filterActivityIds, act.id]);
                                                    }
                                                }}
                                                className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 active:scale-95 hover:bg-stone-50"
                                            >
                                                <div className={`
                                                    w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all
                                                    ${isActive ? 'ring-1 ring-stone-300 ring-offset-1 scale-110' : ''}
                                                    ${act.color}
                                                `}>
                                                    {act.icon}
                                                </div>
                                                <span className={`text-xs text-center font-medium leading-tight ${isActive ? 'text-stone-900 font-bold' : 'text-stone-400'}`}>
                                                    {act.name}
                                                </span>
                                            </button>
                                        );
                                    })}
                            </div>
                        )}

                        {/* Clear 按钮 */}
                        {filterActivityIds.length > 0 && (
                            <div className="flex justify-end mt-2">
                                <button
                                    type="button"
                                    onClick={() => setFilterActivityIds([])}
                                    className="text-xs font-medium text-stone-400 hover:text-red-400 transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        )}

                        {/* 已选择标签提示 */}
                        {filterActivityIds.length > 0 && (
                            <div className="mt-3 text-xs text-stone-500 animate-in fade-in">
                                <span className="font-medium">已选择：</span>
                                {filterActivityIds.map((actId, index) => {
                                    const activity = categories
                                        .flatMap(c => c.activities)
                                        .find(a => a.id === actId);
                                    return activity ? (
                                        <span key={actId}>
                                            {activity.icon} {activity.name}{index < filterActivityIds.length - 1 ? '、' : ''}
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* 自定义名言设置 */}
            <div className="pt-4 border-t border-stone-200 bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                        自定义名言
                        <span className="text-stone-300 ml-1">（可选）</span>
                    </label>
                    {/* Toggle 开关 */}
                    <button
                        type="button"
                        onClick={() => {
                            setCustomQuotesEnabled(!customQuotesEnabled);
                            if (customQuotesEnabled) {
                                // 关闭时清空自定义名言
                                setCustomQuotes('');
                                storage.remove(TIMEPAL_KEYS.CUSTOM_QUOTES);
                            }
                        }}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${customQuotesEnabled
                            ? 'bg-stone-900 text-white'
                            : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                            }`}
                    >
                        {customQuotesEnabled ? '已开启' : '关闭'}
                    </button>
                </div>
                <p className="text-xs text-stone-500 mb-3">
                    开启后使用自定义名言，每行一句
                </p>

                {customQuotesEnabled && (
                    <div className="animate-in slide-in-from-top-2">
                        <textarea
                            value={customQuotes}
                            onChange={(e) => handleCustomQuotesChange(e.target.value)}
                            placeholder="输入你的名言，每行一句&#10;例如：&#10;种一棵树最好的时间是十年前，其次是现在&#10;万物皆有裂痕，那是光照进来的地方"
                            className="w-full h-32 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all resize-none"
                        />
                        <div className="mt-2 text-xs text-stone-400">
                            已输入 {customQuotes.split('\n').filter(q => q.trim().length > 0).length} 条名言
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
