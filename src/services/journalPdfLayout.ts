/**
 * @file journalPdfLayout.ts
 * @input Embedded Chinese PDF font, optional symbol images and journal model
 * @output Measured PDF pages with automatic continuation and page-numbered contents
 * @pos Service (Journal PDF layout)
 * @updated 2026-10-23: Adds print layouts for annual/month/week/day, timeline, check matrix and reviews.
 */
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb } from 'pdf-lib';
import type { DailyReview, MonthlyReview, WeeklyReview } from '../types';
import { JOURNAL_SECTIONS, formatJournalDuration, formatJournalTime, journalCheckValue, journalTodoStatus, shiftJournalDate, type JournalDay, type JournalModel, type JournalSection } from '../utils/journalExport';
import { parseDateKey } from '../utils/todoScheduleUtils';

export const JOURNAL_FONT_FAMILY = 'LumosJournal';
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
export interface JournalPdfProgress { message: string; pages: number }

export class JournalPdfWriter {
  readonly width: number;
  readonly height: number;
  readonly margin: number;
  readonly bodySize: number;
  readonly characters: Set<number>;
  page!: PDFPage;
  y = 0;
  private title = '';
  private subtitle = '';
  private continuation = 0;
  private widths = new Map<string, number>();

  constructor(readonly pdf: PDFDocument, readonly font: PDFFont, readonly model: JournalModel, readonly symbols: JournalSymbols = new Map()) {
    [this.width, this.height] = model.options.paperSize === 'a5' ? [419.53, 595.28] : [595.28, 841.89];
    this.margin = model.options.paperSize === 'a5' ? 28 : 40;
    this.bodySize = model.options.paperSize === 'a5' ? 9 : 10;
    this.characters = new Set(font.getCharacterSet());
  }

  get contentWidth(): number { return this.width - this.margin * 2; }
  get bottom(): number { return this.height - this.margin - 22; }
  get pageCount(): number { return this.pdf.getPageCount(); }

  widthOf(value: string, size = this.bodySize): number {
    const key = `${size}:${value}`;
    const cached = this.widths.get(key);
    if (cached !== undefined) return cached;
    const width = journalGraphemes(value).reduce((sum, glyph) => {
      const glyphKey = `${size}:${glyph}`;
      let advance = this.widths.get(glyphKey);
      if (advance === undefined) {
        advance = this.symbols.has(glyph) ? this.symbols.get(glyph)!.width * size : this.font.widthOfTextAtSize(glyph, size);
        this.widths.set(glyphKey, advance);
      }
      return sum + advance;
    }, 0);
    this.widths.set(key, width);
    return width;
  }

  text(value: string, x: number, top: number, size = this.bodySize, color = INK): void {
    value = value.replace(/[\u0000-\u001f\u007f]/g, ' ');
    let cursor = x;
    // Group normal glyphs to keep vector text searchable; only unsupported symbols use small images.
    let run = '';
    const flush = () => {
      if (!run) return;
      this.page.drawText(run, { x: cursor, y: this.height - top - size, size, font: this.font, color });
      cursor += this.widthOf(run, size);
      run = '';
    };
    for (const glyph of journalGraphemes(value)) {
      const symbol = this.symbols.get(glyph);
      if (symbol) {
        flush();
        this.page.drawImage(symbol.image, { x: cursor, y: this.height - top - size * 1.2, width: symbol.width * size, height: size * 1.5 });
        cursor += symbol.width * size;
      } else run += glyph;
    }
    flush();
  }

  line(x: number, top: number, width: number, color = LINE): void {
    this.page.drawLine({ start: { x, y: this.height - top }, end: { x: x + width, y: this.height - top }, color, thickness: 0.55 });
  }

  rect(x: number, top: number, width: number, height: number, fill = PALE): void {
    this.page.drawRectangle({ x, y: this.height - top - height, width, height, color: fill });
  }

  startPage(title: string, subtitle = '', continued = false): void {
    if (this.pageCount >= 1000) throw new Error('手账超过 1000 页，请缩小日期范围或减少章节');
    if (!continued) { this.title = title; this.subtitle = subtitle; this.continuation = 0; }
    else this.continuation++;
    this.page = this.pdf.addPage([this.width, this.height]);
    this.text('LUMOSTIME  /  生活手账', this.margin, this.margin - 8, 8, MUTED);
    this.text(title + (continued ? ` · 续 ${this.continuation}` : ''), this.margin, this.margin + 18, 22, INK);
    if (subtitle) this.text(subtitle, this.margin, this.margin + 50, 8, MUTED);
    this.line(this.margin, this.margin + 71, this.contentWidth);
    this.y = this.margin + 86;
  }

  ensure(height: number): boolean {
    if (this.y + height <= this.bottom) return false;
    this.startPage(this.title, this.subtitle, true);
    return true;
  }

  wrap(value: string, width = this.contentWidth, size = this.bodySize): string[] {
    const lines: string[] = [];
    for (const paragraph of value.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n')) {
      let line = '';
      let length = 0;
      for (const glyph of journalGraphemes(paragraph)) {
        const next = this.widthOf(glyph, size);
        if (line && length + next > width) { lines.push(line); line = ''; length = 0; }
        line += glyph;
        length += next;
      }
      lines.push(line);
    }
    return lines;
  }

  paragraph(value: string, size = this.bodySize, color = INK, indent = 0): void {
    const leading = size * 1.65;
    for (const line of this.wrap(value, this.contentWidth - indent, size)) {
      this.ensure(leading);
      this.text(line, this.margin + indent, this.y, size, color);
      this.y += leading;
    }
    this.y += 5;
  }

  heading(value: string): void {
    this.ensure(45);
    this.y += 9;
    this.paragraph(value, 12, ACCENT);
  }

  rule(): void { this.ensure(12); this.line(this.margin, this.y + 2, this.contentWidth); this.y += 13; }

  finish(): void {
    const pages = this.pdf.getPages();
    pages.forEach((page, index) => {
      this.page = page;
      this.line(this.margin, this.height - this.margin - 10, this.contentWidth);
      this.text(`${this.model.options.startDate} — ${this.model.options.endDate}`, this.margin, this.height - this.margin, 7, MUTED);
      const number = `${index + 1} / ${pages.length}`;
      this.text(number, this.width - this.margin - this.widthOf(number, 7), this.height - this.margin, 7, MUTED);
    });
  }
}

const dateLabel = (key: string): string => `${key}  周${weekdays[parseDateKey(key)!.getDay()]}`;
const rangeLabel = (days: JournalDay[]): string => `${days[0].date} — ${days[days.length - 1].date}`;
const stats = (days: JournalDay[]): string => `${formatJournalDuration(days.reduce((sum, day) => sum + day.actualSeconds, 0))}  /  ${days.reduce((sum, day) => sum + day.logs.filter((log) => !log.source.isPlanned).length, 0)} 段记录`;

const writePlans = (w: JournalPdfWriter, day: JournalDay, notes = false): void => {
  const plans = day.todos.filter((entry) => entry.primaryKind !== 'inProgress');
  plans.forEach((entry) => {
    const kinds = [entry.badges.deadline ? '截止' : '', entry.badges.recurring ? '重复' : '', entry.badges.maybe ? '可能' : ''].filter(Boolean).join(' / ');
    w.paragraph(`${journalTodoStatus(entry) === '已完成' ? '[x]' : '[ ]'} ${entry.todo.title}  ${kinds ? `(${kinds})` : ''}${journalTodoStatus(entry) === '已放弃' ? ' · 已放弃' : ''}`);
    if (notes && entry.todo.note) w.paragraph(entry.todo.note, w.bodySize - 1, MUTED, 14);
  });
  day.logs.filter((log) => log.source.isPlanned).forEach((log) => {
    w.paragraph(`计划 ${formatJournalTime(log.start, day.date)}–${formatJournalTime(log.end, day.date)}  ${log.source.title || log.activity}`);
    if (log.source.note) w.paragraph(log.source.note, w.bodySize - 1, MUTED, 14);
  });
};

const writeLogs = (w: JournalPdfWriter, day: JournalDay): void => {
  day.logs.filter((log) => !log.source.isPlanned).forEach((log) => {
    w.ensure(45);
    w.paragraph(`${formatJournalTime(log.start, day.date)}–${formatJournalTime(log.end, day.date)}  ${log.source.title || log.activity}`);
    w.paragraph(`${log.category} / ${log.activity} · ${formatJournalDuration(log.seconds)}${log.source.focusScore ? ` · 专注 ${log.source.focusScore}/5` : ''}${log.source.moodScore ? ` · 心情 ${log.source.moodScore}/5` : ''}`, w.bodySize - 1, MUTED, 12);
    if (log.source.note) w.paragraph(log.source.note, w.bodySize, INK, 12);
    w.rule();
  });
};

const writeReview = (w: JournalPdfWriter, review: DailyReview | WeeklyReview | MonthlyReview): void => {
  if (review.summary) { w.heading('摘要'); w.paragraph(review.summary); }
  review.answers.forEach((answer) => {
    if (!answer.answer.trim()) return;
    w.heading(answer.question || '回顾');
    w.paragraph(answer.answer);
  });
  if (review.narrative) { w.heading('叙事'); w.paragraph(review.narrative); }
  if (!review.summary && !review.narrative && !review.answers.some((answer) => answer.answer.trim())) w.paragraph('暂无复盘正文', w.bodySize, MUTED);
};

const writeCalendar = (w: JournalPdfWriter, month: string, days: JournalDay[]): void => {
  const first = parseDateKey(`${month}-01`)!;
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const rows = Math.ceil((count + offset) / 7);
  const cell = w.contentWidth / 7;
  const cellHeight = w.model.options.paperSize === 'a5' ? 46 : 60;
  const top = w.y;
  ['一', '二', '三', '四', '五', '六', '日'].forEach((label, i) => w.text(label, w.margin + i * cell + 7, top, 9, MUTED));
  const dayMap = new Map(days.map((day) => [day.date, day]));
  for (let number = 1; number <= count; number++) {
    const index = number + offset - 1;
    const x = w.margin + (index % 7) * cell;
    const y = top + 22 + Math.floor(index / 7) * cellHeight;
    const day = dayMap.get(`${month}-${String(number).padStart(2, '0')}`);
    if (!day) w.rect(x, y, cell, cellHeight, PALE);
    w.text(String(number).padStart(2, '0'), x + 6, y + 5, 10, day ? INK : MUTED);
    if (day) {
      const minutes = Math.round(day.actualSeconds / 60);
      const amount = day.todos.filter((entry) => entry.primaryKind !== 'inProgress').length + day.logs.filter((log) => log.source.isPlanned).length;
      if (minutes) w.text(minutes >= 60 ? `${(minutes / 60).toFixed(1)}h` : `${minutes}m`, x + 6, y + 22, 8, ACCENT);
      if (amount) w.text(`${amount} 项`, x + 6, y + cellHeight - 13, 7, MUTED);
    }
  }
  for (let row = 0; row <= rows; row++) w.line(w.margin, top + 22 + row * cellHeight, w.contentWidth);
  w.y = top + 30 + rows * cellHeight;
};

const writeCheckMatrix = (w: JournalPdfWriter, month: string, days: JournalDay[]): void => {
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
  w.paragraph('实心：完成    空心：未完成    短线：无记录    灰底：范围外', 7, MUTED);
  header();
  for (const [key, label] of items) {
    const lines = w.wrap(label, labelWidth - 12, 8);
    // Extremely long item names use a full-width legend and a compact numbered row.
    const short = lines.length > 6;
    if (short) w.paragraph(label, 8);
    const labelLines = short ? [`项目 ${Array.from(items.keys()).indexOf(key) + 1}`] : lines;
    const rowHeight = Math.max(26, labelLines.length * 13 + 10);
    if (w.ensure(rowHeight + 8)) header();
    labelLines.forEach((line, i) => w.text(line, w.margin, w.y + 6 + i * 13, 8));
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

export const composeJournalPdf = async (
  w: JournalPdfWriter,
  onProgress?: (progress: JournalPdfProgress) => void,
  signal?: AbortSignal
): Promise<void> => {
  const check = async (message: string) => {
    signal?.throwIfAborted();
    onProgress?.({ message, pages: w.pageCount });
    await new Promise((resolve) => setTimeout(resolve, 0));
    signal?.throwIfAborted();
  };
  const model = w.model;
  const selected = new Set(model.options.sections);
  const contents: { label: string; page: number }[] = [];
  if (model.options.includeCover) {
    w.startPage('我的生活手账', rangeLabel(model.days));
    w.y = w.height * 0.34;
    w.paragraph('把日子，留在纸上。', 26, ACCENT);
    w.y += 25;
    w.paragraph(`${model.days.length} 天`, 18);
    w.paragraph(stats(model.days), 10, MUTED);
    w.y += 24;
    w.paragraph(`${selected.size} 个章节 / ${model.options.paperSize.toUpperCase()}`, 10, MUTED);
  }
  w.startPage('目录', rangeLabel(model.days));
  const contentsPage = w.page;
  const contentsTop = w.y;
  const begin = (section: JournalSection) => contents.push({ label: JOURNAL_SECTIONS.find((item) => item.id === section)!.label, page: w.pageCount + 1 });
  if (selected.has('yearly')) {
    begin('yearly');
    for (const year of model.years) {
      await check('正在排版年计划');
      const days = model.days.filter((day) => day.date.startsWith(String(year)));
      w.startPage(`${year} 年计划`, rangeLabel(days));
      w.paragraph(stats(days), 10, MUTED);
      for (const month of model.months.filter((key) => key.startsWith(String(year)))) {
        const monthDays = days.filter((day) => day.date.startsWith(month));
        w.paragraph(`${Number(month.slice(5))} 月   ${stats(monthDays)}`, 10);
      }
      w.heading('目标与长期计划');
      const goals = model.goals.filter((goal) => goal.startDate <= `${year}-12-31` && goal.endDate >= `${year}-01-01`);
      if (!goals.length) w.paragraph('暂无目标', 10, MUTED);
      for (const goal of goals) {
        w.paragraph(`${goal.status === 'completed' ? '[x]' : '[ ]'} ${goal.title}`);
        w.paragraph(`${goal.startDate} — ${goal.endDate} · ${goal.status === 'completed' ? '已完成' : goal.status === 'archived' ? '已归档' : goal.status === 'failed' ? '未达成' : '进行中'}`, 8, MUTED, 12);
        if (goal.motivation) w.paragraph(goal.motivation, 9, MUTED, 12);
        if ('description' in goal && goal.description) w.paragraph(goal.description, 9, MUTED, 12);
      }
    }
  }
  if (selected.has('monthly')) {
    begin('monthly');
    for (const month of model.months) {
      await check('正在排版月计划');
      const days = model.days.filter((day) => day.date.startsWith(month));
      w.startPage(`${month} 月计划`, `${rangeLabel(days)} · ${stats(days)}`);
      writeCalendar(w, month, days);
      w.heading('本月计划');
      const planned = days.filter((day) => day.todos.some((entry) => entry.primaryKind !== 'inProgress') || day.logs.some((log) => log.source.isPlanned));
      if (!planned.length) w.paragraph('暂无计划', 10, MUTED);
      planned.forEach((day) => { w.heading(dateLabel(day.date)); writePlans(w, day, true); });
    }
  }
  if (selected.has('weekly')) {
    begin('weekly');
    for (const week of model.weeks) {
      await check('正在排版周计划');
      const end = shiftJournalDate(week, 6);
      const days = model.days.filter((day) => day.date >= week && day.date <= end);
      w.startPage('一周一页', `${rangeLabel(days)} · ${stats(days)}`);
      for (const day of days) {
        w.heading(`${dateLabel(day.date)} · ${formatJournalDuration(day.actualSeconds)}`);
        writePlans(w, day);
        if (day.review?.summary) w.paragraph(day.review.summary, 9, MUTED);
        w.rule();
      }
    }
  }
  if (selected.has('daily')) {
    begin('daily');
    const days = model.days.filter((day) => model.options.includeEmptyDays || day.hasContent);
    if (!days.length) { w.startPage('一日一页'); w.paragraph('所选范围暂无日记录', 10, MUTED); }
    for (const day of days) {
      await check('正在排版日页');
      w.startPage(dateLabel(day.date), `一日一页 · ${formatJournalDuration(day.actualSeconds)}${day.review?.moodEmoji ? ` · ${day.review.moodEmoji}` : ''}`);
      w.heading('今日计划');
      writePlans(w, day, true);
      w.heading('时间记录');
      writeLogs(w, day);
      w.heading('今日打卡');
      day.checks.forEach((item) => w.paragraph(`${item.isCompleted ? '[x]' : '[ ]'} ${item.content}  ${journalCheckValue(item)}`));
      if (day.review?.summary) { w.heading('今日一句'); w.paragraph(day.review.summary); }
    }
  }
  if (selected.has('timeline')) {
    begin('timeline');
    const days = model.days.filter((day) => model.options.includeEmptyDays || day.logs.length);
    w.startPage('时间轴', rangeLabel(model.days));
    if (!days.length) w.paragraph('所选范围暂无时间记录', 10, MUTED);
    for (const day of days) {
      await check('正在排版时间轴');
      w.heading(`${dateLabel(day.date)} · ${formatJournalDuration(day.actualSeconds)}`);
      if (!day.logs.length) w.paragraph('暂无时间记录', 9, MUTED);
      writeLogs(w, day);
      const plans = day.logs.filter((log) => log.source.isPlanned);
      if (plans.length) {
        w.heading('计划时间');
        plans.forEach((log) => {
          w.paragraph(`${formatJournalTime(log.start, day.date)}–${formatJournalTime(log.end, day.date)}  ${log.source.title || log.activity}`);
          if (log.source.note) w.paragraph(log.source.note, 9, MUTED, 12);
        });
      }
    }
  }
  if (selected.has('checks')) {
    begin('checks');
    for (const month of model.months) {
      await check('正在排版打卡表');
      const days = model.days.filter((day) => day.date.startsWith(month));
      w.startPage(`${month} 打卡表`, rangeLabel(days));
      writeCheckMatrix(w, month, days);
    }
  }
  if (selected.has('reviews')) {
    begin('reviews');
    let count = 0;
    for (const day of model.days.filter((entry) => entry.review)) {
      await check('正在排版日复盘');
      w.startPage(`${day.date} 日复盘`, day.review!.moodEmoji || '');
      writeReview(w, day.review!);
      count++;
    }
    for (const review of model.weeklyReviews) {
      await check('正在排版周复盘');
      w.startPage('周复盘', `${review.weekStartDate} — ${review.weekEndDate}`);
      writeReview(w, review);
      count++;
    }
    for (const review of model.monthlyReviews) {
      await check('正在排版月复盘');
      w.startPage('月复盘', `${review.monthStartDate} — ${review.monthEndDate}`);
      writeReview(w, review);
      count++;
    }
    if (!count) { w.startPage('复盘', rangeLabel(model.days)); w.paragraph('所选范围暂无完整周期的复盘', 10, MUTED); }
  }
  w.page = contentsPage;
  w.y = contentsTop;
  contents.forEach((entry, index) => {
    w.text(String(index + 1).padStart(2, '0'), w.margin, w.y + 4, 10, MUTED);
    w.text(entry.label, w.margin + 35, w.y, 16);
    const number = String(entry.page).padStart(2, '0');
    w.text(number, w.width - w.margin - w.widthOf(number, 12), w.y + 4, 12, ACCENT);
    w.y += 36;
    w.rule();
  });
  w.finish();
  await check('正在封装 PDF');
};
