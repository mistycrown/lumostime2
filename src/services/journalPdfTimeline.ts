/**
 * @file journalPdfTimeline.ts
 * @input Weekly days and a shared PDF writer
 * @output Seven-day, 24-hour colored time-block overview, without detailed notes
 * @pos Service (Journal PDF timeline)
 * @updated 2026-10-23: Adds reference-style hourly grids, weekend tinting and overlap lanes.
 * @updated 2026-10-23: Shares eight-column A5 spreads/A4 landscape geometry and review sidebars.
 * @updated 2026-10-23: Maps activity hues to Radix scales and retains readable 9pt block labels.
 * @updated 2026-10-23: Joins daily columns, rounds each Log block and treats Saturday/Sunday like other days.
 */
import { JOURNAL_COLORS as C } from './journalPdfTheme';
import type { JournalDay } from '../utils/journalExport';
import { formatJournalTime, shiftJournalDate } from '../utils/journalExport';
import { layoutJournalTimeline } from '../utils/journalTimelineLayout';
import type { JournalPdfWriter } from './journalPdfLayout';
import type { WeeklyReview } from '../types';
import { writeJournalOverview } from './journalPdfOverview';

export { journalDataColor as journalBlockColor } from './journalPdfTheme';
import { journalDataColor as journalBlockColor } from './journalPdfTheme';

export const writeWeeklyTimeline = (w: JournalPdfWriter, week: string, days: JournalDay[], review?: WeeklyReview): void => {
  writeJournalOverview(w, '时间轴 周概览', `${week} — ${shiftJournalDate(week, 6)}`, (panel) => {
  const compact = w.model.options.paperSize === 'a5';
  const axis = 29;
  const x0 = panel.x + axis;
  const visibleDays = Math.min(panel.count, 7 - panel.start);
  const column = (panel.column * visibleDays - axis) / visibleDays;
  const top = panel.top + 35;
  const height = w.bottom - top - 23;
  const hour = height / 24;
  const colors = new Map<string, string | undefined>();
  const dayMap = new Map(days.map((day) => [day.date, day]));
  const dates = Array.from({ length: 7 }, (_, index) => shiftJournalDate(week, index));
  const ink = C.ink;
  dates.forEach((date, index) => {
    if (index < panel.start || index >= panel.start + panel.count) return;
    const x = x0 + (index - panel.start) * column;
    const day = dayMap.get(date);
    const background = !day ? C.fill : C.paper;
    w.rect(x, top - 31, column, height + 31, background);
    w.text(date.slice(8), x + 4, top - 29, compact ? 12 : 15, day ? ink : C.muted);
    w.text(['MON 一', 'TUE 二', 'WED 三', 'THU 四', 'FRI 五', 'SAT 六', 'SUN 日'][index], x + 4, top - 10, compact ? 5 : 6, ink);
  });
  for (let half = 0; half <= 48; half++) {
    const y = top + half * hour / 2;
    w.line(x0, y, column * visibleDays, half % 2 ? C.fill : C.line);
    if (half % 2 === 0) w.text(`${String(half / 2).padStart(2, '0')}:00`, w.margin, y - 3, compact ? 5 : 6, C.muted);
  }
  for (let index = 0; index <= visibleDays; index++) w.verticalLine(x0 + index * column, top - 31, height + 31);
  days.forEach((day) => {
    const index = dates.indexOf(day.date);
    if (index < panel.start || index >= panel.start + panel.count) return;
    layoutJournalTimeline(day.logs, day.date).forEach((block) => {
      const log = block.log;
      colors.set(log.activity, log.color);
      const laneWidth = (column - 2) / block.laneCount;
      const x = x0 + (index - panel.start) * column + 1 + block.lane * laneWidth;
      const y = top + block.startMinute / 1440 * height;
      const blockHeight = Math.max(0.7, (block.endMinute - block.startMinute) / 1440 * height - 0.7);
      const width = Math.max(1, laneWidth - 1);
      w.roundedRect(x, y, width, blockHeight, journalBlockColor(log.activity, log.color, log.source.isPlanned ? 0.86 : 0.5));
      if (width < 19 || blockHeight < 12) return;
      const size = 9;
      let cursor = y + 2;
      if (blockHeight >= size * 3.5) {
        w.text(w.fitted(`${log.source.isPlanned ? '计划 ' : ''}${formatJournalTime(log.start, day.date)}`, width - 5, size), x + 3, cursor, size, ink);
        cursor += size + 3;
      }
      const title = `${log.source.isPlanned && blockHeight < size * 3.5 ? '计划 ' : ''}${log.source.title || log.activity}`;
      const lines = w.wrap(title, width - 5, size, 'hand');
      const available = Math.max(0, Math.floor((y + blockHeight - cursor - 1 - size) / (size * 1.45)) + 1);
      lines.slice(0, available).forEach((line, lineIndex) => {
        const final = lineIndex === available - 1 && lines.length > available ? w.fitted(lines.slice(lineIndex).join(''), width - 5, size, 'hand') : line;
        w.text(final, x + 3, cursor + lineIndex * size * 1.45, size, ink, 'hand');
      });
    });
  });
  const legendWidth = w.contentWidth / Math.max(1, Math.min(colors.size, 6));
  Array.from(colors).slice(0, 6).forEach(([name, color], index) => {
    const x = w.margin + index * legendWidth;
    w.rect(x, top + height + 12, 7, 7, journalBlockColor(name, color, 0.5));
    w.text(w.fitted(name, legendWidth - 17, 6), x + 11, top + height + 12, 6, ink);
  });
  w.y = w.bottom;
  }, review, '每周回顾');
};
