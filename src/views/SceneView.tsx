/**
 * @file SceneView.tsx
 * @description 场景化时间段视图 - 基于当前激活场景组展示卡片式时间段内容
 */
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { backgroundService } from '../services/backgroundService';
import { IconRenderer } from '../components/IconRenderer';
import { UIIcon } from '../components/UIIcon';
import { SceneCard } from '../components/SceneCard';
import { TimeSlot, SceneCardData, Activity, Category, TodoItem, DailyReview, CheckItem, WeeklyReview, MonthlyReview, AppView, SceneGroupState } from '../types';
import { DEFAULT_SCENE_PRESETS } from '../constants/scenePresets';
import { useReview } from '../contexts/ReviewContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { getLocalDateStr } from '../utils/dateUtils';
import { findAutoSwitchTargetGroup, getActiveSceneGroup, loadSceneGroupStateFromStorage } from '../utils/sceneGroupStorage';

interface SceneViewProps {
  onConfigureSlots?: () => void;
  onStartActivity: (activity: Activity, categoryId: string, autoEnterFocus?: boolean) => void;
  onStartTodoFocus?: (todo: TodoItem, autoEnterFocus?: boolean) => void;
  onAddLog?: (startTime?: number, endTime?: number, prefilledData?: { categoryId?: string; activityId?: string; linkedTodoId?: string }) => void;
  categories: Category[];
  todos?: TodoItem[];
}

export const SceneView: React.FC<SceneViewProps> = ({ 
  onConfigureSlots,
  onStartActivity,
  onStartTodoFocus,
  onAddLog,
  categories,
  todos = []
}) => {
  const { dailyReviews, checkTemplates, setDailyReviews, weeklyReviews, setWeeklyReviews, monthlyReviews, setMonthlyReviews } = useReview();
  const { logs, activeSessions } = useData();
  const { addToast } = useToast();
  const { sceneCardTimerMode } = useSettings();
  const { 
    setCurrentView, 
    setIsDailyReviewOpen, 
    setCurrentReviewDate, 
    setIsWeeklyReviewOpen, 
    setCurrentWeeklyReviewStart,
    setCurrentWeeklyReviewEnd,
    setIsMonthlyReviewOpen, 
    setCurrentMonthlyReviewStart,
    setCurrentMonthlyReviewEnd,
    setPreviousView,
    setStatsRange
  } = useNavigation();
  const [backgroundUrl, setBackgroundUrl] = useState<string>('');
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(0.1);
  
  // 场景组状态（从 localStorage 加载，兼容旧数据迁移）
  const [sceneGroupState, setSceneGroupState] = useState<SceneGroupState>(() => loadSceneGroupStateFromStorage());
  const activeGroup = getActiveSceneGroup(sceneGroupState);
  const matchedAutoGroup = sceneGroupState.switchMode === 'auto'
    ? findAutoSwitchTargetGroup(sceneGroupState, new Date())
    : null;
  const displayedGroup = matchedAutoGroup || activeGroup;
  const timeSlots: TimeSlot[] = displayedGroup?.timeSlots || DEFAULT_SCENE_PRESETS;
  
  // 当前选中的时间段索引
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  
  // 用于触发统计卡片的重新计算
  const [statsUpdateTrigger, setStatsUpdateTrigger] = useState(0);

  const loadSceneGroups = () => {
    const loaded = loadSceneGroupStateFromStorage();
    setSceneGroupState(loaded);
  };

  // 加载时间段数据
  useEffect(() => {
    // 初始加载
    loadSceneGroups();

    // 监听 storage 事件，当其他标签页或场景设置页面修改数据时重新加载
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sceneGroupState' || e.key === 'sceneTimeSlots') {
        loadSceneGroups();
      }
    };

    // 监听自定义事件，当同一页面内修改数据时重新加载
    const handleSceneUpdate = () => {
      loadSceneGroups();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sceneGroupsUpdated', handleSceneUpdate);
    window.addEventListener('sceneTimeSlotsUpdated', handleSceneUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sceneGroupsUpdated', handleSceneUpdate);
      window.removeEventListener('sceneTimeSlotsUpdated', handleSceneUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 页面重新可见时重新评估场景组自动切换
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadSceneGroups();
      }
    };
    const handleFocus = () => {
      loadSceneGroups();
    };
    const handleRecordViewActivated = () => {
      loadSceneGroups();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('recordViewActivated', handleRecordViewActivated);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('recordViewActivated', handleRecordViewActivated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 背景更新逻辑 - 仅在首次加载时执行
  useEffect(() => {
    const bg = backgroundService.getCurrentBackgroundOption();
    const opacity = backgroundService.getBackgroundOpacity();
    setBackgroundUrl(bg?.url || '');
    setBackgroundOpacity(opacity);
    
    // 监听 storage 事件以响应其他标签页的背景变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'backgroundOption' || e.key === 'backgroundOpacity') {
        const bg = backgroundService.getCurrentBackgroundOption();
        const opacity = backgroundService.getBackgroundOpacity();
        setBackgroundUrl(bg?.url || '');
        setBackgroundOpacity(opacity);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 获取当前时间对应的时间段索引
  const getCurrentTimeSlotIndex = (): number => {
    if (timeSlots.length === 0) return 0;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    for (let i = 0; i < timeSlots.length; i++) {
      const slot = timeSlots[i];
      
      // 跳过禁用自动跳转的时间段
      if (slot.disableAutoSwitch) {
        continue;
      }
      
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      
      let startMinutes = startHour * 60 + startMin;
      let endMinutes = endHour * 60 + endMin;
      
      // 处理跨天情况（如深夜 22:00 - 06:00）
      if (endMinutes < startMinutes) {
        if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
          return i;
        }
      } else {
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
          return i;
        }
      }
    }
    
    return 0; // 默认返回第一个
  };

  // 自动切换到当前时间段 - 在首次加载和页面可见性变化时执行
  useEffect(() => {
    if (timeSlots.length === 0) return;
    
    // 获取当前时间对应的时间段索引
    const autoSlotIndex = getCurrentTimeSlotIndex();
    
    // 尝试从 localStorage 获取用户上次选择的时间段
    const savedSlotKey = `lastSelectedSlotIndex_${displayedGroup.id}`;
    const savedSlotIndex = localStorage.getItem(savedSlotKey);
    
    // 判断是否应该使用保存的索引
    let targetIndex = autoSlotIndex;
    
    if (savedSlotIndex !== null) {
      const savedIndex = parseInt(savedSlotIndex, 10);
      
      // 检查保存的索引是否有效
      if (savedIndex >= 0 && savedIndex < timeSlots.length) {
        // 如果当前没有匹配的自动时间段（autoSlotIndex 指向的是被跳过的或默认的第一个）
        // 并且保存的时间段设置了 disableAutoSwitch，则使用保存的索引
        const currentSlot = timeSlots[autoSlotIndex];
        const savedSlot = timeSlots[savedIndex];
        
        // 如果自动匹配失败（返回了第一个作为默认值）或者匹配到的时间段禁用了自动跳转
        // 则使用用户上次选择的时间段
        if (savedSlot.disableAutoSwitch || currentSlot.disableAutoSwitch) {
          targetIndex = savedIndex;
        }
      }
    }
    
    setSelectedSlotIndex(targetIndex);
    
    // 监听页面可见性变化（切换标签页、最小化窗口等）
    const handleVisibilityChange = () => {
      if (!document.hidden && timeSlots.length > 0) {
        const autoIndex = getCurrentTimeSlotIndex();
        const currentSlot = timeSlots[selectedSlotIndex];
        
        // 只有当前时间段没有禁用自动跳转时，才自动切换
        if (!currentSlot?.disableAutoSwitch) {
          setSelectedSlotIndex(autoIndex);
        }
      }
    };
    
    // 监听窗口获得焦点（切回应用）
    const handleFocus = () => {
      if (timeSlots.length > 0) {
        const autoIndex = getCurrentTimeSlotIndex();
        const currentSlot = timeSlots[selectedSlotIndex];
        
        // 只有当前时间段没有禁用自动跳转时，才自动切换
        if (!currentSlot?.disableAutoSwitch) {
          setSelectedSlotIndex(autoIndex);
        }
      }
    };
    
    // 监听记录页面激活事件（从其他标签切回记录标签）
    const handleRecordViewActivated = () => {
      if (timeSlots.length > 0) {
        const autoIndex = getCurrentTimeSlotIndex();
        const currentSlot = timeSlots[selectedSlotIndex];
        
        // 只有当前时间段没有禁用自动跳转时，才自动切换
        if (!currentSlot?.disableAutoSwitch) {
          setSelectedSlotIndex(autoIndex);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('recordViewActivated', handleRecordViewActivated);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('recordViewActivated', handleRecordViewActivated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeSlots, displayedGroup.id]); // 依赖 timeSlots，当时间段配置变化时也重新检测

  // 保存用户选择的时间段索引
  useEffect(() => {
    if (timeSlots.length > 0 && selectedSlotIndex >= 0) {
      const savedSlotKey = `lastSelectedSlotIndex_${displayedGroup.id}`;
      localStorage.setItem(savedSlotKey, selectedSlotIndex.toString());
    }
  }, [selectedSlotIndex, timeSlots, displayedGroup.id]);

  const currentSlot = timeSlots[selectedSlotIndex];
  const currentCards = currentSlot?.cards || [];

  // 统计数据更新 - 仅在有统计卡片时每分钟更新一次
  useEffect(() => {
    // 检查当前时间段是否有统计卡片
    const hasStatsCard = currentCards.some(card => card.type === 'stats');
    
    if (!hasStatsCard) {
      return; // 如果没有统计卡片，不需要定时更新
    }
    
    const interval = setInterval(() => {
      setStatsUpdateTrigger(prev => prev + 1);
    }, 60000); // 60秒
    return () => clearInterval(interval);
  }, [currentCards]);

  // 计算统计卡片的时长数据
  const calculateStatsDuration = (filterActivityIds?: string[]): string => {
    const minutes = calculateStatsDurationMinutes(filterActivityIds);
    
    // 格式化时长显示
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  // 查询引用卡片的内容
  const getReferencedContent = (
    sourceType: 'dailyReview' | 'weeklyReview' | 'monthlyReview',
    dateOffset: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth',
    questionId: string
  ): { question: string; answer: string } | null => {
    // 计算目标日期
    const getTargetDate = (): string => {
      const today = new Date();
      
      if (sourceType === 'dailyReview') {
        if (dateOffset === 'today') {
          return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        } else if (dateOffset === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        }
      } else if (sourceType === 'weeklyReview') {
        // 获取本周或上周的第一天（周一）
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 周日特殊处理
        const monday = new Date(today);
        monday.setDate(today.getDate() + diff);
        
        if (dateOffset === 'lastWeek') {
          monday.setDate(monday.getDate() - 7);
        }
        
        return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      } else if (sourceType === 'monthlyReview') {
        // 获取本月或上月的第一天
        let year = today.getFullYear();
        let month = today.getMonth() + 1;
        
        if (dateOffset === 'lastMonth') {
          month -= 1;
          if (month === 0) {
            month = 12;
            year -= 1;
          }
        }
        
        return `${year}-${String(month).padStart(2, '0')}-01`;
      }
      
      return '';
    };
    
    const targetDate = getTargetDate();
    if (!targetDate) return null;
    
    // 查找对应的回顾
    let review: DailyReview | WeeklyReview | MonthlyReview | undefined;
    
    if (sourceType === 'dailyReview') {
      review = dailyReviews.find(r => r.date === targetDate);
    } else if (sourceType === 'weeklyReview') {
      review = weeklyReviews.find(r => r.weekStartDate === targetDate);
    } else if (sourceType === 'monthlyReview') {
      review = monthlyReviews.find(r => r.monthStartDate === targetDate);
    }
    
    if (!review) return null;
    
    // 查找对应的问题和答案
    const answer = review.answers.find(a => a.questionId === questionId);
    if (!answer) return null;
    
    return {
      question: answer.question,
      answer: answer.answer
    };
  };

  // 计算统计卡片的时长（返回分钟数）
  const calculateStatsDurationMinutes = (filterActivityIds?: string[]): number => {
    // 获取今天的开始和结束时间
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    const currentTime = Date.now();

    // 筛选今天的记录
    const dayLogs = logs.filter(log => {
      return log.startTime >= startOfDay.getTime() && log.startTime <= endOfDay.getTime();
    });

    // 计算总时长（秒）
    let totalSeconds = 0;

    // 统计已完成的记录
    dayLogs.forEach(log => {
      // 如果设置了筛选标签，只统计选中的标签
      if (filterActivityIds && filterActivityIds.length > 0) {
        if (filterActivityIds.includes(log.activityId)) {
          totalSeconds += log.duration;
        }
      } else {
        // 如果没有设置筛选，统计所有记录
        totalSeconds += log.duration;
      }
    });

    // 统计正在进行的会话
    if (activeSessions && activeSessions.length > 0) {
      activeSessions.forEach(session => {
        // 检查会话是否在当天
        if (session.startTime >= startOfDay.getTime() && session.startTime <= endOfDay.getTime()) {
          let shouldCount = false;
          
          if (filterActivityIds && filterActivityIds.length > 0) {
            shouldCount = filterActivityIds.includes(session.activityId);
          } else {
            shouldCount = true;
          }
          
          if (shouldCount) {
            // 计算从开始到现在的时长（秒）
            const sessionDuration = Math.floor((currentTime - session.startTime) / 1000);
            totalSeconds += sessionDuration;
          }
        }
      });
    }

    // 返回分钟数
    return Math.floor(totalSeconds / 60);
  };

  // 如果没有时间段数据，显示空状态
  if (timeSlots.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-[#faf9f6]">
        <div className="text-center">
          <p className="text-stone-400 mb-4">暂无场景配置</p>
          {onConfigureSlots && (
            <button
              onClick={onConfigureSlots}
              className="px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
            >
              前往配置
            </button>
          )}
        </div>
      </div>
    );
  }

  // 卡片动作处理
  const handleCardAction = (action: SceneCardData['action'], autoEnterFocus?: boolean) => {
    // 如果是补记模式，且动作类型是计时或待办，则调用补记功能
    if (sceneCardTimerMode === 'backfill' && (action.type === 'startTimer' || action.type === 'startTodo')) {
      if (!onAddLog) {
        addToast('error', '补记功能不可用');
        return;
      }

      // 计算补记的时间范围：从上一条记录结束到现在
      const now = Date.now();
      const sortedLogs = [...logs].sort((a, b) => b.endTime - a.endTime);
      const lastLog = sortedLogs[0];
      const startTime = lastLog ? lastLog.endTime : now - 3600000; // 默认1小时前
      
      // 准备预填充数据
      const prefilledData: { categoryId?: string; activityId?: string; linkedTodoId?: string } = {};
      
      if (action.type === 'startTimer' && action.activityId && action.categoryId) {
        const category = categories.find(c => c.id === action.categoryId);
        const activity = category?.activities.find(a => a.id === action.activityId);
        
        if (activity && category) {
          prefilledData.categoryId = category.id;
          prefilledData.activityId = activity.id;
        } else {
          addToast('error', '找不到对应的活动，可能已被删除');
          return;
        }
      } else if (action.type === 'startTodo' && action.todoId) {
        const todo = todos.find(t => t.id === action.todoId);
        
        if (todo) {
          prefilledData.linkedTodoId = todo.id;
        } else {
          addToast('error', '找不到对应的待办，可能已被删除');
          return;
        }
      }
      
      // 调用补记功能
      onAddLog(startTime, now, prefilledData);
      return;
    }

    // 正计时模式：原有逻辑
    switch (action.type) {
      case 'startTimer':
        if (action.activityId && action.categoryId) {
          const category = categories.find(c => c.id === action.categoryId);
          const activity = category?.activities.find(a => a.id === action.activityId);
          
          if (activity && category) {
            onStartActivity(activity, category.id, autoEnterFocus);
          } else {
            addToast('error', '找不到对应的活动，可能已被删除');
          }
        }
        break;
      case 'startTodo':
        if (action.todoId && onStartTodoFocus) {
          const todo = todos.find(t => t.id === action.todoId);
          
          if (todo) {
            onStartTodoFocus(todo, autoEnterFocus);
          } else {
            addToast('error', '找不到对应的待办，可能已被删除');
          }
        }
        break;
      case 'toggleCheck':
        if (action.checkItemId) {
          handleToggleCheckItem(action.checkItemId, action.checkActionMode);
        }
        break;
      case 'navigate':
        if (action.targetView) {
          handleNavigation(action.targetView);
        }
        break;
    }
  };

  // 根据模板日课 ID 获取模板信息（用于兼容旧 dailyReview 数据）
  const getCheckTemplateMeta = (
    checkItemId: string
  ): { content: string; category: string; manualMode: 'binary' | 'count'; targetCount: number } | null => {
    for (const template of checkTemplates) {
      const item = template.items.find(i => i.id === checkItemId);
      if (item) {
        const manualMode = item.type === 'auto'
          ? 'binary'
          : (item.manualMode === 'count' ? 'count' : 'binary');
        const targetCount = manualMode === 'count'
          ? Math.max(1, Math.floor(Number(item.targetCount) || 1))
          : 1;
        return {
          content: item.content,
          category: template.title,
          manualMode,
          targetCount
        };
      }
    }
    return null;
  };

  // 在指定日报中查找匹配的日课项索引（优先 id，兼容按内容回退）
  const findCheckItemIndexInReview = (review: DailyReview, checkItemId: string): number => {
    const checkItems = review.checkItems || [];
    const idMatchedIndex = checkItems.findIndex(item => item.id === checkItemId);
    if (idMatchedIndex >= 0) {
      return idMatchedIndex;
    }

    const templateMeta = getCheckTemplateMeta(checkItemId);
    if (!templateMeta) {
      return -1;
    }

    // 先按「分组 + 内容」严格匹配，避免不同分组同名日课误匹配
    const categoryAndContentMatchedIndex = checkItems.findIndex(item =>
      item.category === templateMeta.category && item.content === templateMeta.content
    );
    if (categoryAndContentMatchedIndex >= 0) {
      return categoryAndContentMatchedIndex;
    }

    // 再按内容兜底匹配，兼容历史数据缺少 category 的情况
    return checkItems.findIndex(item => item.content === templateMeta.content);
  };

  const getCountState = (item: CheckItem) => {
    const target = Math.max(1, Math.floor(item.targetCount || 1));
    const currentRaw = typeof item.currentCount === 'number'
      ? item.currentCount
      : (item.isCompleted ? target : 0);
    const current = Math.min(target, Math.max(0, Math.floor(currentRaw)));
    return {
      current,
      target,
      isCompleted: current >= target
    };
  };

  // 处理日课打卡
  const handleToggleCheckItem = (
    checkItemId: string,
    actionMode: SceneCardData['action']['checkActionMode'] = 'toggle'
  ) => {
    // 获取今天的日期（使用本地时间）
    const today = new Date();
    const dateStr = getLocalDateStr(today); // YYYY-MM-DD

    // 查找今天的 DailyReview
    let todayReview = dailyReviews.find(r => r.date === dateStr);

    // 如果不存在，创建一个新的 DailyReview
    if (!todayReview) {
      // 从模板生成日课列表
      const checkItems: CheckItem[] = [];
      
      checkTemplates
        .filter(template => template.enabled && template.isDaily)
        .sort((a, b) => a.order - b.order)
        .forEach(template => {
          template.items.forEach(item => {
            const type = item.type || 'manual';
            const manualMode = type === 'manual'
              ? (item.manualMode === 'count' ? 'count' : 'binary')
              : undefined;
            const targetCount = type === 'manual'
              ? (manualMode === 'count'
                ? Math.max(1, Math.floor(Number(item.targetCount) || 1))
                : 1)
              : undefined;
            checkItems.push({
              id: item.id || crypto.randomUUID(),
              category: template.title,
              content: item.content,
              icon: item.icon,
              uiIcon: item.uiIcon,
              isCompleted: false,
              type,
              manualMode,
              currentCount: type === 'manual' ? 0 : undefined,
              targetCount,
              autoConfig: item.autoConfig
            });
          });
        });

      todayReview = {
        id: `daily-${Date.now()}`,
        date: dateStr,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        answers: [],
        checkItems: checkItems
      };
    }

    // 查找对应的日课项
    const checkItems = todayReview.checkItems || [];
    const checkItemIndex = findCheckItemIndexInReview(todayReview, checkItemId);

    if (checkItemIndex === -1) {
      console.warn('未找到对应的日课项:', checkItemId);
      addToast('error', '找不到对应的日课，可能已被删除或未启用');
      return;
    }

    // 切换完成状态
    const updatedCheckItems = [...checkItems];
    const matchedItem = updatedCheckItems[checkItemIndex];
    if (matchedItem.type === 'auto') {
      addToast('error', '自动日课不能手动打卡');
      return;
    }

    const effectiveActionMode = actionMode || 'toggle';
    let nextItem: CheckItem;
    if (matchedItem.manualMode === 'count') {
      const { current, target, isCompleted } = getCountState(matchedItem);
      const nextCurrent = effectiveActionMode === 'reset'
        ? 0
        : (effectiveActionMode === 'increment'
          ? Math.min(target, current + 1)
          : (isCompleted ? Math.max(0, current - 1) : Math.min(target, current + 1)));
      nextItem = {
        ...matchedItem,
        id: checkItemId,
        manualMode: 'count',
        targetCount: target,
        currentCount: nextCurrent,
        isCompleted: nextCurrent >= target
      };
    } else {
      const isCompleted = effectiveActionMode === 'reset'
        ? false
        : (effectiveActionMode === 'increment' ? true : !matchedItem.isCompleted);
      nextItem = {
        ...matchedItem,
        id: checkItemId,
        manualMode: 'binary',
        targetCount: 1,
        currentCount: isCompleted ? 1 : 0,
        isCompleted
      };
    }

    updatedCheckItems[checkItemIndex] = {
      ...nextItem
    };

    // 更新 DailyReview
    const updatedReview: DailyReview = {
      ...todayReview,
      checkItems: updatedCheckItems,
      updatedAt: Date.now()
    };

    // 更新 dailyReviews 数组
    const existingReviewIndex = dailyReviews.findIndex(r => r.date === dateStr);
    if (existingReviewIndex >= 0) {
      // 更新现有的 review
      setDailyReviews(dailyReviews.map(r => r.date === dateStr ? updatedReview : r));
    } else {
      // 添加新的 review
      setDailyReviews([...dailyReviews, updatedReview]);
    }
  };

  // 获取日课的完成状态
  const getCheckItemProgress = (checkItemId: string): {
    isCompleted: boolean;
    manualMode: 'binary' | 'count';
    currentCount: number;
    targetCount: number;
  } => {
    const today = new Date();
    const dateStr = getLocalDateStr(today);
    const todayReview = dailyReviews.find(r => r.date === dateStr);
    const templateMeta = getCheckTemplateMeta(checkItemId);
    const defaultManualMode = templateMeta?.manualMode || 'binary';
    const defaultTarget = templateMeta?.targetCount || 1;
    
    if (!todayReview || !todayReview.checkItems) {
      return {
        isCompleted: false,
        manualMode: defaultManualMode,
        currentCount: 0,
        targetCount: defaultTarget
      };
    }

    const checkItemIndex = findCheckItemIndexInReview(todayReview, checkItemId);
    if (checkItemIndex === -1) {
      return {
        isCompleted: false,
        manualMode: defaultManualMode,
        currentCount: 0,
        targetCount: defaultTarget
      };
    }

    const item = todayReview.checkItems[checkItemIndex];
    if (!item) {
      return {
        isCompleted: false,
        manualMode: defaultManualMode,
        currentCount: 0,
        targetCount: defaultTarget
      };
    }
    if (item.type !== 'auto' && item.manualMode === 'count') {
      const { current, target, isCompleted } = getCountState(item);
      return {
        isCompleted,
        manualMode: 'count',
        currentCount: current,
        targetCount: target
      };
    }
    return {
      isCompleted: item.isCompleted || false,
      manualMode: 'binary',
      currentCount: item.isCompleted ? 1 : 0,
      targetCount: 1
    };
  };

  // 获取日课的内容（用于计算坚持天数）
  const getCheckItemContent = (checkItemId: string): string | undefined => {
    // 安全检查：确保 checkTemplates 存在
    if (!checkTemplates || checkTemplates.length === 0) {
      return undefined;
    }
    
    // 从模板中查找日课项
    for (const template of checkTemplates) {
      const item = template.items.find(i => i.id === checkItemId);
      if (item) {
        return item.content;
      }
    }
    return undefined;
  };

  // 处理导航
  const handleNavigation = (targetView: string) => {
    // Set Scene as the previous view before navigating away
    setPreviousView(AppView.SCENE);
    
    switch (targetView) {
      case 'daily-review-today':
        handleNavigateToDailyReview(0); // 今天
        break;
      case 'daily-review-yesterday':
        handleNavigateToDailyReview(-1); // 昨天
        break;
      case 'weekly-review':
        handleNavigateToWeeklyReview();
        break;
      case 'monthly-review':
        handleNavigateToMonthlyReview();
        break;
      case 'stats-today':
        setStatsRange('day');
        setCurrentView(AppView.STATS);
        break;
      case 'stats-week':
        setStatsRange('week');
        setCurrentView(AppView.STATS);
        break;
      default:
        console.warn('未知的导航目标:', targetView);
    }
  };

  // 导航到每日回顾
  const handleNavigateToDailyReview = (dayOffset: number) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const dateStr = targetDate.toISOString().split('T')[0];

    // 查找是否已存在该日期的回顾
    let review = dailyReviews.find(r => r.date === dateStr);

    // 如果不存在，创建新的回顾
    if (!review) {
      const checkItems: CheckItem[] = [];
      
      checkTemplates
        .filter(template => template.enabled && template.isDaily)
        .sort((a, b) => a.order - b.order)
        .forEach(template => {
          template.items.forEach(item => {
            const type = item.type || 'manual';
            const manualMode = type === 'manual'
              ? (item.manualMode === 'count' ? 'count' : 'binary')
              : undefined;
            const targetCount = type === 'manual'
              ? (manualMode === 'count'
                ? Math.max(1, Math.floor(Number(item.targetCount) || 1))
                : 1)
              : undefined;
            checkItems.push({
              id: item.id || crypto.randomUUID(),
              category: template.title,
              content: item.content,
              icon: item.icon,
              uiIcon: item.uiIcon,
              isCompleted: false,
              type,
              manualMode,
              currentCount: type === 'manual' ? 0 : undefined,
              targetCount,
              autoConfig: item.autoConfig
            });
          });
        });

      review = {
        id: `daily-${Date.now()}`,
        date: dateStr,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        answers: [],
        checkItems: checkItems
      };

      setDailyReviews([...dailyReviews, review]);
    }

    // 打开每日回顾 - 传递 Date 对象而不是字符串
    setCurrentReviewDate(targetDate);
    setIsDailyReviewOpen(true);
  };

  // 导航到每周回顾
  const handleNavigateToWeeklyReview = () => {
    // 获取本周的开始和结束日期
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 周一为一周的开始
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // 查找是否已存在本周的回顾
    let review = weeklyReviews.find(r => r.weekStartDate === weekStartStr);

    // 如果不存在，创建新的回顾
    if (!review) {
      review = {
        id: `weekly-${Date.now()}`,
        weekStartDate: weekStartStr,
        weekEndDate: weekEndStr,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        answers: []
      };

      setWeeklyReviews([...weeklyReviews, review]);
    }

    // 打开每周回顾 - 传递 Date 对象
    setCurrentWeeklyReviewStart(weekStart);
    setCurrentWeeklyReviewEnd(weekEnd);
    setIsWeeklyReviewOpen(true);
  };

  // 导航到每月回顾
  const handleNavigateToMonthlyReview = () => {
    // 获取本月的开始和结束日期
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthEndStr = monthEnd.toISOString().split('T')[0];

    // 查找是否已存在本月的回顾
    let review = monthlyReviews.find(r => r.monthStartDate === monthStartStr);

    // 如果不存在，创建新的回顾
    if (!review) {
      review = {
        id: `monthly-${Date.now()}`,
        monthStartDate: monthStartStr,
        monthEndDate: monthEndStr,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        answers: []
      };

      setMonthlyReviews([...monthlyReviews, review]);
    }

    // 打开每月回顾 - 传递 Date 对象
    setCurrentMonthlyReviewStart(monthStart);
    setCurrentMonthlyReviewEnd(monthEnd);
    setIsMonthlyReviewOpen(true);
  };

  return (
    <div 
      className="flex h-full relative"
      style={{
        backgroundColor: backgroundUrl && backgroundUrl !== '' ? 'transparent' : '#faf9f6'
      }}
    >
      {/* 背景图片层 */}
      {backgroundUrl && backgroundUrl !== '' && (
        <div 
          className="absolute inset-0 -z-20"
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      )}
      
      {/* 全局半透明遮罩层 */}
      <div className="absolute inset-0 bg-[#faf9f6]/50 backdrop-blur-md -z-10"></div>

      {/* 左侧边栏 - 时间段列表 */}
      <div className="flex-shrink-0 flex flex-col overflow-y-auto pt-6 pb-20 pl-0 pr-2 no-scrollbar z-0 transition-all duration-300 relative w-16 items-center">
        <div className="flex-1 w-full">
          {timeSlots.map((slot, index) => {
            const isSelected = selectedSlotIndex === index;
            return (
              <button
                key={slot.id}
                onClick={() => {
                  setSelectedSlotIndex(index);
                }}
                className={`
                  flex items-center justify-center gap-2 mb-1 transition-all duration-200 text-left relative rounded-r-2xl group
                  w-12 h-12 md:w-14 md:h-14
                  ${isSelected
                    ? 'text-stone-900 font-bold bg-white shadow-[2px_2px_10px_rgba(0,0,0,0.02)] z-10'
                    : 'text-stone-600 hover:text-stone-800'
                  }
                `}
                title={slot.name}
              >
                {isSelected && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full" style={{ backgroundColor: 'var(--accent-color)' }}></div>
                )}
                {/* 使用 IconRenderer 统一处理图标渲染 */}
                <div className="flex-shrink-0">
                  <IconRenderer 
                    icon={slot.icon || '⏰'}
                    uiIcon={slot.uiIcon}
                    size={24}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 右侧主体内容 */}
      <div 
        className="flex-1 overflow-hidden flex flex-col p-5 md:p-10 rounded-tl-[2rem] shadow-[-5px_0_20px_rgba(0,0,0,0.08)] z-10 ml-[-10px] relative"
        id="scene-content"
      >
        {/* 主体部分的背景图片层 */}
        {backgroundUrl && backgroundUrl !== '' && (
          <div 
            className="absolute inset-0 -z-20 rounded-tl-[2rem]"
            style={{
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
        )}
        {/* 半透明白色遮罩层 */}
        <div 
          className="absolute inset-0 -z-10 backdrop-blur-sm rounded-tl-[2rem]"
          style={{
            backgroundColor: `rgba(255, 255, 255, ${1 - backgroundOpacity})`
          }}
        />

        {/* 头部：当前时间段标题或时间 */}
        <div className="mb-8 md:mb-10 flex items-center mt-2 md:mt-0">
          <h1 className="text-xl md:text-2xl font-mono font-light text-stone-600 tracking-tight">
            {currentSlot.displayTitle || `${currentSlot.startTime} - ${currentSlot.endTime}`}
          </h1>
          <div className="h-px flex-1 bg-stone-100 mx-4"></div>
          <span className="px-2 py-0.5 text-[11px] md:text-xs text-stone-500 border border-stone-200 rounded-full bg-white/70">
            {displayedGroup.name}
          </span>
        </div>

        {/* 活动卡片列表 - 单列布局 */}
        <div className="flex flex-col gap-3 overflow-y-auto pb-24 no-scrollbar">
          {currentCards.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-stone-400">
                <p className="text-sm leading-relaxed">该时间段暂无卡片，请前往场景设置，配置时间段和快捷方式。</p>
              </div>
            </div>
          ) : (
            currentCards.map((card) => {
              // 如果是日课卡片，获取其完成状态和内容
              let cardWithStatus = card;
              
              if (card.type === 'checklist' && card.action.checkItemId) {
                const progress = getCheckItemProgress(card.action.checkItemId);
                const checkItemContent = getCheckItemContent(card.action.checkItemId);
                cardWithStatus = { 
                  ...card, 
                  isCompleted: progress.isCompleted,
                  checkItemContent,
                  checkManualMode: progress.manualMode,
                  checkCurrentCount: progress.currentCount,
                  checkTargetCount: progress.targetCount
                };
              }
              
              // 如果是统计卡片，计算时长数据
              if (card.type === 'stats') {
                const statValue = calculateStatsDuration(card.filterActivityIds);
                const statMinutes = calculateStatsDurationMinutes(card.filterActivityIds);
                cardWithStatus = { 
                  ...cardWithStatus, 
                  statValue,
                  statMinutes // 添加分钟数用于进度条计算
                };
              }
              
              // 如果是引用卡片，查询引用内容
              if (card.type === 'reference' && card.action.type === 'reference') {
                const { sourceType, dateOffset, questionId, fallbackText } = card.action;
                
                if (sourceType && dateOffset && questionId) {
                  const referenced = getReferencedContent(sourceType, dateOffset, questionId);
                  
                  if (referenced) {
                    cardWithStatus = {
                      ...cardWithStatus,
                      referencedQuestion: referenced.question,
                      referencedAnswer: referenced.answer
                    };
                  } else {
                    // 找不到内容时使用 fallback
                    cardWithStatus = {
                      ...cardWithStatus,
                      referencedQuestion: fallbackText || '这里空空如也',
                      referencedAnswer: fallbackText || '这里空空如也'
                    };
                  }
                }
              }
              
              return (
                <SceneCard
                  key={card.id}
                  data={cardWithStatus}
                  dailyReviews={dailyReviews}
                  logs={logs}
                  onAction={handleCardAction}
                  sceneCardTimerMode={sceneCardTimerMode}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
