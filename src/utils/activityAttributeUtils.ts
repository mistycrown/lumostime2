/**
 * @file activityAttributeUtils.ts
 * @input Activity attribute definitions and ID-based attribute values.
 * @output Attribute value filtering, lookup, and recent-option ordering helpers.
 * @pos Shared utility
 * @description Keeps Activity custom attribute values valid as users switch tags or archive definitions.
 * @updated 2026-08-28: Added recent-use ordering for choice attribute options.
 * @updated 2026-08-24: Created for Activity custom attributes.
 */
import { Activity, ActivityAttributeDefinition, ActivityAttributeOption, ActivityAttributeValue, Log } from '../types';

export const getSortedActivityAttributes = (activity?: Pick<Activity, 'attributes'>): ActivityAttributeDefinition[] => {
  return [...(activity?.attributes || [])].sort((left, right) => left.order - right.order);
};

export const getActivityAttributeValue = (
  values: ActivityAttributeValue[] | undefined,
  attributeId: string
): ActivityAttributeValue | undefined => values?.find((item) => item.attributeId === attributeId);

export const filterAttributeValuesForActivity = (
  values: ActivityAttributeValue[] | undefined,
  activity?: Activity
): ActivityAttributeValue[] => {
  if (!values || !activity) return [];

  const availableAttributeIds = new Set(
    getSortedActivityAttributes(activity)
      .filter((attribute) => !attribute.isArchived)
      .map((attribute) => attribute.id)
  );

  return values.filter((item) => availableAttributeIds.has(item.attributeId));
};

export const hasActivityAttributeValues = (values: ActivityAttributeValue[] | undefined): boolean => {
  return (values?.length || 0) > 0;
};

const optionWasUsedByLog = (log: Log, attributeId: string, optionId: string): boolean => (
  log.attributeValues || []
).some((value) => {
  if (value.attributeId !== attributeId) return false;
  if ('optionId' in value) return value.optionId === optionId;
  if ('optionIds' in value) return value.optionIds.includes(optionId);
  return false;
});

export const getSortedActivityAttributeOptions = (
  options: ActivityAttributeOption[],
  logs: Log[],
  attributeId: string,
  selectedOptionIds: string[] = []
): ActivityAttributeOption[] => {
  const selectedOptionIdSet = new Set(selectedOptionIds);
  const lastUsedAtByOptionId = new Map<string, number>();

  logs.forEach((log) => {
    options.forEach((option) => {
      if (!optionWasUsedByLog(log, attributeId, option.id)) return;
      const previousLastUsedAt = lastUsedAtByOptionId.get(option.id);
      if (previousLastUsedAt === undefined || log.startTime > previousLastUsedAt) {
        lastUsedAtByOptionId.set(option.id, log.startTime);
      }
    });
  });

  return options
    .map((option, index) => ({ option, index, lastUsedAt: lastUsedAtByOptionId.get(option.id) }))
    .sort((left, right) => {
      const leftIsSelected = selectedOptionIdSet.has(left.option.id);
      const rightIsSelected = selectedOptionIdSet.has(right.option.id);
      if (leftIsSelected !== rightIsSelected) return leftIsSelected ? -1 : 1;
      if (left.lastUsedAt !== undefined && right.lastUsedAt !== undefined && left.lastUsedAt !== right.lastUsedAt) {
        return right.lastUsedAt - left.lastUsedAt;
      }
      if (left.lastUsedAt !== undefined && right.lastUsedAt === undefined) return -1;
      if (left.lastUsedAt === undefined && right.lastUsedAt !== undefined) return 1;
      return left.index - right.index;
    })
    .map(({ option }) => option);
};
