/**
 * @file SyncProgress.tsx
 * @input Active cloud-sync stage and optional settled image counts
 * @output Persistent, non-blocking transfer status across application views
 * @updated 2026-10-30: Shows stage feedback and genuine image progress without estimating byte percentages.
 */
import React from 'react';
import { Loader2 } from 'lucide-react';
import type { SyncProgressState } from '../utils/syncProgress';

export const SyncProgress: React.FC<{ progress: SyncProgressState | null }> = ({ progress }) => {
  if (!progress) return null;
  const counts = progress.counts;
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[210] mx-auto max-w-sm border border-stone-200 bg-white px-4 py-3 text-stone-700 shadow-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200" role="status" aria-live="polite" aria-atomic="true">
      <div className="mb-2 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
        <Loader2 size={14} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        <span className="flex-1">云端同步</span>
        {counts && counts.total > 0 && <span className="tabular-nums">已处理 {counts.completed}/{counts.total}</span>}
      </div>
      <p className="break-words text-sm">{progress.message}</p>
      {counts && counts.total > 0 && (
        <progress className="mt-3 block h-1 w-full appearance-none overflow-hidden bg-stone-100 [&::-webkit-progress-bar]:bg-stone-100 [&::-webkit-progress-value]:bg-stone-600 [&::-moz-progress-bar]:bg-stone-600 dark:[&::-webkit-progress-bar]:bg-stone-800 dark:[&::-webkit-progress-value]:bg-stone-300" value={counts.completed} max={counts.total} aria-label="图片处理进度" />
      )}
    </div>
  );
};
