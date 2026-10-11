/**
 * @file StatsView.tsx
 * @input Logs, Categories, Todos, Scopes, Current Date
 * @output Navigation Events (Date Change, Back)
 * @pos View (Statistics Dashboard)
 * @description A comprehensive analytics dashboard supporting multiple visualization modes: Pie (Distribution), Matrix (Consistency + daily editorial timeline), Schedule (Timeline), Line (Trend), and Check (Habit tracking). Analyzes time usage across Activities, Todos, and Scopes.
 *
 * 修改历史:
 * - 2026-01-10: 修复日课统计（check）视图的日期导航功能，补充 check 视图范围处理。
 * - 2026-03-03: 数字类型日课统计改为按完成次数展示，避免仅按是否完成呈现。
 * - 2026-03-11: 统一统计分享导出协议，修复分享图片页因解析失败导致的空白问题。
 * - 2026-04-03: 复用共享周范围计算，修复矩阵视图跨月时被错误扩展为超过 7 天的问题。
 * - 2026-04-25: 为矩阵视图新增日范围切换和 editorial 时间格子图，使用活动标签颜色与本地书法字体。
 * - 2026-04-25: check 统计视图仅统计仍存在于启用日课模板中的条目，隐藏停用或已删除模板项。
 * - 2026-08-09: 日课统计优先使用日课模板条目颜色，旧模板继续使用名称颜色兜底。
 * - 2026-10-11: 日课横滑仅滚动内容，按需计算其他统计，缓存日课范围并避免滑动时重绘。
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Log, Category, Activity, Scope, TodoItem, TodoCategory, DailyReview, CheckTemplate } from '../types';
import { COLOR_OPTIONS } from '../constants';
import { Minimize2, Share, PieChart, Grid, Calendar, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, CheckCircle2, Smile } from 'lucide-react';
import { ToastType } from '../components/Toast';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useSettings } from '../contexts/SettingsContext';
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
import { getDateRange as getSharedDateRange, getDynamicTitle as getSharedDynamicTitle } from '../components/StatsView/statsUtils';
import { formatDuration, getHexColor, getScheduleStyle } from '../utils/chartUtils';
import { createCheckStatsCache, EMPTY_CHECK_STATS } from '../utils/checkStatsUtils';

const EMPTY_STATS_ITEMS: never[] = [];
const EMPTY_DAILY_REVIEWS: DailyReview[] = [];

const toRgba = (hexColor: string, alpha: number): string => {
  const normalized = hexColor.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((ch) => ch + ch).join('')
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return `rgba(214, 211, 209, ${alpha})`;
  }

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const darkenHex = (hexColor: string, factor: number): string => {
  const normalized = hexColor.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((ch) => ch + ch).join('')
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return '#4b5563';
  }

  const toChannel = (value: string) => Math.max(0, Math.min(255, Math.round(parseInt(value, 16) * factor)));

  const r = toChannel(full.slice(0, 2)).toString(16).padStart(2, '0');
  const g = toChannel(full.slice(2, 4)).toString(16).padStart(2, '0');
  const b = toChannel(full.slice(4, 6)).toString(16).padStart(2, '0');

  return `#${r}${g}${b}`;
};

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
  checkTemplates?: CheckTemplate[];
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

export const StatsView: React.FC<StatsViewProps> = ({ logs, categories, currentDate, onBack, onDateChange, isFullScreen, onToggleFullScreen, onToast, onTitleChange, todos, todoCategories, scopes, dailyReviews = EMPTY_DAILY_REVIEWS, checkTemplates, hideControls = false, hideRangeControls = false, hideDateNavigation = false, forcedView, forcedRange, allowedViews = ['pie', 'matrix', 'line', 'schedule', 'check', 'emoji'] }) => {
  const { isPrivacyMode } = usePrivacy();
  const { setIsExportViewOpen } = useNavigation();
  const { scheduleStyle } = useSettings();
  const [viewType, setViewType] = useState<ViewType>(forcedView || 'pie');
  const [pieRange, setPieRange] = useState<PieRange>(forcedRange || 'day');
  const [scheduleRange, setScheduleRange] = useState<ScheduleRange>(
    forcedRange === 'month' ? 'month' : (forcedRange === 'week' ? 'week' : 'day')
  );
  const [lineRange, setLineRange] = useState<'week' | 'month'>((forcedRange === 'month' || forcedRange === 'year') ? 'month' : 'week');
  const [emojiRange, setEmojiRange] = useState<EmojiRange>('month');
  const [matrixRange, setMatrixRange] = useState<'day' | 'week'>(forcedRange === 'day' ? 'day' : 'week');
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
      rangeType = matrixRange === 'day' ? 'day_fixed' : 'week_fixed';
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
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number } | null>(null);

  // 鏈€灏忔粦鍔ㄨ窛绂伙紙鍍忕礌锛? 澧炲姞闃堝€间互闄嶄綆鐏垫晱搴︼紝鍑忓皯璇Е
  const minSwipeDistance = 100;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = null;
    touchEnd.current = null;
    if (viewType === 'check' || e.touches.length !== 1) return;
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    if (e.touches.length !== 1) {
      touchStart.current = null;
      touchEnd.current = null;
      return;
    }
    touchEnd.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = () => {
    const start = touchStart.current;
    const end = touchEnd.current;
    touchStart.current = null;
    touchEnd.current = null;
    if (viewType === 'check' || !start || !end) return;

    const distance = start.x - end.x;
    if (Math.abs(distance) <= Math.abs(start.y - end.y)) return;
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

  // --- Date Helpers ---
  const getDateRange = (date: Date, rangeType: PieRange | 'week_fixed' | 'day_fixed' | 'month') => {
    return getSharedDateRange(date, rangeType);
  };

  const effectiveRange = useMemo(() => {
    if (viewType === 'pie') return getDateRange(currentDate, pieRange);
    if (viewType === 'matrix') return getDateRange(currentDate, matrixRange === 'day' ? 'day_fixed' : 'week_fixed');
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
  }, [currentDate, viewType, pieRange, scheduleRange, lineRange, emojiRange, matrixRange]);

  // 褰撹鍥剧被鍨嬨€佹椂闂磋寖鍥存垨鏃ユ湡鍙樺寲鏃讹紝鑷姩鏇存柊鏍囬
  useEffect(() => {
    if (onTitleChange) {
      let rangeType: PieRange | 'week_fixed' | 'day_fixed' | 'month';
      if (viewType === 'pie') {
        rangeType = pieRange;
      } else if (viewType === 'matrix') {
        rangeType = matrixRange === 'day' ? 'day_fixed' : 'week_fixed';
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

      const title = getSharedDynamicTitle(currentDate, rangeType);
      onTitleChange(title);
    }
  }, [currentDate, viewType, pieRange, scheduleRange, lineRange, emojiRange, matrixRange, onTitleChange]);

  const { start: rangeStart, end: rangeEnd } = effectiveRange;
  // Daily-check statistics use reviews only. Export controls belong to the pie view.
  const needsLogStats = viewType !== 'check';

  // 浣跨敤鏂扮殑缁熻璁＄畻 Hooks
  const { stats, previousStats, filteredLogs } = useStatsCalculation({
    logs: needsLogStats ? logs : EMPTY_STATS_ITEMS,
    categories: needsLogStats ? categories : EMPTY_STATS_ITEMS,
    dateRange: effectiveRange,
    excludedCategoryIds,
    includePrevious: needsLogStats
  });

  const { todoStats, previousTodoStats } = useTodoStats({
    logs: needsLogStats ? logs : EMPTY_STATS_ITEMS,
    todos: needsLogStats ? todos : EMPTY_STATS_ITEMS,
    todoCategories: needsLogStats ? todoCategories : EMPTY_STATS_ITEMS,
    dateRange: effectiveRange,
    includePrevious: needsLogStats
  });

  const { scopeStats, previousScopeStats } = useScopeStats({
    logs: needsLogStats ? logs : EMPTY_STATS_ITEMS,
    scopes: needsLogStats ? scopes : EMPTY_STATS_ITEMS,
    categories: needsLogStats ? categories : EMPTY_STATS_ITEMS,
    dateRange: effectiveRange,
    includePrevious: needsLogStats
  });

  const getExportRangeLabel = () => {
    if (viewType === 'pie') {
      return {
        day: '日',
        week: '周',
        month: '月',
        year: '年'
      }[pieRange];
    }

    if (viewType === 'matrix') return matrixRange === 'day' ? '日矩阵' : '周矩阵';

    if (viewType === 'schedule') {
      return {
        day: '日程',
        week: '周日程',
        month: '月日程'
      }[scheduleRange];
    }

    if (viewType === 'line') {
      return lineRange === 'week' ? '周趋势' : '月趋势';
    }

    if (viewType === 'check') {
      return {
        week: '周打卡',
        month: '月打卡',
        year: '年打卡'
      }[pieRange === 'day' ? 'week' : pieRange];
    }

    if (viewType === 'emoji') {
      return emojiRange === 'year' ? '年度情绪' : '月度情绪';
    }

    return '统计';
  };

  const buildStatsExportText = () => {
    const { start } = effectiveRange;
    const dateStr = `${start.getFullYear()}/${start.getMonth() + 1}/${start.getDate()}`;
    const rangeLabel = getExportRangeLabel();

    let text = `## 📊 ${dateStr} - ${rangeLabel}统计\n**总时长**: ${formatDuration(stats.totalDuration)}\n\n`;
    stats.categoryStats.forEach(cat => {
      text += `- **[${cat.name}]** ${formatDuration(cat.duration)} (${cat.percentage.toFixed(1)}%)\n`;
      cat.items.forEach(act => {
        text += `    * ${act.name}: ${formatDuration(act.duration)}\n`;
      });
      text += '\n';
    });
    text += '\n';


    if (todoStats.totalDuration > 0) {
      text += `\n## 📋 待办专注分布\n**总时长**: ${formatDuration(todoStats.totalDuration)}\n\n`;
      todoStats.categoryStats.forEach(cat => {
        text += `- **[${cat.name}]** ${formatDuration(cat.duration)} (${cat.percentage.toFixed(1)}%)\n`;
        cat.items.forEach(item => {
          text += `    * ${item.name}: ${formatDuration(item.duration)}\n`;
        });
        text += '\n';
      });
    }

    if (scopeStats.totalDuration > 0) {
      text += `\n## 🎯 领域专注分布\n**总时长**: ${formatDuration(scopeStats.totalDuration)}\n\n`;
      scopeStats.categoryStats.forEach(scope => {
        text += `- **[${scope.name}]** ${formatDuration(scope.duration)} (${scope.percentage.toFixed(1)}%)\n`;
        text += '\n';
      });
    }

    return text;
  };

  const handleExportStats = () => {
    const text = buildStatsExportText();
    // Instead of direct copy, open modal
    setCopyFailureModal({ isOpen: true, text: text });
  };

  const handleExportImage = () => {
    const text = buildStatsExportText();
    // Open ChronoPrint view
    setChronoPrintText(text);
    setShowChronoPrint(true);
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
    if (viewType !== 'matrix' || matrixRange !== 'week') return { days: [], rows: [] };
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
  }, [rangeStart, rangeEnd, filteredLogs, categories, viewType, matrixRange]);

  const editorialTimeline = useMemo(() => {
    if (viewType !== 'matrix' || matrixRange !== 'day') {
      return { displayDate: rangeStart, rows: [], legendItems: [] };
    }
    const chunksPerHour = 6;
    const minutesPerChunk = 10;
    const timelineStart = new Date(rangeStart);
    timelineStart.setHours(0, 0, 0, 0);
    const timelineEnd = new Date(timelineStart);
    timelineEnd.setDate(timelineEnd.getDate() + 1);

    const activityLookup = new Map<string, Activity>();
    categories.forEach((category) => {
      category.activities.forEach((activity) => {
        activityLookup.set(activity.id, activity);
      });
    });

    const dayLogs = filteredLogs
      .filter((log) => log.endTime > timelineStart.getTime() && log.startTime < timelineEnd.getTime())
      .sort((a, b) => a.startTime - b.startTime);

    const durationByActivity = new Map<string, { activityName: string; color: string; duration: number }>();

    dayLogs.forEach((log) => {
      const activity = activityLookup.get(log.activityId);
      if (!activity) return;

      const overlapStart = Math.max(log.startTime, timelineStart.getTime());
      const overlapEnd = Math.min(log.endTime, timelineEnd.getTime());
      const overlapDuration = Math.max(0, Math.floor((overlapEnd - overlapStart) / 1000));

      if (overlapDuration <= 0) return;

      const current = durationByActivity.get(activity.id);
      durationByActivity.set(activity.id, {
        activityName: activity.name,
        color: getHexColor(activity.color),
        duration: (current?.duration || 0) + overlapDuration
      });
    });

    const allChunks = Array.from({ length: 24 }, (_, hour) =>
      Array.from({ length: chunksPerHour }, (_, chunkIndex) => {
        const chunkStart = new Date(timelineStart);
        chunkStart.setHours(hour, chunkIndex * minutesPerChunk, 0, 0);
        const chunkEnd = new Date(chunkStart);
        chunkEnd.setMinutes(chunkEnd.getMinutes() + minutesPerChunk);

        let activeLog: Log | null = null;
        dayLogs.forEach((log) => {
          if (log.startTime < chunkEnd.getTime() && log.endTime > chunkStart.getTime()) {
            activeLog = log;
          }
        });

        if (!activeLog) {
          return {
            activityId: null,
            activityName: null,
            color: 'transparent',
            textColor: 'transparent',
            label: ''
          };
        }

        const activity = activityLookup.get(activeLog.activityId);
        const baseColor = getHexColor(activity?.color || '#d6d3d1');
        return {
          activityId: activeLog.activityId,
          activityName: activity?.name || '未命名活动',
          color: toRgba(baseColor, 0.72),
          textColor: darkenHex(baseColor, 0.58),
          label: ''
        };
      })
    ).flat();

    const labeledAllChunks = allChunks.map((chunk, chunkIndex) => {
      if (!chunk.activityId || !chunk.activityName) {
        return chunk;
      }

      const previousChunk = chunkIndex > 0 ? allChunks[chunkIndex - 1] : null;
      const isSegmentStart = !previousChunk || previousChunk.activityId !== chunk.activityId;

      if (!isSegmentStart) {
        return chunk;
      }

      return {
        ...chunk,
        label: chunk.activityName
      };
    });

    const rows = Array.from({ length: 24 }, (_, hour) => {
      const startIndex = hour * chunksPerHour;
      const endIndex = startIndex + chunksPerHour;
      return {
        hour,
        chunks: labeledAllChunks.slice(startIndex, endIndex)
      };
    }).filter((row) => row.chunks.some((chunk) => chunk.activityId));

    const legendItems = Array.from(durationByActivity.entries())
      .map(([activityId, item]) => ({
        activityId,
        activityName: item.activityName,
        color: item.color,
        duration: item.duration
      }))
      .sort((a, b) => b.duration - a.duration);

    return {
      displayDate: new Date(rangeStart),
      rows,
      legendItems
    };
  }, [rangeStart, filteredLogs, categories, viewType, matrixRange]);

  // Keep recent ranges when navigating away and back; review/template changes invalidate them.
  const [getCachedCheckStats] = useState(createCheckStatsCache);
  const checkStats = useMemo(() => viewType === 'check'
    ? getCachedCheckStats({ dailyReviews, checkTemplates, rangeStart, rangeEnd })
    : EMPTY_CHECK_STATS,
  [getCachedCheckStats, checkTemplates, dailyReviews, rangeEnd, rangeStart, viewType]);

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
      className={`${isFullScreen ? 'fixed inset-0 z-50 bg-stone-50 pt-[var(--app-safe-area-top)] pb-[env(safe-area-inset-bottom)]' : 'h-full bg-[#faf9f6]'} flex flex-col overflow-hidden animate-in slide-in-from-right duration-300`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => { touchStart.current = null; touchEnd.current = null; }}
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
                {!hideRangeControls && viewType === 'matrix' && (
                  <div className="flex bg-stone-100/50 p-0.5 rounded-lg w-fit">
                    {(['day', 'week'] as Array<'day' | 'week'>).map((r) => (
                      <button
                        key={r}
                        onClick={() => setMatrixRange(r)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${matrixRange === r ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                      >
                        {r === 'day' ? '日' : '周'}
                      </button>
                    ))}
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
                {!hideRangeControls && viewType === 'emoji' && (
                  <div className="flex bg-stone-100/50 p-0.5 rounded-lg w-fit">
                    <button
                      onClick={() => setEmojiRange('month')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${emojiRange === 'month' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                      月
                    </button>
                    <button
                      onClick={() => setEmojiRange('year')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${emojiRange === 'year' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
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
                      aria-label="上一时间段"
                      className="p-1.5 rounded-md transition-all text-stone-400 hover:text-stone-800 hover:bg-white"
                      title="涓婁竴涓椂闂存"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => handleNavigateDate('next')}
                      aria-label="下一时间段"
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
              matrixRange={matrixRange}
              editorialTimeline={editorialTimeline}
            />
          )}

          {/* --- Schedule View Content --- */}
          {viewType === 'schedule' && (
            <ScheduleView
              filteredLogs={filteredLogs}
              categories={categories}
              scheduleRange={scheduleRange}
              scheduleStyle={scheduleStyle}
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
        title="导出统计文本"
        description={copyFailureModal.text}
        confirmText="复制内容"
        cancelText="关闭"
        type="info"
      />
    </div >
  );
};

