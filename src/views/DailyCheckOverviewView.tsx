/**
 * @file DailyCheckOverviewView.tsx
 * @updated 2026-08-28: Resolves legacy template items without persisted IDs using their stable template keys.
 * @input Daily-check templates, daily reviews, logs, and filter context
 * @output Grouped daily-check overview with continuous records and detail navigation
 * @pos View (Daily Check)
 * @description Presents daily-check templates in a compact editorial list while preserving daily-review-only state.
 * @created 2026-08-09
 * @updated 2026-08-09: Added the first daily-check overview page.
 * @updated 2026-08-09: Moved continuous records to the row's right side and removed semantic icon replacement.
 * @updated 2026-08-09: Shows five history cells only for manual checks and keeps missing reviews distinct.
 * @updated 2026-08-09: Unified the header height and applied per-item template colors.
 * @updated 2026-08-10: Reads nightEarliestStart rows from the previous night's review while retaining today for other checks.
 * @updated 2026-08-11: Keeps overview rows transparent in dark mode so the list reads as one continuous surface.
 * @updated 2026-09-08: Restores the overview scroll position after returning from item details.
 */
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
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
import { DailyCheckIcon, getDailyCheckIconTone } from '../components/DailyCheckIcon';
import {
  formatDurationMinutes,
  getDailyCheckOverviewAnchorDate,
  getDailyCheckDisplayType,
  getDailyCheckHistory,
  getDailyCheckTemplateItem,
  getDailyCheckTypeLabel
} from '../utils/dailyCheckStatsUtils';
import { formatTimeValue } from '../utils/autoCheckUtils';
import { getDailyCheckColorValues } from '../utils/dailyCheckColorUtils';
import { getCheckTemplateItemKey } from '../utils/dailyCheckUtils';

interface DailyCheckOverviewViewProps {
  checkTemplates: CheckTemplate[];
  dailyReviews: DailyReview[];
  logs: Log[];
  categories: Category[];
  scopes: Scope[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  currentDate: Date;
  onOpenDetail: (itemId: string) => void;
  onBack: () => void;
  initialScrollTop?: number;
  onScrollPositionChange?: (scrollTop: number) => void;
}

interface DailyCheckGroup {
  template: CheckTemplate;
  items: CheckItem[];
}

interface DailyCheckOverviewRow {
  item: CheckItem;
  type: ReturnType<typeof getDailyCheckDisplayType>;
  history: ReturnType<typeof getDailyCheckHistory>;
  displayValue: string | null;
  customColor: ReturnType<typeof getDailyCheckColorValues>;
}

export const DailyCheckOverviewView: React.FC<DailyCheckOverviewViewProps> = ({
  checkTemplates,
  dailyReviews,
  logs,
  categories,
  scopes,
  todos,
  todoCategories,
  currentDate,
  onOpenDetail,
  onBack,
  initialScrollTop = 0,
  onScrollPositionChange
}) => {
  const overviewScrollRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const restoreId = window.requestAnimationFrame(() => {
      if (overviewScrollRef.current) {
        overviewScrollRef.current.scrollTop = initialScrollTop;
      }
    });

    return () => window.cancelAnimationFrame(restoreId);
  }, [initialScrollTop]);

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
          .map((item, index) => getDailyCheckTemplateItem(
            checkTemplates,
            getCheckTemplateItemKey(template, item, index)
          ))
          .filter((item): item is CheckItem => Boolean(item))
      }))
      .filter((group) => group.items.length > 0)
  ), [checkTemplates]);

  const templateItemColors = useMemo(() => {
    const colors = new Map<string, string | undefined>();
    checkTemplates.forEach((template) => {
      template.items.forEach((item, index) => {
        colors.set(getCheckTemplateItemKey(template, item, index), item.color);
      });
    });
    return colors;
  }, [checkTemplates]);

  const formatCount = (value: number): string => (
    Number.isInteger(value) ? String(value) : value.toFixed(1)
  );

  const formatOverviewValue = (
    type: ReturnType<typeof getDailyCheckDisplayType>,
    value: number | null
  ): string | null => {
    if (type === 'binary') {
      return null;
    }
    if (value === null) {
      return '/';
    }
    if (type === 'duration') {
      return formatDurationMinutes(value);
    }
    if (type === 'time') {
      return formatTimeValue(value);
    }
    return formatCount(value);
  };

  const groupRows = useMemo(() => {
    const rowsByTemplateId = new Map<string, DailyCheckOverviewRow[]>();

    groups.forEach((group) => {
      rowsByTemplateId.set(group.template.id, group.items.map((item) => {
        const type = getDailyCheckDisplayType(item);
        const anchorDate = getDailyCheckOverviewAnchorDate(item, currentDate);
        const history = getDailyCheckHistory({
          itemId: item.id,
          anchorDate,
          days: item.type === 'auto' ? 1 : 5,
          dailyReviews,
          checkTemplates,
          logs,
          filterContext
        });
        const value = history[history.length - 1]?.value ?? null;
        const displayValue = item.type !== 'auto' && type === 'count'
          ? null
          : formatOverviewValue(type, value);

        return {
          item,
          type,
          history,
          displayValue,
          customColor: getDailyCheckColorValues(templateItemColors.get(item.id))
        };
      }));
    });

    return rowsByTemplateId;
  }, [checkTemplates, currentDate, dailyReviews, filterContext, groups, logs, templateItemColors]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#faf9f6] text-stone-900">
      <header className="grid h-14 shrink-0 grid-cols-[1.5rem_1fr_1.5rem] items-center border-b border-stone-200/80 px-4 sm:px-6">
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
        </div>
        <span aria-hidden="true" />
      </header>

      <main
        ref={overviewScrollRef}
        onScroll={() => onScrollPositionChange?.(overviewScrollRef.current?.scrollTop || 0)}
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-5 sm:px-6"
      >
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
                const rows = groupRows.get(group.template.id) || [];
                const completed = rows.filter((row) => row.history[row.history.length - 1]?.isCompleted).length;
                const hasOverviewRecord = rows.some((row) => row.history[row.history.length - 1]?.hasRecord);
                return (
                  <section key={group.template.id}>
                    <div className="mb-3 flex items-end justify-between border-b border-stone-300 pb-2">
                      <h2 className="text-sm font-semibold tracking-wide text-stone-800">
                        {group.template.title}
                      </h2>
                      <span className="text-xs tabular-nums text-stone-500">
                        {hasOverviewRecord ? `${completed}/${group.items.length} 完成` : `/${group.items.length} 完成`}
                      </span>
                    </div>

                    <div className="divide-y divide-stone-200/80 border-b border-stone-200/80">
                      {rows.map(({ item, type, history, displayValue, customColor }) => {
                        const tone = getDailyCheckIconTone(type);
                        const isManual = item.type !== 'auto';

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              onScrollPositionChange?.(overviewScrollRef.current?.scrollTop || 0);
                              onOpenDetail(item.id);
                            }}
                            className="daily-check-overview-list-row group flex w-full items-center gap-3 py-4 text-left transition-colors hover:bg-white/60 active:bg-stone-100/70"
                            aria-label={`查看${item.content}详情`}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <div
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${customColor ? '' : `${tone.surface} ${tone.icon}`}`}
                                style={customColor ? { backgroundColor: customColor.surface, color: customColor.primary } : undefined}
                              >
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
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              {isManual && (
                                <div className="flex items-center gap-0.5" aria-label="近 5 天记录">
                                  {history.map((point) => {
                                    const hasValue = point.value !== null && point.value > 0;
                                    const isCount = type === 'count';
                                    const circleContent = !point.hasRecord
                                      ? '/'
                                      : point.isCompleted
                                        ? <Check size={10} strokeWidth={2.5} />
                                        : isCount
                                          ? String(point.value ?? 0)
                                          : null;
                                    return (
                                      <span
                                        key={point.dateLabel}
                                        className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold ${
                                          !point.hasRecord
                                            ? 'border-stone-300 bg-transparent text-stone-400'
                                            : point.isCompleted
                                              ? `${customColor ? '' : `${tone.surface} ${tone.text}`} border-transparent`
                                              : isCount
                                                ? hasValue
                                                  ? `${customColor ? '' : `${tone.surface} ${tone.text}`} border-transparent opacity-60`
                                                  : 'border-stone-300 bg-transparent text-stone-500'
                                              : hasValue
                                                ? `${customColor ? '' : `${tone.surface} ${tone.text}`} border-transparent opacity-60`
                                                : 'border-stone-300 bg-transparent text-transparent'
                                        }`}
                                        style={customColor && point.hasRecord && (point.isCompleted || hasValue)
                                          ? { backgroundColor: customColor.surface, color: customColor.primary }
                                          : undefined}
                                        title={`${point.dateLabel}${!point.hasRecord ? ' /' : point.isCompleted ? ' 已完成' : isCount ? ` ${point.value ?? 0} 次` : hasValue ? ' 有记录' : ' 未完成'}`}
                                      >
                                        {circleContent}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}

                              {displayValue && (
                                <span className="min-w-16 text-right text-xl font-semibold tabular-nums text-stone-800">
                                  {displayValue}
                                </span>
                              )}

                              <span
                                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-300 transition-colors group-hover:bg-white group-hover:text-stone-700"
                                aria-hidden="true"
                              >
                                <ChevronRight size={17} />
                              </span>
                            </div>
                          </button>
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
