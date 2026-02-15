/**
 * @file MoodCalendar.tsx
 * @description 心情日历组件 - 显示当月每日的心情 emoji（基于 monomood 设计）
 */
import React, { useMemo, useState } from 'react';
import { DailyReview } from '../types';
import { IconRenderer } from './IconRenderer';
import { MoodPickerModal } from './MoodPicker';
import { useSettings } from '../contexts/SettingsContext';

interface MoodCalendarProps {
    year: number;
    month: number; // 0-11
    dailyReviews: DailyReview[];
    onUpdateMood: (date: string, emoji: string) => void;
    onClearMood: (date: string) => void;
}

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const MoodCalendar: React.FC<MoodCalendarProps> = ({
    year,
    month,
    dailyReviews,
    onUpdateMood,
    onClearMood
}) => {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isMoodModalOpen, setIsMoodModalOpen] = useState(false);
    const { uiIconTheme } = useSettings();

    // 获取当前的 accent color - 不再需要
    // useEffect(() => {
    //     if (uiIconTheme !== 'default') {
    //         const color = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
    //         setAccentColor(color);
    //     }
    // }, [uiIconTheme]);

    // 根据主题确定背景色
    const themeColors = useMemo(() => {
        if (uiIconTheme === 'default') {
            return {
                cellBg: 'bg-stone-50/30',      // 所有格子的默认背景（非常浅的灰色）
                todayBg: 'bg-stone-50/60',     // 今天的格子背景（稍深一点）
                hoverBg: 'hover:bg-stone-50/50',
                cellStyle: undefined,
                todayStyle: undefined
            };
        }
        // 自定义主题直接使用 --secondary-button-bg（次要按钮背景色，已经是很浅的主题色）
        return {
            cellBg: '',                        // 使用 style 设置
            todayBg: '',                       // 使用 style 设置
            hoverBg: '',                       // 使用 style 设置
            cellStyle: {
                backgroundColor: 'var(--secondary-button-bg)'
            },
            todayStyle: {
                backgroundColor: 'var(--secondary-button-hover-bg)'
            }
        };
    }, [uiIconTheme]);

    // 生成当月日历数据
    const calendarData = useMemo(() => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

        const days: (number | null)[] = [];

        // 填充第一周的空白
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }

        // 填充日期
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }

        return days;
    }, [year, month]);

    // 获取指定日期的心情 emoji
    const getMoodForDate = (day: number): string | undefined => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const review = dailyReviews.find(r => r.date === dateStr);
        return review?.moodEmoji;
    };

    // 检查是否是今天
    const isToday = (day: number): boolean => {
        const today = new Date();
        return today.getFullYear() === year && 
               today.getMonth() === month && 
               today.getDate() === day;
    };

    // 点击日期格子
    const handleDateClick = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateStr);
        setIsMoodModalOpen(true);
    };

    // 选择心情
    const handleSelectMood = (emoji: string) => {
        if (selectedDate) {
            onUpdateMood(selectedDate, emoji);
        }
    };

    // 清除心情
    const handleClearMood = () => {
        if (selectedDate) {
            onClearMood(selectedDate);
        }
    };

    return (
        <>
            <div className="bg-white border border-stone-200 shadow-sm p-4 rounded-lg mb-6">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 mb-4">
                    {WEEK_DAYS.map((day, i) => (
                        <div key={i} className="text-center font-mono text-xs text-stone-400 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Days */}
                <div 
                    className={`grid grid-cols-7 gap-px ${uiIconTheme === 'default' ? 'bg-stone-200 border border-stone-200' : ''}`}
                    style={uiIconTheme !== 'default' ? {
                        backgroundColor: 'var(--secondary-button-border)',
                        border: '1px solid var(--secondary-button-border)'
                    } : undefined}
                >
                    {calendarData.map((day, index) => {
                        if (day === null) {
                            return (
                                <div 
                                    key={`empty-${index}`} 
                                    className={`aspect-square ${uiIconTheme === 'default' ? themeColors.cellBg : ''}`}
                                    style={uiIconTheme !== 'default' ? themeColors.cellStyle : undefined}
                                />
                            );
                        }

                        const mood = getMoodForDate(day);
                        const today = isToday(day);

                        return (
                            <button
                                key={day}
                                onClick={() => handleDateClick(day)}
                                className={`aspect-square relative flex flex-col items-center justify-center border-0 transition-colors ${
                                    uiIconTheme === 'default' 
                                        ? `${today ? themeColors.todayBg : themeColors.cellBg} ${themeColors.hoverBg}`
                                        : 'hover:opacity-90'
                                }`}
                                style={uiIconTheme !== 'default' 
                                    ? (today ? themeColors.todayStyle : themeColors.cellStyle)
                                    : undefined
                                }
                            >
                                {mood && (
                                    <div className="flex items-center justify-center mb-1">
                                        <span className="text-3xl leading-none block">
                                            <IconRenderer icon={mood} />
                                        </span>
                                    </div>
                                )}
                                <span className={`absolute bottom-0 left-0 right-0 text-center text-[9px] font-mono ${today ? 'text-stone-900 font-bold' : 'text-stone-400'}`}>
                                    {day}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Mood Picker Modal */}
            <MoodPickerModal
                isOpen={isMoodModalOpen}
                date={selectedDate || ''}
                selectedMood={selectedDate ? getMoodForDate(parseInt(selectedDate.split('-')[2])) : undefined}
                onSelect={handleSelectMood}
                onClear={handleClearMood}
                onClose={() => {
                    setIsMoodModalOpen(false);
                    setSelectedDate(null);
                }}
            />
        </>
    );
};
