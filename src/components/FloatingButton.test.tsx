import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { getSettings, getImageUrl } = vi.hoisted(() => ({
  getSettings: vi.fn(),
  getImageUrl: vi.fn()
}));

vi.mock('../services/floatingButtonBackgroundService', () => ({
  FLOATING_BUTTON_BACKGROUND_CHANGED_EVENT: 'lumostime:floating-button-background-changed',
  floatingButtonBackgroundService: {
    getSettings
  }
}));

vi.mock('../services/imageService', () => ({
  imageService: {
    getImageUrl
  }
}));

import { FloatingButton, createFloatingButtonBackgroundImageStyle } from './FloatingButton';

describe('FloatingButton', () => {
  beforeEach(() => {
    getSettings.mockReset();
    getImageUrl.mockReset();
    getImageUrl.mockResolvedValue('/images/floating-button.webp');
  });

  test('keeps the default theme styling when no custom background is selected', () => {
    getSettings.mockReturnValue({ imageFilename: null, scale: 100 });

    const markup = renderToStaticMarkup(
      <FloatingButton onClick={() => undefined}>+</FloatingButton>
    );

    expect(markup).toContain('floating-button');
    expect(markup).not.toContain('background-color:transparent');
  });

  test('removes default chrome and keeps an unclipped visual layer for custom backgrounds', () => {
    getSettings.mockReturnValue({ imageFilename: 'floating-button.webp', scale: 150 });

    const markup = renderToStaticMarkup(
      <FloatingButton onClick={() => undefined}>+</FloatingButton>
    );

    expect(markup).not.toMatch(/class="[^"]*\bfloating-button\b/);
    expect(markup).toContain('background-color:transparent;border:none;box-shadow:none');
    expect(markup).toContain('data-floating-button-image-layer="true"');
    expect(markup).toContain('pointer-events-none absolute inset-0 overflow-visible');
    expect(markup).toContain('relative z-10');
  });

  test('scales the image from its center without a max-width constraint', () => {
    expect(createFloatingButtonBackgroundImageStyle(150)).toEqual({
      width: '150%',
      height: 'auto',
      maxWidth: 'none',
      transform: 'translate(-50%, -50%)',
      borderRadius: '50%'
    });
  });
});
