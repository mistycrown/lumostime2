import { describe, expect, it } from 'vitest';
import { getScheduleStyle } from './chartUtils';
import { getStrokeColor } from './lineChartUtils';
import { getSceneCardColorPresentation } from './colorAdapterUtils';

describe('stats custom color adapters', () => {
  it('uses custom hex directly for line chart strokes', () => {
    expect(getStrokeColor('#AABBCC')).toBe('#aabbcc');
    expect(getStrokeColor('bg-blue-100 text-blue-600')).toBe('#93c5fd');
  });

  it('builds inline styles for custom schedule colors', () => {
    const style = getScheduleStyle('#AABBCC');

    expect(style.className).toBe('');
    expect(style.style).toEqual({
      backgroundColor: 'rgba(170, 187, 204, 0.16)',
      color: '#aabbcc',
      borderColor: 'rgba(170, 187, 204, 0.3)',
    });
  });

  it('builds scene card colors from custom hex and tailwind tokens', () => {
    expect(getSceneCardColorPresentation('#AABBCCDD')).toEqual({
      accentColor: '#aabbccdd',
      frontBorderColor: 'rgba(170, 187, 204, 0.3)',
      backBorderColor: 'rgba(170, 187, 204, 0.5)',
      swipeBackgroundColor: '#aabbccdd',
    });

    expect(getSceneCardColorPresentation('bg-blue-100 text-blue-600')).toEqual({
      accentColor: '#3b82f6',
      frontBorderColor: 'rgba(59, 130, 246, 0.3)',
      backBorderColor: 'rgba(59, 130, 246, 0.5)',
      swipeBackgroundColor: '#3b82f6',
    });
  });
});
