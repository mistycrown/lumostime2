/**
 * @file TimelineHeaderDecorationDebugger.tsx
 * @input Active timeline header theme, saved sticker offsets, and preview/save callbacks.
 * @output A live, per-sticker position tuning panel for the Timeline header.
 * @pos Component (Timeline Theme Debugging)
 * @description Mirrors the navigation decoration debugger while retaining sticker changes as a draft until the user saves.
 * @updated 2026-09-27: Added live X/Y sticker tuning, single/all reset, and explicit save behavior.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Move, RotateCcw, Save, X } from 'lucide-react';
import {
  getTimelineHeaderThemeAssets,
  type TimelineHeaderStickerId,
  type TimelineHeaderStickerOffsets,
  type TimelineHeaderTheme
} from './TimelineHeaderDecorations';

interface TimelineHeaderDecorationDebuggerProps {
  theme: TimelineHeaderTheme;
  savedOffsets: TimelineHeaderStickerOffsets;
  onPreview: (offsets: TimelineHeaderStickerOffsets | null) => void;
  onSave: (offsets: TimelineHeaderStickerOffsets) => void;
  onClose: () => void;
}

const getOffset = (offsets: TimelineHeaderStickerOffsets, id: TimelineHeaderStickerId) => (
  offsets[id] || { x: 0, y: 0 }
);

export const TimelineHeaderDecorationDebugger: React.FC<TimelineHeaderDecorationDebuggerProps> = ({
  theme,
  savedOffsets,
  onPreview,
  onSave,
  onClose
}) => {
  const assets = useMemo(() => getTimelineHeaderThemeAssets(theme), [theme]);
  const [activeStickerId, setActiveStickerId] = useState<TimelineHeaderStickerId>(assets[0].id);
  const [draftOffsets, setDraftOffsets] = useState<TimelineHeaderStickerOffsets>(savedOffsets);
  const [isSaved, setIsSaved] = useState(false);
  const activeIndex = assets.findIndex((asset) => asset.id === activeStickerId);
  const activeAsset = assets[Math.max(activeIndex, 0)];
  const activeOffset = getOffset(draftOffsets, activeAsset.id);

  useEffect(() => {
    setDraftOffsets(savedOffsets);
  }, [savedOffsets, theme]);

  useEffect(() => {
    onPreview(draftOffsets);
  }, [draftOffsets, onPreview]);

  useEffect(() => () => onPreview(null), [onPreview]);

  const updateOffset = (axis: 'x' | 'y', delta: number) => {
    setDraftOffsets((current) => {
      const offset = getOffset(current, activeAsset.id);
      return {
        ...current,
        [activeAsset.id]: {
          ...offset,
          [axis]: Math.min(200, Math.max(-200, offset[axis] + delta))
        }
      };
    });
    setIsSaved(false);
  };

  const switchSticker = (direction: 'prev' | 'next') => {
    const nextIndex = direction === 'prev'
      ? (activeIndex - 1 + assets.length) % assets.length
      : (activeIndex + 1) % assets.length;
    setActiveStickerId(assets[nextIndex].id);
  };

  const resetCurrent = () => {
    setDraftOffsets((current) => {
      const next = { ...current };
      delete next[activeAsset.id];
      return next;
    });
    setIsSaved(false);
  };

  const resetAll = () => {
    setDraftOffsets({});
    setIsSaved(false);
  };

  const save = () => {
    onSave(draftOffsets);
    setIsSaved(true);
    window.setTimeout(() => setIsSaved(false), 1200);
  };

  const renderAxisControls = (axis: 'x' | 'y', label: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] text-stone-500">
        <span className="flex items-center gap-1 font-medium"><Move size={11} className={axis === 'y' ? 'rotate-90' : ''} />{label}</span>
        <span className="font-mono font-bold text-stone-700">{activeOffset[axis]}px</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {[-5, -1, 1, 5].map((delta) => (
          <button
            key={delta}
            type="button"
            onClick={() => updateOffset(axis, delta)}
            className="rounded bg-stone-100 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-200"
          >
            {delta > 0 ? `+${delta}` : delta}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed bottom-28 right-4 z-50 w-72 max-h-[calc(100vh-9rem)] overflow-y-auto rounded-xl border border-stone-200 bg-white/95 p-4 shadow-2xl backdrop-blur animate-in fade-in slide-in-from-bottom-4">
      <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-stone-800"><span className="h-2 w-2 rounded-full bg-pink-400" />顶部贴纸调试</h3>
        <div className="flex items-center gap-1">
          <button type="button" onClick={resetAll} className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600" title="全部重置" aria-label="全部重置"><RotateCcw size={14} /></button>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600" title="关闭" aria-label="关闭"><X size={14} /></button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-lg bg-stone-50 p-2">
        <button type="button" onClick={() => switchSticker('prev')} className="rounded p-1.5 text-stone-600 transition-colors hover:bg-white"><ChevronLeft size={16} /></button>
        <div className="min-w-0 px-2 text-center"><p className="truncate text-xs font-medium text-stone-700">{activeAsset.label}</p><p className="truncate text-[10px] text-stone-400">{activeAsset.id}</p></div>
        <button type="button" onClick={() => switchSticker('next')} className="rounded p-1.5 text-stone-600 transition-colors hover:bg-white"><ChevronRight size={16} /></button>
      </div>

      <div className="mb-4 space-y-4">
        {renderAxisControls('x', '水平偏移')}
        {renderAxisControls('y', '垂直偏移')}
      </div>

      <button type="button" onClick={resetCurrent} className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-stone-100 py-2 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-200"><RotateCcw size={13} />重置当前贴纸</button>
      <button type="button" onClick={save} disabled={isSaved} className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold shadow-sm transition-all ${isSaved ? 'border border-green-200 bg-green-100 text-green-700' : 'bg-stone-800 text-white hover:bg-stone-900'}`}><Save size={14} />{isSaved ? '已保存' : '保存位置'}</button>
    </div>
  );
};
