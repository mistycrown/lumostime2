/**
 * @file syncRendererHarness.tsx
 * @input Real React hook renders with isolated contexts and cloud adapter
 * @output Machine-readable integration results for the Electron test runner
 * @pos Test (Cloud Sync Renderer)
 * @updated 2026-10-04: Verifies modern navigation events schedule appearance uploads.
 * @updated 2026-10-04: Verifies appearance restoration preserves synchronized sticker metadata.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { useSyncManager } from '../useSyncManager';
import { backupRead, cloud, lifecycle, state, update } from './syncHarnessMocks';
import { hasPendingLocalDataEdit } from '../../utils/localDataTimestamp';

declare global {
  interface Window { __syncTestResult?: { passed: string[]; error?: string }; }
}
const passed: string[] = [];
let manager: ReturnType<typeof useSyncManager>;
const Probe = () => {
  manager = useSyncManager();
  return <div>{manager.isApplyingCloud ? 'applying' : 'ready'}</div>;
};
const root = createRoot(document.getElementById('root')!);
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const until = async (predicate: () => boolean, label: string) => {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > 5000) throw new Error('Timeout: ' + label);
    await delay(10);
  }
};
const main = () => cloud.files.get('lumostime_backup.json');
const uploads = () => cloud.uploads.filter(name => name === 'lumostime_backup.json').length;
const edit = (text: string) => update('data', { logs: [{ id: 'log-1', startTime: 1, endTime: 2, note: text }] });
const waitIdle = () => until(() => !state.settings.isSyncing, 'idle');

async function run() {
  root.render(<Probe />);
  await until(() => !!main() && !state.settings.isSyncing, 'startup upload');
  check(uploads() === 1, 'startup should upload once');
  await delay(250);
  check(uploads() === 1, 'generated export dates must not cause uploads');
  passed.push('startup and no-op export metadata');

  backupRead.notifyOnRead = true;
  window.dispatchEvent(new Event('color-scheme-changed'));
  backupRead.notifyOnRead = false;
  check(uploads() === 1, 'nested data notifications should not cause recursive edits');
  passed.push('snapshot tracking ignores reentrant notifications');

  edit('first');
  await until(() => main().logs[0]?.note === 'first' && !state.settings.isSyncing, 'first edit');
  localStorage.setItem('test-theme', 'new-theme');
  window.dispatchEvent(new Event('color-scheme-changed'));
  await until(() => main().appearanceData.storage.theme === 'new-theme' && !state.settings.isSyncing, 'appearance');
  check(main().logs[0].note === 'first', 'long-lived appearance listener uploaded old logs');
  passed.push('long-lived callbacks read latest React data');

  for (const event of ['navigationBackgroundChange', 'navigationBackgroundModeChange', 'navigationTransparencyChange']) {
    localStorage.setItem('test-theme', event);
    window.dispatchEvent(new Event(event));
    await until(() => main().appearanceData.storage.theme === event && !state.settings.isSyncing, event);
  }
  passed.push('modern navigation appearance events trigger automatic uploads');

  update('category', { majorGoals: [{ id: 'goal-1', title: 'new goal' }] });
  await until(() => main().majorGoals.length === 1 && !state.settings.isSyncing, 'major goals');
  passed.push('major-goal-only edits trigger upload without DOM input');

  let release!: () => void;
  let entered = false;
  cloud.uploadGate = () => new Promise<void>(resolve => { entered = true; release = resolve; });
  edit('during-upload-a');
  await until(() => entered, 'upload gate');
  edit('during-upload-b');
  await delay(20);
  check(hasPendingLocalDataEdit(), 'edit should remain pending');
  cloud.uploadGate = null;
  release();
  await until(() => main().logs[0].note === 'during-upload-b' && !state.settings.isSyncing, 'follow-up upload');
  check(!hasPendingLocalDataEdit(), 'latest edit should now be acknowledged');
  passed.push('edits during transfer are uploaded in the next batch');

  cloud.files.set('lumostime_backup.json', { ...main(), logs: [{ id: 'cloud', startTime: 1, endTime: 2, note: 'remote-new' }], syncRevision: 'remote-new' });
  entered = false;
  cloud.backupGate = () => new Promise<void>(resolve => { entered = true; release = resolve; });
  window.dispatchEvent(new Event('online'));
  await until(() => entered, 'restore backup gate');
  edit('keep-local-edit');
  await delay(20);
  cloud.backupGate = null;
  release();
  await until(() => manager.syncConflictModalState.isOpen, 'concurrent restore conflict');
  check(state.data.logs[0].note === 'keep-local-edit', 'restore overwrote a new local edit');
  passed.push('restore aborts when local data changes during preparation');

  const restoredStickerSets = [{ id: 'theme:unused:sticker-set-garden', name: 'Garden', stickerIds: ['flower'], status: 'active', createdAt: 1, updatedAt: 1 }];
  const restoredStickers = [{ id: 'flower', setId: restoredStickerSets[0].id, imageFilename: 'flower.webp', sortOrder: 0, status: 'active', createdAt: 1, updatedAt: 1 }];
  cloud.files.set('lumostime_backup.json', {
    ...main(), logs: [{ id: 'cloud', startTime: 1, endTime: 2, note: 'remote-newer' }], syncRevision: 'remote-newer',
    customStickerSets: restoredStickerSets, customStickers: restoredStickers
  });
  await manager.handleConflictDownload();
  await until(() => manager.syncConflictModalState.isOpen, 'rechecked conflict');
  check(state.data.logs[0].note === 'keep-local-edit', 'stale conflict choice was applied');
  await waitIdle();
  await manager.handleConflictDownload();
  await until(() => state.data.logs[0].note === 'remote-newer' && !state.settings.isSyncing, 'restore committed');
  check(JSON.stringify(state.settings.customStickerSets) === JSON.stringify(restoredStickerSets), 'appearance restore overwrote synchronized sticker sets');
  check(JSON.stringify(state.settings.customStickers) === JSON.stringify(restoredStickers), 'appearance restore overwrote synchronized sticker images');
  passed.push('appearance restoration preserves synchronized sticker metadata');
  const before = uploads();
  await delay(250);
  check(uploads() === before, 'restored data was uploaded again');
  check(!manager.isApplyingCloud && !state.settings.isRestoring.current, 'restore lock leaked');
  passed.push('conflict revalidation and React restore completion without echo uploads');

  update('settings', { manualSyncMode: true });
  await delay(30);
  edit('manual edit');
  await delay(250);
  check(uploads() === before, 'manual mode unexpectedly uploaded');
  await manager.handleManualUpload();
  check(main().logs[0].note === 'manual edit', 'manual upload missed latest state');
  passed.push('manual and automatic transfers use the same coordinator');

  cloud.failReads = true;
  update('settings', { manualSyncMode: false });
  await delay(50);
  edit('offline edit');
  const offlineUploads = uploads();
  await delay(150);
  check(uploads() === offlineUploads, 'network failure was treated as missing cloud');
  cloud.failReads = false;
  window.dispatchEvent(new Event('online'));
  await until(() => main().logs[0].note === 'offline edit' && !state.settings.isSyncing, 'reconnect');
  passed.push('network failure preserves edits and reconnect retries');

  root.unmount();
  await delay(20);
  check(lifecycle.removed, 'native listener leaked after unmount');
  passed.push('listener and queue cleanup');
  window.__syncTestResult = { passed };
}

run().catch(error => {
  root.unmount();
  window.__syncTestResult = { passed, error: error?.stack || String(error) };
});
