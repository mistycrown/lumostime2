/**
 * @file journalNativeFile.test.ts
 * @input Binary payloads and a bounded simulated native filesystem bridge
 * @output Byte-exact chunking, publication, cancellation and late-timeout cleanup regressions
 * @updated 2026-10-24: Covers Android large-message failure without replacing selected fonts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { JOURNAL_NATIVE_CHUNK_BYTES, writeJournalNativeFile } from './journalNativeFile';

const native = vi.hoisted(() => ({ files: new Map<string, Buffer[]>() }));
vi.mock('@capacitor/filesystem', () => ({ Directory: { Documents: 'DOCUMENTS' }, Filesystem: {
  writeFile: vi.fn(async ({ path, data }: { path: string; data: string }) => {
    if (data.length > 128 * 1024) throw new Error('Native bridge payload too large');
    native.files.set(path, [Buffer.from(data, 'base64')]); return { uri: path };
  }),
  appendFile: vi.fn(async ({ path, data }: { path: string; data: string }) => {
    if (data.length > 128 * 1024) throw new Error('Native bridge payload too large');
    native.files.get(path)!.push(Buffer.from(data, 'base64'));
  }),
  rename: vi.fn(async ({ from, to }: { from: string; to: string }) => { native.files.set(to, native.files.get(from)!); native.files.delete(from); }),
  deleteFile: vi.fn(async ({ path }: { path: string }) => { native.files.delete(path); })
} }));
const path = 'Download/LumosTime/journal.pdf';
const bytes = Uint8Array.from({ length: JOURNAL_NATIVE_CHUNK_BYTES * 2 + 37 }, (_, index) => index % 251).subarray(13);
beforeEach(() => { vi.clearAllMocks(); native.files.clear(); native.files.set(path, [Buffer.from('previous export')]); });
afterEach(() => vi.useRealTimers());

describe('native journal binary chunks', () => {
  it('keeps calls small, preserves every byte and publishes after all chunks complete', async () => {
    const progress: number[] = [];
    await writeJournalNativeFile(bytes, path, Directory.Documents, (written) => {
      expect(Buffer.concat(native.files.get(path)!).toString()).toBe('previous export');
      progress.push(written);
    });
    expect(vi.mocked(Filesystem.writeFile).mock.calls).toHaveLength(1);
    expect(vi.mocked(Filesystem.appendFile).mock.calls).toHaveLength(2);
    expect(Buffer.concat(native.files.get(path)!)).toEqual(Buffer.from(bytes));
    expect(progress).toEqual([0, JOURNAL_NATIVE_CHUNK_BYTES, JOURNAL_NATIVE_CHUNK_BYTES * 2, bytes.length]);
    expect(native.files.size).toBe(1);
  });
  it('cleans failed appends while preserving the previous export', async () => {
    vi.mocked(Filesystem.appendFile).mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(writeJournalNativeFile(bytes, path, Directory.Documents)).rejects.toThrow('storage unavailable');
    expect(Filesystem.rename).not.toHaveBeenCalled();
    expect(Buffer.concat(native.files.get(path)!).toString()).toBe('previous export');
    expect(native.files.size).toBe(1);
  });
  it('stops between chunks after cancellation and cleans its partial file', async () => {
    const controller = new AbortController();
    await expect(writeJournalNativeFile(bytes, path, Directory.Documents, (written) => { if (written) controller.abort(); }, controller.signal)).rejects.toThrow();
    expect(Filesystem.appendFile).not.toHaveBeenCalled();
    expect(Filesystem.rename).not.toHaveBeenCalled();
    expect(native.files.size).toBe(1);
  });
  it('times out an unanswered bridge call and cleans its late result without touching the final PDF', async () => {
    vi.useFakeTimers();
    let finish!: () => void;
    vi.mocked(Filesystem.writeFile).mockImplementationOnce(({ path: partial, data }) => new Promise((resolve) => {
      finish = () => { native.files.set(partial, [Buffer.from(data as string, 'base64')]); resolve({ uri: partial }); };
    }));
    const job = expect(writeJournalNativeFile(bytes, path, Directory.Documents)).rejects.toThrow('保存 PDF 超时');
    await vi.advanceTimersByTimeAsync(30001); await job;
    finish(); await vi.advanceTimersByTimeAsync(0);
    expect(Buffer.concat(native.files.get(path)!).toString()).toBe('previous export');
    expect(native.files.size).toBe(1);
    expect(Filesystem.rename).not.toHaveBeenCalled();
  });
});
