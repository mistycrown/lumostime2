/**
 * @file WidgetBridgePlugin.ts
 * @input Native widget bridge calls
 * @output Typed Capacitor widget bridge methods
 * @pos Plugin
 * @description Exposes the Android widget template, instance binding state, and runtime bridge to the React application.
 * @updated 2026-04-25: Added dedicated DAILY_RUNTIME category/activity dual-view payload sync types for native heatmap widgets.
 * @updated 2026-04-26: Added TODAY + PIN widget payload sync types for the dedicated scrollable 4x2 todo widget.
 * @updated 2026-05-01: Added tracking-calendar template/config contracts and payload sync types for the dedicated 2x2 tracking calendar widget.
 * @updated 2026-05-02: Added scene widget payload sync types for the dedicated 4x3 scene widget.
 */
import { registerPlugin } from '@capacitor/core';
import { ShortcutWidgetAction } from '../services/widgetShortcutService';

export type WidgetType = 'timer' | 'daily' | 'shortcut';
export type DailyWidgetManualMode = 'binary' | 'count';
export type WidgetTemplateType = 'grid' | 'trackingCalendar';
export type WidgetTrackingCalendarSourceType = 'tag' | 'scope' | 'daily';
export type WidgetSceneGroupSwitchMode = 'manual' | 'auto';
export type WidgetSceneGroupAutoSwitchMode =
  | 'disabled'
  | 'weekday'
  | 'weekend'
  | 'dateRange'
  | 'customWeekdays';
export type WidgetSceneItemType = 'timer' | 'todo' | 'checklist';

export interface WidgetBridgeSlot {
  slotIndex: number;
  slotType: WidgetType | null;
  activityId: string | null;
  categoryId: string | null;
  icon: string | null;
  customIcon?: string | null;
  uiIconAssetPath?: string | null;
  uiIconFallbackAssetPath?: string | null;
  label: string | null;
  color: string | null;
  linkedTodoId?: string | null;
  scopeIds?: string[] | null;
  checkTemplateId?: string | null;
  checkItemId?: string | null;
  checkManualMode?: DailyWidgetManualMode | null;
  checkTargetCount?: number | null;
  shortcutAction?: ShortcutWidgetAction | null;
}

export interface WidgetBridgeTrackingCalendarConfig {
  sourceType: WidgetTrackingCalendarSourceType | null;
  categoryId?: string | null;
  activityId?: string | null;
  scopeId?: string | null;
  checkTemplateId?: string | null;
  checkItemId?: string | null;
  icon?: string | null;
  customIcon?: string | null;
  uiIconAssetPath?: string | null;
  uiIconFallbackAssetPath?: string | null;
  label?: string | null;
  color?: string | null;
}

export interface WidgetBridgeTemplate {
  id: string;
  name: string;
  size: '2x1' | '2x2' | '3x2' | '4x1' | '4x2';
  templateType?: WidgetTemplateType;
  slots: WidgetBridgeSlot[];
  trackingConfig?: WidgetBridgeTrackingCalendarConfig | null;
  createdAt: number;
  updatedAt: number;
}

export interface WidgetBridgeInstanceBinding {
  appWidgetId: number;
  templateId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface WidgetBridgePendingAction {
  id: string;
  widgetType: WidgetType;
  activityId: string;
  categoryId: string;
  icon: string;
  label: string;
  color: string;
  startedAt: number;
  endedAt: number;
  createdAt: number;
  linkedTodoId?: string | null;
  scopeIds?: string[] | null;
}

export interface WidgetBridgeRuntimeState {
  id: string;
  widgetType: WidgetType;
  activityId: string;
  categoryId: string;
  icon: string;
  label: string;
  color: string;
  startedAt: number;
  source: 'app' | 'widget';
  linkedTodoId?: string | null;
  scopeIds?: string[] | null;
  slotIndex?: number | null;
  templateId?: string | null;
  appWidgetId?: number | null;
}

export interface WidgetBridgeDailyCheckMeta {
  checkTemplateId: string;
  checkItemId: string;
  content: string;
  category: string;
  manualMode: DailyWidgetManualMode;
  targetCount: number;
  icon?: string | null;
  uiIcon?: string | null;
}

export interface WidgetBridgeDailyProgress {
  checkItemId: string;
  date: string;
  manualMode: DailyWidgetManualMode;
  currentCount: number;
  targetCount: number;
  isCompleted: boolean;
  updatedAt: number;
}

export interface WidgetBridgeDailySyncPayload {
  date: string;
  items: WidgetBridgeDailyCheckMeta[];
  progress: WidgetBridgeDailyProgress[];
  syncedAt: number;
}

export interface WidgetBridgePendingDailyAction {
  id: string;
  widgetType: 'daily';
  date: string;
  checkTemplateId?: string | null;
  checkItemId: string;
  actionMode: 'complete_once';
  createdAt: number;
  appWidgetId?: number | null;
  slotIndex?: number | null;
}

export interface WidgetBridgeDailyRuntimeSegment {
  index: number;
  itemId: string | null;
  itemName: string | null;
  color: string | null;
  minutes: number;
}

export interface WidgetBridgeDailyRuntimeLegendItem {
  itemId: string;
  itemName: string;
  color: string;
  totalMinutes: number;
}

export interface WidgetBridgeDailyRuntimeViewData {
  segments: WidgetBridgeDailyRuntimeSegment[];
  legend: WidgetBridgeDailyRuntimeLegendItem[];
}

export interface WidgetBridgeDailyRuntimePayload {
  date: string;
  totalMinutes: number;
  categoryView: WidgetBridgeDailyRuntimeViewData;
  activityView: WidgetBridgeDailyRuntimeViewData;
  syncedAt: number;
}

export interface WidgetBridgeTodoPinItem {
  todoId: string;
  title: string;
  badgeLabel: 'TODAY' | 'PIN';
  categoryId: string | null;
  activityId: string | null;
  activityLabel: string | null;
  icon: string | null;
  color: string | null;
  scopeIds?: string[] | null;
}

export interface WidgetBridgeTodoPinPayload {
  date: string;
  items: WidgetBridgeTodoPinItem[];
  syncedAt: number;
}

export interface WidgetBridgeTrackingCalendarEntry {
  date: string;
  value: number;
}

export interface WidgetBridgeTrackingCalendarTemplatePayload {
  templateId: string;
  entries: WidgetBridgeTrackingCalendarEntry[];
}

export interface WidgetBridgeTrackingCalendarPayload {
  templates: WidgetBridgeTrackingCalendarTemplatePayload[];
  syncedAt: number;
}

export interface WidgetBridgeSceneGroupAutoSwitchConfig {
  mode: WidgetSceneGroupAutoSwitchMode;
  startDate?: string | null;
  endDate?: string | null;
  weekdays?: number[] | null;
}

export interface WidgetBridgeSceneItem {
  id: string;
  itemType: WidgetSceneItemType;
  title: string;
  icon: string;
  color: string;
  activityId?: string | null;
  categoryId?: string | null;
  linkedTodoId?: string | null;
  scopeIds?: string[] | null;
  checkTemplateId?: string | null;
  checkItemId?: string | null;
  checkManualMode?: DailyWidgetManualMode | null;
  checkTargetCount?: number | null;
}

export interface WidgetBridgeSceneTimeSlot {
  id: string;
  name: string;
  icon: string;
  startTime: string;
  endTime: string;
  disableAutoSwitch?: boolean;
  items: WidgetBridgeSceneItem[];
}

export interface WidgetBridgeSceneGroup {
  id: string;
  name: string;
  autoSwitch?: WidgetBridgeSceneGroupAutoSwitchConfig | null;
  timeSlots: WidgetBridgeSceneTimeSlot[];
}

export interface WidgetBridgeScenePayload {
  switchMode: WidgetSceneGroupSwitchMode;
  activeGroupId: string | null;
  groups: WidgetBridgeSceneGroup[];
  syncedAt: number;
}

export interface WidgetBridgePlugin {
  getTemplates(): Promise<{ templates: WidgetBridgeTemplate[] }>;
  saveTemplates(options: { templates: WidgetBridgeTemplate[] }): Promise<void>;
  getInstanceBindings(): Promise<{ bindings: WidgetBridgeInstanceBinding[] }>;
  getPendingActions(): Promise<{ actions: WidgetBridgePendingAction[] }>;
  clearPendingActions(options: { ids: string[] }): Promise<void>;
  getRuntimeState(): Promise<{ runtimeState: WidgetBridgeRuntimeState | null }>;
  syncRuntimeState(options: { runtimeState: WidgetBridgeRuntimeState | null }): Promise<void>;
  getPendingDailyActions(): Promise<{ actions: WidgetBridgePendingDailyAction[] }>;
  clearPendingDailyActions(options: { ids: string[] }): Promise<void>;
  syncDailyWidgetData(options: { payload: WidgetBridgeDailySyncPayload | null }): Promise<void>;
  syncDailyRuntimeWidgetData(options: { payload: WidgetBridgeDailyRuntimePayload | null }): Promise<void>;
  syncTodoPinWidgetData(options: { payload: WidgetBridgeTodoPinPayload | null }): Promise<void>;
  syncTrackingCalendarWidgetData(options: { payload: WidgetBridgeTrackingCalendarPayload | null }): Promise<void>;
  syncSceneWidgetData(options: { payload: WidgetBridgeScenePayload | null }): Promise<void>;
  refreshWidget(options?: { appWidgetId?: number; templateId?: string }): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge', {
  web: () => import('./WidgetBridgePlugin.web').then((m) => new m.WidgetBridgeWeb())
});

export default WidgetBridge;
