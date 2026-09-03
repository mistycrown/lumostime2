/**
 * @file detailTimelineKeywordUtils.ts
 * @input Stored timeline keywords, one optional keyword-source attribute, and log attribute values.
 * @output Deduplicated keyword labels and per-log keyword matches.
 * @pos Shared detail timeline utility
 * @description Keeps note keyword matching compatible while projecting selected Activity attribute options into keyword calendars.
 * @updated 2026-09-03: Created for Activity attribute keyword sources.
 */
import { ActivityAttributeDefinition, Log } from '../types';

const getActiveKeywordOptions = (attribute?: ActivityAttributeDefinition) => (
  attribute?.options || []
).filter((option) => !option.isArchived && option.label.trim().length > 0);

export const getDetailTimelineKeywords = (
  keywords: string[],
  attribute?: ActivityAttributeDefinition
): string[] => Array.from(new Set([
  ...keywords.map((keyword) => keyword.trim()).filter(Boolean),
  ...getActiveKeywordOptions(attribute).map((option) => option.label.trim())
]));

export const getLogMatchedDetailTimelineKeywords = (
  log: Log,
  keywords: string[],
  attribute?: ActivityAttributeDefinition
): string[] => {
  const matchedKeywords = new Set<string>();
  const searchableText = `${log.title || ''}\n${log.note || ''}`;

  keywords.forEach((keyword) => {
    if (searchableText.includes(keyword)) matchedKeywords.add(keyword);
  });

  if (!attribute) return Array.from(matchedKeywords);
  const storedValue = (log.attributeValues || []).find((value) => value.attributeId === attribute.id);
  if (!storedValue) return Array.from(matchedKeywords);

  const selectedOptionIds = 'optionId' in storedValue
    ? [storedValue.optionId]
    : ('optionIds' in storedValue ? storedValue.optionIds : []);
  const selectedOptionIdSet = new Set(selectedOptionIds);

  getActiveKeywordOptions(attribute).forEach((option) => {
    if (selectedOptionIdSet.has(option.id)) matchedKeywords.add(option.label.trim());
  });

  return Array.from(matchedKeywords);
};
