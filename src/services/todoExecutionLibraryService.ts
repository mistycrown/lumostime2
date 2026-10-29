/**
 * @file todoExecutionLibraryService.ts
 * @input Execution library edits, existing task tags and preference restore events
 * @output Persistent, reactive execution label library included in backup/sync
 * @pos Service (Todo execution context)
 * @updated 2026-10-29: Adds reusable label/category storage and legacy tag discovery.
 */
import { SETTINGS_KEYS, storage } from '../constants/storageKeys';
import { DEFAULT_EXECUTION_LIBRARY, normalizeExecutionLibrary, type TodoExecutionLibrary } from '../utils/todoExecutionLibrary';
import { markLocalDataEdited } from '../utils/localDataTimestamp';
import { PREFERENCES_CHANGED_EVENT, PREFERENCES_RESTORED_EVENT } from './preferencesBackupService';

let cachedRaw: string | null | undefined;
let snapshot = DEFAULT_EXECUTION_LIBRARY;

export const todoExecutionLibraryService = {
  getSnapshot(): TodoExecutionLibrary {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(SETTINGS_KEYS.TODO_EXECUTION_LIBRARY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      try { snapshot = raw ? normalizeExecutionLibrary(JSON.parse(raw)) : DEFAULT_EXECUTION_LIBRARY; }
      catch { snapshot = DEFAULT_EXECUTION_LIBRARY; }
    }
    return snapshot;
  },
  save(library: TodoExecutionLibrary): void {
    const serialized = JSON.stringify(normalizeExecutionLibrary(library));
    if (serialized === localStorage.getItem(SETTINGS_KEYS.TODO_EXECUTION_LIBRARY)) return;
    if (!storage.set(SETTINGS_KEYS.TODO_EXECUTION_LIBRARY, serialized)) throw new Error('执行标签保存失败，请重试');
    markLocalDataEdited();
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PREFERENCES_CHANGED_EVENT));
  },
  subscribe(onChange: () => void): () => void {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === SETTINGS_KEYS.TODO_EXECUTION_LIBRARY) onChange();
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
  getServerSnapshot: () => DEFAULT_EXECUTION_LIBRARY
};
