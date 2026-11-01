/**
 * @file timerConcurrencyAdapters.tsx
 * @input Synthetic native runtime snapshots and isolated data contexts
 * @output Platform adapters for real timer/settings/widget-sync renderer checks
 * @pos Test Support
 * @updated 2026-11-01: Simulates native completion delivery without a phone or user data.
 */
import { useState } from 'react';
import type { Log } from '../../types';
import type { WidgetBridgePendingAction, WidgetBridgeRuntimeState } from '../../plugins/WidgetBridgePlugin';

export const environment = { android: false };
export const Capacitor = {
  getPlatform: () => environment.android ? 'android' : 'web',
  isNativePlatform: () => environment.android,
  convertFileSrc: (value: string) => value
};
export const registerPlugin = () => new Proxy({}, { get: () => async () => ({ remove: async () => {} }) });
export class WebPlugin {}
export const App = { addListener: async () => ({ remove: async () => {} }) };
const empty: any[] = [];
export const useCategoryScope = () => ({ categories: empty, scopes: empty });
export const native = {
  actions: [] as WidgetBridgePendingAction[], states: [] as WidgetBridgeRuntimeState[], finished: [] as string[],
  calls: [] as Array<{ runtimeStates: WidgetBridgeRuntimeState[]; removedSessionIds?: string[] }>,
  allowConcurrentTimers: true, notify: () => {}, logs: [] as Log[]
};
export const useData = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [todos, setTodos] = useState(empty);
  native.logs = logs;
  return { logs, todos, setLogs, setTodos };
};
export const useReview = () => {
  const [dailyReviews, setDailyReviews] = useState(empty);
  return { dailyReviews, setDailyReviews, checkTemplates: empty, reviewTemplates: empty };
};
const bridge = new Proxy({
  getTemplates: async () => ({ templates: [] }),
  getRuntimeState: async () => ({ runtimeStates: native.states, runtimeState: null, finishedSessionIds: native.finished }),
  getPendingActions: async () => ({ actions: native.actions }),
  getPendingDailyActions: async () => ({ actions: [] }),
  getPendingTodoPinActions: async () => ({ actions: [] }),
  clearPendingActions: async ({ ids }: { ids: string[] }) => { native.actions = native.actions.filter((action) => !ids.includes(action.id)); },
  syncRuntimeState: async (value: typeof native.calls[number]) => { native.calls.push(value); },
  syncTimerPreferences: async ({ allowConcurrentTimers }: { allowConcurrentTimers: boolean }) => { native.allowConcurrentTimers = allowConcurrentTimers; },
  addListener: async (_: string, listener: () => void) => {
    native.notify = listener;
    return { remove: async () => { native.notify = () => {}; } };
  }
}, { get: (target, key) => key in target ? target[key as keyof typeof target] : async () => {} });
export default bridge;
