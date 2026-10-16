/**
 * @file useBufferedRecord.ts
 * @updated 2026-10-16: Supports delayed autosave so review drafts need not wait for teardown to commit.
 * @input Persisted record, save callback, local record edits, optional autosave delay
 * @output Local draft, explicit commit/discard controls, lifecycle saving and optional autosave
 * @pos Hook (Editing)
 * @description Buffers edits until commit or an optional autosave delay and merges edited fields into the latest record.
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export const useBufferedRecord = <T extends { id: string }>(record: T, onSave: (record: T) => void, saveDelayMs?: number) => {
  const [patch, setPatch] = useState<Partial<T>>({});
  const patchRef = useRef<Partial<T>>({});
  const latest = useRef({ record, onSave });
  const mounted = useRef(false);
  const discarded = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const value = useMemo(() => ({ ...record, ...patch }), [record, patch]);

  useLayoutEffect(() => {
    latest.current = { record, onSave };
  });

  const commit = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    if (discarded.current || Object.keys(patchRef.current).length === 0) return;
    const pending = patchRef.current;
    const next = { ...latest.current.record, ...pending };
    latest.current.onSave(next);
    latest.current.record = next;
    patchRef.current = {};
    if (mounted.current) setPatch({});
  }, []);

  const discard = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    discarded.current = true;
    patchRef.current = {};
    setPatch({});
  }, []);

  // Compare against this render's value, so async actions cannot replay unrelated stale fields.
  const update = useCallback((next: T) => {
    if (discarded.current) return;
    const changes: Partial<T> = {};
    for (const key of Object.keys(next) as (keyof T)[]) {
      if (!Object.is(next[key], value[key])) changes[key] = next[key];
    }
    if (Object.keys(changes).length === 0) return;
    patchRef.current = { ...patchRef.current, ...changes };
    // AI generation can finish after navigation; save its result without losing the exited draft.
    if (mounted.current) {
      setPatch(patchRef.current);
      if (saveDelayMs !== undefined) {
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(commit, saveDelayMs);
      }
    } else commit();
  }, [value, commit, saveDelayMs]);

  useLayoutEffect(() => {
    mounted.current = true;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') commit();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', commit);
    const nativeListener = Capacitor.isNativePlatform()
      ? App.addListener('appStateChange', ({ isActive }) => { if (!isActive) commit(); })
      : undefined;
    void nativeListener?.catch((error) => console.warn('[BufferedRecord] Background listener failed:', error));
    return () => {
      mounted.current = false;
      commit();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', commit);
      void nativeListener?.then((listener) => listener.remove()).catch((error) => {
        console.warn('[BufferedRecord] Background listener cleanup failed:', error);
      });
    };
  }, [commit]);

  return { value, update, commit, discard };
};
