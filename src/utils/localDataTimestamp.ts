/**
 * @file localDataTimestamp.ts
 * @input Local storage timestamp key and app lifecycle callers that mutate sync-relevant data
 * @output Shared helpers for reading, updating, locking, and broadcasting the local data timestamp
 * @pos Utility (Sync Metadata)
 * @description Centralizes the local-data timestamp so all sync-relevant state changes can update one consistent clock without fighting restore flows.
 */
import { USER_DATA_KEYS, storage } from '../constants/storageKeys';

export const LOCAL_DATA_TIMESTAMP_UPDATED_EVENT = 'lumostime:local-data-timestamp-updated';

export interface LocalDataTimestampUpdatedDetail {
  timestamp: number;
}

let isTimestampUpdateLocked = false;

export const getLocalDataTimestamp = (): number => {
  const stored = storage.get(USER_DATA_KEYS.LOCAL_TIMESTAMP);
  return stored ? Number(stored) : Date.now();
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

export const setLocalDataTimestampUpdateLocked = (locked: boolean): void => {
  isTimestampUpdateLocked = locked;
};

export const isLocalDataTimestampUpdateLocked = (): boolean => isTimestampUpdateLocked;
