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
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ currentDate, onDateChange, logs = [], isExpanded, onExpandToggle, extraHeaderControls, disableSelection, customScale, heatmapMode, staticMode, preventCollapse, onResetView, startWeekOnSunday = false, renderCustomDay, hideTopBar = false }) => {

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
                <div className="px-6 py-4 flex items-center justify-between border-b border-stone-100">
                    {/* 左侧：extraHeaderControls（包含同步按钮等） */}
                    <div className="flex items-center gap-1">
                        {extraHeaderControls}
                    </div>

                    {/* 右侧：Today和展开/收缩按钮 */}
                    <div className="flex items-center gap-3">
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
                                        } else {
                                            onExpandToggle();
                                        }
                                    }}
                                    className={`
                               px-3 py-1.5 rounded-full border transition-all active:scale-95
                               ${isExpanded ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'}
                            `}
                                >
                                    {isExpanded ? <X size={16} /> : <CalendarIcon size={16} />}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Calendar Area */}
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-[60px] opacity-100'}`}>

                {!isExpanded ? (
                    // Week View (Collapsed)
                    <div className="flex justify-between items-center px-4 pb-1 md:justify-center md:gap-8 h-[60px]">
                        {getWeekDays().map((day, idx) => {
                            const selected = !disableSelection && isSameDay(day, currentDate);
                            const today = isToday(day);
                            const hasData = hasLogs(day);
                            return (
                                <button
                                    key={idx}
                                    onClick={() => onDateChange(day)}
                                    className={`
                               w-12 h-12 rounded-xl transition-all duration-300 active:scale-95 relative group
                               ${selected
                                            ? 'bg-stone-900 text-white shadow-md'
                                            : 'bg-transparent text-stone-400'
                                        }
                            `}
                                >
                                    {/* Date Number - Centered */}
                                    <div className="absolute inset-0 flex items-center justify-center">
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
                    <div className={hideTopBar ? "px-6 pb-6 pt-6 animate-in fade-in duration-300" : "px-6 pb-6 animate-in fade-in duration-300"}>
                        <>
                            <div className="flex items-center justify-between mt-3 mb-4 px-2">
                                <button onClick={() => switchMonth(-1)} className="p-1 hover:bg-stone-100 rounded-full"><ChevronLeft size={20} /></button>
                                <span className="font-bold text-stone-800">
                                    {currentDate.getFullYear()} . {currentDate.getMonth() + 1}
                                </span>
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

                                        // Skip heatmap coloring if staticMode is enabled and renderCustomDay is provided
                                        if (!staticMode || !renderCustomDay) {
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
                    </div>
                )}
            </div>
        </div>
    );
};
