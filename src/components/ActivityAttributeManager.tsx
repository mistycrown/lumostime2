/**
 * @file ActivityAttributeManager.tsx
 * @input Activity custom attribute definitions.
 * @output Attribute create, rename, archive, restore, option, and sort changes.
 * @pos Activity detail settings component
 * @description Provides the compact definition editor used in Activity tag details.
 * @updated 2026-08-24: Created for Activity custom attributes.
 */
import React, { useMemo, useState } from 'react';
import { Archive, GripVertical, Plus, RotateCcw } from 'lucide-react';
import { ActivityAttributeDefinition, ActivityAttributeOption, ActivityAttributeType } from '../types';
import { getSortedActivityAttributes } from '../utils/activityAttributeUtils';

interface ActivityAttributeManagerProps {
  attributes?: ActivityAttributeDefinition[];
  onChange: (attributes: ActivityAttributeDefinition[]) => void;
}

const ATTRIBUTE_TYPES: Array<{ value: ActivityAttributeType; label: string }> = [
  { value: 'text', label: '文本' },
  { value: 'single', label: '单选' },
  { value: 'multi', label: '多选' },
  { value: 'number', label: '数字' }
];

const getTypeLabel = (type: ActivityAttributeType) => ATTRIBUTE_TYPES.find((item) => item.value === type)?.label || type;

export const ActivityAttributeManager: React.FC<ActivityAttributeManagerProps> = ({ attributes, onChange }) => {
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ActivityAttributeType>('text');
  const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>({});
  const [draggedAttributeId, setDraggedAttributeId] = useState<string | null>(null);
  const [draggedOption, setDraggedOption] = useState<{ attributeId: string; optionId: string } | null>(null);

  const sortedAttributes = useMemo(() => getSortedActivityAttributes({ attributes }), [attributes]);
  const activeAttributes = sortedAttributes.filter((attribute) => !attribute.isArchived);
  const archivedAttributes = sortedAttributes.filter((attribute) => attribute.isArchived);

  const save = (nextAttributes: ActivityAttributeDefinition[]) => {
    onChange(nextAttributes.map((attribute, index) => ({ ...attribute, order: index })));
  };

  const updateAttribute = (attributeId: string, update: Partial<ActivityAttributeDefinition>) => {
    const now = Date.now();
    save(sortedAttributes.map((attribute) => attribute.id === attributeId
      ? { ...attribute, ...update, updatedAt: now }
      : attribute));
  };

  const addAttribute = () => {
    const name = newName.trim();
    if (!name) return;
    const now = Date.now();
    save([...sortedAttributes, {
      id: crypto.randomUUID(),
      name,
      type: newType,
      options: newType === 'single' || newType === 'multi' ? [] : undefined,
      order: sortedAttributes.length,
      createdAt: now,
      updatedAt: now
    }]);
    setNewName('');
  };

  const addOption = (attribute: ActivityAttributeDefinition) => {
    const label = (optionDrafts[attribute.id] || '').trim();
    if (!label) return;
    const option: ActivityAttributeOption = { id: crypto.randomUUID(), label };
    updateAttribute(attribute.id, { options: [...(attribute.options || []), option] });
    setOptionDrafts((current) => ({ ...current, [attribute.id]: '' }));
  };

  const updateOption = (attribute: ActivityAttributeDefinition, optionId: string, update: Partial<ActivityAttributeOption>) => {
    updateAttribute(attribute.id, {
      options: (attribute.options || []).map((option) => option.id === optionId ? { ...option, ...update } : option)
    });
  };

  const moveOption = (attribute: ActivityAttributeDefinition, fromId: string, toId: string) => {
    if (fromId === toId) return;
    const options = [...(attribute.options || [])];
    const fromIndex = options.findIndex((option) => option.id === fromId);
    const toIndex = options.findIndex((option) => option.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = options.splice(fromIndex, 1);
    options.splice(toIndex, 0, moved);
    updateAttribute(attribute.id, { options });
  };

  const moveAttribute = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const ordered = [...sortedAttributes];
    const fromIndex = ordered.findIndex((attribute) => attribute.id === fromId);
    const toIndex = ordered.findIndex((attribute) => attribute.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = ordered.splice(fromIndex, 1);
    ordered.splice(toIndex, 0, moved);
    save(ordered);
  };

  return (
    <section className="border-t border-stone-100 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">属性</h3>
        <span className="text-[10px] text-stone-300">{activeAttributes.length}</span>
      </div>

      <div className="flex gap-2 mb-5">
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addAttribute();
            }
          }}
          placeholder="属性名称"
          className="min-w-0 flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-500"
        />
        <select
          value={newType}
          onChange={(event) => setNewType(event.target.value as ActivityAttributeType)}
          className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-2.5 text-sm text-stone-600 outline-none focus:border-stone-500"
          aria-label="属性类型"
        >
          {ATTRIBUTE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </select>
        <button
          type="button"
          onClick={addAttribute}
          disabled={!newName.trim()}
          className="p-2.5 rounded-lg bg-stone-900 text-white disabled:opacity-35 transition-opacity"
          title="添加属性"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="space-y-3">
        {activeAttributes.map((attribute) => (
          <div
            key={attribute.id}
            draggable
            onDragStart={() => setDraggedAttributeId(attribute.id)}
            onDragEnd={() => setDraggedAttributeId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggedAttributeId) moveAttribute(draggedAttributeId, attribute.id);
              setDraggedAttributeId(null);
            }}
            className="border-b border-stone-100 pb-4 last:border-b-0"
          >
            <div className="flex items-center gap-2">
              <GripVertical size={15} className="text-stone-300 shrink-0 cursor-grab" />
              <input
                value={attribute.name}
                onChange={(event) => updateAttribute(attribute.id, { name: event.target.value })}
                className="min-w-0 flex-1 bg-transparent border-b border-transparent hover:border-stone-200 focus:border-stone-500 py-1 text-sm font-medium text-stone-700 outline-none"
                aria-label="属性名称"
              />
              <span className="text-[11px] text-stone-400 shrink-0">{getTypeLabel(attribute.type)}</span>
              <button
                type="button"
                onClick={() => updateAttribute(attribute.id, { isArchived: true })}
                className="p-1.5 text-stone-300 hover:text-stone-700 transition-colors"
                title="归档属性"
              >
                <Archive size={15} />
              </button>
            </div>

            {(attribute.type === 'single' || attribute.type === 'multi') && (
              <div className="ml-6 mt-3 space-y-2">
                {(attribute.options || []).filter((option) => !option.isArchived).map((option) => (
                  <div
                    key={option.id}
                    draggable
                    onDragStart={() => setDraggedOption({ attributeId: attribute.id, optionId: option.id })}
                    onDragEnd={() => setDraggedOption(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (draggedOption?.attributeId === attribute.id) {
                        moveOption(attribute, draggedOption.optionId, option.id);
                      }
                      setDraggedOption(null);
                    }}
                    className="flex items-center gap-2"
                  >
                    <GripVertical size={13} className="text-stone-300 shrink-0 cursor-grab" />
                    <input
                      value={option.label}
                      onChange={(event) => updateOption(attribute, option.id, { label: event.target.value })}
                      className="min-w-0 flex-1 bg-stone-50 border border-stone-100 rounded-md px-2.5 py-2 text-xs text-stone-600 outline-none focus:border-stone-400"
                      aria-label="选项名称"
                    />
                    <button
                      type="button"
                      onClick={() => updateOption(attribute, option.id, { isArchived: true })}
                      className="p-1.5 text-stone-300 hover:text-stone-700 transition-colors"
                      title="归档选项"
                    >
                      <Archive size={14} />
                    </button>
                  </div>
                ))}
                {(attribute.options || []).some((option) => option.isArchived) && (
                  <div className="space-y-1 pt-1">
                    {(attribute.options || []).filter((option) => option.isArchived).map((option) => (
                      <div key={option.id} className="flex items-center gap-2 text-xs text-stone-400">
                        <span className="min-w-0 flex-1 truncate">{option.label}</span>
                        <button
                          type="button"
                          onClick={() => updateOption(attribute, option.id, { isArchived: false })}
                          className="p-1 text-stone-400 hover:text-stone-900"
                          title="恢复选项"
                        >
                          <RotateCcw size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={optionDrafts[attribute.id] || ''}
                    onChange={(event) => setOptionDrafts((current) => ({ ...current, [attribute.id]: event.target.value }))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addOption(attribute);
                      }
                    }}
                    placeholder="添加选项"
                    className="min-w-0 flex-1 bg-transparent border-b border-stone-200 px-1 py-2 text-xs text-stone-600 outline-none focus:border-stone-500"
                  />
                  <button type="button" onClick={() => addOption(attribute)} className="p-1.5 text-stone-500 hover:text-stone-900" title="添加选项">
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {archivedAttributes.length > 0 && (
        <div className="mt-4 pt-4 border-t border-stone-100 space-y-2">
          {archivedAttributes.map((attribute) => (
            <div key={attribute.id} className="flex items-center gap-2 text-xs text-stone-400">
              <span className="min-w-0 flex-1 truncate">{attribute.name}</span>
              <button
                type="button"
                onClick={() => updateAttribute(attribute.id, { isArchived: false })}
                className="p-1 text-stone-400 hover:text-stone-900"
                title="恢复属性"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeAttributes.length === 0 && newName === '' && (
        <div className="text-xs text-stone-300 py-1">添加后会显示在专注和补记表单中。</div>
      )}
    </section>
  );
};
