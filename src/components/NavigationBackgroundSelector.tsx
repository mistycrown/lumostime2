/**
 * @file NavigationBackgroundSelector.tsx
 * @input Toast callback and the new navigation-background service
 * @output New-mode toggle, background selection/upload, and tuning controls
 * @pos Component (Sponsorship Navigation Settings)
 * @description Provides the new navigation background workflow without changing the legacy foreground decoration page.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Check, Plus, Settings, X } from 'lucide-react';
import { ToastType } from './Toast';
import { NavigationDecorationDebugger } from './NavigationDecorationDebugger';
import {
    navigationBackgroundService,
    NAVIGATION_BACKGROUND_CHANGE_EVENT,
    NAVIGATION_BACKGROUND_MODE_CHANGE_EVENT,
    NAVIGATION_BACKGROUND_PREVIEW_EVENT
} from '../services/navigationBackgroundService';

interface NavigationBackgroundSelectorProps {
    onToast: (type: ToastType, message: string) => void;
}

export const NavigationBackgroundSelector: React.FC<NavigationBackgroundSelectorProps> = ({ onToast }) => {
    const [enabled, setEnabled] = useState(() => navigationBackgroundService.isEnabled());
    const [backgrounds, setBackgrounds] = useState(() => navigationBackgroundService.getAllBackgrounds());
    const [currentId, setCurrentId] = useState(() => navigationBackgroundService.getCurrentBackground());
    const [showDebugger, setShowDebugger] = useState(false);
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
        window.addEventListener(NAVIGATION_BACKGROUND_MODE_CHANGE_EVENT, handleModeChange);
        window.addEventListener(NAVIGATION_BACKGROUND_CHANGE_EVENT, handleBackgroundChange);
        return () => {
            window.removeEventListener(NAVIGATION_BACKGROUND_MODE_CHANGE_EVENT, handleModeChange);
            window.removeEventListener(NAVIGATION_BACKGROUND_CHANGE_EVENT, handleBackgroundChange);
        };
    }, []);

    const handleToggle = () => {
        const next = !enabled;
        setEnabled(next);
        navigationBackgroundService.setEnabled(next);
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
                        className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-stone-800' : 'bg-stone-300'}`}
                    >
                        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            {!enabled ? (
                <div className="rounded-2xl border border-dashed border-stone-200 bg-white/70 p-5 text-sm text-stone-400">
                    开启后使用新版导航背景设置。当前仍使用旧版导航贴图。
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-xs text-stone-500">选择背景后可调整位置、缩放和透明度。</p>
                        <button
                            type="button"
                            onClick={() => setShowDebugger(true)}
                            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm hover:bg-stone-100"
                        >
                            <Settings size={14} /> 调整
                        </button>
                    </div>

                    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))' }}>
                        {backgrounds.map((background) => (
                            <div
                                key={background.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleSelect(background.id)}
                                className={`relative aspect-[2/1] overflow-hidden rounded-lg border-2 bg-stone-50 ${currentId === background.id ? 'border-stone-500 ring-2 ring-stone-200' : 'border-stone-200 hover:border-stone-300'}`}
                            >
                                <img src={background.thumbnail || background.url} alt={background.name} className="h-full w-full object-cover" />
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
                            className="aspect-[2/1] rounded-lg border-2 border-dashed border-stone-300 text-stone-500 hover:border-stone-400"
                        >
                            {isUploading ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" /> : <span className="inline-flex items-center gap-1 text-xs"><Plus size={15} /> 添加</span>}
                        </button>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                </>
            )}

            {showDebugger && enabled && (
                <NavigationDecorationDebugger
                    currentDecorationId={currentId}
                    onClose={() => setShowDebugger(false)}
                    service={{
                        getAllDecorations: navigationBackgroundService.getAllBackgrounds.bind(navigationBackgroundService),
                        getDecorationById: navigationBackgroundService.getBackgroundById.bind(navigationBackgroundService),
                        saveCustomSettings: navigationBackgroundService.saveCustomSettings.bind(navigationBackgroundService),
                        setCurrentDecoration: navigationBackgroundService.setCurrentBackground.bind(navigationBackgroundService)
                    }}
                    previewEventName={NAVIGATION_BACKGROUND_PREVIEW_EVENT}
                    title="导航背景调整"
                />
            )}
        </div>
    );
};
