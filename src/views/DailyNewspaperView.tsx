/**
 * @file DailyNewspaperView.tsx
 * @input Daily Review newspaper payload, real logs, categories, todos, scopes, and the target date
 * @output Full-screen editorial newspaper page for one day
 * @pos View (Review System)
 * @description Renders a dedicated daily AI newspaper page based on lightweight Daily Review storage plus real timeline data resolved by log ID.
 * @updated 2026-05-16: Switched per-log metadata to shared timeline-style pills, kept only notes as body text, tightened typography, and rendered all real logs for the target day while preserving orphaned annotations whose source logs were later deleted.
 * @updated 2026-05-16: Added the first dedicated daily newspaper full-screen view inspired by the chronos-ai reference demo.
 */
import React, { useMemo } from 'react';
import type { Category, DailyReview, Log, Scope, TodoItem } from '../types';
import { getLocalDateStr, getLocalTimeStr } from '../utils/dateUtils';
import { formatDuration } from '../utils/reviewStatsUtils';
import { getParentTodo } from '../utils/todoHierarchyUtils';

interface DailyNewspaperViewProps {
  review: DailyReview;
  date: Date;
  logs: Log[];
  categories: Category[];
  todos: TodoItem[];
  scopes: Scope[];
}

interface TimelineRow {
  logId: string;
  log: Log | null;
}

const formatDateLabel = (date: Date): string => (
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(date)
);

export const DailyNewspaperView: React.FC<DailyNewspaperViewProps> = ({
  review,
  date,
  logs,
  categories,
  todos,
  scopes
}) => {
  const newspaper = review.aiNewspaper;

  const activityMap = useMemo(() => (
    new Map(
      categories.flatMap((category) => category.activities.map((activity) => [activity.id, activity] as const))
    )
  ), [categories]);

  const timelineRows = useMemo<TimelineRow[]>(() => {
    if (!newspaper) {
      return [];
    }

    const targetDate = getLocalDateStr(date);
    const logMap = new Map(logs.map((log) => [log.id, log]));
    const dayLogs = logs
      .filter((log) => (
        getLocalDateStr(new Date(log.startTime)) === targetDate
        || getLocalDateStr(new Date(log.endTime)) === targetDate
      ))
      .sort((left, right) => left.startTime - right.startTime);
    const renderedLogIds = new Set(dayLogs.map((log) => log.id));
    const orphanedAnnotationRows = newspaper.annotations
      .filter((annotation) => !renderedLogIds.has(annotation.logId))
      .map((annotation) => ({
        logId: annotation.logId,
        log: logMap.get(annotation.logId) || null
      }));

    return [
      ...dayLogs.map((log) => ({ logId: log.id, log })),
      ...orphanedAnnotationRows
    ];
  }, [date, logs, newspaper]);

  const annotationMap = useMemo(() => (
    new Map(
      (newspaper?.annotations || []).map((annotation) => [annotation.logId, annotation.comment])
    )
  ), [newspaper]);

  if (!newspaper) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f8f7f5] px-6">
        <div className="max-w-md text-center text-sm leading-7 text-stone-500">
          这一天还没有生成 AI 小报。
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f8f7f5]">
      <div className="mx-auto min-h-full w-full max-w-3xl bg-white px-6 pb-16 pt-7 shadow-[0_10px_40px_rgba(15,23,42,0.04)] sm:px-10 sm:pt-8">
        <header className="border-b border-[#efede8] pb-5">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#91867a]">
            {formatDateLabel(date)}
          </div>
          <h1 className="mt-2 font-serif text-[2rem] font-medium tracking-tight text-black sm:text-[2.55rem]">
            {newspaper.title}
          </h1>
          <p className="mt-2 max-w-2xl font-serif text-[15px] leading-7 text-[#4a433d] sm:text-base">
            {newspaper.overallComment}
          </p>
        </header>

        <main className="pt-7">
          <div className="relative pl-7">
            <div className="absolute bottom-4 left-0 top-4 w-px bg-[#e4e0d9]" />
            <div className="space-y-7">
              {timelineRows.length === 0 ? (
                <div className="py-10 text-sm leading-7 text-stone-500">
                  这一天的小报已经存在，但当前没有可渲染的时间轴内容。
                </div>
              ) : (
                timelineRows.map((row) => {
                  const log = row.log;
                  const comment = annotationMap.get(row.logId) || '';
                  const category = log ? categories.find((item) => item.id === log.categoryId) : undefined;
                  const activity = log ? activityMap.get(log.activityId) : undefined;
                  const linkedTodo = log?.linkedTodoId
                    ? todos.find((item) => item.id === log.linkedTodoId)
                    : undefined;
                  const parentTodo = linkedTodo ? getParentTodo(todos, linkedTodo) : null;
                  const todoLabel = linkedTodo
                    ? (parentTodo ? `${linkedTodo.title} @${parentTodo.title}` : linkedTodo.title)
                    : null;
                  const scopeNames = Array.isArray(log?.scopeIds)
                    ? log.scopeIds
                      .map((scopeId) => scopes.find((item) => item.id === scopeId)?.name || '')
                      .filter(Boolean)
                    : [];

                  return (
                    <div key={row.logId} className="relative">
                      <div className="absolute -left-[34px] top-1.5 h-3 w-3 rounded-full border-2 border-black bg-white" />
                      <div>
                        {log ? (
                          <>
                            <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9d9489]">
                                {getLocalTimeStr(new Date(log.startTime))} - {getLocalTimeStr(new Date(log.endTime))}
                              </span>
                              {category && (
                                <span className="rounded-sm bg-[#efeae2] px-2 py-0.5 text-[10px] font-medium tracking-[0.16em] text-[#756d63]">
                                  {category.name}
                                </span>
                              )}
                            </div>
                            <h2 className="font-serif text-[1.2rem] leading-tight text-black sm:text-[1.26rem]">
                              {activity?.name || log.title || '未命名记录'}
                            </h2>
                            <div className="mt-1.5 flex items-center gap-2 overflow-hidden whitespace-nowrap">
                              <span className="shrink-0 rounded border border-stone-200 bg-stone-50/30 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                                {formatDuration(log.duration)}
                              </span>
                              {todoLabel && (
                                <span className="flex min-w-0 items-center gap-1 rounded border border-stone-200 bg-stone-50/30 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                                  <span className="shrink-0 font-bold text-stone-400">@</span>
                                  <span className="truncate">{todoLabel}</span>
                                </span>
                              )}
                              {scopeNames.length > 0 && (
                                <span className="flex min-w-0 items-center gap-1 rounded border border-stone-200 bg-stone-50/30 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                                  <span className="shrink-0 font-bold text-stone-400">%</span>
                                  <span className="truncate">{scopeNames.join(' / ')}</span>
                                </span>
                              )}
                            </div>
                            {log.note && (
                              <p className="mt-2 text-[13px] leading-5 text-[#625b54]">
                                {log.note}
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#9d9489]">
                              原记录已不存在
                            </div>
                            <h2 className="font-serif text-[1.12rem] leading-tight text-black sm:text-[1.18rem]">
                              这条批注对应的时间记录已经被删除
                            </h2>
                          </>
                        )}

                        {comment && (
                          <div className="mt-3 border-l-2 border-[#d8d2c7] pl-4">
                            <p className="font-serif text-[14px] italic leading-6 text-[#7b746c]">
                              {comment}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DailyNewspaperView;
