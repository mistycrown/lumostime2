/**
 * @file journalPdfMarkdown.ts
 * @input Narrative Markdown and the measured journal writer
 * @output Searchable, styled Markdown flowing across columns and continuation pages
 * @pos Service (Journal PDF narrative)
 * @updated 2026-10-24: Renders headings, emphasis, nested/task lists, quotes, code, links and readable table fields.
 */
import { PDFString } from 'pdf-lib';
import { parseJournalMarkdown, wrapJournalMarkdownSpans, type JournalMarkdownBlock } from '../utils/journalMarkdown';
import { JOURNAL_COLORS as C } from './journalPdfTheme';
import type { JournalPdfWriter, JournalTextRole } from './journalPdfLayout';

const layoutBlock = (w: JournalPdfWriter, block: JournalMarkdownBlock) => {
  const size = block.kind === 'heading' && block.depth! <= 2 ? 12 : 9;
  const role: JournalTextRole = block.kind === 'heading' || block.kind === 'code' ? 'print' : 'hand';
  const markerWidth = block.checked === undefined ? w.widthOf(block.marker || '', 9, 'print') : 8;
  const indent = Math.max(Math.min(block.indent * 14, w.contentWidth * 0.45), markerWidth ? markerWidth + 7 : 0);
  const before = block.kind === 'heading' ? Math.max(4, 12 - block.depth! * 2) : 2;
  const after = block.kind === 'heading' ? Math.max(3, 8 - block.depth!) : 4;
  const lines = wrapJournalMarkdownSpans(block.spans, Math.max(12, w.contentWidth - indent - 4), (span) => w.widthOf(span.text, size, span.code ? 'print' : role));
  return { size, role, indent, before, after, lines, leading: size * 1.6 };
};

export const estimateJournalMarkdown = (w: JournalPdfWriter, source: string): number => parseJournalMarkdown(source).reduce((height, block) => {
  if (block.kind === 'rule') return height + 12;
  const layout = layoutBlock(w, block);
  return height + layout.before + layout.lines.length * layout.leading + layout.after;
}, 0);

export const writeJournalMarkdown = (w: JournalPdfWriter, source: string): void => {
  // Keep the normal paragraph path for plain prose, including inline journal nodes.
  const blocks = parseJournalMarkdown(source);
  if (blocks.every((block) => block.kind === 'paragraph' && !block.indent && block.spans.every((span) => !span.bold && !span.italic && !span.strike && !span.code && !span.url))) {
    blocks.forEach((block) => w.paragraph(block.spans.map((span) => span.text).join('')));
    return;
  }
  for (const block of blocks) {
    if (block.kind === 'rule') { w.rule(); continue; }
    const { size, role, indent, before, after, lines, leading } = layoutBlock(w, block);
    w.ensure(before + leading * (block.kind === 'heading' ? Math.min(2, lines.length) + 1 : 1));
    w.y += before;
    lines.forEach((line, index) => {
      w.ensure(leading);
      const start = w.margin + indent;
      if (!index) {
        if (block.checked !== undefined) w.checkbox(start - 15, w.y + 2.25, block.checked);
        else if (block.marker) w.text(block.marker, start - 5 - w.widthOf(block.marker, 9, 'print'), w.y, 9, C.muted);
      }
      if (block.quote) w.verticalLine(start - 7, w.y, leading, C.line);
      if (block.kind === 'code') w.rect(start - 2, w.y, Math.min(w.contentWidth - indent + 2, w.contentWidth), leading, C.fill);
      let x = start;
      for (const span of line) {
        const textRole = span.code ? 'print' : role;
        const width = w.widthOf(span.text, size, textRole);
        const color = block.quote || block.kind === 'heading' && block.depth! % 2 === 0 ? C.muted : C.ink;
        if (span.code && block.kind !== 'code') w.rect(x - 1, w.y, width + 2, leading, C.fill);
        w.text(span.text, x, w.y, size, color, textRole, {
          bold: span.bold || block.kind === 'heading' && block.depth! <= 4,
          italic: span.italic || block.kind === 'heading' && block.depth! >= 5
        });
        if (span.strike) w.line(x, w.y + size * 0.65, width, color);
        if (span.url) {
          w.line(x, w.y + size + 2, width, C.muted);
          if (/^(https?:|mailto:)/i.test(span.url)) w.page.node.addAnnot(w.pdf.context.register(w.pdf.context.obj({
            Type: 'Annot', Subtype: 'Link', Rect: [x, w.height - w.y - leading, x + width, w.height - w.y], Border: [0, 0, 0],
            A: { Type: 'Action', S: 'URI', URI: PDFString.of(span.url) }
          })));
        }
        x += width;
      }
      w.y += leading;
    });
    w.y += after;
  }
};
