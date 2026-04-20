/**
 * @file useBackgroundDisplay.ts
 * @input BackgroundService snapshot events and viewport capability signals
 * @output A stable background URL plus lightweight surface settings for mobile-friendly rendering
 * @pos Hook (UI Customization)
 * @description Keeps custom backgrounds event-driven, waits for the next image to preload before swapping, and downgrades heavy blur on lower-end mobile devices.
 * @updated 2026-04-20: Added shared background display state for Scene, Record, and Todo views.
 */

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { backgroundService, type BackgroundSnapshot } from '../services/backgroundService';

interface BackgroundDisplayState {
  backgroundUrl: string;
  backgroundOpacity: number;
  panelOverlayOpacity: number;
  hasBackground: boolean;
  useReducedEffects: boolean;
}

const shouldUseReducedEffects = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4;
  const lowCpu = typeof navigator.hardwareConcurrency === 'number'
    && navigator.hardwareConcurrency > 0
    && navigator.hardwareConcurrency <= 6;

  return coarsePointer && (Capacitor.isNativePlatform() || lowMemory || lowCpu);
};

export const useBackgroundDisplay = (): BackgroundDisplayState => {
  const [snapshot, setSnapshot] = useState<BackgroundSnapshot>(() => backgroundService.getBackgroundSnapshot());
  const [backgroundUrl, setBackgroundUrl] = useState<string>(() => snapshot.background?.url || '');
  const [useReducedEffects, setUseReducedEffects] = useState<boolean>(() => shouldUseReducedEffects());

  useEffect(() => backgroundService.subscribe(setSnapshot), []);

  useEffect(() => {
    const nextUrl = snapshot.background?.url || '';

    if (!nextUrl) {
      setBackgroundUrl('');
      return;
    }

    if (!backgroundService.isImageBackground(nextUrl)) {
      setBackgroundUrl(nextUrl);
      return;
    }

    let cancelled = false;
    void backgroundService.preloadBackground(nextUrl)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setBackgroundUrl(nextUrl);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [snapshot.background?.url]);

  useEffect(() => {
    const handleResize = () => {
      setUseReducedEffects(shouldUseReducedEffects());
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const backgroundOpacity = snapshot.opacity;
  const panelOverlayOpacity = useReducedEffects
    ? Math.min(0.98, 1 - backgroundOpacity + 0.08)
    : 1 - backgroundOpacity;

  return {
    backgroundUrl,
    backgroundOpacity,
    panelOverlayOpacity,
    hasBackground: backgroundUrl !== '',
    useReducedEffects
  };
};
