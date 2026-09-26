/**
 * @file NavigationBackgroundSelector.tsx
 * @input Toast callback and the new navigation-background service
 * @output New-mode toggle, background selection/upload, and tuning controls
 * @pos Component (Sponsorship Navigation Settings)
 * @description Provides the new navigation background workflow without changing the legacy foreground decoration page.
 * @updated 2026-09-25: Added the navigation icon mode selector for the new navigation bar.
 * @updated 2026-09-25: Added the opt-in transparent navigation toggle above the new navigation mode setting.
 * @updated 2026-09-26: Adds dedicated dark-mode styling hooks to keep navigation setting switches visible.
 * @updated 2026-09-26: Constrained new navigation background cards to a 96px left-aligned grid.
 * @updated 2026-09-26: Added a no-background option that restores the default navigation surface.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Check, Plus, Settings, X } from 'lucide-react';
import { ToastType } from './Toast';
import { NavigationDecorationSelector } from './NavigationDecorationSelector';
import { NavigationIconSelector } from './NavigationIconSelector';
import {
    navigationBackgroundService,
    NAVIGATION_BACKGROUND_CHANGE_EVENT,
    NAVIGATION_BACKGROUND_MODE_CHANGE_EVENT,
    NAVIGATION_TRANSPARENCY_CHANGE_EVENT
} from '../services/navigationBackgroundService';

interface NavigationBackgroundSelectorProps {
    onToast: (type: ToastType, message: string) => void;
    onOpenDebugger?: () => void;
}

export const NavigationBackgroundSelector: React.FC<NavigationBackgroundSelectorProps> = ({ onToast, onOpenDebugger }) => {
    const [enabled, setEnabled] = useState(() => navigationBackgroundService.isEnabled());
    const [transparentNavigation, setTransparentNavigation] = useState(() => navigationBackgroundService.isTransparentNavigationEnabled());
    const [backgrounds, setBackgrounds] = useState(() => navigationBackgroundService.getAllBackgrounds());
    const [currentId, setCurrentId] = useState(() => navigationBackgroundService.getCurrentBackground());
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const reload = () => {
        setBackgrounds(navigationBackgroundService.getAllBackgrounds());
        setCurrentId(navigationBackgroundService.getCurrentBackground());
    };

    useEffect(() => {
        const handleModeChange = (event: Event) => {
            setEnabled((event as CustomEvent<{ enabled: boolean }>).detail.enabled);
        };
        const handleBackgroundChange = () => reload();
        const handleTransparencyChange = (event: Event) => {
            setTransparentNavigation((event as CustomEvent<{ enabled: boolean }>).detail.enabled);
        };
        window.addEventListener(NAVIGATION_BACKGROUND_MODE_CHANGE_EVENT, handleModeChange);
        window.addEventListener(NAVIGATION_BACKGROUND_CHANGE_EVENT, handleBackgroundChange);
        window.addEventListener(NAVIGATION_TRANSPARENCY_CHANGE_EVENT, handleTransparencyChange);
        return () => {
            window.removeEventListener(NAVIGATION_BACKGROUND_MODE_CHANGE_EVENT, handleModeChange);
            window.removeEventListener(NAVIGATION_BACKGROUND_CHANGE_EVENT, handleBackgroundChange);
            window.removeEventListener(NAVIGATION_TRANSPARENCY_CHANGE_EVENT, handleTransparencyChange);
        };
    }, []);

    const handleToggle = () => {
        const next = !enabled;
        setEnabled(next);
        navigationBackgroundService.setEnabled(next);
    };

    const handleTransparentNavigationToggle = () => {
        const next = !transparentNavigation;
        setTransparentNavigation(next);
        navigationBackgroundService.setTransparentNavigationEnabled(next);
    };

    const handleSelect = (id: string) => {
        navigationBackgroundService.setCurrentBackground(id);
        setCurrentId(id);
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            onToast('error', '请选择图片文件');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            onToast('error', '图片文件不能超过 10MB');
            return;
        }

        setIsUploading(true);
        try {
            const background = await navigationBackgroundService.addCustomBackground(file);
            navigationBackgroundService.setCurrentBackground(background.id);
            reload();
            onToast('success', '导航背景已添加');
        } catch (error) {
            console.error('[NavigationBackgroundSelector] Failed to upload background', error);
            onToast('error', '添加导航背景失败');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (id: string, event: React.MouseEvent) => {
        event.stopPropagation();
        if (await navigationBackgroundService.deleteCustomBackground(id)) {
            reload();
            onToast('success', '导航背景已删除');
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-stone-700">标题栏透明</h3>
                        <p className="mt-1 text-xs text-stone-400">记录、待办、档案和索引页使用透明导航栏</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={transparentNavigation}
                        onClick={handleTransparentNavigationToggle}
                        className={`navigation-setting-switch relative h-6 w-11 shrink-0 rounded-full transition-colors ${transparentNavigation ? 'bg-stone-800' : 'bg-stone-300'}`}
                    >
                        <span className={`navigation-setting-switch-thumb absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${transparentNavigation ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-stone-700">使用新版导航设置</h3>
                        <p className="mt-1 text-xs text-stone-400">将图片作为导航栏背景显示</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        onClick={handleToggle}
                        className={`navigation-setting-switch relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? 'bg-stone-800' : 'bg-stone-300'}`}
                    >
                        <span className={`navigation-setting-switch-thumb absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>
            </div>

            {!enabled ? (
                <NavigationDecorationSelector onToast={onToast} />
            ) : (
                <>
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-xs text-stone-500">选择背景后可调整位置、缩放和透明度。</p>
                        <button
                            type="button"
                            onClick={() => onOpenDebugger?.()}
                            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm hover:bg-stone-100"
                        >
                            <Settings size={14} /> 调整
                        </button>
                    </div>

                    <div className="grid justify-start gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, 96px)' }}>
                        {backgrounds.map((background) => (
                            <div
                                key={background.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleSelect(background.id)}
                                className={`relative w-full max-w-24 justify-self-start aspect-[2/1] overflow-hidden rounded-lg border-2 bg-stone-50 ${currentId === background.id ? 'border-stone-500 ring-2 ring-stone-200' : 'border-stone-200 hover:border-stone-300'}`}
                            >
                                {background.url ? (
                                    <img src={background.thumbnail || background.url} alt={background.name} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="flex h-full items-center justify-center text-xs text-stone-400">无背景</span>
                                )}
                                {currentId === background.id && (
                                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-stone-800 text-white shadow">
                                        <Check size={12} />
                                    </span>
                                )}
                                {background.type === 'custom' && (
                                    <button
                                        type="button"
                                        onClick={(event) => void handleDelete(background.id, event as unknown as React.MouseEvent)}
                                        className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"
                                    >
                                        <X size={10} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="w-full max-w-24 justify-self-start aspect-[2/1] rounded-lg border-2 border-dashed border-stone-300 text-stone-500 hover:border-stone-400"
                        >
                            {isUploading ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" /> : <span className="inline-flex items-center gap-1 text-xs"><Plus size={15} /> 添加</span>}
                        </button>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                    <div className="border-t border-stone-200 pt-4">
                        <NavigationIconSelector onToast={onToast} />
                    </div>
                </>
            )}

        </div>
    );
};
