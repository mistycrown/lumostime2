/**
 * @file timelineQuickActions.ts
 * @input Stored timeline quick-action preference payloads
 * @output Shared quick-action definitions and normalization helpers for timeline header buttons
 * @description Centralizes the configurable quick actions shown at the top of the timeline view.
 * @updated 2026-05-12: Added the Collection shortcut key so timeline quick actions can deep-link into the settings collection subpage.
 * @updated 2026-08-09: Added the daily-check overview shortcut key.
 * @updated 2026-04-25: Added shared quick-action metadata and normalization helpers for timeline header customization.
 * @updated 2026-04-25: Shortened timeline quick-action labels for the preferences UI.
 */

export type TimelineQuickActionKey =
  | 'search'
  | 'filters'
  | 'stats'
  | 'gallery'
  | 'achievement'
  | 'daily_checks'
  | 'collections'
  | 'principle'
  | 'sync';

export interface TimelineQuickActionOption {
  key: TimelineQuickActionKey;
  label: string;
  description: string;
}

export const TIMELINE_QUICK_ACTION_OPTIONS: TimelineQuickActionOption[] = [
  {
    key: 'search',
    label: '搜索',
    description: '打开应用内搜索。'
  },
  {
    key: 'filters',
    label: '筛选器',
    description: '打开自定义筛选器。'
  },
  {
    key: 'stats',
    label: '统计',
    description: '进入数据统计页。'
  },
  {
    key: 'gallery',
    label: '画廊',
    description: '打开时间脉络画廊视图。'
  },
  {
    key: 'achievement',
    label: '成就瓶',
    description: '打开成就页。'
  },
  {
    key: 'daily_checks',
    label: '日课总览',
    description: '打开日课总览页。'
  },
  {
    key: 'collections',
    label: 'Collections',
    description: '打开设置中的 Collection 子页。'
  },
  {
    key: 'principle',
    label: '原则库',
    description: '打开设置中的原则库。'
  },
  {
    key: 'sync',
    label: '同步',
    description: '复用现有同步按钮逻辑。'
  }
];

export const DEFAULT_TIMELINE_QUICK_ACTIONS: TimelineQuickActionKey[] = [
  'search',
  'filters',
  'stats',
  'gallery',
  'achievement'
];

export const TIMELINE_QUICK_ACTION_MAX = 5;

const timelineQuickActionKeySet = new Set<TimelineQuickActionKey>(
  TIMELINE_QUICK_ACTION_OPTIONS.map((option) => option.key)
);

export const isTimelineQuickActionKey = (value: unknown): value is TimelineQuickActionKey =>
  typeof value === 'string' && timelineQuickActionKeySet.has(value as TimelineQuickActionKey);

export const normalizeTimelineQuickActions = (
  value: unknown,
  fallback: TimelineQuickActionKey[] = DEFAULT_TIMELINE_QUICK_ACTIONS
): TimelineQuickActionKey[] => {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const seen = new Set<TimelineQuickActionKey>();
  const normalized: TimelineQuickActionKey[] = [];

  value.forEach((item) => {
    if (!isTimelineQuickActionKey(item) || seen.has(item)) {
      return;
    }

    seen.add(item);
    normalized.push(item);
  });

  return normalized.slice(0, TIMELINE_QUICK_ACTION_MAX);
};
