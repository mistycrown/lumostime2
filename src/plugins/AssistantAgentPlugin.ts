/**
 * @file AssistantAgentPlugin.ts
 * @input N/A
 * @output Native assistant-agent plugin methods and events
 * @pos Plugin
 * @description Defines the Capacitor bridge for the Android-first assistant agent so the web layer can start or stop the background service, update polling config, and receive system-trigger events from the native layer.
 *
 * @updated 2026-04-26: Added active assistant notification and pending-navigation APIs so Android system alerts can reopen the shared AI chat at the exact background message.
 * @updated 2026-04-26: Added the AssistantAgent plugin interface and Android/web bridge registration for the new background AI agent.
 */

import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import type {
  AssistantAgentConfig,
  AssistantNotificationNavigation,
  AssistantNotificationPayload,
  AssistantSystemTrigger
} from '../types/assistant';

export interface AssistantAgentPlugin {
  startAgent(options?: Partial<AssistantAgentConfig>): Promise<void>;
  stopAgent(): Promise<void>;
  updateAgentConfig(config: Partial<AssistantAgentConfig>): Promise<void>;
  notifyUserTurn(payload: { text: string; at: string }): Promise<void>;
  notifyTaskStateChanged(): Promise<void>;
  triggerImmediateCheckin(): Promise<void>;
  showAssistantNotification(payload: AssistantNotificationPayload): Promise<void>;
  consumePendingAssistantNavigation(): Promise<AssistantNotificationNavigation>;
  addListener(
    eventName: 'assistantSystemTrigger',
    listenerFunc: (data: AssistantSystemTrigger) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
  removeAllListeners(): Promise<void>;
}

const AssistantAgent = registerPlugin<AssistantAgentPlugin>('AssistantAgent', {
  web: () => import('./assistantAgentWeb').then((module) => new module.AssistantAgentWeb())
});

export default AssistantAgent;
