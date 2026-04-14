/**
 * @file WidgetBridgePlugin.ts
 * @input Native widget bridge calls
 * @output Typed Capacitor widget bridge methods
 * @pos Plugin
 * @description Exposes the Android widget template, instance binding state, and runtime bridge to the React application.
 * @updated 2026-04-13: Added slot-level todo and scope association fields plus custom emoji overrides.
 */
import { registerPlugin } from '@capacitor/core';

export interface WidgetBridgeSlot {
  slotIndex: number;
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

export interface WidgetBridgePlugin {
  getTemplates(): Promise<{ templates: WidgetBridgeTemplate[] }>;
  saveTemplates(options: { templates: WidgetBridgeTemplate[] }): Promise<void>;
  getInstanceBindings(): Promise<{ bindings: WidgetBridgeInstanceBinding[] }>;
  getPendingActions(): Promise<{ actions: WidgetBridgePendingAction[] }>;
  clearPendingActions(options: { ids: string[] }): Promise<void>;
  getRuntimeState(): Promise<{ runtimeState: WidgetBridgeRuntimeState | null }>;
  syncRuntimeState(options: { runtimeState: WidgetBridgeRuntimeState | null }): Promise<void>;
  refreshWidget(options?: { appWidgetId?: number; templateId?: string }): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge', {
  web: () => import('./WidgetBridgePlugin.web').then((m) => new m.WidgetBridgeWeb())
});

export default WidgetBridge;
