/**
 * @file journalPdfMood.ts
 * @input Selected annual daily reviews and embedded mood sticker images
 * @output A compact one-page annual mood matrix plus flowing multi-column one-line summaries
 * @pos Service (Journal annual mood layouts)
 * @updated 2026-10-23: Keeps 12 months and 31 day rows on one page with small original stickers.
 */
import { rgb } from 'pdf-lib';
import type { JournalDay } from '../utils/journalExport';
import type { JournalPdfWriter } from './journalPdfLayout';

const MUTED = rgb(0.46, 0.48, 0.45);
const INK = rgb(0.19, 0.21, 0.19);

export const writeAnnualMood = (w: JournalPdfWriter, year: number, days: JournalDay[]): void => {
  const moods = days.filter((day) => day.review?.moodEmoji);
  if (moods.length) {
    w.startPage(`${year} 心情贴纸概览`, `${days[0].date} — ${days[days.length - 1].date}`);
    const axis = 16;
    const x0 = w.margin + axis;
    const column = (w.contentWidth - axis) / 12;
    const top = w.y + 20;
    const row = Math.min(18, (w.bottom - top - 5) / 31);
    const size = Math.min(14, row - 2);
    const map = new Map(days.map((day) => [day.date, day]));
    for (let month = 1; month <= 12; month++) {
      const x = x0 + (month - 1) * column;
      w.text(`${month}月`, x + 3, top - 18, 7, MUTED);
      const count = new Date(year, month, 0).getDate();
      for (let date = 1; date <= 31; date++) {
        const y = top + (date - 1) * row;
        const key = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
        const day = map.get(key);
        if (!day || date > count) w.rect(x, y, column, row, rgb(0.96, 0.96, 0.95));
        if (date <= count && day?.review?.moodEmoji) w.sticker(day.review.moodEmoji, x + (column - size) / 2, y + 1, size);
        if (month === 1) w.text(String(date).padStart(2, '0'), w.margin, y + (row - 6) / 2, 6, MUTED);
      }
    }
    for (let date = 0; date <= 31; date++) w.line(x0, top + date * row, column * 12, rgb(0.9, 0.91, 0.88));
    for (let month = 0; month <= 12; month++) w.verticalLine(x0 + month * column, top, row * 31, rgb(0.9, 0.91, 0.88));
    w.y = w.bottom;
  }
  const summaries = days.filter((day) => day.review?.summary?.trim());
  if (!summaries.length) return;
  w.startPage(`${year} 每日一句话与贴纸`, `${days[0].date} — ${days[days.length - 1].date}`);
  w.beginColumns(w.model.options.paperSize === 'a5' ? 2 : 3);
  for (const day of summaries) {
    w.ensure(55);
    w.text(day.date, w.margin, w.y, 7.5, MUTED);
    w.y += 12;
    const page = w.page;
    const x = w.margin;
    const top = w.y;
    const icon = day.review!.moodEmoji;
    if (icon) w.sticker(icon, x, top, 18);
    const indent = icon ? 25 : 0;
    for (const line of w.wrap(day.review!.summary!, w.contentWidth - indent, 8, 'hand')) {
      w.ensure(11);
      w.text(line, w.margin + indent, w.y, 8, INK, 'hand');
      w.y += 11;
    }
    w.y += 3;
    if (w.page === page && w.margin === x) w.y = Math.max(w.y, top + 22);
    if (w.y + 8 <= w.bottom) w.line(w.margin, w.y + 3, w.contentWidth);
    w.y += 8;
  }
};
