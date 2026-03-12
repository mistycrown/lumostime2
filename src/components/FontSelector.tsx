/**
 * @file FontSelector.tsx
 * @description 字体选择器组件，支持上传本地字体、切换应用字体，并删除已上传字体及其本地存储文件
 */

import React, { useState, useEffect, useRef } from 'react';
import { Check, Trash2, UploadCloud } from 'lucide-react';
import { fontService, FontOption } from '../services/fontService';
import { ToastType } from './Toast';
import { ConfirmModal } from './ConfirmModal';

interface FontSelectorProps {
  onToast: (type: ToastType, message: string) => void;
  currentFont?: string;
  onFontChange?: (fontId: string) => void;
}

export const FontSelector: React.FC<FontSelectorProps> = ({
  onToast,
  currentFont: controlledFont,
  onFontChange
}) => {
  const [fonts, setFonts] = useState<FontOption[]>([]);
  const [internalFont, setInternalFont] = useState<string>('default');
  const [isUploading, setIsUploading] = useState(false);
  const [fontToDelete, setFontToDelete] = useState<FontOption | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentFont = controlledFont !== undefined ? controlledFont : internalFont;
  const isControlled = controlledFont !== undefined;

  useEffect(() => {
    void loadFonts();
    if (!isControlled) {
      setInternalFont(fontService.getCurrentFont());
    }
  }, [isControlled]);

  const loadFonts = async () => {
    await fontService.refreshCustomFonts();
    setFonts(fontService.getAllFonts());
  };

  const handleFontSelect = (fontId: string) => {
    if (isControlled && onFontChange) {
      onFontChange(fontId);
      return;
    }

    const result = fontService.setFont(fontId);
    if (result.success) {
      setInternalFont(fontId);
      onToast('success', result.message);
    } else {
      onToast('error', result.message);
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteRequest = (font: FontOption) => {
    if (font.source !== 'uploaded') {
      return;
    }
    setFontToDelete(font);
  };

  const handleDeleteConfirm = async () => {
    if (!fontToDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);
    try {
      const deletingFontId = fontToDelete.id;
      const result = await fontService.removeCustomFont(deletingFontId);
      if (!result.success) {
        onToast('error', result.message);
        return;
      }

      await loadFonts();

      const nextFontId = fontService.getCurrentFont();
      if (isControlled) {
        if (currentFont === deletingFontId && onFontChange) {
          onFontChange(nextFontId);
        }
      } else {
        setInternalFont(nextFontId);
      }

      onToast('success', result.message);
      setFontToDelete(null);
    } catch (error) {
      console.error('[FontSelector] 删除字体失败:', error);
      onToast('error', '删除字体失败，请稍后再试');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFontUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setIsUploading(true);
    try {
      const result = await fontService.addCustomFont(file);
      if (!result.success) {
        onToast('error', result.message);
        return;
      }

      await loadFonts();
      onToast('success', result.message);
    } catch (error) {
      console.error('[FontSelector] 上传字体失败:', error);
      onToast('error', '上传字体失败，请稍后再试');
    } finally {
      setIsUploading(false);
    }
  };

  const renderFontCard = (font: FontOption) => {
    const isSelected = currentFont === font.id;
    const canDelete = font.source === 'uploaded';

    return (
      <div
        key={font.id}
        className={`w-full rounded-2xl transition-all overflow-hidden ${
          isSelected
            ? 'border-2 border-stone-300 ring-1 ring-stone-200 bg-white shadow-sm'
            : 'border border-stone-100 hover:border-stone-200 bg-white hover:bg-stone-50'
        }`}
      >
        <div className="p-4 flex items-start gap-3">
          <button
            type="button"
            onClick={() => handleFontSelect(font.id)}
            className="flex-1 min-w-0 text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <h5
                className="text-base font-bold text-stone-800 truncate"
                style={{ fontFamily: font.fontFamily }}
              >
                {font.displayName}
              </h5>
              {canDelete && (
                <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-full shrink-0">
                  本地上传
                </span>
              )}
            </div>
            <p
              className="text-sm text-stone-600 leading-relaxed"
              style={{ fontFamily: font.fontFamily }}
            >
              时光荏苒，岁月如梭
            </p>
            {font.description && (
              <p className="text-xs text-stone-400 mt-1">{font.description}</p>
            )}
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDeleteRequest(font)}
                className="w-9 h-9 rounded-full border border-red-100 text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center"
                aria-label={`删除字体 ${font.displayName}`}
              >
                <Trash2 size={16} />
              </button>
            )}

            {isSelected && (
              <div className="w-6 h-6 bg-stone-800 rounded-full flex items-center justify-center">
                <Check size={14} className="text-white" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const uploadedFonts = fonts.filter((font) => font.source === 'uploaded');
  const builtInFonts = fonts.filter((font) => font.source !== 'uploaded');

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".woff2,.woff,.ttf,.otf"
          onChange={handleFontUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={handleTriggerUpload}
          disabled={isUploading}
          className="w-full py-3 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <UploadCloud size={16} />
          {isUploading ? '上传中...' : '上传本地字体文件'}
        </button>
        <p className="mt-2 text-xs text-stone-500">
          支持 .woff2 / .woff / .ttf / .otf，建议单文件小于 20MB
        </p>
      </div>

      {uploadedFonts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold tracking-wide text-stone-500 uppercase">我的字体</h4>
          {uploadedFonts.map(renderFontCard)}
        </div>
      )}

      <div className="space-y-3">
        <h4 className="text-xs font-bold tracking-wide text-stone-500 uppercase">内置字体</h4>
        {builtInFonts.map(renderFontCard)}
      </div>

      <ConfirmModal
        isOpen={fontToDelete !== null}
        onClose={() => {
          if (!isDeleting) {
            setFontToDelete(null);
          }
        }}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
        title="确认删除字体"
        description={
          fontToDelete
            ? `将删除字体“${fontToDelete.displayName}”，并一并清除本地保存的字体文件。此操作不可撤销。`
            : ''
        }
        confirmText={isDeleting ? '删除中...' : '确认删除'}
        cancelText="取消"
        type="danger"
      />
    </div>
  );
};
