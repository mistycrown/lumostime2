/**
 * @file useAIBackfillChatNewspaperSnapshot.ts
 * @input Daily, weekly, and monthly review collections
 * @output Sorted newspaper entries for the AI chat home view
 * @pos Component Support (AI Integration)
 * @description Keeps review-to-newspaper projection logic out of the chat coordinator.
 */
import { useMemo } from 'react';
import type { DailyReview, MonthlyReview, WeeklyReview } from '../../types';
import type { AIChatNewspaperItem } from './AIChatHome';

export const useAIBackfillChatNewspaperSnapshot = (
  dailyReviews: DailyReview[],
  weeklyReviews: WeeklyReview[],
  monthlyReviews: MonthlyReview[]
) => useMemo<AIChatNewspaperItem[]>(() => [
  ...dailyReviews.flatMap((review) => review.aiNewspaper ? [{
    id: review.aiNewspaper.date,
    title: review.aiNewspaper.title,
    preview: review.aiNewspaper.overallComment || review.aiNewspaper.assistantReply,
    dateLabel: review.date,
    updatedAt: review.aiNewspaper.updatedAt,
    period: 'daily' as const,
    startDate: review.date
  }] : []),
  ...weeklyReviews.flatMap((review) => review.aiNewspaper ? [{
    id: `${review.aiNewspaper.weekStartDate}:${review.aiNewspaper.weekEndDate}`,
    title: review.aiNewspaper.title,
    preview: review.aiNewspaper.overallComment || review.aiNewspaper.assistantReply,
    dateLabel: `${review.aiNewspaper.weekStartDate} - ${review.aiNewspaper.weekEndDate}`,
    updatedAt: review.aiNewspaper.updatedAt,
    period: 'weekly' as const,
    startDate: review.aiNewspaper.weekStartDate,
    endDate: review.aiNewspaper.weekEndDate
  }] : []),
  ...monthlyReviews.flatMap((review) => review.aiNewspaper ? [{
    id: `${review.aiNewspaper.monthStartDate}:${review.aiNewspaper.monthEndDate}`,
    title: review.aiNewspaper.title,
    preview: review.aiNewspaper.overallComment || review.aiNewspaper.assistantReply,
    dateLabel: `${review.aiNewspaper.monthStartDate} - ${review.aiNewspaper.monthEndDate}`,
    updatedAt: review.aiNewspaper.updatedAt,
    period: 'monthly' as const,
    startDate: review.aiNewspaper.monthStartDate,
    endDate: review.aiNewspaper.monthEndDate
  }] : [])
].sort((left, right) => right.updatedAt - left.updatedAt), [dailyReviews, monthlyReviews, weeklyReviews]);
