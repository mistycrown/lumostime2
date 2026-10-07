/**
 * @file exportSerialization.ts
 * @input Activity attribute definitions and persisted attribute values.
 * @output Stable readable and raw representations used by data exporters.
 * @pos Utility (export formatting)
 * @description Keeps attribute labels readable while preserving the original IDs and values for round-trip inspection.
 */

import type { Activity, ActivityAttributeDefinition, ActivityAttributeValue } from '../types';

export interface SerializedAttributeValue {
  attributeId: string;
  attributeName: string;
  value: string;
  rawValue: ActivityAttributeValue;
}

export const serializeJsonCell = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const getOptionLabel = (attribute: ActivityAttributeDefinition | undefined, optionId: string): string => {
  return attribute?.options?.find((option) => option.id === optionId)?.label || optionId;
};

const getValueText = (value: ActivityAttributeValue, attribute?: ActivityAttributeDefinition): string => {
  if ('optionId' in value) return getOptionLabel(attribute, value.optionId);
  if ('optionIds' in value) return value.optionIds.map((optionId) => getOptionLabel(attribute, optionId)).join(', ');
  return String(value.value);
};

export const serializeAttributeValues = (
  values: ActivityAttributeValue[] | undefined,
  activity: Pick<Activity, 'attributes'> | undefined
): SerializedAttributeValue[] => {
  const definitions = new Map((activity?.attributes || []).map((attribute) => [attribute.id, attribute]));
  return (values || []).map((value) => ({
    attributeId: value.attributeId,
    attributeName: definitions.get(value.attributeId)?.name || value.attributeId,
    value: getValueText(value, definitions.get(value.attributeId)),
    rawValue: value
  }));
};

export const getAttributeDefinitionKey = (activityId: string, attributeId: string): string => `${activityId}:${attributeId}`;
