/**
 * @file personalDictionaryService.ts
 * @input Persisted dictionary words, edits and preference restore/storage events
 * @output Stable dictionary snapshots and reactive persistence for backup/sync
 * @pos Service (Content Settings)
 * @updated 2026-10-09: Persists personal words and refreshes consumers after edits or restores.
 */
import { SETTINGS_KEYS } from '../constants/storageKeys';
import { normalizePersonalDictionary } from '../utils/personalDictionary';
import { PREFERENCES_CHANGED_EVENT, PREFERENCES_RESTORED_EVENT } from './preferencesBackupService';

let cachedRaw: string | null | undefined;
let cachedWords: string[] = [];
const EMPTY_WORDS: string[] = [];

export const personalDictionaryService = {
  getAll(): string[] {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(SETTINGS_KEYS.PERSONAL_DICTIONARY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      try { cachedWords = normalizePersonalDictionary(raw ? JSON.parse(raw) : []); }
      catch { cachedWords = []; }
    }
    return cachedWords;
  },
  setAll(words: string[]): void {
    localStorage.setItem(SETTINGS_KEYS.PERSONAL_DICTIONARY, JSON.stringify(normalizePersonalDictionary(words)));
    window.dispatchEvent(new CustomEvent(PREFERENCES_CHANGED_EVENT));
  },
  subscribe(onChange: () => void): () => void {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === SETTINGS_KEYS.PERSONAL_DICTIONARY) onChange();
    };
    window.addEventListener(PREFERENCES_CHANGED_EVENT, onChange);
    window.addEventListener(PREFERENCES_RESTORED_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PREFERENCES_CHANGED_EVENT, onChange);
      window.removeEventListener(PREFERENCES_RESTORED_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  },
  getServerSnapshot: () => EMPTY_WORDS
};
