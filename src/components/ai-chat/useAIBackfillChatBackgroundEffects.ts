/**
 * @file useAIBackfillChatBackgroundEffects.ts
 * @input Assistant agent lifecycle callbacks and background synchronization state
 * @output Background agent lifecycle effects
 * @pos Component Support (AI Integration)
 * @description Keeps native assistant listeners and background catch-up effects out of the modal coordinator.
 * @updated 2026-09-22: Extracted background assistant lifecycle effects.
 */

import { useEffect } from 'react';

import type { AssistantSystemTrigger } from '../../types/assistant';

export function useAIBackfillChatBackgroundEffects(options: Record<string, any>): void {
  const {
    AssistantAgent,
    CapacitorApp,
    aiService,
    assistantAgentConfig,
    assistantMemorySnapshot,
    assistantReminderSnapshot,
    conversationHistoryCache,
    drainPendingAssistantSystemTriggers,
    flushDueAssistantLetter,
    flushDueReminders,
    handleAssistantSystemTrigger,
    hasCompletedStartupReminderCatchupRef,
    hydrateAssistantReminderSnapshotFromNative,
    isAssistantBackgroundContextReady,
    refreshAssistantNativeDiagnostics,
    syncNativeBackgroundExecutionSnapshot
  } = options;

    useEffect(() => {
      let cancelled = false;
      let pluginListener: Awaited<ReturnType<typeof AssistantAgent.addListener>> | null = null;
      let diagnosticsListener: Awaited<ReturnType<typeof AssistantAgent.addListener>> | null = null;
      let appStateListener: Awaited<ReturnType<typeof CapacitorApp.addListener>> | null = null;
  
      const bindAssistantAgent = async () => {
        try {
          pluginListener = await AssistantAgent.addListener('assistantSystemTrigger', (trigger) => {
            if (cancelled || !assistantAgentConfig.enabled) {
              return;
            }
  
            void handleAssistantSystemTrigger(trigger as AssistantSystemTrigger);
          });
          diagnosticsListener = await AssistantAgent.addListener('assistantDiagnosticsUpdated', () => {
            if (cancelled) {
              return;
            }
  
            void refreshAssistantNativeDiagnostics();
          });
          appStateListener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
            if (cancelled || !isActive || !assistantAgentConfig.enabled) {
              return;
            }
  
            void (async () => {
              await hydrateAssistantReminderSnapshotFromNative();
              await drainPendingAssistantSystemTriggers();
            })();
          });
          document.addEventListener('visibilitychange', handleVisibilityChange);
          void refreshAssistantNativeDiagnostics();
          void (async () => {
            await hydrateAssistantReminderSnapshotFromNative();
            await drainPendingAssistantSystemTriggers();
          })();
        } catch (error) {
          console.error('[AIBackfillChatModal] Failed to bind assistant agent listener', error);
        }
      };
  
      const handleVisibilityChange = () => {
        if (cancelled || document.hidden || !assistantAgentConfig.enabled) {
          return;
        }
  
        void (async () => {
          await hydrateAssistantReminderSnapshotFromNative();
          await drainPendingAssistantSystemTriggers();
        })();
      };
  
      void bindAssistantAgent();
  
      return () => {
        cancelled = true;
        pluginListener?.remove();
        diagnosticsListener?.remove();
        void appStateListener?.remove();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }, [
      assistantAgentConfig.enabled,
      drainPendingAssistantSystemTriggers,
      handleAssistantSystemTrigger,
      hydrateAssistantReminderSnapshotFromNative,
      refreshAssistantNativeDiagnostics,
    ]);
  
    useEffect(() => {
      let cancelled = false;
  
      const syncAssistantAgent = async () => {
        try {
          if (assistantAgentConfig.enabled) {
            await AssistantAgent.startAgent(assistantAgentConfig);
          } else {
            await AssistantAgent.stopAgent();
          }
        } catch (error) {
          if (!cancelled) {
            console.error('[AIBackfillChatModal] Failed to sync assistant agent config', error);
          }
        }
      };
  
      void syncAssistantAgent();
  
      return () => {
        cancelled = true;
      };
    }, [assistantAgentConfig]);
  
    useEffect(() => {
      void AssistantAgent.syncNativeAIConfig(aiService.getConfig()).catch((error) => {
        console.error('[AIBackfillChatModal] Failed to sync native AI config on mount/update', error);
      });
      void syncNativeBackgroundExecutionSnapshot();
    }, [
      assistantAgentConfig.enabled,
      assistantAgentConfig.longTermMemoryEnabled,
      conversationHistoryCache,
      isAssistantBackgroundContextReady,
      syncNativeBackgroundExecutionSnapshot
    ]);
  
    useEffect(() => {
      if (!assistantAgentConfig.enabled) {
        return;
      }
  
      void syncNativeBackgroundExecutionSnapshot();
    }, [
      assistantAgentConfig.enabled,
      assistantMemorySnapshot.updatedAt,
      assistantReminderSnapshot,
      isAssistantBackgroundContextReady,
      syncNativeBackgroundExecutionSnapshot
    ]);
  
    useEffect(() => {
      if (
        !assistantAgentConfig.enabled
        || !isAssistantBackgroundContextReady
        || hasCompletedStartupReminderCatchupRef.current
      ) {
        return;
      }
  
      hasCompletedStartupReminderCatchupRef.current = true;
  
      void (async () => {
        try {
          await hydrateAssistantReminderSnapshotFromNative();
          flushDueReminders();
          flushDueAssistantLetter();
        } catch (error) {
          hasCompletedStartupReminderCatchupRef.current = false;
          console.error('[AIBackfillChatModal] Failed cold-start reminder catch-up', error);
        }
      })();
    }, [
      assistantAgentConfig.enabled,
      flushDueAssistantLetter,
      flushDueReminders,
      hydrateAssistantReminderSnapshotFromNative,
      isAssistantBackgroundContextReady
    ]);
  
    useEffect(() => {
      flushDueReminders();
      flushDueAssistantLetter();
  
      if (!assistantAgentConfig.enabled) {
        return;
      }
  
      const timer = window.setInterval(() => {
        flushDueReminders();
        flushDueAssistantLetter();
      }, 60_000);
  
      return () => window.clearInterval(timer);
    }, [
      assistantAgentConfig.enabled,
      flushDueAssistantLetter,
      flushDueReminders
    ]);
  
    useEffect(() => {
      if (!assistantAgentConfig.enabled || !isAssistantBackgroundContextReady) {
        return;
      }
  
      void (async () => {
        await hydrateAssistantReminderSnapshotFromNative();
        await drainPendingAssistantSystemTriggers();
        flushDueAssistantLetter();
      })();
    }, [
      assistantAgentConfig.enabled,
      drainPendingAssistantSystemTriggers,
      flushDueAssistantLetter,
      hydrateAssistantReminderSnapshotFromNative,
      isAssistantBackgroundContextReady
    ]);
}
