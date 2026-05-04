/**
 * @file StickerSetEditModal.tsx
 * @description 贴纸组编辑弹窗 - 名称输入 + 16个固定槽位，点击槽位可上传图片或移除贴纸
 * @input setId (string|null), setName (string), stickers (CustomStickerViewItem[]), isOpen, onClose, onSaveName, onUpload, onRemoveSticker
 * @output 弹窗交互事件
 * @updated 2026-04-19: Added fixed-slot uploads so empty positions stay stable while editing a sticker set, moved the modal to a centered dialog, added direct set deletion support, and limited uploads to one image per slot action.
 */
import React, { useRef, useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { IconRenderer } from './IconRenderer';

const MAX_SLOTS = 16;

export interface StickerSlot {
  id: string;
  path: string;
  label?: string;
  slotIndex: number;
}

interface StickerSetEditModalProps {
  isOpen: boolean;
  setId: string | null;       // null = 新建
  initialName: string;
  stickers: StickerSlot[];    // 当前已上传的贴纸（最多16个）
  onClose: () => void;
  onSaveName: (name: string) => void;   // 保存名称（新建/更新均调用）
  onUploadToSlot: (setId: string, slotIndex: number, file: File) => void;
  onRemoveSticker: (stickerId: string) => void;
  onDeleteSet?: (setId: string) => void;
}

export const StickerSetEditModal: React.FC<StickerSetEditModalProps> = ({
  isOpen,
  setId,
  initialName,
  stickers,
  onClose,
  onSaveName,
  onUploadToSlot,
  onRemoveSticker,
  onDeleteSet,
}) => {
  const [name, setName] = useState(initialName);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 当前点击的是哪个槽位（如果已有贴纸则会触发删除确认，如果是空槽位则触发上传）
  const [uploadingSlotIndex, setUploadingSlotIndex] = useState<number | null>(null);

  // 每次弹窗打开时同步 initialName
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSave = () => {
    onSaveName(name.trim());
  };

  // 点击空槽位 -> 触发文件选择
  const handleEmptySlotClick = (slotIndex: number) => {
    if (!setId) return; // 还未创建组，不能上传
    setUploadingSlotIndex(slotIndex);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && setId && uploadingSlotIndex !== null) {
      onUploadToSlot(setId, uploadingSlotIndex, file);
    }
    e.target.value = '';
    setUploadingSlotIndex(null);
  };

  // 构建16个槽位
  const slots = Array.from({ length: MAX_SLOTS }, (_, index) => (
    stickers.find((sticker) => sticker.slotIndex === index) || null
  ));

  const isNewSet = !setId;
  const canUpload = !!setId;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className="w-full max-w-[480px] max-h-[88vh] bg-white rounded-[2rem] flex flex-col shadow-2xl overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h3 className="text-base font-bold text-stone-800">
            {isNewSet ? '新建贴纸组' : '编辑贴纸组'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
          {/* 名称输入 */}
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">贴纸组名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入名称…"
              autoFocus
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all"
            />
          </div>

          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full py-2.5 bg-stone-800 text-white rounded-xl text-sm font-medium hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isNewSet ? '创建贴纸组' : '保存名称'}
          </button>

          {/* 16个槽位 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-stone-500">
                贴纸槽位 ({stickers.length}/{MAX_SLOTS})
              </label>
              {!canUpload && (
                <span className="text-xs text-stone-400">请先创建组后再上传贴纸</span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {slots.map((sticker, index) => (
                <div key={index} className="relative aspect-square">
                  {sticker ? (
                    /* 已填充槽位 */
                    <div className="w-full h-full rounded-xl border border-stone-100 bg-stone-50 overflow-hidden">
                      <span className="absolute left-1.5 top-1.5 text-[10px] font-medium text-stone-300">
                        {index + 1}
                      </span>
                      <div className="flex h-full flex-col">
                        <div className="flex min-h-0 flex-1 items-center justify-center px-2 pt-4 pb-1">
                          <IconRenderer icon={`image:${sticker.path}`} size="80%" />
                        </div>
                        <div className="px-2 pb-1.5">
                          <span
                            className="block truncate text-center text-[9px] font-medium leading-tight text-stone-400"
                            title={sticker.label || ''}
                          >
                            {sticker.label || '\u00A0'}
                          </span>
                        </div>
                      </div>
                      {/* 移除按钮 */}
                      <button
                        onClick={() => onRemoveSticker(sticker.id)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/95 border border-stone-200 flex items-center justify-center text-stone-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"
                        aria-label="移除贴纸"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    /* 空槽位 */
                    <button
                      onClick={() => handleEmptySlotClick(index)}
                      disabled={!canUpload}
                      className={`w-full h-full rounded-xl border-2 border-dashed flex items-center justify-center transition-colors ${
                        canUpload
                          ? 'border-stone-200 hover:border-stone-400 hover:bg-stone-50 cursor-pointer'
                          : 'border-stone-100 bg-stone-50/50 cursor-not-allowed'
                      }`}
                      aria-label={`上传到槽位 ${index + 1}`}
                    >
                      <span className="absolute left-1.5 top-1.5 text-[10px] font-medium text-stone-300">
                        {index + 1}
                      </span>
                      <Plus
                        size={18}
                        className={canUpload ? 'text-stone-300 hover:text-stone-400' : 'text-stone-200'}
                      />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* 提示文字 */}
            {canUpload && stickers.length < MAX_SLOTS && (
              <p className="text-xs text-stone-400 mt-2 text-center">
                点击空格子上传一张图片
              </p>
            )}
            {stickers.length >= MAX_SLOTS && (
              <p className="text-xs text-amber-600 mt-2 text-center">
                已达到 {MAX_SLOTS} 张上限
              </p>
            )}
          </div>

          {!!setId && onDeleteSet && (
            <button
              onClick={() => onDeleteSet(setId)}
              className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50/70 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              删除贴纸组
            </button>
          )}
        </div>

        {/* 隐藏文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};
