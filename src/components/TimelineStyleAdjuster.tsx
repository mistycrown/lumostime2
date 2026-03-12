/**
 * @file TimelineStyleAdjuster.tsx
 * @input Close callback
 * @output Floating timeline style adjuster panel for TimelineView
 * @pos Component (Timeline)
 * @description 时间线样式调节器 - 在时间脉络页面悬浮显示，支持边调边看普通节点效果
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import {
    DEFAULT_TIMELINE_STYLE_CONFIGS,
    TIMELINE_STYLE_THEMES,
    TimelineStyleConfig,
    getTimelineStyleLabel
} from '../services/timelineStyleService';

interface TimelineStyleAdjusterProps {
    onClose: () => void;
}

interface NumberControlProps {
    label: string;
    value: number;
    suffix?: string;
    onStep: (delta: number) => void;
    steps: [number, number, number, number];
}

const NumberControl: React.FC<NumberControlProps> = ({ label, value, suffix = '', onStep, steps }) => {
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-[11px] text-stone-500">
                <span className="font-medium">{label}</span>
                <span className="font-mono font-bold text-stone-700">{`${value}${suffix}`}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
                {steps.map((step) => (
                    <button
                        key={step}
                        onClick={() => onStep(step)}
                        className="bg-stone-100 hover:bg-stone-200 rounded py-1.5 text-xs font-medium text-stone-600 transition-colors"
                    >
                        {step > 0 ? `+${step}` : step}
                    </button>
                ))}
            </div>
        </div>
    );
};

export const TimelineStyleAdjuster: React.FC<TimelineStyleAdjusterProps> = ({ onClose }) => {
    const {
        timelineStyleTheme,
        timelineStyleConfigs,
        setTimelineStyleTheme,
        setTimelineStyleConfigs
    } = useSettings();

    const currentConfig = useMemo(() => timelineStyleConfigs[timelineStyleTheme], [timelineStyleConfigs, timelineStyleTheme]);

    const safeNodeColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(currentConfig.nodeColor)
        ? currentConfig.nodeColor
        : DEFAULT_TIMELINE_STYLE_CONFIGS[timelineStyleTheme].nodeColor;
    const safeLineColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(currentConfig.lineColor)
        ? currentConfig.lineColor
        : DEFAULT_TIMELINE_STYLE_CONFIGS[timelineStyleTheme].lineColor;

    const updateCurrentConfig = <K extends keyof TimelineStyleConfig>(key: K, value: TimelineStyleConfig[K]) => {
        setTimelineStyleConfigs((prev) => ({
            ...prev,
            [timelineStyleTheme]: {
                ...prev[timelineStyleTheme],
                [key]: value
            }
        }));
    };

    const updateNumber = (key: keyof TimelineStyleConfig, delta: number, min: number, max: number, precision: number = 1) => {
        const nextValue = currentConfig[key];
        if (typeof nextValue !== 'number') return;

        const rawValue = Number((nextValue + delta).toFixed(precision));
        const clampedValue = Math.min(max, Math.max(min, rawValue));
        updateCurrentConfig(key as keyof TimelineStyleConfig, clampedValue as TimelineStyleConfig[keyof TimelineStyleConfig]);
    };

    const handleReset = () => {
        setTimelineStyleConfigs((prev) => ({
            ...prev,
            [timelineStyleTheme]: { ...DEFAULT_TIMELINE_STYLE_CONFIGS[timelineStyleTheme] }
        }));
    };

    const customThemes = TIMELINE_STYLE_THEMES.filter((theme) => theme !== 'default');

    const handleSwitchTheme = (direction: 'prev' | 'next') => {
        const currentIndex = customThemes.indexOf(timelineStyleTheme);
        const safeIndex = currentIndex >= 0 ? currentIndex : 0;
        const offset = direction === 'prev' ? -1 : 1;
        const nextIndex = (safeIndex + offset + customThemes.length) % customThemes.length;
        setTimelineStyleTheme(customThemes[nextIndex]);
    };

    return (
        <div className="fixed bottom-28 right-4 z-50 bg-white/95 backdrop-blur rounded-xl shadow-2xl border border-stone-200 p-4 w-72 animate-in fade-in slide-in-from-bottom-4 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <div>
                        <h3 className="text-sm font-bold text-stone-800">时间线调节</h3>
                        <p className="text-[11px] text-stone-400 mt-0.5">{getTimelineStyleLabel(timelineStyleTheme)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleReset}
                        className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                        title="恢复默认值"
                    >
                        <RotateCcw size={14} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                        title="关闭"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between bg-stone-50 rounded-lg p-2 mb-4">
                <button
                    onClick={() => handleSwitchTheme('prev')}
                    className="p-1.5 hover:bg-white rounded shadow-sm text-stone-600 transition-all"
                    aria-label="上一个时间线样式"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-medium text-stone-700 truncate max-w-[120px] text-center">
                    {getTimelineStyleLabel(timelineStyleTheme)}
                </span>
                <button
                    onClick={() => handleSwitchTheme('next')}
                    className="p-1.5 hover:bg-white rounded shadow-sm text-stone-600 transition-all"
                    aria-label="下一个时间线样式"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 text-[11px] text-stone-400 bg-stone-50 rounded-lg px-3 py-2">
                    <SlidersHorizontal size={12} />
                    <span>调节结果会即时作用于当前页面的普通记录节点</span>
                </div>

                <NumberControl
                    label="节点大小"
                    value={currentConfig.iconSize}
                    suffix="px"
                    onStep={(delta) => updateNumber('iconSize', delta, 4, 32)}
                    steps={[-4, -1, 1, 4]}
                />
                <NumberControl
                    label="固定角度"
                    value={currentConfig.iconAngle}
                    suffix="°"
                    onStep={(delta) => updateNumber('iconAngle', delta, -180, 180)}
                    steps={[-15, -5, 5, 15]}
                />
                <NumberControl
                    label="线条粗细"
                    value={currentConfig.lineWidth}
                    suffix="px"
                    onStep={(delta) => updateNumber('lineWidth', delta, 1, 8, 1)}
                    steps={[-1, -0.5, 0.5, 1]}
                />
                <NumberControl
                    label="元素水平偏移"
                    value={currentConfig.offsetX}
                    suffix="px"
                    onStep={(delta) => updateNumber('offsetX', delta, -40, 40)}
                    steps={[-4, -1, 1, 4]}
                />
                <NumberControl
                    label="轨道水平偏移"
                    value={currentConfig.railOffsetX}
                    suffix="px"
                    onStep={(delta) => updateNumber('railOffsetX', delta, -40, 40)}
                    steps={[-4, -1, 1, 4]}
                />
                <NumberControl
                    label="时间节点位置"
                    value={currentConfig.timeNodeOffsetY}
                    suffix="px"
                    onStep={(delta) => updateNumber('timeNodeOffsetY', delta, -20, 20)}
                    steps={[-2, -1, 1, 2]}
                />
                <NumberControl
                    label="线条透明度"
                    value={currentConfig.lineOpacity}
                    suffix="%"
                    onStep={(delta) => updateNumber('lineOpacity', delta, 0, 100)}
                    steps={[-10, -5, 5, 10]}
                />

                <div className="flex items-center justify-between bg-stone-50 rounded-xl px-3 py-2">
                    <div>
                        <div className="text-[11px] text-stone-500">统一节点</div>
                        <div className="text-xs text-stone-400 mt-0.5">关闭后按参考逻辑轮换图标与角度</div>
                    </div>
                    <button
                        onClick={() => updateCurrentConfig('uniformNodes', !currentConfig.uniformNodes)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            currentConfig.uniformNodes ? 'bg-stone-800' : 'bg-stone-200'
                        }`}
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                currentConfig.uniformNodes ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                        />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <label className="space-y-1.5">
                        <span className="text-[11px] font-medium text-stone-500">节点颜色</span>
                        <div className="flex items-center gap-2 bg-stone-50 rounded-xl px-3 py-2">
                            <input
                                type="color"
                                value={safeNodeColor}
                                onChange={(event) => updateCurrentConfig('nodeColor', event.target.value)}
                                className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                            />
                            <input
                                type="text"
                                value={currentConfig.nodeColor}
                                onChange={(event) => updateCurrentConfig('nodeColor', event.target.value)}
                                className="flex-1 bg-transparent text-xs font-mono text-stone-700 focus:outline-none uppercase"
                            />
                        </div>
                    </label>

                    <label className="space-y-1.5">
                        <span className="text-[11px] font-medium text-stone-500">连线颜色</span>
                        <div className="flex items-center gap-2 bg-stone-50 rounded-xl px-3 py-2">
                            <input
                                type="color"
                                value={safeLineColor}
                                onChange={(event) => updateCurrentConfig('lineColor', event.target.value)}
                                className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                            />
                            <input
                                type="text"
                                value={currentConfig.lineColor}
                                onChange={(event) => updateCurrentConfig('lineColor', event.target.value)}
                                className="flex-1 bg-transparent text-xs font-mono text-stone-700 focus:outline-none uppercase"
                            />
                        </div>
                    </label>
                </div>
            </div>
        </div>
    );
};
