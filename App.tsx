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
import { TimerFloating } from './components/TimerFloating';
import { AddLogModal } from './components/AddLogModal';
import { TodoDetailModal } from './components/TodoDetailModal';
import { GoalEditor } from './components/GoalEditor';
import { Activity, ActiveSession, AppView, Log, TodoItem, TodoCategory, Category, Goal, AutoLinkRule } from './types';
import { INITIAL_LOGS, INITIAL_TODOS, MOCK_TODO_CATEGORIES, VIEW_TITLES, CATEGORIES, SCOPES, INITIAL_GOALS } from './constants';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { webdavService } from './services/webdavService';
import { ParsedTimeEntry } from './services/aiService';
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
  Settings
} from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { Buffer } from 'buffer';

// Polyfill Buffer for webdav library
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.RECORD);
  const [returnToSearch, setReturnToSearch] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAutoLinkOpen, setIsAutoLinkOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isStatsFullScreen, setIsStatsFullScreen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [focusDetailSessionId, setFocusDetailSessionId] = useState<string | null>(null);

  // Load from localStorage or use initial data
  const [logs, setLogs] = useState<Log[]>(() => {
    const stored = localStorage.getItem('lumostime_logs');
    return stored ? JSON.parse(stored) : INITIAL_LOGS;
  });

  // Todo State
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    const stored = localStorage.getItem('lumostime_todos');
    if (stored) {
      return JSON.parse(stored);
    }
    return INITIAL_TODOS.map(todo => {
      if (!todo.isProgress) return todo;
      // Systemic Fix: Recalculate progress from logs to ensure consistency
      const calculatedProgress = INITIAL_LOGS
        .filter(log => log.linkedTodoId === todo.id)
        .reduce((acc, log) => acc + (log.progressIncrement || 0), 0);
      return { ...todo, completedUnits: calculatedProgress };
    });
  });

  const [todoCategories, setTodoCategories] = useState<TodoCategory[]>(() => {
    const stored = localStorage.getItem('lumostime_todoCategories');
    return stored ? JSON.parse(stored) : MOCK_TODO_CATEGORIES;
  });
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [isTodoManaging, setIsTodoManaging] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [todoCategoryToAdd, setTodoCategoryToAdd] = useState<string>(MOCK_TODO_CATEGORIES[0].id);

  // Tag Navigation State
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<Log | null>(null);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastType, message: string, action?: { label: string, onClick: () => void }) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message, action }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Preferences
  const [startWeekOnSunday, setStartWeekOnSunday] = useState(false);

  // Auto Link Rules (自动关联规则)
  const [autoLinkRules, setAutoLinkRules] = useState<AutoLinkRule[]>(() => {
    const stored = localStorage.getItem('lumostime_autoLinkRules');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem('lumostime_autoLinkRules', JSON.stringify(autoLinkRules));
  }, [autoLinkRules]);

  // --- Auto Sync Logic ---
  const [lastSyncTime, setLastSyncTime] = useState<number>(() => {
    const saved = localStorage.getItem('lumos_last_sync_time');
    return saved ? parseInt(saved) : 0;
  });

  const updateLastSyncTime = () => {
    const now = Date.now();
    setLastSyncTime(now);
    localStorage.setItem('lumos_last_sync_time', now.toString());
  };

  // --- Data Modification Tracking ---
  const [dataLastModified, setDataLastModified] = useState<number>(() => {
    const saved = localStorage.getItem('lumos_data_last_modified');
    return saved ? parseInt(saved) : Date.now();
  });

  const isRestoring = useRef(false);

  useEffect(() => {
    localStorage.setItem('lumos_data_last_modified', dataLastModified.toString());
  }, [dataLastModified]);





  const handleStartActivity = (activity: Activity, categoryId: string, todoId?: string, scopeId?: string) => {
    let appliedScopeIds: string[] | undefined = scopeId ? [scopeId] : undefined;
    if (!scopeId && autoLinkRules.length > 0) {
      const matchingRules = autoLinkRules.filter(rule => rule.activityId === activity.id);
      if (matchingRules.length > 0) {
        appliedScopeIds = matchingRules.map(rule => rule.scopeId);
      }
    }
    const newSession: ActiveSession = {
      id: crypto.randomUUID(),
      activityId: activity.id,
      categoryId: categoryId,
      activityName: activity.name,
      activityIcon: activity.icon,
      startTime: Date.now(),
      linkedTodoId: todoId,
      scopeIds: appliedScopeIds
    };
    setActiveSessions(prev => [...prev, newSession]);
  };

  const handleStopActivity = (sessionId: string, finalSessionData?: ActiveSession) => {
    const session = activeSessions.find(s => s.id === sessionId);
    if (session) {
      const endTime = Date.now();
      const duration = (endTime - session.startTime) / 1000;

      if (duration > 1) {
        const newLog: Log = {
          id: crypto.randomUUID(),
          activityId: session.activityId,
          categoryId: session.categoryId,
          startTime: session.startTime,
          endTime: endTime,
          duration: duration,
          linkedTodoId: session.linkedTodoId,
          title: finalSessionData?.title || session.title,
          note: finalSessionData?.note || session.note,
          progressIncrement: finalSessionData?.progressIncrement, // Link increment to log
          focusScore: finalSessionData?.focusScore || session.focusScore,
          scopeIds: session.scopeIds
        };

        // Handle Progress Update
        if (finalSessionData?.progressIncrement && finalSessionData.progressIncrement > 0 && session.linkedTodoId) {
          setTodos(prev => prev.map(t => {
            if (t.id === session.linkedTodoId && t.isProgress) {
              const current = t.completedUnits || 0;
              return { ...t, completedUnits: current + finalSessionData.progressIncrement! };
            }
            return t;
          }));
        }

        setLogs(prev => [newLog, ...prev]);
      }
    }
    setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    if (focusDetailSessionId === sessionId) setFocusDetailSessionId(null);
  };

  const handleCancelSession = (sessionId: string) => {
    setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    if (focusDetailSessionId === sessionId) setFocusDetailSessionId(null);
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

    // 3. 删除日志
    setLogs(prev => prev.filter(l => l.id !== id));
    closeModal();
  };


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

  const [initialLogTimes, setInitialLogTimes] = useState<{ start: number, end: number } | null>(null);

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
      const cat = CATEGORIES.find(c => c.id === todo.linkedCategoryId);
      const act = cat?.activities.find(a => a.id === todo.linkedActivityId);

      if (cat && act) {
        handleStartActivity(act, cat.id, todo.id, todo.defaultScopeIds?.[0]);
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
    setTodos(prev => prev.filter(t => t.id !== id));
    closeTodoModal();
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

  // Category State
  const [categories, setCategories] = useState(() => {
    const stored = localStorage.getItem('lumostime_categories');
    return stored ? JSON.parse(stored) : CATEGORIES;
  });

  // Scope State (NEW)
  const [scopes, setScopes] = useState(() => {
    const stored = localStorage.getItem('lumostime_scopes');
    return stored ? JSON.parse(stored) : SCOPES;
  });

  // Goals State
  const [goals, setGoals] = useState<Goal[]>(() => {
    const stored = localStorage.getItem('lumostime_goals');
    return stored ? JSON.parse(stored) : INITIAL_GOALS;
  });

  const handleUpdateCategories = (newCategories: typeof CATEGORIES) => {
    setCategories(newCategories);

    // Sync active sessions with new category/activity data
    setActiveSessions(prevSessions => prevSessions.map(session => {
      // Find the category (optional check, mainly for activity lookup if we wanted to be strict, but we can search all)
      // Actually, session has categoryId, so we can look up efficiently.
      const category = newCategories.find(c => c.id === session.categoryId);
      if (!category) return session;

      const activity = category.activities.find(a => a.id === session.activityId);
      if (!activity) return session;

      // Update session if name or icon changed
      if (session.activityName !== activity.name || session.activityIcon !== activity.icon) {
        return {
          ...session,
          activityName: activity.name,
          activityIcon: activity.icon
        };
      }
      return session;
    }));
  };

  const handleUpdateCategory = (updatedCategory: Category) => {
    setCategories(prev => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
    // Sync active sessions
    setActiveSessions(prev => prev.map(s => {
      if (s.categoryId === updatedCategory.id) {
        // If the category name/icon changed, we might want to update session?
        // But session stores activityName/Icon. 
        // If category color changed, it might affect UI but session doesn't store color directly usually (looks up by ID).
        return s;
      }
      return s;
    }));
  };

  const handleUpdateActivity = (updatedActivity: Activity) => {
    setCategories(prev => prev.map(cat => {
      const activityIndex = cat.activities.findIndex(a => a.id === updatedActivity.id);
      if (activityIndex > -1) {
        const newActivities = [...cat.activities];
        newActivities[activityIndex] = updatedActivity;
        return { ...cat, activities: newActivities };
      }
      return cat;
    }));

    // Sync active sessions
    setActiveSessions(prev => prev.map(s => {
      if (s.activityId === updatedActivity.id) {
        return {
          ...s,
          activityName: updatedActivity.name,
          activityIcon: updatedActivity.icon
        };
      }
      return s;
    }));
  };

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
    localStorage.setItem('lumostime_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('lumostime_scopes', JSON.stringify(scopes));
  }, [scopes]);

  useEffect(() => {
    localStorage.setItem('lumostime_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('lumostime_autoLinkRules', JSON.stringify(autoLinkRules));
  }, [autoLinkRules]);

  // Tags State
  const [isTagsManaging, setIsTagsManaging] = useState(false);

  // Scope State
  const [selectedScopeId, setSelectedScopeId] = useState<string | null>(null);
  const [isScopeManaging, setIsScopeManaging] = useState(false);

  // Goal State
  const [isGoalEditorOpen, setIsGoalEditorOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalScopeId, setGoalScopeId] = useState<string>('');

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
  }, [logs, todos, categories, todoCategories, scopes, goals, autoLinkRules]);

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
            handleSyncDataUpdate(data);
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
  }, [logs, todos, categories, todoCategories, scopes, goals, autoLinkRules]);

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
            version: '1.0.0',
            timestamp: Date.now()
          };
          webdavService.uploadData(dataToSync).catch(console.error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [logs, todos, categories, todoCategories, scopes, goals, autoLinkRules]);

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
    isStatsFullScreen, isTodoManaging, isTagsManaging,
    currentView, selectedTagId, selectedCategoryId
  ]);

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

  const handleSelectSearchActivity = (activity: { id: string }, categoryId: string) => {
    setReturnToSearch(true);
    setIsSearchOpen(false);
    setCurrentView(AppView.TAGS);
    handleSelectTag(activity.id);
  };

  const renderView = () => {
    if (isSettingsOpen) return null;

    switch (currentView) {
      case AppView.RECORD:
        return <RecordView onStartActivity={handleStartActivity} categories={categories} />;
      case AppView.TIMELINE:
        return (
          <TimelineView
            logs={logs}
            todos={todos}
            onAddLog={openAddModal}
            onEditLog={openEditModal}
            categories={categories}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onShowStats={() => setCurrentView(AppView.STATS)}
            onSync={handleQuickSync}
            isSyncing={isSyncing}
            onBatchAddLogs={handleBatchAddLogs}
            todoCategories={todoCategories}
            onToast={addToast}
            startWeekOnSunday={startWeekOnSunday}
            scopes={scopes}
            autoLinkRules={autoLinkRules}
          />
        );
      case AppView.STATS:
        return (
          <StatsView
            logs={logs}
            categories={categories}
            currentDate={currentDate}
            onBack={() => setCurrentView(AppView.TIMELINE)}
            isFullScreen={isStatsFullScreen}
            onToggleFullScreen={() => setIsStatsFullScreen(!isStatsFullScreen)}
            onToast={addToast}
            todos={todos}
            todoCategories={todoCategories}
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
            scopes={scopes}
            onToggleTodo={handleToggleTodo}
            onEditTodo={openEditTodoModal}
            onAddTodo={openAddTodoModal}
            onStartFocus={handleStartTodoFocus}
            onDuplicateTodo={handleDuplicateTodo}
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
    if (currentView === AppView.TAGS) {
      if (selectedTagId) return 'Tag Details';
      if (selectedCategoryId) return 'Category Details';
      return 'Tags';
    }
    if (currentView === AppView.SCOPE) {
      if (selectedScopeId) return 'Scope Details';
      return 'Scopes';
    }
    return VIEW_TITLES[currentView];
  };

  const handleSyncDataUpdate = (data: any) => {
    isRestoring.current = true;
    if (data.logs) setLogs(data.logs);
    if (data.categories) setCategories(data.categories);
    if (data.todos) setTodos(data.todos);
    if (data.todoCategories) setTodoCategories(data.todoCategories);
    if (data.scopes) setScopes(data.scopes);
    if (data.goals) setGoals(data.goals);
    if (data.autoLinkRules) setAutoLinkRules(data.autoLinkRules);

    if (data.timestamp) {
      setDataLastModified(data.timestamp);
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
        timestamp: dataLastModified, // Use tracked modification time
        version: '1.0.0'
      };

      const localTimestamp = localData.timestamp;

      if (cloudTimestamp > localTimestamp) {
        // Cloud is newer, download
        if (cloudData) {
          handleSyncDataUpdate(cloudData);
          addToast('success', `Downloaded from cloud (${new Date(cloudTimestamp).toLocaleDateString()})`);
        }
      } else {
        // Local is newer or equal, upload
        await webdavService.uploadData(localData);
        addToast('success', 'Uploaded to cloud');
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
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Top Header Bar */}
      {!isSettingsOpen && currentView !== AppView.TIMELINE && !isStatsFullScreen &&
        !(currentView === AppView.TODO && isTodoManaging) &&
        !(currentView === AppView.TAGS && isTagsManaging) &&
        !(currentView === AppView.SCOPE && isScopeManaging) && (
          <header className="h-14 flex items-center justify-between px-5 bg-[#fdfbf7] border-b border-stone-100 shrink-0 z-30">
            <div className="w-8 flex items-center">
              {(currentView === AppView.TODO || currentView === AppView.RECORD) && (
                <button
                  onClick={handleQuickSync}
                  disabled={isSyncing}
                  className={`p-2 text-stone-400 hover:text-stone-600 rounded-full transition-all active:scale-95 -ml-2 ${isSyncing ? 'animate-spin text-purple-500' : ''}`}
                  title="Sync from Cloud"
                >
                  <RefreshCw size={18} />
                </button>
              )}
              {/* Show Back button if in Tag Detail, Category Detail, Scope Detail, or Stats */}
              {((currentView === AppView.TAGS && (selectedTagId || selectedCategoryId)) ||
                (currentView === AppView.SCOPE && selectedScopeId) ||
                currentView === AppView.STATS) && (
                  <button
                    onClick={() => {
                      if (currentView === AppView.STATS) {
                        setCurrentView(AppView.TIMELINE);
                      } else if (currentView === AppView.SCOPE) {
                        handleBackFromScope();
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
            {currentView === AppView.RECORD ? (
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
              addToast('success', 'Data reset to defaults');
              setIsSettingsOpen(false);
            }}
            onClearData={() => {
              setLogs([]);
              setTodos([]);
              setGoals([]);
              setScopes([]);
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
            syncData={{ logs, todos, categories, todoCategories, scopes, goals, autoLinkRules }}
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
            }}
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
            onClose={handleCloseSearch}
            onSelectLog={handleSelectSearchLog}
            onSelectTodo={handleSelectSearchTodo}
            onSelectScope={handleSelectSearchScope}
            onSelectCategory={handleSelectSearchCategory}
            onSelectActivity={handleSelectSearchActivity}
          />
        </div>

        {/* Focus Detail View Overlay */}
        {focusDetailSessionId && !isSettingsOpen && (
          <FocusDetailView
            session={activeSessions.find(s => s.id === focusDetailSessionId)!}
            todos={todos}
            categories={categories}
            todoCategories={todoCategories}
            scopes={scopes}
            onClose={() => setFocusDetailSessionId(null)}
            onComplete={(s) => handleStopActivity(s.id, s)}
            onUpdate={handleUpdateSession}
          />
        )}

        {/* Active Timer Overlay */}
        {activeSessions.length > 0 && !isSettingsOpen && !focusDetailSessionId && (
          <TimerFloating
            sessions={activeSessions}
            todos={todos}
            onStop={(id) => handleStopActivity(id)}
            onCancel={handleCancelSession}
            onClick={(s) => setFocusDetailSessionId(s.id)}
          />
        )}

        {/* Manual Add/Edit Log Modal */}
        {isAddModalOpen && !isSettingsOpen && (
          <AddLogModal
            initialLog={editingLog}
            initialStartTime={initialLogTimes?.start}
            initialEndTime={initialLogTimes?.end}
            onClose={closeModal}
            onSave={handleSaveLog}
            onDelete={handleDeleteLog}
            categories={categories}
            todos={todos}
            todoCategories={todoCategories}
            scopes={scopes}
            autoLinkRules={autoLinkRules}
            lastLogEndTime={logs.length > 0 ? Math.max(...logs.filter(l => l.id !== editingLog?.id).map(l => l.endTime)) : undefined}
          />
        )}

        {/* Todo Add/Edit Modal */}
        {isTodoModalOpen && !isSettingsOpen && (
          <TodoDetailModal
            initialTodo={editingTodo}
            currentCategory={todoCategories.find(c => c.id === todoCategoryToAdd)!}
            onClose={closeTodoModal}
            onSave={handleSaveTodo}
            onDelete={handleDeleteTodo}
            logs={logs}
            onLogUpdate={handleSaveLog}
            onEditLog={openEditModal}
            todoCategories={todoCategories}
            categories={categories}
            scopes={scopes}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      {!isSettingsOpen && !isStatsFullScreen && (
        <nav className="h-16 md:h-20 bg-white border-t border-stone-100 flex items-center justify-around px-2 pb-safe md:pb-0 z-30 shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">

          <NavButton
            icon={<PlusCircle size={24} />}
            label="記錄"
            isActive={currentView === AppView.RECORD}
            onClick={() => { setCurrentView(AppView.RECORD); setSelectedTagId(null); }}
          />

          <NavButton
            icon={<CheckSquare size={24} />}
            label="待辦"
            isActive={currentView === AppView.TODO}
            onClick={() => { setCurrentView(AppView.TODO); setSelectedTagId(null); }}
          />

          <NavButton
            icon={<Clock size={24} />}
            label="時間軸"
            isActive={currentView === AppView.TIMELINE}
            onClick={() => { setCurrentView(AppView.TIMELINE); setSelectedTagId(null); }}
          />

          <NavButton
            icon={<Tag size={24} />}
            label="標籤"
            isActive={currentView === AppView.TAGS}
            onClick={() => setCurrentView(AppView.TAGS)}
          />

          <NavButton
            icon={<Briefcase size={24} />}
            label="領域"
            isActive={currentView === AppView.SCOPE}
            onClick={() => { setCurrentView(AppView.SCOPE); setSelectedScopeId(null); }}
          />
        </nav>
      )}

      {/* Goal Editor Modal */}
      {isGoalEditorOpen && (
        <GoalEditor
          goal={editingGoal || undefined}
          scopeId={goalScopeId}
          categories={categories}
          todoCategories={todoCategories}
          onSave={handleSaveGoal}
          onClose={closeGoalEditor}
        />
      )}
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

export default App;