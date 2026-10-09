/**
 * @file noteAutocomplete.ts
 * @updated 2026-10-09: Prioritizes personal words without requiring history and caches dictionary-specific indexes.
 * @input Actual historical log notes, current note and caret/activity context
 * @output Cached local prefix index and a single missing-text suggestion
 * @pos Shared text utility
 * @updated 2026-10-09: Adds record-deduplicated word/phrase completion with contextual ranking and protected caret positions.
 */
import type { Log } from '../types';
import { getTextTerms } from './textSegmentation';
import { normalizePersonalDictionary } from './personalDictionary';

interface NoteTerm {
  text: string;
  key: string;
  phrase: boolean;
}
interface IndexedTerm extends NoteTerm {
  personal?: boolean;
  count: number;
  recentCount: number;
  lastUsed: number;
  activities: Map<string, number>;
}
export interface NoteAutocompleteIndex {
  prefixes: Map<string, IndexedTerm[]>;
  words: Set<string>;
  maxPersonalLength?: number;
}
export interface NoteCompletion {
  text: string;
  suffix: string;
}

export const EMPTY_NOTE_HISTORY: readonly Log[] = [];
const indexCache = new WeakMap<readonly Log[], NoteAutocompleteIndex>();
const dictionaryIndexCache = new WeakMap<readonly Log[], WeakMap<readonly string[], NoteAutocompleteIndex>>();
const termCache = new WeakMap<Log, NoteTerm[]>();
const isUseful = (text: string) => text.length >= 2 && text.length <= 24 && !/^\d+$/.test(text);

const getLogTerms = (log: Log): NoteTerm[] => {
  const cached = termCache.get(log);
  if (cached) return cached;
  const note = log.note || '';
  const lower = note.toLowerCase();
  const terms = new Map<string, NoteTerm>();
  const positioned: Array<{ text: string; start: number; end: number }> = [];
  let cursor = 0;
  for (const term of getTextTerms(note)) {
    const start = lower.indexOf(term, cursor);
    if (start < 0) continue;
    const end = start + term.length;
    const text = note.slice(start, end);
    positioned.push({ text, start, end });
    if (isUseful(term)) terms.set(term, { key: term, text, phrase: false });
    cursor = end;
  }
  // Only join neighboring words actually adjacent in the note, never across punctuation or filtered words.
  for (let i = 1; i < positioned.length; i += 1) {
    const left = positioned[i - 1];
    const right = positioned[i];
    if (!isUseful(left.text) || !isUseful(right.text) || !/^[ \t]?$/.test(note.slice(left.end, right.start))) continue;
    const text = note.slice(left.start, right.end);
    if (text.length <= 16) terms.set(text.toLowerCase(), { key: text.toLowerCase(), text, phrase: true });
  }
  const result = [...terms.values()];
  termCache.set(log, result);
  return result;
};

const getHistoryIndex = (logs: readonly Log[]): NoteAutocompleteIndex => {
  const cached = indexCache.get(logs);
  if (cached) return cached;
  const entries = new Map<string, IndexedTerm>();
  const seen = new Set<string>();
  const recentStart = Date.now() - 30 * 86400000;
  for (const log of logs) {
    if (log.isPlanned || !log.note || seen.has(log.id)) continue;
    seen.add(log.id);
    for (const term of getLogTerms(log)) {
      const entry = entries.get(term.key) || { ...term, count: 0, recentCount: 0, lastUsed: 0, activities: new Map<string, number>() };
      entry.count += 1;
      entry.recentCount += log.startTime >= recentStart ? 1 : 0;
      if (log.startTime >= entry.lastUsed) entry.text = term.text;
      entry.lastUsed = Math.max(entry.lastUsed, log.startTime);
      entry.activities.set(log.activityId, (entry.activities.get(log.activityId) || 0) + 1);
      entries.set(term.key, entry);
    }
  }
  const index: NoteAutocompleteIndex = { prefixes: new Map(), words: new Set() };
  for (const entry of entries.values()) {
    if (entry.count < 2) continue;
    index.words.add(entry.key);
    for (let length = 1; length < entry.key.length; length += 1) {
      const prefix = entry.key.slice(0, length);
      const matches = index.prefixes.get(prefix) || [];
      matches.push(entry);
      index.prefixes.set(prefix, matches);
    }
  }
  indexCache.set(logs, index);
  return index;
};

export const getNoteAutocompleteIndex = (logs: readonly Log[], personalWords: readonly string[] = []): NoteAutocompleteIndex => {
  const history = getHistoryIndex(logs);
  if (!personalWords.length) return history;
  let cache = dictionaryIndexCache.get(logs);
  if (!cache) { cache = new WeakMap(); dictionaryIndexCache.set(logs, cache); }
  const cached = cache.get(personalWords);
  if (cached) return cached;
  const index: NoteAutocompleteIndex = { prefixes: new Map(history.prefixes), words: new Set(history.words), maxPersonalLength: 0 };
  for (const text of normalizePersonalDictionary(personalWords)) {
    const key = text.toLowerCase();
    const historic = history.prefixes.get(key.slice(0, 1))?.find((term) => term.key === key);
    const entry: IndexedTerm = { count: 0, recentCount: 0, lastUsed: 0, activities: new Map(), ...historic,
      text, key, phrase: /\s/.test(text), personal: true };
    index.words.add(key);
    index.maxPersonalLength = Math.max(index.maxPersonalLength || 0, key.length);
    for (let length = 1; length < key.length; length += 1) {
      const prefix = key.slice(0, length);
      index.prefixes.set(prefix, [...(index.prefixes.get(prefix) || []).filter((term) => term.key !== key), entry]);
    }
  }
  cache.set(personalWords, index);
  return index;
};

const bestMatch = (matches: IndexedTerm[], activityId?: string): IndexedTerm => matches.reduce((left, right) => {
  const score = (term: IndexedTerm) => term.count + term.recentCount + (activityId ? (term.activities.get(activityId) || 0) * 3 : 0);
  const rank = (activityId ? Number(left.activities.has(activityId)) - Number(right.activities.has(activityId)) : 0)
    || score(left) - score(right)
    || Number(right.phrase) - Number(left.phrase)
    || left.lastUsed - right.lastUsed
    || right.key.length - left.key.length
    || right.key.localeCompare(left.key);
  return rank >= 0 ? left : right;
});

export const getNoteCompletion = (
  index: NoteAutocompleteIndex,
  value: string,
  start: number,
  end: number = start,
  activityId?: string
): NoteCompletion | null => {
  if (start !== end || start <= 0 || start > value.length || /[\u4e00-\u9fffA-Za-z0-9]/.test(value[start] || '')) return null;
  // Inline ghost text needs free space on this line; never paint over existing punctuation or text.
  if (/\S/.test(value.slice(start).split(/[\r\n]/, 1)[0])) return null;
  const before = value.slice(0, start);
  if (before.lastIndexOf('[[') > before.lastIndexOf(']]') || before.lastIndexOf('［［') > before.lastIndexOf('］］')) return null;
  // Personal phrases can contain spaces/punctuation and take priority even without past records.
  for (let length = Math.min(before.length, index.maxPersonalLength || 0); length >= 1; length -= 1) {
    const prefix = before.slice(-length).toLowerCase();
    const previous = before[before.length - length - 1] || '';
    if (/^[a-z0-9]/.test(prefix) && /[A-Za-z0-9]/.test(previous)) continue;
    const matches = index.prefixes.get(prefix)?.filter((term) => term.personal);
    if (matches?.length) {
      const best = bestMatch(matches, activityId);
      return { text: best.text, suffix: best.text.slice(prefix.length) };
    }
    if (index.words.has(prefix)) return null;
  }
  const run = before.match(/[\u4e00-\u9fffA-Za-z0-9]+(?:[ \t][\u4e00-\u9fffA-Za-z0-9]+)?$/)?.[0].toLowerCase();
  if (!run) return null;
  // English prefixes must begin at a word boundary; Chinese can complete the last word of an unspaced sentence.
  for (let length = Math.min(run.length, 24); length >= 1; length -= 1) {
    const prefix = run.slice(-length);
    const previous = before[before.length - length - 1] || '';
    if (/^[a-z0-9]/.test(prefix) && /[A-Za-z0-9]/.test(previous)) continue;
    const matches = index.prefixes.get(prefix);
    if (matches?.length) {
      const best = bestMatch(matches, activityId);
      return { text: best.text, suffix: best.text.slice(prefix.length) };
    }
    // Do not reinterpret the last character of an already complete word as a new prefix.
    if (index.words.has(prefix)) return null;
  }
  return null;
};
