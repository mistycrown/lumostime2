/**
 * @file StatsView.tsx
 * @input Logs, Categories, Todos, Scopes, Current Date
 * @output Navigation Events (Date Change, Back)
 * @pos View (Statistics Dashboard)
 * @description A comprehensive analytics dashboard supporting multiple visualization modes: Pie (Distribution), Matrix (Consistency), Schedule (Timeline), Line (Trend), and Check (Habit tracking). Analyzes time usage across Activities, Todos, and Scopes.
 * 
 * 修改历史:
 * - 2026-01-10: 修复日课统计(check)视图的日期导航功能，添加handleNavigateDate和previousRange中对check视图类型的处理
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Log, Category, Activity, Scope, TodoItem, TodoCategory, DailyReview } from '../types';
import { COLOR_OPTIONS } from '../constants';
import { Minimize2, Share, PieChart, Grid, Calendar, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import { ToastType } from '../components/Toast';
import { MonthHeatmap } from '../components/MonthHeatmap';
import { usePrivacy } from '../contexts/PrivacyContext';
import { IconRenderer } from '../components/IconRenderer';
import { ConfirmModal } from '../components/ConfirmModal';

// 新的 Hooks 和组件
import { useStatsCalculation } from '../hooks/useStatsCalculation';
import { useTodoStats } from '../hooks/useTodoStats';
import { useScopeStats } from '../hooks/useScopeStats';
import { PieChartView } from '../components/stats/PieChartView';
import { formatDuration, getHexColor, getScheduleStyle } from '../utils/chartUtils';

interface StatsViewProps {
  logs: Log[];
  categories: Category[];
  currentDate: Date;
  onBack: () => void;
  onDateChange?: (date: Date) => void;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  onToast?: (type: ToastType, message: string) => void;
  onTitleChange?: (title: string) => void;
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  scopes: Scope[];
  dailyReviews?: DailyReview[]; // Add dailyReviews prop
  // Daily Review 支持
  hideControls?: boolean;  // 隐藏所有控制条
  hideRangeControls?: boolean; // 隐藏左侧时间范围选择 (日/周/月/年)
  hideDateNavigation?: boolean; // 隐藏中间日期导航 (< >)
  forcedView?: ViewType;   // 强制视图类型
  forcedRange?: PieRange;  // 强制时间范围
  allowedViews?: ViewType[]; // 允许切换的视图类型，默认全部
}

type ViewType = 'pie' | 'matrix' | 'schedule' | 'line' | 'check';
type PieRange = 'day' | 'week' | 'month' | 'year';
type ScheduleRange = 'day' | 'week' | 'month';

interface ActivityStat extends Activity {
  duration: number;
}

interface CategoryStat extends Category {
  duration: number;
  percentage: number;
  items: ActivityStat[];
}

export const StatsView: React.FC<StatsViewProps> = ({ logs, categories, currentDate, onBack, onDateChange, isFullScreen, onToggleFullScreen, onToast, onTitleChange, todos, todoCategories, scopes, dailyReviews = [], hideControls = false, hideRangeControls = false, hideDateNavigation = false, forcedView, forcedRange, allowedViews = ['pie', 'matrix', 'line', 'schedule', 'check'] }) => {
  const { isPrivacyMode } = usePrivacy();
  const [viewType, setViewType] = useState<ViewType>(forcedView || 'pie');
  const [pieRange, setPieRange] = useState<PieRange>(forcedRange || 'day');
  const [scheduleRange, setScheduleRange] = useState<ScheduleRange>(
    forcedRange === 'month' ? 'month' : (forcedRange === 'week' ? 'week' : 'day')
  );
  const [lineRange, setLineRange] = useState<'week' | 'month'>((forcedRange === 'month' || forcedRange === 'year') ? 'month' : 'week');
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<string[]>([]);

  const toggleExclusion = (id: string) => {
    setExcludedCategoryIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  // 复制失败/手动复制确认模态框状态
  const [copyFailureModal, setCopyFailureModal] = useState<{ isOpen: boolean, text: string }>({ isOpen: false, text: '' });


  // 日期导航函数
  const handleNavigateDate = (direction: 'prev' | 'next') => {
    if (!onDateChange) return;

    const newDate = new Date(currentDate);
    let rangeType: PieRange | 'week_fixed' | 'day_fixed';

    // 确定当前时间范围类型
    if (viewType === 'pie') {
      rangeType = pieRange;
    } else if (viewType === 'matrix') {
      rangeType = 'week_fixed';
    } else if (viewType === 'line') {
      rangeType = lineRange === 'week' ? 'week_fixed' : 'month';
    } else if (viewType === 'schedule') {
      if (scheduleRange === 'day') rangeType = 'day_fixed';
      else if (scheduleRange === 'month') rangeType = 'month';
      else rangeType = 'week_fixed';
    } else if (viewType === 'check') {
      // Check view使用pieRange，但不支持day，默认为week
      rangeType = pieRange === 'day' ? 'week' : pieRange;
    } else {
      rangeType = 'day';
    }

    const multiplier = direction === 'prev' ? -1 : 1;

    // 根据范围类型调整日期
    if (rangeType === 'day' || rangeType === 'day_fixed') {
      newDate.setDate(newDate.getDate() + multiplier);
    } else if (rangeType === 'week' || rangeType === 'week_fixed') {
      newDate.setDate(newDate.getDate() + (7 * multiplier));
    } else if (rangeType === 'month') {
      newDate.setMonth(newDate.getMonth() + multiplier);
    } else if (rangeType === 'year') {
      newDate.setFullYear(newDate.getFullYear() + multiplier);
    }

    onDateChange(newDate);
  };

  // 触摸滑动手势处理
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // 最小滑动距离（像素）- 增加阈值以降低灵敏度，减少误触
  const minSwipeDistance = 100;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // 向左滑动 = 下一个时间段
      handleNavigateDate('next');
    } else if (isRightSwipe) {
      // 向右滑动 = 上一个时间段
      handleNavigateDate('prev');
    }
  };

  // 生成动态标题
  const getDynamicTitle = (date: Date, rangeType: PieRange | 'week_fixed' | 'day_fixed' | 'month'): string => {
    const formatDateShort = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

    if (rangeType === 'day' || rangeType === 'day_fixed') {
      // 日视图：显示完整日期，如「12月14日」
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    } else if (rangeType === 'week' || rangeType === 'week_fixed') {
      // 周视图：显示日期范围，如「12/8 - 12/14」
      const startDate = new Date(date);
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate.setDate(diff);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const startMonth = startDate.getMonth() + 1;
      const startDay = startDate.getDate();
      const endMonth = endDate.getMonth() + 1;
      const endDay = endDate.getDate();

      if (startMonth === endMonth) {
        return `${startMonth}月${startDay}日 - ${endDay}日`;
      } else {
        return `${startMonth}月${startDay}日 - ${endMonth}月${endDay}日`;
      }
    } else if (rangeType === 'month') {
      // 月视图：显示年月，如「2025年12月」
      return `${date.getFullYear()}年${date.getMonth() + 1}月`;
    } else if (rangeType === 'year') {
      // 年视图：只显示年份，如「2025年」
      return `${date.getFullYear()}年`;
    }

    return '';
  };

  // --- Date Helpers ---
  const getDateRange = (date: Date, rangeType: PieRange | 'week_fixed' | 'day_fixed' | 'month') => {
    const start = new Date(date);
    const end = new Date(date);

    if (rangeType === 'day' || rangeType === 'day_fixed') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (rangeType === 'week' || rangeType === 'week_fixed') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (rangeType === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    } else if (rangeType === 'year') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  };

  const effectiveRange = useMemo(() => {
    if (viewType === 'pie') return getDateRange(currentDate, pieRange);
    if (viewType === 'matrix') return getDateRange(currentDate, 'week_fixed');
    if (viewType === 'line') return getDateRange(currentDate, lineRange === 'week' ? 'week_fixed' : 'month');
    if (viewType === 'schedule') {
      if (scheduleRange === 'day') return getDateRange(currentDate, 'day_fixed');
      if (scheduleRange === 'month') return getDateRange(currentDate, 'month');
      return getDateRange(currentDate, 'week_fixed');
    }
    if (viewType === 'check') {
      // Check view uses pieRange but doesn't support 'day'
      // If pieRange is day, we default to week
      const actualRange = pieRange === 'day' ? 'week' : pieRange;
      return getDateRange(currentDate, actualRange);
    }
    return getDateRange(currentDate, 'day');
  }, [currentDate, viewType, pieRange, scheduleRange, lineRange]);

  // 当视图类型、时间范围或日期变化时，自动更新标题
  useEffect(() => {
    if (onTitleChange) {
      let rangeType: PieRange | 'week_fixed' | 'day_fixed' | 'month';
      if (viewType === 'pie') {
        rangeType = pieRange;
      } else if (viewType === 'matrix') {
        rangeType = 'week_fixed';
      } else if (viewType === 'schedule') {
        if (scheduleRange === 'day') rangeType = 'day_fixed';
        else if (scheduleRange === 'month') rangeType = 'month';
        else rangeType = 'week_fixed';
      } else if (viewType === 'line') {
        rangeType = lineRange === 'week' ? 'week_fixed' : 'month';
      } else if (viewType === 'check') {
        rangeType = pieRange === 'day' ? 'week' : pieRange;
      } else {
        rangeType = 'day';
      }

      const title = getDynamicTitle(currentDate, rangeType);
      onTitleChange(title);
    }
  }, [currentDate, viewType, pieRange, scheduleRange, lineRange, onTitleChange]);

  const { start: rangeStart, end: rangeEnd } = effectiveRange;

  // 使用新的统计计算 Hooks
  const { stats, previousStats, filteredLogs } = useStatsCalculation({
    logs,
    categories,
    dateRange: effectiveRange,
    excludedCategoryIds,
    includePrevious: true
  });

  const { todoStats, previousTodoStats } = useTodoStats({
    logs,
    todos,
    todoCategories,
    dateRange: effectiveRange,
    includePrevious: true
  });

  const { scopeStats, previousScopeStats } = useScopeStats({
    logs,
    scopes,
    categories,
    dateRange: effectiveRange,
    includePrevious: true
  });

  const handleExportStats = () => {
    const { start } = effectiveRange;
    const dateStr = `${start.getFullYear()}/${start.getMonth() + 1}/${start.getDate()}`;
    let rangeLabel = '';
    if (viewType === 'pie') rangeLabel = pieRange.charAt(0).toUpperCase() + pieRange.slice(1);
    if (viewType === 'matrix') rangeLabel = 'Week Matrix';
    if (viewType === 'schedule') rangeLabel = scheduleRange === 'day' ? 'Day Schedule' : 'Week Schedule';

    let text = `## 📊 ${dateStr} - ${rangeLabel} 统计\n**总时长**: ${formatDuration(stats.totalDuration)}\n\n`;
    stats.categoryStats.forEach(cat => {
      text += `- **[${cat.name}]** ${formatDuration(cat.duration)} (${cat.percentage.toFixed(1)}%)\n`;
      cat.items.forEach(act => {
        text += `    * ${act.name}: ${formatDuration(act.duration)}\n`;
      });
      text += '\n';
    });
    text += '\n';


    if (todoStats.totalDuration > 0) {
      text += `\n## 📋 待办专注分布\n**待办总时长**: ${formatDuration(todoStats.totalDuration)}\n\n`;
      todoStats.categoryStats.forEach(cat => {
        text += `- **[${cat.name}]** ${formatDuration(cat.duration)} (${cat.percentage.toFixed(1)}%)\n`;
        cat.items.forEach(item => {
          text += `    * ${item.name}: ${formatDuration(item.duration)}\n`;
        });
        text += '\n';
      });
    }

    if (scopeStats.totalDuration > 0) {
      text += `\n## 🎯 领域专注分布\n**领域总时长**: ${formatDuration(scopeStats.totalDuration)}\n\n`;
      scopeStats.categoryStats.forEach(scope => {
        text += `- **[${scope.name}]** ${formatDuration(scope.duration)} (${scope.percentage.toFixed(1)}%)\n`;
        // Removed scope.items.forEach
        text += '\n';
      });
    }

    // Instead of direct copy, open modal
    setCopyFailureModal({ isOpen: true, text: text });
  };

  const executeCopy = (text: string) => {
    // Try standard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        onToast?.('success', '已复制到剪贴板');
      }).catch((err) => {
        console.warn('Clipboard API failed, trying fallback...', err);
        fallbackCopyText(text);
      });
    } else {
      // Fallback for older browsers/WebViews
      fallbackCopyText(text);
    }
  };

  const fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;

      // Avoid scrolling to bottom
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        onToast?.('success', '已复制到剪贴板');
      } else {
        // onToast?.('error', '复制失败，请手动复制');
        setCopyFailureModal({ isOpen: true, text: text });
      }
    } catch (err) {
      console.error('Fallback copy failed', err);
      // onToast?.('error', '复制失败，请检查权限');
      setCopyFailureModal({ isOpen: true, text: text });
    }
  };

  const matrixData = useMemo(() => {
    const days: Date[] = [];
    let curr = new Date(rangeStart);
    while (curr <= rangeEnd) {
      days.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    const relevantActivities: { activity: Activity, category: Category, logCount: number }[] = [];
    categories.forEach(cat => {
      cat.activities.forEach(act => {
        const logsForAct = filteredLogs.filter(l => l.activityId === act.id);
        if (logsForAct.length > 0) {
          relevantActivities.push({ activity: act, category: cat, logCount: logsForAct.length });
        }
      });
    });
    const rows = relevantActivities.map(item => {
      const cells = days.map(day => {
        const dStart = new Date(day); dStart.setHours(0, 0, 0, 0);
        const dEnd = new Date(day); dEnd.setHours(23, 59, 59, 999);
        return filteredLogs.some(l => l.activityId === item.activity.id && l.startTime >= dStart.getTime() && l.startTime <= dEnd.getTime());
      });
      return { ...item, cells };
    });
    return { days, rows };
  }, [rangeStart, rangeEnd, filteredLogs, categories]);

  // --- Check Stats Logic ---
  const checkStats = useMemo(() => {
    if (viewType !== 'check') return { categories: [] };

    // 1. Collect all dates in range
    const days: string[] = [];
    const dateMap: Record<string, Date> = {};
    let curr = new Date(rangeStart);

    // 根据视图类型限制天数，防止溢出
    let maxDays = 366; // 默认年视图最大天数
    if (pieRange === 'week') maxDays = 7;
    else if (pieRange === 'month') maxDays = 31;

    let dayCount = 0;
    while (curr <= rangeEnd && dayCount < maxDays) {
      const dStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
      days.push(dStr);
      dateMap[dStr] = new Date(curr);
      curr.setDate(curr.getDate() + 1);
      dayCount++;
    }

    // 2. Identify unique habits (by content + category)
    // Structure: Category -> Habit -> Date -> Status
    const habits: Record<string, Record<string, Record<string, boolean>>> = {};
    const habitStats: Record<string, { total: number, checked: number }> = {}; // Key: "Category|Habit"

    // Track insertion order for categories and habits
    const categoryOrder: string[] = [];
    const habitOrder: Record<string, string[]> = {}; // Category -> Habit names in order

    dailyReviews.forEach(review => {
      // Normalize review date to fit our range
      // Review date is string YYYY-MM-DD
      if (days.includes(review.date) && review.checkItems) {
        review.checkItems.forEach(item => {
          // 只包含有 category 的项目 (排除手动添加的临时项)
          if (!item.category) return;

          const category = item.category;
          const content = item.content;
          const key = `${category}|${content}`;

          if (!habits[category]) {
            habits[category] = {};
            categoryOrder.push(category); // Track category order
            habitOrder[category] = [];
          }
          if (!habits[category][content]) {
            habits[category][content] = {};
            habitOrder[category].push(content); // Track habit order within category
          }

          habits[category][content][review.date] = item.isCompleted;

          if (!habitStats[key]) habitStats[key] = { total: 0, checked: 0 };
          habitStats[key].total++;
          if (item.isCompleted) habitStats[key].checked++;
        });
      }
    });

    // Convert to array using insertion order (first encountered)
    const sortedCategories = categoryOrder.map(cat => {
      const catHabits = habitOrder[cat].map(hab => {
        const key = `${cat}|${hab}`;
        const stats = habitStats[key] || { total: 0, checked: 0 };

        return {
          name: hab,
          // Use Array.from to correctly handle emoji characters (surrogate pairs)
          icon: Array.from(hab)[0] || '📝',
          days: habits[cat][hab], // Map of DateStr -> Boolean
          stats
        };
      });
      return { name: cat, items: catHabits };
    });

    return { categories: sortedCategories, allDays: days, dateMap };
  }, [dailyReviews, rangeStart, rangeEnd, viewType]);

  const layoutDayEvents = (dayLogs: Log[]) => {
    const sorted = [...dayLogs].sort((a, b) => a.startTime - b.startTime);
    const clusters: Log[][] = [];
    if (sorted.length === 0) return new Map();
    let currentCluster: Log[] = [sorted[0]];
    let clusterEnd = sorted[0].endTime;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startTime < clusterEnd) { currentCluster.push(sorted[i]); clusterEnd = Math.max(clusterEnd, sorted[i].endTime); }
      else { clusters.push(currentCluster); currentCluster = [sorted[i]]; clusterEnd = sorted[i].endTime; }
    }
    clusters.push(currentCluster);
    const layoutMap = new Map();
    clusters.forEach(cluster => {
      cluster.forEach((log, idx) => {
        layoutMap.set(log.id, { left: `${(idx / cluster.length) * 100}%`, width: `${(1 / cluster.length) * 100}%` });
      });
    });
    return layoutMap;
  };

  const renderSchedule = () => {
    const HOUR_HEIGHT = 50;
    const TOTAL_HEIGHT = 24 * HOUR_HEIGHT;

    const containerClasses = isFullScreen
      ? "relative w-full bg-white flex flex-1"
      : "relative w-full flex";

    if (scheduleRange === 'day') {
      const layout = layoutDayEvents(filteredLogs);
      return (
        <div className={containerClasses} style={{ height: isFullScreen ? '100%' : TOTAL_HEIGHT }}>
          <div className="w-12 border-r border-stone-100 bg-stone-50/50 relative shrink-0" style={{ minHeight: TOTAL_HEIGHT }}>
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="absolute w-full text-xs font-medium text-stone-400 font-mono text-center pt-1" style={{ top: i * HOUR_HEIGHT }}>
                {i}:00
              </div>
            ))}
          </div>
          <div className="relative flex-1" style={{ minHeight: TOTAL_HEIGHT }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="absolute w-full border-b border-stone-50" style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }} />
            ))}
            {filteredLogs.map(l => {
              const s = new Date(l.startTime);
              const top = (s.getHours() * 60 + s.getMinutes()) * (HOUR_HEIGHT / 60);
              const h = (l.duration / 60) * (HOUR_HEIGHT / 60);
              const cat = categories.find(c => c.id === l.categoryId);
              const act = cat?.activities.find(a => a.id === l.activityId);
              const style = getScheduleStyle(act?.color || cat?.themeColor);
              const lay = layout.get(l.id) || { left: '0%', width: '100%' };
              return (
                <div key={l.id} className={`absolute rounded p-1 text-[10px] overflow-hidden leading-tight flex flex-col justify-center ${style} hover:z-10 border border-white/50 shadow-sm`} style={{ top: top + 1, height: Math.max(20, h - 2), left: `calc(${lay.left} + 2px)`, width: `calc(${lay.width} - 4px)` }}>
                  <span className="font-bold text-[11px] leading-tight block truncate">{act?.name || cat?.name}</span>
                  {l.note && (
                    <span
                      className={`text-[10px] opacity-80 mt-0.5 font-light leading-snug break-all line-clamp-3 overflow-hidden text-ellipsis display-box box-orient-vertical ${isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'}`}
                      title={isPrivacyMode ? '' : l.note}
                      style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}
                    >
                      {l.note}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    } else if (scheduleRange === 'week') {
      const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(rangeStart);
        d.setDate(d.getDate() + i);
        return d;
      });

      return (
        <div className={`${containerClasses} flex-col`} style={{ height: isFullScreen ? '100%' : '800px' }}>
          <div className="flex border-b border-stone-100 bg-stone-50/50 shrink-0">
            <div className="w-10 shrink-0 border-r border-stone-100"></div>
            {weekDays.map((d, i) => (
              <div key={i} className={`flex-1 text-center py-2 border-r border-stone-100 last:border-none ${d.toDateString() === new Date().toDateString() ? 'bg-stone-100' : ''}`}>
                <div className="text-[10px] text-stone-400 uppercase">{['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}</div>
                <div className={`text-xs font-bold ${d.toDateString() === new Date().toDateString() ? 'text-stone-900' : 'text-stone-600'}`}>{d.getDate()}</div>
              </div>
            ))}
          </div>

          <div className="relative flex-1">
            <div className="relative w-full" style={{ minHeight: TOTAL_HEIGHT }}>
              <div className="absolute left-0 top-0 bottom-0 w-10 border-r border-stone-100 bg-stone-50/50 z-10">
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="absolute w-full text-[10px] text-stone-300 font-mono text-center pt-1" style={{ top: i * HOUR_HEIGHT }}>
                    {i}
                  </div>
                ))}
              </div>

              <div className="absolute left-10 right-0 top-0 bottom-0 flex">
                <div className="absolute inset-0 pointer-events-none z-0">
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="w-full border-b border-stone-50" style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT, position: 'absolute' }} />
                  ))}
                </div>

                {weekDays.map((d, i) => {
                  const dayLogs = filteredLogs.filter(l => {
                    const start = new Date(l.startTime);
                    return start.getDate() === d.getDate() && start.getMonth() === d.getMonth() && start.getFullYear() === d.getFullYear();
                  });
                  const layout = layoutDayEvents(dayLogs);

                  return (
                    <div key={i} className="flex-1 border-r border-stone-50 relative last:border-none" style={{ minHeight: TOTAL_HEIGHT }}>
                      {dayLogs.map(l => {
                        const s = new Date(l.startTime);
                        const top = (s.getHours() * 60 + s.getMinutes()) * (HOUR_HEIGHT / 60);
                        const h = (l.duration / 60) * (HOUR_HEIGHT / 60);
                        const cat = categories.find(c => c.id === l.categoryId);
                        const act = cat?.activities.find(a => a.id === l.activityId);
                        const style = getScheduleStyle(act?.color || cat?.themeColor);
                        const lay = layout.get(l.id) || { left: '0%', width: '100%' };

                        const showNote = h > 30 && l.note;

                        return (
                          <div key={l.id} className={`absolute rounded-[2px] p-0.5 overflow-hidden leading-tight flex flex-col justify-start ${style} hover:z-10 border border-white/50 shadow-sm transition-all hover:scale-[1.02]`} style={{ top: top + 1, height: Math.max(10, h - 2), left: lay.left, width: `calc(${lay.width} - 2px)` }}>
                            <span className={`font-bold block w-full leading-tight truncate ${h < 20 ? 'text-[9px]' : 'text-[11px]'}`}>{act?.name}</span>
                            {showNote && (
                              <span
                                className={`text-[10px] opacity-75 w-full block mt-0.5 leading-snug break-all overflow-hidden text-ellipsis ${isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'}`}
                                style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                              >
                                {l.note}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )
    } else if (scheduleRange === 'month') {
      // Month heatmap view
      return (
        <div className={`${containerClasses} p-1`} style={{ minHeight: isFullScreen ? '100%' : '700px', height: isFullScreen ? '100%' : 'auto' }}>
          <MonthHeatmap
            logs={filteredLogs}
            categories={categories}
            month={currentDate}
          />
        </div>
      );
    }
  };

  return (
    <div
      className={`${isFullScreen ? 'fixed inset-0 z-50 bg-stone-50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]' : 'h-full bg-[#faf9f6]'} flex flex-col overflow-hidden animate-in slide-in-from-right duration-300`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >

      {/* Fullscreen Exit Button - Only visible in fullscreen mode */}
      {isFullScreen && (
        <div className="absolute bottom-4 left-4 z-50">
          <button onClick={onToggleFullScreen} className="p-2 transition-all text-stone-400 hover:text-stone-800 bg-white/80 hover:bg-white rounded-full shadow-lg backdrop-blur-sm" title="退出全屏">
            <Minimize2 size={20} />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar ${isFullScreen ? 'pt-0' : 'pt-2'}`}>
        <div className={`${isFullScreen ? 'h-full flex flex-col' : 'px-5 pb-24 space-y-6 max-w-2xl mx-auto'}`}>

          {/* Control Bar: Time Range (Left) + Date Navigation + View Switcher (Right) - Hidden in FullScreen */}
          {/* Control Bar: Time Range (Left) + Date Navigation + View Switcher (Right) - Hidden in FullScreen */}
          {!hideControls && !isFullScreen && (
            <div className="flex items-center justify-between mb-4">
              {/* Left: Time Range Selector (only for pie and schedule views) */}
              <div className="flex-1">
                {!hideRangeControls && viewType === 'pie' && (
                  <div className="flex bg-stone-100/50 p-0.5 rounded-lg w-fit">
                    {(['day', 'week', 'month', 'year'] as PieRange[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => setPieRange(r)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${pieRange === r ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                      >
                        {{ day: '日', week: '周', month: '月', year: '年' }[r]}
                      </button>
                    ))}
                  </div>
                )}
                {!hideRangeControls && viewType === 'schedule' && (
                  <div className="flex bg-stone-100/50 p-0.5 rounded-lg w-fit">
                    {(['day', 'week', 'month'] as ScheduleRange[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => setScheduleRange(r)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${scheduleRange === r ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                      >
                        {{ day: '日', week: '周', month: '月' }[r]}
                      </button>
                    ))}
                  </div>
                )}
                {!hideRangeControls && viewType === 'line' && (
                  <div className="flex bg-stone-100/50 p-0.5 rounded-lg w-fit">
                    <button
                      onClick={() => setLineRange('week')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${lineRange === 'week' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      周
                    </button>
                    <button
                      onClick={() => setLineRange('month')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${lineRange === 'month' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      月
                    </button>
                  </div>
                )}
                {!hideRangeControls && viewType === 'check' && (
                  <div className="flex bg-stone-100/50 p-0.5 rounded-lg w-fit">
                    {/* Check view supports Week, Month, Year. Day is disabled/hidden or just excluded */}

                    <button
                      onClick={() => setPieRange('week')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${pieRange === 'week' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      周
                    </button>
                    <button
                      onClick={() => setPieRange('month')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${pieRange === 'month' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      月
                    </button>
                    <button
                      onClick={() => setPieRange('year')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${pieRange === 'year' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      年
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Date Navigation + View Type Switcher */}
              <div className="flex items-center gap-2">
                {/* Date Navigation Buttons */}
                {!hideDateNavigation && (
                  <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg">
                    <button
                      onClick={() => handleNavigateDate('prev')}
                      className="p-1.5 rounded-md transition-all text-stone-400 hover:text-stone-800 hover:bg-white"
                      title="上一个时间段"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => handleNavigateDate('next')}
                      className="p-1.5 rounded-md transition-all text-stone-400 hover:text-stone-800 hover:bg-white"
                      title="下一个时间段"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}

                {/* View Type Switcher (icon only) */}
                <div className="flex bg-stone-100 p-0.5 rounded-lg">
                  {allowedViews.includes('pie') && (
                    <button onClick={() => setViewType('pie')} className={`p-1.5 rounded-md transition-all ${viewType === 'pie' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`} title="饼图">
                      <PieChart size={14} />
                    </button>
                  )}
                  {allowedViews.includes('matrix') && (
                    <button onClick={() => setViewType('matrix')} className={`p-1.5 rounded-md transition-all ${viewType === 'matrix' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`} title="矩阵">
                      <Grid size={14} />
                    </button>
                  )}
                  {allowedViews.includes('line') && (
                    <button onClick={() => setViewType('line')} className={`p-1.5 rounded-md transition-all ${viewType === 'line' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`} title="趋势">
                      <TrendingUp size={14} />
                    </button>
                  )}
                  {allowedViews.includes('schedule') && (
                    <button onClick={() => setViewType('schedule')} className={`p-1.5 rounded-md transition-all ${viewType === 'schedule' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`} title="日程">
                      <Calendar size={14} />
                    </button>
                  )}
                  {allowedViews.includes('check') && (
                    <button
                      onClick={() => {
                        setViewType('check');
                        if (pieRange === 'day') setPieRange('week'); // Default to week if currently day
                      }}
                      className={`p-1.5 rounded-md transition-all ${viewType === 'check' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                      title="打卡"
                    >
                      <CheckCircle2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* --- Pie View Content --- */}
          {viewType === 'pie' && (
            <PieChartView
              stats={stats}
              previousStats={previousStats}
              todoStats={todoStats}
              previousTodoStats={previousTodoStats}
              scopeStats={scopeStats}
              previousScopeStats={previousScopeStats}
              pieRange={pieRange}
              categories={categories}
              excludedCategoryIds={excludedCategoryIds}
              onToggleExclusion={toggleExclusion}
              onExport={handleExportStats}
              isFullScreen={isFullScreen}
            />
          )}

          {/* --- Line Chart View Content --- */}
          {viewType === 'line' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 pb-20 relative">

              {(() => {
                // --- Data Preparation Logic ---
                // 1. Generate Array of 7 Days for X-Axis
                const daysOfRange: Date[] = [];
                let d = new Date(rangeStart);
                while (d <= rangeEnd) {
                  daysOfRange.push(new Date(d));
                  d.setDate(d.getDate() + 1);
                }

                // Helper to get formatted date label
                const getLabel = (date: Date) => {
                  const dayName = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
                  const isMonthView = daysOfRange.length > 10;
                  return isMonthView ? `${date.getDate()}` : `${dayName}`;
                };

                // Helper to get max value for Y-Axis scaling
                const getMaxValue = (dataPoints: number[][]) => {
                  let max = 0;
                  dataPoints.forEach(series => series.forEach(v => { if (v > max) max = v; }));
                  return max > 0 ? Math.ceil(max) : 5; // Default to 5 hours if empty
                };

                const CHART_LINE_COLORS: Record<string, string> = {
                  red: '#fca5a5', blue: '#93c5fd', orange: '#fdba74', purple: '#d8b4fe',
                  emerald: '#6ee7b7', fuchsia: '#f0abfc', yellow: '#fde047', cyan: '#67e8f9',
                  rose: '#fda4af', indigo: '#a5b4fc', lime: '#bef264', violet: '#c4b5fd',
                  amber: '#fcd34d', sky: '#7dd3fc', green: '#86efac', pink: '#f9a8d4',
                  teal: '#5eead4'
                };

                const getStroke = (colorClass: string) => {
                  const match = colorClass?.match(/(?:text|bg)-([a-z]+)-/);
                  const colorId = match ? match[1] : 'stone';
                  return CHART_LINE_COLORS[colorId] || '#d6d3d1';
                };

                // 2. Prepare Activity Data (Series)
                // 2. Prepare Activity Data (Series)
                const allActivitiesMap = new Map<string, { name: string, color: string, total: number, categoryId: string }>();

                filteredLogs.forEach(log => {
                  const cat = categories.find(c => c.id === log.categoryId);
                  const act = cat?.activities.find(a => a.id === log.activityId);
                  if (!act || !cat) return;

                  const duration = Math.max(0, (log.endTime - log.startTime) / 1000) / 3600; // in Hours
                  const key = act.id;

                  if (!allActivitiesMap.has(key)) {
                    allActivitiesMap.set(key, { name: act.name, color: act.color, total: 0, categoryId: cat.id });
                  }
                  allActivitiesMap.get(key)!.total += duration;
                });

                const topActivities = Array.from(allActivitiesMap.entries())
                  .sort((a, b) => {
                    const catIdxA = categories.findIndex(c => c.id === a[1].categoryId);
                    const catIdxB = categories.findIndex(c => c.id === b[1].categoryId);
                    if (catIdxA !== catIdxB) return catIdxA - catIdxB;
                    return b[1].total - a[1].total;
                  })
                  // .slice(0, 5) // REMOVED: Show all activities
                  .map(([id, info]) => ({ id, ...info }));

                const activitySeries = topActivities.map(act => {
                  return daysOfRange.map(day => {
                    const dStart = new Date(day); dStart.setHours(0, 0, 0, 0);
                    const dEnd = new Date(day); dEnd.setHours(23, 59, 59, 999);

                    const logs = filteredLogs.filter(l =>
                      l.activityId === act.id &&
                      l.startTime >= dStart.getTime() &&
                      l.startTime <= dEnd.getTime()
                    );

                    const dailyTotal = logs.reduce((acc, l) => acc + Math.max(0, (l.endTime - l.startTime) / 1000), 0);
                    return dailyTotal / 3600; // hours
                  });
                });

                // 3. Prepare Scope Data (Series) - USING UNFILTERED LOGS (Independent of Category Filter)
                const unfilteredLogs = logs.filter(log =>
                  log.startTime >= rangeStart.getTime() &&
                  log.endTime <= rangeEnd.getTime()
                );

                // 3a. Prepare TODO Data (Series) - Also using UNFILTERED LOGS
                const allTodosMap = new Map<string, { name: string, color: string, total: number }>();

                unfilteredLogs.forEach(log => {
                  if (!log.linkedTodoId) return;

                  const todo = todos.find(t => t.id === log.linkedTodoId);
                  if (!todo) return;

                  const duration = Math.max(0, (log.endTime - log.startTime) / 1000) / 3600;
                  const key = todo.id;

                  // Only aggregate duration here, assign color later
                  if (!allTodosMap.has(key)) {
                    allTodosMap.set(key, { name: todo.title, color: '', total: 0 });
                  }
                  allTodosMap.get(key)!.total += duration;
                });

                const colorKeys = Object.keys(CHART_LINE_COLORS);
                const topTodos = Array.from(allTodosMap.entries())
                  .sort((a, b) => b[1].total - a[1].total)
                  .slice(0, 5) // Top 5 Todos
                  .map(([id, info], index) => ({
                    id,
                    ...info,
                    color: `bg-${colorKeys[index % colorKeys.length]}-50` // Assign color from pool cyclically
                  }));

                const todoSeries = topTodos.map(todo => {
                  return daysOfRange.map(day => {
                    const dStart = new Date(day); dStart.setHours(0, 0, 0, 0);
                    const dEnd = new Date(day); dEnd.setHours(23, 59, 59, 999);

                    const logs = unfilteredLogs.filter(l =>
                      l.linkedTodoId === todo.id &&
                      l.startTime >= dStart.getTime() &&
                      l.startTime <= dEnd.getTime()
                    );

                    const dailyTotal = logs.reduce((acc, l) => acc + Math.max(0, (l.endTime - l.startTime) / 1000), 0);
                    return dailyTotal / 3600;
                  });
                });

                // 3b. Prepare Scope Data (Series)
                const allScopesMap = new Map<string, { name: string, color: string, total: number }>();

                unfilteredLogs.forEach(log => {
                  if (!log.scopeIds || log.scopeIds.length === 0) return;

                  const duration = Math.max(0, (log.endTime - log.startTime) / 1000) / 3600;
                  const splitDuration = duration / log.scopeIds.length;

                  log.scopeIds.forEach(sId => {
                    const scope = scopes.find(s => s.id === sId);
                    if (!scope) return;

                    if (!allScopesMap.has(sId)) {
                      allScopesMap.set(sId, { name: scope.name, color: scope.themeColor, total: 0 });
                    }
                    allScopesMap.get(sId)!.total += splitDuration;
                  });
                });

                const topScopes = Array.from(allScopesMap.entries())
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([id, info]) => ({ id, ...info }));

                const scopeSeries = topScopes.map(scope => {
                  return daysOfRange.map(day => {
                    const dStart = new Date(day); dStart.setHours(0, 0, 0, 0);
                    const dEnd = new Date(day); dEnd.setHours(23, 59, 59, 999);

                    // Find logs with this scope in this day
                    const logs = unfilteredLogs.filter(l =>
                      l.scopeIds?.includes(scope.id) &&
                      l.startTime >= dStart.getTime() &&
                      l.startTime <= dEnd.getTime()
                    );

                    // Calculate split duration
                    let dailyTotal = 0;
                    logs.forEach(l => {
                      const d = Math.max(0, (l.endTime - l.startTime) / 1000);
                      dailyTotal += (d / (l.scopeIds?.length || 1));
                    });

                    return dailyTotal / 3600;
                  });
                });

                // Chart Rendering Helper
                const renderChart = (title: string, seriesData: number[][], seriesMeta: { name: string, color: string }[]) => {
                  if (seriesData.length === 0 || seriesData.every(s => s.every(v => v === 0))) return null;

                  const height = 220;
                  const width = 600;
                  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
                  const chartWidth = width - padding.left - padding.right;
                  const chartHeight = height - padding.top - padding.bottom;

                  const maxY = getMaxValue(seriesData);
                  const yTicks = 5;

                  const getX = (index: number) => padding.left + (index / (daysOfRange.length - 1)) * chartWidth;
                  const getY = (value: number) => height - padding.bottom - (value / maxY) * chartHeight;

                  return (
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-stone-900 mb-4 px-2 text-center">
                        <span>{title}</span>
                      </h3>

                      <div className="relative w-full aspect-[16/9] sm:aspect-[2/1]">
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full text-xs">
                          {/* Y-Axis Labels Only (No Grid Lines) */}
                          {Array.from({ length: yTicks + 1 }).map((_, i) => {
                            const val = (maxY / yTicks) * i;
                            const y = getY(val);
                            return (
                              <text key={i} x={padding.left - 10} y={y + 4} textAnchor="end" fill="#d6d3d1" fontSize="10">{val.toFixed(1)}h</text>
                            );
                          })}

                          {/* X-Axis */}
                          {daysOfRange.map((d, i) => (
                            <text key={i} x={getX(i)} y={height - 15} textAnchor="middle" fill="#a8a29e" fontSize="11" fontWeight="500">
                              {getLabel(d)}
                            </text>
                          ))}

                          {/* Lines */}
                          {seriesData.map((points, sIdx) => {
                            if (points.length < 2) return null;
                            const pathD = points.map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`).join(' ');
                            const color = getStroke(seriesMeta[sIdx].color);
                            return (
                              <g key={sIdx}>
                                <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                {points.map((val, i) => (
                                  <circle key={i} cx={getX(i)} cy={getY(val)} r="3" fill="white" stroke={color} strokeWidth="2" />
                                ))}
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      {/* Legend */}
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 px-4 justify-center">
                        {seriesMeta.map((meta, i) => {
                          const color = getStroke(meta.color);
                          return (
                            <div key={i} className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></div>
                              <span className="text-xs font-medium text-stone-600">{meta.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                };

                const tagsChart = renderChart('TAGS', activitySeries, topActivities);
                const todoChart = renderChart('TODOS', todoSeries, topTodos);
                const scopeChart = renderChart('SCOPES', scopeSeries, topScopes);

                return (
                  <div className="flex flex-col">
                    {/* Activity Trends */}
                    {tagsChart}

                    {/* Category Filters (Between Charts) */}
                    <div className="flex flex-wrap justify-center gap-2 pt-2 -mt-2 mb-2 px-2">
                      {categories.map(cat => {
                        const isExcluded = excludedCategoryIds.includes(cat.id);
                        const activeColor = getHexColor(cat.themeColor);
                        return (
                          <button
                            key={cat.id}
                            onClick={() => toggleExclusion(cat.id)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all border shadow-sm ${isExcluded
                              ? 'bg-stone-50 border-stone-200 text-stone-400 opacity-60 grayscale'
                              : 'bg-white border-stone-200 text-stone-600'
                              }`}
                            style={!isExcluded ? {} : {}}
                          >
                            <IconRenderer icon={cat.icon} uiIcon={cat.uiIcon} size={14} />
                            <span>{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* TODO Trends (Middle) */}
                    {todoChart && (
                      <div className="w-full flex flex-col items-center pt-2 border-t border-stone-100 mt-6 mb-6"></div>
                    )}
                    {todoChart}

                    {/* Scope Trends */}
                    {scopeChart && (
                      <div className="w-full flex flex-col items-center pt-2 border-t border-stone-100 mt-6 mb-6"></div>
                    )}
                    {scopeChart}
                  </div>
                );

              })()}

            </div>
          )}

          {/* --- Matrix View Content --- */}
          {viewType === 'matrix' && (
            <div className={`animate-in fade-in zoom-in-95 duration-300 ${isFullScreen ? 'flex-1 flex flex-col justify-center' : ''}`}>
              <div className="space-y-4 w-full">
                {matrixData.rows.length === 0 ? (
                  <div className="text-center py-10 text-stone-300 text-sm">暂无数据</div>
                ) : (
                  <div className="w-full max-w-4xl mx-auto">
                    <div className="flex items-center mb-4">
                      <div className="w-28 shrink-0"></div>
                      <div className="flex-1 grid grid-cols-7 gap-2">
                        {matrixData.days.map((d, i) => (
                          <div key={i} className="text-center flex justify-center">
                            <div className={`text-[10px] font-bold uppercase ${d.toDateString() === new Date().toDateString() ? 'text-stone-900 scale-110' : 'text-stone-300'}`}>
                              {['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {matrixData.rows.map((row) => (
                        <div key={row.activity.id} className="flex items-center">
                          <div className="w-28 shrink-0 flex items-center gap-2 pr-2 overflow-hidden">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 bg-stone-50`} style={{ color: getHexColor(row.activity.color) }}>
                              <IconRenderer icon={row.activity.icon} uiIcon={row.activity.uiIcon} className="text-xs" />
                            </div>
                            <span className="text-xs font-bold text-stone-600 truncate">{row.activity.name}</span>
                          </div>
                          <div className="flex-1 grid grid-cols-7 gap-2">
                            {row.cells.map((hasLog, i) => (
                              <div key={i} className="flex justify-center h-6">
                                <div
                                  className={`w-full max-w-[24px] h-full rounded-md transition-all duration-300 ${hasLog ? `scale-100 shadow-sm opacity-90` : 'scale-75 bg-stone-50/50'
                                    }`}
                                  style={hasLog ? { backgroundColor: getHexColor(row.activity.color) } : {}}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Filter Chips - Matrix View Position */}
              <div className="flex flex-wrap gap-2 justify-center pt-6 pb-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => toggleExclusion(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${excludedCategoryIds.includes(cat.id)
                      ? 'bg-stone-50 text-stone-300 grayscale'
                      : 'bg-white border border-stone-200 text-stone-600'
                      }`}
                  >
                    <IconRenderer icon={cat.icon} uiIcon={cat.uiIcon} size={14} />
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* --- Schedule View Content --- */}
          {viewType === 'schedule' && (
            <div className={`animate-in fade-in zoom-in-95 duration-300 ${isFullScreen ? 'flex-1 flex flex-col' : ''}`}>
              {renderSchedule()}
            </div>
          )}

          {/* --- Check View Content --- */}
          {viewType === 'check' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              {checkStats.categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-stone-400">
                  <CheckCircle2 size={48} className="mb-4 opacity-20" />
                  <p>该时间段无打卡记录</p>
                </div>
              ) : (
                <>
                  {/* Week View */}
                  {pieRange === 'week' && (
                    <div className="space-y-8">
                      {checkStats.categories.map(cat => (
                        <div key={cat.name} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-stone-900">{cat.name === '默认' ? '日常习惯' : cat.name}</h3>
                            <div className="h-px bg-stone-200 flex-1"></div>
                          </div>
                          <div className="space-y-2">
                            {cat.items.map(habit => {
                              const colors = [
                                { bg: 'bg-red-100', text: 'text-red-500', fill: 'bg-red-200' },
                                { bg: 'bg-orange-100', text: 'text-orange-500', fill: 'bg-orange-200' },
                                { bg: 'bg-amber-100', text: 'text-amber-500', fill: 'bg-amber-200' },
                                { bg: 'bg-yellow-100', text: 'text-yellow-600', fill: 'bg-yellow-200' },
                                { bg: 'bg-lime-100', text: 'text-lime-600', fill: 'bg-lime-200' },
                                { bg: 'bg-green-100', text: 'text-green-600', fill: 'bg-green-200' },
                                { bg: 'bg-emerald-100', text: 'text-emerald-600', fill: 'bg-emerald-200' },
                                { bg: 'bg-teal-100', text: 'text-teal-600', fill: 'bg-teal-200' },
                                { bg: 'bg-cyan-100', text: 'text-cyan-600', fill: 'bg-cyan-200' },
                                { bg: 'bg-sky-100', text: 'text-sky-600', fill: 'bg-sky-200' },
                                { bg: 'bg-blue-100', text: 'text-blue-600', fill: 'bg-blue-200' },
                                { bg: 'bg-indigo-100', text: 'text-indigo-600', fill: 'bg-indigo-200' },
                                { bg: 'bg-violet-100', text: 'text-violet-600', fill: 'bg-violet-200' },
                                { bg: 'bg-purple-100', text: 'text-purple-600', fill: 'bg-purple-200' },
                                { bg: 'bg-fuchsia-100', text: 'text-fuchsia-600', fill: 'bg-fuchsia-200' },
                                { bg: 'bg-pink-100', text: 'text-pink-600', fill: 'bg-pink-200' },
                                { bg: 'bg-rose-100', text: 'text-rose-600', fill: 'bg-rose-200' }
                              ];
                              const colorIndex = Math.abs(habit.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
                              const style = colors[colorIndex];

                              return (
                                <div key={habit.name} className="flex items-center justify-between py-1">
                                  <div className="w-28 sm:w-40 shrink-0 flex items-center">
                                    <span className="text-sm font-medium text-stone-800 truncate" title={habit.name}>
                                      {habit.name}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-end px-2 sm:px-4">
                                    {checkStats.allDays.map(dayStr => {
                                      const isChecked = habit.days[dayStr];
                                      const date = checkStats.dateMap[dayStr];
                                      return (
                                        <div key={dayStr} className="flex flex-col items-center gap-1">
                                          <div
                                            title={`${date.toLocaleDateString()} ${isChecked ? '已完成' : '未完成'}`}
                                            className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${isChecked
                                              ? `${style.fill} ${style.text}`
                                              : 'bg-white border border-stone-200'
                                              }`}
                                          >
                                            {isChecked && <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={3} />}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>


                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Month View */}
                  {pieRange === 'month' && (
                    <div className="grid grid-cols-2 gap-3">
                      {checkStats.categories.flatMap(cat => cat.items.map(habit => {
                        const colors = [
                          { bg: 'bg-red-100', text: 'text-red-500', fill: 'bg-red-400' },
                          { bg: 'bg-orange-100', text: 'text-orange-500', fill: 'bg-orange-400' },
                          { bg: 'bg-amber-100', text: 'text-amber-500', fill: 'bg-amber-400' },
                          { bg: 'bg-yellow-100', text: 'text-yellow-600', fill: 'bg-yellow-400' },
                          { bg: 'bg-lime-100', text: 'text-lime-600', fill: 'bg-lime-400' },
                          { bg: 'bg-green-100', text: 'text-green-600', fill: 'bg-green-400' },
                          { bg: 'bg-emerald-100', text: 'text-emerald-600', fill: 'bg-emerald-400' },
                          { bg: 'bg-teal-100', text: 'text-teal-600', fill: 'bg-teal-400' },
                          { bg: 'bg-cyan-100', text: 'text-cyan-600', fill: 'bg-cyan-400' },
                          { bg: 'bg-sky-100', text: 'text-sky-600', fill: 'bg-sky-400' },
                          { bg: 'bg-blue-100', text: 'text-blue-600', fill: 'bg-blue-400' },
                          { bg: 'bg-indigo-100', text: 'text-indigo-600', fill: 'bg-indigo-400' },
                          { bg: 'bg-violet-100', text: 'text-violet-600', fill: 'bg-violet-400' },
                          { bg: 'bg-purple-100', text: 'text-purple-600', fill: 'bg-purple-400' },
                          { bg: 'bg-fuchsia-100', text: 'text-fuchsia-600', fill: 'bg-fuchsia-400' },
                          { bg: 'bg-pink-100', text: 'text-pink-600', fill: 'bg-pink-400' },
                          { bg: 'bg-rose-100', text: 'text-rose-600', fill: 'bg-rose-400' }
                        ];
                        const colorIndex = Math.abs(habit.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
                        const style = colors[colorIndex];

                        return (
                          <div key={`${cat.name}-${habit.name}`} className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex flex-col">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div>
                                  <h4 className="font-bold text-stone-800 text-sm">
                                    {habit.name}
                                  </h4>
                                  <p className="text-xs text-stone-400">{cat.name === '默认' ? '日常' : cat.name}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex-1">
                              <div className="grid grid-cols-7 gap-1">
                                {(() => {
                                  // Monday start: Sunday is 0, we want it to be 6. Monday is 1, we want 0.
                                  // formula: (day + 6) % 7
                                  const startDay = (new Date(rangeStart).getDay() + 6) % 7;
                                  const blanks = Array.from({ length: startDay }, (_, i) => <div key={`blank-${i}`} />);

                                  return [
                                    ...blanks,
                                    ...checkStats.allDays.map(dayStr => {
                                      const isChecked = habit.days[dayStr];
                                      const dayNum = parseInt(dayStr.split('-')[2]);
                                      return (
                                        <div
                                          key={dayStr}
                                          className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium transition-colors ${isChecked ? `${style.fill} text-white` : 'bg-stone-50 text-stone-300'
                                            }`}
                                        >
                                        </div>
                                      )
                                    })
                                  ];
                                })()}
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-50">
                              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                                <CheckCircle2 size={14} className={style.text} />
                                <span className="font-bold">{habit.stats.checked}</span>
                                <span className="text-[10px] text-stone-300"></span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                                <span className="text-[10px]">🔥</span>
                                <span className="font-bold">{Math.round((habit.stats.checked / (checkStats.allDays.length || 1)) * 100)}%</span>
                              </div>
                            </div>
                          </div>
                        )
                      }))}
                    </div>
                  )}

                  {/* Year View */}
                  {pieRange === 'year' && (
                    <div className="space-y-4">
                      {checkStats.categories.flatMap(cat => cat.items.map(habit => {
                        const colors = [
                          { bg: 'bg-red-100', text: 'text-red-500', fill: 'bg-red-400' },
                          { bg: 'bg-orange-100', text: 'text-orange-500', fill: 'bg-orange-400' },
                          { bg: 'bg-amber-100', text: 'text-amber-500', fill: 'bg-amber-400' },
                          { bg: 'bg-yellow-100', text: 'text-yellow-600', fill: 'bg-yellow-400' },
                          { bg: 'bg-lime-100', text: 'text-lime-600', fill: 'bg-lime-400' },
                          { bg: 'bg-green-100', text: 'text-green-600', fill: 'bg-green-400' },
                          { bg: 'bg-emerald-100', text: 'text-emerald-600', fill: 'bg-emerald-400' },
                          { bg: 'bg-teal-100', text: 'text-teal-600', fill: 'bg-teal-400' },
                          { bg: 'bg-cyan-100', text: 'text-cyan-600', fill: 'bg-cyan-400' },
                          { bg: 'bg-sky-100', text: 'text-sky-600', fill: 'bg-sky-400' },
                          { bg: 'bg-blue-100', text: 'text-blue-600', fill: 'bg-blue-400' },
                          { bg: 'bg-indigo-100', text: 'text-indigo-600', fill: 'bg-indigo-400' },
                          { bg: 'bg-violet-100', text: 'text-violet-600', fill: 'bg-violet-400' },
                          { bg: 'bg-purple-100', text: 'text-purple-600', fill: 'bg-purple-400' },
                          { bg: 'bg-fuchsia-100', text: 'text-fuchsia-600', fill: 'bg-fuchsia-400' },
                          { bg: 'bg-pink-100', text: 'text-pink-600', fill: 'bg-pink-400' },
                          { bg: 'bg-rose-100', text: 'text-rose-600', fill: 'bg-rose-400' }
                        ];
                        const colorIndex = Math.abs(habit.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
                        const style = colors[colorIndex];

                        return (
                          <div key={`${cat.name}-${habit.name}`} className="bg-white rounded-xl py-4 shadow-sm border border-stone-100 overflow-hidden">
                            <div className="flex items-center gap-3 mb-4 px-4">
                              <span className="font-bold text-sm text-stone-800 shrink-0">
                                {habit.name}
                              </span>
                              <span className="text-xs text-stone-400 ml-auto shrink-0">{cat.name} · {habit.stats.checked}次</span>
                            </div>


                            <div className="px-4">
                              <div className="overflow-x-auto pb-2 scrollbar-hide">
                                <div className="flex gap-1 min-w-fit">
                                  {(() => {
                                    const weeks: string[][] = [];
                                    let currentWeek: string[] = Array(7).fill(null);

                                    const startDay = new Date(rangeStart).getDay();
                                    let dayIndex = startDay;

                                    checkStats.allDays.forEach((dayStr) => {
                                      currentWeek[dayIndex] = dayStr;
                                      dayIndex++;
                                      if (dayIndex > 6) {
                                        weeks.push(currentWeek);
                                        currentWeek = Array(7).fill(null);
                                        dayIndex = 0;
                                      }
                                    });
                                    if (dayIndex > 0) weeks.push(currentWeek);

                                    return weeks.map((week, wIdx) => (
                                      <div key={wIdx} className="flex flex-col gap-1">
                                        {week.map((dayStr, dIdx) => {
                                          if (!dayStr) return <div key={dIdx} className="w-3 h-3" />;
                                          const isChecked = habit.days[dayStr];
                                          return (
                                            <div
                                              key={dayStr}
                                              title={`${dayStr} ${isChecked ? '已完成' : ''}`}
                                              className={`w-3 h-3 rounded-[2px] transition-colors ${isChecked ? style.fill : 'bg-stone-100'
                                                }`}
                                            />
                                          );
                                        })}
                                      </div>
                                    ));
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      }))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}



        </div>

        {/* Bottom Export */}

      </div>


      <ConfirmModal
        isOpen={copyFailureModal.isOpen}
        onClose={() => setCopyFailureModal({ ...copyFailureModal, isOpen: false })}
        onConfirm={() => {
          executeCopy(copyFailureModal.text);
          setCopyFailureModal({ ...copyFailureModal, isOpen: false });
        }}
        title="导出统计文本"
        description={copyFailureModal.text}
        confirmText="复制内容"
        cancelText="关闭"
        type="info"
      />
    </div >
  );
};