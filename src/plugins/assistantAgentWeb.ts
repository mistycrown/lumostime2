/**
 * @file assistantAgentWeb.ts
 * @input N/A
 * @output Web no-op implementation for the AssistantAgent plugin
 * @pos Plugin Implementation (Web)
 * @description Provides a lightweight web fallback for the Android-first assistant agent plugin so browser builds can compile and simulate plugin events without crashing.
 *
 * @updated 2026-04-27: Added no-op native diagnostic list and clear fallbacks for browser builds.
 * @updated 2026-04-26: Added no-op active-notification and pending-navigation fallbacks for browser builds.
 * @updated 2026-04-26: Added a no-op web AssistantAgent plugin implementation with event-listener support.
 */

import { WebPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import type { AssistantAgentPlugin } from './AssistantAgentPlugin';
import type {
  AssistantAgentConfig,
  AssistantNativeBackgroundSnapshot,
  AssistantNativeDiagnosticEntry,
  AssistantReminder,
  AssistantNotificationNavigation,
  AssistantNotificationPayload,
  AssistantSystemTrigger
} from '../types/assistant';
import type { AIConfig } from '../services/aiService';

export class AssistantAgentWeb extends WebPlugin implements AssistantAgentPlugin {
  async startAgent(options?: Partial<AssistantAgentConfig>): Promise<void> {
    console.log('AssistantAgent.startAgent (Web - No-op)', options);
  }

  async stopAgent(): Promise<void> {
    console.log('AssistantAgent.stopAgent (Web - No-op)');
  }

  async updateAgentConfig(config: Partial<AssistantAgentConfig>): Promise<void> {
    console.log('AssistantAgent.updateAgentConfig (Web - No-op)', config);
  }

  async notifyUserTurn(payload: { text: string; at: string }): Promise<void> {
    console.log('AssistantAgent.notifyUserTurn (Web - No-op)', payload);
  }

  async notifyTaskStateChanged(): Promise<void> {
    console.log('AssistantAgent.notifyTaskStateChanged (Web - No-op)');
  }

  async triggerImmediateCheckin(): Promise<void> {
    console.log('AssistantAgent.triggerImmediateCheckin (Web - No-op)');
  }

  async listDiagnostics(): Promise<{ entries: AssistantNativeDiagnosticEntry[] }> {
    return { entries: [] };
  }

  async clearDiagnostics(): Promise<void> {
    console.log('AssistantAgent.clearDiagnostics (Web - No-op)');
  }

  async listPendingSystemTriggers(): Promise<{ triggers: AssistantSystemTrigger[] }> {
    return { triggers: [] };
  }

  async acknowledgeSystemTrigger(_payload: { id: string }): Promise<void> {
    console.log('AssistantAgent.acknowledgeSystemTrigger (Web - No-op)');
  }

  async syncNativeAIConfig(_config: AIConfig): Promise<void> {
    console.log('AssistantAgent.syncNativeAIConfig (Web - No-op)');
  }

  async clearNativeAIConfig(): Promise<void> {
    console.log('AssistantAgent.clearNativeAIConfig (Web - No-op)');
  }

  async syncNativeBackgroundSnapshot(_snapshot: AssistantNativeBackgroundSnapshot): Promise<void> {
    console.log('AssistantAgent.syncNativeBackgroundSnapshot (Web - No-op)');
  }

  async syncNativeReminders(_payload: { reminders: AssistantReminder[] }): Promise<void> {
    console.log('AssistantAgent.syncNativeReminders (Web - No-op)');
  }

  async listNativeReminders(): Promise<{ reminders: AssistantReminder[] }> {
    return { reminders: [] };
  }

  async showAssistantNotification(payload: AssistantNotificationPayload): Promise<void> {
    console.log('AssistantAgent.showAssistantNotification (Web - No-op)', payload);
  }

  async consumePendingAssistantNavigation(): Promise<AssistantNotificationNavigation> {
    return { hasPending: false };
  }

  addListener(
    eventName: 'assistantSystemTrigger' | 'assistantDiagnosticsUpdated',
    listenerFunc: ((data: AssistantSystemTrigger) => void) | (() => void)
  ): Promise<PluginListenerHandle> & PluginListenerHandle {
    return super.addListener(eventName, listenerFunc as never) as Promise<PluginListenerHandle> & PluginListenerHandle;
  }
}
