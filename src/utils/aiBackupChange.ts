/**
 * @file aiBackupChange.ts
 * @input AI-related local persistence writes and current sync-timestamp lock state
 * @output Shared AI-backup change event dispatch plus timestamp updates for cloud sync
 * @pos Utility (AI Sync Metadata)
 * @description Centralizes the signal that AI-only localStorage changes should count as sync-relevant user data, so AI chat/persona/memory updates can trigger the same backup flow as the main app state.
 * @updated 2026-05-17: Added a dedicated AI backup change event that bumps the shared local data timestamp while respecting restore-time timestamp locks.
 */

import { updateLocalDataTimestamp } from './localDataTimestamp';

export const AI_BACKUP_CHANGED_EVENT = 'lumostime:ai-backup-changed';

export const notifyAIBackupDataChanged = (): number => {
  const timestamp = updateLocalDataTimestamp();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AI_BACKUP_CHANGED_EVENT, {
      detail: { timestamp }
    }));
  }

  return timestamp;
};
