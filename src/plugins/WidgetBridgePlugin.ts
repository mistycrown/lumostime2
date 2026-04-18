/**
 * @file WidgetBridgePlugin.ts
 * @input Native widget bridge calls
 * @output Typed Capacitor widget bridge methods
 * @pos Plugin
 * @description Exposes the Android widget template, instance binding state, and runtime bridge to the React application.
 * @updated 2026-04-18: Moved widget type selection from template level to slot level so mixed-type templates can share one contract.
 */
import { registerPlugin } from '@capacitor/core';
import { ShortcutWidgetAction } from '../services/widgetShortcutService';

export type WidgetType = 'timer' | 'daily' | 'shortcut';
export type DailyWidgetManualMode = 'binary' | 'count';

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

export interface WidgetBridgeTemplate {
  id: string;
  name: string;
  size: '2x1' | '2x2' | '3x2' | '4x1' | '4x2';
  slots: WidgetBridgeSlot[];
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
  refreshWidget(options?: { appWidgetId?: number; templateId?: string }): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge', {
  web: () => import('./WidgetBridgePlugin.web').then((m) => new m.WidgetBridgeWeb())
});

export default WidgetBridge;
