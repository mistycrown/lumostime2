/**
 * @file ReviewOverviewQuestionVisibilityView.tsx
 * @input Review templates, review history, and Review Overview visibility preferences
 * @output Full-screen settings page for per-question Review Overview visibility
 * @pos View (Settings)
 * @description Lets users hide or show individual review questions without changing review data or templates.
 * @created 2026-09-08
 */

import React, { useEffect, useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { DailyReview, MonthlyReview, ReviewTemplate, WeeklyReview } from '../../types';
import { useReview } from '../../contexts/ReviewContext';
import { registerHardwareBackHandler } from '../../utils/hardwareBackHandlerStack';
import { getReviewOverviewQuestionSettingSections } from '../../utils/reviewOverviewUtils';

interface ReviewOverviewQuestionVisibilityViewProps {
  onBack: () => void;
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  monthlyReviews: MonthlyReview[];
  reviewTemplates: ReviewTemplate[];
}

const TYPE_LABELS: Record<string, string> = {
  text: '问答题',
  choice: '选择题',
  rating: '评分题'
};

const SECTION_TONES = {
  daily: 'text-emerald-700 border-emerald-700',
  weekly: 'text-indigo-700 border-indigo-700',
  monthly: 'text-amber-700 border-amber-700'
} as const;

export const ReviewOverviewQuestionVisibilityView: React.FC<ReviewOverviewQuestionVisibilityViewProps> = ({
  onBack,
  dailyReviews,
  weeklyReviews,
  monthlyReviews,
  reviewTemplates
}) => {
  const { reviewOverviewQuestionVisibility, setReviewOverviewQuestionVisibility } = useReview();
  const sections = useMemo(() => getReviewOverviewQuestionSettingSections({
    dailyReviews,
    weeklyReviews,
    monthlyReviews,
    reviewTemplates
  }), [dailyReviews, monthlyReviews, reviewTemplates, weeklyReviews]);

  useEffect(() => registerHardwareBackHandler(() => {
    onBack();
    return true;
  }), [onBack]);

  const handleToggle = (questionId: string, checked: boolean) => {
    setReviewOverviewQuestionVisibility((current) => ({
      ...current,
      [questionId]: checked
    }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#fdfbf7] pb-[env(safe-area-inset-bottom)] pt-[var(--app-safe-area-top)] font-serif text-stone-900 animate-in slide-in-from-right duration-300">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-stone-100 bg-[#fdfbf7]/90 px-4 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          className="p-1 text-stone-400 transition-colors hover:text-stone-700"
          title="返回回顾总览"
          aria-label="返回回顾总览"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-lg font-bold text-stone-800">回顾问题显示</span>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-7 pb-24 pt-6">
        <div className="mx-auto max-w-4xl space-y-10">
          {sections.map((section) => {
            const visibleGroups = section.groups.filter((group) => group.questions.length > 0);
            if (visibleGroups.length === 0) {
              return null;
            }

            const tone = SECTION_TONES[section.kind];
            return (
              <section key={section.kind}>
                <div className={`mb-5 flex items-center justify-between border-b-2 pb-2 ${tone}`}>
                  <h2 className="text-[12px] font-bold uppercase tracking-[0.24em]">
                    {section.title}
                  </h2>
                  <span className="text-[11px] text-stone-400">
                    {visibleGroups.reduce((sum, group) => sum + group.questions.length, 0)} 个问题
                  </span>
                </div>

                <div className="space-y-7">
                  {visibleGroups.map((group) => (
                    <div key={group.id}>
                      <h3 className="mb-2 break-words text-base font-semibold text-stone-800">
                        {group.title}
                      </h3>
                      <div className="divide-y divide-stone-200/90 border-y border-stone-200/90">
                        {group.questions.map((question) => {
                          const checked = reviewOverviewQuestionVisibility[question.id] !== false;
                          return (
                            <label
                              key={question.id}
                              className="flex cursor-pointer items-center gap-4 py-4 transition-colors hover:bg-white/60"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block break-words text-[15px] font-medium leading-6 text-stone-800">
                                  {question.question}
                                </span>
                                <span className="mt-1 block text-[11px] text-stone-400">
                                  {TYPE_LABELS[question.type] || TYPE_LABELS.text}
                                </span>
                              </span>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => handleToggle(question.id, event.target.checked)}
                                className="h-5 w-5 shrink-0 accent-stone-700"
                                aria-label={`${question.question}：${checked ? '显示' : '隐藏'}`}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
};

