/**
 * @file DailyCheckOverviewView.tsx
 * @input Daily-check templates, daily reviews, logs, and filter context
 * @output Grouped daily-check overview with continuous records and detail navigation
 * @pos View (Daily Check)
 * @description Presents the three daily-check types in a compact editorial list while preserving the existing review data flow.
 * @created 2026-08-09
 * @updated 2026-08-09: Added the first daily-check overview page.
 * @updated 2026-08-09: Moved continuous records to the row's right side and removed semantic icon replacement.
 */
import React, { useMemo } from 'react';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
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
import { DailyCheckIcon, getDailyCheckIconTone } from '../components/DailyCheckIcon';
import {
  formatDurationMinutes,
  getDailyCheckDisplayType,
  getDailyCheckHistory,
  getDailyCheckItemForDate,
  getDailyCheckTypeLabel,
  isDailyCheckComplete
} from '../utils/dailyCheckStatsUtils';
import { formatTimeValue } from '../utils/autoCheckUtils';

interface DailyCheckOverviewViewProps {
  checkTemplates: CheckTemplate[];
  dailyReviews: DailyReview[];
  reviewTemplates: ReviewTemplate[];
  logs: Log[];
  categories: Category[];
  scopes: Scope[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  currentDate: Date;
  onUpdateDailyReview: (review: DailyReview) => void;
  onOpenDetail: (itemId: string) => void;
  onBack: () => void;
}

interface DailyCheckGroup {
  template: CheckTemplate;
  items: CheckItem[];
}

export const DailyCheckOverviewView: React.FC<DailyCheckOverviewViewProps> = ({
  checkTemplates,
  dailyReviews,
  reviewTemplates,
  logs,
  categories,
  scopes,
  todos,
  todoCategories,
  currentDate,
  onUpdateDailyReview,
  onOpenDetail,
  onBack
}) => {
  const filterContext = useMemo(() => ({
    categories,
    scopes,
    todos,
    todoCategories
  }), [categories, scopes, todoCategories, todos]);

  const groups = useMemo<DailyCheckGroup[]>(() => (
    [...checkTemplates]
      .filter((template) => template.enabled && template.isDaily)
      .sort((a, b) => a.order - b.order)
      .map((template) => ({
        template,
        items: template.items
          .filter((item) => item.enabled !== false)
          .map((item) => getDailyCheckItemForDate({
            itemId: item.id,
            date: currentDate,
            dailyReviews,
            checkTemplates,
            logs,
            filterContext
          }))
          .filter((item): item is CheckItem => Boolean(item))
      }))
      .filter((group) => group.items.length > 0)
  ), [checkTemplates, currentDate, dailyReviews, filterContext, logs]);

  const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0);
  const completedItems = groups.reduce(
    (sum, group) => sum + group.items.filter(isDailyCheckComplete).length,
    0
  );

  const formatCount = (value: number): string => (
    Number.isInteger(value) ? String(value) : value.toFixed(1)
  );

  const formatOverviewValue = (
    type: ReturnType<typeof getDailyCheckDisplayType>,
    value: number | null
  ): string | null => {
    if (value === null || type === 'binary') {
      return null;
    }
    if (type === 'duration') {
      return formatDurationMinutes(value);
    }
    if (type === 'time') {
      return formatTimeValue(value);
    }
    return formatCount(value);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#faf9f6] text-stone-900">
      <header className="flex shrink-0 items-center justify-between border-b border-stone-200/80 px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-white hover:text-stone-900"
          title="返回"
          aria-label="返回"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <div className="text-lg font-semibold tracking-wide">日课总览</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-[0.24em] text-stone-400">
            {completedItems}/{totalItems || 0} 完成
          </div>
        </div>
        <div className="w-9 text-right text-xs tabular-nums text-stone-400">
          {currentDate.getMonth() + 1}/{currentDate.getDate()}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-5 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {groups.length === 0 ? (
            <div className="border-y border-stone-200 py-20 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
                <Check size={22} />
              </div>
              <h2 className="text-base font-semibold text-stone-700">还没有启用的日课</h2>
              <p className="mt-2 text-sm text-stone-400">请先在设置中添加日课模板。</p>
            </div>
          ) : (
            <div className="space-y-8">
              {groups.map((group) => {
                const completed = group.items.filter(isDailyCheckComplete).length;
                return (
                  <section key={group.template.id}>
                    <div className="mb-3 flex items-end justify-between border-b border-stone-300 pb-2">
                      <h2 className="text-sm font-semibold tracking-wide text-stone-800">
                        {group.template.title}
                      </h2>
                      <span className="text-xs tabular-nums text-stone-500">
                        {completed}/{group.items.length} 完成
                      </span>
                    </div>

                    <div className="divide-y divide-stone-200/80 border-b border-stone-200/80">
                      {group.items.map((item) => {
                        const type = getDailyCheckDisplayType(item);
                        const tone = getDailyCheckIconTone(type);
                        const history = getDailyCheckHistory({
                          itemId: item.id,
                          anchorDate: currentDate,
                          dailyReviews,
                          checkTemplates,
                          logs,
                          filterContext
                        });
                        const value = history[history.length - 1]?.value ?? null;
                        const displayValue = formatOverviewValue(type, value);

                        return (
                          <div
                            key={item.id}
                            className="group flex w-full items-center gap-3 py-4 text-left transition-colors hover:bg-white/60"
                          >
                            <button
                              type="button"
                              onClick={() => onOpenDetail(item.id)}
                              className="flex min-w-0 flex-1 items-center gap-3 text-left"
                              aria-label={`查看${item.content}详情`}
                            >
                              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone.surface} ${tone.icon}`}>
                                <DailyCheckIcon
                                  content={item.content}
                                  icon={item.icon}
                                  uiIcon={item.uiIcon}
                                  size={21}
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[15px] font-semibold text-stone-800">
                                  {item.content}
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-[11px] text-stone-400">
                                  <span>{getDailyCheckTypeLabel(item)}</span>
                                </div>
                              </div>
                            </button>

                            <div className="flex shrink-0 items-center gap-2">
                              <div className="flex items-center gap-0.5" aria-label="近 7 天记录">
                                {history.map((point) => {
                                  const hasValue = point.value !== null && point.value > 0;
                                  return (
                                    <span
                                      key={point.dateLabel}
                                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                        point.isCompleted
                                          ? `${tone.surface} ${tone.text} border-transparent`
                                          : hasValue
                                            ? `${tone.surface} ${tone.text} border-transparent opacity-60`
                                            : 'border-stone-300 bg-transparent text-transparent'
                                      }`}
                                      title={`${point.dateLabel}${point.isCompleted ? ' 已完成' : hasValue ? ' 有记录' : ' 未记录'}`}
                                    >
                                      {point.isCompleted && <Check size={10} strokeWidth={2.5} />}
                                    </span>
                                  );
                                })}
                              </div>

                              {displayValue && (
                                <span className="min-w-16 text-right text-xl font-semibold tabular-nums text-stone-800">
                                  {displayValue}
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => onOpenDetail(item.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-300 transition-colors hover:bg-white hover:text-stone-700"
                                title="查看详情"
                                aria-label={`查看${item.content}详情`}
                              >
                                <ChevronRight size={17} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </main>

    </div>
  );
};
