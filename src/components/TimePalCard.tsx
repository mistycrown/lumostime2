/**
 * @file TimePalCard.tsx
 * @description 时光小友卡片，根据当日专注时长展示当前小友状态，并支持实时计时同步。
 * @input logs: Log[] - 日志列表
 * @input currentDate: Date - 当前查看日期
 * @input categories: Category[] - 分类列表
 * @input activeSessions?: ActiveSession[] - 正在进行中的会话
 * @output 顶部时光小友卡片
 * @updated 2026-07-22: Added dark mode colors for the Time Pal card surface and content.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Log, Category, ActiveSession } from '../types';
import { getRandomQuote } from '../constants/timePalQuotes';
import { getAllTimePalTypes, isCustomTimePalType } from '../constants/timePalConfig';
import { useTimePalImage } from '../hooks/useTimePalImage';
import { TIMEPAL_KEYS, storage } from '../constants/storageKeys';
import { timePalCustomService, TIMEPAL_CUSTOM_CHANGED_EVENT } from '../services/timePalCustomService';
import {
    TIMEPAL_STAGE_THRESHOLDS_CHANGED_EVENT,
    TimePalStageThresholds,
    calculateTimePalStageLevel,
    readStoredTimePalStageThresholds
} from '../utils/timePalStageThresholds';

const TIMEPAL_CLICK_SWITCH_CHANGED_EVENT = 'timepal-click-switch-changed';

interface TimePalCardProps {
    logs: Log[];
    currentDate: Date;
    categories: Category[];
    activeSessions?: ActiveSession[];
}

const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getFormDescription = (level: number): string => {
    const descriptions = [
        '破晓时分',
        '精神饱满',
        '活力四射',
        '元气满满',
        '熠熠生辉'
    ];
    return descriptions[level - 1] || descriptions[0];
};

export const TimePalCard: React.FC<TimePalCardProps> = ({ logs, currentDate, categories, activeSessions = [] }) => {
    const [timePalType, setTimePalType] = useState<string | null>(() => {
        const saved = storage.get(TIMEPAL_KEYS.TYPE);
        if (saved === 'none' || !saved) return null;
        return saved;
    });
    const [customTypeSelections, setCustomTypeSelections] = useState<string[]>([]);
    const [isCustomTypesLoaded, setIsCustomTypesLoaded] = useState(false);
    const [isClickSwitchEnabled, setIsClickSwitchEnabled] = useState<boolean>(() => {
        return storage.getBoolean(TIMEPAL_KEYS.CLICK_SWITCH_ENABLED, true);
    });
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [debugMode, setDebugMode] = useState(false);
    const [debugFocusMinutes, setDebugFocusMinutes] = useState(0);
    const [stageThresholds, setStageThresholds] = useState<TimePalStageThresholds>(() => {
        return readStoredTimePalStageThresholds();
    });

    useEffect(() => {
        if (activeSessions.length > 0) {
            const interval = setInterval(() => {
                setCurrentTime(Date.now());
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [activeSessions.length]);

    useEffect(() => {
        const loadCustomTypes = () => {
            const customTypes = timePalCustomService
                .getAllItems()
                .map(item => timePalCustomService.getSelectionValue(item.id));
            setCustomTypeSelections(customTypes);
            setIsCustomTypesLoaded(true);
        };

        loadCustomTypes();
        window.addEventListener(TIMEPAL_CUSTOM_CHANGED_EVENT, loadCustomTypes);

        return () => {
            window.removeEventListener(TIMEPAL_CUSTOM_CHANGED_EVENT, loadCustomTypes);
        };
    }, []);

    useEffect(() => {
        if (!isCustomTypesLoaded) {
            return;
        }
        if (!timePalType || !isCustomTimePalType(timePalType)) {
            return;
        }
        if (customTypeSelections.includes(timePalType)) {
            return;
        }
        setTimePalType(null);
        storage.set(TIMEPAL_KEYS.TYPE, 'none');
        window.dispatchEvent(new Event('timepal-type-changed'));
    }, [timePalType, customTypeSelections, isCustomTypesLoaded]);

    useEffect(() => {
        const syncTimePalType = () => {
            const saved = storage.get(TIMEPAL_KEYS.TYPE);
            if (saved === 'none' || !saved) {
                setTimePalType(null);
            } else {
                setTimePalType(saved);
            }
        };
        const syncClickSwitchEnabled = () => {
            setIsClickSwitchEnabled(storage.getBoolean(TIMEPAL_KEYS.CLICK_SWITCH_ENABLED, true));
        };
        const syncStageThresholds = () => {
            setStageThresholds(readStoredTimePalStageThresholds());
        };

        const handleStorageChange = () => {
            syncTimePalType();
            syncClickSwitchEnabled();
            syncStageThresholds();
        };
        const handleTypeChange = () => {
            syncTimePalType();
        };
        const handleClickSwitchChange = () => {
            syncClickSwitchEnabled();
        };
        const handleStageThresholdsChange = () => {
            syncStageThresholds();
        };
        const handleDebugMode = (event: CustomEvent) => {
            const { enabled, type, focusMinutes } = event.detail;
            setDebugMode(enabled);
            if (enabled) {
                setTimePalType(type);
                setDebugFocusMinutes(focusMinutes);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('timepal-type-changed', handleTypeChange);
        window.addEventListener(TIMEPAL_CLICK_SWITCH_CHANGED_EVENT, handleClickSwitchChange);
        window.addEventListener(TIMEPAL_STAGE_THRESHOLDS_CHANGED_EVENT, handleStageThresholdsChange);
        window.addEventListener('timepal-debug-mode', handleDebugMode as EventListener);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('timepal-type-changed', handleTypeChange);
            window.removeEventListener(TIMEPAL_CLICK_SWITCH_CHANGED_EVENT, handleClickSwitchChange);
            window.removeEventListener(TIMEPAL_STAGE_THRESHOLDS_CHANGED_EVENT, handleStageThresholdsChange);
            window.removeEventListener('timepal-debug-mode', handleDebugMode as EventListener);
        };
    }, []);

    const effectiveTimePalType = timePalType || getAllTimePalTypes()[0] || 'cat';

    const switchTimePal = () => {
        const types = [...getAllTimePalTypes(), ...customTypeSelections];
        if (types.length === 0) {
            return;
        }
        const currentIndex = types.indexOf(timePalType);
        const nextType = currentIndex === -1 ? types[0] : types[(currentIndex + 1) % types.length];
        setTimePalType(nextType);
        storage.set(TIMEPAL_KEYS.TYPE, nextType);
        window.dispatchEvent(new Event('timepal-type-changed'));
    };

    const handleImageClick = () => {
        if (!isClickSwitchEnabled) {
            return;
        }
        switchTimePal();
    };

    const { totalFocusSeconds, formLevel } = useMemo(() => {
        if (debugMode) {
            return {
                totalFocusSeconds: debugFocusMinutes * 60,
                formLevel: calculateTimePalStageLevel(debugFocusMinutes, stageThresholds)
            };
        }

        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);

        const dayLogs = logs.filter(log => {
            return log.startTime >= startOfDay.getTime() && log.startTime <= endOfDay.getTime();
        });

        const isFilterEnabled = storage.getBoolean(TIMEPAL_KEYS.FILTER_ENABLED, false);
        const filterActivityIds = storage.getJSON<string[]>(TIMEPAL_KEYS.FILTER_ACTIVITIES, []);

        let totalSeconds = 0;
        dayLogs.forEach(log => {
            if (isFilterEnabled && filterActivityIds.length > 0) {
                if (filterActivityIds.includes(log.activityId)) {
                    totalSeconds += log.duration;
                }
            } else {
                totalSeconds += log.duration;
            }
        });

        if (activeSessions.length > 0) {
            activeSessions.forEach(session => {
                if (session.startTime >= startOfDay.getTime() && session.startTime <= endOfDay.getTime()) {
                    let shouldCount = false;
                    if (isFilterEnabled && filterActivityIds.length > 0) {
                        shouldCount = filterActivityIds.includes(session.activityId);
                    } else {
                        shouldCount = true;
                    }

                    if (shouldCount) {
                        const sessionDuration = Math.floor((currentTime - session.startTime) / 1000);
                        totalSeconds += sessionDuration;
                    }
                }
            });
        }

        const level = calculateTimePalStageLevel(totalSeconds / 60, stageThresholds);

        return {
            totalFocusSeconds: totalSeconds,
            formLevel: level
        };
    }, [logs, currentDate, categories, activeSessions, currentTime, debugMode, debugFocusMinutes, stageThresholds]);

    const { imageUrl, hasError: imageError, emoji, handleImageError } = useTimePalImage(effectiveTimePalType, formLevel);
    const imageFitClass = isCustomTimePalType(effectiveTimePalType) ? 'object-fill' : 'object-cover';

    const timeDisplay = formatDuration(totalFocusSeconds);
    const formDesc = getFormDescription(formLevel);
    const quote = useMemo(() => getRandomQuote(), [currentDate]);

    const isToday = useMemo(() => {
        const today = new Date();
        return currentDate.getFullYear() === today.getFullYear()
            && currentDate.getMonth() === today.getMonth()
            && currentDate.getDate() === today.getDate();
    }, [currentDate]);

    if (!timePalType || !isToday || (totalFocusSeconds === 0 && !debugMode)) {
        return null;
    }

    return (
        <div className="mb-4">
            <div
                className="time-pal-card relative bg-gradient-to-br from-white/70 to-stone-50/70 rounded-2xl border border-stone-200 p-4 flex items-center gap-4 shadow-sm transition-shadow"
            >
                <button
                    type="button"
                    onClick={handleImageClick}
                    className={`shrink-0 transition-transform ${isClickSwitchEnabled ? 'active:scale-95' : 'cursor-default'}`}
                    title={isClickSwitchEnabled ? '点击切换时光小友' : undefined}
                    aria-label={isClickSwitchEnabled ? '点击切换时光小友' : '时光小友图片'}
                >
                    <div className={`w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center animate-level-${formLevel}`}>
                        {!imageError && imageUrl ? (
                            <img
                                src={imageUrl}
                                alt="时光小友"
                                className={`w-full h-full ${imageFitClass}`}
                                onError={handleImageError}
                            />
                        ) : (
                            <span className="text-4xl">{emoji}</span>
                        )}
                    </div>
                </button>

                <div className="flex-1 flex flex-col justify-center min-w-0">
                    <div
                        className="text-2xl font-bold tabular-nums leading-none text-stone-800 dark:text-stone-100"
                        style={{ fontFamily: '"Playfair Display", "Noto Serif SC", Georgia, serif', letterSpacing: '0.08em' }}
                    >
                        {timeDisplay}
                    </div>
                    <div className="time-pal-card-description mt-1.5 text-xs text-stone-500 leading-relaxed">
                        <span className="font-medium" style={{ color: 'var(--accent-color)' }}>{formDesc}</span>
                        <span> · {quote}</span>
                    </div>
                </div>

                <div className="shrink-0 flex flex-col items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                                i < formLevel ? 'shadow-sm' : 'bg-stone-200'
                            }`}
                            style={i < formLevel ? { backgroundColor: 'var(--accent-color)' } : undefined}
                        />
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes level-1-animation {
                    0%, 100% {
                        transform: rotate(0deg);
                    }
                    25% {
                        transform: rotate(-1.5deg);
                    }
                    75% {
                        transform: rotate(1.5deg);
                    }
                }

                .animate-level-1 {
                    animation: level-1-animation 3.5s ease-in-out infinite;
                }

                @keyframes level-2-animation {
                    0%, 100% {
                        transform: rotate(0deg) scale(1);
                    }
                    25% {
                        transform: rotate(-2deg) scale(1.02);
                    }
                    50% {
                        transform: rotate(0deg) scale(1.03);
                    }
                    75% {
                        transform: rotate(2deg) scale(1.02);
                    }
                }

                .animate-level-2 {
                    animation: level-2-animation 3s ease-in-out infinite;
                }

                @keyframes level-3-animation {
                    0%, 100% {
                        transform: rotate(0deg) scale(1) translateY(0);
                    }
                    20% {
                        transform: rotate(-3deg) scale(1.03) translateY(-1px);
                    }
                    40% {
                        transform: rotate(3deg) scale(1.05) translateY(-2px);
                    }
                    60% {
                        transform: rotate(-3deg) scale(1.03) translateY(-1px);
                    }
                    80% {
                        transform: rotate(3deg) scale(1.05) translateY(-2px);
                    }
                }

                .animate-level-3 {
                    animation: level-3-animation 2.5s ease-in-out infinite;
                }

                @keyframes level-4-animation {
                    0%, 100% {
                        transform: rotate(0deg) scale(1) translateY(0);
                    }
                    15% {
                        transform: rotate(-4deg) scale(1.04) translateY(-2px);
                    }
                    30% {
                        transform: rotate(4deg) scale(1.06) translateY(-3px);
                    }
                    45% {
                        transform: rotate(-4deg) scale(1.04) translateY(-2px);
                    }
                    60% {
                        transform: rotate(4deg) scale(1.06) translateY(-3px);
                    }
                    75% {
                        transform: rotate(0deg) scale(1.03) translateY(-1px);
                    }
                }

                .animate-level-4 {
                    animation: level-4-animation 2s ease-in-out infinite;
                }

                @keyframes level-5-animation {
                    0%, 100% {
                        transform: rotate(0deg) scale(1) translateY(0);
                    }
                    10% {
                        transform: rotate(-5deg) scale(1.05) translateY(-2px);
                    }
                    20% {
                        transform: rotate(5deg) scale(1.07) translateY(-4px);
                    }
                    30% {
                        transform: rotate(-5deg) scale(1.05) translateY(-2px);
                    }
                    40% {
                        transform: rotate(5deg) scale(1.07) translateY(-4px);
                    }
                    50% {
                        transform: rotate(-5deg) scale(1.05) translateY(-2px);
                    }
                    60% {
                        transform: rotate(5deg) scale(1.07) translateY(-4px);
                    }
                    70% {
                        transform: rotate(0deg) scale(1.04) translateY(-1px);
                    }
                    80% {
                        transform: rotate(0deg) scale(1.02) translateY(0);
                    }
                }

                .animate-level-5 {
                    animation: level-5-animation 1.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
                }
            `}</style>
        </div>
    );
};
