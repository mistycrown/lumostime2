/**
 * @file SyncProgress.tsx
 * @input Active cloud-sync stage and optional settled image counts
 * @output Persistent, non-blocking transfer status across application views
 * @updated 2026-10-30: Shows stage feedback and genuine image progress without estimating byte percentages.
 * @updated 2026-10-30: Matches existing rounded toast surfaces with compact single-row status and a quiet image progress track.
 */
import React from 'react';
import { Loader2 } from 'lucide-react';
import type { SyncProgressState } from '../utils/syncProgress';

export const SyncProgress: React.FC<{ progress: SyncProgressState | null }> = ({ progress }) => {
  if (!progress) return null;
  const counts = progress.counts;
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[210] mx-auto max-w-sm rounded-xl border border-stone-100 bg-white px-4 py-3 text-stone-700 shadow-lg shadow-stone-900/5 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200" role="status" aria-live="polite" aria-atomic="true">
      <div className="flex items-center gap-3">
        <Loader2 size={16} className="shrink-0 animate-spin text-stone-400 motion-reduce:animate-none" aria-hidden="true" />
        <p className="min-w-0 flex-1 break-words text-sm font-medium leading-relaxed">{progress.message}</p>
        {counts && counts.total > 0 && <span className="shrink-0 text-xs tabular-nums text-stone-400">已处理 {counts.completed}/{counts.total}</span>}
      </div>
      {counts && counts.total > 0 && (
        <progress className="mt-2.5 block h-0.5 w-full appearance-none overflow-hidden rounded-full bg-stone-100 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-stone-100 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-stone-400 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-stone-400 dark:[&::-webkit-progress-bar]:bg-stone-700 dark:[&::-webkit-progress-value]:bg-stone-400" value={counts.completed} max={counts.total} aria-label="图片处理进度" />
      )}
    </div>
  );
};
