/**
 * @file WidgetBridgePlugin.web.ts
 * @input Web runtime widget bridge calls
 * @output No-op widget bridge implementation for browser environments
 * @pos Plugin
 * @description Prevents widget bridge calls from failing when the app runs outside native Android.
 */
import { WebPlugin } from '@capacitor/core';
import type {
  WidgetBridgePendingAction,
  WidgetBridgePlugin,
  WidgetBridgeRuntimeState,
  WidgetBridgeSlot
} from './WidgetBridgePlugin';

export class WidgetBridgeWeb extends WebPlugin implements WidgetBridgePlugin {
  async getConfig(): Promise<{ slots: WidgetBridgeSlot[] }> {
    return { slots: [] };
  }

  async saveConfig(): Promise<void> {}

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
