/**
 * @file MoodCalendar.tsx
 * @description 心情日历组件 - 显示当月每日的心情 emoji/贴纸（基于 monomood 设计）
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
    onUpdateSummary?: (date: string, summary: string) => void; // 新增：更新一句话总结
}

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']; // 周一到周日

export const MoodCalendar: React.FC<MoodCalendarProps> = ({
    year,
    month,
    dailyReviews,
    onUpdateMood,
    onClearMood,
    onUpdateSummary
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
        const startDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        const days: (number | null)[] = [];

        // 调整为周一开始：周日是0，需要转换为6；周一是1，转换为0
        const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

        // 填充第一周的空白
        for (let i = 0; i < adjustedStartDay; i++) {
            days.push(null);
        }

        // 填充日期
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }

        return days;
    }, [year, month]);

    // 获取指定日期的心情 emoji/贴纸
    const getMoodForDate = (day: number): string | undefined => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const review = dailyReviews.find(r => r.date === dateStr);
        // 直接返回存储的值（可能是 emoji 或 "image:/path"）
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
            <div className="bg-stone-50 shadow-sm p-6 rounded-2xl mb-6">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 mb-4">
                    {WEEK_DAYS.map((day, i) => (
                        <div key={i} className="text-center text-sm text-stone-400 font-light">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-2">
                    {calendarData.map((day, index) => {
                        if (day === null) {
                            return (
                                <div 
                                    key={`empty-${index}`} 
                                    className="aspect-square"
                                />
                            );
                        }

                        const mood = getMoodForDate(day);
                        const today = isToday(day);

                        return (
                            <button
                                key={day}
                                onClick={() => handleDateClick(day)}
                                className="aspect-square relative flex items-center justify-center border-0 rounded-full transition-all hover:bg-stone-100/50"
                            >
                                {mood ? (
                                    // 有贴纸时，只显示贴纸，不显示数字
                                    <div className="w-full h-full flex items-center justify-center">
                                        <IconRenderer 
                                            icon={mood} 
                                            className="w-full h-full"
                                            size="100%"
                                        />
                                    </div>
                                ) : (
                                    // 没有贴纸时，显示日期数字（居中）
                                    <span 
                                        className={`text-sm font-handwriting ${
                                            today 
                                                ? 'text-stone-900 font-bold' 
                                                : 'text-stone-400'
                                        }`}
                                    >
                                        {day}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Mood Picker Modal */}
            <MoodPickerModal
                isOpen={isMoodModalOpen}
                date={selectedDate || ''}
                selectedMood={selectedDate ? dailyReviews.find(r => r.date === selectedDate)?.moodEmoji : undefined}
                summary={selectedDate ? dailyReviews.find(r => r.date === selectedDate)?.summary : undefined}
                onSelect={handleSelectMood}
                onClear={handleClearMood}
                onSummaryChange={onUpdateSummary ? (summary) => {
                    if (selectedDate) {
                        onUpdateSummary(selectedDate, summary);
                    }
                } : undefined}
                onClose={() => {
                    setIsMoodModalOpen(false);
                    setSelectedDate(null);
                }}
            />
        </>
    );
};
