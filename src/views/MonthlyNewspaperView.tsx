/**
 * @file MonthlyNewspaperView.tsx
 * @input Monthly Review newspaper payload and the target month range
 * @output Full-screen editorial newspaper page for one month
 * @pos View (Review System)
 * @description Renders a dedicated monthly AI newspaper page using the persisted structured monthly newspaper payload on `MonthlyReview`.
 * @updated 2026-06-07: Added the first monthly newspaper full-screen view with overview, weekly sections, monthly theme, and next-period plan blocks.
 */
import React from 'react';
import type { MonthlyReview } from '../types';

interface MonthlyNewspaperViewProps {
  review: MonthlyReview;
  monthStartDate: Date;
  monthEndDate: Date;
}

const formatMonthLabel = (monthStartDate: Date): string => (
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long'
  }).format(monthStartDate)
);

const formatWeekRangeLabel = (weekStartDate: string, weekEndDate: string): string => {
  const start = new Date(`${weekStartDate}T12:00:00`);
  const end = new Date(`${weekEndDate}T12:00:00`);

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric'
  }).format(start) + ' - ' + new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric'
  }).format(end);
};

export const MonthlyNewspaperView: React.FC<MonthlyNewspaperViewProps> = ({
  review,
  monthStartDate,
  monthEndDate: _monthEndDate
}) => {
  const newspaper = review.aiNewspaper;

  if (!newspaper) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f8f7f5] px-6">
        <div className="max-w-md text-center text-sm leading-7 text-stone-500">
          这个月还没有生成 AI 小报。
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f8f7f5]">
      <div className="mx-auto min-h-full w-full max-w-3xl bg-white px-6 pb-16 pt-7 shadow-[0_10px_40px_rgba(15,23,42,0.04)] sm:px-10 sm:pt-8">
        <header className="border-b border-[#efede8] pb-5">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#91867a]">
            {formatMonthLabel(monthStartDate)}
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
                月度判断
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

          <section className="border-t border-[#efede8] pt-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#91867a]">
              本月主题
            </div>
            <p className="mt-3 font-serif text-[1.18rem] leading-8 text-black">
              {newspaper.monthlyTheme}
            </p>
          </section>

          <section>
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#91867a]">
              每周评价
            </div>
            <div className="space-y-8">
              {newspaper.weekSections.map((section) => (
                <article key={`${section.weekStartDate}-${section.weekEndDate}`} className="border-t border-[#efede8] pt-5 first:border-t-0 first:pt-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9d9489]">
                    {section.weekLabel} · {formatWeekRangeLabel(section.weekStartDate, section.weekEndDate)}
                  </div>
                  <p className="mt-2 font-serif text-[1.18rem] leading-8 text-black">
                    {section.weeklySummary}
                  </p>
                  {section.highlights.length > 0 && (
                    <div className="mt-3 space-y-2 border-l-2 border-[#d8d2c7] pl-4">
                      {section.highlights.map((item, index) => (
                        <p key={`${section.weekStartDate}-${index}`} className="font-serif text-[14px] leading-6 text-[#6a635c]">
                          {item}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-[13px] leading-6 text-[#7b746c]">
                    风险点：{section.riskPoint}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {newspaper.nextPeriodPlan.length > 0 && (
            <section className="border-t border-[#efede8] pt-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#91867a]">
                下月计划
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

export default MonthlyNewspaperView;
