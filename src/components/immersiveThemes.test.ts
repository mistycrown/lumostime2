import { describe, expect, test } from 'vitest';
import { IMMERSIVE_THEMES } from './immersiveThemes';

describe('IMMERSIVE_THEMES', () => {
  test('includes the graphite theme for immersive timer', () => {
    const graphiteTheme = IMMERSIVE_THEMES.find((theme) => theme.id === 'graphite');

    expect(graphiteTheme).toBeDefined();
    expect(graphiteTheme).toMatchObject({
      id: 'graphite',
      name: '石墨',
      isDark: true,
      buttonText: '#f5f5f4',
    });
    expect(graphiteTheme?.gradient).toContain('from-zinc-900');
  });
});
