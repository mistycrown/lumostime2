/**
 * @file useCardBackground.ts
 * @input Card order index and card-background settings
 * @output Resolved background image style for a card
 * @pos Hook (UI Customization)
 * @updated 2026-09-29: Falls back to plain cards while effective dark mode is active.
 * @updated 2026-10-05: Rejects stale loads, preloads images, uses remaining group images on failure, and reads opacity after loading.
 */
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  CARD_BACKGROUND_CHANGED_EVENT,
  CARD_BACKGROUND_OPACITY_EVENT,
  cardBackgroundService,
  getCardBackgroundStyle,
  type CardBackgroundAlignment
} from '../services/cardBackgroundService';
import { imageService } from '../services/imageService';
import { APPEARANCE_RESTORED_EVENT } from '../services/appearanceBackupService';
import { useCustomAppearanceEnabled } from './useCustomAppearanceEnabled';

interface CardBackgroundState {
  style: CSSProperties;
  active: boolean;
  imageUrl?: string;
  alignment?: CardBackgroundAlignment;
}

const preloadImage = (url: string): Promise<boolean> => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => resolve(true);
  image.onerror = () => resolve(false);
  image.src = url;
});

export const useCardBackground = (index: number, enabled = true): CardBackgroundState => {
  const customAppearanceEnabled = useCustomAppearanceEnabled();
  const [background, setBackground] = useState<CardBackgroundState>({ style: {}, active: false });

  useEffect(() => {
    let active = true;
    let currentUrl = '';
    let requestId = 0;

    const releaseUrl = (url: string) => {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    };

    const clearBackground = () => {
      releaseUrl(currentUrl);
      currentUrl = '';
      setBackground({ style: {}, active: false });
    };

    const load = async () => {
      const request = ++requestId;
      if (!enabled || !customAppearanceEnabled) {
        clearBackground();
        return;
      }
      const candidates = cardBackgroundService.getBackgroundCandidates(index);
      for (const selected of candidates) {
        let url = '';
        try {
          url = await imageService.getImageUrl(selected.filename);
          if (!active || request !== requestId) {
            releaseUrl(url);
            return;
          }
          if (url && await preloadImage(url)) {
            if (!active || request !== requestId) {
              releaseUrl(url);
              return;
            }
            if (currentUrl !== url) releaseUrl(currentUrl);
            currentUrl = url;
            setBackground({
              style: getCardBackgroundStyle(url, selected.alignment, cardBackgroundService.getOpacity()),
              active: true,
              imageUrl: url,
              alignment: selected.alignment
            });
            return;
          }
        } catch (error) {
          console.warn('[useCardBackground] Failed to load card background', selected.filename, error);
        }
        releaseUrl(url);
        if (!active || request !== requestId) return;
      }
      if (active && request === requestId) clearBackground();
    };

    const updateOpacity = () => {
      const opacity = cardBackgroundService.getOpacity();
      setBackground((previous) => previous.imageUrl && previous.alignment
        ? { ...previous, style: getCardBackgroundStyle(previous.imageUrl, previous.alignment, opacity) }
        : previous);
    };

    const reload = () => {
      void load().catch((error) => console.error('[useCardBackground] Failed to refresh card backgrounds', error));
    };
    reload();
    window.addEventListener(CARD_BACKGROUND_CHANGED_EVENT, reload);
    window.addEventListener(CARD_BACKGROUND_OPACITY_EVENT, updateOpacity);
    window.addEventListener(APPEARANCE_RESTORED_EVENT, reload);
    return () => {
      active = false;
      window.removeEventListener(CARD_BACKGROUND_CHANGED_EVENT, reload);
      window.removeEventListener(CARD_BACKGROUND_OPACITY_EVENT, updateOpacity);
      window.removeEventListener(APPEARANCE_RESTORED_EVENT, reload);
      releaseUrl(currentUrl);
    };
  }, [index, enabled, customAppearanceEnabled]);

  return background;
};
