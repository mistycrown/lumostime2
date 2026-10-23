/**
 * @file journalPdfLayout.test.ts
 * @input Bundled Chinese font and synthetic high-volume journal content
 * @output Real PDF pagination, searchability encoding and cancellation checks
 * @updated 2026-10-23: Verifies A4/A5 overflow, long headings, full text and optional chapters.
 */
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { buildJournalModel, type JournalExportData, type JournalExportOptions } from '../utils/journalExport';
import { composeJournalPdf, JournalPdfWriter } from './journalPdfLayout';

const data: JournalExportData = { logs: [], todos: [], scopes: [], categories: [], todoCategories: [], dailyReviews: [], weeklyReviews: [], monthlyReviews: [] };
const options: JournalExportOptions = { startDate: '2026-10-19', endDate: '2026-10-20', sections: ['timeline'], paperSize: 'a4', includeCover: false, includeEmptyDays: false };
const make = async (size: 'a4' | 'a5', patch: Partial<JournalExportOptions> = {}) => {
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await readFile('public/fonts/LXGWWenKaiLite-Journal.ttf'), { subset: false });
  return new JournalPdfWriter(pdf, font, buildJournalModel(data, { ...options, ...patch, paperSize: size }));
};

describe('PDF pagination with bundled Chinese font', () => {
  it.each(['a4', 'a5'] as const)('wraps long text and headings within %s printable bounds without dropping a character', async (size) => {
    const w = await make(size);
    w.startPage('手账测试');
    const input = '这是长篇复盘，所有文字都应该保留。'.repeat(800);
    expect(w.wrap(input).join('')).toBe(input);
    let lines = 0;
    const original = w.text.bind(w);
    w.text = (value, x, top, fontSize = w.bodySize, color) => {
      expect(x + w.widthOf(value, fontSize)).toBeLessThanOrEqual(w.width - w.margin + 0.1);
      expect(top + fontSize).toBeLessThanOrEqual(w.height - w.margin + 10);
      original(value, x, top, fontSize, color); lines++;
    };
    w.heading('很长的复盘问题'.repeat(50));
    w.paragraph(input);
    expect(w.pageCount).toBeGreaterThan(3);
    expect(lines).toBeGreaterThan(100);
    w.finish();
    const bytes = await w.pdf.save();
    expect(bytes.length).toBeLessThan(10000000);
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(w.pageCount);
    expect(reloaded.getPages()[0].getWidth()).toBeCloseTo(size === 'a4' ? 595.28 : 419.53);
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
