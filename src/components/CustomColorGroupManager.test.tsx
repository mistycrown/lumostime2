/**
 * @file CustomColorGroupManager.test.tsx
 * @input CustomColorGroupManager module exports
 * @output Regression coverage for the draft custom-color preview swatch
 * @pos Test
 * @description Ensures the custom-color draft preview uses a solid background once the input resolves to a valid HEX color.
 */

import { describe, expect, it } from 'vitest';

describe('CustomColorGroupManager draft preview', () => {
  it('uses a solid background for valid draft colors so the preview updates live', async () => {
    const module = await import('./CustomColorGroupManager');
    const getDraftPreviewStyle = (module as {
      getDraftPreviewStyle?: (normalizedDraft: string | null) => Record<string, string> | undefined;
    }).getDraftPreviewStyle;

    expect(typeof getDraftPreviewStyle).toBe('function');
    expect(getDraftPreviewStyle?.('#66CCFF')).toEqual({ background: '#66CCFF' });
  });

  it('keeps the checkerboard placeholder when the draft color is invalid', async () => {
    const module = await import('./CustomColorGroupManager');
    const getDraftPreviewStyle = (module as {
      getDraftPreviewStyle?: (normalizedDraft: string | null) => Record<string, string> | undefined;
    }).getDraftPreviewStyle;

    expect(getDraftPreviewStyle?.(null)).toBeUndefined();
  });
});
