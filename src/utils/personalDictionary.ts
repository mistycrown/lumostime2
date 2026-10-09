/**
 * @file personalDictionary.ts
 * @input Unknown dictionary data or manually entered words
 * @output Trimmed, case-insensitively deduplicated words with original casing
 * @pos Shared personal dictionary utility
 * @updated 2026-10-09: Adds safe normalization and batch entry parsing.
 */
export const normalizePersonalDictionary = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.filter((word): word is string => typeof word === 'string')
    .map((word) => word.trim().replace(/\s+/g, ' '))
    .filter((word) => {
      const key = word.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const parsePersonalDictionaryInput = (value: string): string[] =>
  normalizePersonalDictionary(value.split(/[,，、;；\r\n]+/));
