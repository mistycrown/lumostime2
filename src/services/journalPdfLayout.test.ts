/**
 * @file journalPdfLayout.test.ts
 * @input Bundled Chinese font and synthetic high-volume journal content
 * @output Real PDF pagination, searchability encoding and cancellation checks
 * @updated 2026-10-23: Verifies dual-font wrapping, explicit paragraphs, calendar entries and single-copy notes.
 * @updated 2026-10-23: Checks facing-page parity, A4 orientation and interleaved cross-month details.
 */
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { buildJournalModel, shiftJournalDate, type JournalExportData, type JournalExportOptions } from '../utils/journalExport';
import { composeJournalPdf, JOURNAL_PRINT_FEATURES, JournalPdfWriter } from './journalPdfLayout';

const data: JournalExportData = { logs: [], todos: [], scopes: [], categories: [], todoCategories: [], dailyReviews: [], weeklyReviews: [], monthlyReviews: [] };
const options: JournalExportOptions = { startDate: '2026-10-19', endDate: '2026-10-20', sections: ['timeline'], paperSize: 'a4', includeCover: false, includeEmptyDays: false };
const make = async (size: 'a4' | 'a5', patch: Partial<JournalExportOptions> = {}, source = data) => {
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await readFile('public/fonts/LXGWWenKaiLite-Journal.ttf'), { subset: false });
  const printed = await pdf.embedFont(await readFile('public/fonts/NotoSansSC-Journal.ttf'), { subset: false, features: JOURNAL_PRINT_FEATURES });
  return new JournalPdfWriter(pdf, font, buildJournalModel(source, { ...options, ...patch, paperSize: size }), undefined, printed);
};

describe('PDF pagination with bundled Chinese font', () => {
  it('fits 365 small mood stickers on one annual page and uses compact columns for summaries', async () => {
    const source = { ...data, dailyReviews: Array.from({ length: 365 }, (_, index) => ({ id: `mood-${index}`, date: shiftJournalDate('2026-01-01', index), createdAt: 0, updatedAt: 0, answers: [], moodEmoji: 'image:test', summary: index < 16 ? `第${index + 1}天的小事：记住走在路上的轻松和傍晚的晚风。` : undefined })) };
    const w = await make('a5', { startDate: '2026-01-01', endDate: '2026-12-31', sections: ['yearly'] }, source);
    w.stickers.set('image:test', await w.pdf.embedPng('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='));
    const pages: { title: string; page: number }[] = [];
    const calls: { page: number; size: number }[] = [];
    const start = w.startPage.bind(w); const sticker = w.sticker.bind(w);
    w.startPage = (...args) => { start(...args); pages.push({ title: args[0], page: w.pageCount }); };
    w.sticker = (icon, x, top, size) => { calls.push({ page: w.pageCount, size }); expect(top + size).toBeLessThanOrEqual(w.bottom); sticker(icon, x, top, size); };
    await composeJournalPdf(w);
    const overview = pages.filter((page) => page.title.includes('心情贴纸概览'));
    expect(overview).toHaveLength(1);
    const moods = calls.filter((call) => call.page === overview[0].page);
    expect(moods).toHaveLength(365);
    expect(moods.every((call) => call.size <= 14)).toBe(true);
    expect(pages.filter((page) => page.title.includes('每日一句话与贴纸'))).toHaveLength(1);
    expect(calls.filter((call) => call.page !== overview[0].page).every((call) => call.size === 18)).toBe(true);
    expect(pages.filter((page) => page.title === '目录')).toHaveLength(1);
  });
  it.each([false, true])('places A5 overviews on even/odd facing pages, cover=%s', async (includeCover) => {
    const w = await make('a5', { includeCover, sections: ['monthly', 'timeline'] });
    const headings: { page: number; text: string; width: number; height: number }[] = [];
    const original = w.startPage.bind(w);
    w.startPage = (...args) => { original(...args); headings.push({ page: w.pageCount, text: args[0], width: w.width, height: w.height }); };
    await composeJournalPdf(w);
    const overviews = headings.filter((entry) => entry.text.includes('月计划') || entry.text.includes('时间轴'));
    expect(overviews).toHaveLength(4);
    for (let i = 0; i < overviews.length; i += 2) {
      expect(overviews[i].page % 2).toBe(0);
      expect(overviews[i + 1].page).toBe(overviews[i].page + 1);
      expect(overviews[i].width).toBeCloseTo(419.53);
      expect(overviews[i].height).toBeCloseTo(595.28);
    }
    if (includeCover) expect(w.pdf.getPages()[2].node.Contents()).toBeUndefined();
  });
  it('uses one landscape A4 page per overview and restores portrait for daily details', async () => {
    const w = await make('a4', { sections: ['monthly', 'timeline', 'daily'], includeEmptyDays: true });
    const pages: { title: string; width: number; height: number }[] = [];
    const original = w.startPage.bind(w);
    w.startPage = (...args) => { original(...args); pages.push({ title: args[0], width: w.width, height: w.height }); };
    await composeJournalPdf(w);
    const overviews = pages.filter((page) => page.title.includes('月计划') || page.title.includes('时间轴'));
    expect(overviews).toHaveLength(2);
    expect(overviews.every((page) => page.width > page.height && page.width === 841.89)).toBe(true);
    expect(pages.filter((page) => page.title.includes('周一') || page.title.includes('周二')).every((page) => page.width < page.height)).toBe(true);
  });
  it('interleaves months, weeks and dates without duplicating a cross-month week or losing actual logs', async () => {
    const source = { ...data, logs: [{ id: 'real', categoryId: 'c', activityId: 'a', title: '真实记录', note: '跨月日志正文', startTime: new Date(2026, 8, 1, 9).getTime(), endTime: new Date(2026, 8, 1, 10).getTime(), duration: 3600 }] };
    const w = await make('a4', { startDate: '2026-08-31', endDate: '2026-09-02', sections: ['monthly', 'timeline', 'daily', 'logs'], includeEmptyDays: true }, source);
    const headings: string[] = [];
    const calls: string[] = [];
    const start = w.startPage.bind(w); const text = w.text.bind(w);
    w.startPage = (...args) => { headings.push(args[0]); start(...args); };
    w.text = (value, ...args) => { calls.push(value); text(value, ...args); };
    await composeJournalPdf(w);
    expect(headings.filter((title) => title === '时间轴 · 周概览')).toHaveLength(1);
    for (const date of ['2026-08-31', '2026-09-01', '2026-09-02']) expect(headings.filter((title) => title.startsWith(date))).toHaveLength(1);
    expect(headings.indexOf('2026-08 月计划')).toBeLessThan(headings.findIndex((title) => title.startsWith('2026-08-31')));
    expect(headings.findIndex((title) => title.startsWith('2026-08-31'))).toBeLessThan(headings.indexOf('2026-09 月计划'));
    expect(headings.indexOf('2026-09 月计划')).toBeLessThan(headings.findIndex((title) => title.startsWith('2026-09-01')));
    expect(calls).toContain('跨月日志正文');
    expect(calls).toContain('时间线 · 日志');
    expect(calls).not.toContain('今日打卡');
    expect(calls).not.toContain('今日一句');
  });
  it('reserves long contents before composing and preserves spread parity across all twelve months', async () => {
    const w = await make('a5', { startDate: '2026-01-01', endDate: '2026-12-31', sections: ['yearly', 'monthly'] });
    const pages: { title: string; page: number }[] = [];
    const start = w.startPage.bind(w);
    w.startPage = (...args) => { start(...args); pages.push({ title: args[0], page: w.pageCount }); };
    const text = w.text.bind(w);
    w.text = (value, x, top, size = w.bodySize, color, role = 'print') => {
      expect(x + w.widthOf(value, size, role)).toBeLessThanOrEqual(w.width - w.pageMargin + 0.1);
      expect(top + size).toBeLessThanOrEqual(w.height - w.pageMargin + 10);
      text(value, x, top, size, color, role);
    };
    await composeJournalPdf(w);
    expect(pages.filter((page) => page.title === '目录')).toHaveLength(2);
    expect(pages.at(-1)!.title).toBe('2026-12 月计划');
    const months = pages.filter((page) => page.title.endsWith('月计划'));
    expect(months).toHaveLength(24);
    expect(months.filter((_, index) => index % 2 === 0).every((page) => page.page % 2 === 0)).toBe(true);
  });
  it('continues a long review after the facing spread without truncating or repeating its body', async () => {
    const body = Array.from({ length: 80 }, (_, index) => `第${index + 1}条回顾，记录这个月发生的小事。`).join('\n');
    const source = { ...data, monthlyReviews: [{ id: 'm', monthStartDate: '2026-10-01', monthEndDate: '2026-10-31', createdAt: 0, updatedAt: 0, answers: [{ questionId: 'q', question: '本月回顾', answer: body }] }] };
    const w = await make('a5', { sections: ['monthly', 'reviews'] }, source);
    const text = w.text.bind(w); const calls: string[] = [];
    w.text = (value, ...args) => { calls.push(value); text(value, ...args); };
    await composeJournalPdf(w);
    expect(calls).toContain('月度回顾 · 续');
    const joined = calls.join('');
    for (let i = 1; i <= 80; i++) expect(joined.split(`第${i}条回顾`).length - 1).toBe(1);
  });
  it('merges the daily plan and its planned Log instead of repeating it under a second heading', async () => {
    const source = { ...data, todos: [{ id: 'task', categoryId: 'c', title: '同一条排期', scheduledDate: '2026-10-19', isCompleted: false }], logs: [{ id: 'plan', linkedTodoId: 'task', isPlanned: true, categoryId: 'c', activityId: 'a', title: '同一条排期', startTime: new Date(2026, 9, 19, 9).getTime(), endTime: new Date(2026, 9, 19, 10).getTime(), duration: 3600 }] };
    const w = await make('a5', { sections: ['daily', 'logs'] }, source);
    const calls: string[] = []; const text = w.text.bind(w);
    w.text = (value, ...args) => { calls.push(value); text(value, ...args); };
    await composeJournalPdf(w);
    expect(calls.filter((value) => value === '同一条排期')).toHaveLength(1);
    expect(calls).not.toContain('计划时间');
  });
  it.each(['a4', 'a5'] as const)('wraps long text and headings within %s printable bounds without dropping a character', async (size) => {
    const w = await make(size);
    w.startPage('手账测试');
    const input = '这是长篇复盘，所有文字都应该保留。'.repeat(800);
    expect(w.wrap(input).join('')).toBe(input);
    let lines = 0;
    const original = w.text.bind(w);
    w.text = (value, x, top, fontSize = w.bodySize, color, role = 'print') => {
      expect(x + w.widthOf(value, fontSize, role)).toBeLessThanOrEqual(w.width - w.margin + 0.1);
      expect(top + fontSize).toBeLessThanOrEqual(w.height - w.margin + 10);
      original(value, x, top, fontSize, color, role); lines++;
    };
    w.heading('很长的复盘问题'.repeat(50));
    w.paragraph(input);
    expect(w.pageCount).toBeGreaterThan(3);
    expect(lines).toBeGreaterThan(100);
    w.finish();
    const bytes = await w.pdf.save();
    expect(bytes.length).toBeLessThan(12000000);
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(w.pageCount);
    expect(reloaded.getPages()[0].getWidth()).toBeCloseTo(size === 'a4' ? 595.28 : 419.53);
  });
  it('preserves paragraph breaks and separates printed labels from handwriting', async () => {
    const w = await make('a5');
    expect(w.wrap('第一段\n\n第二段')).toEqual(['第一段', '', '第二段']);
    expect(w.printedFont.name).not.toBe(w.font.name);
    const calls: { value: string; role: string; y: number }[] = [];
    const original = w.text.bind(w);
    w.text = (value, x, y, size, color, role = 'print') => { calls.push({ value, role, y }); original(value, x, y, size, color, role); };
    w.startPage('印刷标题'); w.heading('今日记录'); w.paragraph('第一段\n\n第二段');
    expect(calls.find((call) => call.value === '印刷标题')?.role).toBe('print');
    const first = calls.find((call) => call.value === '第一段')!;
    const second = calls.find((call) => call.value === '第二段')!;
    expect(first.role).toBe('hand');
    expect(second.y - first.y).toBeCloseTo(w.bodySize * 1.85 * 2);
  });
  it('puts schedules inside calendars and prints full log/plan notes only once across chapters', async () => {
    const source: JournalExportData = { ...data, logs: [{ id: 'night', activityId: 'a', categoryId: 'c', title: '跨日阅读', note: '唯一记录正文\n第二段正文', startTime: new Date(2026, 9, 19, 23).getTime(), endTime: new Date(2026, 9, 20, 1).getTime(), duration: 7200 }], todos: [{ id: 't', categoryId: 'c', title: '提交课程作业', note: '唯一计划备注', isCompleted: false, scheduledDate: '2026-10-19', deadlineDate: '2026-10-20' }] };
    const w = await make('a5', { sections: ['monthly', 'daily', 'timeline', 'logs'] }, source);
    const calls: string[] = [];
    const original = w.text.bind(w);
    w.text = (value, x, y, size, color, role) => { calls.push(value); original(value, x, y, size, color, role); };
    await composeJournalPdf(w);
    expect(calls.filter((value) => value === '唯一记录正文')).toHaveLength(1);
    expect(calls.filter((value) => value === '唯一计划备注')).toHaveLength(1);
    expect(calls).toContain('第二段正文');
    expect(calls.some((value) => value.includes('提交课程'))).toBe(true);
    expect(calls).toContain('截止');
  });
  it('keeps weekly colored time grids separate from detailed log notes', async () => {
    const source: JournalExportData = { ...data, logs: [{ id: 'a', activityId: 'a', categoryId: 'c', title: '阅读记录', note: '完整正文只属于日志', startTime: new Date(2026, 9, 19, 9).getTime(), endTime: new Date(2026, 9, 19, 12).getTime(), duration: 10800 }] };
    const w = await make('a4', { sections: ['timeline', 'logs'] }, source);
    let chapter = '';
    const seen: { chapter: string; text: string }[] = [];
    const original = w.text.bind(w);
    w.text = (value, x, y, size, color, role) => {
      if (value === '时间轴 · 周概览' || value === '时间线 · 日志') chapter = value;
      seen.push({ chapter, text: value }); original(value, x, y, size, color, role);
    };
    await composeJournalPdf(w);
    expect(seen.some((entry) => entry.chapter === '时间轴 · 周概览' && entry.text === '24:00')).toBe(true);
    expect(seen.find((entry) => entry.text === '完整正文只属于日志')?.chapter).toBe('时间线 · 日志');
  });
  it('honors selected chapters and cancellation, and creates a usable empty book', async () => {
    const w = await make('a4');
    await composeJournalPdf(w);
    expect(w.pageCount).toBe(2);
    const abort = new AbortController(); abort.abort();
    await expect(composeJournalPdf(await make('a4'), undefined, abort.signal)).rejects.toThrow();
    const full = await make('a5', { includeCover: true, sections: ['yearly', 'monthly', 'weekly', 'daily', 'timeline', 'checks', 'reviews'] });
    await composeJournalPdf(full);
    expect(full.pageCount).toBeGreaterThanOrEqual(7);
  });
});
