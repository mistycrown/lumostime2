/**
 * @file journalPdfCover.ts
 * @input Selected journal dates, actual time blocks and an optional authored daily summary
 * @output Responsive portrait/landscape journal covers using vector print artwork
 * @pos Service (Journal cover)
 * @updated 2026-10-23: Uses restrained Radix paper, four type tiers and an actual time-grid composition.
 */
import { JOURNAL_COLORS as C } from './journalPdfTheme';
import { formatJournalDuration, shiftJournalDate } from '../utils/journalExport';
import { formatDateKey, getStartOfWeek, parseDateKey } from '../utils/todoScheduleUtils';
import { layoutJournalTimeline } from '../utils/journalTimelineLayout';
import { journalBlockColor } from './journalPdfTimeline';
import type { JournalPdfWriter } from './journalPdfLayout';

const INK = C.ink;
const MUTED = C.muted;
const PAPER = C.paper;

export const writeJournalCover = (w: JournalPdfWriter): void => {
  w.startCoverPage();
  const wide = w.model.options.paperSize === 'a4';
  const left = w.pageMargin + (wide ? 12 : 8);
  const right = w.width - left;
  const span = right - left;
  w.rect(0, 0, w.width, w.height, PAPER);
  const years = w.model.years;
  const year = years.length === 1 ? String(years[0]) : `${years[0]} / ${years[years.length - 1]}`;
  const titleWidth = wide ? span * 0.51 : span;
  const yearSize = w.widthOf(year, 64) <= titleWidth ? 64 : 24;
  w.text(year, left - 2, wide ? 91 : 99, yearSize, INK);
  w.text('Life Journal', left, wide ? 203 : 190, 24, INK);
  w.text(`${w.model.options.startDate.replace(/-/g, '.')} — ${w.model.options.endDate.replace(/-/g, '.')}`, left + 1, wide ? 261 : 239, 8.5, MUTED);
  const quote = w.model.days.find((day) => day.review?.summary?.trim())?.review?.summary;
  if (quote) {
    const size = 12;
    const lines = w.wrap(quote, wide ? span * 0.45 : span, size, 'hand');
    const limit = wide ? 3 : 2;
    lines.slice(0, limit).forEach((line, index) => w.text(index === limit - 1 && lines.length > limit ? w.fitted(lines.slice(index).join(''), wide ? span * 0.45 : span, size, 'hand') : line, left, (wide ? 314 : 276) + index * size * 1.6, size, INK, 'hand'));
  }
  const totals = new Map<string, number>();
  w.model.days.forEach((day) => {
    const week = formatDateKey(getStartOfWeek(parseDateKey(day.date)!));
    totals.set(week, (totals.get(week) || 0) + day.actualSeconds);
  });
  const week = [...totals].sort((a, b) => b[1] - a[1])[0][0];
  const days = new Map(w.model.days.map((day) => [day.date, day]));
  const x = wide ? w.width * 0.57 : left;
  const width = wide ? right - x : span;
  const top = wide ? 118 : 349;
  const height = wide ? 278 : 113;
  w.text(`${week.replace(/-/g, '.')} — ${shiftJournalDate(week, 6).slice(5).replace('-', '.')}`, x, top - 32, 9, MUTED);
  const col = width / 7;
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const key = shiftJournalDate(week, dayIndex);
    const day = days.get(key);
    w.text(key.slice(8), x + col * dayIndex + 4, top - 15, 9, MUTED);
    if (!day) w.rect(x + dayIndex * col, top, col, height, C.fill);
    if (day) layoutJournalTimeline(day.logs.filter((log) => !log.source.isPlanned), key).forEach((block) => {
      const lane = (col - 4) / block.laneCount;
      w.rect(x + dayIndex * col + 2 + block.lane * lane, top + block.startMinute / 1440 * height, lane - 1, Math.max(0.5, (block.endMinute - block.startMinute) / 1440 * height - 0.6), journalBlockColor(block.log.activity, block.log.color, 0.45));
    });
  }
  for (let hour = 0; hour <= 24; hour += 3) w.line(x, top + hour / 24 * height, width, C.line);
  for (let colIndex = 0; colIndex <= 7; colIndex++) w.verticalLine(x + colIndex * col, top, height, C.line);
  const actual = w.model.days.flatMap((day) => day.logs.filter((log) => !log.source.isPlanned));
  const metrics = [[String(w.model.days.length), '天数'], [formatJournalDuration(w.model.days.reduce((sum, day) => sum + day.actualSeconds, 0)), '记录时长'], [String(new Set(actual.map((log) => log.source.id)).size), '记录数']];
  w.line(left, 490, span, C.line);
  metrics.forEach(([value, label], index) => {
    const mx = left + index * span / 3;
    const size = Math.min(wide ? 20 : 14, (span / 3 - 10) / Math.max(1, w.widthOf(value, 1)));
    w.text(value, mx, 506, size, INK);
    w.text(label, mx, 535, 7, MUTED);
  });
  w.text('LumosTime', left, wide ? 553 : 560, 9, MUTED);
};
