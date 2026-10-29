/**
 * @file journalPdfMarkdown.ts
 * @input Authored Markdown, optional text style/region limits and the measured journal writer
 * @output Searchable, styled Markdown flowing across columns and continuation pages
 * @pos Service (Journal PDF Markdown)
 * @updated 2026-10-24: Renders headings, emphasis, nested/task lists, quotes, code, links and readable table fields.
 * @updated 2026-10-29: Shares rich text across the book and returns semantic overflow for narrow review columns.
 */
import { PDFHexString, PDFString, type RGB } from 'pdf-lib';
import { parseJournalMarkdown, wrapJournalMarkdownSpans, type JournalMarkdownBlock } from '../utils/journalMarkdown';
import { JOURNAL_COLORS as C } from './journalPdfTheme';
import type { JournalPdfWriter, JournalTextRole } from './journalPdfLayout';

export interface JournalPdfMarkdownOptions {
  size?: number;
  indent?: number;
  role?: JournalTextRole;
  color?: RGB;
  stopAtBottom?: boolean;
}

export interface JournalPdfMarkdownBlock extends JournalMarkdownBlock {
  role?: JournalTextRole;
  color?: RGB;
  spaceBefore?: number;
  continued?: boolean;
}

const layoutBlock = (w: JournalPdfWriter, block: JournalPdfMarkdownBlock, options: JournalPdfMarkdownOptions) => {
  const size = block.kind === 'heading' ? block.depth! <= 2 ? 12 : 9 : options.size ?? 9;
  const role: JournalTextRole = block.role ?? (block.kind === 'heading' || block.kind === 'code' ? 'print' : options.role ?? 'hand');
  const markerWidth = block.checked === undefined ? w.widthOf(block.marker || '', 9, 'print') : 8;
  const indent = (options.indent ?? 0) + Math.max(Math.min(block.indent * 14, w.contentWidth * 0.45), markerWidth ? markerWidth + 7 : 0);
  const before = block.continued ? 0 : block.spaceBefore ?? (block.kind === 'heading' ? Math.max(4, 12 - block.depth! * 2) : 2);
  const after = block.kind === 'heading' ? Math.max(3, 8 - block.depth!) : 4;
  const lines = wrapJournalMarkdownSpans(block.spans, Math.max(12, w.contentWidth - indent - 4), (span) => w.widthOf(span.text, size, span.code ? 'print' : role));
  return { size, role, indent, before, after, lines, leading: size * 1.6 };
};

export const estimateJournalMarkdown = (w: JournalPdfWriter, source: string, options: JournalPdfMarkdownOptions = {}): number => parseJournalMarkdown(source).reduce((height, block) => {
  if (block.kind === 'rule') return height + 12;
  const layout = layoutBlock(w, block, options);
  return height + layout.before + layout.lines.length * layout.leading + layout.after;
}, 0);

export const writeJournalMarkdown = (w: JournalPdfWriter, source: string, options: JournalPdfMarkdownOptions = {}): void => {
  // Keep the normal paragraph path for plain prose, including inline journal nodes.
  const blocks = parseJournalMarkdown(source);
  if (!options.stopAtBottom && blocks.every((block) => block.kind === 'paragraph' && !block.indent && block.spans.every((span) => !span.bold && !span.italic && !span.strike && !span.code && !span.url && !span.node))) {
    const spacedSource = source.replace(/\n\s*\n/g, '\n\n\n');
    w.paragraph(spacedSource, options.size ?? 9, options.color, options.indent, options.role);
    return;
  }
  const spacedBlocks = /\n\s*\n/.test(source)
    ? blocks.map((block, index) => index ? { ...block, spaceBefore: block.spaceBefore ?? 7 } : block)
    : blocks;
  writeJournalMarkdownBlocks(w, spacedBlocks, options);
};

/** Return unprinted semantic blocks so a continuation can rewrap at its new width. */
export const writeJournalMarkdownBlocks = (w: JournalPdfWriter, blocks: JournalPdfMarkdownBlock[], options: JournalPdfMarkdownOptions = {}): JournalPdfMarkdownBlock[] => {
  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
    const block = { ...blocks[blockIndex], spans: blocks[blockIndex].spans.map((span) => ({ ...span, text: span.text.replace(/\r\n?/g, '\n').replace(/\t/g, '    ') })) };
    if (block.kind === 'rule') {
      if (options.stopAtBottom && w.y + 13 > w.bottom) return blocks.slice(blockIndex);
      w.rule(); continue;
    }
    const { size, role, indent, before, after, lines, leading } = layoutBlock(w, block, options);
    if (options.stopAtBottom && w.y + before + leading > w.bottom) return blocks.slice(blockIndex);
    if (!options.stopAtBottom) w.ensure(before + leading * (block.kind === 'heading' ? Math.min(2, lines.length) + 1 : 1));
    w.y += before;
    let consumed = 0;
    const source = block.spans.map((span) => span.text).join('');
    for (let index = 0; index < lines.length; index++) {
      if (options.stopAtBottom && w.y + leading > w.bottom) {
        let skip = consumed;
        const spans = block.spans.flatMap((span) => {
          const text = span.text.slice(skip);
          skip = Math.max(0, skip - span.text.length);
          return text ? [{ ...span, text }] : [];
        });
        return [{ ...block, spans, marker: undefined, checked: undefined, continued: true }, ...blocks.slice(blockIndex + 1)];
      }
      if (!options.stopAtBottom) w.ensure(leading);
      const line = lines[index];
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
        const color = span.node ? C.accent : block.color ?? options.color ?? (block.quote || block.kind === 'heading' && block.depth! % 2 === 0 ? C.muted : C.ink);
        if (span.code && block.kind !== 'code') w.rect(x - 1, w.y, width + 2, leading, C.fill);
        if (span.node) w.rect(x, w.y + 1, width, size + 2, C.fill);
        w.text(span.text, x, w.y, size, color, textRole, {
          bold: span.bold || block.kind === 'heading' && block.depth! <= 4,
          italic: span.italic || block.kind === 'heading' && block.depth! >= 5
        });
        if (span.strike) w.line(x, w.y + size * 0.65, width, color);
        if (span.node) {
          w.line(x, w.y + size + 2, width, C.accent);
          w.page.node.addAnnot(w.pdf.context.register(w.pdf.context.obj({
            Type: 'Annot', Subtype: 'Link', Rect: [x, w.height - w.y - leading, x + width, w.height - w.y], Border: [0, 0, 0], Contents: PDFHexString.fromText(span.node)
          })));
        } else if (span.url) {
          w.line(x, w.y + size + 2, width, C.muted);
          if (/^(https?:|mailto:)/i.test(span.url)) w.page.node.addAnnot(w.pdf.context.register(w.pdf.context.obj({
            Type: 'Annot', Subtype: 'Link', Rect: [x, w.height - w.y - leading, x + width, w.height - w.y], Border: [0, 0, 0],
            A: { Type: 'Action', S: 'URI', URI: PDFString.of(span.url) }
          })));
        }
        x += width;
      }
      w.y += leading;
      consumed += line.reduce((length, span) => length + span.text.length, 0);
      if (source[consumed] === '\n') consumed++;
    }
    w.y = options.stopAtBottom ? Math.min(w.bottom, w.y + after) : w.y + after;
  }
  return [];
};
