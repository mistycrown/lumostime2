/**
 * @file customPresetsRendererHarness.tsx
 * @input Real React hook, browser storage and sync protocol with isolated theme adapters
 * @output Regression assertions for save/reopen, restores, stale callbacks and failures
 * @pos Test (Theme Preset Renderer)
 * @updated 2026-10-06: Exercises persistence and immediate sync protection without a cloud account.
 */
import React, { StrictMode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { CUSTOM_PRESETS_CHANGED_EVENT, useCustomPresets } from '../useCustomPresets';
import { THEME_KEYS } from '../../constants/storageKeys';
import {
  clearPendingLocalDataEdit, getLocalEditRevision, hasPendingLocalDataEdit,
  LOCAL_DATA_TIMESTAMP_UPDATED_EVENT
} from '../../utils/localDataTimestamp';
import { runSyncCycle } from '../../utils/syncProtocol';
import { APPEARANCE_RESTORED_EVENT, cleanedSnapshots, settings } from './customPresetsRendererMocks';

declare global {
  interface Window { __customPresetsTestResult?: { passed: string[]; error?: string }; }
}

const passed: string[] = [];
const check = (value: unknown, label: string) => { if (!value) throw new Error(label); };
const root = createRoot(document.getElementById('root')!);
let presets: ReturnType<typeof useCustomPresets>;
const Probe = () => {
  presets = useCustomPresets();
  return <div>
    <button onClick={() => presets.addCustomPreset('Smoke saved theme')}>Save current settings</button>
    <ul>{presets.customPresets.map((preset) => <li key={preset.id}>{preset.name}</li>)}</ul>
  </div>;
};
const mount = async () => {
  flushSync(() => root.render(<StrictMode><Probe /></StrictMode>));
  const started = Date.now();
  while (presets.isLoading) {
    if (Date.now() - started > 5000) throw new Error('Initial list did not load');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};
const unmount = () => flushSync(() => root.render(null));
const stored = () => JSON.parse(localStorage.getItem(THEME_KEYS.CUSTOM_PRESETS) || '[]');
const names = () => presets.customPresets.map((preset) => preset.name).join('|');
const clearPending = () => clearPendingLocalDataEdit(getLocalEditRevision());
let changes = 0;
let syncNotifications = 0;
let selectedAtNotification: string | null = null;
window.addEventListener(CUSTOM_PRESETS_CHANGED_EVENT, () => { changes++; });
window.addEventListener(LOCAL_DATA_TIMESTAMP_UPDATED_EVENT, () => {
  syncNotifications++;
  selectedAtNotification = localStorage.getItem(THEME_KEYS.CURRENT_PRESET);
});

const run = async () => {
  localStorage.clear();
  localStorage.setItem('navigation_icon_custom_list_v1', JSON.stringify([
    { id: 'icon', imageFilename: 'icon.png', url: 'data:image/png;base64,duplicate' }
  ]));
  await mount();
  check(!presets.isLoading, 'Initial list did not load');

  // Exercise an actual button, then leave and re-enter the mounted hook.
  flushSync(() => document.querySelector<HTMLButtonElement>('button')!.click());
  check(hasPendingLocalDataEdit(), 'Save was not marked pending immediately');
  check(syncNotifications === 1 && changes === 1, 'Save did not notify sync immediately');
  check(!localStorage.getItem(THEME_KEYS.CUSTOM_PRESETS)!.includes('data:'), 'Snapshot image URLs were not compacted');
  const original = stored()[0];
  unmount();
  await mount();
  check(names() === 'Smoke saved theme', 'Saved theme disappeared on re-entry');
  passed.push('button save, image compaction and re-entry persist the theme');

  const localPayload = () => ({ appearanceData: { version: 1, storage: {
    [THEME_KEYS.CUSTOM_PRESETS]: localStorage.getItem(THEME_KEYS.CUSTOM_PRESETS)
  } } });
  let applied = false;
  const remote = { appearanceData: { version: 1, storage: { [THEME_KEYS.CUSTOM_PRESETS]: '[]' } } };
  const result = await runSyncCycle({
    readLocal: localPayload,
    readRemote: async () => remote,
    readCheckpoint: () => null,
    legacyPending: hasPendingLocalDataEdit,
    acknowledge: () => {},
    upload: async (snapshot) => snapshot,
    prepareRestore: async (snapshot) => snapshot,
    applyRestore: async () => { applied = true; },
    backupRemote: async () => {}
  });
  check(result.direction === 'conflict' && !applied, 'First sync would overwrite the freshly saved theme');
  passed.push('first sync cannot silently replace a fresh save before an audit');

  clearPending();
  const revision = getLocalEditRevision();
  const restored = { ...original, id: 'restored', name: 'Restored theme' };
  flushSync(() => {
    localStorage.setItem(THEME_KEYS.CUSTOM_PRESETS, JSON.stringify([restored]));
    window.dispatchEvent(new Event(APPEARANCE_RESTORED_EVENT));
  });
  check(names() === 'Restored theme', 'Appearance restore did not refresh the open list');
  check(!hasPendingLocalDataEdit() && getLocalEditRevision() === revision, 'Restore incorrectly marked a local edit');
  passed.push('restore refreshes the list without creating an upload');

  const staleAdd = presets.addCustomPreset;
  const newest = { ...original, id: 'newest', name: 'Newest restored theme' };
  flushSync(() => {
    localStorage.setItem(THEME_KEYS.CUSTOM_PRESETS, JSON.stringify([newest]));
    window.dispatchEvent(new Event(APPEARANCE_RESTORED_EVENT));
    check(staleAdd('Newest restored theme').error === 'DUPLICATE_NAME', 'Duplicate check used a stale list');
    check(staleAdd('After restore').success, 'Save after restore failed');
  });
  check(names() === 'Newest restored theme|After restore', 'Stale save overwrote restored themes');
  passed.push('same-frame restore and save preserve restored data and reject duplicate names');

  const staleDelete = presets.deleteCustomPreset;
  const extra = { ...original, id: 'extra', name: 'Other device theme' };
  flushSync(() => {
    localStorage.setItem(THEME_KEYS.CUSTOM_PRESETS, JSON.stringify([...stored(), extra]));
    localStorage.setItem(THEME_KEYS.CURRENT_PRESET, newest.id);
    clearPending();
    check(staleDelete(newest.id), 'Delete after external restore failed');
  });
  check(names() === 'After restore|Other device theme', 'Delete overwrote a newly restored theme');
  check(hasPendingLocalDataEdit() && selectedAtNotification === null, 'Delete notified sync before clearing selection');
  check(cleanedSnapshots.length === 1, 'Deleted theme snapshot cleanup did not run');
  passed.push('stale deletion preserves other themes and syncs the final selection');

  const repeatedAdd = presets.addCustomPreset;
  const originalNow = Date.now;
  const sameMillisecond = Date.now();
  Date.now = () => sameMillisecond;
  try {
    flushSync(() => {
      check(repeatedAdd('Quick first').success, 'First rapid save failed');
      check(repeatedAdd('Quick second').success, 'Second rapid save failed');
    });
  } finally {
    Date.now = originalNow;
  }
  check(stored().length === 4 && new Set(stored().map((preset: { id: string }) => preset.id)).size === 4,
    'Rapid saves lost a theme or reused an ID');
  passed.push('rapid callbacks preserve both saves with distinct IDs');

  clearPending();
  const beforeFailure = localStorage.getItem(THEME_KEYS.CUSTOM_PRESETS);
  const beforeChanges = changes;
  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    if (key === THEME_KEYS.CUSTOM_PRESETS) throw new DOMException('Test quota failure', 'QuotaExceededError');
    return originalSetItem.call(this, key, value);
  };
  try {
    flushSync(() => {
      const failed = presets.addCustomPreset('Must not appear');
      check(!failed.success && failed.error === 'STORAGE_ERROR', 'Quota failure reported success');
      check(!presets.deleteCustomPreset(stored()[0].id), 'Quota failure reported successful deletion');
    });
  } finally {
    Storage.prototype.setItem = originalSetItem;
  }
  check(localStorage.getItem(THEME_KEYS.CUSTOM_PRESETS) === beforeFailure && changes === beforeChanges,
    'Failed writes changed storage or broadcast success');
  check(!hasPendingLocalDataEdit(), 'Failed writes created a pending edit');
  unmount();
  await mount();
  check(presets.customPresets.length === 4, 'Failed writes changed the list on re-entry');
  passed.push('quota failures retain existing data and report failure on save/delete');

  settings.uiIconTheme = '';
  await mount();
  check(presets.addCustomPreset('Invalid data').error === 'INVALID_DATA', 'Invalid preset was persisted');
  check(localStorage.getItem(THEME_KEYS.CUSTOM_PRESETS) === beforeFailure, 'Invalid data altered storage');
  settings.uiIconTheme = 'default';
  await mount();
  passed.push('invalid new data is rejected before it can disappear on re-entry');

  flushSync(() => {
    localStorage.setItem(THEME_KEYS.CUSTOM_PRESETS, JSON.stringify([extra]));
    window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEYS.CUSTOM_PRESETS, storageArea: localStorage }));
  });
  check(names() === 'Other device theme', 'Storage change did not refresh the list');
  flushSync(() => {
    localStorage.removeItem(THEME_KEYS.CUSTOM_PRESETS);
    window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage }));
  });
  check(presets.customPresets.length === 0, 'Cross-window clearing did not refresh the list');
  passed.push('cross-window writes and clearing refresh the list');

  unmount();
  let readsAfterExit = 0;
  const originalGetItem = Storage.prototype.getItem;
  Storage.prototype.getItem = function (key) {
    if (key === THEME_KEYS.CUSTOM_PRESETS) readsAfterExit++;
    return originalGetItem.call(this, key);
  };
  try {
    window.dispatchEvent(new Event(APPEARANCE_RESTORED_EVENT));
    window.dispatchEvent(new Event(CUSTOM_PRESETS_CHANGED_EVENT));
    window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage }));
  } finally {
    Storage.prototype.getItem = originalGetItem;
  }
  check(readsAfterExit === 0, 'Leaving the page leaked preset listeners');
  passed.push('leaving the page removes all refresh listeners');

  window.__customPresetsTestResult = { passed };
};
void run().catch((error) => {
  window.__customPresetsTestResult = { passed, error: error instanceof Error ? error.stack : String(error) };
});
