/**
 * @file WidgetBridgePlugin.web.ts
 * @input Web runtime widget bridge calls
 * @output No-op widget bridge implementation for browser environments
 * @pos Plugin
 * @description Prevents widget bridge calls from failing when the app runs outside native Android.
 * @updated 2026-04-25: Added no-op DAILY_RUNTIME payload sync for the native 4x4 heatmap widget.
 * @updated 2026-04-26: Added no-op TODAY + PIN widget payload sync for the dedicated scrollable todo widget.
 * @updated 2026-05-01: Added no-op tracking-calendar payload sync for the dedicated 2x2 tracking calendar widget.
 * @updated 2026-05-02: Added no-op scene widget payload sync for the dedicated 4x3 scene widget.
 * @updated 2026-05-05: Added no-op log-tail sync for native quick-punch shortcut gap fills.
 */
import { WebPlugin } from '@capacitor/core';
import type {
  WidgetBridgeDailyRuntimePayload,
  WidgetBridgeDailySyncPayload,
  WidgetBridgeInstanceBinding,
  WidgetBridgePendingAction,
  WidgetBridgePendingDailyAction,
  WidgetBridgePendingTodoPinAction,
  WidgetBridgePlugin,
  WidgetBridgeScenePayload,
  WidgetBridgeRuntimeState,
  WidgetBridgeTrackingCalendarPayload,
  WidgetBridgeTodoPinPayload,
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

  async getPendingTodoPinActions(): Promise<{ actions: WidgetBridgePendingTodoPinAction[] }> {
    return { actions: [] };
  }

  async clearPendingTodoPinActions(): Promise<void> {}

  async syncDailyWidgetData(_options?: { payload: WidgetBridgeDailySyncPayload | null }): Promise<void> {}

  async syncDailyRuntimeWidgetData(
    _options?: { payload: WidgetBridgeDailyRuntimePayload | null }
  ): Promise<void> {}

  async syncTodoPinWidgetData(
    _options?: { payload: WidgetBridgeTodoPinPayload | null }
  ): Promise<void> {}

  async syncTrackingCalendarWidgetData(
    _options?: { payload: WidgetBridgeTrackingCalendarPayload | null }
  ): Promise<void> {}

  async syncSceneWidgetData(
    _options?: { payload: WidgetBridgeScenePayload | null }
  ): Promise<void> {}

  async syncLogTailState(): Promise<void> {}

  async refreshWidget(): Promise<void> {}
}
