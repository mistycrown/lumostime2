/**
 * @file journalPdfService.test.ts
 * @input Bundled font, real PDF service and mocked native filesystem
 * @output Android/iOS save-path, cancellation and failed-save recovery regressions
 * @updated 2026-10-23: Verifies native saves with independently loaded printed/handwritten fonts.
 * @updated 2026-10-23: Includes both facing A5 overview pages in native export counts.
 */
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { exportJournalPdf } from './journalPdfService';
import type { JournalExportData, JournalExportOptions } from '../utils/journalExport';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: vi.fn(() => 'android') } }));
vi.mock('@capacitor/filesystem', () => ({ Directory: { ExternalStorage: 'EXTERNAL', Documents: 'DOCUMENTS' }, Filesystem: { writeFile: vi.fn(async () => ({})) } }));
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
afterAll(() => vi.unstubAllGlobals());

describe('native journal save', () => {
  it.each([['android', 'Download/LumosTime/', 'EXTERNAL'], ['ios', 'LumosTime/', 'DOCUMENTS']])('writes a complete PDF to the %s export folder', async (platform, prefix, directory) => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue(platform);
    const result = await exportJournalPdf(data, options);
    expect(result.pageCount).toBe(3);
    const saved = vi.mocked(Filesystem.writeFile).mock.lastCall![0];
    expect(saved.path).toBe(`${prefix}LumosTime手账_20261023_20261023.pdf`);
    expect(saved.directory).toBe(directory);
    expect(Buffer.from(saved.data as string, 'base64').subarray(0, 5).toString()).toBe('%PDF-');
  });
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
