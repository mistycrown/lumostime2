/**
 * @file AchievementAttributeSettingsDialog.tsx
 * @input Achievement attributes and attribute mutation callbacks
 * @output Attribute management dialog for the character profile
 * @pos Component (Achievement)
 * @description Lets users add, edit, reorder, hide, and restore character attributes while preserving archived experience history.
 * @updated 2026-08-09: Added character attribute management for the fixed-rule growth system.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { AchievementAttribute } from '../../types';
import { ACHIEVEMENT_ATTRIBUTE_ICON_OPTIONS, getAchievementAttributeIcon } from '../../constants/achievementAttributeIcons';
import { AchievementDialog } from './AchievementDialog';

interface AchievementAttributeSettingsDialogProps {
  isOpen: boolean;
  attributes: AchievementAttribute[];
  onClose: () => void;
  onCreate: (input: { name: string; subtitle: string; icon: string; color: string }) => void;
  onUpdate: (attribute: AchievementAttribute) => void;
  onDelete: (attributeId: string) => void;
  onReorder: (attributeIds: string[]) => void;
}

interface AttributeDraft {
  name: string;
  subtitle: string;
  icon: string;
  color: string;
}

const COLOR_OPTIONS = ['#7D9687', '#738CA4', '#B56F72', '#C4A66D', '#8E829F', '#6C8E84', '#A77756', '#6D7E95'];

const createEmptyDraft = (): AttributeDraft => ({
  name: '',
  subtitle: '',
  icon: 'Sparkles',
  color: COLOR_OPTIONS[0]
});

export const AchievementAttributeSettingsDialog: React.FC<AchievementAttributeSettingsDialogProps> = ({
  isOpen,
  attributes,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onReorder
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AttributeDraft>(createEmptyDraft);

  const orderedAttributes = useMemo(
    () => [...attributes].sort((first, second) => first.sortOrder - second.sortOrder),
    [attributes]
  );
  const editingAttribute = editingId
    ? attributes.find((attribute) => attribute.id === editingId) || null
    : null;

  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
      setDraft(createEmptyDraft());
    }
  }, [isOpen]);

  const startCreate = () => {
    setEditingId(null);
    setDraft(createEmptyDraft());
  };

  const startEdit = (attribute: AchievementAttribute) => {
    setEditingId(attribute.id);
    setDraft({
      name: attribute.name,
      subtitle: attribute.subtitle,
      icon: attribute.icon,
      color: attribute.color
    });
  };

  const handleSave = () => {
    const name = draft.name.trim();
    if (!name) {
      return;
    }

    if (editingAttribute) {
      onUpdate({
        ...editingAttribute,
        name,
        subtitle: draft.subtitle.trim() || 'CUSTOM',
        icon: draft.icon,
        color: draft.color,
        enabled: editingAttribute.enabled
      });
    } else {
      onCreate({
        name,
        subtitle: draft.subtitle.trim() || 'CUSTOM',
        icon: draft.icon,
        color: draft.color
      });
    }
    startCreate();
  };

  const moveAttribute = (attribute: AchievementAttribute, direction: -1 | 1) => {
    const currentIndex = orderedAttributes.findIndex((item) => item.id === attribute.id);
    const nextIndex = currentIndex + direction;
    const target = orderedAttributes[nextIndex];
    if (!target) {
      return;
    }

    const nextOrder = orderedAttributes.map((item) => item.id);
    nextOrder[currentIndex] = target.id;
    nextOrder[nextIndex] = attribute.id;
    onReorder(nextOrder);
  };

  return (
    <AchievementDialog
      isOpen={isOpen}
      title="人物属性"
      subtitle="管理属性名称、图标、颜色和显示顺序。删除属性会保留历史经验，但停用关联规则。"
      onClose={onClose}
      footer={(
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-stone-400">{attributes.length} 个属性</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white transition-colors hover:bg-stone-800"
          >
            完成
          </button>
        </div>
      )}
    >
      <div className="space-y-6">
        <div className="divide-y divide-stone-200 border-y border-stone-200">
          {orderedAttributes.map((attribute, index) => {
            const Icon = getAchievementAttributeIcon(attribute.icon);
            return (
              <div
                key={attribute.id}
                className={`flex items-center gap-3 py-3 ${attribute.enabled ? '' : 'opacity-50'}`}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: attribute.color }}
                >
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-stone-900">{attribute.name}</div>
                  <div className="mt-1 truncate text-[10px] uppercase tracking-[0.14em] text-stone-500">
                    {attribute.subtitle}
                    {!attribute.enabled ? ' · 已隐藏' : ''}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveAttribute(attribute, -1)}
                    disabled={index === 0}
                    title="上移"
                    aria-label={`${attribute.name} 上移`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-800 disabled:opacity-25"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveAttribute(attribute, 1)}
                    disabled={index === orderedAttributes.length - 1}
                    title="下移"
                    aria-label={`${attribute.name} 下移`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-800 disabled:opacity-25"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(attribute)}
                    title="编辑属性"
                    aria-label={`编辑${attribute.name}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-800"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (attribute.enabled) {
                        onDelete(attribute.id);
                      } else {
                        onUpdate({ ...attribute, enabled: true, updatedAt: Date.now() });
                      }
                    }}
                    title={attribute.enabled ? '隐藏属性' : '恢复属性'}
                    aria-label={attribute.enabled ? `隐藏${attribute.name}` : `恢复${attribute.name}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-800"
                  >
                    {attribute.enabled ? <Trash2 size={14} /> : <RotateCcw size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
          {orderedAttributes.length === 0 && (
            <div className="py-8 text-center text-sm text-stone-500">还没有人物属性</div>
          )}
        </div>

        <div className="border-t border-stone-200 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] uppercase tracking-[0.16em] text-stone-400">
              {editingAttribute ? '编辑属性' : '新增属性'}
            </div>
            {editingAttribute && (
              <button
                type="button"
                onClick={startCreate}
                className="text-xs text-stone-400 transition-colors hover:text-stone-800"
              >
                新增一项
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-stone-500">名称</span>
              <input
                value={draft.name}
                onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))}
                className="mt-2 w-full border-b border-stone-300 bg-transparent px-0 py-2 text-sm text-stone-900 outline-none focus:border-stone-900"
                placeholder="例如：专注"
              />
            </label>
            <label className="block">
              <span className="text-xs text-stone-500">备注 / 英文名</span>
              <input
                value={draft.subtitle}
                onChange={(event) => setDraft((previous) => ({ ...previous, subtitle: event.target.value }))}
                className="mt-2 w-full border-b border-stone-300 bg-transparent px-0 py-2 text-sm uppercase text-stone-900 outline-none focus:border-stone-900"
                placeholder="例如：FOCUS"
              />
            </label>
          </div>

          <div className="mt-5">
            <div className="text-xs text-stone-500">图标</div>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {ACHIEVEMENT_ATTRIBUTE_ICON_OPTIONS.map((iconName) => {
                const Icon = getAchievementAttributeIcon(iconName);
                const isSelected = draft.icon === iconName;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setDraft((previous) => ({ ...previous, icon: iconName }))}
                    title={iconName}
                    aria-label={iconName}
                    className={`inline-flex h-9 items-center justify-center rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-white text-stone-500 hover:border-stone-400'
                    }`}
                  >
                    <Icon size={17} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <div className="text-xs text-stone-500">颜色</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setDraft((previous) => ({ ...previous, color }))}
                  title={color}
                  aria-label={color}
                  className={`h-7 w-7 rounded-full border-2 p-0.5 ${
                    draft.color === color ? 'border-stone-900' : 'border-transparent'
                  }`}
                >
                  <span className="block h-full w-full rounded-full" style={{ backgroundColor: color }} />
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!draft.name.trim()}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2.5 text-sm text-white transition-colors hover:bg-stone-800 disabled:bg-stone-300"
          >
            <Plus size={15} />
            {editingAttribute ? '保存属性' : '添加属性'}
          </button>
        </div>
      </div>
    </AchievementDialog>
  );
};
