/**
 * @file widgetService.ts
 * @input Category/activity data, daily template data, ActiveSession state, widget bridge payloads
 * @output Widget template persistence helpers and app/native conversion utilities
 * @pos Service
 * @description Centralizes the shared types and conversions used by the Android widget system while keeping timer, daily, and shortcut slots on one contract.
 * @updated 2026-04-25: Added DAILY_RUNTIME dual-view payload builders so native heatmap widgets can toggle between category and activity coloring.
 * @updated 2026-04-25: Added widget UI icon asset preservation and sanitization helpers so Android widgets can prefer local icon bitmaps with emoji fallback.
 * @updated 2026-04-26: Added TODAY + PIN widget payload builders for the dedicated scrollable 4x2 todo widget.
 * @updated 2026-04-26: Let TODAY + PIN payloads inherit linked activity/category metadata from a parent todo when the pinned child itself does not carry the mapping.
 * @updated 2026-04-26: Expanded the 4x1 timer widget template from 4 to 5 evenly spaced slots.
 * @updated 2026-05-01: Added tracking-calendar template normalization and payload builders for the dedicated 2x2 tracking calendar widget.
 */
import { Capacitor } from '@capacitor/core';
import { ActiveSession, Category, CheckTemplate, DailyReview, Log, TodoItem } from '../types';
import type {
  WidgetBridgeDailyRuntimeLegendItem,
  WidgetBridgeDailyRuntimePayload,
  WidgetBridgeDailyRuntimeViewData,
  WidgetBridgeDailyRuntimeSegment,
  DailyWidgetManualMode,
  WidgetBridgeDailyCheckMeta,
  WidgetBridgeDailyProgress,
  WidgetBridgeDailySyncPayload,
  WidgetBridgeInstanceBinding,
  WidgetBridgePendingAction,
  WidgetBridgeRuntimeState,
  WidgetBridgeSlot,
  WidgetBridgeTemplate,
  WidgetTemplateType as WidgetBridgeTemplateType,
  WidgetBridgeTrackingCalendarConfig,
  WidgetBridgeTrackingCalendarEntry,
  WidgetBridgeTrackingCalendarPayload,
  WidgetTrackingCalendarSourceType as WidgetBridgeTrackingCalendarSourceType,
  WidgetBridgeTodoPinItem,
  WidgetBridgeTodoPinPayload,
  WidgetType
} from '../plugins/WidgetBridgePlugin';
import {
  ShortcutWidgetAction,
  getShortcutWidgetActionColor,
  getShortcutWidgetActionEmoji,
  getShortcutWidgetActionLabel,
  normalizeShortcutWidgetAction
} from './widgetShortcutService';
import { getColorHexForCharts } from '../utils/colorAdapterUtils';
import {
  DailyCheckTemplateMeta,
  findCheckItemIndexInReview,
  getCheckItemCountState,
  getDailyCheckProgressForDate,
  getDailyCheckTemplateMeta,
  getEligibleNfcDailyCheckItems
} from '../utils/dailyCheckUtils';
import { getLocalDateStr } from '../utils/dateUtils';
import { splitLogByDays } from '../utils/logUtils';
import { getTodoAssociationTodayTodos } from '../utils/todoScheduleUtils';

const LEGACY_WIDGET_TIMER_STORAGE_KEY = 'lumostime_widget_timer_slots_v1';
const WIDGET_TEMPLATE_STORAGE_KEY = 'lumostime_widget_templates_v1';
const FALLBACK_WIDGET_ICON = '\u2022';

export const DEFAULT_WIDGET_TYPE: WidgetType = 'timer';
export const WIDGET_TYPE_OPTIONS: WidgetType[] = ['timer', 'daily', 'shortcut'];
export const DEFAULT_WIDGET_TEMPLATE_TYPE: WidgetTemplateType = 'grid';
export const WIDGET_TEMPLATE_TYPE_OPTIONS: WidgetTemplateType[] = ['grid', 'trackingCalendar'];
export const DEFAULT_DAILY_WIDGET_COLOR = '#E7E5E4';
export const DEFAULT_TRACKING_CALENDAR_COLOR = '#E7E5E4';
export const TRACKING_CALENDAR_WIDGET_SIZE = '2x2';
export const WIDGET_TEMPLATES_UPDATED_EVENT = 'lumostime:widget-templates-updated';
export const DEFAULT_WIDGET_TEMPLATE_NAME = '\u6211\u7684\u5c0f\u7ec4\u4ef6';
export const DEFAULT_WIDGET_SIZE = '2x2';
export const WIDGET_SIZE_OPTIONS = ['2x1', '2x2', '3x2', '4x1', '4x2'] as const;
const TRACKING_CALENDAR_LOOKBACK_DAYS = 400;

export type WidgetSize = (typeof WIDGET_SIZE_OPTIONS)[number];
export type WidgetTemplateSlotConfig = WidgetBridgeSlot;
export type WidgetTemplate = WidgetBridgeTemplate;
export type WidgetInstanceBinding = WidgetBridgeInstanceBinding;
export type DailyWidgetSlotBinding = DailyCheckTemplateMeta;
export type WidgetTemplateType = WidgetBridgeTemplateType;
export type WidgetTrackingCalendarConfig = WidgetBridgeTrackingCalendarConfig;
export type WidgetTrackingCalendarSourceType = WidgetBridgeTrackingCalendarSourceType;

const WIDGET_SIZE_SLOT_COUNT: Record<WidgetSize, number> = {
  '2x1': 2,
  '2x2': 4,
  '3x2': 6,
  '4x1': 5,
  '4x2': 8
};

const WIDGET_SIZE_GRID: Record<WidgetSize, { columns: number; rows: number }> = {
  '2x1': { columns: 2, rows: 1 },
  '2x2': { columns: 2, rows: 2 },
  '3x2': { columns: 3, rows: 2 },
  '4x1': { columns: 5, rows: 1 },
  '4x2': { columns: 4, rows: 2 }
};

const normalizeNullableString = (value?: string | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed && trimmed.toLowerCase() !== 'null' ? trimmed : null;
};

const normalizePositiveInt = (value?: number | null, fallback: number = 1): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.floor(value));
};

const createWidgetTemplateId = () =>
  `widget-template-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const normalizeWidgetSlotType = (slotType?: string | null): WidgetType | null =>
  slotType === 'daily' || slotType === 'timer' || slotType === 'shortcut' ? slotType : null;

export const normalizeWidgetType = (widgetType?: string | null): WidgetType =>
  widgetType === 'daily' || widgetType === 'timer' || widgetType === 'shortcut'
    ? widgetType
    : DEFAULT_WIDGET_TYPE;

export const normalizeWidgetTemplateType = (
  templateType?: string | null
): WidgetTemplateType =>
  templateType === 'trackingCalendar' || templateType === 'grid'
    ? templateType
    : DEFAULT_WIDGET_TEMPLATE_TYPE;

export const normalizeTrackingCalendarSourceType = (
  sourceType?: string | null
): WidgetTrackingCalendarSourceType | null =>
  sourceType === 'tag' || sourceType === 'scope' || sourceType === 'daily' ? sourceType : null;

export const normalizeDailyWidgetManualMode = (
  manualMode?: string | null
): DailyWidgetManualMode | null => {
  if (manualMode === 'count') {
    return 'count';
  }

  if (manualMode === 'binary') {
    return 'binary';
  }

  return null;
};

export const normalizeWidgetSize = (size?: string | null): WidgetSize =>
  WIDGET_SIZE_OPTIONS.includes((size || '') as WidgetSize)
    ? (size as WidgetSize)
    : DEFAULT_WIDGET_SIZE;

export const getWidgetSlotCountBySize = (size: WidgetSize): number => WIDGET_SIZE_SLOT_COUNT[size];

export const getWidgetGridBySize = (size: WidgetSize): { columns: number; rows: number } =>
  WIDGET_SIZE_GRID[size];

export const getWidgetSizeLabel = (size: WidgetSize): string => size;

export const getWidgetTemplateTypeLabel = (templateType: WidgetTemplateType): string =>
  templateType === 'trackingCalendar' ? '2×2 追踪日历' : '计时器';

export const getWidgetSizeOptions = (): WidgetSize[] => [...WIDGET_SIZE_OPTIONS];

export const createEmptyWidgetTemplateSlot = (
  slotIndex: number
): WidgetTemplateSlotConfig => ({
  slotIndex,
  slotType: null,
  activityId: null,
  categoryId: null,
  icon: null,
  customIcon: null,
  uiIconAssetPath: null,
  uiIconFallbackAssetPath: null,
  label: null,
  color: null,
  linkedTodoId: null,
  scopeIds: null,
  checkTemplateId: null,
  checkItemId: null,
  checkManualMode: null,
  checkTargetCount: null,
  shortcutAction: null
});

export const createEmptyWidgetTemplateSlots = (
  size: WidgetSize = DEFAULT_WIDGET_SIZE
): WidgetTemplateSlotConfig[] =>
  Array.from({ length: getWidgetSlotCountBySize(size) }, (_, slotIndex) =>
    createEmptyWidgetTemplateSlot(slotIndex)
  );

export const createEmptyTrackingCalendarConfig = (): WidgetTrackingCalendarConfig => ({
  sourceType: null,
  categoryId: null,
  activityId: null,
  scopeId: null,
  checkTemplateId: null,
  checkItemId: null,
  icon: null,
  customIcon: null,
  uiIconAssetPath: null,
  uiIconFallbackAssetPath: null,
  label: null,
  color: null
});

export const normalizeTrackingCalendarConfig = (
  config?: WidgetTrackingCalendarConfig | null
): WidgetTrackingCalendarConfig | null => {
  if (!config) {
    return null;
  }

  return {
    sourceType: normalizeTrackingCalendarSourceType(config.sourceType),
    categoryId: normalizeNullableString(config.categoryId),
    activityId: normalizeNullableString(config.activityId),
    scopeId: normalizeNullableString(config.scopeId),
    checkTemplateId: normalizeNullableString(config.checkTemplateId),
    checkItemId: normalizeNullableString(config.checkItemId),
    icon: normalizeNullableString(config.icon),
    customIcon: normalizeNullableString(config.customIcon),
    uiIconAssetPath: normalizeNullableString(config.uiIconAssetPath),
    uiIconFallbackAssetPath: normalizeNullableString(config.uiIconFallbackAssetPath),
    label: normalizeNullableString(config.label),
    color: normalizeNullableString(config.color)
  };
};

export const normalizeWidgetTemplateSlots = (
  slots: WidgetTemplateSlotConfig[],
  size: WidgetSize = DEFAULT_WIDGET_SIZE
): WidgetTemplateSlotConfig[] => {
  const slotCount = getWidgetSlotCountBySize(size);
  const slotMap = new Map(slots.map((slot) => [slot.slotIndex, slot]));

  return Array.from({ length: slotCount }, (_, slotIndex) => {
    const slot = slotMap.get(slotIndex);
    return {
      slotIndex,
      slotType: normalizeWidgetSlotType(slot?.slotType),
      activityId: normalizeNullableString(slot?.activityId),
      categoryId: normalizeNullableString(slot?.categoryId),
      icon: normalizeNullableString(slot?.icon),
      customIcon: normalizeNullableString(slot?.customIcon),
      uiIconAssetPath: normalizeNullableString(slot?.uiIconAssetPath),
      uiIconFallbackAssetPath: normalizeNullableString(slot?.uiIconFallbackAssetPath),
      label: normalizeNullableString(slot?.label),
      color: normalizeNullableString(slot?.color),
      linkedTodoId: normalizeNullableString(slot?.linkedTodoId),
      scopeIds: slot?.scopeIds?.filter(Boolean) ?? null,
      checkTemplateId: normalizeNullableString(slot?.checkTemplateId),
      checkItemId: normalizeNullableString(slot?.checkItemId),
      checkManualMode: normalizeDailyWidgetManualMode(slot?.checkManualMode),
      checkTargetCount: normalizePositiveInt(slot?.checkTargetCount, null),
      shortcutAction: normalizeShortcutWidgetAction(slot?.shortcutAction)
    };
  });
};

export const resizeWidgetTemplateSlots = (
  slots: WidgetTemplateSlotConfig[],
  size: WidgetSize
): WidgetTemplateSlotConfig[] => normalizeWidgetTemplateSlots(slots, size);

export const isWidgetTemplateConfigured = (template: WidgetTemplate): boolean =>
  normalizeWidgetTemplateType(template.templateType) === 'trackingCalendar'
    ? (() => {
        const config = normalizeTrackingCalendarConfig(template.trackingConfig);
        if (!config?.sourceType) {
          return false;
        }
        if (config.sourceType === 'tag') {
          return Boolean(config.categoryId && config.activityId);
        }
        if (config.sourceType === 'scope') {
          return Boolean(config.scopeId);
        }
        return Boolean(config.checkItemId);
      })()
    : template.slots.some((slot) => {
        if (slot.slotType === 'daily') {
          return Boolean(slot.checkItemId);
        }
        if (slot.slotType === 'shortcut') {
          return Boolean(slot.shortcutAction);
        }
        if (slot.slotType === 'timer') {
          return Boolean(slot.activityId && slot.categoryId);
        }
        return false;
      });

export const createWidgetTemplate = (
  name?: string,
  size: WidgetSize = DEFAULT_WIDGET_SIZE,
  templateType: WidgetTemplateType = DEFAULT_WIDGET_TEMPLATE_TYPE
): WidgetTemplate => {
  const now = Date.now();
  const normalizedTemplateType = normalizeWidgetTemplateType(templateType);
  const normalizedSize = normalizedTemplateType === 'trackingCalendar'
    ? TRACKING_CALENDAR_WIDGET_SIZE
    : normalizeWidgetSize(size);
  return {
    id: createWidgetTemplateId(),
    name: name?.trim() || DEFAULT_WIDGET_TEMPLATE_NAME,
    size: normalizedSize,
    templateType: normalizedTemplateType,
    slots: createEmptyWidgetTemplateSlots(normalizedSize),
    trackingConfig:
      normalizedTemplateType === 'trackingCalendar' ? createEmptyTrackingCalendarConfig() : null,
    createdAt: now,
    updatedAt: now
  };
};

export const normalizeWidgetTemplate = (
  template: Partial<WidgetTemplate> & Pick<WidgetTemplate, 'id'>
): WidgetTemplate => {
  const templateType = normalizeWidgetTemplateType(template.templateType);
  const size = templateType === 'trackingCalendar'
    ? TRACKING_CALENDAR_WIDGET_SIZE
    : normalizeWidgetSize(template.size);
  return {
    id: template.id,
    name: template.name?.trim() || DEFAULT_WIDGET_TEMPLATE_NAME,
    size,
    templateType,
    slots: normalizeWidgetTemplateSlots(template.slots || [], size),
    trackingConfig:
      templateType === 'trackingCalendar'
        ? normalizeTrackingCalendarConfig(template.trackingConfig) || createEmptyTrackingCalendarConfig()
        : null,
    createdAt: Number.isFinite(template.createdAt) ? Number(template.createdAt) : Date.now(),
    updatedAt: Number.isFinite(template.updatedAt) ? Number(template.updatedAt) : Date.now()
  };
};

export const normalizeWidgetTemplates = (templates: WidgetTemplate[]): WidgetTemplate[] => {
  const seen = new Set<string>();
  return templates
    .map((template) => normalizeWidgetTemplate(template))
    .filter((template) => {
      if (!template.id || seen.has(template.id)) {
        return false;
      }
      seen.add(template.id);
      return true;
    });
};

export const buildTimerWidgetSlotConfig = (
  category: Category,
  activity: Category['activities'][number],
  slotIndex: number,
  overrides?: {
    icon?: string | null;
    linkedTodoId?: string | null;
    scopeIds?: string[] | null;
    customIcon?: string | null;
    uiIconAssetPath?: string | null;
    uiIconFallbackAssetPath?: string | null;
  }
): WidgetTemplateSlotConfig => ({
  slotIndex,
  slotType: 'timer',
  activityId: activity.id,
  categoryId: category.id,
  icon:
    normalizeNullableString(overrides?.customIcon)
    || normalizeNullableString(overrides?.icon)
    || activity.icon
    || category.icon,
  customIcon: normalizeNullableString(overrides?.customIcon),
  uiIconAssetPath: normalizeNullableString(overrides?.uiIconAssetPath),
  uiIconFallbackAssetPath: normalizeNullableString(overrides?.uiIconFallbackAssetPath),
  label: activity.name,
  color: getColorHexForCharts(activity.color || category.themeColor || ''),
  linkedTodoId: normalizeNullableString(overrides?.linkedTodoId),
  scopeIds: overrides?.scopeIds?.filter(Boolean) ?? null,
  checkTemplateId: null,
  checkItemId: null,
  checkManualMode: null,
  checkTargetCount: null
});

export const buildDailyWidgetSlotConfig = (
  binding: DailyWidgetSlotBinding,
  slotIndex: number,
  overrides?: {
    icon?: string | null;
    customIcon?: string | null;
    backgroundColor?: string | null;
    uiIconAssetPath?: string | null;
    uiIconFallbackAssetPath?: string | null;
  }
): WidgetTemplateSlotConfig => ({
  slotIndex,
  slotType: 'daily',
  activityId: null,
  categoryId: null,
  icon:
    normalizeNullableString(overrides?.customIcon)
    || normalizeNullableString(overrides?.icon)
    || binding.icon
    || FALLBACK_WIDGET_ICON,
  customIcon: normalizeNullableString(overrides?.customIcon),
  uiIconAssetPath: normalizeNullableString(overrides?.uiIconAssetPath),
  uiIconFallbackAssetPath: normalizeNullableString(overrides?.uiIconFallbackAssetPath),
  label: binding.content,
  color: normalizeNullableString(overrides?.backgroundColor) || DEFAULT_DAILY_WIDGET_COLOR,
  linkedTodoId: null,
  scopeIds: null,
  checkTemplateId: binding.checkTemplateId,
  checkItemId: binding.checkItemId,
  checkManualMode: binding.manualMode,
  checkTargetCount: binding.targetCount
});

export const buildShortcutWidgetSlotConfig = (
  shortcutAction: ShortcutWidgetAction,
  slotIndex: number,
  overrides?: {
    label?: string | null;
    icon?: string | null;
    customIcon?: string | null;
    backgroundColor?: string | null;
    uiIconAssetPath?: string | null;
    uiIconFallbackAssetPath?: string | null;
  }
): WidgetTemplateSlotConfig => ({
  slotIndex,
  slotType: 'shortcut',
  activityId: null,
  categoryId: null,
  icon:
    normalizeNullableString(overrides?.customIcon)
    || normalizeNullableString(overrides?.icon)
    || getShortcutWidgetActionEmoji(shortcutAction),
  customIcon: normalizeNullableString(overrides?.customIcon),
  uiIconAssetPath: normalizeNullableString(overrides?.uiIconAssetPath),
  uiIconFallbackAssetPath: normalizeNullableString(overrides?.uiIconFallbackAssetPath),
  label: normalizeNullableString(overrides?.label) || getShortcutWidgetActionLabel(shortcutAction),
  color: normalizeNullableString(overrides?.backgroundColor) || getShortcutWidgetActionColor(shortcutAction),
  linkedTodoId: null,
  scopeIds: null,
  checkTemplateId: null,
  checkItemId: null,
  checkManualMode: null,
  checkTargetCount: null,
  shortcutAction
});

export const buildTrackingCalendarTagConfig = (
  category: Category,
  activity: Category['activities'][number],
  overrides?: {
    icon?: string | null;
    customIcon?: string | null;
    color?: string | null;
    uiIconAssetPath?: string | null;
    uiIconFallbackAssetPath?: string | null;
  }
): WidgetTrackingCalendarConfig => ({
  sourceType: 'tag',
  categoryId: category.id,
  activityId: activity.id,
  scopeId: null,
  checkTemplateId: null,
  checkItemId: null,
  icon:
    normalizeNullableString(overrides?.customIcon)
    || normalizeNullableString(overrides?.icon)
    || activity.icon
    || category.icon,
  customIcon: normalizeNullableString(overrides?.customIcon),
  uiIconAssetPath: normalizeNullableString(overrides?.uiIconAssetPath),
  uiIconFallbackAssetPath: normalizeNullableString(overrides?.uiIconFallbackAssetPath),
  label: activity.name,
  color: normalizeNullableString(overrides?.color) || getColorHexForCharts(activity.color || category.themeColor || ''),
});

export const buildTrackingCalendarScopeConfig = (
  scope: { id: string; name: string; icon: string; uiIcon?: string; themeColor: string },
  overrides?: {
    icon?: string | null;
    customIcon?: string | null;
    color?: string | null;
    uiIconAssetPath?: string | null;
    uiIconFallbackAssetPath?: string | null;
  }
): WidgetTrackingCalendarConfig => ({
  sourceType: 'scope',
  categoryId: null,
  activityId: null,
  scopeId: scope.id,
  checkTemplateId: null,
  checkItemId: null,
  icon:
    normalizeNullableString(overrides?.customIcon)
    || normalizeNullableString(overrides?.icon)
    || scope.icon
    || FALLBACK_WIDGET_ICON,
  customIcon: normalizeNullableString(overrides?.customIcon),
  uiIconAssetPath: normalizeNullableString(overrides?.uiIconAssetPath),
  uiIconFallbackAssetPath: normalizeNullableString(overrides?.uiIconFallbackAssetPath),
  label: scope.name,
  color: normalizeNullableString(overrides?.color) || getColorHexForCharts(scope.themeColor || ''),
});

export const buildTrackingCalendarDailyConfig = (
  binding: DailyWidgetSlotBinding,
  overrides?: {
    icon?: string | null;
    customIcon?: string | null;
    color?: string | null;
    uiIconAssetPath?: string | null;
    uiIconFallbackAssetPath?: string | null;
  }
): WidgetTrackingCalendarConfig => ({
  sourceType: 'daily',
  categoryId: null,
  activityId: null,
  scopeId: null,
  checkTemplateId: binding.checkTemplateId,
  checkItemId: binding.checkItemId,
  icon:
    normalizeNullableString(overrides?.customIcon)
    || normalizeNullableString(overrides?.icon)
    || binding.icon
    || FALLBACK_WIDGET_ICON,
  customIcon: normalizeNullableString(overrides?.customIcon),
  uiIconAssetPath: normalizeNullableString(overrides?.uiIconAssetPath),
  uiIconFallbackAssetPath: normalizeNullableString(overrides?.uiIconFallbackAssetPath),
  label: binding.content,
  color: normalizeNullableString(overrides?.color)
});

export const findDailyWidgetBinding = (
  checkTemplates: CheckTemplate[],
  checkItemId: string
): DailyWidgetSlotBinding | null => getDailyCheckTemplateMeta(checkTemplates, checkItemId);

export const findWidgetActivity = (categories: Category[], categoryId: string, activityId: string) => {
  const category = categories.find((item) => item.id === categoryId);
  const activity = category?.activities.find((item) => item.id === activityId);
  return { category, activity };
};

export const rebuildTimerWidgetSlotConfig = (
  slot: WidgetTemplateSlotConfig,
  categories: Category[]
): WidgetTemplateSlotConfig => {
  if (!slot.activityId || !slot.categoryId) {
    return createEmptyWidgetTemplateSlot(slot.slotIndex);
  }

  const { category, activity } = findWidgetActivity(categories, slot.categoryId, slot.activityId);
  if (!category || !activity) {
    return createEmptyWidgetTemplateSlot(slot.slotIndex);
  }

  return buildTimerWidgetSlotConfig(category, activity, slot.slotIndex, {
    icon: slot.icon ?? null,
    linkedTodoId: slot.linkedTodoId ?? null,
    scopeIds: slot.scopeIds ?? null,
    customIcon: slot.customIcon ?? null,
    uiIconAssetPath: slot.uiIconAssetPath ?? null,
    uiIconFallbackAssetPath: slot.uiIconFallbackAssetPath ?? null
  });
};

export const rebuildDailyWidgetSlotConfig = (
  slot: WidgetTemplateSlotConfig,
  checkTemplates: CheckTemplate[]
): WidgetTemplateSlotConfig => {
  if (!slot.checkItemId) {
    return createEmptyWidgetTemplateSlot(slot.slotIndex);
  }

  const binding = findDailyWidgetBinding(checkTemplates, slot.checkItemId);
  if (!binding) {
    return createEmptyWidgetTemplateSlot(slot.slotIndex);
  }

  return buildDailyWidgetSlotConfig(binding, slot.slotIndex, {
    icon: slot.icon ?? null,
    customIcon: slot.customIcon ?? null,
    backgroundColor: slot.color ?? DEFAULT_DAILY_WIDGET_COLOR,
    uiIconAssetPath: slot.uiIconAssetPath ?? null,
    uiIconFallbackAssetPath: slot.uiIconFallbackAssetPath ?? null
  });
};

export const rebuildShortcutWidgetSlotConfig = (
  slot: WidgetTemplateSlotConfig
): WidgetTemplateSlotConfig => {
  if (!slot.shortcutAction) {
    return createEmptyWidgetTemplateSlot(slot.slotIndex);
  }

  return buildShortcutWidgetSlotConfig(slot.shortcutAction, slot.slotIndex, {
    label: slot.label ?? undefined,
    icon: slot.icon ?? null,
    customIcon: slot.customIcon ?? null,
    backgroundColor: slot.color ?? null,
    uiIconAssetPath: slot.uiIconAssetPath ?? null,
    uiIconFallbackAssetPath: slot.uiIconFallbackAssetPath ?? null
  });
};

export const rebuildTrackingCalendarConfig = (
  config: WidgetTrackingCalendarConfig | null | undefined,
  categories: Category[],
  scopes: Array<{ id: string; name: string; icon: string; uiIcon?: string; themeColor: string }>,
  checkTemplates: CheckTemplate[]
): WidgetTrackingCalendarConfig | null => {
  const normalizedConfig = normalizeTrackingCalendarConfig(config);
  if (!normalizedConfig?.sourceType) {
    return createEmptyTrackingCalendarConfig();
  }

  if (normalizedConfig.sourceType === 'tag') {
    if (!normalizedConfig.categoryId || !normalizedConfig.activityId) {
      return createEmptyTrackingCalendarConfig();
    }
    const { category, activity } = findWidgetActivity(
      categories,
      normalizedConfig.categoryId,
      normalizedConfig.activityId
    );
    if (!category || !activity) {
      return createEmptyTrackingCalendarConfig();
    }
    return buildTrackingCalendarTagConfig(category, activity, {
      icon: normalizedConfig.icon ?? null,
      customIcon: normalizedConfig.customIcon ?? null,
      color: normalizedConfig.color ?? null,
      uiIconAssetPath: normalizedConfig.uiIconAssetPath ?? null,
      uiIconFallbackAssetPath: normalizedConfig.uiIconFallbackAssetPath ?? null
    });
  }

  if (normalizedConfig.sourceType === 'scope') {
    if (!normalizedConfig.scopeId) {
      return createEmptyTrackingCalendarConfig();
    }
    const scope = scopes.find((item) => item.id === normalizedConfig.scopeId);
    if (!scope) {
      return createEmptyTrackingCalendarConfig();
    }
    return buildTrackingCalendarScopeConfig(scope, {
      icon: normalizedConfig.icon ?? null,
      customIcon: normalizedConfig.customIcon ?? null,
      color: normalizedConfig.color ?? null,
      uiIconAssetPath: normalizedConfig.uiIconAssetPath ?? null,
      uiIconFallbackAssetPath: normalizedConfig.uiIconFallbackAssetPath ?? null
    });
  }

  if (!normalizedConfig.checkItemId) {
    return createEmptyTrackingCalendarConfig();
  }
  const binding = findDailyWidgetBinding(checkTemplates, normalizedConfig.checkItemId);
  if (!binding) {
    return createEmptyTrackingCalendarConfig();
  }
  return buildTrackingCalendarDailyConfig(binding, {
    icon: normalizedConfig.icon ?? null,
    customIcon: normalizedConfig.customIcon ?? null,
    color: normalizedConfig.color ?? null,
    uiIconAssetPath: normalizedConfig.uiIconAssetPath ?? null,
    uiIconFallbackAssetPath: normalizedConfig.uiIconFallbackAssetPath ?? null
  });
};

const stripWidgetSlotUiIconFields = (
  slot: WidgetTemplateSlotConfig
): WidgetTemplateSlotConfig => {
  if (!slot.uiIconAssetPath && !slot.uiIconFallbackAssetPath) {
    return slot;
  }

  return {
    ...slot,
    uiIconAssetPath: null,
    uiIconFallbackAssetPath: null
  };
};

const stripTrackingCalendarUiIconFields = (
  config: WidgetTrackingCalendarConfig | null | undefined
): WidgetTrackingCalendarConfig | null => {
  const normalizedConfig = normalizeTrackingCalendarConfig(config);
  if (!normalizedConfig) {
    return normalizedConfig;
  }

  if (!normalizedConfig.uiIconAssetPath && !normalizedConfig.uiIconFallbackAssetPath) {
    return normalizedConfig;
  }

  return {
    ...normalizedConfig,
    uiIconAssetPath: null,
    uiIconFallbackAssetPath: null
  };
};

export const sanitizeWidgetTemplatesForUiIconSupport = (
  templates: WidgetTemplate[],
  allowUiIcon: boolean
): WidgetTemplate[] => {
  if (allowUiIcon) {
    return normalizeWidgetTemplates(templates);
  }

  let didChange = false;

  const sanitizedTemplates = templates.map((template) => {
    const normalizedSlots = normalizeWidgetTemplateSlots(template.slots, template.size);
    const sanitizedSlots = normalizedSlots.map((slot) => {
      const nextSlot = stripWidgetSlotUiIconFields(slot);
      if (nextSlot !== slot) {
        didChange = true;
      }
      return nextSlot;
    });
    const sanitizedTrackingConfig = stripTrackingCalendarUiIconFields(template.trackingConfig);
    if (JSON.stringify(sanitizedTrackingConfig) !== JSON.stringify(template.trackingConfig ?? null)) {
      didChange = true;
    }

    return didChange
      ? {
          ...template,
          slots: sanitizedSlots,
          trackingConfig: sanitizedTrackingConfig,
          updatedAt: Date.now()
        }
      : template;
  });

  return didChange ? normalizeWidgetTemplates(sanitizedTemplates) : normalizeWidgetTemplates(templates);
};

export const rebuildWidgetTemplate = (
  template: WidgetTemplate,
  categories: Category[],
  checkTemplates: CheckTemplate[] = [],
  scopes: Array<{ id: string; name: string; icon: string; uiIcon?: string; themeColor: string }> = []
): WidgetTemplate => ({
  ...template,
  updatedAt: Date.now(),
  slots: normalizeWidgetTemplateSlots(
    template.slots.map((slot) =>
      slot.slotType === 'daily'
        ? rebuildDailyWidgetSlotConfig(slot, checkTemplates)
        : slot.slotType === 'shortcut'
          ? rebuildShortcutWidgetSlotConfig(slot)
          : slot.slotType === 'timer'
            ? rebuildTimerWidgetSlotConfig(slot, categories)
            : createEmptyWidgetTemplateSlot(slot.slotIndex)
    ),
    template.size
  ),
  trackingConfig:
    normalizeWidgetTemplateType(template.templateType) === 'trackingCalendar'
      ? rebuildTrackingCalendarConfig(template.trackingConfig, categories, scopes, checkTemplates)
      : null
});

const loadLegacyWidgetTimerSlotsFromStorage = (): WidgetTemplateSlotConfig[] => {
  const raw = localStorage.getItem(LEGACY_WIDGET_TIMER_STORAGE_KEY);
  if (!raw) {
    return createEmptyWidgetTemplateSlots(DEFAULT_WIDGET_SIZE);
  }

  try {
    return normalizeWidgetTemplateSlots(
      JSON.parse(raw) as WidgetTemplateSlotConfig[],
      DEFAULT_WIDGET_SIZE
    );
  } catch (error) {
    console.error('[widgetService] Failed to parse legacy widget config from localStorage', error);
    return createEmptyWidgetTemplateSlots(DEFAULT_WIDGET_SIZE);
  }
};

const migrateLegacySlotsToTemplates = (): WidgetTemplate[] => {
  const legacyRaw = localStorage.getItem(LEGACY_WIDGET_TIMER_STORAGE_KEY);
  if (!legacyRaw) {
    return [];
  }

  const legacySlots = loadLegacyWidgetTimerSlotsFromStorage();
  if (!legacySlots.some((slot) => slot.activityId && slot.categoryId)) {
    return [];
  }

  const now = Date.now();
  const migratedTemplate: WidgetTemplate = {
    id: 'widget-template-legacy-default',
    name: DEFAULT_WIDGET_TEMPLATE_NAME,
    size: DEFAULT_WIDGET_SIZE,
    templateType: 'grid',
    slots: legacySlots.map((slot) => ({
      ...slot,
      slotType: slot.activityId && slot.categoryId ? 'timer' : null
    })),
    trackingConfig: null,
    createdAt: now,
    updatedAt: now
  };

  const templates = [migratedTemplate];
  saveWidgetTemplatesToStorage(templates);
  return templates;
};

export const loadWidgetTemplatesFromStorage = (): WidgetTemplate[] => {
  const raw = localStorage.getItem(WIDGET_TEMPLATE_STORAGE_KEY);
  if (!raw) {
    return migrateLegacySlotsToTemplates();
  }

  try {
    return normalizeWidgetTemplates(JSON.parse(raw) as WidgetTemplate[]);
  } catch (error) {
    console.error('[widgetService] Failed to parse widget templates from localStorage', error);
    return migrateLegacySlotsToTemplates();
  }
};

export const saveWidgetTemplatesToStorage = (templates: WidgetTemplate[]) => {
  localStorage.setItem(WIDGET_TEMPLATE_STORAGE_KEY, JSON.stringify(normalizeWidgetTemplates(templates)));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(WIDGET_TEMPLATES_UPDATED_EVENT));
  }
};

export const updateWidgetTemplateSize = (
  template: WidgetTemplate,
  size: WidgetSize
): WidgetTemplate => ({
  ...template,
  size:
    normalizeWidgetTemplateType(template.templateType) === 'trackingCalendar'
      ? TRACKING_CALENDAR_WIDGET_SIZE
      : size,
  slots: resizeWidgetTemplateSlots(
    template.slots,
    normalizeWidgetTemplateType(template.templateType) === 'trackingCalendar'
      ? TRACKING_CALENDAR_WIDGET_SIZE
      : size
  ),
  updatedAt: Date.now()
});

export const updateWidgetTemplateSlots = (
  template: WidgetTemplate,
  slots: WidgetTemplateSlotConfig[]
): WidgetTemplate => ({
  ...template,
  slots: normalizeWidgetTemplateSlots(slots, template.size),
  updatedAt: Date.now()
});

export const countTemplateBoundInstances = (
  bindings: WidgetInstanceBinding[],
  templateId: string
): number => bindings.filter((binding) => binding.templateId === templateId).length;

export const isNativeAndroidWidgetSupported = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const buildWidgetRuntimeStateFromSession = (
  session: ActiveSession,
  categories: Category[]
): WidgetBridgeRuntimeState => {
  const widgetType = normalizeWidgetType(session.widgetType);
  const { category, activity } = findWidgetActivity(categories, session.categoryId, session.activityId);
  return {
    id: session.id,
    widgetType,
    activityId: session.activityId,
    categoryId: session.categoryId,
    icon: activity?.icon || session.activityIcon || category?.icon || FALLBACK_WIDGET_ICON,
    label: activity?.name || session.activityName || '',
    color: getColorHexForCharts(activity?.color || category?.themeColor || ''),
    startedAt: session.startTime,
    source: session.source || 'app',
    linkedTodoId: session.linkedTodoId || null,
    scopeIds: session.scopeIds ?? null,
    slotIndex: session.slotIndex ?? null,
    templateId: session.templateId ?? null,
    appWidgetId: session.appWidgetId ?? null
  };
};

export const buildWidgetSessionFromRuntimeState = (
  runtimeState: WidgetBridgeRuntimeState,
  categories: Category[]
): ActiveSession => {
  const { category, activity } = findWidgetActivity(categories, runtimeState.categoryId, runtimeState.activityId);
  return {
    id: runtimeState.id,
    activityId: runtimeState.activityId,
    categoryId: runtimeState.categoryId,
    activityName: activity?.name || runtimeState.label || '计时器',
    activityIcon: activity?.icon || runtimeState.icon || FALLBACK_WIDGET_ICON,
    activityUiIcon: activity?.uiIcon,
    startTime: runtimeState.startedAt,
    linkedTodoId: runtimeState.linkedTodoId || undefined,
    scopeIds: runtimeState.scopeIds ?? undefined,
    source: runtimeState.source || 'widget',
    widgetType: normalizeWidgetType(runtimeState.widgetType),
    slotIndex: runtimeState.slotIndex ?? undefined,
    templateId: runtimeState.templateId ?? undefined,
    appWidgetId: runtimeState.appWidgetId ?? undefined
  };
};

export const buildLogFromWidgetPendingAction = (action: WidgetBridgePendingAction): Log => ({
  id: action.id,
  activityId: action.activityId,
  categoryId: action.categoryId,
  startTime: action.startedAt,
  endTime: action.endedAt,
  duration: Math.max(0, (action.endedAt - action.startedAt) / 1000),
  note: '',
  title: action.label || undefined,
  linkedTodoId: action.linkedTodoId || undefined,
  scopeIds: action.scopeIds ?? undefined
});

export const buildDailyWidgetSyncPayload = ({
  dailyReviews,
  checkTemplates,
  date = new Date()
}: {
  dailyReviews: DailyReview[];
  checkTemplates: CheckTemplate[];
  date?: Date;
}): WidgetBridgeDailySyncPayload => {
  const dateStr = getLocalDateStr(date);
  const items: WidgetBridgeDailyCheckMeta[] = getEligibleNfcDailyCheckItems(checkTemplates).map((item) => ({
    checkTemplateId: item.checkTemplateId,
    checkItemId: item.checkItemId,
    content: item.content,
    category: item.category,
    manualMode: item.manualMode,
    targetCount: item.targetCount,
    icon: item.icon ?? null,
    uiIcon: item.uiIcon ?? null
  }));

  const progress: WidgetBridgeDailyProgress[] = items.map((item) => {
    const state = getDailyCheckProgressForDate({
      dateStr,
      dailyReviews,
      checkTemplates,
      checkItemId: item.checkItemId
    });

    return {
      checkItemId: item.checkItemId,
      date: dateStr,
      manualMode: state.manualMode,
      currentCount: state.currentCount,
      targetCount: state.targetCount,
      isCompleted: state.isCompleted,
      updatedAt: Date.now()
    };
  });

  return {
    date: dateStr,
    items,
    progress,
    syncedAt: Date.now()
  };
};

export const buildWidgetTimerSlotConfig = buildTimerWidgetSlotConfig;
export const rebuildWidgetTimerSlotConfig = rebuildTimerWidgetSlotConfig;

const DAILY_RUNTIME_SEGMENT_COUNT = 24 * 6;
const DAILY_RUNTIME_SEGMENT_MINUTES = 10;
const DAILY_RUNTIME_EMPTY_COLOR = '#F1F5F9';

type DailyRuntimeAccumulator = {
  itemId: string;
  itemName: string;
  color: string;
  minutes: number;
};

type DailyRuntimeEntityMeta = {
  itemId: string;
  itemName: string;
  color: string;
};

const clampRange = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const formatDailyRuntimeDate = (date: Date): string => getLocalDateStr(date);

const getDailyRuntimeDayBounds = (date: Date) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return {
    dayStartMs: dayStart.getTime(),
    dayEndMs: dayEnd.getTime()
  };
};

const buildDailyRuntimeMeta = (
  itemId: string,
  itemName: string,
  color: string
): DailyRuntimeEntityMeta => ({
  itemId,
  itemName,
  color
});

const buildCategoryRuntimeMeta = (category: Category): DailyRuntimeEntityMeta =>
  buildDailyRuntimeMeta(
    category.id,
    category.name,
    getColorHexForCharts(category.themeColor || '') || DAILY_RUNTIME_EMPTY_COLOR
  );

const buildActivityRuntimeMeta = (
  category: Category,
  activity: Category['activities'][number]
): DailyRuntimeEntityMeta =>
  buildDailyRuntimeMeta(
    activity.id,
    activity.name,
    getColorHexForCharts(activity.color || category.themeColor || '') || DAILY_RUNTIME_EMPTY_COLOR
  );

const buildDailyRuntimeViewData = ({
  logs,
  activeSessions,
  date,
  now,
  entityMetaById,
  resolveEntityId
}: {
  logs: Log[];
  activeSessions: ActiveSession[];
  date: Date;
  now: number;
  entityMetaById: Map<string, DailyRuntimeEntityMeta>;
  resolveEntityId: (
    entry: Pick<Log, 'categoryId' | 'activityId'> | Pick<ActiveSession, 'categoryId' | 'activityId'>
  ) => string | null;
}): WidgetBridgeDailyRuntimeViewData => {
  const { dayStartMs, dayEndMs } = getDailyRuntimeDayBounds(date);
  const segmentBuckets = Array.from({ length: DAILY_RUNTIME_SEGMENT_COUNT }, () => new Map<string, number>());
  const legendBuckets = new Map<string, DailyRuntimeAccumulator>();

  const accumulateRange = (itemId: string, startMs: number, endMs: number) => {
    const safeStart = clampRange(startMs, dayStartMs, dayEndMs);
    const safeEnd = clampRange(endMs, dayStartMs, dayEndMs);
    if (safeEnd <= safeStart) {
      return;
    }

    const meta = entityMetaById.get(itemId);
    if (!meta) {
      return;
    }

    const durationMinutes = (safeEnd - safeStart) / 60000;
    const existingLegend = legendBuckets.get(itemId);
    if (existingLegend) {
      existingLegend.minutes += durationMinutes;
    } else {
      legendBuckets.set(itemId, {
        itemId: meta.itemId,
        itemName: meta.itemName,
        color: meta.color,
        minutes: durationMinutes
      });
    }

    for (let segmentIndex = 0; segmentIndex < DAILY_RUNTIME_SEGMENT_COUNT; segmentIndex += 1) {
      const segmentStart = dayStartMs + segmentIndex * DAILY_RUNTIME_SEGMENT_MINUTES * 60000;
      const segmentEnd = segmentStart + DAILY_RUNTIME_SEGMENT_MINUTES * 60000;
      const overlapMs = Math.min(safeEnd, segmentEnd) - Math.max(safeStart, segmentStart);
      if (overlapMs <= 0) {
        continue;
      }

      const bucket = segmentBuckets[segmentIndex];
      bucket.set(itemId, (bucket.get(itemId) || 0) + overlapMs / 60000);
    }
  };

  logs.forEach((log) => {
    const itemId = resolveEntityId(log);
    if (!itemId) {
      return;
    }
    accumulateRange(itemId, log.startTime, log.endTime);
  });

  activeSessions.forEach((session) => {
    const itemId = resolveEntityId(session);
    if (!itemId) {
      return;
    }
    accumulateRange(itemId, session.startTime, now);
  });

  const segments: WidgetBridgeDailyRuntimeSegment[] = segmentBuckets.map((bucket, index) => {
    let dominantItemId: string | null = null;
    let dominantMinutes = 0;
    bucket.forEach((minutes, itemId) => {
      if (minutes > dominantMinutes) {
        dominantItemId = itemId;
        dominantMinutes = minutes;
      }
    });

    if (!dominantItemId) {
      return {
        index,
        itemId: null,
        itemName: null,
        color: null,
        minutes: 0
      };
    }

    const meta = entityMetaById.get(dominantItemId);
    return {
      index,
      itemId: dominantItemId,
      itemName: meta?.itemName || null,
      color: meta?.color || DAILY_RUNTIME_EMPTY_COLOR,
      minutes: Math.round(dominantMinutes)
    };
  });

  const legend: WidgetBridgeDailyRuntimeLegendItem[] = Array.from(legendBuckets.values())
    .sort((left, right) => right.minutes - left.minutes)
    .map((item) => ({
      itemId: item.itemId,
      itemName: item.itemName,
      color: item.color,
      totalMinutes: Math.round(item.minutes)
    }));

  return {
    segments,
    legend
  };
};

export const buildDailyRuntimeWidgetPayload = ({
  logs,
  activeSessions,
  categories,
  date = new Date(),
  now = Date.now()
}: {
  logs: Log[];
  activeSessions: ActiveSession[];
  categories: Category[];
  date?: Date;
  now?: number;
}): WidgetBridgeDailyRuntimePayload => {
  const categoryMetaById = new Map(
    categories.map((category) => [category.id, buildCategoryRuntimeMeta(category)] as const)
  );
  const activityMetaById = new Map(
    categories.flatMap((category) =>
      category.activities.map((activity) => [activity.id, buildActivityRuntimeMeta(category, activity)] as const)
    )
  );

  const categoryView = buildDailyRuntimeViewData({
    logs,
    activeSessions,
    date,
    now,
    entityMetaById: categoryMetaById,
    resolveEntityId: (entry) => entry.categoryId || null
  });

  const activityView = buildDailyRuntimeViewData({
    logs,
    activeSessions,
    date,
    now,
    entityMetaById: activityMetaById,
    resolveEntityId: (entry) => entry.activityId || null
  });

  return {
    date: formatDailyRuntimeDate(date),
    totalMinutes: Math.round(
      categoryView.legend.reduce((total, item) => total + item.totalMinutes, 0)
    ),
    categoryView,
    activityView,
    syncedAt: now
  };
};

const TODO_PIN_BADGE_PIN: WidgetBridgeTodoPinItem['badgeLabel'] = 'PIN';
const TODO_PIN_BADGE_TODAY: WidgetBridgeTodoPinItem['badgeLabel'] = 'TODAY';

const resolveTodoPinLinkedTarget = (
  todo: TodoItem,
  todos: TodoItem[],
  categories: Category[]
): {
  categoryId: string | null;
  activityId: string | null;
  activityLabel: string | null;
  icon: string | null;
  color: string | null;
} => {
  const candidateTodos: TodoItem[] = [todo];
  const parentTodo = todo.parentTodoId
    ? todos.find((item) => item.id === todo.parentTodoId)
    : null;

  if (parentTodo) {
    candidateTodos.push(parentTodo);
  }

  for (const candidate of candidateTodos) {
    const linkedCategory = candidate.linkedCategoryId
      ? categories.find((category) => category.id === candidate.linkedCategoryId)
      : undefined;
    const linkedActivity = candidate.linkedActivityId
      ? linkedCategory?.activities.find((activity) => activity.id === candidate.linkedActivityId)
        || categories.flatMap((category) => category.activities).find((activity) => activity.id === candidate.linkedActivityId)
      : undefined;
    const resolvedCategoryId = linkedCategory?.id
      || (linkedActivity
        ? categories.find((category) => category.activities.some((activity) => activity.id === linkedActivity.id))?.id
        : null)
      || null;
    const resolvedCategory = resolvedCategoryId
      ? categories.find((category) => category.id === resolvedCategoryId)
      : linkedCategory;

    if (resolvedCategoryId && linkedActivity?.id) {
      return {
        categoryId: resolvedCategoryId,
        activityId: linkedActivity.id,
        activityLabel: linkedActivity.name,
        icon: linkedActivity.icon || resolvedCategory?.icon || null,
        color: getColorHexForCharts(linkedActivity.color || resolvedCategory?.themeColor || '') || null
      };
    }
  }

  return {
    categoryId: null,
    activityId: null,
    activityLabel: null,
    icon: null,
    color: null
  };
};

export const buildTodoPinWidgetPayload = ({
  todos,
  categories,
  date = new Date(),
  now = Date.now()
}: {
  todos: TodoItem[];
  categories: Category[];
  date?: Date;
  now?: number;
}): WidgetBridgeTodoPinPayload => {
  const visibleTodos = getTodoAssociationTodayTodos(todos, date);

  return {
    date: getLocalDateStr(date),
    items: visibleTodos.map((todo) => {
      const linkedTarget = resolveTodoPinLinkedTarget(todo, todos, categories);

      return {
        todoId: todo.id,
        title: todo.title,
        badgeLabel: todo.pin ? TODO_PIN_BADGE_PIN : TODO_PIN_BADGE_TODAY,
        categoryId: linkedTarget.categoryId,
        activityId: linkedTarget.activityId,
        activityLabel: linkedTarget.activityLabel,
        icon: linkedTarget.icon,
        color: linkedTarget.color,
        scopeIds: todo.defaultScopeIds ?? null
      };
    }),
    syncedAt: now
  };
};

const buildTrackingCalendarWindowStartDate = (date: Date): string => {
  const windowStart = new Date(date);
  windowStart.setHours(0, 0, 0, 0);
  windowStart.setDate(windowStart.getDate() - TRACKING_CALENDAR_LOOKBACK_DAYS);
  return getLocalDateStr(windowStart);
};

const createTrackingCalendarDayValueMap = () => new Map<string, number>();

const addTrackingCalendarDayValue = (
  dayValues: Map<string, number>,
  dateStr: string,
  amount: number
) => {
  if (!dateStr || amount <= 0) {
    return;
  }
  dayValues.set(dateStr, (dayValues.get(dateStr) || 0) + amount);
};

const getExpandedLogsForTracking = (
  logs: Log[],
  activeSessions: ActiveSession[],
  now: number
): Log[] => {
  const sessionLogs: Log[] = activeSessions
    .filter((session) => now > session.startTime)
    .map((session) => ({
      id: `active-session-${session.id}`,
      activityId: session.activityId,
      categoryId: session.categoryId,
      startTime: session.startTime,
      endTime: now,
      duration: Math.max(0, (now - session.startTime) / 1000),
      linkedTodoId: session.linkedTodoId,
      scopeIds: session.scopeIds
    }));

  return [...logs, ...sessionLogs].flatMap((log) => {
    if (log.endTime <= log.startTime) {
      return [];
    }

    if (new Date(log.startTime).toDateString() === new Date(log.endTime).toDateString()) {
      return [log];
    }

    const { id: _id, ...baseLog } = log;
    return splitLogByDays(baseLog);
  });
};

const buildTrackingEntriesFromDayValues = (
  dayValues: Map<string, number>,
  windowStartDate: string
): WidgetBridgeTrackingCalendarEntry[] =>
  Array.from(dayValues.entries())
    .filter(([date]) => date >= windowStartDate)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      date,
      value: Math.max(0, Math.round(value))
    }));

export const buildTrackingCalendarWidgetPayload = ({
  templates,
  logs,
  activeSessions,
  categories,
  scopes,
  dailyReviews,
  checkTemplates,
  date = new Date(),
  now = Date.now()
}: {
  templates: WidgetTemplate[];
  logs: Log[];
  activeSessions: ActiveSession[];
  categories: Category[];
  scopes: Array<{ id: string; name: string; icon: string; uiIcon?: string; themeColor: string }>;
  dailyReviews: DailyReview[];
  checkTemplates: CheckTemplate[];
  date?: Date;
  now?: number;
}): WidgetBridgeTrackingCalendarPayload => {
  const trackingTemplates = normalizeWidgetTemplates(templates).filter(
    (template) =>
      normalizeWidgetTemplateType(template.templateType) === 'trackingCalendar'
      && isWidgetTemplateConfigured(template)
  );
  const windowStartDate = buildTrackingCalendarWindowStartDate(date);
  const expandedLogs = getExpandedLogsForTracking(logs, activeSessions, now);

  return {
    templates: trackingTemplates.map((template) => {
      const config = normalizeTrackingCalendarConfig(template.trackingConfig);
      const dayValues = createTrackingCalendarDayValueMap();

      if (config?.sourceType === 'tag' && config.categoryId && config.activityId) {
        expandedLogs.forEach((log) => {
          if (log.categoryId !== config.categoryId || log.activityId !== config.activityId) {
            return;
          }
          addTrackingCalendarDayValue(
            dayValues,
            getLocalDateStr(new Date(log.startTime)),
            log.duration / 60
          );
        });
      } else if (config?.sourceType === 'scope' && config.scopeId) {
        expandedLogs.forEach((log) => {
          if (!log.scopeIds?.includes(config.scopeId!)) {
            return;
          }
          addTrackingCalendarDayValue(
            dayValues,
            getLocalDateStr(new Date(log.startTime)),
            log.duration / 60
          );
        });
      } else if (config?.sourceType === 'daily' && config.checkItemId) {
        dailyReviews.forEach((review) => {
          if (!review.date || review.date < windowStartDate) {
            return;
          }

          const itemIndex = findCheckItemIndexInReview(review, checkTemplates, config.checkItemId!);
          if (itemIndex < 0) {
            return;
          }

          const checkItem = review.checkItems?.[itemIndex];
          if (!checkItem) {
            return;
          }

          if (checkItem.manualMode === 'count') {
            const countState = getCheckItemCountState(checkItem);
            if (countState.isCompleted) {
              addTrackingCalendarDayValue(dayValues, review.date, 1);
            }
            return;
          }

          if (checkItem.isCompleted) {
            addTrackingCalendarDayValue(dayValues, review.date, 1);
          }
        });
      }

      return {
        templateId: template.id,
        entries: buildTrackingEntriesFromDayValues(dayValues, windowStartDate)
      };
    }),
    syncedAt: now
  };
};
