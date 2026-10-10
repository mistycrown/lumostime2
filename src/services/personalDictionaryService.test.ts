/**
 * @file personalDictionaryService.test.ts
 * @updated 2026-10-10: Verifies node-derived words, deduplication and separation from persisted manual words.
 * @input Local storage, dictionary edits, preference restores and malformed data
 * @output Regression coverage for persistence, stable snapshots and reactive restore
 * @pos Test (Personal Dictionary)
 * @updated 2026-10-09: Verifies normalization, backup compatibility and subscriptions.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { SETTINGS_KEYS } from '../constants/storageKeys';
import { getEffectiveDictionaryWords, normalizePersonalDictionary, parsePersonalDictionaryInput } from '../utils/personalDictionary';
import { getNoteAutocompleteIndex, getNoteCompletion } from '../utils/noteAutocomplete';
import { getTextTerms } from '../utils/textSegmentation';
import { personalDictionaryService } from './personalDictionaryService';
import { preferencesBackupService } from './preferencesBackupService';

describe('personal dictionary', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key)
    } });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: new EventTarget() });
  });

  it('normalizes batch input while preserving spelling and multi-word phrases', () => {
    expect(parsePersonalDictionaryInput(' TypeScript，typescript\n科研项目;New   York、C++'))
      .toEqual(['TypeScript', '科研项目', 'New York', 'C++']);
    expect(normalizePersonalDictionary([null, 4, '', '  ', ' 科研项目 ', '科研项目'])).toEqual(['科研项目']);
    expect(normalizePersonalDictionary({})).toEqual([]);
  });

  it('includes node names and aliases without mutating or storing derived words', () => {
    personalDictionaryService.setAll(['TypeScript', '美食广场']);
    const manual = personalDictionaryService.getAll();
    const nodes = [{ name: '科研项目复盘', aliases: ['项目复盘', 'typescript', ' '] }];
    const effective = getEffectiveDictionaryWords(manual, nodes);
    expect(effective).toEqual(['TypeScript', '美食广场', '科研项目复盘', '项目复盘']);
    expect(nodes[0].aliases).toEqual(['项目复盘', 'typescript', ' ']);
    expect(personalDictionaryService.getAll()).toBe(manual);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEYS.PERSONAL_DICTIONARY)!)).toEqual(['TypeScript', '美食广场']);
    expect(getNoteCompletion(getNoteAutocompleteIndex([], effective), '科研项', 3)?.suffix).toBe('目复盘');
    expect(getNoteCompletion(getNoteAutocompleteIndex([], effective), '项目复', 3)?.suffix).toBe('盘');
    expect(getTextTerms('科研项目复盘 项目复盘', undefined, effective)).toEqual(['科研项目复盘', '项目复盘']);
    expect(getTextTerms('科研项目复盘', { mergeWords: [], stopWords: ['科研项目复盘'] }, effective)).toEqual([]);
    expect(getEffectiveDictionaryWords([], nodes)).toEqual(['科研项目复盘', '项目复盘', 'typescript']);
    expect(getEffectiveDictionaryWords(manual, [])).toEqual(manual);
  });

  it('persists edits, keeps snapshots stable and notifies subscribers until unsubscribed', () => {
    let notifications = 0;
    const unsubscribe = personalDictionaryService.subscribe(() => { notifications += 1; });
    personalDictionaryService.setAll([' 科研项目 ', 'TypeScript', 'typescript']);
    expect(notifications).toBe(1);
    const words = personalDictionaryService.getAll();
    expect(words).toEqual(['科研项目', 'TypeScript']);
    expect(personalDictionaryService.getAll()).toBe(words);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEYS.PERSONAL_DICTIONARY)!)).toEqual(words);
    unsubscribe();
    personalDictionaryService.setAll([]);
    expect(notifications).toBe(1);
    expect(personalDictionaryService.getAll()).toEqual([]);
  });

  it('backs up words and restores mounted consumers, leaving them intact for older backups', () => {
    personalDictionaryService.setAll(['科研项目']);
    const backup = preferencesBackupService.buildBackupPayload();
    expect(backup.storage[SETTINGS_KEYS.PERSONAL_DICTIONARY]).toBe('["科研项目"]');
    personalDictionaryService.setAll(['另一个词条']);
    let restored: string[] = [];
    const unsubscribe = personalDictionaryService.subscribe(() => { restored = personalDictionaryService.getAll(); });
    preferencesBackupService.applyBackupPayload(backup);
    expect(restored).toEqual(['科研项目']);
    preferencesBackupService.applyBackupPayload({ storage: { lumos_default_view: 'RECORD' } });
    expect(personalDictionaryService.getAll()).toEqual(['科研项目']);
    preferencesBackupService.applyBackupPayload({ storage: { [SETTINGS_KEYS.PERSONAL_DICTIONARY]: null } });
    expect(personalDictionaryService.getAll()).toEqual([]);
    unsubscribe();
  });

  it('tolerates corrupt or non-array stored data', () => {
    for (const raw of ['broken json', '{"words":1}', 'null']) {
      localStorage.setItem(SETTINGS_KEYS.PERSONAL_DICTIONARY, raw);
      expect(personalDictionaryService.getAll()).toEqual([]);
    }
  });
});
