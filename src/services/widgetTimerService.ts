/**
 * @file widgetTimerService.ts
 * @input Category/activity data, ActiveSession state, widget bridge payloads
 * @output Widget template persistence helpers and app/native conversion utilities
 * @pos Service
 * @description Centralizes the shared types and conversions used by the Android timer widget feature.
 * @updated 2026-04-13: Added slot-level todo/scope associations and custom emoji overrides for widget templates.
 */
import { Capacitor } from '@capacitor/core';
import { ActiveSession, Category, Log } from '../types';
import type {
  WidgetBridgeInstanceBinding,
  WidgetBridgePendingAction,
  WidgetBridgeRuntimeState,
  WidgetBridgeSlot,
  WidgetBridgeTemplate
} from '../plugins/WidgetBridgePlugin';
import { getColorHexForCharts } from '../utils/colorAdapterUtils';

const LEGACY_WIDGET_TIMER_STORAGE_KEY = 'lumostime_widget_timer_slots_v1';
const WIDGET_TEMPLATE_STORAGE_KEY = 'lumostime_widget_templates_v1';
const FALLBACK_WIDGET_ICON = '\u2022';

const normalizeNullableString = (value?: string | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed && trimmed.toLowerCase() !== 'null' ? trimmed : null;
};

export const DEFAULT_WIDGET_TEMPLATE_NAME = '我的小组件';
export const DEFAULT_WIDGET_SIZE = '2x2';
export const WIDGET_SIZE_OPTIONS = ['2x1', '2x2', '3x2', '4x1', '4x2'] as const;

export type WidgetSize = (typeof WIDGET_SIZE_OPTIONS)[number];
export type WidgetTemplateSlotConfig = WidgetBridgeSlot;
export type WidgetTemplate = WidgetBridgeTemplate;
export type WidgetInstanceBinding = WidgetBridgeInstanceBinding;

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

const createWidgetTemplateId = () =>
  `widget-template-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const normalizeWidgetSize = (size?: string | null): WidgetSize =>
  WIDGET_SIZE_OPTIONS.includes((size || '') as WidgetSize)
    ? (size as WidgetSize)
    : DEFAULT_WIDGET_SIZE;

export const getWidgetSlotCountBySize = (size: WidgetSize): number => WIDGET_SIZE_SLOT_COUNT[size];

export const getWidgetGridBySize = (size: WidgetSize): { columns: number; rows: number } =>
  WIDGET_SIZE_GRID[size];

export const getWidgetSizeLabel = (size: WidgetSize): string => size;

export const createEmptyWidgetTemplateSlot = (slotIndex: number): WidgetTemplateSlotConfig => ({
  slotIndex,
  activityId: null,
  categoryId: null,
  icon: null,
  customIcon: null,
  uiIconAssetPath: null,
  uiIconFallbackAssetPath: null,
  label: null,
  color: null,
  linkedTodoId: null,
  scopeIds: null
});

export const createEmptyWidgetTemplateSlots = (
  size: WidgetSize = DEFAULT_WIDGET_SIZE
): WidgetTemplateSlotConfig[] =>
  Array.from({ length: getWidgetSlotCountBySize(size) }, (_, slotIndex) =>
    createEmptyWidgetTemplateSlot(slotIndex)
  );

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
      activityId: normalizeNullableString(slot?.activityId),
      categoryId: normalizeNullableString(slot?.categoryId),
      icon: normalizeNullableString(slot?.icon),
      customIcon: normalizeNullableString(slot?.customIcon),
      uiIconAssetPath: normalizeNullableString(slot?.uiIconAssetPath),
      uiIconFallbackAssetPath: normalizeNullableString(slot?.uiIconFallbackAssetPath),
      label: normalizeNullableString(slot?.label),
      color: normalizeNullableString(slot?.color),
      linkedTodoId: normalizeNullableString(slot?.linkedTodoId),
      scopeIds: slot?.scopeIds?.filter(Boolean) ?? null
    };
  });
};

export const resizeWidgetTemplateSlots = (
  slots: WidgetTemplateSlotConfig[],
  size: WidgetSize
): WidgetTemplateSlotConfig[] => normalizeWidgetTemplateSlots(slots, size);

export const isWidgetTemplateConfigured = (template: WidgetTemplate): boolean =>
  template.slots.some((slot) => Boolean(slot.activityId && slot.categoryId));

export const createWidgetTemplate = (
  name?: string,
  size: WidgetSize = DEFAULT_WIDGET_SIZE
): WidgetTemplate => {
  const now = Date.now();
  return {
    id: createWidgetTemplateId(),
    name: name?.trim() || DEFAULT_WIDGET_TEMPLATE_NAME,
    size,
    slots: createEmptyWidgetTemplateSlots(size),
    createdAt: now,
    updatedAt: now
  };
};

export const normalizeWidgetTemplate = (
  template: Partial<WidgetTemplate> & Pick<WidgetTemplate, 'id'>
): WidgetTemplate => {
  const size = normalizeWidgetSize(template.size);
  return {
    id: template.id,
    name: template.name?.trim() || DEFAULT_WIDGET_TEMPLATE_NAME,
    size,
    slots: normalizeWidgetTemplateSlots(template.slots || [], size),
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

export const buildWidgetTimerSlotConfig = (
  category: Category,
  activity: Category['activities'][number],
  slotIndex: number,
  overrides?: {
    linkedTodoId?: string | null;
    scopeIds?: string[] | null;
    customIcon?: string | null;
  }
): WidgetTemplateSlotConfig => ({
  slotIndex,
  activityId: activity.id,
  categoryId: category.id,
  icon: normalizeNullableString(overrides?.customIcon) || activity.icon || category.icon,
  customIcon: normalizeNullableString(overrides?.customIcon),
  uiIconAssetPath: null,
  uiIconFallbackAssetPath: null,
  label: activity.name,
  color: getColorHexForCharts(activity.color || category.themeColor || ''),
  linkedTodoId: normalizeNullableString(overrides?.linkedTodoId),
  scopeIds: overrides?.scopeIds?.filter(Boolean) ?? null
});

export const findWidgetActivity = (categories: Category[], categoryId: string, activityId: string) => {
  const category = categories.find((item) => item.id === categoryId);
  const activity = category?.activities.find((item) => item.id === activityId);
  return { category, activity };
};

export const rebuildWidgetTimerSlotConfig = (
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

  return buildWidgetTimerSlotConfig(category, activity, slot.slotIndex, {
    linkedTodoId: slot.linkedTodoId ?? null,
    scopeIds: slot.scopeIds ?? null,
    customIcon: slot.customIcon ?? null
  });
};

export const rebuildWidgetTemplate = (
  template: WidgetTemplate,
  categories: Category[]
): WidgetTemplate => ({
  ...template,
  updatedAt: Date.now(),
  slots: normalizeWidgetTemplateSlots(
    template.slots.map((slot) => rebuildWidgetTimerSlotConfig(slot, categories)),
    template.size
  )
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
    console.error('[widgetTimerService] Failed to parse legacy widget config from localStorage', error);
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
    console.error('[widgetTimerService] Failed to parse widget templates from localStorage', error);
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
  slots: resizeWidgetTemplateSlots(template.slots, size),
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
  const { category, activity } = findWidgetActivity(categories, session.categoryId, session.activityId);
  return {
    id: session.id,
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
    activityName: activity?.name || runtimeState.label || '小组件计时器',
    activityIcon: activity?.icon || runtimeState.icon || FALLBACK_WIDGET_ICON,
    activityUiIcon: activity?.uiIcon,
    startTime: runtimeState.startedAt,
    linkedTodoId: runtimeState.linkedTodoId || undefined,
    scopeIds: runtimeState.scopeIds ?? undefined,
    source: runtimeState.source || 'widget',
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
