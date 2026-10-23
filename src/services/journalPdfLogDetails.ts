/**
 * @file journalPdfLogDetails.ts
 * @input Complete journal Log snapshots and already embedded original photos
 * @output Flowing metadata, notes, uncropped photo grids, reactions and timestamped comments
 * @pos Service (Journal log details)
 * @updated 2026-10-23: Retains rich Log content once across midnight and chapter repetition.
 */
import type { JournalLog } from '../utils/journalExport';
import type { JournalPdfWriter } from './journalPdfLayout';
import { JOURNAL_COLORS as C } from './journalPdfTheme';

export const writeJournalLogDetails = (w: JournalPdfWriter, log: JournalLog): void => {
  if (!w.claimLogDetails(log.source.id)) return;
  const field = (label: string, value: string) => {
    const labelWidth = w.widthOf(label, 9) + 8;
    if (labelWidth > (w.contentWidth - 12) * 0.45) {
      w.ensure(32);
      w.paragraph(label, 9, C.muted, 12, 'print');
      w.paragraph(value, 9, C.ink, 12, 'hand');
      return;
    }
    w.wrap(value, w.contentWidth - 12 - labelWidth, 9, 'hand').forEach((line, index) => {
      w.ensure(13.5);
      if (!index) w.text(label, w.margin + 12, w.y, 9, C.muted);
      w.text(line, w.margin + 12 + labelWidth, w.y, 9, C.ink, 'hand');
      w.y += 13.5;
    });
    w.y += 3;
  };
  const title = log.source.title?.trim() || log.activity;
  w.paragraph(`#${log.category}${title === log.activity ? '' : ` / ${log.activity}`}`, 9, C.muted, 12, 'hand');
  if (log.scopes?.length) w.paragraph(log.scopes.map((item) => `%${item.name}`).join('  '), 9, C.muted, 12, 'hand');
  if (log.todo) w.paragraph(`@${log.todo.name}`, 9, C.muted, 12, 'hand');
  if (log.collections?.length) w.paragraph(log.collections.map((item) => `◬${item.name}`).join('  '), 9, C.muted, 12, 'hand');
  log.fields?.forEach((item) => field(item.label, item.value));
  w.noteOnce(`log:${log.source.id}`, log.source.note, 12);
  const images = (log.source.images || []).map((key) => {
    const image = w.photos.get(key);
    if (!image) throw new Error(`日志图片未载入：${key}`);
    return image;
  });
  if (images.length) {
    w.ensure(35);
    w.paragraph('图片', 9, C.muted, 12, 'print');
    const columns = w.contentWidth >= 210 && images.length > 1 ? 2 : 1;
    const gap = 8;
    const width = (w.contentWidth - 12 - gap * (columns - 1)) / columns;
    for (let start = 0; start < images.length; start += columns) {
      const row = images.slice(start, start + columns);
      const height = Math.min(180, Math.max(...row.map((image) => width * image.height / image.width)));
      w.ensure(height + 8);
      row.forEach((image, index) => {
        const scale = Math.min(width / image.width, height / image.height);
        const drawnWidth = image.width * scale;
        const drawnHeight = image.height * scale;
        w.page.drawImage(image, { x: w.margin + 12 + index * (width + gap) + (width - drawnWidth) / 2, y: w.height - w.y - drawnHeight, width: drawnWidth, height: drawnHeight });
      });
      w.y += height + 8;
    }
  }
  if (log.source.reactions?.length) {
    w.ensure(40);
    w.paragraph('Reaction', 9, C.muted, 12, 'print');
    let offset = 12;
    log.source.reactions.forEach((reaction) => {
      const image = reaction.startsWith('image:') || reaction.startsWith('ui:');
      const width = image ? 18 : w.widthOf(reaction, 9) + 6;
      if (!image && width > w.contentWidth - 12) {
        if (offset > 12) w.y += 24;
        w.paragraph(reaction, 9, C.ink, 12, 'hand');
        offset = 12;
        return;
      }
      if (offset + width > w.contentWidth) { w.y += 24; offset = 12; }
      w.ensure(24);
      if (image) w.sticker(reaction, w.margin + offset, w.y, 18);
      else w.text(reaction, w.margin + offset, w.y, 9, C.ink, 'hand');
      offset += width + 6;
    });
    w.y += 24;
  }
  if (log.source.comments?.length) {
    w.ensure(40);
    w.paragraph('评论', 9, C.muted, 12, 'print');
    log.source.comments.forEach((comment) => {
      const date = new Date(comment.createdAt);
      w.ensure(32);
      w.paragraph(Number.isFinite(date.getTime()) ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : String(comment.createdAt), 9, C.muted, 12, 'print');
      w.paragraph(comment.content, 9, C.ink, 12, 'hand');
    });
  }
};
