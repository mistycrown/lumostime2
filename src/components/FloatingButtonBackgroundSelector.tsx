/**
 * @file FloatingButtonBackgroundSelector.tsx
 * @input Toast callback and global floating-button background scheme library
 * @output Scheme selection, upload, deletion, preview, and scale controls
 * @pos Component (Appearance Settings)
 * @description Lets users manage reusable circular image schemes shared by every FloatingButton.
 * @updated 2026-09-29: Reworked the single-image control into a selectable scheme gallery.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Trash2 } from 'lucide-react';
import type { ToastType } from './Toast';
import {
  FLOATING_BUTTON_BACKGROUND_CHANGED_EVENT,
  floatingButtonBackgroundService,
  type FloatingButtonBackgroundScheme
} from '../services/floatingButtonBackgroundService';
import { imageService } from '../services/imageService';

interface FloatingButtonBackgroundSelectorProps {
  onToast: (type: ToastType, message: string) => void;
}

export const FloatingButtonBackgroundSelector: React.FC<FloatingButtonBackgroundSelectorProps> = ({ onToast }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [schemes, setSchemes] = useState<FloatingButtonBackgroundScheme[]>(() => floatingButtonBackgroundService.getSchemes());
  const [currentId, setCurrentId] = useState<string | null>(() => floatingButtonBackgroundService.getCurrentSchemeId());
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const currentScheme = schemes.find((scheme) => scheme.id === currentId) || null;

  const reload = () => {
    setSchemes(floatingButtonBackgroundService.getSchemes());
    setCurrentId(floatingButtonBackgroundService.getCurrentSchemeId());
  };

  useEffect(() => {
    window.addEventListener(FLOATING_BUTTON_BACKGROUND_CHANGED_EVENT, reload);
    return () => window.removeEventListener(FLOATING_BUTTON_BACKGROUND_CHANGED_EVENT, reload);
  }, []);

  useEffect(() => {
    let isCurrent = true;
    void Promise.all(schemes.map(async (scheme) => [scheme.id, await imageService.getImageUrl(scheme.imageFilename).catch(() => '')] as const))
      .then((entries) => {
        if (isCurrent) setImageUrls(Object.fromEntries(entries));
      });
    return () => { isCurrent = false; };
  }, [schemes]);

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsSaving(true);
    try {
      await floatingButtonBackgroundService.addScheme(file);
      onToast('success', '悬浮按钮方案已添加');
    } catch (error) {
      onToast('error', error instanceof Error ? error.message : '添加悬浮按钮方案失败');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCurrentScheme = async () => {
    if (!currentScheme) return;
    setIsSaving(true);
    try {
      await floatingButtonBackgroundService.deleteScheme(currentScheme.id);
      onToast('success', '悬浮按钮方案已删除');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <h4 className="font-bold text-stone-700">悬浮按钮背景</h4>
      <div className="mt-4 grid grid-cols-5 gap-2">
        <button type="button" onClick={() => floatingButtonBackgroundService.selectScheme(null)} aria-label="使用默认悬浮按钮背景" aria-pressed={!currentId} className={`relative aspect-square overflow-hidden rounded-full border-2 bg-[var(--floating-button-bg)] text-lg text-[var(--floating-button-icon)] ${!currentId ? 'border-stone-500 ring-2 ring-stone-200' : 'border-stone-200 hover:border-stone-300'}`}>
          +
          {!currentId && <span className="absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-full bg-stone-800 text-white"><Check size={12} /></span>}
        </button>
        {schemes.map((scheme) => (
          <button key={scheme.id} type="button" onClick={() => floatingButtonBackgroundService.selectScheme(scheme.id)} aria-label="使用悬浮按钮方案" aria-pressed={scheme.id === currentId} className={`relative aspect-square overflow-hidden rounded-full border-2 bg-stone-100 ${scheme.id === currentId ? 'border-stone-500 ring-2 ring-stone-200' : 'border-stone-200 hover:border-stone-300'}`}>
            {imageUrls[scheme.id] && <span aria-hidden="true" className="absolute inset-0 bg-center bg-no-repeat" style={{ backgroundImage: `url("${imageUrls[scheme.id].replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`, backgroundSize: `${scheme.scale}%` }} />}
            {scheme.id === currentId && <span className="absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-full bg-stone-800 text-white"><Check size={12} /></span>}
          </button>
        ))}
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isSaving} aria-label="添加悬浮按钮方案" className="flex aspect-square items-center justify-center rounded-full border-2 border-dashed border-stone-300 text-stone-500 transition-colors hover:border-stone-500 hover:text-stone-800 disabled:opacity-50"><ImagePlus size={18} /></button>
      </div>
      {currentScheme && (
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3 text-xs text-stone-600"><span className="shrink-0">图片大小</span><input aria-label="悬浮按钮背景图片大小" type="range" min="50" max="200" step="1" value={currentScheme.scale} onChange={(event) => floatingButtonBackgroundService.setSchemeScale(currentScheme.id, Number(event.target.value))} className="h-1.5 min-w-0 flex-1 accent-stone-700" /><span className="w-9 text-right font-mono text-stone-500">{currentScheme.scale}%</span></label>
          <button type="button" onClick={() => void deleteCurrentScheme()} disabled={isSaving} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"><Trash2 size={14} />删除当前方案</button>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void uploadImage(event)} />
    </section>
  );
};
