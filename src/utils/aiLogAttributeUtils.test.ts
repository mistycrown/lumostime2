/**
 * @file aiLogAttributeUtils.test.ts
 * @input Untrusted AI attribute payloads and activity definitions
 * @output Coverage for attribute shape, ownership, type, option, and condition validation
 * @pos Utility test
 * @updated 2026-10-06: Covers safe attribute extraction for AI-created logs.
 */
import { describe, expect, it } from 'vitest';
import type { Activity, ActivityAttributeDefinition } from '../types';
import { normalizeAILogAttributeValues, validateAILogAttributeValues } from './aiLogAttributeUtils';

const define = (id: string, type: ActivityAttributeDefinition['type'], extra: Partial<ActivityAttributeDefinition> = {}): ActivityAttributeDefinition => ({
  id, name: id, type, order: 0, createdAt: 1, updatedAt: 1, ...extra
});
const activity: Activity = {
  id: 'running', name: '跑步', icon: 'R', color: '#675e50',
  attributes: [
    define('note', 'text'),
    define('distance', 'number', { unit: 'km' }),
    define('place', 'single', { options: [{ id: 'park', label: '公园' }, { id: 'gym', label: '健身房', isArchived: true }] }),
    define('equipment', 'multi', { options: [{ id: 'watch', label: '手表' }, { id: 'phone', label: '手机' }, { id: 'old', label: '旧设备', isArchived: true }] }),
    define('old', 'text', { isArchived: true }),
    // The payload tests below put this child before its parent.
    define('route', 'text', { displayCondition: { attributeId: 'place', optionIds: ['park'] } })
  ]
};

describe('AI log attributes', () => {
  it('normalizes only valid shapes without coercing model output', () => {
    expect(normalizeAILogAttributeValues([
      null, 1, [], {}, { attributeId: 1, value: 'x' },
      { attributeId: 'distance', value: '5' },
      { attributeId: 'bad', value: NaN }, { attributeId: 'bad', value: Infinity },
      { attributeId: 'bad', value: true }, { attributeId: 'bad', value: ' ' },
      { attributeId: 'bad', value: 'x', optionId: 'park' },
      { attributeId: ' place ', optionId: ' park ' },
      { attributeId: 'equipment', optionIds: ['watch', 'watch', 2, '', ' phone '] },
      { attributeId: ' note ', value: ' 公园晨跑 ' }
    ])).toEqual([
      { attributeId: 'distance', value: '5' },
      { attributeId: 'place', optionId: 'park' },
      { attributeId: 'equipment', optionIds: ['watch', 'phone'] },
      { attributeId: 'note', value: '公园晨跑' }
    ]);
    expect(normalizeAILogAttributeValues({ value: 5 })).toEqual([]);
  });

  it('accepts all four types, including zero, and checks conditions after the parent', () => {
    expect(validateAILogAttributeValues([
      { attributeId: 'route', value: '湖边' },
      { attributeId: 'note', value: '晨跑' },
      { attributeId: 'distance', value: 0 },
      { attributeId: 'place', optionId: 'park' },
      { attributeId: 'equipment', optionIds: ['phone', 'watch'] }
    ], activity)).toEqual([
      { attributeId: 'route', value: '湖边' },
      { attributeId: 'note', value: '晨跑' },
      { attributeId: 'distance', value: 0 },
      { attributeId: 'place', optionId: 'park' },
      { attributeId: 'equipment', optionIds: ['phone', 'watch'] }
    ]);
  });

  it('rejects wrong types, unknown and archived definitions and options', () => {
    expect(validateAILogAttributeValues([
      { attributeId: 'other-activity', value: 5 },
      { attributeId: 'old', value: 'old' },
      { attributeId: 'distance', value: '5 km' },
      { attributeId: 'note', value: 5 },
      { attributeId: 'place', optionId: 'gym' },
      { attributeId: 'route', value: '湖边' },
      { attributeId: 'equipment', optionIds: ['old', 'unknown', 'phone', 'phone'] }
    ], activity)).toEqual([{ attributeId: 'equipment', optionIds: ['phone'] }]);
    expect(validateAILogAttributeValues([{ attributeId: 'note', value: 'x' }], undefined)).toEqual([]);
  });

  it('does not keep conditional values triggered by an invalid parent', () => {
    const conditionalActivity = { ...activity, attributes: activity.attributes!.map((attribute) => (
      attribute.id === 'place' ? { ...attribute, isArchived: true } : attribute
    )) };
    expect(validateAILogAttributeValues([
      { attributeId: 'place', optionId: 'park' }, { attributeId: 'route', value: '湖边' }
    ], conditionalActivity)).toEqual([]);
  });

  it('keeps the last valid value for each attribute and leaves absent attributes empty', () => {
    expect(validateAILogAttributeValues([
      { attributeId: 'distance', value: 3 }, { attributeId: 'distance', value: 5 },
      { attributeId: 'distance', value: 'wrong' }
    ], activity)).toEqual([{ attributeId: 'distance', value: 5 }]);
    expect(validateAILogAttributeValues(undefined, activity)).toEqual([]);
  });
});
