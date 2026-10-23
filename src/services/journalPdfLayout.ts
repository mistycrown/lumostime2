/**
 * @file journalPdfLayout.ts
 * @input Embedded Chinese PDF font, optional symbol images and journal model
 * @output Measured PDF pages with automatic continuation and page-numbered contents
 * @pos Service (Journal PDF layout)
 * @updated 2026-10-23: Adds print layouts for annual/month/week/day, timeline, check matrix and reviews.
 * @updated 2026-10-23: Separates printed/handwritten content, keeps paragraphs and renders scheduled calendar entries.
 * @updated 2026-10-23: Uses full month color blocks and separates weekly timeline grids from detailed logs.
 * @updated 2026-10-23: Supports mixed page orientation, facing-page parity, column flow and sticker images.
 */
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb } from 'pdf-lib';
import { formatJournalDuration, formatJournalTime, getJournalDayPlans, journalCheckValue, type JournalDay, type JournalModel } from '../utils/journalExport';
import { parseDateKey } from '../utils/todoScheduleUtils';


export const JOURNAL_FONT_FAMILY = 'LumosJournal';
// Noto's contextual digit alternates lack Unicode mappings in fontkit's PDF output.
export const JOURNAL_PRINT_FEATURES = { pnum: false, tnum: false, liga: false, clig: false, locl: false, ccmp: false };
const INK = rgb(0.19, 0.21, 0.19);
const MUTED = rgb(0.46, 0.48, 0.45);
const LINE = rgb(0.84, 0.85, 0.81);
const ACCENT = rgb(0.31, 0.43, 0.36);
const PALE = rgb(0.96, 0.97, 0.94);
const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' });
export const journalGraphemes = (value: string): string[] => Array.from(segmenter.segment(value), (entry) => entry.segment);
export interface JournalSymbol { image: PDFImage; width: number }
export type JournalSymbols = Map<string, JournalSymbol>;
export type JournalTextRole = 'print' | 'hand';
export interface JournalPdfProgress { message: string; pages: number }

export class JournalPdfWriter {
  width: number;
  height: number;
  readonly pageMargin: number;
  readonly bodySize: number;
  readonly characters: Set<number>;
  page!: PDFPage;
  y = 0;
  private title = '';
  private subtitle = '';
  private continuation = 0;
  private widths = new Map<string, number>();
  readonly printedFont: PDFFont;
  private printedCharacters: Set<number>;
  private printedNotes = new Set<string>();
  private blankPages = new Set<PDFPage>();
  private columns: { index: number; count: number; top: number; width: number; gap: number } | undefined;
  readonly stickers = new Map<string, PDFImage>();

  constructor(readonly pdf: PDFDocument, readonly font: PDFFont, readonly model: JournalModel, readonly symbols: JournalSymbols = new Map(), printedFont?: PDFFont) {
    [this.width, this.height] = model.options.paperSize === 'a5' ? [419.53, 595.28] : [595.28, 841.89];
    this.pageMargin = model.options.paperSize === 'a5' ? 28 : 40;
    this.bodySize = model.options.paperSize === 'a5' ? 9 : 10;
    this.characters = new Set(font.getCharacterSet());
    this.printedFont = printedFont || font;
    this.printedCharacters = new Set(this.printedFont.getCharacterSet());
  }

  get margin(): number { return this.pageMargin + (this.columns ? this.columns.index * (this.columns.width + this.columns.gap) : 0); }
  get contentWidth(): number { return this.columns?.width ?? this.width - this.pageMargin * 2; }
  get bottom(): number { return this.height - this.pageMargin - 22; }
  get pageCount(): number { return this.pdf.getPageCount(); }

  private fontFor(glyph: string, role: JournalTextRole): PDFFont {
    return role === 'print' && Array.from(glyph).every((char) => this.printedCharacters.has(char.codePointAt(0)!)) ? this.printedFont : this.font;
  }

  widthOf(value: string, size = this.bodySize, role: JournalTextRole = 'print'): number {
    const key = `${role}:${size}:${value}`;
    const cached = this.widths.get(key);
    if (cached !== undefined) return cached;
    const width = journalGraphemes(value).reduce((sum, glyph) => {
      const glyphKey = `${role}:${size}:${glyph}`;
      let advance = this.widths.get(glyphKey);
      if (advance === undefined) {
        advance = this.symbols.has(glyph) ? this.symbols.get(glyph)!.width * size : this.fontFor(glyph, role).widthOfTextAtSize(glyph, size);
        this.widths.set(glyphKey, advance);
      }
      return sum + advance;
    }, 0);
    this.widths.set(key, width);
    return width;
  }

  text(value: string, x: number, top: number, size = this.bodySize, color = INK, role: JournalTextRole = 'print'): void {
    value = value.replace(/[\u0000-\u001f\u007f]/g, ' ');
    let cursor = x;
    // Group normal glyphs to keep vector text searchable; only unsupported symbols use small images.
    let run = '';
    let runFont = role === 'print' ? this.printedFont : this.font;
    const flush = () => {
      if (!run) return;
      this.page.drawText(run, { x: cursor, y: this.height - top - size, size, font: runFont, color });
      cursor += this.widthOf(run, size, role);
      run = '';
    };
    for (const glyph of journalGraphemes(value)) {
      const symbol = this.symbols.get(glyph);
      if (symbol) {
        flush();
        this.page.drawImage(symbol.image, { x: cursor, y: this.height - top - size * 1.2, width: symbol.width * size, height: size * 1.5 });
        cursor += symbol.width * size;
      } else {
        const glyphFont = this.fontFor(glyph, role);
        if (glyphFont !== runFont) { flush(); runFont = glyphFont; }
        run += glyph;
      }
    }
    flush();
  }

  line(x: number, top: number, width: number, color = LINE): void {
    this.page.drawLine({ start: { x, y: this.height - top }, end: { x: x + width, y: this.height - top }, color, thickness: 0.55 });
  }

  rect(x: number, top: number, width: number, height: number, fill = PALE): void {
    this.page.drawRectangle({ x, y: this.height - top - height, width, height, color: fill });
  }

  verticalLine(x: number, top: number, height: number, color = LINE): void {
    this.page.drawLine({ start: { x, y: this.height - top }, end: { x, y: this.height - top - height }, color, thickness: 0.4 });
  }

  noteOnce(key: string, content: string | undefined, indent = 0): void {
    if (!content?.trim() || this.printedNotes.has(key)) return;
    this.printedNotes.add(key);
    this.paragraph(content, this.bodySize, INK, indent, 'hand');
  }

  fitted(value: string, width: number, size: number, role: JournalTextRole = 'print'): string {
    const first = value.replace(/\r\n?/g, '\n').split('\n')[0];
    if (this.widthOf(first, size, role) <= width && first === value) return value;
    let result = '';
    for (const glyph of journalGraphemes(first)) {
      if (this.widthOf(result + glyph + '…', size, role) > width) break;
      result += glyph;
    }
    return result + '…';
  }

  startPage(title: string, subtitle = '', continued = false, landscape = false): void {
    if (this.pageCount >= 1000) throw new Error('手账超过 1000 页，请缩小日期范围或减少章节');
    if (!continued) { this.title = title; this.subtitle = subtitle; this.continuation = 0; }
    else this.continuation++;
    this.columns = undefined;
    [this.width, this.height] = this.model.options.paperSize === 'a5' ? [419.53, 595.28] : landscape ? [841.89, 595.28] : [595.28, 841.89];
    this.page = this.pdf.addPage([this.width, this.height]);
    this.rect(this.width - this.margin - 34, this.margin - 10, 34, 3, ACCENT);
    this.text('LUMOSTIME   /   JOURNAL', this.margin, this.margin - 8, 7, MUTED);
    this.text(title + (continued ? ` · 续 ${this.continuation}` : ''), this.margin, this.margin + 18, 21, INK);
    if (subtitle) this.text(subtitle, this.margin, this.margin + 50, 8, MUTED);
    this.line(this.margin, this.margin + 71, this.contentWidth);
    this.y = this.margin + 86;
  }

  ensure(height: number): boolean {
    if (this.y + height <= this.bottom) return false;
    if (this.columns) {
      const columns = this.columns;
      if (columns.index < columns.count - 1) { columns.index++; this.y = columns.top; return true; }
      this.startPage(this.title, this.subtitle, true);
      this.beginColumns(columns.count);
      return true;
    }
    this.startPage(this.title, this.subtitle, true);
    return true;
  }

  beginColumns(count = 2): void {
    this.columns = { index: 0, count, top: this.y, width: (this.width - this.pageMargin * 2 - 24 * (count - 1)) / count, gap: 24 };
  }

  resetFlow(): void { this.columns = undefined; }

  nextContentPage(after: number): number {
    const pages = this.pdf.getPages();
    let index = after;
    while (index < pages.length && this.blankPages.has(pages[index])) index++;
    return index + 1;
  }

  /** Even physical pages are left-hand pages in a bound book. */
  alignSpread(): void {
    if (this.model.options.paperSize === 'a5' && this.pageCount % 2 === 0) {
      if (this.pageCount >= 999) throw new Error('手账超过 1000 页，请缩小日期范围');
      const page = this.pdf.addPage([419.53, 595.28]);
      this.blankPages.add(page);
    }
  }

  sticker(icon: string | undefined, x: number, top: number, size: number): void {
    if (!icon) return;
    const image = this.stickers.get(icon);
    if (image) {
      const scale = Math.min(size / image.width, size / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      this.page.drawImage(image, { x: x + (size - width) / 2, y: this.height - top - height, width, height });
    } else if (!icon.startsWith('image:') && !icon.startsWith('ui:')) this.text(icon, x, top, size * 0.7, INK, 'hand');
  }

  wrap(value: string, width = this.contentWidth, size = this.bodySize, role: JournalTextRole = 'hand'): string[] {
    const lines: string[] = [];
    for (const paragraph of value.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n')) {
      let line = '';
      let length = 0;
      for (const glyph of journalGraphemes(paragraph)) {
        const next = this.widthOf(glyph, size, role);
        if (line && length + next > width) {
          const parts = journalGraphemes(line);
          // Keep Chinese closing punctuation with its preceding glyph, and opening punctuation with the next.
          let carry = '';
          if (parts.length > 1 && this.widthOf(parts[parts.length - 1], size, role) + next <= width && (/^[，。！？、：；）》」』】〕…]/u.test(glyph) || /[（《「『【〔]$/u.test(line))) carry = parts.pop()!;
          lines.push(parts.join(''));
          line = carry; length = this.widthOf(carry, size, role);
        }
        line += glyph;
        length += next;
      }
      lines.push(line);
    }
    return lines;
  }

  paragraph(value: string, size = this.bodySize, color = INK, indent = 0, role: JournalTextRole = 'hand'): void {
    const leading = size * (role === 'hand' ? 1.85 : 1.65);
    for (const line of this.wrap(value, this.contentWidth - indent, size, role)) {
      this.ensure(leading);
      this.text(line, this.margin + indent, this.y, size, color, role);
      this.y += leading;
    }
    this.y += 5;
  }

  heading(value: string): void {
    this.ensure(45);
    this.y += 9;
    this.paragraph(value, 10, ACCENT, 0, 'print');
  }

  rule(): void { this.ensure(12); this.line(this.margin, this.y + 2, this.contentWidth); this.y += 13; }

  writingSpace(): void {
    if (this.bottom - this.y < 65) return;
    this.y += 14;
    while (this.y + 18 <= this.bottom) {
      this.line(this.margin, this.y + 12, this.contentWidth, rgb(0.92, 0.93, 0.9));
      this.y += 19;
    }
  }

  finish(): void {
    const pages = this.pdf.getPages();
    this.columns = undefined;
    pages.forEach((page, index) => {
      if (this.blankPages.has(page)) return;
      this.page = page;
      this.width = page.getWidth(); this.height = page.getHeight();
      this.line(this.margin, this.height - this.margin - 10, this.contentWidth);
      this.text(`${this.model.options.startDate} — ${this.model.options.endDate}`, this.margin, this.height - this.margin, 7, MUTED);
      const number = `${index + 1} / ${pages.length}`;
      this.text(number, this.width - this.margin - this.widthOf(number, 7), this.height - this.margin, 7, MUTED);
    });
  }
}

export const dateLabel = (key: string): string => `${key}  周${weekdays[parseDateKey(key)!.getDay()]}`;
export const rangeLabel = (days: JournalDay[]): string => `${days[0].date} — ${days[days.length - 1].date}`;
export const stats = (days: JournalDay[]): string => `${formatJournalDuration(days.reduce((sum, day) => sum + day.actualSeconds, 0))}  /  ${new Set(days.flatMap((day) => day.logs.filter((log) => !log.source.isPlanned).map((log) => log.source.id))).size} 段记录`;

export const writePlans = (w: JournalPdfWriter, day: JournalDay, notes = false): void => {
  getJournalDayPlans(day).forEach((entry) => {
    w.ensure(55);
    w.text(entry.completed ? '[x]' : '[ ]', w.margin, w.y + 1, 8, ACCENT);
    w.paragraph(entry.title, w.bodySize + 1, INK, 18);
    w.paragraph(`${entry.label}${entry.completed ? ' · 已完成' : ''}${entry.times.length ? `  ${entry.times.join(' / ')}` : ''}`, 7, MUTED, 18, 'print');
    if (notes) entry.notes.forEach((note) => w.noteOnce(note.key, note.text, 18));
  });
};

export const writeLogs = (w: JournalPdfWriter, day: JournalDay, notes = true): void => {
  day.logs.filter((log) => !log.source.isPlanned).forEach((log) => {
    w.ensure(45);
    const page = w.page;
    const top = w.y;
    w.page.drawCircle({ x: w.margin + 3, y: w.height - top - 4, size: 2, color: ACCENT });
    w.paragraph(`${formatJournalTime(log.start, day.date)}–${formatJournalTime(log.end, day.date)} · ${formatJournalDuration(log.seconds)}`, 8, ACCENT, 12, 'print');
    w.paragraph(log.source.title || log.activity, w.bodySize + 1, INK, 12);
    w.paragraph(`${log.category} / ${log.activity}${log.source.focusScore ? ` · 专注 ${log.source.focusScore}/5` : ''}${log.source.moodScore ? ` · 心情 ${log.source.moodScore}/5` : ''}`, 7, MUTED, 12, 'print');
    if (notes) w.noteOnce(`log:${log.source.id}`, log.source.note, 12);
    if (w.page === page) w.verticalLine(w.margin + 3, top + 8, Math.max(0, w.y - top - 12));
    w.rule();
  });
};

export const writeCheckMatrix = (w: JournalPdfWriter, month: string, days: JournalDay[]): void => {
  const items = new Map<string, string>();
  const keyOf = (item: JournalDay['checks'][number]) => `${item.category || ''}\u0000${item.id || item.content}`;
  days.forEach((day) => day.checks.forEach((item) => items.set(keyOf(item), `${item.category ? `${item.category} / ` : ''}${item.content}`)));
  if (!items.size) { w.paragraph('暂无打卡记录', w.bodySize, MUTED); return; }
  const count = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const labelWidth = w.contentWidth * 0.32;
  const cell = (w.contentWidth - labelWidth) / count;
  const header = () => {
    w.ensure(48);
    w.text('项目 / 日期', w.margin, w.y, 8, MUTED);
    for (let i = 1; i <= count; i++) w.text(String(i), w.margin + labelWidth + (i - 1) * cell, w.y, 6, MUTED);
    w.y += 22;
  };
  w.paragraph('实心：完成    空心：未完成    短线：无记录    灰底：范围外', 7, MUTED, 0, 'print');
  header();
  for (const [key, label] of items) {
    const lines = w.wrap(label, labelWidth - 12, 8);
    // Extremely long item names use a full-width legend and a compact numbered row.
    const short = lines.length > 6;
    if (short) w.paragraph(label, 8);
    const labelLines = short ? [`项目 ${Array.from(items.keys()).indexOf(key) + 1}`] : lines;
    const rowHeight = Math.max(26, labelLines.length * 13 + 10);
    if (w.ensure(rowHeight + 8)) header();
    labelLines.forEach((line, i) => w.text(line, w.margin, w.y + 6 + i * 13, 8, INK, 'hand'));
    for (let number = 1; number <= count; number++) {
      const date = `${month}-${String(number).padStart(2, '0')}`;
      const day = days.find((entry) => entry.date === date);
      const item = day?.checks.find((entry) => keyOf(entry) === key);
      const x = w.margin + labelWidth + (number - 1) * cell;
      if (!day) w.rect(x - 1, w.y, cell, rowHeight, PALE);
      else if (!item) w.line(x + 1, w.y + 12, Math.max(2, cell - 4));
      else {
        w.page.drawCircle({ x: x + cell / 2 - 1, y: w.height - w.y - 12, size: Math.min(2.6, cell / 3), color: item.isCompleted ? ACCENT : undefined, borderColor: ACCENT, borderWidth: 0.6 });
      }
    }
    w.y += rowHeight;
    w.rule();
  }
  // Counts and automatic-check details are kept as text so the matrix does not squeeze numbers into tiny cells.
  const counted = days.filter((day) => day.checks.some((item) => item.manualMode === 'count'));
  if (counted.length) w.heading('计数明细');
  counted.forEach((day) => day.checks.filter((item) => item.manualMode === 'count').forEach((item) => w.paragraph(`${day.date} · ${item.content}  ${journalCheckValue(item)}`, 8)));
};

export { composeJournalBook as composeJournalPdf } from './journalPdfBook';
