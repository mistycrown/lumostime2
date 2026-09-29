/**
 * @file useCustomAppearanceEnabled.ts
 * @input Root custom-appearance state maintained by the display-mode utility
 * @output Whether user-configured backgrounds and transparent surfaces may render
 * @pos Hook (UI Customization)
 * @description Keeps persisted appearance preferences intact while dark mode temporarily falls back to default surfaces.
 * @updated 2026-09-29: Added runtime subscription for dark-mode appearance fallback.
 */

import { useEffect, useState } from 'react';
import { CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE } from '../utils/displayMode';

const readCustomAppearanceEnabled = (): boolean => {
  if (typeof document === 'undefined') {
    return true;
  }

  return document.documentElement.getAttribute(CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE) !== 'false';
};

export const useCustomAppearanceEnabled = (): boolean => {
  const [enabled, setEnabled] = useState(readCustomAppearanceEnabled);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setEnabled(readCustomAppearanceEnabled());
    update();

    const observer = new MutationObserver(update);
    observer.observe(root, {
      attributes: true,
      attributeFilter: [CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE]
    });

    return () => observer.disconnect();
  }, []);

  return enabled;
};
