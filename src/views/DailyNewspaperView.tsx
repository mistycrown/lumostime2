/**
 * @file DailyNewspaperView.tsx
 * @input Daily Review newspaper payload, real logs, categories, todos, scopes, and the target date
 * @output Full-screen editorial newspaper page for one day
 * @pos View (Review System)
 * @description Renders a dedicated daily AI newspaper page based on lightweight Daily Review storage plus real timeline data resolved by log ID.
 * @updated 2026-05-16: Added the first dedicated daily newspaper full-screen view inspired by the chronos-ai reference demo.
 */
import React, { useMemo } from 'react';
import type { Category, DailyReview, Log, Scope, TodoItem } from '../types';
import { getLocalTimeStr } from '../utils/dateUtils';
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

  const timelineRows = useMemo(() => {
    if (!newspaper) {
      return [];
    }

    const annotationMap = new Map(
      newspaper.annotations.map((annotation) => [annotation.logId, annotation.comment])
    );

    const logMap = new Map(logs.map((log) => [log.id, log]));
    const orderedLogIds = newspaper.annotations.map((annotation) => annotation.logId);
    const knownLogIds = new Set(orderedLogIds);
    const datedLogs = logs
      .filter((log) => annotationMap.has(log.id))
      .sort((left, right) => left.startTime - right.startTime);
    const remainingRows = orderedLogIds
      .filter((logId) => !datedLogs.some((log) => log.id === logId))
      .map((logId) => ({ logId, log: logMap.get(logId) || null }));

    return [
      ...datedLogs.map((log) => ({ logId: log.id, log })),
      ...remainingRows.filter((row) => knownLogIds.has(row.logId))
    ];
  }, [logs, newspaper]);

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
      <div className="mx-auto min-h-full w-full max-w-3xl bg-white px-6 pb-16 pt-12 shadow-[0_10px_40px_rgba(15,23,42,0.04)] sm:px-10">
        <header className="border-b border-[#efede8] pb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#91867a]">
            {formatDateLabel(date)}
          </div>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-black sm:text-5xl">
            {newspaper.title}
          </h1>
          <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-[#4a433d]">
            {newspaper.overallComment}
          </p>
        </header>

        <main className="pt-8">
          <div className="relative pl-7">
            <div className="absolute left-0 top-4 bottom-4 w-px bg-[#e4e0d9]" />
            <div className="space-y-10">
              {timelineRows.length === 0 ? (
                <div className="py-10 text-sm leading-7 text-stone-500">
                  这一天的小报已经存在，但当前没有可渲染的时间轴批注。
                </div>
              ) : (
                timelineRows.map((row) => {
                  const log = row.log;
                  const comment = newspaper.annotations.find((annotation) => annotation.logId === row.logId)?.comment || '';
                  const category = log ? categories.find((item) => item.id === log.categoryId) : undefined;
                  const activity = log
                    ? category?.activities.find((item) => item.id === log.activityId)
                      || categories.flatMap((item) => item.activities).find((item) => item.id === log.activityId)
                    : undefined;
                  const linkedTodo = log?.linkedTodoId
                    ? todos.find((item) => item.id === log.linkedTodoId)
                    : undefined;
                  const parentTodo = linkedTodo ? getParentTodo(todos, linkedTodo) : null;
                  const todoLabel = linkedTodo
                    ? (parentTodo ? `${linkedTodo.title} @${parentTodo.title}` : linkedTodo.title)
                    : null;
                  const scopeNames = Array.isArray(log?.scopeIds)
                    ? log!.scopeIds
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
                            <h2 className="font-serif text-[1.4rem] leading-tight text-black">
                              {activity?.name || log.title || '未命名记录'}
                            </h2>
                            <div className="mt-2 space-y-1.5 text-[14px] leading-6 text-[#625b54]">
                              <p>时长：{formatDuration(log.duration)}</p>
                              {todoLabel && <p>待办：{todoLabel}</p>}
                              {scopeNames.length > 0 && <p>领域：{scopeNames.join(' / ')}</p>}
                              {log.note && <p>备注：{log.note}</p>}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#9d9489]">
                              原记录已不存在
                            </div>
                            <h2 className="font-serif text-[1.25rem] leading-tight text-black">
                              这条批注对应的时间记录已被删除
                            </h2>
                          </>
                        )}

                        {comment && (
                          <div className="mt-4 border-l-2 border-[#d8d2c7] pl-4">
                            <p className="font-serif text-[15px] italic leading-7 text-[#7b746c]">
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
