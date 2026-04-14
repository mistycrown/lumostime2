/**
 * @file WidgetBridgePlugin.web.ts
 * @input Web runtime widget bridge calls
 * @output No-op widget bridge implementation for browser environments
 * @pos Plugin
 * @description Prevents widget bridge calls from failing when the app runs outside native Android.
 * @updated 2026-04-13: Kept the browser-safe bridge aligned with richer widget association payloads.
 */
import { WebPlugin } from '@capacitor/core';
import type {
  WidgetBridgeInstanceBinding,
  WidgetBridgePendingAction,
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

  async refreshWidget(): Promise<void> {}
}
