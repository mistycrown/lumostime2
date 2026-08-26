/**
 * @file AppRoutes.tsx
 * @input Application view state, shared data contexts, and route-level handlers
 * @output Active page view rendering for the main application shell
 * @pos Component (Routing)
 * @description Resolves top-level views and modal-like screens from navigation state.
 * @updated 2026-08-25: Wires Activity attribute deletion cleanup through the log update handler.
 * @updated 2026-08-26: Adds full activity-reference migration to tag deletion management.
 * @updated 2026-08-09: Added daily-check overview and detail routes.
 * @updated 2026-08-10: Routes daily-check overview back to its explicit Settings or Timeline launch source.
 * @updated 2026-08-09: Lets settings-launched review pages render above Settings with their own detail back layer.
 * @updated 2026-08-10: Keeps daily-check overview and detail pinned to the current day instead of the global selected date.
 * @updated 2026-08-26: Passes Routine launch and active-run controls into the Record route.
 */
import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { AppView, Category, DailyReview, WeeklyReview, MonthlyReview, Log, TodoItem, TodoCategory, TodoDuplicateOptions, ActiveRoutineRun, Routine } from '../types';
import { useNavigation } from '../contexts/NavigationContext';
import { useData } from '../contexts/DataContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useReview } from '../contexts/ReviewContext';
import { useAchievement } from '../contexts/AchievementContext';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { useSession } from '../contexts/SessionContext';
import { useGoalManager } from '../hooks/useGoalManager';
import { useMajorGoalManager } from '../hooks/useMajorGoalManager';
import { useReviewManager } from '../hooks/useReviewManager';
import { useTodoQuickActions } from '../hooks/useTodoQuickActions';
import { aiService } from '../services/aiService';
import { dailyNewspaperService } from '../services/dailyNewspaperService';
import { getLocalDateStr } from '../utils/dateUtils';
import { hasAutoCheckItemCompletionChanges, updateAutoCheckItems } from '../utils/autoCheckUtils';
import { ensureDailyReviewForDate, upsertDailyReview } from '../utils/dailyCheckUtils';
import { ACTIVE_SESSION_KEY, CHAT_PERSONAS_KEY, CHAT_SESSIONS_KEY, DEFAULT_AI_PERSONAS } from './ai-chat/AIBackfillChatInitialization';
import type { AIChatPersona, AIChatSession } from './ai-chat/AIBackfillChatShared';
import { TodoQuickActionsModal } from './TodoQuickActionsModal';
import { isQuickTodo } from '../utils/todoKindUtils';
import { getRealTodoCategories } from '../utils/todoQuickCategoryUtils';
import { buildTimelinePlannedLog, isAutoRecurringPlanDeleteLocked } from '../utils/todoRecurringPlanUtils';
import type { TimelineQuickColorActivity } from './TimelineScheduleCanvas';
import type { TimelineLayoutMode } from '../services/timelineLayoutService';
import { getActivityMigrationImpact, migrateActivityReferences, type ActivityReferenceMigrationInput } from '../utils/activityReferenceMigration';
import { loadSceneGroupStateFromStorage, saveSceneGroupStateToStorage } from '../utils/sceneGroupStorage';
import { loadWidgetTemplatesFromStorage, saveWidgetTemplatesToStorage } from '../services/widgetService';
import WidgetBridge from '../plugins/WidgetBridgePlugin';
import AppUsage from '../plugins/AppUsagePlugin';
import { TIMEPAL_KEYS, storage } from '../constants/storageKeys';

// Views
import { DailyReviewView } from '../views/DailyReviewView';
import { DailyNewspaperView } from '../views/DailyNewspaperView';
import { WeeklyNewspaperView } from '../views/WeeklyNewspaperView';
import { WeeklyReviewView } from '../views/WeeklyReviewView';
import { MonthlyNewspaperView } from '../views/MonthlyNewspaperView';
import { MonthlyReviewView } from '../views/MonthlyReviewView';
import { OnThisDayView } from '../views/OnThisDayView';
import { AchievementView } from '../views/AchievementView';
import { RecordViewContainer } from '../views/RecordViewContainer';
import { TimelineView } from '../views/TimelineView';
import { JournalView } from '../views/JournalView';
import { ReviewHubView } from '../views/ReviewHubView';
import { TagDetailView } from '../views/TagDetailView';
import { CategoryDetailView } from '../views/CategoryDetailView';
import { TagsView } from '../views/TagsView';
import { TodoBatchManageView } from '../views/TodoBatchManageView';
import { TodoView } from '../views/TodoView';
import { ScopeDetailView } from '../views/ScopeDetailView';
import { ScopeManageView } from '../views/ScopeManageView';
import { ScopeView } from '../views/ScopeView';
import { DailyCheckOverviewView } from '../views/DailyCheckOverviewView';
import { DailyCheckDetailView } from '../views/DailyCheckDetailView';
import { StatsViewLazy as StatsView } from '../utils/lazyViews';

const RouteFallback: React.FC<{ label: string }> = ({ label }) => (
    <div className="flex h-full w-full items-center justify-center bg-[#faf9f6]">
        <div className="rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
            <div className="text-sm font-medium text-stone-500">{label}</div>
        </div>
    </div>
);

const resolveNewspaperAssistantName = (): string => {
    const fallbackPersona = DEFAULT_AI_PERSONAS[0];

    try {
        const storedPersonas = JSON.parse(localStorage.getItem(CHAT_PERSONAS_KEY) || '[]') as Partial<AIChatPersona>[];
        const personas = Array.isArray(storedPersonas) && storedPersonas.length > 0
            ? storedPersonas
            : DEFAULT_AI_PERSONAS;
        const storedSessions = JSON.parse(localStorage.getItem(CHAT_SESSIONS_KEY) || '[]') as Partial<AIChatSession>[];
        const activeSessionId = localStorage.getItem(ACTIVE_SESSION_KEY) || '';
        const activeSession = Array.isArray(storedSessions)
            ? storedSessions.find((session) => session.id === activeSessionId) || storedSessions[0]
            : undefined;
        const persona = personas.find((item) => item.id === activeSession?.personaId)
            || personas[0]
            || fallbackPersona;
        return persona.assistantSelfName?.trim()
            || persona.name?.trim()
            || fallbackPersona.assistantSelfName?.trim()
            || '小报';
    } catch {
        return fallbackPersona.assistantSelfName?.trim() || fallbackPersona.name || '小报';
    }
};

// Props Interface to receive all handlers
// Minimized Props Interface
interface AppRoutesProps {
    routines: Routine[];
    activeRoutineRun: ActiveRoutineRun | null;
    onStartRoutine: (routine: Routine) => void;
    onAdvanceRoutine: () => void;
    onExitRoutine: () => void;
    activeTimelineLayout: TimelineLayoutMode;
    refreshKey: number;
    isSyncing: boolean;
    handleQuickSync: (e: any) => void;
    setStatsTitle: (title: string) => void;

    // Log/Todo specific handlers that might not be in managers yet or need app-level state
    // Actually, TodoManager and LogManager should be here or in Context?
    // For now, let's assume we still pass the high-level log/todo handlers from App.tsx 
    // IF specific Custom Hooks are not instantiated here. 
    // But wait, App.tsx has useTodoManager, useLogManager.
    // We should move those here too? 
    // If we move ALL managers here, AppRoutes becomes the "Controller".
    // Let's stick to moving Goal/Review first.

    // Keeping core Log/Todo handlers for now to avoid breaking too much at once
    handleStartActivity: (activity: any, categoryId: string, todoId?: string, scopeIdOrIds?: string | string[], note?: string, autoEnterFocus?: boolean) => void;
    openAddModal: (start?: number, end?: number) => void;
    openEditModal: (log: Log) => void;
    handleBatchAddLogs: (entries: any[]) => void;
    handleQuickPunch: () => void;

    openEditTodoModal: (todo: TodoItem) => void;
    openAddTodoModal: (catId: string, draft?: Partial<TodoItem>) => void;
    handleToggleTodo: (id: string) => void;
    handleStartTodoFocus: (todo: TodoItem, autoEnterFocus?: boolean) => void;
    handleBatchAddTodos: (todos: Partial<TodoItem>[]) => void;
    handleDuplicateTodo: (todo: TodoItem, options: TodoDuplicateOptions) => void;
    handleSaveTodo: (todo: TodoItem) => void;
    handleDeleteTodo: (id: string) => void;
    handleUpdateTodoData: (cats: TodoCategory[], todos: TodoItem[]) => void;

    // 大目标处理函数
    onOpenMajorGoalEditor: (scopeId: string, majorGoal?: any) => void;

    // We can remove Goal/Review/Tag/Category handlers as they will be handled internally
}

export const AppRoutes: React.FC<AppRoutesProps> = ({
    routines,
    activeRoutineRun,
    onStartRoutine,
    onAdvanceRoutine,
    onExitRoutine,
    activeTimelineLayout,
    handleStartActivity,
    openAddModal, openEditModal, handleBatchAddLogs, handleQuickPunch,
    openEditTodoModal, openAddTodoModal, handleToggleTodo, handleStartTodoFocus, handleBatchAddTodos, handleDuplicateTodo, handleSaveTodo, handleDeleteTodo, handleUpdateTodoData,
    refreshKey, isSyncing, handleQuickSync,
    setStatsTitle,
    onOpenMajorGoalEditor
}) => {
    const {
        currentView, setCurrentView,
        isSettingsOpen, setIsSettingsOpen,
        isDailyReviewOpen, setIsDailyReviewOpen,
        isDailyNewspaperOpen, setIsDailyNewspaperOpen,
        isWeeklyNewspaperOpen, setIsWeeklyNewspaperOpen,
        isMonthlyNewspaperOpen, setIsMonthlyNewspaperOpen,
        isOnThisDayOpen, setIsOnThisDayOpen,
        currentReviewDate, setCurrentReviewDate,
        currentDailyNewspaperDate, setCurrentDailyNewspaperDate,
        currentWeeklyNewspaperStart, setCurrentWeeklyNewspaperStart,
        currentWeeklyNewspaperEnd, setCurrentWeeklyNewspaperEnd,
        currentDailyReviewInitialTab, setCurrentDailyReviewInitialTab,
        currentOnThisDayDate, setCurrentOnThisDayDate,
        isWeeklyReviewOpen, setIsWeeklyReviewOpen,
        currentWeeklyReviewStart, setCurrentWeeklyReviewStart,
        currentWeeklyReviewEnd, setCurrentWeeklyReviewEnd,
        currentWeeklyReviewInitialTab, setCurrentWeeklyReviewInitialTab,
        currentMonthlyReviewInitialTab, setCurrentMonthlyReviewInitialTab,
        isMonthlyReviewOpen, setIsMonthlyReviewOpen,
        currentMonthlyReviewStart, setCurrentMonthlyReviewStart,
        currentMonthlyReviewEnd, setCurrentMonthlyReviewEnd,
        currentMonthlyNewspaperStart, setCurrentMonthlyNewspaperStart,
        currentMonthlyNewspaperEnd, setCurrentMonthlyNewspaperEnd,
        isAchievementOpen,
        isStatsFullScreen, setIsStatsFullScreen,
        isTodoManaging, setIsTodoManaging,
        isTagsManaging, setIsTagsManaging,
        isScopeManaging, setIsScopeManaging,
        selectedTagId, selectedCategoryId, selectedScopeId, setSelectedScopeId,
        isJournalMode,
        currentDate, setCurrentDate,
        statsRange, setStatsRange,
        dailyCheckDetailId, setDailyCheckDetailId,
        previousView, setPreviousView,
        dailyChecksReturnTarget, setDailyChecksReturnTarget
    } = useNavigation();


    const { logs, todos, todoCategories, setLogs, setTodos, setTodoCategories } = useData(); // Added setters
    const { categories, scopes, goals, majorGoals, setScopes, setGoals, setMajorGoals, handleUpdateActivity, handleCategoryChange, handleUpdateCategory, handleUpdateCategories } = useCategoryScope();
    const { dailyReviews, weeklyReviews, monthlyReviews, onThisDayEntries, setDailyReviews, setWeeklyReviews, setMonthlyReviews, setOnThisDayEntries, reviewTemplates, checkTemplates, dailyReviewTime, weeklyReviewTime, monthlyReviewTime, autoGenerateDailyReview, autoGenerateWeeklyReview, autoGenerateMonthlyReview } = useReview();
    const { userPersonalInfo, autoLinkRules, setAutoLinkRules, appRules, setAppRules, appAwarenessTemplates, setAppAwarenessTemplates, appAwarenessActiveRun, setAppAwarenessActiveRun, filters, setFilters, memoirFilterConfig, setMemoirFilterConfig, customNarrativeTemplates, minIdleTimeThreshold, timelineGalleryMode, collapseThreshold } = useSettings();
    const { addToast } = useToast();
    const dailyCheckToday = React.useMemo(() => new Date(), [currentView]);
    const { activeSessions, setActiveSessions } = useSession();
    const { rules: achievementRules, updateRule: updateAchievementRule } = useAchievement();

    const buildActivityMigrationInput = React.useCallback((): ActivityReferenceMigrationInput => ({
        logs,
        todos,
        activeSessions,
        autoLinkRules,
        appRules,
        appAwarenessTemplates,
        appAwarenessActiveRun,
        achievementRules,
        sceneState: loadSceneGroupStateFromStorage(),
        widgetTemplates: loadWidgetTemplatesFromStorage(),
        memoirFilterConfig,
        filters,
        goals,
        majorGoals,
        timePalFilterActivityIds: storage.getJSON<string[]>(TIMEPAL_KEYS.FILTER_ACTIVITIES, [])
    }), [activeSessions, appAwarenessActiveRun, appAwarenessTemplates, appRules, autoLinkRules, achievementRules, filters, goals, majorGoals, logs, memoirFilterConfig, todos]);

    const previewActivityMigration = React.useCallback((sourceActivityId: string) => (
        getActivityMigrationImpact(buildActivityMigrationInput(), sourceActivityId)
    ), [buildActivityMigrationInput]);

    const migrateAndDeleteActivity = React.useCallback(async (sourceActivityId: string, targetActivityId: string) => {
        const source = categories.flatMap((category) => category.activities).find((activity) => activity.id === sourceActivityId);
        const targetCategory = categories.find((category) => category.activities.some((activity) => activity.id === targetActivityId));
        if (!source || !targetCategory || sourceActivityId === targetActivityId) {
            throw new Error('标签迁移目标无效');
        }
        const input = buildActivityMigrationInput();
        const result = migrateActivityReferences(input, sourceActivityId, targetActivityId, targetCategory.id, source.name, targetCategory.activities.find((activity) => activity.id === targetActivityId)?.name || '');

        setLogs(result.logs);
        setTodos(result.todos);
        setActiveSessions(result.activeSessions);
        setAutoLinkRules(result.autoLinkRules);
        setAppRules(result.appRules);
        setAppAwarenessTemplates(result.appAwarenessTemplates);
        setAppAwarenessActiveRun(result.appAwarenessActiveRun);
        setFilters(result.filters);
        setMemoirFilterConfig(result.memoirFilterConfig);
        setGoals(result.goals);
        setMajorGoals(result.majorGoals);
        if (result.timePalFilterActivityIds) {
            storage.setJSON(TIMEPAL_KEYS.FILTER_ACTIVITIES, result.timePalFilterActivityIds);
            storage.setBoolean(TIMEPAL_KEYS.FILTER_ENABLED, result.timePalFilterActivityIds.length > 0);
            window.dispatchEvent(new Event('timepal-filter-changed'));
        }
        await Promise.all(Object.entries(result.appRules).map(([packageName, activityId]) => (
            AppUsage.saveAppRule({ packageName, activityId }).catch((error) => {
                console.error('[AppRoutes] Failed to refresh native app rule after activity migration', error);
            })
        )));
        result.achievementRules.forEach((rule) => updateAchievementRule(rule));
        if (result.sceneState) {
            saveSceneGroupStateToStorage(result.sceneState);
            window.dispatchEvent(new Event('sceneGroupsUpdated'));
            window.dispatchEvent(new Event('sceneTimeSlotsUpdated'));
        }
        if (result.widgetTemplates) {
            saveWidgetTemplatesToStorage(result.widgetTemplates);
            try {
                await WidgetBridge.saveTemplates({ templates: result.widgetTemplates });
            } catch (error) {
                console.error('[AppRoutes] Failed to refresh native widget templates after activity migration', error);
            }
        }
        handleUpdateCategories(categories.map((category) => ({
            ...category,
            activities: category.activities.filter((activity) => activity.id !== sourceActivityId)
        })));
        return result.impact;
    }, [buildActivityMigrationInput, categories, handleUpdateCategories, setActiveSessions, setAppAwarenessActiveRun, setAppAwarenessTemplates, setAppRules, setAutoLinkRules, setFilters, setGoals, setLogs, setMajorGoals, setMemoirFilterConfig, setTodos, updateAchievementRule]);
    // Import hooks
    const { handleAddGoal, handleEditGoal, handleSaveGoal, handleDeleteGoal, handleArchiveGoal, handleExtendGoal, handleIncreaseGoalTarget } = useGoalManager();
    const { 
        addMajorGoal, 
        updateMajorGoal, 
        deleteMajorGoal, 
        archiveMajorGoal,
        addChildGoal,
        removeChildGoal
    } = useMajorGoalManager();

    // We need to instantiate ReviewManager here.
    // Note: useReviewManager requires many args.
    const {
        handleDeleteReview, handleUpdateReview, handleGenerateNarrative,
        handleDeleteWeeklyReview, handleUpdateWeeklyReview, handleGenerateWeeklyNarrative,
        handleDeleteMonthlyReview, handleUpdateMonthlyReview, handleGenerateMonthlyNarrative,
        handleOpenDailyReview, handleCreateDailyReviewSilently, handleOpenWeeklyReview, handleOpenMonthlyReview,
        handleCloseWeeklyReview, handleCloseMonthlyReview
    } = useReviewManager();

    const { setSelectedTagId, setSelectedCategoryId } = useNavigation();
    const handleSelectTag = (id: string) => setSelectedTagId(id);
    const handleCloseDailyChecks = () => {
        setDailyCheckDetailId(null);
        if (dailyChecksReturnTarget === 'settings') {
            setCurrentView(previousView || AppView.TIMELINE);
            setIsSettingsOpen(true);
        } else {
            setCurrentView(AppView.TIMELINE);
        }
        setDailyChecksReturnTarget('timeline');
        setPreviousView(null);
    };

    const dailyCheckRefreshKeyRef = React.useRef<string | null>(null);
    React.useEffect(() => {
        if (currentView !== AppView.DAILY_CHECKS) {
            dailyCheckRefreshKeyRef.current = null;
            return;
        }

        const dateStr = getLocalDateStr(dailyCheckToday);
        const templateKey = checkTemplates
            .filter((template) => template.enabled && template.isDaily)
            .sort((a, b) => a.order - b.order)
            .flatMap((template) => template.items || [])
            .filter((item) => item.enabled !== false)
            .map((item) => `${item.id}:${item.type || 'manual'}:${item.manualMode || 'binary'}`)
            .join('|');
        const refreshKey = `${dateStr}:${templateKey}`;

        if (dailyCheckRefreshKeyRef.current === refreshKey) {
            return;
        }
        dailyCheckRefreshKeyRef.current = refreshKey;

        const ensured = ensureDailyReviewForDate({
            dateStr,
            dailyReviews,
            checkTemplates,
            reviewTemplates
        });
        const existingItems = ensured.review.checkItems || [];
        const nextItems = updateAutoCheckItems(existingItems, logs, {
            categories,
            scopes,
            todos,
            todoCategories
        }, dailyCheckToday);
        const shouldPersist = Boolean(ensured.updatedReviews)
            || hasAutoCheckItemCompletionChanges(existingItems, nextItems);

        if (!shouldPersist) {
            return;
        }

        setDailyReviews((previousReviews) => upsertDailyReview(previousReviews, {
            ...ensured.review,
            checkItems: nextItems,
            updatedAt: Date.now()
        }));
    }, [categories, checkTemplates, currentView, dailyCheckToday, dailyReviews, logs, reviewTemplates, scopes, todoCategories, todos, setDailyReviews]);

    const {
        quickActionTodo,
        quickActionOpenedAt,
        openQuickActions,
        closeQuickActions,
        handleQuickActionMove,
        handleQuickActionOpenDetail,
        handleQuickActionComplete,
        handleQuickActionUndoComplete,
        handleQuickActionClearDate,
        handleQuickActionTogglePin,
        handleQuickActionMaybeDates,
        handleQuickActionSkipNextRecurrence,
        handleQuickActionSkipToMaybeDate,
        handleQuickActionMoveCategory,
        handleQuickActionUpgradeToProject,
        handleQuickActionDelete,
        handleQuickActionUpdateTitle,
        handleQuickActionUpdateNote
    } = useTodoQuickActions({
        onSaveTodo: handleSaveTodo,
        onEditTodo: openEditTodoModal,
        onDeleteTodo: handleDeleteTodo
    });

    const handleUpdateLog = (updatedLog: Log) => {
        setLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));
    };

    const handleCreatePlannedLog = (todo: TodoItem, startTime: number, endTime: number): Log => {
        const plannedLog = buildTimelinePlannedLog(todo, startTime, endTime);
        if (!plannedLog) {
            throw new Error('Invalid planned log time range.');
        }
        setLogs((previous) => [...previous, plannedLog]);
        return plannedLog;
    };

    const handleCreateQuickColorLog = (target: TimelineQuickColorActivity, startTime: number, endTime: number): Log => {
        const quickColorLog: Log = {
            id: crypto.randomUUID(),
            categoryId: target.categoryId,
            activityId: target.activityId,
            startTime,
            endTime,
            duration: Math.max(0, Math.round((endTime - startTime) / 1000))
        };
        setLogs((previous) => [...previous, quickColorLog]);
        return quickColorLog;
    };

    const handleToggleTimelineTodoCompletion = (todo: TodoItem) => {
        handleSaveTodo({
            ...todo,
            isCompleted: !todo.isCompleted,
            completedAt: todo.isCompleted ? undefined : Date.now()
        });
    };

    const handleDeleteTimelinePlannedLog = (log: Log) => {
        if (!log.isPlanned) return;
        const linkedTodo = log.linkedTodoId
            ? todos.find((todo) => todo.id === log.linkedTodoId)
            : null;
        if (isAutoRecurringPlanDeleteLocked(log, linkedTodo)) {
            addToast('info', '该循环计划已锁定，取消自动生成后可删除。');
            return;
        }
        setLogs((previous) => previous.filter((entry) => entry.id !== log.id));
    };

    const closeDailyReview = () => {
        setIsDailyReviewOpen(false);
        setCurrentReviewDate(null);
        setCurrentDailyReviewInitialTab(null);
    };

    const closeDailyNewspaper = () => {
        setIsDailyNewspaperOpen(false);
        setCurrentDailyNewspaperDate(null);
    };

    const closeWeeklyNewspaper = () => {
        setIsWeeklyNewspaperOpen(false);
        setCurrentWeeklyNewspaperStart(null);
        setCurrentWeeklyNewspaperEnd(null);
    };

    const closeMonthlyNewspaper = () => {
        setIsMonthlyNewspaperOpen(false);
        setCurrentMonthlyNewspaperStart(null);
        setCurrentMonthlyNewspaperEnd(null);
    };

    const closeWeeklyReview = () => {
        setIsWeeklyReviewOpen(false);
        setCurrentWeeklyReviewStart(null);
        setCurrentWeeklyReviewEnd(null);
        setCurrentWeeklyReviewInitialTab(null);
    };

    const closeMonthlyReview = () => {
        setIsMonthlyReviewOpen(false);
        setCurrentMonthlyReviewStart(null);
        setCurrentMonthlyReviewEnd(null);
        setCurrentMonthlyReviewInitialTab(null);
    };

    const renderSettingsLaunchedReview = (content: React.ReactNode, onBack: () => void) => {
        if (!isSettingsOpen) {
            return content;
        }

        return (
            <div className="fixed inset-0 z-[90] flex flex-col bg-[#faf9f6] pb-[env(safe-area-inset-bottom)] pt-[var(--app-safe-area-top)] font-serif text-stone-900 animate-in slide-in-from-right duration-300">
                <header className="sticky top-0 z-20 grid h-14 shrink-0 grid-cols-[1.5rem_1fr_1.5rem] items-center border-b border-stone-100 bg-[#faf9f6]/92 px-4 backdrop-blur-md">
                    <button
                        type="button"
                        onClick={onBack}
                        className="p-1 text-stone-400 transition-colors hover:text-stone-700"
                        title="返回回答详情"
                        aria-label="返回回答详情"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-center text-lg font-bold text-stone-800">详情</span>
                    <span aria-hidden="true" />
                </header>
                <div className="min-h-0 flex-1 overflow-hidden">
                    {content}
                </div>
            </div>
        );
    };

    // Helper to get local YYYY-MM-DD string (now imported from utils)
    // const getLocalDateStr = (d: Date) => { ... } // Removed - using utils version

    const isSettingsLaunchedReviewOpen = isDailyNewspaperOpen
        || isWeeklyNewspaperOpen
        || isMonthlyNewspaperOpen
        || isDailyReviewOpen
        || isWeeklyReviewOpen
        || isMonthlyReviewOpen;

    if (isSettingsOpen && !isSettingsLaunchedReviewOpen) return null;

    if (isDailyNewspaperOpen && currentDailyNewspaperDate) {
        const dateStr = getLocalDateStr(currentDailyNewspaperDate);
        const review = dailyReviews.find(r => r.date === dateStr);
        if (!review) return null;

        const handleSubmitDailyNewspaperReply = async (logId: string, content: string) => {
            if (!review.aiNewspaper) {
                return;
            }

            const targetAnnotation = review.aiNewspaper.annotations.find((item) => item.logId === logId);
            if (!targetAnnotation) {
                return;
            }

            const threadMessages = review.aiNewspaper.commentThreads?.find((thread) => thread.logId === logId)?.messages || [];
            try {
                const { systemPrompt, userPrompt } = await dailyNewspaperService.buildCommentReplyPrompts({
                    date: review.date,
                    dayDataText: dailyNewspaperService.buildDayDataText({
                        date: review.date,
                        logs,
                        categories,
                        todos,
                        todoCategories,
                        scopes,
                        dailyReview: review
                    }),
                    newspaper: review.aiNewspaper,
                    annotation: targetAnnotation,
                    threadMessages,
                    userReply: content,
                    personaPrompt: userPersonalInfo || ''
                });
                const response = await aiService.requestStructuredJsonWithDebug({
                    systemPrompt,
                    userPrompt,
                    cacheHint: {
                        keySeed: `daily_newspaper_comment:${review.date}:${logId}`,
                        scope: 'daily_newspaper_comment'
                    },
                    normalizeResult: (rawValue) => dailyNewspaperService.parseCommentReplyResponse(rawValue)
                });
                setDailyReviews((previousReviews) => (
                  dailyNewspaperService.appendDailyNewspaperCommentTurn(
                    previousReviews,
                    review.id,
                    logId,
                    content,
                    response.result.assistantReply,
                    Date.now()
                  )
                ));
                addToast('success', 'AI 已回复小报评论');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'AI 评论回复失败';
                addToast('error', message);
                throw error;
            }
        };

        const view = (
            <DailyNewspaperView
                review={review}
                date={currentDailyNewspaperDate}
                logs={logs}
                categories={categories}
                todos={todos}
                scopes={scopes}
                assistantDisplayName={resolveNewspaperAssistantName()}
                onSubmitAnnotationReply={handleSubmitDailyNewspaperReply}
            />
        );

        return renderSettingsLaunchedReview(view, closeDailyNewspaper);
    }

    if (isWeeklyNewspaperOpen && currentWeeklyNewspaperStart && currentWeeklyNewspaperEnd) {
        const weekStartStr = getLocalDateStr(currentWeeklyNewspaperStart);
        const weekEndStr = getLocalDateStr(currentWeeklyNewspaperEnd);
        const review = weeklyReviews.find(r => r.weekStartDate === weekStartStr && r.weekEndDate === weekEndStr);
        if (!review) return null;

        const view = (
            <WeeklyNewspaperView
                review={review}
                weekStartDate={currentWeeklyNewspaperStart}
                weekEndDate={currentWeeklyNewspaperEnd}
            />
        );

        return renderSettingsLaunchedReview(view, closeWeeklyNewspaper);
    }

    if (isMonthlyNewspaperOpen && currentMonthlyNewspaperStart && currentMonthlyNewspaperEnd) {
        const monthStartStr = getLocalDateStr(currentMonthlyNewspaperStart);
        const monthEndStr = getLocalDateStr(currentMonthlyNewspaperEnd);
        const review = monthlyReviews.find(r => r.monthStartDate === monthStartStr && r.monthEndDate === monthEndStr);
        if (!review) return null;

        const view = (
            <MonthlyNewspaperView
                review={review}
                monthStartDate={currentMonthlyNewspaperStart}
                monthEndDate={currentMonthlyNewspaperEnd}
            />
        );

        return renderSettingsLaunchedReview(view, closeMonthlyNewspaper);
    }

    // Daily Review has priority
    if (isDailyReviewOpen && currentReviewDate) {
        const dateStr = getLocalDateStr(currentReviewDate);
        const review = dailyReviews.find(r => r.date === dateStr);
        // During creation, it might be added to state asynchronously, but handleOpenDailyReview adds it synchronously usually.
        // If undefined, return null or spinner
        if (!review) return null;

        const view = (
            <DailyReviewView
                review={review}
                date={currentReviewDate}
                templates={reviewTemplates}
                categories={categories}
                logs={logs}
                todos={todos}
                todoCategories={todoCategories}
                scopes={scopes}
                dailyReviews={dailyReviews}
                customNarrativeTemplates={customNarrativeTemplates}
                onDelete={handleDeleteReview}
                onUpdateReview={handleUpdateReview}
                onGenerateNarrative={handleGenerateNarrative}
                addToast={addToast}
                checkTemplates={checkTemplates}
                initialTab={currentDailyReviewInitialTab || undefined}
                onOpenNewspaper={(targetDate) => {
                    setCurrentDate(targetDate);
                }}
            />
        );

        return renderSettingsLaunchedReview(view, closeDailyReview);
    }

    if (isOnThisDayOpen && currentOnThisDayDate) {
        return (
            <OnThisDayView
                date={currentOnThisDayDate}
                logs={logs}
                dailyReviews={dailyReviews}
                categories={categories}
                scopes={scopes}
                todos={todos}
                onThisDayEntries={onThisDayEntries}
                onUpdateOnThisDayEntries={setOnThisDayEntries}
            />
        );
    }

    if (isAchievementOpen) {
        return <AchievementView />;
    }

    // Weekly Review
    if (isWeeklyReviewOpen && currentWeeklyReviewStart && currentWeeklyReviewEnd) {
        const weekStartStr = getLocalDateStr(currentWeeklyReviewStart);
        const weekEndStr = getLocalDateStr(currentWeeklyReviewEnd);
        let review = weeklyReviews.find(r => r.weekStartDate === weekStartStr && r.weekEndDate === weekEndStr);
        
        // 如果找不到review，创建一个临时的（这种情况通常发生在状态更新的时序问题）
        if (!review) {
            const templateSnapshot = reviewTemplates
                .filter(t => t.isWeeklyTemplate)
                .sort((a, b) => a.order - b.order)
                .map(t => ({
                    id: t.id,
                    title: t.title,
                    questions: t.questions,
                    order: t.order,
                    syncToTimeline: t.syncToTimeline
                }));

            review = {
                id: crypto.randomUUID(),
                weekStartDate: weekStartStr,
                weekEndDate: weekEndStr,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                answers: [],
                templateSnapshot
            };
        }

        const view = (
            <WeeklyReviewView
                review={review}
                weekStartDate={currentWeeklyReviewStart}
                weekEndDate={currentWeeklyReviewEnd}
                initialTab={currentWeeklyReviewInitialTab || undefined}
                templates={reviewTemplates}
                categories={categories}
                logs={logs}
                todos={todos}
                todoCategories={todoCategories}
                scopes={scopes}
                dailyReviews={dailyReviews}
                customNarrativeTemplates={customNarrativeTemplates}
                onDelete={handleDeleteWeeklyReview}
                onUpdateReview={handleUpdateWeeklyReview}
                onGenerateNarrative={handleGenerateWeeklyNarrative}
                onClose={handleCloseWeeklyReview}
                addToast={addToast}
            />
        );

        return renderSettingsLaunchedReview(view, closeWeeklyReview);
    }

    // Monthly Review
    if (isMonthlyReviewOpen && currentMonthlyReviewStart && currentMonthlyReviewEnd) {
        const monthStartStr = getLocalDateStr(currentMonthlyReviewStart);
        const monthEndStr = getLocalDateStr(currentMonthlyReviewEnd);
        let review = monthlyReviews.find(r => r.monthStartDate === monthStartStr && r.monthEndDate === monthEndStr);
        
        // 如果找不到review，创建一个临时的（这种情况通常发生在状态更新的时序问题）
        if (!review) {
            const templateSnapshot = reviewTemplates
                .filter(t => t.isMonthlyTemplate)
                .sort((a, b) => a.order - b.order)
                .map(t => ({
                    id: t.id,
                    title: t.title,
                    questions: t.questions,
                    order: t.order,
                    syncToTimeline: t.syncToTimeline
                }));

            review = {
                id: crypto.randomUUID(),
                monthStartDate: monthStartStr,
                monthEndDate: monthEndStr,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                answers: [],
                templateSnapshot
            };
        }

        const view = (
            <MonthlyReviewView
                review={review}
                monthStartDate={currentMonthlyReviewStart}
                monthEndDate={currentMonthlyReviewEnd}
                initialTab={currentMonthlyReviewInitialTab || undefined}
                templates={reviewTemplates}
                categories={categories}
                logs={logs}
                todos={todos}
                todoCategories={todoCategories}
                scopes={scopes}
                dailyReviews={dailyReviews}
                customNarrativeTemplates={customNarrativeTemplates}
                onDelete={handleDeleteMonthlyReview}
                onUpdateReview={handleUpdateMonthlyReview}
                onGenerateNarrative={handleGenerateMonthlyNarrative}
                addToast={addToast}
                onClose={handleCloseMonthlyReview}
            />
        );

        return renderSettingsLaunchedReview(view, closeMonthlyReview);
    }

    if (isSettingsOpen) return null;

    switch (currentView) {
        case AppView.RECORD:
            return <RecordViewContainer 
                onStartActivity={(activity, categoryId, autoEnterFocus) => 
                    handleStartActivity(activity, categoryId, undefined, undefined, undefined, autoEnterFocus)
                } 
                onStartTodoFocus={handleStartTodoFocus}
                onAddLog={openAddModal}
                categories={categories}
                todos={todos}
                routines={routines}
                activeRoutineRun={activeRoutineRun}
                onStartRoutine={onStartRoutine}
                onAdvanceRoutine={onAdvanceRoutine}
                onExitRoutine={onExitRoutine}
            />;
        case AppView.TIMELINE:
            return (
                <>
                <TimelineView
                    key={`timeline-${refreshKey}`}
                    timelineLayoutMode={activeTimelineLayout}
                    refreshKey={refreshKey}
                    logs={logs}
                    todos={todos}
                    goals={goals}
                    categories={categories}
                    onAddLog={openAddModal}
                    onEditLog={openEditModal}
                    onUpdateLog={handleUpdateLog}
                    onCreatePlannedLog={handleCreatePlannedLog}
                    onCreateQuickColorLog={handleCreateQuickColorLog}
                    onStartTodoFocus={handleStartTodoFocus}
                    onDeletePlannedLog={handleDeleteTimelinePlannedLog}
                    currentDate={currentDate}
                    onDateChange={setCurrentDate}
                    onShowStats={() => setCurrentView(AppView.STATS)}
                    onBatchAddLogs={handleBatchAddLogs}
                    onSync={handleQuickSync}
                    isSyncing={isSyncing}
                    todoCategories={todoCategories}
                    onToast={addToast}
                    autoLinkRules={autoLinkRules}
                    scopes={scopes}
                    minIdleTimeThreshold={minIdleTimeThreshold}
                    onQuickPunch={handleQuickPunch}
                    activeSessions={activeSessions}
                    onNavigateToTodo={(todo) => {
                        // Reuse the Todo page quick-actions sheet from the Chronicle sidebar.
                        openQuickActions(todo);
                    }}
                    onToggleTodoCompletion={handleToggleTimelineTodoCompletion}
                    onNavigateToGoal={(goal) => {
                        // 直接打开目标编辑器
                        handleEditGoal(goal);
                    }}
                    dailyReview={dailyReviews.find(r => r.date === getLocalDateStr(currentDate))}
                    dailyReviews={dailyReviews}
                    checkTemplates={checkTemplates}
                    onUpdateDailyReview={handleUpdateReview}
                    onOpenDailyReview={handleOpenDailyReview}
                    onCreateDailyReviewSilently={handleCreateDailyReviewSilently}
                    templates={reviewTemplates}
                    dailyReviewTime={dailyReviewTime}
                    autoGenerateDailyReview={autoGenerateDailyReview}
                    onOpenOnThisDay={(date) => {
                        setCurrentOnThisDayDate(date);
                        setIsOnThisDayOpen(true);
                    }}
                    weeklyReviews={weeklyReviews}
                    onOpenWeeklyReview={handleOpenWeeklyReview}
                    weeklyReviewTime={weeklyReviewTime}
                    autoGenerateWeeklyReview={autoGenerateWeeklyReview}
                    monthlyReviews={monthlyReviews}
                    onOpenMonthlyReview={handleOpenMonthlyReview}
                    monthlyReviewTime={monthlyReviewTime}
                    autoGenerateMonthlyReview={autoGenerateMonthlyReview}
                    timelineGalleryMode={timelineGalleryMode}
                    collapseThreshold={collapseThreshold}
                />
                <TodoQuickActionsModal
                    isOpen={quickActionTodo !== null}
                    todo={quickActionTodo}
                    todoCategories={getRealTodoCategories(todoCategories)}
                    onMoveDate={handleQuickActionMove}
                    onClearDate={handleQuickActionClearDate}
                    onOpenDetail={handleQuickActionOpenDetail}
                    onComplete={handleQuickActionComplete}
                    onUndoComplete={handleQuickActionUndoComplete}
                    onTogglePin={handleQuickActionTogglePin}
                    onEditMaybeDates={handleQuickActionMaybeDates}
                    onSkipNextRecurrence={handleQuickActionSkipNextRecurrence}
                    onSkipToMaybeDate={handleQuickActionSkipToMaybeDate}
                    onMoveCategory={handleQuickActionMoveCategory}
                    onUpgradeToProject={handleQuickActionUpgradeToProject}
                    onDelete={handleQuickActionDelete}
                    onClose={closeQuickActions}
                    onForceClose={() => closeQuickActions(true)}
                    openedAt={quickActionOpenedAt}
                    showUpgradeToProject={Boolean(quickActionTodo && isQuickTodo(quickActionTodo))}
                    onUpdateTitle={handleQuickActionUpdateTitle}
                    onUpdateNote={handleQuickActionUpdateNote}
                />
                </>
            );
        case AppView.STATS:
            return (
                <React.Suspense fallback={<RouteFallback label="正在加载统计..." />}>
                    <StatsView
                        logs={logs}
                        categories={categories}
                        currentDate={currentDate}
                        onBack={() => {
                            // Clear stats range when going back
                            setStatsRange(null);
                            setCurrentView(AppView.TIMELINE);
                        }}
                        onDateChange={setCurrentDate}
                        isFullScreen={isStatsFullScreen}
                        onToggleFullScreen={() => setIsStatsFullScreen(!isStatsFullScreen)}
                        onToast={addToast}
                        onTitleChange={setStatsTitle}
                        todos={todos}
                        todoCategories={todoCategories}
                        scopes={scopes}
                        dailyReviews={dailyReviews}
                        checkTemplates={checkTemplates}
                        forcedRange={statsRange || undefined}
                    />
                </React.Suspense>
            );
        case AppView.DAILY_CHECKS:
            return (
                <DailyCheckOverviewView
                    checkTemplates={checkTemplates}
                    dailyReviews={dailyReviews}
                    logs={logs}
                    categories={categories}
                    scopes={scopes}
                    todos={todos}
                    todoCategories={todoCategories}
                    currentDate={dailyCheckToday}
                    onOpenDetail={(itemId) => {
                        setDailyCheckDetailId(itemId);
                        setCurrentView(AppView.DAILY_CHECK_DETAIL);
                    }}
                    onBack={handleCloseDailyChecks}
                />
            );
        case AppView.DAILY_CHECK_DETAIL:
            return (
                <DailyCheckDetailView
                    itemId={dailyCheckDetailId}
                    checkTemplates={checkTemplates}
                    reviewTemplates={reviewTemplates}
                    dailyReviews={dailyReviews}
                    logs={logs}
                    categories={categories}
                    scopes={scopes}
                    todos={todos}
                    todoCategories={todoCategories}
                    currentDate={dailyCheckToday}
                    onUpdateDailyReview={handleUpdateReview}
                    onBack={() => {
                        setDailyCheckDetailId(null);
                        setCurrentView(AppView.DAILY_CHECKS);
                    }}
                />
            );
        case AppView.REVIEW:
            return isJournalMode ? (
                <JournalView
                    dailyReviews={dailyReviews}
                    weeklyReviews={weeklyReviews}
                    monthlyReviews={monthlyReviews}
                    logs={logs}
                    todos={todos}
                    scopes={scopes}
                    onOpenDailyReview={handleOpenDailyReview}
                    onUpdateDailyReview={handleUpdateReview}
                    onCreateDailyReviewSilently={handleCreateDailyReviewSilently}
                    onEditLog={openEditModal}
                    onOpenWeeklyReview={handleOpenWeeklyReview}
                    onOpenMonthlyReview={handleOpenMonthlyReview}
                    collapseThreshold={collapseThreshold}
                />
            ) : (
                <ReviewHubView
                    logs={logs}
                    dailyReviews={dailyReviews}
                    weeklyReviews={weeklyReviews}
                    monthlyReviews={monthlyReviews}
                    onOpenDailyReview={handleOpenDailyReview}
                    onOpenWeeklyReview={handleOpenWeeklyReview}
                    onOpenMonthlyReview={handleOpenMonthlyReview}
                />
            );
        case AppView.TAGS:
            if (selectedTagId) {
                return (
                    <TagDetailView
                        tagId={selectedTagId}
                        logs={logs}
                        todos={todos}
                        onToggleTodo={handleToggleTodo}
                        categories={categories}
                        onUpdateActivity={handleUpdateActivity}
                        onCategoryChange={handleCategoryChange}
                        onEditLog={openEditModal}
                        onUpdateLog={handleUpdateLog}
                        onEditTodo={openEditTodoModal}
                        scopes={scopes}
                    />
                );
            }
            if (selectedCategoryId) {
                return (
                    <CategoryDetailView
                        categoryId={selectedCategoryId}
                        logs={logs}
                        categories={categories}
                        todos={todos}
                        onUpdateCategory={handleUpdateCategory}
                        onEditLog={openEditModal}
                        onEditTodo={openEditTodoModal}
                        onToggleTodo={handleToggleTodo}
                        scopes={scopes}
                    />
                );
            }
            return (
                <TagsView
                    logs={logs}
                    onSelectTag={setSelectedTagId}
                    onSelectCategory={setSelectedCategoryId}
                    categories={categories}
                    onUpdateCategories={handleUpdateCategories}
                    onPreviewActivityMigration={previewActivityMigration}
                    onMigrateAndDeleteActivity={migrateAndDeleteActivity}
                    isManaging={isTagsManaging}
                    onStopManaging={() => setIsTagsManaging(false)}
                />
            );
        case AppView.TODO:
            if (isTodoManaging) {
                return (
                    <TodoBatchManageView
                        onBack={() => setIsTodoManaging(false)}
                        categories={todoCategories}
                        todos={todos}
                        onSave={handleUpdateTodoData}
                    />
                );
            }
            return (
                <TodoView
                    todos={todos}
                    logs={logs}
                    categories={todoCategories}
                    activityCategories={categories}
                    scopes={scopes}
                    onToggleTodo={handleToggleTodo}
                    onEditTodo={openEditTodoModal}
                    onAddTodo={openAddTodoModal}
                    onStartFocus={handleStartTodoFocus}
                    onDuplicateTodo={handleDuplicateTodo}
                    onSaveTodo={handleSaveTodo}
                    onDeleteTodo={handleDeleteTodo}
                    autoLinkRules={autoLinkRules}
                />
            );
        case AppView.SCOPE:
            if (selectedScopeId) {
                const selectedScope = scopes.find(s => s.id === selectedScopeId);
                if (!selectedScope) return null;
                return (
                    <ScopeDetailView
                        scope={selectedScope}
                        logs={logs}
                        categories={categories}
                        todos={todos}
                        goals={goals}
                        majorGoals={majorGoals}
                        onBack={() => setSelectedScopeId(null)}
                        onUpdate={(updatedScope) => {
                            setScopes(prev => prev.map(s => s.id === updatedScope.id ? updatedScope : s));
                        }}
                        onEditLog={openEditModal}
                        onEditGoal={handleEditGoal}
                        onDeleteGoal={handleDeleteGoal}
                        onArchiveGoal={handleArchiveGoal}
                        onAddGoal={(majorGoal) => handleAddGoal(selectedScope.id, undefined, majorGoal?.id)}
                        onAddMajorGoal={() => {
                            onOpenMajorGoalEditor(selectedScope.id);
                        }}
                        onEditMajorGoal={(majorGoal) => {
                            onOpenMajorGoalEditor(selectedScope.id, majorGoal);
                        }}
                        onDeleteMajorGoal={deleteMajorGoal}
                        onArchiveMajorGoal={archiveMajorGoal}
                        onBatchUpdateGoals={(nextMajorGoals, nextGoals) => {
                            setMajorGoals(nextMajorGoals);
                            setGoals(nextGoals);
                        }}
                        onEditTodo={openEditTodoModal}
                        onToggleTodo={handleToggleTodo}
                    />
                );
            }
            if (isScopeManaging) {
                return (
                    <ScopeManageView
                        scopes={scopes}
                        onUpdate={(updatedScopes) => setScopes(updatedScopes)}
                        onBack={() => setIsScopeManaging(false)}
                    />
                );
            }
            return (
                <ScopeView
                    scopes={scopes}
                    logs={logs}
                    goals={goals}
                    majorGoals={majorGoals}
                    todos={todos}
                    onScopeClick={(id) => setSelectedScopeId(id)}
                    onManageClick={() => setIsScopeManaging(true)}
                    onArchiveGoal={handleArchiveGoal}
                    onExtendGoal={handleExtendGoal}
                    onIncreaseGoalTarget={handleIncreaseGoalTarget}
                    onAddGoal={handleAddGoal}
                />
            );
        default:
            return null;
    }
};
