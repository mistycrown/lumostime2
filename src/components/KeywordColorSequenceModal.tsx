/**
 * @file KeywordColorSequenceModal.tsx
 * @input Keyword color sequence state, palette options, and activity update callback.
 * @output Centered modal for enabling and selecting a keyword color sequence.
 * @pos Component (Modal)
 * @description Uses the shared centered modal treatment for keyword color sequence settings.
 * @updated 2026-09-20: Added a reusable modal for keyword color sequence settings.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { Palette, X } from 'lucide-react';
import { ChartPaletteSelector } from './ChartPaletteSelector';
import type { Activity, ActivityStatisticPaletteId, CustomChartPaletteSequence } from '../types';

interface KeywordColorSequenceModalProps {
  isOpen: boolean;
  activity: Activity;
  customSequences: CustomChartPaletteSequence[];
  effectiveSequenceId: ActivityStatisticPaletteId;
  unlocked: boolean;
  onChange: (activity: Activity) => void;
  onClose: () => void;
}

export const KeywordColorSequenceModal: React.FC<KeywordColorSequenceModalProps> = ({
  isOpen,
  activity,
  customSequences,
  effectiveSequenceId,
  unlocked,
  onChange,
  onClose
}) => {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm animate-in fade-in duration-200" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-[#fdfbf7] shadow-2xl animate-in zoom-in-95 duration-200" role="dialog" aria-modal="true" aria-labelledby="keyword-color-sequence-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-stone-100 p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-700"><Palette size={17} strokeWidth={1.8} /></span>
            <div>
              <h3 id="keyword-color-sequence-modal-title" className="text-lg font-semibold text-stone-800">关键字色彩序列</h3>
              <p className="mt-1 text-xs leading-5 text-stone-500">为新关键字生成颜色，也可以在单个关键字中单独调整。</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700" aria-label="关闭"><X size={19} /></button>
        </div>
        <div className="space-y-5 p-6">
          <label className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white px-4 py-3">
            <span className="text-sm font-medium text-stone-700">使用色彩序列</span>
            <input type="checkbox" checked={Boolean(activity.keywordColorSequenceEnabled)} onChange={(event) => onChange({ ...activity, keywordColorSequenceEnabled: event.target.checked || undefined, keywordColorSequenceId: activity.keywordColorSequenceId || 'default' })} className="h-4 w-4 accent-stone-800" />
          </label>
          {activity.keywordColorSequenceEnabled && <ChartPaletteSelector value={effectiveSequenceId} onChange={(keywordColorSequenceId) => onChange({ ...activity, keywordColorSequenceId })} customSequences={customSequences} unlocked={unlocked} />}
        </div>
        <div className="flex justify-end border-t border-stone-100 bg-white p-5"><button type="button" onClick={onClose} className="rounded-2xl bg-stone-800 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-stone-900">完成</button></div>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? modalContent : createPortal(modalContent, document.body);
};
