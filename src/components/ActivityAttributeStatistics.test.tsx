/**
 * @file ActivityAttributeStatistics.test.tsx
 * @input Text attribute values.
 * @output Regression coverage for text-term extraction used by attribute statistics.
 */
import { describe, expect, it } from 'vitest';
import { filterLogsForAttribute, getCardAttributeStatisticSlices, getTextTerms } from './ActivityAttributeStatistics';

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

describe('filterLogsForAttribute', () => {
  it('keeps only the requested attribute values from each log', () => {
    const logs = [
      {
        id: 'log-1',
        activityId: 'activity-1',
        categoryId: 'category-1',
        startTime: 1,
        endTime: 2,
        duration: 1,
        attributeValues: [
          { attributeId: 'weight', value: 68 },
          { attributeId: 'note-text', value: '训练' }
        ]
      },
      {
        id: 'log-2',
        activityId: 'activity-1',
        categoryId: 'category-1',
        startTime: 3,
        endTime: 4,
        duration: 1,
        attributeValues: [{ attributeId: 'note-text', value: '恢复' }]
      }
    ];

    expect(filterLogsForAttribute(logs, 'weight')).toEqual([
      {
        ...logs[0],
        attributeValues: [{ attributeId: 'weight', value: 68 }]
      }
    ]);
  });
});

describe('getCardAttributeStatisticSlices', () => {
  it('uses the parent choice before trimming logs to the conditional attribute', () => {
    const parent = {
      id: 'kind',
      name: 'Kind',
      type: 'single' as const,
      options: [{ id: 'run', label: 'Run' }],
      order: 0,
      createdAt: 1,
      updatedAt: 1
    };
    const child = {
      id: 'pace',
      name: 'Pace',
      type: 'number' as const,
      unit: 'min/km',
      displayCondition: { attributeId: 'kind', optionIds: ['run'] },
      order: 1,
      createdAt: 1,
      updatedAt: 1
    };
    const logs = [
      {
        id: 'run-log', activityId: 'activity-1', categoryId: 'category-1', startTime: 1, endTime: 2, duration: 1,
        attributeValues: [{ attributeId: 'kind', optionId: 'run' }, { attributeId: 'pace', value: 5 }]
      },
      {
        id: 'walk-log', activityId: 'activity-1', categoryId: 'category-1', startTime: 3, endTime: 4, duration: 1,
        attributeValues: [{ attributeId: 'kind', optionId: 'walk' }, { attributeId: 'pace', value: 8 }]
      }
    ];

    const slices = getCardAttributeStatisticSlices(child, [parent, child], logs);

    expect(slices).toHaveLength(1);
    expect(slices[0]?.contextLabel).toBe('Kind: Run');
    expect(slices[0]?.logs.map((log) => log.id)).toEqual(['run-log']);
    expect(slices[0]?.logs[0]?.attributeValues).toEqual([{ attributeId: 'pace', value: 5 }]);
  });
});
