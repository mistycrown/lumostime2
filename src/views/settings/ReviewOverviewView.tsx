/**
 * @file ReviewOverviewView.tsx
 * @input Daily, weekly, monthly reviews and review templates
 * @output Settings subpage for browsing historical review answers by type, group, and question
 * @pos View (Settings)
 * @description Adds a minimalist review-answer overview with in-page question detail drilldown.
 * @created 2026-08-09
 * @updated 2026-08-09: Added the first Review Overview settings subpage.
 * @updated 2026-08-09: Linked answer dates to source review pages and aligned nested back navigation.
 * @updated 2026-08-09: Matched detail-page spacing, hid scrollbars, and added typed answer rendering.
 * @updated 2026-08-11: Keeps overview question rows transparent instead of inheriting dark gray entry backgrounds.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { DailyReview, MonthlyReview, ReviewTemplate, WeeklyReview } from '../../types';
import { COLOR_OPTIONS } from '../../constants';
import { useNavigation } from '../../contexts/NavigationContext';
import { registerHardwareBackHandler } from '../../utils/hardwareBackHandlerStack';
import {
  getReviewOverviewSections,
  type ReviewOverviewAnswer,
  type ReviewOverviewKind,
  type ReviewOverviewQuestion,
  type ReviewOverviewSection,
  type ReviewOverviewTemplateGroup
} from '../../utils/reviewOverviewUtils';
import { parseDateKey } from '../../utils/todoScheduleUtils';

interface ReviewOverviewViewProps {
  onBack: () => void;
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  monthlyReviews: MonthlyReview[];
  reviewTemplates: ReviewTemplate[];
}

interface SelectedQuestionContext {
  section: ReviewOverviewSection;
  group: ReviewOverviewTemplateGroup;
  question: ReviewOverviewQuestion;
}

const REVIEW_TONES: Record<ReviewOverviewKind, { text: string; rule: string }> = {
  daily: {
    text: 'text-emerald-700',
    rule: 'border-emerald-700'
  },
  weekly: {
    text: 'text-indigo-700',
    rule: 'border-indigo-700'
  },
  monthly: {
    text: 'text-amber-700',
    rule: 'border-amber-700'
  }
};

const getRatingIcon = (iconName?: string) => {
  if (!iconName) {
    return LucideIcons.Star;
  }

  const iconMap = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string; fill?: string; strokeWidth?: number }>>;
  return iconMap[iconName]
    || iconMap[iconName.charAt(0).toUpperCase() + iconName.slice(1)]
    || LucideIcons.Star;
};

const ReviewOverviewAnswerValue: React.FC<{
  question: ReviewOverviewQuestion;
  answer: string;
}> = ({ question, answer }) => {
  if (question.type === 'choice') {
    return (
      <div className="flex flex-wrap gap-2 pt-0.5">
        <span className="inline-flex max-w-full items-center rounded-full bg-stone-100/80 px-3 py-1 text-[13px] font-medium leading-5 text-stone-700 shadow-[inset_0_0_0_1px_rgba(120,113,108,0.16)]">
          {answer}
        </span>
      </div>
    );
  }

  if (question.type === 'rating') {
    const ratingValue = Number.parseInt(answer, 10);
    if (!Number.isFinite(ratingValue)) {
      return (
        <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.65] text-stone-700">
          {answer}
        </p>
      );
    }

    const normalizedRating = Math.min(5, Math.max(0, ratingValue));
    const RatingIcon = getRatingIcon(question.icon);
    const colorOption = COLOR_OPTIONS.find((color) => color.id === question.colorId)
      || COLOR_OPTIONS.find((color) => color.id === 'amber')
      || COLOR_OPTIONS[0];

    return (
      <div className="flex items-center gap-1.5 pt-0.5" aria-label={`${normalizedRating} / 5`}>
        {[1, 2, 3, 4, 5].map((rating) => {
          const isActive = normalizedRating >= rating;

          return (
            <RatingIcon
              key={rating}
              size={18}
              className={isActive ? colorOption.text : 'text-stone-200'}
              fill={isActive ? 'currentColor' : 'none'}
              strokeWidth={isActive ? 0 : 2}
            />
          );
        })}
        <span className="ml-1 text-[11px] tabular-nums text-stone-400">
          {normalizedRating}/5
        </span>
      </div>
    );
  }

  return (
    <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.65] text-stone-700">
      {answer}
    </p>
  );
};

const findSelectedQuestion = (
  sections: ReviewOverviewSection[],
  selectedQuestionId: string | null
): SelectedQuestionContext | null => {
  if (!selectedQuestionId) {
    return null;
  }

  for (const section of sections) {
    for (const group of section.groups) {
      const question = group.questions.find((item) => item.id === selectedQuestionId);
      if (question) {
        return {
          section,
          group,
          question
        };
      }
    }
  }

  return null;
};

const EmptySection: React.FC = () => (
  <div className="border-b border-stone-200/80 py-7 text-sm text-stone-400">
    暂无回答
  </div>
);

export const ReviewOverviewView: React.FC<ReviewOverviewViewProps> = ({
  onBack,
  dailyReviews,
  weeklyReviews,
  monthlyReviews,
  reviewTemplates
}) => {
  const {
    isDailyReviewOpen,
    isDailyNewspaperOpen,
    isWeeklyNewspaperOpen,
    isMonthlyNewspaperOpen,
    isOnThisDayOpen,
    isWeeklyReviewOpen,
    isMonthlyReviewOpen,
    setCurrentReviewDate,
    setCurrentDailyReviewInitialTab,
    setIsDailyReviewOpen,
    setCurrentWeeklyReviewStart,
    setCurrentWeeklyReviewEnd,
    setCurrentWeeklyReviewInitialTab,
    setIsWeeklyReviewOpen,
    setCurrentMonthlyReviewStart,
    setCurrentMonthlyReviewEnd,
    setCurrentMonthlyReviewInitialTab,
    setIsMonthlyReviewOpen
  } = useNavigation();
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const sections = useMemo(() => (
    getReviewOverviewSections({
      dailyReviews,
      weeklyReviews,
      monthlyReviews,
      reviewTemplates
    })
  ), [dailyReviews, monthlyReviews, reviewTemplates, weeklyReviews]);
  const selectedQuestion = useMemo(
    () => findSelectedQuestion(sections, selectedQuestionId),
    [sections, selectedQuestionId]
  );
  const totalAnswers = sections.reduce((sum, section) => sum + section.answerCount, 0);
  const isSourceReviewOpen = isDailyReviewOpen
    || isDailyNewspaperOpen
    || isWeeklyNewspaperOpen
    || isMonthlyNewspaperOpen
    || isOnThisDayOpen
    || isWeeklyReviewOpen
    || isMonthlyReviewOpen;

  useEffect(() => {
    if (!selectedQuestionId || isSourceReviewOpen) {
      return;
    }

    return registerHardwareBackHandler(() => {
      setSelectedQuestionId(null);
      return true;
    });
  }, [isSourceReviewOpen, selectedQuestionId]);

  const handleOpenSourceReview = (answer: ReviewOverviewAnswer) => {
    const startDate = parseDateKey(answer.periodStart);
    if (!startDate) {
      return;
    }

    const endDate = parseDateKey(answer.periodEnd) || startDate;

    if (answer.kind === 'daily') {
      setCurrentReviewDate(startDate);
      setCurrentDailyReviewInitialTab('guide');
      setIsDailyReviewOpen(true);
      return;
    }

    if (answer.kind === 'weekly') {
      setCurrentWeeklyReviewStart(startDate);
      setCurrentWeeklyReviewEnd(endDate);
      setCurrentWeeklyReviewInitialTab('guide');
      setIsWeeklyReviewOpen(true);
      return;
    }

    setCurrentMonthlyReviewStart(startDate);
    setCurrentMonthlyReviewEnd(endDate);
    setCurrentMonthlyReviewInitialTab('guide');
    setIsMonthlyReviewOpen(true);
  };

  if (selectedQuestion) {
    const { section, group, question } = selectedQuestion;
    const tone = REVIEW_TONES[section.kind];

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#fdfbf7] pb-[env(safe-area-inset-bottom)] pt-[var(--app-safe-area-top)] font-serif text-stone-900 animate-in slide-in-from-right duration-300">
        <header className="sticky top-0 z-10 grid h-14 shrink-0 grid-cols-[1.5rem_1fr_1.5rem] items-center border-b border-stone-100 bg-[#fdfbf7]/90 px-4 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setSelectedQuestionId(null)}
            className="p-1 text-stone-400 transition-colors hover:text-stone-700"
            title="返回列表"
            aria-label="返回列表"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-center text-lg font-bold text-stone-800">回答详情</span>
          <span aria-hidden="true" />
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-7 pb-20 pt-5">
          <div className="mx-auto max-w-3xl">
            <div className="pb-4">
              <div className={`text-[11px] font-bold uppercase tracking-[0.22em] ${tone.text}`}>
                {section.title}
              </div>
              <h1 className="mt-3 break-words text-[26px] font-semibold leading-[1.35] text-stone-900">
                {question.question}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                <span>{group.title}</span>
                <span className="text-stone-300">/</span>
                <span>{question.answerCount}条</span>
              </div>
            </div>

            <div className="space-y-4">
              {question.answers.map((answer) => (
                <article
                  key={answer.id}
                  className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-5"
                >
                  <div className="leading-tight">
                    <button
                      type="button"
                      onClick={() => handleOpenSourceReview(answer)}
                      className="text-left text-sm font-semibold tabular-nums text-stone-800 underline decoration-stone-300 decoration-[0.06em] underline-offset-4 transition-colors hover:text-stone-950 hover:decoration-stone-600"
                      title="打开对应回顾"
                      aria-label={`打开 ${answer.periodLabel} 的回顾`}
                    >
                      {answer.periodLabel}
                    </button>
                  </div>
                  <ReviewOverviewAnswerValue question={question} answer={answer.answer} />
                </article>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#fdfbf7] pb-[env(safe-area-inset-bottom)] pt-[var(--app-safe-area-top)] font-serif text-stone-900 animate-in slide-in-from-right duration-300">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-stone-100 bg-[#fdfbf7]/90 px-4 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          className="p-1 text-stone-400 transition-colors hover:text-stone-700"
          title="返回设置"
          aria-label="返回设置"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-lg font-bold text-stone-800">回顾总览</span>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-7 pb-24 pt-6">
        <div className="mx-auto max-w-4xl space-y-11">
          {totalAnswers === 0 ? (
            <div className="border-y border-stone-200 py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
                <FileText size={22} />
              </div>
              <h2 className="text-base font-semibold text-stone-700">暂无回顾回答</h2>
            </div>
          ) : sections.map((section) => {
            const tone = REVIEW_TONES[section.kind];

            return (
              <section key={section.kind}>
                <div className={`mb-5 flex items-end justify-between border-b-2 ${tone.rule} pb-2`}>
                  <div>
                    <h2 className={`text-[12px] font-bold uppercase tracking-[0.24em] ${tone.text}`}>
                      {section.title}
                    </h2>
                  </div>
                  <div className="text-right text-[11px] tabular-nums text-stone-500">
                    {section.questionCount} 问题 / {section.answerCount} 回答
                  </div>
                </div>

                {section.groups.length === 0 ? (
                  <EmptySection />
                ) : (
                  <div className="space-y-8">
                    {section.groups.map((group) => (
                      <div key={group.id}>
                        <div className="mb-2 flex items-baseline justify-between gap-4">
                          <h3 className="break-words text-base font-semibold text-stone-800">
                            {group.title}
                          </h3>
                          <span className="shrink-0 text-xs tabular-nums text-stone-400">
                            {group.answerCount} 回答
                          </span>
                        </div>

                        <div className="divide-y divide-stone-200/90 border-y border-stone-200/90">
                          {group.questions.map((question) => (
                            <button
                              key={question.id}
                              type="button"
                              onClick={() => setSelectedQuestionId(question.id)}
                              className="review-overview-list-row group flex w-full items-center gap-4 py-4 text-left transition-colors hover:bg-white/60"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="break-words text-[15px] font-medium leading-6 text-stone-800">
                                  {question.question}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone-400">
                                  <span>{question.answerCount} 条回答</span>
                                  {question.latestAnswer && (
                                    <span className="tabular-nums">
                                      最近 {question.latestAnswer.periodLabel}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <ChevronRight
                                size={18}
                                className="shrink-0 text-stone-300 transition-colors group-hover:text-stone-700"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
};
