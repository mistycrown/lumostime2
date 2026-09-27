/**
 * @file TimelineHeaderDecorationDebugger.tsx
 * @input Active timeline header theme, its saved per-theme adjustments, and preview/save callbacks.
 * @output A live panel for date-strip scaling and individual sticker X/Y tuning.
 * @description Mirrors the navigation decoration debugger while deliberately excluding top and selected-date background layers from adjustment.
 * @updated 2026-09-27: Added live X/Y sticker tuning, single/all reset, and explicit save behavior.
 * @updated 2026-09-27: Added per-theme date-strip horizontal/vertical scaling while retaining individual sticker position controls.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Move, RotateCcw, Save, X } from 'lucide-react';
import {
  getDefaultTimelineHeaderThemeAdjustments,
  getTimelineHeaderThemeAssets,
  getTimelineHeaderThemeConfig,
  type TimelineHeaderStickerId,
  type TimelineHeaderTheme,
  type TimelineHeaderThemeAdjustments
} from './TimelineHeaderDecorations';

interface TimelineHeaderDecorationDebuggerProps {
  theme: TimelineHeaderTheme;
  savedAdjustments: TimelineHeaderThemeAdjustments;
  onPreview: (adjustments: TimelineHeaderThemeAdjustments | null) => void;
  onSave: (adjustments: TimelineHeaderThemeAdjustments) => void;
  onClose: () => void;
}

type ActiveLayer = 'date-background' | TimelineHeaderStickerId;

const getOffset = (adjustments: TimelineHeaderThemeAdjustments, id: TimelineHeaderStickerId) => (
  adjustments.stickerOffsets[id] || { x: 0, y: 0 }
);

const cloneAdjustments = (adjustments: TimelineHeaderThemeAdjustments): TimelineHeaderThemeAdjustments => ({
  stickerOffsets: { ...adjustments.stickerOffsets },
  dateBackgroundScale: { ...adjustments.dateBackgroundScale }
});

export const TimelineHeaderDecorationDebugger: React.FC<TimelineHeaderDecorationDebuggerProps> = ({
  theme,
  savedAdjustments,
  onPreview,
  onSave,
  onClose
}) => {
  const config = getTimelineHeaderThemeConfig(theme);
  const assets = useMemo(() => getTimelineHeaderThemeAssets(theme), [theme]);
  const controls = useMemo<ActiveLayer[]>(() => [
    ...(config?.dateBackground ? ['date-background' as const] : []),
    ...assets.map((asset) => asset.id)
  ], [assets, config?.dateBackground]);
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>(controls[0]);
  const [draftAdjustments, setDraftAdjustments] = useState<TimelineHeaderThemeAdjustments>(() => cloneAdjustments(savedAdjustments));
  const [isSaved, setIsSaved] = useState(false);
  const activeIndex = Math.max(controls.indexOf(activeLayer), 0);
  const activeControl = controls[activeIndex];
  const activeAsset = activeControl === 'date-background'
    ? undefined
    : assets.find((asset) => asset.id === activeControl);
  const isDateBackgroundControl = activeControl === 'date-background';
  const activeOffset = activeAsset ? getOffset(draftAdjustments, activeAsset.id) : { x: 0, y: 0 };

  useEffect(() => {
    setDraftAdjustments(cloneAdjustments(savedAdjustments));
  }, [savedAdjustments, theme]);

  useEffect(() => {
    setActiveLayer(controls[0]);
  }, [theme]);

  useEffect(() => {
    onPreview(draftAdjustments);
  }, [draftAdjustments, onPreview]);

  useEffect(() => () => onPreview(null), [onPreview]);

  if (!config || controls.length === 0) return null;

  const updateOffset = (axis: 'x' | 'y', delta: number) => {
    if (!activeAsset) return;

    setDraftAdjustments((current) => {
      const offset = getOffset(current, activeAsset.id);
      return {
        ...current,
        stickerOffsets: {
          ...current.stickerOffsets,
          [activeAsset.id]: {
            ...offset,
            [axis]: Math.min(200, Math.max(-200, offset[axis] + delta))
          }
        }
      };
    });
    setIsSaved(false);
  };

  const updateDateBackgroundScale = (axis: 'x' | 'y', deltaPercent: number) => {
    setDraftAdjustments((current) => ({
      ...current,
      dateBackgroundScale: {
        ...current.dateBackgroundScale,
        [axis]: Math.min(2, Math.max(0.5, current.dateBackgroundScale[axis] + deltaPercent / 100))
      }
    }));
    setIsSaved(false);
  };

  const switchLayer = (direction: 'prev' | 'next') => {
    const nextIndex = direction === 'prev'
      ? (activeIndex - 1 + controls.length) % controls.length
      : (activeIndex + 1) % controls.length;
    setActiveLayer(controls[nextIndex]);
  };

  const resetCurrent = () => {
    setDraftAdjustments((current) => {
      if (isDateBackgroundControl) {
        return { ...current, dateBackgroundScale: { x: 1, y: 1 } };
      }

      if (!activeAsset) return current;
      const stickerOffsets = { ...current.stickerOffsets };
      delete stickerOffsets[activeAsset.id];
      return { ...current, stickerOffsets };
    });
    setIsSaved(false);
  };

  const resetAll = () => {
    setDraftAdjustments(getDefaultTimelineHeaderThemeAdjustments());
    setIsSaved(false);
  };

  const save = () => {
    onSave(draftAdjustments);
    setIsSaved(true);
    window.setTimeout(() => setIsSaved(false), 1200);
  };

  const renderAxisControls = (axis: 'x' | 'y', label: string) => {
    const value = isDateBackgroundControl
      ? `${Math.round(draftAdjustments.dateBackgroundScale[axis] * 100)}%`
      : `${activeOffset[axis]}px`;
    const update = (delta: number) => isDateBackgroundControl
      ? updateDateBackgroundScale(axis, delta)
      : updateOffset(axis, delta);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-stone-500">
          <span className="flex items-center gap-1 font-medium">
            {isDateBackgroundControl ? <Maximize2 size={11} className={axis === 'y' ? 'rotate-90' : ''} /> : <Move size={11} className={axis === 'y' ? 'rotate-90' : ''} />}
            {label}
          </span>
          <span className="font-mono font-bold text-stone-700">{value}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[-5, -1, 1, 5].map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => update(delta)}
              className="rounded bg-stone-100 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-200"
            >
              {delta > 0 ? `+${delta}` : delta}{isDateBackgroundControl ? '%' : ''}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const activeLabel = isDateBackgroundControl ? '日期栏背景' : activeAsset?.label || '贴纸';
  const activeId = isDateBackgroundControl ? config.dateBackground?.id : activeAsset?.id;

  return (
    <div className="fixed bottom-28 right-4 z-50 w-72 max-h-[calc(100vh-9rem)] overflow-y-auto rounded-xl border border-stone-200 bg-white/95 p-4 shadow-2xl backdrop-blur animate-in fade-in slide-in-from-bottom-4">
      <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-stone-800"><span className="h-2 w-2 rounded-full bg-pink-400" />顶部装饰调试</h3>
        <div className="flex items-center gap-1">
          <button type="button" onClick={resetAll} className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600" title="全部重置" aria-label="全部重置"><RotateCcw size={14} /></button>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600" title="关闭" aria-label="关闭"><X size={14} /></button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-lg bg-stone-50 p-2">
        <button type="button" onClick={() => switchLayer('prev')} className="rounded p-1.5 text-stone-600 transition-colors hover:bg-white"><ChevronLeft size={16} /></button>
        <div className="min-w-0 px-2 text-center"><p className="truncate text-xs font-medium text-stone-700">{activeLabel}</p><p className="truncate text-[10px] text-stone-400">{activeId}</p></div>
        <button type="button" onClick={() => switchLayer('next')} className="rounded p-1.5 text-stone-600 transition-colors hover:bg-white"><ChevronRight size={16} /></button>
      </div>

      <div className="mb-4 space-y-4">
        {renderAxisControls('x', isDateBackgroundControl ? '横向缩放' : '水平偏移')}
        {renderAxisControls('y', isDateBackgroundControl ? '纵向缩放' : '垂直偏移')}
      </div>

      <button type="button" onClick={resetCurrent} className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-stone-100 py-2 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-200"><RotateCcw size={13} />重置当前{isDateBackgroundControl ? '背景' : '贴纸'}</button>
      <button type="button" onClick={save} disabled={isSaved} className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold shadow-sm transition-all ${isSaved ? 'border border-green-200 bg-green-100 text-green-700' : 'bg-stone-800 text-white hover:bg-stone-900'}`}><Save size={14} />{isSaved ? '已保存' : '保存调整'}</button>
    </div>
  );
};
