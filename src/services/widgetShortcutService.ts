/**
 * @file widgetShortcutService.ts
 * @input None
 * @output Shortcut widget action metadata
 * @pos Service
 * @description Defines supported shortcut widget actions, labels, default emoji, and default colors for the shortcut widget family.
 * @updated 2026-04-18: Switched shortcut widgets from fixed Lucide icons to configurable emoji and background colors.
 */

export type ShortcutWidgetAction =
  | 'open_supplement_log'
  | 'quick_punch'
  | 'open_today_review'
  | 'open_search'
  | 'open_gallery';

export interface ShortcutWidgetActionOption {
  value: ShortcutWidgetAction;
  label: string;
  description: string;
  defaultEmoji: string;
  defaultColor: string;
}

export const DEFAULT_SHORTCUT_WIDGET_COLOR = '#E7E5E4';

export const SHORTCUT_WIDGET_ACTION_OPTIONS: ShortcutWidgetActionOption[] = [
  {
    value: 'open_supplement_log',
    label: '打开添加补记',
    description: '进入脉络页并直接打开添加补记入口。',
    defaultEmoji: '✍️',
    defaultColor: '#F5E6D3'
  },
  {
    value: 'quick_punch',
    label: '快速打点',
    description: '进入脉络页并立即执行一次快速打点。',
    defaultEmoji: '⚡',
    defaultColor: '#FEF3C7'
  },
  {
    value: 'open_today_review',
    label: '今天 Review',
    description: '若今天还没有 Review，则先新建，再直接打开。',
    defaultEmoji: '📓',
    defaultColor: '#DBEAFE'
  },
  {
    value: 'open_search',
    label: '搜索',
    description: '打开应用内搜索。',
    defaultEmoji: '🔍',
    defaultColor: '#E0E7FF'
  },
  {
    value: 'open_gallery',
    label: '画廊',
    description: '进入时间轴画廊视图。',
    defaultEmoji: '🖼️',
    defaultColor: '#DCFCE7'
  }
];

export const normalizeShortcutWidgetAction = (
  value?: string | null
): ShortcutWidgetAction | null =>
  SHORTCUT_WIDGET_ACTION_OPTIONS.some((item) => item.value === value)
    ? (value as ShortcutWidgetAction)
    : null;

export const getShortcutWidgetActionOption = (
  action?: string | null
): ShortcutWidgetActionOption | null =>
  SHORTCUT_WIDGET_ACTION_OPTIONS.find((item) => item.value === action) || null;

export const getShortcutWidgetActionLabel = (action?: string | null): string =>
  getShortcutWidgetActionOption(action)?.label || '快捷入口';

export const getShortcutWidgetActionEmoji = (action?: string | null): string =>
  getShortcutWidgetActionOption(action)?.defaultEmoji || '•';

export const getShortcutWidgetActionColor = (action?: string | null): string =>
  getShortcutWidgetActionOption(action)?.defaultColor || DEFAULT_SHORTCUT_WIDGET_COLOR;
