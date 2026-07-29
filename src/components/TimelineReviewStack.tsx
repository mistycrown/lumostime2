/**
 * @file TimelineReviewStack.tsx
 * @input Daily, weekly, and monthly review data plus review-open callbacks
 * @output Compact review entry buttons for the Chronicle todo sidebar
 * @pos Component
 * @description Keeps review entry points visible without freezing or duplicating review details in the schedule workspace.
 * @updated 2026-07-30: Aligned compact review entries to the sidebar list rhythm.
 */
import React from 'react';
import { CalendarDays, CalendarRange, ClipboardCheck, FilePlus2 } from 'lucide-react';
import { DailyReview, MonthlyReview, WeeklyReview } from '../types';

type TimelineReview = DailyReview | WeeklyReview | MonthlyReview;

interface ReviewEntryProps {
  title: string;
  review?: TimelineReview;
  icon: React.ReactNode;
  onOpen: () => void;
}

const ReviewEntry: React.FC<ReviewEntryProps> = ({ title, review, icon, onOpen }) => {
  const exists = Boolean(review);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-w-0 items-center gap-2 border-l border-stone-200 px-3 py-2 text-left transition-colors first:border-l-0 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
      aria-label={exists ? `进入${title}` : `创建${title}`}
    >
      <span className={exists ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400 dark:text-stone-500'}>
        {exists ? icon : <FilePlus2 size={15} strokeWidth={1.8} />}
      </span>
      <span className="truncate text-xs font-medium text-stone-600 dark:text-stone-300">{title}</span>
    </button>
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
  <div className="flex min-h-10 shrink-0 items-center overflow-x-auto border-b border-stone-200 px-3 dark:border-stone-700">
    <ReviewEntry title="每日回顾" review={dailyReview} icon={<ClipboardCheck size={15} strokeWidth={1.8} />} onOpen={onOpenDaily} />
    {showWeekly && <ReviewEntry title="每周回顾" review={weeklyReview} icon={<CalendarRange size={15} strokeWidth={1.8} />} onOpen={onOpenWeekly} />}
    {showMonthly && <ReviewEntry title="每月回顾" review={monthlyReview} icon={<CalendarDays size={15} strokeWidth={1.8} />} onOpen={onOpenMonthly} />}
  </div>
);
