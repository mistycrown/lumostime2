import React, { useState, useMemo } from 'react';
import { Scope, Log, Category, TodoItem, Goal } from '../types';
import { CalendarWidget } from '../components/CalendarWidget';
import { FocusCharts } from '../components/FocusCharts';
import { MatrixAnalysisChart } from '../components/MatrixAnalysisChart';
import { DateRangeFilter, RangeType } from '../components/DateRangeFilter';
import { Check, Save, Zap, Clock, BarChart2 } from 'lucide-react';
import { COLOR_OPTIONS } from '../constants';
import { GoalCard } from '../components/GoalCard';

interface ScopeDetailViewProps {
    scope: Scope;
    logs: Log[];
    categories: Category[];
    todos: TodoItem[];
    goals: Goal[];
    onBack: () => void;
    onUpdate: (scope: Scope) => void;
    onEditLog?: (log: Log) => void;
    onEditGoal?: (goal: Goal) => void;
    onEditTodo?: (todo: TodoItem) => void;
    onDeleteGoal?: (goalId: string) => void;
    onAddGoal?: () => void;
}

export const ScopeDetailView: React.FC<ScopeDetailViewProps> = ({
    scope: initialScope,
    logs,
    categories,
    todos,
    goals,
    onBack,
    onUpdate,
    onEditLog,
    onEditGoal,
    onEditTodo,
    onDeleteGoal,
    onAddGoal
}) => {
    const [activeTab, setActiveTab] = useState('时间线');
    const [scope, setScope] = useState(initialScope);
    const [displayDate, setDisplayDate] = useState(new Date());
    const [isSaveSuccess, setIsSaveSuccess] = useState(false);

    // Analysis State
    const [analysisRange, setAnalysisRange] = useState<RangeType>('Month');
    const [analysisDate, setAnalysisDate] = useState(new Date());

    // Filter logs for this scope
    const scopeLogs = useMemo(() => logs.filter(l => l.scopeIds?.includes(scope.id)), [logs, scope.id]);

    // Filter todos linked to this scope
    const scopeTodos = useMemo(() => todos
        .filter(t => t.defaultScopeIds?.includes(scope.id))
        .sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted)),
        [todos, scope.id]);

    // Calculate total stats (All time)
    const totalSeconds = scopeLogs.reduce((acc, curr) => acc + curr.duration, 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMins = Math.floor((totalSeconds % 3600) / 60);

    // Heatmap Data
    const displayMonth = displayDate.getMonth();
    const displayYear = displayDate.getFullYear();

    const heatmapData = useMemo(() => {
        const map = new Map<number, number>();
        scopeLogs.forEach(log => {
            const d = new Date(log.startTime);
            if (d.getMonth() === displayMonth && d.getFullYear() === displayYear) {
                const day = d.getDate();
                map.set(day, (map.get(day) || 0) + log.duration);
            }
        });
        return map;
    }, [scopeLogs, displayMonth, displayYear]);

    // Month stats
    const monthLogs = useMemo(() => scopeLogs.filter(log => {
        const d = new Date(log.startTime);
        return d.getMonth() === displayMonth && d.getFullYear() === displayYear;
    }), [scopeLogs, displayMonth, displayYear]);

    const monthSeconds = monthLogs.reduce((acc, curr) => acc + curr.duration, 0);
    const monthHours = Math.floor(monthSeconds / 3600);
    const monthMins = Math.floor((monthSeconds % 3600) / 60);
    const monthDays = new Set(monthLogs.map(l => new Date(l.startTime).getDate())).size;

    const handleSave = () => {
        onUpdate(scope);
        setIsSaveSuccess(true);
        setTimeout(() => setIsSaveSuccess(false), 2000);
    };

    const handleNameChange = (val: string) => {
        const firstChar = Array.from(val)[0] || '';
        const icon = firstChar;
        const name = val.slice(firstChar.length).trim();
        // If user deletes everything, we might have empty icon and empty name
        setScope(prev => ({ ...prev, icon, name }));
    };

    const tabs = ['细节', '时间线', '关联', '目标'];
    if (scope.enableFocusScore) tabs.splice(3, 0, '专注');

    // Matrix Stats
    const matrixStats = useMemo(() => {
        // Filter logs based on analysisRange
        const filteredLogs = scopeLogs.filter(log => {
            if (analysisRange === 'All') return true;
            const d = new Date(log.startTime);
            const target = analysisDate;

            if (analysisRange === 'Year') {
                return d.getFullYear() === target.getFullYear();
            }
            if (analysisRange === 'Month') {
                return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
            }
            if (analysisRange === 'Week') {
                // Check if in same week
                const getWeekStart = (date: Date) => {
                    const d = new Date(date);
                    const day = d.getDay();
                    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                    d.setDate(diff);
                    d.setHours(0, 0, 0, 0);
                    return d;
                };
                const wStart = getWeekStart(target);
                const wEnd = new Date(wStart);
                wEnd.setDate(wStart.getDate() + 7);
                return d >= wStart && d < wEnd;
            }
            return true;
        });

        const stats = new Map<string, number>();
        filteredLogs.forEach(log => {
            stats.set(log.activityId, (stats.get(log.activityId) || 0) + log.duration);
        });

        return Array.from(stats.entries()).map(([actId, duration]) => {
            const cat = categories.find(c => c.activities.some(a => a.id === actId));
            const act = cat?.activities.find(a => a.id === actId);

            return {
                id: actId,
                label: cat && act ? `${cat.name} · ${act.name}` : (act?.name || 'Unknown'),
                value: duration,
                color: (() => {
                    const activityColorClass = act?.color || '';
                    const match = activityColorClass.match(/(?:text|bg)-([a-z]+)-/);
                    const colorName = match ? match[1] : 'stone';
                    const option = COLOR_OPTIONS.find(opt => opt.id === colorName);
                    return option ? option.hex : '#78716c';
                })(),
                icon: act?.icon
            };
        });
    }, [scopeLogs, categories, analysisRange, analysisDate]);

    // Calculate total duration for the filtered range
    const analysisTotalDuration = useMemo(() => {
        return matrixStats.reduce((acc, curr) => acc + curr.value, 0);
    }, [matrixStats]);

    const renderContent = () => {
        switch (activeTab) {
            case '关联':
                return (
                    <div className="space-y-6">
                        {/* Associated Todos Card */}
                        <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">Associated Todos</h3>
                                <div className="text-xs font-bold text-stone-500 tabular-nums">
                                    {scopeTodos.filter(t => t.isCompleted).length} / {scopeTodos.length}
                                </div>
                            </div>
                            <div className="space-y-0 text-sm">
                                {scopeTodos.length === 0 ? (
                                    <div className="text-center py-6 text-stone-400 border border-dashed border-stone-200 rounded-xl">
                                        <p className="text-xs font-medium opacity-60">No associated todos</p>
                                    </div>
                                ) : (
                                    scopeTodos.map(todo => {
                                        // Calculate duration for this todo
                                        const todoDuration = logs
                                            .filter(l => l.linkedTodoId === todo.id)
                                            .reduce((acc, curr) => acc + curr.duration, 0);

                                        const h = Math.floor(todoDuration / 3600);
                                        const m = Math.floor((todoDuration % 3600) / 60);
                                        const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

                                        return (
                                            <div
                                                key={todo.id}
                                                onClick={() => onEditTodo?.(todo)}
                                                className="group flex items-center gap-3 py-2 border-b border-stone-100 last:border-0 hover:bg-stone-50 md:-mx-2 md:px-2 transition-colors cursor-pointer"
                                            >
                                                <div className={`w-4 h-4 shrink-0 rounded-[4px] border-2 flex items-center justify-center transition-colors ${todo.isCompleted ? 'bg-stone-900 border-stone-900' : 'border-stone-300 group-hover:border-stone-400'
                                                    }`}>
                                                    {todo.isCompleted && <span className="text-white text-[10px]">✓</span>}
                                                </div>
                                                <span className={`flex-1 font-medium truncate min-w-0 ${todo.isCompleted ? 'line-through text-stone-300' : 'text-stone-700'}`}>
                                                    {todo.title}
                                                </span>

                                                {((todo.isCompleted) || todoDuration > 0) && (
                                                    <span className="text-xs text-stone-300 font-serif whitespace-nowrap shrink-0">
                                                        {todo.isCompleted && todo.completedAt ? (() => {
                                                            const d = new Date(todo.completedAt);
                                                            return `${d.getFullYear().toString().slice(-2)}/${d.getMonth() + 1}/${d.getDate()} `;
                                                        })() : ''}
                                                        {todoDuration > 0 && `共 ${timeStr}`}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Cross Analysis Card */}
                        <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">TAGS</h3>
                            <DateRangeFilter
                                rangeType={analysisRange}
                                date={analysisDate}
                                onRangeChange={setAnalysisRange}
                                onDateChange={setAnalysisDate}
                            />
                            <MatrixAnalysisChart
                                items={matrixStats}
                                totalDuration={analysisTotalDuration}
                            />
                        </div>
                    </div>
                );

            case '细节':
                return (
                    <div className="space-y-6 max-w-2xl">
                        {/* Basic Info */}
                        <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Basic Info</h3>

                            <div className="space-y-4">
                                {/* Name (Combined Icon + Name) */}
                                <div>
                                    <label className="text-xs text-stone-400 font-medium mb-1.5 block">Name (First char is icon)</label>
                                    <input
                                        type="text"
                                        value={`${scope.icon || ''}${scope.name}`}
                                        onChange={(e) => handleNameChange(e.target.value)}
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-xs text-stone-400 font-medium mb-1.5 block">Description</label>
                                    <textarea
                                        value={scope.description || ''}
                                        onChange={(e) => setScope(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 outline-none focus:border-stone-400 transition-colors resize-none"
                                        rows={3}
                                        placeholder="简要描述这个领域..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Focus Score Setting */}
                        <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Appearance</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-stone-400 font-medium mb-1.5 block">Theme Color</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {COLOR_OPTIONS.map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setScope(prev => ({ ...prev, themeColor: opt.title }))}
                                                title={opt.label}
                                                className={`w-10 h-10 rounded-full border-2 ${opt.bg} ${opt.border} ${scope.themeColor === opt.title ? `ring-2 ${opt.ring} ring-offset-2` : ''}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Focus Score Setting */}
                        <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Focus Score</h3>
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-sm font-bold text-stone-700">Enable Focus Score</label>
                                    <p className="text-xs text-stone-400 mt-1">If enabled, activities in this scope will track focus levels (1-5) by default.</p>
                                </div>
                                <button
                                    onClick={() => setScope(prev => ({ ...prev, enableFocusScore: !prev.enableFocusScore }))}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors shrink-0 ${scope.enableFocusScore ? 'bg-stone-900' : 'bg-stone-200'
                                        }`}
                                >
                                    <div
                                        className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${scope.enableFocusScore ? 'translate-x-6' : ''
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl active:scale-[0.99] transition-all flex items-center justify-center gap-2 ${isSaveSuccess ? 'bg-[#2F4F4F] text-white' : 'bg-stone-900 text-white hover:bg-black'
                                }`}
                        >
                            {isSaveSuccess ? (
                                <>
                                    <Check size={20} />
                                    <span>Saved Successfully</span>
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    <span>Save Changes</span>
                                </>
                            )}
                        </button>
                    </div>
                );

            case '时间线':
                return (
                    <>
                        {/* Stats Card */}
                        <div className="bg-white rounded-[2rem] p-0 border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden mb-6">
                            <CalendarWidget
                                currentDate={displayDate}
                                onDateChange={setDisplayDate}
                                logs={scopeLogs}
                                isExpanded={true}
                                onExpandToggle={() => { }}
                                disableSelection={true}
                            />

                            {/* Stats Footer */}
                            <div className="px-6 pb-6 pt-2 flex items-end justify-between border-t border-stone-50">
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
                                        const totalDays = new Set(scopeLogs.map(l => new Date(l.startTime).toDateString())).size;
                                        return (
                                            <div className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded inline-block mt-1">
                                                Recorded {totalDays} days / {monthDays} days
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] uppercase tracking-widest text-stone-400 mb-1 font-bold">Avg. Daily</div>
                                    <div className="text-lg font-bold text-stone-700 font-mono">
                                        {scopeLogs.length > 0 ? Math.round(totalSeconds / 60 / scopeLogs.length) : 0}m
                                        <span className="text-base text-stone-400 mx-2 font-sans">/</span>
                                        <span className="text-base font-bold text-stone-600">
                                            {monthDays > 0 ? Math.round(monthSeconds / 60 / monthDays) : 0}m
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* History List */}
                        <div className="space-y-2 mt-8">
                            <div className="flex items-center gap-2 mb-6 px-2">
                                <Clock size={16} className="text-stone-400" />
                                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">History ({displayMonth + 1}/{displayYear})</span>
                            </div>

                            {heatmapData.size === 0 ? (
                                <div className="text-center py-12 text-stone-400 text-sm italic border border-dashed border-stone-200 rounded-3xl mx-2">
                                    No activity recorded in this month.
                                </div>
                            ) : (
                                Array.from(heatmapData.keys()).sort((a: number, b: number) => b - a).map((day: number) => {
                                    const daySeconds = heatmapData.get(day) || 0;
                                    const dayLogsFiltered = monthLogs.filter(l => new Date(l.startTime).getDate() === day);

                                    // Get day of week
                                    const date = new Date(displayYear, displayMonth, day);
                                    const weekDay = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getDay()];

                                    return (
                                        <div key={day} className="mb-8 last:mb-0">
                                            {/* Day Header */}
                                            <div className="flex items-baseline justify-between mb-6 px-2 sticky top-0 bg-[#faf9f6]/95 backdrop-blur z-10 py-2 border-b border-stone-100">
                                                <div className="flex items-baseline gap-3">
                                                    <span className="text-2xl font-black text-stone-900 font-mono tracking-tighter">
                                                        {String(displayMonth + 1).padStart(2, '0')}/{String(day).padStart(2, '0')}
                                                    </span>
                                                    <span className="text-xs font-bold text-stone-400 tracking-[0.2em]">{weekDay}</span>
                                                </div>
                                                <span className="font-mono text-sm font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md">
                                                    {Math.floor(daySeconds / 60)}m
                                                </span>
                                            </div>

                                            {/* Timeline Items */}
                                            <div className="relative border-l border-stone-300 ml-[70px] space-y-6 pb-4">
                                                {dayLogsFiltered.sort((a, b) => b.startTime - a.startTime).map(log => {
                                                    const category = categories.find(c => c.id === log.categoryId);
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
                                                            {/* Time - Absolute Left */}
                                                            <div className="absolute -left-[60px] top-0 w-[45px] text-right flex flex-col items-end">
                                                                <span className="text-sm font-bold text-stone-800 leading-none font-mono">
                                                                    {timeStr}
                                                                </span>
                                                                <span className="text-[10px] font-medium text-stone-400 mt-1">
                                                                    {durStr}
                                                                </span>
                                                            </div>

                                                            {/* Timeline Dot */}
                                                            <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-stone-900 border-2 border-[#faf9f6] z-10" />

                                                            {/* Content */}
                                                            <div className="relative top-[-2px]">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h4 className="text-lg font-bold text-stone-900 leading-tight">
                                                                        {activity?.name || category?.name}
                                                                    </h4>
                                                                    {log.focusScore && (
                                                                        <span className="text-sm font-bold text-stone-400 font-mono flex items-center gap-0.5">
                                                                            <Zap size={12} fill="currentColor" />
                                                                            {log.focusScore}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {log.note && (
                                                                    <p className="text-sm text-stone-500 leading-relaxed mb-2 font-light">
                                                                        {log.note}
                                                                    </p>
                                                                )}

                                                                {/* Metadata Tags */}
                                                                <div className="flex flex-wrap items-center gap-2 mt-1">
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
                                                                </div>

                                                                {/* Scope Tag */}
                                                                <div className="mt-1">
                                                                    <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded inline-flex items-center gap-1 bg-stone-50/30">
                                                                        <span className="text-stone-400 font-bold">%</span>
                                                                        <span>{scope.icon}</span>
                                                                        <span className="line-clamp-1">{scope.name}</span>
                                                                    </span>
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
                    </>
                );

            case '专注':
                return scope.enableFocusScore ? (
                    <FocusCharts
                        logs={scopeLogs}
                        currentDate={displayDate}
                        onDateChange={setDisplayDate}
                    />
                ) : null;


            case '目标':
                const scopeGoals = goals.filter(g => g.scopeId === scope.id && g.status !== 'archived');
                return (
                    <div className="space-y-4 max-w-3xl">
                        {/* Goals List */}
                        {scopeGoals.length === 0 ? (
                            <div className="bg-white rounded-2xl p-12 border border-dashed border-stone-200 text-center">
                                <p className="text-stone-400 mb-4">还没有设置目标</p>
                                {onAddGoal && (
                                    <button
                                        onClick={onAddGoal}
                                        className="px-6 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-black transition-colors"
                                    >
                                        创建第一个目标
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                {scopeGoals.map(goal => (
                                    <GoalCard
                                        key={goal.id}
                                        goal={goal}
                                        logs={logs}
                                        todos={todos}
                                        onEdit={onEditGoal}
                                        onDelete={onDeleteGoal}
                                    />
                                ))}
                                {onAddGoal && (
                                    <button
                                        onClick={onAddGoal}
                                        className="w-full py-2.5 border-2 border-dashed border-stone-200 rounded-xl text-stone-400 hover:text-stone-600 hover:border-stone-300 transition-colors text-sm font-medium"
                                    >
                                        + 添加新目标
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="h-full bg-[#faf9f6] overflow-y-auto no-scrollbar pb-24 px-7 pt-4">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-3">
                    <span className="text-stone-300 font-normal">%</span>
                    {scope.icon && <span className="text-2xl">{scope.icon}</span>}
                    {scope.name}
                </h1>
                {scope.description && (
                    <span className="text-stone-400 text-sm font-medium ml-1 mt-1 block">
                        {scope.description}
                    </span>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-stone-200 mb-8 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-sm font-serif tracking-wide whitespace-nowrap transition-colors ${activeTab === tab ? 'text-stone-900 border-b-2 border-stone-900 font-bold' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        {tab === '时间线' ? '時間線' : tab === '细节' ? '细节' : tab === '专注' ? '专 注' : tab}
                    </button>
                ))}
            </div>

            {renderContent()}
        </div>
    );
};
