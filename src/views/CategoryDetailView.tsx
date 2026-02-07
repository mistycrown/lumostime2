/**
 * @file CategoryDetailView.tsx
 * @input Category ID, Logs, Associated Todos/Scopes
 * @output Detailed Category Analysis
 * @pos View (Detail Page)
 * @description Displays comprehensive analytics for a specific category, including a heatmap, history log, focus trends, and cross-analysis with scopes. Also allows editing category properties.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useMemo, useState } from 'react';
import { Log, Category, Activity, TodoItem } from '../types';
import { COLOR_OPTIONS } from '../constants';
import { Clock, Save, ChevronRight, Check, Zap, CheckCircle2, Circle } from 'lucide-react';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { MatrixAnalysisChart } from '../components/MatrixAnalysisChart';
import { Scope } from '../types';
import { DetailTimelineCard } from '../components/DetailTimelineCard';

interface CategoryDetailViewProps {
    categoryId: string;
    logs: Log[];
    categories: Category[];
    onUpdateCategory: (category: Category) => void;
    onEditLog?: (log: Log) => void;
    onEditTodo?: (todo: TodoItem) => void;
    onToggleTodo?: (id: string) => void;
    todos: TodoItem[];
    scopes: Scope[];
}

export const CategoryDetailView: React.FC<CategoryDetailViewProps> = ({ categoryId, logs, categories, onUpdateCategory, onEditLog, onEditTodo, onToggleTodo, todos, scopes }) => {
    const initialCategory = categories.find(c => c.id === categoryId);
    const [category, setCategory] = useState<Category | undefined>(initialCategory);

    const [activeTab, setActiveTab] = useState('Timeline');
    const [displayDate, setDisplayDate] = useState(new Date());
    const [analysisRange, setAnalysisRange] = useState<'Week' | 'Month' | 'Year' | 'All'>('Month');
    const [analysisDate, setAnalysisDate] = useState(new Date());

    // 实时保存：当 category 状态变化时自动保存
    React.useEffect(() => {
        if (category && initialCategory) {
            // 检查是否有实际变化（避免初始化时触发保存）
            const hasChanges = 
                category.name !== initialCategory.name ||
                category.icon !== initialCategory.icon ||
                category.themeColor !== initialCategory.themeColor ||
                category.heatmapMin !== initialCategory.heatmapMin ||
                category.heatmapMax !== initialCategory.heatmapMax ||
                category.enableFocusScore !== initialCategory.enableFocusScore;
            
            if (hasChanges) {
                onUpdateCategory(category);
            }
        }
    }, [category]); // 只监听 category 变化

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
                    if (!scope || scId === 'uncategorized') return '#e7e5e4'; // Default stone light color
                    const colorClass = scope.themeColor || '';
                    const match = colorClass.match(/(?:text|bg)-([a-z]+)-/);
                    const colorName = match ? match[1] : 'stone';
                    const option = COLOR_OPTIONS.find(opt => opt.id === colorName);
                    return option ? option.lightHex : '#e7e5e4';
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
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onToggleTodo?.(todo.id);
                                                    }} 
                                                    className="shrink-0 transition-colors"
                                                >
                                                    <div className={`w-4 h-4 shrink-0 rounded-[4px] border-2 flex items-center justify-center transition-colors ${todo.isCompleted ? 'bg-stone-900 border-stone-900' : 'border-stone-300 group-hover:border-stone-400'
                                                        }`}>
                                                        {todo.isCompleted && <span className="text-white text-[10px]">✓</span>}
                                                    </div>
                                                </button>
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
                                
                                {/* Theme Color */}
                                <div>
                                    <label className="text-xs text-stone-400 font-medium mb-1.5 block">Theme Color</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {COLOR_OPTIONS.map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => handleColorChange(opt.title)}
                                                title={opt.label}
                                                className={`w-7 h-7 rounded-full border-2 ${opt.bg} ${opt.border} ${category.themeColor === opt.title ? `ring-1 ${opt.ring} ring-offset-1` : ''}`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Heatmap Scale */}
                                <div>
                                    <label className="text-xs text-stone-400 font-medium mb-1.5 block">Heatmap Scale (Minutes)</label>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                min={0}
                                                value={category.heatmapMin ?? ''}
                                                onChange={(e) => setCategory({ ...category, heatmapMin: parseInt(e.target.value) || undefined })}
                                                placeholder="Min: 0"
                                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                min={0}
                                                value={category.heatmapMax ?? ''}
                                                onChange={(e) => setCategory({ ...category, heatmapMax: parseInt(e.target.value) || undefined })}
                                                placeholder="Max: 240"
                                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Focus Score */}
                                <div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-stone-400 font-medium">Enable Focus Score</label>
                                        <button
                                            onClick={() => setCategory({ ...category, enableFocusScore: !category.enableFocusScore })}
                                            className={`w-12 h-6 rounded-full p-1 transition-colors ${category.enableFocusScore ? 'bg-stone-900' : 'bg-stone-200'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${category.enableFocusScore ? 'translate-x-6' : ''}`} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-stone-400 mt-1.5">
                                        If enabled, activities in this category will track focus levels (1-5) by default.
                                    </p>
                                </div>
                            </div>
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
                    </div>
                );
            case 'Timeline':
                return (
                    <DetailTimelineCard
                        filteredLogs={catLogs}
                        displayDate={displayDate}
                        onDateChange={setDisplayDate}
                        customScale={
                            (category.heatmapMin !== undefined || category.heatmapMax !== undefined)
                                ? { min: (category.heatmapMin || 30) * 60, max: (category.heatmapMax || 240) * 60 }
                                : undefined
                        }
                        entityInfo={{
                            icon: category.icon,
                            name: category.name,
                            type: 'category'
                        }}
                        onEditLog={onEditLog}
                        categories={categories}
                        todos={todos}
                        enableFocusScore={category.enableFocusScore ?? false}
                        renderLogMetadata={(log) => {
                            const category = categories.find(c => c.id === log.categoryId);
                            const activity = category?.activities.find(a => a.id === log.activityId);
                            const linkedTodo = todos.find(t => t.id === log.linkedTodoId);

                            return (
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    {/* Linked Todo */}
                                    {linkedTodo && (
                                        <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                            <span className="text-stone-400 font-bold">@</span>
                                            <span className="line-clamp-1">{linkedTodo.title}</span>
                                        </span>
                                    )}

                                    {/* Category Tag */}
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

                                    {/* Scope Tags */}
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
                            );
                        }}
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
                {['Details', 'Timeline', '关联'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-sm font-serif tracking-wide whitespace-nowrap transition-colors ${activeTab === tab ? 'text-stone-900 border-b-2 border-stone-900 font-bold' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        {tab === 'Timeline' ? '時間線' : tab === 'Details' ? '细节' : tab}
                    </button>
                ))}
            </div>

            {renderContent()}
        </div>
    );
};
