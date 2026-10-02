/**
 * @file syncPayloadMetadata.ts
 * @updated 2026-10-02: Byte sizes are diagnostic metadata only; removed timestamp/size direction classification.
 * @input Sync payload objects plus optional fallback timestamps
 * @output Shared helpers for extracting canonical sync timestamps and comparing cloud backup payloads
 * @pos Utility (Sync Metadata)
 * @description Centralizes payload timestamp extraction and serialized comparison so cloud sync can verify fresh reads and agree on which main backup is canonical.
 * @updated 2026-06-21: Added canonical payload metadata helpers for write-after-read upload verification and stale-cloud detection.
 */

export const getJsonByteSize = (data: unknown): number => {
  const serialized = JSON.stringify(data) ?? 'null';
  return new TextEncoder().encode(serialized).length;
};

export interface SyncPayloadMetadata {
  timestamp: number;
  jsonSize: number;
  serialized: string;
}

const normalizeSyncPayload = (data: unknown): unknown => data ?? null;

export const serializeSyncPayload = (data: unknown): string => (
  JSON.stringify(normalizeSyncPayload(data)) ?? 'null'
);

export const getSyncPayloadTimestamp = (
  data: unknown,
  fallbackTimestamp: number = 0
): number => {
  const candidate = typeof data === 'object' && data !== null
    ? (data as { timestamp?: unknown }).timestamp
    : undefined;

  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    return candidate;
  }

  return fallbackTimestamp;
};

export const buildSyncPayloadMetadata = (
  data: unknown,
  fallbackTimestamp: number = 0
): SyncPayloadMetadata => {
  const normalizedData = normalizeSyncPayload(data);

  return {
    timestamp: getSyncPayloadTimestamp(normalizedData, fallbackTimestamp),
    jsonSize: getJsonByteSize(normalizedData),
    serialized: serializeSyncPayload(normalizedData)
  };
};

export const isSameSyncPayload = (left: unknown, right: unknown): boolean => (
  serializeSyncPayload(left) === serializeSyncPayload(right)
);
