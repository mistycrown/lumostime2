/**
 * @file assistantAgentWeb.ts
 * @input N/A
 * @output Web no-op implementation for the AssistantAgent plugin
 * @pos Plugin Implementation (Web)
 * @description Provides a lightweight web fallback for the Android-first assistant agent plugin so browser builds can compile and simulate plugin events without crashing.
 *
 * @updated 2026-04-26: Added a no-op web AssistantAgent plugin implementation with event-listener support.
 */

import { WebPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import type { AssistantAgentPlugin } from './AssistantAgentPlugin';
import type { AssistantAgentConfig, AssistantSystemTrigger } from '../types/assistant';

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

  addListener(
    eventName: 'assistantSystemTrigger',
    listenerFunc: (data: AssistantSystemTrigger) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle {
    return super.addListener(eventName, listenerFunc) as Promise<PluginListenerHandle> & PluginListenerHandle;
  }
}
