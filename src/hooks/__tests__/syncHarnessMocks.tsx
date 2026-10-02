/**
 * @file syncHarnessMocks.tsx
 * @input Renderer integration scenarios and in-memory cloud objects
 * @output Observable React contexts and isolated cloud/service adapters
 * @pos Test Support (Cloud Sync)
 */
import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
export const state: Record<string, any> = {};
export const update = (area: string, changes: Record<string, any>) => {
  state[area] = { ...state[area], ...changes };
  listeners.forEach(listener => listener());
};
const area = (name: string, initial: Record<string, any>) => {
  const setters = Object.fromEntries(Object.keys(initial).map(key => [
    'set' + key[0].toUpperCase() + key.slice(1),
    (value: any) => update(name, { [key]: typeof value === 'function' ? value(state[name][key]) : value })
  ]));
  state[name] = { ...initial, ...setters };
  return () => useSyncExternalStore(subscribe, () => state[name]);
};
export const useData = area('data', { logs: [], todos: [], todoCategories: [{ id: 'todo-category', name: 'Test' }], collections: [], collectionEntries: [] });
export const useCategoryScope = area('category', { categories: [{ id: 'category', name: 'Test', activities: [] }], scopes: [], goals: [], majorGoals: [] });
export const useReview = area('review', {
  reviewTemplates: [], checkTemplates: [], dailyReviews: [], weeklyReviews: [], monthlyReviews: [], onThisDayEntries: []
});
export const useSettings = area('settings', {
  autoLinkRules: [], customNarrativeTemplates: [], userPersonalInfo: '', customStickerSets: [], customStickers: [],
  filters: [], memoirFilterConfig: {}, isRestoring: { current: false }, isSyncing: false, manualSyncMode: false,
  updateLastSyncTime: () => {}
});
export const useNavigation = area('navigation', { currentView: 'TIMELINE', isSettingsOpen: false });
export const useAchievement = () => ({
  buildBackupPayload: () => ({ exportedAt: new Date().toISOString(), rules: [] }),
  applyBackupPayload: () => {}
});
export const toasts: any[] = [];
export const useToast = () => ({ addToast: (...args: any[]) => toasts.push(args) });
export const cloud = {
  files: new Map<string, any>(), uploads: [] as string[], reads: 0,
  failReads: false,
  uploadGate: null as null | (() => Promise<void>),
  backupGate: null as null | (() => Promise<void>)
};
const clone = (value: any) => JSON.parse(JSON.stringify(value));
export const webdavService = {
  getConfig: () => ({ url: 'https://test.invalid/dav', username: 'test', password: 'test-only' }),
  async downloadData(filename = 'lumostime_backup.json') {
    cloud.reads++;
    if (cloud.failReads) throw { status: 503 };
    if (!cloud.files.has(filename)) throw { status: 404 };
    return clone(cloud.files.get(filename));
  },
  async uploadData(data: any, filename = 'lumostime_backup.json') {
    if (filename === 'lumostime_backup.json') await cloud.uploadGate?.();
    else await cloud.backupGate?.();
    cloud.uploads.push(filename);
    cloud.files.set(filename, clone(data));
    return true;
  },
  async downloadImageList() { return { images: [] }; },
  async uploadImageList() { return true; },
  async getDirectoryContents() { return []; }
};
export const s3Service = { getConfig: () => null };
export const compatibleS3Service = { getConfig: () => null };
export const imageService = {
  buildReferencedImagesList: () => [], updateReferencedImagesList: () => {}
};
export const syncService = {};
export const aiChatStorageService = { initialize: async () => {} };
export const backupRead = { notifyOnRead: false };
export const assistantBackupService = {
  buildBackupPayload: () => {
    if (backupRead.notifyOnRead) window.dispatchEvent(new Event('lumostime:local-data-timestamp-updated'));
    return { exportedAt: new Date().toISOString(), chat: {} };
  },
  applyBackupPayload: async () => {}
};
export const appearanceBackupService = {
  buildBackupPayload: () => ({ storage: { theme: localStorage.getItem('test-theme') } }),
  applyBackupPayload: (data: any) => {
    if (data.storage?.theme) localStorage.setItem('test-theme', data.storage.theme);
    window.dispatchEvent(new Event('color-scheme-changed'));
  },
  getReferencedImageFilenames: () => []
};
export const preferencesBackupService = { buildBackupPayload: () => ({}), applyBackupPayload: () => {} };
export const PREFERENCES_CHANGED_EVENT = 'preferences-test';
export const MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT = 'mood-test';
export const WIDGET_TEMPLATES_UPDATED_EVENT = 'widget-test';
export const loadWidgetTemplatesFromStorage = () => [];
export const saveWidgetTemplatesToStorage = () => {};
export const CUSTOM_COLOR_GROUP_UPDATED_EVENT = 'colors-test';
export const customColorGroupService = { getGroup: () => [], saveGroup: () => {} };
export const loadSceneGroupStateFromStorage = () => ({ groups: [] });
export const getActiveSceneGroup = () => null;
export const buildSceneGroupStateFromLegacySlots = () => ({ groups: [] });
export const saveSceneGroupStateToStorage = () => {};
export const reportDiagnostic = () => 'test';
export const reportException = () => 'test';
export const withErrorReference = (message: string) => message;
export const lifecycle = { callback: null as any, removed: false };
export const App = {
  async addListener(_event: string, callback: any) {
    lifecycle.callback = callback;
    return { remove: async () => { lifecycle.removed = true; } };
  }
};
export const Capacitor = { isNativePlatform: () => false };
// Production timings are independently tested with fake timers in syncScheduler.test.ts.
export const SYNC_CONFIG = {
  AUTO_SYNC_DEBOUNCE_MS: 30, AUTO_SYNC_MAX_WAIT_MS: 150, RESUME_SYNC_COOLDOWN_MS: 100,
  PENDING_SYNC_RETRY_DELAY_MS: 30, MAX_RETRY_DELAY_MS: 120, LOCAL_AUDIT_INTERVAL_MS: 200
};
