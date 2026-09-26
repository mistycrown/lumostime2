/**
 * @file MoodCalendarBackgroundDebugger.tsx
 * @input Current Memoir mood-calendar background and tuning callbacks
 * @output Live preview and persisted position, width, height ratio, and opacity for paired background images
 * @pos Component (Memoir Background Tuning)
 * @description Provides navigation-adjuster-style button controls for the Memoir mood calendar.
 * @updated 2026-09-26: Replaced sliders with mobile-friendly step buttons for paired background images.
 * @updated 2026-09-26: Constrained the mobile panel above bottom navigation and enabled compact scrolling.
 */
import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Move, RotateCcw, Save, Sun, X, ZoomIn } from 'lucide-react';
import {
    moodCalendarBackgroundService,
    MOOD_CALENDAR_BACKGROUND_PREVIEW_EVENT,
    type MoodCalendarBackgroundSettings
} from '../services/moodCalendarBackgroundService';

interface MoodCalendarBackgroundDebuggerProps {
    backgroundId: string;
    onClose: () => void;
}

const parseOffset = (value?: string): number => Number(value?.match(/-?\d+(?:\.\d+)?/)?.[0] || 0);
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const MoodCalendarBackgroundDebugger: React.FC<MoodCalendarBackgroundDebuggerProps> = ({ backgroundId, onClose }) => {
    const [activeId, setActiveId] = useState(backgroundId);
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [widthScale, setWidthScale] = useState(135);
    const [heightScale, setHeightScale] = useState(100);
    const [opacity, setOpacity] = useState(100);
    const [previewWeeks, setPreviewWeeks] = useState<5 | 6>(5);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => setActiveId(backgroundId), [backgroundId]);

    useEffect(() => {
        const background = moodCalendarBackgroundService.getBackgroundById(activeId);
        if (!background) return;
        setOffsetX(parseOffset(background.offsetX));
        setOffsetY(parseOffset(background.offsetY));
        setWidthScale(Math.round((background.scale || 1) * 100));
        setHeightScale(Math.round((background.heightScale || 1) * 100));
        setOpacity(Math.round((background.opacity ?? 1) * 100));
    }, [activeId]);

    const settings: MoodCalendarBackgroundSettings = {
        offsetX: `${offsetX}px`,
        offsetY: `${offsetY}px`,
        scale: widthScale / 100,
        heightScale: heightScale / 100,
        opacity: opacity / 100,
    };

    useEffect(() => {
        window.dispatchEvent(new CustomEvent(MOOD_CALENDAR_BACKGROUND_PREVIEW_EVENT, {
            detail: { id: activeId, settings, previewWeeks }
        }));
    }, [activeId, offsetX, offsetY, widthScale, heightScale, opacity, previewWeeks]);

    const save = () => {
        moodCalendarBackgroundService.saveCustomSettings(activeId, settings);
        setIsSaved(true);
        window.setTimeout(() => setIsSaved(false), 1000);
    };

    const reset = () => {
        const defaults = moodCalendarBackgroundService.getBackgroundDefaultsById(activeId);
        const next = {
            offsetX: parseOffset(defaults?.offsetX),
            offsetY: parseOffset(defaults?.offsetY),
            widthScale: Math.round((defaults?.scale || 1) * 100),
            heightScale: Math.round((defaults?.heightScale || 1) * 100),
            opacity: Math.round((defaults?.opacity ?? 1) * 100)
        };
        setOffsetX(next.offsetX); setOffsetY(next.offsetY); setWidthScale(next.widthScale); setHeightScale(next.heightScale);
        setOpacity(next.opacity);
        moodCalendarBackgroundService.saveCustomSettings(activeId, {
            offsetX: `${next.offsetX}px`, offsetY: `${next.offsetY}px`, scale: next.widthScale / 100,
            heightScale: next.heightScale / 100,
            opacity: next.opacity / 100
        });
    };

    const switchBackground = (direction: 'prev' | 'next') => {
        const all = moodCalendarBackgroundService.getAllBackgrounds();
        const index = all.findIndex((item) => item.id === activeId);
        if (index < 0 || all.length < 2) return;
        const nextIndex = direction === 'prev' ? (index - 1 + all.length) % all.length : (index + 1) % all.length;
        const nextId = all[nextIndex].id;
        setActiveId(nextId);
        moodCalendarBackgroundService.setCurrentBackground(nextId);
    };

    const stepControl = (
        label: React.ReactNode, value: number, min: number, max: number,
        onChange: React.Dispatch<React.SetStateAction<number>>, suffix: string
    ) => (
        <div className="space-y-2">
            <div className="flex justify-between text-[11px] text-stone-500"><span className="flex items-center gap-1 font-medium">{label}</span><span className="font-mono font-bold text-stone-700">{value}{suffix}</span></div>
            <div className="grid grid-cols-4 gap-1.5">
                {[-5, -1, 1, 5].map((step) => <button key={step} type="button" onClick={() => onChange((current) => clamp(current + step, min, max))} className="rounded bg-stone-100 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-200">{step > 0 ? `+${step}` : step}</button>)}
            </div>
        </div>
    );

    return (
        <div className="fixed bottom-20 right-3 z-[90] max-h-[min(20rem,32vh)] w-[min(16rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-stone-200 bg-white/95 p-2.5 shadow-2xl backdrop-blur">
            <div className="mb-3 flex items-center justify-between border-b border-stone-100 pb-2">
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-stone-800"><span className="h-2 w-2 rounded-full bg-amber-400" /> 心情日历背景调整</h3>
                <div className="flex items-center gap-1"><button type="button" onClick={reset} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600" title="重置" aria-label="重置"><RotateCcw size={14} /></button><button type="button" onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600" title="关闭" aria-label="关闭"><X size={14} /></button></div>
            </div>
            <div className="mb-3 flex items-center justify-between rounded-lg bg-stone-50 p-1.5"><button type="button" onClick={() => switchBackground('prev')} className="rounded p-1.5 text-stone-600 shadow-sm hover:bg-white" aria-label="上一个背景"><ChevronLeft size={16} /></button><span className="max-w-[140px] truncate text-center text-xs font-mono font-medium">{activeId}</span><button type="button" onClick={() => switchBackground('next')} className="rounded p-1.5 text-stone-600 shadow-sm hover:bg-white" aria-label="下一个背景"><ChevronRight size={16} /></button></div>
            <div className="mb-3 flex items-center justify-between border-b border-stone-100 pb-2"><span className="text-[11px] text-stone-500">预览周数</span><div role="group" aria-label="预览周数" className="inline-flex border-b border-stone-200">{([5, 6] as const).map((weeks) => <button key={weeks} type="button" aria-pressed={previewWeeks === weeks} onClick={() => setPreviewWeeks(weeks)} className={`px-3 py-1.5 text-xs ${previewWeeks === weeks ? 'border-b-2 border-stone-800 text-stone-900' : 'text-stone-400 hover:text-stone-700'}`}>{weeks} 周</button>)}</div></div>
            <div className="mb-3 space-y-3">
                {stepControl(<><Move size={11} /> 水平位置</>, offsetX, -240, 240, setOffsetX, 'px')}
                {stepControl(<><Move size={11} className="rotate-90" /> 垂直位置</>, offsetY, -240, 240, setOffsetY, 'px')}
                {stepControl(<><ZoomIn size={11} /> 图片宽度</>, widthScale, 30, 300, setWidthScale, '%')}
                {stepControl(<><ZoomIn size={11} /> 纵向高度</>, heightScale, 30, 300, setHeightScale, '%')}
                {stepControl(<><Sun size={11} /> 透明度</>, opacity, 0, 100, setOpacity, '%')}
            </div>
            <button type="button" onClick={save} disabled={isSaved} className={`flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold shadow-sm transition-all ${isSaved ? 'border border-green-200 bg-green-100 text-green-700' : 'bg-stone-800 text-white hover:bg-stone-900'}`}><Save size={14} /> <span>{isSaved ? '已保存设置' : '保存当前状态'}</span></button>
        </div>
    );
};
