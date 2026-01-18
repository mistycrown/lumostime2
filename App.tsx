/**
 * @file App.tsx
 * @input localStorage (logs, todos, user preferences), Capacitor Plugins (AppUsage, FocusNotification), Services (webdav, ai, nfc)
 * @output Main UI Render, State Management, Data Persistence (JSON in localStorage)
 * @pos Root Component, Application Entry Point (Logic Hub)
 * @description The main component that holds the global state (logs, todos, active sessions) and handles routing between views (Record, Stats, Timeline, etc.).
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useEffect, useRef } from 'react';
import { RecordView } from './views/RecordView';
import { StatsView } from './views/StatsView';
import { TimelineView } from './views/TimelineView';
import { SettingsView } from './views/SettingsView';
import { TagsView } from './views/TagsView';
import { TagDetailView } from './views/TagDetailView';
import { TodoView } from './views/TodoView';
import { ScopeView } from './views/ScopeView';
import { ScopeManageView } from './views/ScopeManageView';
import { ScopeDetailView } from './views/ScopeDetailView';
import { FocusDetailView } from './views/FocusDetailView';
import { CategoryDetailView } from './views/CategoryDetailView';
import { TodoBatchManageView } from './views/TodoBatchManageView';
import { AutoLinkView } from './views/AutoLinkView';
import { SearchView } from './views/SearchView';
import { DailyReviewView } from './views/DailyReviewView'; // 新增：每日回顾
import { WeeklyReviewView } from './views/WeeklyReviewView'; // 新增：每周回顾
import { MonthlyReviewView } from './views/MonthlyReviewView'; // 新增：每月回顾
import { ReviewHubView } from './views/ReviewHubView'; // 新增：复盘汇总
import { TimerFloating } from './components/TimerFloating';
import { AddLogModal } from './components/AddLogModal';
import { TodoDetailModal } from './components/TodoDetailModal';
import { GoalEditor } from './components/GoalEditor';
import { BottomNavigation } from './components/BottomNavigation';
import { ModalManager } from './components/ModalManager';
import { ConfirmModal } from './components/ConfirmModal';
import { Activity, ActiveSession, AppView, Log, TodoItem, TodoCategory, Category, Goal, AutoLinkRule, DailyReview, WeeklyReview, MonthlyReview, ReviewTemplate, NarrativeTemplate, Filter } from './types';
import { INITIAL_LOGS, INITIAL_TODOS, MOCK_TODO_CATEGORIES, VIEW_TITLES, CATEGORIES, SCOPES, INITIAL_GOALS, DEFAULT_REVIEW_TEMPLATES, DEFAULT_USER_PERSONAL_INFO, INITIAL_DAILY_REVIEWS, DEFAULT_CHECK_TEMPLATES } from './constants';
import { ToastMessage, ToastType } from './components/Toast';
import { webdavService } from './services/webdavService';
import { splitLogByDays } from './utils/logUtils';
import { ParsedTimeEntry, aiService } from './services/aiService';
import { narrativeService } from './services/narrativeService';
import { imageService } from './services/imageService';
import { syncService } from './services/syncService';
import { UpdateService } from './services/updateService';
import { NfcService } from './services/NfcService';
import { NARRATIVE_TEMPLATES } from './constants';
import FocusNotification from './plugins/FocusNotificationPlugin';
import AppUsage from './plugins/AppUsagePlugin';
import * as LucideIcons from 'lucide-react';
import {
  PlusCircle,
  BarChart2,
  Clock,
  Settings as SettingsIcon,
  Tag,
  Briefcase,
  ChevronLeft,
  CheckSquare,
  Settings2,
  Maximize2,
  RefreshCw,
  Settings,
  Layout,
  BookOpen,
  BookMarked,
  Target
} from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Buffer } from 'buffer';

// Polyfill Buffer for webdav library
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

// Helper to format date to YYYY-MM-DD string
const formatDate = (date: Date): string => date.toISOString().split('T')[0];

import { ToastProvider, useToast } from './contexts/ToastContext';
import { DataProvider, useData } from './contexts/DataContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ReviewProvider, useReview } from './contexts/ReviewContext';
import { SessionProvider, useSession } from './contexts/SessionContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { CategoryScopeProvider, useCategoryScope } from './contexts/CategoryScopeContext';



const AppContent: React.FC = () => {
  const { addToast } = useToast();
  const { logs, setLogs, todos, setTodos, todoCategories, setTodoCategories } = useData();
  const {
    startWeekOnSunday, setStartWeekOnSunday,
    minIdleTimeThreshold, setMinIdleTimeThreshold,
    defaultView, setDefaultView,
    autoLinkRules, setAutoLinkRules,
    appRules, setAppRules,
    customNarrativeTemplates, setCustomNarrativeTemplates,
    userPersonalInfo, setUserPersonalInfo,
    filters, setFilters,
    lastSyncTime, setLastSyncTime, updateLastSyncTime,
    dataLastModified, setDataLastModified, isRestoring,
    autoFocusNote, setAutoFocusNote
  } = useSettings();
  const {
    reviewTemplates, setReviewTemplates,
    dailyReviewTime, setDailyReviewTime,
    weeklyReviewTime, setWeeklyReviewTime,
    monthlyReviewTime, setMonthlyReviewTime,
    dailyReviews, setDailyReviews,
    weeklyReviews, setWeeklyReviews,
    monthlyReviews, setMonthlyReviews,
    checkTemplates, setCheckTemplates
  } = useReview();
  const {
    activeSessions,
    setActiveSessions,
    focusDetailSessionId,
    setFocusDetailSessionId,
    startActivity,
    stopActivity,
    cancelSession
  } = useSession();
  const {
    currentView, setCurrentView,
    isSettingsOpen, setIsSettingsOpen,
    isAutoLinkOpen, setIsAutoLinkOpen,
    isSearchOpen, setIsSearchOpen,
    isStatsFullScreen, setIsStatsFullScreen,
    statsTitle, setStatsTitle,
    isAddModalOpen, setIsAddModalOpen,
    isTodoModalOpen, setIsTodoModalOpen,
    isTodoManaging, setIsTodoManaging,
    isGoalEditorOpen, setIsGoalEditorOpen,
    isTagsManaging, setIsTagsManaging,
    isScopeManaging, setIsScopeManaging,
    isDailyReviewOpen, setIsDailyReviewOpen,
    isWeeklyReviewOpen, setIsWeeklyReviewOpen,
    isMonthlyReviewOpen, setIsMonthlyReviewOpen,
    selectedTagId, setSelectedTagId,
    selectedCategoryId, setSelectedCategoryId,
    selectedScopeId, setSelectedScopeId,
    editingLog, setEditingLog,
    editingTodo, setEditingTodo,
    editingGoal, setEditingGoal,
    currentReviewDate, setCurrentReviewDate,
    currentWeeklyReviewStart, setCurrentWeeklyReviewStart,
    currentWeeklyReviewEnd, setCurrentWeeklyReviewEnd,
    currentMonthlyReviewStart, setCurrentMonthlyReviewStart,
    currentMonthlyReviewEnd, setCurrentMonthlyReviewEnd,
    returnToSearch, setReturnToSearch,
    isOpenedFromSearch, setIsOpenedFromSearch,
    isSearchOpenedFromSettings, setIsSearchOpenedFromSettings,
    todoCategoryToAdd, setTodoCategoryToAdd,
    goalScopeId, setGoalScopeId,
    initialLogTimes, setInitialLogTimes
  } = useNavigation();
  const {
    categories,
    setCategories,
    handleUpdateCategories,
    handleUpdateCategory,
    handleUpdateActivity,
    handleCategoryChange,
    scopes,
    setScopes,
    handleUpdateScopes,
    goals,
    setGoals
  } = useCategoryScope();

  const [isSyncing, setIsSyncing] = useState(false);
  const lastPromptTimeRef = useRef(0);
  const hasCleanedImagesRef = useRef(false);

  // Load app rules on mount
  useEffect(() => {
    const loadAppRules = async () => {
      if (Capacitor.getPlatform() === 'android') {
        try {
          const result = await AppUsage.getAppRules();
          setAppRules(result.rules || {});
          console.log('📋 已加载应用规则:', result.rules);
        } catch (e) {
          console.error('加载应用规则失败:', e);
        }
      }
    };
    loadAppRules();
  }, []);

  // Auto-cleanup deleted images from logs on load
  useEffect(() => {
    const cleanLogs = async () => {
      // Only run once when logs are loaded
      if (hasCleanedImagesRef.current || logs.length === 0) return;

      try {
        const validImages = new Set(await imageService.listImages());
        let changed = false;
        const newLogs = logs.map(log => {
          if (!log.images || log.images.length === 0) return log;
          const valid = log.images.filter(img => validImages.has(img));
          if (valid.length !== log.images.length) {
            changed = true;
            return { ...log, images: valid };
          }
          return log;
        });

        if (changed) {
          console.log('🧹 [Auto-Cleanup] Removed invalid image references from logs.');
          setLogs(newLogs);
        }
        hasCleanedImagesRef.current = true;
      } catch (e) {
        console.error('Auto-cleanup failed', e);
      }
    };
    cleanLogs();
  }, [logs]);

  // Check for Updates on Mount
  useEffect(() => {
    const checkUpdates = async () => {
      console.log('App: checking for updates...');
      try {
        const updateInfo = await UpdateService.checkNeedsUpdate();
        if (updateInfo) {
          addToast('info', `发现新版本: ${updateInfo.version}`);
          console.log('App: Update found', updateInfo);
        } else {
          console.log('App check: No updates found (System is up to date)');
        }
      } catch (e) {
        console.error('App: Update check failed', e);
      }
    };
    checkUpdates();
  }, []);





  // Session 管理适配器（为保持调用兼容性）
  const handleStartActivity = (activity: Activity, categoryId: string, todoId?: string, scopeIdOrIds?: string | string[], note?: string) => {
    startActivity(activity, categoryId, autoLinkRules, todoId, scopeIdOrIds, note);
  };

  const handleStopActivity = (sessionId: string, finalSessionData?: ActiveSession) => {
    stopActivity(
      sessionId,
      finalSessionData,
      (logs) => setLogs(prev => [...logs, ...prev]),
      (linkedTodoId, progressIncrement) => {
        setTodos(prev => prev.map(t => {
          if (t.id === linkedTodoId && t.isProgress) {
            const current = t.completedUnits || 0;
            return { ...t, completedUnits: current + progressIncrement };
          }
          return t;
        }));
      }
    );
  };

  const handleCancelSession = (sessionId: string) => {
    cancelSession(sessionId);
  };


  const handleUpdateSession = (updatedSession: ActiveSession) => {
    setActiveSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
  };

  // --- Log Management ---
  const handleSaveLog = (log: Log) => {
    // 1. Resolve Old Log State to handle Todo Progress Updates
    const existingLog = logs.find(l => l.id === log.id);

    if (log.linkedTodoId || (existingLog && existingLog.linkedTodoId)) {
      setTodos(prevTodos => {
        const newTodos = [...prevTodos];

        // Revert Old Progress (if exists AND had link)
        if (existingLog && existingLog.linkedTodoId) {
          const oldTodoIndex = newTodos.findIndex(t => t.id === existingLog.linkedTodoId);
          if (oldTodoIndex > -1 && newTodos[oldTodoIndex].isProgress) {
            newTodos[oldTodoIndex] = {
              ...newTodos[oldTodoIndex],
              completedUnits: Math.max(0, (newTodos[oldTodoIndex].completedUnits || 0) - (existingLog.progressIncrement || 0))
            };
          }
        }

        // Apply New Progress (if has link)
        if (log.linkedTodoId) {
          const newTodoIndex = newTodos.findIndex(t => t.id === log.linkedTodoId);
          if (newTodoIndex > -1 && newTodos[newTodoIndex].isProgress) {
            newTodos[newTodoIndex] = {
              ...newTodos[newTodoIndex],
              completedUnits: Math.max(0, (newTodos[newTodoIndex].completedUnits || 0) + (log.progressIncrement || 0))
            };
          }
        }
        return newTodos;
      });
    }

    setLogs(prev => {
      const exists = prev.find(l => l.id === log.id); // re-check in callback for safety
      if (exists) {
        return prev.map(l => l.id === log.id ? log : l);
      }
      return [log, ...prev];
    });
    closeModal();
  };

  const handleDeleteLog = (id: string) => {
    // 1. 找到要删除的日志
    const logToDelete = logs.find(l => l.id === id);

    // 2. 如果该日志关联了待办且有进度增量，回退进度
    if (logToDelete?.linkedTodoId && logToDelete.progressIncrement) {
      setTodos(prevTodos => prevTodos.map(t => {
        if (t.id === logToDelete.linkedTodoId && t.isProgress) {
          return {
            ...t,
            completedUnits: Math.max(0, (t.completedUnits || 0) - (logToDelete.progressIncrement || 0))
          };
        }
        return t;
      }));
    }

    // 3. 删除关联图片 (Clean up attached images)
    if (logToDelete?.images && logToDelete.images.length > 0) {
      logToDelete.images.forEach(img => {
        imageService.deleteImage(img).catch(err => console.error('Failed to cleanup image file:', img, err));
      });
    }

    // 4. 删除日志
    setLogs(prev => prev.filter(l => l.id !== id));
    closeModal();
  };


  const handleQuickPunch = () => {
    // 1. Determine Time Range
    // "Quick Punch" acts on Real Time "Now".
    const now = new Date();
    const endTimestamp = now.getTime();

    // Calculate Today's 00:00 boundary
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTimestamp = todayStart.getTime();

    // Find the absolute latest log
    const allLogs = [...logs].sort((a, b) => b.endTime - a.endTime);
    const lastLog = allLogs[0];

    let startTimestamp: number;

    if (lastLog) {
      // If last log is in the future relative to now, we can't punch safely.
      if (lastLog.endTime > endTimestamp) {
        addToast('error', 'Cannot punch: Future logs exist.');
        return;
      }

      // Fix: Clamp start time to at least 00:00 today.
      // If last log ended yesterday (e.g. 23:00), max(yesterday_2300, today_0000) = today_0000.
      // If last log ended today (e.g. 10:00), max(today_1000, today_0000) = today_1000.
      startTimestamp = Math.max(lastLog.endTime, todayStartTimestamp);
    } else {
      // No logs ever. Start from today 00:00
      startTimestamp = todayStartTimestamp;
    }

    // Safety: ensure duration is positive
    // If we just punched, or if last log ended exactly now
    if (endTimestamp <= startTimestamp) {
      addToast('info', 'Already up to date.');
      return;
    }

    const newLog: Log = {
      id: crypto.randomUUID(),
      categoryId: 'uncategorized',
      activityId: 'quick_punch',
      title: '快速打点',
      startTime: startTimestamp,
      endTime: endTimestamp,
      duration: (endTimestamp - startTimestamp) / 1000,
      note: ''
    };

    setLogs(prev => [newLog, ...prev]);
    addToast('success', 'Quick Punch Recorded!');
  };

  // --- Deep Link Listener for Quick Punch ---
  // Use Ref to access fresh handleQuickPunch closure without re-binding listener
  const quickPunchRef = useRef(handleQuickPunch);
  useEffect(() => {
    quickPunchRef.current = handleQuickPunch;
  }, [handleQuickPunch]);

  useEffect(() => {
    const setupDeepLink = async () => {
      await CapacitorApp.addListener('appUrlOpen', (data) => {
        console.log('🔗 Deep Link received:', data.url);
        if (data.url.includes('action=quick_log')) {
          console.log('⚡ Executing Quick Punch via Deep Link');
          // Add a small delay to ensure app is ready or state is settled if coming from cold start
          setTimeout(() => {
            quickPunchRef.current();
          }, 300);
        }
      });
    };
    setupDeepLink();

    // Check if app was launched with URL (Cold Start)
    CapacitorApp.getLaunchUrl().then(url => {
      if (url && url.url.includes('action=quick_log')) {
        console.log('⚡ Launched with Quick Punch URL');
        setTimeout(() => {
          quickPunchRef.current();
        }, 800); // Longer delay for cold start
      }
    });

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, []);

  const handleBatchAddLogs = (entries: ParsedTimeEntry[]) => {
    const newLogs: Log[] = entries.map(entry => {
      // Resolve Category
      let cat = categories.find(c => c.name === entry.categoryName);
      // If not found, try to find by partial match or default
      if (!cat) cat = categories.find(c => c.name.includes(entry.categoryName)) || categories[0];

      // Resolve Activity
      let act = cat.activities.find(a => a.name === entry.activityName);
      if (!act) act = cat.activities.find(a => a.name.includes(entry.activityName)) || cat.activities[0];

      // Safety Fallback if category has no activities
      const actId = act?.id || 'unknown';

      // Calculate Duration
      const start = new Date(entry.startTime).getTime();
      const end = new Date(entry.endTime).getTime();
      const duration = (end - start) / 1000;

      return {
        id: crypto.randomUUID(),
        categoryId: cat.id,
        activityId: actId,
        title: act?.name || 'Unknown', // Fallback title
        startTime: start,
        endTime: end,
        duration: duration,
        note: entry.description,
        // Include scopeIds if user accepted the suggestion
        ...(entry.scopeIds && entry.scopeIds.length > 0 ? { scopeIds: entry.scopeIds } : {})
      };
    });

    setLogs(prev => [...newLogs, ...prev]);
    addToast('success', `Successfully backfilled ${newLogs.length} logs!`);
  };


  const openAddModal = (startTime?: number, endTime?: number) => {
    setEditingLog(null);
    if (startTime && endTime) {
      setInitialLogTimes({ start: startTime, end: endTime });
    } else {
      // Logic for "+" button: Backfill mode
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);

      // 判断是否是今天
      const now = new Date();
      const isToday = dayStart.getDate() === now.getDate() &&
        dayStart.getMonth() === now.getMonth() &&
        dayStart.getFullYear() === now.getFullYear();

      // 如果是今天，结束时间是当前时间；否则是23:59
      let dayEnd: Date;
      if (isToday) {
        dayEnd = now;
      } else {
        dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);
      }

      // Filter logs ENDING on this day
      const logsOnDay = logs.filter(log =>
        log.endTime >= dayStart.getTime() &&
        log.endTime <= dayEnd.getTime()
      );

      let newStart = dayStart.getTime();

      if (logsOnDay.length > 0) {
        // Find the latest end time among logs on this day
        newStart = logsOnDay.reduce((max, log) => Math.max(max, log.endTime), dayStart.getTime());
      }

      // Default range: Last End (or 00:00) -> (today: now, past: 23:59)
      setInitialLogTimes({ start: newStart, end: dayEnd.getTime() });
    }
    setIsAddModalOpen(true);
  };

  const openEditModal = (log: Log) => {
    setEditingLog(log);
    setInitialLogTimes(null);
    setIsAddModalOpen(true);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingLog(null);
    setInitialLogTimes(null);
  };

  // --- Todo Management ---
  const handleToggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => {
      if (t.id === id) {
        const isCompleted = !t.isCompleted;
        return {
          ...t,
          isCompleted,
          completedAt: isCompleted ? new Date().toISOString() : undefined
        };
      }
      return t;
    }));
  };

  const handleStartTodoFocus = (todo: TodoItem) => {
    // Check for link
    if (todo.linkedCategoryId && todo.linkedActivityId) {
      const cat = categories.find(c => c.id === todo.linkedCategoryId);
      const act = cat?.activities.find(a => a.id === todo.linkedActivityId);

      if (cat && act) {
        handleStartActivity(act, cat.id, todo.id, todo.defaultScopeIds);
        return;
      }
    }
    // If not linked, open edit modal to encourage linking
    addToast('info', "Please link this task to an activity (Category > Activity) to track statistics.");
    openEditTodoModal(todo);
  };

  const openAddTodoModal = (categoryId: string) => {
    setEditingTodo(null);
    setTodoCategoryToAdd(categoryId);
    setIsTodoModalOpen(true);
  };

  const openEditTodoModal = (todo: TodoItem) => {
    setEditingTodo(todo);
    setTodoCategoryToAdd(todo.categoryId);
    setIsTodoModalOpen(true);
  };

  const closeTodoModal = () => {
    setIsTodoModalOpen(false);
    setEditingTodo(null);
  };

  const handleSaveTodo = (todo: TodoItem) => {
    setTodos(prev => {
      const exists = prev.find(t => t.id === todo.id);
      if (exists) {
        return prev.map(t => t.id === todo.id ? todo : t);
      }
      return [todo, ...prev];
    });
  };

  const handleDeleteTodo = (id: string) => {
    // Check if any logs are linked to this todo
    const linkedLogs = logs.filter(l => l.linkedTodoId === id);
    if (linkedLogs.length > 0) {
      setTodoToDeleteId(id);
      setIsDeleteTodoConfirmOpen(true);
      return;
    }

    setTodos(prev => prev.filter(t => t.id !== id));
    closeTodoModal();
  };

  const handleConfirmDeleteTodo = () => {
    if (!todoToDeleteId) return;

    // 1. Unlink logs
    setLogs(prev => prev.map(l =>
      l.linkedTodoId === todoToDeleteId
        ? { ...l, linkedTodoId: undefined }
        : l
    ));

    // 2. Delete Todo
    setTodos(prev => prev.filter(t => t.id !== todoToDeleteId));

    // 3. Cleanup
    setTodoToDeleteId(null);
    setIsDeleteTodoConfirmOpen(false);
    closeTodoModal(); // Ensure edit modal is closed too if open
    addToast('success', 'Task deleted (history preserved)');
  };

  const handleUpdateTodoData = (newCategories: TodoCategory[], newTodos: TodoItem[]) => {
    setTodoCategories(newCategories);
    setTodos(newTodos);
    setIsTodoManaging(false);
  };

  // --- Goal Management ---
  const handleAddGoal = (scopeId: string) => {
    setEditingGoal(null);
    setGoalScopeId(scopeId);
    setIsGoalEditorOpen(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalScopeId(goal.scopeId);
    setIsGoalEditorOpen(true);
  };

  const handleSaveGoal = (goal: Goal) => {
    setGoals(prev => {
      const exists = prev.find(g => g.id === goal.id);
      if (exists) {
        return prev.map(g => g.id === goal.id ? goal : g);
      }
      return [...prev, goal];
    });
    setIsGoalEditorOpen(false);
    setEditingGoal(null);
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
  };

  const handleArchiveGoal = (goalId: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        return {
          ...g,
          status: g.status === 'archived' ? 'active' : 'archived'
        };
      }
      return g;
    }));
  };

  const closeGoalEditor = () => {
    setIsGoalEditorOpen(false);
    setEditingGoal(null);
  };


  // ...

  // Tag Navigation logic
  const handleSelectTag = (tagId: string) => {
    setSelectedTagId(tagId);
    setSelectedCategoryId(null);
  };

  const handleSelectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    setSelectedTagId(null);
  };

  const handleBackFromTag = () => {
    setSelectedTagId(null);
    setSelectedCategoryId(null);
    if (returnToSearch) {
      setIsSearchOpen(true);
      setReturnToSearch(false);
    }
  };

  const handleBackFromScope = () => {
    setSelectedScopeId(null);
    if (returnToSearch) {
      setIsSearchOpen(true);
      setReturnToSearch(false);
    }
  };

  // Date State (Lifted for sharing between Timeline and Stats)
  const [currentDate, setCurrentDate] = useState(new Date());

  // Persist data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('lumostime_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('lumostime_todos', JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem('lumostime_todoCategories', JSON.stringify(todoCategories));
  }, [todoCategories]);

  useEffect(() => {
    localStorage.setItem('lumostime_autoLinkRules', JSON.stringify(autoLinkRules));
  }, [autoLinkRules]);



  //--- History Navigation Logic for Scope Detail ---
  useEffect(() => {
    // Only handle if selectedScopeId is set
    if (selectedScopeId) {
      // Check if current state already has this scope (to prevent dupes on re-renders)
      const currentState = window.history.state;
      if (currentState?.scopeId !== selectedScopeId) {
        window.history.pushState({ scopeId: selectedScopeId }, '');
      }
    }
  }, [selectedScopeId]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If we are currently in Scope Detail view
      if (selectedScopeId) {
        // If the history event brings us to a state without scopeId (i.e. Back)
        if (!event.state?.scopeId) {
          setSelectedScopeId(null);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedScopeId]);



  // Track data changes
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (isRestoring.current) {
      isRestoring.current = false;
      return;
    }
    setDataLastModified(Date.now());
  }, [logs, todos, categories, todoCategories, scopes, goals, autoLinkRules, reviewTemplates, dailyReviews, weeklyReviews, monthlyReviews, customNarrativeTemplates, userPersonalInfo, filters]);

  // --- Sync Logic ---

  // 1. Startup Pull (Run once)
  useEffect(() => {
    const initSync = async () => {
      const config = webdavService.getConfig();
      if (!config) return;

      try {
        const cloudDate = await webdavService.statFile();
        const saved = localStorage.getItem('lumos_last_sync_time');
        const localSyncTime = saved ? parseInt(saved) : 0;

        // If cloud is newer (buffer 10s)
        if (cloudDate && cloudDate.getTime() > localSyncTime + 10000) {
          // Silent update on startup for better UX
          // addToast('info', 'Updating data from cloud...'); 
          const data = await webdavService.downloadData();
          if (data) {
            await handleSyncDataUpdate(data);
            updateLastSyncTime();
            // addToast('success', 'Sync complete');
          }
        }
      } catch (e) {
        console.error('Startup sync check failed', e);
      }
    };

    initSync();
  }, []);

  // 2. Data Change -> Auto Upload (Debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      const config = webdavService.getConfig();
      if (!config) return;

      try {
        const dataToSync = {
          logs,
          todos,
          categories,
          todoCategories,
          scopes,
          goals,
          autoLinkRules,
          reviewTemplates,
          dailyReviews,
          weeklyReviews,
          monthlyReviews,
          customNarrativeTemplates,
          userPersonalInfo,
          version: '1.0.0',
          timestamp: Date.now()
        };
        await webdavService.uploadData(dataToSync);
        updateLastSyncTime();
      } catch (e) {
        console.error('Auto-sync upload failed', e);
      }
    }, 30000); // 30s debounce

    return () => clearTimeout(timer);
  }, [logs, todos, categories, todoCategories, scopes, goals, autoLinkRules, reviewTemplates, dailyReviews, weeklyReviews, monthlyReviews, customNarrativeTemplates, userPersonalInfo, filters, lastSyncTime]);

  // --- NFC / Deep Link Handling ---
  useEffect(() => {
    const setupListener = async () => {
      const listener = await CapacitorApp.addListener('appUrlOpen', (data: { url: string }) => {
        try {
          const urlObj = new URL(data.url);
          // Check scheme and host. Host 'record' for actions.
          if (urlObj.protocol.includes('lumostime') && urlObj.host === 'record') {
            const action = urlObj.searchParams.get('action');

            if (action === 'quick_punch') {
              handleQuickPunch();
              addToast('success', 'NFC: Quick Punch Recorded');
            } else if (action === 'start') {
              const catId = urlObj.searchParams.get('cat_id');
              const actId = urlObj.searchParams.get('act_id');

              if (catId && actId) {
                // Find activity
                const cat = categories.find(c => c.id === catId);
                const act = cat?.activities.find(a => a.id === actId);

                if (cat && act) {
                  // Stop all active sessions to ensure clean switch
                  if (activeSessions.length > 0) {
                    activeSessions.forEach(session => {
                      handleStopActivity(session.id);
                    });
                  }

                  handleStartActivity(act, cat.id);
                  addToast('success', `NFC: Started ${act.name}`);
                } else {
                  addToast('error', 'NFC: Activity not found');
                }
              }
            }
          }
        } catch (e) {
          console.error('Deep link error', e);
        }
      });
      return listener;
    };

    const setupNfcScanListener = async () => {
      const listener = await NfcService.addListener('nfcTagScanned', (data: { type: string, value?: string }) => {
        console.log('NFC Scanned:', data);

        if (data.type === 'uri' && data.value) {
          const urlObj = new URL(data.value);
          // Re-use logic for protocol check
          if (urlObj.protocol.includes('lumostime') && urlObj.host === 'record') {
            const action = urlObj.searchParams.get('action');

            if (action === 'quick_punch') {
              handleQuickPunch();
              addToast('success', 'NFC: Quick Punch Recorded');
            } else if (action === 'start') {
              const catId = urlObj.searchParams.get('cat_id');
              const actId = urlObj.searchParams.get('act_id');
              if (catId && actId) {
                const cat = categories.find(c => c.id === catId);
                const act = cat?.activities.find(a => a.id === actId);
                if (cat && act) {
                  // Check if this activity is already active
                  const existingSession = activeSessions.find(s => s.activityId === actId);

                  if (existingSession) {
                    // TOGGLE OFF: Stop the activity
                    handleStopActivity(existingSession.id);
                    addToast('success', `NFC: Stopped ${act.name}`);
                  } else {
                    // TOGGLE ON: Start the activity (and stop others if needed)
                    if (activeSessions.length > 0) {
                      activeSessions.forEach(session => handleStopActivity(session.id));
                    }
                    handleStartActivity(act, cat.id);
                    addToast('success', `NFC: Started ${act.name}`);
                  }
                } else {
                  addToast('error', 'NFC: Activity not found');
                }
              }
            }
          } else {
            addToast('info', `NFC Scanned: ${data.value}`);
          }
        } else {
          addToast('info', 'NFC Tag Scanned (No actionable URI)');
        }
      });
      return listener;
    };

    let listenerHandle: any = null;
    let scanListenerHandle: any = null;

    setupListener().then(h => listenerHandle = h);

    // 仅在移动平台注册 NFC 监听器,避免 Web/Electron 环境报错
    const platform = Capacitor.getPlatform();
    if (platform === 'android' || platform === 'ios') {
      setupNfcScanListener().then(h => scanListenerHandle = h);
    }

    return () => {
      if (listenerHandle) listenerHandle.remove();
      if (scanListenerHandle) scanListenerHandle.remove();
    };
  }, [categories, activeSessions, logs, autoLinkRules]);

  // --- 悬浮球点击结束计时监听 ---
  useEffect(() => {
    const setupFloatingWindowListener = () => {
      // 监听从悬浮球发送的结束计时事件
      const handleStopFromFloating = () => {
        console.log('📥 收到悬浮球结束计时事件');

        // 结束当前所有的活动会话
        if (activeSessions.length > 0) {
          console.log(`🛑 结束 ${activeSessions.length} 个活动会话`);
          activeSessions.forEach(session => {
            handleStopActivity(session.id);
          });
          addToast('success', '已从悬浮球结束计时');
        } else {
          console.log('⚠️ 没有活动会话需要结束');
        }
      };

      // 注册全局事件监听器
      window.addEventListener('stopFocusFromFloating', handleStopFromFloating);

      return () => {
        window.removeEventListener('stopFocusFromFloating', handleStopFromFloating);
      };
    };

    // 仅在Android平台注册监听器
    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
      const cleanup = setupFloatingWindowListener();
      return cleanup;
    }
  }, [activeSessions]);

  // --- 应用检测监听 (半自动计时) ---
  useEffect(() => {
    const setupAppDetectionListener = () => {



      const handleStartFromPrompt = (event: any) => {
        try {
          const now = Date.now();
          // 增加防抖时间到 3 秒, 使用 ref
          if (now - lastPromptTimeRef.current < 3000) {
            console.log('⏳ 忽略重复点击事件 (Debounced)');
            return;
          }
          lastPromptTimeRef.current = now;

          console.log('📥 收到悬浮球开始计时事件:', event);

          let packageName = '';
          let appLabel = '';
          let realAppName = '';
          let eventActivityId = '';

          // 解析事件数据
          if (event.detail) {
            const data = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail;
            packageName = data.packageName;
            appLabel = data.appLabel;
            realAppName = data.realAppName;
            eventActivityId = data.activityId;
          } else {
            packageName = event.packageName;
            appLabel = event.appLabel;
            realAppName = event.realAppName;
            eventActivityId = event.activityId;
          }

          if (!packageName) {
            console.warn('⚠️ packageName为空');
            return;
          }

          console.log('🚀 开始计时:', packageName, appLabel, realAppName, eventActivityId);

          // 优先使用事件中的 activityId (如果有), 否则回退到 appRules 查找
          const activityId = eventActivityId || appRules[packageName];
          if (activityId) {
            // 查找Activity
            let foundCat = null;
            let foundAct = null;
            for (const cat of categories) {
              const act = cat.activities.find(a => a.id === activityId);
              if (act) {
                foundCat = cat;
                foundAct = act;
                break;
              }
            }

            if (foundCat && foundAct) {
              console.log(`✅ 找到关联活动: ${foundAct.name}, 准备开始...`);
              // 调用handleStartActivity
              // 使用realAppName(如果存在)作为备注,否则回退到appLabel或packageName
              const appNameForNote = realAppName || appLabel || packageName;
              handleStartActivity(foundAct, foundCat.id, undefined, undefined, `关联启动: ${appNameForNote}`);
              addToast('success', `已开始: ${foundAct.name}`);
            } else {
              console.warn('⚠️ 未找到关联的Activity:', activityId);
            }
          } else {
            console.warn('⚠️ 未找到应用关联规则:', packageName);
          }

        } catch (e) {
          console.error('处理开始计时事件失败:', e);
        }
      };

      window.addEventListener('startFocusFromPrompt', handleStartFromPrompt);

      return () => {
        window.removeEventListener('startFocusFromPrompt', handleStartFromPrompt);
      };
    };

    // 仅在Android平台注册监听器
    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
      const cleanup = setupAppDetectionListener();
      return cleanup;
    }
  }, [activeSessions, appRules, categories]);

  // 3. App Hide -> Upload (Best Effort)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const config = webdavService.getConfig();
        if (config) {
          const dataToSync = {
            logs,
            todos,
            categories,
            todoCategories,
            scopes,
            goals,
            autoLinkRules,
            reviewTemplates,
            dailyReviews,
            weeklyReviews,
            monthlyReviews,
            customNarrativeTemplates,
            userPersonalInfo,
            version: '1.0.0',
            timestamp: Date.now()
          };
          webdavService.uploadData(dataToSync).catch(console.error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [logs, todos, categories, todoCategories, scopes, goals, autoLinkRules, reviewTemplates, dailyReviews, weeklyReviews, monthlyReviews, customNarrativeTemplates, userPersonalInfo]);

  // 3.5. Image Deletion Auto-Sync
  useEffect(() => {
    const handleImageDeleted = async (event: CustomEvent) => {
      const config = webdavService.getConfig();
      if (!config) return;

      console.log('[App] 检测到图片删除，触发同步:', event.detail.filename);
      
      // 延迟一点时间确保删除操作完成，然后触发图片同步
      setTimeout(async () => {
        try {
          await handleImageSync();
          console.log('[App] 图片删除同步完成');
        } catch (error) {
          console.error('[App] 图片删除同步失败:', error);
        }
      }, 1000);
    };

    window.addEventListener('imageDeleted', handleImageDeleted as EventListener);
    return () => window.removeEventListener('imageDeleted', handleImageDeleted as EventListener);
  }, []);

  // 4. Hardware Back Button Handling
  useEffect(() => {
    const handleBackButton = ({ canGoBack }: { canGoBack: boolean }) => {
      // 1. Modals (High Priority)
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return;
      }
      if (isAutoLinkOpen) {
        setIsAutoLinkOpen(false);
        return;
      }
      if (isSearchOpen) {
        setIsSearchOpen(false);
        return;
      }
      if (focusDetailSessionId) {
        setFocusDetailSessionId(null);
        return;
      }
      if (isAddModalOpen) {
        closeModal();
        return;
      }
      if (isTodoModalOpen) {
        closeTodoModal();
        return;
      }

      // 1.5. Daily/Weekly/Monthly Review (Between Modals and Management Modes)
      if (isDailyReviewOpen) {
        setIsDailyReviewOpen(false);
        setCurrentReviewDate(null);
        return;
      }
      if (isWeeklyReviewOpen) {
        setIsWeeklyReviewOpen(false);
        setCurrentWeeklyReviewStart(null);
        setCurrentWeeklyReviewEnd(null);
        return;
      }
      if (isMonthlyReviewOpen) {
        setIsMonthlyReviewOpen(false);
        setCurrentMonthlyReviewStart(null);
        setCurrentMonthlyReviewEnd(null);
        return;
      }

      // 2. Full Screen / Management Modes
      if (isStatsFullScreen) {
        setIsStatsFullScreen(false);
        return;
      }
      if (isTodoManaging) {
        setIsTodoManaging(false);
        return;
      }
      if (isTagsManaging) {
        setIsTagsManaging(false);
        return;
      }

      // 3. Navigation (View Hierarchy)
      if (currentView === AppView.STATS) {
        setCurrentView(AppView.TIMELINE);
        return;
      }
      if (currentView === AppView.TAGS && (selectedTagId || selectedCategoryId)) {
        handleBackFromTag();
        return;
      }
      if (currentView === AppView.SCOPE && selectedScopeId) {
        handleBackFromScope();
        return;
      }

      // 4. Default: Exit App
      CapacitorApp.exitApp();
    };

    // Add Listener
    const listener = CapacitorApp.addListener('backButton', handleBackButton);

    // Cleanup
    return () => {
      listener.then(l => l.remove());
    };
  }, [
    isSettingsOpen, isAutoLinkOpen, isSearchOpen, focusDetailSessionId, isAddModalOpen, isTodoModalOpen,
    isDailyReviewOpen, isWeeklyReviewOpen, isMonthlyReviewOpen,
    isStatsFullScreen, isTodoManaging, isTagsManaging,
    currentView, selectedTagId, selectedCategoryId
  ]);

  // State for Safe Deletion
  const [isDeleteTodoConfirmOpen, setIsDeleteTodoConfirmOpen] = useState(false);
  const [todoToDeleteId, setTodoToDeleteId] = useState<string | null>(null);

  // --- Todo Duplication ---
  const handleDuplicateTodo = (todo: TodoItem) => {
    const newTodo: TodoItem = {
      ...todo,
      id: crypto.randomUUID(),
      title: `${todo.title} 副本`,
      isCompleted: false,
      completedUnits: 0,
    };
    setTodos(prev => [newTodo, ...prev]);
    addToast('success', 'Task duplicated');
  };

  const handleBatchAddTodos = (newTodosData: Partial<TodoItem>[]) => {
    const newTodos: TodoItem[] = newTodosData.map(data => ({
      id: crypto.randomUUID(),
      categoryId: data.categoryId || todoCategories[0].id,
      title: data.title || 'New Task',
      isCompleted: false,
      completedUnits: 0,
      linkedActivityId: data.linkedActivityId,
      linkedCategoryId: data.linkedCategoryId,
      defaultScopeIds: data.defaultScopeIds,
      ...data
    }));

    setTodos(prev => [...newTodos, ...prev]);
    addToast('success', `${newTodos.length} tasks added`);
  };

  // --- Search Handlers ---
  const handleOpenSearch = () => {
    setIsSearchOpen(true);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
  };

  const handleSelectSearchLog = (log: Log) => {
    // setIsSearchOpen(false); // Keep search open for modal context
    openEditModal(log);
  };

  const handleSelectSearchTodo = (todo: TodoItem) => {
    // setIsSearchOpen(false); // Keep search open for modal context
    setCurrentView(AppView.TODO);
    // Wait a bit for view transition
    setTimeout(() => openEditTodoModal(todo), 100);
  };

  const handleSelectSearchScope = (scope: { id: string }) => {
    setReturnToSearch(true);
    setIsSearchOpen(false);
    setCurrentView(AppView.SCOPE);
    setSelectedScopeId(scope.id);
  };

  const handleSelectSearchCategory = (category: Category) => {
    setReturnToSearch(true);
    setIsSearchOpen(false);
    setCurrentView(AppView.TAGS);
    handleSelectCategory(category.id);
  };

  // Helper to get local YYYY-MM-DD string
  const getLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSelectSearchActivity = (activity: { id: string }, categoryId: string) => {
    setReturnToSearch(true);
    setIsSearchOpen(false);
    setCurrentView(AppView.TAGS);
    handleSelectTag(activity.id);
  };

  // Daily Review Handlers
  const handleOpenDailyReview = (targetDate?: Date) => {
    // Check if targetDate is a valid date, otherwise fallback to currentDate
    // Ensure we are working with a Date object
    const dateToUse = (targetDate instanceof Date && !isNaN(targetDate.getTime())) ? targetDate : currentDate;
    const dateStr = getLocalDateStr(dateToUse);
    let review = dailyReviews.find(r => r.date === dateStr);

    // 如果没有日报,创建新的
    if (!review) {
      // 创建模板快照
      const templateSnapshot = reviewTemplates
        .filter(t => t.enabled && t.isDailyTemplate)
        .sort((a, b) => a.order - b.order)
        .map(t => ({
          id: t.id,
          title: t.title,
          questions: t.questions,
          order: t.order,
          syncToTimeline: t.syncToTimeline
        }));

      // 生成初始日课 (初始化 checkItems)
      const initialCheckItems: any[] = [];
      const dailyCheckTemplates = checkTemplates.filter(t => t.enabled && t.isDaily);
      if (dailyCheckTemplates.length > 0) {
        dailyCheckTemplates.sort((a, b) => a.order - b.order).forEach(t => {
          t.items.forEach((item: any) => {
            const content = typeof item === 'string' ? item : item.content;
            const icon = typeof item === 'string' ? undefined : item.icon;
            initialCheckItems.push({
              id: crypto.randomUUID(),
              category: t.title,
              content: content,
              icon: icon,
              isCompleted: false
            });
          });
        });
      }

      review = {
        id: crypto.randomUUID(),
        date: dateStr,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        answers: [],
        checkItems: initialCheckItems, // Initialize with template items
        templateSnapshot  // 保存当时的模板快照
      };
      setDailyReviews(prev => [...prev, review!]);
    }

    setCurrentReviewDate(dateToUse);
    setIsDailyReviewOpen(true);
  };

  const handleUpdateReview = (updatedReview: DailyReview) => {
    setDailyReviews(prev => prev.map(r =>
      r.id === updatedReview.id ? updatedReview : r
    ));
  };

  const handleLogImageRemove = (logId: string, filename: string) => {
    setLogs(prev => prev.map(log =>
      log.id === logId && log.images && log.images.includes(filename)
        ? { ...log, images: log.images.filter(img => img !== filename) }
        : log
    ));
  };

  const handleDeleteReview = () => {
    if (!currentReviewDate) return;
    const dateStr = getLocalDateStr(currentReviewDate);
    setDailyReviews(prev => prev.filter(r => r.date !== dateStr));
    setIsDailyReviewOpen(false);
    setCurrentReviewDate(null);
  };

  const handleGenerateNarrative = async (review: DailyReview, statsText: string, timelineText: string, promptTemplate?: string): Promise<string> => {
    let finalPrompt = '';

    if (promptTemplate) {
      finalPrompt = promptTemplate;
    } else {
      // Fallback for legacy calls (should not happen after full refactor)
      // Default to the system default template
      finalPrompt = NARRATIVE_TEMPLATES.find(t => t.id === 'default')?.prompt || '';
    }

    return narrativeService.generateDailyNarrative(review, statsText, timelineText, finalPrompt, scopes, userPersonalInfo, 'daily');
  };

  // Weekly Review Handlers
  const handleOpenWeeklyReview = (weekStart: Date, weekEnd: Date) => {
    const weekStartStr = getLocalDateStr(weekStart);
    const weekEndStr = getLocalDateStr(weekEnd);
    let review = weeklyReviews.find(r => r.weekStartDate === weekStartStr && r.weekEndDate === weekEndStr);

    // 如果没有周报,创建新的
    if (!review) {
      // 创建模板快照
      const templateSnapshot = reviewTemplates
        .filter(t => t.enabled && t.isWeeklyTemplate)
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
        templateSnapshot  // 保存当时的模板快照
      };
      setWeeklyReviews(prev => [...prev, review!]);
    }

    setCurrentWeeklyReviewStart(weekStart);
    setCurrentWeeklyReviewEnd(weekEnd);
    setIsWeeklyReviewOpen(true);
  };

  const handleCloseWeeklyReview = () => {
    setIsWeeklyReviewOpen(false);
    setCurrentWeeklyReviewStart(null);
    setCurrentWeeklyReviewEnd(null);
  };

  const handleUpdateWeeklyReview = (updatedReview: WeeklyReview) => {
    setWeeklyReviews(prev => prev.map(r => r.id === updatedReview.id ? updatedReview : r));
  };

  const handleDeleteWeeklyReview = () => {
    if (!currentWeeklyReviewStart || !currentWeeklyReviewEnd) return;

    const weekStartStr = getLocalDateStr(currentWeeklyReviewStart);
    const weekEndStr = getLocalDateStr(currentWeeklyReviewEnd);
    setWeeklyReviews(prev => prev.filter(r => !(r.weekStartDate === weekStartStr && r.weekEndDate === weekEndStr)));
    handleCloseWeeklyReview();
    addToast('success', '周报已删除');
  };

  const handleGenerateWeeklyNarrative = async (review: WeeklyReview, statsText: string, promptTemplate?: string): Promise<string> => {
    const finalPrompt = promptTemplate || (NARRATIVE_TEMPLATES.find(t => t.id === 'default')?.prompt || '');
    // 周报不需要timeline文本，只传入空字符串
    return narrativeService.generateDailyNarrative(review as any, statsText, '', finalPrompt, scopes, userPersonalInfo, 'weekly');
  };

  // Monthly Review Handlers (每月回顾处理函数)
  const handleOpenMonthlyReview = (monthStart: Date, monthEnd: Date) => {
    const monthStartStr = getLocalDateStr(monthStart);
    const monthEndStr = getLocalDateStr(monthEnd);
    let review = monthlyReviews.find(r => r.monthStartDate === monthStartStr && r.monthEndDate === monthEndStr);

    // 如果没有月报,创建新的
    if (!review) {
      // 创建模板快照
      const templateSnapshot = reviewTemplates
        .filter(t => t.enabled && t.isMonthlyTemplate)
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
        templateSnapshot  // 保存当时的模板快照
      };
      setMonthlyReviews(prev => [...prev, review!]);
    }

    setCurrentMonthlyReviewStart(monthStart);
    setCurrentMonthlyReviewEnd(monthEnd);
    setIsMonthlyReviewOpen(true);
  };

  const handleCloseMonthlyReview = () => {
    setIsMonthlyReviewOpen(false);
    setCurrentMonthlyReviewStart(null);
    setCurrentMonthlyReviewEnd(null);
  };

  const handleUpdateMonthlyReview = (updatedReview: MonthlyReview) => {
    setMonthlyReviews(prev => prev.map(r => r.id === updatedReview.id ? updatedReview : r));
  };

  const handleDeleteMonthlyReview = () => {
    if (!currentMonthlyReviewStart || !currentMonthlyReviewEnd) return;

    const monthStartStr = getLocalDateStr(currentMonthlyReviewStart);
    const monthEndStr = getLocalDateStr(currentMonthlyReviewEnd);
    setMonthlyReviews(prev => prev.filter(r => !(r.monthStartDate === monthStartStr && r.monthEndDate === monthEndStr)));
    handleCloseMonthlyReview();
    addToast('success', '月报已删除');
  };

  const handleGenerateMonthlyNarrative = async (review: MonthlyReview, statsText: string, promptTemplate?: string): Promise<string> => {
    const finalPrompt = promptTemplate || (NARRATIVE_TEMPLATES.find(t => t.id === 'default')?.prompt || '');
    // 月报不需要timeline文本，只传入空字符串
    return narrativeService.generateDailyNarrative(review as any, statsText, '', finalPrompt, scopes, userPersonalInfo, 'monthly');
  };

  const renderView = () => {
    if (isSettingsOpen) return null;

    // Daily Review has priority over other views
    if (isDailyReviewOpen && currentReviewDate) {
      const dateStr = getLocalDateStr(currentReviewDate);
      const review = dailyReviews.find(r => r.date === dateStr);
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
          customNarrativeTemplates={customNarrativeTemplates}
          onDelete={handleDeleteReview}
          onUpdateReview={handleUpdateReview}
          onGenerateNarrative={handleGenerateNarrative}

          addToast={addToast}
          checkTemplates={checkTemplates}
        />
      );
    }

    // Weekly Review has second priority
    if (isWeeklyReviewOpen && currentWeeklyReviewStart && currentWeeklyReviewEnd) {
      const weekStartStr = getLocalDateStr(currentWeeklyReviewStart);
      const weekEndStr = getLocalDateStr(currentWeeklyReviewEnd);
      const review = weeklyReviews.find(r => r.weekStartDate === weekStartStr && r.weekEndDate === weekEndStr);
      if (!review) return null;

      return (
        <WeeklyReviewView
          review={review}
          weekStartDate={currentWeeklyReviewStart}
          weekEndDate={currentWeeklyReviewEnd}
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

    // Monthly Review has third priority
    if (isMonthlyReviewOpen && currentMonthlyReviewStart && currentMonthlyReviewEnd) {
      const monthStartStr = getLocalDateStr(currentMonthlyReviewStart);
      const monthEndStr = getLocalDateStr(currentMonthlyReviewEnd);
      const review = monthlyReviews.find(r => r.monthStartDate === monthStartStr && r.monthEndDate === monthEndStr);
      if (!review) return null;

      return (
        <MonthlyReviewView
          review={review}
          monthStartDate={currentMonthlyReviewStart}
          monthEndDate={currentMonthlyReviewEnd}
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
        return <RecordView onStartActivity={handleStartActivity} categories={categories} />;
      case AppView.TIMELINE:
        return (
          <TimelineView
            logs={logs}
            todos={todos}
            categories={categories}
            onAddLog={openAddModal}
            onEditLog={openEditModal}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onShowStats={() => setCurrentView(AppView.STATS)}
            onBatchAddLogs={handleBatchAddLogs}
            onSync={handleQuickSync}
            isSyncing={isSyncing}
            todoCategories={todoCategories}
            onToast={addToast}
            startWeekOnSunday={startWeekOnSunday}
            autoLinkRules={autoLinkRules}
            scopes={scopes}
            minIdleTimeThreshold={minIdleTimeThreshold}
            onQuickPunch={handleQuickPunch}
            dailyReview={dailyReviews.find(r => r.date === getLocalDateStr(currentDate))}
            onOpenDailyReview={handleOpenDailyReview}
            templates={reviewTemplates}
            dailyReviewTime={dailyReviewTime}
            weeklyReviews={weeklyReviews}
            onOpenWeeklyReview={handleOpenWeeklyReview}
            weeklyReviewTime={weeklyReviewTime}
            monthlyReviews={monthlyReviews}
            onOpenMonthlyReview={handleOpenMonthlyReview}
            monthlyReviewTime={monthlyReviewTime}
          />
        );
      case AppView.STATS:
        return (
          <StatsView
            logs={logs}
            categories={categories}
            currentDate={currentDate}
            onBack={() => setCurrentView(AppView.TIMELINE)}
            onDateChange={setCurrentDate}
            isFullScreen={isStatsFullScreen}
            onToggleFullScreen={() => setIsStatsFullScreen(!isStatsFullScreen)}
            onToast={addToast}
            onTitleChange={setStatsTitle}
            todos={todos}
            todoCategories={todoCategories}
            scopes={scopes}
            dailyReviews={dailyReviews}
          />
        );
      case AppView.REVIEW:
        return (
          <ReviewHubView
            logs={logs}
            dailyReviews={dailyReviews}
            weeklyReviews={weeklyReviews}
            monthlyReviews={monthlyReviews}
            onOpenDailyReview={(date) => {
              // Must handle potential time zone issues if creating from calendar
              // But keeping it simple: just use date object
              // We need to set setCurrentReviewDate
              // Also need to check if review exists? ReviewHub handles logic,
              // here we just open the view.
              // If review doesn't exist, DailyReviewView handles creation?
              // Wait, DailyReviewView takes a 'review' object.
              // So if new, we need logic similar to handleOpenDailyReview but for specific date.
              handleOpenDailyReview(date);
            }}
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
              scopes={scopes}
            />
          );
        }
        return (
          <TagsView
            logs={logs}
            onSelectTag={handleSelectTag}
            onSelectCategory={handleSelectCategory}
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
            categories={todoCategories}
            activityCategories={categories}
            scopes={scopes}
            onToggleTodo={handleToggleTodo}
            onEditTodo={openEditTodoModal}
            onAddTodo={openAddTodoModal}
            onStartFocus={handleStartTodoFocus}
            onBatchAddTodos={handleBatchAddTodos}
            onDuplicateTodo={handleDuplicateTodo}
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
              onBack={handleBackFromScope}
              onUpdate={(updatedScope) => {
                setScopes(prev => prev.map(s => s.id === updatedScope.id ? updatedScope : s));
              }}
              onEditLog={openEditModal}
              onEditGoal={handleEditGoal}
              onDeleteGoal={handleDeleteGoal}
              onArchiveGoal={handleArchiveGoal}
              onAddGoal={() => handleAddGoal(selectedScope.id)}
              onEditTodo={openEditTodoModal}
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
            todos={todos}
            onScopeClick={(id) => setSelectedScopeId(id)}
            onManageClick={() => setIsScopeManaging(true)}
          />
        );
      default:
        return null;
    }
  };

  const getHeaderTitle = () => {
    if (isDailyReviewOpen) return 'Daily Review';
    if (isMonthlyReviewOpen) return 'Monthly Review';
    if (currentView === AppView.TAGS) {
      if (selectedTagId) return 'Tag Details';
      if (selectedCategoryId) return 'Category Details';
      return 'Tags';
    }
    if (currentView === AppView.REVIEW) {
      return 'My Chronicle';
    }
    if (currentView === AppView.SCOPE) {
      if (selectedScopeId) return 'Scope Details';
      return 'Scopes';
    }
    if (currentView === AppView.STATS) {
      return statsTitle; // 使用动态标题
    }
    return VIEW_TITLES[currentView];
  };

  const handleSyncDataUpdate = async (data: any) => {
    isRestoring.current = true;
    
    // 在更新数据前，获取当前被引用的图片列表
    const oldReferencedImages = new Set<string>();
    logs.forEach(log => {
      if (log.images && Array.isArray(log.images)) {
        log.images.forEach(imageName => {
          if (imageName && typeof imageName === 'string') {
            oldReferencedImages.add(imageName);
          }
        });
      }
    });
    
    // 更新数据状态
    if (data.logs) setLogs(data.logs);
    if (data.categories) setCategories(data.categories);
    if (data.todos) setTodos(data.todos);
    if (data.todoCategories) setTodoCategories(data.todoCategories);
    if (data.scopes) setScopes(data.scopes);
    if (data.goals) setGoals(data.goals);
    if (data.autoLinkRules) setAutoLinkRules(data.autoLinkRules);
    if (data.reviewTemplates) setReviewTemplates(data.reviewTemplates);
    if (data.dailyReviews) setDailyReviews(data.dailyReviews);
    if (data.weeklyReviews) setWeeklyReviews(data.weeklyReviews);
    if (data.monthlyReviews) setMonthlyReviews(data.monthlyReviews);
    if (data.customNarrativeTemplates) setCustomNarrativeTemplates(data.customNarrativeTemplates);
    if (data.userPersonalInfo) setUserPersonalInfo(data.userPersonalInfo);
    if (data.filters) setFilters(data.filters);

    if (data.timestamp) {
      setDataLastModified(data.timestamp);
    }
    
    // 数据更新后，检查并清理不再被引用的本地图片
    if (data.logs) {
      try {
        await cleanupOrphanedImagesAfterSync(data.logs, oldReferencedImages);
      } catch (error) {
        console.error('[App] 清理孤儿图片失败:', error);
      }
    }
  };

  // 清理同步后的孤儿图片
  const cleanupOrphanedImagesAfterSync = async (newLogs: any[], oldReferencedImages: Set<string>) => {
    try {
      // 获取新数据中被引用的图片
      const newReferencedImages = new Set<string>();
      newLogs.forEach(log => {
        if (log.images && Array.isArray(log.images)) {
          log.images.forEach(imageName => {
            if (imageName && typeof imageName === 'string') {
              newReferencedImages.add(imageName);
              // 同时保护对应的缩略图
              newReferencedImages.add(`thumb_${imageName}`);
            }
          });
        }
      });

      // 获取本地所有图片
      const localImages = await imageService.listImages();
      
      // 找出在旧数据中被引用，但在新数据中不再被引用的图片
      const imagesToDelete: string[] = [];
      
      for (const imageName of oldReferencedImages) {
        if (!newReferencedImages.has(imageName)) {
          // 这个图片在新数据中不再被引用，需要删除
          if (localImages.includes(imageName)) {
            imagesToDelete.push(imageName);
          }
          // 同时检查对应的缩略图
          const thumbName = `thumb_${imageName}`;
          if (localImages.includes(thumbName)) {
            imagesToDelete.push(thumbName);
          }
        }
      }

      if (imagesToDelete.length > 0) {
        console.log(`[App] 发现 ${imagesToDelete.length} 个需要清理的孤儿图片:`, imagesToDelete);
        
        // 删除这些孤儿图片（不记录删除操作，因为这是同步清理）
        let deletedCount = 0;
        for (const imageName of imagesToDelete) {
          try {
            await syncService.forceDeleteLocalFile(imageName);
            console.log(`[App] 清理孤儿图片成功: ${imageName}`);
            deletedCount++;
          } catch (error) {
            console.warn(`[App] 清理孤儿图片失败: ${imageName}`, error);
          }
        }
        
        if (deletedCount > 0) {
          addToast('info', `已清理 ${deletedCount} 个未引用的图片`);
        }
      }
    } catch (error) {
      console.error('[App] 孤儿图片清理过程失败:', error);
    }
  };


  const handleImageSync = async () => {
    try {
      console.log('Starting Image Sync...');
      const result = await syncService.syncImages((msg) => console.log(msg));

      if (result.uploaded > 0) addToast('success', `Uploaded ${result.uploaded} images`);
      if (result.downloaded > 0) addToast('success', `Downloaded ${result.downloaded} images`);
      if (result.deletedRemote > 0) addToast('success', `Deleted ${result.deletedRemote} remote images`);

      if (result.errors.length > 0) {
        console.error('Image sync errors:', result.errors);
        addToast('error', `Image sync had ${result.errors.length} errors`);
      }
    } catch (e) {
      console.error('Image sync error', e);
    }
  };

  const handleQuickSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSyncing(true);
    try {
      const config = webdavService.getConfig();
      if (!config) {
        setIsSettingsOpen(true);
        setIsSyncing(false);
        return;
      }

      // Smart sync: compare timestamps
      let cloudTimestamp = 0;
      let cloudData = null;

      try {
        cloudData = await webdavService.downloadData();
        cloudTimestamp = cloudData?.timestamp || 0;
      } catch (err) {
        // No cloud file, will upload
        console.log('No cloud data, will upload');
      }

      // Prepare local data
      const localData = {
        logs,
        todos,
        categories,
        todoCategories,
        scopes,
        goals,
        autoLinkRules,
        reviewTemplates,
        dailyReviews,
        weeklyReviews,
        monthlyReviews,
        customNarrativeTemplates,
        userPersonalInfo,
        filters,
        timestamp: dataLastModified, // Use tracked modification time
        version: '1.0.0'
      };

      const localTimestamp = localData.timestamp;

      if (cloudTimestamp > localTimestamp) {
        // Cloud is newer, download
        if (cloudData) {
          await handleSyncDataUpdate(cloudData);
          addToast('success', `Downloaded from cloud (${new Date(cloudTimestamp).toLocaleDateString()})`);
        }
      } else {
        // Local is newer or equal, upload
        await webdavService.uploadData(localData);
        // addToast('success', 'Uploaded to cloud');
      }

      // Sync Images
      await handleImageSync();

      // 调试：列出同步后的本地图片
      try {
        const localImages = await imageService.listImages();
        console.log(`[App] 同步完成后本地图片列表:`, localImages);
        
        // Web环境下额外检查IndexedDB
        if (typeof window !== 'undefined' && !window.Capacitor?.isNativePlatform()) {
          const indexedDBImages = await imageService.debugListIndexedDBImages();
          console.log(`[App] IndexedDB中的图片:`, indexedDBImages);
        }
      } catch (error) {
        console.error('[App] 调试信息获取失败:', error);
      }

      addToast('success', 'Sync complete');
      
      // 强制刷新脉络页面 - 通过微调当前日期来触发重新渲染
      if (currentView === AppView.TIMELINE) {
        const tempDate = new Date(currentDate);
        tempDate.setMilliseconds(tempDate.getMilliseconds() + 1);
        setCurrentDate(tempDate);
        // 立即恢复原始日期，但这会触发组件重新渲染
        setTimeout(() => {
          setCurrentDate(new Date(currentDate));
        }, 10);
      }
    } catch (error) {
      console.error("Sync failed", error);
      addToast('error', 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className={`h-screen w-screen flex flex-col ${currentView === AppView.TIMELINE ? 'bg-white' : 'bg-[#fdfbf7]'} text-stone-800 overflow-hidden select-none font-serif relative pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`}>


      {/* Top Header Bar */}
      {!isSettingsOpen && (currentView !== AppView.TIMELINE || isDailyReviewOpen) && !isStatsFullScreen &&
        !(currentView === AppView.TODO && isTodoManaging) &&
        !(currentView === AppView.TAGS && isTagsManaging) &&
        // Show header for Review Hub main page, hide for Weekly/Monthly detail views
        !(currentView === AppView.REVIEW && (isWeeklyReviewOpen || isMonthlyReviewOpen)) &&
        !(currentView === AppView.SCOPE && isScopeManaging) && (
          <header className="h-14 flex items-center justify-between px-5 bg-[#fdfbf7] border-b border-stone-100 shrink-0 z-30">
            <div className="w-8 flex items-center">
              {(currentView === AppView.TODO || currentView === AppView.RECORD) && !isDailyReviewOpen && !isMonthlyReviewOpen && (
                <button
                  onClick={handleQuickSync}
                  disabled={isSyncing}
                  className={`p-2 text-stone-400 hover:text-stone-600 rounded-full transition-all active:scale-95 -ml-2 ${isSyncing ? 'animate-spin text-purple-500' : ''}`}
                  title="Sync from Cloud"
                >
                  <RefreshCw size={18} />
                </button>
              )}
              {/* Show Back button if in Tag Detail, Category Detail, Scope Detail, Stats, or Daily Review */}
              {((currentView === AppView.TAGS && (selectedTagId || selectedCategoryId)) ||
                (currentView === AppView.SCOPE && selectedScopeId) ||
                currentView === AppView.STATS ||
                isDailyReviewOpen ||
                isMonthlyReviewOpen) && (
                  <button
                    onClick={() => {
                      if (isDailyReviewOpen) {
                        setIsDailyReviewOpen(false);
                        setCurrentReviewDate(null);
                        if (isOpenedFromSearch) {
                          setIsSearchOpen(true);
                          setIsOpenedFromSearch(false);
                        }
                      } else if (isMonthlyReviewOpen) {
                        handleCloseMonthlyReview();
                        if (isOpenedFromSearch) {
                          setIsSearchOpen(true);
                          setIsOpenedFromSearch(false);
                        }
                      } else if (currentView === AppView.STATS) {
                        setCurrentView(AppView.TIMELINE);
                      } else if (currentView === AppView.SCOPE) {
                        // Use history back to trigger popstate logic, ensuring consistency with hardware back button
                        window.history.back();
                      } else {
                        handleBackFromTag();
                      }
                    }}
                    className="text-stone-400 hover:text-stone-600"
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}
            </div>
            <h1 className="text-lg font-bold text-stone-700 tracking-wide">
              {getHeaderTitle()}
            </h1>
            {(isDailyReviewOpen || isMonthlyReviewOpen) ? (
              <div className="w-8" />
            ) : currentView === AppView.RECORD ? (
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="w-8 flex justify-end text-stone-400 hover:text-stone-600 transition-colors"
              >
                <SettingsIcon size={24} />
              </button>
            ) : currentView === AppView.TODO && !isTodoManaging ? (
              <button
                onClick={() => setIsTodoManaging(true)}
                className="w-8 flex justify-end text-stone-400 hover:text-stone-600 transition-colors"
              >
                <Settings2 size={24} />
              </button>
            ) : currentView === AppView.TAGS && !selectedTagId && !selectedCategoryId && !isTagsManaging ? (
              <button
                onClick={() => setIsTagsManaging(true)}
                className="w-8 flex justify-end text-stone-400 hover:text-stone-600 transition-colors"
              >
                <Settings2 size={24} />
              </button>
            ) : currentView === AppView.SCOPE && !selectedScopeId && !isScopeManaging ? (
              <button
                onClick={() => setIsScopeManaging(true)}
                className="w-8 flex justify-end text-stone-400 hover:text-stone-600 transition-colors"
              >
                <Settings2 size={24} />
              </button>
            ) : currentView === AppView.STATS ? (
              <button
                onClick={() => setIsStatsFullScreen(true)}
                className="w-8 flex justify-end text-stone-400 hover:text-stone-600 transition-colors"
              >
                <Maximize2 size={24} />
              </button>
            ) : (
              <div className="w-8" />
            )}
          </header>
        )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {renderView()}

        {/* Global Floating Action Button for Tags/Scope Toggle */}
        {(currentView === AppView.TAGS || currentView === AppView.SCOPE) &&
          !selectedTagId && !selectedCategoryId && !selectedScopeId && (
            <button
              onClick={() => setCurrentView(currentView === AppView.TAGS ? AppView.SCOPE : AppView.TAGS)}
              className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-6 w-14 h-14 bg-stone-900 rounded-full text-white shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40 border border-stone-800"
              aria-label={currentView === AppView.TAGS ? "Switch to Scope" : "Switch to Tags"}
            >
              {currentView === AppView.TAGS ? <Target size={24} /> : <Tag size={24} />}
            </button>
          )}

        {/* Full Screen Settings Overlay */}
        {isSettingsOpen && (
          <SettingsView
            onClose={() => setIsSettingsOpen(false)}
            onReset={() => {
              setLogs(INITIAL_LOGS);
              setTodos(INITIAL_TODOS);
              setCategories(CATEGORIES);
              setScopes(SCOPES);
              setTodoCategories(MOCK_TODO_CATEGORIES);
              setTodoCategories(MOCK_TODO_CATEGORIES);
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
              addToast('success', 'Data reset to defaults');
              setIsSettingsOpen(false);
            }}
            onClearData={() => {
              setLogs([]);
              setTodos([]);
              setGoals([]);
              setScopes([]);
              setScopes([]);
              setReviewTemplates([]);
              setCheckTemplates([]);
              setDailyReviews([]);
              setWeeklyReviews([]);
              setMonthlyReviews([]);
              setAutoLinkRules([]);
              setUserPersonalInfo('');
              setFilters([]);
              // Optional: Clear AI preferences? Maybe keep them.
              addToast('success', 'All data cleared successfully');
              setIsSettingsOpen(false);
            }}
            onExport={() => {
              const data = {
                logs,
                todos,
                categories,
                todoCategories,
                scopes,
                goals,
                autoLinkRules,
                reviewTemplates,
                dailyReviews,
                weeklyReviews,
                monthlyReviews,
                customNarrativeTemplates,
                userPersonalInfo,
                filters,
                version: '1.0.0',
                timestamp: Date.now()
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `lumostime-backup-${new Date().toISOString().split('T')[0]}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              addToast('success', 'Backup exported successfully');
            }}
            onImport={(file) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                try {
                  const data = JSON.parse(e.target?.result as string);
                  if (data.logs) setLogs(data.logs);
                  if (data.todos) setTodos(data.todos);
                  if (data.categories) setCategories(data.categories);
                  if (data.todoCategories) setTodoCategories(data.todoCategories);
                  if (data.scopes) setScopes(data.scopes);
                  if (data.goals) setGoals(data.goals);
                  if (data.autoLinkRules) setAutoLinkRules(data.autoLinkRules);
                  if (data.reviewTemplates) setReviewTemplates(data.reviewTemplates);
                  if (data.dailyReviews) setDailyReviews(data.dailyReviews);
                  if (data.weeklyReviews) setWeeklyReviews(data.weeklyReviews);
                  if (data.monthlyReviews) setMonthlyReviews(data.monthlyReviews);
                  if (data.customNarrativeTemplates) setCustomNarrativeTemplates(data.customNarrativeTemplates);
                  if (data.userPersonalInfo) setUserPersonalInfo(data.userPersonalInfo);
                  if (data.filters) setFilters(data.filters);

                  if (data.timestamp) setDataLastModified(data.timestamp);
                  addToast('success', 'Data imported successfully!');
                  setIsSettingsOpen(false); // Close settings after import to see changes
                } catch (err) {
                  addToast('error', 'Failed to import data: Invalid file format');
                }
              };
              reader.readAsText(file);
            }}
            onToast={addToast}
            syncData={{ logs, todos, categories, todoCategories, scopes, goals, autoLinkRules, reviewTemplates, dailyReviews, weeklyReviews, monthlyReviews, customNarrativeTemplates, userPersonalInfo, filters }}
            onSyncUpdate={handleSyncDataUpdate}
            startWeekOnSunday={startWeekOnSunday}
            onToggleStartWeekOnSunday={() => setStartWeekOnSunday(!startWeekOnSunday)}
            onOpenAutoLink={() => {
              setIsSettingsOpen(false);
              setIsAutoLinkOpen(true);
            }}
            onOpenSearch={() => {
              setIsSettingsOpen(false);
              setIsSearchOpen(true);
              setIsSearchOpenedFromSettings(true);
            }}
            minIdleTimeThreshold={minIdleTimeThreshold}
            onSetMinIdleTimeThreshold={setMinIdleTimeThreshold}
            defaultView={defaultView}
            onSetDefaultView={setDefaultView}
            reviewTemplates={reviewTemplates}
            onUpdateReviewTemplates={setReviewTemplates}
            onUpdateDailyReviews={setDailyReviews}
            dailyReviewTime={dailyReviewTime}
            onSetDailyReviewTime={setDailyReviewTime}
            weeklyReviewTime={weeklyReviewTime}
            onSetWeeklyReviewTime={setWeeklyReviewTime}
            monthlyReviewTime={monthlyReviewTime}
            onSetMonthlyReviewTime={setMonthlyReviewTime}
            customNarrativeTemplates={customNarrativeTemplates}
            onUpdateCustomNarrativeTemplates={setCustomNarrativeTemplates}
            // Check Templates
            checkTemplates={checkTemplates}
            onUpdateCheckTemplates={setCheckTemplates}
            userPersonalInfo={userPersonalInfo}
            onSetUserPersonalInfo={setUserPersonalInfo}
            logs={logs}
            todos={todos}
            scopes={scopes}
            currentDate={currentDate}
            dailyReviews={dailyReviews}
            weeklyReviews={weeklyReviews}
            monthlyReviews={monthlyReviews}
            todoCategories={todoCategories}
            filters={filters}
            onUpdateFilters={setFilters}
            categoriesData={categories}
            onEditLog={openEditModal}
            autoFocusNote={autoFocusNote}
            onToggleAutoFocusNote={() => setAutoFocusNote(prev => !prev)}
          />
        )}

        {/* Auto Link Rules View */}
        {isAutoLinkOpen && (
          <AutoLinkView
            onClose={() => setIsAutoLinkOpen(false)}
            rules={autoLinkRules}
            onUpdateRules={setAutoLinkRules}
            categories={categories}
            scopes={scopes}
          />
        )}

        {/* Search View - Always rendered but hidden to preserve state */}
        <div style={{ display: isSearchOpen ? 'block' : 'none' }}>
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
            onClose={() => {
              setIsSearchOpen(false);
              if (isSearchOpenedFromSettings) {
                setIsSettingsOpen(true);
                setIsSearchOpenedFromSettings(false);
              }
            }}
            onSelectLog={handleSelectSearchLog}
            onSelectTodo={handleSelectSearchTodo}
            onSelectScope={handleSelectSearchScope}
            onSelectCategory={handleSelectSearchCategory}
            onSelectActivity={handleSelectSearchActivity}
            onSelectDailyReview={(dateStr) => {
              const date = new Date(dateStr);
              // Fix timezone offset issue manually or just trust the YYYY-MM-DD string
              // Since our logic uses new Date(dateStr) which might be UTC, but our App treats it as local...
              // Actually, best to use the same logic as elsewhere: new Date(dateStr)
              // But be careful if it results in previous day due to timezone.
              // Let's assume input string "YYYY-MM-DD".
              // App uses local dates mostly.
              // To be safe: new Date(dateStr + 'T00:00:00')
              setCurrentReviewDate(new Date(dateStr));
              setIsDailyReviewOpen(true);
              setIsSearchOpen(false);
              setIsOpenedFromSearch(true);
            }}
            onSelectWeeklyReview={(id) => {
              const review = weeklyReviews.find(r => r.id === id);
              if (review) {
                handleOpenWeeklyReview(new Date(review.weekStartDate), new Date(review.weekEndDate));
                setIsSearchOpen(false);
              }
            }}
            onSelectMonthlyReview={(id) => {
              const review = monthlyReviews.find(r => r.id === id);
              if (review) {
                handleOpenMonthlyReview(new Date(review.monthStartDate), new Date(review.monthEndDate));
                setIsSearchOpen(false);
                setIsOpenedFromSearch(true);
              }
            }}
          />
        </div>

        {/* All Modals */}
        <ModalManager
          // AddLog Modal
          isAddModalOpen={isAddModalOpen}
          editingLog={editingLog}
          initialLogTimes={initialLogTimes}
          onCloseAddLog={closeModal}
          onSaveLog={handleSaveLog}
          onDeleteLog={handleDeleteLog}
          onImageRemove={handleLogImageRemove}
          lastLogEndTime={(() => {
            if (logs.length === 0) return undefined;
            const currentStartTime = editingLog?.startTime || Date.now();
            const previousLogs = logs.filter(l =>
              l.id !== editingLog?.id &&
              l.endTime <= currentStartTime
            );
            if (previousLogs.length === 0) return undefined;
            return Math.max(...previousLogs.map(l => l.endTime));
          })()}

          // Todo Modal
          isTodoModalOpen={isTodoModalOpen}
          isSettingsOpen={isSettingsOpen}
          editingTodo={editingTodo}
          todoCategoryToAdd={todoCategoryToAdd}
          todoCategories={todoCategories}
          onCloseTodo={closeTodoModal}
          onSaveTodo={handleSaveTodo}
          onDeleteTodo={handleDeleteTodo}
          onEditLog={openEditModal}

          // Goal Editor
          isGoalEditorOpen={isGoalEditorOpen}
          editingGoal={editingGoal}
          goalScopeId={goalScopeId}
          onSaveGoal={handleSaveGoal}
          onCloseGoal={closeGoalEditor}

          // Session/Timer
          activeSessions={activeSessions}
          focusDetailSessionId={focusDetailSessionId}
          onStopActivity={(id) => handleStopActivity(id)}
          onCancelSession={handleCancelSession}
          onClickSession={(s) => setFocusDetailSessionId(s.id)}
          onUpdateSession={handleUpdateSession}
          onCloseFocusDetail={() => setFocusDetailSessionId(null)}
          autoFocusNote={autoFocusNote}
          // Common
          categories={categories}
          scopes={scopes}
          autoLinkRules={autoLinkRules}
          logs={logs}
          todos={todos}
        />

        {/* Delete Confirmation Modal for Todo */}
        <ConfirmModal
          isOpen={isDeleteTodoConfirmOpen}
          onClose={() => {
            setIsDeleteTodoConfirmOpen(false);
            setTodoToDeleteId(null);
          }}
          onConfirm={handleConfirmDeleteTodo}
          title="删除待办事项"
          description="该待办事项关联了历史专注记录。删除待办将保留这些记录，但会解除它们的关联。确定要继续吗？"
          confirmText="确认删除"
          cancelText="取消"
          type="danger"
        />
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          setSelectedTagId(null);
          setSelectedScopeId(null);
          setIsDailyReviewOpen(false);
          setIsMonthlyReviewOpen(false);
          setCurrentReviewDate(null);
        }}
        isVisible={
          !isSettingsOpen &&
          !isStatsFullScreen &&
          !isTodoModalOpen &&
          !selectedCategoryId &&
          !selectedScopeId &&
          !selectedTagId &&
          !isDailyReviewOpen &&
          !isWeeklyReviewOpen &&
          !isMonthlyReviewOpen &&
          !isTagsManaging &&
          !isScopeManaging &&
          currentView !== AppView.STATS
        }
      />
    </div>
  );
};

// Helper Component for Nav Items
const NavButton: React.FC<{ icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
  >
    <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
      {icon}
    </div>
    {/* Label removed as per request */}
  </button>
);

const AppWithProviders: React.FC = () => {
  const { activeSessions, setActiveSessions } = useSession();
  const { logs, setLogs } = useData();

  return (
    <CategoryScopeProvider
      activeSessions={activeSessions}
      setActiveSessions={setActiveSessions}
      logs={logs}
      setLogs={setLogs}
    >
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </CategoryScopeProvider>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <DataProvider>
        <SettingsProvider>
          <ReviewProvider>
            <SessionProvider splitLogByDays={splitLogByDays}>
              <AppWithProviders />
            </SessionProvider>
          </ReviewProvider>
        </SettingsProvider>
      </DataProvider>
    </ToastProvider>
  );
};

export default App;