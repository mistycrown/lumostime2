/**
 * @file FilterDetailView.tsx
 * @input Filter, Logs, Categories, Scopes, Todos
 * @output Filter detail display with timeline and heatmap
 * @pos View (Detail Page)
 * @description 筛选器详情页,展示匹配筛选器的记录的时间线和热力图
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Filter, Log, Category, Scope, TodoItem, TodoCategory } from '../types';
import { getFilteredLogs } from '../utils/filterUtils';
import { CalendarWidget } from '../components/CalendarWidget';
import { Clock, ChevronLeft } from 'lucide-react';

interface FilterDetailViewProps {
    filter: Filter;
    logs: Log[];
    categories: Category[];
    scopes: Scope[];
    todos: TodoItem[];
    todoCategories: TodoCategory[];
    onClose: () => void;
    onEditLog?: (log: Log) => void;
}

export const FilterDetailView: React.FC<FilterDetailViewProps> = ({
    filter,
    logs,
    categories,
    scopes,
    todos,
    todoCategories,
    onClose,
    onEditLog
}) => {
    const [activeTab, setActiveTab] = useState('时间线');
    const [selectedActivities, setSelectedActivities] = useState<Set<string> | null>(null);
    const [trendTimeframe, setTrendTimeframe] = useState<'week' | 'month'>('week');
    const [focusTimeframe, setFocusTimeframe] = useState<'day' | 'week' | 'month'>('day');
    const [displayDate, setDisplayDate] = useState(new Date());

    const heatmapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeTab === '趋势' && heatmapRef.current) {
            heatmapRef.current.scrollLeft = heatmapRef.current.scrollWidth;
        }
    }, [activeTab]);

    // 过滤匹配的记录
    const filteredLogs = useMemo(() => {
        return getFilteredLogs(logs, filter, {
            categories,
            scopes,
            todos,
            todoCategories
        });
    }, [logs, filter, categories, scopes, todos, todoCategories]);

    // 总计统计
    const totalSeconds = filteredLogs.reduce((acc, curr) => acc + curr.duration, 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMins = Math.floor((totalSeconds % 3600) / 60);

    // 当月数据
    const displayMonth = displayDate.getMonth();
    const displayYear = displayDate.getFullYear();

    const heatmapData = useMemo(() => {
        const map = new Map<number, number>();
        filteredLogs.forEach(log => {
            const d = new Date(log.startTime);
            if (d.getMonth() === displayMonth && d.getFullYear() === displayYear) {
                const day = d.getDate();
                map.set(day, (map.get(day) || 0) + log.duration);
            }
        });
        return map;
    }, [filteredLogs, displayMonth, displayYear]);

    const monthLogs = useMemo(() => filteredLogs.filter(log => {
        const d = new Date(log.startTime);
        return d.getMonth() === displayMonth && d.getFullYear() === displayYear;
    }), [filteredLogs, displayMonth, displayYear]);

    const monthSeconds = monthLogs.reduce((acc, curr) => acc + curr.duration, 0);
    const monthHours = Math.floor(monthSeconds / 3600);
    const monthMins = Math.floor((monthSeconds % 3600) / 60);
    const monthDays = new Set(monthLogs.map(l => new Date(l.startTime).getDate())).size;

    // Timeline View Data Preparation
    const timelineGroups = useMemo(() => {
        const groups: { date: Date; logs: Log[]; duration: number }[] = [];
        const dateMap = new Map<string, typeof groups[0]>();

        filteredLogs.forEach(log => {
            const d = new Date(log.startTime);
            const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; // Use 1-indexed month for key safety

            if (!dateMap.has(dateKey)) {
                const group = {
                    date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
                    logs: [],
                    duration: 0
                };
                dateMap.set(dateKey, group);
                groups.push(group);
            }
            const group = dateMap.get(dateKey)!;
            group.logs.push(log);
            group.duration += log.duration;
        });

        return groups.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [filteredLogs]);

    // Trend View Data Preparation - Weekly (Existing)
    const weeklyTrend = useMemo(() => {
        const weeks = new Map<string, number>();
        const now = new Date();
        // Generate last 12 weeks keys to ensure continuity
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
            const weekNum = Math.ceil((((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7);
            const key = `${d.getFullYear()}-W${weekNum}`;
            weeks.set(key, 0);
        }

        filteredLogs.forEach(log => {
            const d = new Date(log.startTime);
            const weekNum = Math.ceil((((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7);
            const k = `${d.getFullYear()}-W${weekNum}`;
            if (weeks.has(k)) {
                weeks.set(k, (weeks.get(k) || 0) + log.duration);
            }
        });

        return Array.from(weeks.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-12);
    }, [filteredLogs]);

    // Trend View Data Preparation - Monthly (New)
    const monthlyTrend = useMemo(() => {
        const months = new Map<string, number>();
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            months.set(key, 0);
        }

        filteredLogs.forEach(log => {
            const d = new Date(log.startTime);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (months.has(key)) {
                months.set(key, months.get(key)! + log.duration);
            }
        });

        return Array.from(months.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [filteredLogs]);

    // Trend View Data Preparation - Contribution Graph (New)
    const contributionData = useMemo(() => {
        const today = new Date();
        const endDate = today;
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 364); // Last ~1 year (52 weeks * 7 + 1)

        const dayMap = new Map<string, number>();
        filteredLogs.forEach(log => {
            const d = new Date(log.startTime);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            dayMap.set(key, (dayMap.get(key) || 0) + log.duration);
        });

        const maxVal = Math.max(...Array.from(dayMap.values()), 1);

        // Generate grid data
        const weeks = [];
        let currentWeek = [];
        let currentDate = new Date(startDate);

        // Find the closest Sunday on or before startDate to align strictly
        const alignStart = new Date(startDate);
        alignStart.setDate(alignStart.getDate() - alignStart.getDay());

        currentDate = alignStart;

        while (currentDate <= endDate) {
            const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
            const val = dayMap.get(key) || 0;
            currentWeek.push({ date: new Date(currentDate), val });

            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        if (currentWeek.length > 0) weeks.push(currentWeek); // partial week

        return { weeks, maxVal };
    }, [filteredLogs]);

    // Rhythm View Data Preparation (Moved to top level)
    const rhythmStats = useMemo(() => {
        const hourDistribution = new Array(24).fill(0);
        const weekDistribution = new Array(7).fill(0);

        filteredLogs.forEach(log => {
            // Distribute duration across hours for 24h distribution
            const start = new Date(log.startTime);
            const end = new Date(log.startTime + (log.duration * 1000));

            let current = new Date(start);
            while (current < end) {
                const h = current.getHours();
                const nextHourBoundary = new Date(current);
                nextHourBoundary.setHours(h + 1, 0, 0, 0);

                const segmentEnd = nextHourBoundary < end ? nextHourBoundary : end;
                const segmentDuration = (segmentEnd.getTime() - current.getTime()) / 1000;

                hourDistribution[h] += segmentDuration;
                current = nextHourBoundary;
            }

            // Weekly distribution (keeping existing logic for now, usually based on start day)
            const d = new Date(log.startTime);
            const day = d.getDay();
            const weekIdx = day === 0 ? 6 : day - 1;
            weekDistribution[weekIdx] += log.duration;
        });

        return { hourDistribution, weekDistribution };
    }, [filteredLogs]);

    // Focus View Data Preparation (Updated)
    const focusStats = useMemo(() => {
        const focusedLogs = filteredLogs.filter(l => l.focusScore && l.focusScore > 0);
        const focusCount = focusedLogs.length;
        const totalFocusScore = focusedLogs.reduce((acc, curr) => acc + (curr.focusScore || 0), 0);
        const avgFocus = focusCount > 0 ? (totalFocusScore / focusCount).toFixed(1) : '0.0';

        // Score Distribution (1-5)
        const scoreDist = [0, 0, 0, 0, 0];
        focusedLogs.forEach(l => {
            const s = Math.round(l.focusScore || 0);
            if (s >= 1 && s <= 5) scoreDist[s - 1]++;
        });

        // Time Distributions for Toggle Chart
        const hourDist = new Array(24).fill(0);
        const weekDist = new Array(7).fill(0);
        const monthDist = new Array(31).fill(0);

        focusedLogs.forEach(log => {
            // Distribute duration for Hour Distribution
            const start = new Date(log.startTime);
            const end = new Date(log.startTime + (log.duration * 1000));
            let current = new Date(start);
            while (current < end) {
                const h = current.getHours();
                const nextHourBoundary = new Date(current);
                nextHourBoundary.setHours(h + 1, 0, 0, 0);
                const segmentEnd = nextHourBoundary < end ? nextHourBoundary : end;
                const segmentDuration = (segmentEnd.getTime() - current.getTime()) / 1000;
                hourDist[h] += segmentDuration;
                current = nextHourBoundary;
            }

            // Week Distribution
            const d = new Date(log.startTime);
            const day = d.getDay();
            const weekIdx = day === 0 ? 6 : day - 1;
            weekDist[weekIdx] += log.duration;

            // Month Distribution (Day 1-31)
            const date = d.getDate();
            if (date >= 1 && date <= 31) {
                monthDist[date - 1] += log.duration;
            }
        });

        const minTime = Math.min(...filteredLogs.map(l => l.startTime));
        const maxTime = Math.max(...filteredLogs.map(l => l.startTime));
        const timeSpan = maxTime - minTime || 1;
        const maxDur = Math.max(...filteredLogs.map(l => l.duration), 1);

        return {
            focusedLogs, focusCount, avgFocus, scoreDist,
            minTime, timeSpan, maxDur,
            hourDist, weekDist, monthDist
        };
    }, [filteredLogs]);


    // Helper: Generate consistent color from string
    const getThemeColor = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = hash % 360;
        return `hsl(${h}, 70%, 55%)`; // Base color
    };
    const themeColor = getThemeColor(filter.id);
    const themeColorLight = themeColor.replace('55%)', '90%)'); // Lighter for backgrounds
    const themeColorFaint = themeColor.replace('55%)', '96%)'); // Very faint

    const renderContent = () => {
        switch (activeTab) {
            case '时间线':
                const avgDurationMins = filteredLogs.length > 0
                    ? Math.round(totalSeconds / filteredLogs.length / 60)
                    : 0;
                const avgDurationH = Math.floor(avgDurationMins / 60);
                const avgDurationM = avgDurationMins % 60;
                const avgDurationStr = avgDurationH > 0 ? `${avgDurationH}小时${avgDurationM}分钟` : `${avgDurationM}分钟`;

                return (
                    <div className="space-y-8 mt-4">
                        {/* Core Metrics - Styled like Focus Metrics (Transparent, Clean, Horizontal) */}
                        <div className="flex items-start justify-around px-2 py-4">
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

                        {timelineGroups.length === 0 ? (
                            // ... (Existing)
                            // ...
                            // ...

                            <div className="text-center py-20 text-stone-400 font-serif italic text-lg opacity-60">
                                暂无记录
                            </div>
                        ) : (
                            timelineGroups.map((group) => {
                                const { date, logs: groupLogs, duration } = group;
                                const weekDay = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getDay()];
                                const month = date.getMonth() + 1;
                                const day = date.getDate();
                                const durationMins = Math.round(duration / 60);

                                return (
                                    <div key={date.toISOString()} className="mb-8 last:mb-0">
                                        {/* Date Header */}
                                        <div className="flex items-baseline justify-between mb-6 px-2 sticky top-0 bg-[#faf9f6]/95 backdrop-blur z-10 py-2 border-b border-stone-100">
                                            <div className="flex items-baseline gap-3">
                                                <span className="text-2xl font-black text-stone-900 font-mono tracking-tighter">
                                                    {String(month).padStart(2, '0')}/{String(day).padStart(2, '0')}
                                                </span>
                                                <span className="text-xs font-bold text-stone-400 tracking-[0.2em] uppercase">{weekDay}</span>
                                            </div>
                                            <span className="font-mono text-sm font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md">
                                                {durationMins}m
                                            </span>
                                        </div>

                                        {/* Timeline Items */}
                                        <div className="relative border-l border-stone-300 ml-[70px] space-y-6 pb-4">
                                            {groupLogs.sort((a, b) => b.startTime - a.startTime).map(log => {
                                                const d = new Date(log.startTime);
                                                const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                                                const durationMins = Math.round(log.duration / 60);
                                                const h = Math.floor(durationMins / 60);
                                                const m = durationMins % 60;
                                                const durStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

                                                // 获取关联信息
                                                const category = categories.find(c => c.id === log.categoryId);
                                                const activity = category?.activities.find(a => a.id === log.activityId);
                                                const linkedTodo = todos.find(t => t.id === log.linkedTodoId);

                                                return (
                                                    <div
                                                        key={log.id}
                                                        className="relative pl-8 group cursor-pointer rounded-xl hover:bg-stone-50/80 transition-colors p-2 -ml-2"
                                                        onClick={() => onEditLog?.(log)}
                                                    >
                                                        {/* 时间和时长 */}
                                                        <div className="absolute -left-[60px] top-0 w-[45px] text-right flex flex-col items-end">
                                                            <span className="text-sm font-bold text-stone-800 leading-none font-mono">
                                                                {timeStr}
                                                            </span>
                                                            <span className="text-[10px] font-medium text-stone-400 mt-1">
                                                                {durStr}
                                                            </span>
                                                        </div>

                                                        {/* 时间线圆点 */}
                                                        <div className="absolute left-[3px] top-2 w-2.5 h-2.5 rounded-full bg-stone-900 border-2 border-[#faf9f6] z-10" />

                                                        {/* 内容 */}
                                                        <div className="relative top-[-2px]">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="text-lg font-bold text-stone-900 leading-tight">
                                                                    {activity?.name || "活动"}
                                                                </h4>
                                                                {/* 连续追踪次数标记 (模拟) - 这里可以根据实际逻辑添加 */}
                                                            </div>

                                                            {log.note && (
                                                                <p className="text-sm text-stone-500 leading-relaxed mb-2 font-light whitespace-pre-wrap">
                                                                    {log.note}
                                                                </p>
                                                            )}

                                                            {/* 标签 */}
                                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                {linkedTodo && (
                                                                    <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                                                        <span className="text-stone-400 font-bold">@</span>
                                                                        <span className="line-clamp-1">{linkedTodo.title}</span>
                                                                    </span>
                                                                )}

                                                                <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                                                    <span className="font-bold text-stone-400">#</span>
                                                                    <span>{category?.icon}</span>
                                                                    <span className="flex items-center">
                                                                        <span>{category?.name}</span>
                                                                        <span className="mx-1 text-stone-300">/</span>
                                                                        <span className="mr-1">{activity?.icon}</span>
                                                                        <span className="text-stone-500">{activity?.name}</span>
                                                                    </span>
                                                                </span>

                                                                {log.scopeIds && log.scopeIds.length > 0 && log.scopeIds.map(scopeId => {
                                                                    const linkedScope = scopes.find(s => s.id === scopeId);
                                                                    if (linkedScope) {
                                                                        return (
                                                                            <span key={scopeId} className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                                                                <span className="text-stone-400 font-bold">%</span>
                                                                                <span>{linkedScope.icon || '📍'}</span>
                                                                                <span>{linkedScope.name}</span>
                                                                            </span>
                                                                        );
                                                                    }
                                                                    return null;
                                                                })}
                                                            </div>
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
                );

            case '节奏':
                const { hourDistribution, weekDistribution } = rhythmStats;
                // Max values for scaling
                const maxHour = Math.max(...hourDistribution, 1);
                const maxWeek = Math.max(...weekDistribution, 1);

                return (
                    <div className="space-y-12 mt-4 px-2">
                        {/* 24h Distribution */}
                        <div className="bg-transparent">
                            <h3 className="text-base font-bold text-stone-700 mb-6 text-center tracking-wider">24小时分布</h3>

                            <div className="h-48 flex items-end relative mx-2">
                                <svg
                                    className="w-full h-full overflow-visible"
                                    viewBox="0 0 23 100"
                                    preserveAspectRatio="none"
                                >
                                    <defs>
                                        <linearGradient id="hourGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={themeColor} stopOpacity="0.4" />
                                            <stop offset="100%" stopColor={themeColor} stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    {/* Area Path */}
                                    <path
                                        d={`
                                            M 0,100 
                                            ${hourDistribution.map((val, idx) => {
                                            const h = (val / maxHour) * 100;
                                            return `L ${idx},${100 - h}`;
                                        }).join(' ')}
                                            L 23,100 Z
                                        `}
                                        fill="url(#hourGradient)"
                                        stroke={themeColor}
                                        strokeWidth="1"
                                        vectorEffect="non-scaling-stroke"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>

                                {/* X-Axis Labels */}
                                <div className="absolute -bottom-6 left-0 w-full flex justify-between text-[10px] text-stone-400 font-mono px-1">
                                    <span>00:00</span>
                                    <span>06:00</span>
                                    <span>12:00</span>
                                    <span>18:00</span>
                                    <span>23:59</span>
                                </div>
                            </div>
                        </div>

                        {/* Weekly Distribution - Area Chart (Changed from Bar) */}
                        <div className="bg-transparent">
                            <h3 className="text-base font-bold text-stone-700 mb-6 text-center tracking-wider">周分布</h3>
                            <div className="h-48 flex items-end relative mx-2">
                                <svg
                                    className="w-full h-full overflow-visible"
                                    viewBox="0 0 6 100"
                                    preserveAspectRatio="none"
                                >
                                    <defs>
                                        <linearGradient id="weekGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={themeColor} stopOpacity="0.4" />
                                            <stop offset="100%" stopColor={themeColor} stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <path
                                        d={`
                                            M 0,100 
                                            ${weekDistribution.map((val, idx) => {
                                            const h = (val / maxWeek) * 100;
                                            return `L ${idx},${100 - h}`;
                                        }).join(' ')}
                                            L 6,100 Z
                                        `}
                                        fill="url(#weekGradient)"
                                        stroke={themeColor}
                                        strokeWidth="1"
                                        vectorEffect="non-scaling-stroke"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>

                                <div className="absolute -bottom-6 left-0 w-full flex justify-between text-[10px] text-stone-400 font-mono px-2">
                                    <span>M</span>
                                    <span>T</span>
                                    <span>W</span>
                                    <span>T</span>
                                    <span>F</span>
                                    <span>S</span>
                                    <span>S</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case '趋势':
                const trendData = trendTimeframe === 'week' ? weeklyTrend : monthlyTrend;
                const maxTrendVal = Math.max(...trendData.map(d => d[1]), 1);

                return (
                    <div className="space-y-12 mt-4 px-2">
                        {/* Contribution Graph (GitHub Style Heatmap) */}
                        <div className="bg-transparent">
                            <h3 className="text-base font-bold text-stone-700 mb-6 text-center tracking-wider">坚持图谱</h3>
                            <div
                                className="overflow-x-auto pb-2 scrollbar-hide"
                                ref={heatmapRef}
                            >
                                <div className="flex justify-center min-w-[600px] px-4">
                                    <div className="flex gap-[3px]">
                                        {contributionData.weeks.map((week, wIdx) => (
                                            <div key={wIdx} className="flex flex-col gap-[3px]">
                                                {week.map((day, dIdx) => {
                                                    const intensity = day.val / contributionData.maxVal; // 0 to 1
                                                    let opacity = 0.1; // default empty
                                                    if (day.val > 0) {
                                                        // Map 0-1 to distinct opacity steps like Github
                                                        if (intensity < 0.25) opacity = 0.3;
                                                        else if (intensity < 0.5) opacity = 0.5;
                                                        else if (intensity < 0.75) opacity = 0.7;
                                                        else opacity = 1.0;
                                                    }

                                                    return (
                                                        <div
                                                            key={dIdx}
                                                            className="w-2.5 h-2.5 rounded-[2px]"
                                                            style={{
                                                                backgroundColor: themeColor,
                                                                opacity: day.val > 0 ? opacity : 0.08
                                                            }}
                                                            title={`${day.date.toLocaleDateString()}: ${Math.round(day.val / 60)} mins`}
                                                        ></div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="text-[10px] text-stone-300 mt-2 text-center font-mono">
                                Less <span className="inline-block w-2 h-2 rounded-[2px] bg-stone-200 mx-1 align-middle"></span>
                                <span className="inline-block w-2 h-2 rounded-[2px] mx-1 align-middle" style={{ backgroundColor: themeColor, opacity: 0.3 }}></span>
                                <span className="inline-block w-2 h-2 rounded-[2px] mx-1 align-middle" style={{ backgroundColor: themeColor, opacity: 0.7 }}></span>
                                <span className="inline-block w-2 h-2 rounded-[2px] mx-1 align-middle" style={{ backgroundColor: themeColor, opacity: 1 }}></span> More
                            </div>
                        </div>

                        {/* Trend Line with Toggle */}
                        <div className="bg-transparent">
                            <h3 className="text-base font-bold text-stone-700 text-center tracking-wider">趋势折线图</h3>

                            {/* Toggle Button Row */}
                            <div className="flex justify-end pl-4 pr-0 mb-4 mt-2">
                                <div className="flex bg-stone-100/50 p-0.5 rounded-lg w-fit">
                                    <button
                                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${trendTimeframe === 'week' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                                        onClick={() => setTrendTimeframe('week')}
                                    >
                                        周
                                    </button>
                                    <button
                                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${trendTimeframe === 'month' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                                        onClick={() => setTrendTimeframe('month')}
                                    >
                                        月
                                    </button>
                                </div>
                            </div>

                            <div className="h-48 flex items-end relative mx-2">
                                <svg
                                    className="w-full h-full overflow-visible"
                                    viewBox={`0 0 ${Math.max(trendData.length - 1, 1)} 100`}
                                    preserveAspectRatio="none"
                                >
                                    <defs>
                                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={themeColor} stopOpacity="0.4" />
                                            <stop offset="100%" stopColor={themeColor} stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <path
                                        d={`
                                            M 0,100
                                            ${trendData.map((val, idx) => {
                                            const h = (val[1] / maxTrendVal) * 100;
                                            return `L ${idx},${100 - h}`;
                                        }).join(' ')}
                                            L ${trendData.length - 1},100 Z
                                        `}
                                        fill="url(#trendGradient)"
                                        stroke={themeColor}
                                        strokeWidth="1"
                                        vectorEffect="non-scaling-stroke"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>

                                <div className="absolute -bottom-6 left-0 w-full flex justify-between text-[10px] text-stone-400 font-mono">
                                    <span>{trendData[0]?.[0]}</span>
                                    <span>{trendData[trendData.length - 1]?.[0]}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case '专注':
                const { focusedLogs, focusCount, avgFocus, scoreDist, hourDist, weekDist, monthDist, minTime, timeSpan, maxDur } = focusStats;

                // Determine data for Focus Time Distribution Chart
                let focusChartData = [];

                if (focusTimeframe === 'day') {
                    focusChartData = hourDist;
                } else if (focusTimeframe === 'week') {
                    focusChartData = weekDist;
                } else {
                    focusChartData = monthDist;
                }

                const maxFocusChartVal = Math.max(...focusChartData, 1);

                return (
                    <div className="space-y-12 mt-4 px-2">
                        {/* Focus Stats Cards (Keep existing style? Or user provided image suggests simple text) */}
                        {/* The user provided image 'uploaded_image_1_1767080200856.png' shows specific style for stats. 
                            The current code has "Focus Stats" section. Let's keep it but align with theme.
                        */}
                        <div className="flex items-center justify-around py-4">
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-xs font-bold text-stone-900 tracking-wider">平均专注度</span>
                                <div className="flex flex-col items-center">
                                    <span className="text-4xl font-black font-mono tracking-tight text-stone-800">{avgFocus}</span>
                                    <span className="text-xs text-stone-300 font-bold mt-1">/ 5.0</span>
                                </div>
                            </div>
                            <div className="w-px h-12 bg-stone-100"></div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-xs font-bold text-stone-900 tracking-wider">专注记录</span>
                                <div className="flex flex-col items-center">
                                    <span className="text-4xl font-black font-mono tracking-tight text-stone-800">{focusCount}</span>
                                    <span className="text-xs text-stone-300 font-bold mt-1">占比 {filteredLogs.length > 0 ? Math.round((focusCount / filteredLogs.length) * 100) : 0}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Energy Distribution (Renamed/Existing) */}
                        <div className="bg-transparent">
                            <h3 className="text-base font-bold text-stone-700 mb-6 text-center tracking-wider">能量分布</h3>

                            <div className="h-48 flex items-end justify-between gap-4 px-4">
                                {scoreDist.map((count, idx) => {
                                    const maxScoreCount = Math.max(...scoreDist, 1);
                                    const heightPct = (count / maxScoreCount) * 100;

                                    return (
                                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                                            <div className="w-full relative flex items-end justify-center rounded-sm overflow-hidden h-full">
                                                <div
                                                    className="w-full transition-all duration-500 rounded-sm group-hover:opacity-80"
                                                    style={{
                                                        height: `${Math.max(heightPct, 4)}%`,
                                                        backgroundColor: themeColor,
                                                        opacity: 0.3 + (idx * 0.15)
                                                    }}
                                                ></div>
                                                <div className="absolute bottom-1 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {count}
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold text-stone-400 mt-3 font-mono">{idx + 1}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Scatter Plot - Focus Scale */}
                        <div className="bg-transparent">
                            <h3 className="text-base font-bold text-stone-700 text-center tracking-wider">专注刻度</h3>
                            <div className="flex justify-center gap-4 text-[10px] text-stone-400 mt-1 mb-2">
                                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>Y轴: 专注分</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-stone-300"></span>大小: 时长</span>
                                <span className="flex items-center gap-1">X轴: 时间分布</span>
                            </div>

                            {/* Toggle */}
                            <div className="flex justify-end pl-4 pr-0 mb-4 mt-2">
                                <div className="flex bg-stone-100/50 p-0.5 rounded-lg w-fit">
                                    <button
                                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${focusTimeframe === 'day' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                                        onClick={() => setFocusTimeframe('day')}
                                    >
                                        日
                                    </button>
                                    <button
                                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${focusTimeframe === 'week' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                                        onClick={() => setFocusTimeframe('week')}
                                    >
                                        周
                                    </button>
                                    <button
                                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${focusTimeframe === 'month' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                                        onClick={() => setFocusTimeframe('month')}
                                    >
                                        月
                                    </button>
                                </div>
                            </div>

                            <div className="h-64 relative border-l border-b border-stone-200 m-4">
                                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    {focusStats.focusedLogs.map((log, idx) => {
                                        const score = log.focusScore || 0;
                                        const d = new Date(log.startTime);

                                        // Y-axis: Focus Score (1-5)
                                        // Map 1..5 to 20%..100% (inverted for SVG y)
                                        // y = 100 - (score / 5 * 100)
                                        const y = 100 - ((score / 5) * 100);

                                        // X-axis: Timeframe based
                                        let x = 0;
                                        if (focusTimeframe === 'day') {
                                            // 0-24 Hours
                                            const h = d.getHours() + d.getMinutes() / 60;
                                            x = (h / 24) * 100;
                                        } else if (focusTimeframe === 'week') {
                                            // Mon(0) - Sun(6)
                                            // getDay(): Sun=0, Mon=1...
                                            let dayIdx = d.getDay() - 1;
                                            if (dayIdx < 0) dayIdx = 6;
                                            // To make it look like "Distribution", adding slight jitter or using Time of Day as minor offset?
                                            // Let's us precise position: Day Index + (Hour/24)
                                            x = ((dayIdx + (d.getHours() / 24)) / 7) * 100;
                                        } else {
                                            // Month: 1-31
                                            const date = d.getDate();
                                            // Position: (Date-1 + Time) / 31
                                            x = ((date - 1 + (d.getHours() / 24)) / 31) * 100;
                                        }

                                        const r = (log.duration / focusStats.maxDur) * 10 + 2;

                                        return (
                                            <circle
                                                key={log.id}
                                                cx={`${x}%`}
                                                cy={`${y}%`}
                                                r={Math.max(r, 3)}
                                                fill={themeColor}
                                                opacity={0.3 + (score / 10)}
                                            />
                                        );
                                    })}
                                </svg>

                                {/* X-Axis Labels */}
                                <div className="absolute -bottom-6 left-0 w-full flex justify-between text-[10px] text-stone-400 font-mono px-1">
                                    {focusTimeframe === 'day' && (
                                        <><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:59</span></>
                                    )}
                                    {focusTimeframe === 'week' && (
                                        <><span>Mon</span><span>Wed</span><span>Fri</span><span>Sun</span></>
                                    )}
                                    {focusTimeframe === 'month' && (
                                        <><span>1st</span><span>15th</span><span>31st</span></>
                                    )}
                                </div>
                                {/* Y-Axis Labels */}
                                <div className="absolute -left-8 top-0 h-full flex flex-col justify-between text-[10px] text-stone-400 font-mono py-1">
                                    <span>5</span>
                                    <span>4</span>
                                    <span>3</span>
                                    <span>2</span>
                                    <span>1</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-[#fdfbf7] text-stone-800 overflow-hidden select-none font-serif relative pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <header className="h-14 flex items-center justify-between px-5 bg-[#fdfbf7] border-b border-stone-100 shrink-0 z-30">
                <div className="w-8 flex items-center">
                    <button
                        onClick={onClose}
                        className="text-stone-400 hover:text-stone-600"
                    >
                        <ChevronLeft size={24} />
                    </button>
                </div>
                <h1 className="text-lg font-bold text-stone-700 tracking-wide">Filter Details</h1>
                <div className="w-8"></div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden relative">
                <div className="h-full bg-[#faf9f6] overflow-y-auto no-scrollbar pb-24 px-7 pt-4">
                    {/* Title Section */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-3">
                            <span className="text-stone-300 font-normal">※</span>
                            <span className="text-2xl">{filter.name}</span>
                        </h1>
                        <span className="text-stone-400 text-sm font-medium ml-1 mt-1 flex items-center gap-2 font-mono">
                            {filter.filterExpression}
                        </span>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-6 border-b border-stone-200 mb-8 overflow-x-auto no-scrollbar">
                        {['时间线', '节奏', '趋势', '专注'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-3 text-sm font-serif tracking-wide whitespace-nowrap transition-colors ${activeTab === tab
                                    ? 'text-stone-900 border-b-2 border-stone-900 font-bold'
                                    : 'text-stone-400 hover:text-stone-600'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Active Content */}
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};
