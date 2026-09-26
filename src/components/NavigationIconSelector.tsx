/**
 * @file NavigationIconSelector.tsx
 * @input Toast callback and persisted navigation icon schemes
 * @output Scheme selection and modal editing for the new navigation bar
 * @pos Component (Sponsorship Navigation Settings)
 * @description Compact TimePal-style scheme selector with a separate editor modal.
 * @updated 2026-09-25: Reworked the page view into a compact multi-scheme selector.
 * @updated 2026-09-26: Added an opt-in switch for displaying small labels below image icons.
 * @updated 2026-09-26: Constrained icon scheme cards to a compact left-aligned wrapping layout.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
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
    const uploadSlotRef = useRef<NavigationIconSlot | null>(null);

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

    const toggleLabelWithIcon = () => {
        navigationIconService.setShowLabelWithIcon(!selection.showLabelWithIcon);
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

    const pickSlotImage = (slot: NavigationIconSlot) => {
        uploadSlotRef.current = slot;
        fileInputRef.current?.click();
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const slot = uploadSlotRef.current;
        if (!slot || !editingScheme) return;
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
            navigationIconService.setSchemeMapping(editingScheme.id, slot, icon.id);
            reload();
            setEditingScheme(navigationIconService.getCustomSchemes().find((scheme) => scheme.id === editingScheme.id) || null);
            onToast('success', `${SLOT_LABELS[slot]}图标已更新`);
        } catch (error) {
            console.error('[NavigationIconSelector] Failed to upload icon', error);
            onToast('error', '添加导航图标失败');
        } finally {
            setIsUploading(false);
            uploadSlotRef.current = null;
            if (fileInputRef.current) fileInputRef.current.value = '';
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

    const editor = editingScheme ? (
        <div
            className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="编辑导航图标方案"
            onClick={closeEditor}
        >
            <div
                className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-[24px] bg-[#fdfbf7] shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-stone-100 px-5 py-5">
                    <h3 className="text-lg font-medium text-stone-800">编辑导航图标方案</h3>
                    <button type="button" onClick={closeEditor} aria-label="关闭" className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"><X size={19} /></button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    <label className="block text-xs text-stone-500">
                        方案名称
                        <input
                            value={editingScheme.name}
                            onChange={(event) => updateSchemeName(event.target.value)}
                            maxLength={20}
                            className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-200"
                        />
                    </label>
                    <div className="mt-4 grid grid-cols-5 gap-1.5 border-t border-stone-100 pt-4 pb-1">
                        {navigationIconService.getSlots().map((slot) => {
                            const selectedIcon = customIcons.find((icon) => icon.id === editingScheme.mapping[slot]);
                            return (
                                <div key={slot} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                                    <span className="text-xs text-stone-600">{SLOT_LABELS[slot]}</span>
                                    <button
                                        type="button"
                                        onClick={() => pickSlotImage(slot)}
                                        className={`relative flex aspect-square w-full max-w-14 items-center justify-center overflow-hidden rounded-xl border bg-white p-1.5 transition-colors ${selectedIcon ? 'border-stone-300' : 'border-dashed border-stone-300'}`}
                                        aria-label={`选择${SLOT_LABELS[slot]}图标`}
                                    >
                                        {selectedIcon ? renderIcon(selectedIcon, selectedIcon.name, 'h-full w-full object-contain') : <span className="flex flex-col items-center gap-1 text-stone-400"><Upload size={15} /><span className="text-[10px]">上传</span></span>}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-stone-100 bg-white px-5 py-4">
                    <button type="button" onClick={handleDeleteScheme} className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"><Trash2 size={14} /> 删除方案</button>
                    <button type="button" onClick={closeEditor} className="rounded-xl bg-stone-800 px-4 py-2 text-xs text-white hover:bg-stone-700">完成</button>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <>
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-stone-700">导航图标</h3>
                    <button type="button" onClick={openNewScheme} className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800">
                        <Plus size={14} /> 新增方案
                    </button>
                </div>
                <div className="flex flex-wrap items-start justify-start gap-2">
                    <button
                        type="button"
                        onClick={() => selectMode('text')}
                        className={`relative flex w-full max-w-32 aspect-square flex-col items-center justify-center gap-1 rounded-xl border px-2 text-xs transition-colors ${selection.mode === 'text' ? 'border-stone-700 bg-stone-50 text-stone-800' : 'border-stone-200 text-stone-500 hover:border-stone-400'}`}
                    >
                        <span className="flex aspect-square h-10 items-center justify-center font-serif text-lg">Aa</span><span>文字</span>
                        {selection.mode === 'text' && <Check size={13} className="absolute right-1.5 top-1.5" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => selectMode('pink')}
                        className={`relative flex w-full max-w-32 aspect-square flex-col items-center justify-center gap-1 rounded-xl border px-2 text-xs transition-colors ${selection.mode === 'pink' ? 'border-stone-700 bg-stone-50 text-stone-800' : 'border-stone-200 text-stone-500 hover:border-stone-400'}`}
                    >
                        {renderIcon(navigationIconService.getBuiltInIcons()[0], '粉色图标', 'aspect-square h-10 w-10 object-contain')}<span>粉色</span>
                        {selection.mode === 'pink' && <Check size={13} className="absolute right-1.5 top-1.5" />}
                    </button>
                    {schemes.map((scheme) => {
                        const isActive = selection.mode === 'custom' && selection.schemeId === scheme.id;
                        return (
                            <div key={scheme.id} className={`relative flex w-full max-w-32 aspect-square items-center justify-center rounded-xl border px-2 transition-colors ${isActive ? 'border-stone-700 bg-stone-50' : 'border-stone-200 hover:border-stone-400'}`}>
                                <button type="button" onClick={() => selectScheme(scheme.id)} className="flex min-w-0 flex-col items-center justify-center gap-1 text-xs text-stone-600">
                                    {renderIcon(getSchemePreview(scheme, customIcons), scheme.name, 'aspect-square h-10 w-10 object-contain')}
                                    <span className="max-w-full truncate">{scheme.name}</span>
                                </button>
                                <button type="button" onClick={() => openScheme(scheme)} aria-label={`编辑${scheme.name}`} className="absolute right-1 top-1 rounded p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700">
                                    <Pencil size={12} />
                                </button>
                                {isActive && <Check size={13} className="absolute bottom-1 right-1.5" />}
                            </div>
                        );
                    })}
                </div>
                {selection.mode !== 'text' && (
                    <div className="flex items-center justify-between gap-4 border-t border-stone-100 pt-3">
                        <span className="text-xs text-stone-600">图标下显示导航文字</span>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={selection.showLabelWithIcon}
                            onClick={toggleLabelWithIcon}
                            className={`navigation-setting-switch relative h-6 w-11 shrink-0 rounded-full transition-colors ${selection.showLabelWithIcon ? 'bg-stone-800' : 'bg-stone-300'}`}
                        >
                            <span className={`navigation-setting-switch-thumb absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${selection.showLabelWithIcon ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                )}
            </div>

            {editor && (typeof document === 'undefined' ? editor : createPortal(editor, document.body))}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </>
    );
};
