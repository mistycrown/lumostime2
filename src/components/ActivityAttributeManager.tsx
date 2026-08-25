/**
 * @file ActivityAttributeManager.tsx
 * @input Activity custom attribute definitions, usage checks, and delete callbacks.
 * @output Attribute create, rename, move, delete, archive, restore, and option management.
 * @pos Activity detail settings component
 * @description Uses compact custom controls that match the existing record-association UI.
 * @updated 2026-08-25: Replaced drag-and-drop and native select controls with attribute move buttons, custom type menu, and destructive delete confirmation; option order follows usage.
 * @updated 2026-08-25: Replaced native delete alerts with the shared ConfirmModal.
 */
import React, { useMemo, useState } from 'react';
import { Archive, ChevronDown, ChevronUp, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { ActivityAttributeDefinition, ActivityAttributeOption, ActivityAttributeType, Log } from '../types';
import { getSortedActivityAttributes } from '../utils/activityAttributeUtils';
import { ConfirmModal } from './ConfirmModal';

interface ActivityAttributeManagerProps {
  attributes?: ActivityAttributeDefinition[];
  logs: Log[];
  onChange: (attributes: ActivityAttributeDefinition[]) => void;
  onDeleteAttributeData?: (attributeId: string, optionId?: string) => void;
}

interface PendingDeletion {
  attribute: ActivityAttributeDefinition;
  option?: ActivityAttributeOption;
  usageExists: boolean;
}

const ATTRIBUTE_TYPES: Array<{ value: ActivityAttributeType; label: string }> = [
  { value: 'text', label: '\u6587\u672c' },
  { value: 'single', label: '\u5355\u9009' },
  { value: 'multi', label: '\u591a\u9009' },
  { value: 'number', label: '\u6570\u5b57' }
];

const getTypeLabel = (type: ActivityAttributeType) => ATTRIBUTE_TYPES.find((item) => item.value === type)?.label || type;

const hasAttributeUsage = (logs: Log[], attributeId: string, optionId?: string): boolean => logs.some((log) => (
  log.attributeValues || []
).some((value) => {
  if (value.attributeId !== attributeId) return false;
  if (!optionId) return true;
  if ('optionId' in value) return value.optionId === optionId;
  if ('optionIds' in value) return value.optionIds.includes(optionId);
  return false;
}));

export const ActivityAttributeManager: React.FC<ActivityAttributeManagerProps> = ({ attributes, logs, onChange, onDeleteAttributeData }) => {
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ActivityAttributeType>('text');
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>({});
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
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

  const moveAttribute = (attributeId: string, direction: -1 | 1) => {
    const index = activeAttributes.findIndex((attribute) => attribute.id === attributeId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= activeAttributes.length) return;
    const reordered = [...activeAttributes];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    save([...reordered, ...archivedAttributes]);
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

  const requestDelete = (attribute: ActivityAttributeDefinition, option?: ActivityAttributeOption) => {
    setPendingDeletion({
      attribute,
      option,
      usageExists: hasAttributeUsage(logs, attribute.id, option?.id)
    });
  };

  const executeDelete = () => {
    if (!pendingDeletion) return;
    const { attribute, option } = pendingDeletion;
    onDeleteAttributeData?.(attribute.id, option?.id);
    if (option) {
      updateAttribute(attribute.id, { options: (attribute.options || []).filter((item) => item.id !== option.id) });
    } else {
      save(sortedAttributes.filter((item) => item.id !== attribute.id));
    }
    setPendingDeletion(null);
  };

  return (
    <>
    <section className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">{'\u5c5e\u6027'}</h3>
        <span className="text-[10px] text-stone-300">{activeAttributes.length}</span>
      </div>

      <div className="flex gap-2 mb-5">
        <input value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => {
          if (event.key === 'Enter') { event.preventDefault(); addAttribute(); }
        }} placeholder={'\u5c5e\u6027\u540d\u79f0'} className="min-w-0 flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-500" />
        <div className="relative shrink-0">
          <button type="button" onClick={() => setIsTypeMenuOpen((current) => !current)} className="inline-flex min-w-[76px] items-center justify-between gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-600 hover:border-stone-400" aria-haspopup="listbox" aria-expanded={isTypeMenuOpen}>
            <span>{getTypeLabel(newType)}</span><ChevronDown size={15} className={`transition-transform ${isTypeMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {isTypeMenuOpen && <div className="absolute right-0 top-full z-20 mt-1 min-w-full overflow-hidden rounded-lg border border-stone-200 bg-white p-1 shadow-lg">
            {ATTRIBUTE_TYPES.map((type) => <button key={type.value} type="button" onClick={() => { setNewType(type.value); setIsTypeMenuOpen(false); }} className={`w-full whitespace-nowrap rounded-md px-3 py-2 text-left text-xs transition-colors ${newType === type.value ? 'bg-stone-100 text-stone-900 font-medium' : 'text-stone-500 hover:bg-stone-50'}`} role="option" aria-selected={newType === type.value}>{type.label}</button>)}
          </div>}
        </div>
        <button type="button" onClick={addAttribute} disabled={!newName.trim()} className="p-2.5 rounded-lg bg-stone-900 text-white disabled:opacity-35 transition-opacity" title={'\u6dfb\u52a0\u5c5e\u6027'}><Plus size={18} /></button>
      </div>

      <div className="space-y-4">
        {activeAttributes.map((attribute, attributeIndex) => (
          <div key={attribute.id} className="border-b border-stone-100 pb-4 last:border-b-0">
            <div className="flex items-center gap-2">
              <input value={attribute.name} onChange={(event) => updateAttribute(attribute.id, { name: event.target.value })} className="min-w-0 flex-1 bg-transparent border-b border-transparent hover:border-stone-200 focus:border-stone-500 py-1 text-sm font-medium text-stone-700 outline-none" aria-label={'\u5c5e\u6027\u540d\u79f0'} />
              <span className="text-[11px] text-stone-400 shrink-0">{getTypeLabel(attribute.type)}</span>
              <button type="button" onClick={() => moveAttribute(attribute.id, -1)} disabled={attributeIndex === 0} className="p-1 text-stone-300 hover:text-stone-700 disabled:opacity-25" title={'\u4e0a\u79fb'}><ChevronUp size={15} /></button>
              <button type="button" onClick={() => moveAttribute(attribute.id, 1)} disabled={attributeIndex === activeAttributes.length - 1} className="p-1 text-stone-300 hover:text-stone-700 disabled:opacity-25" title={'\u4e0b\u79fb'}><ChevronDown size={15} /></button>
              <button type="button" onClick={() => updateAttribute(attribute.id, { isArchived: true })} className="p-1 text-stone-300 hover:text-stone-700" title={'\u5f52\u6863\u5c5e\u6027'}><Archive size={15} /></button>
              <button type="button" onClick={() => requestDelete(attribute)} className="p-1 text-stone-300 hover:text-red-500" title={'\u5220\u9664\u5c5e\u6027'}><Trash2 size={15} /></button>
            </div>

            {(attribute.type === 'single' || attribute.type === 'multi') && <div className="ml-2 mt-3 space-y-2">
              {(attribute.options || []).filter((option) => !option.isArchived).map((option) => <div key={option.id} className="flex items-center gap-2">
                <input value={option.label} onChange={(event) => updateAttribute(attribute.id, { options: (attribute.options || []).map((item) => item.id === option.id ? { ...item, label: event.target.value } : item) })} className="min-w-0 flex-1 bg-stone-50 border border-stone-100 rounded-md px-2.5 py-2 text-xs text-stone-600 outline-none focus:border-stone-400" aria-label={'\u9009\u9879\u540d\u79f0'} />
                <button type="button" onClick={() => requestDelete(attribute, option)} className="p-1 text-stone-300 hover:text-red-500" title={'\u5220\u9664\u9009\u9879'}><Trash2 size={14} /></button>
              </div>)}
              {(attribute.options || []).some((option) => option.isArchived) && <div className="space-y-1 pt-1">{(attribute.options || []).filter((option) => option.isArchived).map((option) => <div key={option.id} className="flex items-center gap-2 text-xs text-stone-400"><span className="min-w-0 flex-1 truncate">{option.label}</span><button type="button" onClick={() => updateAttribute(attribute.id, { options: (attribute.options || []).map((item) => item.id === option.id ? { ...item, isArchived: false } : item) })} className="p-1 text-stone-400 hover:text-stone-900" title={'\u6062\u590d\u9009\u9879'}><RotateCcw size={13} /></button></div>)}</div>}
              <div className="flex gap-2"><input value={optionDrafts[attribute.id] || ''} onChange={(event) => setOptionDrafts((current) => ({ ...current, [attribute.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addOption(attribute); } }} placeholder={'\u6dfb\u52a0\u9009\u9879'} className="min-w-0 flex-1 bg-transparent border-b border-stone-200 px-1 py-2 text-xs text-stone-600 outline-none focus:border-stone-500" /><button type="button" onClick={() => addOption(attribute)} className="p-1.5 text-stone-500 hover:text-stone-900" title={'\u6dfb\u52a0\u9009\u9879'}><Plus size={15} /></button></div>
            </div>}
          </div>
        ))}
      </div>

      {archivedAttributes.length > 0 && <div className="mt-4 pt-4 border-t border-stone-100 space-y-2">{archivedAttributes.map((attribute) => <div key={attribute.id} className="flex items-center gap-2 text-xs text-stone-400"><span className="min-w-0 flex-1 truncate">{attribute.name}</span><button type="button" onClick={() => updateAttribute(attribute.id, { isArchived: false })} className="p-1 text-stone-400 hover:text-stone-900" title={'\u6062\u590d\u5c5e\u6027'}><RotateCcw size={14} /></button><button type="button" onClick={() => requestDelete(attribute)} className="p-1 text-stone-300 hover:text-red-500" title={'\u5220\u9664\u5c5e\u6027'}><Trash2 size={15} /></button></div>)}</div>}
      {activeAttributes.length === 0 && newName === '' && <div className="text-xs text-stone-300 py-1">{'\u6dfb\u52a0\u540e\u4f1a\u663e\u793a\u5728\u4e13\u6ce8\u548c\u8865\u8bb0\u8868\u5355\u4e2d\u3002'}</div>}
    </section>
    <ConfirmModal
      isOpen={pendingDeletion !== null}
      onClose={() => setPendingDeletion(null)}
      onConfirm={executeDelete}
      title={pendingDeletion?.option ? '删除属性选项' : '删除属性'}
      description={pendingDeletion
        ? pendingDeletion.usageExists
          ? `删除“${pendingDeletion.option?.label || pendingDeletion.attribute.name}”后，所有关联记录中的属性数据也会被删除。此操作无法恢复。`
          : `确定删除“${pendingDeletion.option?.label || pendingDeletion.attribute.name}”吗？`
        : ''}
      confirmText="删除"
      type="danger"
    />
    </>
  );
};
