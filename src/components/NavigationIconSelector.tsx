/**
 * @file NavigationIconSelector.tsx
 * @input Toast callback and persisted navigation icon schemes
 * @output Scheme selection and modal editing for the new navigation bar
 * @pos Component (Sponsorship Navigation Settings)
 * @description Compact TimePal-style scheme selector with a separate editor modal.
 * @updated 2026-09-25: Reworked the page view into a compact multi-scheme selector.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { ToastType } from './Toast';
import {
    getNavigationIconFallbackUrl,
    NAVIGATION_ICON_CHANGE_EVENT,
    navigationIconService,
    NavigationIconMode,
    NavigationIconOption,
    NavigationIconScheme,
    NavigationIconSelection,
    NavigationIconSlot
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

const getSchemePreview = (scheme: NavigationIconScheme, customIcons: NavigationIconOption[]) => (
    navigationIconService.getPreviewIconForScheme(scheme) || customIcons[0]
);

export const NavigationIconSelector: React.FC<NavigationIconSelectorProps> = ({ onToast }) => {
    const [selection, setSelection] = useState<NavigationIconSelection>(() => navigationIconService.getSelection());
    const [customIcons, setCustomIcons] = useState<NavigationIconOption[]>(() => navigationIconService.getCustomIcons());
    const [schemes, setSchemes] = useState<NavigationIconScheme[]>(() => navigationIconService.getCustomSchemes());
    const [editingScheme, setEditingScheme] = useState<NavigationIconScheme | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const reload = () => {
        setSelection(navigationIconService.getSelection());
        setCustomIcons(navigationIconService.getCustomIcons());
        setSchemes(navigationIconService.getCustomSchemes());
        setEditingScheme((current) => current ? navigationIconService.getCustomSchemes().find((scheme) => scheme.id === current.id) || null : null);
    };

    useEffect(() => {
        window.addEventListener(NAVIGATION_ICON_CHANGE_EVENT, reload);
        window.addEventListener(APPEARANCE_RESTORED_EVENT, reload);
        return () => {
            window.removeEventListener(NAVIGATION_ICON_CHANGE_EVENT, reload);
            window.removeEventListener(APPEARANCE_RESTORED_EVENT, reload);
        };
    }, []);

    const selectMode = (mode: NavigationIconMode) => {
        navigationIconService.setMode(mode);
        reload();
    };

    const selectScheme = (schemeId: string) => {
        navigationIconService.setActiveScheme(schemeId);
        reload();
    };

    const openNewScheme = () => {
        const scheme = navigationIconService.createCustomScheme();
        setEditingScheme(scheme);
        reload();
    };

    const openScheme = (scheme: NavigationIconScheme) => setEditingScheme(scheme);

    const closeEditor = () => {
        setEditingScheme(null);
        reload();
    };

    const updateSchemeName = (name: string) => {
        if (!editingScheme) return;
        const next = { ...editingScheme, name };
        setEditingScheme(next);
        navigationIconService.updateCustomScheme(editingScheme.id, { name });
    };

    const selectSchemeIcon = (slot: NavigationIconSlot, iconId: string | null) => {
        if (!editingScheme) return;
        const mapping = { ...editingScheme.mapping };
        if (iconId) mapping[slot] = iconId;
        else delete mapping[slot];
        const next = { ...editingScheme, mapping };
        setEditingScheme(next);
        navigationIconService.setSchemeMapping(editingScheme.id, slot, iconId);
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
            await navigationIconService.addCustomIcon(file);
            reload();
            onToast('success', '导航图标已添加');
        } catch (error) {
            console.error('[NavigationIconSelector] Failed to upload icon', error);
            onToast('error', '添加导航图标失败');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteIcon = async (icon: NavigationIconOption) => {
        if (await navigationIconService.deleteCustomIcon(icon.id)) {
            reload();
            if (editingScheme) setEditingScheme(navigationIconService.getCustomSchemes().find((scheme) => scheme.id === editingScheme.id) || null);
            onToast('success', '导航图标已删除');
        }
    };

    const handleDeleteScheme = () => {
        if (!editingScheme) return;
        navigationIconService.deleteCustomScheme(editingScheme.id);
        setEditingScheme(null);
        reload();
        onToast('success', '方案已删除');
    };

    const renderIcon = (icon: NavigationIconOption | undefined, alt: string, className: string) => (
        icon ? (
            <img
                src={icon.url}
                alt={alt}
                className={className}
                onError={(event) => {
                    const fallbackUrl = getNavigationIconFallbackUrl(event.currentTarget.src);
                    if (fallbackUrl !== event.currentTarget.src) event.currentTarget.src = fallbackUrl;
                }}
            />
        ) : <span className="font-serif text-lg text-stone-500">Aa</span>
    );

    return (
        <>
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-stone-700">导航图标</h3>
                    <button type="button" onClick={openNewScheme} className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800">
                        <Plus size={14} /> 新增方案
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => selectMode('text')}
                        className={`relative flex h-16 min-w-[76px] flex-1 items-center justify-center gap-2 rounded-xl border px-2 text-xs transition-colors ${selection.mode === 'text' ? 'border-stone-700 bg-stone-50 text-stone-800' : 'border-stone-200 text-stone-500 hover:border-stone-400'}`}
                    >
                        <span className="font-serif text-lg">Aa</span><span>文字</span>
                        {selection.mode === 'text' && <Check size={13} className="absolute right-1.5 top-1.5" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => selectMode('pink')}
                        className={`relative flex h-16 min-w-[76px] flex-1 items-center justify-center gap-2 rounded-xl border px-2 text-xs transition-colors ${selection.mode === 'pink' ? 'border-stone-700 bg-stone-50 text-stone-800' : 'border-stone-200 text-stone-500 hover:border-stone-400'}`}
                    >
                        {renderIcon(navigationIconService.getBuiltInIcons()[0], '粉色图标', 'h-9 w-9 object-contain')}<span>粉色</span>
                        {selection.mode === 'pink' && <Check size={13} className="absolute right-1.5 top-1.5" />}
                    </button>
                    {schemes.map((scheme) => {
                        const isActive = selection.mode === 'custom' && selection.schemeId === scheme.id;
                        return (
                            <div key={scheme.id} className={`relative flex h-16 min-w-[110px] flex-1 items-center rounded-xl border px-2 transition-colors ${isActive ? 'border-stone-700 bg-stone-50' : 'border-stone-200 hover:border-stone-400'}`}>
                                <button type="button" onClick={() => selectScheme(scheme.id)} className="flex min-w-0 flex-1 items-center justify-center gap-2 text-xs text-stone-600">
                                    {renderIcon(getSchemePreview(scheme, customIcons), scheme.name, 'h-9 w-9 object-contain')}
                                    <span className="max-w-[72px] truncate">{scheme.name}</span>
                                </button>
                                <button type="button" onClick={() => openScheme(scheme)} aria-label={`编辑${scheme.name}`} className="absolute right-1 top-1 rounded p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700">
                                    <Pencil size={12} />
                                </button>
                                {isActive && <Check size={13} className="absolute bottom-1 right-1.5" />}
                            </div>
                        );
                    })}
                </div>
            </div>

            {editingScheme && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="编辑导航图标方案">
                    <div className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-bold text-stone-800">编辑导航图标方案</h3>
                            <button type="button" onClick={closeEditor} aria-label="关闭" className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100"><X size={17} /></button>
                        </div>
                        <label className="mb-4 block text-xs text-stone-500">
                            方案名称
                            <input value={editingScheme.name} onChange={(event) => updateSchemeName(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-500" />
                        </label>
                        <div className="space-y-3">
                            {navigationIconService.getSlots().map((slot) => (
                                <div key={slot} className="border-t border-stone-100 pt-3">
                                    <div className="mb-2 text-xs font-semibold text-stone-600">{SLOT_LABELS[slot]}</div>
                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" onClick={() => selectSchemeIcon(slot, null)} className={`flex h-14 w-14 items-center justify-center rounded-lg border text-[11px] text-stone-400 ${!editingScheme.mapping[slot] ? 'border-stone-700 bg-stone-50' : 'border-stone-200'}`}>文字</button>
                                        {customIcons.map((icon) => (
                                            <button key={icon.id} type="button" onClick={() => selectSchemeIcon(slot, icon.id)} className={`relative flex h-14 w-14 items-center justify-center rounded-lg border bg-stone-50 p-1 ${editingScheme.mapping[slot] === icon.id ? 'border-stone-700' : 'border-stone-200'}`}>
                                                {renderIcon(icon, icon.name, 'h-full w-full object-contain')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
                            <button type="button" onClick={handleDeleteScheme} className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"><Trash2 size={14} /> 删除方案</button>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-stone-300 px-3 py-2 text-xs text-stone-500 hover:border-stone-500">
                                    <Plus size={14} /> {isUploading ? '上传中' : '添加图标'}
                                </button>
                                <button type="button" onClick={closeEditor} className="rounded-lg bg-stone-800 px-4 py-2 text-xs text-white hover:bg-stone-700">完成</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </>
    );
};
