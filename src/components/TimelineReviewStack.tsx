/**
 * @file TimelineReviewStack.tsx
 * @input Daily, weekly, and monthly review data plus review-open callbacks
 * @output Collapsible review cards shown above the schedule canvas
 * @pos Component
 * @description Consolidates Chronicle review entry points so the schedule canvas does not duplicate legacy timeline nodes.
 * @updated 2026-07-29: Added daily, weekly, and monthly review cards for the schedule-canvas layout.
 */
import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ClipboardCheck, FileText, CalendarRange, CalendarDays } from 'lucide-react';
import { CheckItem, DailyReview, MonthlyReview, ReviewAnswer, ReviewTemplateSnapshot, WeeklyReview } from '../types';

type TimelineReview = DailyReview | WeeklyReview | MonthlyReview;

interface ReviewCardProps {
  id: string;
  title: string;
  review?: TimelineReview;
  icon: React.ReactNode;
  onOpen: () => void;
  checkItems?: CheckItem[];
  syncMap?: Record<string, boolean>;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ id, title, review, icon, onOpen, checkItems = [], syncMap }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const completedCount = checkItems.filter((item) => item.isCompleted).length;
  const syncedItems = syncMap
    ? checkItems.filter((item) => syncMap[item.category || '默认'])
    : [];
  const templates = (review?.templateSnapshot || []).filter((template) => template.syncToTimeline);
  const answersById = useMemo(() => new Map((review?.answers || []).map((answer) => [answer.questionId, answer])), [review]);

  if (!review) {
    return (
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 border-b border-stone-100 bg-[#fffdf9] px-4 py-3 text-left transition-colors hover:bg-stone-50">
        <span className="text-stone-400">{icon}</span>
        <span className="min-w-0 flex-1 text-sm font-bold text-stone-700">{title}</span>
        <span className="text-xs font-medium text-stone-400">尚未创建</span>
        <span className="text-xs font-medium text-emerald-600">创建</span>
      </button>
    );
  }

  const renderAnswer = (questionId: string): ReviewAnswer | undefined => answersById.get(questionId);

  return (
    <section className="border-b border-stone-100 bg-[#fffdf9]">
      <div className="flex items-center gap-2 px-4 py-3">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="text-stone-400">{icon}</span>
          <span className="truncate text-sm font-bold text-stone-700">{title}</span>
          {review.summary && <span className="truncate text-xs text-stone-400">{review.summary}</span>}
        </button>
        <button type="button" onClick={() => setIsExpanded((expanded) => !expanded)} className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700" aria-label={isExpanded ? `收起${title}` : `展开${title}`}>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      {isExpanded && (
        <div className="space-y-3 border-t border-stone-100 px-4 py-3">
          {checkItems.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold text-stone-500">日课 {completedCount}/{checkItems.length}</p>
              <div className="space-y-1.5">
                {(syncedItems.length > 0 ? syncedItems : checkItems).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs text-stone-600">
                    <span className={`h-3 w-3 shrink-0 rounded-full border ${item.isCompleted ? 'border-stone-700 bg-stone-700' : 'border-stone-300 bg-white'}`} />
                    <span className={item.isCompleted ? 'text-stone-700' : 'text-stone-400'}>{item.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {templates.map((template: ReviewTemplateSnapshot) => {
            const answered = template.questions.map((question) => ({ question, answer: renderAnswer(question.id) })).filter(({ answer }) => Boolean(answer?.answer));
            if (answered.length === 0) return null;
            return (
              <div key={template.id} className="border-l border-stone-200 pl-3">
                <p className="mb-1 text-xs font-bold text-stone-500">{template.title}</p>
                {answered.map(({ question, answer }) => <p key={question.id} className="line-clamp-2 text-xs leading-5 text-stone-500">{answer?.answer}</p>)}
              </div>
            );
          })}
          {!checkItems.length && !templates.length && (review.narrative || review.summary) && <p className="whitespace-pre-wrap text-xs leading-5 text-stone-500">{review.narrative || review.summary}</p>}
        </div>
      )}
    </section>
  );
};

interface TimelineReviewStackProps {
  dailyReview?: DailyReview;
  weeklyReview?: WeeklyReview;
  monthlyReview?: MonthlyReview;
  showWeekly: boolean;
  showMonthly: boolean;
  onOpenDaily: () => void;
  onOpenWeekly: () => void;
  onOpenMonthly: () => void;
}

export const TimelineReviewStack: React.FC<TimelineReviewStackProps> = ({
  dailyReview,
  weeklyReview,
  monthlyReview,
  showWeekly,
  showMonthly,
  onOpenDaily,
  onOpenWeekly,
  onOpenMonthly
}) => (
  <div className="shrink-0 border-t border-stone-100 shadow-[0_3px_12px_rgba(28,25,23,0.035)]">
    <ReviewCard id="daily" title="每日回顾" review={dailyReview} icon={<ClipboardCheck size={16} />} onOpen={onOpenDaily} checkItems={dailyReview?.checkItems} syncMap={dailyReview?.checkCategorySyncToTimeline} />
    {showWeekly && <ReviewCard id="weekly" title="每周回顾" review={weeklyReview} icon={<CalendarRange size={16} />} onOpen={onOpenWeekly} />}
    {showMonthly && <ReviewCard id="monthly" title="每月回顾" review={monthlyReview} icon={<CalendarDays size={16} />} onOpen={onOpenMonthly} />}
  </div>
);
