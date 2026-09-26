/**
 * @file MoodCalendarBackgroundDebugger.tsx
 * @input Current background ID and close callback
 * @output Live preview and persisted position, scale, opacity, and week mapping
 * @pos Component (Memoir Background Tuning)
 * @description Provides navigation-adjuster-style controls for the Memoir mood calendar.
 * @updated 2026-09-26: Added five-week/six-week preview scaling controls.
 */
import React, { useEffect, useState } from 'react';
import { RotateCcw, Save, Sun, X, ZoomIn } from 'lucide-react';
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

export const MoodCalendarBackgroundDebugger: React.FC<MoodCalendarBackgroundDebuggerProps> = ({ backgroundId, onClose }) => {
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [scale, setScale] = useState(100);
    const [opacity, setOpacity] = useState(100);
    const [fiveWeekScale, setFiveWeekScale] = useState(100);
    const [sixWeekScale, setSixWeekScale] = useState(86);
    const [previewWeeks, setPreviewWeeks] = useState<5 | 6>(5);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        const background = moodCalendarBackgroundService.getBackgroundById(backgroundId);
        if (!background) return;
        setOffsetX(parseOffset(background.offsetX));
        setOffsetY(parseOffset(background.offsetY));
        setScale(Math.round((background.scale || 1) * 100));
        setOpacity(Math.round((background.opacity ?? 1) * 100));
        setFiveWeekScale(Math.round((background.weekScale?.fiveWeek ?? 1) * 100));
        setSixWeekScale(Math.round((background.weekScale?.sixWeek ?? 0.86) * 100));
    }, [backgroundId]);

    const settings: MoodCalendarBackgroundSettings = {
        offsetX: `${offsetX}px`,
        offsetY: `${offsetY}px`,
        scale: scale / 100,
        opacity: opacity / 100,
        weekScale: {
            fiveWeek: fiveWeekScale / 100,
            sixWeek: sixWeekScale / 100
        }
    };

    useEffect(() => {
        window.dispatchEvent(new CustomEvent(MOOD_CALENDAR_BACKGROUND_PREVIEW_EVENT, {
            detail: { id: backgroundId, settings, previewWeeks }
        }));
    }, [backgroundId, offsetX, offsetY, scale, opacity, fiveWeekScale, sixWeekScale, previewWeeks]);

    const save = () => {
        moodCalendarBackgroundService.saveCustomSettings(backgroundId, settings);
        setIsSaved(true);
        window.setTimeout(() => setIsSaved(false), 1000);
    };

    const reset = () => {
        const defaults = moodCalendarBackgroundService.getBackgroundDefaultsById(backgroundId);
        const next = {
            offsetX: parseOffset(defaults?.offsetX),
            offsetY: parseOffset(defaults?.offsetY),
            scale: Math.round((defaults?.scale || 1) * 100),
            opacity: Math.round((defaults?.opacity ?? 1) * 100),
            fiveWeek: Math.round((defaults?.weekScale?.fiveWeek ?? 1) * 100),
            sixWeek: Math.round((defaults?.weekScale?.sixWeek ?? 0.86) * 100)
        };
        setOffsetX(next.offsetX);
        setOffsetY(next.offsetY);
        setScale(next.scale);
        setOpacity(next.opacity);
        setFiveWeekScale(next.fiveWeek);
        setSixWeekScale(next.sixWeek);
        moodCalendarBackgroundService.saveCustomSettings(backgroundId, {
            offsetX: `${next.offsetX}px`,
            offsetY: `${next.offsetY}px`,
            scale: next.scale / 100,
            opacity: next.opacity / 100,
            weekScale: { fiveWeek: next.fiveWeek / 100, sixWeek: next.sixWeek / 100 }
        });
    };

    const rangeControl = (label: React.ReactNode, value: number, min: number, max: number, onChange: (value: number) => void, suffix: string) => (
        <label className="block space-y-1.5">
            <span className="flex items-center justify-between text-[11px] text-stone-600">
                <span>{label}</span>
                <span className="font-mono text-stone-800">{value}{suffix}</span>
            </span>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className="h-1.5 w-full accent-stone-700"
            />
        </label>
    );

    return (
        <div className="fixed bottom-5 right-4 z-[90] max-h-[calc(100vh-2rem)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-stone-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
            <div className="mb-3 flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="text-sm font-semibold text-stone-800">心情日历背景调整</h3>
                <div className="flex items-center gap-1">
                    <button type="button" onClick={reset} className="flex h-8 w-8 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100" title="重置" aria-label="重置">
                        <RotateCcw size={15} />
                    </button>
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100" title="关闭" aria-label="关闭">
                        <X size={15} />
                    </button>
                </div>
            </div>

            <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
                <span className="text-[11px] text-stone-500">预览周数</span>
                <div role="group" aria-label="预览周数" className="inline-flex border-b border-stone-200">
                    {([5, 6] as const).map((weeks) => (
                        <button
                            key={weeks}
                            type="button"
                            aria-pressed={previewWeeks === weeks}
                            onClick={() => setPreviewWeeks(weeks)}
                            className={`px-3 py-1.5 text-xs ${previewWeeks === weeks ? 'border-b-2 border-stone-800 text-stone-900' : 'text-stone-400 hover:text-stone-700'}`}
                        >
                            {weeks} 周
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                {rangeControl('水平位置', offsetX, -240, 240, setOffsetX, 'px')}
                {rangeControl('垂直位置', offsetY, -240, 240, setOffsetY, 'px')}
                {rangeControl(<span className="inline-flex items-center gap-1"><ZoomIn size={11} /> 基础缩放</span>, scale, 30, 300, setScale, '%')}
                {rangeControl(<span className="inline-flex items-center gap-1"><Sun size={11} /> 透明度</span>, opacity, 0, 100, setOpacity, '%')}
                {rangeControl('五周映射缩放', fiveWeekScale, 50, 150, setFiveWeekScale, '%')}
                {rangeControl('六周映射缩放', sixWeekScale, 50, 150, setSixWeekScale, '%')}
            </div>

            <button
                type="button"
                onClick={save}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors ${isSaved ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-800 text-white hover:bg-stone-900'}`}
            >
                <Save size={14} /> {isSaved ? '已保存' : '保存设置'}
            </button>
        </div>
    );
};
