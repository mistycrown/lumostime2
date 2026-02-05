/**
 * @file TimePalCard.tsx
 * @description 时光小友卡片 - 根据当日专注时长显示不同形态的小动物
 */
import React, { useMemo, useState } from 'react';
import { Log, Category } from '../types';
import { TIMEPAL_MOTIVATIONAL_QUOTES } from '../constants/timePalQuotes';

interface TimePalCardProps {
    logs: Log[];
    currentDate: Date;
    categories: Category[];
}

// 时光小友类型
type TimePalType = 'cat' | 'dog' | 'rabbit';

// 根据专注时长计算形态等级 (1-5)
const calculateFormLevel = (focusHours: number): number => {
    if (focusHours < 2) return 1;
    if (focusHours < 4) return 2;
    if (focusHours < 6) return 3;
    if (focusHours < 8) return 4;
    return 5;
};

// 格式化时长为 "时:分:秒"
const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// 获取形态描述
const getFormDescription = (level: number): string => {
    const descriptions = [
        '刚刚苏醒',
        '精神饱满',
        '活力四射',
        '元气满满',
        '超级无敌'
    ];
    return descriptions[level - 1] || descriptions[0];
};

// 获取随机励志语录
const getRandomQuote = (): string => {
    return TIMEPAL_MOTIVATIONAL_QUOTES[Math.floor(Math.random() * TIMEPAL_MOTIVATIONAL_QUOTES.length)];
};

export const TimePalCard: React.FC<TimePalCardProps> = ({ logs, currentDate, categories }) => {
    // 从 localStorage 读取用户选择的小动物类型
    const [timePalType, setTimePalType] = useState<TimePalType>(() => {
        const saved = localStorage.getItem('lumostime_timepal_type');
        return (saved as TimePalType) || 'cat';
    });

    // 切换小动物类型
    const switchTimePal = () => {
        const types: TimePalType[] = ['cat', 'dog', 'rabbit'];
        const currentIndex = types.indexOf(timePalType);
        const nextType = types[(currentIndex + 1) % types.length];
        setTimePalType(nextType);
        localStorage.setItem('lumostime_timepal_type', nextType);
    };

    // 计算当日专注时长
    const { totalFocusSeconds, formLevel } = useMemo(() => {
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);

        // 筛选当日的专注记录
        const dayLogs = logs.filter(log => {
            return log.startTime >= startOfDay.getTime() && log.startTime <= endOfDay.getTime();
        });

        // 计算总专注时长（只统计启用了专注度的活动）
        let totalSeconds = 0;
        dayLogs.forEach(log => {
            const category = categories.find(c => c.id === log.categoryId);
            const activity = category?.activities.find(a => a.id === log.activityId);
            
            // 检查是否启用专注度追踪
            const isFocusEnabled = activity?.enableFocusScore ?? category?.enableFocusScore ?? false;
            
            if (isFocusEnabled) {
                totalSeconds += log.duration;
            }
        });

        const focusHours = totalSeconds / 3600;
        const level = calculateFormLevel(focusHours);

        return {
            totalFocusSeconds: totalSeconds,
            formLevel: level
        };
    }, [logs, currentDate, categories]);

    // 获取小动物图片路径
    const getTimePalImage = (type: TimePalType, level: number): string => {
        return `/time_pal_origin/${type}/kou/${level}.png`;
    };

    const imageUrl = getTimePalImage(timePalType, formLevel);
    const timeDisplay = formatDuration(totalFocusSeconds);
    const formDesc = getFormDescription(formLevel);
    const quote = useMemo(() => getRandomQuote(), [currentDate]); // 每天固定一个语录

    // 如果没有专注时长，不显示卡片
    if (totalFocusSeconds === 0) {
        return null;
    }

    return (
        <div className="mb-4">
            <div className="bg-gradient-to-br from-white to-stone-50 rounded-2xl border border-stone-200 p-4 flex items-center gap-4 transition-shadow" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                {/* 左侧：小动物图片（可点击切换） */}
                <button 
                    onClick={switchTimePal}
                    className="shrink-0 active:scale-95 transition-transform"
                    title="点击切换小动物"
                >
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center animate-bounce-gentle">
                        <img 
                            src={imageUrl} 
                            alt="时光小友" 
                            className="w-full h-full object-cover animate-wiggle"
                            onError={(e) => {
                                // 如果图片加载失败，显示占位符
                                const fallbackEmojis: Record<TimePalType, string> = {
                                    cat: '🐱',
                                    dog: '🐶',
                                    rabbit: '🐰'
                                };
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = `<span class="text-4xl animate-wiggle">${fallbackEmojis[timePalType]}</span>`;
                            }}
                        />
                    </div>
                </button>

                {/* 右侧：专注时长和状态 */}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                    <div className="text-3xl font-bold font-mono text-stone-800 tracking-tight leading-none">
                        {timeDisplay}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-amber-600 font-medium">
                            {formDesc}
                        </span>
                        <span className="text-xs text-stone-400">
                            · {quote}
                        </span>
                    </div>
                </div>

                {/* 形态等级指示器 */}
                <div className="shrink-0 flex flex-col items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div 
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                                i < formLevel 
                                    ? 'bg-amber-400 shadow-sm' 
                                    : 'bg-stone-200'
                            }`}
                        />
                    ))}
                </div>
            </div>
            
            {/* 添加自定义动画样式 */}
            <style>{`
                @keyframes bounce-gentle {
                    0%, 100% {
                        transform: scale(1) translateY(0);
                    }
                    50% {
                        transform: scale(1.05) translateY(-2px);
                    }
                }
                
                @keyframes wiggle {
                    0%, 100% {
                        transform: rotate(0deg);
                    }
                    25% {
                        transform: rotate(-3deg);
                    }
                    75% {
                        transform: rotate(3deg);
                    }
                }
                
                .animate-bounce-gentle {
                    animation: bounce-gentle 3s ease-in-out infinite;
                }
                
                .animate-wiggle {
                    animation: wiggle 4s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};
