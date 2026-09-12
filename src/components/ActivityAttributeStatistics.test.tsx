/**
 * @file ActivityAttributeStatistics.test.tsx
 * @input Text attribute values.
 * @output Regression coverage for text-term extraction used by attribute statistics.
 */
import { describe, expect, it } from 'vitest';
import { getTextTerms } from './ActivityAttributeStatistics';

describe('getTextTerms', () => {
  it('preserves explicit whitespace boundaries across browser runtimes', () => {
    expect(getTextTerms('测试 一下')).toEqual(['测试', '一下']);
  });

  it('segments unspaced Chinese text with the bundled dictionary', () => {
    expect(getTextTerms('我今天学习编程')).toEqual(['今天', '学习', '编程']);
  });

  it('keeps segmented Chinese words and meaningful single-character values', () => {
    expect(getTextTerms('阅读 好')).toEqual(['阅读', '好']);
  });

  it('filters punctuation, whitespace, and configured stopwords', () => {
    expect(getTextTerms('的，\n和')).toEqual([]);
  });

  it('handles short English values', () => {
    expect(getTextTerms('A')).toEqual(['a']);
  });
});
