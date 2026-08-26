/**
 * @file App.tsx
 * @input localStorage (logs, todos, user preferences), Capacitor Plugins (AppUsage, FocusNotification), Services (webdav, ai, nfc)
 * @output Main UI Render, State Management, Data Persistence (JSON in localStorage)
 * @pos Root Component, Application Entry Point (Logic Hub)
 * @description The main component that holds the global state (logs, todos, active sessions) and handles routing between views and overlays, including preserving standalone return paths for search and custom filters while keeping export/import, NFC stop confirmation, and reset flows aligned with repository-backed data.
 * @updated 2026-08-26: Makes Routine transitions wait for each stopped step to enter the shared log-save path.
 * @updated 2026-06-21: Centralized active-session stop persistence so floating-ball stops and app-awareness finishes always submit logs through the same path.
 * @updated 2026-08-10: Excluded timeline Plan blocks from default backfill time inference.
 * @updated 2026-08-10: Adds temporary focus-detail ownership diagnostics for Android immersive-mode investigation.
 * @updated 2026-07-30: Mounted recurring auto-Plan creation so Repeat todo plan blocks are replenished once per day and after planning config edits.
 * @updated 2026-07-06: Included self-belief library data in user backup/export payloads and reset clearing so AI-created self-beliefs participate in cloud sync.
 * @updated 2026-06-15: Added a sync conflict confirmation modal so timestamp-vs-size contradictions during cloud sync now pause before a smaller JSON can overwrite a larger one.
 * @updated 2026-05-21: Localized the todo deletion confirmation modal into Chinese so the warning copy and action labels match the rest of the app.
 * @updated 2026-05-18: Added a desktop AI widget shell route that reuses the full app provider tree but swaps the normal layout for a compact always-on-top quick-chat window.
 * @updated 2026-05-18: Added bootstrap readiness timing logs so slow Electron startup can be traced to the async hydration gate.
 * @updated 2026-05-17: 在 Electron 主应用启动时自动恢复已启用的 PC 端小组件，并与设置页共享桌面小组件启动偏好读取逻辑。
 * @updated 2026-05-17: 增加 Electron 桌面小组件动作处理逻辑，支持 toggle_todo, open_todo 和 'start_focus' 快捷开始任务专注。
 * @updated 2026-08-25: Passes Activity updates and full log history into custom attribute controls for quick option creation and usage ordering.
 * @updated 2026-05-13: Normalized reserved todo categories before passing them into UI editors and pickers so the system `未来` bucket behaves like a first-class category even when older saved data has not persisted it yet.
 * @updated 2026-06-13: Included data collections and collection entries in JSON backup export payloads so themed collections travel with user data backups.
 * @updated 2026-05-18: Included the full achievement bottle backup block in JSON export payloads so synced exports now carry achievement progress too.
 * @updated 2026-05-18: Included the persisted custom color group in JSON export payloads so user-defined palette swatches travel with backup data.
 * @updated 2026-05-17: Added unified AI backup payload export so chat sessions, prompts, assistant memory, Dream state, and sanitized AI presets now travel inside the main JSON backup together with the rest of the app data.
 * @updated 2026-08-10: Included Android widget templates plus unified appearance and TimePal settings in JSON export payloads so configured widgets and visual preferences can be restored after reinstalling the app.
 * @updated 2026-08-11: Routes imported JSON through the explicit local-edit path so it is retained for the next cloud upload.
 * @updated 2026-05-10: Upgraded the post-start timer auto-jump flow to support none, focus-detail, and immersive entry modes while preserving scene-card immersive overrides.
 * @updated 2026-05-10: Made the widget supplement-log shortcut snap the timeline date back to today before opening the backfill modal.
 * @updated 2026-04-27: Passed todo delete callbacks into the shared quick-actions sheet path so list and week todo action bars can trigger task removal.
 * @updated 2026-04-22: Mounted the shared AI chat window at the app level so it can keep running in the background after the modal UI is closed.
 * @updated 2026-04-25: Added AI assistant widget shortcut handling so Android widget shortcut slots can open the shared AI chat window.
 * @updated 2026-04-26: Added Android assistant notification navigation consumption so tapping a background AI alert reopens the shared chat at the exact target message.
 * @updated 2026-07-31: Added a temporary active Chronicle layout state so tapping the active Timeline nav item toggles layouts without changing the settings default.
 * @updated 2026-08-11: Shows shareable Sentry error IDs for startup, local-data hydration, and imported-file failures.
 * @updated 2026-08-26: Added Routine configuration state and sequential session orchestration.
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Buffer } from 'buffer';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { AppView } from './types';
import type { ActiveRoutineRun, ActiveSession, AppAwarenessSessionMeta, Log, Routine, RoutineStep, TodoItem } from './types';
import { resetRoutineChecklist, toggleRoutineChecklistItem } from './utils/routineChecklist';
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
import { ReferenceDeleteModal } from './components/ReferenceDeleteModal';
import { SyncConflictModal } from './components/SyncConflictModal';
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
import { useAppAwarenessRuntime } from './hooks/useAppAwarenessRuntime';
import { useHardwareBackButton } from './hooks/useHardwareBackButton';
import { useAppLifecycle } from './hooks/useAppLifecycle';
import { useWidgetBridgeSync } from './hooks/useWidgetBridgeSync';
import { useFloatingWindowSync } from './hooks/useFloatingWindowSync';
import {
  completeStartupDiagnostics,
  markStartupStage,
  STARTUP_TIMEOUT_EVENT,
  type StartupTimeoutDetail
} from './services/startupDiagnostics';
import {
  CRITICAL_DATA_ERROR_EVENT,
  getLatestCriticalDataError,
  reportException,
  type CriticalDataErrorDetail,
  withErrorReference
} from './services/errorReporting';
import { useRecurringPlanAutoCreation } from './hooks/useRecurringPlanAutoCreation';
import { assistantBackupService } from './services/assistantBackupService';
import { appearanceBackupService } from './services/appearanceBackupService';
import { customColorGroupService } from './services/customColorGroupService';
import { getDesktopWidgetType, loadEnabledDesktopWidgetTypes } from './services/desktopWidgetService';
import { ShortcutWidgetAction } from './services/widgetShortcutService';
import { loadWidgetTemplatesFromStorage } from './services/widgetService';
import { splitLogByDays } from './utils/logUtils';
import { getLatestActualLogEndTime } from './utils/statLogUtils';
import { buildSceneGroupStateFromLegacySlots, getActiveSceneGroup, loadSceneGroupStateFromStorage, saveSceneGroupStateToStorage } from './utils/sceneGroupStorage';
import { getLocalDataTimestamp } from './utils/localDataTimestamp';
import { loadActiveRoutineRun, loadRoutines, saveActiveRoutineRun, saveRoutines } from './utils/routineStorage';
import { validateAndFixData } from './utils/dataValidation';
import { ensureQuickTodoCategory } from './utils/todoQuickCategoryUtils';
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
import { DesktopAIWidgetView } from './views/desktop/DesktopAIWidgetView';

const APP_READY_EVENT = 'lumostime:app-ready';
const getBootstrapTimingNow = (): number => (
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
);

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
import type { TimelineLayoutMode } from './services/timelineLayoutService';

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
    timelineLayout: defaultTimelineLayout,
    collapseThreshold, setCollapseThreshold,
    manualSyncMode, setManualSyncMode
  } = useSettings();

  const { addToast } = useToast();
  const { openAIChat } = useAIChatWindow();
  const [activeTimelineLayout, setActiveTimelineLayout] = useState<TimelineLayoutMode>(defaultTimelineLayout);
  const lastStorageErrorToastRef = useRef<{ signature: string; timestamp: number } | null>(null);
  const hasRestoredDesktopWidgetsRef = useRef(false);
  const desktopWindowType = getDesktopWidgetType();
  const isDesktopAIWidgetWindow = desktopWindowType === 'ai';

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
    isDailyNewspaperOpen, setIsDailyNewspaperOpen,
    setIsWeeklyNewspaperOpen,
    setIsMonthlyNewspaperOpen,
    isOnThisDayOpen, setIsOnThisDayOpen,
    currentReviewDate, setCurrentReviewDate,
    setCurrentDailyNewspaperDate,
    setCurrentWeeklyNewspaperStart,
    setCurrentWeeklyNewspaperEnd,
    setCurrentMonthlyNewspaperStart,
    setCurrentMonthlyNewspaperEnd,
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
  const previousMainViewRef = useRef<AppView>(currentView);

  useEffect(() => {
    if (currentView === AppView.TIMELINE && previousMainViewRef.current !== AppView.TIMELINE) {
      setActiveTimelineLayout(defaultTimelineLayout);
    }
    previousMainViewRef.current = currentView;
  }, [currentView, defaultTimelineLayout]);

  const handlePrimaryViewChange = useCallback((view: AppView) => {
    if (view === AppView.TIMELINE) {
      if (currentView === AppView.TIMELINE) {
        setActiveTimelineLayout((layout) => layout === 'timeline' ? 'timeline-todo' : 'timeline');
        return;
      }
      setActiveTimelineLayout(defaultTimelineLayout);
    }

    setCurrentView(view);
  }, [currentView, defaultTimelineLayout, setCurrentView]);

  const { categories, scopes, goals, majorGoals, setCategories, setScopes, setGoals, setMajorGoals, handleUpdateActivity } = useCategoryScope();
  const [routines, setRoutines] = useState<Routine[]>(() => loadRoutines());
  const [activeRoutineRun, setActiveRoutineRun] = useState<ActiveRoutineRun | null>(() => loadActiveRoutineRun());
  const activeRoutineRunRef = useRef<ActiveRoutineRun | null>(activeRoutineRun);
  const routinesRef = useRef<Routine[]>(routines);
  const routinesSnapshotRef = useRef(JSON.stringify(routines));

  useEffect(() => {
    routinesRef.current = routines;
    routinesSnapshotRef.current = JSON.stringify(routines);
    saveRoutines(routines);
  }, [routines]);

  useEffect(() => {
    const handleRoutinesUpdated = () => {
      const nextRoutines = loadRoutines();
      if (JSON.stringify(nextRoutines) !== routinesSnapshotRef.current) {
        setRoutines(nextRoutines);
      }
    };
    window.addEventListener('routinesUpdated', handleRoutinesUpdated);
    return () => window.removeEventListener('routinesUpdated', handleRoutinesUpdated);
  }, []);

  useEffect(() => {
    activeRoutineRunRef.current = activeRoutineRun;
    saveActiveRoutineRun(activeRoutineRun);
  }, [activeRoutineRun]);
  const { buildBackupPayload: buildAchievementBackupPayload } = useAchievement();
  const { startActivity, stopActivity, cancelSession, activeSessions, setActiveSessions } = useSession();
  const {
    logs,
    todos,
    todoCategories,
    collections,
    collectionEntries,
    setLogs,
    setTodos,
    setTodoCategories
  } = useData();
  const normalizedTodoCategories = useMemo(() => ensureQuickTodoCategory(todoCategories), [todoCategories]);
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
    const selfBeliefsStr = localStorage.getItem('lumostime_self_beliefs');
    const selfBeliefs = selfBeliefsStr ? JSON.parse(selfBeliefsStr) : [];
    const widgetTemplates = loadWidgetTemplatesFromStorage();
    const customColorGroup = customColorGroupService.getGroup();
    
    const data = {
      logs, todos, categories, todoCategories, collections, collectionEntries, scopes, goals, majorGoals,
      autoLinkRules, reviewTemplates, checkTemplates, dailyReviews, weeklyReviews,
      monthlyReviews, onThisDayEntries, customNarrativeTemplates, userPersonalInfo, customStickerSets, customStickers, filters,
      routines,
      customColorGroup,
      achievementData: buildAchievementBackupPayload(),
      aiData: assistantBackupService.buildBackupPayload(),
      appearanceData: appearanceBackupService.buildBackupPayload(),
      widgetTemplates,
      sceneGroupState, // 新版：场景组状态
      sceneTimeSlots, // 添加场景设置
      principles, // 添加原则库
      selfBeliefs, // 添加自我认知库
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

        await syncManager.handleLocalDataUpdate(data);
        addToast('success', 'Data imported successfully');
      } catch (error) {
        console.error('Import failed', error);
        const message = error instanceof Error ? error.message : 'Invalid JSON';
        const sentryEventId = reportException(error, {
          feature: 'data_import',
          operation: 'import_json_backup'
        });
        addToast('error', withErrorReference(`Import failed: ${message}`, sentryEventId));
      }
    };
    reader.readAsText(file);
  };

  // Use Custom Hooks
  useAppInitialization();
  useRecurringPlanAutoCreation();
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
  const handleStartActivityWrapper = (
    activity: any,
    categoryId: string,
    todoId?: string,
    scopeIdOrIds?: string | string[],
    note?: string,
    autoEnterFocus?: boolean,
    appAwarenessMeta?: AppAwarenessSessionMeta
  ) => {
    const resolvedJumpMode = resolveAutoStartTimerJumpMode(autoStartTimerJumpMode, autoEnterFocus);
    setShouldAutoOpenFocus(shouldOpenFocusDetailForAutoStartTimerJumpMode(resolvedJumpMode));
    setShouldAutoEnterImmersive(shouldEnterImmersiveForAutoStartTimerJumpMode(resolvedJumpMode));

    return startActivity(activity, categoryId, autoLinkRules, todoId, scopeIdOrIds, note, appAwarenessMeta);
  };

  const resolveRoutineStep = useCallback((step: RoutineStep) => {
    const linkedTodo = step.linkedTodoId ? todos.find(todo => todo.id === step.linkedTodoId) : undefined;
    const categoryId = linkedTodo?.linkedCategoryId || step.categoryId;
    const activityId = linkedTodo?.linkedActivityId || step.activityId;
    const activity = categories
      .find(category => category.id === categoryId)
      ?.activities.find(item => item.id === activityId);
    return {
      linkedTodo,
      activity,
      categoryId,
      scopeIds: linkedTodo?.defaultScopeIds || step.scopeIds
    };
  }, [categories, todos]);

  const startRoutine = useCallback((routine: Routine) => {
    if (activeRoutineRunRef.current) {
      addToast('info', '已有 Routine 正在运行');
      return;
    }

    const firstStep = routine.steps[0];
    if (!firstStep) {
      addToast('error', 'Routine 至少需要一个步骤');
      return;
    }

    const { activity, categoryId, linkedTodo, scopeIds } = resolveRoutineStep(firstStep);
    if (!activity) {
      addToast('error', 'Routine 的活动已不存在，请前往设置检查');
      return;
    }

    const checklistMarkdown = resetRoutineChecklist(firstStep.checklistMarkdown);
    const sessionId = handleStartActivityWrapper(activity, categoryId, linkedTodo?.id, scopeIds);
    setActiveRoutineRun({
      routineId: routine.id,
      currentStepIndex: 0,
      routineStartedAt: Date.now(),
      currentSessionId: sessionId,
      checklistMarkdown
    });
  }, [addToast, autoLinkRules, resolveRoutineStep, startActivity]);

  const advanceRoutine = () => {
    const run = activeRoutineRunRef.current;
    if (!run) return;
    handleStopActivityWrapper(run.currentSessionId, run.checklistMarkdown ? { note: run.checklistMarkdown } : undefined);
  };

  const toggleRoutineChecklist = useCallback((index: number) => {
    setActiveRoutineRun(current => {
      if (!current) return current;
      const routine = routinesRef.current.find(item => item.id === current.routineId);
      const step = routine?.steps[current.currentStepIndex];
      const next = {
        ...current,
        checklistMarkdown: toggleRoutineChecklistItem(current.checklistMarkdown ?? step?.checklistMarkdown, index)
      };
      activeRoutineRunRef.current = next;
      return next;
    });
  }, []);

  const exitRoutine = useCallback(() => {
    const run = activeRoutineRunRef.current;
    if (run) {
      cancelSession(run.currentSessionId);
    }
    setActiveRoutineRun(null);
  }, [cancelSession]);
  
  const handleStartTodoFocusWrapper = (todo: TodoItem, autoEnterFocus?: boolean) => {
    const resolvedJumpMode = resolveAutoStartTimerJumpMode(autoStartTimerJumpMode, autoEnterFocus);
    setShouldAutoOpenFocus(shouldOpenFocusDetailForAutoStartTimerJumpMode(resolvedJumpMode));
    setShouldAutoEnterImmersive(shouldEnterImmersiveForAutoStartTimerJumpMode(resolvedJumpMode));

    todoManager.handleStartTodoFocus(todo);
  };

  const persistStoppedSessionLogs = (stoppedLogs: Log[]) => {
    stoppedLogs.forEach((log) => logManager.handleSaveLog(log));
  };

  const handleStopActivityWrapper = (sessionId: string, finalSessionData?: Partial<ActiveSession>) => {
    const routineRun = activeRoutineRunRef.current;
    stopActivity(
      sessionId,
      finalSessionData,
      stoppedLogs => {
        persistStoppedSessionLogs(stoppedLogs);

        if (routineRun?.currentSessionId !== sessionId) {
          return;
        }

        const routine = routinesRef.current.find(item => item.id === routineRun.routineId);
        const nextIndex = routineRun.currentStepIndex + 1;
        const nextStep = routine?.steps[nextIndex];
        if (!routine || !nextStep) {
          setActiveRoutineRun(null);
          return;
        }

        const { activity: nextActivity, categoryId: nextCategoryId, linkedTodo: nextTodo, scopeIds: nextScopeIds } = resolveRoutineStep(nextStep);
        if (!nextActivity) {
          setActiveRoutineRun(null);
          addToast('error', 'Routine 的下一步活动已不存在');
          return;
        }

        const nextSessionChecklistMarkdown = resetRoutineChecklist(nextStep.checklistMarkdown);
        const nextSessionId = startActivity(nextActivity, nextCategoryId, autoLinkRules, nextTodo?.id, nextScopeIds);
        setActiveRoutineRun({
          ...routineRun,
          currentStepIndex: nextIndex,
          currentSessionId: nextSessionId,
          checklistMarkdown: nextSessionChecklistMarkdown
        });
      }
    );
  };

  const handleCancelSessionWrapper = (sessionId: string) => {
    cancelSession(sessionId);
    if (activeRoutineRunRef.current?.currentSessionId === sessionId) {
      setActiveRoutineRun(null);
    }
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

  const handleOpenQuickTodoAdd = React.useCallback(() => {
    setCurrentView(AppView.TODO);
    window.dispatchEvent(new Event('lumostime:open-quick-todo-add'));
  }, [setCurrentView]);

  const handleDesktopWidgetAction = React.useCallback((action: DesktopWidgetBridgeAction) => {
    closeFiltersOverlay();
    setIsSettingsOpen(false);
    setIsAutoLinkOpen(false);
    setIsSearchOpen(false);
    setIsSearchOpenedFromSettings(false);
    setIsGalleryViewOpen(false);

    if (action.type === 'stop_active_session_and_save') {
      handleStopActivityWrapper(action.sessionId);
      return;
    }

    if (action.type === 'add_quick_todo') {
      const newTodo = {
        id: crypto.randomUUID(),
        categoryId: '__virtual_quick__',
        kind: 'quick' as const,
        title: action.title,
        isCompleted: false,
        pin: false,
        completedUnits: 0
      };
      todoManager.handleSaveTodo(newTodo);
      return;
    }

    if (action.type === 'toggle_todo') {
      if (todos.some((todo) => todo.id === action.todoId)) {
        todoManager.handleToggleTodo(action.todoId);
      }
      return;
    }

    const liveTodo = todos.find((todo) => todo.id === action.todoId);
    if (!liveTodo) return;

    if (action.type === 'start_focus') {
      handleStartTodoFocusWrapper(liveTodo, true);
      return;
    }

    setCurrentView(AppView.TODO);
    todoManager.openEditTodoModal(liveTodo);
  }, [
    closeFiltersOverlay,
    setCurrentView,
    setIsAutoLinkOpen,
    setIsGalleryViewOpen,
    setIsSearchOpen,
    setIsSearchOpenedFromSettings,
    setIsSettingsOpen,
    todoManager,
    todos,
    handleStartTodoFocusWrapper
  ]);

  useEffect(() => {
    if (!window.desktopWidget || hasRestoredDesktopWidgetsRef.current || desktopWindowType !== null) {
      return;
    }

    hasRestoredDesktopWidgetsRef.current = true;

    loadEnabledDesktopWidgetTypes(localStorage).forEach((widgetType) => {
      if (widgetType === 'today') {
        window.desktopWidget?.open();
        return;
      }
      if (widgetType === 'month') {
        window.desktopWidget?.openMonth();
        return;
      }
      if (widgetType === 'quick') {
        window.desktopWidget?.openQuick?.();
        return;
      }
      if (widgetType === 'timer') {
        window.desktopWidget?.openTimer?.();
        return;
      }
      if (widgetType === 'ai') {
        window.desktopWidget?.openAI?.();
      }
    });
  }, [desktopWindowType]);

  useEffect(() => {
    if (!window.desktopWidget || desktopWindowType !== null) {
      return;
    }

    const unsubscribe = window.desktopWidget.onMainAction(handleDesktopWidgetAction);
    window.desktopWidget.notifyMainReady();

    return () => {
      unsubscribe();
    };
  }, [desktopWindowType, handleDesktopWidgetAction]);

  useDeepLink(
    logManager.handleQuickPunch,
    handleStartActivityWrapper,
    handleStopActivityWrapper,
    handleRequestStopActivityWrapper,
    handleWidgetShortcutAction,
    handleOpenQuickTodoAdd
  );
  useFloatingWindow(handleStopActivityWrapper);
  useAppDetection(handleStartActivityWrapper);
  useAppAwarenessRuntime({
    handleStartActivity: handleStartActivityWrapper,
    handleStopActivity: handleStopActivityWrapper
  });
  useWidgetBridgeSync();
  useFloatingWindowSync();

  React.useEffect(() => {
    const cleanup = startLazyViewPreload();
    return cleanup;
  }, []);

  if (isDesktopAIWidgetWindow) {
    return <DesktopAIWidgetView />;
  }

  // Calculate lastLogEndTime for AddLogModal
  const lastLogEndTime = React.useMemo(() => {
    return getLatestActualLogEndTime(logs);
  }, [logs]);
  const showTodoDetailPage = currentView === AppView.TODO && isTodoModalOpen;
  const resetPrinciplesToDefaults = () => {
    localStorage.setItem('lumostime_principles', JSON.stringify(DEFAULT_PRINCIPLE_PRESETS));
    window.dispatchEvent(new Event('principleLibraryChanged'));
  };

  const clearPrinciples = () => {
    localStorage.setItem('lumostime_principles', JSON.stringify([]));
    localStorage.setItem('lumostime_self_beliefs', JSON.stringify([]));
    window.dispatchEvent(new Event('principleLibraryChanged'));
    window.dispatchEvent(new Event('selfBeliefLibraryChanged'));
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
      currentCategory={normalizedTodoCategories.find(c => c.id === todoManager.todoCategoryToAdd) || normalizedTodoCategories[0]}
      displayMode={showTodoDetailPage ? 'page' : 'overlay'}
      onClose={todoManager.closeTodoModal}
      onSave={todoManager.handleSaveTodo}
      onDelete={todoManager.handleDeleteTodo}
      onOpenTodo={todoManager.openEditTodoModal}
      onAddSubtask={todoManager.openAddSubtaskModal}
      logs={logs}
      onLogUpdate={logManager.handleSaveLog}
      onEditLog={logManager.openEditModal}
      todoCategories={normalizedTodoCategories}
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
      handleCloseDailyNewspaper={() => {
        setIsDailyNewspaperOpen(false);
        setCurrentDailyNewspaperDate(null);
      }}
      handleCloseWeeklyNewspaper={() => {
        setIsWeeklyNewspaperOpen(false);
        setCurrentWeeklyNewspaperStart(null);
        setCurrentWeeklyNewspaperEnd(null);
      }}
      handleCloseMonthlyNewspaper={() => {
        setIsMonthlyNewspaperOpen(false);
        setCurrentMonthlyNewspaperStart(null);
        setCurrentMonthlyNewspaperEnd(null);
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
        routines={routines}
        activeRoutineRun={activeRoutineRun}
        onStartRoutine={startRoutine}
        onAdvanceRoutine={advanceRoutine}
        onToggleRoutineChecklist={toggleRoutineChecklist}
        onExitRoutine={exitRoutine}
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
        activeTimelineLayout={activeTimelineLayout}
        refreshKey={syncManager.refreshKey}
        isSyncing={syncManager.isSyncing}
        handleQuickSync={syncManager.handleQuickSync}
        setStatsTitle={setStatsTitle}
        />
      </div>
      {showTodoDetailPage && todoDetailModalNode}
      <BottomNavigation
        currentView={currentView}
        onViewChange={handlePrimaryViewChange}
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
          currentView !== AppView.DAILY_CHECKS &&
          currentView !== AppView.DAILY_CHECK_DETAIL &&
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
          onUpdateActivity={handleUpdateActivity}
          todos={todos}
          todoCategories={normalizedTodoCategories}
          scopes={scopes}
          autoLinkRules={autoLinkRules}
          autoApplyAutoLinkRules={autoApplyAutoLinkRules}
          autoApplyTodoLink={autoApplyTodoLink}
          autoFocusNote={autoFocusNote}
          allLogs={logs}
          onSplit={logManager.handleSplitLog}
        />
      )}

      {!showTodoDetailPage && todoDetailModalNode}

      {/* Delete Todo Confirmation */}
      <ReferenceDeleteModal
        isOpen={todoManager.isDeleteTodoConfirmOpen}
        title="删除待办并处理关联"
        description={todoManager.todoDeleteChildCount > 0
          ? `该待办包含 ${todoManager.todoDeleteChildCount} 个子任务。请先选择历史记录和当前计时的处理方式。`
          : '请先选择历史记录和当前计时的处理方式。'}
        sourceName={todos.find((todo) => todo.id === todoManager.todoToDeleteId)?.title || '待办'}
        targetLabel="待办"
        impact={todoManager.todoDeleteReferenceImpact}
        targets={todos.filter((todo) => !todo.isCompleted && !todoManager.todoDeleteTargetIds.includes(todo.id)).map((todo) => ({ id: todo.id, name: todo.title }))}
        onConfirm={todoManager.handleConfirmDeleteTodo}
        onClose={() => todoManager.setIsDeleteTodoConfirmOpen(false)}
      />

      {isGoalEditorOpen && (
        <GoalEditor
          onClose={goalManager.closeGoalEditor}
          onSave={goalManager.handleSaveGoal}
          onDelete={goalManager.handleDeleteGoal}
          goal={editingGoal || undefined}
          scopeId={goalScopeId || ''}
          categories={categories}
          todoCategories={normalizedTodoCategories}
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
          todoCategories={normalizedTodoCategories}
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
              todoCategories={normalizedTodoCategories}
              scopes={scopes}
              logs={logs}
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
                handleStopActivityWrapper(finalSession.id, finalSession);
                setFocusDetailSessionId(null);
                setShouldAutoEnterImmersive(false);
              }}
              onCompleteLinkedTodo={todoManager.handleCompleteTodo}
              onUpdate={(updated) => {
                setActiveSessions(prev => prev.map(s =>
                  s.id === updated.id ? updated : s
                ));
              }}
              onUpdateActivity={handleUpdateActivity}
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
            todoCategories={normalizedTodoCategories}
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
            todoCategories={normalizedTodoCategories}
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
              setRoutines([]);
              setActiveRoutineRun(null);
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
              setRoutines([]);
              setActiveRoutineRun(null);
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
            onLocalDataUpdate={syncManager.handleLocalDataUpdate}

            // Data Props
            logs={logs}
            todos={todos}
            categoriesData={categories}
            todoCategories={normalizedTodoCategories}
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
              collections,
              collectionEntries,
              scopes,
              goals,
              majorGoals,
              autoLinkRules,
              reviewTemplates,
              checkTemplates,
              dailyReviews,
              weeklyReviews,
              monthlyReviews,
              onThisDayEntries,
              customNarrativeTemplates,
              userPersonalInfo,
              customStickerSets,
              customStickers,
              filters,
              routines,
              customColorGroup: customColorGroupService.getGroup(),
              achievementData: buildAchievementBackupPayload(),
              aiData: assistantBackupService.buildBackupPayload(),
              appearanceData: appearanceBackupService.buildBackupPayload(),
              widgetTemplates: loadWidgetTemplatesFromStorage(),
              selfBeliefs: JSON.parse(localStorage.getItem('lumostime_self_beliefs') || '[]')
            }}
            onEditTodo={todoManager.openEditTodoModal}

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

            routines={routines}
            onUpdateRoutines={setRoutines}

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
        scopes={scopes}
        onStop={handleStopActivityWrapper}
        onCancel={handleCancelSessionWrapper}
        onClick={(session) => setFocusDetailSessionId(session.id)}
      />
      
      {/* Sync Direction Modal */}
      <SyncDirectionModal
        isOpen={syncManager.isSyncDirectionModalOpen}
        onClose={() => syncManager.setIsSyncDirectionModalOpen(false)}
        onUpload={syncManager.handleManualUpload}
        onDownload={syncManager.handleManualDownload}
      />

      <SyncConflictModal
        isOpen={syncManager.syncConflictModalState.isOpen}
        title="同步方向冲突"
        description={syncManager.syncConflictModalState.decision
          ? syncManager.buildSyncConflictDescription(
            syncManager.syncConflictModalState.mode,
            syncManager.syncConflictModalState.localTimestamp,
            syncManager.syncConflictModalState.cloudTimestamp,
            syncManager.syncConflictModalState.decision
          )
          : ''}
        onClose={syncManager.closeSyncConflictModal}
        onUpload={syncManager.handleConflictUpload}
        onDownload={syncManager.handleConflictDownload}
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
  const isStartupTimeoutSimulation = import.meta.env.DEV &&
    new URLSearchParams(window.location.search).has('simulate-startup-timeout');
  const isAppReady = isDataReady &&
    isReviewReady &&
    isCategoryScopeReady &&
    isAchievementReady &&
    !isStartupTimeoutSimulation;
  const bootstrapStartedAtRef = useRef(getBootstrapTimingNow());
  const lastLoggedStateRef = useRef<string | null>(null);
  const [startupTimeoutEventId, setStartupTimeoutEventId] = useState<string | null | undefined>(undefined);
  const [criticalDataError, setCriticalDataError] = useState<CriticalDataErrorDetail | null>(
    getLatestCriticalDataError
  );

  useEffect(() => {
    const handleStartupTimeout = (event: Event) => {
      const detail = (event as CustomEvent<StartupTimeoutDetail>).detail;
      setStartupTimeoutEventId(detail?.sentryEventId ?? null);
    };
    window.addEventListener(STARTUP_TIMEOUT_EVENT, handleStartupTimeout);
    return () => window.removeEventListener(STARTUP_TIMEOUT_EVENT, handleStartupTimeout);
  }, []);

  useEffect(() => {
    const handleCriticalDataError = (event: Event) => {
      const detail = (event as CustomEvent<CriticalDataErrorDetail>).detail;
      if (!detail) {
        return;
      }

      setCriticalDataError((current) => current || detail);
    };

    window.addEventListener(CRITICAL_DATA_ERROR_EVENT, handleCriticalDataError);
    return () => window.removeEventListener(CRITICAL_DATA_ERROR_EVENT, handleCriticalDataError);
  }, []);

  useEffect(() => {
    const readinessState = JSON.stringify({
      isDataReady,
      isReviewReady,
      isCategoryScopeReady,
      isAchievementReady
    });

    if (lastLoggedStateRef.current === readinessState) {
      return;
    }

    lastLoggedStateRef.current = readinessState;
    console.info('[AppBootstrapGate] readiness changed', JSON.parse(readinessState));
    markStartupStage(
      isStartupTimeoutSimulation ? 'startup_timeout_simulation' : 'provider_hydration',
      JSON.parse(readinessState)
    );
  }, [isAchievementReady, isCategoryScopeReady, isDataReady, isReviewReady, isStartupTimeoutSimulation]);

  useEffect(() => {
    if (!isAppReady) {
      return;
    }

    console.info(
      `[AppBootstrapGate] app ready after ${(getBootstrapTimingNow() - bootstrapStartedAtRef.current).toFixed(1)}ms`
    );
    completeStartupDiagnostics();
    window.dispatchEvent(new Event(APP_READY_EVENT));
  }, [isAppReady]);

  if (criticalDataError || !isAppReady) {
    const errorMessage = criticalDataError?.message || '加载本地数据超时';
    const sentryEventId = criticalDataError?.sentryEventId ?? startupTimeoutEventId;

    if (criticalDataError || startupTimeoutEventId !== undefined) {
      return (
        <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center gap-5 px-6 text-center font-serif">
          <div className="text-base text-stone-700">{errorMessage}</div>
          {sentryEventId ? (
            <div className="flex max-w-full flex-col items-center gap-2 text-xs text-stone-500">
              <code className="max-w-full break-all border border-stone-200 bg-white px-3 py-2 text-stone-700">
                错误编号：{sentryEventId}
              </code>
              <button
                type="button"
                className="text-sm text-stone-700 underline"
                onClick={() => void navigator.clipboard?.writeText(sentryEventId)}
              >
                复制错误编号
              </button>
            </div>
          ) : (
            <div className="text-xs text-stone-500">诊断上报未启用</div>
          )}
          <button
            type="button"
            className="border border-stone-300 px-4 py-2 text-sm text-stone-700"
            onClick={() => window.location.reload()}
          >
            重试
          </button>
        </div>
      );
    }

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
