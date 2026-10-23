/**
 * @file journalPdfLayout.test.ts
 * @input Bundled Chinese font and synthetic high-volume journal content
 * @output Real PDF pagination, searchability encoding and cancellation checks
 * @updated 2026-10-23: Verifies dual-font wrapping, explicit paragraphs, calendar entries and single-copy notes.
 */
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { buildJournalModel, type JournalExportData, type JournalExportOptions } from '../utils/journalExport';
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
      if (value === '时间轴 · 周概览' || value === '日志') chapter = value;
      seen.push({ chapter, text: value }); original(value, x, y, size, color, role);
    };
    await composeJournalPdf(w);
    expect(seen.some((entry) => entry.chapter === '时间轴 · 周概览' && entry.text === '24:00')).toBe(true);
    expect(seen.find((entry) => entry.text === '完整正文只属于日志')?.chapter).toBe('日志');
  });
  it('honors selected chapters and cancellation, and creates a usable empty book', async () => {
    const w = await make('a4');
    await composeJournalPdf(w);
    expect(w.pageCount).toBe(2);
    const abort = new AbortController(); abort.abort();
    await expect(composeJournalPdf(await make('a4'), undefined, abort.signal)).rejects.toThrow();
    const full = await make('a5', { includeCover: true, sections: ['yearly', 'monthly', 'weekly', 'daily', 'timeline', 'checks', 'reviews'] });
    await composeJournalPdf(full);
    expect(full.pageCount).toBeGreaterThanOrEqual(9);
  });
});
