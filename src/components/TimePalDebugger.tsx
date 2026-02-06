/**
 * @file TimePalDebugger.tsx
 * @description 时光小友调试工具 - 快速切换类型和等级
 */

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';
import { TimePalType, getAllTimePalTypes, TIMEPAL_OPTIONS } from '../constants/timePalConfig';

interface TimePalDebuggerProps {
    onClose: () => void;
}

export const TimePalDebugger: React.FC<TimePalDebuggerProps> = ({ onClose }) => {
    const [currentType, setCurrentType] = useState<TimePalType>(() => {
        const saved = localStorage.getItem('lumostime_timepal_type');
        return (saved as TimePalType) || 'cat';
    });
    const [currentLevel, setCurrentLevel] = useState<number>(1);
    const [debugFocusHours, setDebugFocusHours] = useState<number>(0);

    // 根据等级计算对应的专注时长
    const getLevelFocusHours = (level: number): number => {
        switch (level) {
            case 1: return 0.5;   // < 2小时
            case 2: return 2.5;   // 2-4小时
            case 3: return 5;     // 4-6小时
            case 4: return 7;     // 6-8小时
            case 5: return 9;     // >= 8小时
            default: return 0;
        }
    };

    // 根据专注时长计算等级
    const calculateLevel = (hours: number): number => {
        if (hours < 2) return 1;
        if (hours < 4) return 2;
        if (hours < 6) return 3;
        if (hours < 8) return 4;
        return 5;
    };

    // 实时应用调试状态（任何变化都立即生效）
    useEffect(() => {
        // 保存类型
        localStorage.setItem('lumostime_timepal_type', currentType);
        
        // 触发调试模式事件，传递模拟的专注时长
        window.dispatchEvent(new CustomEvent('timepal-debug-mode', {
            detail: {
                enabled: true,
                type: currentType,
                level: currentLevel,
                focusHours: debugFocusHours
            }
        }));

        // 触发类型变化事件
        window.dispatchEvent(new Event('timepal-type-changed'));
    }, [currentType, currentLevel, debugFocusHours]);

    // 更新等级时同步专注时长
    useEffect(() => {
        setDebugFocusHours(getLevelFocusHours(currentLevel));
    }, [currentLevel]);

    // 切换类型
    const handleSwitchType = (direction: 'prev' | 'next') => {
        const types = getAllTimePalTypes();
        const idx = types.indexOf(currentType);
        if (idx === -1) return;

        let newIdx;
        if (direction === 'prev') {
            newIdx = idx - 1 < 0 ? types.length - 1 : idx - 1;
        } else {
            newIdx = idx + 1 >= types.length ? 0 : idx + 1;
        }

        const newType = types[newIdx];
        setCurrentType(newType);
    };

    // 退出调试模式
    const exitDebugMode = () => {
        window.dispatchEvent(new CustomEvent('timepal-debug-mode', {
            detail: { enabled: false }
        }));
        onClose();
    };

    // 获取当前类型的名称和 emoji
    const currentOption = TIMEPAL_OPTIONS.find(opt => opt.type === currentType);
    const typeName = currentOption?.name || currentType;
    const typeEmoji = currentOption?.emoji || '🐾';

    // 等级描述
    const getLevelDescription = (level: number): string => {
        const descriptions = [
            '刚刚苏醒',
            '精神饱满',
            '活力四射',
            '元气满满',
            '超级无敌'
        ];
        return descriptions[level - 1] || descriptions[0];
    };

    return (
        <div className="fixed bottom-20 left-4 z-50 bg-white/95 backdrop-blur rounded-xl shadow-2xl border border-amber-200 p-4 w-72 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b border-amber-100 pb-3">
                <h3 className="text-sm font-bold text-stone-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    时光小友调试
                </h3>
                <button 
                    onClick={exitDebugMode} 
                    className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            {/* 类型切换 */}
            <div className="mb-4">
                <div className="text-[11px] text-stone-500 mb-2 font-medium">小友类型</div>
                <div className="flex items-center justify-between bg-amber-50 rounded-lg p-2">
                    <button 
                        onClick={() => handleSwitchType('prev')} 
                        className="p-1.5 hover:bg-white rounded shadow-sm text-stone-600 transition-all"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{typeEmoji}</span>
                        <span className="text-sm font-bold text-stone-700">{typeName}</span>
                    </div>
                    <button 
                        onClick={() => handleSwitchType('next')} 
                        className="p-1.5 hover:bg-white rounded shadow-sm text-stone-600 transition-all"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
                <div className="text-[10px] text-stone-400 mt-1 text-center font-mono">
                    {currentType}
                </div>
            </div>

            {/* 等级选择 */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="text-[11px] text-stone-500 font-medium">形态等级</div>
                    <div className="text-[11px] text-amber-600 font-bold">
                        {getLevelDescription(currentLevel)}
                    </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map(level => (
                        <button
                            key={level}
                            onClick={() => setCurrentLevel(level)}
                            className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all ${
                                currentLevel === level
                                    ? 'bg-amber-400 text-white shadow-md scale-105'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }`}
                        >
                            <div className="text-lg font-bold">{level}</div>
                            <div className="text-[8px] opacity-70">
                                {level === 1 ? '<2h' : level === 2 ? '2-4h' : level === 3 ? '4-6h' : level === 4 ? '6-8h' : '≥8h'}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* 专注时长显示 */}
            <div className="mb-4 bg-stone-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
                        <Clock size={11} />
                        模拟专注时长
                    </div>
                    <div className="text-sm font-mono font-bold text-stone-700">
                        {debugFocusHours.toFixed(1)}h
                    </div>
                </div>
                <input
                    type="range"
                    min="0"
                    max="12"
                    step="0.5"
                    value={debugFocusHours}
                    onChange={(e) => {
                        const hours = parseFloat(e.target.value);
                        setDebugFocusHours(hours);
                        setCurrentLevel(calculateLevel(hours));
                    }}
                    className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                        background: `linear-gradient(to right, #fbbf24 0%, #fbbf24 ${(debugFocusHours / 12) * 100}%, #e7e5e4 ${(debugFocusHours / 12) * 100}%, #e7e5e4 100%)`
                    }}
                />
                <div className="flex justify-between text-[9px] text-stone-400 mt-1">
                    <span>0h</span>
                    <span>6h</span>
                    <span>12h</span>
                </div>
            </div>

            {/* 提示信息 */}
            <div className="mt-3 text-[10px] text-stone-400 text-center leading-relaxed">
                调试模式下，时光小友会实时显示模拟的状态
            </div>
        </div>
    );
};
