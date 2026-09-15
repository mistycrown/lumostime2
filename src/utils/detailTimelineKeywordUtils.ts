/**
 * @file detailTimelineKeywordUtils.ts
 * @input Stored Activity keywords, keyword-source attributes, and timeline logs.
 * @output Normalized keyword records, label candidates, and per-log keyword matches.
 * @pos Shared detail timeline utility
 * @description Centralizes Activity keyword migration, attribute registration, and timeline matching.
 * @updated 2026-09-15: Unified manual and Activity attribute keywords with persisted colors.
 */
import { Activity, ActivityAttributeDefinition, ActivityKeyword, Log } from '../types';

export const DEFAULT_KEYWORD_COLORS = ['#fca5a5', '#67e8f9', '#fde047', '#93c5fd', '#fdba74', '#5eead4', '#fcd34d', '#a5b4fc', '#bef264', '#d8b4fe', '#86efac', '#f0abfc', '#6ee7b7', '#f9a8d4', '#7dd3fc', '#fda4af', '#c4b5fd'];
const hashLabel = (label: string): number => {
  let hash = 0;
  for (let index = 0; index < label.length; index += 1) hash = label.charCodeAt(index) + ((hash << 5) - hash);
  return Math.abs(hash);
};
export const getDefaultKeywordColor = (label: string, index = 0): string => DEFAULT_KEYWORD_COLORS[(hashLabel(label) + index) % DEFAULT_KEYWORD_COLORS.length];
export const getRandomKeywordColor = (): string => DEFAULT_KEYWORD_COLORS[Math.floor(Math.random() * DEFAULT_KEYWORD_COLORS.length)];

export const normalizeActivityKeywords = (keywords: Array<string | ActivityKeyword> = []): ActivityKeyword[] => {
  const seen = new Set<string>();
  return keywords.reduce<ActivityKeyword[]>((result, keyword, index) => {
    const record: ActivityKeyword = typeof keyword === 'string' ? { label: keyword.trim(), source: 'manual' } : { ...keyword, label: keyword.label.trim(), source: keyword.source || 'manual' };
    if (!record.label || seen.has(record.label)) return result;
    seen.add(record.label);
    result.push({ ...record, color: record.color || getDefaultKeywordColor(record.label, index) });
    return result;
  }, []);
};

const getActiveKeywordOptions = (attribute?: ActivityAttributeDefinition) => (
  attribute?.options || []
).filter((option) => !option.isArchived && option.label.trim().length > 0);

export const syncActivityKeywordsWithAttribute = (
  keywords: Array<string | ActivityKeyword> = [],
  attributes: ActivityAttributeDefinition[] = []
): ActivityKeyword[] => {
  const normalized = normalizeActivityKeywords(keywords);
  const keywordAttribute = attributes.find((attribute) => (
    attribute.isKeywordSource && !attribute.isArchived && (attribute.type === 'single' || attribute.type === 'multi')
  ));
  const activeOptions = getActiveKeywordOptions(keywordAttribute);
  const activeOptionIds = new Set(activeOptions.map((option) => option.id));
  const retained = normalized.filter((keyword) => keyword.source !== 'attribute' || (
    keyword.attributeId === keywordAttribute?.id && keyword.optionId && activeOptionIds.has(keyword.optionId)
  ));
  if (!keywordAttribute) return retained;
  const byOptionId = new Map(retained.filter((keyword) => keyword.source === 'attribute').map((keyword) => [keyword.optionId, keyword]));
  activeOptions.forEach((option, index) => {
    const existing = byOptionId.get(option.id);
    if (existing) {
      existing.label = option.label.trim();
      existing.attributeId = keywordAttribute.id;
      return;
    }
    retained.push({
      label: option.label.trim(),
      color: getRandomKeywordColor(),
      source: 'attribute',
      attributeId: keywordAttribute.id,
      optionId: option.id
    });
  });
  return retained;
};

export const getDetailTimelineKeywords = (
  keywords: Array<string | ActivityKeyword>,
  attribute?: ActivityAttributeDefinition
): string[] => {
  const records = normalizeActivityKeywords(keywords);
  const labels = records.map((keyword) => keyword.label);
  if (!attribute) return labels;
  getActiveKeywordOptions(attribute).forEach((option) => {
    if (!labels.includes(option.label.trim())) labels.push(option.label.trim());
  });
  return labels;
};

export const getDetailTimelineKeywordRecords = (
  keywords: Array<string | ActivityKeyword>
): ActivityKeyword[] => normalizeActivityKeywords(keywords);

export const getActivityKeywordCandidates = (
  activity?: Pick<Activity, 'keywords' | 'attributes'>
): string[] => {
  const keywordAttribute = (activity?.attributes || []).find((attribute) => (
    attribute.isKeywordSource
    && !attribute.isArchived
    && (attribute.type === 'single' || attribute.type === 'multi')
  ));

  return getDetailTimelineKeywords(activity?.keywords || [], keywordAttribute);
};

export const getLogMatchedDetailTimelineKeywords = (
  log: Log,
  keywords: Array<string | ActivityKeyword>,
  attribute?: ActivityAttributeDefinition
): string[] => {
  const records = normalizeActivityKeywords(keywords);
  const matchedKeywords = new Set<string>();
  const searchableText = `${log.title || ''}\n${log.note || ''}`;

  records.forEach((keyword) => {
    if (searchableText.includes(keyword.label)) matchedKeywords.add(keyword.label);
  });

  if (!attribute) {
    records.filter((keyword) => keyword.source === 'attribute' && keyword.optionId).forEach((keyword) => {
      const selected = (log.attributeValues || []).some((value) => (
        ('optionId' in value && value.optionId === keyword.optionId)
        || ('optionIds' in value && value.optionIds.includes(keyword.optionId!))
      ));
      if (selected) matchedKeywords.add(keyword.label);
    });
    return Array.from(matchedKeywords);
  }
  const storedValue = (log.attributeValues || []).find((value) => value.attributeId === attribute.id);
  if (!storedValue) return Array.from(matchedKeywords);

  const selectedOptionIds = 'optionId' in storedValue
    ? [storedValue.optionId]
    : ('optionIds' in storedValue ? storedValue.optionIds : []);
  const selectedOptionIdSet = new Set(selectedOptionIds);

  records.forEach((keyword) => {
    if (keyword.source === 'attribute' && keyword.attributeId === attribute.id && keyword.optionId && selectedOptionIdSet.has(keyword.optionId)) matchedKeywords.add(keyword.label);
  });
  getActiveKeywordOptions(attribute).forEach((option) => {
    if (selectedOptionIdSet.has(option.id)) matchedKeywords.add(option.label.trim());
  });

  return Array.from(matchedKeywords);
};
