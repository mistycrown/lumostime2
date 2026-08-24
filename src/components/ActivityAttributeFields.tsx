/**
 * @file ActivityAttributeFields.tsx
 * @input The selected Activity and its ID-based attribute values.
 * @output An inline custom-attribute form for records and active focus sessions.
 * @pos Shared record form component
 * @description Renders every active Activity attribute with a type-appropriate optional control.
 * @updated 2026-08-24: Created for Activity custom attributes.
 */
import React, { useMemo } from 'react';
import { Check, Hash, ListChecks, TextCursorInput } from 'lucide-react';
import { Activity, ActivityAttributeDefinition, ActivityAttributeValue } from '../types';
import { getActivityAttributeValue, getSortedActivityAttributes } from '../utils/activityAttributeUtils';

interface ActivityAttributeFieldsProps {
  activity?: Activity;
  values?: ActivityAttributeValue[];
  onChange: (values: ActivityAttributeValue[]) => void;
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
  includeReferencedArchived = false
}) => {
  const attributes = useMemo(() => {
    return getSortedActivityAttributes(activity).filter((attribute) => {
      if (!attribute.isArchived) return true;
      return includeReferencedArchived && values.some((value) => value.attributeId === attribute.id);
    });
  }, [activity, includeReferencedArchived, values]);

  const replaceValue = (attributeId: string, nextValue?: ActivityAttributeValue) => {
    const remaining = values.filter((item) => item.attributeId !== attributeId);
    onChange(nextValue ? [...remaining, nextValue] : remaining);
  };

  if (attributes.length === 0) return null;

  return (
    <section className="border-t border-stone-100 pt-6 space-y-5">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">属性</span>
        <span className="text-[10px] text-stone-300">可选</span>
      </div>

      <div className="space-y-5">
        {attributes.map((attribute) => {
          const value = getActivityAttributeValue(values, attribute.id);
          const textValue = value && 'value' in value && typeof value.value === 'string' ? value.value : '';
          const numberValue = value && 'value' in value && typeof value.value === 'number' ? value.value : '';
          const selectedSingleOptionId = value && 'optionId' in value ? value.optionId : undefined;
          const selectedMultiOptionIds = value && 'optionIds' in value ? value.optionIds : [];
          const Icon = getAttributeIcon(attribute.type);
          const visibleOptions = (attribute.options || []).filter((option) => {
            if (!option.isArchived) return true;
            return includeReferencedArchived && (
              selectedSingleOptionId === option.id
              || selectedMultiOptionIds.includes(option.id)
            );
          });

          return (
            <div key={attribute.id} className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <Icon size={14} className="text-stone-400" />
                <label className="text-sm font-medium text-stone-700">{attribute.name}</label>
                {attribute.isArchived && <span className="text-[10px] text-stone-300">已归档</span>}
              </div>

              {attribute.type === 'text' && (
                <input
                  type="text"
                  value={textValue}
                  onChange={(event) => {
                    const next = event.target.value;
                    replaceValue(attribute.id, next ? { attributeId: attribute.id, value: next } : undefined);
                  }}
                  className="w-full bg-white border border-stone-200 rounded-lg px-3.5 py-3 text-sm text-stone-800 outline-none focus:border-stone-500 transition-colors"
                />
              )}

              {attribute.type === 'number' && (
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={numberValue}
                  onChange={(event) => {
                    const next = event.target.value;
                    const parsed = Number(next);
                    replaceValue(
                      attribute.id,
                      next !== '' && Number.isFinite(parsed) ? { attributeId: attribute.id, value: parsed } : undefined
                    );
                  }}
                  className="w-full bg-white border border-stone-200 rounded-lg px-3.5 py-3 text-sm text-stone-800 outline-none focus:border-stone-500 transition-colors"
                />
              )}

              {attribute.type === 'single' && (
                <div className="flex flex-wrap gap-2">
                  {visibleOptions.map((option) => {
                    const isSelected = selectedSingleOptionId === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => replaceValue(attribute.id, isSelected ? undefined : { attributeId: attribute.id, optionId: option.id })}
                        aria-pressed={isSelected}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                          isSelected
                            ? 'border-stone-900 bg-stone-900 text-white'
                            : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'
                        }`}
                      >
                        {isSelected && <Check size={13} />}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {attribute.type === 'multi' && (
                <div className="flex flex-wrap gap-2">
                  {visibleOptions.map((option) => {
                    const selectedOptionIds = selectedMultiOptionIds;
                    const isSelected = selectedOptionIds.includes(option.id);
                    const nextOptionIds = isSelected
                      ? selectedOptionIds.filter((id) => id !== option.id)
                      : [...selectedOptionIds, option.id];
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => replaceValue(
                          attribute.id,
                          nextOptionIds.length > 0 ? { attributeId: attribute.id, optionIds: nextOptionIds } : undefined
                        )}
                        aria-pressed={isSelected}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                          isSelected
                            ? 'border-stone-900 bg-stone-900 text-white'
                            : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'
                        }`}
                      >
                        {isSelected && <Check size={13} />}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
