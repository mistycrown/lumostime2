/**
 * @file MonthHeatmap.tsx
 * @input Logs, Categories, Month Date
 * @output 月度时间轴热力图
 * @pos Component (Visualization)
 * @description 展示一个月的时间分布热力图，纵轴为日期，横轴为24小时，用活动颜色填充
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useMemo } from 'react';
import { Log, Category } from '../types';
import { IconRenderer } from './IconRenderer';

interface MonthHeatmapProps {
    logs: Log[];
    categories: Category[];
    month: Date;
}

// 从Tailwind类名获取浅色背景色
const getScheduleColor = (className: string = ''): string => {
    if (typeof className !== 'string') return 'rgba(245, 245, 244, 0.9)'; // stone-100/90

    const match = className.match(/(?:text|bg)-([a-z]+)-/);
    const color = match ? match[1] : 'stone';

    // 颜色映射表 - 使用100色阶的浅色系，透明度90%
    const colorMap: Record<string, string> = {
        stone: 'rgba(245, 245, 244, 0.9)',    // stone-100/90
        slate: 'rgba(241, 245, 249, 0.9)',    // slate-100/90
        gray: 'rgba(243, 244, 246, 0.9)',     // gray-100/90
        red: 'rgba(254, 226, 226, 0.9)',      // red-100/90
        orange: 'rgba(255, 237, 213, 0.9)',   // orange-100/90
        amber: 'rgba(254, 243, 199, 0.9)',    // amber-100/90
        yellow: 'rgba(254, 249, 195, 0.9)',   // yellow-100/90
        lime: 'rgba(236, 252, 203, 0.9)',     // lime-100/90
        green: 'rgba(220, 252, 231, 0.9)',    // green-100/90
        emerald: 'rgba(209, 250, 229, 0.9)',  // emerald-100/90
        teal: 'rgba(204, 251, 241, 0.9)',     // teal-100/90
        cyan: 'rgba(207, 250, 254, 0.9)',     // cyan-100/90
        sky: 'rgba(224, 242, 254, 0.9)',      // sky-100/90
        blue: 'rgba(219, 234, 254, 0.9)',     // blue-100/90
        indigo: 'rgba(224, 231, 255, 0.9)',   // indigo-100/90
        violet: 'rgba(237, 233, 254, 0.9)',   // violet-100/90
        purple: 'rgba(243, 232, 255, 0.9)',   // purple-100/90
        fuchsia: 'rgba(250, 232, 255, 0.9)',  // fuchsia-100/90
        pink: 'rgba(252, 231, 243, 0.9)',     // pink-100/90
        rose: 'rgba(255, 228, 230, 0.9)',     // rose-100/90
    };

    return colorMap[color] || colorMap['stone'];
};

export const MonthHeatmap: React.FC<MonthHeatmapProps> = ({ logs, categories, month }) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // 每行的高度（像素）
    const ROW_HEIGHT = 16;
    const TOTAL_HEIGHT = daysInMonth * ROW_HEIGHT;

    // 过滤当月的logs并按日期分组
    const logsByDate = useMemo(() => {
        const dateMap = new Map<number, Log[]>();

        logs.forEach(log => {
            const logDate = new Date(log.startTime);

            // 只处理当月的logs
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
    }, [logs, year, monthIndex]);

    // 收集所有出现的活动用于图例，并按分类和活动顺序排序
    const activityLegend = useMemo(() => {
        const activityMap = new Map<string, {
            name: string;
            color: string;
            icon: string;
            categoryName: string;
            categoryId: string;
            activityId: string;
        }>();

        logs.forEach(log => {
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
                    categoryName: category.name,
                    categoryId: category.id,
                    activityId: activity.id,
                });
            }
        });

        // 按照分类和活动的顺序排序
        const activities = Array.from(activityMap.values());
        activities.sort((a, b) => {
            // 首先按分类顺序
            const catIndexA = categories.findIndex(c => c.id === a.categoryId);
            const catIndexB = categories.findIndex(c => c.id === b.categoryId);

            if (catIndexA !== catIndexB) {
                return catIndexA - catIndexB;
            }

            // 相同分类，按活动顺序
            const category = categories.find(c => c.id === a.categoryId);
            if (!category) return 0;

            const actIndexA = category.activities.findIndex(act => act.id === a.activityId);
            const actIndexB = category.activities.findIndex(act => act.id === b.activityId);

            return actIndexA - actIndexB;
        });

        return activities;
    }, [logs, categories, year, monthIndex]);

    return (
        <div className="w-full flex flex-col">
            {/* 热力图容器 - 固定高度，不使用flex-1 */}
            <div className="flex shrink-0" style={{ height: TOTAL_HEIGHT }}>
                {/* 左侧：日期标签 - 减小宽度 */}
                <div className="w-6 shrink-0 border-r border-stone-100 bg-stone-50/50 relative" style={{ height: TOTAL_HEIGHT }}>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(date => (
                        <div
                            key={date}
                            className="absolute w-full text-[8px] text-stone-400 font-medium text-right pr-0.5"
                            style={{ top: (date - 1) * ROW_HEIGHT, height: ROW_HEIGHT, lineHeight: `${ROW_HEIGHT}px` }}
                        >
                            {String(date).padStart(2, '0')}
                        </div>
                    ))}
                </div>

                {/* 右侧：热力图主体 */}
                <div className="flex-1 relative" style={{ height: TOTAL_HEIGHT }}>
                    {/* 背景网格 - 只显示小时分割线 */}
                    <div className="absolute inset-0 flex">
                        {Array.from({ length: 24 }, (_, h) => (
                            <div
                                key={h}
                                className="flex-1 border-r border-stone-50 last:border-r-0"
                            />
                        ))}
                    </div>

                    {/* 小时标签 */}
                    <div className="absolute top-0 left-0 right-0 flex" style={{ height: 0 }}>
                        {Array.from({ length: 24 }, (_, h) => (
                            <div
                                key={h}
                                className="flex-1 text-[8px] text-stone-400 font-medium text-center"
                                style={{ transform: 'translateY(-12px)' }}
                            >
                                {h % 3 === 0 ? h : ''}
                            </div>
                        ))}
                    </div>

                    {/* 日期行分割线 */}
                    {Array.from({ length: daysInMonth }, (_, i) => (
                        <div
                            key={i}
                            className="absolute w-full border-b border-stone-50"
                            style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                        />
                    ))}

                    {/* 渲染每一天的时间块 */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(date => {
                        const dayLogs = logsByDate.get(date) || [];

                        return (
                            <div key={date} className="absolute w-full" style={{ top: (date - 1) * ROW_HEIGHT, height: ROW_HEIGHT }}>
                                {dayLogs.map(log => {
                                    const startTime = new Date(log.startTime);
                                    const endTime = new Date(log.endTime);

                                    // 计算起始和结束小时（带小数）
                                    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                                    const endHour = endTime.getDate() === date
                                        ? endTime.getHours() + endTime.getMinutes() / 60
                                        : 24; // 如果跨天，当天结束于24点

                                    const left = (startHour / 24) * 100;
                                    const width = ((endHour - startHour) / 24) * 100;

                                    // 获取活动信息
                                    const category = categories.find(c => c.id === log.categoryId);
                                    const activity = category?.activities.find(a => a.id === log.activityId);

                                    if (!activity || !category) return null;

                                    const colorClass = activity.color || category.themeColor || 'bg-stone-100';
                                    const bgColor = getScheduleColor(colorClass);

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

            {/* 图例 - 显示所有活动的颜色，按分类和活动顺序排列 */}
            {activityLegend.length > 0 && (
                <div className="mt-4 pt-3 border-t border-stone-100">
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center px-2">
                        {activityLegend.map((activity, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                                <div
                                    className="w-3 h-3 rounded-sm shrink-0"
                                    style={{ backgroundColor: getScheduleColor(activity.color) }}
                                />
                                <span className="text-[10px] text-stone-600 whitespace-nowrap flex items-center gap-0.5">
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
