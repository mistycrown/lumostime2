/**
 * @file useTextDictionary.ts
 * @input Manual personal words and optional live node metadata
 * @output Effective words for autocomplete and word-cloud segmentation
 * @pos Hook
 * @updated 2026-10-10: Includes node names/aliases while keeping the editable personal dictionary separate.
 */
import { useMemo } from 'react';
import { useOptionalNodes } from '../contexts/NodeContext';
import { getEffectiveDictionaryWords } from '../utils/personalDictionary';
import { usePersonalDictionary } from './usePersonalDictionary';

export const useTextDictionary = (): string[] => {
  const personalWords = usePersonalDictionary();
  const nodes = useOptionalNodes()?.nodes;
  return useMemo(() => getEffectiveDictionaryWords(personalWords, nodes || []), [personalWords, nodes]);
};
