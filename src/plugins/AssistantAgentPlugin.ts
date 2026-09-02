/**
 * @file AssistantAgentPlugin.ts
 * @input N/A
 * @output Native assistant-agent plugin methods and events
 * @pos Plugin
 * @description Defines the Capacitor bridge for the Android-first assistant agent so the web layer can start or stop alarm-backed background scheduling, update agent config, and receive system-trigger events from the native layer.
 *
 * @updated 2026-09-03: Updated the bridge description for alarm-backed check-in scheduling without a base polling interval.
 * @updated 2026-07-07: Synced assistant-letter schedule fields through the native agent config so Android can wake and dispatch due letter triggers.
 * @updated 2026-04-27: Added native diagnostic list, clear, and live-update contracts so Android poll decisions can be inspected from the shared AI history UI.
 * @updated 2026-04-26: Added active assistant notification and pending-navigation APIs so Android system alerts can reopen the shared AI chat at the exact background message.
 * @updated 2026-04-26: Added the AssistantAgent plugin interface and Android/web bridge registration for the new background AI agent.
 */

import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
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

export interface AssistantAgentPlugin {
  startAgent(options?: Partial<AssistantAgentConfig>): Promise<void>;
  stopAgent(): Promise<void>;
  updateAgentConfig(config: Partial<AssistantAgentConfig>): Promise<void>;
  notifyUserTurn(payload: { text: string; at: string }): Promise<void>;
  notifyTaskStateChanged(): Promise<void>;
  triggerImmediateCheckin(): Promise<void>;
  listDiagnostics(): Promise<{ entries: AssistantNativeDiagnosticEntry[] }>;
  clearDiagnostics(): Promise<void>;
  listPendingSystemTriggers(): Promise<{ triggers: AssistantSystemTrigger[] }>;
  acknowledgeSystemTrigger(payload: { id: string }): Promise<void>;
  syncNativeAIConfig(config: AIConfig): Promise<void>;
  clearNativeAIConfig(): Promise<void>;
  syncNativeBackgroundSnapshot(snapshot: AssistantNativeBackgroundSnapshot): Promise<void>;
  syncNativeReminders(payload: { reminders: AssistantReminder[] }): Promise<void>;
  listNativeReminders(): Promise<{ reminders: AssistantReminder[] }>;
  showAssistantNotification(payload: AssistantNotificationPayload): Promise<void>;
  consumePendingAssistantNavigation(): Promise<AssistantNotificationNavigation>;
  addListener(
    eventName: 'assistantSystemTrigger',
    listenerFunc: (data: AssistantSystemTrigger) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
  addListener(
    eventName: 'assistantDiagnosticsUpdated',
    listenerFunc: () => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
  removeAllListeners(): Promise<void>;
}

const AssistantAgent = registerPlugin<AssistantAgentPlugin>('AssistantAgent', {
  web: () => import('./assistantAgentWeb').then((module) => new module.AssistantAgentWeb())
});

export default AssistantAgent;
