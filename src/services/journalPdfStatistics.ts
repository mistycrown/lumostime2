/**
 * @file journalPdfStatistics.ts
 * @input Nested identity-preserving actual-time distributions with authored colors
 * @output Complete multi-column bar statistics without a separate detail appendix
 * @pos Service (Journal statistics layout)
 * @updated 2026-10-23: Combines charts and values, preserves every item and uses the user's original colors.
 * @updated 2026-10-24: Nests activity/task rows under their parent and reuses this layout for annual, monthly and weekly periods.
 */
import { JOURNAL_COLORS as C, journalDataColor } from './journalPdfTheme';
import { buildJournalDistributions, type JournalStatItem } from '../utils/journalStatistics';
import { formatJournalDuration, type JournalDay } from '../utils/journalExport';
import type { JournalPdfWriter } from './journalPdfLayout';
import { journalMarkdownText } from '../utils/journalMarkdown';

export const writeJournalDistributions = (w: JournalPdfWriter, month: string, days: JournalDay[]): void => {
  if (!days.some((day) => day.actualSeconds > 0)) return;
  w.startPage(`${month} 时间分布`, `${days[0].date} — ${days[days.length - 1].date}`);
  const wide = w.model.options.paperSize === 'a4';
  w.beginColumns(wide ? 3 : 2);
  const duration = (seconds: number): string => {
    if (wide) return formatJournalDuration(seconds);
    const minutes = Math.round(seconds / 60);
    return minutes >= 60 ? `${Math.floor(minutes / 60)}h${minutes % 60 ? `${minutes % 60}m` : ''}` : `${minutes}m`;
  };
  for (const [index, group] of buildJournalDistributions(days).entries()) {
    if (wide && index > 0) { w.y = w.bottom; w.ensure(1); }
    const valueOf = (seconds: number, child = false) => child ? duration(seconds) : `${duration(seconds)} ${(seconds / group.total * 100).toFixed(1)}%`;
    const linesOf = (name: string, seconds: number, child = false) => w.wrap(journalMarkdownText(name), Math.max(36, w.contentWidth - (child ? 12 : 0) - w.widthOf(valueOf(seconds, child), 9) - 8), 9, 'hand');
    const itemHeight = (item: JournalStatItem, child = false) => linesOf(item.name, item.seconds, child).length * 13.5 + (child ? 2 : 6);
    const height = 47 + group.items.reduce((sum, item) => sum + itemHeight(item) + (item.children || []).reduce((total, child) => total + itemHeight(child, true), 0) + 8, 0);
    w.ensure(Math.min(height, w.pageBottom - w.standardBodyTop));
    const header = () => {
      w.text(journalMarkdownText(group.label), w.margin, w.y, 12, C.ink);
      w.y += 20;
      w.paragraph(`${group.attributed ? '关联时长' : '记录时长'} ${duration(group.total)}`, 9, C.muted, 0, 'print');
      w.y += 3;
    };
    header();
    const max = Math.max(1, ...group.items.map((item) => item.seconds));
    if (!group.items.length) w.paragraph('—', 9, C.muted, 0, 'print');
    const row = (item: JournalStatItem, child = false) => {
      if (w.ensure(Math.min(itemHeight(item, child), w.pageBottom - w.standardBodyTop - 42))) header();
      const value = valueOf(item.seconds, child);
      const valueWidth = w.widthOf(value, 9);
      w.text(value, w.margin + w.contentWidth - valueWidth, w.y, 9, C.muted);
      if (child) w.page.drawCircle({ x: w.margin + 5, y: w.height - w.y - 6, size: 1.5, color: journalDataColor(item.id, item.color) });
      for (const line of linesOf(item.name, item.seconds, child)) {
        if (w.ensure(13.5)) header();
        w.text(line, w.margin + (child ? 12 : 0), w.y, 9, child ? C.muted : C.ink, 'hand');
        w.y += 13.5;
      }
      if (!child) {
        if (w.ensure(5)) header();
        w.rect(w.margin, w.y + 1, w.contentWidth, 3, C.fill);
        w.rect(w.margin, w.y + 1, w.contentWidth * item.seconds / max, 3, journalDataColor(item.id, item.color));
        w.y += 6;
      } else w.y += 2;
    };
    for (const item of group.items) {
      if (w.ensure(Math.min(itemHeight(item) + (item.children?.length ? itemHeight(item.children[0], true) : 0), w.pageBottom - w.standardBodyTop - 42))) header();
      row(item);
      item.children?.forEach((child) => row(child, true));
      w.y += 8;
    }
    w.y += 8;
  }
};
