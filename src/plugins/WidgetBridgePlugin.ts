/**
 * @file WidgetBridgePlugin.ts
 * @input Native widget bridge calls
 * @output Typed Capacitor widget bridge methods
 * @pos Plugin
 * @description Exposes the Android widget template, instance binding state, and runtime bridge to the React application.
 * @updated 2026-04-13: Removed the unused manual widget-instance binding API and kept automatic binding support only.
 */
import { registerPlugin } from '@capacitor/core';

export interface WidgetBridgeSlot {
  slotIndex: number;
  activityId: string | null;
  categoryId: string | null;
  icon: string | null;
  uiIconAssetPath?: string | null;
  uiIconFallbackAssetPath?: string | null;
  label: string | null;
  color: string | null;
}

export interface WidgetBridgeTemplate {
  id: string;
  name: string;
  size: '1x2' | '2x1' | '2x2' | '1x4' | '4x1' | '2x4' | '4x2';
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
