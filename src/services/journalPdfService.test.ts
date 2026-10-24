/**
 * @file journalPdfService.test.ts
 * @input Bundled font, real PDF service and mocked native filesystem
 * @output Android/iOS save-path, cancellation and failed-save recovery regressions
 * @updated 2026-10-23: Verifies native saves with independently loaded printed/handwritten fonts.
 * @updated 2026-10-23: Includes both facing A5 overview pages in native export counts.
 * @updated 2026-10-24: Enforces bounded bridge messages and reopens a complete 96-page PDF using an uploaded TrueType font.
 */
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { exportJournalPdf } from './journalPdfService';
import { shiftJournalDate, type JournalExportData, type JournalExportOptions } from '../utils/journalExport';
import { customFontStorageService } from './customFontStorageService';

const native = vi.hoisted(() => ({ files: new Map<string, string[]>() }));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: vi.fn(() => 'android') } }));
vi.mock('@capacitor/filesystem', () => ({ Directory: { ExternalStorage: 'EXTERNAL', Documents: 'DOCUMENTS' }, Filesystem: {
  writeFile: vi.fn(async ({ path, data }: { path: string; data: string }) => {
    if (data.length > 128 * 1024) throw new Error('Error invoking postMessage: Java exception was raised during method invocation');
    native.files.set(path, [data]); return { uri: path };
  }),
  appendFile: vi.fn(async ({ path, data }: { path: string; data: string }) => {
    if (data.length > 128 * 1024) throw new Error('Native bridge payload too large');
    native.files.get(path)!.push(data);
  }),
  rename: vi.fn(async ({ from, to }: { from: string; to: string }) => { native.files.set(to, native.files.get(from)!); native.files.delete(from); }),
  deleteFile: vi.fn(async ({ path }: { path: string }) => { native.files.delete(path); })
} }));
const data: JournalExportData = { logs: [], categories: [], todos: [], todoCategories: [], scopes: [], dailyReviews: [], weeklyReviews: [], monthlyReviews: [] };
const options: JournalExportOptions = { startDate: '2026-10-23', endDate: '2026-10-23', sections: ['timeline'], paperSize: 'a5', includeCover: false, includeEmptyDays: false };

beforeAll(async () => {
  const font = await readFile('public/fonts/LXGWWenKaiLite-Journal.ttf');
  const printed = await readFile('public/fonts/NotoSansSC-Journal.ttf');
  vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(url.includes('NotoSansSC') ? printed : font)));
  vi.stubGlobal('FileReader', class {
    result?: string;
    onload?: () => void;
    readAsDataURL(blob: Blob) { void blob.arrayBuffer().then((bytes) => { this.result = `data:application/pdf;base64,${Buffer.from(bytes).toString('base64')}`; this.onload?.(); }); }
  });
});
beforeEach(() => { vi.clearAllMocks(); native.files.clear(); vi.mocked(Capacitor.getPlatform).mockReturnValue('android'); });
afterAll(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('native journal save', () => {
  it.each([['android', 'Download/LumosTime/', 'EXTERNAL'], ['ios', 'LumosTime/', 'DOCUMENTS']])('writes a complete PDF to the %s export folder', async (platform, prefix, directory) => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue(platform);
    const result = await exportJournalPdf(data, options);
    expect(result.pageCount).toBe(3);
    const saved = vi.mocked(Filesystem.rename).mock.lastCall![0];
    expect(saved.to).toBe(`${prefix}LumosTime手账_20261023_20261023.pdf`);
    expect(saved.directory).toBe(directory);
    const bytes = Buffer.concat(native.files.get(saved.to)!.map((chunk) => Buffer.from(chunk, 'base64')));
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(result.pageCount);
    expect(vi.mocked(Filesystem.appendFile).mock.calls.length).toBeGreaterThan(1);
  });
  it('saves a 96-page uploaded-font PDF within the native bridge payload limit', async () => {
    const bytes = await readFile('public/fonts/LXGWWenKaiLite-Journal.ttf');
    const font = vi.spyOn(customFontStorageService, 'getFont').mockResolvedValue({ id: 'custom-native', displayName: '自定义手写字体', familyName: 'CustomNative', fileName: 'custom.ttf', format: 'ttf', size: bytes.length, createdAt: 0, updatedAt: 0, blob: new Blob([bytes]) });
    const startDate = '2026-01-01';
    const source = { ...data, dailyReviews: Array.from({ length: 95 }, (_, index) => ({ id: String(index), date: shiftJournalDate(startDate, index), createdAt: 0, updatedAt: 0, answers: [], summary: `第${index + 1}天，使用自定义字体。` })) };
    const progress: number[] = [];
    const result = await exportJournalPdf(source, { ...options, startDate, endDate: shiftJournalDate(startDate, 94), sections: ['daily'], parts: ['daySummary'], contentFontId: 'custom-native' }, (value) => { if (value.totalBytes) progress.push(value.writtenBytes! / value.totalBytes); });
    expect(result.pageCount).toBe(96);
    expect(font).toHaveBeenCalledWith('custom-native');
    const complete = Buffer.concat(native.files.get(result.savedPath!)!.map((chunk) => Buffer.from(chunk, 'base64')));
    expect(complete.length).toBeGreaterThan(5 * 1024 * 1024);
    expect((await PDFDocument.load(complete)).getPageCount()).toBe(96);
    expect(progress[0]).toBe(0); expect(progress.at(-1)).toBe(1);
    expect(native.files.size).toBe(1);
    font.mockRestore();
  }, 60000);
  it('does not save after cancellation and surfaces filesystem errors for a retry', async () => {
    const count = vi.mocked(Filesystem.writeFile).mock.calls.length;
    const abort = new AbortController();
    await expect(exportJournalPdf(data, options, (progress) => { if (progress.pages) abort.abort(); }, abort.signal)).rejects.toThrow();
    expect(vi.mocked(Filesystem.writeFile).mock.calls.length).toBe(count);
    vi.mocked(Filesystem.writeFile).mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(exportJournalPdf(data, options)).rejects.toThrow('storage unavailable');
    await expect(exportJournalPdf(data, options)).resolves.toMatchObject({ pageCount: 3 });
  });
});
