/**
 * @file dailyBackupScheduler.ts
 * @input Local daily time, destination-specific storage, foreground state and upload callback
 * @output Persisted daily deadlines and serialized foreground catch-up backups
 * @pos Utility (Cloud Backup)
 * @updated 2026-10-07: Adds daily backups with restart recovery and bounded foreground retries.
 */
import type { SyncAttempt } from './syncScheduler';

export const DAILY_BACKUP_ENABLED_KEY = 'lumostime_daily_backup_enabled';
export const DAILY_BACKUP_TIME_KEY = 'lumostime_daily_backup_time';
export const DEFAULT_DAILY_BACKUP_TIME = '22:00';
export const DAILY_BACKUP_STATE_PREFIX = 'lumostime_daily_backup_state:';

export const normalizeDailyBackupTime = (value: string | null): string => (
  value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : DEFAULT_DAILY_BACKUP_TIME
);

export const getNextDailyBackupAt = (time: string, now: number): number => {
  const [hours, minutes] = normalizeDailyBackupTime(time).split(':').map(Number);
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  if (next.getTime() <= now) next.setDate(next.getDate() + 1);
  return next.getTime();
};

interface DailyBackupState {
  time: string;
  nextDueAt: number;
  pendingSince: number | null;
}

export const createDailyBackupScheduler = (options: {
  time: string;
  storageKey: string;
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  isForeground: () => boolean;
  run: () => Promise<SyncAttempt>;
  retryMs?: number;
  maxRetryMs?: number;
}) => {
  const time = normalizeDailyBackupTime(options.time);
  let state: DailyBackupState = { time, nextDueAt: getNextDailyBackupAt(time, Date.now()), pendingSince: null };
  try {
    const saved = JSON.parse(options.storage.getItem(options.storageKey) || 'null');
    if (saved && Number.isFinite(saved.nextDueAt) && saved.nextDueAt > 0
      && (saved.pendingSince === null || (Number.isFinite(saved.pendingSince) && saved.pendingSince > 0))) {
      state = {
        time,
        nextDueAt: saved.time === time ? saved.nextDueAt : state.nextDueAt,
        pendingSince: saved.pendingSince ?? (saved.nextDueAt <= Date.now() ? saved.nextDueAt : null)
      };
    }
  } catch { /* Invalid saved state starts with a fresh daily deadline. */ }

  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let running = false;
  let retryAt = 0;
  let retryDelay = options.retryMs ?? 5000;
  const persist = () => options.storage.setItem(options.storageKey, JSON.stringify(state));
  const arm = () => {
    if (timer) clearTimeout(timer);
    if (disposed || running) return;
    // Bounded wakeups notice clock changes and deadlines crossed while timers were throttled.
    const dueAt = state.pendingSince !== null ? (retryAt || Date.now() + 60_000) : state.nextDueAt;
    timer = setTimeout(() => void check(), Math.min(60_000, Math.max(0, dueAt - Date.now())));
  };
  const check = async (urgent = false) => {
    if (disposed || running) return;
    const now = Date.now();
    if (state.nextDueAt <= now && state.pendingSince === null) {
      state.pendingSince = state.nextDueAt;
      persist();
    }
    if (state.pendingSince === null || !options.isForeground() || (!urgent && now < retryAt)) {
      if (!options.isForeground()) retryAt = 0;
      arm();
      return;
    }
    running = true;
    if (timer) clearTimeout(timer);
    let outcome: SyncAttempt;
    try { outcome = await options.run(); }
    catch { outcome = 'retry'; }
    running = false;
    if (disposed) return;
    if (outcome === 'success') {
      state = { time, nextDueAt: getNextDailyBackupAt(time, Date.now()), pendingSince: null };
      retryAt = 0;
      retryDelay = options.retryMs ?? 5000;
      persist();
    } else {
      retryAt = Date.now() + retryDelay;
      retryDelay = Math.min(retryDelay * 2, options.maxRetryMs ?? 300_000);
    }
    arm();
  };

  persist();
  void check();
  return {
    check: () => void check(true),
    dispose() {
      disposed = true;
      if (timer) clearTimeout(timer);
    }
  };
};
