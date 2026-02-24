/**
 * @file SceneView.tsx
 * @description 场景化时间段视图 - 卡片式布局，支持正反面翻转
 */
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { backgroundService } from '../services/backgroundService';
import { IconRenderer } from '../components/IconRenderer';
import { UIIcon } from '../components/UIIcon';
import { SceneCard } from '../components/SceneCard';
import { TimeSlot, SceneCardData, Activity, Category, TodoItem, DailyReview, CheckItem, WeeklyReview, MonthlyReview, AppView, Log, ActiveSession } from '../types';
import { DEFAULT_SCENE_PRESETS } from '../constants/scenePresets';
import { useReview } from '../contexts/ReviewContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useData } from '../contexts/DataContext';

interface SceneViewProps {
  onConfigureSlots?: () => void;
  onStartActivity: (activity: Activity, categoryId: string) => void;
  onStartTodoFocus?: (todo: TodoItem) => void;
  categories: Category[];
  todos?: TodoItem[];
}

export const SceneView: React.FC<SceneViewProps> = ({ 
  onConfigureSlots,
  onStartActivity,
  onStartTodoFocus,
  categories,
  todos = []
}) => {
  const { dailyReviews, checkTemplates, setDailyReviews, weeklyReviews, setWeeklyReviews, monthlyReviews, setMonthlyReviews } = useReview();
  const { logs, activeSessions } = useData();
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
  
  // 时间段数据（从 localStorage 加载，如果没有则使用 mock 数据）
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  // 当前选中的时间段索引
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [isManualSelection, setIsManualSelection] = useState(false);
  
  // 用于触发统计卡片的重新计算
  const [statsUpdateTrigger, setStatsUpdateTrigger] = useState(0);

  // 加载时间段数据
  useEffect(() => {
    const saved = localStorage.getItem('sceneTimeSlots');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTimeSlots(parsed);
      } catch (e) {
        console.error('Failed to parse scene time slots:', e);
        setTimeSlots(DEFAULT_SCENE_PRESETS);
      }
    } else {
      setTimeSlots(DEFAULT_SCENE_PRESETS);
    }
  }, []);

  // 背景更新逻辑
  useEffect(() => {
    const updateBackground = () => {
      const bg = backgroundService.getCurrentBackgroundOption();
      const opacity = backgroundService.getBackgroundOpacity();
      setBackgroundUrl(bg?.url || '');
      setBackgroundOpacity(opacity);
    };
    updateBackground();
    const interval = setInterval(updateBackground, 500);
    return () => clearInterval(interval);
  }, []);

  // 定时更新统计数据（每分钟更新一次）
  useEffect(() => {
    const interval = setInterval(() => {
      setStatsUpdateTrigger(prev => prev + 1);
    }, 60000); // 60秒
    return () => clearInterval(interval);
  }, []);

  // 获取当前时间对应的时间段索引
  const getCurrentTimeSlotIndex = (): number => {
    if (timeSlots.length === 0) return 0;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    for (let i = 0; i < timeSlots.length; i++) {
      const slot = timeSlots[i];
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

  // 自动切换到当前时间段（仅在非手动选择时）
  useEffect(() => {
    if (!isManualSelection && timeSlots.length > 0) {
      setSelectedSlotIndex(getCurrentTimeSlotIndex());
    }
  }, [isManualSelection, timeSlots]);

  // 重置手动选择状态（5分钟后）
  useEffect(() => {
    if (isManualSelection) {
      const timer = setTimeout(() => {
        setIsManualSelection(false);
      }, 5 * 60 * 1000); // 5分钟
      return () => clearTimeout(timer);
    }
  }, [isManualSelection]);

  const currentSlot = timeSlots[selectedSlotIndex];
  const currentCards = currentSlot?.cards || [];

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
  const handleCardAction = (action: SceneCardData['action']) => {
    switch (action.type) {
      case 'startTimer':
        if (action.activityId && action.categoryId) {
          // 查找对应的活动
          const category = categories.find(c => c.id === action.categoryId);
          const activity = category?.activities.find(a => a.id === action.activityId);
          
          if (activity && category) {
            // 调用开始计时回调
            onStartActivity(activity, category.id);
          } else {
            console.warn('未找到对应的活动:', action.activityId, action.categoryId);
          }
        }
        break;
      case 'startTodo':
        if (action.todoId && onStartTodoFocus) {
          // 查找对应的待办任务
          const todo = todos.find(t => t.id === action.todoId);
          
          if (todo) {
            // 调用开始待办计时回调
            onStartTodoFocus(todo);
          } else {
            console.warn('未找到对应的待办任务:', action.todoId);
          }
        }
        break;
      case 'toggleCheck':
        if (action.checkItemId) {
          handleToggleCheckItem(action.checkItemId);
        }
        break;
      case 'navigate':
        if (action.targetView) {
          handleNavigation(action.targetView);
        }
        break;
    }
  };

  // 处理日课打卡
  const handleToggleCheckItem = (checkItemId: string) => {
    // 获取今天的日期
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

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
            checkItems.push({
              id: item.id,
              category: template.title,
              content: item.content,
              icon: item.icon,
              uiIcon: item.uiIcon,
              isCompleted: false,
              type: item.type,
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
    const checkItemIndex = checkItems.findIndex(item => item.id === checkItemId);

    if (checkItemIndex === -1) {
      console.warn('未找到对应的日课项:', checkItemId);
      return;
    }

    // 切换完成状态
    const updatedCheckItems = [...checkItems];
    updatedCheckItems[checkItemIndex] = {
      ...updatedCheckItems[checkItemIndex],
      isCompleted: !updatedCheckItems[checkItemIndex].isCompleted
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
  const getCheckItemStatus = (checkItemId: string): boolean => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const todayReview = dailyReviews.find(r => r.date === dateStr);
    
    if (!todayReview || !todayReview.checkItems) {
      return false;
    }

    const checkItem = todayReview.checkItems.find(item => item.id === checkItemId);
    return checkItem?.isCompleted || false;
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
            checkItems.push({
              id: item.id,
              category: template.title,
              content: item.content,
              icon: item.icon,
              uiIcon: item.uiIcon,
              isCompleted: false,
              type: item.type,
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
                  setIsManualSelection(true);
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
          <div className="h-px flex-1 bg-stone-100 ml-4"></div>
        </div>

        {/* 活动卡片列表 - 单列布局 */}
        <div className="flex flex-col gap-3 overflow-y-auto pb-24 no-scrollbar">
          {currentCards.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-stone-400">
                <p className="mb-4">该时间段暂无卡片</p>
                {onConfigureSlots && (
                  <button
                    onClick={onConfigureSlots}
                    className="px-4 py-2 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors text-sm"
                  >
                    添加卡片
                  </button>
                )}
              </div>
            </div>
          ) : (
            currentCards.map((card) => {
              // 如果是日课卡片，获取其完成状态
              let cardWithStatus = card.type === 'checklist' && card.action.checkItemId
                ? { ...card, isCompleted: getCheckItemStatus(card.action.checkItemId) }
                : card;
              
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
              
              return (
                <SceneCard
                  key={card.id}
                  data={cardWithStatus}
                  onAction={handleCardAction}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
