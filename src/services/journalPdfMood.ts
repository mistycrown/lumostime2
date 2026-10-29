/**
 * @file journalPdfMood.ts
 * @input Selected annual daily reviews and embedded mood sticker images
 * @output An A4 annual calendar or A5 mood matrix plus compact multi-column summaries
 * @pos Service (Journal annual mood layouts)
 * @updated 2026-10-23: Keeps 12 months and 31 day rows on one page with small original stickers.
 * @updated 2026-10-23: Aligns the compact annual day labels at the 9pt minimum print size.
 * @updated 2026-10-23: Uses twelve A4 mini calendars with stickers replacing dates and one-line 12pt summary stickers.
 * @updated 2026-10-29: Uses the shared Markdown renderer for annual one-line summaries.
 */
import { JOURNAL_COLORS as C } from './journalPdfTheme';
import { journalHasPart, type JournalDay } from '../utils/journalExport';
import type { JournalPdfWriter } from './journalPdfLayout';
import { writeJournalMarkdown } from './journalPdfMarkdown';

const MUTED = C.muted;
const INK = C.ink;

const writeMoodYearCalendar = (w: JournalPdfWriter, year: number, days: JournalDay[]): void => {
  const map = new Map(days.map((day) => [day.date, day]));
  const gap = 18;
  const width = (w.contentWidth - gap * 3) / 4;
  const height = (w.bottom - w.y) / 3;
  const origin = w.y;
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  for (let month = 1; month <= 12; month++) {
    const x = w.margin + (month - 1) % 4 * (width + gap);
    const top = origin + Math.floor((month - 1) / 4) * height;
    w.text(`${String(month).padStart(2, '0')} / ${monthNames[month - 1]}`, x, top, 12, INK);
    const cell = width / 7;
    const row = Math.min(16, (height - 38) / 6);
    const first = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const count = new Date(year, month, 0).getDate();
    [...'一二三四五六日'].forEach((label, index) => w.text(label, x + (index + 0.5) * cell - w.widthOf(label, 9) / 2, top + 22, 9, MUTED));
    for (let date = 1; date <= count; date++) {
      const position = first + date - 1;
      const cx = x + (position % 7 + 0.5) * cell;
      const y = top + 37 + Math.floor(position / 7) * row;
      const day = map.get(`${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`);
      if (day?.review?.moodEmoji) w.sticker(day.review.moodEmoji, cx - 6, y - 1, 12);
      else w.text(String(date), cx - w.widthOf(String(date), 9) / 2, y, 9, day ? INK : MUTED);
    }
  }
};

export const writeAnnualMood = (w: JournalPdfWriter, year: number, days: JournalDay[]): void => {
  const moods = days.filter((day) => day.review?.moodEmoji);
  if (moods.length && (!w.model.options.parts || journalHasPart(w.model.options, 'mood'))) {
    w.startPage(`${year} 心情贴纸概览`, `${days[0].date} — ${days[days.length - 1].date}`);
    if (w.model.options.paperSize === 'a4') writeMoodYearCalendar(w, year, days);
    else {
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
          if (!day || date > count) w.rect(x, y, column, row, C.fill);
          if (date <= count && day?.review?.moodEmoji) w.sticker(day.review.moodEmoji, x + (column - size) / 2, y + 1, size);
          if (month === 1) w.text(String(date).padStart(2, '0'), w.margin, y + (row - 9) / 2, 9, MUTED);
        }
      }
      for (let date = 0; date <= 31; date++) w.line(x0, top + date * row, column * 12, C.line);
      for (let month = 0; month <= 12; month++) w.verticalLine(x0 + month * column, top, row * 31, C.line);
    }
    w.y = w.bottom;
  }
  const summaries = days.filter((day) => day.review?.summary?.trim());
  if (!summaries.length || (w.model.options.parts && !journalHasPart(w.model.options, 'oneLine'))) return;
  w.startPage(`${year} 每日一句话与贴纸`, `${days[0].date} — ${days[days.length - 1].date}`);
  w.beginColumns(w.model.options.paperSize === 'a5' ? 2 : 3);
  for (const day of summaries) {
    w.ensure(42);
    w.text(day.date, w.margin, w.y, 7.5, MUTED);
    w.y += 12;
    const page = w.page;
    const x = w.margin;
    const top = w.y;
    const icon = day.review!.moodEmoji;
    if (icon) w.sticker(icon, x, top, 12);
    const indent = icon ? 18 : 0;
    writeJournalMarkdown(w, day.review!.summary!, { indent });
    if (w.page === page && w.margin === x) w.y = Math.max(w.y, top + 13.5);
    if (w.y + 8 <= w.bottom) w.line(w.margin, w.y + 3, w.contentWidth);
    w.y += 8;
  }
};
