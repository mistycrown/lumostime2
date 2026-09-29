/**
 * @file FloatingButtonBackgroundSelector.tsx
 * @input Toast callback and global floating-button background settings
 * @output Upload, clear, preview, and scale controls for the style settings tab
 * @pos Component (Appearance Settings)
 * @description Configures the single circular image background shared by all FloatingButton instances.
 * @updated 2026-09-29: Added global floating-button image background controls.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Trash2 } from 'lucide-react';
import type { ToastType } from './Toast';
import {
  FLOATING_BUTTON_BACKGROUND_CHANGED_EVENT,
  floatingButtonBackgroundService,
  type FloatingButtonBackgroundSettings
} from '../services/floatingButtonBackgroundService';
import { imageService } from '../services/imageService';

interface FloatingButtonBackgroundSelectorProps {
  onToast: (type: ToastType, message: string) => void;
}

export const FloatingButtonBackgroundSelector: React.FC<FloatingButtonBackgroundSelectorProps> = ({ onToast }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<FloatingButtonBackgroundSettings>(() => floatingButtonBackgroundService.getSettings());
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const refresh = () => setSettings(floatingButtonBackgroundService.getSettings());
    window.addEventListener(FLOATING_BUTTON_BACKGROUND_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(FLOATING_BUTTON_BACKGROUND_CHANGED_EVENT, refresh);
  }, []);

  useEffect(() => {
    let isCurrent = true;
    if (!settings.imageFilename) {
      setImageUrl('');
      return () => { isCurrent = false; };
    }
    void imageService.getImageUrl(settings.imageFilename).then((url) => {
      if (isCurrent) setImageUrl(url);
    }).catch(() => {
      if (isCurrent) setImageUrl('');
    });
    return () => { isCurrent = false; };
  }, [settings.imageFilename]);

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsSaving(true);
    try {
      await floatingButtonBackgroundService.setImage(file);
      onToast('success', '悬浮按钮背景已更新');
    } catch (error) {
      onToast('error', error instanceof Error ? error.message : '上传悬浮按钮背景失败');
    } finally {
      setIsSaving(false);
    }
  };

  const clearImage = async () => {
    setIsSaving(true);
    try {
      await floatingButtonBackgroundService.clearImage();
      onToast('success', '已恢复默认悬浮按钮背景');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-stone-700">悬浮按钮背景</h4>
        </div>
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-stone-200 bg-[var(--floating-button-bg)] shadow-sm">
          {imageUrl ? <span aria-hidden="true" className="absolute inset-0 bg-center bg-no-repeat" style={{ backgroundImage: `url("${imageUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`, backgroundSize: `${settings.scale}%` }} /> : null}
          <span className="relative grid h-full w-full place-items-center text-xl text-[var(--floating-button-icon)]">+</span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isSaving} aria-label="上传悬浮按钮背景" className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-900 disabled:opacity-50"><ImagePlus size={15} />{settings.imageFilename ? '替换图片' : '上传图片'}</button>
        {settings.imageFilename ? <button type="button" onClick={() => void clearImage()} disabled={isSaving} aria-label="清除悬浮按钮背景" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 disabled:opacity-50"><Trash2 size={15} />清除</button> : <span className="inline-flex items-center gap-1 text-xs text-stone-400"><Check size={14} />默认</span>}
      </div>
      <label className="mt-4 flex items-center gap-3 text-xs text-stone-600"><span className="shrink-0">图片大小</span><input aria-label="悬浮按钮背景图片大小" type="range" min="50" max="200" step="1" value={settings.scale} onChange={(event) => floatingButtonBackgroundService.setScale(Number(event.target.value))} disabled={!settings.imageFilename} className="h-1.5 min-w-0 flex-1 accent-stone-700 disabled:opacity-40" /><span className="w-9 text-right font-mono text-stone-500">{settings.scale}%</span></label>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void uploadImage(event)} />
    </section>
  );
};
