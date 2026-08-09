/**
 * @file DailyCheckDetailView.tsx
 * @input Daily-check item id, templates, daily reviews, logs, and filter context
 * @output Type-specific daily-check statistics detail page with monthly heatmap
 * @pos View (Daily Check)
 * @description Shows one daily check's current progress, rolling metrics, monthly heatmap, and recent records without secondary statistic tabs.
 * @created 2026-08-09
 * @updated 2026-08-09: Added binary, count, duration, and automatic-time detail presentations.
 * @updated 2026-08-09: Removed nested cards and restored the monthly heatmap section.
 */
import React, { useMemo } from 'react';
import { ArrowLeft, Target } from 'lucide-react';
import {
  Category,
  CheckItem,
  CheckTemplate,
  DailyReview,
  Log,
  Scope,
  TodoCategory,
  TodoItem
} from '../types';
import {
  formatDurationMinutes,
  getAverageValue,
  getCompletionRate,
  getCurrentStreak,
  getDailyCheckDisplayType,
  getDailyCheckItemForDate,
  getDailyCheckMonthHistory,
  getDailyCheckTarget,
  getDailyCheckTypeLabel,
  getDailyCheckHistory,
  isDailyCheckComplete
} from '../utils/dailyCheckStatsUtils';
import { getDailyCheckIconTone } from '../components/DailyCheckIcon';
import { formatTimeValue } from '../utils/autoCheckUtils';
import { FilterContext } from '../utils/filterUtils';

interface DailyCheckDetailViewProps {
  itemId: string | null;
  checkTemplates: CheckTemplate[];
  dailyReviews: DailyReview[];
  logs: Log[];
  categories: Category[];
  scopes: Scope[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  currentDate: Date;
  onBack: () => void;
}

const formatCount = (value: number): string => (
  Number.isInteger(value) ? String(value) : value.toFixed(1)
);

const formatMetricValue = (type: ReturnType<typeof getDailyCheckDisplayType>, value: number | null): string => {
  if (value === null) {
    return '未记录';
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

const formatTargetValue = (type: ReturnType<typeof getDailyCheckDisplayType>, target: number): string => {
  if (type === 'duration') {
    return `目标 ${formatDurationMinutes(target)}`;
  }

  if (type === 'count') {
    return `目标 ${formatCount(target)} 次`;
  }

  if (type === 'time') {
    return `目标 ${formatTimeValue(target)}`;
  }

  return '每日完成一次';
};

const HEATMAP_COLORS = {
  binary: ['bg-stone-100', 'bg-emerald-500'],
  count: ['bg-sky-100', 'bg-sky-500'],
  duration: ['bg-violet-100', 'bg-violet-500'],
  time: ['bg-amber-100', 'bg-amber-500']
} as const;

export const DailyCheckDetailView: React.FC<DailyCheckDetailViewProps> = ({
  itemId,
  checkTemplates,
  dailyReviews,
  logs,
  categories,
  scopes,
  todos,
  todoCategories,
  currentDate,
  onBack
}) => {
  const filterContext = useMemo<FilterContext>(() => ({
    categories,
    scopes,
    todos,
    todoCategories
  }), [categories, scopes, todoCategories, todos]);

  const item = useMemo(() => (
    itemId
      ? getDailyCheckItemForDate({
        itemId,
        date: currentDate,
        dailyReviews,
        checkTemplates,
        logs,
        filterContext
      })
      : null
  ), [checkTemplates, currentDate, dailyReviews, filterContext, itemId, logs]);

  const history = useMemo(() => (
    itemId
      ? getDailyCheckHistory({
        itemId,
        anchorDate: currentDate,
        days: 7,
        dailyReviews,
        checkTemplates,
        logs,
        filterContext
      })
      : []
  ), [checkTemplates, currentDate, dailyReviews, filterContext, itemId, logs]);

  const monthHistory = useMemo(() => (
    itemId
      ? getDailyCheckMonthHistory({
        itemId,
        anchorDate: currentDate,
        dailyReviews,
        checkTemplates,
        logs,
        filterContext
      })
      : []
  ), [checkTemplates, currentDate, dailyReviews, filterContext, itemId, logs]);

  if (!item || !itemId) {
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

  const type = getDailyCheckDisplayType(item);
  const tone = getDailyCheckIconTone(type);
  const currentValue = history[history.length - 1]?.value ?? null;
  const target = getDailyCheckTarget(item);
  const completionRate = getCompletionRate(history);
  const currentStreak = getCurrentStreak(history);
  const averageValue = getAverageValue(history);
  const progress = type === 'binary' || type === 'time'
    ? (isDailyCheckComplete(item) ? 100 : 0)
    : target > 0 && currentValue !== null ? Math.min(100, (currentValue / target) * 100) : 0;
  const numericValues = history.flatMap((point) => point.value === null ? [] : [point.value]);
  const heatmapValues = monthHistory.flatMap((point) => (
    point.inMonth && point.value !== null ? [point.value] : []
  ));
  const maxHeatmapValue = Math.max(target, ...heatmapValues, 1);
  const totalValue = numericValues.reduce((sum, value) => sum + value, 0);
  const completedDays = history.filter((point) => point.isCompleted).length;
  const heatmapColor = HEATMAP_COLORS[type];

  const getHeatmapCellClass = (point: typeof monthHistory[number]): string => {
    if (!point.inMonth) {
      return 'bg-transparent text-transparent';
    }
    if (point.value === null) {
      return 'bg-stone-100 text-stone-300';
    }
    if (type === 'binary' || type === 'time') {
      return point.isCompleted ? `${heatmapColor[1]} text-white` : `${heatmapColor[0]} text-stone-500`;
    }
    const ratio = maxHeatmapValue > 0 ? point.value / maxHeatmapValue : 0;
    if (ratio === 0) return 'bg-stone-100 text-stone-400';
    if (ratio < 0.25) return `${heatmapColor[0]} text-stone-600`;
    if (ratio < 0.5) return 'bg-opacity-60 text-stone-700 ' + heatmapColor[1];
    if (ratio < 0.75) return 'bg-opacity-80 text-white ' + heatmapColor[1];
    return `${heatmapColor[1]} text-white`;
  };

  const stats = type === 'binary'
    ? [
      { label: '完成天数', value: `${completedDays}/7` },
      { label: '当前连续', value: `${currentStreak} 天` },
      { label: '完成率', value: `${completionRate}%` }
    ]
    : type === 'time'
      ? [
        { label: '记录天数', value: `${history.filter((point) => point.value !== null).length}/7` },
        { label: '达标天数', value: `${completedDays}/7` },
        { label: '完成率', value: `${completionRate}%` }
      ]
    : type === 'count'
      ? [
        { label: '总次数', value: formatCount(totalValue) },
        { label: '日均次数', value: formatCount(averageValue) },
        { label: '达标天数', value: `${completedDays}/7` }
      ]
      : [
        { label: '总时长', value: formatDurationMinutes(totalValue) },
        { label: '日均时长', value: formatDurationMinutes(averageValue) },
        { label: '达标天数', value: `${completedDays}/7` }
      ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#faf9f6] text-stone-900">
      <header className="relative flex shrink-0 items-center justify-center border-b border-stone-200/80 px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="absolute left-4 flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-white hover:text-stone-900 sm:left-6"
          title="返回"
          aria-label="返回"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="max-w-[70%] truncate text-base font-semibold text-stone-900">{item.content}</h1>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-5 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <section className="flex items-center justify-between border-y border-stone-200 py-6">
            <div className="min-w-0">
              <div className="text-sm text-stone-500">今日记录</div>
              <div className="mt-3 truncate text-3xl font-semibold tracking-tight text-stone-900">
                {formatMetricValue(type, currentValue)}
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-stone-500">
                <Target size={15} />
                <span>{formatTargetValue(type, target)}</span>
              </div>
            </div>

            <div
              className={`relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full ${tone.surface}`}
              style={{
                background: `conic-gradient(currentColor ${progress}%, #eeeae4 ${progress}% 100%)`,
                color: type === 'count'
                  ? '#0369a1'
                  : type === 'duration'
                    ? '#6d28d9'
                    : type === 'time'
                      ? '#b45309'
                      : '#047857'
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
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-800">{currentDate.getFullYear()} 年 {currentDate.getMonth() + 1} 月</h2>
              <span className="text-xs text-stone-400">月度热力图</span>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[10px] text-stone-400">
              {['一', '二', '三', '四', '五', '六', '日'].map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
              {monthHistory.map((point) => (
                <div
                  key={`${point.dateLabel}-${point.date.getTime()}`}
                  className={`flex aspect-square items-center justify-center rounded-sm text-[11px] tabular-nums ${getHeatmapCellClass(point)}`}
                  title={point.inMonth ? `${point.dateLabel} ${formatMetricValue(type, point.value)}` : undefined}
                >
                  {point.inMonth ? point.date.getDate() : ''}
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-stone-400">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-stone-100" />未记录</span>
              <span className="flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded-sm ${heatmapColor[0]}`} />有记录</span>
              <span className="flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded-sm ${heatmapColor[1]}`} />达标</span>
            </div>
          </section>

          <section className="py-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h2 className="text-sm font-semibold text-stone-800">近 7 天记录</h2>
              <span className="text-xs text-stone-400">{getDailyCheckTypeLabel(item)}</span>
            </div>

            <div className="divide-y divide-stone-100">
              {history.map((point) => (
                <div key={`${point.dateLabel}-detail`} className="flex items-center justify-between py-3 text-sm">
                  <span className="tabular-nums text-stone-500">{point.dateLabel}</span>
                  <span className={point.isCompleted ? 'font-medium text-stone-800' : 'text-stone-400'}>
                    {type === 'binary'
                      ? point.isCompleted ? '已完成' : '未完成'
                      : formatMetricValue(type, point.value)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
