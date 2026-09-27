/**
 * @file TimelineHeaderDecorationDebugger.tsx
 * @input Active timeline header theme, saved per-theme adjustments, and preview/save callbacks.
 * @output A live panel for all themed background, toolbar, and sticker visual properties.
 * @description Keeps visual calibration separate from calendar interactions while previewing changes before persistence.
 * @updated 2026-09-27: Added live X/Y sticker tuning, single/all reset, and explicit save behavior.
 * @updated 2026-09-27: Added per-theme date-strip horizontal/vertical scaling while retaining individual sticker position controls.
 * @updated 2026-09-27: Adds toolbar foreground color tuning and includes all configured header/date stickers in layer navigation.
 * @updated 2026-09-27: Extends every background and sticker with independent size and opacity controls.
 * @updated 2026-09-27: Restores independent X/Y adjustment for every background image layer.
 * @updated 2026-09-27: Caps panel height so extended controls scroll instead of blocking the timeline.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, RotateCcw, Save, X } from 'lucide-react';
import {
  getDefaultTimelineHeaderThemeAdjustments,
  getTimelineHeaderThemeAssets,
  getTimelineHeaderThemeConfig,
  type TimelineHeaderLayerScale,
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

type BackgroundLayer = 'top-background' | 'date-background' | 'selected-date-background';
type ActiveLayer = BackgroundLayer | 'toolbar-foreground' | TimelineHeaderStickerId;

const getOffset = (adjustments: TimelineHeaderThemeAdjustments, id: TimelineHeaderStickerId) => (
  adjustments.stickerOffsets[id] || { x: 0, y: 0 }
);

const getStickerScale = (adjustments: TimelineHeaderThemeAdjustments, id: TimelineHeaderStickerId) => (
  adjustments.stickerScales[id] ?? 1
);

const getStickerOpacity = (adjustments: TimelineHeaderThemeAdjustments, id: TimelineHeaderStickerId) => (
  adjustments.stickerOpacities[id] ?? 1
);

const getBackgroundOpacityFrom = (adjustments: TimelineHeaderThemeAdjustments, layer: BackgroundLayer): number => {
  if (layer === 'top-background') return adjustments.topBackgroundOpacity;
  if (layer === 'date-background') return adjustments.dateBackgroundOpacity;
  return adjustments.selectedDateBackgroundOpacity;
};

const cloneAdjustments = (adjustments: TimelineHeaderThemeAdjustments): TimelineHeaderThemeAdjustments => ({
  stickerOffsets: { ...adjustments.stickerOffsets },
  stickerScales: { ...adjustments.stickerScales },
  stickerOpacities: { ...adjustments.stickerOpacities },
  topBackgroundOffset: { ...adjustments.topBackgroundOffset },
  topBackgroundScale: { ...adjustments.topBackgroundScale },
  topBackgroundOpacity: adjustments.topBackgroundOpacity,
  dateBackgroundOffset: { ...adjustments.dateBackgroundOffset },
  dateBackgroundScale: { ...adjustments.dateBackgroundScale },
  dateBackgroundOpacity: adjustments.dateBackgroundOpacity,
  selectedDateBackgroundOffset: { ...adjustments.selectedDateBackgroundOffset },
  selectedDateBackgroundScale: { ...adjustments.selectedDateBackgroundScale },
  selectedDateBackgroundOpacity: adjustments.selectedDateBackgroundOpacity,
  toolbarForegroundColor: adjustments.toolbarForegroundColor
});

const isBackgroundLayer = (layer: ActiveLayer): layer is BackgroundLayer => (
  layer === 'top-background' || layer === 'date-background' || layer === 'selected-date-background'
);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
    ...(config?.topBackground ? ['top-background' as const] : []),
    ...(config?.dateBackground ? ['date-background' as const] : []),
    ...(config?.selectedDateBackground ? ['selected-date-background' as const] : []),
    ...(config?.toolbarForegroundColor ? ['toolbar-foreground' as const] : []),
    ...assets.map((asset) => asset.id)
  ], [assets, config?.dateBackground, config?.selectedDateBackground, config?.toolbarForegroundColor, config?.topBackground]);
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>(controls[0]);
  const [draftAdjustments, setDraftAdjustments] = useState<TimelineHeaderThemeAdjustments>(() => cloneAdjustments(savedAdjustments));
  const [isSaved, setIsSaved] = useState(false);
  const activeIndex = Math.max(controls.indexOf(activeLayer), 0);
  const activeControl = controls[activeIndex];
  const activeAsset = isBackgroundLayer(activeControl) || activeControl === 'toolbar-foreground'
    ? undefined
    : assets.find((asset) => asset.id === activeControl);
  const activeOffset = activeAsset ? getOffset(draftAdjustments, activeAsset.id) : { x: 0, y: 0 };

  useEffect(() => {
    setDraftAdjustments(cloneAdjustments(savedAdjustments));
  }, [savedAdjustments, theme]);

  useEffect(() => {
    setActiveLayer(controls[0]);
  }, [controls, theme]);

  useEffect(() => {
    onPreview(draftAdjustments);
  }, [draftAdjustments, onPreview]);

  useEffect(() => () => onPreview(null), [onPreview]);

  if (!config || controls.length === 0) return null;

  const getBackgroundScale = (layer: BackgroundLayer): TimelineHeaderLayerScale => {
    if (layer === 'top-background') return draftAdjustments.topBackgroundScale;
    if (layer === 'date-background') return draftAdjustments.dateBackgroundScale;
    return draftAdjustments.selectedDateBackgroundScale;
  };

  const getBackgroundOffset = (layer: BackgroundLayer) => {
    if (layer === 'top-background') return draftAdjustments.topBackgroundOffset;
    if (layer === 'date-background') return draftAdjustments.dateBackgroundOffset;
    return draftAdjustments.selectedDateBackgroundOffset;
  };

  const updateOffset = (axis: 'x' | 'y', delta: number) => {
    if (!activeAsset) return;

    setDraftAdjustments((current) => {
      const offset = getOffset(current, activeAsset.id);
      return {
        ...current,
        stickerOffsets: {
          ...current.stickerOffsets,
          [activeAsset.id]: { ...offset, [axis]: clamp(offset[axis] + delta, -200, 200) }
        }
      };
    });
    setIsSaved(false);
  };

  const updateBackgroundScale = (layer: BackgroundLayer, axis: 'x' | 'y', deltaPercent: number) => {
    setDraftAdjustments((current) => {
      const nextScale = (scale: TimelineHeaderLayerScale) => ({ ...scale, [axis]: clamp(scale[axis] + deltaPercent / 100, 0.5, 2) });
      if (layer === 'top-background') return { ...current, topBackgroundScale: nextScale(current.topBackgroundScale) };
      if (layer === 'date-background') return { ...current, dateBackgroundScale: nextScale(current.dateBackgroundScale) };
      return { ...current, selectedDateBackgroundScale: nextScale(current.selectedDateBackgroundScale) };
    });
    setIsSaved(false);
  };

  const updateBackgroundOffset = (layer: BackgroundLayer, axis: 'x' | 'y', delta: number) => {
    setDraftAdjustments((current) => {
      const nextOffset = (offset: { x: number; y: number }) => ({ ...offset, [axis]: clamp(offset[axis] + delta, -200, 200) });
      if (layer === 'top-background') return { ...current, topBackgroundOffset: nextOffset(current.topBackgroundOffset) };
      if (layer === 'date-background') return { ...current, dateBackgroundOffset: nextOffset(current.dateBackgroundOffset) };
      return { ...current, selectedDateBackgroundOffset: nextOffset(current.selectedDateBackgroundOffset) };
    });
    setIsSaved(false);
  };

  const updateBackgroundOpacity = (layer: BackgroundLayer, deltaPercent: number) => {
    setDraftAdjustments((current) => {
      const opacity = clamp(getBackgroundOpacityFrom(current, layer) + deltaPercent / 100, 0, 1);
      if (layer === 'top-background') return { ...current, topBackgroundOpacity: opacity };
      if (layer === 'date-background') return { ...current, dateBackgroundOpacity: opacity };
      return { ...current, selectedDateBackgroundOpacity: opacity };
    });
    setIsSaved(false);
  };

  const updateStickerScale = (deltaPercent: number) => {
    if (!activeAsset) return;
    setDraftAdjustments((current) => ({
      ...current,
      stickerScales: { ...current.stickerScales, [activeAsset.id]: clamp(getStickerScale(current, activeAsset.id) + deltaPercent / 100, 0.5, 2) }
    }));
    setIsSaved(false);
  };

  const updateStickerOpacity = (deltaPercent: number) => {
    if (!activeAsset) return;
    setDraftAdjustments((current) => ({
      ...current,
      stickerOpacities: { ...current.stickerOpacities, [activeAsset.id]: clamp(getStickerOpacity(current, activeAsset.id) + deltaPercent / 100, 0, 1) }
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
      if (activeControl === 'top-background') return { ...current, topBackgroundOffset: { x: 0, y: 0 }, topBackgroundScale: { x: 1, y: 1 }, topBackgroundOpacity: 1 };
      if (activeControl === 'date-background') return { ...current, dateBackgroundOffset: { x: 0, y: 0 }, dateBackgroundScale: { x: 1, y: 1 }, dateBackgroundOpacity: 1 };
      if (activeControl === 'selected-date-background') return { ...current, selectedDateBackgroundOffset: { x: 0, y: 0 }, selectedDateBackgroundScale: { x: 1, y: 1 }, selectedDateBackgroundOpacity: 1 };
      if (activeControl === 'toolbar-foreground') return { ...current, toolbarForegroundColor: config.toolbarForegroundColor };
      if (!activeAsset) return current;

      const stickerOffsets = { ...current.stickerOffsets };
      const stickerScales = { ...current.stickerScales };
      const stickerOpacities = { ...current.stickerOpacities };
      delete stickerOffsets[activeAsset.id];
      delete stickerScales[activeAsset.id];
      delete stickerOpacities[activeAsset.id];
      return { ...current, stickerOffsets, stickerScales, stickerOpacities };
    });
    setIsSaved(false);
  };

  const resetAll = () => {
    setDraftAdjustments(getDefaultTimelineHeaderThemeAdjustments(theme));
    setIsSaved(false);
  };

  const save = () => {
    onSave(draftAdjustments);
    setIsSaved(true);
    window.setTimeout(() => setIsSaved(false), 1200);
  };

  const renderStepper = (label: string, value: string, onChange: (delta: number) => void, deltas: number[], suffix = '') => (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] text-stone-500">
        <span className="flex items-center gap-1 font-medium"><Maximize2 size={11} />{label}</span>
        <span className="font-mono font-bold text-stone-700">{value}</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {deltas.map((delta) => (
          <button key={delta} type="button" onClick={() => onChange(delta)} className="rounded bg-stone-100 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-200">
            {delta > 0 ? `+${delta}` : delta}{suffix}
          </button>
        ))}
      </div>
    </div>
  );

  const updateToolbarForegroundColor = (toolbarForegroundColor: string) => {
    setDraftAdjustments((current) => ({ ...current, toolbarForegroundColor }));
    setIsSaved(false);
  };

  const activeBackground = isBackgroundLayer(activeControl) ? activeControl : undefined;
  const activeBackgroundAsset = activeControl === 'top-background'
    ? config.topBackground
    : activeControl === 'date-background'
      ? config.dateBackground
      : activeControl === 'selected-date-background'
        ? config.selectedDateBackground
        : undefined;
  const activeLabel = activeBackgroundAsset?.label || (activeControl === 'toolbar-foreground' ? '顶部按钮与日期文字颜色' : activeAsset?.label || '贴纸');
  const activeId = activeBackgroundAsset?.id || (activeControl === 'toolbar-foreground' ? 'toolbar-foreground' : activeAsset?.id);
  const toolbarForegroundColor = draftAdjustments.toolbarForegroundColor || config.toolbarForegroundColor || '#FFFFFF';

  return (
    <div className="fixed bottom-28 right-4 z-50 w-72 max-h-[min(60vh,32rem)] overflow-y-auto rounded-xl border border-stone-200 bg-white/95 p-4 shadow-2xl backdrop-blur animate-in fade-in slide-in-from-bottom-4">
      <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-stone-800"><span className="h-2 w-2 rounded-full bg-pink-400" />顶部装饰调试</h3>
        <div className="flex items-center gap-1">
          <button type="button" onClick={resetAll} className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600" title="全部重置" aria-label="全部重置"><RotateCcw size={14} /></button>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600" title="关闭" aria-label="关闭"><X size={14} /></button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-lg bg-stone-50 p-2">
        <button type="button" onClick={() => switchLayer('prev')} className="rounded p-1.5 text-stone-600 transition-colors hover:bg-white" aria-label="上一个元素"><ChevronLeft size={16} /></button>
        <div className="min-w-0 px-2 text-center"><p className="truncate text-xs font-medium text-stone-700">{activeLabel}</p><p className="truncate text-[10px] text-stone-400">{activeId}</p></div>
        <button type="button" onClick={() => switchLayer('next')} className="rounded p-1.5 text-stone-600 transition-colors hover:bg-white" aria-label="下一个元素"><ChevronRight size={16} /></button>
      </div>

      {activeControl === 'toolbar-foreground' ? (
        <div className="mb-4 rounded-lg bg-stone-50 p-3">
          <label className="mb-2 block text-[11px] font-medium text-stone-500" htmlFor="timeline-header-toolbar-color">图标、日期文字与按钮描边</label>
          <div className="flex items-center gap-3">
            <input id="timeline-header-toolbar-color" type="color" value={toolbarForegroundColor} onChange={(event) => updateToolbarForegroundColor(event.target.value.toUpperCase())} className="h-9 w-12 cursor-pointer rounded border border-stone-200 bg-white p-1" />
            <span className="font-mono text-sm font-bold text-stone-700">{toolbarForegroundColor}</span>
          </div>
        </div>
      ) : activeBackground ? (
        <div className="mb-4 space-y-4">
          {renderStepper('水平偏移', `${getBackgroundOffset(activeBackground).x}px`, (delta) => updateBackgroundOffset(activeBackground, 'x', delta), [-5, -1, 1, 5], 'px')}
          {renderStepper('垂直偏移', `${getBackgroundOffset(activeBackground).y}px`, (delta) => updateBackgroundOffset(activeBackground, 'y', delta), [-5, -1, 1, 5], 'px')}
          {renderStepper('横向缩放', `${Math.round(getBackgroundScale(activeBackground).x * 100)}%`, (delta) => updateBackgroundScale(activeBackground, 'x', delta), [-5, -1, 1, 5], '%')}
          {renderStepper('纵向缩放', `${Math.round(getBackgroundScale(activeBackground).y * 100)}%`, (delta) => updateBackgroundScale(activeBackground, 'y', delta), [-5, -1, 1, 5], '%')}
          {renderStepper('透明度', `${Math.round(getBackgroundOpacityFrom(draftAdjustments, activeBackground) * 100)}%`, (delta) => updateBackgroundOpacity(activeBackground, delta), [-10, -1, 1, 10], '%')}
        </div>
      ) : (
        <div className="mb-4 space-y-4">
          {renderStepper('水平偏移', `${activeOffset.x}px`, (delta) => updateOffset('x', delta), [-5, -1, 1, 5], 'px')}
          {renderStepper('垂直偏移', `${activeOffset.y}px`, (delta) => updateOffset('y', delta), [-5, -1, 1, 5], 'px')}
          {renderStepper('大小', `${Math.round((activeAsset ? getStickerScale(draftAdjustments, activeAsset.id) : 1) * 100)}%`, updateStickerScale, [-5, -1, 1, 5], '%')}
          {renderStepper('透明度', `${Math.round((activeAsset ? getStickerOpacity(draftAdjustments, activeAsset.id) : 1) * 100)}%`, updateStickerOpacity, [-10, -1, 1, 10], '%')}
        </div>
      )}

      <button type="button" onClick={resetCurrent} className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-stone-100 py-2 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-200"><RotateCcw size={13} />重置当前元素</button>
      <button type="button" onClick={save} disabled={isSaved} className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold shadow-sm transition-all ${isSaved ? 'border border-green-200 bg-green-100 text-green-700' : 'bg-stone-800 text-white hover:bg-stone-900'}`}><Save size={14} />{isSaved ? '已保存' : '保存调整'}</button>
    </div>
  );
};
