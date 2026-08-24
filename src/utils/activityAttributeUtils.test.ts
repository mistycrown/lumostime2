/**
 * @file activityAttributeUtils.test.ts
 * @input Activity definitions and custom attribute values.
 * @output Unit coverage for sorting, lookups, and tag-switch cleanup.
 * @pos Utility test
 * @description Verifies ID-based custom values never follow a record onto another Activity.
 * @updated 2026-08-24: Created for Activity custom attributes.
 */
import { describe, expect, it } from 'vitest';
import { Activity } from '../types';
import {
  filterAttributeValuesForActivity,
  getActivityAttributeValue,
  getSortedActivityAttributes
} from './activityAttributeUtils';

const activity: Activity = {
  id: 'reading',
  name: '阅读',
  icon: '📚',
  color: 'bg-blue-100',
  attributes: [
    { id: 'format', name: '形式', type: 'single', order: 2, createdAt: 1, updatedAt: 1 },
    { id: 'pages', name: '页数', type: 'number', order: 0, createdAt: 1, updatedAt: 1 },
    { id: 'archived', name: '旧字段', type: 'text', order: 1, isArchived: true, createdAt: 1, updatedAt: 1 }
  ]
};

describe('activityAttributeUtils', () => {
  it('sorts definitions by their persisted order', () => {
    expect(getSortedActivityAttributes(activity).map((attribute) => attribute.id)).toEqual(['pages', 'archived', 'format']);
  });

  it('finds a value by attribute ID', () => {
    const values = [{ attributeId: 'pages', value: 24 }];
    expect(getActivityAttributeValue(values, 'pages')).toEqual({ attributeId: 'pages', value: 24 });
    expect(getActivityAttributeValue(values, 'format')).toBeUndefined();
  });

  it('keeps only active attributes when a record switches Activities', () => {
    const values = [
      { attributeId: 'pages', value: 24 },
      { attributeId: 'archived', value: '旧值' },
      { attributeId: 'other-activity', value: '不应保留' }
    ];

    expect(filterAttributeValuesForActivity(values, activity)).toEqual([{ attributeId: 'pages', value: 24 }]);
  });
});
