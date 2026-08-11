/**
 * @file localDataTimestamp.ts
 * @input Local storage timestamp keys and app lifecycle callers that mutate sync-relevant data
 * @output Shared helpers for reading, updating, locking, and broadcasting local user-change and cloud acknowledgement timestamps
 * @pos Utility (Sync Metadata)
 * @description Centralizes the local-data timestamp so all sync-relevant state changes can update one consistent clock without fighting restore flows.
 * @updated 2026-08-11: Treats missing local timestamps as neutral and stores cloud acknowledgements separately from user edits.
 * @updated 2026-08-11: Rejects background startup writes until a real user interaction occurs, preventing initialization tasks from becoming local edits.
 * @updated 2026-08-11: Records pending user edits separately so automatic sync can ignore stale timestamps left by earlier startup writes.
 */
import { SYNC_KEYS, USER_DATA_KEYS, storage } from '../constants/storageKeys';

export const LOCAL_DATA_TIMESTAMP_UPDATED_EVENT = 'lumostime:local-data-timestamp-updated';

export interface LocalDataTimestampUpdatedDetail {
  timestamp: number;
}

let isTimestampUpdateLocked = false;
let lastUserInteractionAt = 0;

const USER_INTERACTION_WINDOW_MS = 15_000;

export const recordLocalDataUserInteraction = (): void => {
  lastUserInteractionAt = Date.now();
};

const wasRecentlyChangedByUser = (): boolean => (
  lastUserInteractionAt > 0 && Date.now() - lastUserInteractionAt <= USER_INTERACTION_WINDOW_MS
);

if (typeof window !== 'undefined') {
  const recordInteraction = () => recordLocalDataUserInteraction();
  ['pointerdown', 'keydown', 'input', 'change'].forEach((eventName) => {
    window.addEventListener(eventName, recordInteraction, { capture: true, passive: true });
  });
}

export const getLocalDataTimestamp = (): number => {
  const stored = storage.get(USER_DATA_KEYS.LOCAL_TIMESTAMP);
  const timestamp = stored ? Number(stored) : 0;
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
};

export const setLocalDataTimestampValue = (timestamp: number): number => {
  storage.set(USER_DATA_KEYS.LOCAL_TIMESTAMP, timestamp.toString());

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<LocalDataTimestampUpdatedDetail>(LOCAL_DATA_TIMESTAMP_UPDATED_EVENT, {
      detail: { timestamp }
    }));
  }

  return timestamp;
};

export const updateLocalDataTimestamp = (): number => {
  if (isTimestampUpdateLocked || !wasRecentlyChangedByUser()) {
    return getLocalDataTimestamp();
  }

  const timestamp = setLocalDataTimestampValue(Date.now());
  storage.set(SYNC_KEYS.HAS_PENDING_LOCAL_EDIT, 'true');
  return timestamp;
};

export const hasPendingLocalDataEdit = (): boolean => (
  storage.get(SYNC_KEYS.HAS_PENDING_LOCAL_EDIT) === 'true'
);

export const clearPendingLocalDataEdit = (): void => {
  storage.remove(SYNC_KEYS.HAS_PENDING_LOCAL_EDIT);
};

export const getLastSeenCloudUploadedAt = (): number => {
  const stored = storage.get(SYNC_KEYS.LAST_SEEN_CLOUD_UPLOADED_AT);
  const timestamp = stored ? Number(stored) : 0;
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
};

export const setLastSeenCloudUploadedAt = (timestamp: number): number => {
  const validTimestamp = Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
  storage.set(SYNC_KEYS.LAST_SEEN_CLOUD_UPLOADED_AT, validTimestamp.toString());
  return validTimestamp;
};

export const setLocalDataTimestampUpdateLocked = (locked: boolean): void => {
  isTimestampUpdateLocked = locked;
};

export const isLocalDataTimestampUpdateLocked = (): boolean => isTimestampUpdateLocked;
