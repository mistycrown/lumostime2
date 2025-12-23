/**
 * @file TimelineView.tsx
 * @input Logs, Categories, Todos, Scopes, Reviews (Daily/Weekly/Monthly)
 * @output Log CRUD, Date Navigation, Sync Trigger, Review Navigation
 * @pos View (Main Tab)
 * @description The primary daily view. Visualizes time usage on a timeline, supports adding/editing logs, gap detection, and integrates Daily/Weekly/Monthly review entry points.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useMemo, useState, useRef } from 'react';
import { Log, Activity, TodoItem, Category, TodoCategory, Scope, DailyReview, ReviewTemplate, WeeklyReview, MonthlyReview, AutoLinkRule } from '../types';
import { CATEGORIES } from '../constants';
import * as LucideIcons from 'lucide-react';
import { Plus, MoreHorizontal, BarChart2, ArrowUp, ArrowDown, Sparkles, RefreshCw, Zap, Share, Timer, Clock } from 'lucide-react';
import { CalendarWidget } from '../components/CalendarWidget';
import { AIBatchModal } from '../components/AIBatchModal';
import { ParsedTimeEntry } from '../services/aiService';
import { ToastType } from '../components/Toast';

// Helper to render dynamic icon
const DynamicIcon: React.FC<{ name: string; size?: number; className?: string }> = ({ name, size = 16, className }) => {
    // Correctly accessing the icon from the namespace import
    // Need to capitalize first letter because Lucide exports are PascalCase (e.g. 'star' -> 'Star')
    // But user might input 'book' or 'Book'. Let's try direct access then PascalCase.
    const PascalName = name.charAt(0).toUpperCase() + name.slice(1);
    const IconComponent = (LucideIcons as any)[name] || (LucideIcons as any)[PascalName] || LucideIcons.Star;

    return <IconComponent size={size} className={className} />;
};

interface TimelineViewProps {
    logs: Log[];
    categories: Category[];
    onAddLog: (startTime?: number, endTime?: number) => void;
    onEditLog: (log: Log) => void;
    currentDate: Date;
    onDateChange: (date: Date) => void;
    onShowStats: () => void;
    onBatchAddLogs: (entries: ParsedTimeEntry[]) => void;
    onSync: (e: any) => void;
    isSyncing: boolean;
    todos: TodoItem[];
    todoCategories: TodoCategory[];
    onToast: (type: ToastType, message: string) => void;
    startWeekOnSunday?: boolean;
    autoLinkRules: AutoLinkRule[];
    scopes: Scope[];
    minIdleTimeThreshold?: number;
    onQuickPunch?: () => void;
    // Daily Review
    dailyReview?: DailyReview;
    onOpenDailyReview?: () => void;
    templates: ReviewTemplate[];
    dailyReviewTime?: string;
    // Weekly Review
    weeklyReviews?: WeeklyReview[];
    onOpenWeeklyReview?: (weekStart: Date, weekEnd: Date) => void;
    weeklyReviewTime?: string;
    // Monthly Review
    monthlyReviews?: MonthlyReview[];
    onOpenMonthlyReview?: (monthStart: Date, monthEnd: Date) => void;
    monthlyReviewTime?: string;
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

export const TimelineView: React.FC<TimelineViewProps> = ({ logs, todos, scopes, onAddLog, onEditLog, categories, currentDate, onDateChange, onShowStats, onBatchAddLogs, onSync, isSyncing, todoCategories, onToast, startWeekOnSunday = false, autoLinkRules = [], minIdleTimeThreshold = 1, onQuickPunch, dailyReview, onOpenDailyReview, templates = [], dailyReviewTime = '22:00', weeklyReviews = [], onOpenWeeklyReview, weeklyReviewTime = '0-2200', monthlyReviews = [], onOpenMonthlyReview, monthlyReviewTime = '0-2200' }) => {
    const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
        const saved = localStorage.getItem('lumos_timeline_sort');
        return (saved === 'asc' || saved === 'desc') ? saved : 'asc';
    });

    React.useEffect(() => {
        localStorage.setItem('lumos_timeline_sort', sortOrder);
    }, [sortOrder]);

    const [isAIModalOpen, setIsAIModalOpen] = useState(false);

    // 计算当前日期所在周的范围和周报相关数据
    const weeklyReviewData = useMemo(() => {
        // 使用本地时间获取年月日，避免UTC转换导致的时区偏差
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth() + 1;
        const d = currentDate.getDate();
        // 构造中午12点的时间以避免夏令时/时区边界问题
        const current = new Date(y, m - 1, d, 12, 0, 0, 0);

        // 计算周的开始和结束日期
        const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
        let weekStart: Date, weekEnd: Date;

        // 创建日期的深拷贝并重置为该日中午
        const makeDate = (base: Date, offsetDays: number) => {
            const date = new Date(base.getTime());
            date.setDate(base.getDate() + offsetDays);
            return date;
        };

        if (startWeekOnSunday) {
            // 周日作为一周的开始 (0-6: 周日到周六)
            const daysFromSunday = dayOfWeek;
            weekStart = makeDate(current, -daysFromSunday);
            weekEnd = makeDate(weekStart, 6); // 周六是最后一天
        } else {
            // 周一作为一周的开始 (1-0: 周一到周日)
            const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            weekStart = makeDate(current, -daysFromMonday);
            weekEnd = makeDate(weekStart, 6); // 周日是最后一天
        }

        // 检查当前日期是否是该周的最后一天
        // 比较日期字符串而非时间戳，避免小时数差异
        const currentStr = current.getFullYear() + '-' + (current.getMonth() + 1).toString().padStart(2, '0') + '-' + current.getDate().toString().padStart(2, '0');
        const weekEndStrFormatted = weekEnd.getFullYear() + '-' + (weekEnd.getMonth() + 1).toString().padStart(2, '0') + '-' + weekEnd.getDate().toString().padStart(2, '0');
        const isLastDayOfWeek = currentStr === weekEndStrFormatted;

        // 查找该周的周报
        const weekStartStr = weekStart.getFullYear() + '-' + (weekStart.getMonth() + 1).toString().padStart(2, '0') + '-' + weekStart.getDate().toString().padStart(2, '0');
        const weeklyReview = weeklyReviews?.find(r =>
            r.weekStartDate === weekStartStr && r.weekEndDate === weekEndStrFormatted
        );

        // 判断是否应该显示周报入口
        let shouldShow = false;
        if (onOpenWeeklyReview && isLastDayOfWeek) {
            // 如果已经有周报，总是显示
            if (weeklyReview) {
                shouldShow = true;
            } else {
                // 如果是今天，检查是否到达设定时间
                const now = new Date();
                const nowStr = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0') + '-' + now.getDate().toString().padStart(2, '0');
                const isToday = currentStr === nowStr;

                if (isToday) {
                    // 解析weeklyReviewTime (格式: "0-2200"，0表示最后一天，2200是时间)
                    const timeStr = (weeklyReviewTime || '0-2200').split('-')[1] || '2200';
                    const targetHour = parseInt(timeStr.substring(0, 2));
                    const targetMinute = parseInt(timeStr.substring(2, 4));

                    const currentHour = now.getHours();
                    const currentMinute = now.getMinutes();

                    // 检查是否到达设定的时间
                    if (currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute)) {
                        shouldShow = true;
                    }
                } else {
                    // 历史日期，总是显示
                    shouldShow = true;
                }
            }
        }

        return {
            weekStart,
            weekEnd,
            weeklyReview,
            shouldShow,
            isLastDayOfWeek
        };
    }, [currentDate, startWeekOnSunday, weeklyReviews, onOpenWeeklyReview, weeklyReviewTime]);

    // 计算当前日期所在月的范围和月报相关数据
    const monthlyReviewData = useMemo(() => {
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();

        // 月的开始和结束日期
        const monthStart = new Date(currentYear, currentMonth, 1);
        const monthEnd = new Date(currentYear, currentMonth + 1, 0); // 下个月第0天即本月最后一天

        // 格式化日期字符串以避免时区问题 (使用本地时间)
        const currentStr = currentDate.getFullYear() + '-' + (currentDate.getMonth() + 1).toString().padStart(2, '0') + '-' + currentDate.getDate().toString().padStart(2, '0');
        const monthEndStrFormatted = monthEnd.getFullYear() + '-' + (monthEnd.getMonth() + 1).toString().padStart(2, '0') + '-' + monthEnd.getDate().toString().padStart(2, '0');

        // 检查当前日期是否是该月的最后一天
        const isLastDayOfMonth = currentStr === monthEndStrFormatted;

        // 查找该月的月报
        const monthStartStr = monthStart.getFullYear() + '-' + (monthStart.getMonth() + 1).toString().padStart(2, '0') + '-' + monthStart.getDate().toString().padStart(2, '0');
        const monthlyReview = monthlyReviews?.find(r =>
            r.monthStartDate === monthStartStr && r.monthEndDate === monthEndStrFormatted
        );

        // 判断是否应该显示月报入口
        let shouldShow = false;
        if (onOpenMonthlyReview && isLastDayOfMonth) {
            // 如果已经有月报，总是显示
            if (monthlyReview) {
                shouldShow = true;
            } else {
                // 如果是今天，检查是否到达设定时间
                const now = new Date();
                const nowStr = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0') + '-' + now.getDate().toString().padStart(2, '0');
                const isToday = currentStr === nowStr;

                if (isToday) {
                    // 解析monthlyReviewTime (格式: "0-2200"，0表示最后一天，2200是时间)
                    const timeStr = (monthlyReviewTime || '0-2200').split('-')[1] || '2200';
                    const targetHour = parseInt(timeStr.substring(0, 2));
                    const targetMinute = parseInt(timeStr.substring(2, 4));

                    const currentHour = now.getHours();
                    const currentMinute = now.getMinutes();

                    // 检查是否到达设定的时间
                    if (currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute)) {
                        shouldShow = true;
                    }
                } else {
                    // 历史日期，总是显示
                    shouldShow = true;
                }
            }
        }

        return {
            monthStart,
            monthEnd,
            monthlyReview,
            shouldShow,
            isLastDayOfMonth
        };
    }, [currentDate, monthlyReviews, onOpenMonthlyReview, monthlyReviewTime]);

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
                    categoryName: category?.name || (currentLog.categoryId === 'uncategorized' ? '未分类' : 'Unknown'),
                    categoryIcon: category?.icon || (currentLog.categoryId === 'uncategorized' ? '⏱️' : '?'),
                    categoryColor: category?.themeColor || '#a8a29e', // Stone-400 fallback
                    linkedTodoTitle: linkedTodo?.title,
                    linkedTodo: linkedTodo, // 传递完整的待办对象
                    linkedScopeData: linkedScopes.length > 0
                        ? linkedScopes.map(s => ({ icon: s.icon || '📍', name: s.name }))
                        : undefined
                }
            });

            // Gap to next log
            // Use minIdleTimeThreshold * 60 seconds. Default if undefined is 60s.
            const thresholdSeconds = (minIdleTimeThreshold || 1) * 60;

            if (sortOrder === 'asc' && i < dayLogs.length - 1) {
                const nextLog = dayLogs[i + 1];
                const gapDuration = (nextLog.startTime - currentLog.endTime) / 1000;

                if (gapDuration > thresholdSeconds) {
                    items.push({
                        type: 'gap',
                        id: `gap - ${currentLog.id} `,
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

                if (gapDuration > thresholdSeconds) {
                    items.push({
                        type: 'gap',
                        id: `gap - ${currentLog.id} `,
                        startTime: nextLog.endTime,
                        endTime: currentLog.startTime,
                        duration: gapDuration
                    });
                }
            }
        }
        return items;
    }, [logs, currentDate, todos, categories, sortOrder]);

    const shouldShowReviewNode = useMemo(() => {
        // 1. If daily review exists, always show
        if (dailyReview) return true;

        // 2. Base requirement: Must rely on onOpenDailyReview handler
        if (!onOpenDailyReview) return false;

        // 3. Base requirement: Must have timeline items (per existing logic)
        if (dayTimeline.length === 0) return false;

        // 4. If NOT Today (History), always show (if it meets above reqs)
        if (!isToday(currentDate)) return true;

        // 5. If Today, check time
        let targetHour = 22;
        let targetMinute = 0;
        const timeStr = dailyReviewTime || '22:00';

        if (timeStr.includes(':')) {
            const parts = timeStr.split(':').map(Number);
            targetHour = parts[0];
            targetMinute = parts[1];
        } else if (timeStr.length === 4) {
            targetHour = parseInt(timeStr.substring(0, 2));
            targetMinute = parseInt(timeStr.substring(2, 4));
        }

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        return (currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute));
    }, [dailyReview, onOpenDailyReview, dayTimeline.length, currentDate, dailyReviewTime]);

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} `;
    };

    const formatDurationCompact = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m} m`;
        return `${m} m`;
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

        let text = `## 📅 ${dateStr} ${weekStr} 时间记录\n`;
        text += `** 总记录时长 **: ${totalH}h ${totalM} m | ** 平均专注度 **: ${avgFocus} \n\n`;

        // 4. Entries
        dayLogs.forEach(log => {
            const start = new Date(log.startTime);
            const end = new Date(log.endTime);
            const sTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')} `;
            const eTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')} `;
            const mins = Math.round(log.duration / 60);

            const cat = categories.find(c => c.id === log.categoryId);
            const act = cat?.activities.find(a => a.id === log.activityId);
            const todo = todos.find(t => t.id === log.linkedTodoId);
            const scopes_list = log.scopeIds?.map(id => scopes.find(s => s.id === id)).filter(Boolean) || [];

            const content = log.note ? ` ${log.note} ` : '';
            text += `- ${sTime} - ${eTime} (${mins}m) ** [${cat?.name || '未知'}/${act?.name || '未知'}] ** ${content} `;

            if (log.focusScore && log.focusScore > 0) text += ` ⚡️${log.focusScore} `;
            if (todo) text += ` @${todo.title} `;
            // 只有进度待办才显示进度增量和进度比例
            if (todo?.isProgress) {
                if (log.progressIncrement && log.progressIncrement > 0) text += ` + ${log.progressIncrement} `;
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
                                            <h3 className={`text-lg font-bold leading-tight ${!item.logData.activity ? 'text-stone-500 italic' : 'text-stone-900'}`}>
                                                {item.logData.activity?.name || item.logData.title || "未命名记录"}
                                            </h3>
                                            {item.logData.focusScore && item.logData.focusScore > 0 && (
                                                <span className="text-sm font-bold text-stone-400 font-mono flex items-center gap-0.5">
                                                    <Zap size={12} fill="currentColor" />
                                                    {item.logData.focusScore}
                                                </span>
                                            )}
                                        </div>

                                        {item.logData.note && (
                                            <p className="text-sm text-stone-500 leading-relaxed mb-2 font-light whitespace-pre-wrap">
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

                    {/* Review Section - Merged into Timeline */}
                    {shouldShowReviewNode && (
                        <>
                            {/* Review Entry Button as a Node */}
                            {onOpenDailyReview && (
                                <div className="relative pl-8 mt-6 animate-in slide-in-from-bottom-2 duration-500">
                                    {/* Time Marker */}
                                    <div className="absolute -left-[60px] top-0.5 w-[45px] text-right">
                                        <span className="text-xs font-bold text-stone-400 font-mono">Review</span>
                                    </div>

                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[5px] top-3 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-[#faf9f6] z-10" />

                                    {/* Content: Simple Text Button */}
                                    <button
                                        onClick={onOpenDailyReview}
                                        className="text-left hover:text-amber-600 transition-colors group"
                                    >
                                        <h3 className="font-bold text-stone-900 text-lg group-hover:text-amber-600 transition-colors">
                                            {dailyReview ? '今日回顾' : '准备好开始回顾了吗？'}
                                        </h3>
                                    </button>
                                </div>
                            )}

                            {/* Synced Template Content (Daily) - Using Snapshot */}
                            {dailyReview?.templateSnapshot?.filter(t => t.syncToTimeline).map((template) => {
                                // Check if template has answers
                                const hasAnswers = template.questions.some(q =>
                                    dailyReview.answers?.some(a => a.questionId === q.id && a.answer) || (q.type === 'rating' && dailyReview.answers?.some(a => a.questionId === q.id))
                                );

                                if (!hasAnswers) return null;

                                return (
                                    <div key={template.id} className="relative pl-8 mt-6 animate-in slide-in-from-bottom-2 duration-500">
                                        {/* Time Marker - Template Title */}
                                        <div className="absolute -left-[60px] top-0.5 w-[45px] text-right flex flex-col items-end">
                                            <span className="text-xs font-bold text-stone-500 leading-tight">
                                                {template.title.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u, '')}
                                            </span>
                                        </div>

                                        {/* Timeline Dot */}
                                        <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-stone-300 border-2 border-[#faf9f6] z-10" />

                                        {/* Content Wrapper */}
                                        <div className="space-y-4">
                                            {/* Questions List */}
                                            <div className="space-y-3" style={{ paddingTop: '2px' }}>
                                                {template.questions.map(q => {
                                                    const answer = dailyReview.answers?.find(a => a.questionId === q.id);
                                                    if (!answer || (q.type !== 'rating' && !answer.answer)) return null;

                                                    return (
                                                        <div key={q.id} className="group">
                                                            <div className="mb-1.5 flex items-start gap-2">
                                                                <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-stone-300 shrink-0"></div>
                                                                <h4 className="text-sm font-normal text-stone-600 leading-snug flex-1">
                                                                    {q.question}
                                                                </h4>
                                                            </div>

                                                            {q.type === 'rating' ? (
                                                                <div className="flex items-center gap-1" style={{ marginLeft: '14px' }}>
                                                                    {Array.from({ length: parseInt(typeof answer.answer === 'string' ? answer.answer : String(answer.answer)) || 0 }).map((_, i) => (
                                                                        <span key={i} className={q.colorId ? `text-${q.colorId}-500` : "text-amber-500"}>
                                                                            <DynamicIcon name={q.icon || 'star'} size={18} />
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-sm text-stone-500 leading-relaxed font-light whitespace-pre-wrap" style={{ marginLeft: '14px' }}>
                                                                    {answer.answer}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Weekly Review Node */}
                            {weeklyReviewData.shouldShow && (
                                <>
                                    <div className="relative pl-8 mt-6 animate-in slide-in-from-bottom-2 duration-500">
                                        {/* Time Marker */}
                                        <div className="absolute -left-[60px] top-0.5 w-[45px] text-right">
                                            <span className="text-xs font-bold text-purple-400 font-mono">Week</span>
                                        </div>

                                        {/* Timeline Dot */}
                                        <div className="absolute -left-[5px] top-3 w-2.5 h-2.5 rounded-full bg-purple-400 border-2 border-[#faf9f6] z-10" />

                                        {/* Content: Simple Text Button */}
                                        <button
                                            onClick={() => onOpenWeeklyReview?.(weeklyReviewData.weekStart, weeklyReviewData.weekEnd)}
                                            className="text-left hover:text-purple-600 transition-colors group"
                                        >
                                            <h3 className="font-bold text-stone-900 text-lg group-hover:text-purple-600 transition-colors">
                                                {weeklyReviewData.weeklyReview ? '本周小结' : '为本周作个小结吧！'}
                                            </h3>
                                        </button>
                                    </div>

                                    {/* Synced Template Content (Weekly) - Using Snapshot */}
                                    {weeklyReviewData.weeklyReview?.templateSnapshot?.filter(t => t.syncToTimeline).map((template) => {
                                        const hasAnswers = template.questions.some(q =>
                                            weeklyReviewData.weeklyReview!.answers?.some(a => a.questionId === q.id && a.answer) || (q.type === 'rating' && weeklyReviewData.weeklyReview!.answers?.some(a => a.questionId === q.id))
                                        );

                                        if (!hasAnswers) return null;

                                        return (
                                            <div key={template.id} className="relative pl-8 mt-6 animate-in slide-in-from-bottom-2 duration-500">
                                                {/* Time Marker - Template Title */}
                                                <div className="absolute -left-[60px] top-0.5 w-[45px] text-right flex flex-col items-end">
                                                    <span className="text-xs font-bold text-stone-500 leading-tight">
                                                        {template.title.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u, '')}
                                                    </span>
                                                </div>

                                                {/* Timeline Dot */}
                                                <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-stone-300 border-2 border-[#faf9f6] z-10" />

                                                {/* Content Wrapper */}
                                                <div className="space-y-4">
                                                    <div className="space-y-3" style={{ paddingTop: '2px' }}>
                                                        {template.questions.map(q => {
                                                            const answer = weeklyReviewData.weeklyReview!.answers?.find(a => a.questionId === q.id);
                                                            if (!answer || (q.type !== 'rating' && !answer.answer)) return null;

                                                            return (
                                                                <div key={q.id} className="group">
                                                                    <div className="mb-1.5 flex items-start gap-2">
                                                                        <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-stone-300 shrink-0"></div>
                                                                        <h4 className="text-sm font-normal text-stone-600 leading-snug flex-1">
                                                                            {q.question}
                                                                        </h4>
                                                                    </div>

                                                                    {q.type === 'rating' ? (
                                                                        <div className="flex items-center gap-1" style={{ marginLeft: '14px' }}>
                                                                            {Array.from({ length: parseInt(typeof answer.answer === 'string' ? answer.answer : String(answer.answer)) || 0 }).map((_, i) => (
                                                                                <span key={i} className={q.colorId ? `text-${q.colorId}-500` : "text-amber-500"}>
                                                                                    <DynamicIcon name={q.icon || 'star'} size={18} />
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-sm text-stone-500 leading-relaxed font-light whitespace-pre-wrap" style={{ marginLeft: '14px' }}>
                                                                            {answer.answer}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}

                            {/* Monthly Review Node (New) */}
                            {monthlyReviewData.shouldShow && (
                                <>
                                    <div className="relative pl-8 mt-6 animate-in slide-in-from-bottom-2 duration-500">
                                        {/* Time Marker */}
                                        <div className="absolute -left-[60px] top-0.5 w-[45px] text-right">
                                            <span className="text-xs font-bold text-pink-400 font-mono">Month</span>
                                        </div>

                                        {/* Timeline Dot */}
                                        <div className="absolute -left-[5px] top-3 w-2.5 h-2.5 rounded-full bg-pink-400 border-2 border-[#faf9f6] z-10" />

                                        {/* Content: Simple Text Button */}
                                        <button
                                            onClick={() => onOpenMonthlyReview?.(monthlyReviewData.monthStart, monthlyReviewData.monthEnd)}
                                            className="text-left hover:text-pink-600 transition-colors group"
                                        >
                                            <h3 className="font-bold text-stone-900 text-lg group-hover:text-pink-600 transition-colors">
                                                {monthlyReviewData.monthlyReview ? '本月小结' : '为本月作个小结吧！'}
                                            </h3>
                                        </button>
                                    </div>

                                    {/* Synced Template Content (Monthly) - Using Snapshot */}
                                    {monthlyReviewData.monthlyReview?.templateSnapshot?.filter(t => t.syncToTimeline).map((template) => {
                                        const hasAnswers = template.questions.some(q =>
                                            monthlyReviewData.monthlyReview!.answers?.some(a => a.questionId === q.id && a.answer) || (q.type === 'rating' && monthlyReviewData.monthlyReview!.answers?.some(a => a.questionId === q.id))
                                        );

                                        if (!hasAnswers) return null;

                                        return (
                                            <div key={template.id} className="relative pl-8 mt-6 animate-in slide-in-from-bottom-2 duration-500">
                                                {/* Time Marker - Template Title */}
                                                <div className="absolute -left-[60px] top-0.5 w-[45px] text-right flex flex-col items-end">
                                                    <span className="text-xs font-bold text-stone-500 leading-tight">
                                                        {template.title.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u, '')}
                                                    </span>
                                                </div>

                                                {/* Timeline Dot */}
                                                <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-stone-300 border-2 border-[#faf9f6] z-10" />

                                                {/* Content Wrapper */}
                                                <div className="space-y-4">
                                                    <div className="space-y-3" style={{ paddingTop: '2px' }}>
                                                        {template.questions.map(q => {
                                                            const answer = monthlyReviewData.monthlyReview!.answers?.find(a => a.questionId === q.id);
                                                            if (!answer || (q.type !== 'rating' && !answer.answer)) return null;

                                                            return (
                                                                <div key={q.id} className="group">
                                                                    <div className="mb-1.5 flex items-start gap-2">
                                                                        <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-stone-300 shrink-0"></div>
                                                                        <h4 className="text-sm font-normal text-stone-600 leading-snug flex-1">
                                                                            {q.question}
                                                                        </h4>
                                                                    </div>

                                                                    {q.type === 'rating' ? (
                                                                        <div className="flex items-center gap-1" style={{ marginLeft: '14px' }}>
                                                                            {Array.from({ length: parseInt(typeof answer.answer === 'string' ? answer.answer : String(answer.answer)) || 0 }).map((_, i) => (
                                                                                <span key={i} className={q.colorId ? `text-${q.colorId}-500` : "text-amber-500"}>
                                                                                    <DynamicIcon name={q.icon || 'star'} size={18} />
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-sm text-stone-500 leading-relaxed font-light whitespace-pre-wrap" style={{ marginLeft: '14px' }}>
                                                                            {answer.answer}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </>
                    )}


                </div>


                {/* This Day in Previous Years */}
                {(() => {
                    const currentMonth = currentDate.getMonth();
                    const currentDay = currentDate.getDate();
                    const currentYear = currentDate.getFullYear();

                    // Find all unique years (except current year) that have logs on this month/day
                    const yearsWithLogs = logs.reduce((years, log) => {
                        const logDate = new Date(log.startTime);
                        if (logDate.getMonth() === currentMonth &&
                            logDate.getDate() === currentDay &&
                            logDate.getFullYear() !== currentYear) {
                            const year = logDate.getFullYear();
                            if (!years.includes(year)) {
                                years.push(year);
                            }
                        }
                        return years;
                    }, [] as number[]).sort((a, b) => b - a); // Sort descending (most recent first)

                    if (yearsWithLogs.length === 0) return null;

                    return (
                        <div className="mt-8 space-y-2">
                            <p className="text-xs text-stone-400 mb-3">时空隧道：</p>
                            {yearsWithLogs.map(year => (
                                <button
                                    key={year}
                                    onClick={() => {
                                        const targetDate = new Date(currentDate);
                                        targetDate.setFullYear(year);
                                        onDateChange(targetDate);
                                    }}
                                    className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors text-xs font-medium"
                                >
                                    <Clock size={14} />
                                    <span>{year}年{currentMonth + 1}月{currentDay}日</span>
                                </button>
                            ))}
                        </div>
                    );
                })()}

                {/* Export/Share Button at the bottom */}
                {dayTimeline.length > 0 && (
                    <div className="mt-6">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors text-xs font-medium"
                        >
                            <Share size={14} />
                            <span>导出当日时间轴</span>
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
                className="fixed bottom-[calc(8.5rem+env(safe-area-inset-bottom))] right-6 w-12 h-12 bg-white text-amber-400 rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-transform z-40 border border-amber-100"
                title="AI Magic Backfill"
            >
                <Sparkles size={20} />
            </button>

            {/* Floating Punch Button */}
            <button
                onClick={onQuickPunch}
                className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-[5.5rem] w-12 h-12 bg-white text-stone-600 rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-transform z-40 border border-stone-200"
                title="Quick Punch (Mark Time)"
            >
                <Timer size={20} />
            </button>

            {/* Floating Add Button */}
            <button
                onClick={() => onAddLog()}
                className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-6 w-14 h-14 bg-stone-900 rounded-full text-white shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40 border border-stone-800"
                title="Add Activity"
            >    <Plus size={24} strokeWidth={1.5} />
            </button>
            {
                isAIModalOpen && (
                    <AIBatchModal
                        onClose={() => setIsAIModalOpen(false)}
                        onSave={onBatchAddLogs}
                        categories={categories}
                        targetDate={currentDate}
                        autoLinkRules={autoLinkRules}
                        scopes={scopes}
                    />
                )
            }
        </div >
    );
};