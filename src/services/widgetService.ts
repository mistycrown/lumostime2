/**
 * @file widgetService.ts
 * @input Category/activity data, daily template data, ActiveSession state, widget bridge payloads
 * @output Widget template persistence helpers and app/native conversion utilities
 * @pos Service
 * @description Centralizes the shared types and conversions used by the Android widget system while keeping timer widgets and daily widgets on one contract.
 * @updated 2026-04-16: Added daily widget slot helpers and native daily-sync payload builders so timer and daily widgets can share one service layer.
 */
import { Capacitor } from '@capacitor/core';
import { ActiveSession, Category, CheckTemplate, DailyReview, Log } from '../types';
import type {
  DailyWidgetManualMode,
  WidgetBridgeDailyCheckMeta,
  WidgetBridgeDailyProgress,
  WidgetBridgeDailySyncPayload,
  WidgetBridgeInstanceBinding,
  WidgetBridgePendingAction,
  WidgetBridgeRuntimeState,
  WidgetBridgeSlot,
  WidgetBridgeTemplate,
  WidgetType
} from '../plugins/WidgetBridgePlugin';
import { getColorHexForCharts } from '../utils/colorAdapterUtils';
import {
  DailyCheckTemplateMeta,
  getDailyCheckProgressForDate,
  getDailyCheckTemplateMeta,
  getEligibleNfcDailyCheckItems
} from '../utils/dailyCheckUtils';
import { getLocalDateStr } from '../utils/dateUtils';

const LEGACY_WIDGET_TIMER_STORAGE_KEY = 'lumostime_widget_timer_slots_v1';
const WIDGET_TEMPLATE_STORAGE_KEY = 'lumostime_widget_templates_v1';
const FALLBACK_WIDGET_ICON = '\u2022';

export const DEFAULT_WIDGET_TYPE: WidgetType = 'timer';
export const WIDGET_TYPE_OPTIONS: WidgetType[] = ['timer', 'daily'];
export const DAILY_WIDGET_SIZE_OPTIONS = ['2x1', '2x2', '3x2', '4x1', '4x2'] as const;
export const DEFAULT_DAILY_WIDGET_COLOR = '#E7E5E4';
export const DEFAULT_WIDGET_TEMPLATE_NAME = '我的小组件';
export const DEFAULT_WIDGET_SIZE = '2x2';
export const WIDGET_SIZE_OPTIONS = ['2x1', '2x2', '3x2', '4x1', '4x2'] as const;

export type WidgetSize = (typeof WIDGET_SIZE_OPTIONS)[number];
export type WidgetTemplateSlotConfig = WidgetBridgeSlot;
export type WidgetTemplate = WidgetBridgeTemplate;
export type WidgetInstanceBinding = WidgetBridgeInstanceBinding;
export type DailyWidgetSlotBinding = DailyCheckTemplateMeta;

const WIDGET_SIZE_SLOT_COUNT: Record<WidgetSize, number> = {
  '2x1': 2,
  '2x2': 4,
  '3x2': 6,
  '4x1': 4,
  '4x2': 8
};

const WIDGET_SIZE_GRID: Record<WidgetSize, { columns: number; rows: number }> = {
  '2x1': { columns: 2, rows: 1 },
  '2x2': { columns: 2, rows: 2 },
  '3x2': { columns: 3, rows: 2 },
  '4x1': { columns: 4, rows: 1 },
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

export const normalizeWidgetType = (widgetType?: string | null): WidgetType =>
  widgetType === 'daily' || widgetType === 'timer' ? widgetType : DEFAULT_WIDGET_TYPE;

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

export const getWidgetSizeOptionsByType = (widgetType: WidgetType): WidgetSize[] =>
  widgetType === 'daily' ? [...DAILY_WIDGET_SIZE_OPTIONS] : [...WIDGET_SIZE_OPTIONS];

export const createEmptyWidgetTemplateSlot = (
  slotIndex: number,
  widgetType: WidgetType = DEFAULT_WIDGET_TYPE
): WidgetTemplateSlotConfig => ({
  slotIndex,
  widgetType,
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
  checkTargetCount: null
});

export const createEmptyWidgetTemplateSlots = (
  size: WidgetSize = DEFAULT_WIDGET_SIZE,
  widgetType: WidgetType = DEFAULT_WIDGET_TYPE
): WidgetTemplateSlotConfig[] =>
  Array.from({ length: getWidgetSlotCountBySize(size) }, (_, slotIndex) =>
    createEmptyWidgetTemplateSlot(slotIndex, widgetType)
  );

export const normalizeWidgetTemplateSlots = (
  slots: WidgetTemplateSlotConfig[],
  size: WidgetSize = DEFAULT_WIDGET_SIZE,
  widgetType: WidgetType = DEFAULT_WIDGET_TYPE
): WidgetTemplateSlotConfig[] => {
  const normalizedWidgetType = normalizeWidgetType(widgetType);
  const slotCount = getWidgetSlotCountBySize(size);
  const slotMap = new Map(slots.map((slot) => [slot.slotIndex, slot]));

  return Array.from({ length: slotCount }, (_, slotIndex) => {
    const slot = slotMap.get(slotIndex);
    return {
      slotIndex,
      widgetType: normalizeWidgetType(slot?.widgetType || normalizedWidgetType),
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
      checkTargetCount: normalizePositiveInt(slot?.checkTargetCount, null)
    };
  });
};

export const resizeWidgetTemplateSlots = (
  slots: WidgetTemplateSlotConfig[],
  size: WidgetSize,
  widgetType: WidgetType = DEFAULT_WIDGET_TYPE
): WidgetTemplateSlotConfig[] => normalizeWidgetTemplateSlots(slots, size, widgetType);

export const isWidgetTemplateConfigured = (template: WidgetTemplate): boolean =>
  template.widgetType === 'daily'
    ? template.slots.some((slot) => Boolean(slot.checkItemId))
    : template.slots.some((slot) => Boolean(slot.activityId && slot.categoryId));

export const createWidgetTemplate = (
  name?: string,
  size: WidgetSize = DEFAULT_WIDGET_SIZE,
  widgetType: WidgetType = DEFAULT_WIDGET_TYPE
): WidgetTemplate => {
  const normalizedWidgetType = normalizeWidgetType(widgetType);
  const now = Date.now();
  return {
    id: createWidgetTemplateId(),
    widgetType: normalizedWidgetType,
    name: name?.trim() || DEFAULT_WIDGET_TEMPLATE_NAME,
    size,
    slots: createEmptyWidgetTemplateSlots(size, normalizedWidgetType),
    createdAt: now,
    updatedAt: now
  };
};

export const normalizeWidgetTemplate = (
  template: Partial<WidgetTemplate> & Pick<WidgetTemplate, 'id'>
): WidgetTemplate => {
  const widgetType = normalizeWidgetType(template.widgetType);
  const size = normalizeWidgetSize(template.size);
  return {
    id: template.id,
    widgetType,
    name: template.name?.trim() || DEFAULT_WIDGET_TEMPLATE_NAME,
    size,
    slots: normalizeWidgetTemplateSlots(template.slots || [], size, widgetType),
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
    linkedTodoId?: string | null;
    scopeIds?: string[] | null;
    customIcon?: string | null;
    widgetType?: WidgetType;
  }
): WidgetTemplateSlotConfig => ({
  slotIndex,
  widgetType: normalizeWidgetType(overrides?.widgetType),
  activityId: activity.id,
  categoryId: category.id,
  icon: normalizeNullableString(overrides?.customIcon) || activity.icon || category.icon,
  customIcon: normalizeNullableString(overrides?.customIcon),
  uiIconAssetPath: null,
  uiIconFallbackAssetPath: null,
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
    customIcon?: string | null;
    backgroundColor?: string | null;
    widgetType?: WidgetType;
  }
): WidgetTemplateSlotConfig => ({
  slotIndex,
  widgetType: normalizeWidgetType(overrides?.widgetType || 'daily'),
  activityId: null,
  categoryId: null,
  icon: normalizeNullableString(overrides?.customIcon) || binding.icon || FALLBACK_WIDGET_ICON,
  customIcon: normalizeNullableString(overrides?.customIcon),
  uiIconAssetPath: null,
  uiIconFallbackAssetPath: null,
  label: binding.content,
  color: normalizeNullableString(overrides?.backgroundColor) || DEFAULT_DAILY_WIDGET_COLOR,
  linkedTodoId: null,
  scopeIds: null,
  checkTemplateId: binding.checkTemplateId,
  checkItemId: binding.checkItemId,
  checkManualMode: binding.manualMode,
  checkTargetCount: binding.targetCount
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
    return createEmptyWidgetTemplateSlot(slot.slotIndex, normalizeWidgetType(slot.widgetType));
  }

  const { category, activity } = findWidgetActivity(categories, slot.categoryId, slot.activityId);
  if (!category || !activity) {
    return createEmptyWidgetTemplateSlot(slot.slotIndex, normalizeWidgetType(slot.widgetType));
  }

  return buildTimerWidgetSlotConfig(category, activity, slot.slotIndex, {
    linkedTodoId: slot.linkedTodoId ?? null,
    scopeIds: slot.scopeIds ?? null,
    customIcon: slot.customIcon ?? null,
    widgetType: slot.widgetType
  });
};

export const rebuildDailyWidgetSlotConfig = (
  slot: WidgetTemplateSlotConfig,
  checkTemplates: CheckTemplate[]
): WidgetTemplateSlotConfig => {
  if (!slot.checkItemId) {
    return createEmptyWidgetTemplateSlot(slot.slotIndex, normalizeWidgetType(slot.widgetType));
  }

  const binding = findDailyWidgetBinding(checkTemplates, slot.checkItemId);
  if (!binding) {
    return createEmptyWidgetTemplateSlot(slot.slotIndex, normalizeWidgetType(slot.widgetType));
  }

  return buildDailyWidgetSlotConfig(binding, slot.slotIndex, {
    customIcon: slot.customIcon ?? null,
    backgroundColor: slot.color ?? DEFAULT_DAILY_WIDGET_COLOR,
    widgetType: slot.widgetType
  });
};

export const rebuildWidgetTemplate = (
  template: WidgetTemplate,
  categories: Category[],
  checkTemplates: CheckTemplate[] = []
): WidgetTemplate => ({
  ...template,
  widgetType: normalizeWidgetType(template.widgetType),
  updatedAt: Date.now(),
  slots: normalizeWidgetTemplateSlots(
    template.slots.map((slot) =>
      template.widgetType === 'daily'
        ? rebuildDailyWidgetSlotConfig(slot, checkTemplates)
        : rebuildTimerWidgetSlotConfig(slot, categories)
    ),
    template.size,
    template.widgetType
  )
});

const loadLegacyWidgetTimerSlotsFromStorage = (): WidgetTemplateSlotConfig[] => {
  const raw = localStorage.getItem(LEGACY_WIDGET_TIMER_STORAGE_KEY);
  if (!raw) {
    return createEmptyWidgetTemplateSlots(DEFAULT_WIDGET_SIZE, DEFAULT_WIDGET_TYPE);
  }

  try {
    return normalizeWidgetTemplateSlots(
      JSON.parse(raw) as WidgetTemplateSlotConfig[],
      DEFAULT_WIDGET_SIZE,
      DEFAULT_WIDGET_TYPE
    );
  } catch (error) {
    console.error('[widgetService] Failed to parse legacy widget config from localStorage', error);
    return createEmptyWidgetTemplateSlots(DEFAULT_WIDGET_SIZE, DEFAULT_WIDGET_TYPE);
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
    widgetType: DEFAULT_WIDGET_TYPE,
    name: DEFAULT_WIDGET_TEMPLATE_NAME,
    size: DEFAULT_WIDGET_SIZE,
    slots: legacySlots,
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
};

export const updateWidgetTemplateSize = (
  template: WidgetTemplate,
  size: WidgetSize
): WidgetTemplate => ({
  ...template,
  size,
  slots: resizeWidgetTemplateSlots(template.slots, size, template.widgetType),
  updatedAt: Date.now()
});

export const updateWidgetTemplateSlots = (
  template: WidgetTemplate,
  slots: WidgetTemplateSlotConfig[]
): WidgetTemplate => ({
  ...template,
  slots: normalizeWidgetTemplateSlots(slots, template.size, template.widgetType),
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
