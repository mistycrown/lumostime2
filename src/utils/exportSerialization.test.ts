/**
 * @file exportSerialization.test.ts
 * @input Activity attributes and persisted values.
 * @output Regression coverage for readable and raw export representations.
 * @pos Utility test
 */

import { describe, expect, it } from 'vitest';
import type { Activity } from '../types';
import { serializeAttributeValues, serializeJsonCell } from './exportSerialization';

const activity: Activity = {
  id: 'reading',
  name: '阅读',
  icon: '📖',
  color: 'bg-stone-100',
  attributes: [
    { id: 'format', name: '形式', type: 'single', order: 0, options: [{ id: 'book', label: '书籍' }], createdAt: 1, updatedAt: 1 },
    { id: 'topics', name: '主题', type: 'multi', order: 1, options: [{ id: 'focus', label: '专注' }], createdAt: 1, updatedAt: 1 },
    { id: 'pages', name: '页数', type: 'number', order: 2, createdAt: 1, updatedAt: 1 },
    { id: 'remark', name: '备注属性', type: 'text', order: 3, createdAt: 1, updatedAt: 1 }
  ]
};

describe('exportSerialization', () => {
  it('resolves every attribute value shape while preserving raw values', () => {
    const values = serializeAttributeValues([
      { attributeId: 'format', optionId: 'book' },
      { attributeId: 'topics', optionIds: ['focus'] },
      { attributeId: 'pages', value: 24 },
      { attributeId: 'remark', value: '晚间阅读' }
    ], activity);

    expect(values.map((value) => [value.attributeName, value.value])).toEqual([
      ['形式', '书籍'],
      ['主题', '专注'],
      ['页数', '24'],
      ['备注属性', '晚间阅读']
    ]);
    expect(values[0].rawValue).toEqual({ attributeId: 'format', optionId: 'book' });
  });

  it('serializes structured cells without losing nested data', () => {
    expect(serializeJsonCell({ optionIds: ['a', 'b'] })).toBe('{"optionIds":["a","b"]}');
    expect(serializeJsonCell(undefined)).toBe('');
  });
});
