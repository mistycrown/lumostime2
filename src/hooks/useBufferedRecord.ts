/**
 * @file useBufferedRecord.ts
 * @input Persisted record, save callback, local record edits
 * @output Local draft, explicit commit/discard controls, lifecycle saving
 * @pos Hook (Editing)
 * @description Buffers edits until exit or backgrounding and merges only edited fields into the latest record.
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export const useBufferedRecord = <T extends { id: string }>(record: T, onSave: (record: T) => void) => {
  const [patch, setPatch] = useState<Partial<T>>({});
  const patchRef = useRef<Partial<T>>({});
  const latest = useRef({ record, onSave });
  const mounted = useRef(false);
  const discarded = useRef(false);
  const value = useMemo(() => ({ ...record, ...patch }), [record, patch]);

  useLayoutEffect(() => {
    latest.current = { record, onSave };
  });

  const commit = useCallback(() => {
    if (discarded.current || Object.keys(patchRef.current).length === 0) return;
    const pending = patchRef.current;
    const next = { ...latest.current.record, ...pending };
    latest.current.onSave(next);
    latest.current.record = next;
    patchRef.current = {};
    if (mounted.current) setPatch({});
  }, []);

  const discard = useCallback(() => {
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
    if (mounted.current) setPatch(patchRef.current);
    else commit();
  }, [value, commit]);

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
