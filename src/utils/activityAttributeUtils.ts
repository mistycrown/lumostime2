/**
 * @file activityAttributeUtils.ts
 * @input Activity attribute definitions and ID-based attribute values.
 * @output Attribute value filtering and lookup helpers.
 * @pos Shared utility
 * @description Keeps Activity custom attribute values valid as users switch tags or archive definitions.
 * @updated 2026-08-24: Created for Activity custom attributes.
 */
import { Activity, ActivityAttributeDefinition, ActivityAttributeValue } from '../types';

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
