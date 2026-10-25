/**
 * @file journalPdfTimeline.ts
 * @input Weekly days and a shared PDF writer
 * @output Seven-day, 24-hour colored time-block overview, without detailed notes
 * @pos Service (Journal PDF timeline)
 * @updated 2026-10-23: Adds reference-style hourly grids, weekend tinting and overlap lanes.
 * @updated 2026-10-23: Shares eight-column A5 spreads/A4 landscape geometry and review sidebars.
 * @updated 2026-10-23: Maps activity hues to Radix scales and retains readable 9pt block labels.
 * @updated 2026-10-23: Joins daily columns, rounds each Log block and treats Saturday/Sunday like other days.
 * @updated 2026-10-24: Keeps one hour axis per spread, pale grids, short activity/note labels and no legend.
 * @updated 2026-10-25: Uses plan/task titles for planned blocks instead of the missing-activity placeholder.
 */
import { JOURNAL_COLORS as C } from './journalPdfTheme';
import type { JournalDay } from '../utils/journalExport';
import { shiftJournalDate } from '../utils/journalExport';
import { journalNoteRuns } from '../utils/journalLogContent';
import { layoutJournalTimeline } from '../utils/journalTimelineLayout';
import type { JournalPdfWriter } from './journalPdfLayout';
import type { WeeklyReview } from '../types';
import { writeJournalOverview } from './journalPdfOverview';

export { journalDataColor as journalBlockColor } from './journalPdfTheme';
import { journalDataColor as journalBlockColor } from './journalPdfTheme';

export const writeWeeklyTimeline = (w: JournalPdfWriter, week: string, days: JournalDay[], review?: WeeklyReview): void => {
  writeJournalOverview(w, '时间轴 周概览', `${week} — ${shiftJournalDate(week, 6)}`, (panel) => {
  const compact = w.model.options.paperSize === 'a5';
  const axis = panel.start === 0 ? 29 : 0;
  const x0 = panel.x + axis;
  const visibleDays = Math.min(panel.count, 7 - panel.start);
  const column = (panel.width - 29) / (compact ? 4 : 8);
  panel.reviewX = x0 + visibleDays * column + 9;
  panel.reviewWidth = panel.x + panel.width - panel.reviewX - 9;
  const top = panel.top + 35;
  const height = w.bottom - top - 4;
  const hour = height / 24;
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
    w.line(x0, y, column * visibleDays, half % 2 ? C.surface : C.fill);
    if (axis && half % 2 === 0) w.text(`${String(half / 2).padStart(2, '0')}:00`, w.margin, y - 3, 9, C.muted);
  }
  for (let index = 0; index <= visibleDays; index++) w.verticalLine(x0 + index * column, top - 31, height + 31, C.fill);
  days.forEach((day) => {
    const index = dates.indexOf(day.date);
    if (index < panel.start || index >= panel.start + panel.count) return;
    layoutJournalTimeline(day.logs, day.date).forEach((block) => {
      const log = block.log;
      const laneWidth = (column - 2) / block.laneCount;
      const x = x0 + (index - panel.start) * column + 1 + block.lane * laneWidth;
      const y = top + block.startMinute / 1440 * height;
      const blockHeight = Math.max(0.7, (block.endMinute - block.startMinute) / 1440 * height - 0.7);
      const width = Math.max(1, laneWidth - 1);
      w.roundedRect(x, y, width, blockHeight, journalBlockColor(log.activity, log.color, log.source.isPlanned ? 0.86 : 0.5));
      if (width < 19 || blockHeight < 10.5) return;
      w.withSmallType(7.5, () => {
        const label = log.source.isPlanned
          ? log.source.title?.trim() || log.todo?.name?.trim() || (log.activity === '未分类活动' ? '计划' : log.activity)
          : log.activity;
        const title = w.fitted(label, width - 6, 7.5, 'hand');
        w.text(title, x + 3, y + 1, 7.5, ink, 'hand');
        const note = journalNoteRuns(log.source.note || '').map((run) => run.text).join('').replace(/\s+/g, ' ').trim();
        const excerpt = Array.from(note).slice(0, 80).join('');
        const lines = w.wrap(excerpt + (excerpt !== note ? '…' : ''), width - 6, 7.5, 'hand');
        const available = Math.min(3, Math.max(0, Math.floor((blockHeight - 3) / 10) - 1));
        lines.slice(0, available).forEach((line, index) => {
          const final = index === available - 1 && lines.length > available ? w.fitted(lines.slice(index).join(''), width - 6, 7.5, 'hand') : line;
          w.text(final, x + 3, y + 11 + index * 10, 7.5, ink, 'hand');
        });
      });
    });
  });
  w.y = w.bottom;
  }, review, '每周回顾');
};
