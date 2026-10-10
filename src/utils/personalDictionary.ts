/**
 * @file personalDictionary.ts
 * @updated 2026-10-10: Combines manual words with node names and aliases without persisting derived entries.
 * @input Unknown dictionary data, manually entered words and node names/aliases
 * @output Normalized manual or combined words with case-insensitive deduplication and original casing
 * @pos Shared personal dictionary utility
 * @updated 2026-10-09: Adds safe normalization and batch entry parsing.
 */
import type { NoteNode } from '../types';

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

export const getEffectiveDictionaryWords = (
  personalWords: readonly string[],
  nodes: readonly Pick<NoteNode, 'name' | 'aliases'>[]
): string[] => normalizePersonalDictionary([
  ...personalWords,
  ...nodes.flatMap((node) => [node.name, ...(node.aliases || [])])
]);
