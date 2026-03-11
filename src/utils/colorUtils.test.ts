import { describe, expect, it } from 'vitest';
import {
  extractActivityColor,
  extractCategoryColor,
  getColorPreviewValue,
  isStoredColorSelected,
  normalizeHexColor,
} from './colorUtils';

describe('colorUtils custom color support', () => {
  it('normalizes 8-digit hex values', () => {
    expect(normalizeHexColor('#AABBCCDD')).toBe('#aabbccdd');
    expect(normalizeHexColor('abc')).toBe('#aabbcc');
  });

  it('treats normalized stored hex values as the same selection', () => {
    expect(isStoredColorSelected('#AABBCC', '#aabbcc')).toBe(true);
    expect(isStoredColorSelected('bg-blue-100 text-blue-600 ', 'bg-blue-100 text-blue-600')).toBe(true);
  });

  it('returns exact hex previews for custom colors and mapped previews for built-in colors', () => {
    expect(getColorPreviewValue('#AABBCCDD', 'activity')).toBe('#aabbccdd');
    expect(extractActivityColor('#AABBCC')).toBe('#aabbcc');
    expect(extractCategoryColor('#AABBCCDD')).toBe('#aabbccdd');
    expect(getColorPreviewValue('text-blue-600', 'category')).toBe('#bfdbfe');
  });
});
