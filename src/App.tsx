/**
 * @file App.tsx
 * @input localStorage (logs, todos, user preferences), Capacitor Plugins (AppUsage, FocusNotification), Services (webdav, ai, nfc)
 * @output Main UI Render, State Management, Data Persistence (JSON in localStorage)
 * @pos Root Component, Application Entry Point (Logic Hub)
 * @description The main component that holds the global state (logs, todos, active sessions) and handles routing between views (Record, Stats, Timeline, etc.).
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React from 'react';
import { Buffer } from 'buffer';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

import { ToastProvider, useToast } from './contexts/ToastContext';
import { DataProvider, useData } from './contexts/DataContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ReviewProvider, useReview } from './contexts/ReviewContext';
import { SessionProvider, useSession } from './contexts/SessionContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { CategoryScopeProvider, useCategoryScope } from './contexts/CategoryScopeContext';
import { PrivacyProvider } from './contexts/PrivacyContext';

import { MainLayout } from './components/MainLayout';
import { AppRoutes } from './components/AppRoutes';
import { TimerFloating } from './components/TimerFloating';
import { AddLogModal } from './components/AddLogModal';
import { TodoDetailModal } from './components/TodoDetailModal';
import { GoalEditor } from './components/GoalEditor';
import { ConfirmModal } from './components/ConfirmModal';
import { SyncDirectionModal } from './components/SyncDirectionModal';
import { BottomNavigation } from './components/BottomNavigation';

import { useLogManager } from './hooks/useLogManager';
import { useTodoManager } from './hooks/useTodoManager';
import { useGoalManager } from './hooks/useGoalManager';
import { useReviewManager } from './hooks/useReviewManager';
import { useSyncManager } from './hooks/useSyncManager';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useSearchManager } from './hooks/useSearchManager';
import { useDeepLink } from './hooks/useDeepLink';
import { useFloatingWindow } from './hooks/useFloatingWindow';
import { useAppDetection } from './hooks/useAppDetection';
import { useHardwareBackButton } from './hooks/useHardwareBackButton';
import { useAppLifecycle } from './hooks/useAppLifecycle';
import { splitLogByDays } from './utils/logUtils';
import { getActiveSceneGroup, loadSceneGroupStateFromStorage } from './utils/sceneGroupStorage';

// Polyfill Buffer for webdav library
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

import { 
  CATEGORIES, 
  SCOPES, 
  MOCK_TODO_CATEGORIES, 
  INITIAL_GOALS, 
  INITIAL_TODOS, 
  INITIAL_LOGS,
  DEFAULT_REVIEW_TEMPLATES,
  DEFAULT_CHECK_TEMPLATES
} from './constants';

const SearchView = React.lazy(() => import('./views/SearchView').then((module) => ({ default: module.SearchView })));
const FocusDetailView = React.lazy(() => import('./views/FocusDetailView').then((module) => ({ default: module.FocusDetailView })));
const ShareView = React.lazy(() => import('./views/ShareView').then((module) => ({ default: module.ShareView })));
const AutoLinkView = React.lazy(() => import('./views/AutoLinkView').then((module) => ({ default: module.AutoLinkView })));
const SettingsView = React.lazy(() => import('./views/SettingsView').then((module) => ({ default: module.SettingsView })));

const OverlayFallback: React.FC<{ label: string }> = ({ label }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#faf9f6]/92 backdrop-blur-sm">
    <div className="rounded-2xl border border-stone-200 bg-white/90 px-5 py-4 shadow-sm">
      <div className="text-sm font-medium text-stone-500">{label}</div>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  // Use Contexts
  const {
    autoLinkRules, setAutoLinkRules,
    autoApplyAutoLinkRules, setAutoApplyAutoLinkRules,
    autoApplyTodoLink, setAutoApplyTodoLink,
    minIdleTimeThreshold, setMinIdleTimeThreshold,
    defaultView, setDefaultView,
    defaultArchiveView, setDefaultArchiveView,
    defaultIndexView, setDefaultIndexView,
    defaultRecordView, setDefaultRecordView,
    customNarrativeTemplates, setCustomNarrativeTemplates,
    userPersonalInfo, setUserPersonalInfo,
    filters, setFilters,
    autoFocusNote, setAutoFocusNote,
    autoOpenFocusDetail, setAutoOpenFocusDetail,
    timelineGalleryMode, setTimelineGalleryMode,
    collapseThreshold, setCollapseThreshold,
    manualSyncMode, setManualSyncMode
  } = useSettings();

  const { addToast } = useToast();

  const {
    isAddModalOpen, setIsAddModalOpen,
    isTodoModalOpen,
    isTodoManaging,
    isGoalEditorOpen,
    isTagsManaging,
    isScopeManaging,
    isAutoLinkOpen, setIsAutoLinkOpen,
    isSettingsOpen, setIsSettingsOpen,
    isSearchOpen, setIsSearchOpen,
    isDailyReviewOpen, setIsDailyReviewOpen,
    currentReviewDate, setCurrentReviewDate,
    isWeeklyReviewOpen,
    isMonthlyReviewOpen,
    selectedTagId, setSelectedTagId,
    selectedCategoryId, setSelectedCategoryId,
    selectedScopeId, setSelectedScopeId,
    setIsGoalBatchManaging,
    editingLog,
    editingTodo,
    editingGoal,
    goalScopeId,
    focusDetailSessionId, setFocusDetailSessionId,
    isShareViewOpen, setIsShareViewOpen,
    sharingLog,
    statsTitle, setStatsTitle,
    currentView, setCurrentView,
    initialLogTimes,
    setReturnToSearch
  } = useNavigation();
  const { categories, scopes, goals, majorGoals, setCategories, setScopes, setGoals, setMajorGoals } = useCategoryScope();
  const { startActivity, stopActivity, cancelSession, activeSessions, setActiveSessions } = useSession();
  const { logs, todos, todoCategories, setLogs, setTodos, setTodoCategories } = useData();
  const {
    dailyReviews, weeklyReviews, monthlyReviews, setDailyReviews, setWeeklyReviews, setMonthlyReviews,
    reviewTemplates, setReviewTemplates,
    checkTemplates, setCheckTemplates,
    dailyReviewTime, setDailyReviewTime,
    weeklyReviewTime, setWeeklyReviewTime,
    monthlyReviewTime, setMonthlyReviewTime,
    autoGenerateDailyReview, setAutoGenerateDailyReview,
    autoGenerateWeeklyReview, setAutoGenerateWeeklyReview,
    autoGenerateMonthlyReview, setAutoGenerateMonthlyReview
  } = useReview();

  // Implement Export/Import
  const handleExportData = async () => {
    // 从 localStorage 读取场景组设置（兼容旧版 sceneTimeSlots）
    const sceneGroupState = loadSceneGroupStateFromStorage();
    const sceneTimeSlots = getActiveSceneGroup(sceneGroupState)?.timeSlots || [];
    
    // 从 localStorage 读取原则库
    const principlesStr = localStorage.getItem('lumostime_principles');
    const principles = principlesStr ? JSON.parse(principlesStr) : [];
    
    const data = {
      logs, todos, categories, todoCategories, scopes, goals,
      autoLinkRules, reviewTemplates, checkTemplates, dailyReviews, weeklyReviews,
      monthlyReviews, customNarrativeTemplates, userPersonalInfo, filters,
      sceneGroupState, // 新版：场景组状态
      sceneTimeSlots, // 添加场景设置
      principles, // 添加原则库
      version: '1.0.0',
      timestamp: Date.now()
    };
    const jsonContent = JSON.stringify(data, null, 2);
    const filename = `lumostime_backup_${new Date().toISOString().split('T')[0]}.json`;

    // Native 端优先写入文件系统，避免 WebView 下载文件不可见或无法找到
    if (Capacitor.isNativePlatform()) {
      try {
        const platform = Capacitor.getPlatform();
        const isAndroid = platform === 'android';
        const relativePath = isAndroid
          ? `Download/LumosTime/${filename}`
          : `LumosTime/${filename}`;

        await Filesystem.writeFile({
          path: relativePath,
          data: jsonContent,
          directory: isAndroid ? Directory.ExternalStorage : Directory.Documents,
          encoding: Encoding.UTF8,
          recursive: true
        });

        addToast(
          'success',
          isAndroid
            ? `备份已导出到 Download/LumosTime/${filename}`
            : `备份已导出到 Documents/LumosTime/${filename}`
        );
        return;
      } catch (error) {
        console.error('[Export] Native export failed, fallback to browser download:', error);
      }
    }

    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', '数据备份已下载');
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        await syncManager.handleSyncDataUpdate(data);
        addToast('success', 'Data imported successfully');
      } catch (error) {
        console.error('Import failed', error);
        addToast('error', 'Import failed: Invalid JSON');
      }
    };
    reader.readAsText(file);
  };

  // Use Custom Hooks
  useAppInitialization();
  const logManager = useLogManager();
  const todoManager = useTodoManager();
  const goalManager = useGoalManager();
  const reviewManager = useReviewManager();
  const syncManager = useSyncManager(); // This handles visibility sync too
  const searchManager = useSearchManager();
  const { isHeaderScrolled } = useAppLifecycle();
  useHardwareBackButton();

  // 注意：自动生成回顾的逻辑已经集成到 TimelineView 中，不需要单独的 hook

  const [sessionToStop, setSessionToStop] = React.useState<string | null>(null);
  const [shouldAutoOpenFocus, setShouldAutoOpenFocus] = React.useState(false);
  const [shouldAutoEnterImmersive, setShouldAutoEnterImmersive] = React.useState(false);
  
  // 大目标编辑状态
  const [isMajorGoalEditorOpen, setIsMajorGoalEditorOpen] = React.useState(false);
  const [editingMajorGoal, setEditingMajorGoal] = React.useState<any>(null);
  const [majorGoalScopeId, setMajorGoalScopeId] = React.useState<string>('');
  
  const autoOpenTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // 监听activeSessions变化，自动打开FocusDetailView
  React.useEffect(() => {
    if (shouldAutoOpenFocus && activeSessions.length > 0) {
      const latestSession = activeSessions[activeSessions.length - 1];
      
      // 清除之前的定时器
      if (autoOpenTimeoutRef.current) {
        clearTimeout(autoOpenTimeoutRef.current);
      }
      
      // 延迟一小段时间，确保 TimerFloating 已经渲染
      autoOpenTimeoutRef.current = setTimeout(() => {
        setFocusDetailSessionId(latestSession.id);
        setShouldAutoOpenFocus(false);
      }, 300);
    }
    
    return () => {
      if (autoOpenTimeoutRef.current) {
        clearTimeout(autoOpenTimeoutRef.current);
      }
    };
  }, [activeSessions, shouldAutoOpenFocus, setFocusDetailSessionId]);
  
  // Wrappers for Session Actions to match original signature (injecting autoLinkRules)
  const handleStartActivityWrapper = (activity: any, categoryId: string, todoId?: string, scopeIdOrIds?: string | string[], note?: string, autoEnterFocus?: boolean) => {
    // 如果明确指定了 autoEnterFocus，使用指定的值；否则使用全局设置
    const shouldAutoOpen = autoEnterFocus !== undefined ? autoEnterFocus : autoOpenFocusDetail;
    
    if (shouldAutoOpen) {
      setShouldAutoOpenFocus(true);
      setShouldAutoEnterImmersive(true);
    }
    
    startActivity(activity, categoryId, autoLinkRules, todoId, scopeIdOrIds, note);
  };
  
  const handleStartTodoFocusWrapper = (todo: TodoItem, autoEnterFocus?: boolean) => {
    if (autoEnterFocus) {
      setShouldAutoOpenFocus(true);
      setShouldAutoEnterImmersive(true);
    }
    
    todoManager.handleStartTodoFocus(todo);
  };
  
  const handleStopActivityWrapper = (sessionId: string) => {
    stopActivity(
      sessionId,
      undefined,
      (logs) => logs.forEach(l => logManager.handleSaveLog(l))
    );
  };

  const handleSelectDailyReviewWrapper = (dateStr: string) => {
    setReturnToSearch(true);
    setIsSearchOpen(false);
    reviewManager.handleOpenDailyReview(new Date(dateStr));
  };
  const handleSelectWeeklyReviewWrapper = (id: string) => {
    setReturnToSearch(true);
    setIsSearchOpen(false);
    const r = weeklyReviews.find(r => r.id === id);
    if (r) reviewManager.handleOpenWeeklyReview(new Date(r.weekStartDate), new Date(r.weekEndDate));
  };
  const handleSelectMonthlyReviewWrapper = (id: string) => {
    setReturnToSearch(true);
    setIsSearchOpen(false);
    const r = monthlyReviews.find(r => r.id === id);
    if (r) reviewManager.handleOpenMonthlyReview(new Date(r.monthStartDate), new Date(r.monthEndDate));
  };

  useDeepLink(logManager.handleQuickPunch, handleStartActivityWrapper, handleStopActivityWrapper);
  useFloatingWindow(handleStopActivityWrapper);
  useAppDetection(handleStartActivityWrapper);

  // Calculate lastLogEndTime for AddLogModal
  const lastLogEndTime = React.useMemo(() => {
    if (!logs.length) return undefined;
    const sortedLogs = [...logs].sort((a, b) => b.endTime - a.endTime);
    return sortedLogs[0].endTime;
  }, [logs]);

  return (
    <MainLayout
      isHeaderScrolled={isHeaderScrolled}
      isSyncing={syncManager.isSyncing}
      onQuickSync={syncManager.handleQuickSync}
      handleBackFromTag={() => {
        setSelectedTagId(null);
        setSelectedCategoryId(null);
      }}
      handleBackFromScope={() => {
        setIsGoalBatchManaging(false);
        setSelectedScopeId(null);
      }}
      handleCloseDailyReview={() => {
        setIsDailyReviewOpen(false);
        setCurrentReviewDate(null);
      }}
      handleCloseWeeklyReview={reviewManager.handleCloseWeeklyReview}
      handleCloseMonthlyReview={reviewManager.handleCloseMonthlyReview}
      statsTitle={statsTitle}
    >
      <AppRoutes
        // Activity Handlers
        handleStartActivity={handleStartActivityWrapper}

        // Log Handlers
        openAddModal={logManager.openAddModal}
        openEditModal={logManager.openEditModal}
        handleBatchAddLogs={logManager.handleBatchAddLogs}
        handleQuickPunch={logManager.handleQuickPunch}

        // Todo Handlers
        openEditTodoModal={todoManager.openEditTodoModal}
        openAddTodoModal={todoManager.openAddTodoModal}
        handleToggleTodo={todoManager.handleToggleTodo}
        handleStartTodoFocus={handleStartTodoFocusWrapper}
        handleBatchAddTodos={todoManager.handleBatchAddTodos}
        handleDuplicateTodo={todoManager.handleDuplicateTodo}
        handleUpdateTodoData={todoManager.handleUpdateTodoData}

        // 大目标处理
        onOpenMajorGoalEditor={(scopeId, majorGoal) => {
          setMajorGoalScopeId(scopeId);
          setEditingMajorGoal(majorGoal || null);
          setIsMajorGoalEditorOpen(true);
        }}

        // Misc
        refreshKey={syncManager.refreshKey}
        isSyncing={syncManager.isSyncing}
        handleQuickSync={syncManager.handleQuickSync}
        setStatsTitle={setStatsTitle}
      />
      <BottomNavigation
        currentView={currentView}
        onViewChange={setCurrentView}
        isVisible={
          !focusDetailSessionId &&
          !isDailyReviewOpen &&
          !isWeeklyReviewOpen &&
          !isMonthlyReviewOpen &&
          !selectedTagId &&
          !selectedCategoryId &&
          !selectedScopeId &&
          currentView !== 'STATS' &&
          !isTodoManaging &&
          !isTagsManaging &&
          !isScopeManaging &&
          !isSettingsOpen
        }
      />

      {/* Modals */}


      {isAddModalOpen && (
        <AddLogModal
          initialLog={editingLog}
          initialStartTime={initialLogTimes?.start}
          initialEndTime={initialLogTimes?.end}
          prefilledData={initialLogTimes?.prefilledData}
          lastLogEndTime={lastLogEndTime}
          onClose={logManager.closeModal}
          onSave={logManager.handleSaveLog}
          onDelete={logManager.handleDeleteLog}
          onImageRemove={logManager.handleLogImageRemove}
          categories={categories}
          todos={todos}
          todoCategories={todoCategories}
          scopes={scopes}
          autoLinkRules={autoLinkRules}
          autoApplyAutoLinkRules={autoApplyAutoLinkRules}
          autoApplyTodoLink={autoApplyTodoLink}
          autoFocusNote={autoFocusNote}
          allLogs={logs}
        />
      )}

      {isTodoModalOpen && (
        <TodoDetailModal
          initialTodo={editingTodo}
          currentCategory={todoCategories.find(c => c.id === todoManager.todoCategoryToAdd) || todoCategories[0]}
          onClose={todoManager.closeTodoModal}
          onSave={todoManager.handleSaveTodo}
          onDelete={todoManager.handleDeleteTodo}
          logs={logs}
          onLogUpdate={logManager.handleSaveLog}
          onEditLog={logManager.openEditModal}
          todoCategories={todoCategories}
          categories={categories}
          scopes={scopes}
        />
      )}

      {/* Delete Todo Confirmation */}
      <ConfirmModal
        isOpen={todoManager.isDeleteTodoConfirmOpen}
        title="Delete Task?"
        description="This task is linked to historical records. Deleting it will unlink those records but keep the time logs. Are you sure?"
        onConfirm={todoManager.handleConfirmDeleteTodo}
        onClose={() => todoManager.setIsDeleteTodoConfirmOpen(false)}
        confirmText="Delete"
        cancelText="Cancel"
        type="warning"
      />

      {isGoalEditorOpen && (
        <GoalEditor
          onClose={goalManager.closeGoalEditor}
          onSave={goalManager.handleSaveGoal}
          onDelete={goalManager.handleDeleteGoal}
          goal={editingGoal || undefined}
          scopeId={goalScopeId || ''}
          categories={categories}
          todoCategories={todoCategories}
          mode="independent"
          majorGoals={majorGoals}
        />
      )}

      {/* 大目标编辑器 */}
      {isMajorGoalEditorOpen && (
        <GoalEditor
          onClose={() => {
            setIsMajorGoalEditorOpen(false);
            setEditingMajorGoal(null);
            setMajorGoalScopeId('');
          }}
          onSaveMajorGoal={(majorGoal) => {
            if (editingMajorGoal) {
              // 更新现有大目标
              setMajorGoals(prev => prev.map(mg => 
                mg.id === majorGoal.id ? { ...majorGoal, updatedAt: new Date().toISOString() } : mg
              ));
            } else {
              // 创建新大目标
              setMajorGoals(prev => [...prev, majorGoal]);
            }
            setIsMajorGoalEditorOpen(false);
            setEditingMajorGoal(null);
            setMajorGoalScopeId('');
          }}
          scopeId={majorGoalScopeId}
          categories={categories}
          todoCategories={todoCategories}
          mode="majorGoal"
          majorGoal={editingMajorGoal || undefined}
        />
      )}

      <ConfirmModal
        isOpen={!!sessionToStop}
        title="Stop Activity?"
        description="Are you sure you want to stop the current activity?"
        onConfirm={() => {
          if (sessionToStop) handleStopActivityWrapper(sessionToStop);
          setSessionToStop(null);
        }}
        onClose={() => setSessionToStop(null)}
        confirmText="Stop"
        cancelText="Cancel"
        type="warning"
      />

      {/* Focus Detail Overlay */}
      {focusDetailSessionId && (() => {
        const session = activeSessions.find(s => s.id === focusDetailSessionId);
        if (!session) return null;
        
        return (
          <React.Suspense fallback={<OverlayFallback label="正在加载专注详情..." />}>
            <FocusDetailView
              session={session}
              todos={todos}
              categories={categories}
              todoCategories={todoCategories}
              scopes={scopes}
              autoLinkRules={autoLinkRules}
              autoApplyAutoLinkRules={autoApplyAutoLinkRules}
              autoApplyTodoLink={autoApplyTodoLink}
              autoEnterImmersive={shouldAutoEnterImmersive}
              onClose={() => {
                setFocusDetailSessionId(null);
                setShouldAutoEnterImmersive(false);
              }}
              onCancel={cancelSession}
              onComplete={(finalSession) => {
                stopActivity(
                  finalSession.id,
                  finalSession,
                  (logs) => logs.forEach(l => logManager.handleSaveLog(l))
                );
                setFocusDetailSessionId(null);
                setShouldAutoEnterImmersive(false);
              }}
              onUpdate={(updated) => {
                setActiveSessions(prev => prev.map(s =>
                  s.id === updated.id ? updated : s
                ));
              }}
              autoFocusNote={autoFocusNote}
            />
          </React.Suspense>
        );
      })()}

      {/* Search Overlay */}
      {isSearchOpen && (
        <React.Suspense fallback={<OverlayFallback label="正在加载搜索..." />}>
          <SearchView
            logs={logs}
            categories={categories}
            todos={todos}
            todoCategories={todoCategories}
            scopes={scopes}
            goals={goals}
            dailyReviews={dailyReviews}
            weeklyReviews={weeklyReviews}
            monthlyReviews={monthlyReviews}
            onClose={searchManager.handleCloseSearch}
            onSelectLog={(log) => searchManager.handleSelectSearchLogWrapper(log, logManager.openEditModal)}
            onSelectTodo={(todo) => searchManager.handleSelectSearchTodoWrapper(todo, todoManager.openEditTodoModal)}
            onSelectScope={searchManager.handleSelectSearchScope}
            onSelectCategory={searchManager.handleSelectSearchCategory}
            onSelectActivity={(act, catId) => searchManager.handleSelectSearchActivity(act, catId)}
            onSelectDailyReview={handleSelectDailyReviewWrapper}
            onSelectWeeklyReview={handleSelectWeeklyReviewWrapper}
            onSelectMonthlyReview={handleSelectMonthlyReviewWrapper}
          />
        </React.Suspense>
      )}

      {/* Share View Overlay */}
      {isShareViewOpen && sharingLog && (
        <React.Suspense fallback={<OverlayFallback label="正在加载分享..." />}>
          <ShareView
            log={sharingLog}
            scopes={scopes}
            onBack={() => setIsShareViewOpen(false)}
            onToast={addToast}
          />
        </React.Suspense>
      )}

      {/* Full Screen Settings Overlay */}
      {isSettingsOpen && (
        <React.Suspense fallback={<OverlayFallback label="正在加载设置..." />}>
          <SettingsView
            onClose={() => setIsSettingsOpen(false)}
            onReset={() => {
              setLogs(INITIAL_LOGS);
              setTodos(INITIAL_TODOS);
              setCategories(CATEGORIES);
              setScopes(SCOPES);
              setTodoCategories(MOCK_TODO_CATEGORIES);
              setGoals(INITIAL_GOALS);
              setReviewTemplates(DEFAULT_REVIEW_TEMPLATES);
              setCheckTemplates(DEFAULT_CHECK_TEMPLATES);
              setDailyReviews([]);
              setWeeklyReviews([]);
              setMonthlyReviews([]);
              setAutoLinkRules([]);
              setCustomNarrativeTemplates([]);
              setUserPersonalInfo('');
              setFilters([]);
              addToast('success', 'Data reset to defaults');
              setIsSettingsOpen(false);
            }}
            onClearData={() => {
              setLogs([]);
              setTodos([]);
              setGoals([]);
              setScopes([]);
              setReviewTemplates([]);
              setCheckTemplates([]);
              setDailyReviews([]);
              setWeeklyReviews([]);
              setMonthlyReviews([]);
              setAutoLinkRules([]);
              setUserPersonalInfo('');
              setFilters([]);
              addToast('success', 'All data cleared successfully');
              setIsSettingsOpen(false);
            }}
            // Handler Props
            onExport={handleExportData}
            onImport={handleImportData}
            onToast={addToast}
            onSyncUpdate={syncManager.handleSyncDataUpdate}

            // Data Props
            logs={logs}
            todos={todos}
            categoriesData={categories}
            todoCategories={todoCategories}
            scopes={scopes}
            dailyReviews={dailyReviews}
            weeklyReviews={weeklyReviews}
            monthlyReviews={monthlyReviews}
            currentDate={new Date()}
            syncData={{
              logs,
              todos,
              categories,
              todoCategories,
              scopes,
              goals,
              autoLinkRules,
              reviewTemplates,
              checkTemplates,
              dailyReviews,
              weeklyReviews,
              monthlyReviews,
              customNarrativeTemplates,
              userPersonalInfo,
              filters
            }}

            // Settings Props
            onOpenAutoLink={() => setIsAutoLinkOpen(true)}

            minIdleTimeThreshold={minIdleTimeThreshold}
            onSetMinIdleTimeThreshold={setMinIdleTimeThreshold}

            defaultView={defaultView}
            onSetDefaultView={setDefaultView}

            defaultArchiveView={defaultArchiveView}
            onSetDefaultArchiveView={setDefaultArchiveView}

            defaultIndexView={defaultIndexView}
            onSetDefaultIndexView={setDefaultIndexView}

            defaultRecordView={defaultRecordView}
            onSetDefaultRecordView={setDefaultRecordView}

            onOpenSearch={() => {
              setIsSearchOpen(true);
              setIsSettingsOpen(false);
            }}

            autoFocusNote={autoFocusNote}
            onToggleAutoFocusNote={() => setAutoFocusNote(!autoFocusNote)}

            timelineGalleryMode={timelineGalleryMode}
            onToggleTimelineGalleryMode={() => setTimelineGalleryMode(!timelineGalleryMode)}

            collapseThreshold={collapseThreshold}
            onSetCollapseThreshold={setCollapseThreshold}

            // Review Props
            reviewTemplates={reviewTemplates}
            onUpdateReviewTemplates={setReviewTemplates}

            checkTemplates={checkTemplates}
            onUpdateCheckTemplates={setCheckTemplates}

            onUpdateDailyReviews={setDailyReviews}

            dailyReviewTime={dailyReviewTime}
            onSetDailyReviewTime={setDailyReviewTime}

            weeklyReviewTime={weeklyReviewTime}
            onSetWeeklyReviewTime={setWeeklyReviewTime}

            monthlyReviewTime={monthlyReviewTime}
            onSetMonthlyReviewTime={setMonthlyReviewTime}

            autoGenerateDailyReview={autoGenerateDailyReview}
            onToggleAutoGenerateDailyReview={() => setAutoGenerateDailyReview(!autoGenerateDailyReview)}

            autoGenerateWeeklyReview={autoGenerateWeeklyReview}
            onToggleAutoGenerateWeeklyReview={() => setAutoGenerateWeeklyReview(!autoGenerateWeeklyReview)}

            autoGenerateMonthlyReview={autoGenerateMonthlyReview}
            onToggleAutoGenerateMonthlyReview={() => setAutoGenerateMonthlyReview(!autoGenerateMonthlyReview)}

            customNarrativeTemplates={customNarrativeTemplates}
            onUpdateCustomNarrativeTemplates={setCustomNarrativeTemplates}

            userPersonalInfo={userPersonalInfo}
            onSetUserPersonalInfo={setUserPersonalInfo}

            filters={filters}
            onUpdateFilters={setFilters}
            
            manualSyncMode={manualSyncMode}
            onToggleManualSyncMode={() => setManualSyncMode(!manualSyncMode)}

            onEditLog={logManager.openEditModal}
          />
        </React.Suspense>
      )}

      {/* Auto Link Rules Overlay */}
      {isAutoLinkOpen && (
        <React.Suspense fallback={<OverlayFallback label="正在加载自动关联..." />}>
          <AutoLinkView
            onClose={() => setIsAutoLinkOpen(false)}
            rules={autoLinkRules}
            onUpdateRules={setAutoLinkRules}
            categories={categories}
            scopes={scopes}
          />
        </React.Suspense>
      )}

      {/* Floating Timer Bubble */}
      <TimerFloating
        sessions={activeSessions}
        todos={todos}
        onStop={handleStopActivityWrapper}
        onCancel={cancelSession}
        onClick={(session) => setFocusDetailSessionId(session.id)}
      />
      
      {/* Sync Direction Modal */}
      <SyncDirectionModal
        isOpen={syncManager.isSyncDirectionModalOpen}
        onClose={() => syncManager.setIsSyncDirectionModalOpen(false)}
        onUpload={syncManager.handleManualUpload}
        onDownload={syncManager.handleManualDownload}
      />

    </MainLayout>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <DataProvider>
        <SettingsProvider>
          <ReviewProvider>
            <SessionProvider splitLogByDays={splitLogByDays}>
              <NavigationProvider>
                <CategoryScopeProviderWithData>
                  <PrivacyProvider>
                    <AppContent />
                  </PrivacyProvider>
                </CategoryScopeProviderWithData>
              </NavigationProvider>
            </SessionProvider>
          </ReviewProvider>
        </SettingsProvider>
      </DataProvider>
    </ToastProvider>
  );
};

// Wrapper to inject data into CategoryScopeProvider
const CategoryScopeProviderWithData: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeSessions, setActiveSessions } = useSession();
  const { logs, setLogs } = useData();

  return (
    <CategoryScopeProvider
      activeSessions={activeSessions}
      setActiveSessions={setActiveSessions as any}
      logs={logs}
      setLogs={setLogs}
    >
      {children}
    </CategoryScopeProvider>
  );
};

export default App;
