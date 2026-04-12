/**
 * @file WidgetBridgePlugin.ts
 * @input Native widget bridge calls
 * @output Typed Capacitor widget bridge methods
 * @pos Plugin
 * @description Exposes the Android widget config/runtime bridge to the React application.
 */
import { registerPlugin } from '@capacitor/core';

export interface WidgetBridgeSlot {
  slotIndex: number;
  activityId: string | null;
  categoryId: string | null;
  icon: string | null;
  label: string | null;
  color: string | null;
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
}

export interface WidgetBridgePlugin {
  getConfig(): Promise<{ slots: WidgetBridgeSlot[] }>;
  saveConfig(options: { slots: WidgetBridgeSlot[] }): Promise<void>;
  getPendingActions(): Promise<{ actions: WidgetBridgePendingAction[] }>;
  clearPendingActions(options: { ids: string[] }): Promise<void>;
  getRuntimeState(): Promise<{ runtimeState: WidgetBridgeRuntimeState | null }>;
  syncRuntimeState(options: { runtimeState: WidgetBridgeRuntimeState | null }): Promise<void>;
  refreshWidget(): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge', {
  web: () => import('./WidgetBridgePlugin.web').then((m) => new m.WidgetBridgeWeb())
});

export default WidgetBridge;
