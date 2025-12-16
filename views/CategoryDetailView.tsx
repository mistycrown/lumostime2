import React, { useMemo, useState } from 'react';
import { Log, Category, Activity, TodoItem } from '../types';
import { COLOR_OPTIONS } from '../constants';
import { CalendarWidget } from '../components/CalendarWidget';
import { FocusCharts } from '../components/FocusCharts';
import { Clock, Save, ChevronRight, Check, Zap, CheckCircle2, Circle } from 'lucide-react';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { MatrixAnalysisChart } from '../components/MatrixAnalysisChart';
import { Scope } from '../types';

interface CategoryDetailViewProps {
    categoryId: string;
    logs: Log[];
    categories: Category[];
    onUpdateCategory: (category: Category) => void;
    onEditLog?: (log: Log) => void;
    onEditTodo?: (todo: TodoItem) => void;
    todos: TodoItem[];
    scopes: Scope[];
}

export const CategoryDetailView: React.FC<CategoryDetailViewProps> = ({ categoryId, logs, categories, onUpdateCategory, onEditLog, onEditTodo, todos, scopes }) => {
    const initialCategory = categories.find(c => c.id === categoryId);
    const [category, setCategory] = useState<Category | undefined>(initialCategory);
    const [isSaveSuccess, setIsSaveSuccess] = useState(false);

    const [activeTab, setActiveTab] = useState('Timeline');
    const [displayDate, setDisplayDate] = useState(new Date());
    const [analysisRange, setAnalysisRange] = useState<'Week' | 'Month' | 'Year' | 'All'>('Month');
    const [analysisDate, setAnalysisDate] = useState(new Date());

    if (!category) return <div>Category not found</div>;

    // Filter logs for this category (All time)
    const catLogs = useMemo(() => logs.filter(l => l.categoryId === categoryId), [logs, categoryId]);

    // Associated Todos
    const catTodos = useMemo(() =>
        todos.filter(t => t.linkedCategoryId === categoryId)
            .sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted)),
        [todos, categoryId]);

    // Matrix Stats (Scope Distribution)
    const matrixStats = useMemo(() => {
        // Filter logs based on analysisRange
        const filteredLogs = catLogs.filter(log => {
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
            if (log.scopeIds && log.scopeIds.length > 0) {
                log.scopeIds.forEach(scopeId => {
                    stats.set(scopeId, (stats.get(scopeId) || 0) + log.duration);
                });
            } else {
                stats.set('uncategorized', (stats.get('uncategorized') || 0) + log.duration);
            }
        });

        return Array.from(stats.entries()).map(([scId, duration]) => {
            const scope = scopes.find(s => s.id === scId);
            return {
                id: scId,
                label: scope ? scope.name : 'unscoped',
                value: duration,
                color: (() => {
                    if (!scope || scId === 'uncategorized') return '#78716c'; // Default stone color
                    const colorClass = scope.themeColor || '';
                    const match = colorClass.match(/(?:text|bg)-([a-z]+)-/);
                    const colorName = match ? match[1] : 'stone';
                    const option = COLOR_OPTIONS.find(opt => opt.id === colorName);
                    return option ? option.hex : '#78716c';
                })(),
                icon: scope?.icon
            };
        });
    }, [catLogs, scopes, analysisRange, analysisDate]);

    // Calculate total duration for the filtered range
    const analysisTotalDuration = useMemo(() => {
        return matrixStats.reduce((acc, curr) => acc + curr.value, 0);
    }, [matrixStats]);

    // Total Stats
    const totalSeconds = catLogs.reduce((acc, curr) => acc + curr.duration, 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMins = Math.floor((totalSeconds % 3600) / 60);

    // Heatmap Data
    const displayMonth = displayDate.getMonth();
    const displayYear = displayDate.getFullYear();

    const monthLogs = useMemo(() => catLogs.filter(log => {
        const d = new Date(log.startTime);
        return d.getMonth() === displayMonth && d.getFullYear() === displayYear;
    }), [catLogs, displayMonth, displayYear]);

    const monthSeconds = monthLogs.reduce((acc, curr) => acc + curr.duration, 0);
    const monthHours = Math.floor(monthSeconds / 3600);
    const monthMins = Math.floor((monthSeconds % 3600) / 60);

    const heatmapData = useMemo(() => {
        const map = new Map<number, number>();
        catLogs.forEach(log => {
            const d = new Date(log.startTime);
            if (d.getMonth() === displayMonth && d.getFullYear() === displayYear) {
                const day = d.getDate();
                map.set(day, (map.get(day) || 0) + log.duration);
            }
        });
        return map;
    }, [catLogs, displayMonth, displayYear]);

    const handleMonthChange = (offset: number) => {
        const newDate = new Date(displayDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setDisplayDate(newDate);
    };

    const handleNameChange = (val: string) => {
        if (!category) return;
        const firstChar = Array.from(val)[0] || '';
        const icon = firstChar;
        const name = val.slice(firstChar.length).trim();
        setCategory({ ...category, icon, name });
    };

    const handleColorChange = (color: string) => {
        if (!category) return;
        setCategory({ ...category, themeColor: color });
    };

    const renderContent = () => {
        switch (activeTab) {
            case '关联':
                return (
                    <div className="space-y-6">
                        {/* Associated Todos Card */}
                        <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Associated Todos</h3>
                            <div className="space-y-0 text-sm">
                                {catTodos.length === 0 ? (
                                    <div className="text-center py-6 text-stone-400 border border-dashed border-stone-200 rounded-xl">
                                        <p className="text-xs font-medium opacity-60">No associated todos</p>
                                    </div>
                                ) : (
                                    catTodos.map(todo => {
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

                        {/* Cross Analysis Card (Scope Distribution) */}
                        <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Scope Analysis</h3>
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
            case 'Details':
                return (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Basic Info</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-stone-400 font-medium mb-1.5 block">Name (First char is icon)</label>
                                    <input
                                        type="text"
                                        value={`${category.icon}${category.name}`}
                                        onChange={(e) => handleNameChange(e.target.value)}
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Appearance</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-stone-400 font-medium mb-1.5 block">Theme Color</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {COLOR_OPTIONS.map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => handleColorChange(opt.title)}
                                                title={opt.label}
                                                className={`w-10 h-10 rounded-full border-2 ${opt.bg} ${opt.border} ${category.themeColor === opt.title ? `ring-2 ${opt.ring} ring-offset-2` : ''}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Heatmap Settings */}
                        <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Heatmap Scale (Minutes)</h3>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-xs text-stone-400 font-medium mb-1.5 block">Min (Lightest)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={category.heatmapMin ?? ''}
                                        onChange={(e) => setCategory({ ...category, heatmapMin: parseInt(e.target.value) || undefined })}
                                        placeholder="Default: 0"
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-stone-400 font-medium mb-1.5 block">Max (Darkest)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={category.heatmapMax ?? ''}
                                        onChange={(e) => setCategory({ ...category, heatmapMax: parseInt(e.target.value) || undefined })}
                                        placeholder="Default: 240"
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Focus Score Settings */}
                        <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Focus Score</h3>
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-stone-700">Enable Focus Score</label>
                                <button
                                    onClick={() => setCategory({ ...category, enableFocusScore: !category.enableFocusScore })}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${category.enableFocusScore ? 'bg-stone-900' : 'bg-stone-200'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${category.enableFocusScore ? 'translate-x-6' : ''}`} />
                                </button>
                            </div>
                            <p className="text-xs text-stone-400 mt-2">
                                If enabled, activities in this category will track focus levels (1-5) by default.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Activities</h3>
                            <div className="space-y-2">
                                {category.activities.map(act => (
                                    <div key={act.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                                        <span className="text-xl">{act.icon}</span>
                                        <span className="font-medium text-stone-700">{act.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                if (category) {
                                    onUpdateCategory(category);
                                    setIsSaveSuccess(true);
                                    setTimeout(() => setIsSaveSuccess(false), 2000);
                                }
                            }}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl active:scale-[0.99] transition-all flex items-center justify-center gap-2 ${isSaveSuccess ? 'bg-[#2F4F4F] text-white' : 'bg-stone-900 text-white hover:bg-black'}`}
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
            case 'Timeline':
                return (
                    <>
                        {/* Heatmap Section */}
                        <div className="bg-white rounded-[2rem] p-0 mb-8 border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
                            <CalendarWidget
                                currentDate={displayDate}
                                onDateChange={(newDate) => {
                                    // Only update if month/year changes to allow navigation
                                    if (newDate.getMonth() !== displayDate.getMonth() || newDate.getFullYear() !== displayDate.getFullYear()) {
                                        setDisplayDate(newDate);
                                    }
                                }}
                                logs={catLogs}
                                isExpanded={true}
                                onExpandToggle={() => { }}
                                disableSelection={true}
                                customScale={
                                    (category.heatmapMin !== undefined || category.heatmapMax !== undefined)
                                        ? { min: (category.heatmapMin || 30) * 60, max: (category.heatmapMax || 240) * 60 }
                                        : undefined
                                }
                            />

                            <div className="px-6 pb-6 pt-2 flex items-end justify-between">
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
                                        const totalDays = new Set(catLogs.map(l => new Date(l.startTime).toDateString())).size;
                                        const monthDays = new Set(monthLogs.map(l => new Date(l.startTime).toDateString())).size;
                                        return (
                                            <div className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded inline-block mt-1">
                                                Recorded {totalDays} days / {monthDays} days
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] uppercase tracking-widest text-stone-400 mb-1 font-bold">Avg. Daily</div>
                                    <div className="text-xl font-bold text-stone-700 font-mono">
                                        {(() => {
                                            const totalDays = new Set(catLogs.map(l => new Date(l.startTime).toDateString())).size;
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

                        {/* History List */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock size={14} className="text-stone-400" />
                                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">History ({displayMonth + 1}/{displayYear})</span>
                            </div>

                            {heatmapData.size === 0 ? (
                                <div className="text-center py-10 text-stone-400 text-sm italic border border-dashed border-stone-200 rounded-2xl">
                                    No activity recorded in this month.
                                </div>
                            ) : (
                                Array.from(heatmapData.keys()).sort((a: number, b: number) => b - a).map((day: number) => {
                                    const daySeconds = heatmapData.get(day) || 0;
                                    const dayLogsFiltered = catLogs.filter(l => {
                                        const d = new Date(l.startTime);
                                        return d.getDate() === day && d.getMonth() === displayMonth && d.getFullYear() === displayYear;
                                    });

                                    const date = new Date(displayYear, displayMonth, day);
                                    const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];

                                    return (
                                        <div key={day} className="flex flex-col gap-3 group">
                                            <div className="flex justify-between items-end border-b border-stone-100 pb-2">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-lg font-bold text-stone-800 font-mono">{String(displayMonth + 1).padStart(2, '0')}/{String(day).padStart(2, '0')}</span>
                                                    <span className="text-xs font-medium text-stone-400">{weekDay}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-stone-900 font-mono">{Math.floor(daySeconds / 60)}m</span>
                                                </div>
                                            </div>

                                            <div className="relative border-l border-stone-300 ml-[70px] space-y-6 pb-4">
                                                {dayLogsFiltered.map(log => {
                                                    const activity = category.activities.find(a => a.id === log.activityId);
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
                                                            <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-stone-900 border-2 border-[#faf9f6] z-10" />

                                                            <div className="relative top-[-2px]">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-lg font-bold text-stone-900 leading-tight">{activity?.name || 'Unknown Activity'}</span>
                                                                    {log.focusScore && (
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
                                                                {/* Optional: Add tags here if accessed context allows, e.g. linked todo */}
                                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                    <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                                                        <span className="font-bold text-stone-400">#</span>
                                                                        <span>{category.icon}</span>
                                                                        <span className="flex items-center">
                                                                            <span>{category.name}</span>
                                                                            <span className="mx-1 text-stone-300">/</span>
                                                                            <span className="mr-1">{activity?.icon}</span>
                                                                            <span className="text-stone-500">{activity?.name}</span>
                                                                        </span>
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
            case 'Focus':
                return (
                    <FocusCharts
                        logs={catLogs}
                        currentDate={displayDate}
                        onDateChange={setDisplayDate}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="h-full bg-[#faf9f6] overflow-y-auto no-scrollbar pb-24 px-7 pt-4">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-3">
                    <span className="text-stone-300 font-normal">#</span>
                    {category.icon && <span className="text-2xl">{category.icon}</span>}
                    {category.name}
                </h1>
                <span className="text-stone-400 text-sm font-medium ml-1 mt-1 block">Category</span>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-stone-200 mb-8 overflow-x-auto no-scrollbar">
                {['Details', 'Timeline', '关联'].concat(category.enableFocusScore ? ['Focus'] : []).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-sm font-serif tracking-wide whitespace-nowrap transition-colors ${activeTab === tab ? 'text-stone-900 border-b-2 border-stone-900 font-bold' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        {tab === 'Timeline' ? '時間線' : tab === 'Details' ? '细节' : tab === 'Focus' ? '专 注' : tab}
                    </button>
                ))}
            </div>

            {renderContent()}
        </div>
    );
};
