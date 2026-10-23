/**
 * @file journalPdfTimeline.ts
 * @input Weekly days and a shared PDF writer
 * @output Seven-day, 24-hour colored time-block overview, without detailed notes
 * @pos Service (Journal PDF timeline)
 * @updated 2026-10-23: Adds reference-style hourly grids, weekend tinting and overlap lanes.
 * @updated 2026-10-23: Shares eight-column A5 spreads/A4 landscape geometry and review sidebars.
 */
import { rgb } from 'pdf-lib';
import type { JournalDay } from '../utils/journalExport';
import { formatJournalTime, shiftJournalDate } from '../utils/journalExport';
import { layoutJournalTimeline } from '../utils/journalTimelineLayout';
import type { JournalPdfWriter } from './journalPdfLayout';
import type { WeeklyReview } from '../types';
import { writeJournalOverview } from './journalPdfOverview';

const palette = ['#709586', '#8b99bd', '#ca9c76', '#ae91aa', '#a5ad75', '#7ba5b2'];
export const journalBlockColor = (key: string, hex?: string, tint = 0.74) => {
  let color = hex;
  if (!/^#[a-f0-9]{6}$/i.test(color || '')) color = palette[Array.from(key).reduce((n, char) => n + char.codePointAt(0)!, 0) % palette.length];
  const channels = [1, 3, 5].map((offset) => parseInt(color!.slice(offset, offset + 2), 16) / 255);
  return rgb(...channels.map((value) => value + (1 - value) * tint) as [number, number, number]);
};

export const writeWeeklyTimeline = (w: JournalPdfWriter, week: string, days: JournalDay[], review?: WeeklyReview): void => {
  writeJournalOverview(w, '时间轴 · 周概览', `${week} — ${shiftJournalDate(week, 6)}`, (panel) => {
  const compact = w.model.options.paperSize === 'a5';
  const axis = 19;
  const x0 = panel.x + axis;
  const column = panel.column;
  const top = panel.top + 35;
  const height = w.bottom - top - 23;
  const hour = height / 24;
  const colors = new Map<string, string | undefined>();
  const dayMap = new Map(days.map((day) => [day.date, day]));
  const dates = Array.from({ length: 7 }, (_, index) => shiftJournalDate(week, index));
  const ink = rgb(0.19, 0.23, 0.21);
  dates.forEach((date, index) => {
    if (index < panel.start || index >= panel.start + panel.count) return;
    const x = x0 + (index - panel.start) * column;
    const day = dayMap.get(date);
    const background = !day ? rgb(0.95, 0.95, 0.94) : index === 5 ? rgb(0.94, 0.98, 0.98) : index === 6 ? rgb(0.99, 0.95, 0.97) : rgb(1, 1, 1);
    w.rect(x, top - 31, column - axis, height + 31, background);
    w.text(date.slice(8), x + 4, top - 29, compact ? 12 : 15, day ? ink : rgb(0.68, 0.69, 0.68));
    w.text(['MON 一', 'TUE 二', 'WED 三', 'THU 四', 'FRI 五', 'SAT 六', 'SUN 日'][index], x + 4, top - 10, compact ? 5 : 6, ink);
  });
  for (let half = 0; half <= 48; half++) {
    const y = top + half * hour / 2;
    w.line(x0, y, column * Math.min(panel.count, 7 - panel.start) - axis, half % 2 ? rgb(0.93, 0.94, 0.93) : rgb(0.82, 0.84, 0.81));
    if (half % 2 === 0) w.text(`${String(half / 2).padStart(2, '0')}:00`, w.margin, y - 3, compact ? 5 : 6, rgb(0.48, 0.51, 0.48));
  }
  for (let index = 0; index < Math.min(panel.count, 7 - panel.start); index++) {
    w.verticalLine(x0 + index * column, top - 31, height + 31);
    w.verticalLine(x0 + (index + 1) * column - axis, top - 31, height + 31);
  }
  days.forEach((day) => {
    const index = dates.indexOf(day.date);
    if (index < panel.start || index >= panel.start + panel.count) return;
    layoutJournalTimeline(day.logs, day.date).forEach((block) => {
      const log = block.log;
      colors.set(log.activity, log.color);
      const laneWidth = (column - axis - 4) / block.laneCount;
      const x = x0 + (index - panel.start) * column + 2 + block.lane * laneWidth;
      const y = top + block.startMinute / 1440 * height;
      const blockHeight = Math.max(0.7, (block.endMinute - block.startMinute) / 1440 * height - 0.7);
      const width = Math.max(1, laneWidth - 1);
      w.rect(x, y, width, blockHeight, journalBlockColor(log.activity, log.color, log.source.isPlanned ? 0.86 : 0.5));
      w.verticalLine(x, y, blockHeight, journalBlockColor(log.activity, log.color, 0));
      if (width < 15 || blockHeight < 8) return;
      const size = compact ? 6.5 : 7;
      let cursor = y + 2;
      if (blockHeight >= size * 3.5) {
        w.text(w.fitted(`${log.source.isPlanned ? '计划 ' : ''}${formatJournalTime(log.start, day.date)}`, width - 5, size - 0.5), x + 3, cursor, size - 0.5, ink);
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
