/**
 * @file TimePalSettings.tsx
 * @description 时光小友设置组件 - 可在多个页面复用
 * @input categories: Category[] - 活动分类列表
 * @output 时光小友设置界面（包含选择、筛选、自定义名言）
 * @pos Component
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
import { TagMultipleAssociation } from './TagMultipleAssociation';

interface TimePalSettingsProps {
    categories: Category[];
}

export const TimePalSettings: React.FC<TimePalSettingsProps> = ({ categories }) => {
    // 当前选择的小动物类型（'none' 表示不使用）
    const [selectedType, setSelectedType] = useState<TimePalType | 'none'>(() => {
        const saved = storage.get(TIMEPAL_KEYS.TYPE);
        if (!saved || saved === 'none') return 'none';
        return saved as TimePalType;
    });

    // 是否启用标签筛选（由 TagMultipleAssociation 内部管理）
    // 选中的标签 ID 列表
    const [filterActivityIds, setFilterActivityIds] = useState<string[]>(() => {
        return storage.getJSON<string[]>(TIMEPAL_KEYS.FILTER_ACTIVITIES, []);
    });

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
        storage.setJSON(TIMEPAL_KEYS.FILTER_ACTIVITIES, filterActivityIds);
        // 同时保存 enabled 状态
        storage.setBoolean(TIMEPAL_KEYS.FILTER_ENABLED, filterActivityIds.length > 0);
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

    return (
        <div className="space-y-6">
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

            <div className="pt-4 border-t border-stone-200 bg-white rounded-lg p-4 shadow-sm">
                <TagMultipleAssociation
                    categories={categories}
                    selectedActivityIds={filterActivityIds}
                    onChange={setFilterActivityIds}
                    showToggle={true}
                    toggleLabel="限定标签（Activity）"
                    description="仅统计选中标签的时间记录"
                />
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
