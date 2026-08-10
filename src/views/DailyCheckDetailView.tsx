/**
 * @file DailyCheckDetailView.tsx
 * @input Daily-check item id, templates, daily reviews, logs, and filter context
 * @output Type-specific daily-check statistics detail page with monthly heatmap
 * @pos View (Daily Check)
 * @description Shows one daily check's current progress, editable manual state, monthly heatmap, and trend chart without secondary statistic tabs.
 * @created 2026-08-09
 * @updated 2026-08-09: Added binary, count, duration, and automatic-time detail presentations.
 * @updated 2026-08-09: Removed nested cards and restored the monthly heatmap section.
 * @updated 2026-08-09: Added daily-review-only unknown states, manual editing, month switching, and trends.
 * @updated 2026-08-09: Uses all effective historical records for aggregate statistics and supports temporary manual backfill from the month grid.
 * @updated 2026-08-10: Replaces missing daily-check value placeholders with a compact slash.
 * @updated 2026-08-10: Defers aggregate statistics until the current-month view has painted and renders operator-aware automatic targets.
 * @updated 2026-08-10: Reuses each daily check's theme color for its progress ring, heatmap, and trend.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, LoaderCircle, Target } from 'lucide-react';
import {
  Category,
  CheckItem,
  CheckTemplate,
  DailyReview,
  Log,
  ReviewTemplate,
  Scope,
  TodoCategory,
  TodoItem
} from '../types';
import { CountInputModal } from '../components/CountInputModal';
import { HeatmapCalendar } from '../components/HeatmapCalendar';
import {
  formatDurationMinutes,
  getAverageValue,
  getCompletionRate,
  getCurrentStreak,
  getDailyCheckDisplayType,
  getDailyCheckOverviewAnchorDate,
  getDailyCheckItemForDate,
  getDailyCheckMonthHistory,
  getDailyCheckRecordedHistory,
  getDailyCheckTemplateItem,
  getDailyCheckTarget,
  getDailyCheckTypeLabel,
  getDailyCheckHistory,
  isDailyCheckComplete
} from '../utils/dailyCheckStatsUtils';
import {
  applyDailyCheckActionForDate,
  getCheckItemCountState,
  getDailyCheckTemplateMeta
} from '../utils/dailyCheckUtils';
import { getDailyCheckIconTone } from '../components/DailyCheckIcon';
import { formatTimeValue } from '../utils/autoCheckUtils';
import { getDailyCheckColorValues } from '../utils/dailyCheckColorUtils';
import { FilterContext } from '../utils/filterUtils';
import { getLocalDateStr } from '../utils/dateUtils';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis
} from 'recharts';

interface DailyCheckDetailViewProps {
  itemId: string | null;
  checkTemplates: CheckTemplate[];
  reviewTemplates: ReviewTemplate[];
  dailyReviews: DailyReview[];
  logs: Log[];
  categories: Category[];
  scopes: Scope[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  currentDate: Date;
  onUpdateDailyReview: (review: DailyReview) => void;
  onBack: () => void;
}

const formatCount = (value: number): string => (
  Number.isInteger(value) ? String(value) : value.toFixed(1)
);

const formatMetricValue = (type: ReturnType<typeof getDailyCheckDisplayType>, value: number | null): string => {
  if (value === null) {
    return '/';
  }

  if (type === 'duration') {
    return formatDurationMinutes(value);
  }

  if (type === 'count') {
    return formatCount(value);
  }

  if (type === 'time') {
    return formatTimeValue(value);
  }

  return value > 0 ? '已完成' : '待完成';
};

const formatTargetValue = (item: CheckItem, type: ReturnType<typeof getDailyCheckDisplayType>, target: number): string => {
  const operator = item.type === 'auto' ? item.autoConfig?.operator : undefined;
  const operatorLabel = operator ? `${operator} ` : '';

  if (type === 'duration') {
    return `目标 ${operatorLabel}${formatDurationMinutes(target)}`;
  }

  if (type === 'count') {
    return `目标 ${formatCount(target)} 次`;
  }

  if (type === 'time') {
    return `目标 ${operatorLabel}${formatTimeValue(target)}`;
  }

  return '每日完成一次';
};

const DailyCheckDetailContent: React.FC<DailyCheckDetailViewProps> = ({
  itemId,
  checkTemplates,
  reviewTemplates,
  dailyReviews,
  logs,
  categories,
  scopes,
  todos,
  todoCategories,
  currentDate,
  onUpdateDailyReview,
  onBack
}) => {
  const [heatmapMonth, setHeatmapMonth] = useState(() => new Date(currentDate));
  const [isCountInputOpen, setIsCountInputOpen] = useState(false);
  const [isBackfillMode, setIsBackfillMode] = useState(false);
  const [isAggregateReady, setIsAggregateReady] = useState(false);
  const filterContext = useMemo<FilterContext>(() => ({
    categories,
    scopes,
    todos,
    todoCategories
  }), [categories, scopes, todoCategories, todos]);

  const templateItem = useMemo(() => (
    itemId
      ? getDailyCheckTemplateItem(checkTemplates, itemId)
      : null
  ), [checkTemplates, itemId]);

  const displayDate = useMemo(() => (
    templateItem ? getDailyCheckOverviewAnchorDate(templateItem, currentDate) : currentDate
  ), [currentDate, templateItem]);

  useEffect(() => {
    setIsAggregateReady(false);
    let secondFrame: number | null = null;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setIsAggregateReady(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) {
        window.cancelAnimationFrame(secondFrame);
      }
    };
  }, [itemId]);

  const currentItem = useMemo(() => (
    itemId
      ? getDailyCheckItemForDate({
        itemId,
        date: displayDate,
        dailyReviews,
        checkTemplates,
        logs,
        filterContext
      })
      : null
  ), [checkTemplates, dailyReviews, displayDate, filterContext, itemId, logs]);

  const history = useMemo(() => (
    itemId
      ? getDailyCheckHistory({
        itemId,
        anchorDate: displayDate,
        days: 7,
        dailyReviews,
        checkTemplates,
        logs,
        filterContext
      })
      : []
  ), [checkTemplates, dailyReviews, displayDate, filterContext, itemId, logs]);

  const monthHistory = useMemo(() => (
    itemId
      ? getDailyCheckMonthHistory({
        itemId,
        anchorDate: heatmapMonth,
        dailyReviews,
        checkTemplates,
        logs,
        filterContext
      })
      : []
  ), [checkTemplates, dailyReviews, filterContext, heatmapMonth, itemId, logs]);

  const trendHistory = useMemo(() => (
    itemId && isAggregateReady
      ? getDailyCheckHistory({
        itemId,
        anchorDate: displayDate,
        days: 30,
        dailyReviews,
        checkTemplates,
        logs,
        filterContext
      })
      : []
  ), [checkTemplates, dailyReviews, displayDate, filterContext, isAggregateReady, itemId, logs]);

  const recordedHistory = useMemo(() => (
    itemId && isAggregateReady
      ? getDailyCheckRecordedHistory({
        itemId,
        anchorDate: displayDate,
        dailyReviews,
        checkTemplates,
        logs,
        filterContext
      })
      : []
  ), [checkTemplates, dailyReviews, displayDate, filterContext, isAggregateReady, itemId, logs]);

  if (!templateItem || !itemId) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-[#faf9f6] text-stone-900">
        <header className="flex shrink-0 items-center border-b border-stone-200/80 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-white hover:text-stone-900"
            title="返回"
            aria-label="返回"
          >
            <ArrowLeft size={20} />
          </button>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 text-center">
          <div>
            <h1 className="text-lg font-semibold text-stone-800">找不到这条日课</h1>
            <p className="mt-2 text-sm text-stone-400">它可能已经从日课模板中移除。</p>
          </div>
        </main>
      </div>
    );
  }

  const item = templateItem;
  const type = getDailyCheckDisplayType(item);
  const tone = getDailyCheckIconTone(type);
  const currentValue = history[history.length - 1]?.value ?? null;
  const target = getDailyCheckTarget(item);
  const completionRate = isAggregateReady ? getCompletionRate(recordedHistory) : null;
  const currentStreak = isAggregateReady ? getCurrentStreak(recordedHistory, displayDate) : null;
  const averageValue = isAggregateReady ? getAverageValue(recordedHistory) : null;
  const isManual = item.type !== 'auto';
  const currentIsCompleted = history[history.length - 1]?.isCompleted ?? false;
  const progress = type === 'binary' || type === 'time'
    ? (currentIsCompleted ? 100 : 0)
    : target > 0 && currentValue !== null ? Math.min(100, (currentValue / target) * 100) : 0;
  const numericValues = recordedHistory.flatMap((point) => point.value === null ? [] : [point.value]);
  const totalValue = isAggregateReady ? numericValues.reduce((sum, value) => sum + value, 0) : null;
  const recordedDays = isAggregateReady ? recordedHistory.length : null;
  const completedDays = isAggregateReady ? recordedHistory.filter((point) => point.isCompleted).length : null;
  const heatmapData = new Map<number, {
    value: number | null;
    hasRecord: boolean;
    isCompleted: boolean;
  }>();
  monthHistory.forEach((point) => {
    if (!point.inMonth) {
      return;
    }
    heatmapData.set(
      point.date.getDate(),
      {
        value: point.value,
        hasRecord: point.hasRecord,
        isCompleted: point.isCompleted
      }
    );
  });
  const templateColor = getDailyCheckColorValues(
    getDailyCheckTemplateMeta(checkTemplates, item.id)?.color
  );
  const heatmapAccent = templateColor?.primary || (type === 'duration'
    ? '#7c3aed'
    : type === 'count'
      ? '#0284c7'
      : type === 'time'
        ? '#d97706'
        : '#059669');
  const trendData = trendHistory.map((point) => ({
    label: point.dateLabel,
    value: point.value === null
      ? null
      : type === 'binary'
        ? (point.isCompleted ? 1 : 0)
        : point.value
  }));

  const handleManualToggle = () => {
    if (!isManual || type !== 'binary') {
      return;
    }
    const result = applyDailyCheckActionForDate({
      dateStr: getLocalDateStr(currentDate),
      dailyReviews,
      checkTemplates,
      reviewTemplates,
      checkItemId: item.id,
      actionMode: 'toggle'
    });
    if (result.updatedReview) {
      onUpdateDailyReview(result.updatedReview);
    }
  };

  const handleCountConfirm = (count: number) => {
    const current = currentItem ? getCheckItemCountState(currentItem).current : 0;
    let workingReviews = dailyReviews;
    let latestReview: DailyReview | undefined;

    if (count < current) {
      const resetResult = applyDailyCheckActionForDate({
        dateStr: getLocalDateStr(currentDate),
        dailyReviews: workingReviews,
        checkTemplates,
        reviewTemplates,
        checkItemId: item.id,
        actionMode: 'reset'
      });
      workingReviews = resetResult.updatedReviews || workingReviews;
      latestReview = resetResult.updatedReview;
    }

    const startCount = count < current ? 0 : current;
    for (let index = startCount; index < count; index += 1) {
      const incrementResult = applyDailyCheckActionForDate({
        dateStr: getLocalDateStr(currentDate),
        dailyReviews: workingReviews,
        checkTemplates,
        reviewTemplates,
        checkItemId: item.id,
        actionMode: 'increment'
      });
      workingReviews = incrementResult.updatedReviews || workingReviews;
      latestReview = incrementResult.updatedReview || latestReview;
    }

    if (latestReview) {
      onUpdateDailyReview(latestReview);
    }
    setIsCountInputOpen(false);
  };

  const handleBackfillDay = (day: number) => {
    if (!isManual) {
      return;
    }

    const date = new Date(heatmapMonth.getFullYear(), heatmapMonth.getMonth(), day);
    if (getLocalDateStr(date) > getLocalDateStr(new Date())) {
      return;
    }

    const result = applyDailyCheckActionForDate({
      dateStr: getLocalDateStr(date),
      dailyReviews,
      checkTemplates,
      reviewTemplates,
      checkItemId: item.id,
      actionMode: type === 'count' ? 'cycle' : 'toggle'
    });
    if (result.updatedReview) {
      onUpdateDailyReview(result.updatedReview);
    }
  };

  const stats = type === 'binary'
    ? [
        { label: '完成天数', value: completedDays === null || recordedDays === null ? '—' : `${completedDays}/${recordedDays}` },
      { label: '当前连续', value: currentStreak === null ? '—' : `${currentStreak} 天` },
      { label: '完成率', value: completionRate === null ? '—' : `${completionRate}%` }
    ]
    : type === 'time'
      ? [
        { label: '记录天数', value: recordedDays === null ? '—' : String(recordedDays) },
        { label: '达标天数', value: completedDays === null || recordedDays === null ? '—' : `${completedDays}/${recordedDays}` },
        { label: '完成率', value: completionRate === null ? '—' : `${completionRate}%` }
      ]
    : type === 'count'
      ? [
        { label: '总完成次数', value: totalValue === null ? '—' : formatCount(totalValue) },
        { label: '日均完成次数', value: averageValue === null ? '—' : formatCount(averageValue) },
        { label: '达标天数', value: completedDays === null || recordedDays === null ? '—' : `${completedDays}/${recordedDays}` }
      ]
      : [
        { label: '总时长', value: totalValue === null ? '—' : formatDurationMinutes(totalValue) },
        { label: '日均时长', value: averageValue === null ? '—' : formatDurationMinutes(averageValue) },
        { label: '达标天数', value: completedDays === null || recordedDays === null ? '—' : `${completedDays}/${recordedDays}` }
      ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#faf9f6] text-stone-900">
      <header className="relative flex shrink-0 items-center justify-center border-b border-stone-200/80 px-5 py-4 sm:px-8">
        <button
          type="button"
          onClick={onBack}
          className="absolute left-5 flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-white hover:text-stone-900 sm:left-8"
          title="返回"
          aria-label="返回"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="max-w-[70%] truncate text-base font-semibold text-stone-900">{item.content}</h1>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-12 pt-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <section className="flex items-center justify-between border-y border-stone-200 py-6">
            <div className="min-w-0">
              <div className="text-sm text-stone-500">今日记录</div>
              <div className="mt-3 truncate text-3xl font-semibold tracking-tight text-stone-900">
                {currentValue === null ? '/' : formatMetricValue(type, currentValue)}
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-stone-500">
                <Target size={15} />
                <span>{formatTargetValue(item, type, target)}</span>
              </div>
              {isManual && type === 'binary' && (
                <button
                  type="button"
                  onClick={handleManualToggle}
                  className={`mt-4 inline-flex items-center gap-2 border-b pb-1 text-sm transition-colors ${
                    currentIsCompleted ? 'border-emerald-500 text-emerald-700' : 'border-stone-300 text-stone-500 hover:border-stone-700 hover:text-stone-900'
                  }`}
                  title="切换今日完成状态"
                >
                  {currentIsCompleted && <Check size={14} />}
                  {currentItem ? (currentIsCompleted ? '已完成' : '待完成') : '/'}
                </button>
              )}
              {isManual && type === 'count' && (
                <button
                  type="button"
                  onClick={() => setIsCountInputOpen(true)}
                  className="mt-4 border-b border-stone-300 pb-1 text-sm text-stone-500 transition-colors hover:border-stone-700 hover:text-stone-900"
                  title="修改今日次数"
                >
                  修改今日次数
                </button>
              )}
            </div>

            <div
              className={`relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full ${tone.surface}`}
              style={{
                background: `conic-gradient(currentColor ${progress}%, #eeeae4 ${progress}% 100%)`,
                color: heatmapAccent
              }}
              aria-label={`今日完成度 ${Math.round(progress)}%`}
            >
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white text-center">
                <span className="text-lg font-semibold tabular-nums text-stone-800">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-3 divide-x divide-stone-200 border-b border-stone-200 px-2 py-5">
            {stats.map((stat) => (
              <div key={stat.label} className="min-w-0 px-3 text-center">
                <div className="truncate text-xl font-semibold tabular-nums text-stone-900">{stat.value}</div>
                <div className="mt-1 text-xs text-stone-400">{stat.label}</div>
              </div>
            ))}
          </section>

          <section className="border-b border-stone-200 py-6">
            <HeatmapCalendar
              year={heatmapMonth.getFullYear()}
              month={heatmapMonth.getMonth()}
              data={heatmapData}
              accentColor={heatmapAccent}
              isBackfillMode={isBackfillMode}
              onBackfillModeChange={isManual ? setIsBackfillMode : undefined}
              onMonthChange={(offset) => {
                setHeatmapMonth((previous) => {
                  const next = new Date(previous);
                  next.setMonth(next.getMonth() + offset);
                  return next;
                });
              }}
              onDayClick={isManual ? handleBackfillDay : undefined}
              getDayCaption={(_day, point) => {
                if (!point.hasRecord || point.value === null || type === 'binary') {
                  return null;
                }
                if (type === 'duration') {
                  return formatDurationMinutes(point.value);
                }
                if (type === 'count') {
                  return `${formatCount(point.value)}次`;
                }
                return formatTimeValue(point.value);
              }}
              getDayTitle={(day, point) => {
                if (!point.hasRecord) return `${heatmapMonth.getMonth() + 1}/${day} 无记录`;
                if (point.value === null) return `${heatmapMonth.getMonth() + 1}/${day} 未完成`;
                return `${heatmapMonth.getMonth() + 1}/${day} ${formatMetricValue(type, point.value)}`;
              }}
            />
          </section>

          <section className="py-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h2 className="text-sm font-semibold text-stone-800">趋势</h2>
              <span className="text-xs text-stone-400">近 30 天 · {getDailyCheckTypeLabel(item)}</span>
            </div>
            <div className="mt-5 h-52 w-full select-none pointer-events-none">
              {isAggregateReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  {type === 'binary' ? (
                  <LineChart data={trendData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} accessibilityLayer={false}>
                    <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a8a29e' }} interval={4} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 1]} ticks={[0, 1]} tickFormatter={(value) => value === 1 ? '完成' : '未完成'} tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                    <Line type="monotone" dataKey="value" connectNulls={false} stroke="#059669" strokeWidth={2} dot={{ r: 3, fill: '#059669' }} />
                  </LineChart>
                  ) : (
                  <BarChart data={trendData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} accessibilityLayer={false}>
                    <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a8a29e' }} interval={4} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(value) => type === 'time' ? formatTimeValue(value) : String(value)} tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                    <Bar dataKey="value" fill={heatmapAccent} radius={[4, 4, 0, 0]} maxBarSize={14} />
                  </BarChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="h-full border-y border-stone-100 bg-white/40" aria-label="正在计算趋势" />
              )}
            </div>
          </section>
        </div>
      </main>

      <CountInputModal
        isOpen={isCountInputOpen}
        currentCount={currentItem ? getCheckItemCountState(currentItem).current : 0}
        targetCount={getCheckItemCountState(item).target}
        itemContent={item.content}
        onClose={() => setIsCountInputOpen(false)}
        onConfirm={handleCountConfirm}
      />
    </div>
  );
};

const DailyCheckDetailLoading: React.FC = () => (
  <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-[#faf9f6] text-stone-500">
    <LoaderCircle size={24} className="animate-spin" aria-hidden="true" />
    <div className="text-sm font-medium">正在读取日课数据</div>
  </div>
);

export const DailyCheckDetailView: React.FC<DailyCheckDetailViewProps> = (props) => {
  const [isContentReady, setIsContentReady] = useState(false);

  useEffect(() => {
    setIsContentReady(false);
    const frame = window.requestAnimationFrame(() => {
      setIsContentReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [props.itemId]);

  return isContentReady
    ? <DailyCheckDetailContent {...props} />
    : <DailyCheckDetailLoading />;
};
