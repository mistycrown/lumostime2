/**
 * @file DetailTimelineCard.tsx
 * @input Filtered logs, display date, entity info
 * @output Timeline UI with calendar, stats, and history
 * @pos Component (Shared Detail View UI)
 * @description 详情页面共享的时间线卡片组件，包括月历热图、统计信息和历史记录列表
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useMemo } from 'react';
import { Log, Category } from '../types';
import { CalendarWidget } from './CalendarWidget';
import { Clock, Zap } from 'lucide-react';

interface DetailTimelineCardProps {
    // 数据
    filteredLogs: Log[];              // 已过滤的日志（category/activity/scope特定）
    displayDate: Date;                // 当前显示的月份
    onDateChange: (date: Date) => void;

    // 自定义选项
    customScale?: { min: number; max: number }; // 可选的热图刻度
    entityInfo: {                     // 实体信息（用于显示标签）
        icon?: string;
        name: string;
        type: 'category' | 'activity' | 'scope' | 'other';
    };

    // 回调
    onEditLog?: (log: Log) => void;

    // 可选的类别信息（用于显示activity名称）
    categories?: Category[];

    // 自定义元数据渲染（用于显示不同页面特定的标签）
    renderLogMetadata?: (log: Log) => React.ReactNode;
    // 默认视图模式 (默认 'month')
    defaultViewMode?: 'month' | 'all';
}

export const DetailTimelineCard: React.FC<DetailTimelineCardProps> = ({
    filteredLogs,
    displayDate,
    onDateChange,
    customScale,
    entityInfo,
    onEditLog,
    categories,
    renderLogMetadata,
    defaultViewMode = 'month'
}) => {
    const [viewMode, setViewMode] = React.useState<'month' | 'all'>(defaultViewMode);

    const displayMonth = displayDate.getMonth();
    const displayYear = displayDate.getFullYear();

    // 当月日志
    const monthLogs = useMemo(() => filteredLogs.filter(log => {
        const d = new Date(log.startTime);
        return d.getMonth() === displayMonth && d.getFullYear() === displayYear;
    }), [filteredLogs, displayMonth, displayYear]);

    // 显示日志：根据模式选择
    const logsToDisplay = viewMode === 'month' ? monthLogs : filteredLogs;

    // 总计统计
    const totalSeconds = filteredLogs.reduce((acc, curr) => acc + curr.duration, 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMins = Math.floor((totalSeconds % 3600) / 60);

    // 当月统计
    const monthSeconds = monthLogs.reduce((acc, curr) => acc + curr.duration, 0);
    const monthHours = Math.floor(monthSeconds / 3600);
    const monthMins = Math.floor((monthSeconds % 3600) / 60);

    // 平均时长 (All View)
    const avgDurationMins = filteredLogs.length > 0
        ? Math.round(totalSeconds / filteredLogs.length / 60)
        : 0;
    const avgDurationH = Math.floor(avgDurationMins / 60);
    const avgDurationM = avgDurationMins % 60;

    // 热图/分组数据
    const groupedData = useMemo(() => {
        // 使用 logsToDisplay 进行分组
        // 这里的 key 需要包含完整日期信息以便排序 (timestamp or YYYY-MM-DD)
        // 为了复用现有逻辑（按日分组），我们使用 timestamp (Start of day) 作为 key
        const map = new Map<number, number>(); // Key: timestamp of start of day
        const logsMap = new Map<number, Log[]>();

        logsToDisplay.forEach(log => {
            const d = new Date(log.startTime);
            const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

            map.set(startOfDay, (map.get(startOfDay) || 0) + log.duration);

            if (!logsMap.has(startOfDay)) {
                logsMap.set(startOfDay, []);
            }
            logsMap.get(startOfDay)!.push(log);
        });

        return { durationMap: map, logsMap };
    }, [logsToDisplay]);

    return (
        <>
            {viewMode === 'month' ? (
                <div className="bg-white rounded-[2rem] p-0 mb-8 border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
                    <CalendarWidget
                        currentDate={displayDate}
                        onDateChange={(newDate) => {
                            // Only update if month/year changes to allow navigation
                            if (newDate.getMonth() !== displayDate.getMonth() || newDate.getFullYear() !== displayDate.getFullYear()) {
                                onDateChange(newDate);
                            }
                        }}
                        logs={filteredLogs}
                        isExpanded={true}
                        onExpandToggle={() => { }}
                        disableSelection={true}
                        hideTopBar={true}
                        customScale={customScale}
                    />

                    <div className="px-6 pb-6 pt-2 flex flex-wrap gap-y-4 items-end justify-between">
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-stone-400 mb-1 font-bold">Total Time</div>
                            <div className="text-2xl font-bold text-stone-900 font-mono">
                                {totalHours}<span className="text-base text-stone-400 mx-1 font-sans">h</span>{totalMins}<span className="text-base text-stone-400 ml-1 font-sans">m</span>
                                <span className="text-lg text-stone-300 mx-2 font-sans">/</span>
                                <span className="text-lg font-bold text-stone-600">
                                    {monthHours}<span className="text-sm text-stone-400 mx-1 font-sans">h</span>{monthMins}<span className="text-sm text-stone-400 ml-1 font-sans">m</span>
                                </span>
                            </div>
                            {(() => {
                                const totalDays = new Set(filteredLogs.map(l => new Date(l.startTime).toDateString())).size;
                                const monthDays = new Set(monthLogs.map(l => new Date(l.startTime).toDateString())).size;
                                return (
                                    <div className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded inline-block mt-1">
                                        Recorded {totalDays} days / {monthDays} days
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="text-right ml-auto">
                            <div className="text-[10px] uppercase tracking-widest text-stone-400 mb-1 font-bold">Avg. Daily</div>
                            <div className="text-xl font-bold text-stone-700 font-mono">
                                {(() => {
                                    const totalDays = new Set(filteredLogs.map(l => new Date(l.startTime).toDateString())).size;
                                    const monthDays = new Set(monthLogs.map(l => new Date(l.startTime).toDateString())).size;
                                    const avgTotal = totalDays > 0 ? Math.round(totalSeconds / 60 / totalDays) : 0;
                                    const avgMonth = monthDays > 0 ? Math.round(monthSeconds / 60 / monthDays) : 0;
                                    return (
                                        <>
                                            {avgTotal}m
                                            <span className="text-base text-stone-400 mx-2 font-sans">/</span>
                                            <span className="text-base font-bold text-stone-600">{avgMonth}m</span>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // All View Stats (Three Columns)
                <div className="flex items-start justify-around px-2 py-4 mb-8">
                    {/* Total Duration */}
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-bold text-stone-900 tracking-wider">累计投入</span>
                        <div className="flex items-baseline text-stone-800">
                            <span className="text-3xl font-black font-mono tracking-tight">{totalHours}</span>
                            <span className="text-sm font-bold opacity-60 ml-0.5 mr-1 text-stone-400">h</span>
                            <span className="text-xl font-bold font-mono tracking-tight">{totalMins}</span>
                            <span className="text-xs font-bold opacity-60 ml-0.5 text-stone-400">m</span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-10 bg-stone-200/50 mt-1"></div>

                    {/* Count */}
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-bold text-stone-900 tracking-wider">累计次数</span>
                        <div className="flex items-baseline text-stone-800">
                            <span className="text-3xl font-black font-mono tracking-tight">{filteredLogs.length}</span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-10 bg-stone-200/50 mt-1"></div>

                    {/* Avg Duration */}
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-bold text-stone-900 tracking-wider">平均时长</span>
                        <div className="flex items-baseline text-stone-800">
                            {avgDurationH > 0 ? (
                                <>
                                    <span className="text-3xl font-black font-mono tracking-tight">{avgDurationH}</span>
                                    <span className="text-sm font-bold opacity-60 ml-0.5 mr-1 text-stone-400">h</span>
                                    {avgDurationM > 0 && (
                                        <>
                                            <span className="text-xl font-bold font-mono tracking-tight">{avgDurationM}</span>
                                            <span className="text-xs font-bold opacity-60 ml-0.5 text-stone-400">m</span>
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    <span className="text-3xl font-black font-mono tracking-tight">{avgDurationM}</span>
                                    <span className="text-sm font-bold opacity-60 ml-0.5 text-stone-400">m</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* History List */}
            <div className="space-y-8">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Clock size={14} className="text-stone-400" />
                        <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                            {viewMode === 'month'
                                ? `History (${displayMonth + 1}/${displayYear})`
                                : `History (All)`
                            }
                        </span>
                    </div>

                    {/* Toggle Button */}
                    <div className="flex bg-stone-100/50 p-0.5 rounded-lg">
                        <button
                            onClick={() => setViewMode('all')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === 'all'
                                ? 'bg-white text-stone-900 shadow-sm'
                                : 'text-stone-400 hover:text-stone-600'
                                }`}
                        >
                            全部
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === 'month'
                                ? 'bg-white text-stone-900 shadow-sm'
                                : 'text-stone-400 hover:text-stone-600'
                                }`}
                        >
                            {displayMonth + 1}月
                        </button>
                    </div>
                </div>

                {logsToDisplay.length === 0 ? (
                    <div className="text-center py-10 text-stone-400 text-sm italic border border-dashed border-stone-200 rounded-2xl">
                        {viewMode === 'month' ? 'No activity recorded in this month.' : 'No activity recorded.'}
                    </div>
                ) : (
                    Array.from(groupedData.durationMap.keys()).sort((a: number, b: number) => b - a).map((timestamp: number) => {
                        const daySeconds = groupedData.durationMap.get(timestamp) || 0;
                        const dayLogsFiltered = groupedData.logsMap.get(timestamp) || [];

                        const date = new Date(timestamp);
                        const month = date.getMonth() + 1;
                        const day = date.getDate();
                        const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];

                        return (
                            <div key={timestamp} className="flex flex-col gap-3 group">
                                <div className="flex justify-between items-end border-b border-stone-100 pb-2">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-lg font-bold text-stone-800 font-mono">
                                            {String(month).padStart(2, '0')}/{String(day).padStart(2, '0')}
                                        </span>
                                        <span className="text-xs font-medium text-stone-400">{weekDay}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-stone-900 font-mono">{Math.floor(daySeconds / 60)}m</span>
                                    </div>
                                </div>

                                <div className="relative border-l border-stone-300 ml-[70px] space-y-6 pb-4">
                                    {dayLogsFiltered.sort((a, b) => b.startTime - a.startTime).map(log => {
                                        // 查找对应的category和activity
                                        const category = categories?.find(c => c.id === log.categoryId);
                                        const activity = category?.activities.find(a => a.id === log.activityId);

                                        const d = new Date(log.startTime);
                                        const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                                        const durationMins = Math.round(log.duration / 60);
                                        const h = Math.floor(durationMins / 60);
                                        const m = durationMins % 60;
                                        const durStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

                                        return (
                                            <div
                                                key={log.id}
                                                className="relative pl-8 group cursor-pointer rounded-xl hover:bg-stone-50/80 transition-colors p-2 -ml-2"
                                                onClick={() => onEditLog?.(log)}
                                            >
                                                {/* Time & Duration - Absolute Left */}
                                                <div className="absolute -left-[60px] top-0 w-[45px] text-right flex flex-col items-end">
                                                    <span className="text-sm font-bold text-stone-800 leading-none font-mono">
                                                        {timeStr}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-stone-400 mt-1">
                                                        {durStr}
                                                    </span>
                                                </div>

                                                {/* Timeline Dot */}
                                                <div className="absolute left-[3px] top-2 w-2.5 h-2.5 rounded-full bg-stone-900 border-2 border-[#faf9f6] z-10" />

                                                <div className="relative top-[-2px]">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-lg font-bold text-stone-900 leading-tight">
                                                            {activity?.name || category?.name || 'Unknown Activity'}
                                                        </span>
                                                        {log.focusScore && log.focusScore > 0 && (
                                                            <span className="text-sm font-bold text-stone-400 font-mono flex items-center gap-0.5">
                                                                <Zap size={12} fill="currentColor" />
                                                                {log.focusScore}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {log.note && (
                                                        <p className="text-sm text-stone-500 font-light leading-relaxed mb-2 whitespace-pre-wrap">
                                                            {log.note}
                                                        </p>
                                                    )}
                                                    {/* 自定义元数据渲染 */}
                                                    {renderLogMetadata ? (
                                                        renderLogMetadata(log)
                                                    ) : (
                                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                                            <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                                                <span className="font-bold text-stone-400">
                                                                    {entityInfo.type === 'category' ? '#' : entityInfo.type === 'activity' ? '#' : '%'}
                                                                </span>
                                                                <span>{entityInfo.icon}</span>
                                                                <span>{entityInfo.name}</span>
                                                                {activity && entityInfo.type === 'category' && (
                                                                    <>
                                                                        <span className="mx-1 text-stone-300">/</span>
                                                                        <span className="mr-1">{activity.icon}</span>
                                                                        <span className="text-stone-500">{activity.name}</span>
                                                                    </>
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </>
    );
};
