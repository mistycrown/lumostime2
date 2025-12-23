/**
 * @file StatsView.tsx
 * @input Logs, Categories, Todos, Scopes, Current Date
 * @output Navigation Events (Date Change, Back)
 * @pos View (Statistics Dashboard)
 * @description A comprehensive analytics dashboard supporting multiple visualization modes: Pie (Distribution), Matrix (Consistency), Schedule (Timeline), and Line (Trend). Analyzes time usage across Activities, Todos, and Scopes.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Log, Category, Activity, Scope, TodoItem, TodoCategory } from '../types';
import { COLOR_OPTIONS } from '../constants';
import { Minimize2, Share, PieChart, Grid, Calendar, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { ToastType } from '../components/Toast';

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
  // Daily Review 支持
  hideControls?: boolean;  // 隐藏所有控制条
  hideRangeControls?: boolean; // 隐藏左侧时间范围选择 (日/周/月/年)
  hideDateNavigation?: boolean; // 隐藏中间日期导航 (< >)
  forcedView?: ViewType;   // 强制视图类型
  forcedRange?: PieRange;  // 强制时间范围
  allowedViews?: ViewType[]; // 允许切换的视图类型，默认全部
}

type ViewType = 'pie' | 'matrix' | 'schedule' | 'line';
type PieRange = 'day' | 'week' | 'month' | 'year';
type ScheduleRange = 'day' | 'week';

interface ActivityStat extends Activity {
  duration: number;
}

interface CategoryStat extends Category {
  duration: number;
  percentage: number;
  items: ActivityStat[];
}

export const StatsView: React.FC<StatsViewProps> = ({ logs, categories, currentDate, onBack, onDateChange, isFullScreen, onToggleFullScreen, onToast, onTitleChange, todos, todoCategories, scopes, hideControls = false, hideRangeControls = false, hideDateNavigation = false, forcedView, forcedRange, allowedViews = ['pie', 'matrix', 'line', 'schedule'] }) => {
  const [viewType, setViewType] = useState<ViewType>(forcedView || 'pie');
  const [pieRange, setPieRange] = useState<PieRange>(forcedRange || 'day');
  const [scheduleRange, setScheduleRange] = useState<ScheduleRange>(forcedRange === 'week' ? 'week' : 'day');
  const [lineRange, setLineRange] = useState<'week' | 'month'>('week');
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<string[]>([]);

  const toggleExclusion = (id: string) => {
    setExcludedCategoryIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

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
      rangeType = scheduleRange === 'day' ? 'day_fixed' : 'week_fixed';
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

  // 增长/下降指示器渲染函数
  const renderGrowth = (current: number, previous: number) => {
    if (!previous || previous < 0.1) return null; // Avoid division by zero or tiny base
    const delta = current - previous;
    const percentage = Math.round((delta / previous) * 100);
    if (percentage === 0) return null;

    const isPositive = percentage > 0;
    // 上升=绿色(emerald-500)，下降=红色(red-400)

    return (
      <div className={`flex items-center gap-0.5 text-[10px] font-medium ml-1.5 ${isPositive ? 'text-emerald-500' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        <span>{Math.abs(percentage)}%</span>
      </div>
    );
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

      return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;
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
    if (viewType === 'schedule') return getDateRange(currentDate, scheduleRange === 'day' ? 'day_fixed' : 'week_fixed');
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
        rangeType = scheduleRange === 'day' ? 'day_fixed' : 'week_fixed';
      } else if (viewType === 'line') {
        rangeType = lineRange === 'week' ? 'week_fixed' : 'month';
      } else {
        rangeType = 'day';
      }

      const title = getDynamicTitle(currentDate, rangeType);
      onTitleChange(title);
    }
  }, [currentDate, viewType, pieRange, scheduleRange, lineRange, onTitleChange]);

  const { start: rangeStart, end: rangeEnd } = effectiveRange;

  const filteredLogs = useMemo(() => {
    return logs.filter(log =>
      log.startTime >= rangeStart.getTime() &&
      log.endTime <= rangeEnd.getTime() &&
      !excludedCategoryIds.includes(log.categoryId)
    );
  }, [logs, rangeStart, rangeEnd, excludedCategoryIds]);

  const stats = useMemo(() => {
    const totalDuration = filteredLogs.reduce((acc, log) => acc + Math.max(0, (log.endTime - log.startTime) / 1000), 0);
    const categoryStats: CategoryStat[] = categories.map(cat => {
      const catLogs = filteredLogs.filter(l => l.categoryId === cat.id);
      const catDuration = catLogs.reduce((acc, l) => acc + Math.max(0, (l.endTime - l.startTime) / 1000), 0);
      const activityStats: ActivityStat[] = cat.activities.map(act => {
        const actLogs = catLogs.filter(l => l.activityId === act.id);
        const actDuration = actLogs.reduce((acc, l) => acc + Math.max(0, (l.endTime - l.startTime) / 1000), 0);
        return { ...act, duration: actDuration };
      }).filter(a => a.duration > 0).sort((a, b) => b.duration - a.duration);

      return {
        ...cat,
        duration: catDuration,
        percentage: totalDuration > 0 ? (catDuration / totalDuration) * 100 : 0,
        items: activityStats
      };
    }).filter(s => s.duration > 0).sort((a, b) => b.duration - a.duration);
    return { totalDuration, categoryStats };
  }, [filteredLogs, categories]);

  const getHexColor = (className: string = '') => {
    if (typeof className !== 'string') return '#e7e5e4';
    const match = className.match(/(?:text|bg)-([a-z]+)-/);
    const colorId = match ? match[1] : 'stone';
    const option = COLOR_OPTIONS.find(opt => opt.id === colorId);
    return option ? (option.lightHex || option.hex) : '#e7e5e4';
  };

  const getScheduleStyle = (className: string = '') => {
    if (typeof className !== 'string') return 'bg-stone-100 text-stone-700 border-stone-200';
    const match = className.match(/(?:text|bg)-([a-z]+)-/);
    const color = match ? match[1] : 'stone';
    const styles: Record<string, string> = {
      stone: 'bg-stone-100/90 text-stone-700 border-stone-200',
      slate: 'bg-slate-100/90 text-slate-700 border-slate-200',
      gray: 'bg-gray-100/90 text-gray-700 border-gray-200',
      zinc: 'bg-zinc-100/90 text-zinc-700 border-zinc-200',
      neutral: 'bg-neutral-100/90 text-neutral-700 border-neutral-200',
      red: 'bg-red-100/90 text-red-700 border-red-200',
      orange: 'bg-orange-100/90 text-orange-700 border-orange-200',
      amber: 'bg-amber-100/90 text-amber-700 border-amber-200',
      yellow: 'bg-yellow-100/90 text-yellow-700 border-yellow-200',
      lime: 'bg-lime-100/90 text-lime-700 border-lime-200',
      green: 'bg-green-100/90 text-green-700 border-green-200',
      emerald: 'bg-emerald-100/90 text-emerald-700 border-emerald-200',
      teal: 'bg-teal-100/90 text-teal-700 border-teal-200',
      cyan: 'bg-cyan-100/90 text-cyan-700 border-cyan-200',
      sky: 'bg-sky-100/90 text-sky-700 border-sky-200',
      blue: 'bg-blue-100/90 text-blue-700 border-blue-200',
      indigo: 'bg-indigo-100/90 text-indigo-700 border-indigo-200',
      violet: 'bg-violet-100/90 text-violet-700 border-violet-200',
      purple: 'bg-purple-100/90 text-purple-700 border-purple-200',
      fuchsia: 'bg-fuchsia-100/90 text-fuchsia-700 border-fuchsia-200',
      pink: 'bg-pink-100/90 text-pink-700 border-pink-200',
      rose: 'bg-rose-100/90 text-rose-700 border-rose-200',
    };
    return styles[color] || styles['stone'];
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}小时 ${m}分钟`;
    return `${m}分钟`;
  };
  const { h: totalH, m: totalM } = (() => {
    const s = stats.totalDuration;
    return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60) };
  })();

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

    navigator.clipboard.writeText(text).then(() => onToast?.('success', '已复制')).catch(() => onToast?.('error', '复制失败'));
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

  const pieChartData = useMemo(() => {
    let currentAngle = 0; const gapAngle = 2; const radius = 80; const center = 100;
    return stats.categoryStats.map(cat => {
      const sweepAngle = (cat.percentage / 100) * 360;
      if (sweepAngle < 1) return null;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sweepAngle - gapAngle;
      currentAngle += sweepAngle;
      const startRad = (startAngle - 90) * Math.PI / 180.0;
      const endRad = (endAngle - 90) * Math.PI / 180.0;
      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
      const d = ["M", x1, y1, "A", radius, radius, 0, largeArcFlag, 1, x2, y2].join(" ");
      return { ...cat, d, hexColor: getHexColor(cat.themeColor) };
    }).filter(Boolean);
  }, [stats]);

  // Todo Stats
  const todoStats = useMemo(() => {
    const logsWithTodos = filteredLogs.filter(l => l.linkedTodoId);
    const totalDuration = logsWithTodos.reduce((acc, log) => acc + Math.max(0, (log.endTime - log.startTime) / 1000), 0);

    const todoDurations: Record<string, number> = {};
    logsWithTodos.forEach(l => {
      const d = Math.max(0, (l.endTime - l.startTime) / 1000);
      todoDurations[l.linkedTodoId!] = (todoDurations[l.linkedTodoId!] || 0) + d;
    });

    const COLORS = ['#fee2e2', '#ffedd5', '#fef9c3', '#dcfce7', '#ccfbf1', '#dbeafe', '#e0e7ff', '#f3e8ff', '#fce7f3', '#ffe4e6'];

    const categoryStats = todoCategories.map((cat, index) => {
      const catTodos = todos.filter(t => t.categoryId === cat.id);
      let catDuration = 0;
      const items = catTodos.map(t => {
        const d = todoDurations[t.id] || 0;
        catDuration += d;
        return {
          id: t.id,
          name: t.title,
          duration: d,
        };
      }).filter(i => i.duration > 0).sort((a, b) => b.duration - a.duration);

      return {
        ...cat,
        duration: catDuration,
        percentage: totalDuration > 0 ? (catDuration / totalDuration) * 100 : 0,
        items,
        assignedColor: COLORS[index % COLORS.length]
      };
    }).filter(c => c.duration > 0).sort((a, b) => b.duration - a.duration);

    return { totalDuration, categoryStats };
  }, [filteredLogs, todos, todoCategories]);

  const todoPieChartData = useMemo(() => {
    let currentAngle = 0; const gapAngle = 2; const radius = 80; const center = 100;
    return todoStats.categoryStats.map(cat => {
      const sweepAngle = (cat.percentage / 100) * 360;
      if (sweepAngle < 1) return null;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sweepAngle - gapAngle;
      currentAngle += sweepAngle;
      const startRad = (startAngle - 90) * Math.PI / 180.0;
      const endRad = (endAngle - 90) * Math.PI / 180.0;
      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
      const d = ["M", x1, y1, "A", radius, radius, 0, largeArcFlag, 1, x2, y2].join(" ");
      return { ...cat, d, hexColor: cat.assignedColor };
    }).filter(Boolean);
  }, [todoStats]);

  const { h: totalTodoH, m: totalTodoM } = (() => {
    const s = todoStats.totalDuration;
    return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60) };
  })();

  // Scope Stats
  const scopeStats = useMemo(() => {
    // 1. Filter logs that have ANY scope assigned
    const logsWithScopes = filteredLogs.filter(l => l.scopeIds && l.scopeIds.length > 0);

    // We calculate "Scoped Duration" separate from Total Duration.
    // If a log has multiple scopes, we SPLIT the duration to avoid > 100% in pie chart.
    // e.g. 1 hour log with 2 scopes => 30 mins each.

    let totalScopedDuration = 0;
    const scopeDurations: Record<string, number> = {};
    const scopeActivityBreakdown: Record<string, Record<string, number>> = {}; // scopeId -> activityName -> duration

    logsWithScopes.forEach(l => {
      const d = Math.max(0, (l.endTime - l.startTime) / 1000);
      const count = l.scopeIds!.length;
      const splitDuration = d / count;

      // Find activity name for breakdown
      const cat = categories.find(c => c.id === l.categoryId);
      const act = cat?.activities.find(a => a.id === l.activityId);
      const actName = act?.name || 'Unknown';

      totalScopedDuration += d; // Wait, total time is simple sum of log durations (regardless of split)
      // Actually, if we want the pie chart to sum to "Total Scoped Time", 
      // simple sum of splits IS the whole.

      l.scopeIds!.forEach(sId => {
        scopeDurations[sId] = (scopeDurations[sId] || 0) + splitDuration;

        if (!scopeActivityBreakdown[sId]) scopeActivityBreakdown[sId] = {};
        scopeActivityBreakdown[sId][actName] = (scopeActivityBreakdown[sId][actName] || 0) + splitDuration;
      });
    });

    // We can't use simple sum of splits for totalScopedDuration if we want "Real Time".
    // But for the pie chart "Whole", sum of splits IS the whole.
    // So distinct logs duration sum is the denominator.

    const distinctTotalDuration = logsWithScopes.reduce((acc, l) => acc + Math.max(0, (l.endTime - l.startTime) / 1000), 0);

    const categoryStats = scopes.map(scope => {
      const duration = scopeDurations[scope.id] || 0;

      // Breakdown items
      const breakdown = scopeActivityBreakdown[scope.id] || {};
      const items = Object.entries(breakdown).map(([name, d]) => ({
        id: name, // pseudo id
        name: name,
        duration: d,
        icon: '', // activity icon hard to get here efficiently without lookup map, skip for now
        color: ''
      })).sort((a, b) => b.duration - a.duration);

      return {
        ...scope,
        duration,
        percentage: distinctTotalDuration > 0 ? (duration / distinctTotalDuration) * 100 : 0,
        items,
        // Fallback for color if not set (scopes usually have themeColor)
        themeColor: scope.themeColor || 'stone'
      };
    }).filter(s => s.duration > 0).sort((a, b) => b.duration - a.duration);

    return { totalDuration: distinctTotalDuration, categoryStats };
  }, [filteredLogs, scopes, categories]);

  // --- Previous Period Helpers ---
  const getPreviousDateRange = (currentStart: Date, currentEnd: Date, rangeType: PieRange | 'week_fixed' | 'day_fixed' | 'month') => {
    const start = new Date(currentStart);
    const end = new Date(currentEnd);

    if (rangeType === 'day' || rangeType === 'day_fixed') {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (rangeType === 'week' || rangeType === 'week_fixed') {
      start.setDate(start.getDate() - 7);
      end.setDate(end.getDate() - 7);
    } else if (rangeType === 'month') {
      start.setMonth(start.getMonth() - 1);
      // Adjust end date logic for month? Actually simple range shift is safer:
      // But for month view we want the "previous month".
      // Our getCurrentRange already handles "start of month" to "end of month".
      // So if we just shift start back 1 month, and re-calculate end?
      // Let's rely on standard logic:
      const prevMonth = new Date(start);
      prevMonth.setMonth(prevMonth.getMonth() - 1); // Go to previous month
      return getDateRange(prevMonth, 'month');
    } else if (rangeType === 'year') {
      start.setFullYear(start.getFullYear() - 1);
      return getDateRange(start, 'year');
    }
    return { start, end };
  };

  const previousRange = useMemo(() => {
    let rangeType: PieRange | 'week_fixed' | 'day_fixed' | 'month';
    if (viewType === 'pie') {
      rangeType = pieRange;
    } else if (viewType === 'matrix') {
      rangeType = 'week_fixed';
    } else if (viewType === 'schedule') {
      rangeType = scheduleRange === 'day' ? 'day_fixed' : 'week_fixed';
    } else if (viewType === 'line') {
      rangeType = lineRange === 'week' ? 'week_fixed' : 'month';
    } else {
      rangeType = 'day';
    }
    return getPreviousDateRange(rangeStart, rangeEnd, rangeType);
  }, [rangeStart, rangeEnd, viewType, pieRange, scheduleRange, lineRange]);

  const previousFilteredLogs = useMemo(() => {
    return logs.filter(log =>
      log.startTime >= previousRange.start.getTime() &&
      log.endTime <= previousRange.end.getTime() &&
      !excludedCategoryIds.includes(log.categoryId) // Keep same filters
    );
  }, [logs, previousRange, excludedCategoryIds]);

  const previousStats = useMemo(() => {
    const totalDuration = previousFilteredLogs.reduce((acc, log) => acc + Math.max(0, (log.endTime - log.startTime) / 1000), 0);

    // Map of Category ID -> Duration
    const catDurations = new Map<string, number>();
    // Map of Activity ID -> Duration
    const actDurations = new Map<string, number>();

    previousFilteredLogs.forEach(log => {
      const d = Math.max(0, (log.endTime - log.startTime) / 1000);
      catDurations.set(log.categoryId, (catDurations.get(log.categoryId) || 0) + d);
      actDurations.set(log.activityId, (actDurations.get(log.activityId) || 0) + d);
    });

    return { totalDuration, catDurations, actDurations };
  }, [previousFilteredLogs]);

  // Previous Todo Stats
  const previousTodoStats = useMemo(() => {
    const logsWithTodos = previousFilteredLogs.filter(l => l.linkedTodoId);
    const totalDuration = logsWithTodos.reduce((acc, log) => acc + Math.max(0, (log.endTime - log.startTime) / 1000), 0);
    const todoDurations = new Map<string, number>();
    logsWithTodos.forEach(l => {
      const d = Math.max(0, (l.endTime - l.startTime) / 1000);
      todoDurations.set(l.linkedTodoId!, (todoDurations.get(l.linkedTodoId!) || 0) + d);
    });

    // Aggregate by Category
    const categoryDurations = new Map<string, number>();
    todoCategories.forEach(cat => {
      const catTodos = todos.filter(t => t.categoryId === cat.id);
      let d = 0;
      catTodos.forEach(t => d += (todoDurations.get(t.id) || 0));
      categoryDurations.set(cat.id, d);
    });

    return { totalDuration, todoDurations, categoryDurations };
  }, [previousFilteredLogs, todos, todoCategories]);

  // Previous Scope Stats
  const previousScopeStats = useMemo(() => {
    const logsWithScopes = previousFilteredLogs.filter(l => l.scopeIds && l.scopeIds.length > 0);
    const distinctTotalDuration = logsWithScopes.reduce((acc, l) => acc + Math.max(0, (l.endTime - l.startTime) / 1000), 0);

    const scopeDurations = new Map<string, number>();
    const scopeActivityBreakdown: Record<string, Record<string, number>> = {};

    logsWithScopes.forEach(l => {
      const d = Math.max(0, (l.endTime - l.startTime) / 1000);
      const count = l.scopeIds!.length;
      const splitDuration = d / count;

      // Find activity name for breakdown
      const cat = categories.find(c => c.id === l.categoryId);
      const act = cat?.activities.find(a => a.id === l.activityId);
      const actName = act?.name || 'Unknown';

      l.scopeIds!.forEach(sId => {
        scopeDurations.set(sId, (scopeDurations.get(sId) || 0) + splitDuration);

        if (!scopeActivityBreakdown[sId]) scopeActivityBreakdown[sId] = {};
        scopeActivityBreakdown[sId][actName] = (scopeActivityBreakdown[sId][actName] || 0) + splitDuration;
      });
    });
    return { totalDuration: distinctTotalDuration, scopeDurations, scopeActivityBreakdown };
  }, [previousFilteredLogs, categories]);

  const scopePieChartData = useMemo(() => {
    let currentAngle = 0; const gapAngle = 2; const radius = 80; const center = 100;
    return scopeStats.categoryStats.map(cat => {
      const sweepAngle = (cat.percentage / 100) * 360;
      if (sweepAngle < 1) return null;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sweepAngle - gapAngle;
      currentAngle += sweepAngle;
      const startRad = (startAngle - 90) * Math.PI / 180.0;
      const endRad = (endAngle - 90) * Math.PI / 180.0;
      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
      const d = ["M", x1, y1, "A", radius, radius, 0, largeArcFlag, 1, x2, y2].join(" ");
      return { ...cat, d, hexColor: getHexColor(cat.themeColor) };
    }).filter(Boolean);
  }, [scopeStats]);

  const { h: totalScopeH, m: totalScopeM } = (() => {
    const s = scopeStats.totalDuration;
    return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60) };
  })();

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
                      className="text-[10px] opacity-80 mt-0.5 font-light leading-snug break-all line-clamp-3 overflow-hidden text-ellipsis display-box box-orient-vertical"
                      title={l.note}
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
    } else {
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
                                className="text-[10px] opacity-75 w-full block mt-0.5 leading-snug break-all overflow-hidden text-ellipsis"
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
                    {(['day', 'week'] as ScheduleRange[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => setScheduleRange(r)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${scheduleRange === r ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                      >
                        {{ day: '日', week: '周' }[r]}
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
                </div>
              </div>
            </div>
          )}

          {/* --- Pie View Content --- */}
          {viewType === 'pie' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              {/* Chart Card - No border */}
              <div className="flex flex-col items-center">
                <div className="relative w-56 h-56 mb-8 mt-2">
                  <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#f5f5f4" strokeWidth="25" />
                    {pieChartData.map((segment, idx) => (
                      <path key={segment && segment.id} d={segment && segment.d} fill="none" stroke={segment && segment.hexColor} strokeWidth="25" strokeLinecap="round" className="animate-in fade-in duration-700" style={{ animationDelay: `${idx * 100}ms` }} />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold text-stone-300 uppercase">Tags</span>
                    <div className="flex items-baseline gap-0.5 text-stone-800">
                      <span className="text-3xl font-bold font-mono">{totalH}</span>
                      <span className="text-xs text-stone-400">h</span>
                      <span className="text-xl font-bold font-mono">{totalM}</span>
                      <span className="text-xs text-stone-400">m</span>
                    </div>
                  </div>
                </div>

                <div className="w-full space-y-4">
                  {stats.categoryStats.map(cat => (
                    <div key={cat.id} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cat.icon}</span>
                          <span className="font-bold text-stone-700 text-[13px]">{cat.name}</span>
                          {/* Growth Indicator for Category */}
                          {renderGrowth(cat.duration, previousStats.catDurations.get(cat.id) || 0)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-stone-400">{formatDuration(cat.duration)}</span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-stone-100 rounded text-stone-500">{cat.percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-stone-50 rounded-full overflow-hidden mb-2">
                        <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: getHexColor(cat.themeColor) }} />
                      </div>
                      <div className="pl-6 space-y-1">
                        {cat.items.map(act => (
                          <div key={act.id} className="flex items-center justify-between text-[11px] text-stone-500 hover:bg-stone-50 rounded px-2 py-0.5 -ml-2 transition-colors">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs">{act.icon}</span>
                              <span>{act.name}</span>
                              {/* Growth Indicator for Activity */}
                              {renderGrowth(act.duration, previousStats.actDurations.get(act.id) || 0)}
                            </div>
                            <span className="font-mono opacity-60">{formatDuration(act.duration)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filter Chips - Pie View Position */}
              <div className="flex flex-wrap gap-2 justify-center pt-2 pb-4">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => toggleExclusion(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${excludedCategoryIds.includes(cat.id)
                      ? 'bg-stone-50 text-stone-300 grayscale'
                      : 'bg-white border border-stone-200 text-stone-600'
                      }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>

              {/* Todo Stats Chart (New) */}
              {todoStats.totalDuration > 0 && (
                <div className="flex flex-col items-center pt-8 border-t border-stone-100 mt-8">

                  <div className="relative w-56 h-56 mb-8 mt-2">
                    <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                      <circle cx="100" cy="100" r="80" fill="none" stroke="#f5f5f4" strokeWidth="25" />
                      {todoPieChartData.map((segment, idx) => (
                        <path key={segment && segment.id} d={segment && segment.d} fill="none" stroke={segment && segment.hexColor} strokeWidth="25" strokeLinecap="round" className="animate-in fade-in duration-700" style={{ animationDelay: `${idx * 100}ms` }} />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs font-bold text-stone-300 uppercase">Todos</span>
                      <div className="flex items-baseline gap-0.5 text-stone-800">
                        <span className="text-3xl font-bold font-mono">{totalTodoH}</span>
                        <span className="text-xs text-stone-400">h</span>
                        <span className="text-xl font-bold font-mono">{totalTodoM}</span>
                        <span className="text-xs text-stone-400">m</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full space-y-4">
                    {todoStats.categoryStats.map(cat => (
                      <div key={cat.id} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{cat.icon}</span>
                            <span className="font-bold text-stone-700 text-[13px]">{cat.name}</span>
                            {/* Growth Indicator for Todo Category */}
                            {renderGrowth(cat.duration, previousTodoStats.categoryDurations?.get(cat.id) || 0)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-stone-400">{formatDuration(cat.duration)}</span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-stone-100 rounded text-stone-500">{cat.percentage.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-stone-50 rounded-full overflow-hidden mb-2">
                          <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: cat.assignedColor }} />
                        </div>
                        {pieRange !== 'year' && (
                          <div className="pl-6 space-y-1">
                            {cat.items.map(act => (
                              <div key={act.id} className="flex items-center justify-between text-[11px] text-stone-500 hover:bg-stone-50 rounded px-2 py-0.5 -ml-2 transition-colors">
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-1 h-1 rounded-full`} style={{ backgroundColor: cat.assignedColor }}></div>
                                  <span>{act.name}</span>
                                  {/* Growth Indicator for Todo Item */}
                                  {renderGrowth(act.duration, previousTodoStats.todoDurations.get(act.id) || 0)}
                                </div>
                                <span className="font-mono opacity-60">{formatDuration(act.duration)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scope Stats Chart (New) */}
              {scopeStats.totalDuration > 0 && (
                <div className="flex flex-col items-center pt-8 border-t border-stone-100 mt-8">
                  <div className="relative w-56 h-56 mb-8 mt-2">
                    <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                      <circle cx="100" cy="100" r="80" fill="none" stroke="#f5f5f4" strokeWidth="25" />
                      {scopePieChartData.map((segment, idx) => (
                        <path key={segment && segment.id} d={segment && segment.d} fill="none" stroke={segment && segment.hexColor} strokeWidth="25" strokeLinecap="round" className="animate-in fade-in duration-700" style={{ animationDelay: `${idx * 100}ms` }} />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs font-bold text-stone-300 uppercase">Scopes</span>
                      <div className="flex items-baseline gap-0.5 text-stone-800">
                        <span className="text-3xl font-bold font-mono">{totalScopeH}</span>
                        <span className="text-xs text-stone-400">h</span>
                        <span className="text-xl font-bold font-mono">{totalScopeM}</span>
                        <span className="text-xs text-stone-400">m</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full space-y-4">
                    {scopeStats.categoryStats.map(scope => (
                      <div key={scope.id} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{scope.icon}</span>
                            <span className="font-bold text-stone-700 text-[13px]">{scope.name}</span>
                            {/* Growth Indicator for Scope */}
                            {renderGrowth(scope.duration, previousScopeStats.scopeDurations.get(scope.id) || 0)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-stone-400">{formatDuration(scope.duration)}</span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-stone-100 rounded text-stone-500">{scope.percentage.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-stone-50 rounded-full overflow-hidden mb-2">
                          <div className="h-full rounded-full" style={{ width: `${scope.percentage}%`, backgroundColor: getHexColor(scope.themeColor) }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
                            <span>{cat.icon}</span>
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
                              {row.activity.icon}
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
                    <span>{cat.icon}</span>
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



        </div>

        {/* Bottom Export */}
        {viewType === 'pie' && !isFullScreen && (
          <div className="px-5 pb-8">
            <button
              onClick={handleExportStats}
              className="flex items-center gap-1 text-stone-400 hover:text-stone-600 transition-colors text-xs font-medium"
            >
              <Share size={12} />
              <span>导出统计文本</span>
            </button>
          </div>
        )}
      </div>
    </div >
  );
};