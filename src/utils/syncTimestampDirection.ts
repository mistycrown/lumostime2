/**
 * @file syncTimestampDirection.ts
 * @input Local/cloud timestamps plus sync tolerance
 * @output A pure sync-direction classifier for timestamp-based cloud decisions
 * @pos Utility (Sync Metadata)
 * @description Keeps timestamp comparison logic side-effect free so sync direction can be regression tested without pulling in the full app shell.
 * @updated 2026-05-18: Added shared timestamp direction classification so narrow sync-tolerance fixes can be tested independently from the React hook.
 */

export type SyncTimestampDirection = 'restore' | 'upload' | 'equal';

export const classifySyncTimestampDirection = (
  localTimestamp: number,
  cloudTimestamp: number,
  toleranceMs: number
): SyncTimestampDirection => {
  if (cloudTimestamp > localTimestamp + toleranceMs) {
    return 'restore';
  }

  if (localTimestamp > cloudTimestamp + toleranceMs) {
    return 'upload';
  }

  return 'equal';
};
