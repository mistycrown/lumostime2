/**
 * @file timerConcurrencyHarness.tsx
 * @input Real preferences/session providers, widget reconciliation and synthetic platform adapters
 * @output Interaction checks for all shared timer starts and screenshot checkpoints
 * @pos Test (Renderer)
 * @updated 2026-11-01: Covers concurrent defaults, exclusive starts, pending photos, native import and restore.
 */
import React, { useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsProvider, useSettings } from '../../contexts/SettingsContext';
import { SessionProvider, useSession } from '../../contexts/SessionContext';
import { PreferencesSettingsView } from '../../views/settings/PreferencesSettingsView';
import { useWidgetBridgeSync } from '../useWidgetBridgeSync';
import { beginSessionImageOperation } from '../../utils/sessionImageOperations';
import { splitLogByDays } from '../../utils/logUtils';
import { loadPersistedActiveSessions } from '../../utils/sessionPersistence';
import { preferencesBackupService } from '../../services/preferencesBackupService';
import { ALLOW_CONCURRENT_TIMERS_KEY } from '../../utils/timerConcurrency';
import { environment, native } from './timerConcurrencyAdapters';
import type { Log } from '../../types';

declare global { interface Window {
  __timerConcurrencyResult?: { passed: string[]; error?: string };
  __timerConcurrencyCapture?: string | null;
} }
const host = document.getElementById('root')!;
let root = createRoot(host);
let context: ReturnType<typeof useSession>;
let settings: ReturnType<typeof useSettings>;
let bridgeEnabled = false;
const saved: Log[] = [];
const passed: string[] = [];
const save = (logs: Log[]) => saved.push(...logs);
const Bridge = () => { useWidgetBridgeSync(); return null; };
const Host = () => {
  context = useSession();
  settings = useSettings();
  useLayoutEffect(() => context.registerAutoStopLogSaver(save), [context.registerAutoStopLogSaver]);
  return <>{bridgeEnabled && <Bridge />}<PreferencesSettingsView onBack={() => {}} onToast={() => {}} /></>;
};
const render = () => root.render(<SettingsProvider><SessionProvider splitLogByDays={splitLogByDays}><Host /></SessionProvider></SettingsProvider>);
const delay = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const until = async (condition: () => boolean) => {
  for (let i = 0; i < 100; i++) { if (condition()) return; await delay(); }
  throw new Error('Timed out waiting for timer transition');
};
const start = (id: string) => context.startActivity({ id, name: id, icon: 'R', color: '#555' }, 'study', []);
const toggle = async () => {
  host.querySelector<HTMLButtonElement>('[aria-label="允许同时计时"]')!.click();
  await delay();
};
const age = () => context.setActiveSessions((sessions) => sessions.map((session) => ({ ...session, startTime: Date.now() - 10000 })));

async function run() {
  localStorage.clear();
  render(); await delay();
  check(settings.allowConcurrentTimers, 'Existing installations must allow simultaneous timing');
  const a = start('A'); const b = start('B'); await delay();
  check(context.activeSessions.length === 2, 'Default starts must preserve both timers');
  check(start('A') === a && start('B') === b, 'Repeated activity must retain its session ID');
  await toggle();
  check(!settings.allowConcurrentTimers && context.activeSessions.length === 2, 'Disabling must not interrupt existing timers');
  age(); const c = start('C'); await delay();
  check(context.activeSessions.length === 1 && context.activeSessions[0].id === c, 'New activity must replace all previous timers');
  check(saved.length === 2 && saved.every((log) => log.duration >= 10), 'Automatic replacement must save both completed timers');
  check(loadPersistedActiveSessions().length === 1, 'Replaced timers must be removed from persisted state');
  passed.push('default parallel timing; duplicate start; disabling without interruption; exclusive replacement and persistence');

  age();
  context.setActiveSessions((sessions) => sessions.map((session) => ({ ...session, note: 'retain edits', title: 'C title', images: ['before.jpg'] })));
  const finishPhoto = beginSessionImageOperation(c);
  const beforeSwitch = Date.now(); start('D'); const e = start('E');
  check(context.isSessionPending(e), 'Deferred starts must remain discoverable to Routine state');
  check(start('E') === e, 'Pending repeated starts must be deduplicated');
  await delay(150);
  context.setActiveSessions((sessions) => sessions.map((session) => session.id === c ? { ...session, images: [...session.images!, 'after.jpg'] } : session));
  finishPhoto();
  await until(() => context.activeSessions.length === 1 && context.activeSessions[0].id === e);
  check(!context.isSessionPending(e), 'Completed switch must clear its pending state');
  const cLog = saved.find((log) => log.title === 'C title')!;
  check(cLog.id === c, 'App and native completion must use the same session-based log identity');
  check(cLog.note === 'retain edits' && cLog.images?.length === 2, 'Automatic stop must preserve pending photos and edits');
  check(cLog.endTime >= beforeSwitch && cLog.endTime < beforeSwitch + 100, 'Pending photo must not extend the stopped timer');
  check(!saved.some((log) => log.activityId === 'D'), 'Superseded pending start must not create a phantom log');
  passed.push('pending photos; rapid replacement; latest request wins; stop timestamp frozen at switch');

  age();
  context.setActiveSessions((sessions) => sessions.map((session) => ({ ...session, source: 'widget' })));
  const f = start('F'); await delay();
  check(context.activeSessions.length === 1 && context.activeSessions[0].id === f, 'App start must replace an imported widget timer');
  check(saved.some((log) => log.activityId === 'E'), 'Imported widget timer must use the same log-save callback');
  root.unmount(); root = createRoot(host); render(); await delay();
  check(!settings.allowConcurrentTimers && context.activeSessions[0].id === f, 'Preference and active timer must survive remount');
  preferencesBackupService.applyBackupPayload({ version: 1, storage: { [ALLOW_CONCURRENT_TIMERS_KEY]: 'true' } });
  await delay(); check(settings.allowConcurrentTimers, 'Backup restore must refresh the mounted preference');
  await toggle();
  passed.push('widget-to-app switch; remount; preference restore');

  age();
  context.setActiveSessions((sessions) => sessions.map((session) => ({ ...session, note: 'native switch note', title: 'native title', images: ['native.jpg'] })));
  const old = context.activeSessions[0];
  const now = Date.now();
  native.finished = [old.id];
  native.actions = [{ id: old.id, widgetType: 'timer', activityId: old.activityId, categoryId: old.categoryId,
    icon: 'R', label: 'F', color: '#555', startedAt: old.startTime, endedAt: now, createdAt: now }];
  native.states = [{ id: 'native-widget', widgetType: 'timer', activityId: 'widget', categoryId: 'study',
    icon: 'R', label: 'widget', color: '#555', startedAt: now, source: 'widget' }];
  environment.android = true; bridgeEnabled = true; render();
  await until(() => context.activeSessions[0]?.id === 'native-widget' && native.logs.length === 1);
  check(native.logs[0].note === 'native switch note' && native.logs[0].images?.[0] === 'native.jpg', 'Native replacement must retain local session metadata');
  check(!native.allowConcurrentTimers, 'Disabled timer preference must reach Android');
  native.actions = [{ id: old.id, widgetType: 'timer', activityId: old.activityId, categoryId: old.categoryId,
    icon: 'R', label: 'F', color: '#555', startedAt: old.startTime, endedAt: now - 500, createdAt: now }];
  native.notify();
  await until(() => native.logs[0].endTime === now - 500);
  check(native.logs.length === 1 && native.logs[0].title === 'native title' && native.logs[0].note === 'native switch note'
    && native.logs[0].images?.[0] === 'native.jpg', 'Replayed completion must correct time without duplicating or erasing saved edits');
  age(); const g = start('G');
  await until(() => native.calls.some((call) => call.runtimeStates.some((state) => state.id === g)));
  const latest = native.calls[native.calls.length - 1];
  check(latest.runtimeStates.length === 1 && latest.removedSessionIds?.includes('native-widget'), 'App replacement must retire the old native widget ID');
  native.states = latest.runtimeStates; native.finished.push('native-widget'); native.notify();
  await delay(); check(context.activeSessions.length === 1 && context.activeSessions[0].id === g, 'Native reconciliation must not restore retired timers');
  passed.push('native-to-app reconciliation; edited log import and replay; Android preference sync; retired ID propagation');

  host.querySelector('[aria-label="允许同时计时"]')!.scrollIntoView({ block: 'center' });
  window.__timerConcurrencyCapture = 'preferences-timer-mobile';
  await until(() => window.__timerConcurrencyCapture === null);
  window.__timerConcurrencyResult = { passed };
}
run().catch((error) => { window.__timerConcurrencyResult = { passed, error: error.stack || String(error) }; });
