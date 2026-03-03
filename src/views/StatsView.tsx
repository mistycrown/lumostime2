/**
 * @file StatsView.tsx
 * @input Logs, Categories, Todos, Scopes, Current Date
 * @output Navigation Events (Date Change, Back)
 * @pos View (Statistics Dashboard)
 * @description A comprehensive analytics dashboard supporting multiple visualization modes: Pie (Distribution), Matrix (Consistency), Schedule (Timeline), Line (Trend), and Check (Habit tracking). Analyzes time usage across Activities, Todos, and Scopes.
 *
 * 修改历史:
 * - 2026-01-10: 修复日课统计（check）视图的日期导航功能，补充 check 视图范围处理。
 * - 2026-03-03: 数字类型日课统计改为按完成次数展示，避免仅按是否完成呈现。
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Log, Category, Activity, Scope, TodoItem, TodoCategory, DailyReview } from '../types';
import { COLOR_OPTIONS } from '../constants';
import { Minimize2, Share, PieChart, Grid, Calendar, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, CheckCircle2, Smile } from 'lucide-react';
import { ToastType } from '../components/Toast';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useNavigation } from '../contexts/NavigationContext';
import { IconRenderer } from '../components/IconRenderer';
import { ConfirmModal } from '../components/ConfirmModal';
import { ChronoPrintView } from './ChronoPrintView';

// 鏂扮殑 Hooks 鍜岀粍浠?
import { useStatsCalculation } from '../hooks/useStatsCalculation';
import { useTodoStats } from '../hooks/useTodoStats';
import { useScopeStats } from '../hooks/useScopeStats';
import { PieChartView } from '../components/stats/PieChartView';
import { MatrixView } from '../components/stats/MatrixView';
import { CheckView } from '../components/stats/CheckView';
import { ScheduleView } from '../components/stats/ScheduleView';
import { LineChartView } from '../components/stats/LineChartView';
import { EmojiStatsView } from '../components/stats/EmojiStatsView';
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
  // Daily Review 鏀寔
  hideControls?: boolean;  // 闅愯棌鎵€鏈夋帶鍒舵潯
  hideRangeControls?: boolean; // 闅愯棌宸︿晶鏃堕棿鑼冨洿閫夋嫨 (鏃?鍛?鏈?骞?
  hideDateNavigation?: boolean; // 闅愯棌涓棿鏃ユ湡瀵艰埅 (< >)
  forcedView?: ViewType;   // 寮哄埗瑙嗗浘绫诲瀷
  forcedRange?: PieRange;  // 寮哄埗鏃堕棿鑼冨洿
  allowedViews?: ViewType[]; // 鍏佽鍒囨崲鐨勮鍥剧被鍨嬶紝榛樿鍏ㄩ儴
}

type ViewType = 'pie' | 'matrix' | 'schedule' | 'line' | 'check' | 'emoji';
type PieRange = 'day' | 'week' | 'month' | 'year';
type ScheduleRange = 'day' | 'week' | 'month';
type EmojiRange = 'month' | 'year';

interface ActivityStat extends Activity {
  duration: number;
}

interface CategoryStat extends Category {
  duration: number;
  percentage: number;
  items: ActivityStat[];
}

export const StatsView: React.FC<StatsViewProps> = ({ logs, categories, currentDate, onBack, onDateChange, isFullScreen, onToggleFullScreen, onToast, onTitleChange, todos, todoCategories, scopes, dailyReviews = [], hideControls = false, hideRangeControls = false, hideDateNavigation = false, forcedView, forcedRange, allowedViews = ['pie', 'matrix', 'line', 'schedule', 'check', 'emoji'] }) => {
  const { isPrivacyMode } = usePrivacy();
  const { setIsExportViewOpen } = useNavigation();
  const [viewType, setViewType] = useState<ViewType>(forcedView || 'pie');
  const [pieRange, setPieRange] = useState<PieRange>(forcedRange || 'day');
  const [scheduleRange, setScheduleRange] = useState<ScheduleRange>(
    forcedRange === 'month' ? 'month' : (forcedRange === 'week' ? 'week' : 'day')
  );
  const [lineRange, setLineRange] = useState<'week' | 'month'>((forcedRange === 'month' || forcedRange === 'year') ? 'month' : 'week');
  const [emojiRange, setEmojiRange] = useState<EmojiRange>('month');
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<string[]>([]);

  const toggleExclusion = (id: string) => {
    setExcludedCategoryIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  // 澶嶅埗澶辫触/鎵嬪姩澶嶅埗纭妯℃€佹鐘舵€?
  const [copyFailureModal, setCopyFailureModal] = useState<{ isOpen: boolean, text: string }>({ isOpen: false, text: '' });

  // ChronoPrint 瑙嗗浘鐘舵€?
  const [showChronoPrint, setShowChronoPrint] = useState(false);
  const [chronoPrintText, setChronoPrintText] = useState('');

  // 鍚屾瀵煎嚭瑙嗗浘鐘舵€佸埌鍏ㄥ眬
  useEffect(() => {
    setIsExportViewOpen(showChronoPrint);
  }, [showChronoPrint, setIsExportViewOpen]);

  // 鏃ユ湡瀵艰埅鍑芥暟
  const handleNavigateDate = (direction: 'prev' | 'next') => {
    if (!onDateChange) return;

    const newDate = new Date(currentDate);
    let rangeType: PieRange | 'week_fixed' | 'day_fixed';

    // 纭畾褰撳墠鏃堕棿鑼冨洿绫诲瀷
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
      // Check view浣跨敤pieRange锛屼絾涓嶆敮鎸乨ay锛岄粯璁や负week
      rangeType = pieRange === 'day' ? 'week' : pieRange;
    } else if (viewType === 'emoji') {
      // Emoji view浣跨敤emojiRange (month/year)
      rangeType = emojiRange;
    } else {
      rangeType = 'day';
    }

    const multiplier = direction === 'prev' ? -1 : 1;

    // 鏍规嵁鑼冨洿绫诲瀷璋冩暣鏃ユ湡
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

  // 瑙︽懜婊戝姩鎵嬪娍澶勭悊
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // 鏈€灏忔粦鍔ㄨ窛绂伙紙鍍忕礌锛? 澧炲姞闃堝€间互闄嶄綆鐏垫晱搴︼紝鍑忓皯璇Е
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
      // 鍚戝乏婊戝姩 = 涓嬩竴涓椂闂存
      handleNavigateDate('next');
    } else if (isRightSwipe) {
      // 鍚戝彸婊戝姩 = 涓婁竴涓椂闂存
      handleNavigateDate('prev');
    }
  };

  // 生成动态标题
  const getDynamicTitle = (
    date: Date,
    rangeType: PieRange | 'week_fixed' | 'day_fixed' | 'month'
  ): string => {
    if (rangeType === 'day' || rangeType === 'day_fixed') {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }

    if (rangeType === 'week' || rangeType === 'week_fixed') {
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
      }
      return `${startMonth}月${startDay}日 - ${endMonth}月${endDay}日`;
    }

    if (rangeType === 'month') {
      return `${date.getFullYear()}年${date.getMonth() + 1}月`;
    }

    if (rangeType === 'year') {
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
    if (viewType === 'emoji') {
      return getDateRange(currentDate, emojiRange);
    }
    return getDateRange(currentDate, 'day');
  }, [currentDate, viewType, pieRange, scheduleRange, lineRange, emojiRange]);

  // 褰撹鍥剧被鍨嬨€佹椂闂磋寖鍥存垨鏃ユ湡鍙樺寲鏃讹紝鑷姩鏇存柊鏍囬
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
      } else if (viewType === 'emoji') {
        rangeType = emojiRange;
      } else {
        rangeType = 'day';
      }

      const title = getDynamicTitle(currentDate, rangeType);
      onTitleChange(title);
    }
  }, [currentDate, viewType, pieRange, scheduleRange, lineRange, emojiRange, onTitleChange]);

  const { start: rangeStart, end: rangeEnd } = effectiveRange;

  // 浣跨敤鏂扮殑缁熻璁＄畻 Hooks
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

    let text = `## 馃搳 ${dateStr} - ${rangeLabel} 缁熻\n**鎬绘椂闀?*: ${formatDuration(stats.totalDuration)}\n\n`;
    stats.categoryStats.forEach(cat => {
      text += `- **[${cat.name}]** ${formatDuration(cat.duration)} (${cat.percentage.toFixed(1)}%)\n`;
      cat.items.forEach(act => {
        text += `    * ${act.name}: ${formatDuration(act.duration)}\n`;
      });
      text += '\n';
    });
    text += '\n';


    if (todoStats.totalDuration > 0) {
      text += `\n## 馃搵 寰呭姙涓撴敞鍒嗗竷\n**寰呭姙鎬绘椂闀?*: ${formatDuration(todoStats.totalDuration)}\n\n`;
      todoStats.categoryStats.forEach(cat => {
        text += `- **[${cat.name}]** ${formatDuration(cat.duration)} (${cat.percentage.toFixed(1)}%)\n`;
        cat.items.forEach(item => {
          text += `    * ${item.name}: ${formatDuration(item.duration)}\n`;
        });
        text += '\n';
      });
    }

    if (scopeStats.totalDuration > 0) {
      text += `\n## 馃幆 棰嗗煙涓撴敞鍒嗗竷\n**棰嗗煙鎬绘椂闀?*: ${formatDuration(scopeStats.totalDuration)}\n\n`;
      scopeStats.categoryStats.forEach(scope => {
        text += `- **[${scope.name}]** ${formatDuration(scope.duration)} (${scope.percentage.toFixed(1)}%)\n`;
        // Removed scope.items.forEach
        text += '\n';
      });
    }

    // Instead of direct copy, open modal
    setCopyFailureModal({ isOpen: true, text: text });
  };

  const handleExportImage = () => {
    const { start } = effectiveRange;
    const dateStr = `${start.getFullYear()}/${start.getMonth() + 1}/${start.getDate()}`;
    let rangeLabel = '';
    if (viewType === 'pie') rangeLabel = pieRange.charAt(0).toUpperCase() + pieRange.slice(1);
    if (viewType === 'matrix') rangeLabel = 'Week Matrix';
    if (viewType === 'schedule') rangeLabel = scheduleRange === 'day' ? 'Day Schedule' : 'Week Schedule';

    let text = `## 馃搳 ${dateStr} - ${rangeLabel} 缁熻\n**鎬绘椂闀?*: ${formatDuration(stats.totalDuration)}\n\n`;
    stats.categoryStats.forEach(cat => {
      text += `- **[${cat.name}]** ${formatDuration(cat.duration)} (${cat.percentage.toFixed(1)}%)\n`;
      cat.items.forEach(act => {
        text += `    * ${act.name}: ${formatDuration(act.duration)}\n`;
      });
      text += '\n';
    });
    text += '\n';

    if (todoStats.totalDuration > 0) {
      text += `\n## 馃搵 寰呭姙涓撴敞鍒嗗竷\n**寰呭姙鎬绘椂闀?*: ${formatDuration(todoStats.totalDuration)}\n\n`;
      todoStats.categoryStats.forEach(cat => {
        text += `- **[${cat.name}]** ${formatDuration(cat.duration)} (${cat.percentage.toFixed(1)}%)\n`;
        cat.items.forEach(item => {
          text += `    * ${item.name}: ${formatDuration(item.duration)}\n`;
        });
        text += '\n';
      });
    }

    if (scopeStats.totalDuration > 0) {
      text += `\n## 馃幆 棰嗗煙涓撴敞鍒嗗竷\n**棰嗗煙鎬绘椂闀?*: ${formatDuration(scopeStats.totalDuration)}\n\n`;
      scopeStats.categoryStats.forEach(scope => {
        text += `- **[${scope.name}]** ${formatDuration(scope.duration)} (${scope.percentage.toFixed(1)}%)\n`;
        text += '\n';
      });
    }

    // Open ChronoPrint view
    setChronoPrintText(text);
    setShowChronoPrint(true);
  };

  const executeCopy = (text: string) => {
    // Try standard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        onToast?.('success', '宸插鍒跺埌鍓创鏉?);
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
        onToast?.('success', '宸插鍒跺埌鍓创鏉?);
      } else {
        // onToast?.('error', '澶嶅埗澶辫触锛岃鎵嬪姩澶嶅埗');
        setCopyFailureModal({ isOpen: true, text: text });
      }
    } catch (err) {
      console.error('Fallback copy failed', err);
      // onToast?.('error', '澶嶅埗澶辫触锛岃妫€鏌ユ潈闄?);
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
    if (viewType !== 'check') return { categories: [], allDays: [], dateMap: {} };

    // 1. Collect all dates in range
    const days: string[] = [];
    const dateMap: Record<string, Date> = {};
    let curr = new Date(rangeStart);

    // 鏍规嵁瑙嗗浘绫诲瀷闄愬埗澶╂暟锛岄槻姝㈡孩鍑?
    let maxDays = 366; // 榛樿骞磋鍥炬渶澶уぉ鏁?
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
    const habitDayDetails: Record<string, Record<string, { value: number; target: number }>> = {}; // Key: "Category|Habit" -> Date -> Count Detail
    const habitStats: Record<string, { total: number, checked: number, countTotal: number, isCountMode: boolean }> = {}; // Key: "Category|Habit"

    // Track insertion order for categories and habits
    const categoryOrder: string[] = [];
    const habitOrder: Record<string, string[]> = {}; // Category -> Habit names in order

    dailyReviews.forEach(review => {
      // Normalize review date to fit our range
      // Review date is string YYYY-MM-DD
      if (days.includes(review.date) && review.checkItems) {
        review.checkItems.forEach(item => {
          // 鍙寘鍚湁 category 鐨勯」鐩?(鎺掗櫎鎵嬪姩娣诲姞鐨勪复鏃堕」)
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

          const isCountMode = item.type !== 'auto' && item.manualMode === 'count';
          let isChecked = item.isCompleted;

          if (!habitStats[key]) {
            habitStats[key] = { total: 0, checked: 0, countTotal: 0, isCountMode: false };
          }
          habitStats[key].total++;

          if (isCountMode) {
            habitStats[key].isCountMode = true;
            const target = Math.max(1, Math.floor(item.targetCount || 1));
            const currentRaw = typeof item.currentCount === 'number'
              ? item.currentCount
              : (item.isCompleted ? target : 0);
            const current = Math.min(target, Math.max(0, Math.floor(currentRaw)));
            if (!habitDayDetails[key]) habitDayDetails[key] = {};
            habitDayDetails[key][review.date] = { value: current, target };
            habitStats[key].countTotal += current;
            isChecked = current > 0;
          }

          habits[category][content][review.date] = isChecked;
          if (isChecked) habitStats[key].checked++;
        });
      }
    });

    // Store icon and uiIcon for each habit
    const habitIcons: Record<string, { icon: string, uiIcon?: string }> = {};

    dailyReviews.forEach(review => {
      if (days.includes(review.date) && review.checkItems) {
        review.checkItems.forEach(item => {
          if (!item.category) return;
          const key = `${item.category}|${item.content}`;
          // Store the first encountered icon for each habit
          if (!habitIcons[key] && item.icon) {
            habitIcons[key] = { icon: item.icon, uiIcon: item.uiIcon };
          }
        });
      }
    });

    // Convert to array using insertion order (first encountered)
    const sortedCategories = categoryOrder.map(cat => {
      const catHabits = habitOrder[cat].map(hab => {
        const key = `${cat}|${hab}`;
        const stats = habitStats[key] || { total: 0, checked: 0, countTotal: 0, isCountMode: false };
        const iconData = habitIcons[key] || { icon: '馃摑' };

        return {
          name: hab,
          icon: iconData.icon,
          uiIcon: iconData.uiIcon,
          days: habits[cat][hab], // Map of DateStr -> Boolean
          dayDetails: habitDayDetails[key],
          stats
        };
      });
      return { name: cat, items: catHabits };
    });

    return { categories: sortedCategories, allDays: days, dateMap };
  }, [dailyReviews, rangeStart, rangeEnd, viewType]);

  // If ChronoPrint view is active, render it instead
  if (showChronoPrint) {
    return (
      <ChronoPrintView
        inputText={chronoPrintText}
        onBack={() => setShowChronoPrint(false)}
        onToast={onToast}
      />
    );
  }

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
          <button onClick={onToggleFullScreen} className="p-2 transition-all text-stone-400 hover:text-stone-800 bg-white/80 hover:bg-white rounded-full shadow-lg backdrop-blur-sm" title="閫€鍑哄叏灞?>
            <Minimize2 size={20} />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar ${isFullScreen ? 'pt-0' : viewType === 'schedule' ? 'pt-0' : 'pt-2'}`}>
        <div className={`${isFullScreen ? 'h-full flex flex-col' : viewType === 'schedule' ? 'h-full flex flex-col' : 'px-5 pb-24 space-y-6 max-w-2xl mx-auto'}`}>

          {/* Control Bar: Time Range (Left) + Date Navigation + View Switcher (Right) - Hidden in FullScreen */}
          {/* Control Bar: Time Range (Left) + Date Navigation + View Switcher (Right) - Hidden in FullScreen */}
          {!hideControls && !isFullScreen && (
            <div className={`flex items-center justify-between mb-4 ${viewType === 'schedule' ? 'mt-2 px-5' : ''}`}>
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
                        {{ day: '鏃?, week: '鍛?, month: '鏈?, year: '骞? }[r]}
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
                        {{ day: '鏃?, week: '鍛?, month: '鏈? }[r]}
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
                      鍛?
                    </button>
                    <button
                      onClick={() => setLineRange('month')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${lineRange === 'month' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      鏈?
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
                      鍛?
                    </button>
                    <button
                      onClick={() => setPieRange('month')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${pieRange === 'month' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      鏈?
                    </button>
                    <button
                      onClick={() => setPieRange('year')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${pieRange === 'year' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      骞?
                    </button>
                  </div>
                )}
                {!hideRangeControls && viewType === 'emoji' && (
                  <div className="flex bg-stone-100/50 p-0.5 rounded-lg w-fit">
                    <button
                      onClick={() => setEmojiRange('month')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${emojiRange === 'month' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      鏈?
                    </button>
                    <button
                      onClick={() => setEmojiRange('year')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${emojiRange === 'year' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      骞?
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
                      title="涓婁竴涓椂闂存"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => handleNavigateDate('next')}
                      className="p-1.5 rounded-md transition-all text-stone-400 hover:text-stone-800 hover:bg-white"
                      title="涓嬩竴涓椂闂存"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}

                {/* View Type Switcher (icon only) */}
                <div className="flex bg-stone-100 p-0.5 rounded-lg">
                  {allowedViews.includes('pie') && (
                    <button onClick={() => setViewType('pie')} className={`p-1.5 rounded-md transition-all ${viewType === 'pie' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`} title="楗煎浘">
                      <PieChart size={14} />
                    </button>
                  )}
                  {allowedViews.includes('matrix') && (
                    <button onClick={() => setViewType('matrix')} className={`p-1.5 rounded-md transition-all ${viewType === 'matrix' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`} title="鐭╅樀">
                      <Grid size={14} />
                    </button>
                  )}
                  {allowedViews.includes('line') && (
                    <button onClick={() => setViewType('line')} className={`p-1.5 rounded-md transition-all ${viewType === 'line' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`} title="瓒嬪娍">
                      <TrendingUp size={14} />
                    </button>
                  )}
                  {allowedViews.includes('schedule') && (
                    <button onClick={() => setViewType('schedule')} className={`p-1.5 rounded-md transition-all ${viewType === 'schedule' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`} title="鏃ョ▼">
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
                      title="鎵撳崱"
                    >
                      <CheckCircle2 size={14} />
                    </button>
                  )}
                  {allowedViews.includes('emoji') && (
                    <button
                      onClick={() => setViewType('emoji')}
                      className={`p-1.5 rounded-md transition-all ${viewType === 'emoji' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                      title="鎯呯华"
                    >
                      <Smile size={14} />
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
              onExportImage={handleExportImage}
              isFullScreen={isFullScreen}
            />
          )}

          {/* --- Line Chart View Content --- */}
          {viewType === 'line' && (
            <LineChartView
              filteredLogs={filteredLogs}
              logs={logs}
              categories={categories}
              todos={todos}
              scopes={scopes}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              excludedCategoryIds={excludedCategoryIds}
              onToggleExclusion={toggleExclusion}
            />
          )}


          {viewType === 'matrix' && (
            <MatrixView
              matrixData={matrixData}
              categories={categories}
              excludedCategoryIds={excludedCategoryIds}
              onToggleExclusion={toggleExclusion}
              isFullScreen={isFullScreen}
            />
          )}

          {/* --- Schedule View Content --- */}
          {viewType === 'schedule' && (
            <ScheduleView
              filteredLogs={filteredLogs}
              categories={categories}
              scheduleRange={scheduleRange}
              rangeStart={rangeStart}
              currentDate={currentDate}
              isFullScreen={isFullScreen}
              isPrivacyMode={isPrivacyMode}
            />
          )}

          {/* --- Check View Content --- */}
          {viewType === 'check' && (
            <CheckView
              checkStats={checkStats}
              pieRange={pieRange}
              rangeStart={rangeStart}
            />
          )}

          {/* --- Emoji View Content --- */}
          {viewType === 'emoji' && (
            <EmojiStatsView
              dailyReviews={dailyReviews}
              currentDate={currentDate}
              emojiRange={emojiRange}
              onToast={onToast}
            />
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
        title="瀵煎嚭缁熻鏂囨湰"
        description={copyFailureModal.text}
        confirmText="澶嶅埗鍐呭"
        cancelText="鍏抽棴"
        type="info"
      />
    </div >
  );
};

