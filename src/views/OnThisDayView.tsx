/**
 * @file OnThisDayView.tsx
 * @input Target date, logs, daily reviews, categories, scopes, todos, and month-day scoped note entries
 * @output Cross-year same-day review UI with DailyReview-style tabs and detail-timeline-style rows
 * @pos View (Review System)
 * @description Renders a read-only archive page for the same month-day across years, with timeline, schedule, review, and persistent notes, while keeping the default timeline rail aligned with the main timeline/detail views.
 * @updated 2026-03-30: Added deletion functionality for notes (笺注) with a ConfirmModal.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, MessageCircle, Zap, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { Category, DailyReview, Log, OnThisDayEntry, Scope, TodoItem } from '../types';
import { TimelineImage } from '../components/TimelineImage';
import { IconRenderer } from '../components/IconRenderer';
import { TimelineStyleRail } from '../components/TimelineStyleRail';
import { calculateEventHeight, calculateEventTop, layoutDayEvents } from '../utils/scheduleUtils';
import { getScheduleStyle } from '../utils/chartUtils';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { usePrivacy } from '../contexts/PrivacyContext';
import { getLocalDateStr } from '../utils/dateUtils';
import { parseNarrative } from '../utils/narrativeUtils';

type TabType = 'timeline' | 'schedule' | 'review' | 'notes';

interface OnThisDayViewProps {
  date: Date;
  logs: Log[];
  dailyReviews: DailyReview[];
  categories: Category[];
  scopes: Scope[];
  todos: TodoItem[];
  onThisDayEntries: OnThisDayEntry[];
  onUpdateOnThisDayEntries: React.Dispatch<React.SetStateAction<OnThisDayEntry[]>>;
}

interface OnThisDayYearBucket {
  year: number;
  logs: Log[];
  review?: DailyReview;
}

const getMonthDayKey = (date: Date) => getLocalDateStr(date).slice(5);

const formatMonthDayLabel = (date: Date) => `${date.getMonth() + 1} 月 ${date.getDate()} 日`;

const formatTimeLabel = (timestamp: number) => {
  const value = new Date(timestamp);
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
};

const formatDurationLabel = (durationSeconds: number) => {
  const totalMinutes = Math.round(durationSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
};

const extractReviewContent = (review?: DailyReview) => {
  if (!review) {
    return { summary: '', narrativeTitle: '', narrativeBody: '' };
  }

  if (review.summary?.trim()) {
    return {
      summary: review.summary.trim(),
      narrativeTitle: '',
      narrativeBody: ''
    };
  }

  if (review.narrative?.trim()) {
    const { title, content } = parseNarrative(review.narrative, review.date);
    return {
      summary: '',
      narrativeTitle: title,
      narrativeBody: content === '...' ? '' : content
    };
  }

  return { summary: '', narrativeTitle: '', narrativeBody: '' };
};

const YearSidebar: React.FC<{
  years: number[];
  activeYear: number | null;
  visible: boolean;
  onSelectYear: (year: number) => void;
}> = ({ years, activeYear, visible, onSelectYear }) => {
  return (
    <div
      className={`fixed right-0 top-1/2 z-50 flex h-[216px] -translate-y-1/2 flex-col items-center gap-3 overflow-y-auto rounded-l-xl py-4 no-scrollbar transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      {years.map((year) => {
        const isActive = activeYear === year;
        return (
          <button
            key={year}
            onClick={() => onSelectYear(year)}
            className="group relative flex h-4 w-6 shrink-0 select-none items-center justify-center touch-manipulation"
          >
            <span
              className={`font-serif text-[10px] transition-all duration-300 ${
                isActive ? 'scale-150 font-bold text-stone-900' : 'font-medium text-stone-300 group-hover:text-stone-500'
              }`}
            >
              {String(year).slice(-2)}
            </span>
            <div
              className={`absolute -left-1 h-1 w-1 rounded-full bg-stone-900 transition-all duration-300 ${
                isActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};

export const OnThisDayView: React.FC<OnThisDayViewProps> = ({
  date,
  logs,
  dailyReviews,
  categories,
  scopes,
  todos,
  onThisDayEntries,
  onUpdateOnThisDayEntries
}) => {
  const { scheduleStyle, timelineStyleTheme, timelineStyleConfigs } = useSettings();
  const { addToast } = useToast();
  const { isPrivacyMode } = usePrivacy();
  const activeTimelineConfig = timelineStyleConfigs[timelineStyleTheme];
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [noteDraft, setNoteDraft] = useState('');
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [showYearSidebar, setShowYearSidebar] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const yearSectionRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const monthDayKey = useMemo(() => getMonthDayKey(date), [date]);

  const yearBuckets = useMemo<OnThisDayYearBucket[]>(() => {
    const bucketMap = new Map<number, OnThisDayYearBucket>();

    logs.forEach((log) => {
      const logDate = new Date(log.startTime);
      if (getMonthDayKey(logDate) !== monthDayKey) {
        return;
      }

      const year = logDate.getFullYear();
      const bucket = bucketMap.get(year) || { year, logs: [] };
      bucket.logs.push(log);
      bucketMap.set(year, bucket);
    });

    dailyReviews.forEach((review) => {
      if (!review.date.endsWith(monthDayKey)) {
        return;
      }

      const year = Number.parseInt(review.date.slice(0, 4), 10);
      const bucket = bucketMap.get(year) || { year, logs: [] };
      bucket.review = review;
      bucketMap.set(year, bucket);
    });

    return Array.from(bucketMap.values())
      .map((bucket) => ({
        ...bucket,
        logs: [...bucket.logs].sort((first, second) => first.startTime - second.startTime)
      }))
      .sort((first, second) => second.year - first.year);
  }, [dailyReviews, logs, monthDayKey]);

  const onThisDayEntry = useMemo(
    () => onThisDayEntries.find((entry) => entry.monthDay === monthDayKey),
    [monthDayKey, onThisDayEntries]
  );
  const notes = onThisDayEntry?.notes ? [...onThisDayEntry.notes].sort((a, b) => b.createdAt - a.createdAt) : [];
  const years = useMemo(() => yearBuckets.map((bucket) => bucket.year), [yearBuckets]);

  useEffect(() => {
    setActiveYear(years[0] || null);
  }, [years]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || activeTab !== 'timeline') {
      setShowYearSidebar(false);
      return;
    }

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      setShowYearSidebar(scrollTop > 180 && years.length > 1);

      let currentVisibleYear = years[0] || null;
      years.forEach((year) => {
        const element = yearSectionRefs.current.get(year);
        if (!element) {
          return;
        }

        if (element.offsetTop - scrollTop <= 160) {
          currentVisibleYear = year;
        }
      });

      setActiveYear(currentVisibleYear);
    };

    handleScroll();
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeTab, years]);

  const handleSelectYear = (year: number) => {
    const container = scrollContainerRef.current;
    const section = yearSectionRefs.current.get(year);
    if (!container || !section) {
      return;
    }

    container.scrollTo({
      top: Math.max(0, section.offsetTop - 16),
      behavior: 'smooth'
    });
  };

  const handleAddNote = () => {
    const content = noteDraft.trim();
    if (!content) {
      addToast('info', '请输入笺注内容');
      return;
    }

    const now = Date.now();
    const nextNote = {
      id: crypto.randomUUID(),
      content,
      createdAt: now
    };

    onUpdateOnThisDayEntries((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.monthDay === monthDayKey);
      if (existingIndex === -1) {
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            monthDay: monthDayKey,
            notes: [nextNote],
            createdAt: now,
            updatedAt: now
          }
        ];
      }

      const nextEntries = [...prev];
      const existingEntry = nextEntries[existingIndex];
      nextEntries[existingIndex] = {
        ...existingEntry,
        notes: [...existingEntry.notes, nextNote],
        updatedAt: now
      };
      return nextEntries;
    });

    setNoteDraft('');
    addToast('success', '笺注已保存');
  };

  const handleDeleteNote = () => {
    if (!deleteNoteId) return;

    onUpdateOnThisDayEntries((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.monthDay === monthDayKey);
      if (existingIndex === -1) {
        return prev;
      }

      const nextEntries = [...prev];
      const existingEntry = nextEntries[existingIndex];
      nextEntries[existingIndex] = {
        ...existingEntry,
        notes: existingEntry.notes.filter(note => note.id !== deleteNoteId),
        updatedAt: Date.now()
      };
      return nextEntries;
    });

    setDeleteNoteId(null);
    addToast('success', '笺注已删除');
  };

  const renderTimelineTab = () => {
    if (yearBuckets.length === 0) {
      return (
        <div className="rounded-2xl border border-stone-200 bg-white/70 px-5 py-10 text-center text-sm text-stone-400">
          这一天还没有历史记录。
        </div>
      );
    }

    return (
      <div className="space-y-8 pb-16">
        {yearBuckets.map((bucket) => {
          const totalDuration = bucket.logs.reduce((sum, log) => sum + log.duration, 0);
          const sortedLogs = [...bucket.logs].sort((first, second) => second.startTime - first.startTime);

          return (
            <section
              key={bucket.year}
              ref={(node) => {
                if (node) {
                  yearSectionRefs.current.set(bucket.year, node);
                } else {
                  yearSectionRefs.current.delete(bucket.year);
                }
              }}
              className="space-y-4"
            >
              <div className="flex items-end justify-between border-b border-stone-200 pb-2">
                <h2 className="text-xl font-bold text-stone-900">{bucket.year}</h2>
                <div className="text-right text-xs text-stone-400">
                  <div>{bucket.logs.length} 条记录</div>
                  <div>{Math.round(totalDuration / 60)} 分钟</div>
                </div>
              </div>

              {sortedLogs.length > 0 ? (
                <div className="relative ml-[70px] space-y-6 pb-4" style={{ zIndex: 1 }}>
                  {timelineStyleTheme === 'default' && (
                    <div className="absolute left-0 top-0 bottom-0 w-[1px] border-l border-stone-300 pointer-events-none" />
                  )}
                  <div className="pl-8 -ml-[70px] mb-6" />
                  {sortedLogs.map((log, index) => {
                    const category = categories.find((item) => item.id === log.categoryId);
                    const activity = category?.activities.find((item) => item.id === log.activityId);
                    const linkedTodo = todos.find((item) => item.id === log.linkedTodoId);
                    const linkedScopes = (log.scopeIds || [])
                      .map((scopeId) => scopes.find((item) => item.id === scopeId))
                      .filter((item): item is Scope => Boolean(item));
                    const timeLabel = formatTimeLabel(log.startTime);
                    const durationLabel = formatDurationLabel(log.duration);
                    const noteContent = log.note?.trim() || '';

                    return (
                      <div key={log.id} className="relative pl-8 animate-in slide-in-from-bottom-2 duration-500">
                        <div className="absolute -left-[60px] top-0 w-[45px] text-right flex flex-col items-end">
                          <span className="text-sm font-bold text-stone-800 leading-none font-mono">{timeLabel}</span>
                          <span className="text-[10px] font-medium text-stone-400 mt-1">{durationLabel}</span>
                        </div>

                        <div className="absolute left-0 top-0 w-0 pointer-events-none overflow-visible" style={{ bottom: index < sortedLogs.length - 1 ? '-1.75rem' : '0px' }}>
                          <TimelineStyleRail
                            theme={timelineStyleTheme}
                            config={activeTimelineConfig}
                            index={index}
                            showLine={true}
                            extendLinePastContainer={index < sortedLogs.length - 1}
                          />
                        </div>

                        <div className="cursor-default transition-opacity">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold leading-tight text-stone-900">
                              {activity?.name || category?.name || 'Unknown Activity'}
                            </h3>

                            {log.reactions && log.reactions.length > 0 && (
                              <div className="flex items-center -space-x-1 ml-0.5">
                                {Array.from(new Set(log.reactions)).map((emoji, emojiIndex) => (
                                  <span key={`${log.id}-reaction-${emojiIndex}`} className="text-sm scale-90">
                                    <IconRenderer icon={emoji} />
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              {log.focusScore && log.focusScore > 0 && (
                                <span className="text-sm font-bold text-stone-400 font-mono inline-flex items-center gap-0.5">
                                  <Zap size={12} fill="currentColor" strokeWidth={0} className="align-middle" />
                                  <span className="align-middle">{log.focusScore}</span>
                                </span>
                              )}
                              {log.moodScore && log.moodScore > 0 && (
                                <span className="text-sm font-bold text-stone-400 font-mono inline-flex items-center gap-0.5">
                                  <Heart size={12} fill="currentColor" strokeWidth={0} className="align-middle" />
                                  <span className="align-middle">{log.moodScore}</span>
                                </span>
                              )}
                              {log.comments && log.comments.length > 0 && (
                                <span className="text-xs font-bold text-stone-400 font-mono flex items-center gap-0.5">
                                  <MessageCircle size={10} />
                                  {log.comments.length}
                                </span>
                              )}
                            </div>
                          </div>

                          {noteContent && (
                            <p
                              className={`text-sm text-stone-500 font-light leading-relaxed mb-2 whitespace-pre-wrap ${
                                isPrivacyMode ? 'blur-sm select-none' : ''
                              }`}
                            >
                              {noteContent}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {linkedTodo && (
                              <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                <span className="text-stone-400 font-bold">@</span>
                                <span className="line-clamp-1">{linkedTodo.title}</span>
                                {log.progressIncrement && log.progressIncrement > 0 && (
                                  <span className="font-mono text-stone-400 ml-0.5">+{log.progressIncrement}</span>
                                )}
                              </span>
                            )}

                            {category && (
                              <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                <span className="font-bold text-stone-400">#</span>
                                <IconRenderer icon={category.icon} uiIcon={category.uiIcon} className="text-xs" />
                                <span className="flex items-center">
                                  <span>{category.name}</span>
                                  {activity && (
                                    <>
                                      <span className="mx-1 text-stone-300">/</span>
                                      <IconRenderer icon={activity.icon} uiIcon={activity.uiIcon} className="text-xs mr-1" />
                                      <span className="text-stone-500">{activity.name}</span>
                                    </>
                                  )}
                                </span>
                              </span>
                            )}

                            {linkedScopes.map((scope) => (
                              <span key={`${log.id}-${scope.id}`} className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                <span className="text-stone-400 font-bold">%</span>
                                <IconRenderer icon={scope.icon || '📍'} uiIcon={scope.uiIcon} className="text-xs" />
                                <span>{scope.name}</span>
                              </span>
                            ))}
                          </div>

                          {log.images && log.images.length > 0 && (
                            <div className="flex gap-2 mt-2 mb-1 overflow-x-auto pb-1 no-scrollbar">
                              {(log.images.length > 3 ? log.images.slice(0, 2) : log.images).map((image) => (
                                <TimelineImage key={image} filename={image} className="w-16 h-16 shadow-sm" useThumbnail={true} />
                              ))}
                              {log.images.length > 3 && (
                                <div className="w-16 h-16 rounded-xl bg-stone-100 flex items-center justify-center border border-stone-200 text-stone-400 font-bold text-sm shrink-0">
                                  +{log.images.length - 2}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-sm text-stone-400">
                  这一天有回顾，但没有 log。
                </div>
              )}
            </section>
          );
        })}
      </div>
    );
  };

  const renderScheduleTab = () => {
    if (yearBuckets.length === 0) {
      return (
        <div className="rounded-2xl border border-stone-200 bg-white/70 px-5 py-10 text-center text-sm text-stone-400">
          没有可用于绘制日程图的历史记录。
        </div>
      );
    }

    const hourHeight = 40;
    const totalHeight = hourHeight * 24;
    const columnWidth = 120;

    return (
      <div className="-mx-7 animate-in fade-in duration-300">
        <div className="overflow-x-auto no-scrollbar">
          <div style={{ minWidth: `${56 + yearBuckets.length * columnWidth}px` }}>
            <div className="sticky top-0 z-10 flex border-b border-stone-100 bg-[#faf9f6]">
              <div className="w-14 shrink-0 border-r border-stone-100 bg-[#faf9f6]" />
              {yearBuckets.map((bucket) => (
                <div
                  key={bucket.year}
                  className="border-r border-stone-100 py-2 text-center last:border-none"
                  style={{ width: `${columnWidth}px` }}
                >
                  <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Year</div>
                  <div className="mt-1 text-sm font-bold text-stone-700">{bucket.year}</div>
                </div>
              ))}
            </div>

            <div className="relative flex" style={{ minHeight: totalHeight }}>
              <div className="relative w-14 shrink-0 border-r border-stone-100 bg-stone-50/60" style={{ minHeight: totalHeight }}>
                {Array.from({ length: 24 }, (_, hour) => (
                  <div
                    key={hour}
                    className="absolute w-full pt-1 text-center text-[10px] font-mono text-stone-400"
                    style={{ top: hour * hourHeight }}
                  >
                    {hour}:00
                  </div>
                ))}
              </div>

              {yearBuckets.map((bucket) => {
                const layout = layoutDayEvents(bucket.logs);
                return (
                  <div
                    key={bucket.year}
                    className="relative border-r border-stone-50 last:border-none"
                    style={{ width: `${columnWidth}px`, minHeight: totalHeight }}
                  >
                    {Array.from({ length: 24 }, (_, hour) => (
                      <div
                        key={hour}
                        className="absolute w-full border-b border-stone-50"
                        style={{ top: hour * hourHeight, height: hourHeight }}
                      />
                    ))}

                    {bucket.logs.map((log) => {
                      const category = categories.find((item) => item.id === log.categoryId);
                      const activity = category?.activities.find((item) => item.id === log.activityId);
                      const stylePresentation = getScheduleStyle(activity?.color || category?.themeColor || '', scheduleStyle);
                      const layoutInfo = layout.get(log.id) || { left: '0%', width: '100%' };

                      return (
                        <div
                          key={log.id}
                          className={`absolute overflow-hidden p-1 text-[10px] leading-tight ${stylePresentation.className}`}
                          style={{
                            ...stylePresentation.style,
                            top: calculateEventTop(log.startTime, hourHeight) + 1,
                            height: calculateEventHeight(log.duration, hourHeight),
                            left: `calc(${layoutInfo.left} + 2px)`,
                            width: `calc(${layoutInfo.width} - 4px)`
                          }}
                        >
                          <div className="truncate font-semibold">{activity?.name || category?.name || 'Log'}</div>
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
    );
  };

  const renderReviewTab = () => {
    const reviewBuckets = yearBuckets.filter((bucket) => {
      if (!bucket.review) {
        return false;
      }

      const hasSummary = Boolean(bucket.review.summary && bucket.review.summary.trim());
      const hasAnswers = bucket.review.answers.length > 0;
      const hasNarrative = Boolean(bucket.review.narrative && bucket.review.narrative.trim());
      return hasSummary || hasAnswers || hasNarrative;
    });

    if (reviewBuckets.length === 0) {
      return (
        <div className="rounded-2xl border border-stone-200 bg-white/70 px-5 py-10 text-center text-sm text-stone-400">
          这一天还没有可回看的日复盘。
        </div>
      );
    }

    return (
      <div className="space-y-6 pb-16">
        {reviewBuckets.map((bucket) => {
          const review = bucket.review!;
          const reviewContent = extractReviewContent(review);

          return (
            <section key={bucket.year} className="rounded-2xl border border-stone-200 bg-white/80 p-5 shadow-sm">
              <div className="mb-4 border-b border-stone-100 pb-3">
                <h2 className="text-lg font-bold text-stone-900">{bucket.year}</h2>
              </div>

              {reviewContent.summary && (
                <div className="mb-5">
                  <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-stone-400">一句话总结</div>
                  <p className="text-[15px] leading-7 text-stone-700">{reviewContent.summary}</p>
                </div>
              )}

              {!reviewContent.summary && reviewContent.narrativeBody && (
                <div className="mb-5">
                  <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-stone-400">叙事摘要</div>
                  {reviewContent.narrativeTitle && (
                    <h3 className="mb-2 text-base font-bold text-stone-900">{reviewContent.narrativeTitle}</h3>
                  )}
                  <p className="text-[15px] leading-7 text-stone-700">{reviewContent.narrativeBody}</p>
                </div>
              )}

              {review.answers.length > 0 && (
                <div className="space-y-4">
                  {review.answers.map((answer) => (
                    <div key={`${review.id}-${answer.questionId}`} className="space-y-2">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">{answer.question}</div>
                      <div className="rounded-2xl bg-stone-50/80 px-4 py-3 text-[15px] leading-7 text-stone-700">
                        {answer.answer || '未填写'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    );
  };

  const renderNotesTab = () => {
    return (
      <div className="space-y-6 pb-28">
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 shadow-sm">
          <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-stone-400">新建笺注</div>
          <textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="写下一句注解、回望或提醒，明年今天还会在这里看到。"
            className="min-h-[120px] w-full resize-none rounded-2xl border border-stone-200 bg-stone-50/60 px-4 py-3 text-[15px] leading-7 text-stone-700 outline-none transition-colors placeholder:text-stone-300 focus:border-stone-400"
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleAddNote}
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700"
            >
              保存笺注
            </button>
          </div>
        </div>

        {notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 px-5 py-10 text-center text-sm text-stone-400">
            还没有笺注。你现在写下的内容，明年今天还会在这里。
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <article key={note.id} className="rounded-2xl border border-stone-200 bg-white/80 p-5 shadow-sm">
                <p className="text-[15px] leading-7 text-stone-700">{note.content}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-stone-400">
                  <span>
                    {new Date(note.createdAt).toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <button
                    onClick={() => setDeleteNoteId(note.id)}
                    className="flex items-center gap-1 rounded-full p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto bg-[#faf9f6] px-7 pb-24 pt-4 no-scrollbar">
      <div className="mb-6">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-stone-900">
          <span className="font-normal text-stone-300">∀</span>
          <span>on {monthDayKey}</span>
        </h1>
        <p className="mt-2 text-sm text-stone-400">
          {formatMonthDayLabel(date)} · 过去 {years.length} 年的今日记录
        </p>
      </div>

      <div className="mb-8 flex gap-6 overflow-x-auto border-b border-stone-200 no-scrollbar">
        {(['timeline', 'schedule', 'review', 'notes'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap pb-3 text-sm tracking-wide transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-stone-900 font-bold text-stone-900'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            {{ timeline: '时间线', schedule: '日程图', review: '回顾', notes: '笺注' }[tab]}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'timeline' && renderTimelineTab()}
        {activeTab === 'schedule' && renderScheduleTab()}
        {activeTab === 'review' && renderReviewTab()}
        {activeTab === 'notes' && renderNotesTab()}
      </div>

      <YearSidebar
        years={years}
        activeYear={activeYear}
        visible={activeTab === 'timeline' && showYearSidebar}
        onSelectYear={handleSelectYear}
      />

      <ConfirmModal
        isOpen={deleteNoteId !== null}
        onClose={() => setDeleteNoteId(null)}
        onConfirm={handleDeleteNote}
        title="删除笺注"
        description="删除后无法恢复，确定要删除这条笺注吗？"
        confirmText="删除"
        type="danger"
      />
    </div>
  );
};
