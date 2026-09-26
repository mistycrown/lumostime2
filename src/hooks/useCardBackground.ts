/**
 * @file useCardBackground.ts
 * @input Card order index and card-background settings
 * @output Resolved background image style for a card
 * @pos Hook (UI Customization)
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

interface CardBackgroundState {
  style: CSSProperties;
  active: boolean;
  imageUrl?: string;
  alignment?: CardBackgroundAlignment;
}

export const useCardBackground = (index: number, enabled = true): CardBackgroundState => {
  const [background, setBackground] = useState<CardBackgroundState>({ style: {}, active: false });

  useEffect(() => {
    let active = true;
    let currentUrl = '';

    const load = async () => {
      if (!enabled) {
        if (currentUrl.startsWith('blob:')) URL.revokeObjectURL(currentUrl);
        currentUrl = '';
        setBackground({ style: {}, active: false });
        return;
      }
      const selected = cardBackgroundService.getBackgroundAt(index);
      const opacity = cardBackgroundService.getOpacity();
      if (!selected) {
        if (currentUrl.startsWith('blob:')) URL.revokeObjectURL(currentUrl);
        currentUrl = '';
        setBackground({ style: {}, active: false });
        return;
      }

      const url = await imageService.getImageUrl(selected.filename);
      if (!active) {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
        return;
      }
      if (currentUrl.startsWith('blob:')) URL.revokeObjectURL(currentUrl);
      currentUrl = url;
      setBackground({
        style: url ? getCardBackgroundStyle(url, selected.alignment as CardBackgroundAlignment, opacity) : {},
        active: Boolean(url),
        imageUrl: url,
        alignment: selected.alignment
      });
    };

    const updateOpacity = () => {
      const opacity = cardBackgroundService.getOpacity();
      setBackground((previous) => previous.imageUrl && previous.alignment
        ? { ...previous, style: getCardBackgroundStyle(previous.imageUrl, previous.alignment, opacity) }
        : previous);
    };

    void load().catch((error) => console.error('[useCardBackground] Failed to load card background', error));
    window.addEventListener(CARD_BACKGROUND_CHANGED_EVENT, load);
    window.addEventListener(CARD_BACKGROUND_OPACITY_EVENT, updateOpacity);
    window.addEventListener(APPEARANCE_RESTORED_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(CARD_BACKGROUND_CHANGED_EVENT, load);
      window.removeEventListener(CARD_BACKGROUND_OPACITY_EVENT, updateOpacity);
      window.removeEventListener(APPEARANCE_RESTORED_EVENT, load);
      if (currentUrl.startsWith('blob:')) URL.revokeObjectURL(currentUrl);
    };
  }, [index, enabled]);

  return background;
};
