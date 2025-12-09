import React, { useMemo, useState, useRef } from 'react';
import { Log, Activity, TodoItem, Category, TodoCategory, Scope } from '../types';
import { CATEGORIES } from '../constants';
import { Plus, MoreHorizontal, BarChart2, ArrowUp, ArrowDown, Sparkles, RefreshCw, Zap, Share } from 'lucide-react';
import { CalendarWidget } from '../components/CalendarWidget';
import { AIBatchModal } from '../components/AIBatchModal';
import { ParsedTimeEntry } from '../services/aiService';
import { ToastType } from '../components/Toast';

interface TimelineViewProps {
    logs: Log[];
    todos: TodoItem[];
    scopes: Scope[];
    onAddLog: (startTime?: number, endTime?: number) => void;
    onEditLog: (log: Log) => void;
    categories: Category[];
    currentDate: Date;
    onDateChange: (date: Date) => void;
    onShowStats: () => void;
    onBatchAddLogs: (entries: ParsedTimeEntry[]) => void;
    onSync?: (e: React.MouseEvent) => void;
    isSyncing?: boolean;
    todoCategories: TodoCategory[];
    onToast?: (type: ToastType, message: string) => void;
    startWeekOnSunday?: boolean;
    autoLinkRules?: any[]; // AutoLinkRule[]
}

interface TimelineItem {
    type: 'log' | 'gap';
    id: string;
    startTime: number;
    endTime: number;
    duration: number;
    logData?: Log & {
        activity?: Activity;
        categoryName?: string;
        categoryIcon?: string;
        categoryColor?: string;
        linkedTodoTitle?: string;
        linkedTodo?: TodoItem; // 完整的待办对象
        linkedScopeData?: { icon: string; name: string }[]; // Changed to array
    };
}

export const TimelineView: React.FC<TimelineViewProps> = ({ logs, todos, scopes, onAddLog, onEditLog, categories, currentDate, onDateChange, onShowStats, onBatchAddLogs, onSync, isSyncing, todoCategories, onToast, startWeekOnSunday = false, autoLinkRules = [] }) => {
    const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // --- Date Helpers ---
    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const isToday = (d: Date) => {
        return isSameDay(d, new Date());
    };

    const weekDaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Helper to generate calendar grid for current month
    const getMonthDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days = [];
        // Pad start
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null);
        }
        // Days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    // Helper to get simple week row
    const getWeekDays = () => {
        const days = [];
        // Always center around current selected date (7 days: -3 to +3)
        for (let i = -3; i <= 3; i++) {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const switchMonth = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        onDateChange(newDate);
    };

    // --- Timeline Logic ---
    const dayTimeline = useMemo(() => {
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Filter logs for this day
        const dayLogs = logs.filter(log => {
            return log.startTime < endOfDay.getTime() && log.endTime > startOfDay.getTime();
        }).sort((a, b) => sortOrder === 'asc' ? a.startTime - b.startTime : b.startTime - a.startTime);

        const items: TimelineItem[] = [];

        for (let i = 0; i < dayLogs.length; i++) {
            const currentLog = dayLogs[i];
            const category = categories.find(c => c.id === currentLog.categoryId);
            const activity = category?.activities.find(a => a.id === currentLog.activityId);
            const linkedTodo = todos.find(t => t.id === currentLog.linkedTodoId);
            const linkedScopes = currentLog.scopeIds
                ? currentLog.scopeIds.map(id => scopes.find(s => s.id === id)).filter(Boolean) as Scope[]
                : [];

            const displayStart = Math.max(currentLog.startTime, startOfDay.getTime());
            const displayEnd = Math.min(currentLog.endTime, endOfDay.getTime());
            const displayDuration = (displayEnd - displayStart) / 1000;

            items.push({
                type: 'log',
                id: currentLog.id,
                startTime: displayStart,
                endTime: displayEnd,
                duration: displayDuration,
                logData: {
                    ...currentLog,
                    activity,
                    categoryName: category?.name,
                    categoryIcon: category?.icon,
                    categoryColor: category?.themeColor,
                    linkedTodoTitle: linkedTodo?.title,
                    linkedTodo: linkedTodo, // 传递完整的待办对象
                    linkedScopeData: linkedScopes.length > 0
                        ? linkedScopes.map(s => ({ icon: s.icon || '📍', name: s.name }))
                        : undefined
                }
            });

            // Gap to next log (Only in ascending mode does gap logic make sense easily)
            // In descending mode, gaps are between prev end and current start? 
            // Let's simplified: Disable gaps in descending mode for now or adjust logic.
            // Or just iterate and check difference.
            // If desc, dayLogs[i] is LATER than dayLogs[i+1].
            // Gap is between dayLogs[i+1].endTime and dayLogs[i].startTime.
            if (sortOrder === 'asc' && i < dayLogs.length - 1) {
                const nextLog = dayLogs[i + 1];
                const gapDuration = (nextLog.startTime - currentLog.endTime) / 1000;

                if (gapDuration > 60) {
                    items.push({
                        type: 'gap',
                        id: `gap-${currentLog.id}`,
                        startTime: currentLog.endTime,
                        endTime: nextLog.startTime,
                        duration: gapDuration
                    });
                }
            } else if (sortOrder === 'desc' && i < dayLogs.length - 1) {
                const nextLog = dayLogs[i + 1];
                // In desc, 'currentLog' is Later (e.g. 15:00), 'nextLog' is Earlier (e.g. 13:00)
                // Gap is from nextLog.endTime UP TO currentLog.startTime
                const gapDuration = (currentLog.startTime - nextLog.endTime) / 1000;

                if (gapDuration > 60) {
                    items.push({
                        type: 'gap',
                        id: `gap-${currentLog.id}`,
                        startTime: nextLog.endTime,
                        endTime: currentLog.startTime,
                        duration: gapDuration
                    });
                }
            }
        }
        return items;
    }, [logs, currentDate, todos, categories, sortOrder]);

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    const formatDurationCompact = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    // Helper to check if a day has logs
    const hasLogs = (date: Date) => {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        return logs.some(log => log.startTime >= start.getTime() && log.startTime <= end.getTime());
    };

    const handleExport = () => {
        // 1. Filter Logs
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);

        const dayLogs = logs.filter(log => {
            return log.startTime >= startOfDay.getTime() && log.endTime <= endOfDay.getTime();
        }).sort((a, b) => a.startTime - b.startTime);

        if (dayLogs.length === 0) {
            onToast?.('info', '今日无无记录可导出');
            return;
        }

        // 2. Stats
        const totalDuration = dayLogs.reduce((acc, l) => acc + l.duration, 0);
        const totalH = Math.floor(totalDuration / 3600);
        const totalM = Math.floor((totalDuration % 3600) / 60);

        const focusLogs = dayLogs.filter(l => l.focusScore !== undefined);
        const avgFocus = focusLogs.length > 0
            ? (focusLogs.reduce((acc, l) => acc + (l.focusScore || 0), 0) / focusLogs.length).toFixed(1)
            : 'N/A';

        // 3. Header
        const dateStr = currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
        const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekStr = weekMap[currentDate.getDay()];

        let text = `## 📅 ${dateStr} ${weekStr}时间记录\n`;
        text += `**总记录时长**: ${totalH}h ${totalM}m | **平均专注度**: ${avgFocus}\n\n`;

        // 4. Entries
        dayLogs.forEach(log => {
            const start = new Date(log.startTime);
            const end = new Date(log.endTime);
            const sTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
            const eTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
            const mins = Math.round(log.duration / 60);

            const cat = categories.find(c => c.id === log.categoryId);
            const act = cat?.activities.find(a => a.id === log.activityId);
            const todo = todos.find(t => t.id === log.linkedTodoId);
            const scopes_list = log.scopeIds?.map(id => scopes.find(s => s.id === id)).filter(Boolean) || [];

            const content = log.note ? ` ${log.note}` : '';
            text += `- ${sTime} - ${eTime} (${mins}m) **[${cat?.name || '未知'}/${act?.name || '未知'}]**${content}`;

            if (log.focusScore) text += ` ⚡️${log.focusScore}`;
            if (todo) text += ` @${todo.title}`;
            // 只有进度待办才显示进度增量和进度比例
            if (todo?.isProgress) {
                if (log.progressIncrement && log.progressIncrement > 0) text += ` +${log.progressIncrement}`;
                text += `（${(todo.completedUnits || 0)}/${todo.totalAmount}）`;
            }
            if (scopes_list.length > 0) text += ` %${scopes_list.map(s => s.name).join(', ')}`;
            text += '\n';
        });

        navigator.clipboard.writeText(text).then(() => {
            onToast?.('success', '已复制到剪贴板');
        }).catch(() => {
            onToast?.('error', '复制失败');
        });
    };

    return (
        <div className="h-full bg-[#faf9f6] flex flex-col relative text-stone-900">

            {/* Header & Calendar Container */}
            <div className="flex flex-col shrink-0">

                <CalendarWidget
                    currentDate={currentDate}
                    onDateChange={onDateChange}
                    logs={logs}
                    isExpanded={isCalendarExpanded}
                    onExpandToggle={() => setIsCalendarExpanded(!isCalendarExpanded)}
                    startWeekOnSunday={startWeekOnSunday}
                    extraHeaderControls={
                        <div className="flex items-center gap-1">
                            {onSync && (
                                <button
                                    onClick={onSync}
                                    disabled={isSyncing}
                                    className={`p-2 text-stone-400 hover:text-stone-600 rounded-full transition-all active:scale-95 ${isSyncing ? 'animate-spin text-purple-500' : ''}`}
                                    title="Sync from Cloud"
                                >
                                    <RefreshCw size={20} />
                                </button>
                            )}
                            <div className="w-[1px] h-4 bg-stone-200 mx-1" />
                            <button
                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                                title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
                            >
                                {sortOrder === 'asc' ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
                            </button>
                            <button
                                onClick={onShowStats}
                                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                                title="View Statistics"
                            >
                                <BarChart2 size={20} />
                            </button>
                        </div>
                    }
                />


            </div>

            {/* Timeline List */}
            <div className="flex-1 overflow-y-auto px-7 py-6 pb-24 no-scrollbar">
                <div className="relative border-l border-stone-300 ml-[70px] space-y-6">

                    {dayTimeline.map((item) => {
                        if (item.type === 'log' && item.logData) {
                            return (
                                <div key={item.id} className="relative pl-8 animate-in slide-in-from-bottom-2 duration-500">
                                    {/* Time Marker */}
                                    <div className="absolute -left-[60px] top-0 w-[45px] text-right flex flex-col items-end">
                                        <span className="text-sm font-bold text-stone-800 leading-none font-mono">
                                            {formatTime(item.startTime)}
                                        </span>
                                        <span className="text-[10px] font-medium text-stone-400 mt-1">
                                            {formatDurationCompact(item.duration)}
                                        </span>
                                    </div>

                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-stone-900 border-2 border-[#faf9f6] z-10" />

                                    {/* Content Item */}
                                    <div
                                        onClick={() => onEditLog(item.logData!)}
                                        className="cursor-pointer active:opacity-70 transition-opacity"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-bold text-stone-900 leading-tight">
                                                {item.logData.activity?.name}
                                            </h3>
                                            {item.logData.focusScore && (
                                                <span className="text-sm font-bold text-stone-400 font-mono flex items-center gap-0.5">
                                                    <Zap size={12} fill="currentColor" />
                                                    {item.logData.focusScore}
                                                </span>
                                            )}
                                        </div>

                                        {item.logData.note && (
                                            <p className="text-sm text-stone-500 leading-relaxed mb-2 font-light">
                                                {item.logData.note}
                                            </p>
                                        )}

                                        {/* Tags Row: Linked Todo (@) and Category (#) */}
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            {/* Linked Todo */}
                                            {item.logData.linkedTodoTitle && (
                                                <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                                    <span className="text-stone-400 font-bold">@</span>
                                                    <span className="line-clamp-1">{item.logData.linkedTodoTitle}</span>
                                                    {/* 只有进度待办且有进度增量时才显示 */}
                                                    {item.logData.linkedTodo?.isProgress && item.logData.progressIncrement && item.logData.progressIncrement > 0 && (
                                                        <span className="font-mono text-stone-400 ml-0.5">+{item.logData.progressIncrement}</span>
                                                    )}
                                                </span>
                                            )}

                                            {/* Category Tag */}
                                            <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                                <span style={{ color: item.logData.categoryColor }} className="font-bold">#</span>
                                                <span>{item.logData.categoryIcon}</span>
                                                <span className="flex items-center">
                                                    <span>{item.logData.categoryName}</span>
                                                    <span className="mx-1 text-stone-300">/</span>
                                                    <span className="mr-1">{item.logData.activity?.icon}</span>
                                                    <span className="text-stone-500">{item.logData.activity?.name}</span>
                                                </span>
                                            </span>

                                            {/* Scope Tags */}
                                            {item.logData.linkedScopeData && item.logData.linkedScopeData.length > 0 && (
                                                <>
                                                    {item.logData.linkedScopeData.map((scopeData, idx) => (
                                                        <span key={idx} className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                                            <span className="text-stone-400 font-bold">%</span>
                                                            <span>{scopeData.icon}</span>
                                                            <span>{scopeData.name}</span>
                                                        </span>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        } else {
                            // Gap Item
                            return (
                                <div key={item.id} className="relative pl-8 py-2" onClick={() => onAddLog(item.startTime, item.endTime)}>
                                    <div className="absolute -left-[60px] top-1/2 -translate-y-1/2 w-[45px] text-right">
                                        <span className="text-[10px] font-mono text-stone-300">{formatDurationCompact(item.duration)}</span>
                                    </div>

                                    <div className="absolute left-0 top-0 bottom-0 w-[1px] -ml-[0.5px] border-l border-dashed border-stone-300" />

                                    {/* Visible Gap Button (No Hover needed) */}
                                    <button className="flex items-center gap-2 px-3 py-1 rounded-full border border-dashed border-stone-300 bg-white shadow-sm active:scale-95 transition-all">
                                        <Plus size={10} className="text-stone-400" />
                                        <span className="text-xs font-medium text-stone-400">
                                            Idle Time
                                        </span>
                                    </button>
                                </div>
                            );
                        }
                    })}

                    {/* End of Line Dot */}
                    <div className="absolute -left-[3px] bottom-0 w-1.5 h-1.5 rounded-full bg-stone-300" />
                </div>

                {/* Export/Share Button at the bottom */}
                {dayTimeline.length > 0 && (
                    <div className="mt-8">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors text-xs font-medium"
                        >
                            <Share size={14} />
                            <span>导出日报</span>
                        </button>
                    </div>
                )}

                {dayTimeline.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-60">
                        <div className="w-16 h-16 border border-stone-200 rounded-full flex items-center justify-center text-stone-300 mb-4">
                            <MoreHorizontal size={32} />
                        </div>
                        <p className="text-stone-400 font-serif italic">Silence is golden.</p>
                        <button
                            onClick={() => onAddLog()}
                            className="mt-6 px-8 py-3 bg-stone-900 text-white rounded-full text-sm font-bold active:scale-95 transition-transform"
                        >
                            Record Activity
                        </button>
                    </div>
                )}
            </div>

            {/* Floating AI Button (Above Add) */}
            <button
                onClick={() => setIsAIModalOpen(true)}
                className="fixed bottom-40 right-6 w-12 h-12 bg-white text-purple-600 rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-transform z-40 border border-purple-100"
                title="AI Magic Backfill"
            >
                <Sparkles size={20} />
            </button>

            {/* Floating Add Button */}
            <button
                onClick={() => onAddLog()}
                className="fixed bottom-24 right-6 w-14 h-14 bg-stone-900 rounded-full text-white shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40 border border-stone-800"
            >
                <Plus size={24} strokeWidth={1.5} />
            </button>
            {isAIModalOpen && (
                <AIBatchModal
                    onClose={() => setIsAIModalOpen(false)}
                    onSave={onBatchAddLogs}
                    categories={categories}
                    targetDate={currentDate}
                    autoLinkRules={autoLinkRules}
                    scopes={scopes}
                />
            )}
        </div>
    );
};