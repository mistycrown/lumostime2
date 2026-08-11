/**
 * @file localDataTimestamp.ts
 * @input Local storage timestamp keys and app lifecycle callers that mutate sync-relevant data
 * @output Shared helpers for reading, updating, locking, and broadcasting local user-change and cloud acknowledgement timestamps
 * @pos Utility (Sync Metadata)
 * @description Centralizes the local-data timestamp so all sync-relevant state changes can update one consistent clock without fighting restore flows.
 * @updated 2026-08-11: Treats missing local timestamps as neutral and stores cloud acknowledgements separately from user edits.
 */
import { SYNC_KEYS, USER_DATA_KEYS, storage } from '../constants/storageKeys';

export const LOCAL_DATA_TIMESTAMP_UPDATED_EVENT = 'lumostime:local-data-timestamp-updated';

export interface LocalDataTimestampUpdatedDetail {
  timestamp: number;
}

let isTimestampUpdateLocked = false;

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
  if (isTimestampUpdateLocked) {
    return getLocalDataTimestamp();
  }

  return setLocalDataTimestampValue(Date.now());
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
