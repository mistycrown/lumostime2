/**
 * @file journalPdfLayout.ts
 * @input Embedded Chinese PDF font, optional symbol images and journal model
 * @output Measured PDF pages with automatic continuation and page-numbered contents
 * @pos Service (Journal PDF layout)
 * @updated 2026-10-23: Adds print layouts for annual/month/week/day, timeline, check matrix and reviews.
 * @updated 2026-10-23: Separates printed/handwritten content, keeps paragraphs and renders scheduled calendar entries.
 * @updated 2026-10-23: Uses full month color blocks and separates weekly timeline grids from detailed logs.
 * @updated 2026-10-23: Supports mixed page orientation, facing-page parity, column flow and sticker images.
 * @updated 2026-10-23: Keeps the entire A4 book landscape, including all continuations and contents.
 * @updated 2026-10-23: Adds compact balanced columns, standalone covers and centered numeric check cells.
 * @updated 2026-10-23: Keeps four readable print tiers and styled inline nodes, plus measured rich-content column flow.
 */
import { PDFDocument, PDFFont, PDFImage, PDFPage, PDFHexString } from 'pdf-lib';
import { formatJournalDuration, formatJournalTime, getJournalDayPlans, type JournalDay, type JournalModel } from '../utils/journalExport';
import { parseDateKey } from '../utils/todoScheduleUtils';
import { JOURNAL_STROKE } from '../utils/journalTheme';
import { JOURNAL_COLORS as C } from './journalPdfTheme';
import { writeJournalLogDetails } from './journalPdfLogDetails';
import { journalPageTitle } from '../utils/journalTitles';
import { journalNoteRuns, wrapJournalNoteRuns, type JournalNoteRun } from '../utils/journalLogContent';


export const JOURNAL_FONT_FAMILY = 'LumosJournal';
// Noto's contextual digit alternates lack Unicode mappings in fontkit's PDF output.
export const JOURNAL_PRINT_FEATURES = { pnum: false, tnum: false, liga: false, clig: false, locl: false, ccmp: false };
const { ink: INK, muted: MUTED, line: LINE, accent: ACCENT, fill: PALE } = C;
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
  private printedLogDetails = new Set<string>();
  private blankPages = new Set<PDFPage>();
  private coverPages = new Set<PDFPage>();
  private columns: { index: number; count: number; top: number; width: number; gap: number; bottom: number } | undefined;
  readonly stickers = new Map<string, PDFImage>();
  readonly photos = new Map<string, PDFImage>();

  constructor(readonly pdf: PDFDocument, readonly font: PDFFont, readonly model: JournalModel, readonly symbols: JournalSymbols = new Map(), printedFont?: PDFFont) {
    [this.width, this.height] = model.options.paperSize === 'a5' ? [419.53, 595.28] : [841.89, 595.28];
    this.pageMargin = model.options.paperSize === 'a5' ? 28 : 40;
    this.bodySize = 9;
    this.characters = new Set(font.getCharacterSet());
    this.printedFont = printedFont || font;
    this.printedCharacters = new Set(this.printedFont.getCharacterSet());
  }

  get margin(): number { return this.pageMargin + (this.columns ? this.columns.index * (this.columns.width + this.columns.gap) : 0); }
  get contentWidth(): number { return this.columns?.width ?? this.width - this.pageMargin * 2; }
  get pageBottom(): number { return this.height - this.pageMargin - 22; }
  get bottom(): number { return this.columns?.bottom ?? this.pageBottom; }
  get compact(): boolean { return Boolean(this.columns); }
  get pageCount(): number { return this.pdf.getPageCount(); }
  get standardBodyTop(): number { return this.pageMargin + 64; }

  private printSize(size: number): number {
    if (size === 1) return 1; // Unit-size measurement for fitting a value without changing its font tier.
    return size >= 48 ? 64 : size >= 18 ? 24 : size >= 11.5 ? 12 : 9;
  }

  private fontFor(glyph: string, role: JournalTextRole): PDFFont {
    return role === 'print' && Array.from(glyph).every((char) => this.printedCharacters.has(char.codePointAt(0)!)) ? this.printedFont : this.font;
  }

  widthOf(value: string, size = this.bodySize, role: JournalTextRole = 'print'): number {
    size = this.printSize(size);
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
    size = this.printSize(size);
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
    this.page.drawLine({ start: { x, y: this.height - top }, end: { x: x + width, y: this.height - top }, color, thickness: JOURNAL_STROKE });
  }

  rect(x: number, top: number, width: number, height: number, fill = PALE): void {
    this.page.drawRectangle({ x, y: this.height - top - height, width, height, color: fill });
  }

  verticalLine(x: number, top: number, height: number, color = LINE): void {
    this.page.drawLine({ start: { x, y: this.height - top }, end: { x, y: this.height - top - height }, color, thickness: JOURNAL_STROKE });
  }

  noteOnce(key: string, content: string | undefined, indent = 0): void {
    if (!content?.trim() || this.printedNotes.has(key)) return;
    this.printedNotes.add(key);
    this.paragraph(content, this.bodySize, INK, indent, 'hand');
  }

  claimLogDetails(id: string): boolean {
    if (this.printedLogDetails.has(id)) return false;
    this.printedLogDetails.add(id);
    return true;
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

  private addPage(): void {
    if (this.pageCount >= 1000) throw new Error('手账超过 1000 页，请缩小日期范围或减少章节');
    this.columns = undefined;
    [this.width, this.height] = this.model.options.paperSize === 'a5' ? [419.53, 595.28] : [841.89, 595.28];
    this.page = this.pdf.addPage([this.width, this.height]);
  }

  startCoverPage(): void {
    this.addPage();
    this.coverPages.add(this.page);
    this.y = this.pageMargin;
  }

  startPage(title: string, subtitle = '', continued = false): void {
    if (!continued) { this.title = title; this.subtitle = subtitle; this.continuation = 0; }
    else this.continuation++;
    this.addPage();
    const lines = this.wrap(journalPageTitle(title), this.contentWidth, 24, 'print');
    lines.forEach((line, index) => this.text(line, this.margin, this.margin + index * 29, 24, INK));
    let top = this.margin + lines.length * 29;
    const context = subtitle + (continued ? `${subtitle ? ' / ' : ''}Continued ${this.continuation}` : '');
    if (context) { this.text(context, this.margin, top + 2, 9, MUTED); top += 18; }
    this.line(this.margin, top + 5, this.contentWidth);
    this.y = top + 16;
  }

  ensure(height: number): boolean {
    if (this.columns && height > this.columns.bottom - this.columns.top) this.columns.bottom = Math.min(this.pageBottom, this.columns.top + height);
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

  beginColumns(count = 2, height?: number): void {
    this.columns = { index: 0, count, top: this.y, width: (this.width - this.pageMargin * 2 - 24 * (count - 1)) / count, gap: 24, bottom: Math.min(this.pageBottom, this.y + Math.max(100, height ?? this.pageBottom)) };
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
    size = this.printSize(size);
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
    size = this.printSize(size);
    const leading = size * (this.compact ? role === 'hand' ? 1.5 : 1.35 : role === 'hand' ? 1.85 : 1.65);
    const runs = role === 'hand' ? journalNoteRuns(value.replace(/\r\n?/g, '\n').replace(/\t/g, '    ')) : [];
    if (runs.some((run) => run.node)) {
      for (const line of wrapJournalNoteRuns(runs, this.contentWidth - indent, (text) => this.widthOf(text, size, role))) {
        this.ensure(leading);
        let x = this.margin + indent;
        const fragments: JournalNoteRun[] = [];
        for (const token of line) {
          const last = fragments[fragments.length - 1];
          if (last && last.node === token.node) last.text += token.text;
          else fragments.push({ ...token });
        }
        for (const fragment of fragments) {
          const width = this.widthOf(fragment.text, size, role);
          if (fragment.node) {
            this.rect(x, this.y + 1, width, size + 2, C.fill);
            this.line(x, this.y + size + 2, width, C.accent);
            this.page.node.addAnnot(this.pdf.context.register(this.pdf.context.obj({
              Type: 'Annot', Subtype: 'Link', Rect: [x, this.height - this.y - size - 2, x + width, this.height - this.y], Border: [0, 0, 0], Contents: PDFHexString.fromText(fragment.node)
            })));
          }
          this.text(fragment.text, x, this.y, size, fragment.node ? C.accent : color, role);
          x += width;
        }
        this.y += leading;
      }
      this.y += this.compact ? 3 : 5;
      return;
    }
    for (const line of this.wrap(value, this.contentWidth - indent, size, role)) {
      this.ensure(leading);
      this.text(line, this.margin + indent, this.y, size, color, role);
      this.y += leading;
    }
    this.y += this.compact ? 3 : 5;
  }

  heading(value: string): void {
    this.ensure(this.compact ? 32 : 45);
    this.y += this.compact ? 5 : 9;
    this.paragraph(value, 12, ACCENT, 0, 'print');
  }

  rule(): void { this.ensure(this.compact ? 8 : 12); this.line(this.margin, this.y + 2, this.contentWidth); this.y += this.compact ? 8 : 13; }

  writingSpace(): void {
    if (this.bottom - this.y < 65) return;
    this.y += 14;
    while (this.y + 18 <= this.bottom) {
      this.line(this.margin, this.y + 12, this.contentWidth, LINE);
      this.y += 19;
    }
  }

  finish(): void {
    const pages = this.pdf.getPages();
    this.columns = undefined;
    pages.forEach((page, index) => {
      if (this.blankPages.has(page) || this.coverPages.has(page)) return;
      this.page = page;
      this.width = page.getWidth(); this.height = page.getHeight();
      this.line(this.margin, this.height - this.margin - 10, this.contentWidth);
      this.text(`${this.model.options.startDate} — ${this.model.options.endDate}`, this.margin, this.height - this.margin, 9, MUTED);
      const number = `${index + 1} / ${pages.length}`;
      this.text(number, this.width - this.margin - this.widthOf(number, 9), this.height - this.margin, 9, MUTED);
    });
  }
}

export const dateLabel = (key: string): string => `${key}  周${weekdays[parseDateKey(key)!.getDay()]}`;
export const rangeLabel = (days: JournalDay[]): string => `${days[0].date} — ${days[days.length - 1].date}`;
export const stats = (days: JournalDay[]): string => `${formatJournalDuration(days.reduce((sum, day) => sum + day.actualSeconds, 0))}  /  ${new Set(days.flatMap((day) => day.logs.filter((log) => !log.source.isPlanned).map((log) => log.source.id))).size} 段记录`;

export const writePlans = (w: JournalPdfWriter, day: JournalDay, notes = false, details = false): void => {
  getJournalDayPlans(day).forEach((entry) => {
    w.ensure(w.compact ? 40 : 55);
    w.text(entry.completed ? '[x]' : '[ ]', w.margin, w.y + 1, 8, ACCENT);
    w.paragraph(entry.title, w.bodySize + 1, INK, 18);
    w.paragraph(`${entry.label}${entry.completed ? ' 已完成' : ''}${entry.times.length ? `  ${entry.times.join(' / ')}` : ''}`, 7, MUTED, 18, 'print');
    if (notes) entry.notes.forEach((note) => w.noteOnce(note.key, note.text, 18));
    if (details) entry.logs.forEach((log) => writeJournalLogDetails(w, log));
  });
};

export const writeLogs = (w: JournalPdfWriter, day: JournalDay, notes = true): void => {
  day.logs.filter((log) => !log.source.isPlanned).forEach((log) => {
    w.ensure(45);
    const page = w.page;
    const top = w.y;
    const left = w.margin;
    w.page.drawCircle({ x: w.margin + 3, y: w.height - top - 4, size: 2, color: ACCENT });
    w.paragraph(`${formatJournalTime(log.start, day.date)}–${formatJournalTime(log.end, day.date)} ${formatJournalDuration(log.seconds)}`, 8, ACCENT, 12, 'print');
    w.paragraph(log.source.title || log.activity, w.bodySize + 1, INK, 12);
    w.paragraph(`${log.category} / ${log.activity}`, 9, MUTED, 12, 'hand');
    if (notes) writeJournalLogDetails(w, log);
    if (w.page === page && w.margin === left) w.verticalLine(left + 3, top + 8, Math.max(0, w.y - top - 12));
    w.rule();
  });
};

export { writeJournalCheckMatrix as writeCheckMatrix } from './journalPdfChecks';

export { composeJournalBook as composeJournalPdf } from './journalPdfBook';
