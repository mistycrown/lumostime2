/**
 * @file FocusCharts.tsx
 * @input logs, currentDate
 * @output Focus Statistics & Stacked Bar Chart
 * @pos Component (Visualization)
 * @description Visualizes focus trends over time using a calendar heatmap and a stacked bar chart showing focus score distribution.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useMemo, useState } from 'react';
import { Log } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FocusChartsProps {
    logs: Log[];
    currentDate: Date;
    onDateChange: (date: Date) => void;
}

const SCORE_COLORS = {
    1: '#e7e5e4', // stone-200
    2: '#d6d3d1', // stone-300
    3: '#a8a29e', // stone-400
    4: '#78716c', // stone-500
    5: '#44403c', // stone-700
};

export const FocusCharts: React.FC<FocusChartsProps> = ({ logs, currentDate, onDateChange }) => {
    // Calculate Month Range for the Chart
    const range = useMemo(() => {
        const start = new Date(currentDate);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setMonth(end.getMonth() + 1, 0); // Last day of month
        end.setHours(23, 59, 59, 999);

        return { start, end };
    }, [currentDate]);

    // Calculate Data for the Month
    const chartData = useMemo(() => {
        const days = [];
        let iter = new Date(range.start);
        while (iter <= range.end) {
            days.push(new Date(iter));
            iter.setDate(iter.getDate() + 1);
        }

        return days.map(day => {
            const dayLogs = logs.filter(l => {
                const d = new Date(l.startTime);
                return d.getDate() === day.getDate() &&
                    d.getMonth() === day.getMonth() &&
                    d.getFullYear() === day.getFullYear();
            });

            // Stacked Data
            const stacks = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            let totalWeightedScore = 0;
            let totalDuration = 0;

            dayLogs.forEach(l => {
                if (l.focusScore) {
                    stacks[l.focusScore as 1 | 2 | 3 | 4 | 5] += l.duration;
                    totalWeightedScore += l.duration * l.focusScore;
                    totalDuration += l.duration;
                }
            });

            const avgScore = totalDuration > 0 ? totalWeightedScore / totalDuration : 0;
            const totalHours = totalDuration / 3600;

            return {
                date: day,
                stacks,
                avgScore,
                totalHours // For bar height
            };
        });
    }, [logs, range]);

    // Stacked Bar Utils
    const maxBarHours = Math.max(...chartData.map(d => d.totalHours), 1);
    const yMax = Math.ceil(Math.max(4, maxBarHours));

    // Calendar Grid Data
    const calendarData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay();

        const weeks: (Date | null)[][] = [];
        let currentWeek: (Date | null)[] = [];

        // Fill initial empty days
        for (let i = 0; i < startDayOfWeek; i++) {
            currentWeek.push(null);
        }

        // Fill days
        for (let day = 1; day <= daysInMonth; day++) {
            currentWeek.push(new Date(year, month, day));
            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }

        // Fill remaining empty days
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push(null);
            }
            weeks.push(currentWeek);
        }

        return weeks;
    }, [currentDate]);

    // Calculate focus score for each day
    const getFocusColor = (date: Date | null) => {
        if (!date) return 'transparent';
        
        const dayLogs = logs.filter(l => {
            const d = new Date(l.startTime);
            return d.getDate() === date.getDate() &&
                d.getMonth() === date.getMonth() &&
                d.getFullYear() === date.getFullYear() &&
                l.focusScore;
        });

        if (dayLogs.length === 0) return '#fafaf9'; // stone-50

        let totalWeightedScore = 0;
        let totalDuration = 0;

        dayLogs.forEach(l => {
            if (l.focusScore) {
                totalWeightedScore += l.duration * l.focusScore;
                totalDuration += l.duration;
            }
        });

        const avgScore = totalDuration > 0 ? totalWeightedScore / totalDuration : 0;
        
        // Map average score to color
        if (avgScore >= 4.5) return SCORE_COLORS[5];
        if (avgScore >= 3.5) return SCORE_COLORS[4];
        if (avgScore >= 2.5) return SCORE_COLORS[3];
        if (avgScore >= 1.5) return SCORE_COLORS[2];
        return SCORE_COLORS[1];
    };

    const handleMonthChange = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        onDateChange(newDate);
    };

    return (
        <div className="space-y-8">
            {/* Calendar Heatmap with New Style */}
            <div className="space-y-4">
                {/* Month Navigation */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleMonthChange(-1)}
                            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft size={20} className="text-stone-600" />
                        </button>
                        <span className="text-lg font-bold text-stone-900 min-w-[140px] text-center">
                            {currentDate.getFullYear()}.{currentDate.getMonth() + 1}
                        </span>
                        <button
                            onClick={() => handleMonthChange(1)}
                            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                        >
                            <ChevronRight size={20} className="text-stone-600" />
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="space-y-1">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                            <div key={day} className="text-center text-[10px] font-bold text-stone-400 tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Days */}
                    {calendarData.map((week, weekIdx) => (
                        <div key={weekIdx} className="grid grid-cols-7 gap-1">
                            {week.map((date, dayIdx) => {
                                const bgColor = getFocusColor(date);
                                const isToday = date && 
                                    date.getDate() === new Date().getDate() &&
                                    date.getMonth() === new Date().getMonth() &&
                                    date.getFullYear() === new Date().getFullYear();

                                return (
                                    <div
                                        key={dayIdx}
                                        className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                                            date ? 'cursor-pointer hover:ring-2 hover:ring-stone-300' : ''
                                        } ${isToday ? 'ring-2 ring-stone-900' : ''}`}
                                        style={{ backgroundColor: bgColor }}
                                    >
                                        {date && (
                                            <span className={`${
                                                bgColor === SCORE_COLORS[5] || bgColor === SCORE_COLORS[4] 
                                                    ? 'text-white' 
                                                    : 'text-stone-700'
                                            }`}>
                                                {date.getDate()}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Statistics */}
                <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-stone-400 mb-1 font-bold">Total Time</div>
                        <div className="text-2xl font-bold text-stone-900 font-mono">
                            {(() => {
                                // All time
                                const allFocusLogs = logs.filter(l => l.focusScore);
                                const allSeconds = allFocusLogs.reduce((acc, l) => acc + l.duration, 0);
                                const allH = Math.floor(allSeconds / 3600);
                                const allM = Math.floor((allSeconds % 3600) / 60);

                                // Current month
                                const monthFocusLogs = logs.filter(l => {
                                    const d = new Date(l.startTime);
                                    return d.getMonth() === currentDate.getMonth() &&
                                        d.getFullYear() === currentDate.getFullYear() &&
                                        l.focusScore;
                                });
                                const monthSeconds = monthFocusLogs.reduce((acc, l) => acc + l.duration, 0);
                                const monthH = Math.floor(monthSeconds / 3600);
                                const monthM = Math.floor((monthSeconds % 3600) / 60);

                                return (
                                    <>
                                        {allH}<span className="text-base text-stone-400 mx-1 font-sans">h</span>{allM}<span className="text-base text-stone-400 ml-1 font-sans">m</span>
                                        <span className="text-lg text-stone-300 mx-2 font-sans">/</span>
                                        <span className="text-lg font-bold text-stone-600">
                                            {monthH}<span className="text-sm text-stone-400 mx-1 font-sans">h</span>{monthM}<span className="text-sm text-stone-400 ml-1 font-sans">m</span>
                                        </span>
                                    </>
                                );
                            })()}
                        </div>
                        <div className="text-[10px] text-stone-500 bg-stone-100 inline-block px-2 py-1 rounded mt-2 font-bold">
                            {(() => {
                                const allCount = logs.filter(l => l.focusScore).length;
                                const monthCount = logs.filter(l => {
                                    const d = new Date(l.startTime);
                                    return d.getMonth() === currentDate.getMonth() &&
                                        d.getFullYear() === currentDate.getFullYear() &&
                                        l.focusScore;
                                }).length;
                                return `${allCount} / ${monthCount} records`;
                            })()}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] uppercase tracking-widest text-stone-400 mb-1 font-bold">Average</div>
                        <div className="text-xl font-bold text-stone-700 font-mono">
                            {(() => {
                                // All time average
                                const allFocusLogs = logs.filter(l => l.focusScore);
                                let allTotalWeighted = 0;
                                let allTotalDuration = 0;
                                allFocusLogs.forEach(l => {
                                    if (l.focusScore) {
                                        allTotalWeighted += l.duration * l.focusScore;
                                        allTotalDuration += l.duration;
                                    }
                                });
                                const allAvg = allTotalDuration > 0 ? (allTotalWeighted / allTotalDuration).toFixed(1) : '0.0';

                                // Current month average
                                const monthLogs = logs.filter(l => {
                                    const d = new Date(l.startTime);
                                    return d.getMonth() === currentDate.getMonth() &&
                                        d.getFullYear() === currentDate.getFullYear() &&
                                        l.focusScore;
                                });
                                let monthTotalWeighted = 0;
                                let monthTotalDuration = 0;
                                monthLogs.forEach(l => {
                                    if (l.focusScore) {
                                        monthTotalWeighted += l.duration * l.focusScore;
                                        monthTotalDuration += l.duration;
                                    }
                                });
                                const monthAvg = monthTotalDuration > 0 ? (monthTotalWeighted / monthTotalDuration).toFixed(1) : '0.0';

                                return (
                                    <>
                                        {allAvg}
                                        <span className="text-base text-stone-400 mx-2 font-sans">/</span>
                                        <span className="text-base font-bold text-stone-600">{monthAvg}</span>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stacked Bar Chart */}
            <div className="bg-white px-6 py-6 pb-12 pl-12 rounded-3xl border border-stone-100 shadow-sm relative">
                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6 text-center">Focus Duration Distribution</h4>
                <div className="h-[200px] w-full flex items-end justify-between gap-1 relative z-10">
                    {/* Y Axis Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map(p => (
                        <div key={p} className="absolute left-0 right-0 border-t border-dashed border-stone-100 z-0" style={{ bottom: `${p * 100}%` }}>
                            <span className="absolute -left-8 -top-2 text-[10px] text-stone-300 font-mono">{(yMax * p).toFixed(1)}h</span>
                        </div>
                    ))}

                    {chartData.map((d, idx) => {
                        const totalHeightPct = (d.totalHours / yMax) * 100;

                        return (
                            <div key={idx} className="flex-1 h-full flex flex-col justify-end relative group">
                                <div className="w-full relative rounded-t-sm overflow-hidden z-10" style={{ height: `${Math.min(totalHeightPct, 100)}%` }}>
                                    {[1, 2, 3, 4, 5].map((score) => {
                                        const h = d.totalHours > 0 ? (d.stacks[score as 1 | 2 | 3 | 4 | 5] / 3600 / d.totalHours) * 100 : 0;
                                        if (h === 0) return null;
                                        return (
                                            <div
                                                key={score}
                                                style={{
                                                    height: `${h}%`,
                                                    backgroundColor: SCORE_COLORS[score as 1 | 2 | 3 | 4 | 5]
                                                }}
                                                className="w-full transition-all"
                                                title={`Score ${score}: ${(d.stacks[score as 1 | 2 | 3 | 4 | 5] / 3600).toFixed(1)}h`}
                                            />
                                        );
                                    })}
                                </div>

                                {/* X Axis Label - Every 5 days */}
                                {(d.date.getDate() === 1 || d.date.getDate() % 5 === 0) && (
                                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-center w-6">
                                        <span className="text-[10px] font-mono text-stone-400 block">{d.date.getDate()}</span>
                                    </div>
                                )}

                                {/* Tooltip on Hover */}
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                    <div className="font-bold border-b border-stone-700 pb-1 mb-1">{d.date.toLocaleDateString()}</div>
                                    <div>Total: {d.totalHours.toFixed(1)}h</div>
                                    <div>Avg: {d.avgScore.toFixed(1)}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
