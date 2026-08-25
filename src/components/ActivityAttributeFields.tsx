/**
 * @file ActivityAttributeFields.tsx
 * @input The selected Activity, ID-based values, and optional Activity updater.
 * @output Compact optional custom-attribute controls for records and active sessions.
 * @pos Shared record form component
 * @description Matches the existing association selectors with compact outline states, one-line horizontal option rails, and a collapsible section.
 * @updated 2026-08-25: Added collapsed state, quick option creation, compact association styling, and horizontal option scrolling.
 */
import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, Hash, ListChecks, Plus, TextCursorInput } from 'lucide-react';
import { Activity, ActivityAttributeDefinition, ActivityAttributeOption, ActivityAttributeValue, Log } from '../types';
import { getActivityAttributeValue, getSortedActivityAttributes } from '../utils/activityAttributeUtils';

interface ActivityAttributeFieldsProps {
  activity?: Activity;
  values?: ActivityAttributeValue[];
  onChange: (values: ActivityAttributeValue[]) => void;
  onActivityChange?: (activity: Activity) => void;
  usageLogs?: Log[];
  includeReferencedArchived?: boolean;
}

const getAttributeIcon = (type: ActivityAttributeDefinition['type']) => {
  if (type === 'number') return Hash;
  if (type === 'text') return TextCursorInput;
  return ListChecks;
};

export const ActivityAttributeFields: React.FC<ActivityAttributeFieldsProps> = ({
  activity,
  values = [],
  onChange,
  onActivityChange,
  usageLogs = [],
  includeReferencedArchived = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [addingOptionAttributeId, setAddingOptionAttributeId] = useState<string | null>(null);
  const [optionDraft, setOptionDraft] = useState('');
  const attributes = useMemo(() => getSortedActivityAttributes(activity).filter((attribute) => {
    if (!attribute.isArchived) return true;
    return includeReferencedArchived && values.some((value) => value.attributeId === attribute.id);
  }), [activity, includeReferencedArchived, values]);

  const replaceValue = (attributeId: string, nextValue?: ActivityAttributeValue) => {
    const remaining = values.filter((item) => item.attributeId !== attributeId);
    onChange(nextValue ? [...remaining, nextValue] : remaining);
  };

  const addOption = (attribute: ActivityAttributeDefinition) => {
    const label = optionDraft.trim();
    if (!label || !activity || !onActivityChange) return;
    const option: ActivityAttributeOption = { id: crypto.randomUUID(), label };
    onActivityChange({
      ...activity,
      attributes: (activity.attributes || []).map((item) => item.id === attribute.id
        ? { ...item, options: [...(item.options || []), option], updatedAt: Date.now() }
        : item)
    });
    setOptionDraft('');
    setAddingOptionAttributeId(null);
  };

  if (attributes.length === 0) return null;

  return (
    <section className="border-t border-stone-100 pt-5">
      <button type="button" onClick={() => setIsExpanded((current) => !current)} className="w-full flex items-center justify-between px-1 text-left">
        <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">{'\u5c5e\u6027'}</span>
        <ChevronDown size={15} className={`text-stone-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && <div className="mt-4 space-y-4">
        {attributes.map((attribute) => {
          const value = getActivityAttributeValue(values, attribute.id);
          const textValue = value && 'value' in value && typeof value.value === 'string' ? value.value : '';
          const numberValue = value && 'value' in value && typeof value.value === 'number' ? value.value : '';
          const selectedSingleOptionId = value && 'optionId' in value ? value.optionId : undefined;
          const selectedMultiOptionIds = value && 'optionIds' in value ? value.optionIds : [];
          const Icon = getAttributeIcon(attribute.type);
          const visibleOptions = (attribute.options || []).filter((option) => !option.isArchived || (
            includeReferencedArchived && (selectedSingleOptionId === option.id || selectedMultiOptionIds.includes(option.id))
          )).sort((left, right) => {
            const firstUse = (optionId: string) => usageLogs.reduce<number | null>((earliest, log) => {
              const used = (log.attributeValues || []).some((item) => {
                if (item.attributeId !== attribute.id) return false;
                return ('optionId' in item && item.optionId === optionId) || ('optionIds' in item && item.optionIds.includes(optionId));
              });
              if (!used) return earliest;
              return earliest === null ? log.startTime : Math.min(earliest, log.startTime);
            }, null);
            const leftTime = firstUse(left.id);
            const rightTime = firstUse(right.id);
            if (leftTime === null && rightTime === null) return 0;
            if (leftTime === null) return 1;
            if (rightTime === null) return -1;
            return leftTime - rightTime;
          });

          return <div key={attribute.id} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Icon size={13} className="text-stone-400" />
              <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">{attribute.name}</label>
              {attribute.isArchived && <span className="text-[10px] text-stone-300">{'\u5df2\u5f52\u6863'}</span>}
              {(attribute.type === 'single' || attribute.type === 'multi') && onActivityChange && !attribute.isArchived && <button type="button" onClick={() => { setAddingOptionAttributeId(attribute.id); setOptionDraft(''); }} className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-stone-400 hover:bg-stone-100 hover:text-stone-700" title={'\u5feb\u901f\u6dfb\u52a0\u9009\u9879'}><Plus size={12} />{'\u6dfb\u52a0'}</button>}
            </div>

            {attribute.type === 'text' && <input type="text" value={textValue} onChange={(event) => { const next = event.target.value; replaceValue(attribute.id, next ? { attributeId: attribute.id, value: next } : undefined); }} className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-700 outline-none focus:border-stone-500" />}
            {attribute.type === 'number' && <input type="number" inputMode="decimal" step="any" value={numberValue} onChange={(event) => { const next = event.target.value; const parsed = Number(next); replaceValue(attribute.id, next !== '' && Number.isFinite(parsed) ? { attributeId: attribute.id, value: parsed } : undefined); }} className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-700 outline-none focus:border-stone-500" />}

            {(attribute.type === 'single' || attribute.type === 'multi') && <>
              <div className="flex max-w-full gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap pb-1">
                {visibleOptions.map((option) => {
                  const isSelected = attribute.type === 'single' ? selectedSingleOptionId === option.id : selectedMultiOptionIds.includes(option.id);
                  const nextOptionIds = isSelected ? selectedMultiOptionIds.filter((id) => id !== option.id) : [...selectedMultiOptionIds, option.id];
                  return <button key={option.id} type="button" onClick={() => replaceValue(attribute.id, attribute.type === 'single' ? (isSelected ? undefined : { attributeId: attribute.id, optionId: option.id }) : (nextOptionIds.length > 0 ? { attributeId: attribute.id, optionIds: nextOptionIds } : undefined))} aria-pressed={isSelected} className={`association-option-button shrink-0 !min-h-0 !min-w-fit !px-2.5 !py-1.5 ${isSelected ? 'record-association-selected border-stone-700 text-stone-800' : 'bg-transparent border-stone-200 text-stone-500 hover:bg-stone-100'}`}>
                    {isSelected && <Check size={11} />}{option.label}
                  </button>;
                })}
              </div>
              {addingOptionAttributeId === attribute.id && <div className="flex gap-2">
                <input autoFocus value={optionDraft} onChange={(event) => setOptionDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addOption(attribute); } }} placeholder={'\u65b0\u9009\u9879'} className="min-w-0 flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-700 outline-none focus:border-stone-500" />
                <button type="button" onClick={() => addOption(attribute)} disabled={!optionDraft.trim()} className="rounded-lg border border-stone-200 px-2.5 text-stone-500 hover:border-stone-500 disabled:opacity-30" title={'\u6dfb\u52a0\u9009\u9879'}><Check size={14} /></button>
              </div>}
            </>}
          </div>;
        })}
      </div>}
    </section>
  );
};
