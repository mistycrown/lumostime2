import React from 'react';
import { describe, expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImmersiveMaskedDigits } from './ImmersiveMaskedDigits';

describe('ImmersiveMaskedDigits', () => {
  test('renders static digits with a separate animated art layer in portrait mode without labels', () => {
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
    expect(markup).toContain('font-family="&quot;Lahlit Font&quot;');
    expect(markup).toContain('font-variant-numeric:lining-nums tabular-nums');
    expect(markup).toContain('font-feature-settings:&quot;tnum&quot; 1');
    expect(markup).toContain('>08<');
    expect(markup).toContain('>46<');
    expect(markup).toContain('>35<');
    expect(markup).not.toContain('小时');
    expect(markup).not.toContain('分钟');
    expect(markup).not.toContain('秒');
    expect(markup).toContain('gap: 0.18rem;');
    expect(markup).toContain('height: 1.02em;');
  });

  test('renders a single masked landscape art layer with tighter separator spacing', () => {
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
    expect(markup).toContain('>08<');
    expect(markup).toContain('>46<');
    expect(markup).toContain('>35<');
    expect(markup).toContain('font-variant-numeric:lining-nums tabular-nums');
    expect(markup).toContain('width:5.73ch');
  });

  test('renders a two-segment portrait stack with the same tighter spacing treatment', () => {
    const markup = renderToStaticMarkup(
      <ImmersiveMaskedDigits
        orientation="portrait"
        displayParts={[
          { kind: 'value', value: '00', label: '分钟' },
          { kind: 'separator', value: ':' },
          { kind: 'value', value: '40', label: '秒' },
        ]}
        digitSlotWidth="2.45ch"
        artSrc="/timer_bak/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg.webp"
        motionStyle="sweep"
      />
    );

    expect(markup).toContain('>00<');
    expect(markup).toContain('>40<');
    expect(markup).toContain('gap: 0.18rem;');
    expect(markup).toContain('height: 1.02em;');
  });
});
