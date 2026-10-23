/**
 * @file journalPdfBook.ts
 * @input Date-bounded journal model and measured writer
 * @output Annual front matter followed by interleaved month/week/day journal pages
 * @pos Service (Journal book composition)
 * @updated 2026-10-23: Adds goal progress, summary stickers, two-column agendas and monthly statistics.
 * @updated 2026-10-23: Uses a compact annual mood matrix and small multi-column summary stickers.
 * @updated 2026-10-23: Sizes contents capacity from the printable height of the selected paper.
 * @updated 2026-10-23: Uses editorial covers, multi-column body pages and six donut distributions.
 */
import { JOURNAL_COLORS as C } from './journalPdfTheme';
import type { Goal, MajorGoal } from '../types';
import { formatGoalValue } from '../utils/goalUtils';
import { getJournalDayPlans, shiftJournalDate, type JournalDay } from '../utils/journalExport';
import { dateLabel, rangeLabel, stats, writeCheckMatrix, writePlans, type JournalPdfProgress, type JournalPdfWriter } from './journalPdfLayout';
import { journalReviewLines, writeJournalCalendar, type JournalReview } from './journalPdfOverview';
import { writeWeeklyTimeline } from './journalPdfTimeline';
import { writeAnnualMood } from './journalPdfMood';
import { writeJournalCover } from './journalPdfCover';
import { writeJournalDistributions } from './journalPdfStatistics';
import { writeJournalDay } from './journalPdfDay';

const MUTED = C.muted;
const ACCENT = C.accent;
const hasReview = (review?: JournalReview): boolean => journalReviewLines(review).length > 0;
const writeReview = (w: JournalPdfWriter, review: JournalReview, omitSummary = false) => {
  if (w.model.options.paperSize === 'a4' && !w.compact) w.beginColumns(3);
  journalReviewLines(omitSummary ? { ...review, summary: undefined } : review).forEach((line) => {
    if (line.role === 'print') w.heading(line.text);
    else w.paragraph(line.text);
  });
};

const writeYear = (w: JournalPdfWriter, year: number, days: JournalDay[], includeReviews: boolean): void => {
  const model = w.model;
  w.startPage(`${year} 年度回顾`, rangeLabel(days));
  w.paragraph(stats(days), 12, ACCENT, 0, 'print');
  w.paragraph(`${days.filter((day) => day.actualSeconds > 0).length} 个记录日 ${days.reduce((sum, day) => sum + day.checks.filter((item) => item.isCompleted).length, 0)} 项日课完成`, 9, MUTED, 0, 'print');
  if (model.options.paperSize === 'a4') w.beginColumns(3);
  for (const month of model.months.filter((key) => key.startsWith(String(year)))) {
    const monthDays = days.filter((day) => day.date.startsWith(month));
    w.heading(`${Number(month.slice(5))} 月`);
    w.paragraph(stats(monthDays), 9, MUTED, 0, 'print');
    const review = model.monthlyReviews.find((item) => item.monthStartDate.startsWith(month));
    if (includeReviews && review?.cite) w.paragraph(review.cite);
    if (includeReviews && review?.summary) w.paragraph(review.summary);
  }
  const goals = model.goals.filter((goal) => goal.startDate <= `${year}-12-31` && goal.endDate >= `${year}-01-01`);
  if (goals.length) {
    w.startPage(`${year} 目标与子目标`, `进度截至 ${model.options.endDate}`);
    if (model.options.paperSize === 'a4') w.beginColumns(3);
    const writeGoal = (goal: Goal | MajorGoal, child = false) => {
      w.ensure(85);
      w.heading(child ? '子目标' : '目标');
      w.paragraph(goal.title, w.bodySize + 2);
      const state = goal.status === 'completed' ? '已完成' : goal.status === 'archived' ? '已归档' : goal.status === 'failed' ? '未达成' : '进行中';
      w.paragraph(`${goal.startDate} — ${goal.endDate} ${state}`, 8, MUTED, 0, 'print');
      const progress = model.goalProgress[goal.id];
      if (progress) {
        w.ensure(38);
        w.paragraph(`${formatGoalValue(progress.current, goal.metric)} / ${formatGoalValue(progress.target, goal.metric)} ${progress.percentage.toFixed(0)}%`, 9, ACCENT, 0, 'print');
        w.rect(w.margin, w.y, w.contentWidth, 3, C.fill);
        w.rect(w.margin, w.y, w.contentWidth * Math.max(0, Math.min(1, progress.percentage / 100)), 3, ACCENT);
        w.y += 12;
      }
      if (goal.motivation) w.paragraph(goal.motivation);
      if ('description' in goal && goal.description) w.paragraph(goal.description);
    };
    const majorIds = new Set(model.majorGoalIds);
    goals.filter((goal) => majorIds.has(goal.id)).forEach((major) => {
      writeGoal(major);
      goals.filter((goal) => 'majorGoalId' in goal && goal.majorGoalId === major.id).forEach((goal) => writeGoal(goal, true));
    });
    goals.filter((goal) => !majorIds.has(goal.id) && !('majorGoalId' in goal && goal.majorGoalId && goals.some((parent) => parent.id === goal.majorGoalId))).forEach((goal) => writeGoal(goal));
  }
  writeAnnualMood(w, year, days);
};

export const composeJournalBook = async (w: JournalPdfWriter, onProgress?: (progress: JournalPdfProgress) => void, signal?: AbortSignal): Promise<void> => {
  const check = async (message: string) => {
    signal?.throwIfAborted();
    onProgress?.({ message, pages: w.pageCount });
    await new Promise((resolve) => setTimeout(resolve, 0));
    signal?.throwIfAborted();
  };
  const model = w.model;
  const selected = new Set(model.options.sections);
  const reviews = selected.has('reviews');
  const contents: { label: string; page: number }[] = [];
  if (model.options.includeCover) writeJournalCover(w);
  // Reserve enough contents pages before composing so facing-page parity never shifts afterwards.
  const hasMonthlyContent = model.options.sections.some((section) => section !== 'yearly');
  const labels = model.years.flatMap((year) => [ ...(selected.has('yearly') ? [`${year} 年度回顾与目标`] : []), ...(hasMonthlyContent ? model.months.filter((month) => month.startsWith(String(year))).map((month) => `${month} 月 / 周 / 日`) : []) ]);
  const rowsPerPage = Math.floor((w.pageBottom - w.standardBodyTop) / 38);
  const contentsPages = Array.from({ length: Math.max(1, Math.ceil(labels.length / rowsPerPage)) }, () => {
    w.startPage('目录', rangeLabel(model.days));
    return { page: w.page, top: w.y };
  });
  const seenWeeks = new Set<string>();
  for (const year of model.years) {
    const yearDays = model.days.filter((day) => day.date.startsWith(String(year)));
    if (selected.has('yearly')) {
      await check('正在排版年度回顾与目标');
      contents.push({ label: `${year} 年度回顾与目标`, page: w.pageCount + 1 });
      writeYear(w, year, yearDays, reviews);
    }
    for (const month of model.months.filter((key) => key.startsWith(String(year)))) {
      await check(`正在排版 ${month}`);
      const days = yearDays.filter((day) => day.date.startsWith(month));
      const before = w.pageCount;
      const monthReview = reviews ? model.monthlyReviews.find((review) => review.monthStartDate.startsWith(month)) : undefined;
      if (selected.has('monthly')) {
        w.alignSpread();
        contents.push({ label: `${month} 月 / 周 / 日`, page: w.pageCount + 1 });
        writeJournalCalendar(w, month, days, monthReview);
        const planned = days.filter((day) => getJournalDayPlans(day).length);
        if (planned.length) {
          w.startPage(`${month} 日程明细`, rangeLabel(days));
          w.beginColumns(model.options.paperSize === 'a4' ? 3 : 2);
          planned.forEach((day) => { w.heading(dateLabel(day.date)); writePlans(w, day, true); });
        }
      } else if (hasReview(monthReview)) {
        w.startPage(`${month} 月复盘`, `${monthReview!.monthStartDate} — ${monthReview!.monthEndDate}`);
        writeReview(w, monthReview!);
      }
      if (selected.has('checks') && days.some((day) => day.checks.length)) {
        w.startPage(`${month} 月打卡`, rangeLabel(days));
        writeCheckMatrix(w, month, days);
      }
      if (selected.has('monthly') || selected.has('checks')) writeJournalDistributions(w, month, days);
      for (const week of model.weeks.filter((start) => days.some((day) => day.date >= start && day.date <= shiftJournalDate(start, 6)))) {
        const weekDays = model.days.filter((day) => day.date >= week && day.date <= shiftJournalDate(week, 6));
        const monthWeekDays = days.filter((day) => weekDays.includes(day));
        const first = !seenWeeks.has(week);
        const weekReview = reviews && first ? model.weeklyReviews.find((review) => review.weekStartDate === week) : undefined;
        if (first && selected.has('timeline')) {
          await check('正在排版周时间轴');
          writeWeeklyTimeline(w, week, weekDays, weekReview);
        } else if (hasReview(weekReview)) {
          w.startPage('周复盘', `${weekReview!.weekStartDate} — ${weekReview!.weekEndDate}`);
          writeReview(w, weekReview!);
        }
        seenWeeks.add(week);
        if (selected.has('weekly') && monthWeekDays.some((day) => getJournalDayPlans(day).length)) {
          w.startPage(`周计划${first ? '' : ' 跨月续'}`, rangeLabel(monthWeekDays));
          w.beginColumns(model.options.paperSize === 'a4' ? 3 : 2);
          monthWeekDays.forEach((day) => {
            if (!getJournalDayPlans(day).length) return;
            w.heading(dateLabel(day.date)); writePlans(w, day, !selected.has('monthly') && !selected.has('daily'));
          });
        }
        for (const day of monthWeekDays) {
          const detail = selected.has('daily') && (model.options.includeEmptyDays || day.hasContent);
          const logs = selected.has('logs') && (day.logs.length || model.options.includeEmptyDays);
          const review = reviews && hasReview(day.review);
          if (!detail && !logs && !review) continue;
          await check('正在排版每日详情');
          writeJournalDay(w, day, selected);
        }
      }
      if (!selected.has('monthly') && w.pageCount > before) contents.push({ label: `${month} 月 / 周 / 日`, page: w.nextContentPage(before) });
    }
  }
  if (!contents.length) {
    w.startPage('手账', rangeLabel(model.days));
    w.paragraph('所选范围暂无记录', 10, MUTED, 0, 'print');
    contents.push({ label: '手账', page: w.pageCount });
  }
  contentsPages.forEach(({ page, top }, index) => {
    w.page = page; w.width = page.getWidth(); w.height = page.getHeight();
    // startPage resets two-column text flow; all reserved contents pages use the normal page geometry.
    w.resetFlow();
    w.y = top;
    contents.slice(index * rowsPerPage, (index + 1) * rowsPerPage).forEach((entry) => {
      w.text(entry.label, w.margin, w.y, 12);
      const number = String(entry.page).padStart(2, '0');
      w.text(number, w.width - w.margin - w.widthOf(number, 10), w.y + 2, 10, ACCENT);
      w.line(w.margin, w.y + 27, w.contentWidth);
      w.y += 38;
    });
  });
  w.finish();
  await check('正在封装 PDF');
};
