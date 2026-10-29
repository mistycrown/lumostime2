/**
 * @file journalPdfChecks.ts
 * @input Historical daily check snapshots for one month
 * @output Aligned completion circles, incomplete dashes and direct counts without a heavy grid
 * @pos Service (Journal monthly checks)
 * @updated 2026-10-23: Keeps dates and values centered at 9pt without a separate count appendix.
 * @updated 2026-10-24: Removes the redundant completion/count legend while preserving date-aligned circles, dashes and numbers.
 */
import { JOURNAL_COLORS as C } from './journalPdfTheme';
import { JOURNAL_STROKE } from '../utils/journalTheme';
import { getCheckItemCountState } from '../utils/dailyCheckUtils';
import type { JournalDay } from '../utils/journalExport';
import type { JournalPdfWriter } from './journalPdfLayout';
import { journalMarkdownText } from '../utils/journalMarkdown';

export const writeJournalCheckMatrix = (w: JournalPdfWriter, month: string, days: JournalDay[]): void => {
  const keyOf = (item: JournalDay['checks'][number]) => `${item.category || ''}\u0000${item.id || item.content}`;
  const items = new Map<string, string>();
  const byDate = new Map(days.map((day) => [day.date, day]));
  days.forEach((day) => day.checks.forEach((item) => items.set(keyOf(item), `${item.category ? `${item.category} / ` : ''}${item.content}`)));
  if (!items.size) return;
  const count = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const labelWidth = w.contentWidth * 0.32;
  const maxValue = Math.max(w.widthOf('31', 9), ...days.flatMap((day) => day.checks.filter((item) => item.manualMode === 'count').map((item) => w.widthOf(String(getCheckItemCountState(item).current), 9))));
  const perBand = Math.max(1, Math.min(w.model.options.paperSize === 'a5' ? 16 : count, Math.floor((w.contentWidth - labelWidth) / (maxValue + 2))));
  for (let start = 1; start <= count; start += perBand) {
    const end = Math.min(count, start + perBand - 1);
    const length = end - start + 1;
    const cell = (w.contentWidth - labelWidth) / length;
    const header = () => {
      w.ensure(35);
      w.text(`项目  ${start}–${end} 日`, w.margin, w.y, 9, C.muted);
      for (let date = start; date <= end; date++) {
        const value = String(date);
        const center = w.margin + labelWidth + (date - start + 0.5) * cell;
        w.text(value, center - w.widthOf(value, 9) / 2, w.y, 9, C.muted);
      }
      w.y += 24;
    };
    header();
    for (const [key, label] of items) {
      const lines = w.wrap(label, labelWidth - 12, 9);
      // Long item names can continue as text, without making a single table row taller than the page.
      const overflow = lines.length > 6;
      if (overflow) w.paragraph(label, 9);
      const labelLines = overflow ? [`项目 ${[...items.keys()].indexOf(key) + 1}`] : lines;
      const rowHeight = Math.max(30, labelLines.length * 13.5 + 10);
      if (w.ensure(rowHeight + 8)) header();
      labelLines.forEach((line, index) => w.text(line, w.margin, w.y + (rowHeight - labelLines.length * 13.5) / 2 + index * 13.5, 9, C.ink, 'hand'));
      for (let date = start; date <= end; date++) {
        const keyDate = `${month}-${String(date).padStart(2, '0')}`;
        const day = byDate.get(keyDate);
        const item = day?.checks.find((entry) => keyOf(entry) === key);
        const x = w.margin + labelWidth + (date - start) * cell;
        const center = x + cell / 2;
        const cy = w.y + rowHeight / 2;
        if (item?.manualMode === 'count') {
          const value = String(getCheckItemCountState(item).current);
          w.text(value, center - w.widthOf(value, 9) / 2, cy - 5.5, 9, item.isCompleted ? C.accent : C.muted);
        } else if (item?.isCompleted) w.page.drawCircle({ x: center, y: w.height - cy, size: 2.5, borderColor: w.accentColor, borderWidth: JOURNAL_STROKE });
        else if (item) w.line(center - 2.5, cy, 5, C.muted);
      }
      w.y += rowHeight;
      w.line(w.margin, w.y, w.contentWidth, C.line);
    }
    w.y += 18;
  }
};
