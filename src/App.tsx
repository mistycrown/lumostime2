/**
 * @file App.tsx
 * @input localStorage (logs, todos, user preferences), Capacitor Plugins (AppUsage, FocusNotification), Services (webdav, ai, nfc)
 * @output Main UI Render, State Management, Data Persistence (JSON in localStorage)
 * @pos Root Component, Application Entry Point (Logic Hub)
 * @description The main component that holds the global state (logs, todos, active sessions) and handles routing between views and overlays, including preserving standalone return paths for search and custom filters while keeping export/import, NFC stop confirmation, and reset flows aligned with repository-backed data.
 * @updated 2026-05-10: Upgraded the post-start timer auto-jump flow to support none, focus-detail, and immersive entry modes while preserving scene-card immersive overrides.
 * @updated 2026-05-10: Made the widget supplement-log shortcut snap the timeline date back to today before opening the backfill modal.
 * @updated 2026-04-27: Passed todo delete callbacks into the shared quick-actions sheet path so list and week todo action bars can trigger task removal.
 * @updated 2026-04-22: Mounted the shared AI chat window at the app level so it can keep running in the background after the modal UI is closed.
 * @updated 2026-04-25: Added AI assistant widget shortcut handling so Android widget shortcut slots can open the shared AI chat window.
 * @updated 2026-04-26: Added Android assistant notification navigation consumption so tapping a background AI alert reopens the shared chat at the exact target message.
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useRef } from 'react';
import { Buffer } from 'buffer';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { AppView } from './types';
import AssistantAgent from './plugins/AssistantAgentPlugin';

import { ToastProvider, useToast } from './contexts/ToastContext';
import { DataProvider, useData } from './contexts/DataContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ReviewProvider, useReview } from './contexts/ReviewContext';
import { SessionProvider, useSession } from './contexts/SessionContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { CategoryScopeProvider, useCategoryScope } from './contexts/CategoryScopeContext';
import { AchievementProvider, useAchievement } from './contexts/AchievementContext';
import { PrivacyProvider } from './contexts/PrivacyContext';
import { AIChatWindowProvider } from './contexts/AIChatWindowContext';
import { useAIChatWindow } from './contexts/AIChatWindowContext';

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
import { useWidgetBridgeSync } from './hooks/useWidgetBridgeSync';
import { useFloatingWindowSync } from './hooks/useFloatingWindowSync';
import { ShortcutWidgetAction } from './services/widgetShortcutService';
import { splitLogByDays } from './utils/logUtils';
import { buildSceneGroupStateFromLegacySlots, getActiveSceneGroup, loadSceneGroupStateFromStorage, saveSceneGroupStateToStorage } from './utils/sceneGroupStorage';
import { getLocalDataTimestamp, setLocalDataTimestampValue } from './utils/localDataTimestamp';
import { validateAndFixData } from './utils/dataValidation';
import { STORAGE_WRITE_ERROR_EVENT, StorageWriteErrorDetail } from './constants/storageKeys';
import {
  resolveAutoStartTimerJumpMode,
  shouldEnterImmersiveForAutoStartTimerJumpMode,
  shouldOpenFocusDetailForAutoStartTimerJumpMode
} from './utils/autoStartTimerJumpMode';
import {
  AutoLinkViewLazy as AutoLinkView,
  FiltersSettingsViewLazy as FiltersSettingsView,
  FocusDetailViewLazy as FocusDetailView,
  SearchViewLazy as SearchView,
  SettingsViewLazy as SettingsView,
  ShareViewLazy as ShareView,
  startLazyViewPreload
} from './utils/lazyViews';

const APP_READY_EVENT = 'lumostime:app-ready';

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
import { DEFAULT_PRINCIPLE_PRESETS } from './constants/principlePresets';
import { DEFAULT_SCENE_PRESETS } from './constants/scenePresets';

const OverlayFallback: React.FC<{ label: string }> = ({ label }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#fdfbf7]">
    <div className="rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
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
    customStickerSets, setCustomStickerSets,
    customStickers, setCustomStickers,
    filters, setFilters,
    autoFocusNote, setAutoFocusNote,
    autoStartTimerJumpMode,
    timelineGalleryMode, setTimelineGalleryMode,
    timelineSortOrder, setTimelineSortOrder,
    timelineQuickActions, setTimelineQuickActions,
    collapseThreshold, setCollapseThreshold,
    manualSyncMode, setManualSyncMode
  } = useSettings();

  const { addToast } = useToast();
  const { openAIChat } = useAIChatWindow();
  const lastStorageErrorToastRef = useRef<{ signature: string; timestamp: number } | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let cancelled = false;
    let appStateListener: Awaited<ReturnType<typeof CapacitorApp.addListener>> | null = null;

    const consumePendingAssistantNavigation = async () => {
      try {
        const pendingNavigation = await AssistantAgent.consumePendingAssistantNavigation();
        if (cancelled || !pendingNavigation.hasPending) {
          return;
        }

        openAIChat({
          ...(pendingNavigation.targetSessionId ? { targetSessionId: pendingNavigation.targetSessionId } : {}),
          ...(pendingNavigation.targetMessageId ? { targetMessageId: pendingNavigation.targetMessageId } : {})
        });
      } catch (error) {
        if (!cancelled) {
          console.error('[App] Failed to consume pending assistant navigation', error);
        }
      }
    };

    void consumePendingAssistantNavigation();

    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        void consumePendingAssistantNavigation();
      }
    }).then((listener) => {
      appStateListener = listener;
    }).catch((error) => {
      console.error('[App] Failed to register assistant navigation listener', error);
    });

    return () => {
      cancelled = true;
      void appStateListener?.remove();
    };
  }, [openAIChat]);

  useEffect(() => {
    const handleStorageWriteError = (event: Event) => {
      const customEvent = event as CustomEvent<StorageWriteErrorDetail>;
      const detail = customEvent.detail;
      if (!detail) {
        return;
      }

      const now = Date.now();
      const signature = `${detail.key}:${detail.isQuotaExceeded}`;
      const lastToast = lastStorageErrorToastRef.current;

      if (lastToast && lastToast.signature === signature && now - lastToast.timestamp < 4000) {
        return;
      }

      lastStorageErrorToastRef.current = { signature, timestamp: now };
      addToast(
        'error',
        detail.isQuotaExceeded
          ? `写入失败：${detail.key}（存储空间不足）`
          : `写入失败：${detail.key}`
      );
    };

    window.addEventListener(STORAGE_WRITE_ERROR_EVENT, handleStorageWriteError as EventListener);
    return () => {
      window.removeEventListener(STORAGE_WRITE_ERROR_EVENT, handleStorageWriteError as EventListener);
    };
  }, [addToast]);

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
    isFiltersOpen, setIsFiltersOpen,
    activeFilterId, setActiveFilterId,
    isDailyReviewOpen, setIsDailyReviewOpen,
    isOnThisDayOpen, setIsOnThisDayOpen,
    currentReviewDate, setCurrentReviewDate,
    setCurrentOnThisDayDate,
    isWeeklyReviewOpen,
    isMonthlyReviewOpen,
    isAchievementOpen,
    selectedTagId, setSelectedTagId,
    selectedCategoryId, setSelectedCategoryId,
    selectedScopeId, setSelectedScopeId,
    setIsGoalBatchManaging,
    editingLog,
    editingTodo,
    newTodoDraft,
    editingGoal,
    goalScopeId,
    focusDetailSessionId, setFocusDetailSessionId,
    isShareViewOpen, setIsShareViewOpen,
    sharingLog,
    statsTitle, setStatsTitle,
    currentView, setCurrentView,
    setCurrentDate,
    initialLogTimes,
    setReturnToSearch,
    setIsSearchOpenedFromSettings,
    setIsGalleryViewOpen
  } = useNavigation();
  const { categories, scopes, goals, majorGoals, setCategories, setScopes, setGoals, setMajorGoals } = useCategoryScope();
  const { startActivity, stopActivity, cancelSession, activeSessions, setActiveSessions } = useSession();
  const { logs, todos, todoCategories, setLogs, setTodos, setTodoCategories } = useData();
  const {
    dailyReviews, weeklyReviews, monthlyReviews, onThisDayEntries, setDailyReviews, setWeeklyReviews, setMonthlyReviews, setOnThisDayEntries,
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
      logs, todos, categories, todoCategories, scopes, goals, majorGoals,
      autoLinkRules, reviewTemplates, checkTemplates, dailyReviews, weeklyReviews,
      monthlyReviews, onThisDayEntries, customNarrativeTemplates, userPersonalInfo, customStickerSets, customStickers, filters,
      sceneGroupState, // 新版：场景组状态
      sceneTimeSlots, // 添加场景设置
      principles, // 添加原则库
      version: '1.0.0',
      timestamp: getLocalDataTimestamp()
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
        const parsedData = JSON.parse(content);
        const { data, result } = validateAndFixData(parsedData);
        if (!result.isValid) {
          throw new Error(result.errors.join('; '));
        }

        await syncManager.handleSyncDataUpdate(data);
        setLocalDataTimestampValue(Date.now());
        addToast('success', 'Data imported successfully');
      } catch (error) {
        console.error('Import failed', error);
        const message = error instanceof Error ? error.message : 'Invalid JSON';
        addToast('error', `Import failed: ${message}`);
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

  React.useEffect(() => {
    if (!focusDetailSessionId) {
      return;
    }

    const hasFocusedSession = activeSessions.some((session) => session.id === focusDetailSessionId);
    if (hasFocusedSession) {
      return;
    }

    setFocusDetailSessionId(null);
    setShouldAutoEnterImmersive(false);
  }, [activeSessions, focusDetailSessionId, setFocusDetailSessionId]);
  
  // Wrappers for Session Actions to match original signature (injecting autoLinkRules)
  const handleStartActivityWrapper = (activity: any, categoryId: string, todoId?: string, scopeIdOrIds?: string | string[], note?: string, autoEnterFocus?: boolean) => {
    const resolvedJumpMode = resolveAutoStartTimerJumpMode(autoStartTimerJumpMode, autoEnterFocus);
    setShouldAutoOpenFocus(shouldOpenFocusDetailForAutoStartTimerJumpMode(resolvedJumpMode));
    setShouldAutoEnterImmersive(shouldEnterImmersiveForAutoStartTimerJumpMode(resolvedJumpMode));

    startActivity(activity, categoryId, autoLinkRules, todoId, scopeIdOrIds, note);
  };
  
  const handleStartTodoFocusWrapper = (todo: TodoItem, autoEnterFocus?: boolean) => {
    const resolvedJumpMode = resolveAutoStartTimerJumpMode(autoStartTimerJumpMode, autoEnterFocus);
    setShouldAutoOpenFocus(shouldOpenFocusDetailForAutoStartTimerJumpMode(resolvedJumpMode));
    setShouldAutoEnterImmersive(shouldEnterImmersiveForAutoStartTimerJumpMode(resolvedJumpMode));

    todoManager.handleStartTodoFocus(todo);
  };
  
  const handleStopActivityWrapper = (sessionId: string) => {
    stopActivity(
      sessionId,
      undefined,
      (logs) => logs.forEach(l => logManager.handleSaveLog(l))
    );
  };

  const handleRequestStopActivityWrapper = (sessionId: string) => {
    handleStopActivityWrapper(sessionId);
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

  const closeFiltersOverlay = () => {
    setActiveFilterId(null);
    setIsFiltersOpen(false);
  };

  const handleWidgetShortcutAction = React.useCallback((action: ShortcutWidgetAction) => {
    closeFiltersOverlay();
    setIsSettingsOpen(false);
    setIsAutoLinkOpen(false);
    setIsSearchOpenedFromSettings(false);

    switch (action) {
      case 'open_supplement_log': {
        const today = new Date();
        setCurrentView(AppView.TIMELINE);
        setIsSearchOpen(false);
        setIsGalleryViewOpen(false);
        setCurrentDate(today);
        logManager.openAddModal(undefined, undefined, undefined, today);
        break;
      }
      case 'quick_punch':
        setCurrentView(AppView.TIMELINE);
        setIsSearchOpen(false);
        setIsGalleryViewOpen(false);
        logManager.handleQuickPunch();
        break;
      case 'open_today_review':
        setCurrentView(AppView.TIMELINE);
        setIsSearchOpen(false);
        setIsGalleryViewOpen(false);
        reviewManager.handleOpenDailyReview(new Date());
        break;
      case 'open_search':
        setCurrentView(AppView.TIMELINE);
        setIsGalleryViewOpen(false);
        setIsSearchOpen(true);
        break;
      case 'open_gallery':
        setCurrentView(AppView.TIMELINE);
        setIsSearchOpen(false);
        setIsGalleryViewOpen(true);
        break;
      case 'open_ai_assistant':
        setCurrentView(AppView.TIMELINE);
        setIsSearchOpen(false);
        setIsGalleryViewOpen(false);
        openAIChat();
        break;
    }
  }, [
    closeFiltersOverlay,
    logManager,
    openAIChat,
    reviewManager,
    setCurrentView,
    setCurrentDate,
    setIsAutoLinkOpen,
    setIsGalleryViewOpen,
    setIsSearchOpen,
    setIsSearchOpenedFromSettings,
    setIsSettingsOpen
  ]);

  useDeepLink(
    logManager.handleQuickPunch,
    handleStartActivityWrapper,
    handleStopActivityWrapper,
    handleRequestStopActivityWrapper,
    handleWidgetShortcutAction
  );
  useFloatingWindow(handleStopActivityWrapper);
  useAppDetection(handleStartActivityWrapper);
  useWidgetBridgeSync();
  useFloatingWindowSync();

  React.useEffect(() => {
    const cleanup = startLazyViewPreload();
    return cleanup;
  }, []);

  // Calculate lastLogEndTime for AddLogModal
  const lastLogEndTime = React.useMemo(() => {
    if (!logs.length) return undefined;
    const sortedLogs = [...logs].sort((a, b) => b.endTime - a.endTime);
    return sortedLogs[0].endTime;
  }, [logs]);
  const showTodoDetailPage = currentView === AppView.TODO && isTodoModalOpen;
  const resetPrinciplesToDefaults = () => {
    localStorage.setItem('lumostime_principles', JSON.stringify(DEFAULT_PRINCIPLE_PRESETS));
    window.dispatchEvent(new Event('principleLibraryChanged'));
  };

  const clearPrinciples = () => {
    localStorage.setItem('lumostime_principles', JSON.stringify([]));
    window.dispatchEvent(new Event('principleLibraryChanged'));
  };

  const resetSceneGroupsToDefaults = () => {
    saveSceneGroupStateToStorage(buildSceneGroupStateFromLegacySlots(DEFAULT_SCENE_PRESETS));
    window.dispatchEvent(new Event('sceneGroupsUpdated'));
    window.dispatchEvent(new Event('sceneTimeSlotsUpdated'));
  };

  const todoDetailModalNode = isTodoModalOpen ? (
    <TodoDetailModal
      key={editingTodo?.id || `draft-${newTodoDraft?.parentTodoId || 'root'}-${newTodoDraft?.childOrder || 'new'}-${todoManager.todoCategoryToAdd || 'category'}`}
      initialTodo={editingTodo}
      initialDraft={editingTodo ? null : newTodoDraft}
      currentCategory={todoCategories.find(c => c.id === todoManager.todoCategoryToAdd) || todoCategories[0]}
      displayMode={showTodoDetailPage ? 'page' : 'overlay'}
      onClose={todoManager.closeTodoModal}
      onSave={todoManager.handleSaveTodo}
      onDelete={todoManager.handleDeleteTodo}
      onOpenTodo={todoManager.openEditTodoModal}
      onAddSubtask={todoManager.openAddSubtaskModal}
      logs={logs}
      onLogUpdate={logManager.handleSaveLog}
      onEditLog={logManager.openEditModal}
      todoCategories={todoCategories}
      categories={categories}
      scopes={scopes}
      todos={todos}
    />
  ) : null;

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
      handleCloseOnThisDay={() => {
        setIsOnThisDayOpen(false);
        setCurrentOnThisDayDate(null);
      }}
      handleCloseWeeklyReview={reviewManager.handleCloseWeeklyReview}
      handleCloseMonthlyReview={reviewManager.handleCloseMonthlyReview}
      statsTitle={statsTitle}
    >
      <div className={showTodoDetailPage ? 'hidden' : 'h-full'}>
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
        handleSaveTodo={todoManager.handleSaveTodo}
        handleDeleteTodo={todoManager.handleDeleteTodo}
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
      </div>
      {showTodoDetailPage && todoDetailModalNode}
      <BottomNavigation
        currentView={currentView}
        onViewChange={setCurrentView}
        isVisible={
          !focusDetailSessionId &&
          !isTodoModalOpen &&
          !isDailyReviewOpen &&
          !isOnThisDayOpen &&
          !isWeeklyReviewOpen &&
          !isMonthlyReviewOpen &&
          !isAchievementOpen &&
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
          onCompleteLinkedTodo={todoManager.handleCompleteTodo}
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

      {!showTodoDetailPage && todoDetailModalNode}

      {/* Delete Todo Confirmation */}
      <ConfirmModal
        isOpen={todoManager.isDeleteTodoConfirmOpen}
        title="Delete Task?"
        description={todoManager.todoDeleteChildCount > 0
          ? `This task has linked history and ${todoManager.todoDeleteChildCount} subtasks. Deleting it will also remove those subtasks and unlink related records while keeping the time logs. Are you sure?`
          : 'This task is linked to historical records. Deleting it will unlink those records but keep the time logs. Are you sure?'}
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
              onCompleteLinkedTodo={todoManager.handleCompleteTodo}
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

      {/* Custom Filters Overlay */}
      {isFiltersOpen && (
        <React.Suspense fallback={<OverlayFallback label="正在加载自定义筛选器..." />}>
          <FiltersSettingsView
            onBack={closeFiltersOverlay}
            onToast={addToast}
            filters={filters}
            onUpdateFilters={setFilters}
            logs={logs}
            categories={categories}
            scopes={scopes}
            todos={todos}
            todoCategories={todoCategories}
            onEditLog={logManager.openEditModal}
            selectedFilterId={activeFilterId}
            onSelectedFilterIdChange={setActiveFilterId}
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
              setMajorGoals([]);
              setReviewTemplates(DEFAULT_REVIEW_TEMPLATES);
              setCheckTemplates(DEFAULT_CHECK_TEMPLATES);
              setDailyReviews([]);
              setWeeklyReviews([]);
              setMonthlyReviews([]);
              setOnThisDayEntries([]);
              setAutoLinkRules([]);
              setCustomNarrativeTemplates([]);
              setUserPersonalInfo('');
              setCustomStickerSets([]);
              setCustomStickers([]);
              setFilters([]);
              resetPrinciplesToDefaults();
              resetSceneGroupsToDefaults();
              addToast('success', 'Data reset to defaults');
              setIsSettingsOpen(false);
            }}
            onClearData={() => {
              setLogs([]);
              setTodos([]);
              setGoals([]);
              setMajorGoals([]);
              setScopes([]);
              setReviewTemplates([]);
              setCheckTemplates([]);
              setDailyReviews([]);
              setWeeklyReviews([]);
              setMonthlyReviews([]);
              setOnThisDayEntries([]);
              setAutoLinkRules([]);
              setCustomNarrativeTemplates([]);
              setUserPersonalInfo('');
              setCustomStickerSets([]);
              setCustomStickers([]);
              setFilters([]);
              clearPrinciples();
              resetSceneGroupsToDefaults();
              addToast('success', 'Core data cleared; default categories were retained');
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
              majorGoals,
              autoLinkRules,
              reviewTemplates,
              checkTemplates,
              dailyReviews,
              weeklyReviews,
              monthlyReviews,
              customNarrativeTemplates,
              userPersonalInfo,
              customStickerSets,
              customStickers,
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
              setIsSearchOpenedFromSettings(true);
              setIsSearchOpen(true);
              setIsSettingsOpen(false);
            }}

            autoFocusNote={autoFocusNote}
            onToggleAutoFocusNote={() => setAutoFocusNote(!autoFocusNote)}

            timelineGalleryMode={timelineGalleryMode}
            onToggleTimelineGalleryMode={() => setTimelineGalleryMode(!timelineGalleryMode)}
            timelineSortOrder={timelineSortOrder}
            onSetTimelineSortOrder={setTimelineSortOrder}
            timelineQuickActions={timelineQuickActions}
            onSetTimelineQuickActions={setTimelineQuickActions}

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
              <CategoryScopeProviderWithData>
                <AchievementProviderWithData>
                  <NavigationProvider>
                    <AIChatWindowProvider>
                      <PrivacyProvider>
                        <AppBootstrapGate>
                          <AppContent />
                        </AppBootstrapGate>
                      </PrivacyProvider>
                    </AIChatWindowProvider>
                  </NavigationProvider>
                </AchievementProviderWithData>
              </CategoryScopeProviderWithData>
            </SessionProvider>
          </ReviewProvider>
        </SettingsProvider>
      </DataProvider>
    </ToastProvider>
  );
};

const AppBootstrapGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isReady: isDataReady } = useData();
  const { isReady: isReviewReady } = useReview();
  const { isReady: isCategoryScopeReady } = useCategoryScope();
  const { isReady: isAchievementReady } = useAchievement();
  const isAppReady = isDataReady && isReviewReady && isCategoryScopeReady && isAchievementReady;

  useEffect(() => {
    if (!isAppReady) {
      return;
    }

    window.dispatchEvent(new Event(APP_READY_EVENT));
  }, [isAppReady]);

  if (!isAppReady) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center text-sm text-stone-500 font-serif">
        正在加载本地数据...
      </div>
    );
  }

  return <>{children}</>;
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

const AchievementProviderWithData: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AchievementProvider>
      {children}
    </AchievementProvider>
  );
};

export default App;
