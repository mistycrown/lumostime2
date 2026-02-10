/**
 * @file CalendarWidget.tsx
 * @input currentDate, logs, viewMode
 * @output Interactive Calendar / Heatmap
 * @pos Component (Core UI)
 * @description A versatile calendar component supporting Expand/Collapse views, Week/Month modes, and Heatmap visualization (Duration or Focus).
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState } from 'react';
import { Log } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { TimelineImage } from './TimelineImage';

interface CalendarWidgetProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    logs?: Log[];
    isExpanded: boolean;
    onExpandToggle: () => void;
    extraHeaderControls?: React.ReactNode;
    disableSelection?: boolean;
    preventCollapse?: boolean;
    startWeekOnSunday?: boolean;
    onResetView?: () => void;
    customScale?: { min: number; max: number };
    heatmapMode?: 'duration' | 'focus';
    staticMode?: boolean;
    renderCustomDay?: (date: Date, isSelected: boolean, isToday: boolean) => React.ReactNode;
    hideTopBar?: boolean; // 隐藏顶部栏（用于详情页面）
    galleryMode?: boolean; // 画廊模式：显示每天的第一张图片
    todos?: any[]; // 待办列表（用于获取 Cover Image）
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ currentDate, onDateChange, logs = [], isExpanded, onExpandToggle, extraHeaderControls, disableSelection, customScale, heatmapMode, staticMode, preventCollapse, onResetView, startWeekOnSunday = false, renderCustomDay, hideTopBar = false, galleryMode = false, todos = [] }) => {
    const [viewMode, setViewMode] = useState<'calendar' | 'month_year'>('calendar');

    // ... (keep existing helper functions)
    // --- Date Helpers ---
    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const isToday = (d: Date) => {
        return isSameDay(d, new Date());
    };

    const weekDaysShort = startWeekOnSunday
        ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Helper to generate calendar grid for current month
    const getMonthDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days = [];
        // Pad start
        let paddingDays = firstDay.getDay();
        if (!startWeekOnSunday) {
            paddingDays = (paddingDays + 6) % 7;
        }

        for (let i = 0; i < paddingDays; i++) {
            days.push(null);
        }
        // Days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };


    // Helper to get 7 days centered on currentDate (3 days before, currentDate, 3 days after)
    const getWeekDays = () => {
        const days = [];
        
        // Generate 7 days: currentDate - 3, currentDate - 2, currentDate - 1, currentDate, currentDate + 1, currentDate + 2, currentDate + 3
        for (let i = -3; i <= 3; i++) {
            const day = new Date(currentDate);
            day.setDate(currentDate.getDate() + i);
            days.push(day);
        }
        
        return days;
    };

    const switchMonth = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        onDateChange(newDate);
    };

    const switchYear = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setFullYear(newDate.getFullYear() + offset);
        onDateChange(newDate);
    };

    const selectMonth = (monthIndex: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(monthIndex);
        onDateChange(newDate);
        setViewMode('calendar');
    };

    // Helper to check if a day has logs
    const hasLogs = (date: Date) => {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        return logs.some(log => log.startTime >= start.getTime() && log.startTime <= end.getTime());
    };

    return (
        <div className={hideTopBar
            ? "z-20 transition-all duration-500 ease-in-out overflow-hidden flex flex-col shrink-0"
            : "bg-white/80 backdrop-blur-md z-20 shadow-sm transition-all duration-500 ease-in-out overflow-hidden flex flex-col shrink-0 border-b border-stone-200 pt-[env(safe-area-inset-top)]"
        }>

            {/* Top Bar - 详情页面模式下隐藏 */}
            {!hideTopBar && (
                <div className="px-4 py-2.5 flex items-center justify-between border-b border-stone-100">
                    {/* 左侧：控制按钮（同步、排序、统计） */}
                    <div className="flex items-center gap-1">
                        {extraHeaderControls}
                    </div>

                    {/* 右侧：Today和展开/收缩按钮 */}
                    <div className="flex items-center gap-1">
                        {!staticMode && (
                            <>
                                {!disableSelection && (
                                    <button
                                        onClick={() => onDateChange(new Date())}
                                        className="text-xs font-bold text-stone-500 border border-stone-300 px-3 py-1.5 rounded-full hover:bg-stone-100 active:scale-95 transition-transform"
                                    >
                                        Today
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (preventCollapse) {
                                            if (onResetView) onResetView();
                                            setViewMode('calendar');
                                        } else {
                                            onExpandToggle();
                                            setViewMode('calendar');
                                        }
                                    }}
                                    className={`
                               p-2 rounded-full border transition-all active:scale-95
                               ${isExpanded ? 'btn-template-filled border-transparent' : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'}
                            `}
                                >
                                    {isExpanded ? <X size={16} /> : <CalendarIcon size={16} />}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* 隐藏的日期按钮 - 保留功能但不显示 */}
            <button
                onClick={() => {
                    if (isExpanded) {
                        setViewMode(viewMode === 'calendar' ? 'month_year' : 'calendar');
                    } else {
                        onExpandToggle();
                        setViewMode('month_year');
                    }
                }}
                className="hidden"
                aria-label="Switch to month/year selector"
            />

            {/* Calendar Area */}
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-[75px] opacity-100'}`}>

                {!isExpanded ? (
                    // Week View (Collapsed) - Original Design with Week Day Labels
                    <div className="flex justify-between items-center px-4 pb-1 md:justify-center md:gap-8 h-[75px]">
                        {getWeekDays().map((day, idx) => {
                            const selected = !disableSelection && isSameDay(day, currentDate);
                            const today = isToday(day);
                            const hasData = hasLogs(day);
                            return (
                                <button
                                    key={idx}
                                    onClick={() => onDateChange(day)}
                                    className={`
                                        w-12 h-14 rounded-xl transition-all duration-300 active:scale-95 relative group
                                        ${selected
                                            ? 'btn-template-filled'
                                            : 'bg-transparent text-stone-400'
                                        }
                                    `}
                                >
                                    {/* Week Day - Fixed Top Position */}
                                    <div className="absolute top-2.5 left-0 right-0 flex justify-center">
                                        <span className="text-[10px] font-serif font-medium uppercase tracking-wider opacity-80 leading-none">
                                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.getDay()]}
                                        </span>
                                    </div>

                                    {/* Date Number - Fixed Top Position */}
                                    <div className="absolute top-6 left-0 right-0 flex justify-center h-6 items-center">
                                        <span className="text-lg font-serif font-bold leading-none relative">
                                            {day.getDate()}
                                            {/* Custom Underline for Today */}
                                            {today && !selected && (
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-stone-400/80 rounded-full" />
                                            )}
                                        </span>
                                    </div>

                                    {/* Data Indicator Dots */}
                                    {hasData && !selected && (
                                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-stone-400" />
                                    )}
                                    {hasData && selected && (
                                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--icon-button-icon)' }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    // Expanded View
                    <div className={hideTopBar ? "px-6 pb-6 pt-6 animate-in fade-in duration-300" : "px-6 pb-6 animate-in fade-in duration-300"}>
                        {viewMode === 'calendar' ? (
                            <>
                                <div className="flex items-center justify-between mt-3 mb-4 px-2">
                                    <button onClick={() => switchMonth(-1)} className="p-1 hover:bg-stone-100 rounded-full"><ChevronLeft size={20} /></button>
                                    <button onClick={() => setViewMode('month_year')} className="font-bold text-stone-800 hover:bg-stone-100 px-2 py-1 rounded-lg transition-colors">
                                        {currentDate.getFullYear()} . {currentDate.getMonth() + 1}
                                    </button>
                                    <button onClick={() => switchMonth(1)} className="p-1 hover:bg-stone-100 rounded-full"><ChevronRight size={20} /></button>
                                </div>
                                <div className="grid grid-cols-7 gap-y-2 place-items-center">
                                    {weekDaysShort.map(d => (
                                        <span key={d} className="text-[10px] font-bold text-stone-300 uppercase">{d}</span>
                                    ))}
                                    {getMonthDays().map((day, idx) => {
                                        if (!day) return <div key={idx} />;
                                        const selected = !disableSelection && isSameDay(day, currentDate);
                                        const today = isToday(day);

                                        // Heatmap Logic
                                        const dayLogs = logs.filter(l => {
                                            const logDate = new Date(l.startTime);
                                            return logDate.getDate() === day.getDate() &&
                                                logDate.getMonth() === day.getMonth() &&
                                                logDate.getFullYear() === day.getFullYear();
                                        });

                                        // Gallery Mode: Collect first image from the day
                                        let firstImage: string | null = null;
                                        if (galleryMode) {
                                            for (const log of dayLogs) {
                                                // Check log images
                                                if (log.images && log.images.length > 0) {
                                                    firstImage = log.images[0];
                                                    break;
                                                }
                                                // Check linked todo cover image
                                                if (log.linkedTodoId && todos) {
                                                    const linkedTodo = todos.find((t: any) => t.id === log.linkedTodoId);
                                                    if (linkedTodo?.coverImage) {
                                                        firstImage = linkedTodo.coverImage;
                                                        break;
                                                    }
                                                }
                                            }
                                        }

                                        let intensityValue = 0;
                                        if (heatmapMode === 'focus') {
                                            // Calculate Average Focus Score (1-5)
                                            let totalScore = 0;
                                            let count = 0;
                                            dayLogs.forEach(l => {
                                                if (l.focusScore) {
                                                    totalScore += l.focusScore;
                                                    count++;
                                                }
                                            });
                                            intensityValue = count > 0 ? totalScore / count : 0;
                                        } else {
                                            // Default: Duration
                                            intensityValue = dayLogs.reduce((acc, l) => acc + (l.duration || 0), 0);
                                        }

                                        // Determine intensity class and style
                                        let bgClass = 'bg-transparent';
                                        let textClass = 'text-stone-600';
                                        let bgStyle: React.CSSProperties | undefined = undefined;

                                        // Gallery Mode Rendering
                                        if (galleryMode && firstImage) {
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        if (!disableSelection) {
                                                            onDateChange(day);
                                                        }
                                                        if (!preventCollapse) {
                                                            onExpandToggle();
                                                        }
                                                    }}
                                                    className="w-9 h-9 rounded-lg overflow-hidden relative transition-all active:scale-90"
                                                >
                                                    <TimelineImage 
                                                        filename={firstImage} 
                                                        className="w-full h-full object-cover"
                                                        useThumbnail={true}
                                                    />
                                                    <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-medium drop-shadow-lg z-10">
                                                        {day.getDate()}
                                                    </span>
                                                    {selected && (
                                                        <div className="absolute inset-0 border-2 border-stone-900 rounded-lg" />
                                                    )}
                                                    {today && !selected && (
                                                        <div className="absolute inset-0 border border-stone-300 rounded-lg" />
                                                    )}
                                                </button>
                                            );
                                        } else if (galleryMode) {
                                            // Gallery mode but no image: show light background
                                            const hasData = intensityValue > 0;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        if (!disableSelection) {
                                                            onDateChange(day);
                                                        }
                                                        if (!preventCollapse) {
                                                            onExpandToggle();
                                                        }
                                                    }}
                                                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all active:scale-90 ${
                                                        selected 
                                                            ? 'text-white shadow-md' 
                                                            : hasData 
                                                                ? 'bg-stone-100 text-stone-600' 
                                                                : 'bg-stone-50 text-stone-300'
                                                    } ${today && !selected ? 'border border-stone-300' : ''}`}
                                                    style={selected ? { backgroundColor: 'var(--progress-bar-fill)' } : undefined}
                                                >
                                                    {day.getDate()}
                                                </button>
                                            );
                                        }

                                        // Skip heatmap coloring if staticMode is enabled and renderCustomDay is provided
                                        if (!staticMode || !renderCustomDay) {
                                            if (heatmapMode === 'focus') {
                                                if (selected) {
                                                    bgClass = 'shadow-md';
                                                    bgStyle = { backgroundColor: 'var(--progress-bar-fill)' };
                                                    textClass = 'text-white';
                                                } else if (intensityValue > 0) {
                                                    // Focus Score Coloring (1-5) - 使用主题淡色的不同透明度
                                                    const score = Math.round(intensityValue);
                                                    textClass = 'text-white';
                                                    if (score >= 4.5) { // 5
                                                        bgStyle = { backgroundColor: 'var(--progress-bar-fill)', opacity: 1 };
                                                    } else if (score >= 3.5) { // 4
                                                        bgStyle = { backgroundColor: 'var(--progress-bar-fill)', opacity: 0.8 };
                                                    } else if (score >= 2.5) { // 3
                                                        bgStyle = { backgroundColor: 'var(--progress-bar-fill)', opacity: 0.6 };
                                                    } else if (score >= 1.5) { // 2
                                                        bgStyle = { backgroundColor: 'var(--progress-bar-fill)', opacity: 0.4 };
                                                    } else { // 1
                                                        bgStyle = { backgroundColor: 'var(--progress-bar-fill)', opacity: 0.2 };
                                                    }
                                                }
                                            } else {
                                                // Duration Coloring - 使用主题淡色的不同透明度
                                                const duration = intensityValue;

                                                // Thresholds logic
                                                let t1 = 1800; // 30m
                                                let t2 = 7200; // 2h
                                                let t3 = 14400; // 4h

                                                if (customScale && customScale.max > customScale.min) {
                                                    const min = Math.max(0, customScale.min);
                                                    const max = Math.max(min + 60, customScale.max);
                                                    const range = max - min;
                                                    t1 = min + (range * 0.33);
                                                    t2 = min + (range * 0.66);
                                                    t3 = max;
                                                }

                                                if (selected) {
                                                    bgClass = 'shadow-md';
                                                    bgStyle = { backgroundColor: 'var(--progress-bar-fill)' };
                                                    textClass = 'text-white';
                                                } else if (duration > 0) {
                                                    textClass = 'text-white';
                                                    if (customScale) {
                                                        if (duration >= customScale.max) {
                                                            bgStyle = { backgroundColor: 'var(--progress-bar-fill)', opacity: 0.9 };
                                                        } else if (duration <= t1) {
                                                            bgStyle = { backgroundColor: 'var(--progress-bar-fill)', opacity: 0.2 };
                                                        } else if (duration <= t2) {
                                                            bgStyle = { backgroundColor: 'var(--progress-bar-fill)', opacity: 0.4 };
                                                        } else {
                                                            bgStyle = { backgroundColor: 'var(--progress-bar-fill)', opacity: 0.7 };
                                                        }
                                                    } else {
                                                        if (duration <= 1800) {
                                                            bgStyle = { backgroundColor: 'var(--progress-bar-fill)', opacity: 0.2 };
                                                        } else if (duration <= 7200) {
                                                            bgStyle = { backgroundColor: 'var(--progress-bar-fill)', opacity: 0.4 };
                                                        } else if (duration <= 14400) {
                                                            bgStyle = { backgroundColor: 'var(--progress-bar-fill)', opacity: 0.7 };
                                                        } else {
                                                            bgStyle = { backgroundColor: 'var(--progress-bar-fill)', opacity: 0.9 };
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    if (!disableSelection) {
                                                        onDateChange(day);
                                                    }
                                                    // In preventCollapse mode, we might not want to toggle?
                                                    // But current logic is: click day -> also collapse (onExpandToggle).
                                                    // If preventCollapse, we should NOT collapse.
                                                    if (!preventCollapse) {
                                                        onExpandToggle();
                                                    }
                                                }}
                                                className={`
                                        w-9 h-9 rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all active:scale-90 relative
                                        ${bgClass} ${textClass}
                                        ${today && !selected && !staticMode ? 'border border-stone-300' : ''}
                                     `}
                                                style={bgStyle}
                                            >
                                                {/* Custom Background/Content */}
                                                {renderCustomDay && (
                                                    <div className="absolute inset-0 rounded-lg overflow-hidden z-0">
                                                        {renderCustomDay(day, selected, today)}
                                                    </div>
                                                )}

                                                <span className="relative z-10">{day.getDate()}</span>
                                                {/* Dot indicator for selected day if it has data, to show it's not empty */}
                                                {selected && intensityValue > 0 && (
                                                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-white/50" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            // Month/Year Picker Mode
                            <div className="flex flex-col h-[280px]">
                                <div className="flex items-center justify-between mt-3 mb-0 px-4">
                                    <button onClick={() => switchYear(-1)} className="p-2 hover:bg-stone-100 rounded-full"><ChevronLeft size={24} /></button>
                                    <span className="text-2xl font-bold text-stone-800">{currentDate.getFullYear()}</span>
                                    <button onClick={() => switchYear(1)} className="p-2 hover:bg-stone-100 rounded-full"><ChevronRight size={24} /></button>
                                </div>
                                <div className="grid grid-cols-4 gap-4 flex-1 content-center px-4">
                                    {Array.from({ length: 12 }, (_, i) => i).map(m => (
                                        <button
                                            key={m}
                                            onClick={() => selectMonth(m)}
                                            className={`
                                         py-3 rounded-xl text-sm font-bold transition-all active:scale-95
                                         ${currentDate.getMonth() === m
                                                    ? 'text-white shadow-md'
                                                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100'}
                                      `}
                                            style={currentDate.getMonth() === m ? { backgroundColor: 'var(--accent-color)' } : undefined}
                                        >
                                            {new Date(2000, m, 1).toLocaleString('zh-CN', { month: 'short' })}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
