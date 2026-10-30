/**
 * @file syncProgress.ts
 * @input Transfer stage messages and optional settled image counts
 * @output Shared cloud-sync progress types
 * @updated 2026-10-30: Keeps image counts separate from stages with unknown transfer sizes.
 */
export interface SyncProgressCounts {
  completed: number;
  total: number;
}

export interface SyncProgressState {
  message: string;
  counts?: SyncProgressCounts;
}

export type SyncProgressCallback = (message: string, counts?: SyncProgressCounts) => void;
