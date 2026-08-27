/**
 * @file SplitLogModal.tsx
 * @input An existing log, adjacent actual logs, and split/merge callbacks
 * @output A single-layer split-and-merge modal with target-aware merge confirmation
 * @description Lets users split a focus record or merge it into an adjacent record while making included gaps explicit.
 * @updated 2026-08-27: Added adjacent-record merge choices and a gap-aware target confirmation step.
 * @updated 2026-08-26: Added the dedicated focus-record time split interaction.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Clock3, GitMerge, Scissors, X } from 'lucide-react';
import type { Log } from '../types';

interface SplitLogModalProps {
  log: Log;
  previousLog: Log | null;
  nextLog: Log | null;
  getLogLabel: (log: Log) => string;
  onClose: () => void;
  onConfirm: (splitTime: number) => void;
  onMerge: (targetLog: Log) => boolean;
}

type ModalStep = 'choice' | 'split' | 'merge-confirm';

const formatTime = (time: number) => new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit'
}).format(new Date(time));

const formatRange = (log: Pick<Log, 'startTime' | 'endTime'>) => `${formatTime(log.startTime)} - ${formatTime(log.endTime)}`;

const formatDuration = (durationMs: number) => {
  const totalMinutes = Math.round(durationMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (totalMinutes === 0) return '不足1分';
  return hours > 0 ? `${hours}小时${minutes}分` : `${minutes}分`;
};

export const SplitLogModal: React.FC<SplitLogModalProps> = ({
  log,
  previousLog,
  nextLog,
  getLogLabel,
  onClose,
  onConfirm,
  onMerge
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const duration = log.endTime - log.startTime;
  const defaultSplitTime = useMemo(
    () => Math.round(log.startTime + duration / 2),
    [duration, log.startTime]
  );
  const [step, setStep] = useState<ModalStep>('choice');
  const [splitTime, setSplitTime] = useState(defaultSplitTime);
  const [mergeTarget, setMergeTarget] = useState<Log | null>(null);
  const isValidSplit = splitTime > log.startTime && splitTime < log.endTime;
  const splitPercent = duration > 0 ? ((splitTime - log.startTime) / duration) * 100 : 0;
  const mergedStartTime = mergeTarget ? Math.min(log.startTime, mergeTarget.startTime) : 0;
  const mergedEndTime = mergeTarget ? Math.max(log.endTime, mergeTarget.endTime) : 0;
  const gapDuration = mergeTarget
    ? Math.max(0, Math.max(log.startTime, mergeTarget.startTime) - Math.min(log.endTime, mergeTarget.endTime))
    : 0;

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
    if (bounds.width <= 0) return;

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
    const nextSplitTime = event.key === 'ArrowLeft'
      ? splitTime - 60_000
      : event.key === 'ArrowRight'
        ? splitTime + 60_000
        : null;

    if (nextSplitTime === null) return;

    event.preventDefault();
    setSplitTime(Math.min(log.endTime - 1, Math.max(log.startTime + 1, nextSplitTime)));
  };

  const openMergeConfirmation = (targetLog: Log | null) => {
    if (!targetLog) return;
    setMergeTarget(targetLog);
    setStep('merge-confirm');
  };

  const renderHeader = (title: string, subtitle: string, onBack?: () => void) => (
    <div className="flex items-center justify-between border-b border-stone-100 bg-white/50 px-6 py-5">
      <div className="w-10">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100"
            aria-label="返回拆合选项"
          >
            <ArrowLeft size={22} />
          </button>
        )}
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{title}</span>
        <span className="mt-1 text-sm font-medium text-stone-700">{subtitle}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="-mr-2 rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100"
        aria-label="关闭拆合"
      >
        <X size={22} />
      </button>
    </div>
  );

  const renderCurrentLog = () => (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
      <div className="truncate text-sm font-bold text-stone-800">{getLogLabel(log)}</div>
      <div className="mt-1 font-mono text-xs tabular-nums text-stone-500">{formatRange(log)}</div>
    </div>
  );

  const renderChoice = () => (
    <>
      {renderHeader('拆合记录', '选择操作')}
      <div className="space-y-3 px-6 py-6">
        {renderCurrentLog()}
        <button
          type="button"
          onClick={() => setStep('split')}
          className="flex w-full items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-4 text-left transition-colors hover:border-stone-300 hover:bg-stone-50"
        >
          <span className="flex items-center gap-3 font-bold text-stone-800"><Scissors size={18} />拆分</span>
          <span className="font-mono text-xs text-stone-400">{formatTime(defaultSplitTime)}</span>
        </button>
        <button
          type="button"
          disabled={!previousLog}
          onClick={() => openMergeConfirmation(previousLog)}
          className="flex w-full items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-4 text-left transition-colors hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="flex items-center gap-3 font-bold text-stone-800"><ArrowUp size={18} />合并到上一条</span>
          <span className="font-mono text-xs text-stone-400">{previousLog ? formatRange(previousLog) : '无上一条'}</span>
        </button>
        <button
          type="button"
          disabled={!nextLog}
          onClick={() => openMergeConfirmation(nextLog)}
          className="flex w-full items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-4 text-left transition-colors hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="flex items-center gap-3 font-bold text-stone-800"><ArrowDown size={18} />合并到下一条</span>
          <span className="font-mono text-xs text-stone-400">{nextLog ? formatRange(nextLog) : '无下一条'}</span>
        </button>
      </div>
      <div className="border-t border-stone-100 bg-white px-6 py-5">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl border border-stone-200 bg-white py-3.5 font-bold text-stone-600 transition-colors hover:bg-stone-50"
        >
          取消
        </button>
      </div>
    </>
  );

  const renderSplit = () => (
    <>
      {renderHeader('拆分记录', '选择拆分位置', () => setStep('choice'))}
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
              className="absolute top-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-white shadow-sm"
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
          <div className="border-r border-stone-200 pr-3"><div className="font-mono font-bold tabular-nums text-stone-700">{formatDuration(splitTime - log.startTime)}</div></div>
          <div className="pl-3"><div className="font-mono font-bold tabular-nums text-stone-700">{formatDuration(log.endTime - splitTime)}</div></div>
        </div>
      </div>
      <div className="flex gap-3 border-t border-stone-100 bg-white px-6 py-5">
        <button type="button" onClick={() => setStep('choice')} className="flex-1 rounded-2xl border border-stone-200 bg-white py-3.5 font-bold text-stone-600 transition-colors hover:bg-stone-50">返回</button>
        <button type="button" onClick={() => onConfirm(splitTime)} disabled={!isValidSplit} className="flex-1 rounded-2xl py-3.5 font-bold text-white shadow-xl transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40" style={{ backgroundColor: 'var(--accent-color)' }}>确定</button>
      </div>
    </>
  );

  const renderMergeConfirmation = () => {
    if (!mergeTarget) return null;

    return (
      <>
        {renderHeader('确认合并', mergeTarget === previousLog ? '合并到上一条记录' : '合并到下一条记录', () => setStep('choice'))}
        <div className="space-y-4 px-6 py-6">
          {renderCurrentLog()}
          <div className="flex justify-center text-stone-300"><GitMerge size={20} /></div>
          <div className="rounded-2xl border border-stone-300 bg-white px-4 py-3">
            <div className="truncate text-sm font-bold text-stone-800">{getLogLabel(mergeTarget)}</div>
            <div className="mt-1 font-mono text-xs tabular-nums text-stone-500">{formatRange(mergeTarget)}</div>
          </div>
          {gapDuration > 60_000 && (
            <div className="flex items-center gap-2 border-y border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              <Clock3 size={15} />包含 {formatDuration(gapDuration)} 空白时间
            </div>
          )}
          <div className="border-t border-stone-200 pt-4 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">合并后时间</div>
            <div className="mt-2 font-mono text-lg font-bold tabular-nums text-stone-800">{formatTime(mergedStartTime)} - {formatTime(mergedEndTime)}</div>
            <div className="mt-1 text-xs text-stone-500">{formatDuration(mergedEndTime - mergedStartTime)}</div>
          </div>
        </div>
        <div className="flex gap-3 border-t border-stone-100 bg-white px-6 py-5">
          <button type="button" onClick={() => setStep('choice')} className="flex-1 rounded-2xl border border-stone-200 bg-white py-3.5 font-bold text-stone-600 transition-colors hover:bg-stone-50">返回</button>
          <button type="button" onClick={() => onMerge(mergeTarget)} className="flex-1 rounded-2xl py-3.5 font-bold text-white shadow-xl transition-transform hover:scale-[1.01] active:scale-[0.99]" style={{ backgroundColor: 'var(--accent-color)' }}>确定合并</button>
        </div>
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center bg-stone-900/40 backdrop-blur-sm animate-fadeIn pb-[env(safe-area-inset-bottom)] md:items-center" onClick={onClose}>
      <div className="w-full overflow-hidden rounded-t-[2rem] bg-[#faf9f6] shadow-2xl animate-slideUp md:max-w-lg md:rounded-3xl" onClick={(event) => event.stopPropagation()}>
        {step === 'choice' && renderChoice()}
        {step === 'split' && renderSplit()}
        {step === 'merge-confirm' && renderMergeConfirmation()}
      </div>
    </div>
  );
};
