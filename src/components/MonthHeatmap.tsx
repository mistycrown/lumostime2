/**
 * @file MonthHeatmap.tsx
 * @input Logs, Categories, Month Date
 * @output 月度时间轴热力图
 * @pos Component (Visualization)
 * @description 展示一个月的时间分布热力图，纵轴为日期，横轴为24小时，使用统一颜色适配层渲染活动颜色。
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 * @updated 2026-07-22: Added semantic hooks for dark-mode month schedule grids, labels, and legends.
 * @updated 2026-08-09: Planned timeline blocks are excluded from month heatmap statistics.
 */
import React, { useMemo } from 'react';
import { Log, Category } from '../types';
import { IconRenderer } from './IconRenderer';
import { getHeatmapFillColor } from '../utils/colorAdapterUtils';
import { filterCountableLogs } from '../utils/statLogUtils';

interface MonthHeatmapProps {
    logs: Log[];
    categories: Category[];
    month: Date;
}

const ROW_HEIGHT = 16;
const HOUR_LABEL_INTERVAL = 3;

export const MonthHeatmap: React.FC<MonthHeatmapProps> = ({ logs, categories, month }) => {
    const countableLogs = useMemo(() => filterCountableLogs(logs), [logs]);
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const TOTAL_HEIGHT = daysInMonth * ROW_HEIGHT;

    const logsByDate = useMemo(() => {
        const dateMap = new Map<number, Log[]>();

        countableLogs.forEach(log => {
            const logDate = new Date(log.startTime);

            if (logDate.getMonth() !== monthIndex || logDate.getFullYear() !== year) {
                return;
            }

            const date = logDate.getDate();
            if (!dateMap.has(date)) {
                dateMap.set(date, []);
            }
            dateMap.get(date)!.push(log);
        });

        return dateMap;
    }, [countableLogs, year, monthIndex]);

    const activityLegend = useMemo(() => {
        const activityMap = new Map<string, {
            name: string;
            color: string;
            icon: string;
            uiIcon?: string;
            categoryName: string;
            categoryId: string;
            activityId: string;
        }>();

        countableLogs.forEach(log => {
            const logDate = new Date(log.startTime);
            if (logDate.getMonth() !== monthIndex || logDate.getFullYear() !== year) {
                return;
            }

            const category = categories.find(c => c.id === log.categoryId);
            const activity = category?.activities.find(a => a.id === log.activityId);

            if (activity && category && !activityMap.has(activity.id)) {
                activityMap.set(activity.id, {
                    name: activity.name,
                    color: activity.color || category.themeColor || 'bg-stone-100',
                    icon: activity.icon,
                    uiIcon: activity.uiIcon,
                    categoryName: category.name,
                    categoryId: category.id,
                    activityId: activity.id,
                });
            }
        });

        const activities = Array.from(activityMap.values());
        activities.sort((a, b) => {
            const catIndexA = categories.findIndex(c => c.id === a.categoryId);
            const catIndexB = categories.findIndex(c => c.id === b.categoryId);

            if (catIndexA !== catIndexB) {
                return catIndexA - catIndexB;
            }

            const category = categories.find(c => c.id === a.categoryId);
            if (!category) return 0;

            const actIndexA = category.activities.findIndex(act => act.id === a.activityId);
            const actIndexB = category.activities.findIndex(act => act.id === b.activityId);

            return actIndexA - actIndexB;
        });

        return activities;
    }, [countableLogs, categories, year, monthIndex]);

    return (
        <div className="stats-month-heatmap w-full flex flex-col">
            <div className="flex shrink-0" style={{ height: TOTAL_HEIGHT }}>
                <div className="schedule-time-rail w-6 shrink-0 border-r border-stone-100 bg-stone-50/50 relative" style={{ height: TOTAL_HEIGHT }}>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(date => (
                        <div
                            key={date}
                            className="schedule-time-label absolute w-full text-[8px] text-stone-400 font-medium text-right pr-0.5"
                            style={{ top: (date - 1) * ROW_HEIGHT, height: ROW_HEIGHT, lineHeight: `${ROW_HEIGHT}px` }}
                        >
                            {String(date).padStart(2, '0')}
                        </div>
                    ))}
                </div>

                <div className="flex-1 relative" style={{ height: TOTAL_HEIGHT }}>
                    <div className="absolute inset-0 flex">
                        {Array.from({ length: 24 }, (_, h) => (
                            <div
                                key={h}
                                className="schedule-day-column flex-1 border-r border-stone-50 last:border-r-0"
                            />
                        ))}
                    </div>

                    <div className="absolute top-0 left-0 right-0 flex" style={{ height: 0 }}>
                        {Array.from({ length: 24 }, (_, h) => (
                            <div
                                key={h}
                                className="schedule-time-label flex-1 text-[8px] text-stone-400 font-medium text-center"
                                style={{ transform: 'translateY(-12px)' }}
                            >
                                {h % HOUR_LABEL_INTERVAL === 0 ? h : ''}
                            </div>
                        ))}
                    </div>

                    {Array.from({ length: daysInMonth }, (_, i) => (
                        <div
                            key={i}
                            className="schedule-grid-line absolute w-full border-b border-stone-50"
                            style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                        />
                    ))}

                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(date => {
                        const dayLogs = logsByDate.get(date) || [];

                        return (
                            <div key={date} className="absolute w-full" style={{ top: (date - 1) * ROW_HEIGHT, height: ROW_HEIGHT }}>
                                {dayLogs.map(log => {
                                    const startTime = new Date(log.startTime);
                                    const endTime = new Date(log.endTime);

                                    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                                    const endHour = endTime.getDate() === date
                                        ? endTime.getHours() + endTime.getMinutes() / 60
                                        : 24;

                                    const left = (startHour / 24) * 100;
                                    const width = ((endHour - startHour) / 24) * 100;

                                    const category = categories.find(c => c.id === log.categoryId);
                                    const activity = category?.activities.find(a => a.id === log.activityId);

                                    if (!activity || !category) return null;

                                    const colorValue = activity.color || category.themeColor || 'bg-stone-100';
                                    const bgColor = getHeatmapFillColor(colorValue);

                                    return (
                                        <div
                                            key={log.id}
                                            className="absolute h-full cursor-pointer transition-opacity hover:opacity-70"
                                            style={{
                                                left: `${left}%`,
                                                width: `${width}%`,
                                                backgroundColor: bgColor,
                                            }}
                                            title={`${category.name}/${activity.name}${log.note ? ' - ' + log.note : ''}`}
                                        />
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {activityLegend.length > 0 && (
                <div className="schedule-legend mt-4 pt-3 border-t border-stone-100">
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center px-2">
                        {activityLegend.map((activity, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                                <div
                                    className="w-3 h-3 rounded-sm shrink-0"
                                    style={{ backgroundColor: getHeatmapFillColor(activity.color) }}
                                />
                                <span className="schedule-legend-label text-[10px] text-stone-600 whitespace-nowrap flex items-center gap-0.5">
                                    <IconRenderer
                                        icon={activity.icon}
                                        uiIcon={activity.uiIcon}
                                        size={10}
                                    />
                                    <span>{activity.name}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
