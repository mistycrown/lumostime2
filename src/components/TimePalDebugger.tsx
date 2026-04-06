/**
 * @file TimePalDebugger.tsx
 * @description 时间小友调试工具，支持按当前阈值预览类型与阶段表现
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
import { TimePalType, TIMEPAL_OPTIONS, getAllTimePalTypes } from '../constants/timePalConfig';
import {
    DEFAULT_TIMEPAL_STAGE_THRESHOLDS,
    TIMEPAL_STAGE_THRESHOLDS_CHANGED_EVENT,
    TimePalStageThresholds,
    calculateTimePalStageLevel,
    getSampleFocusMinutesForStage,
    getTimePalStageRanges,
    readStoredTimePalStageThresholds
} from '../utils/timePalStageThresholds';

interface TimePalDebuggerProps {
    onClose: () => void;
}

const formatFocusMinutes = (minutes: number): string => {
    if (minutes < 60) {
        return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
};

const getCompactRangeLabel = (startMinutes: number, endMinutes: number | null): string => {
    if (endMinutes === null) {
        return `>=${startMinutes}m`;
    }

    if (startMinutes === 0) {
        return `<${endMinutes + 1}m`;
    }

    return `${startMinutes}-${endMinutes}m`;
};

export const TimePalDebugger: React.FC<TimePalDebuggerProps> = ({ onClose }) => {
    const [currentType, setCurrentType] = useState<TimePalType>(() => {
        const saved = localStorage.getItem('lumostime_timepal_type');
        return (saved as TimePalType) || 'cat';
    });
    const [stageThresholds, setStageThresholds] = useState<TimePalStageThresholds>(() => {
        return readStoredTimePalStageThresholds();
    });
    const [debugFocusMinutes, setDebugFocusMinutes] = useState<number>(() => {
        return getSampleFocusMinutesForStage(1, readStoredTimePalStageThresholds());
    });

    const currentLevel = useMemo(() => {
        return calculateTimePalStageLevel(debugFocusMinutes, stageThresholds);
    }, [debugFocusMinutes, stageThresholds]);
    const stageRanges = useMemo(() => {
        return getTimePalStageRanges(stageThresholds);
    }, [stageThresholds]);
    const maxDebugMinutes = useMemo(() => {
        return Math.max(stageThresholds[3] + 120, DEFAULT_TIMEPAL_STAGE_THRESHOLDS[3] + 120);
    }, [stageThresholds]);

    useEffect(() => {
        localStorage.setItem('lumostime_timepal_type', currentType);

        window.dispatchEvent(new CustomEvent('timepal-debug-mode', {
            detail: {
                enabled: true,
                type: currentType,
                focusMinutes: debugFocusMinutes
            }
        }));

        window.dispatchEvent(new Event('timepal-type-changed'));
    }, [currentType, debugFocusMinutes]);

    useEffect(() => {
        const syncStageThresholds = () => {
            const nextThresholds = readStoredTimePalStageThresholds();
            setStageThresholds(nextThresholds);
        };

        window.addEventListener('storage', syncStageThresholds);
        window.addEventListener(TIMEPAL_STAGE_THRESHOLDS_CHANGED_EVENT, syncStageThresholds);

        return () => {
            window.removeEventListener('storage', syncStageThresholds);
            window.removeEventListener(TIMEPAL_STAGE_THRESHOLDS_CHANGED_EVENT, syncStageThresholds);
        };
    }, []);

    const handleSwitchType = (direction: 'prev' | 'next') => {
        const types = getAllTimePalTypes();
        const idx = types.indexOf(currentType);
        if (idx === -1) return;

        const newIdx = direction === 'prev'
            ? (idx - 1 < 0 ? types.length - 1 : idx - 1)
            : (idx + 1 >= types.length ? 0 : idx + 1);

        setCurrentType(types[newIdx]);
    };

    const exitDebugMode = () => {
        window.dispatchEvent(new CustomEvent('timepal-debug-mode', {
            detail: { enabled: false }
        }));
        onClose();
    };

    const currentOption = TIMEPAL_OPTIONS.find(opt => opt.type === currentType);
    const typeName = currentOption?.name || currentType;
    const typeEmoji = currentOption?.emoji || '🐾';

    const getLevelDescription = (level: number): string => {
        const descriptions = [
            '刚刚苏醒',
            '精神饱满',
            '活力四射',
            '元气满满',
            '超强状态'
        ];
        return descriptions[level - 1] || descriptions[0];
    };

    return (
        <div className="fixed bottom-20 left-4 z-50 bg-white/95 backdrop-blur rounded-xl shadow-2xl border border-amber-200 p-4 w-72 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-4 border-b border-amber-100 pb-3">
                <h3 className="text-sm font-bold text-stone-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    时间小友调试
                </h3>
                <button
                    onClick={exitDebugMode}
                    className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

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

            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="text-[11px] text-stone-500 font-medium">形态等级</div>
                    <div className="text-[11px] text-amber-600 font-bold">
                        {getLevelDescription(currentLevel)}
                    </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                    {stageRanges.map(range => (
                        <button
                            key={range.level}
                            onClick={() => setDebugFocusMinutes(getSampleFocusMinutesForStage(range.level, stageThresholds))}
                            className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all ${
                                currentLevel === range.level
                                    ? 'bg-amber-400 text-white shadow-md scale-105'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }`}
                        >
                            <div className="text-lg font-bold">{range.level}</div>
                            <div className="text-[8px] opacity-70">
                                {getCompactRangeLabel(range.startMinutes, range.endMinutes)}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-4 bg-stone-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
                        <Clock size={11} />
                        模拟累计专注
                    </div>
                    <div className="text-sm font-mono font-bold text-stone-700">
                        {formatFocusMinutes(debugFocusMinutes)}
                    </div>
                </div>
                <input
                    type="range"
                    min="0"
                    max={maxDebugMinutes}
                    step="1"
                    value={debugFocusMinutes}
                    onChange={(e) => setDebugFocusMinutes(Number(e.target.value))}
                    className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                        background: `linear-gradient(to right, #fbbf24 0%, #fbbf24 ${(debugFocusMinutes / maxDebugMinutes) * 100}%, #e7e5e4 ${(debugFocusMinutes / maxDebugMinutes) * 100}%, #e7e5e4 100%)`
                    }}
                />
                <div className="flex justify-between text-[9px] text-stone-400 mt-1">
                    <span>0m</span>
                    <span>{Math.round(maxDebugMinutes / 2)}m</span>
                    <span>{maxDebugMinutes}m</span>
                </div>
            </div>

            <div className="mt-3 text-[10px] text-stone-400 text-center leading-relaxed">
                调试模式会按当前阈值实时预览时间小友阶段。
            </div>
        </div>
    );
};
