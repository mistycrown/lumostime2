/**
 * @file widgetTimerService.ts
 * @input Category/activity data, ActiveSession state, widget bridge payloads
 * @output Widget config persistence helpers and app/native conversion utilities
 * @pos Service
 * @description Centralizes the shared types and conversions used by the Android timer widget feature.
 * @updated 2026-04-13: Localized widget fallback label to Chinese.
 */
import { Capacitor } from '@capacitor/core';
import { ActiveSession, Category, Log } from '../types';
import type {
  WidgetBridgePendingAction,
  WidgetBridgeRuntimeState,
  WidgetBridgeSlot
} from '../plugins/WidgetBridgePlugin';
import { getColorHexForCharts } from '../utils/colorAdapterUtils';

export const WIDGET_TIMER_SLOT_COUNT = 4;
const WIDGET_TIMER_STORAGE_KEY = 'lumostime_widget_timer_slots_v1';
const FALLBACK_WIDGET_ICON = '\u2022';

export type WidgetTimerSlotConfig = WidgetBridgeSlot;

export const createEmptyWidgetTimerSlots = (): WidgetTimerSlotConfig[] =>
  Array.from({ length: WIDGET_TIMER_SLOT_COUNT }, (_, slotIndex) => ({
    slotIndex,
    activityId: null,
    categoryId: null,
    icon: null,
    label: null,
    color: null
  }));

export const normalizeWidgetTimerSlots = (slots: WidgetTimerSlotConfig[]): WidgetTimerSlotConfig[] => {
  const slotMap = new Map(slots.map((slot) => [slot.slotIndex, slot]));
  return Array.from({ length: WIDGET_TIMER_SLOT_COUNT }, (_, slotIndex) => {
    const slot = slotMap.get(slotIndex);
    return {
      slotIndex,
      activityId: slot?.activityId ?? null,
      categoryId: slot?.categoryId ?? null,
      icon: slot?.icon ?? null,
      label: slot?.label ?? null,
      color: slot?.color ?? null
    };
  });
};

export const loadWidgetTimerSlotsFromStorage = (): WidgetTimerSlotConfig[] => {
  const raw = localStorage.getItem(WIDGET_TIMER_STORAGE_KEY);
  if (!raw) {
    return createEmptyWidgetTimerSlots();
  }

  try {
    return normalizeWidgetTimerSlots(JSON.parse(raw) as WidgetTimerSlotConfig[]);
  } catch (error) {
    console.error('[widgetTimerService] Failed to parse widget config from localStorage', error);
    return createEmptyWidgetTimerSlots();
  }
};

export const saveWidgetTimerSlotsToStorage = (slots: WidgetTimerSlotConfig[]) => {
  localStorage.setItem(WIDGET_TIMER_STORAGE_KEY, JSON.stringify(normalizeWidgetTimerSlots(slots)));
};

export const isNativeAndroidWidgetSupported = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const buildWidgetTimerSlotConfig = (
  category: Category,
  activity: Category['activities'][number],
  slotIndex: number
): WidgetTimerSlotConfig => ({
  slotIndex,
  activityId: activity.id,
  categoryId: category.id,
  icon: activity.icon || category.icon,
  label: activity.name,
  color: getColorHexForCharts(activity.color || category.themeColor || '')
});

export const findWidgetActivity = (categories: Category[], categoryId: string, activityId: string) => {
  const category = categories.find((item) => item.id === categoryId);
  const activity = category?.activities.find((item) => item.id === activityId);
  return { category, activity };
};

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
