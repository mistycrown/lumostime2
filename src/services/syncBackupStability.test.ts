/**
 * @file syncBackupStability.test.ts
 * @input Fresh and legacy AI memory/Dream storage under advancing clocks
 * @output Stable backup-read regression checks without hiding real user timestamps
 * @pos Test (Cloud Sync)
 */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
vi.mock('./aiService', () => ({ aiService: {} }));
vi.mock('../utils/aiBackupChange', () => ({ notifyAIBackupDataChanged: vi.fn() }));
import { assistantMemoryService } from './assistantMemoryService';
import { dreamService } from './dreamService';
import { notifyAIBackupDataChanged } from '../utils/aiBackupChange';

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key)
  });
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-02T00:00:00Z'));
  vi.clearAllMocks();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

test('fresh memory and Dream snapshots stay identical across later reads', () => {
  const memory = assistantMemoryService.getMemory();
  const dream = dreamService.getState();
  vi.setSystemTime(new Date('2026-10-03T00:00:00Z'));
  expect(assistantMemoryService.getMemory()).toEqual(memory);
  expect(dreamService.getState()).toEqual(dream);
  expect(notifyAIBackupDataChanged).not.toHaveBeenCalled();
  expect(JSON.parse(localStorage.getItem(dreamService.getStorageKey())!)).toEqual(dream);
});

test('legacy data missing timestamps normalizes once while retaining its content', () => {
  localStorage.setItem(assistantMemoryService.getStorageKey(), JSON.stringify({ profileMemory: ['keep me'] }));
  localStorage.setItem(dreamService.getStorageKey(), JSON.stringify({ topics: [], entries: [] }));
  const memory = assistantMemoryService.getMemory();
  const dream = dreamService.getState();
  vi.setSystemTime(new Date('2026-10-04T00:00:00Z'));
  expect(assistantMemoryService.getMemory()).toEqual(memory);
  expect(dreamService.getState()).toEqual(dream);
  expect(memory.profileMemory).toEqual(['keep me']);
});

test('real writes still advance timestamps and notify synchronization', () => {
  const memory = assistantMemoryService.getMemory();
  vi.setSystemTime(new Date('2026-10-05T00:00:00Z'));
  const saved = assistantMemoryService.saveMemory({ ...memory, profileMemory: ['new entry'] });
  expect(saved.updatedAt).not.toEqual(memory.updatedAt);
  expect(notifyAIBackupDataChanged).toHaveBeenCalled();
});
