/**
 * @file widgetTimerService.ts
 * @input Category/activity data, ActiveSession state, widget bridge payloads
 * @output Widget template persistence helpers and app/native conversion utilities
 * @pos Service
 * @description Centralizes the shared types and conversions used by the Android timer widget feature.
 * @updated 2026-04-13: Refactored widget config from single shared slots to template library storage with legacy migration.
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

export const WIDGET_TIMER_SLOT_COUNT = 4;
const LEGACY_WIDGET_TIMER_STORAGE_KEY = 'lumostime_widget_timer_slots_v1';
const WIDGET_TEMPLATE_STORAGE_KEY = 'lumostime_widget_templates_v1';
const FALLBACK_WIDGET_ICON = '\u2022';
export const DEFAULT_WIDGET_TEMPLATE_NAME = '我的小组件';

export type WidgetTemplateSlotConfig = WidgetBridgeSlot;
export type WidgetTemplate = WidgetBridgeTemplate;
export type WidgetInstanceBinding = WidgetBridgeInstanceBinding;

const createWidgetTemplateId = () =>
  `widget-template-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const createEmptyWidgetTemplateSlot = (slotIndex: number): WidgetTemplateSlotConfig => ({
  slotIndex,
  activityId: null,
  categoryId: null,
  icon: null,
  uiIconAssetPath: null,
  uiIconFallbackAssetPath: null,
  label: null,
  color: null
});

export const createEmptyWidgetTemplateSlots = (): WidgetTemplateSlotConfig[] =>
  Array.from({ length: WIDGET_TIMER_SLOT_COUNT }, (_, slotIndex) => createEmptyWidgetTemplateSlot(slotIndex));

export const normalizeWidgetTemplateSlots = (
  slots: WidgetTemplateSlotConfig[]
): WidgetTemplateSlotConfig[] => {
  const slotMap = new Map(slots.map((slot) => [slot.slotIndex, slot]));
  return Array.from({ length: WIDGET_TIMER_SLOT_COUNT }, (_, slotIndex) => {
    const slot = slotMap.get(slotIndex);
    return {
      slotIndex,
      activityId: slot?.activityId ?? null,
      categoryId: slot?.categoryId ?? null,
      icon: slot?.icon ?? null,
      uiIconAssetPath: slot?.uiIconAssetPath ?? null,
      uiIconFallbackAssetPath: slot?.uiIconFallbackAssetPath ?? null,
      label: slot?.label ?? null,
      color: slot?.color ?? null
    };
  });
};

export const isWidgetTemplateConfigured = (template: WidgetTemplate): boolean =>
  template.slots.some((slot) => Boolean(slot.activityId && slot.categoryId));

export const createWidgetTemplate = (name?: string): WidgetTemplate => {
  const now = Date.now();
  return {
    id: createWidgetTemplateId(),
    name: name?.trim() || DEFAULT_WIDGET_TEMPLATE_NAME,
    slots: createEmptyWidgetTemplateSlots(),
    createdAt: now,
    updatedAt: now
  };
};

export const normalizeWidgetTemplate = (template: WidgetTemplate): WidgetTemplate => ({
  id: template.id,
  name: template.name?.trim() || DEFAULT_WIDGET_TEMPLATE_NAME,
  slots: normalizeWidgetTemplateSlots(template.slots || []),
  createdAt: Number.isFinite(template.createdAt) ? template.createdAt : Date.now(),
  updatedAt: Number.isFinite(template.updatedAt) ? template.updatedAt : Date.now()
});

export const normalizeWidgetTemplates = (templates: WidgetTemplate[]): WidgetTemplate[] => {
  const seen = new Set<string>();
  return templates
    .map(normalizeWidgetTemplate)
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
  slotIndex: number
): WidgetTemplateSlotConfig => ({
  slotIndex,
  activityId: activity.id,
  categoryId: category.id,
  icon: activity.icon || category.icon,
  uiIconAssetPath: null,
  uiIconFallbackAssetPath: null,
  label: activity.name,
  color: getColorHexForCharts(activity.color || category.themeColor || '')
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

  return buildWidgetTimerSlotConfig(category, activity, slot.slotIndex);
};

export const rebuildWidgetTemplate = (
  template: WidgetTemplate,
  categories: Category[]
): WidgetTemplate => ({
  ...template,
  updatedAt: Date.now(),
  slots: normalizeWidgetTemplateSlots(
    template.slots.map((slot) => rebuildWidgetTimerSlotConfig(slot, categories))
  )
});

const loadLegacyWidgetTimerSlotsFromStorage = (): WidgetTemplateSlotConfig[] => {
  const raw = localStorage.getItem(LEGACY_WIDGET_TIMER_STORAGE_KEY);
  if (!raw) {
    return createEmptyWidgetTemplateSlots();
  }

  try {
    return normalizeWidgetTemplateSlots(JSON.parse(raw) as WidgetTemplateSlotConfig[]);
  } catch (error) {
    console.error('[widgetTimerService] Failed to parse legacy widget config from localStorage', error);
    return createEmptyWidgetTemplateSlots();
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

export const renameWidgetTemplate = (template: WidgetTemplate, name: string): WidgetTemplate => ({
  ...template,
  name: name.trim() || DEFAULT_WIDGET_TEMPLATE_NAME,
  updatedAt: Date.now()
});

export const updateWidgetTemplateSlots = (
  template: WidgetTemplate,
  slots: WidgetTemplateSlotConfig[]
): WidgetTemplate => ({
  ...template,
  slots: normalizeWidgetTemplateSlots(slots),
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
    source: session.source || 'app'
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
    source: runtimeState.source || 'widget'
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
  title: action.label || undefined
});
