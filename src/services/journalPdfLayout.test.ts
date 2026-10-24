/**
 * @file journalPdfLayout.test.ts
 * @input Bundled Chinese font and synthetic high-volume journal content
 * @output Real PDF pagination, searchability encoding and cancellation checks
 * @updated 2026-10-23: Verifies dual-font wrapping, explicit paragraphs, calendar entries and single-copy notes.
 * @updated 2026-10-23: Checks facing-page parity, A4 orientation and interleaved cross-month details.
 * @updated 2026-10-23: Requires landscape A4 on all pages and validates shorter landscape contents.
 * @updated 2026-10-23: Verifies rich overnight content, photo bounds, English headings and in-place node styling.
 * @updated 2026-10-23: Checks A4/A5 integrated statistics, original colors, twelve-month calendars and guidance hierarchy.
 */
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { buildJournalModel, journalSectionsForParts, shiftJournalDate, type JournalExportData, type JournalExportOptions } from '../utils/journalExport';
import { composeJournalPdf, JOURNAL_PRINT_FEATURES, JournalPdfWriter } from './journalPdfLayout';
import { writeCheckMatrix } from './journalPdfLayout';
import { writeJournalCover } from './journalPdfCover';
import { writeAnnualMood } from './journalPdfMood';
import { writeJournalDistributions } from './journalPdfStatistics';
import { journalDataColor } from './journalPdfTheme';
import { journalDemoData } from '../../scripts/fixtures/journal-demo';
import { writeWeeklyTimeline } from './journalPdfTimeline';

const data: JournalExportData = { logs: [], todos: [], scopes: [], categories: [], todoCategories: [], dailyReviews: [], weeklyReviews: [], monthlyReviews: [] };
const options: JournalExportOptions = { startDate: '2026-10-19', endDate: '2026-10-20', sections: ['timeline'], paperSize: 'a4', includeCover: false, includeEmptyDays: false };
const make = async (size: 'a4' | 'a5', patch: Partial<JournalExportOptions> = {}, source = data) => {
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await readFile('public/fonts/LXGWWenKaiLite-Journal.ttf'), { subset: false });
  const printed = await pdf.embedFont(await readFile('public/fonts/NotoSansSC-Journal.ttf'), { subset: false, features: JOURNAL_PRINT_FEATURES });
  return new JournalPdfWriter(pdf, font, buildJournalModel(source, { ...options, ...patch, paperSize: size }), undefined, printed);
};

describe('PDF pagination with bundled Chinese font', () => {
  it('uses application badge names and keeps each Log reaction beside its own title', async () => {
    const source = { ...data,
      todos: [{ id: 't', title: '排期事件', categoryId: 'c', scheduledDate: '2026-10-19', deadlineDate: '2026-10-19', isCompleted: false }],
      logs: [{ id: 'a', categoryId: 'c', activityId: 'a', title: '日志甲', reactions: ['赞', 'image:missing-sticker'], startTime: new Date(2026, 9, 19, 9).getTime(), endTime: new Date(2026, 9, 19, 10).getTime(), duration: 3600 }, { id: 'b', categoryId: 'c', activityId: 'a', title: '日志乙', reactions: ['好'], startTime: new Date(2026, 9, 19, 11).getTime(), endTime: new Date(2026, 9, 19, 12).getTime(), duration: 3600 }]
    };
    const w = await make('a5', { sections: ['daily', 'logs'] }, source);
    const calls: string[] = []; const text = w.text.bind(w);
    w.text = (value, ...args) => { calls.push(value); text(value, ...args); };
    await composeJournalPdf(w);
    expect(calls).toEqual(expect.arrayContaining(['DUE', '日志甲 赞', '日志乙 好']));
    expect(calls.some((value) => /Reaction|Complete|^Do$|missing-sticker/.test(value))).toBe(false);
  });
  it('keeps a continuation rail beside every column of one long Log', async () => {
    const source = { ...data, logs: [{ id: 'long', categoryId: 'c', activityId: 'a', title: '长篇日志', note: '跨栏原文保留。'.repeat(900), startTime: new Date(2026, 9, 19, 9).getTime(), endTime: new Date(2026, 9, 19, 10).getTime(), duration: 3600 }] };
    const w = await make('a5', { sections: ['logs'] }, source);
    const rails = new Set<string>(); const notes = new Set<string>();
    const start = w.startPage.bind(w); const text = w.text.bind(w);
    w.startPage = (...args) => {
      start(...args); const page = w.page; const draw = page.drawLine.bind(page);
      page.drawLine = (options) => {
        if (options?.start && options.end && options.start.x === options.end.x) rails.add(`${w.pdf.getPages().indexOf(page)}:${Math.round(options.start.x)}`);
        draw(options);
      };
    };
    w.text = (value, x, ...args) => { if (value.includes('跨栏原文')) notes.add(`${w.pdf.getPages().indexOf(w.page)}:${Math.round(x - 9)}`); text(value, x, ...args); };
    await composeJournalPdf(w);
    expect(notes.size).toBeGreaterThan(2);
    notes.forEach((key) => expect(rails.has(key)).toBe(true));
  });
  it('prints the hour axis only on the left A5 timeline and uses activity titles with short notes', async () => {
    const source = { ...data, categories: [{ id: 'c', name: '分类', icon: '', themeColor: '#123456', activities: [{ id: 'a', name: '阅读', icon: '', color: '#123456' }] }], logs: [{ id: 'a', categoryId: 'c', activityId: 'a', title: '不应出现在概览的自定义标题', note: '短备注'.repeat(80), startTime: new Date(2026, 9, 19, 9).getTime(), endTime: new Date(2026, 9, 19, 13).getTime(), duration: 14400 }] };
    const w = await make('a5', { startDate: '2026-10-19', endDate: '2026-10-25' }, source);
    const calls: { page: number; text: string; size: number }[] = []; const text = w.text.bind(w);
    w.text = (value, x, y, size = 9, ...args) => { calls.push({ page: w.pageCount, text: value, size }); text(value, x, y, size, ...args); };
    writeWeeklyTimeline(w, '2026-10-19', w.model.days);
    expect(calls.filter((call) => call.text === '00:00')).toHaveLength(1);
    expect(calls.filter((call) => call.text === '24:00')).toHaveLength(1);
    expect(calls.filter((call) => call.text === '阅读')).toHaveLength(1);
    expect(calls.find((call) => call.text === '阅读')?.size).toBe(7.5);
    expect(calls.some((call) => call.text.includes('不应出现'))).toBe(false);
    expect(calls.some((call) => call.text.endsWith('…'))).toBe(true);
  });
  it('adds independently selectable yearly and weekly Time Distribution pages', async () => {
    const parts = ['yearStatistics', 'weekStatistics'] as const;
    const w = await make('a4', { startDate: '2026-08-01', endDate: '2026-08-31', parts: [...parts], sections: journalSectionsForParts([...parts]) }, journalDemoData);
    const titles: string[] = []; const start = w.startPage.bind(w);
    w.startPage = (value, ...args) => { titles.push(value); start(value, ...args); };
    await composeJournalPdf(w);
    expect(titles).toContain('2026 时间分布');
    expect(titles).toContain('2026-08-03 时间分布');
    expect(titles.some((title) => title === '2026-08 时间分布' || title.includes('周计划'))).toBe(false);
  });
  it.each(['minimal', 'classic', 'abstract'] as const)('adapts the supplied %s cover to both orientations', async (coverStyle) => {
    for (const size of ['a4', 'a5'] as const) {
      const w = await make(size, { includeCover: true, coverStyle, accentColor: '#8844aa' });
      const values: string[] = []; const text = w.text.bind(w);
      w.text = (value, x, y, fontSize = 9, color, role) => {
        expect(x).toBeGreaterThanOrEqual(w.pageMargin);
        expect(x + w.widthOf(value, fontSize, role)).toBeLessThanOrEqual(w.width - w.pageMargin);
        expect(y + fontSize).toBeLessThan(w.height - 30);
        values.push(value); text(value, x, y, fontSize, color, role);
      };
      writeJournalCover(w);
      expect(values).toContain('Life Journal');
      expect(values).toContain('2026.10.19 - 2026.10.20');
      expect(values).toContain('记录数');
      expect(w.pageCount).toBe(1);
      expect((await w.pdf.save()).length).toBeGreaterThan(1000);
    }
  });
  it('keeps themes isolated per export and defaults to black', async () => {
    const black = await make('a4');
    const purple = await make('a4', { accentColor: '#8844aa' });
    expect(black.accentColor).toMatchObject({ red: 0, green: 0, blue: 0 });
    expect(purple.accentColor).toMatchObject({ red: 0x88 / 255, green: 0x44 / 255, blue: 0xaa / 255 });
  });
  it('exports one independently selected part without the other annual, monthly or daily parts', async () => {
    const parts = ['monthAgenda'] as const;
    const w = await make('a4', { startDate: '2026-08-01', endDate: '2026-08-31', parts: [...parts], sections: journalSectionsForParts([...parts]) }, journalDemoData);
    const titles: string[] = []; const start = w.startPage.bind(w);
    w.startPage = (value, ...args) => { titles.push(value); start(value, ...args); };
    await composeJournalPdf(w);
    expect(titles.some((title) => title.includes('日程明细'))).toBe(true);
    expect(titles).not.toContain('手账');
    expect(titles.some((title) => /月计划|年度|周计划|打卡|时间分布|星期|一日一页/.test(title))).toBe(false);
  });
  it.each(['a4', 'a5'] as const)('uses original user colors and lays out complete statistics on one %s page', async (size) => {
    expect(journalDataColor('any-id', '#123456')).toMatchObject({ red: 0x12 / 255, green: 0x34 / 255, blue: 0x56 / 255 });
    const w = await make(size, { startDate: '2026-08-01', endDate: '2026-08-31' }, journalDemoData);
    const labels: string[] = []; const text = w.text.bind(w);
    w.text = (value, ...args) => { labels.push(value); text(value, ...args); };
    writeJournalDistributions(w, '2026-08', w.model.days);
    expect(w.pageCount).toBe(1);
    expect(labels).not.toContain('2026-08 Statistics');
    for (const label of ['标签', '领域', '待办']) expect(labels).toContain(label);
    expect(labels).not.toContain('关键字');
    expect(labels.join('')).toContain('给妈妈寄明信片');
  });
  it('renders A4 annual moods as twelve calendars and places every sticker on its original date', async () => {
    const source = { ...data, dailyReviews: Array.from({ length: 365 }, (_, index) => ({ id: String(index), date: shiftJournalDate('2026-01-01', index), createdAt: 0, updatedAt: 0, answers: [], moodEmoji: 'image:test' })) };
    const w = await make('a4', { startDate: '2026-01-01', endDate: '2026-12-31' }, source);
    const months: { x: number; y: number }[] = []; const stickers: { x: number; y: number }[] = [];
    const text = w.text.bind(w);
    w.text = (value, x, y, ...args) => { if (/^\d{2} \/ [A-Z]{3}$/.test(value)) months.push({ x, y }); text(value, x, y, ...args); };
    w.sticker = (_icon, x, y, size) => { expect(y + size).toBeLessThanOrEqual(w.bottom); expect(size).toBe(12); stickers.push({ x, y }); };
    writeAnnualMood(w, 2026, w.model.days);
    expect(months).toHaveLength(12);
    expect(new Set(months.map((month) => month.x)).size).toBe(4);
    expect(new Set(months.map((month) => month.y)).size).toBe(3);
    expect(stickers).toHaveLength(365);
    expect(stickers[0].x).toBeGreaterThan(stickers[4].x); // Thursday Jan 1 precedes Monday Jan 5.
    expect(stickers[31].x).toBeGreaterThan(stickers[32].x); // Sunday Feb 1 precedes Monday Feb 2.
  });
  it('uses vector checkboxes, symbolic associations and three guidance heading levels', async () => {
    const source: JournalExportData = { ...data,
      categories: [{ id: 'c', name: '运动', icon: '', themeColor: '#123456', activities: [{ id: 'a', name: 'Surf', icon: '', color: '#abcdef', keywords: ['浪'] }] }],
      scopes: [{ id: 's', name: '健康', icon: '', themeColor: '#123456', isArchived: false, order: 0 }],
      todos: [{ id: 't', title: '海边练习', categoryId: 'tc', scheduledDate: '2026-10-19', isCompleted: false }],
      collections: [{ id: 'col', name: '海边日常', createdAt: 0, updatedAt: 0 }],
      collectionEntries: [{ id: 'entry', collectionId: 'col', itemType: 'log', itemId: 'surf', addedAt: 0 }],
      logs: [{ id: 'surf', activityId: 'a', categoryId: 'c', title: 'Surf', note: '今天的浪很平静。', linkedTodoId: 't', scopeIds: ['s'], startTime: new Date(2026, 9, 19, 9).getTime(), endTime: new Date(2026, 9, 19, 10).getTime(), duration: 3600 }],
      dailyReviews: [{ id: 'review', date: '2026-10-19', createdAt: 0, updatedAt: 0, answers: [{ questionId: 'q', question: '想记住什么？', answer: '第一次站上浪板。' }], templateSnapshot: [{ id: 'group', title: '日常发现', questions: [{ id: 'q', question: '想记住什么？', type: 'text' }] }] }]
    };
    const w = await make('a4', { sections: ['daily', 'reviews'] }, source);
    const calls: { value: string; size: number }[] = []; const text = w.text.bind(w);
    w.text = (value, x, y, size = w.bodySize, ...args) => { calls.push({ value, size }); text(value, x, y, size, ...args); };
    await composeJournalPdf(w);
    expect(calls.filter((call) => call.value === 'Surf')).toHaveLength(1);
    expect(calls.map((call) => call.value)).toEqual(expect.arrayContaining(['#运动', '%健康', '@海边练习', '◬海边日常', 'ARR', 'TRA']));
    expect(calls.some((call) => /\[[ x]\]|领域|关联待办|关键字|排期 已完成/.test(call.value))).toBe(false);
    expect(calls.find((call) => call.value === '引导')?.size).toBe(12);
    expect(calls.find((call) => call.value === '日常发现')?.size).toBe(9);
    expect(calls.find((call) => call.value === '想记住什么？')?.size).toBe(9);
  });
  it.each(['a4', 'a5'] as const)('keeps the independent %s cover within bounds without quoting a daily summary', async (size) => {
    const source = { ...data, dailyReviews: [{ id: 'r', date: '2026-10-19', createdAt: 0, updatedAt: 0, answers: [], summary: '这段总结来自用户。' }] };
    const w = await make(size, { includeCover: true }, source);
    const calls: { value: string; role: string }[] = [];
    const text = w.text.bind(w);
    w.text = (value, x, top, fontSize = w.bodySize, color, role = 'print') => {
      expect(x).toBeGreaterThanOrEqual(w.pageMargin);
      expect(x + w.widthOf(value, fontSize, role)).toBeLessThanOrEqual(w.width - w.pageMargin + 0.1);
      expect(top + fontSize).toBeLessThanOrEqual(w.height - 18);
      calls.push({ value, role }); text(value, x, top, fontSize, color, role);
    };
    writeJournalCover(w); w.finish();
    expect(calls.some((call) => call.value === '这段总结来自用户。')).toBe(false);
    expect(calls.some((call) => call.value.includes('/   JOURNAL'))).toBe(false);
    expect(calls.some((call) => call.value === '1 / 1')).toBe(false);
    expect(calls.some((call) => call.value === 'Life Journal')).toBe(true);
  });
  it('centers counted check values on their date header and omits the redundant count appendix', async () => {
    const source = { ...data, dailyReviews: [{ id: 'r', date: '2026-10-19', createdAt: 0, updatedAt: 0, answers: [], checkItems: [{ id: 'water', content: '喝水', manualMode: 'count' as const, currentCount: 2, targetCount: 3, isCompleted: false }] }] };
    const w = await make('a4', {}, source);
    const calls: { text: string; x: number; size: number }[] = [];
    const text = w.text.bind(w);
    w.text = (value, x, y, size = w.bodySize, color, role) => { calls.push({ text: value, x, size }); text(value, x, y, size, color, role); };
    w.startPage('月打卡'); writeCheckMatrix(w, '2026-10', w.model.days);
    const date = calls.find((call) => call.text === '19' && call.size === 9)!;
    const value = calls.filter((call) => call.text === '2' && call.size === 9).at(-1)!;
    expect(date.x + w.widthOf(date.text, date.size) / 2).toBeCloseTo(value.x + w.widthOf(value.text, value.size) / 2);
    expect(calls.some((call) => call.text === '计数明细')).toBe(false);
    expect(calls.some((call) => call.text.includes('实心'))).toBe(false);
  });
  it.each(['a4', 'a5'] as const)('keeps rich overnight Log content and every photo once within %s columns', async (size) => {
    const source = { ...data, logs: [{ id: 'rich', activityId: 'a', categoryId: 'c', title: '跨日图文', note: '独有备注 [[阅读]]', startTime: new Date(2026, 9, 19, 23).getTime(), endTime: new Date(2026, 9, 20, 1).getTime(), duration: 7200, progressIncrement: 0, focusScore: 4, moodScore: 5, attributeValues: [{ attributeId: 'missing', value: '保留历史属性' }], reactions: ['赞'], comments: [{ id: 'c', content: '评论原文\n\n评论第二段', createdAt: new Date(2026, 9, 20, 9).getTime() }], images: ['a', 'b', 'c', 'd'] }] };
    const w = await make(size, { sections: ['daily', 'logs'] }, source);
    const picture = await w.pdf.embedPng('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==');
    for (const key of ['a', 'b', 'c', 'd']) w.photos.set(key, picture);
    const calls: string[] = []; const text = w.text.bind(w); const start = w.startPage.bind(w);
    let photos = 0;
    w.startPage = (...args) => {
      start(...args);
      const draw = w.page.drawImage.bind(w.page);
      w.page.drawImage = (image, options = {}) => {
        expect(options.x).toBeGreaterThanOrEqual(w.pageMargin);
        expect(options.x! + options.width!).toBeLessThanOrEqual(w.width - w.pageMargin + 0.1);
        expect(options.y).toBeGreaterThanOrEqual(w.height - w.pageBottom - 0.1);
        expect(options.width! / options.height!).toBeCloseTo(image.width / image.height);
        photos++; draw(image, options);
      };
    };
    w.text = (value, ...args) => { calls.push(value); text(value, ...args); };
    await composeJournalPdf(w);
    const all = calls.join('');
    for (const value of ['独有备注', '保留历史属性', '评论原文', '评论第二段', '赞']) expect(all.split(value)).toHaveLength(2);
    expect(calls).toContain('专注评分'); expect(calls).toContain('4/5');
    expect(calls).toContain('进度增量'); expect(calls).toContain('0');
    expect(calls).not.toContain('Connections');
    expect(calls).toContain('阅读');
    expect(calls.some((value) => value.includes('[['))).toBe(false);
    expect(photos).toBe(4);
  });
  it('flows a populated day across three compact A4 columns while preserving each full note once', async () => {
    const source = { ...data, logs: Array.from({ length: 12 }, (_, index) => ({ id: `log-${index}`, categoryId: 'c', activityId: 'a', title: `记录第${index + 1}项`, note: `唯一正文第${index + 1}条。把当天的想法完整保留，跨栏时也不能遗漏。`, startTime: new Date(2026, 9, 19, index).getTime(), endTime: new Date(2026, 9, 19, index + 1).getTime(), duration: 3600 })) };
    const w = await make('a4', { sections: ['daily', 'logs'] }, source);
    const calls: { value: string; x: number }[] = []; const text = w.text.bind(w);
    w.text = (value, x, ...args) => { calls.push({ value, x }); text(value, x, ...args); };
    await composeJournalPdf(w);
    const titles = calls.filter((call) => call.value.startsWith('记录第'));
    expect(titles).toHaveLength(12);
    expect(new Set(titles.map((call) => Math.round(call.x))).size).toBe(3);
    expect(w.pageCount).toBeLessThanOrEqual(3);
    const joined = calls.map((call) => call.value).join('');
    for (let i = 1; i <= 12; i++) expect(joined.split(`唯一正文第${i}条`).length - 1).toBe(1);
  });
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
    expect(calls.filter((call) => call.page !== overview[0].page).every((call) => call.size === 12)).toBe(true);
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
  it('keeps every A4 page landscape including cover, contents, annual review and daily detail', async () => {
    const w = await make('a4', { sections: ['yearly', 'monthly', 'timeline', 'daily'], includeCover: true, includeEmptyDays: true });
    const pages: { title: string; width: number; height: number }[] = [];
    const original = w.startPage.bind(w);
    w.startPage = (...args) => { original(...args); pages.push({ title: args[0], width: w.width, height: w.height }); };
    await composeJournalPdf(w);
    const overviews = pages.filter((page) => page.title.includes('月计划') || page.title.includes('时间轴'));
    expect(overviews).toHaveLength(2);
    expect(overviews.every((page) => page.width > page.height && page.width === 841.89)).toBe(true);
    expect(pages.some((page) => page.title.includes('周一'))).toBe(true);
    expect(pages.every((page) => page.width === 841.89 && page.height === 595.28)).toBe(true);
    expect(w.pdf.getPages().every((page) => page.getWidth() === 841.89 && page.getHeight() === 595.28)).toBe(true);
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
    expect(headings.filter((title) => title === '时间轴 周概览')).toHaveLength(1);
    for (const date of ['2026-08-31', '2026-09-01', '2026-09-02']) expect(headings.filter((title) => title.startsWith(date))).toHaveLength(1);
    expect(headings.indexOf('2026-08 月计划')).toBeLessThan(headings.findIndex((title) => title.startsWith('2026-08-31')));
    expect(headings.findIndex((title) => title.startsWith('2026-08-31'))).toBeLessThan(headings.indexOf('2026-09 月计划'));
    expect(headings.indexOf('2026-09 月计划')).toBeLessThan(headings.findIndex((title) => title.startsWith('2026-09-01')));
    expect(calls).toContain('跨月日志正文');
    expect(calls).toContain('时间线 日志');
    expect(calls).not.toContain('今日打卡');
    expect(calls).not.toContain('今日一句');
  });
  it.each(['a4', 'a5'] as const)('reserves long contents within %s bounds before composing all twelve months', async (size) => {
    const w = await make(size, { startDate: '2026-01-01', endDate: '2026-12-31', sections: ['yearly', 'monthly'] });
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
    expect(months).toHaveLength(size === 'a5' ? 24 : 12);
    if (size === 'a5') expect(months.filter((_, index) => index % 2 === 0).every((page) => page.page % 2 === 0)).toBe(true);
  });
  it('continues a long review after the facing spread without truncating or repeating its body', async () => {
    const body = Array.from({ length: 80 }, (_, index) => `第${index + 1}条回顾，记录这个月发生的小事。`).join('\n');
    const source = { ...data, monthlyReviews: [{ id: 'm', monthStartDate: '2026-10-01', monthEndDate: '2026-10-31', createdAt: 0, updatedAt: 0, answers: [{ questionId: 'q', question: '本月回顾', answer: body }] }] };
    const w = await make('a5', { sections: ['monthly', 'reviews'] }, source);
    const text = w.text.bind(w); const calls: string[] = [];
    w.text = (value, ...args) => { calls.push(value); text(value, ...args); };
    await composeJournalPdf(w);
    expect(calls).toContain('Monthly Review');
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
    expect(reloaded.getPages()[0].getWidth()).toBeCloseTo(size === 'a4' ? 841.89 : 419.53);
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
    expect(calls).toContain('DUE');
  });
  it('keeps weekly colored time grids separate from detailed log notes', async () => {
    const source: JournalExportData = { ...data, logs: [{ id: 'a', activityId: 'a', categoryId: 'c', title: '阅读记录', note: '完整正文只属于日志', startTime: new Date(2026, 9, 19, 9).getTime(), endTime: new Date(2026, 9, 19, 12).getTime(), duration: 10800 }] };
    const w = await make('a4', { sections: ['timeline', 'logs'] }, source);
    let chapter = '';
    const seen: { chapter: string; text: string }[] = [];
    const original = w.text.bind(w);
    w.text = (value, x, y, size, color, role) => {
      if (value === 'Weekly Timeline' || value === '时间线 日志') chapter = value;
      seen.push({ chapter, text: value }); original(value, x, y, size, color, role);
    };
    await composeJournalPdf(w);
    expect(seen.some((entry) => entry.chapter === 'Weekly Timeline' && entry.text === '24:00')).toBe(true);
    expect(seen.some((entry) => entry.chapter === '时间线 日志' && entry.text === '完整正文只属于日志')).toBe(true);
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
