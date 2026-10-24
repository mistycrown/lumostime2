/**
 * @file journalMarkdown.ts
 * @input CommonMark/GFM narrative text
 * @output Semantic print blocks with inline emphasis, links, lists and quotes
 * @pos Utility (Journal PDF)
 * @updated 2026-10-24: Shares the application's remark syntax while keeping PDF layout independent of HTML.
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Nodes } from 'mdast';

export interface JournalMarkdownSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
  url?: string;
}
export interface JournalMarkdownBlock {
  kind: 'paragraph' | 'heading' | 'code' | 'rule';
  spans: JournalMarkdownSpan[];
  indent: number;
  quote: number;
  depth?: number;
  marker?: string;
  checked?: boolean;
}

const parser = unified().use(remarkParse).use(remarkGfm);
const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' });

export const wrapJournalMarkdownSpans = (spans: JournalMarkdownSpan[], width: number, measure: (span: JournalMarkdownSpan) => number): JournalMarkdownSpan[][] => {
  const lines: JournalMarkdownSpan[][] = [];
  let line: JournalMarkdownSpan[] = [];
  let length = 0;
  const flush = () => {
    const merged: JournalMarkdownSpan[] = [];
    for (const token of line) {
      const previous = merged.at(-1);
      if (previous && previous.bold === token.bold && previous.italic === token.italic && previous.strike === token.strike && previous.code === token.code && previous.url === token.url) previous.text += token.text;
      else merged.push({ ...token });
    }
    lines.push(merged); line = []; length = 0;
  };
  for (const span of spans) for (const { segment } of segmenter.segment(span.text.replace(/\r\n?/g, '\n'))) {
    if (segment === '\n') { flush(); continue; }
    const token = { ...span, text: segment === '\t' ? '    ' : segment };
    const advance = measure(token);
    if (line.length && length + advance > width) {
      let carry: JournalMarkdownSpan | undefined;
      if (line.length > 1 && (/^[，。！？、：；）》」』】〕…]/u.test(segment) || /[（《「『【〔]$/u.test(line.at(-1)!.text)) && measure(line.at(-1)!) + advance <= width) carry = line.pop();
      flush();
      if (carry) { line.push(carry); length += measure(carry); }
    }
    line.push(token); length += advance;
  }
  flush();
  return lines;
};

export const parseJournalMarkdown = (source: string): JournalMarkdownBlock[] => {
  const root = parser.parse(source);
  const definitions = new Map(root.children.filter((node) => node.type === 'definition').map((node) => [node.identifier, node.url]));
  const blocks: JournalMarkdownBlock[] = [];
  const inline = (nodes: Nodes[], style: Omit<JournalMarkdownSpan, 'text'> = {}): JournalMarkdownSpan[] => nodes.flatMap((node): JournalMarkdownSpan[] => {
    if (node.type === 'break') return [{ ...style, text: '\n' }];
    if (node.type === 'image' || node.type === 'imageReference') {
      const url = node.type === 'image' ? node.url : definitions.get(node.identifier);
      return [{ ...style, text: [node.alt, url].filter(Boolean).join(' '), url }];
    }
    if (node.type === 'footnoteReference') return [{ ...style, text: `[${node.identifier}]` }];
    if ('value' in node) return [{ ...style, text: node.value, code: style.code || node.type === 'inlineCode' }];
    if ('children' in node) return inline(node.children, {
      ...style,
      bold: style.bold || node.type === 'strong',
      italic: style.italic || node.type === 'emphasis',
      strike: style.strike || node.type === 'delete',
      url: node.type === 'link' ? node.url : node.type === 'linkReference' ? definitions.get(node.identifier) : style.url
    });
    return [];
  });
  const walk = (nodes: Nodes[], indent = 0, quote = 0): void => {
    for (const node of nodes) {
      if (node.type === 'definition') continue;
      if (node.type === 'blockquote') { walk(node.children, indent + 1, quote + 1); continue; }
      if (node.type === 'list') {
        node.children.forEach((item, index) => {
          const first = blocks.length;
          walk(item.children, indent + 1, quote);
          if (blocks.length > first) {
            blocks[first].marker = node.ordered ? `${(node.start ?? 1) + index}.` : '•';
            if (typeof item.checked === 'boolean') { blocks[first].checked = item.checked; blocks[first].marker = ''; }
          }
        });
        continue;
      }
      if (node.type === 'table') {
        const headers = node.children[0]?.children || [];
        // Field rows remain readable inside narrow A5 columns without losing wide-table cells.
        const rows = node.children.length > 1 ? node.children.slice(1) : node.children;
        rows.forEach((row) => {
          const spans = row.children.flatMap((cell, index) => [
            ...(index ? [{ text: '\n' }] : []),
            ...(node.children.length > 1 ? [...inline(headers[index]?.children || [], { bold: true }), { text: ': ' }] : []),
            ...inline(cell.children)
          ]);
          blocks.push({ kind: 'paragraph', spans, indent, quote });
        });
        continue;
      }
      if (node.type === 'thematicBreak') { blocks.push({ kind: 'rule', spans: [], indent, quote }); continue; }
      if (node.type === 'code') { blocks.push({ kind: 'code', spans: [{ text: node.value, code: true }], indent, quote }); continue; }
      if (node.type === 'paragraph' || node.type === 'heading') {
        blocks.push({ kind: node.type, spans: inline(node.children), indent, quote, depth: node.type === 'heading' ? node.depth : undefined });
        continue;
      }
      if ('children' in node) walk(node.children, indent, quote);
      else if ('value' in node) blocks.push({ kind: 'paragraph', spans: [{ text: node.value }], indent, quote });
    }
  };
  walk(root.children);
  return blocks;
};
