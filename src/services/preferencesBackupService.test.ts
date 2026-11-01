/** @file preferencesBackupService.test.ts
 * @updated 2026-11-01: Verifies timer concurrency preference backup and restore.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { ALLOW_CONCURRENT_TIMERS_KEY, readAllowConcurrentTimers } from '../utils/timerConcurrency';
import { preferencesBackupService, PREFERENCES_RESTORED_EVENT } from './preferencesBackupService';

describe('preferencesBackupService', () => {
  it('defaults to simultaneous timing and round-trips the disabled preference', () => {
    expect(readAllowConcurrentTimers(localStorage)).toBe(true);
    localStorage.setItem(ALLOW_CONCURRENT_TIMERS_KEY, 'false');
    const backup = preferencesBackupService.buildBackupPayload();
    expect(backup.storage[ALLOW_CONCURRENT_TIMERS_KEY]).toBe('false');
    localStorage.removeItem(ALLOW_CONCURRENT_TIMERS_KEY);
    preferencesBackupService.applyBackupPayload(backup);
    expect(readAllowConcurrentTimers(localStorage)).toBe(false);
  });
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) || null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear()
      }
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: new EventTarget()
    });
  });

  it('captures preference and Memoir filter storage without including sync credentials', () => {
    localStorage.setItem('lumos_default_archive_view', 'MEMOIR');
    localStorage.setItem('lumostime_memoir_filter_config', JSON.stringify({
      hasImage: true,
      minNoteLength: 80,
      relatedTagIds: ['tag-1'],
      relatedScopeIds: []
    }));
    localStorage.setItem('lumostime_webdav_config', 'secret');

    const payload = preferencesBackupService.buildBackupPayload();

    expect(payload.storage.lumos_default_archive_view).toBe('MEMOIR');
    expect(payload.storage.lumostime_memoir_filter_config).toContain('tag-1');
    expect(payload.storage.lumostime_webdav_config).toBeUndefined();
  });

  it('restores values and notifies mounted contexts', () => {
    let notified = false;
    window.addEventListener(PREFERENCES_RESTORED_EVENT, () => {
      notified = true;
    }, { once: true });

    preferencesBackupService.applyBackupPayload({
      version: 1,
      storage: {
        lumos_default_archive_view: 'MEMOIR',
        lumostime_memoir_filter_config: JSON.stringify({ hasImage: true })
      }
    });

    expect(localStorage.getItem('lumos_default_archive_view')).toBe('MEMOIR');
    expect(JSON.parse(localStorage.getItem('lumostime_memoir_filter_config') || '{}')).toEqual({ hasImage: true });
    expect(notified).toBe(true);
  });
});
