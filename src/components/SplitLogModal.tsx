/**
 * @file SplitLogModal.tsx
 * @input An existing log plus cancel and confirm callbacks
 * @output A single-layer time-split modal with a draggable timeline marker
 * @description Lets users choose the point at which an existing focus record is divided into two records.
 * @updated 2026-08-26: Added the dedicated focus-record time split interaction.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Scissors, X } from 'lucide-react';
import type { Log } from '../types';

interface SplitLogModalProps {
  log: Log;
  onClose: () => void;
  onConfirm: (splitTime: number) => void;
}

const formatTime = (time: number) => new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit'
}).format(new Date(time));

const formatDuration = (durationMs: number) => {
  const totalMinutes = Math.round(durationMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours > 0 ? `${hours}小时${minutes}分` : `${minutes}分`;
};

export const SplitLogModal: React.FC<SplitLogModalProps> = ({ log, onClose, onConfirm }) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const duration = log.endTime - log.startTime;
  const defaultSplitTime = useMemo(
    () => Math.round(log.startTime + duration / 2),
    [duration, log.startTime]
  );
  const [splitTime, setSplitTime] = useState(defaultSplitTime);
  const isValidSplit = splitTime > log.startTime && splitTime < log.endTime;
  const splitPercent = duration > 0 ? ((splitTime - log.startTime) / duration) * 100 : 0;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const updateSplitFromPointer = (clientX: number) => {
    const timeline = timelineRef.current;
    if (!timeline || duration <= 0) return;

    const bounds = timeline.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
    const nextSplitTime = Math.round(log.startTime + duration * ratio);
    setSplitTime(Math.min(log.endTime - 1, Math.max(log.startTime + 1, nextSplitTime)));
  };

  const handleTimelinePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    updateSplitFromPointer(event.clientX);
  };

  const handleTimelinePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      updateSplitFromPointer(event.clientX);
    }
  };

  const handleTimelineKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = 60_000;
    const nextSplitTime = event.key === 'ArrowLeft'
      ? splitTime - step
      : event.key === 'ArrowRight'
        ? splitTime + step
        : null;

    if (nextSplitTime === null) return;

    event.preventDefault();
    setSplitTime(Math.min(log.endTime - 1, Math.max(log.startTime + 1, nextSplitTime)));
  };

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center bg-stone-900/40 backdrop-blur-sm animate-fadeIn md:items-center pb-[env(safe-area-inset-bottom)]"
      onClick={onClose}
    >
      <div
        className="w-full overflow-hidden rounded-t-[2rem] bg-[#faf9f6] shadow-2xl animate-slideUp md:max-w-lg md:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 bg-white/50 px-6 py-5">
          <div className="w-10" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">拆分记录</span>
            <span className="mt-1 text-sm font-medium text-stone-700">选择拆分位置</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100"
            aria-label="关闭拆分"
          >
            <X size={22} />
          </button>
        </div>

        <div className="px-6 py-8">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">开始</div>
              <div className="mt-1 font-mono text-lg font-bold tabular-nums text-stone-800">{formatTime(log.startTime)}</div>
            </div>
            <Scissors size={17} className="mb-1 text-stone-400" aria-hidden="true" />
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">结束</div>
              <div className="mt-1 font-mono text-lg font-bold tabular-nums text-stone-800">{formatTime(log.endTime)}</div>
            </div>
          </div>

          <div className="mt-10 px-2">
            <div
              ref={timelineRef}
              role="slider"
              aria-label="拆分时间"
              aria-valuemin={log.startTime}
              aria-valuemax={log.endTime}
              aria-valuenow={splitTime}
              tabIndex={0}
              onPointerDown={handleTimelinePointerDown}
              onPointerMove={handleTimelinePointerMove}
              onKeyDown={handleTimelineKeyDown}
              className="relative h-3 w-full cursor-ew-resize touch-none rounded-full bg-stone-200"
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full opacity-25"
                style={{ width: `${splitPercent}%`, backgroundColor: 'var(--accent-color)' }}
              />
              <div
                className="absolute top-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-white shadow-sm transition-transform"
                style={{ left: `${splitPercent}%`, borderColor: 'var(--accent-color)' }}
              >
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--accent-color)' }} />
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <span className="rounded-full bg-white px-3 py-1 font-mono text-sm font-bold tabular-nums text-stone-700 shadow-sm ring-1 ring-stone-200">
                {formatTime(splitTime)}
              </span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 text-center text-xs text-stone-500">
            <div className="border-r border-stone-200 pr-3">
              <div className="font-mono font-bold tabular-nums text-stone-700">{formatDuration(splitTime - log.startTime)}</div>
            </div>
            <div className="pl-3">
              <div className="font-mono font-bold tabular-nums text-stone-700">{formatDuration(log.endTime - splitTime)}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-stone-100 bg-white px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-stone-200 bg-white py-3.5 font-bold text-stone-600 transition-colors hover:bg-stone-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm(splitTime)}
            disabled={!isValidSplit}
            className="flex-1 rounded-2xl py-3.5 font-bold text-white shadow-xl transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};
