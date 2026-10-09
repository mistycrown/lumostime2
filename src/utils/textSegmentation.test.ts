/**
 * @file textSegmentation.test.ts
 * @input Text values and per-card phrase/stop-word rules.
 * @output Regression coverage for literal phrase counts, isolation, overlaps, and filtering.
 * @pos Test (Text Statistics)
 * @updated 2026-10-09: Verifies custom word rules without mutating the shared Segmentit dictionary.
 */
import { describe, expect, it } from 'vitest';
import { getRankedTextTerms, getTextTerms, normalizeWordCloudSettings } from './textSegmentation';

describe('per-cloud text rules', () => {
  it('counts the complete phrase only where it actually occurs', () => {
    const values = ['美食广场 美食广场', '美食和广场', '广场的美食'];
    const counts = new Map(getRankedTextTerms(values, { mergeWords: ['美食广场'], stopWords: [] }));
    expect(counts.get('美食广场')).toBe(2);
    expect(counts.get('美食')).toBe(2);
    expect(counts.get('广场')).toBe(2);
  });

  it('uses longest overlapping phrases without counting their constituent words', () => {
    expect(getTextTerms('美食广场美食广场', { mergeWords: ['美食', '美食广场', '广场'], stopWords: [] }))
      .toEqual(['美食广场', '美食广场']);
  });

  it('applies stop words after phrase protection and does not fall back to stopped words', () => {
    expect(getTextTerms('美食广场和咖啡', { mergeWords: ['美食广场'], stopWords: ['美食'] }))
      .toEqual(['美食广场', '咖啡']);
    expect(getTextTerms('美食广场', { mergeWords: ['美食广场'], stopWords: ['美食广场'] })).toEqual([]);
    expect(getTextTerms('咖啡 咖啡', { mergeWords: [], stopWords: ['咖啡'] })).toEqual([]);
  });

  it('never leaks custom words or stop words into another cloud', () => {
    const before = getTextTerms('美食广场 咖啡');
    getTextTerms('美食广场 咖啡', { mergeWords: ['美食广场'], stopWords: ['咖啡'] });
    expect(getTextTerms('美食广场 咖啡')).toEqual(before);
    expect(getTextTerms('美食广场 咖啡', { mergeWords: [], stopWords: [] })).toEqual(before);
  });

  it('supports spaced phrases, punctuation, case folding, and ASCII word boundaries', () => {
    expect(getTextTerms('New York，new\nyork', { mergeWords: [' New York '], stopWords: [] })).toEqual(['new york', 'new york']);
    expect(getTextTerms('C++ C++', { mergeWords: ['C++'], stopWords: [] })).toEqual(['c++', 'c++']);
    expect(getTextTerms('food court food courtroom', { mergeWords: ['food court'], stopWords: [] }))
      .toEqual(['food court', 'food', 'courtroom']);
    expect(getTextTerms('READING reading', { mergeWords: [], stopWords: ['Reading'] })).toEqual([]);
  });

  it('sanitizes malformed settings and empty/duplicate words', () => {
    expect(normalizeWordCloudSettings({ mergeWords: [' 美食广场 ', '', null, '美食广场', 'New  York'], stopWords: 'invalid' }))
      .toEqual({ mergeWords: ['美食广场', 'new york'], stopWords: [] });
    expect(normalizeWordCloudSettings(null)).toEqual({ mergeWords: [], stopWords: [] });
    expect(getTextTerms('', { mergeWords: ['美食广场'], stopWords: [] })).toEqual([]);
  });
});
