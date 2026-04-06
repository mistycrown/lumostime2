import React from 'react';
import { describe, expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImmersiveMaskedDigits } from './ImmersiveMaskedDigits';

describe('ImmersiveMaskedDigits', () => {
  test('renders static digits with a separate animated art layer in portrait mode', () => {
    const markup = renderToStaticMarkup(
      <ImmersiveMaskedDigits
        orientation="portrait"
        displayParts={[
          { kind: 'value', value: '08', label: '小时' },
          { kind: 'separator', value: ':' },
          { kind: 'value', value: '46', label: '分钟' },
          { kind: 'separator', value: ':' },
          { kind: 'value', value: '35', label: '秒' },
        ]}
        digitSlotWidth="2.45ch"
        artSrc="/timer_bak/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg.webp"
        motionStyle="orbit"
      />
    );

    expect(markup).toContain('data-motion-style="orbit"');
    expect(markup).toContain('data-art-layer="true"');
    expect(markup).toContain('小时');
    expect(markup).toContain('分钟');
    expect(markup).toContain('秒');
  });

  test('renders a single masked landscape art layer', () => {
    const markup = renderToStaticMarkup(
      <ImmersiveMaskedDigits
        orientation="landscape"
        displayParts={[
          { kind: 'value', value: '08', label: '小时' },
          { kind: 'separator', value: ':' },
          { kind: 'value', value: '46', label: '分钟' },
          { kind: 'separator', value: ':' },
          { kind: 'value', value: '35', label: '秒' },
        ]}
        digitSlotWidth="2.45ch"
        artSrc="/timer_bak/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg.webp"
        motionStyle="sweep"
      />
    );

    expect(markup).toContain('immersive-mask--landscape');
    expect(markup).toContain('data-motion-style="sweep"');
    expect(markup).toContain('width:7.75ch');
  });
});
