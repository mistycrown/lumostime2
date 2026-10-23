/**
 * @file journalPdfStatistics.ts
 * @input Six identity-preserving actual-time distributions with authored colors
 * @output Complete multi-column bar statistics without a separate detail appendix
 * @pos Service (Journal statistics layout)
 * @updated 2026-10-23: Combines charts and values, preserves every item and uses the user's original colors.
 */
import { JOURNAL_COLORS as C, journalDataColor } from './journalPdfTheme';
import { buildJournalDistributions } from '../utils/journalStatistics';
import { formatJournalDuration, type JournalDay } from '../utils/journalExport';
import type { JournalPdfWriter } from './journalPdfLayout';

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
  for (const group of buildJournalDistributions(days)) {
    const valueOf = (seconds: number) => `${duration(seconds)} ${(seconds / group.total * 100).toFixed(1)}%`;
    const linesOf = (name: string, seconds: number) => w.wrap(name, Math.max(36, w.contentWidth - w.widthOf(valueOf(seconds), 9) - 8), 9, 'hand');
    const itemHeight = (name: string, seconds: number) => linesOf(name, seconds).length * 13.5 + 5;
    const height = 47 + group.items.reduce((sum, item) => sum + itemHeight(item.name, item.seconds), 0);
    w.ensure(Math.min(height, w.pageBottom - w.standardBodyTop));
    const header = () => {
      w.text(group.label, w.margin, w.y, 12, C.ink);
      w.y += 20;
      w.paragraph(`${group.attributed ? '关联时长' : '记录时长'} ${duration(group.total)}`, 9, C.muted, 0, 'print');
      w.y += 3;
    };
    header();
    const max = Math.max(1, ...group.items.map((item) => item.seconds));
    if (!group.items.length) w.paragraph('—', 9, C.muted, 0, 'print');
    for (const item of group.items) {
      if (w.ensure(Math.min(itemHeight(item.name, item.seconds), w.pageBottom - w.standardBodyTop - 42))) header();
      const value = valueOf(item.seconds);
      const valueWidth = w.widthOf(value, 9);
      w.text(value, w.margin + w.contentWidth - valueWidth, w.y, 9, C.muted);
      for (const line of linesOf(item.name, item.seconds)) {
        if (w.ensure(13.5)) header();
        w.text(line, w.margin, w.y, 9, C.ink, 'hand');
        w.y += 13.5;
      }
      if (w.ensure(5)) header();
      w.rect(w.margin, w.y + 1, w.contentWidth, 3, C.fill);
      w.rect(w.margin, w.y + 1, w.contentWidth * item.seconds / max, 3, journalDataColor(item.id, item.color));
      w.y += 5;
    }
    w.y += 8;
  }
};
