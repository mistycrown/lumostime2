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
import { Log, Activity, TodoItem, Category, TodoCategory, Scope, DailyReview, ReviewTemplate, WeeklyReview, MonthlyReview, AutoLinkRule, Goal } from '../types';
import { CATEGORIES } from '../constants';
import * as LucideIcons from 'lucide-react';
import { Plus, MoreHorizontal, BarChart2, ArrowUp, ArrowDown, Sparkles, RefreshCw, Zap, Share, Timer, Clock, Image as ImageIcon } from 'lucide-react';
import { CalendarWidget } from '../components/CalendarWidget';
import { AIBatchModal } from '../components/AIBatchModal';
import { ParsedTimeEntry } from '../services/aiService';
import { ToastType } from '../components/Toast';
import { imageService } from '../services/imageService';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { ReactionPicker, ReactionList } from '../components/ReactionComponents';
import { TimePalCard } from '../components/TimePalCard';
import { TimePalDebugger } from '../components/TimePalDebugger';
import { FloatingButton } from '../components/FloatingButton';
import { UIIcon } from '../components/UIIcon';
import { IconRenderer } from '../components/IconRenderer';
import { usePrivacy } from '../contexts/PrivacyContext';
import { CollapsibleText } from '../components/CollapsibleText';
import { calculateGoalProgress } from '../utils/goalUtils';
import { GalleryView } from '../components/GalleryView';

// Image Thumbnail Component
const TimelineImage: React.FC<{ filename: string, className?: string, useThumbnail?: boolean, refreshKey?: number }> = ({ filename, className = "w-16 h-16", useThumbnail = false, refreshKey = 0 }) => {
    const [src, setSrc] = useState<string>('');
    const [error, setError] = useState<string>('');

    React.useEffect(() => {
        const loadImage = async () => {
            try {
                // console.log(`[TimelineImage] 尝试加载图片: ${filename}, useThumbnail: ${useThumbnail}, refreshKey: ${refreshKey}`);
                const url = await imageService.getImageUrl(filename, useThumbnail ? 'thumbnail' : 'original');
                // console.log(`[TimelineImage] 获取到图片URL: ${filename} -> ${url ? '成功' : '失败'}`);

                if (url) {
                    setSrc(url);
                    setError('');
                } else {
                    setError('图片URL为空');
                    console.warn(`[TimelineImage] 图片URL为空: ${filename}`);
                }
            } catch (err: any) {
                console.error(`[TimelineImage] 加载图片失败: ${filename}`, err);
                setError(`加载失败: ${err.message}`);
            }
        };

        loadImage();
    }, [filename, useThumbnail, refreshKey]); // 添加refreshKey到依赖

    if (error) {
        console.warn(`[TimelineImage] 显示错误占位符: ${filename} - ${error}`);
        return (
            <div className={`${className} rounded-lg border border-red-200 bg-red-50 flex items-center justify-center shrink-0`}>
                <span className="text-red-400 text-xs">❌</span>
            </div>
        );
    }

    if (!src) {
        return (
            <div className={`${className} rounded-lg border border-stone-200 bg-stone-100 flex items-center justify-center shrink-0`}>
                <span className="text-stone-400 text-xs">📷</span>
            </div>
        );
    }

    return (
        <div className={`${className} rounded-lg overflow-hidden border border-stone-200 shrink-0`}>
            <img
                src={src}
                alt="img"
                className="w-full h-full object-cover"
                onError={() => {
                    console.error(`[TimelineImage] 图片加载失败: ${filename}, src: ${src}`);
                    setError('图片加载失败');
                }}
                onLoad={() => {
                    // console.log(`[TimelineImage] 图片加载成功: ${filename}`);
                }}
            />
        </div>
    );
};

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
    onUpdateLog: (log: Log) => void; // Silent update (e.g. for reactions)
    currentDate: Date;
    onDateChange: (date: Date) => void;
    onShowStats: () => void;
    onBatchAddLogs: (entries: ParsedTimeEntry[]) => void;
    onSync: (e: any) => void;
    isSyncing: boolean;
    todos: TodoItem[];
    todoCategories: TodoCategory[];
    goals: Goal[]; // 新增：目标列表
    onToast: (type: ToastType, message: string) => void;
    startWeekOnSunday?: boolean;
    autoLinkRules: AutoLinkRule[];
    scopes: Scope[];
    minIdleTimeThreshold?: number;
    onQuickPunch?: () => void;
    refreshKey?: number; // 添加refreshKey用于强制刷新图片
    activeSessions?: any[]; // 新增：正在进行的会话
    onNavigateToTodo?: (todo: TodoItem) => void; // 修改：直接传递待办对象
    onNavigateToGoal?: (goal: Goal) => void; // 新增：导航到目标详情
    // Daily Review
    dailyReview?: DailyReview;
    onOpenDailyReview?: () => void;
    onCreateDailyReviewSilently?: () => void;
    templates: ReviewTemplate[];
    dailyReviewTime?: string;
    autoGenerateDailyReview?: boolean;
    // Weekly Review
    weeklyReviews?: WeeklyReview[];
    onOpenWeeklyReview?: (weekStart: Date, weekEnd: Date) => void;
    weeklyReviewTime?: string;
    autoGenerateWeeklyReview?: boolean;
    // Monthly Review
    monthlyReviews?: MonthlyReview[];
    onOpenMonthlyReview?: (monthStart: Date, monthEnd: Date) => void;
    monthlyReviewTime?: string;
    autoGenerateMonthlyReview?: boolean;
    // Timeline Gallery Mode
    timelineGalleryMode?: boolean;
    // Collapse Threshold
    collapseThreshold?: number;
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
        categoryUiIcon?: string; // 添加 UI 图标支持
        categoryColor?: string;
        linkedTodoTitle?: string;
        linkedTodo?: TodoItem; // 完整的待办对象
        linkedScopeData?: { icon: string; uiIcon?: string; name: string }[]; // 添加 uiIcon 支持
    };
}

export const TimelineView: React.FC<TimelineViewProps> = ({ logs, todos, scopes, goals, onAddLog, onEditLog, onUpdateLog, categories, currentDate, onDateChange, onShowStats, onBatchAddLogs, onSync, isSyncing, todoCategories, onToast, startWeekOnSunday = false, autoLinkRules = [], minIdleTimeThreshold = 1, onQuickPunch, refreshKey = 0, activeSessions = [], onNavigateToTodo, onNavigateToGoal, dailyReview, onOpenDailyReview, onCreateDailyReviewSilently, templates = [], dailyReviewTime = '22:00', autoGenerateDailyReview = false, weeklyReviews = [], onOpenWeeklyReview, weeklyReviewTime = '0-2200', autoGenerateWeeklyReview = false, monthlyReviews = [], onOpenMonthlyReview, monthlyReviewTime = '0-2200', autoGenerateMonthlyReview = false, timelineGalleryMode = false, collapseThreshold = 9999 }) => {
    const { isPrivacyMode } = usePrivacy();
    const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
        const saved = localStorage.getItem('lumos_timeline_sort');
        return (saved === 'asc' || saved === 'desc') ? saved : 'asc';
    });
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [copyFailureModal, setCopyFailureModal] = useState<{ isOpen: boolean; text: string }>({ isOpen: false, text: '' });
    const [showTimePalDebugger, setShowTimePalDebugger] = useState(false);
    const [showGalleryView, setShowGalleryView] = useState(false);

    React.useEffect(() => {
        localStorage.setItem('lumos_timeline_sort', sortOrder);
    }, [sortOrder]);

    // 监听 TimePal 调试器的开关
    React.useEffect(() => {
        // 在 window 上暴露开启/关闭调试器的函数
        (window as any).enableTimePalDebug = () => {
            setShowTimePalDebugger(true);
            console.log('✅ TimePal 调试器已开启');
        };
        (window as any).disableTimePalDebug = () => {
            setShowTimePalDebugger(false);
            console.log('❌ TimePal 调试器已关闭');
        };

        return () => {
            delete (window as any).enableTimePalDebug;
            delete (window as any).disableTimePalDebug;
        };
    }, []);

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
                // 检查是否到达设定时间
                // 解析weeklyReviewTime (格式: "0-2200"，0表示最后一天，2200是时间)
                const timeStr = (weeklyReviewTime || '0-2200').split('-')[1] || '2200';
                const targetHour = parseInt(timeStr.substring(0, 2));
                const targetMinute = parseInt(timeStr.substring(2, 4));

                // 构造触发时间：周结束日期的目标时间
                const triggerTime = new Date(weekEnd);
                triggerTime.setHours(targetHour, targetMinute, 0, 0);

                const now = new Date();

                // 只有当前时间超过触发时间才显示 (涵盖了过去的时间总是显示，未来的时间不显示)
                if (now.getTime() >= triggerTime.getTime()) {
                    shouldShow = true;

                    // 自动生成逻辑：只在查看本周最后一天的时间轴时自动创建
                    const isViewingLastDayOfWeek = currentDate.toDateString() === weekEnd.toDateString();
                    
                    if (autoGenerateWeeklyReview && !weeklyReview && isViewingLastDayOfWeek) {
                        setTimeout(() => {
                            console.log('[AutoGenerate] 自动创建每周回顾（仅本周最后一天）');
                            onOpenWeeklyReview(weekStart, weekEnd);
                        }, 0);
                    }
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
    }, [currentDate, startWeekOnSunday, weeklyReviews, onOpenWeeklyReview, weeklyReviewTime, autoGenerateWeeklyReview]);

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
                // 检查是否到达设定时间
                // 解析monthlyReviewTime (格式: "0-2200"，0表示最后一天，2200是时间)
                const timeStr = (monthlyReviewTime || '0-2200').split('-')[1] || '2200';
                const targetHour = parseInt(timeStr.substring(0, 2));
                const targetMinute = parseInt(timeStr.substring(2, 4));

                // 构造触发时间：月结束日期的目标时间
                const triggerTime = new Date(monthEnd);
                triggerTime.setHours(targetHour, targetMinute, 0, 0);

                const now = new Date();

                // 只有当前时间超过触发时间才显示
                if (now.getTime() >= triggerTime.getTime()) {
                    shouldShow = true;

                    // 自动生成逻辑：只在查看本月最后一天的时间轴时自动创建
                    const isViewingLastDayOfMonth = currentDate.toDateString() === monthEnd.toDateString();
                    
                    if (autoGenerateMonthlyReview && !monthlyReview && isViewingLastDayOfMonth) {
                        setTimeout(() => {
                            console.log('[AutoGenerate] 自动创建每月回顾（仅本月最后一天）');
                            onOpenMonthlyReview(monthStart, monthEnd);
                        }, 0);
                    }
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
    }, [currentDate, monthlyReviews, onOpenMonthlyReview, monthlyReviewTime, autoGenerateMonthlyReview]);

    // 触摸滑动手势处理
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    // 最小滑动距离（像素）- 防止误触
    const minSwipeDistance = 100;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            // 向左滑动 = 下一天 (Next Day)
            const nextDate = new Date(currentDate);
            nextDate.setDate(nextDate.getDate() + 1);
            onDateChange(nextDate);
        } else if (isRightSwipe) {
            // 向右滑动 = 上一天 (Previous Day)
            const prevDate = new Date(currentDate);
            prevDate.setDate(prevDate.getDate() - 1);
            onDateChange(prevDate);
        }
    };

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
        const thresholdSeconds = (minIdleTimeThreshold || 1) * 60;

        // ASC: Check for gap at start of day (00:00 -> First Log)
        if (sortOrder === 'asc' && dayLogs.length > 0) {
            const firstLog = dayLogs[0];
            const gapDuration = (firstLog.startTime - startOfDay.getTime()) / 1000;
            if (gapDuration > thresholdSeconds) {
                items.push({
                    type: 'gap',
                    id: `gap-start-day`,
                    startTime: startOfDay.getTime(),
                    endTime: firstLog.startTime,
                    duration: gapDuration
                });
            }
        }

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
                    categoryUiIcon: category?.uiIcon,
                    categoryColor: category?.themeColor || '#a8a29e', // Stone-400 fallback
                    linkedTodoTitle: linkedTodo?.title,
                    linkedTodo: linkedTodo, // 传递完整的待办对象
                    linkedScopeData: linkedScopes.length > 0
                        ? linkedScopes.map(s => ({ 
                            icon: s.icon || '📍', 
                            uiIcon: s.uiIcon,
                            name: s.name 
                        }))
                        : undefined
                }
            });

            // Gap to next log
            // Use minIdleTimeThreshold * 60 seconds. Default if undefined is 60s.
            // thresholdSeconds is defined above

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

        // DESC: Check for gap at start of day (First Log -> 00:00, displayed at bottom)
        if (sortOrder === 'desc' && dayLogs.length > 0) {
            const earliestLog = dayLogs[dayLogs.length - 1]; // Last item is earliest in desc
            const gapDuration = (earliestLog.startTime - startOfDay.getTime()) / 1000;
            if (gapDuration > thresholdSeconds) {
                items.push({
                    type: 'gap',
                    id: `gap-start-day`,
                    startTime: startOfDay.getTime(),
                    endTime: earliestLog.startTime,
                    duration: gapDuration
                });
            }
        }
        return items;
    }, [logs, currentDate, todos, categories, sortOrder]);

    // 计算当天完成的待办（按日期分组）
    const completedTodosToday = useMemo(() => {
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);

        return todos.filter(todo => {
            if (!todo.isCompleted || !todo.completedAt) return false;
            const completedTime = new Date(todo.completedAt).getTime();
            return completedTime >= startOfDay.getTime() && completedTime <= endOfDay.getTime();
        });
    }, [todos, currentDate]);

    // 计算当天到期的目标及其状态
    const goalsExpiredToday = useMemo(() => {
        const todayStr = currentDate.toISOString().split('T')[0];
        
        return goals.filter(goal => {
            // 显示所有状态的目标（包括已归档）
            // 检查是否是今天到期
            return goal.endDate === todayStr;
        }).map(goal => {
            const { current, target, percentage } = calculateGoalProgress(goal, logs, todos);
            const isLimitGoal = goal.metric === 'duration_limit';
            
            // 判断成功或失败
            const isSuccess = isLimitGoal 
                ? percentage < 100  // 负向目标：进度 < 100% 为成功
                : percentage >= 100; // 正向目标：进度 >= 100% 为成功
            
            return {
                goal,
                isSuccess,
                progress: { current, target, percentage }
            };
        });
    }, [goals, logs, todos, currentDate]);

    const shouldShowReviewNode = useMemo(() => {
        // 1. If daily review exists, always show
        if (dailyReview) return true;

        // 2. Base requirement: Must rely on onOpenDailyReview handler
        if (!onOpenDailyReview) return false;

        // 3. Base requirement: Must have timeline items (per existing logic)
        if (dayTimeline.length === 0) return false;

        // 4. Time Check (Unified logic for Past/Today/Future)
        // Parse target time
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

        const triggerTime = new Date(currentDate);
        triggerTime.setHours(targetHour, targetMinute, 0, 0);

        const now = new Date();
        const shouldShow = now.getTime() >= triggerTime.getTime();

        // 5. 自动生成逻辑：只在查看今天的时间轴时自动创建，不在历史日期自动生成
        const isToday = currentDate.toDateString() === new Date().toDateString();
        if (shouldShow && autoGenerateDailyReview && !dailyReview && onCreateDailyReviewSilently && isToday) {
            // 使用 setTimeout 避免在 render 期间调用 setState
            setTimeout(() => {
                console.log('[AutoGenerate] 自动在后台创建每日回顾（仅今天）');
                onCreateDailyReviewSilently();
            }, 0);
        }

        return shouldShow;
    }, [dailyReview, onOpenDailyReview, onCreateDailyReviewSilently, dayTimeline.length, currentDate, dailyReviewTime, autoGenerateDailyReview]);

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

            const content = log.note ? log.note.split('\n').map(line => `> ${line}`).join('\n') : '> (无备注)';

            // Format: 09:26 - 10:30 (64m) #[Category]/[Activity] @Todo %Scope
            text += `${sTime} - ${eTime} (${mins}m)  # [${cat?.name || '未知'}/${act?.name || '未知'}]`;

            if (todo) text += ` @${todo.title}`;
            // 只有进度待办才显示进度增量和进度比例
            if (todo?.isProgress) {
                if (log.progressIncrement && log.progressIncrement > 0) text += ` + ${log.progressIncrement} `;
                text += `（${(todo.completedUnits || 0)}/${todo.totalAmount}）`;
            }
            if (scopes_list.length > 0) text += ` %${scopes_list.map(s => s.name).join(', ')}`;
            if (log.focusScore && log.focusScore > 0) text += ` ⚡️${log.focusScore}`;

            text += '\n';
            if (content) text += `${content}\n`;
            text += '\n'; // Empty line separator
        });

        setCopyFailureModal({ isOpen: true, text: text });
    };

    const executeCopy = (text: string) => {
        // Try standard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                onToast?.('success', '已复制到剪贴板');
            }).catch((err) => {
                console.warn('Clipboard API failed, trying fallback...', err);
                fallbackCopyText(text);
            });
        } else {
            // Fallback for older browsers/WebViews
            fallbackCopyText(text);
        }
    };

    const fallbackCopyText = (text: string) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;

            // Avoid scrolling to bottom
            textArea.style.top = "0";
            textArea.style.left = "0";
            textArea.style.position = "fixed";
            textArea.style.opacity = "0";

            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);

            if (successful) {
                onToast?.('success', '已复制到剪贴板');
            } else {
                // onToast?.('error', '复制失败，请手动复制');
                setCopyFailureModal({ isOpen: true, text: text });
            }
        } catch (err) {
            console.error('Fallback copy failed', err);
            // onToast?.('error', '复制失败，请检查权限');
            setCopyFailureModal({ isOpen: true, text: text });
        }
    };

    return (
        <div
            className="h-full bg-[#faf9f6] flex flex-col relative text-stone-900"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >

            {/* Header & Calendar Container */}
            <div className="flex flex-col shrink-0">

                <CalendarWidget
                    currentDate={currentDate}
                    onDateChange={onDateChange}
                    logs={logs}
                    isExpanded={isCalendarExpanded}
                    onExpandToggle={() => setIsCalendarExpanded(!isCalendarExpanded)}
                    startWeekOnSunday={startWeekOnSunday}
                    galleryMode={timelineGalleryMode}
                    todos={todos}
                    extraHeaderControls={
                        <>
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
                            <button
                                onClick={() => setShowGalleryView(true)}
                                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                                title="Gallery View"
                            >
                                <ImageIcon size={20} />
                            </button>
                        </>
                    }
                />


            </div>

            {/* Timeline List */}
            <div 
                className="flex-1 overflow-y-auto px-7 py-6 pb-24 no-scrollbar"
                id="timeline-content"
            >
                <div className="relative border-l border-stone-300 ml-[70px] space-y-6">
                    {/* 时光小友卡片 */}
                    <div className="pl-8 -ml-[70px] mb-6">
                        <TimePalCard 
                            logs={logs}
                            currentDate={currentDate}
                            categories={categories}
                            activeSessions={activeSessions}
                        />
                    </div>

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
                                    <div className="absolute -left-[11px] top-0 z-20 flex items-center justify-center">
                                        <div className="w-2.5 h-2.5 mt-1.5 ml-1.5 rounded-full bg-stone-900 border-2 border-[#faf9f6] z-10" />
                                    </div>

                                    {/* Content Item */}
                                    <div
                                        onClick={() => onEditLog(item.logData!)}
                                        className="cursor-pointer active:opacity-70 transition-opacity"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className={`text-lg font-bold leading-tight ${!item.logData.activity ? 'text-stone-500 italic' : 'text-stone-900'}`}>
                                                {item.logData.activity?.name || item.logData.title || "未命名记录"}
                                            </h3>

                                            {/* Reactions */}
                                            {item.logData.reactions && item.logData.reactions.length > 0 && (
                                                <div className="flex items-center -space-x-1 ml-0.5">
                                                    {Array.from(new Set(item.logData.reactions)).map((emoji, idx) => (
                                                        <span key={idx} className="text-sm scale-90">
                                                            <IconRenderer icon={emoji} />
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {item.logData.focusScore && item.logData.focusScore > 0 && (
                                                <span className="text-sm font-bold text-stone-400 font-mono flex items-center gap-0.5">
                                                    <Zap size={12} fill="currentColor" />
                                                    {item.logData.focusScore}
                                                </span>
                                            )}
                                        </div>

                                        {item.logData.note && (
                                            <CollapsibleText
                                                text={item.logData.note}
                                                threshold={collapseThreshold}
                                                className={`text-sm text-stone-500 leading-relaxed mb-2 font-light ${isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'}`}
                                            />
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
                                                <IconRenderer 
                                                    icon={item.logData.categoryIcon || ''} 
                                                    uiIcon={item.logData.categoryUiIcon}
                                                    className="text-xs" 
                                                />
                                                <span className="flex items-center">
                                                    <span>{item.logData.categoryName}</span>
                                                    <span className="mx-1 text-stone-300">/</span>
                                                    <IconRenderer 
                                                        icon={item.logData.activity?.icon || ''} 
                                                        uiIcon={item.logData.activity?.uiIcon}
                                                        className="text-xs mr-1" 
                                                    />
                                                    <span className="text-stone-500">{item.logData.activity?.name}</span>
                                                </span>
                                            </span>

                                            {/* Scope Tags */}
                                            {item.logData.linkedScopeData && item.logData.linkedScopeData.length > 0 && (
                                                <>
                                                    {item.logData.linkedScopeData.map((scopeData, idx) => (
                                                        <span key={idx} className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                                            <span className="text-stone-400 font-bold">%</span>
                                                            <IconRenderer 
                                                                icon={scopeData.icon} 
                                                                uiIcon={scopeData.uiIcon}
                                                                className="text-xs" 
                                                            />
                                                            <span>{scopeData.name}</span>
                                                        </span>
                                                    ))}
                                                </>
                                            )}
                                        </div>

                                        {/* Images */}
                                        {item.logData.images && item.logData.images.length > 0 && (
                                            <div className="flex gap-2 mt-2 mb-1 overflow-x-auto pb-1 no-scrollbar" onClick={(e) => e.stopPropagation()}>
                                                {(item.logData.images.length > 3
                                                    ? item.logData.images.slice(0, 2)
                                                    : item.logData.images
                                                ).map(img => (
                                                    <div
                                                        key={img}
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const url = await imageService.getImageUrl(img, 'original');
                                                            if (url) setPreviewImage(url);
                                                        }}
                                                        className="cursor-zoom-in transition-transform hover:scale-105"
                                                    >
                                                        <TimelineImage filename={img} className="w-16 h-16 shadow-sm" useThumbnail={true} refreshKey={refreshKey} />
                                                    </div>
                                                ))}
                                                {item.logData.images.length > 3 && (
                                                    <div className="w-16 h-16 rounded-xl bg-stone-100 flex items-center justify-center border border-stone-200 text-stone-400 font-bold text-sm">
                                                        +{item.logData.images.length - 2}
                                                    </div>
                                                )}
                                            </div>
                                        )}
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

                    {/* Completed Todos Node */}
                    {completedTodosToday.length > 0 && (
                        <div className="relative pl-8 mt-6 animate-in slide-in-from-bottom-2 duration-500">
                            {/* Time Marker */}
                            <div className="absolute -left-[60px] top-0.5 w-[45px] text-right">
                                <span className="text-xs font-bold text-stone-500 font-mono">Done</span>
                            </div>

                            {/* Timeline Dot */}
                            <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-stone-400 border-2 border-[#faf9f6] z-10" />

                            {/* Content - 直接显示待办列表 */}
                            <div className="space-y-1.5" style={{ paddingTop: '2px' }}>
                                {completedTodosToday.map(todo => {
                                    return (
                                        <button
                                            key={todo.id}
                                            onClick={() => {
                                                // 打开待办详情
                                                if (onNavigateToTodo) {
                                                    onNavigateToTodo(todo);
                                                }
                                            }}
                                            className="block text-left hover:bg-stone-50 rounded-lg transition-colors w-full group"
                                        >
                                            <span className="text-xs text-stone-600 group-hover:text-stone-900 leading-snug">
                                                {todo.title}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Goals Expired Today Node */}
                    {goalsExpiredToday.length > 0 && (
                        <div className="relative pl-8 mt-6 animate-in slide-in-from-bottom-2 duration-500">
                            {/* Time Marker */}
                            <div className="absolute -left-[60px] top-0.5 w-[45px] text-right">
                                <span className="text-xs font-bold text-stone-500 font-mono">Goal</span>
                            </div>

                            {/* Timeline Dot */}
                            <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-stone-400 border-2 border-[#faf9f6] z-10" />

                            {/* Content - 显示目标列表 */}
                            <div className="space-y-1.5" style={{ paddingTop: '2px' }}>
                                {goalsExpiredToday.map(({ goal, isSuccess }) => {
                                    return (
                                        <button
                                            key={goal.id}
                                            onClick={() => {
                                                // 打开目标详情
                                                if (onNavigateToGoal) {
                                                    onNavigateToGoal(goal);
                                                }
                                            }}
                                            className="block text-left hover:bg-stone-50 rounded-lg transition-colors w-full group"
                                        >
                                            <span className="text-xs text-stone-600 group-hover:text-stone-900 leading-snug">
                                                {isSuccess ? '✓ ' : '✗ '}{goal.title}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

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
                                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-[#faf9f6] z-10" />

                                    {/* Content: Simple Text Button */}
                                    <button
                                        onClick={onOpenDailyReview}
                                        className="text-left hover:text-amber-600 transition-colors group"
                                    >
                                        <h3 className="font-bold text-stone-900 text-lg group-hover:text-amber-600 transition-colors flex items-center gap-2">
                                            <span>{dailyReview ? '今日回顾' : '准备好开始回顾了吗？'}</span>
                                            {dailyReview?.moodEmoji && (
                                                <span className="text-base flex items-center justify-center leading-none">
                                                    <IconRenderer icon={dailyReview.moodEmoji} />
                                                </span>
                                            )}
                                        </h3>
                                        {dailyReview?.summary && (
                                            <p className="text-xs text-stone-400 mt-1">
                                                {dailyReview.summary}
                                            </p>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Synced Check Items (Daily) - Grouped by Category */}
                            {dailyReview?.checkItems && dailyReview.checkCategorySyncToTimeline && (() => {
                                // Group check items by category
                                const groupedItems: { [key: string]: typeof dailyReview.checkItems } = {};
                                dailyReview.checkItems.forEach(item => {
                                    const cat = item.category || '默认';
                                    if (!groupedItems[cat]) groupedItems[cat] = [];
                                    groupedItems[cat].push(item);
                                });

                                // Filter only synced categories
                                const syncedCategories = Object.entries(groupedItems).filter(
                                    ([category]) => dailyReview.checkCategorySyncToTimeline?.[category]
                                );

                                return syncedCategories.map(([category, items]) => (
                                    <div key={category} className="relative pl-8 mt-6 animate-in slide-in-from-bottom-2 duration-500">
                                        {/* Time Marker - Category Title */}
                                        <div className="absolute -left-[60px] top-0.5 w-[45px] text-right flex flex-col items-end">
                                            <span className="text-xs font-bold text-stone-500 leading-tight">
                                                {category}
                                            </span>
                                        </div>

                                        {/* Timeline Dot */}
                                        <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-stone-300 border-2 border-[#faf9f6] z-10" />

                                        {/* Content Wrapper */}
                                        <div className="space-y-2" style={{ paddingTop: '2px' }}>
                                            {items.map(item => (
                                                <div key={item.id} className="flex items-center gap-2">
                                                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                                        item.isCompleted
                                                            ? 'bg-stone-900 border-stone-900 text-white'
                                                            : 'border-stone-400 text-transparent'
                                                    }`}>
                                                        <LucideIcons.Check size={8} strokeWidth={3} />
                                                    </div>
                                                    <span className={`text-sm leading-tight ${
                                                        item.isCompleted
                                                            ? 'text-stone-400 line-through'
                                                            : 'text-stone-600'
                                                    }`}>
                                                        {item.content}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ));
                            })()}

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
                        </>
                    )}

                    {/* Weekly Review Node */}
                    {weeklyReviewData.shouldShow && (
                        <>
                            <div className="relative pl-8 mt-6 animate-in slide-in-from-bottom-2 duration-500">
                                {/* Time Marker */}
                                <div className="absolute -left-[60px] top-0.5 w-[45px] text-right">
                                    <span className="text-xs font-bold text-purple-400 font-mono">Week</span>
                                </div>

                                {/* Timeline Dot */}
                                <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-purple-400 border-2 border-[#faf9f6] z-10" />

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
                                <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-pink-400 border-2 border-[#faf9f6] z-10" />

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

                {dayTimeline.length === 0 && !shouldShowReviewNode && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-60">
                        <div className="w-16 h-16 border border-stone-200 rounded-full flex items-center justify-center text-stone-300 mb-4">
                            <MoreHorizontal size={32} />
                        </div>
                        <p className="text-stone-400 font-serif italic">Silence is golden.</p>
                        <button
                            onClick={() => onAddLog()}
                            className="mt-6 px-8 py-3 rounded-full text-sm font-bold active:scale-95 transition-transform btn-template-filled"
                        >
                            Record Activity
                        </button>
                    </div>
                )}
            </div>

            {/* Floating AI Button (Above Add) */}
            <FloatingButton
                onClick={() => setIsAIModalOpen(true)}
                position="custom"
                className="fixed bottom-[calc(8.5rem+env(safe-area-inset-bottom))] right-6"
                size="sm"
                variant="white"
                title="AI Magic Backfill"
                disableThemeStyle={true}
            >
                <UIIcon type="ai-assist" fallbackIcon={Sparkles} size={20} className="text-stone-600" />
            </FloatingButton>

            {/* Floating Punch Button */}
            <FloatingButton
                onClick={onQuickPunch}
                position="custom"
                className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-[5.5rem]"
                size="sm"
                variant="secondary"
                title="Quick Punch (Mark Time)"
                disableThemeStyle={true}
            >
                <UIIcon type="timer" fallbackIcon={Timer} size={20} className="text-stone-600" />
            </FloatingButton>

            {/* Floating Add Button */}
            <FloatingButton
                onClick={() => onAddLog()}
                title="Add Activity"
            >
                <UIIcon type="add-record" fallbackIcon={Plus} size={24} />
            </FloatingButton>
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
            <ImagePreviewModal
                imageUrl={previewImage}
                onClose={() => setPreviewImage(null)}
            />

            <ConfirmModal
                isOpen={copyFailureModal.isOpen}
                onClose={() => setCopyFailureModal({ ...copyFailureModal, isOpen: false })}
                onConfirm={() => {
                    executeCopy(copyFailureModal.text);
                    // Don't close immediately so user can still manually copy if needed? 
                    // Or close for better UX? Let's close.
                    // Actually, if it fails silently, closing is bad. 
                    // But standard UX is to close. User can reopen.
                    setCopyFailureModal({ ...copyFailureModal, isOpen: false });
                }}
                title="导出内容"
                description={copyFailureModal.text}
                confirmText="复制内容"
                cancelText="关闭"
                type="info"
            />

            {/* TimePal 调试器 */}
            {showTimePalDebugger && (
                <TimePalDebugger onClose={() => setShowTimePalDebugger(false)} />
            )}

            {/* 画廊视图 */}
            {showGalleryView && (
                <GalleryView
                    logs={logs}
                    categories={categories}
                    dailyReviews={dailyReview ? [dailyReview] : []}
                    onClose={() => setShowGalleryView(false)}
                    onEditLog={onEditLog}
                    refreshKey={refreshKey}
                    onToast={onToast}
                />
            )}
        </div >
    );
};