import React, { useState } from 'react';
import { AppView, Category, DailyReview, WeeklyReview, MonthlyReview, Log, TodoItem, TodoCategory, TodoDuplicateOptions } from '../types';
import { useNavigation } from '../contexts/NavigationContext';
import { useData } from '../contexts/DataContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useReview } from '../contexts/ReviewContext';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { useSession } from '../contexts/SessionContext';
import { useGoalManager } from '../hooks/useGoalManager';
import { useMajorGoalManager } from '../hooks/useMajorGoalManager';
import { useReviewManager } from '../hooks/useReviewManager';
import { aiService } from '../services/aiService';
import { getLocalDateStr } from '../utils/dateUtils';

// Views
import { DailyReviewView } from '../views/DailyReviewView';
import { DailyNewspaperView } from '../views/DailyNewspaperView';
import { WeeklyReviewView } from '../views/WeeklyReviewView';
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
import { StatsViewLazy as StatsView } from '../utils/lazyViews';

const RouteFallback: React.FC<{ label: string }> = ({ label }) => (
    <div className="flex h-full w-full items-center justify-center bg-[#faf9f6]">
        <div className="rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
            <div className="text-sm font-medium text-stone-500">{label}</div>
        </div>
    </div>
);

// Props Interface to receive all handlers
// Minimized Props Interface
interface AppRoutesProps {
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
    handleStartActivity,
    openAddModal, openEditModal, handleBatchAddLogs, handleQuickPunch,
    openEditTodoModal, openAddTodoModal, handleToggleTodo, handleStartTodoFocus, handleBatchAddTodos, handleDuplicateTodo, handleSaveTodo, handleDeleteTodo, handleUpdateTodoData,
    refreshKey, isSyncing, handleQuickSync,
    setStatsTitle,
    onOpenMajorGoalEditor
}) => {
    const {
        currentView, setCurrentView,
        isSettingsOpen,
        isDailyReviewOpen, isDailyNewspaperOpen, isOnThisDayOpen, setIsOnThisDayOpen, currentReviewDate, currentDailyNewspaperDate, currentDailyReviewInitialTab, currentOnThisDayDate, setCurrentOnThisDayDate,
        isWeeklyReviewOpen, currentWeeklyReviewStart, currentWeeklyReviewEnd, currentWeeklyReviewInitialTab,
        currentMonthlyReviewInitialTab,
        isMonthlyReviewOpen, currentMonthlyReviewStart, currentMonthlyReviewEnd,
        isAchievementOpen,
        isStatsFullScreen, setIsStatsFullScreen,
        isTodoManaging, setIsTodoManaging,
        isTagsManaging, setIsTagsManaging,
        isScopeManaging, setIsScopeManaging,
        selectedTagId, selectedCategoryId, selectedScopeId, setSelectedScopeId,
        isJournalMode,
        currentDate, setCurrentDate,
        statsRange, setStatsRange
    } = useNavigation();


    const { logs, todos, todoCategories, setLogs, setTodos, setTodoCategories } = useData(); // Added setters
    const { categories, scopes, goals, majorGoals, setScopes, setGoals, setMajorGoals, handleUpdateActivity, handleCategoryChange, handleUpdateCategory, handleUpdateCategories } = useCategoryScope();
    const { dailyReviews, weeklyReviews, monthlyReviews, onThisDayEntries, setDailyReviews, setWeeklyReviews, setMonthlyReviews, setOnThisDayEntries, reviewTemplates, checkTemplates, dailyReviewTime, weeklyReviewTime, monthlyReviewTime, autoGenerateDailyReview, autoGenerateWeeklyReview, autoGenerateMonthlyReview } = useReview();
    const { userPersonalInfo, autoLinkRules, customNarrativeTemplates, minIdleTimeThreshold, timelineGalleryMode, collapseThreshold } = useSettings();
    const { addToast } = useToast();
    const { activeSessions } = useSession();

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

    const handleUpdateLog = (updatedLog: Log) => {
        setLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));
    };

    // Helper to get local YYYY-MM-DD string (now imported from utils)
    // const getLocalDateStr = (d: Date) => { ... } // Removed - using utils version

    if (isSettingsOpen) return null;

    if (isDailyNewspaperOpen && currentDailyNewspaperDate) {
        const dateStr = getLocalDateStr(currentDailyNewspaperDate);
        const review = dailyReviews.find(r => r.date === dateStr);
        if (!review) return null;

        return (
            <DailyNewspaperView
                review={review}
                date={currentDailyNewspaperDate}
                logs={logs}
                categories={categories}
                todos={todos}
                scopes={scopes}
            />
        );
    }

    // Daily Review has priority
    if (isDailyReviewOpen && currentReviewDate) {
        const dateStr = getLocalDateStr(currentReviewDate);
        const review = dailyReviews.find(r => r.date === dateStr);
        // During creation, it might be added to state asynchronously, but handleOpenDailyReview adds it synchronously usually.
        // If undefined, return null or spinner
        if (!review) return null;

        return (
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

        return (
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

        return (
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
    }

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
            />;
        case AppView.TIMELINE:
            return (
                <TimelineView
                    key={`timeline-${refreshKey}`}
                    refreshKey={refreshKey}
                    logs={logs}
                    todos={todos}
                    goals={goals}
                    categories={categories}
                    onAddLog={openAddModal}
                    onEditLog={openEditModal}
                    onUpdateLog={handleUpdateLog}
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
                        // 直接打开待办详情
                        openEditTodoModal(todo);
                    }}
                    onNavigateToGoal={(goal) => {
                        // 直接打开目标编辑器
                        handleEditGoal(goal);
                    }}
                    dailyReview={dailyReviews.find(r => r.date === getLocalDateStr(currentDate))}
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
