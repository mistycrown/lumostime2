/**
 * @file NavigationDecorationDebugger.tsx
 * @description 导航栏装饰调试工具 - 增强版 (支持缩放、透明度、位置调整)
 */

import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, Save, ZoomIn, Sun, Move } from 'lucide-react';
import { navigationDecorationService } from '../services/navigationDecorationService';

interface NavigationDecorationDebuggerProps {
    currentDecorationId: string;
    // Current props passed might be outdated if we switch internally, 
    // but we can listen to events or just use internal state and callbacks 
    // to notify parent. However, BottomNavigation handles the rendering.
    // So when we switch here, we should trigger the same change event or callback.
    onClose: () => void;
}

export const NavigationDecorationDebugger: React.FC<NavigationDecorationDebuggerProps> = ({
    currentDecorationId,
    onClose
}) => {
    // Current settings state
    const [offsetY, setOffsetY] = useState(0);
    const [offsetX, setOffsetX] = useState(50); // % default
    const [scale, setScale] = useState(100); // % default
    const [opacity, setOpacity] = useState(60); // % default (0.6 * 100)

    const [isSaved, setIsSaved] = useState(false);
    const [activeId, setActiveId] = useState(currentDecorationId);

    // Sync state when activeId changes
    useEffect(() => {
        const deco = navigationDecorationService.getDecorationById(activeId);
        if (deco) {
            // Include custom settings check which is done inside getDecorationById
            // Parse Offset Y
            let yVal = 0;
            if (deco.offsetY === 'bottom') yVal = 0;
            else if (deco.offsetY === 'top') yVal = 100;
            else if (deco.offsetY === 'center') yVal = 50;
            else {
                const match = deco.offsetY?.match(/^(-?\d+)px$/);
                if (match) yVal = parseInt(match[1]);
            }
            setOffsetY(yVal);

            // Parse Offset X
            let xVal = 50;
            if (deco.offsetX === 'left') xVal = 0;
            else if (deco.offsetX === 'right') xVal = 100;
            else if (deco.offsetX === 'center') xVal = 50;
            else if (deco.offsetX) {
                // assume % for X mostly
                const match = deco.offsetX.match(/^(-?\d+)%$/);
                if (match) xVal = parseInt(match[1]);
            }
            setOffsetX(xVal);

            // Scale & Opacity
            setScale((deco.scale || 1) * 100);
            setOpacity((deco.opacity ?? 0.6) * 100);
        }
    }, [activeId]);

    // Apply changes in real-time
    useEffect(() => {
        // Construct styles
        const newOffsetY = offsetY === 0 ? 'bottom' : `${offsetY}px`;
        const newOffsetX = `${offsetX}%`;
        const newScale = scale / 100;
        const newOpacity = opacity / 100;

        // Note: We are NOT saving to localStorage yet, but we want to preview it.
        // The service doesn't have a "preview" mode, but we can emit an event with override data
        // OR we can just inject styles directly if we were inside the component.
        // Since this is a separate component, we might need to "fake" save or use a special event.
        // HOWEVER, BottomNavigation listens to 'navigationDecorationChange'. 
        // We can emit a custom event with specific temporary overrides?
        // OR simpler: just save to memory in service (but service uses localStorage).

        // Let's modify service to allow "preview" or just save temporarily?
        // Actually, the user asked to "Save Status" explicitly. So live preview should ideally not persist unless clicked.
        // But to make BottomNavigation update, we need to change what it reads.
        // We can emit the event with the *full calculated settings* in detail, and update BottomNav to use them.

        window.dispatchEvent(new CustomEvent('navigationDecorationPreview', {
            detail: {
                id: activeId,
                settings: {
                    offsetY: newOffsetY,
                    offsetX: newOffsetX,
                    scale: newScale,
                    opacity: newOpacity
                }
            }
        }));

    }, [offsetY, offsetX, scale, opacity, activeId]);


    const handleSave = () => {
        const settings = {
            offsetY: offsetY === 0 ? 'bottom' : `${offsetY}px`,
            offsetX: `${offsetX}%`,
            scale: scale / 100,
            opacity: opacity / 100
        };

        navigationDecorationService.saveCustomSettings(activeId, settings);

        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 1000);
    };

    const handleSwitch = (direction: 'prev' | 'next') => {
        const all = navigationDecorationService.getAllDecorations();
        const idx = all.findIndex(d => d.id === activeId);
        if (idx === -1) return;

        let newIdx;
        if (direction === 'prev') {
            newIdx = idx - 1 < 0 ? all.length - 1 : idx - 1;
        } else {
            newIdx = idx + 1 >= all.length ? 0 : idx + 1;
        }

        const newId = all[newIdx].id;
        setActiveId(newId);
        navigationDecorationService.setCurrentDecoration(newId); // This triggers the main change event
    };

    return (
        <div className="fixed bottom-28 right-4 z-50 bg-white/95 backdrop-blur rounded-xl shadow-2xl border border-stone-200 p-3 w-64 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-2">
                <h3 className="text-xs font-bold text-stone-800 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    样式调试
                </h3>
                <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
                    <X size={14} />
                </button>
            </div>

            {/* Switcher */}
            <div className="flex items-center justify-between bg-stone-50 rounded-lg p-1 mb-3">
                <button onClick={() => handleSwitch('prev')} className="p-1 hover:bg-white rounded shadow-sm text-stone-600 transition-all">
                    <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-mono font-medium truncate max-w-[100px] text-center">
                    {activeId}
                </span>
                <button onClick={() => handleSwitch('next')} className="p-1 hover:bg-white rounded shadow-sm text-stone-600 transition-all">
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Controls Grid */}
            <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Vertical Offset (Y) */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-stone-500">
                        <span className="flex items-center gap-1"><Move size={10} className="rotate-90" /> 垂直偏移</span>
                        <span className="font-mono">{offsetY}px</span>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => setOffsetY(v => v - 1)} className="flex-1 bg-stone-100 hover:bg-stone-200 rounded py-1 text-xs">-</button>
                        <button onClick={() => setOffsetY(v => v + 1)} className="flex-1 bg-stone-100 hover:bg-stone-200 rounded py-1 text-xs">+</button>
                    </div>
                </div>

                {/* Horizontal Offset (X) */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-stone-500">
                        <span className="flex items-center gap-1"><Move size={10} /> 水平位置</span>
                        <span className="font-mono">{offsetX}%</span>
                    </div>
                    <input
                        type="range" min="0" max="100" step="1"
                        value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))}
                        className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* Scale */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-stone-500">
                        <span className="flex items-center gap-1"><ZoomIn size={10} /> 缩放</span>
                        <span className="font-mono">{scale}%</span>
                    </div>
                    <input
                        type="range" min="10" max="200" step="5"
                        value={scale} onChange={(e) => setScale(Number(e.target.value))}
                        className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* Opacity */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-stone-500">
                        <span className="flex items-center gap-1"><Sun size={10} /> 透明度</span>
                        <span className="font-mono">{opacity}%</span>
                    </div>
                    <input
                        type="range" min="0" max="100" step="5"
                        value={opacity} onChange={(e) => setOpacity(Number(e.target.value))}
                        className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div>

            {/* Quick Adjust Buttons Row */}
            <div className="flex gap-2 mb-3">
                <button onClick={() => setOffsetY(v => v - 5)} className="flex-1 py-1 text-[10px] bg-stone-50 hover:bg-stone-100 rounded text-stone-600 border border-stone-100">
                    ↑ 5px
                </button>
                <button onClick={() => setOffsetY(v => v + 5)} className="flex-1 py-1 text-[10px] bg-stone-50 hover:bg-stone-100 rounded text-stone-600 border border-stone-100">
                    ↓ 5px
                </button>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={isSaved}
                className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all text-xs font-bold shadow-sm ${isSaved
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-stone-800 text-white hover:bg-stone-900 hover:shadow-md'
                    }`}
            >
                <Save size={12} />
                <span>{isSaved ? '已保存设置' : '保存当前状态'}</span>
            </button>
        </div>
    );
};
