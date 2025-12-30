/**
 * @file FilterDetailView.tsx
 * @input Filter, Logs, Categories, Scopes, Todos
 * @output Filter detail display with timeline and heatmap
 * @pos View (Detail Page)
 * @description 筛选器详情页,展示匹配筛选器的记录的时间线和热力图
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useMemo, useState } from 'react';
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
    const [displayDate, setDisplayDate] = useState(new Date());

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

    const renderContent = () => {
        switch (activeTab) {
            case '时间线':
                return (
                    <div className="space-y-8 mt-4">
                        {timelineGroups.length === 0 ? (
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

            case '热力图':
                return (
                    <div className="bg-white rounded-[2rem] p-0 border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
                        <CalendarWidget
                            currentDate={displayDate}
                            onDateChange={(newDate) => {
                                if (newDate.getMonth() !== displayDate.getMonth() || newDate.getFullYear() !== displayDate.getFullYear()) {
                                    setDisplayDate(newDate);
                                }
                            }}
                            logs={filteredLogs}
                            isExpanded={true}
                            onExpandToggle={() => { }}
                            disableSelection={true}
                        />

                        <div className="px-6 pb-6 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest text-stone-400 mb-1 font-bold">总记录</div>
                                    <div className="text-xl font-bold text-stone-900 font-mono">{filteredLogs.length} 条</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest text-stone-400 mb-1 font-bold">总时长</div>
                                    <div className="text-xl font-bold text-stone-900 font-mono">
                                        {totalHours}h {totalMins}m
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest text-stone-400 mb-1 font-bold">本月时长</div>
                                    <div className="text-xl font-bold text-stone-900 font-mono">
                                        {monthHours}h {monthMins}m
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest text-stone-400 mb-1 font-bold">本月天数</div>
                                    <div className="text-xl font-bold text-stone-900 font-mono">{monthDays} 天</div>
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
                <h1 className="text-lg font-bold text-stone-700 tracking-wide">筛选器详情</h1>
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
                        {['时间线', '热力图'].map((tab) => (
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
