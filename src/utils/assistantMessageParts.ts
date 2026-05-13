/**
 * @file assistantMessageParts.ts
 * @input Assistant full-text reply content plus optional legacy structured parts
 * @output Normalized multi-bubble display parts for assistant chat rendering
 * @pos Utility (Assistant Message Parts)
 * @description Centralizes newline-first and sentence-aware fallback splitting for assistant replies so one complete assistant message can be rendered as several short chat bubbles without requiring a separate duplicate parts field.
 *
 * @updated 2026-05-13: Prioritized paragraph and line breaks from the single assistant reply body, keeping structured parts only as a legacy fallback input for older persisted messages.
 * @updated 2026-05-01: Filtered null-like placeholder strings out of structured assistant reply parts so malformed model arrays no longer surface literal "null" bubbles.
 * @updated 2026-04-27: Added clause-aware fallback splitting and chunk rebalancing so longer assistant paragraphs render more like several short chat bursts.
 * @updated 2026-04-27: Added structured-part normalization and conservative fallback sentence splitting for grouped assistant chat bubbles.
 */

const MAX_DISPLAY_PARTS = 4;
const MIN_PART_LENGTH = 3;
const MAX_PART_LENGTH = 36;
const CLAUSE_SPLIT_MIN_CONTENT_LENGTH = 16;

const normalizePart = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return trimmed && !['null', 'undefined'].includes(trimmed.toLowerCase())
    ? trimmed
    : '';
};

const trimStringArray = (value: unknown): string[] => (
  Array.isArray(value)
    ? value
      .map(normalizePart)
      .filter(Boolean)
      .slice(0, MAX_DISPLAY_PARTS)
    : []
);

const isUsablePartSet = (parts: string[]): boolean => (
  parts.length > 1
  && parts.length <= MAX_DISPLAY_PARTS
  && parts.every((part) => part.length >= MIN_PART_LENGTH)
);

const splitByParagraphs = (content: string): string[] => (
  content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
);

const splitByLines = (content: string): string[] => (
  content
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
);

const splitBySentences = (content: string): string[] => {
  const matches = content.match(/[^。！？!?]+[。！？!?]?/g) || [];
  const parts = matches
    .map((part) => part.trim())
    .filter(Boolean);

  if (!isUsablePartSet(parts)) {
    return [];
  }

  if (parts.some((part) => part.length < MIN_PART_LENGTH || part.length > 48)) {
    return [];
  }

  return parts;
};

const splitByClauses = (content: string): string[] => {
  if (content.length < CLAUSE_SPLIT_MIN_CONTENT_LENGTH) {
    return [];
  }

  const clauses = content
    .split(/(?<=[，；：])/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (clauses.length < 2 || clauses.length > 6) {
    return [];
  }

  if (clauses.some((part) => part.length < 4)) {
    return [];
  }

  const merged: string[] = [];
  let current = '';

  clauses.forEach((clause) => {
    if (!current) {
      current = clause;
      return;
    }

    if ((current.length + clause.length) <= 20) {
      current += clause;
      return;
    }

    merged.push(current);
    current = clause;
  });

  if (current) {
    merged.push(current);
  }

  if (merged.some((part) => part.length > MAX_PART_LENGTH)) {
    return [];
  }

  return isUsablePartSet(merged) ? merged : [];
};

export const buildAssistantDisplayParts = (
  content: string,
  rawParts?: unknown
): string[] | undefined => {
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return undefined;
  }

  const structuredParts = trimStringArray(rawParts);
  if (isUsablePartSet(structuredParts)) {
    return structuredParts;
  }

  const paragraphParts = splitByParagraphs(trimmedContent);
  if (isUsablePartSet(paragraphParts)) {
    return paragraphParts;
  }

  const lineParts = splitByLines(trimmedContent);
  if (isUsablePartSet(lineParts)) {
    return lineParts;
  }

  const sentenceParts = splitBySentences(trimmedContent);
  if (isUsablePartSet(sentenceParts)) {
    return sentenceParts;
  }

  const clauseParts = splitByClauses(trimmedContent);
  if (isUsablePartSet(clauseParts)) {
    return clauseParts;
  }

  return undefined;
};

export const normalizeAssistantDisplayParts = (
  value: unknown,
  fallbackContent?: string
): string[] | undefined => {
  const normalized = trimStringArray(value);
  if (isUsablePartSet(normalized)) {
    return normalized;
  }

  if (fallbackContent?.trim()) {
    return buildAssistantDisplayParts(fallbackContent);
  }

  return undefined;
};
