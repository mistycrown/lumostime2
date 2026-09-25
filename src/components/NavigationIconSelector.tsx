/**
 * @file NavigationIconSelector.tsx
 * @input Toast callback and persisted navigation icon groups
 * @output New navigation icon mode and per-slot custom mappings
 * @pos Component (Sponsorship Navigation Settings)
 * @description TimePal-style image selector for the five new navigation entries.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { ToastType } from './Toast';
import {
    NAVIGATION_ICON_CHANGE_EVENT,
    navigationIconService,
    NavigationIconMode,
    NavigationIconOption,
    NavigationIconSelection,
    NavigationIconSlot,
    getNavigationIconFallbackUrl
} from '../services/navigationIconService';
import { APPEARANCE_RESTORED_EVENT } from '../services/appearanceBackupService';

interface NavigationIconSelectorProps {
    onToast: (type: ToastType, message: string) => void;
}

const SLOT_LABELS: Record<NavigationIconSlot, string> = {
    record: '记录',
    todo: '待办',
    timeline: '脉络',
    review: '档案',
    index: '索引'
};

const MODE_LABELS: Array<{ id: NavigationIconMode; name: string; description: string }> = [
    { id: 'text', name: '文字导航', description: '显示入口文字' },
    { id: 'pink', name: '粉色图标', description: '内置五张图标' },
    { id: 'custom', name: '自定义图标', description: '为入口自由搭配' }
];

export const NavigationIconSelector: React.FC<NavigationIconSelectorProps> = ({ onToast }) => {
    const [selection, setSelection] = useState<NavigationIconSelection>(() => navigationIconService.getSelection());
    const [customIcons, setCustomIcons] = useState<NavigationIconOption[]>(() => navigationIconService.getCustomIcons());
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const reload = () => {
        setSelection(navigationIconService.getSelection());
        setCustomIcons(navigationIconService.getCustomIcons());
    };

    useEffect(() => {
        window.addEventListener(NAVIGATION_ICON_CHANGE_EVENT, reload);
        window.addEventListener(APPEARANCE_RESTORED_EVENT, reload);
        return () => {
            window.removeEventListener(NAVIGATION_ICON_CHANGE_EVENT, reload);
            window.removeEventListener(APPEARANCE_RESTORED_EVENT, reload);
        };
    }, []);

    const handleModeSelect = (mode: NavigationIconMode) => {
        navigationIconService.setMode(mode);
        setSelection(navigationIconService.getSelection());
    };

    const handleSlotSelect = (slot: NavigationIconSlot, iconId: string | null) => {
        navigationIconService.setCustomMapping(slot, iconId);
        setSelection(navigationIconService.getSelection());
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            onToast('error', '请选择图片文件');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            onToast('error', '图片文件不能超过 5MB');
            return;
        }

        setIsUploading(true);
        try {
            const icon = await navigationIconService.addCustomIcon(file);
            navigationIconService.setMode('custom');
            reload();
            onToast('success', `已添加图标：${icon.name}`);
        } catch (error) {
            console.error('[NavigationIconSelector] Failed to upload icon', error);
            onToast('error', '添加导航图标失败');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (icon: NavigationIconOption, event: React.MouseEvent) => {
        event.stopPropagation();
        if (await navigationIconService.deleteCustomIcon(icon.id)) {
            reload();
            onToast('success', '导航图标已删除');
        }
    };

    const getSlotIcon = (slot: NavigationIconSlot) => {
        const iconId = selection.customMapping[slot];
        return customIcons.find((icon) => icon.id === iconId);
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
                {MODE_LABELS.map((mode) => {
                    const selected = selection.mode === mode.id;
                    return (
                        <button
                            key={mode.id}
                            type="button"
                            onClick={() => handleModeSelect(mode.id)}
                            className={`relative flex min-h-[92px] flex-col items-center justify-center gap-1 rounded-2xl border-2 bg-white px-2 py-3 text-center transition-all ${selected ? 'border-stone-700 bg-stone-50 shadow-sm' : 'border-stone-200 hover:border-stone-400'}`}
                        >
                            {mode.id === 'pink' ? (
                                <img
                                    src={navigationIconService.getBuiltInIcons()[0].url}
                                    alt=""
                                    className="h-9 w-9 object-contain"
                                    onError={(event) => {
                                        const fallbackUrl = getNavigationIconFallbackUrl(event.currentTarget.src);
                                        if (fallbackUrl !== event.currentTarget.src) event.currentTarget.src = fallbackUrl;
                                    }}
                                />
                            ) : mode.id === 'custom' && customIcons[0] ? (
                                <img src={customIcons[0].url} alt="" className="h-9 w-9 object-contain" />
                            ) : (
                                <span className="text-lg font-serif text-stone-700">Aa</span>
                            )}
                            <span className="text-xs font-semibold text-stone-700">{mode.name}</span>
                            <span className="text-[10px] text-stone-400">{mode.description}</span>
                            {selected && <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-stone-800 text-white"><Check size={10} /></span>}
                        </button>
                    );
                })}
            </div>

            {selection.mode === 'pink' && (
                <div className="grid grid-cols-5 gap-2 rounded-2xl bg-white p-3 shadow-sm">
                    {navigationIconService.getBuiltInIcons().map((icon, index) => (
                        <div key={icon.id} className="space-y-1 text-center">
                            <div className="flex aspect-square items-center justify-center rounded-xl bg-stone-50 p-2">
                                <img
                                    src={icon.url}
                                    alt={`${SLOT_LABELS[navigationIconService.getSlots()[index]]}图标`}
                                    className="h-full w-full object-contain"
                                    onError={(event) => {
                                        const fallbackUrl = getNavigationIconFallbackUrl(event.currentTarget.src);
                                        if (fallbackUrl !== event.currentTarget.src) event.currentTarget.src = fallbackUrl;
                                    }}
                                />
                            </div>
                            <span className="text-[10px] text-stone-500">{SLOT_LABELS[navigationIconService.getSlots()[index]]}</span>
                        </div>
                    ))}
                </div>
            )}

            {selection.mode === 'custom' && (
                <div className="space-y-3 rounded-2xl bg-white p-3 shadow-sm">
                    <div className="grid gap-3 sm:grid-cols-2">
                        {navigationIconService.getSlots().map((slot) => {
                            const selectedIcon = getSlotIcon(slot);
                            return (
                                <div key={slot} className="rounded-xl border border-stone-200 p-2">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-xs font-semibold text-stone-600">{SLOT_LABELS[slot]}</span>
                                        <span className="text-[10px] text-stone-400">{selectedIcon?.name || '文字回退'}</span>
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        <button type="button" onClick={() => handleSlotSelect(slot, null)} className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-2 text-xs text-stone-400 ${!selectedIcon ? 'border-stone-700 bg-stone-50' : 'border-stone-200'}`}>文字</button>
                                        {customIcons.map((icon) => (
                                            <div key={icon.id} className="relative shrink-0">
                                                <button type="button" onClick={() => handleSlotSelect(slot, icon.id)} className={`flex h-14 w-14 items-center justify-center rounded-lg border-2 bg-stone-50 p-1 ${selectedIcon?.id === icon.id ? 'border-stone-700' : 'border-stone-200'}`}>
                                                    <img src={icon.url} alt={icon.name} className="h-full w-full object-contain" />
                                                </button>
                                                <button type="button" onClick={(event) => void handleDelete(icon, event)} aria-label={`删除${icon.name}`} className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white"><X size={9} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-stone-300 py-2 text-xs text-stone-500 hover:border-stone-500">
                        {isUploading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" /> : <><Plus size={15} /> 添加自定义图标</>}
                    </button>
                </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </div>
    );
};
