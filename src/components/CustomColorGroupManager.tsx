/**
 * @file CustomColorGroupManager.tsx
 * @input onToast (callback)
 * @output Custom color list UI with add, validate, move and persistence
 * @pos Component (Theme & Customization)
 * @description 自定义色组管理组件，支持色值输入预览、回车提交、重复校验、上下移动与自动保存。
 *
 * @updated 2026-04-06: Extracted the draft preview style so valid HEX input immediately replaces the checkerboard placeholder with a solid swatch.
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { CustomColorItem } from '../types';
import {
  customColorGroupService,
  isCustomColorDuplicate,
  normalizeCustomColorHex,
} from '../services/customColorGroupService';
import { ToastType } from './Toast';

interface CustomColorGroupManagerProps {
  onToast: (type: ToastType, message: string) => void;
}

export const getDraftPreviewStyle = (
  normalizedDraft: string | null
): React.CSSProperties | undefined => {
  if (!normalizedDraft) {
    return undefined;
  }

  return {
    background: normalizedDraft,
  };
};

export const CustomColorGroupManager: React.FC<CustomColorGroupManagerProps> = ({
  onToast,
}) => {
  const [items, setItems] = useState<CustomColorItem[]>([]);
  const [newColor, setNewColor] = useState('');

  useEffect(() => {
    const group = customColorGroupService.getGroup();
    setItems(group.colors);
  }, []);

  const trimmedColor = newColor.trim();
  const normalizedDraft = useMemo(() => normalizeCustomColorHex(newColor), [newColor]);
  const isDuplicateDraft = useMemo(() => {
    return isCustomColorDuplicate(newColor, items);
  }, [items, newColor]);
  const hasInput = trimmedColor.length > 0;

  const handleAdd = () => {
    if (!hasInput) {
      onToast('info', '请输入色值');
      return;
    }

    const result = customColorGroupService.addColor(newColor);
    if (!result.success) {
      if (result.error === 'INVALID_HEX') {
        onToast('error', '请输入正确的色值（如 #AABBCC）');
        return;
      }

      if (result.error === 'DUPLICATE') {
        onToast('info', '该颜色已经存在');
        return;
      }

      onToast('error', '添加失败');
      return;
    }

    const group = customColorGroupService.getGroup();
    setItems(group.colors);
    setNewColor('');
    onToast('success', '已添加');
  };

  const handleDelete = (id: string) => {
    customColorGroupService.deleteColor(id);
    const group = customColorGroupService.getGroup();
    setItems(group.colors);
    onToast('success', '已删除');
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const next = [...items];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setItems(next);
    customColorGroupService.setColors(next);
  };

  const handleBlur = () => {
    if (normalizedDraft && !isDuplicateDraft && newColor !== normalizedDraft) {
      setNewColor(normalizedDraft);
    }
  };

  const sortedItems = useMemo(() => items, [items]);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleAdd();
        }}
        className="bg-white rounded-2xl border border-stone-100 p-4"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-11 h-11 rounded-xl border border-stone-200 shrink-0 overflow-hidden bg-[linear-gradient(135deg,#fafaf9_25%,#f5f5f4_25%,#f5f5f4_50%,#fafaf9_50%,#fafaf9_75%,#f5f5f4_75%,#f5f5f4_100%)] bg-[length:12px_12px]"
            style={getDraftPreviewStyle(normalizedDraft)}
            aria-hidden="true"
          />

          <input
            value={newColor}
            onChange={(event) => setNewColor(event.target.value)}
            onBlur={handleBlur}
            placeholder="#AABBCC"
            className="flex-1 min-w-0 h-11 bg-stone-50 border border-stone-200 rounded-xl px-3 text-sm outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-300 transition-all font-mono"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            inputMode="text"
            aria-label="输入自定义颜色 HEX"
          />

          <button
            type="submit"
            disabled={!hasInput}
            className="w-11 h-11 shrink-0 rounded-xl bg-stone-800 text-white hover:bg-stone-900 active:scale-[0.98] transition-all disabled:bg-stone-300 disabled:text-white/80 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center"
            aria-label="添加颜色"
          >
            <Plus size={18} />
          </button>
        </div>
      </form>

      {sortedItems.length === 0 ? (
        <div className="text-xs text-stone-400 text-center py-6">
          还没有自定义颜色
        </div>
      ) : (
        <div className="space-y-2">
          {sortedItems.map((item, index) => (
            <CustomColorRow
              key={item.id}
              item={item}
              onDelete={handleDelete}
              onMove={handleMove}
              index={index}
              isFirst={index === 0}
              isLast={index === sortedItems.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CustomColorRow: React.FC<{
  item: CustomColorItem;
  onDelete: (id: string) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  index: number;
  isFirst: boolean;
  isLast: boolean;
}> = ({ item, onDelete, onMove, index, isFirst, isLast }) => {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm">
      <div className="p-3 flex items-center gap-3">
        <div className="shrink-0 flex items-center gap-1">
          <button
            onClick={() => onMove(index, 'up')}
            disabled={isFirst}
            className="p-2 rounded-lg hover:bg-stone-50 text-stone-400 hover:text-stone-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="上移"
          >
            <ArrowUp size={16} />
          </button>
          <button
            onClick={() => onMove(index, 'down')}
            disabled={isLast}
            className="p-2 rounded-lg hover:bg-stone-50 text-stone-400 hover:text-stone-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="下移"
          >
            <ArrowDown size={16} />
          </button>
        </div>

        <div
          className="w-10 h-10 rounded-xl border border-stone-200 shrink-0"
          style={{ backgroundColor: item.color }}
          aria-hidden="true"
        />

        <div className="flex-1 min-w-0">
          <div className="text-sm font-mono text-stone-800 truncate">{item.color}</div>
        </div>

        <button
          onClick={() => onDelete(item.id)}
          className="shrink-0 p-2 rounded-lg hover:bg-stone-50 text-stone-400 hover:text-red-600 transition-colors"
          aria-label="删除"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};
