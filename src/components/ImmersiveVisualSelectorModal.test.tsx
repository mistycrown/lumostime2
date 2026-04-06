import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImmersiveVisualSelectorModal } from './ImmersiveVisualSelectorModal';
import { IMMERSIVE_TIMER_MODAL_THEME } from './immersiveTimerConfig';
import { IMMERSIVE_ART_OPTIONS, IMMERSIVE_MOTION_OPTIONS } from '../utils/immersiveVisuals';

describe('ImmersiveVisualSelectorModal', () => {
  test('renders art and motion sections in the same immersive modal', () => {
    const markup = renderToStaticMarkup(
      <ImmersiveVisualSelectorModal
        isOpen
        onClose={vi.fn()}
        selectedArtId="starry-night"
        selectedMotionStyle="sweep"
        onSelectArt={vi.fn()}
        onSelectMotionStyle={vi.fn()}
        artOptions={IMMERSIVE_ART_OPTIONS}
        motionOptions={IMMERSIVE_MOTION_OPTIONS}
        theme={IMMERSIVE_TIMER_MODAL_THEME}
      />
    );

    expect(markup).toContain('选择画作');
    expect(markup).toContain('选择运动样式');
    expect(markup).toContain('星夜');
    expect(markup).toContain('扫掠');
  });
});
