/**
 * @file preferencesBackupService.ts
 * @input Persisted user preference values and Memoir filter configuration
 * @output Versioned preference backup payloads and restore/change events
 * @pos Service (Backup and Sync)
 * @description Keeps user-facing preference state separate from appearance data while allowing cloud restore to rehydrate mounted contexts.
 */

export const PREFERENCES_RESTORED_EVENT = 'lumostime:preferences-restored';
export const PREFERENCES_CHANGED_EVENT = 'lumostime:preferences-changed';

const PREFERENCE_STORAGE_KEYS = [
  'lumos_min_idle_time',
  'lumos_default_view',
  'lumos_default_archive_view',
  'lumos_default_index_view',
  'lumos_default_record_view',
  'lumostime_privacy_mode',
  'lumostime_navigation_module_visibility',
  'lumostime_immersive_timer_default_orientation',
  'lumostime_autoApplyAutoLinkRules',
  'lumostime_autoApplyTodoLink',
  'lumostime_auto_focus_note',
  'lumostime_auto_start_timer_jump_mode',
  'lumostime_auto_open_focus_detail',
  'lumostime_timeline_gallery_mode',
  'lumostime_timeline_sort_order',
  'lumos_timeline_sort',
  'lumostime_timeline_quick_actions',
  'lumostime_collapse_threshold',
  'lumostime_scene_card_timer_mode',
  'lumostime_default_selector_page',
  'lumostime_timeline_layout',
  'lumostime_timeline_todo_sidebar_collapsed',
  'lumostime_timeline_todo_sidebar_ratio',
  'lumostime_timeline_quick_color_sidebar_ratio',
  'lumostime_association_selector_columns',
  'lumostime_review_time',
  'lumostime_weekly_review_time',
  'lumostime_monthly_review_time',
  'lumostime_auto_generate_daily_review',
  'lumostime_auto_generate_weekly_review',
  'lumostime_auto_generate_monthly_review',
  'lumostime_review_overview_question_visibility',
  'lumostime_memoir_filter_config'
] as const;

type PreferenceStorage = Record<string, string | null>;

export interface PreferencesBackupPayload {
  version: 1;
  storage: PreferenceStorage;
}

const readStorageSnapshot = (): PreferenceStorage => Object.fromEntries(
  PREFERENCE_STORAGE_KEYS.map((key) => [key, localStorage.getItem(key)])
);

const parseJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const preferencesBackupService = {
  buildBackupPayload(): PreferencesBackupPayload {
    return {
      version: 1,
      storage: readStorageSnapshot()
    };
  },

  applyBackupPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') return;
    const candidate = payload as Partial<PreferencesBackupPayload>;
    if (!candidate.storage || typeof candidate.storage !== 'object') return;

    const restoredStorage = candidate.storage as PreferenceStorage;
    PREFERENCE_STORAGE_KEYS.forEach((key) => {
      const value = restoredStorage[key];
      if (typeof value === 'string') {
        localStorage.setItem(key, value);
      } else if (value === null) {
        localStorage.removeItem(key);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PREFERENCES_RESTORED_EVENT, {
        detail: { storage: restoredStorage }
      }));
    }
  },

  getStorageKeys(): readonly string[] {
    return PREFERENCE_STORAGE_KEYS;
  },

  parseJson,
};
