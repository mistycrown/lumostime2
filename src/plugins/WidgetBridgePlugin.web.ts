/**
 * @file WidgetBridgePlugin.web.ts
 * @input Web runtime widget bridge calls
 * @output No-op widget bridge implementation for browser environments
 * @pos Plugin
 * @description Prevents widget bridge calls from failing when the app runs outside native Android.
 * @updated 2026-04-18: Kept the browser-safe bridge aligned with shortcut widget metadata.
 */
import { WebPlugin } from '@capacitor/core';
import type {
  WidgetBridgeDailySyncPayload,
  WidgetBridgeInstanceBinding,
  WidgetBridgePendingAction,
  WidgetBridgePendingDailyAction,
  WidgetBridgePlugin,
  WidgetBridgeRuntimeState,
  WidgetBridgeTemplate
} from './WidgetBridgePlugin';

export class WidgetBridgeWeb extends WebPlugin implements WidgetBridgePlugin {
  async getTemplates(): Promise<{ templates: WidgetBridgeTemplate[] }> {
    return { templates: [] };
  }

  async saveTemplates(): Promise<void> {}

  async getInstanceBindings(): Promise<{ bindings: WidgetBridgeInstanceBinding[] }> {
    return { bindings: [] };
  }

  async getPendingActions(): Promise<{ actions: WidgetBridgePendingAction[] }> {
    return { actions: [] };
  }

  async clearPendingActions(): Promise<void> {}

  async getRuntimeState(): Promise<{ runtimeState: WidgetBridgeRuntimeState | null }> {
    return { runtimeState: null };
  }

  async syncRuntimeState(): Promise<void> {}

  async getPendingDailyActions(): Promise<{ actions: WidgetBridgePendingDailyAction[] }> {
    return { actions: [] };
  }

  async clearPendingDailyActions(): Promise<void> {}

  async syncDailyWidgetData(_options?: { payload: WidgetBridgeDailySyncPayload | null }): Promise<void> {}

  async refreshWidget(): Promise<void> {}
}
