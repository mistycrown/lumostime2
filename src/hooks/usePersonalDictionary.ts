/**
 * @file usePersonalDictionary.ts
 * @input Shared personal dictionary storage and change/restore events
 * @output Reactive words for settings, note completion and text statistics
 * @pos Hook
 * @updated 2026-10-09: Shares stable snapshots without requiring a provider.
 */
import { useSyncExternalStore } from 'react';
import { personalDictionaryService } from '../services/personalDictionaryService';

export const usePersonalDictionary = (): string[] => useSyncExternalStore(
  personalDictionaryService.subscribe,
  personalDictionaryService.getAll,
  personalDictionaryService.getServerSnapshot
);
