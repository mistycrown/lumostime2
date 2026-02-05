/**
 * @file TimePalSettingsView.tsx
 * @description 时光小友设置页面
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Category } from '../types';

interface TimePalSettingsViewProps {
    onBack: () => void;
    categories: Category[];
}

type TimePalType = 'cat' | 'dog' | 'rabbit';

const TIMEPAL_OPTIONS: { type: TimePalType; name: string; preview: string }[] = [
    { type: 'cat', name: '猫咪', preview: '/time_pal_origin/cat/kou/1.png' },
    { type: 'dog', name: '小狗', preview: '/time_pal_origin/dog/kou/1.png' },
    { type: 'rabbit', name: '兔子', preview: '/time_pal_origin/rabbit/kou/1.png' },
];

export const TimePalSettingsView: React.FC<TimePalSettingsViewProps> = ({ onBack, categories }) => {
    // 当前选择的小动物类型
    const [selectedType, setSelectedType] = useState<TimePalType>(() => {
        const saved = localStorage.getItem('lumostime_timepal_type');
        return (saved as TimePalType) || 'cat';
    });

    // 是否启用标签筛选
    const [isFilterEnabled, setIsFilterEnabled] = useState<boolean>(() => {
        const saved = localStorage.getItem('lumostime_timepal_filter_enabled');
        return saved === 'true';
    });

    // 选中的标签 ID 列表
    const [filterActivityIds, setFilterActivityIds] = useState<string[]>(() => {
        const saved = localStorage.getItem('lumostime_timepal_filter_activities');
        return saved ? JSON.parse(saved) : [];
    });

    // 当前选择的分类 ID（用于展开活动列表）
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

    // 保存小动物类型
    const handleSelectType = (type: TimePalType) => {
        setSelectedType(type);
        localStorage.setItem('lumostime_timepal_type', type);
    };

    // 保存筛选设置
    useEffect(() => {
        localStorage.setItem('lumostime_timepal_filter_enabled', isFilterEnabled.toString());
    }, [isFilterEnabled]);

    useEffect(() => {
        localStorage.setItem('lumostime_timepal_filter_activities', JSON.stringify(filterActivityIds));
    }, [filterActivityIds]);

    return (
        <div className="h-full bg-[#faf9f6] flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white border-b border-stone-200 px-6 py-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 hover:bg-stone-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} className="text-stone-600" />
                    </button>
                    <h1 className="text-xl font-bold text-stone-900">时光小友</h1>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* 选择小动物 */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 text-stone-600 mb-4">
                        <span className="text-2xl">🐾</span>
                        <h3 className="font-bold text-lg">选择小动物</h3>
                    </div>
                    <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                        选择一个陪伴你的时光小友
                    </p>

                    <div className="grid grid-cols-3 gap-4">
                        {TIMEPAL_OPTIONS.map(option => {
                            const isSelected = selectedType === option.type;
                            return (
                                <button
                                    key={option.type}
                                    onClick={() => handleSelectType(option.type)}
                                    className={`
                                        relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all
                                        ${isSelected
                                            ? 'border-amber-400 bg-amber-50/50'
                                            : 'border-stone-200 bg-white hover:border-stone-300'}
                                    `}
                                >
                                    {/* 选中标记 */}
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs">✓</span>
                                        </div>
                                    )}

                                    {/* 预览图 */}
                                    <div className="w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center">
                                        <img
                                            src={option.preview}
                                            alt={option.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const fallbackEmojis: Record<TimePalType, string> = {
                                                    cat: '🐱',
                                                    dog: '🐶',
                                                    rabbit: '🐰'
                                                };
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement!.innerHTML = `<span class="text-5xl">${fallbackEmojis[option.type]}</span>`;
                                            }}
                                        />
                                    </div>

                                    {/* 名称 */}
                                    <span className={`text-sm font-medium ${isSelected ? 'text-amber-600' : 'text-stone-600'}`}>
                                        {option.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 统计时长设置 */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 text-stone-600 mb-4">
                        <span className="text-2xl">⏱️</span>
                        <h3 className="font-bold text-lg">统计时长设置</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
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

                                    {/* 已选择的标签 */}
                                    {filterActivityIds.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-stone-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-medium text-stone-400">
                                                    已选择：
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setFilterActivityIds([])}
                                                    className="text-xs font-medium text-stone-400 hover:text-red-400 transition-colors"
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {filterActivityIds.map(actId => {
                                                    const activity = categories
                                                        .flatMap(c => c.activities)
                                                        .find(a => a.id === actId);
                                                    if (!activity) return null;
                                                    return (
                                                        <span
                                                            key={actId}
                                                            className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 text-stone-600 rounded-lg text-xs"
                                                        >
                                                            <span>{activity.icon}</span>
                                                            <span>{activity.name}</span>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* 说明文字 */}
                <div className="text-center text-xs text-stone-400 pb-4">
                    时光小友会根据你的专注时长显示不同形态
                </div>
            </div>
        </div>
    );
};
