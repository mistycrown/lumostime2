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
import { Activity, ActiveSession, AppView, Log, TodoItem, TodoCategory, Category, Goal, AutoLinkRule, DailyReview, WeeklyReview, MonthlyReview, ReviewTemplate, NarrativeTemplate } from './types';
import { INITIAL_LOGS, INITIAL_TODOS, MOCK_TODO_CATEGORIES, VIEW_TITLES, CATEGORIES, SCOPES, INITIAL_GOALS, DEFAULT_REVIEW_TEMPLATES, DEFAULT_USER_PERSONAL_INFO, INITIAL_DAILY_REVIEWS } from './constants';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { webdavService } from './services/webdavService';
import { splitLogByDays } from './utils/logUtils';
import { ParsedTimeEntry, aiService } from './services/aiService';
import { narrativeService } from './services/narrativeService';
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

const App: React.FC = () => {
  const [returnToSearch, setReturnToSearch] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAutoLinkOpen, setIsAutoLinkOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isStatsFullScreen, setIsStatsFullScreen] = useState(false);
  const [statsTitle, setStatsTitle] = useState<string>('数据统计'); // 动态统计页面标题
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

  // Search Navigation State
  const [isOpenedFromSearch, setIsOpenedFromSearch] = useState(false);

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

  // App Rules (应用自动记录规则): packageName -> activityId
  const [appRules, setAppRules] = useState<{ [packageName: string]: string }>({});

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

  // --- Preference State ---
  const [minIdleTimeThreshold, setMinIdleTimeThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('lumos_min_idle_time');
    return saved ? parseInt(saved) : 1; // Default 1 minute
  });

  const [defaultView, setDefaultView] = useState<AppView>(() => {
    const saved = localStorage.getItem('lumos_default_view');
    return (saved as AppView) || AppView.RECORD;
  });

  const [currentView, setCurrentView] = useState<AppView>(() => {
    // If specific hash/url logic exists that overrides? No routing here.
    // Just use defaultView logic.
    const saved = localStorage.getItem('lumos_default_view');
    return (saved as AppView) || AppView.RECORD;
  });

  useEffect(() => {
    localStorage.setItem('lumos_min_idle_time', minIdleTimeThreshold.toString());
  }, [minIdleTimeThreshold]);

  useEffect(() => {
    localStorage.setItem('lumos_default_view', defaultView);
  }, [defaultView]);

  // Daily Review State (每日回顾状态)
  const [dailyReviews, setDailyReviews] = useState<DailyReview[]>(() => {
    const stored = localStorage.getItem('lumostime_dailyReviews');
    return stored ? JSON.parse(stored) : INITIAL_DAILY_REVIEWS;
  });

  const [reviewTemplates, setReviewTemplates] = useState<ReviewTemplate[]>(() => {
    const stored = localStorage.getItem('lumostime_reviewTemplates');
    return stored ? JSON.parse(stored) : DEFAULT_REVIEW_TEMPLATES;
  });

  // Daily Review Time
  const [dailyReviewTime, setDailyReviewTime] = useState<string>(() => {
    return localStorage.getItem('lumostime_review_time') || '22:00';
  });

  useEffect(() => {
    localStorage.setItem('lumostime_review_time', dailyReviewTime);
  }, [dailyReviewTime]);

  // Weekly Review Time
  const [weeklyReviewTime, setWeeklyReviewTime] = useState<string>(() => {
    return localStorage.getItem('lumostime_weekly_review_time') || '0-2200';
  });

  useEffect(() => {
    localStorage.setItem('lumostime_weekly_review_time', weeklyReviewTime);
  }, [weeklyReviewTime]);

  // Monthly Review Time
  const [monthlyReviewTime, setMonthlyReviewTime] = useState<string>(() => {
    return localStorage.getItem('lumostime_monthly_review_time') || '0-2200'; // 0-2200 means Last Day of Month at 22:00
  });

  useEffect(() => {
    localStorage.setItem('lumostime_monthly_review_time', monthlyReviewTime);
  }, [monthlyReviewTime]);

  // Custom AI Narrative Templates
  const [customNarrativeTemplates, setCustomNarrativeTemplates] = useState<NarrativeTemplate[]>(() => {
    const stored = localStorage.getItem('lumostime_custom_narrative_templates');
    if (stored) return JSON.parse(stored);

    // Migration: Check for old custom prompt
    const oldPrompt = localStorage.getItem('lumostime_ai_narrative_prompt');
    if (oldPrompt && oldPrompt.trim() !== '') {
      return [{
        id: 'custom_migrated',
        title: '我的自定义模版',
        description: '从旧版本迁移的自定义提示向',
        prompt: oldPrompt,
        isCustom: true
      }];
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('lumostime_custom_narrative_templates', JSON.stringify(customNarrativeTemplates));
  }, [customNarrativeTemplates]);

  // User Personal Info for AI Narrative
  const [userPersonalInfo, setUserPersonalInfo] = useState<string>(() => {
    const stored = localStorage.getItem('lumostime_user_personal_info');
    if (stored) return stored;
    return DEFAULT_USER_PERSONAL_INFO;
  });

  useEffect(() => {
    localStorage.setItem('lumostime_user_personal_info', userPersonalInfo);
  }, [userPersonalInfo]);

  // Daily Review View State (路由状态)
  const [isDailyReviewOpen, setIsDailyReviewOpen] = useState(false);
  const [currentReviewDate, setCurrentReviewDate] = useState<Date | null>(null);

  useEffect(() => {
    localStorage.setItem('lumostime_dailyReviews', JSON.stringify(dailyReviews));
  }, [dailyReviews]);

  useEffect(() => {
    localStorage.setItem('lumostime_reviewTemplates', JSON.stringify(reviewTemplates));
  }, [reviewTemplates]);

  // Weekly Review State (每周回顾状态)
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>(() => {
    const stored = localStorage.getItem('lumostime_weeklyReviews');
    return stored ? JSON.parse(stored) : [];
  });

  // Weekly Review View State (路由状态)
  const [isWeeklyReviewOpen, setIsWeeklyReviewOpen] = useState(false);
  const [currentWeeklyReviewStart, setCurrentWeeklyReviewStart] = useState<Date | null>(null);
  const [currentWeeklyReviewEnd, setCurrentWeeklyReviewEnd] = useState<Date | null>(null);

  useEffect(() => {
    localStorage.setItem('lumostime_weeklyReviews', JSON.stringify(weeklyReviews));
  }, [weeklyReviews]);

  // Monthly Review State (每月回顾状态)
  const [monthlyReviews, setMonthlyReviews] = useState<MonthlyReview[]>(() => {
    const stored = localStorage.getItem('lumostime_monthlyReviews');
    return stored ? JSON.parse(stored) : [];
  });

  // Monthly Review View State (路由状态)
  const [isMonthlyReviewOpen, setIsMonthlyReviewOpen] = useState(false);
  const [currentMonthlyReviewStart, setCurrentMonthlyReviewStart] = useState<Date | null>(null);
  const [currentMonthlyReviewEnd, setCurrentMonthlyReviewEnd] = useState<Date | null>(null);

  useEffect(() => {
    localStorage.setItem('lumostime_monthlyReviews', JSON.stringify(monthlyReviews));
  }, [monthlyReviews]);




  const handleStartActivity = (activity: Activity, categoryId: string, todoId?: string, scopeId?: string, note?: string) => {
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
      scopeIds: appliedScopeIds,
      note: note
    };
    setActiveSessions(prev => [...prev, newSession]);

    // 启动通知（仅Android平台）
    if (Capacitor.getPlatform() === 'android') {
      const taskName = `${activity.icon} ${activity.name}`;
      // Start Focus Notification if enabled
      const statusBarEnabled = localStorage.getItem('cfg_status_bar_enabled') === 'true'; // Default false
      if (statusBarEnabled) {
        FocusNotification.startFocusNotification({
          taskName
        }).catch(err => {
          console.error('❌ 启动专注通知失败:', err);
        });
      }
      // 更新悬浮球状态
      // Use toString() for safety
      const floatingWindowEnabled = localStorage.getItem('cfg_floating_window_enabled') === 'true'; // Default false
      if (floatingWindowEnabled && newSession && newSession.startTime) {
        FocusNotification.updateFloatingWindow({
          icon: activity.icon,
          isFocusing: true,
          startTime: newSession.startTime.toString()
        }).catch((e) => console.error("Update FW failed", e));
      }
    }
  };

  const handleStopActivity = (sessionId: string, finalSessionData?: ActiveSession) => {
    const session = activeSessions.find(s => s.id === sessionId);
    if (session) {
      const endTime = Date.now();
      const duration = (endTime - session.startTime) / 1000;

      if (duration > 1) {
        // 创建基础Log对象（不包含id，因为拆分时每条记录需要新id）
        const baseLog = {
          activityId: session.activityId,
          categoryId: session.categoryId,
          startTime: session.startTime,
          endTime: endTime,
          duration: duration,
          linkedTodoId: session.linkedTodoId,
          title: finalSessionData?.title || session.title,
          note: finalSessionData?.note || session.note,
          progressIncrement: finalSessionData?.progressIncrement,
          focusScore: finalSessionData?.focusScore || session.focusScore,
          scopeIds: session.scopeIds
        };

        // 使用拆分函数，自动处理跨天情况
        const logs = splitLogByDays(baseLog);

        // 处理进度增量（仅对第一条记录）
        if (logs[0].progressIncrement && logs[0].progressIncrement > 0 && session.linkedTodoId) {
          setTodos(prev => prev.map(t => {
            if (t.id === session.linkedTodoId && t.isProgress) {
              const current = t.completedUnits || 0;
              return { ...t, completedUnits: current + logs[0].progressIncrement! };
            }
            return t;
          }));

          // 清除其他记录的progressIncrement，避免重复计算
          logs.forEach((log, index) => {
            if (index > 0) {
              delete log.progressIncrement;
            }
          });
        }

        // 添加所有拆分后的记录到logs状态
        setLogs(prev => [...logs, ...prev]);
      }
    }
    setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    if (focusDetailSessionId === sessionId) setFocusDetailSessionId(null);

    // 停止通知（仅Android平台）
    // 停止通知（仅Android平台）
    if (Capacitor.getPlatform() === 'android') {
      FocusNotification.stopFocusNotification().catch(err => {
        console.error('❌ 停止专注通知失败:', err);
      });
      // 恢复悬浮球状态
      FocusNotification.updateFloatingWindow({ isFocusing: false }).catch(() => { });
    }
  };

  const handleCancelSession = (sessionId: string) => {
    setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    if (focusDetailSessionId === sessionId) setFocusDetailSessionId(null);

    // 停止通知（仅Android平台）
    // 停止通知（仅Android平台）
    if (Capacitor.getPlatform() === 'android') {
      FocusNotification.stopFocusNotification().catch(err => {
        console.error('❌ 停止专注通知失败:', err);
      });
      // 恢复悬浮球状态
      FocusNotification.updateFloatingWindow({ isFocusing: false }).catch(() => { });
    }
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


  const handleQuickPunch = () => {
    // 1. Determine Time Range (Same as Add + logic basically)
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);

    const now = new Date();
    // Use current date from App state, but 'now' for end time if it's "Today"
    // If user is viewing a past date, punch logic might be weird. 
    // Let's assume Quick Punch is ALWAYS for "Now" relative to the view, or strictly "Now"?
    // "打点计时" implies "Right Now". So if I am viewing yesterday, should I add a log for yesterday?
    // Usually "Punch" means "Mark current moment". 
    // But if I am filling yesterday's log?
    // Let's stick to: It fills gap on the *currently viewed date* UP TO *Now* (if today) or *End of day* (if past)?
    // User said: "如果很忙...先点击打点计时". This implies REAL TIME usage.
    // So it should probably only work if viewing TODAY, or force jump to Today.
    // Let's enforce it uses "Now" as end time, and creates log on Today.

    // Actually, simple robust logic:
    // It creates a log ending NOW. 
    // Start time = End of last log (chronologically).

    // Find absolute latest log in entire history? Or just today?
    // "Timeline... idle time... last activity end time"
    const allLogs = [...logs].sort((a, b) => b.endTime - a.endTime);
    const lastLog = allLogs[0];

    const endTimestamp = Date.now();
    let startTimestamp = endTimestamp - 300000; // Default 5 mins if no history?

    if (lastLog) {
      // If last log is in future (impossible?), clamp?
      // If last log is > now, we can't punch.
      if (lastLog.endTime > endTimestamp) {
        addToast('error', 'Cannot punch: Future logs exist.');
        return;
      }
      startTimestamp = lastLog.endTime;
    } else {
      // No logs ever. Start from today 00:00?
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      startTimestamp = todayStart.getTime();
    }

    // Safety: ensure duration is positive
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

  const handleCategoryChange = (activityId: string, newCategoryId: string) => {
    let activityToMove: Activity | undefined;
    let oldCategoryId: string | undefined;

    // Find the activity and its current category
    for (const cat of categories) {
      const foundActivity = cat.activities.find(a => a.id === activityId);
      if (foundActivity) {
        activityToMove = foundActivity;
        oldCategoryId = cat.id;
        break;
      }
    }

    if (!activityToMove || !oldCategoryId || oldCategoryId === newCategoryId) {
      return;
    }

    // Move the activity to the new category
    setCategories(prev => prev.map(cat => {
      if (cat.id === oldCategoryId) {
        // Remove activity from old category
        return {
          ...cat,
          activities: cat.activities.filter(a => a.id !== activityId)
        };
      } else if (cat.id === newCategoryId) {
        // Add activity to new category
        return {
          ...cat,
          activities: [...cat.activities, activityToMove!]
        };
      }
      return cat;
    }));

    // Update categoryId in all logs for this activity
    setLogs(prev => prev.map(log => {
      if (log.activityId === activityId) {
        return { ...log, categoryId: newCategoryId };
      }
      return log;
    }));

    // Update active sessions
    setActiveSessions(prev => prev.map(s => {
      if (s.activityId === activityId) {
        return {
          ...s,
          categoryId: newCategoryId
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

  // --- History Navigation Logic for Scope Detail ---
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
  }, [logs, todos, categories, todoCategories, scopes, goals, autoLinkRules, reviewTemplates, dailyReviews, weeklyReviews, monthlyReviews, customNarrativeTemplates, userPersonalInfo]);

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
  }, [logs, todos, categories, todoCategories, scopes, goals, autoLinkRules, reviewTemplates, dailyReviews, weeklyReviews, monthlyReviews, customNarrativeTemplates, userPersonalInfo, lastSyncTime]);

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
      const handleAppDetected = (event: any) => {
        try {
          // 数据在event对象的直接属性上,不是event.detail
          const packageName = event.packageName;
          const appLabel = event.appLabel;

          if (!packageName) {
            console.warn('⚠️ packageName为空');
            return;
          }

          console.log('📱 应用切换:', packageName, appLabel);

          // 只在空闲状态下检查关联
          if (activeSessions.length > 0) {
            console.log('当前已有活动会话,跳过提醒');
            return;
          }

          // 检查是否有应用关联规则
          const activityId = appRules[packageName];
          if (activityId) {
            // 查找对应的Activity信息
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
              console.log(`✅ 检测到关联: ${appLabel} → ${foundAct.name}`);
              // 提醒已在原生层处理,无需JS调用
            } else {
              console.log('⚠️ 未找到activityId对应的Activity:', activityId);
            }
          }
        } catch (e) {
          console.error('处理应用检测事件败:', e);
        }
      };

      const handleStartFromPrompt = (event: any) => {
        try {
          console.log('📥 收到悬浮球开始计时事件:', event);

          let packageName = '';
          let appLabel = '';

          // 解析事件数据
          if (event.detail) {
            const data = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail;
            packageName = data.packageName;
            appLabel = data.appLabel;
          } else {
            packageName = event.packageName;
            appLabel = event.appLabel;
          }

          if (!packageName) {
            console.warn('⚠️ packageName为空');
            return;
          }

          console.log('🚀 开始计时:', packageName, appLabel);

          // 查找关联规则
          const activityId = appRules[packageName];
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
              // 调用handleStartActivity, 传入关联应用的名称作为note
              // 注意: handleStartActivity签名为 (activity, categoryId, todoId, scopeId, note)
              handleStartActivity(foundAct, foundCat.id, undefined, undefined, `关联启动: ${appLabel || packageName}`);
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

      window.addEventListener('appDetected', handleAppDetected);
      window.addEventListener('startFocusFromPrompt', handleStartFromPrompt);

      return () => {
        window.removeEventListener('appDetected', handleAppDetected);
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

      review = {
        id: crypto.randomUUID(),
        date: dateStr,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        answers: [],
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
            onSync={async (e) => {
              e.preventDefault();
              setIsSyncing(true);
              try {
                const data = await webdavService.downloadData();
                if (data) {
                  // 统计数据量
                  const logCount = data.logs?.length || 0;
                  const todoCount = data.todos?.length || 0;

                  handleSyncDataUpdate(data);
                  updateLastSyncTime();

                  // 明确的同步方向和数据量
                  addToast('success', `✓ 已从云端拉取: ${logCount}条记录, ${todoCount}个待办`);
                } else {
                  addToast('info', '云端暂无备份数据');
                }
              } catch (error) {
                console.error('Sync error:', error);
                addToast('error', '从云端拉取失败,请检查配置');
              } finally {
                setIsSyncing(false);
              }
            }}
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

  const handleSyncDataUpdate = (data: any) => {
    isRestoring.current = true;
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
        reviewTemplates,
        dailyReviews,
        weeklyReviews,
        monthlyReviews,
        customNarrativeTemplates,
        userPersonalInfo,
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
          !selectedTagId && !selectedScopeId && (
            <button
              onClick={() => setCurrentView(currentView === AppView.TAGS ? AppView.SCOPE : AppView.TAGS)}
              className="fixed bottom-20 right-6 w-14 h-14 bg-stone-900 rounded-full text-white shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40 border border-stone-800"
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
              setReviewTemplates(DEFAULT_REVIEW_TEMPLATES);
              setDailyReviews([]);
              setWeeklyReviews([]);
              setMonthlyReviews([]);
              setAutoLinkRules([]);
              setCustomNarrativeTemplates([]);
              setUserPersonalInfo('');
              addToast('success', 'Data reset to defaults');
              addToast('success', 'Data reset to defaults');
              setIsSettingsOpen(false);
            }}
            onClearData={() => {
              setLogs([]);
              setTodos([]);
              setGoals([]);
              setScopes([]);
              setReviewTemplates([]);
              setDailyReviews([]);
              setWeeklyReviews([]);
              setMonthlyReviews([]);
              setAutoLinkRules([]);
              setUserPersonalInfo('');
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
            syncData={{ logs, todos, categories, todoCategories, scopes, goals, autoLinkRules, reviewTemplates, dailyReviews, weeklyReviews, monthlyReviews, customNarrativeTemplates, userPersonalInfo }}
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
            minIdleTimeThreshold={minIdleTimeThreshold}
            onSetMinIdleTimeThreshold={setMinIdleTimeThreshold}
            defaultView={defaultView}
            onSetDefaultView={setDefaultView}
            reviewTemplates={reviewTemplates}
            onUpdateReviewTemplates={setReviewTemplates}
            dailyReviewTime={dailyReviewTime}
            onSetDailyReviewTime={setDailyReviewTime}
            weeklyReviewTime={weeklyReviewTime}
            onSetWeeklyReviewTime={setWeeklyReviewTime}
            monthlyReviewTime={monthlyReviewTime}
            onSetMonthlyReviewTime={setMonthlyReviewTime}
            customNarrativeTemplates={customNarrativeTemplates}
            onUpdateCustomNarrativeTemplates={setCustomNarrativeTemplates}
            userPersonalInfo={userPersonalInfo}
            onSetUserPersonalInfo={setUserPersonalInfo}
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
            onClose={handleCloseSearch}
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

        {/* Focus Detail View Overlay */}
        {focusDetailSessionId && !isSettingsOpen && (
          <FocusDetailView
            session={activeSessions.find(s => s.id === focusDetailSessionId)!}
            todos={todos}
            categories={categories}
            todoCategories={todoCategories}
            scopes={scopes}
            autoLinkRules={autoLinkRules}
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
            lastLogEndTime={(() => {
              if (logs.length === 0) return undefined;
              const currentStartTime = editingLog?.startTime || Date.now();
              // 查找结束时间在当前记录开始时间之前,且结束时间最接近当前记录开始时间的记录
              const previousLogs = logs.filter(l =>
                l.id !== editingLog?.id &&
                l.endTime <= currentStartTime
              );
              if (previousLogs.length === 0) return undefined;
              // 返回这些记录中结束时间最晚的那个
              return Math.max(...previousLogs.map(l => l.endTime));
            })()}
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

      {/* Bottom Text Navigation */}
      {!isSettingsOpen && !isStatsFullScreen &&
        !isTodoModalOpen &&
        !selectedCategoryId &&
        !selectedScopeId &&
        !selectedTagId &&
        !isDailyReviewOpen &&
        !isWeeklyReviewOpen &&
        !isMonthlyReviewOpen &&
        !isTagsManaging &&
        !isScopeManaging &&
        currentView !== AppView.STATS && (
          <nav className={`fixed bottom-0 left-0 w-full h-14 md:h-16 border-t border-stone-100 flex justify-around items-center z-30 pb-safe md:pb-0 ${currentView === AppView.TIMELINE || currentView === AppView.TAGS
            ? 'bg-[#faf9f6]'
            : 'bg-white'
            }`}>
            {[
              { view: AppView.RECORD, label: '记录' },
              { view: AppView.TODO, label: '待办' },
              { view: AppView.TIMELINE, label: '脉络' },
              { view: AppView.REVIEW, label: '档案' },
              { view: AppView.TAGS, label: '索引' },
            ].map((item) => {
              const isActive = currentView === item.view;
              return (
                <div
                  key={item.view}
                  onClick={() => {
                    setCurrentView(item.view);
                    // Reset states on view switch
                    setSelectedTagId(null);
                    setSelectedScopeId(null);
                    setIsDailyReviewOpen(false);
                    setIsMonthlyReviewOpen(false);
                    setCurrentReviewDate(null);
                  }}
                  className={`flex-1 h-full flex items-center justify-center cursor-pointer relative transition-all duration-200 ${isActive ? 'text-stone-900' : 'text-stone-400'}`}
                >
                  <span className={`font-serif text-[13px] tracking-[1px] transition-all duration-200 ${isActive ? 'font-black' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </div>
              );
            })}
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