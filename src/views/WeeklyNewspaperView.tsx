/**
 * @file WeeklyNewspaperView.tsx
 * @input Weekly Review newspaper payload and the target week range
 * @output Full-screen editorial newspaper page for one week
 * @pos View (Review System)
 * @description Renders a dedicated weekly AI newspaper page using the persisted structured weekly newspaper payload on `WeeklyReview`.
 * @updated 2026-06-07: Added the first weekly newspaper full-screen view with overview, daily sections, weekly closing, and next-period plan blocks.
 */
import React from 'react';
import type { WeeklyReview } from '../types';

interface WeeklyNewspaperViewProps {
  review: WeeklyReview;
  weekStartDate: Date;
  weekEndDate: Date;
}

const formatDateLabel = (date: Date): string => (
  new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(date)
);

const formatWeekLabel = (weekStartDate: Date, weekEndDate: Date): string => (
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(weekStartDate)
  + ' - '
  + new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric'
  }).format(weekEndDate)
);

export const WeeklyNewspaperView: React.FC<WeeklyNewspaperViewProps> = ({
  review,
  weekStartDate,
  weekEndDate
}) => {
  const newspaper = review.aiNewspaper;

  if (!newspaper) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f8f7f5] px-6">
        <div className="max-w-md text-center text-sm leading-7 text-stone-500">
          这一周还没有生成 AI 小报。
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f8f7f5]">
      <div className="mx-auto min-h-full w-full max-w-3xl bg-white px-6 pb-16 pt-7 shadow-[0_10px_40px_rgba(15,23,42,0.04)] sm:px-10 sm:pt-8">
        <header className="border-b border-[#efede8] pb-5">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#91867a]">
            {formatWeekLabel(weekStartDate, weekEndDate)}
          </div>
          <h1 className="mt-2 font-serif text-[2rem] font-medium tracking-tight text-black sm:text-[2.55rem]">
            {newspaper.title}
          </h1>
          <p className="mt-2 max-w-2xl font-serif text-[15px] leading-7 text-[#4a433d] sm:text-base">
            {newspaper.overallComment}
          </p>
        </header>

        <main className="space-y-10 pt-7">
          {newspaper.keyInsights.length > 0 && (
            <section>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#91867a]">
                本周判断
              </div>
              <div className="space-y-3 border-l border-[#e4e0d9] pl-5">
                {newspaper.keyInsights.map((item, index) => (
                  <p key={`${item}-${index}`} className="font-serif text-[15px] leading-7 text-[#4a433d]">
                    {item}
                  </p>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#91867a]">
              每日点评
            </div>
            <div className="space-y-8">
              {newspaper.daySections.map((section) => (
                <article key={`${section.date}-${section.dayLabel}`} className="border-t border-[#efede8] pt-5 first:border-t-0 first:pt-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9d9489]">
                    {section.dayLabel} · {formatDateLabel(new Date(`${section.date}T12:00:00`))}
                  </div>
                  <p className="mt-2 font-serif text-[1.18rem] leading-8 text-black">
                    {section.dailySummary}
                  </p>
                  {section.keyPoints.length > 0 && (
                    <div className="mt-3 space-y-2 border-l-2 border-[#d8d2c7] pl-4">
                      {section.keyPoints.map((point, index) => (
                        <p key={`${section.date}-${index}`} className="font-serif text-[14px] leading-6 text-[#6a635c]">
                          {point}
                        </p>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="border-t border-[#efede8] pt-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#91867a]">
              本周收束
            </div>
            <p className="mt-3 font-serif text-[15px] leading-7 text-[#4a433d]">
              {newspaper.closingComment}
            </p>
          </section>

          {newspaper.nextPeriodPlan.length > 0 && (
            <section className="border-t border-[#efede8] pt-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#91867a]">
                下周计划
              </div>
              <div className="mt-3 space-y-3">
                {newspaper.nextPeriodPlan.map((item, index) => (
                  <p key={`${item}-${index}`} className="font-serif text-[15px] leading-7 text-[#4a433d]">
                    {item}
                  </p>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default WeeklyNewspaperView;
