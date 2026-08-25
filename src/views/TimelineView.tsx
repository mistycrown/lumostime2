/**
 * @file TimelineView.tsx
 * @input Logs, Categories, Todos, Scopes, Reviews (Daily/Weekly/Monthly)
 * @output Log CRUD, Date Navigation, Gesture/Calendar Animated Day Navigation, Search Trigger, Filter Trigger, Review Navigation
 * @pos View (Main Tab)
 * @description The primary daily view. Visualizes time usage on a timeline, supports adding/editing logs, gap detection, gesture and lightweight calendar date-switch animation, quick search and custom filter entry points, and integrates Daily/Weekly/Monthly review plus achievement bottle entry points.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 * @updated 2026-05-14: Timeline log rows now show `◬ Collection` badges for records that belong to one or more collections, matching the existing linked-todo metadata chips.
 * @updated 2026-05-12: Swapped the Collection quick action icon to a star and kept its deep-link into the settings Collection subpage.
 * @updated 2026-04-30: Timeline done nodes now append `@parent` context to completed subtask titles using plain text.
 * @updated 2026-04-25: Replaced the fixed five timeline header buttons with user-configurable quick actions.
 * @updated 2026-04-22: The floating AI button now opens the app-level shared AI window so closing the modal does not interrupt an in-flight request.
 * @updated 2026-04-22: Replaced the old AI backfill entry with a local-history chat modal for the first-step conversational AI flow.
 * @updated 2026-04-20: Switched the timeline screen to the shared lightweight custom-background pipeline.
 * @updated 2026-07-22: Preserved custom background images behind a readable dark-mode page overlay.
 * @updated 2026-07-30: Added quick-color continuous-create mode and mode-specific right-side split controls.
 * @updated 2026-07-30: Made the todo-plan and quick-color side panels mutually exclusive and grouped their collapsed controls together.
 * @updated 2026-07-30: Added the quick-color split panel with click-to-range hints and direct activity drag creation.
 * @updated 2026-07-30: Uses a persistent workspace ratio for the timeline todo sidebar across screen sizes.
 * @updated 2026-07-30: Applies the same compact 26%-70% ratio resizing to quick-color and todo split sidebars.
 * @updated 2026-07-30: Uses the shared auto-check change detector so daily review persistence ignores harmless item reordering.
 * @updated 2026-07-31: Reads the active Chronicle layout from the app shell so repeated Timeline nav taps can switch layouts without overwriting the settings default.
 * @updated 2026-07-31: Keeps planned blocks out of the pure timeline record stream so idle gaps and export/gallery actions only use entity logs.
 * @updated 2026-07-31: Filters the todo sidebar daily checks against disabled template items before display and auto refresh.
 * @updated 2026-08-09: Added the configurable shortcut to the daily-check overview page.
 * @updated 2026-08-10: Records Timeline as the return target when opening daily-check overview.
 * @updated 2026-08-09: Passes actionable real-record idle gaps into the split timeline canvas while excluding plan blocks from gap detection.
 * @updated 2026-08-24: Added an always-leftmost More menu for timeline shortcuts that are not pinned to the header.
 * @updated 2026-08-25: Rendered the More menu through a page-level portal so split-pane dividers cannot cover it.
 * @updated 2026-08-25: Rendered custom activity attributes below notes in the main timeline.
 */
import React, { useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AppView, Log, Activity, TodoItem, Category, TodoCategory, Scope, DailyReview, ReviewTemplate, WeeklyReview, MonthlyReview, AutoLinkRule, Goal, CheckItem, CheckTemplate } from '../types';
import { CATEGORIES } from '../constants';
import * as LucideIcons from 'lucide-react';
import { Plus, MoreHorizontal, BarChart2, BookOpen, FlaskConical, RefreshCw, Sparkles, Zap, Heart, Share, Timer, Clock, Search, Filter, Image as ImageIcon, Star, ChevronLeft, ChevronRight, ListFilter, ListTodo, X, Paintbrush, PanelRightClose } from 'lucide-react';
import { CalendarWidget } from '../components/CalendarWidget';
import { ParsedTimeEntry } from '../services/aiService';
import { ToastType } from '../components/Toast';
import { imageService } from '../services/imageService';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { ReactionPicker, ReactionList } from '../components/ReactionComponents';
import { TimePalCard } from '../components/TimePalCard';
import { TimePalDebugger } from '../components/TimePalDebugger';
import { FloatingButton } from '../components/FloatingButton';
import { useAIChatWindow } from '../contexts/AIChatWindowContext';
import { UIIcon } from '../components/UIIcon';
import { IconRenderer } from '../components/IconRenderer';
import { UnreadCountBadge } from '../components/UnreadCountBadge';
import { useData } from '../contexts/DataContext';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useSettings } from '../contexts/SettingsContext';
import { CollapsibleText } from '../components/CollapsibleText';
import { calculateGoalProgress } from '../utils/goalUtils';
import { GalleryView } from '../components/GalleryView';
import { toCssColor } from '../utils/colorUtils';
import { TimelineStyleRail } from '../components/TimelineStyleRail';
import { TimelineStyleAdjuster } from '../components/TimelineStyleAdjuster';
import { useBackgroundDisplay } from '../hooks/useBackgroundDisplay';
import { TIMELINE_QUICK_ACTION_OPTIONS, type TimelineQuickActionKey } from '../constants/timelineQuickActions';
import { formatCompletedTodoLabel } from '../utils/todoHierarchyUtils';
import { TimelineTodoSidebar } from '../components/TimelineTodoSidebar';
import { TimelineScheduleCanvas, TimelineScheduleCanvasHandle, type TimelineQuickColorActivity } from '../components/TimelineScheduleCanvas';
import { TimelineQuickColorSidebar } from '../components/TimelineQuickColorSidebar';
import { TimelineReviewStack } from '../components/TimelineReviewStack';
import { ActivityAttributeSummary } from '../components/ActivityAttributeSummary';
import { getLocalDateStr } from '../utils/dateUtils';
import { hasAutoCheckItemCompletionChanges, updateAutoCheckItems } from '../utils/autoCheckUtils';
import { applyDailyCheckActionForDate, buildDailyCheckItems, filterDailyCheckItemsByEnabledTemplates } from '../utils/dailyCheckUtils';
import { ensureQuickTodoCategory, isFutureTodoCategoryId } from '../utils/todoQuickCategoryUtils';
import { clampTimelineSidebarRatio } from '../utils/timelineSidebarRatioUtils';
import type { TimelineLayoutMode } from '../services/timelineLayoutService';

// Image Thumbnail Component
const TimelineImage: React.FC<{ filename: string, className?: string, useThumbnail?: boolean, refreshKey?: number }> = ({ filename, className = "w-16 h-16", useThumbnail = false, refreshKey = 0 }) => {
    const [src, setSrc] = useState<string>('');
    const [error, setError] = useState<string>('');
    const { isPrivacyMode } = usePrivacy();

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
                className={`w-full h-full object-cover ${isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'}`}
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
    timelineLayoutMode: TimelineLayoutMode;
    logs: Log[];
    categories: Category[];
    onAddLog: (startTime?: number, endTime?: number) => void;
    onEditLog: (log: Log) => void;
    onUpdateLog: (log: Log) => void; // Silent update (e.g. for reactions)
    onCreatePlannedLog: (todo: TodoItem, startTime: number, endTime: number) => Log;
    onCreateQuickColorLog: (target: TimelineQuickColorActivity, startTime: number, endTime: number) => Log;
    onStartTodoFocus?: (todo: TodoItem) => void;
    onDeletePlannedLog?: (log: Log) => void;
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
    autoLinkRules: AutoLinkRule[];
    scopes: Scope[];
    minIdleTimeThreshold?: number;
    onQuickPunch?: () => void;
    refreshKey?: number; // 添加refreshKey用于强制刷新图片
    activeSessions?: any[]; // 新增：正在进行的会话
    onNavigateToTodo?: (todo: TodoItem) => void; // 修改：直接传递待办对象
    onToggleTodoCompletion?: (todo: TodoItem) => void;
    onNavigateToGoal?: (goal: Goal) => void; // 新增：导航到目标详情
    // Daily Review
    dailyReview?: DailyReview;
    dailyReviews?: DailyReview[];
    checkTemplates?: CheckTemplate[];
    onUpdateDailyReview?: (review: DailyReview) => void;
    onOpenDailyReview?: () => void;
    onOpenOnThisDay?: (date: Date) => void;
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
        collectionNames?: string[];
        linkedScopeData?: { icon: string; uiIcon?: string; name: string }[]; // 添加 uiIcon 支持
    };
}

type SwipeAnimationDirection = 'next' | 'prev';
type DateTransitionSource = 'swipe' | 'calendar';
type DateTransitionState = {
    direction: SwipeAnimationDirection;
    source: DateTransitionSource;
};
type DateTransitionMotionCustom = {
    direction: SwipeAnimationDirection;
    distancePx: number;
    movingOpacity: number;
};

const DATE_TRANSITION_PRESETS: Record<DateTransitionSource, { durationMs: number; distancePx: number; movingOpacity: number }> = {
    swipe: { durationMs: 260, distancePx: 72, movingOpacity: 0.72 },
    calendar: { durationMs: 180, distancePx: 28, movingOpacity: 0.88 }
};

export const TimelineView: React.FC<TimelineViewProps> = ({ timelineLayoutMode, logs, todos, scopes, goals, onAddLog, onEditLog, onUpdateLog, onCreatePlannedLog, onCreateQuickColorLog, onStartTodoFocus, onDeletePlannedLog, categories, currentDate, onDateChange, onShowStats, onBatchAddLogs, onSync, isSyncing, todoCategories, onToast, autoLinkRules = [], minIdleTimeThreshold = 1, onQuickPunch, refreshKey = 0, activeSessions = [], onNavigateToTodo, onToggleTodoCompletion, onNavigateToGoal, dailyReview, dailyReviews = [], checkTemplates = [], onUpdateDailyReview, onOpenDailyReview, onOpenOnThisDay, onCreateDailyReviewSilently, templates = [], dailyReviewTime = '22:00', autoGenerateDailyReview = false, weeklyReviews = [], onOpenWeeklyReview, weeklyReviewTime = '0-2200', autoGenerateWeeklyReview = false, monthlyReviews = [], onOpenMonthlyReview, monthlyReviewTime = '0-2200', autoGenerateMonthlyReview = false, timelineGalleryMode = false, collapseThreshold = 9999 }) => {
    const { collections, collectionEntries } = useData();
    const { isPrivacyMode } = usePrivacy();
    const { backgroundUrl, hasBackground, panelOverlayOpacity } = useBackgroundDisplay();
    const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [copyFailureModal, setCopyFailureModal] = useState<{ isOpen: boolean; text: string }>({ isOpen: false, text: '' });
    const [sidebarTodoCategoryId, setSidebarTodoCategoryId] = useState<string | null>(null);
    const [isSidebarTodoListPickerOpen, setIsSidebarTodoListPickerOpen] = useState(false);
    const [isQuickColorSidebarCollapsed, setIsQuickColorSidebarCollapsed] = useState(true);
    const [selectedQuickColorTarget, setSelectedQuickColorTarget] = useState<TimelineQuickColorActivity | null>(null);
    const [isQuickColorContinuousMode, setIsQuickColorContinuousMode] = useState(false);
    const [isTimelineQuickActionsMenuOpen, setIsTimelineQuickActionsMenuOpen] = useState(false);
    const [timelineQuickActionsMenuPosition, setTimelineQuickActionsMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const timelineQuickActionsButtonRef = useRef<HTMLButtonElement | null>(null);
    const [showTimePalDebugger, setShowTimePalDebugger] = useState(false);
    const {
        isGalleryViewOpen,
        setIsGalleryViewOpen,
        setIsSearchOpen,
        setIsSearchOpenedFromSettings,
        setIsFiltersOpen,
        setActiveFilterId,
        setIsAchievementOpen,
        setIsSettingsOpen,
        setSettingsSubmenu,
        setSettingsSubmenuBackCloses,
        setCurrentView,
        setDailyCheckDetailId,
        setDailyChecksReturnTarget
    } = useNavigation();
    const {
        timelineStyleTheme,
        timelineStyleConfigs,
        timelineSortOrder,
        timelineQuickActions,
        timelineTodoSidebarCollapsed,
        setTimelineTodoSidebarCollapsed,
        timelineTodoSidebarRatio,
        setTimelineTodoSidebarRatio,
        timelineQuickColorSidebarRatio,
        setTimelineQuickColorSidebarRatio,
        themeMode,
        timelineStyleAdjusterOpen,
        setTimelineStyleAdjusterOpen
    } = useSettings();
    const timelineLayout = timelineLayoutMode;
    const timelineEntityLogs = useMemo(() => logs.filter((log) => log.isPlanned !== true), [logs]);
    const calendarLogs = timelineLayout === 'timeline-todo' ? logs : timelineEntityLogs;
    const timelineDateString = getLocalDateStr(currentDate);
    const isDarkMode = themeMode === 'dark' || (
        themeMode === 'system'
        && typeof window !== 'undefined'
        && window.matchMedia('(prefers-color-scheme: dark)').matches
    );
    const activeSidebarDailyReview = dailyReviews.find((review) => review.date === timelineDateString) || dailyReview;
    const sidebarTodoListOptions = useMemo(() => ensureQuickTodoCategory(todoCategories).filter((category) => !isFutureTodoCategoryId(category.id)), [todoCategories]);
    const sidebarTodoListLabel = sidebarTodoCategoryId
        ? sidebarTodoListOptions.find((category) => category.id === sidebarTodoCategoryId)?.name || '今日'
        : '今日';

    React.useEffect(() => {
        if (sidebarTodoCategoryId && !sidebarTodoListOptions.some((category) => category.id === sidebarTodoCategoryId)) {
            setSidebarTodoCategoryId(null);
        }
    }, [sidebarTodoCategoryId, sidebarTodoListOptions]);

    React.useEffect(() => {
        if (!selectedQuickColorTarget) return;
        const stillExists = categories.some((category) => (
            category.id === selectedQuickColorTarget.categoryId
            && category.activities.some((activity) => activity.id === selectedQuickColorTarget.activityId)
        ));
        if (!stillExists) setSelectedQuickColorTarget(null);
    }, [categories, selectedQuickColorTarget]);

    const isTimelineTodoSidebarOpen = !timelineTodoSidebarCollapsed && isQuickColorSidebarCollapsed;
    const isQuickColorSidebarOpen = !isQuickColorSidebarCollapsed;
    const timelineRightEdgeButtonClass = 'rounded-l-lg border border-r-0 border-stone-200 bg-[#fdfbf7]/95 p-2 text-stone-500 shadow-[-3px_2px_12px_rgba(28,25,23,0.08)] backdrop-blur-md transition-colors hover:bg-white hover:text-stone-800 dark:border-stone-700 dark:bg-stone-900/95 dark:hover:bg-stone-800 dark:hover:text-stone-100';

    const sidebarCheckItems = useMemo(() => {
        const sourceItems = activeSidebarDailyReview?.checkItems || buildDailyCheckItems(checkTemplates);
        const visibleItems = filterDailyCheckItemsByEnabledTemplates(sourceItems, checkTemplates);
        return updateAutoCheckItems(visibleItems, logs, { categories, scopes, todos, todoCategories }, currentDate);
    }, [activeSidebarDailyReview, categories, checkTemplates, currentDate, logs, scopes, todoCategories, todos]);

    React.useEffect(() => {
        if (timelineLayout !== 'timeline-todo' || !activeSidebarDailyReview || !onUpdateDailyReview) return;
        const previousItems = activeSidebarDailyReview.checkItems || [];
        const visiblePreviousItems = filterDailyCheckItemsByEnabledTemplates(previousItems, checkTemplates);
        const refreshedVisibleItems = updateAutoCheckItems(visiblePreviousItems, logs, { categories, scopes, todos, todoCategories }, currentDate);
        if (hasAutoCheckItemCompletionChanges(visiblePreviousItems, refreshedVisibleItems)) {
            const refreshedItemsById = new Map(refreshedVisibleItems.map((item) => [item.id, item]));
            const mergedItems = previousItems.map((item) => refreshedItemsById.get(item.id) || item);
            onUpdateDailyReview({ ...activeSidebarDailyReview, checkItems: mergedItems, updatedAt: Date.now() });
        }
    }, [activeSidebarDailyReview, categories, checkTemplates, currentDate, logs, onUpdateDailyReview, scopes, timelineLayout, todoCategories, todos]);

    const handleSidebarCheckItemClick = (item: CheckItem) => {
        if (item.type === 'auto' || !onUpdateDailyReview) return;
        const actionMode = item.manualMode === 'count'
            ? (item.isCompleted ? 'reset' : 'increment')
            : 'toggle';
        const result = applyDailyCheckActionForDate({
            dateStr: timelineDateString,
            dailyReviews,
            checkTemplates,
            reviewTemplates: templates,
            checkItemId: item.id,
            actionMode
        });
        if (result.updatedReview) {
            onUpdateDailyReview(result.updatedReview);
        }
    };

    const handleSelectQuickColorTarget = (target: TimelineQuickColorActivity) => {
        setSelectedQuickColorTarget(target);
        onToast('info', '已选择标签，请在左侧时间轴拖拽创建记录');
    };

    const handleCreateQuickColorLog = (target: TimelineQuickColorActivity, startTime: number, endTime: number) => {
        const log = onCreateQuickColorLog(target, startTime, endTime);
        if (!isQuickColorContinuousMode) {
            setSelectedQuickColorTarget(null);
        }
        return log;
    };

    const handleToggleTimelineTodoSidebar = () => {
        if (isTimelineTodoSidebarOpen) {
            setTimelineTodoSidebarCollapsed(true);
            return;
        }

        setIsQuickColorSidebarCollapsed(true);
        setTimelineTodoSidebarCollapsed(false);
    };

    const handleToggleQuickColorSidebar = () => {
        if (isQuickColorSidebarOpen) {
            setIsQuickColorSidebarCollapsed(true);
            return;
        }

        setIsSidebarTodoListPickerOpen(false);
        setTimelineTodoSidebarCollapsed(true);
        setIsQuickColorSidebarCollapsed(false);
    };

    const timelineWorkspaceRef = useRef<HTMLDivElement>(null);
    const timelineScheduleCanvasRef = useRef<TimelineScheduleCanvasHandle>(null);
    const sidebarResizeRef = useRef<{
        target: 'todo' | 'quick-color';
        startX: number;
        startValue: number;
        active: boolean;
        timerId: number | null;
    } | null>(null);
    const [isTimelineSidebarResizing, setIsTimelineSidebarResizing] = useState(false);

    const clearSidebarResize = () => {
        const session = sidebarResizeRef.current;
        if (session && session.timerId !== null) {
            window.clearTimeout(session.timerId);
        }
        sidebarResizeRef.current = null;
        setIsTimelineSidebarResizing(false);
    };

    const handleSidebarDividerPointerDown = (target: 'todo' | 'quick-color', event: React.PointerEvent<HTMLDivElement>) => {
        if (target === 'todo' && !isTimelineTodoSidebarOpen) return;
        if (target === 'quick-color' && !isQuickColorSidebarOpen) return;
        const session = {
            target,
            startX: event.clientX,
            startValue: target === 'todo' ? timelineTodoSidebarRatio : timelineQuickColorSidebarRatio,
            active: false,
            timerId: null as number | null
        };
        sidebarResizeRef.current = session;
        event.currentTarget.setPointerCapture(event.pointerId);
        session.timerId = window.setTimeout(() => {
            if (sidebarResizeRef.current === session) {
                session.active = true;
                setIsTimelineSidebarResizing(true);
            }
        }, 300);
    };

    const handleSidebarDividerPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const session = sidebarResizeRef.current;
        if (!session) return;

        if (!session.active) {
            if (Math.abs(event.clientX - session.startX) > 5) {
                clearSidebarResize();
            }
            return;
        }

        event.preventDefault();
        const workspaceBounds = timelineWorkspaceRef.current?.getBoundingClientRect();
        if (!workspaceBounds || workspaceBounds.width <= 0) return;
        const nextRatio = clampTimelineSidebarRatio(
            (workspaceBounds.right - event.clientX) / workspaceBounds.width,
            session.startValue
        );

        if (session.target === 'todo') {
            setTimelineTodoSidebarRatio(nextRatio);
            return;
        }

        setTimelineQuickColorSidebarRatio(nextRatio);
    };

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

    const { openAIChat, unreadCount } = useAIChatWindow();

    // 计算时间线样式偏移量
    const currentStyleConfig = timelineStyleConfigs[timelineStyleTheme];
    const railOffsetX = currentStyleConfig.railOffsetX || 0;
    const timeNodeOffsetY = currentStyleConfig.timeNodeOffsetY || 0;
    const quickActionMap: Record<TimelineQuickActionKey, { label: string; title: string; icon: React.ReactNode; onClick: (event?: React.MouseEvent) => void; disabled?: boolean }> = {
        search: {
            label: '搜索',
            title: '搜索',
            icon: <Search size={20} />,
            onClick: () => {
                setIsSearchOpenedFromSettings(false);
                setIsSearchOpen(true);
            }
        },
        filters: {
            label: '全部筛选器',
            title: '全部筛选器',
            icon: <Filter size={20} />,
            onClick: () => {
                setActiveFilterId(null);
                setIsFiltersOpen(true);
            }
        },
        stats: {
            label: '统计视图',
            title: '统计视图',
            icon: <BarChart2 size={20} />,
            onClick: onShowStats
        },
        gallery: {
            label: '画廊',
            title: '画廊',
            icon: <ImageIcon size={20} />,
            onClick: () => setIsGalleryViewOpen(true)
        },
        achievement: {
            label: '成就瓶',
            title: '成就瓶',
            icon: <FlaskConical size={20} />,
            onClick: () => setIsAchievementOpen(true)
        },
        daily_checks: {
            label: '日课总览',
            title: '日课总览',
            icon: <ListTodo size={20} />,
            onClick: () => {
                setDailyChecksReturnTarget('timeline');
                setDailyCheckDetailId(null);
                setCurrentView(AppView.DAILY_CHECKS);
            }
        },
        collections: {
            label: 'Collections',
            title: 'Collections',
            icon: <Star size={20} />,
            onClick: () => {
                setIsSettingsOpen(true);
                setSettingsSubmenu('collections');
                setSettingsSubmenuBackCloses(true);
            }
        },
        principle: {
            label: '原则库',
            title: '原则库',
            icon: <BookOpen size={20} />,
            onClick: () => {
                setIsSettingsOpen(true);
                setSettingsSubmenu('principle');
                setSettingsSubmenuBackCloses(true);
            }
        },
        sync: {
            label: '同步',
            title: isSyncing ? '同步中' : '同步',
            icon: <RefreshCw size={20} className={isSyncing ? 'animate-spin text-purple-500' : ''} />,
            onClick: (event) => onSync(event),
            disabled: isSyncing
        }
    };
    const configuredQuickActions = timelineQuickActions
        .map((actionKey) => quickActionMap[actionKey])
        .filter(Boolean);
    const moreQuickActions = TIMELINE_QUICK_ACTION_OPTIONS
        .filter((option) => !timelineQuickActions.includes(option.key))
        .map((option) => ({ option, action: quickActionMap[option.key] }))
        .filter((item) => Boolean(item.action));

    React.useLayoutEffect(() => {
        if (!isTimelineQuickActionsMenuOpen) {
            return;
        }

        const updateMenuPosition = () => {
            const button = timelineQuickActionsButtonRef.current;
            if (!button) {
                return;
            }

            const rect = button.getBoundingClientRect();
            const menuWidth = 208;
            const viewportPadding = 8;
            const left = Math.min(
                Math.max(viewportPadding, rect.left),
                Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding)
            );
            setTimelineQuickActionsMenuPosition({ top: rect.bottom + 8, left });
        };

        updateMenuPosition();
        window.addEventListener('resize', updateMenuPosition);
        window.addEventListener('scroll', updateMenuPosition, true);

        return () => {
            window.removeEventListener('resize', updateMenuPosition);
            window.removeEventListener('scroll', updateMenuPosition, true);
        };
    }, [isTimelineQuickActionsMenuOpen]);

    const logCollectionNames = useMemo(() => {
        const collectionById = new Map(collections.map((collection) => [collection.id, collection]));
        const collectionIdsByLogId = new Map<string, string[]>();

        collectionEntries.forEach((entry) => {
            if (entry.itemType !== 'log') {
                return;
            }

            const current = collectionIdsByLogId.get(entry.itemId) || [];
            current.push(entry.collectionId);
            collectionIdsByLogId.set(entry.itemId, current);
        });

        const namesByLogId = new Map<string, string[]>();
        collectionIdsByLogId.forEach((collectionIds, logId) => {
            const orderedNames = Array.from(new Set(collectionIds))
                .map((collectionId) => collectionById.get(collectionId))
                .filter((collection): collection is NonNullable<typeof collection> => Boolean(collection))
                .map((collection) => collection.name.trim())
                .filter(Boolean);

            if (orderedNames.length > 0) {
                namesByLogId.set(logId, orderedNames);
            }
        });

        return namesByLogId;
    }, [collectionEntries, collections]);

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

        // 周一作为一周的开始 (1-0: 周一到周日)
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStart = makeDate(current, -daysFromMonday);
        weekEnd = makeDate(weekStart, 6); // 周日是最后一天

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
    }, [currentDate, weeklyReviews, onOpenWeeklyReview, weeklyReviewTime, autoGenerateWeeklyReview]);

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
    const [dateTransition, setDateTransition] = useState<DateTransitionState | null>(null);
    const [isDateTransitioning, setIsDateTransitioning] = useState(false);

    // 最小滑动距离（像素）- 防止误触
    const minSwipeDistance = 100;


    const startDateTransition = React.useCallback((targetDate: Date, source: DateTransitionSource) => {
        if (isDateTransitioning) {
            return;
        }

        const normalizedTargetDate = new Date(targetDate);
        const isTargetSameDay = currentDate.getFullYear() === normalizedTargetDate.getFullYear()
            && currentDate.getMonth() === normalizedTargetDate.getMonth()
            && currentDate.getDate() === normalizedTargetDate.getDate();

        if (isTargetSameDay) {
            return;
        }

        const direction = normalizedTargetDate.getTime() > currentDate.getTime() ? 'next' : 'prev';
        setIsDateTransitioning(true);
        setDateTransition({
            direction,
            source
        });
        onDateChange(normalizedTargetDate);
    }, [currentDate, isDateTransitioning, onDateChange]);

    const startSwipeDateTransition = React.useCallback((dayOffset: number) => {
        const targetDate = new Date(currentDate);
        targetDate.setDate(targetDate.getDate() + dayOffset);
        startDateTransition(targetDate, 'swipe');
    }, [currentDate, startDateTransition]);

    const handleCalendarDateChange = React.useCallback((targetDate: Date) => {
        startDateTransition(targetDate, 'calendar');
    }, [startDateTransition]);

    const onTouchStart = (e: React.TouchEvent) => {
        if (timelineLayout === 'timeline-todo' || isDateTransitioning) {
            return;
        }

        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (timelineLayout === 'timeline-todo' || isDateTransitioning) {
            return;
        }

        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (timelineLayout === 'timeline-todo' || isDateTransitioning) {
            setTouchStart(null);
            setTouchEnd(null);
            return;
        }

        if (!touchStart || !touchEnd) {
            setTouchStart(null);
            setTouchEnd(null);
            return;
        }

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            // 向左滑动 = 下一天 (Next Day)
            startSwipeDateTransition(1);
        } else if (isRightSwipe) {
            // 向右滑动 = 上一天 (Previous Day)
            startSwipeDateTransition(-1);
        }

        setTouchStart(null);
        setTouchEnd(null);
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

    const currentDateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const currentTransitionPreset = dateTransition
        ? DATE_TRANSITION_PRESETS[dateTransition.source]
        : null;
    const transitionMotionCustom: DateTransitionMotionCustom | null = currentTransitionPreset && dateTransition
        ? {
            direction: dateTransition.direction,
            distancePx: currentTransitionPreset.distancePx,
            movingOpacity: currentTransitionPreset.movingOpacity
        }
        : null;

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
        const dayLogs = timelineEntityLogs.filter(log => {
            return log.startTime < endOfDay.getTime() && log.endTime > startOfDay.getTime();
        }).sort((a, b) => timelineSortOrder === 'asc' ? a.startTime - b.startTime : b.startTime - a.startTime);

        const items: TimelineItem[] = [];
        const thresholdSeconds = (minIdleTimeThreshold || 1) * 60;

        // ASC: Check for gap at start of day (00:00 -> First Log)
        if (timelineSortOrder === 'asc' && dayLogs.length > 0) {
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
            const collectionNames = logCollectionNames.get(currentLog.id) || [];
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
                    categoryColor: category ? toCssColor(category.themeColor || '', 'fill') : '#a8a29e',
                    linkedTodoTitle: linkedTodo?.title,
                    linkedTodo: linkedTodo, // 传递完整的待办对象
                    collectionNames,
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

            if (timelineSortOrder === 'asc' && i < dayLogs.length - 1) {
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
            } else if (timelineSortOrder === 'desc' && i < dayLogs.length - 1) {
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
        if (timelineSortOrder === 'desc' && dayLogs.length > 0) {
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
    }, [timelineEntityLogs, currentDate, todos, categories, scopes, timelineSortOrder, logCollectionNames, minIdleTimeThreshold]);

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

    const dailySyncedCheckSections = useMemo(() => {
        if (!dailyReview?.checkItems || !dailyReview.checkCategorySyncToTimeline) {
            return [];
        }

        const groupedItems: Record<string, typeof dailyReview.checkItems> = {};
        dailyReview.checkItems.forEach((item) => {
            const category = item.category || '默认';
            if (!groupedItems[category]) {
                groupedItems[category] = [];
            }
            groupedItems[category].push(item);
        });

        return Object.entries(groupedItems)
            .filter(([category]) => dailyReview.checkCategorySyncToTimeline?.[category])
            .map(([category, items]) => ({ category, items }));
    }, [dailyReview]);

    const dailySyncedTemplates = useMemo(() => {
        if (!dailyReview?.templateSnapshot) {
            return [];
        }

        return dailyReview.templateSnapshot.filter((template) => {
            return template.syncToTimeline && template.questions.some((question) =>
                dailyReview.answers?.some((answer) => answer.questionId === question.id && answer.answer) ||
                (question.type === 'rating' && dailyReview.answers?.some((answer) => answer.questionId === question.id))
            );
        });
    }, [dailyReview]);

    const weeklySyncedTemplates = useMemo(() => {
        if (!weeklyReviewData.weeklyReview?.templateSnapshot) {
            return [];
        }

        return weeklyReviewData.weeklyReview.templateSnapshot.filter((template) => {
            return template.syncToTimeline && template.questions.some((question) =>
                weeklyReviewData.weeklyReview!.answers?.some((answer) => answer.questionId === question.id && answer.answer) ||
                (question.type === 'rating' && weeklyReviewData.weeklyReview!.answers?.some((answer) => answer.questionId === question.id))
            );
        });
    }, [weeklyReviewData]);

    const monthlySyncedTemplates = useMemo(() => {
        if (!monthlyReviewData.monthlyReview?.templateSnapshot) {
            return [];
        }

        return monthlyReviewData.monthlyReview.templateSnapshot.filter((template) => {
            return template.syncToTimeline && template.questions.some((question) =>
                monthlyReviewData.monthlyReview!.answers?.some((answer) => answer.questionId === question.id && answer.answer) ||
                (question.type === 'rating' && monthlyReviewData.monthlyReview!.answers?.some((answer) => answer.questionId === question.id))
            );
        });
    }, [monthlyReviewData]);

    const timelineStaticNodeIds = useMemo(() => {
        const ids: string[] = [];

        if (completedTodosToday.length > 0) {
            ids.push('completed-todos');
        }

        if (goalsExpiredToday.length > 0) {
            ids.push('expired-goals');
        }

        if (shouldShowReviewNode && onOpenDailyReview) {
            ids.push('daily-review-entry');
        }

        dailySyncedCheckSections.forEach(({ category }) => {
            ids.push(`daily-check-${category}`);
        });

        dailySyncedTemplates.forEach((template) => {
            ids.push(`daily-template-${template.id}`);
        });

        if (weeklyReviewData.shouldShow) {
            ids.push('weekly-review-entry');
        }

        weeklySyncedTemplates.forEach((template) => {
            ids.push(`weekly-template-${template.id}`);
        });

        if (monthlyReviewData.shouldShow) {
            ids.push('monthly-review-entry');
        }

        monthlySyncedTemplates.forEach((template) => {
            ids.push(`monthly-template-${template.id}`);
        });

        return ids;
    }, [
        completedTodosToday.length,
        goalsExpiredToday.length,
        shouldShowReviewNode,
        onOpenDailyReview,
        dailySyncedCheckSections,
        dailySyncedTemplates,
        weeklyReviewData.shouldShow,
        weeklySyncedTemplates,
        monthlyReviewData.shouldShow,
        monthlySyncedTemplates
    ]);

    const customRailLineVisibility = useMemo(() => {
        const orderedIds = [...dayTimeline.map((item) => item.id), ...timelineStaticNodeIds];

        return orderedIds.reduce((map, id, index) => {
            map.set(id, index < orderedIds.length - 1);
            return map;
        }, new Map<string, boolean>());
    }, [dayTimeline, timelineStaticNodeIds]);

    const shouldShowCustomRailLine = React.useCallback((nodeId: string) => {
        return customRailLineVisibility.get(nodeId) ?? false;
    }, [customRailLineVisibility]);

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

        return timelineEntityLogs.some(log => log.startTime >= start.getTime() && log.startTime <= end.getTime());
    };

    const handleExport = () => {
        // 1. Filter Logs
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);

        const dayLogs = timelineEntityLogs.filter(log => {
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
            if (log.moodScore && log.moodScore > 0) text += ` ❤️${log.moodScore}`;

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

    let styledLogIndex = 0;

    return (
        <div
            className="h-full flex flex-col relative isolate text-stone-900"
            style={{ backgroundColor: hasBackground ? 'transparent' : '#faf9f6' }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {hasBackground && (
                <div
                    className="absolute inset-0 -z-20"
                    style={{
                        backgroundImage: `url(${backgroundUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        transform: 'translateZ(0)'
                    }}
                />
            )}
            <div
                className="page-background-overlay absolute inset-0 -z-10"
                style={{ backgroundColor: `rgba(250, 249, 246, ${panelOverlayOpacity})` }}
            />


            {/* Header & Calendar Container */}
            <div className="flex flex-col shrink-0">

                <CalendarWidget
                    currentDate={currentDate}
                    onDateChange={handleCalendarDateChange}
                    logs={calendarLogs}
                    isExpanded={isCalendarExpanded}
                    onExpandToggle={() => setIsCalendarExpanded(!isCalendarExpanded)}
                    galleryMode={timelineGalleryMode}
                    todos={todos}
                    extraHeaderControls={
                        <>
                            <div className="relative">
                                <button
                                    type="button"
                                    ref={timelineQuickActionsButtonRef}
                                    onClick={() => setIsTimelineQuickActionsMenuOpen((open) => !open)}
                                    className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                                    title="更多"
                                    aria-label="更多快捷操作"
                                    aria-haspopup="menu"
                                    aria-expanded={isTimelineQuickActionsMenuOpen}
                                >
                                    <MoreHorizontal size={20} />
                                </button>
                                {false && isTimelineQuickActionsMenuOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-[100]"
                                            onClick={() => setIsTimelineQuickActionsMenuOpen(false)}
                                        />
                                        <div
                                            role="menu"
                                            aria-label="更多快捷操作"
                                            className="absolute left-0 top-full z-[110] mt-2 flex w-52 flex-col overflow-hidden rounded-xl border border-stone-100 bg-white py-1 shadow-xl animate-in fade-in zoom-in-95 duration-200 origin-top-left"
                                        >
                                            {moreQuickActions.map(({ option, action }) => (
                                                <button
                                                    key={option.key}
                                                    type="button"
                                                    role="menuitem"
                                                    disabled={action.disabled}
                                                    onClick={(event) => {
                                                        setIsTimelineQuickActionsMenuOpen(false);
                                                        action.onClick(event);
                                                    }}
                                                    className="flex w-full items-center px-3 py-2.5 text-left text-sm text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <span className="truncate">{action.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            {configuredQuickActions.map((action) => (
                                <button
                                    key={action.label}
                                    onClick={(event) => action.onClick(event)}
                                    disabled={action.disabled}
                                    className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                                    title={action.title}
                                >
                                    {action.icon}
                                </button>
                            ))}
                        </>
                    }
                />

                {isTimelineQuickActionsMenuOpen && timelineQuickActionsMenuPosition && typeof document !== 'undefined' && createPortal(
                    <>
                        <div
                            className="fixed inset-0 z-[9998]"
                            onClick={() => setIsTimelineQuickActionsMenuOpen(false)}
                        />
                        <div
                            role="menu"
                            aria-label="鏇村蹇嵎鎿嶄綔"
                            style={{ top: timelineQuickActionsMenuPosition.top, left: timelineQuickActionsMenuPosition.left }}
                            className="fixed z-[9999] flex w-52 max-h-[min(70vh,24rem)] flex-col overflow-y-auto overflow-x-hidden rounded-xl border border-stone-100 bg-white py-1 shadow-xl animate-in fade-in zoom-in-95 duration-200 origin-top-left"
                        >
                            {moreQuickActions.map(({ option, action }) => (
                                <button
                                    key={option.key}
                                    type="button"
                                    role="menuitem"
                                    disabled={action.disabled}
                                    onClick={(event) => {
                                        setIsTimelineQuickActionsMenuOpen(false);
                                        action.onClick(event);
                                    }}
                                    className="flex w-full items-center px-3 py-2.5 text-left text-sm text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <span className="truncate">{action.label}</span>
                                </button>
                            ))}
                        </div>
                    </>,
                    document.body
                )}


            </div>

            {/* Timeline List */}
            <div 
                ref={scrollContainerRef}
                className={timelineLayout === 'timeline-todo' ? 'hidden' : 'flex-1 overflow-y-auto overflow-x-hidden px-7 py-6 pb-24 no-scrollbar'}
                id="timeline-content"
            >
                <div
                    className={isDateTransitioning ? 'pointer-events-none select-none' : ''}
                    style={{ display: 'grid' }}
                >
                    <AnimatePresence
                        initial={false}
                        mode="sync"
                        custom={transitionMotionCustom}
                        onExitComplete={() => {
                            setIsDateTransitioning(false);
                            setDateTransition(null);
                        }}
                    >
                        <motion.div
                            key={currentDateKey}
                            custom={transitionMotionCustom}
                            variants={{
                                initial: (custom: DateTransitionMotionCustom | null) => {
                                    if (!custom) {
                                        return { opacity: 1, x: 0 };
                                    }

                                    return {
                                        opacity: custom.movingOpacity,
                                        x: custom.direction === 'next' ? custom.distancePx : -custom.distancePx
                                    };
                                },
                                animate: { opacity: 1, x: 0 },
                                exit: (custom: DateTransitionMotionCustom | null) => {
                                    if (!custom) {
                                        return { opacity: 1, x: 0 };
                                    }

                                    return {
                                        opacity: custom.movingOpacity,
                                        x: custom.direction === 'next' ? -custom.distancePx : custom.distancePx
                                    };
                                }
                            }}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={{
                                duration: (currentTransitionPreset?.durationMs ?? 0) / 1000,
                                ease: [0.22, 1, 0.36, 1]
                            }}
                            style={{ gridArea: '1 / 1' }}
                        >
                            <div className={`relative ml-[70px] space-y-6`}>
                    {/* default 主题的竖线 */}
                    {timelineStyleTheme === 'default' && (
                        <div className="absolute left-0 top-0 bottom-0 w-[1px] border-l border-stone-300 pointer-events-none" />
                    )}
                    
                    {/* 时光小友卡片 */}
                    <div className="pl-8 -ml-[70px] mb-6">
                        <TimePalCard 
                            logs={timelineEntityLogs}
                            currentDate={currentDate}
                            categories={categories}
                            activeSessions={activeSessions}
                        />
                    </div>

                    {dayTimeline.map((item) => {
                        if (item.type === 'log' && item.logData) {
                            const currentStyledLogIndex = styledLogIndex++;
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

                                    <TimelineStyleRail
                                        theme={timelineStyleTheme}
                                        config={timelineStyleConfigs[timelineStyleTheme]}
                                        index={currentStyledLogIndex}
                                        showLine={shouldShowCustomRailLine(item.id)}
                                    />

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
                                                <span className="text-sm font-bold text-stone-400 font-mono inline-flex items-center gap-0.5">
                                                    <Zap size={12} fill="currentColor" strokeWidth={0} className="align-middle" />
                                                    <span className="align-middle">{item.logData.focusScore}</span>
                                                </span>
                                            )}

                                            {item.logData.moodScore && item.logData.moodScore > 0 && (
                                                <span className="text-sm font-bold text-stone-400 font-mono inline-flex items-center gap-0.5">
                                                    <Heart size={12} fill="currentColor" strokeWidth={0} className="align-middle" />
                                                    <span className="align-middle">{item.logData.moodScore}</span>
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

                                        <ActivityAttributeSummary
                                            activity={item.logData.activity}
                                            values={item.logData.attributeValues}
                                        />

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

                                            {item.logData.collectionNames?.map((collectionName) => (
                                                <span
                                                    key={`${item.id}-collection-${collectionName}`}
                                                    className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30"
                                                >
                                                    <span className="text-stone-400 font-bold">◬</span>
                                                    <span className="line-clamp-1">{collectionName}</span>
                                                </span>
                                            ))}

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

                                    {timelineStyleTheme === 'default' && (
                                        <div className="absolute left-0 top-0 bottom-0 w-[1px] -ml-[0.5px] border-l border-dashed border-stone-300" />
                                    )}

                                    {timelineStyleTheme !== 'default' && (
                                        <TimelineStyleRail
                                            theme={timelineStyleTheme}
                                            config={timelineStyleConfigs[timelineStyleTheme]}
                                            index={0}
                                            showLine={true}
                                            showNode={false}
                                            extendLinePastContainer={shouldShowCustomRailLine(item.id)}
                                        />
                                    )}

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

                            {timelineStyleTheme !== 'default' && (
                                <TimelineStyleRail
                                    theme={timelineStyleTheme}
                                    config={timelineStyleConfigs[timelineStyleTheme]}
                                    index={0}
                                    showLine={true}
                                    showNode={false}
                                    extendLinePastContainer={shouldShowCustomRailLine('completed-todos')}
                                />
                            )}

                            {/* Timeline Dot */}
                            <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-stone-300 border-2 border-[#faf9f6] z-10" style={{ marginLeft: `${railOffsetX}px` }} />

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
                                                {formatCompletedTodoLabel(todos, todo)}
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

                            {timelineStyleTheme !== 'default' && (
                                <TimelineStyleRail
                                    theme={timelineStyleTheme}
                                    config={timelineStyleConfigs[timelineStyleTheme]}
                                    index={0}
                                    showLine={true}
                                    showNode={false}
                                    extendLinePastContainer={shouldShowCustomRailLine('expired-goals')}
                                />
                            )}

                            {/* Timeline Dot */}
                            <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-stone-300 border-2 border-[#faf9f6] z-10" style={{ marginLeft: `${railOffsetX}px` }} />

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

                                    {timelineStyleTheme !== 'default' && (
                                        <TimelineStyleRail
                                            theme={timelineStyleTheme}
                                            config={timelineStyleConfigs[timelineStyleTheme]}
                                            index={0}
                                            showLine={true}
                                            showNode={false}
                                            extendLinePastContainer={shouldShowCustomRailLine('daily-review-entry')}
                                        />
                                    )}

                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-[#faf9f6] z-10" style={{ marginLeft: `${railOffsetX}px` }} />

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
                            {dailySyncedCheckSections.map(({ category, items }) => (
                                    <div key={category} className="relative pl-8 mt-6 animate-in slide-in-from-bottom-2 duration-500">
                                        {/* Time Marker - Category Title */}
                                        <div className="absolute -left-[60px] top-0.5 w-[45px] text-right flex flex-col items-end">
                                            <span className="text-xs font-bold text-stone-500 leading-tight">
                                                {category}
                                            </span>
                                        </div>

                                        {timelineStyleTheme !== 'default' && (
                                            <TimelineStyleRail
                                                theme={timelineStyleTheme}
                                                config={timelineStyleConfigs[timelineStyleTheme]}
                                                index={0}
                                                showLine={true}
                                                showNode={false}
                                                extendLinePastContainer={shouldShowCustomRailLine(`daily-check-${category}`)}
                                            />
                                        )}

                                        {/* Timeline Dot */}
                                        <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-stone-300 border-2 border-[#faf9f6] z-10" style={{ marginLeft: `${railOffsetX}px` }} />

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
                                                    {/* Icon */}
                                                    {(item.icon || item.uiIcon) && (
                                                        <span className="shrink-0">
                                                            <IconRenderer 
                                                                icon={item.icon || ''} 
                                                                uiIcon={item.uiIcon}
                                                                size={12}
                                                            />
                                                        </span>
                                                    )}
                                                    <span className={`text-sm leading-tight ${
                                                        item.isCompleted
                                                            ? 'text-stone-400 line-through'
                                                            : 'text-stone-600'
                                                    }`}>
                                                        {item.content}
                                                        {item.type !== 'auto' && item.manualMode === 'count' && (
                                                            <span className="ml-1 text-xs">
                                                                (
                                                                {Math.min(
                                                                    Math.max(0, Math.floor(typeof item.currentCount === 'number' ? item.currentCount : (item.isCompleted ? Math.max(1, Math.floor(item.targetCount || 1)) : 0))),
                                                                    Math.max(1, Math.floor(item.targetCount || 1))
                                                                )}
                                                                /
                                                                {Math.max(1, Math.floor(item.targetCount || 1))}
                                                                次)
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                            {/* Synced Template Content (Daily) - Using Snapshot */}
                            {dailySyncedTemplates.map((template) => {
                                return (
                                    <div key={template.id} className="relative pl-8 mt-6 animate-in slide-in-from-bottom-2 duration-500">
                                        {/* Time Marker - Template Title */}
                                        <div className="absolute -left-[60px] top-0.5 w-[45px] text-right flex flex-col items-end">
                                            <span className="text-xs font-bold text-stone-500 leading-tight">
                                                {template.title.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u, '')}
                                            </span>
                                        </div>

                                        {timelineStyleTheme !== 'default' && (
                                            <TimelineStyleRail
                                                theme={timelineStyleTheme}
                                                config={timelineStyleConfigs[timelineStyleTheme]}
                                                index={0}
                                                showLine={true}
                                                showNode={false}
                                                extendLinePastContainer={shouldShowCustomRailLine(`daily-template-${template.id}`)}
                                            />
                                        )}

                                        {/* Timeline Dot */}
                                        <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-stone-300 border-2 border-[#faf9f6] z-10" style={{ marginLeft: `${railOffsetX}px` }} />

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

                                {timelineStyleTheme !== 'default' && (
                                    <TimelineStyleRail
                                        theme={timelineStyleTheme}
                                        config={timelineStyleConfigs[timelineStyleTheme]}
                                        index={0}
                                        showLine={true}
                                        showNode={false}
                                        extendLinePastContainer={shouldShowCustomRailLine('weekly-review-entry')}
                                    />
                                )}

                                {/* Timeline Dot */}
                                <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-purple-400 border-2 border-[#faf9f6] z-10" style={{ marginLeft: `${railOffsetX}px` }} />

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
                            {weeklySyncedTemplates.map((template) => {
                                return (
                                    <div key={template.id} className="relative pl-8 mt-6 animate-in slide-in-from-bottom-2 duration-500">
                                        {/* Time Marker - Template Title */}
                                        <div className="absolute -left-[60px] top-0.5 w-[45px] text-right flex flex-col items-end">
                                            <span className="text-xs font-bold text-stone-500 leading-tight">
                                                {template.title.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u, '')}
                                            </span>
                                        </div>

                                        {timelineStyleTheme !== 'default' && (
                                            <TimelineStyleRail
                                                theme={timelineStyleTheme}
                                                config={timelineStyleConfigs[timelineStyleTheme]}
                                                index={0}
                                                showLine={true}
                                                showNode={false}
                                                extendLinePastContainer={shouldShowCustomRailLine(`weekly-template-${template.id}`)}
                                            />
                                        )}

                                        {/* Timeline Dot */}
                                        <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-stone-300 border-2 border-[#faf9f6] z-10" style={{ marginLeft: `${railOffsetX}px` }} />

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

                                {timelineStyleTheme !== 'default' && (
                                    <TimelineStyleRail
                                        theme={timelineStyleTheme}
                                        config={timelineStyleConfigs[timelineStyleTheme]}
                                        index={0}
                                        showLine={true}
                                        showNode={false}
                                        extendLinePastContainer={shouldShowCustomRailLine('monthly-review-entry')}
                                    />
                                )}

                                {/* Timeline Dot */}
                                <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-pink-400 border-2 border-[#faf9f6] z-10" style={{ marginLeft: `${railOffsetX}px` }} />

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
                            {monthlySyncedTemplates.map((template) => {
                                return (
                                    <div key={template.id} className="relative pl-8 mt-6 animate-in slide-in-from-bottom-2 duration-500">
                                        {/* Time Marker - Template Title */}
                                        <div className="absolute -left-[60px] top-0.5 w-[45px] text-right flex flex-col items-end">
                                            <span className="text-xs font-bold text-stone-500 leading-tight">
                                                {template.title.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u, '')}
                                            </span>
                                        </div>

                                        {timelineStyleTheme !== 'default' && (
                                            <TimelineStyleRail
                                                theme={timelineStyleTheme}
                                                config={timelineStyleConfigs[timelineStyleTheme]}
                                                index={0}
                                                showLine={true}
                                                showNode={false}
                                                extendLinePastContainer={shouldShowCustomRailLine(`monthly-template-${template.id}`)}
                                            />
                                        )}

                                        {/* Timeline Dot */}
                                        <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-stone-300 border-2 border-[#faf9f6] z-10" style={{ marginLeft: `${railOffsetX}px` }} />

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
                        </motion.div>
                    </AnimatePresence>
                </div>


                {/* This Day in Previous Years */}
                {(() => {
                    const currentMonth = currentDate.getMonth();
                    const currentDay = currentDate.getDate();
                    const currentYear = currentDate.getFullYear();

                    // Find all unique years (except current year) that have logs on this month/day
                    const yearsWithLogs = timelineEntityLogs.reduce((years, log) => {
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
                    <div className="mt-6 space-y-2">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors text-xs font-medium"
                        >
                            <Share size={14} />
                            <span>导出当日时间轴</span>
                        </button>
                        <button
                            onClick={() => onOpenOnThisDay?.(currentDate)}
                            className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors text-xs font-medium"
                        >
                            <Clock size={14} />
                            <span>打开 On This Day</span>
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

            {timelineLayout === 'timeline-todo' && (
                <div ref={timelineWorkspaceRef} className="min-h-0 flex flex-1 overflow-hidden">
                    <TimelineScheduleCanvas
                        ref={timelineScheduleCanvasRef}
                        currentDate={currentDate}
                        logs={logs}
                        categories={categories}
                        scopes={scopes}
                        todos={todos}
                        isDarkMode={isDarkMode}
                        minIdleTimeThreshold={minIdleTimeThreshold}
                        onAddLog={onAddLog}
                        onEditLog={onEditLog}
                        onUpdateLog={onUpdateLog}
                        onCreatePlannedLog={onCreatePlannedLog}
                        quickColorSelection={isQuickColorSidebarOpen ? selectedQuickColorTarget : null}
                        onCreateQuickColorLog={handleCreateQuickColorLog}
                        onStartPlannedTodo={(todo) => onStartTodoFocus?.(todo)}
                        onDeletePlannedLog={(log) => onDeletePlannedLog?.(log)}
                    />
                    {isTimelineTodoSidebarOpen && (
                        <>
                            <div
                                role="separator"
                                aria-label="长按后拖动以调整待办栏宽度"
                                aria-orientation="vertical"
                                onPointerDown={(event) => handleSidebarDividerPointerDown('todo', event)}
                                onPointerMove={handleSidebarDividerPointerMove}
                                onPointerUp={clearSidebarResize}
                                onPointerCancel={clearSidebarResize}
                                className={`group relative z-20 w-2 shrink-0 touch-none cursor-col-resize ${isTimelineSidebarResizing ? 'bg-stone-300/80 dark:bg-stone-600/80' : 'bg-transparent hover:bg-stone-200/60 dark:hover:bg-stone-700/60'}`}
                            >
                                <span className={`absolute inset-y-0 left-1/2 w-px -translate-x-1/2 ${isTimelineSidebarResizing ? 'bg-stone-500 dark:bg-stone-300' : 'bg-stone-200/80 dark:bg-stone-700'}`} />
                            </div>
                            <TimelineTodoSidebar
                                todos={todos}
                                logs={logs}
                                checkItems={sidebarCheckItems}
                                currentDate={currentDate}
                                ratio={timelineTodoSidebarRatio}
                                selectedCategoryId={sidebarTodoCategoryId}
                                selectedListLabel={sidebarTodoListLabel}
                                reviewSlot={(
                                    <TimelineReviewStack
                                        dailyReview={activeSidebarDailyReview}
                                        weeklyReview={weeklyReviewData.weeklyReview}
                                        monthlyReview={monthlyReviewData.monthlyReview}
                                        showWeekly={weeklyReviewData.isLastDayOfWeek}
                                        showMonthly={monthlyReviewData.isLastDayOfMonth}
                                        onOpenDaily={() => onOpenDailyReview?.()}
                                        onOpenWeekly={() => onOpenWeeklyReview?.(weeklyReviewData.weekStart, weeklyReviewData.weekEnd)}
                                        onOpenMonthly={() => onOpenMonthlyReview?.(monthlyReviewData.monthStart, monthlyReviewData.monthEnd)}
                                    />
                                )}
                                onSelectTodo={(todo) => onNavigateToTodo?.(todo)}
                                onToggleTodoCompletion={(todo) => onToggleTodoCompletion?.(todo)}
                                onCheckItemClick={handleSidebarCheckItemClick}
                                onTodoDragMove={(todo, clientX, clientY) => timelineScheduleCanvasRef.current?.previewTodoDropAtClientPoint(todo, clientX, clientY) ?? false}
                                onTodoDragEnd={() => timelineScheduleCanvasRef.current?.clearTodoDropPreview()}
                                onTodoDrop={(todo, clientX, clientY) => {
                                    const didCreatePlan = timelineScheduleCanvasRef.current?.dropTodoAtClientPoint(todo, clientX, clientY) ?? false;
                                    if (didCreatePlan) onToast('success', '计划已创建');
                                    return didCreatePlan;
                                }}
                            />
                        </>
                    )}
                    {isQuickColorSidebarOpen && (
                        <>
                            <div
                                role="separator"
                                aria-label="长按后拖动以调整快速着色栏宽度"
                                aria-orientation="vertical"
                                onPointerDown={(event) => handleSidebarDividerPointerDown('quick-color', event)}
                                onPointerMove={handleSidebarDividerPointerMove}
                                onPointerUp={clearSidebarResize}
                                onPointerCancel={clearSidebarResize}
                                className={`group relative z-20 w-2 shrink-0 touch-none cursor-col-resize ${isTimelineSidebarResizing ? 'bg-stone-300/80 dark:bg-stone-600/80' : 'bg-transparent hover:bg-stone-200/60 dark:hover:bg-stone-700/60'}`}
                            >
                                <span className={`absolute inset-y-0 left-1/2 w-px -translate-x-1/2 ${isTimelineSidebarResizing ? 'bg-stone-500 dark:bg-stone-300' : 'bg-stone-200/80 dark:bg-stone-700'}`} />
                            </div>
                            <TimelineQuickColorSidebar
                                categories={categories}
                                ratio={timelineQuickColorSidebarRatio}
                                selectedTarget={selectedQuickColorTarget}
                                continuousMode={isQuickColorContinuousMode}
                                onSelectTarget={handleSelectQuickColorTarget}
                                onToggleContinuousMode={() => setIsQuickColorContinuousMode((previous) => !previous)}
                                onActivityDragMove={(target, clientX, clientY) => timelineScheduleCanvasRef.current?.previewQuickColorDropAtClientPoint(target, clientX, clientY) ?? false}
                                onActivityDragEnd={() => timelineScheduleCanvasRef.current?.clearQuickColorDropPreview()}
                                onActivityDrop={(target, clientX, clientY) => {
                                    const didCreateLog = timelineScheduleCanvasRef.current?.dropQuickColorAtClientPoint(target, clientX, clientY) ?? false;
                                    if (didCreateLog) onToast('success', '记录已创建');
                                    return didCreateLog;
                                }}
                            />
                        </>
                    )}
                </div>
            )}

            {timelineLayout === 'timeline-todo' && (
                <div className="absolute right-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-end gap-1">
                    {isQuickColorSidebarOpen ? (
                        <button type="button" onClick={handleToggleQuickColorSidebar} className={timelineRightEdgeButtonClass} title="收起快速着色" aria-label="收起快速着色"><PanelRightClose size={18} /></button>
                    ) : isTimelineTodoSidebarOpen ? (
                        <>
                            <button type="button" onClick={handleToggleTimelineTodoSidebar} className={timelineRightEdgeButtonClass} title="收起待办" aria-label="收起待办"><PanelRightClose size={18} /></button>
                            <button type="button" onClick={() => setIsSidebarTodoListPickerOpen(true)} className={timelineRightEdgeButtonClass} title="切换待办列表" aria-label="切换待办列表"><ListFilter size={18} /></button>
                        </>
                    ) : (
                        <>
                            <button type="button" onClick={handleToggleTimelineTodoSidebar} className={timelineRightEdgeButtonClass} title="打开待办栏" aria-label="打开待办栏"><ListTodo size={18} /></button>
                            <button type="button" onClick={handleToggleQuickColorSidebar} className={timelineRightEdgeButtonClass} title="打开快速着色栏" aria-label="打开快速着色栏"><Paintbrush size={18} /></button>
                        </>
                    )}
                </div>
            )}

            {isSidebarTodoListPickerOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-stone-950/20 px-4 py-[max(1rem,var(--app-safe-area-top))] pb-[max(1rem,env(safe-area-inset-bottom))]" role="presentation" onMouseDown={() => setIsSidebarTodoListPickerOpen(false)}><div role="dialog" aria-modal="true" aria-label="切换待办列表" className="my-auto flex max-h-[min(82vh,42rem)] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-stone-200 bg-[#fdfbf7] shadow-xl dark:border-stone-700 dark:bg-stone-900" onMouseDown={(event) => event.stopPropagation()}><div className="flex shrink-0 items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-700"><h2 className="text-sm font-bold text-stone-800 dark:text-stone-100">切换待办列表</h2><button type="button" onClick={() => setIsSidebarTodoListPickerOpen(false)} className="flex h-8 w-8 items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200" aria-label="关闭"><X size={18} /></button></div><div className="min-h-0 flex-1 overflow-y-auto p-2"><button type="button" onClick={() => { setSidebarTodoCategoryId(null); setIsSidebarTodoListPickerOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors ${!sidebarTodoCategoryId ? 'bg-stone-200/70 font-bold text-stone-900 dark:bg-stone-800 dark:text-stone-50' : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'}`}><ListTodo size={17} />今日</button>{sidebarTodoListOptions.map((category) => <button key={category.id} type="button" onClick={() => { setSidebarTodoCategoryId(category.id); setIsSidebarTodoListPickerOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors ${sidebarTodoCategoryId === category.id ? 'bg-stone-200/70 font-bold text-stone-900 dark:bg-stone-800 dark:text-stone-50' : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'}`}><IconRenderer icon={category.icon} uiIcon={category.uiIcon} size={17} /><span className="truncate">{category.name}</span></button>)}</div></div></div>}

            {/* Floating AI Button (Above Add) */}
            <FloatingButton
                onClick={() => openAIChat({ targetDate: currentDate })}
                position="custom"
                className="fixed bottom-[calc(8.5rem+env(safe-area-inset-bottom))] right-6"
                size="sm"
                variant="white"
                title="AI Magic Backfill"
                disableThemeStyle={true}
            >
                <span className="relative inline-flex items-center justify-center overflow-visible">
                    <UIIcon type="ai-assist" fallbackIcon={Sparkles} size={20} className="text-stone-600" />
                    <UnreadCountBadge count={unreadCount} />
                </span>
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

            {timelineStyleAdjusterOpen && timelineStyleTheme !== 'default' && (
                <TimelineStyleAdjuster onClose={() => setTimelineStyleAdjusterOpen(false)} />
            )}

            {/* 画廊视图 */}
            {isGalleryViewOpen && (
                <GalleryView
                    logs={timelineEntityLogs}
                    categories={categories}
                    dailyReviews={dailyReview ? [dailyReview] : []}
                    onClose={() => setIsGalleryViewOpen(false)}
                    onEditLog={onEditLog}
                    refreshKey={refreshKey}
                    onToast={onToast}
                />
            )}
        </div >
    );
};
