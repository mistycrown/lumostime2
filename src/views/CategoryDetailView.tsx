/**
 * @file CategoryDetailView.tsx
 * @input Category ID, Logs, Associated Todos/Scopes
 * @output Detailed Category Analysis
 * @pos View (Detail Page)
 * @description Displays comprehensive analytics for a specific category, including a heatmap, history log, focus trends, cross-analysis with scopes, and inline-managed note templates.
 * @updated 2026-06-13: Reused the shared hierarchical associated-todo list so subtasks render under parent todos in the association tab.
 * @updated 2026-08-09: Planned timeline blocks are excluded from category statistics.
 * @updated 2026-08-26: Added category archive and restore control with child-activity cascading handled by the category context.
 * @updated 2026-08-26: Moved category archive status and action into the Details basic-information section to match tag details.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useMemo, useState } from 'react';
import { Log, Category, Activity, TodoItem } from '../types';
import { COLOR_OPTIONS } from '../constants';
import { Clock, Save, ChevronRight, Check, Zap, CheckCircle2, Circle, Archive, ArchiveRestore } from 'lucide-react';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { MatrixAnalysisChart } from '../components/MatrixAnalysisChart';
import { Scope } from '../types';
import { DetailTimelineCard } from '../components/DetailTimelineCard';
import { UIIconSelector } from '../components/UIIconSelector';
import { useSettings } from '../contexts/SettingsContext';
import { IconRenderer } from '../components/IconRenderer';
import { getDateRange } from '../utils/dateRangeUtils';
import { useCustomColors } from '../hooks/useCustomColors';
import { isStoredColorSelected } from '../utils/colorUtils';
import { getColorHexForCharts } from '../utils/colorAdapterUtils';
import { getNormalizedScopeIds } from '../utils/scopeStatsUtils';
import { NoteTemplateManager } from '../components/NoteTemplateManager';
import { AssociatedTodoList } from '../components/AssociatedTodoList';
import { filterCountableLogs } from '../utils/statLogUtils';

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
    
    // 获取当前 UI 图标主题
    const { uiIconTheme } = useSettings();
    const isCustomThemeEnabled = uiIconTheme !== 'default';
    const customColors = useCustomColors();

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
                category.uiIcon !== initialCategory.uiIcon ||
                category.themeColor !== initialCategory.themeColor ||
                category.heatmapMin !== initialCategory.heatmapMin ||
                category.heatmapMax !== initialCategory.heatmapMax ||
                category.enableFocusScore !== initialCategory.enableFocusScore ||
                category.enableMoodScore !== initialCategory.enableMoodScore ||
                category.isArchived !== initialCategory.isArchived ||
                JSON.stringify(category.noteTemplates || []) !== JSON.stringify(initialCategory.noteTemplates || []);
            
            if (hasChanges) {
                onUpdateCategory(category);
            }
        }
    }, [category]); // 只监听 category 变化

    if (!category) return <div>Category not found</div>;

    // Filter logs for this category (All time)
    const catLogs = useMemo(() => logs.filter(l => l.categoryId === categoryId), [logs, categoryId]);
    const countableCatLogs = useMemo(() => filterCountableLogs(catLogs), [catLogs]);

    // Associated Todos
    const catTodos = useMemo(() =>
        todos.filter(t => t.linkedCategoryId === categoryId)
            .sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted)),
        [todos, categoryId]);

    // Matrix Stats (Scope Distribution)
    const matrixStats = useMemo(() => {
        // Filter logs based on analysisRange
        const filteredLogs = countableCatLogs.filter(log => {
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
                // Use dateRangeUtils for consistent week calculation
                const weekRange = getDateRange(target, 'week');
                return d >= weekRange.start && d < weekRange.end;
            }
            return true;
        });


        const stats = new Map<string, number>();
        filteredLogs.forEach(log => {
            const scopeIds = getNormalizedScopeIds(log.scopeIds);
            if (scopeIds.length > 0) {
                scopeIds.forEach(scopeId => {
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
                    return getColorHexForCharts(scope.themeColor || '');
                })(),
                icon: scope?.icon
            };
        });
    }, [countableCatLogs, scopes, analysisRange, analysisDate]);

    // Calculate total duration for the filtered range
    const analysisTotalDuration = useMemo(() => {
        return matrixStats.reduce((acc, curr) => acc + curr.value, 0);
    }, [matrixStats]);

    // Total Stats
    const totalSeconds = countableCatLogs.reduce((acc, curr) => acc + curr.duration, 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMins = Math.floor((totalSeconds % 3600) / 60);

    // Heatmap Data
    const displayMonth = displayDate.getMonth();
    const displayYear = displayDate.getFullYear();

    const monthLogs = useMemo(() => countableCatLogs.filter(log => {
        const d = new Date(log.startTime);
        return d.getMonth() === displayMonth && d.getFullYear() === displayYear;
    }), [countableCatLogs, displayMonth, displayYear]);

    const monthSeconds = monthLogs.reduce((acc, curr) => acc + curr.duration, 0);
    const monthHours = Math.floor(monthSeconds / 3600);
    const monthMins = Math.floor((monthSeconds % 3600) / 60);

    const heatmapData = useMemo(() => {
        const map = new Map<number, number>();
        countableCatLogs.forEach(log => {
            const d = new Date(log.startTime);
            if (d.getMonth() === displayMonth && d.getFullYear() === displayYear) {
                const day = d.getDate();
                map.set(day, (map.get(day) || 0) + log.duration);
            }
        });
        return map;
    }, [countableCatLogs, displayMonth, displayYear]);

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

    const handleToggleArchive = () => {
        if (!category) return;
        setCategory({ ...category, isArchived: category.isArchived !== true });
    };

    const renderContent = () => {
        switch (activeTab) {
            case '关联':
                return (
                    <div className="space-y-6">
                        <AssociatedTodoList
                            todos={catTodos}
                            logs={logs}
                            onEditTodo={onEditTodo}
                            onToggleTodo={onToggleTodo}
                        />
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
                            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">基本信息</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                                    <span className="text-sm font-medium text-stone-600">归档状态</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-stone-500">{category.isArchived === true ? '已归档' : '未归档'}</span>
                                        <button
                                            type="button"
                                            onClick={handleToggleArchive}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                            title={category.isArchived === true ? '恢复分类' : '归档分类'}
                                        >
                                            {category.isArchived === true ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                                            {category.isArchived === true ? '恢复分类' : '归档分类'}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-stone-400 font-medium mb-1.5 block">名称（首字符作为图标）</label>
                                    <input
                                        type="text"
                                        value={`${category.icon}${category.name}`}
                                        onChange={(e) => handleNameChange(e.target.value)}
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                                    />
                                </div>
                                
                                {/* Theme Color */}
                                <div>
                                    <label className="text-xs text-stone-400 font-medium mb-1.5 block">主题颜色</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {COLOR_OPTIONS.map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => handleColorChange(opt.title)}
                                                title={opt.label}
                                                className={`w-7 h-7 rounded-full border-2 ${opt.bg} ${opt.border} ${isStoredColorSelected(category.themeColor, opt.title) ? `ring-1 ${opt.ring} ring-offset-1` : ''}`}
                                            />
                                        ))}
                                        {customColors.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleColorChange(item.color)}
                                                title={item.color}
                                                className={`w-7 h-7 rounded-full border border-stone-300 ${
                                                    isStoredColorSelected(category.themeColor, item.color)
                                                        ? 'ring-1 ring-stone-400 ring-offset-1'
                                                        : ''
                                                }`}
                                                style={{ backgroundColor: item.color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Heatmap Scale */}
                                <div>
                                    <label className="text-xs text-stone-400 font-medium mb-1.5 block">热力图范围（分钟）</label>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                min={0}
                                                value={category.heatmapMin ?? ''}
                                                onChange={(e) => setCategory({ ...category, heatmapMin: parseInt(e.target.value) || undefined })}
                                                placeholder="最小值：0"
                                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                min={0}
                                                value={category.heatmapMax ?? ''}
                                                onChange={(e) => setCategory({ ...category, heatmapMax: parseInt(e.target.value) || undefined })}
                                                placeholder="最大值：240"
                                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Focus Score */}
                                <div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-stone-400 font-medium">启用专注评分</label>
                                        <button
                                            onClick={() => setCategory({ ...category, enableFocusScore: !category.enableFocusScore })}
                                            className={`w-12 h-6 rounded-full p-1 transition-colors ${category.enableFocusScore ? 'bg-stone-900' : 'bg-stone-200'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${category.enableFocusScore ? 'translate-x-6' : ''}`} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-stone-400 mt-1.5">
                                        开启后，此分类下的活动默认记录专注评分（1-5）。
                                    </p>
                                </div>

                                {/* Mood Score */}
                                <div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-stone-400 font-medium">启用情绪评分</label>
                                        <button
                                            onClick={() => setCategory({ ...category, enableMoodScore: !category.enableMoodScore })}
                                            className={`w-12 h-6 rounded-full p-1 transition-colors ${category.enableMoodScore ? 'bg-stone-900' : 'bg-stone-200'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${category.enableMoodScore ? 'translate-x-6' : ''}`} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-stone-400 mt-1.5">
                                        开启后，此分类下的活动默认记录情绪评分（1-5）。
                                    </p>
                                </div>
                                
                                {/* UI Icon Selector - 仅在启用自定义主题时显示 */}
                                {isCustomThemeEnabled && (
                                    <div>
                                        <label className="text-xs text-stone-400 font-medium mb-2 block">
                                            UI 图标
                                            <span className="text-stone-300 ml-1">(可选)</span>
                                        </label>
                                        <UIIconSelector
                                            currentIcon={category.icon}
                                            currentUiIcon={category.uiIcon}
                                            onSelectDual={(emoji, uiIcon) => {
                                                // 只更新 uiIcon 字段，不修改 icon（emoji）
                                                setCategory(prev => ({ ...prev, uiIcon }));
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <NoteTemplateManager
                            templates={category.noteTemplates}
                            onChange={(noteTemplates) => setCategory({ ...category, noteTemplates })}
                        />

                        <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">活动</h3>
                            <div className="space-y-2">
                                {category.activities.map(act => (
                                    <div key={act.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                                        <IconRenderer icon={act.icon} className="text-xl" />
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
                        enableMoodScore={category.enableMoodScore ?? false}
                        renderLogMetadata={(log, { collectionNames }) => {
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

                                    {collectionNames.map((collectionName) => (
                                        <span key={`${log.id}-collection-${collectionName}`} className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                            <span className="text-stone-400 font-bold">◬</span>
                                            <span className="line-clamp-1">{collectionName}</span>
                                        </span>
                                    ))}

                                    {/* Category Tag */}
                                    <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                        <span className="font-bold text-stone-400">#</span>
                                        <IconRenderer icon={category?.icon || ''} className="text-xs" />
                                        <span className="flex items-center">
                                            <span>{category?.name}</span>
                                            <span className="mx-1 text-stone-300">/</span>
                                            <IconRenderer icon={activity?.icon || ''} className="text-xs mr-1" />
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
                                                    <IconRenderer icon={linkedScope.icon || '📍'} className="text-xs" />
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
                    {category.icon && <IconRenderer 
                        icon={category.icon} 
                        uiIcon={category.uiIcon}
                        size={17}
                        className="text-2xl" 
                    />}
                    {category.name}
                </h1>
                <span className="text-stone-400 text-sm font-medium ml-1 mt-1 block">分类</span>
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
