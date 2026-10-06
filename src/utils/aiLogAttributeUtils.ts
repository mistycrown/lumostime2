/**
 * @file aiLogAttributeUtils.ts
 * @input Untrusted AI attribute values and the resolved activity definition
 * @output Shape-normalized and activity-validated ID-based log attribute values
 * @pos Utility (AI log attributes)
 * @description Rejects invented IDs, archived fields/options, wrong types, and unmet conditions before AI log writeback.
 * @updated 2026-10-06: Adds shared validation for chat and quick-add backfills.
 */
import type { Activity, ActivityAttributeValue } from '../types';
import { getSortedActivityAttributes, isActivityAttributeConditionMet } from './activityAttributeUtils';

const normalizeId = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

export const normalizeAILogAttributeValues = (input: unknown): ActivityAttributeValue[] => {
  if (!Array.isArray(input)) return [];
  return input.flatMap((item): ActivityAttributeValue[] => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const attributeId = normalizeId(item.attributeId);
    if (!attributeId || ['value', 'optionId', 'optionIds'].filter((key) => key in item).length !== 1) return [];

    if ('value' in item) {
      if (typeof item.value === 'number' && Number.isFinite(item.value)) return [{ attributeId, value: item.value }];
      if (typeof item.value === 'string' && item.value.trim()) return [{ attributeId, value: item.value.trim() }];
    } else if ('optionId' in item) {
      const optionId = normalizeId(item.optionId);
      if (optionId) return [{ attributeId, optionId }];
    } else if (Array.isArray(item.optionIds)) {
      const optionIds = [...new Set<string>(item.optionIds.map(normalizeId).filter(Boolean))];
      if (optionIds.length) return [{ attributeId, optionIds }];
    }
    return [];
  });
};

export const validateAILogAttributeValues = (input: unknown, activity: Activity | undefined): ActivityAttributeValue[] => {
  if (!activity) return [];
  const definitions = new Map(getSortedActivityAttributes(activity)
    .filter((attribute) => !attribute.isArchived)
    .map((attribute) => [attribute.id, attribute]));
  const validValues = new Map<string, ActivityAttributeValue>();

  normalizeAILogAttributeValues(input).forEach((value) => {
    const definition = definitions.get(value.attributeId);
    if (!definition) return;
    if (definition.type === 'text' || definition.type === 'number') {
      if ('value' in value && typeof value.value === (definition.type === 'text' ? 'string' : 'number')) {
        validValues.set(value.attributeId, value);
      }
      return;
    }
    const optionIds = new Set((definition.options || []).filter((option) => !option.isArchived).map((option) => option.id));
    if (definition.type === 'single' && 'optionId' in value && optionIds.has(value.optionId)) {
      validValues.set(value.attributeId, value);
    } else if (definition.type === 'multi' && 'optionIds' in value) {
      const selectedIds = value.optionIds.filter((id) => optionIds.has(id));
      if (selectedIds.length) validValues.set(value.attributeId, { attributeId: value.attributeId, optionIds: selectedIds });
    }
  });

  const values = [...validValues.values()];
  return values.filter((value) => {
    const definition = definitions.get(value.attributeId)!;
    const condition = definition.displayCondition;
    if (!condition) return true;
    // Activity attributes support one level of conditions, triggered by an active single-choice parent.
    const parent = definitions.get(condition.attributeId);
    return Boolean(parent && parent.type === 'single' && !parent.displayCondition
      && isActivityAttributeConditionMet(definition, values));
  });
};
