import React, { useState, useMemo } from 'react';
import { Scope, Log, Category, TodoItem, Goal } from '../types';
import { CalendarWidget } from '../components/CalendarWidget';
import { FocusCharts } from '../components/FocusCharts';
import { MatrixAnalysisChart } from '../components/MatrixAnalysisChart';
import { DateRangeFilter, RangeType } from '../components/DateRangeFilter';
import { Check, Save, Zap, Clock, BarChart2, Archive, Plus, X, ChevronDown } from 'lucide-react';
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
    onArchiveGoal?: (goalId: string) => void;
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
    onArchiveGoal,
    onAddGoal
}) => {
    const [activeTab, setActiveTab] = useState('时间线');
    const [scope, setScope] = useState(initialScope);
    const [displayDate, setDisplayDate] = useState(new Date());
    const [isSaveSuccess, setIsSaveSuccess] = useState(false);
    const [showArchived, setShowArchived] = useState(false); // 是否显示归档目标
    const [newKeyword, setNewKeyword] = useState(''); // 添加关键字输入
    const [expandedKeywords, setExpandedKeywords] = useState<Set<string>>(new Set()); // 关键字展开状态

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

    // 处理归档目标
    const handleArchiveGoal = (goalId: string) => {
        onArchiveGoal?.(goalId);
    };

    // 关键字颜色系统（与 TagDetailView 保持一致）
    const KEYWORD_COLORS = [
        'bg-red-100 text-red-600 border-red-200 hover:bg-red-200',
        'bg-cyan-100 text-cyan-600 border-cyan-200 hover:bg-cyan-200',
        'bg-yellow-100 text-yellow-600 border-yellow-200 hover:bg-yellow-200',
        'bg-blue-100 text-blue-600 border-blue-200 hover:bg-blue-200',
        'bg-orange-100 text-orange-600 border-orange-200 hover:bg-orange-200',
        'bg-teal-100 text-teal-600 border-teal-200 hover:bg-teal-200',
        'bg-amber-100 text-amber-600 border-amber-200 hover:bg-amber-200',
        'bg-indigo-100 text-indigo-600 border-indigo-200 hover:bg-indigo-200',
        'bg-lime-100 text-lime-600 border-lime-200 hover:bg-lime-200',
        'bg-purple-100 text-purple-600 border-purple-200 hover:bg-purple-200',
        'bg-green-100 text-green-600 border-green-200 hover:bg-green-200',
        'bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200 hover:bg-fuchsia-200',
        'bg-emerald-100 text-emerald-600 border-emerald-200 hover:bg-emerald-200',
        'bg-pink-100 text-pink-600 border-pink-200 hover:bg-pink-200',
        'bg-sky-100 text-sky-600 border-sky-200 hover:bg-sky-200',
        'bg-rose-100 text-rose-600 border-rose-200 hover:bg-rose-200',
        'bg-violet-100 text-violet-600 border-violet-200 hover:bg-violet-200',
    ];

    const getKeywordColor = (keyword: string) => {
        const keywords = scope.keywords || [];
        let index = keywords.indexOf(keyword);

        if (index === -1) {
            let hash = 0;
            for (let i = 0; i < keyword.length; i++) {
                hash = keyword.charCodeAt(i) + ((hash << 5) - hash);
            }
            index = Math.abs(hash);
        }

        const colorIndex = index % KEYWORD_COLORS.length;
        return KEYWORD_COLORS[colorIndex];
    };

    const tabs = ['细节', '时间线', '关联', '目标'];
    if (scope.enableFocusScore) tabs.splice(3, 0, '专注');
    if (scope.keywords && scope.keywords.length > 0) tabs.push('关键字');

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

                        {/* Keywords Section */}
                        <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Keywords</h3>
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {(scope.keywords || []).map(keyword => (
                                        <button
                                            key={keyword}
                                            onClick={() => {
                                                const currentKeywords = scope.keywords || [];
                                                setScope(prev => ({
                                                    ...prev,
                                                    keywords: currentKeywords.filter(k => k !== keyword)
                                                }));
                                            }}
                                            className={`
                                                px-3 py-1.5 rounded-lg text-[11px] font-medium text-center border transition-colors flex items-center justify-center gap-1.5 truncate group
                                                ${getKeywordColor(keyword)}
                                            `}
                                        >
                                            <span className="truncate max-w-[100px]">{keyword}</span>
                                            <X size={10} className="opacity-40 hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                    {(scope.keywords || []).length === 0 && (
                                        <span className="text-xs text-stone-300 italic">No keywords added yet.</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 min-w-0">
                                    <input
                                        type="text"
                                        value={newKeyword}
                                        onChange={(e) => setNewKeyword(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (newKeyword.trim()) {
                                                    const currentKeywords = scope.keywords || [];
                                                    if (!currentKeywords.includes(newKeyword.trim())) {
                                                        setScope(prev => ({
                                                            ...prev,
                                                            keywords: [...currentKeywords, newKeyword.trim()]
                                                        }));
                                                    }
                                                    setNewKeyword('');
                                                }
                                            }
                                        }}
                                        placeholder="Add a keyword..."
                                        className="flex-1 min-w-0 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-bold text-stone-700 outline-none focus:border-stone-400 focus:bg-white transition-colors placeholder:font-normal"
                                    />
                                    <button
                                        onClick={() => {
                                            if (newKeyword.trim()) {
                                                const currentKeywords = scope.keywords || [];
                                                if (!currentKeywords.includes(newKeyword.trim())) {
                                                    setScope(prev => ({
                                                        ...prev,
                                                        keywords: [...currentKeywords, newKeyword.trim()]
                                                    }));
                                                }
                                                setNewKeyword('');
                                            }
                                        }}
                                        disabled={!newKeyword.trim()}
                                        className="p-2.5 bg-stone-800 text-white rounded-xl hover:bg-stone-700 disabled:opacity-50 disabled:hover:bg-stone-800 transition-colors shrink-0"
                                    >
                                        <Plus size={18} />
                                    </button>
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
                                                className={`w-7 h-7 rounded-full border-2 ${opt.bg} ${opt.border} ${scope.themeColor === opt.title ? `ring-1 ${opt.ring} ring-offset-1` : ''}`}
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
                            <div className="px-6 pb-6 pt-2 flex flex-wrap gap-y-4 items-end justify-between border-t border-stone-50">
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
                                <div className="text-right ml-auto">
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
                                            <div className="flex items-baseline justify-between mb-6 px-2 py-2 border-b border-stone-100">
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
                                                            <div className="absolute -left-[60px] top-2 w-[45px] text-right flex flex-col items-end">
                                                                <span className="text-sm font-bold text-stone-800 leading-none font-mono">
                                                                    {timeStr}
                                                                </span>
                                                                <span className="text-[10px] font-medium text-stone-400 mt-1">
                                                                    {durStr}
                                                                </span>
                                                            </div>

                                                            {/* Timeline Dot */}
                                                            <div className="absolute left-[3px] top-2 w-2.5 h-2.5 rounded-full bg-stone-900 border-2 border-[#faf9f6] z-10" />

                                                            {/* Content */}
                                                            <div className="relative">
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
                                                                    <p className="text-sm text-stone-500 leading-relaxed mb-2 font-light whitespace-pre-wrap">
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

            case '关键字':
                return (
                    <>
                        <div className="bg-white rounded-[2rem] p-0 mb-8 border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
                            <CalendarWidget
                                currentDate={displayDate}
                                onDateChange={(newDate) => {
                                    if (newDate.getMonth() !== displayDate.getMonth() || newDate.getFullYear() !== displayDate.getFullYear()) {
                                        setDisplayDate(newDate);
                                    }
                                }}
                                logs={scopeLogs}
                                isExpanded={true}
                                onExpandToggle={() => { }}
                                staticMode={true}
                                disableSelection={true}
                                renderCustomDay={(date, isSelected, isToday) => {
                                    // Find logs for this day
                                    const dayLogs = scopeLogs.filter(l => {
                                        const d = new Date(l.startTime);
                                        return d.getDate() === date.getDate() &&
                                            d.getMonth() === date.getMonth() &&
                                            d.getFullYear() === date.getFullYear();
                                    });

                                    if (dayLogs.length === 0) return null;

                                    // Find matched keywords in these logs
                                    const matchedKeywords = new Set<string>();
                                    const currentScopeKeywords = scope.keywords || [];

                                    dayLogs.forEach(log => {
                                        // Check note for keywords
                                        currentScopeKeywords.forEach(kw => {
                                            if (log.note && log.note.includes(kw)) {
                                                matchedKeywords.add(kw);
                                            }
                                        });
                                    });

                                    // 1. Logs but no keywords matched -> Gray
                                    if (matchedKeywords.size === 0) {
                                        return <div className="w-full h-full bg-stone-200/50" />;
                                    }

                                    // 2. Matched keywords -> Split colors
                                    const keywordsArray = Array.from(matchedKeywords);
                                    return (
                                        <div className="w-full h-full flex">
                                            {keywordsArray.map(kw => (
                                                <div
                                                    key={kw}
                                                    className={`h-full flex-1 ${getKeywordColor(kw)}`}
                                                    style={{ border: 'none' }}
                                                />
                                            ))}
                                        </div>
                                    );
                                }}
                            />
                            <div className="p-6 pt-2 border-t border-stone-100">
                                <div className="flex flex-wrap gap-2 justify-center">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded bg-stone-200/50"></div>
                                        <span className="text-xs text-stone-500">Unmatched</span>
                                    </div>
                                    {(scope.keywords || []).map(kw => (
                                        <div key={kw} className="flex items-center gap-1.5 ml-2">
                                            <div className={`w-3 h-3 rounded ${getKeywordColor(kw).split(' ')[0]}`}></div>
                                            <span className="text-xs text-stone-500">{kw}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Keyword Grouped Lists */}
                        <div className="space-y-6">
                            {(() => {
                                // Filter logs for current month
                                const currentMonthLogs = scopeLogs.filter(l => {
                                    const d = new Date(l.startTime);
                                    return d.getMonth() === displayDate.getMonth() && d.getFullYear() === displayDate.getFullYear();
                                });

                                // Group logic
                                const groups = (scope.keywords || []).map(kw => {
                                    const logs = currentMonthLogs.filter(l =>
                                        (l.note && l.note.includes(kw))
                                    );
                                    return { keyword: kw, logs };
                                });

                                return groups.map(group => {
                                    const totalDuration = group.logs.reduce((acc, curr) => acc + curr.duration, 0);
                                    const h = Math.floor(totalDuration / 3600);
                                    const m = Math.floor((totalDuration % 3600) / 60);
                                    const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
                                    const isExpanded = expandedKeywords.has(group.keyword);

                                    return (
                                        <div key={group.keyword} className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm transition-all">
                                            {/* Header */}
                                            <div
                                                onClick={() => {
                                                    const newSet = new Set(expandedKeywords);
                                                    if (newSet.has(group.keyword)) {
                                                        newSet.delete(group.keyword);
                                                    } else {
                                                        newSet.add(group.keyword);
                                                    }
                                                    setExpandedKeywords(newSet);
                                                }}
                                                className="flex items-center justify-between cursor-pointer group select-none"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-3 h-3 rounded-full ${getKeywordColor(group.keyword).split(' ')[0]}`}></div>
                                                    <h3 className="text-sm font-bold text-stone-700 uppercase tracking-widest">{group.keyword}</h3>
                                                    <span className="bg-stone-100 text-stone-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                        {group.logs.length}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-sm font-bold text-stone-400 group-hover:text-stone-600 transition-colors">
                                                        {timeStr}
                                                    </span>
                                                    <ChevronDown size={16} className={`text-stone-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </div>
                                            </div>

                                            {/* List */}
                                            {isExpanded && (
                                                <div className="mt-6 space-y-0 text-sm animate-in slide-in-from-top-2 fade-in duration-200">
                                                    {group.logs.length === 0 ? (
                                                        <div className="text-center py-8 text-stone-300 italic text-xs">
                                                            No records found for this keyword in this month.
                                                        </div>
                                                    ) : (
                                                        group.logs
                                                            .sort((a, b) => b.startTime - a.startTime)
                                                            .map(log => {
                                                                const logH = Math.floor(log.duration / 3600);
                                                                const logM = Math.floor((log.duration % 3600) / 60);
                                                                const logTimeStr = logH > 0 ? `${logH}h ${logM}m` : `${logM}m`;
                                                                const dateObj = new Date(log.startTime);
                                                                const category = categories.find(c => c.id === log.categoryId);
                                                                const activity = category?.activities.find(a => a.id === log.activityId);

                                                                return (
                                                                    <div
                                                                        key={log.id}
                                                                        onClick={() => onEditLog?.(log)}
                                                                        className="group flex items-center gap-3 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50 md:-mx-2 md:px-2 transition-colors cursor-pointer"
                                                                    >
                                                                        <div className="w-8 flex flex-col items-center justify-center shrink-0">
                                                                            <span className="text-[10px] font-bold text-stone-400 leading-none">
                                                                                {dateObj.getDate()}
                                                                            </span>
                                                                            <span className="text-[8px] text-stone-300 uppercase leading-none mt-0.5">
                                                                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()]}
                                                                            </span>
                                                                        </div>

                                                                        <div className="w-1 h-8 rounded-full bg-stone-100 group-hover:bg-stone-200 transition-colors shrink-0"></div>

                                                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                                            <span className="font-medium truncate text-stone-700 leading-tight">
                                                                                {activity?.name || category?.name || "Activity"}
                                                                            </span>
                                                                            <span className="text-[10px] text-stone-400 mt-0.5 font-mono truncate">
                                                                                {log.note || dateObj.getHours().toString().padStart(2, '0') + ':' + dateObj.getMinutes().toString().padStart(2, '0')}
                                                                            </span>
                                                                        </div>

                                                                        <span className="text-xs text-stone-400 font-mono whitespace-nowrap shrink-0 group-hover:text-stone-600">
                                                                            {logTimeStr}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </>
                );

            case '目标':
                // 分离未归档和归档目标
                const activeGoals = goals.filter(g =>
                    g.scopeId === scope.id && g.status !== 'archived'
                );
                const archivedGoals = goals.filter(g =>
                    g.scopeId === scope.id && g.status === 'archived'
                );
                const archivedCount = archivedGoals.length;

                return (
                    <div className="space-y-4 max-w-3xl">
                        {/* 未归档目标列表 */}
                        {activeGoals.length === 0 && archivedCount === 0 ? (
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
                                {/* 显示未归档目标 */}
                                {activeGoals.map(goal => (
                                    <GoalCard
                                        key={goal.id}
                                        goal={goal}
                                        logs={logs}
                                        todos={todos}
                                        onEdit={onEditGoal}
                                        onDelete={onDeleteGoal}
                                        onArchive={handleArchiveGoal}
                                    />
                                ))}
                                {/* 添加新目标按钮 */}
                                {onAddGoal && (
                                    <button
                                        onClick={onAddGoal}
                                        className="w-full py-2.5 border-2 border-dashed border-stone-200 rounded-xl text-stone-400 hover:text-stone-600 hover:border-stone-300 transition-colors text-sm font-medium"
                                    >
                                        + 添加新目标
                                    </button>
                                )}

                                {/* 显示归档 Toggle（在未归档目标后） */}
                                {archivedCount > 0 && (
                                    <div className="flex items-center justify-between px-4 py-3 bg-stone-50 rounded-xl mt-6">
                                        <div className="flex items-center gap-2">
                                            <Archive size={16} className="text-stone-400" />
                                            <span className="text-sm font-medium text-stone-600">
                                                显示归档目标
                                            </span>
                                            <span className="text-xs text-stone-400">
                                                ({archivedCount})
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setShowArchived(!showArchived)}
                                            className={`w-12 h-6 rounded-full p-1 transition-colors ${showArchived ? 'bg-stone-900' : 'bg-stone-200'
                                                }`}
                                        >
                                            <div
                                                className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${showArchived ? 'translate-x-6' : ''
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                )}

                                {/* 归档目标列表（仅在开启时显示） */}
                                {showArchived && archivedGoals.map(goal => (
                                    <GoalCard
                                        key={goal.id}
                                        goal={goal}
                                        logs={logs}
                                        todos={todos}
                                        onEdit={onEditGoal}
                                        onDelete={onDeleteGoal}
                                        onArchive={handleArchiveGoal}
                                    />
                                ))}
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
