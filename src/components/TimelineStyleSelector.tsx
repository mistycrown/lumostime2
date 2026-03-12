/**
 * @file TimelineStyleSelector.tsx
 * @input Toast callback
 * @output Timeline style dropdown selector and adjuster launcher
 * @pos Component (Theme & Customization)
 * @description 时间线样式选择器 - 用于投喂功能中的样式切换，并在时间脉络页或档案页开启调节器
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import React, { useMemo, useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { ToastType } from './Toast';
import { DEFAULT_TIMELINE_STYLE_THEME, getTimelineStyleLabel, getTimelineStyleOptions } from '../services/timelineStyleService';

interface TimelineStyleSelectorProps {
    onToast: (type: ToastType, message: string) => void;
}

export const TimelineStyleSelector: React.FC<TimelineStyleSelectorProps> = ({ onToast }) => {
    const {
        timelineStyleTheme,
        setTimelineStyleTheme,
        setTimelineStyleAdjusterOpen
    } = useSettings();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const styleOptions = useMemo(() => getTimelineStyleOptions(), []);
    const selectedLabel = getTimelineStyleLabel(timelineStyleTheme);
    const canAdjust = timelineStyleTheme !== DEFAULT_TIMELINE_STYLE_THEME;

    const handleAdjust = () => {
        if (!canAdjust) {
            onToast('info', '原版默认样式不提供调节，请先切换到自定义样式');
            return;
        }

        setTimelineStyleAdjusterOpen(true);
        onToast('success', '已开启时间线调节器，请返回时间脉络页或档案页查看');
    };

    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between p-4 gap-3">
                <div>
                    <h4 className="font-bold text-stone-700">时间线样式</h4>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAdjust}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            canAdjust ? 'bg-stone-100 hover:bg-stone-200 text-stone-700' : 'bg-stone-50 text-stone-300'
                        }`}
                    >
                        <SlidersHorizontal size={14} />
                        <span>调节</span>
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen((prev) => !prev)}
                            className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-bold px-4 py-2 rounded-lg transition-colors min-w-[128px] justify-between"
                        >
                            <span>{selectedLabel}</span>
                            <ChevronDown
                                size={14}
                                className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {isDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-[100]"
                                    onClick={() => setIsDropdownOpen(false)}
                                />
                                <div className="absolute right-0 top-full mt-2 w-36 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden z-[110] flex flex-col py-1 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                    {styleOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                setTimelineStyleTheme(option.value);
                                                if (option.value === DEFAULT_TIMELINE_STYLE_THEME) {
                                                    setTimelineStyleAdjusterOpen(false);
                                                }
                                                setIsDropdownOpen(false);
                                                onToast('success', `时间线样式已切换为「${option.label}」`);
                                            }}
                                            className={`px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-stone-50 flex items-center justify-between ${
                                                timelineStyleTheme === option.value ? 'text-stone-900 bg-stone-50' : 'text-stone-500'
                                            }`}
                                        >
                                            {option.label}
                                            {timelineStyleTheme === option.value && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-stone-800" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
