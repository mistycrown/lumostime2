/**
 * @file localDataTimestamp.ts
 * @input Local storage timestamp keys and app lifecycle callers that mutate sync-relevant data
 * @output Shared helpers for reading, updating, locking, and broadcasting local user-change and cloud acknowledgement timestamps
 * @pos Utility (Sync Metadata)
 * @description Centralizes the local-data timestamp so all sync-relevant state changes can update one consistent clock without fighting restore flows.
 * @updated 2026-10-02: Tracks monotonic edit revisions and acknowledges only captured revisions; asynchronous edits no longer depend on recent DOM input.
 * @updated 2026-08-11: Treats missing local timestamps as neutral and stores cloud acknowledgements separately from user edits.
 * @updated 2026-10-02: Hydration guards stay with data owners; persisted content checkpoints distinguish edits from restore normalization.
 * @updated 2026-08-11: Records pending user edits separately so automatic sync can ignore stale timestamps left by earlier startup writes.
 * @updated 2026-08-11: Provides an explicit local-edit marker for import and programmatic user actions that do not originate from a DOM event.
 */
import { SYNC_KEYS, USER_DATA_KEYS, storage } from '../constants/storageKeys';

export const LOCAL_DATA_TIMESTAMP_UPDATED_EVENT = 'lumostime:local-data-timestamp-updated';

export interface LocalDataTimestampUpdatedDetail {
  timestamp: number;
}

let isTimestampUpdateLocked = false;
const EDIT_REVISION_KEY = 'lumostime_local_edit_revision_v2';

export const getLocalEditRevision = (): number => Number(localStorage.getItem(EDIT_REVISION_KEY)) || 0;

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

export const markLocalDataEdited = (): number => {
  if (isTimestampUpdateLocked) {
    return getLocalDataTimestamp();
  }

  localStorage.setItem(EDIT_REVISION_KEY, String(getLocalEditRevision() + 1));
  storage.set(SYNC_KEYS.HAS_PENDING_LOCAL_EDIT, 'true');
  const timestamp = setLocalDataTimestampValue(Date.now());
  return timestamp;
};

export const updateLocalDataTimestamp = (): number => {
  return markLocalDataEdited();
};

export const hasPendingLocalDataEdit = (): boolean => (
  storage.get(SYNC_KEYS.HAS_PENDING_LOCAL_EDIT) === 'true'
);

export const clearPendingLocalDataEdit = (expectedRevision?: number): void => {
  // Legacy callers without a captured revision cannot safely acknowledge in-flight edits.
  if (getLocalEditRevision() === expectedRevision) storage.remove(SYNC_KEYS.HAS_PENDING_LOCAL_EDIT);
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
