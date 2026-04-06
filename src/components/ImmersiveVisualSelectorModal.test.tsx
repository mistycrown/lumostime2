import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImmersiveVisualSelectorModal } from './ImmersiveVisualSelectorModal';
import { IMMERSIVE_TIMER_MODAL_THEME } from './immersiveTimerConfig';
import { IMMERSIVE_ART_OPTIONS, IMMERSIVE_MOTION_OPTIONS } from '../utils/immersiveVisuals';

describe('ImmersiveVisualSelectorModal', () => {
  test('renders one clock-style modal with source, format, art, and motion sections', () => {
    const markup = renderToStaticMarkup(
      <ImmersiveVisualSelectorModal
        isOpen
        onClose={vi.fn()}
        selectedDisplaySource="elapsed"
        selectedDisplayFormat="hoursMinutesSeconds"
        selectedArtId="starry-night"
        selectedMotionStyle="sweep"
        onSelectDisplaySource={vi.fn()}
        onSelectDisplayFormat={vi.fn()}
        onSelectArt={vi.fn()}
        onSelectMotionStyle={vi.fn()}
        artOptions={IMMERSIVE_ART_OPTIONS}
        motionOptions={IMMERSIVE_MOTION_OPTIONS}
        theme={IMMERSIVE_TIMER_MODAL_THEME}
      />
    );

    expect(markup).toContain('时钟样式');
    expect(markup).toContain('选择显示来源');
    expect(markup).toContain('选择显示格式');
    expect(markup).toContain('选择画作');
    expect(markup).toContain('选择运动样式');
    expect(markup).not.toContain('选择字体');
    expect(markup).not.toContain('Anton');
    expect(markup).not.toContain('Road Rage');
    expect(markup).not.toContain('在同一个弹窗里调整显示方式、画作和运动样式');
    expect(markup).toContain('计时');
    expect(markup).toContain('时钟');
    expect(markup).toContain('时分秒');
    expect(markup).not.toContain(IMMERSIVE_ART_OPTIONS[0].name);
    expect(markup).not.toContain(IMMERSIVE_ART_OPTIONS[4].name);
    expect(markup).toContain(IMMERSIVE_MOTION_OPTIONS[0].name);
    expect(markup).toContain(IMMERSIVE_MOTION_OPTIONS[1].name);
    expect(markup).not.toContain(IMMERSIVE_MOTION_OPTIONS[0].description);
    expect(markup).not.toContain(IMMERSIVE_MOTION_OPTIONS[1].description);
  });
});
