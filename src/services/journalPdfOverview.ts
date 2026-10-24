/**
 * @file journalPdfOverview.ts
 * @input Shared app month layout, review records and PDF writer
 * @output A5 facing spreads or a single landscape A4 overview with an eighth review column
 * @pos Service (Journal overview layouts)
 * @updated 2026-10-23: Reuses month trace lanes, schedule colors and eight-column book geometry.
 * @updated 2026-10-23: Uses the book's paper orientation for overview and continuation pages.
 * @updated 2026-10-23: Uses Radix fills, readable 9pt calendar entries and half-pixel grid rules.
 * @updated 2026-10-23: Retains historical review groups and preserves the user schedule/category color settings.
 * @updated 2026-10-24: Spaces review groups, questions and answers and supports the shared timeline axis geometry.
 */
import { JOURNAL_COLORS as C } from './journalPdfTheme';
import type { DailyReview, MonthlyReview, WeeklyReview, ReviewTemplate } from '../types';
import type { JournalDay } from '../utils/journalExport';
import { shiftJournalDate } from '../utils/journalExport';
import { buildTodoMonthWeekLayout, formatDateKey, getStartOfWeek, parseDateKey, type TodoDateEntry } from '../utils/todoScheduleUtils';
import { JOURNAL_STROKE } from '../utils/journalTheme';
import type { JournalPdfWriter, JournalTextRole } from './journalPdfLayout';
import { journalBlockColor } from './journalPdfTimeline';

const INK = C.ink;
const MUTED = C.muted;
export type JournalReview = DailyReview | WeeklyReview | MonthlyReview;
export interface ReviewLine { text: string; role: JournalTextRole; level?: 'group' | 'question' }

export const journalReviewLines = (review?: JournalReview, templates: ReviewTemplate[] = []): ReviewLine[] => {
  if (!review) return [];
  const lines: ReviewLine[] = [];
  const add = (label: string, value?: string) => {
    if (!value?.trim()) return;
    if (label) lines.push({ text: label, role: 'print' });
    lines.push({ text: value, role: 'hand' });
  };
  if ('cite' in review) add('引言', review.cite);
  add('date' in review ? '总结' : '摘要', review.summary);
  const definitions = [...(review.templateSnapshot || []), ...templates];
  const groups = new Map<string, { title: string; order: number; answers: typeof review.answers }>();
  review.answers.filter((answer) => answer.answer.trim()).forEach((answer) => {
    const template = definitions.find((item) => item.questions.some((question) => question.id === answer.questionId));
    const id = template?.id || '__ungrouped__';
    const group = groups.get(id) || { title: template?.title || '未分组问题', order: template ? template.order ?? definitions.indexOf(template) : Number.MAX_SAFE_INTEGER, answers: [] };
    group.answers.push(answer); groups.set(id, group);
  });
  [...groups.values()].sort((a, b) => a.order - b.order).forEach((group) => {
    lines.push({ text: group.title, role: 'print', level: 'group' });
    group.answers.forEach((answer) => {
      lines.push({ text: answer.question || '回顾', role: 'print', level: 'question' });
      lines.push({ text: answer.answer, role: 'hand' });
    });
  });
  add('叙事', review.narrative);
  const news = review.aiNewspaper;
  if (news) {
    add(news.title || '回顾', news.overallComment);
    if ('keyInsights' in news) news.keyInsights?.forEach((value) => add('洞察', value));
    if ('nextPeriodPlan' in news) news.nextPeriodPlan?.forEach((value) => add('下一步', value));
  }
  return lines;
};

export interface OverviewPanel { start: number; count: number; x: number; top: number; width: number; height: number; column: number; reviewX?: number; reviewWidth?: number }

/** The same eight logical columns are partitioned 4+4 on A5 and kept together on A4. */
export const writeJournalOverview = (
  w: JournalPdfWriter, title: string, subtitle: string,
  draw: (panel: OverviewPanel) => void, review?: JournalReview, reviewLabel = '回顾'
): void => {
  const spread = w.model.options.paperSize === 'a5';
  if (spread) w.alignSpread();
  let remaining: ReviewLine[] = [];
  for (let side = 0; side < (spread ? 2 : 1); side++) {
    w.startPage(title, `${subtitle}${spread ? ` ${side ? '右页' : '左页'}` : ''}`);
    const count = spread ? 4 : 8;
    const panel: OverviewPanel = { start: side * 4, count, x: w.margin, top: w.y, width: w.contentWidth, height: w.bottom - w.y - 10, column: w.contentWidth / count };
    draw(panel);
    if (panel.start + count === 8) {
      const x = panel.reviewX ?? panel.x + (7 - panel.start) * panel.column + 9;
      const width = panel.reviewWidth ?? panel.column - 18;
      let y = panel.top;
      w.text(reviewLabel, x, y, 9, MUTED);
      y += 25;
      let block = 0;
      const lines = journalReviewLines(review, w.model.reviewTemplates).flatMap((line) => line.text.replace(/\r\n?/g, '\n').split('\n').flatMap((paragraph) => {
        const id = block++;
        return w.wrap(paragraph, width, 9, line.role).map((text, index) => ({ ...line, text, block: id, gap: index ? 0 : line.level === 'group' ? 12 : line.level === 'question' ? 8 : line.role === 'hand' ? 3 : 6 }));
      }));
      for (let i = 0; i < lines.length; i++) {
        if (y + lines[i].gap + 12 > panel.top + panel.height - 15) {
          for (const rest of lines.slice(i)) {
            const previous = remaining[remaining.length - 1] as (ReviewLine & { block: number }) | undefined;
            if (previous?.block === rest.block) previous.text += rest.text;
            else remaining.push({ ...rest });
          }
          break;
        }
        const line = lines[i];
        y += line.gap;
        w.text(line.text, x, y, 9, line.role === 'print' ? MUTED : INK, line.role);
        y += 13.5;
      }
    }
    w.y = w.bottom;
  }
  if (remaining.length) {
    w.startPage(`${reviewLabel} 续`, subtitle);
    remaining.forEach((line) => {
      w.ensure(35); w.y += line.level === 'group' ? 12 : line.level === 'question' ? 8 : 3;
      w.paragraph(line.text, w.bodySize, line.role === 'print' ? MUTED : INK, 0, line.role);
    });
  }
};

export const journalCalendarColor = (w: JournalPdfWriter, entry: TodoDateEntry): string => {
  const style = w.model.calendarStyle;
  return (style.colorMode === 'category' && style.categoryColors[entry.todo.categoryId]) || style.colors[entry.primaryKind];
};

export const writeJournalCalendar = (w: JournalPdfWriter, month: string, days: JournalDay[], review?: MonthlyReview): void => {
  const first = formatDateKey(getStartOfWeek(parseDateKey(`${month}-01`)!));
  const count = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const rows = Math.ceil(((parseDateKey(`${month}-01`)!.getDay() + 6) % 7 + count) / 7);
  const map = new Map(days.map((day) => [day.date, day]));
  const entriesByDate = Object.fromEntries(days.map((day) => [day.date, day.todos]));
  writeJournalOverview(w, `${month} 月计划`, `${days[0].date} — ${days[days.length - 1].date}`, (panel) => {
    const { x, top, column } = panel;
    const cellHeight = (panel.height - 22) / rows;
    const laneHeight = 15;
    const visible = Math.max(1, Math.floor((cellHeight - 28) / laneHeight));
    const headers = ['MON 一', 'TUE 二', 'WED 三', 'THU 四', 'FRI 五', 'SAT 六', 'SUN 日'];
    for (let col = panel.start; col < Math.min(7, panel.start + panel.count); col++) {
      w.text(headers[col], x + (col - panel.start) * column + 5, top, 7, MUTED);
    }
    for (let row = 0; row < rows; row++) {
      const dates = Array.from({ length: 7 }, (_, i) => shiftJournalDate(first, row * 7 + i));
      const layout = buildTodoMonthWeekLayout(dates, entriesByDate, visible);
      const y = top + 22 + row * cellHeight;
      for (let col = panel.start; col < Math.min(7, panel.start + panel.count); col++) {
        const date = dates[col];
        const cellX = x + (col - panel.start) * column;
        const active = map.has(date) && date.startsWith(month);
        if (!active) w.rect(cellX, y, column, cellHeight, C.fill);
        w.text(date.slice(8), cellX + 5, y + 4, 9, active ? INK : MUTED);
        (layout.rowEntriesByDate[date] || []).slice(0, visible).forEach((entry, lane) => {
          if (!entry || entry.primaryKind === 'inProgress') return;
          const color = journalCalendarColor(w, entry);
          const blockY = y + 23 + lane * laneHeight;
          w.rect(cellX + 2, blockY, column - 4, laneHeight - 2, journalBlockColor('', color, 0.65));
          if (entry.primaryKind === 'maybe') w.page.drawRectangle({ x: cellX + 2, y: w.height - blockY - laneHeight + 2, width: column - 4, height: laneHeight - 2, borderColor: journalBlockColor('', color, 0), borderWidth: JOURNAL_STROKE, borderDashArray: [2, 2] });
          const marker = entry.primaryKind === 'deadline' || entry.primaryKind === 'recurring';
          const title = w.fitted(entry.todo.title, column - 11 - (marker ? 8 : 0), 9, 'hand');
          w.text(title, cellX + 5, blockY + 1, 9, entry.primaryKind === 'completed' ? MUTED : INK, 'hand');
          if (entry.primaryKind === 'deadline') {
            w.verticalLine(cellX + column - 10, blockY + 2, 7, journalBlockColor('', color, 0));
            w.rect(cellX + column - 10, blockY + 2, 4, 3, journalBlockColor('', color, 0));
          } else if (entry.primaryKind === 'recurring') {
            w.page.drawCircle({ x: cellX + column - 8, y: w.height - blockY - 5.5, size: 2.5, borderColor: journalBlockColor('', color, 0), borderWidth: JOURNAL_STROKE });
            w.line(cellX + column - 8, blockY + 3, 3, journalBlockColor('', color, 0));
          }
          if (entry.primaryKind === 'completed') w.line(cellX + 5, blockY + 5, Math.min(w.widthOf(title, 9, 'hand'), column - 10), MUTED);
        });
        const hidden = layout.hiddenCountByDate[date];
        if (hidden) w.text(`+${hidden}`, cellX + 5, y + cellHeight - 10, 6, MUTED);
      }
      layout.traceSegments.filter((segment) => segment.laneIndex < visible).forEach((segment) => {
        const start = Math.max(segment.startDayIndex, panel.start);
        const end = Math.min(segment.endDayIndex, panel.start + panel.count - 1, 6);
        if (start > end) return;
        const color = journalCalendarColor(w, segment.entry);
        const segmentX = x + (start - panel.start) * column + 2;
        const width = (end - start + 1) * column - 4;
        const segmentY = y + 23 + segment.laneIndex * laneHeight;
        w.rect(segmentX, segmentY, width, laneHeight - 2, journalBlockColor('', color, 0.65));
        w.text(w.fitted(`${start > segment.startDayIndex ? '‹ ' : ''}${segment.entry.todo.title}`, width - 6, 9, 'hand'), segmentX + 3, segmentY + 1, 9, MUTED, 'hand');
      });
      w.line(x, y, column * Math.min(panel.count, 7 - panel.start));
    }
    const calendarColumns = Math.min(panel.count, 7 - panel.start);
    w.line(x, top + 22 + rows * cellHeight, column * calendarColumns);
    for (let col = 0; col <= calendarColumns; col++) w.verticalLine(x + col * column, top + 22, rows * cellHeight);
  }, review, '月度回顾');
};
