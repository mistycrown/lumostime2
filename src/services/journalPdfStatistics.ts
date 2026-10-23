/**
 * @file journalPdfStatistics.ts
 * @input Six identity-preserving actual-time distributions
 * @output Compact vector donut panels with complete overflow legends
 * @pos Service (Journal statistics layout)
 * @updated 2026-10-23: Draws comparable category/activity/keyword/scope/todo charts on A4/A5 grids.
 */
import { JOURNAL_COLORS as C } from './journalPdfTheme';
import { buildJournalDistributions, type JournalStatItem } from '../utils/journalStatistics';
import { formatJournalDuration, type JournalDay } from '../utils/journalExport';
import { journalBlockColor } from './journalPdfTimeline';
import type { JournalPdfWriter } from './journalPdfLayout';

const INK = C.ink;
const MUTED = C.muted;

const annulus = (start: number, end: number, outer: number, inner: number): string => {
  const point = (angle: number, radius: number) => `${(Math.cos(angle) * radius).toFixed(4)} ${(Math.sin(angle) * radius).toFixed(4)}`;
  const steps = Math.max(1, Math.ceil((end - start) / (Math.PI / 2)));
  let path = `M ${point(start, outer)}`;
  for (let i = 1; i <= steps; i++) path += ` A ${outer} ${outer} 0 0 1 ${point(start + (end - start) * i / steps, outer)}`;
  path += ` L ${point(end, inner)}`;
  for (let i = steps - 1; i >= 0; i--) path += ` A ${inner} ${inner} 0 0 0 ${point(start + (end - start) * i / steps, inner)}`;
  return path + ' Z';
};

export const writeJournalDistributions = (w: JournalPdfWriter, month: string, days: JournalDay[]): void => {
  if (!days.some((day) => day.actualSeconds > 0)) return;
  const groups = buildJournalDistributions(days);
  const wide = w.model.options.paperSize === 'a4';
  const columns = wide ? 3 : 2;
  const panelHeight = wide ? 200 : 210;
  const perPage = columns * 2;
  const overflow: { label: string; items: JournalStatItem[]; total: number }[] = [];
  let origin = 0;
  groups.forEach((group, index) => {
    if (index % perPage === 0) { w.startPage(`${month} 时间分布`, `${days[0].date} — ${days[days.length - 1].date}`); origin = w.y; }
    const width = (w.contentWidth - (columns - 1) * 18) / columns;
    const x = w.margin + index % columns * (width + 18);
    const top = origin + Math.floor(index % perPage / columns) * panelHeight;
    w.text(group.label, x, top, 12, INK);
    if (!group.items.length) { w.text('—', x, top + 42, 9, MUTED); return; }
    const limit = wide ? 5 : 3;
    const items = group.items.length > limit ? [...group.items.slice(0, limit - 1), { id: '__other__', name: '其他', seconds: group.items.slice(limit - 1).reduce((sum, item) => sum + item.seconds, 0), color: '#b9bbc6' }] : group.items;
    const radius = wide ? 36 : 31;
    const cx = wide ? x + radius + 2 : x + width / 2;
    const cy = top + 58;
    let angle = -Math.PI / 2;
    items.forEach((item) => {
      const next = angle + item.seconds / group.total * Math.PI * 2;
      const gap = Math.min(0.012, (next - angle) / 8);
      w.page.drawSvgPath(annulus(angle + gap, next - gap, radius, radius * 0.66), { x: cx, y: w.height - cy, color: journalBlockColor(item.id, item.color, 0.2) });
      angle = next;
    });
    const center = `${(group.total / 3600).toFixed(1)}h`;
    const centerSize = 9;
    w.text(center, cx - w.widthOf(center, centerSize) / 2, cy - 11, centerSize, INK);
    const caption = group.attributed ? '关联时长' : '记录时长';
    w.text(caption, cx - w.widthOf(caption, 9) / 2, cy + 2, 9, MUTED);
    const legendX = wide ? x + radius * 2 + 13 : x;
    const legendWidth = wide ? width - radius * 2 - 16 : width;
    let needsFull = group.items.length > limit;
    items.forEach((item, row) => {
      const y = top + (wide ? 25 : 99) + row * 28;
      w.rect(legendX, y + 3, 4, 4, journalBlockColor(item.id, item.color, 0.2));
      const name = w.fitted(item.name, legendWidth - 7, 9, 'hand');
      if (name !== item.name) needsFull = true;
      w.text(name, legendX + 7, y, 9, INK, 'hand');
      w.text(`${formatJournalDuration(item.seconds)} ${(item.seconds / group.total * 100).toFixed(1)}%`, legendX + 7, y + 12, 9, MUTED);
    });
    if (needsFull) {
      overflow.push({ label: group.label, items: group.items, total: group.total });
    }
    w.line(x, top + panelHeight - 8, width, C.line);
  });
  w.y = w.bottom;
  if (overflow.length) {
    w.startPage(`${month} 统计明细`);
    w.beginColumns(wide ? 3 : 2);
    overflow.forEach((group) => {
      w.heading(group.label);
      group.items.forEach((item) => {
        w.ensure(42);
        w.paragraph(item.name, 9);
        w.paragraph(`${formatJournalDuration(item.seconds)} ${(item.seconds / group.total * 100).toFixed(1)}%`, 7, MUTED, 0, 'print');
      });
    });
  }
};
