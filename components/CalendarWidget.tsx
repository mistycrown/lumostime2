import React, { useState } from 'react';
import { Log } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

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
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ currentDate, onDateChange, logs = [], isExpanded, onExpandToggle, extraHeaderControls, disableSelection, customScale, heatmapMode, staticMode, preventCollapse, onResetView, startWeekOnSunday = false, renderCustomDay }) => {
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


    // Helper to get simple week row
    const getWeekDays = () => {
        const days = [];
        // Always center around current selected date (7 days: -3 to +3)
        for (let i = -3; i <= 3; i++) {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + i);
            days.push(d);
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
        <div className="bg-white z-20 shadow-sm transition-all duration-500 ease-in-out overflow-hidden flex flex-col shrink-0 border-b border-stone-200">

            {/* Top Bar */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-stone-100">
                <div className="flex flex-col">
                    <button
                        onClick={() => {
                            if (isExpanded) {
                                setViewMode(viewMode === 'calendar' ? 'month_year' : 'calendar');
                            } else {
                                onExpandToggle();
                                setViewMode('month_year');
                            }
                        }}
                        className="text-xs font-medium text-stone-400 uppercase tracking-widest hover:text-stone-600 transition-colors text-left whitespace-nowrap"
                    >
                        {String(currentDate.getFullYear()).slice(-2)}/{String(currentDate.getMonth() + 1).padStart(2, '0')}
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {extraHeaderControls}
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
                               ${isExpanded ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'}
                            `}
                            >
                                {isExpanded ? <X size={20} /> : <CalendarIcon size={20} />}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Calendar Area */}
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-[75px] opacity-100'}`}>

                {!isExpanded ? (
                    // Week View (Collapsed)
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
                               help w-12 h-14 rounded-xl transition-all duration-300 active:scale-95 relative group
                               ${selected
                                            ? 'bg-stone-900 text-white shadow-md'
                                            : 'bg-transparent text-stone-400'
                                        }
                            `}
                                >
                                    {/* Week Day - Fixed Top Position */}
                                    <div className="absolute top-2.5 left-0 right-0 flex justify-center">
                                        <span className="text-[10px] font-serif font-medium uppercase tracking-wider opacity-80 leading-none">
                                            {weekDaysShort[day.getDay()]}
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
                                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    // Expanded View
                    <div className="px-6 pb-6 animate-in fade-in duration-300">
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

                                        // Determine intensity class
                                        let bgClass = 'bg-transparent';
                                        let textClass = 'text-stone-600';

                                        if (heatmapMode === 'focus') {
                                            if (selected) {
                                                bgClass = 'bg-stone-900 shadow-md';
                                                textClass = 'text-white';
                                            } else if (intensityValue > 0) {
                                                // Focus Score Coloring (1-5)
                                                // Round to nearest integer for simple mapping
                                                const score = Math.round(intensityValue);
                                                if (score >= 4.5) { // 5
                                                    bgClass = 'bg-stone-800';
                                                    textClass = 'text-white';
                                                } else if (score >= 3.5) { // 4
                                                    bgClass = 'bg-stone-600';
                                                    textClass = 'text-white';
                                                } else if (score >= 2.5) { // 3
                                                    bgClass = 'bg-stone-400';
                                                    textClass = 'text-white';
                                                } else if (score >= 1.5) { // 2
                                                    bgClass = 'bg-stone-300';
                                                    textClass = 'text-stone-800';
                                                } else { // 1
                                                    bgClass = 'bg-stone-100';
                                                    textClass = 'text-stone-600';
                                                }
                                            }
                                        } else {
                                            // Duration Coloring
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
                                                bgClass = 'bg-stone-900 shadow-md';
                                                textClass = 'text-white';
                                            } else if (duration > 0) {
                                                if (customScale) {
                                                    if (duration >= customScale.max) {
                                                        bgClass = 'bg-stone-700';
                                                        textClass = 'text-white';
                                                    } else if (duration <= t1) {
                                                        bgClass = 'bg-stone-100';
                                                        textClass = 'text-stone-600';
                                                    } else if (duration <= t2) {
                                                        bgClass = 'bg-stone-300';
                                                        textClass = 'text-stone-800';
                                                    } else {
                                                        bgClass = 'bg-stone-500';
                                                        textClass = 'text-white';
                                                    }
                                                } else {
                                                    if (duration <= 1800) {
                                                        bgClass = 'bg-stone-100';
                                                        textClass = 'text-stone-600';
                                                    } else if (duration <= 7200) {
                                                        bgClass = 'bg-stone-300';
                                                        textClass = 'text-stone-800';
                                                    } else if (duration <= 14400) {
                                                        bgClass = 'bg-stone-500';
                                                        textClass = 'text-white';
                                                    } else {
                                                        bgClass = 'bg-stone-700';
                                                        textClass = 'text-white';
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
                                <div className="grid grid-cols-4 gap-4 flex-1 content-center">
                                    {Array.from({ length: 12 }, (_, i) => i).map(m => (
                                        <button
                                            key={m}
                                            onClick={() => selectMonth(m)}
                                            className={`
                                         py-3 rounded-xl text-sm font-bold transition-all active:scale-95
                                         ${currentDate.getMonth() === m
                                                    ? 'bg-stone-900 text-white shadow-md'
                                                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100'}
                                      `}
                                        >
                                            {new Date(2000, m, 1).toLocaleString('default', { month: 'short' })}
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
