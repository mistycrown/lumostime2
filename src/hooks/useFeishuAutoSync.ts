/**
 * @file useFeishuAutoSync.ts
 * @input Root application readiness and committed-data/lifecycle events.
 * @output Foreground-only debounced synchronization and bounded retry timers.
 * @pos Global app hook; never mounted separately by the settings view or desktop widgets.
 */
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { feishuAutoSyncService } from '../services/feishuAutoSyncService';
import { feishuAutoSyncStore, FEISHU_AUTO_CHANGED_EVENT, FEISHU_DATA_SAVED_EVENT, readFeishuIgnoredCategories } from '../services/feishuAutoSyncStore';

export function useFeishuAutoSync(ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    let stopped = false;
    let active = true;
    let executing = false;
    let dirty = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const visible = () => active && document.visibilityState !== 'hidden' && navigator.onLine !== false;
    const schedule = (delay = 2000) => {
      if (stopped || !visible()) return;
      clearTimeout(timer);
      timer = setTimeout(() => void execute(), Math.max(2000, delay));
    };
    const execute = async () => {
      if (stopped || !visible()) return;
      if (executing) { dirty = true; return; }
      executing = true;
      dirty = false;
      try {
        await feishuAutoSyncService.run();
        const state = await feishuAutoSyncStore.read();
        const account = state.accounts.find((item) => item.accountId === state.activeAccountId);
        const ignored = readFeishuIgnoredCategories();
        const tasks = account?.enabled ? account.tasks.filter((task) => !task.blocked
          && ![...task.categoryIds, ...(account.references.find((item) => item.id === task.id)?.categoryIds || [])].some((id) => ignored.includes(id))) : [];
        if (tasks.length) schedule(Math.min(...tasks.map((task) => task.nextRetryAt)) - Date.now());
      } catch (error) {
        console.error('[FeishuAutoSync] Unable to load or save queue', error);
        schedule(30000);
      } finally {
        executing = false;
        if (dirty) schedule();
      }
    };
    const wake = () => {
      if (executing) dirty = true;
      else schedule();
    };
    const resume = () => {
      if (!visible() || stopped) return;
      void feishuAutoSyncService.refreshConnection().catch(() => undefined).finally(wake);
    };
    const visibility = () => {
      feishuAutoSyncService.setForeground(visible());
      if (visible()) resume(); else clearTimeout(timer);
    };
    window.addEventListener(FEISHU_DATA_SAVED_EVENT, wake);
    window.addEventListener(FEISHU_AUTO_CHANGED_EVENT, wake);
    window.addEventListener('lumostime:feishu-connection-changed', resume);
    window.addEventListener('online', resume);
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', visibility);
    const listener = Capacitor.isNativePlatform() ? App.addListener('appStateChange', ({ isActive }) => {
      active = isActive;
      visibility();
    }) : undefined;
    visibility();
    return () => {
      stopped = true;
      feishuAutoSyncService.setForeground(false);
      clearTimeout(timer);
      window.removeEventListener(FEISHU_DATA_SAVED_EVENT, wake);
      window.removeEventListener(FEISHU_AUTO_CHANGED_EVENT, wake);
      window.removeEventListener('lumostime:feishu-connection-changed', resume);
      window.removeEventListener('online', resume);
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', visibility);
      void listener?.then((handle) => handle.remove());
    };
  }, [ready]);
}
