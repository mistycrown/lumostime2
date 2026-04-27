/**
 * @file assistantMessageParts.ts
 * @input Optional structured assistant reply parts plus fallback full-text content
 * @output Normalized multi-bubble display parts for assistant chat rendering
 * @pos Utility (Assistant Message Parts)
 * @description Centralizes normalization and conservative fallback splitting for assistant replies so foreground and background messages can share one grouped multi-bubble rendering path.
 *
 * @updated 2026-04-27: Added structured-part normalization and conservative fallback sentence splitting for grouped assistant chat bubbles.
 */

const MAX_DISPLAY_PARTS = 4;

const trimStringArray = (value: unknown): string[] => (
  Array.isArray(value)
    ? value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .slice(0, MAX_DISPLAY_PARTS)
    : []
);

const isUsablePartSet = (parts: string[]): boolean => (
  parts.length > 1
  && parts.length <= MAX_DISPLAY_PARTS
  && parts.every((part) => part.length >= 2)
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

  if (parts.some((part) => part.length < 3 || part.length > 48)) {
    return [];
  }

  return parts;
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
