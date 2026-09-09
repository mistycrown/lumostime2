/**
 * @file activityAttributeUtils.test.ts
 * @input Activity definitions and custom attribute values.
 * @output Unit coverage for sorting, lookups, tag-switch cleanup, and recent option ordering.
 * @pos Utility test
 * @description Verifies ID-based custom values never follow a record onto another Activity.
 * @updated 2026-09-09: Verifies multi-choice note matching keeps every matching option while single-choice matching prefers the longest label.
 * @updated 2026-09-03: Added coverage for note-matched choice attribute values.
 * @updated 2026-08-28: Added coverage for recent choice-option ordering.
 * @updated 2026-08-24: Created for Activity custom attributes.
 */
import { describe, expect, it } from 'vitest';
import { Activity } from '../types';
import {
  clearInapplicableActivityAttributeValues,
  filterAttributeValuesForActivity,
  getActivityAttributeValue,
  getNoteMatchedActivityAttributeValues,
  getSortedActivityAttributeOptions,
  getSortedActivityAttributes,
  getVisibleActivityAttributes,
  isActivityAttributeConditionMet
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

  it('orders choice options by most recent record use and keeps unused options stable at the end', () => {
    const options = [
      { id: 'book', label: 'Book' },
      { id: 'article', label: 'Article' },
      { id: 'paper', label: 'Paper' },
      { id: 'unused', label: 'Unused' }
    ];
    const logs = [
      { id: 'early', categoryId: 'category', activityId: 'reading', startTime: 100, endTime: 200, duration: 100, attributeValues: [{ attributeId: 'format', optionId: 'book' }] },
      { id: 'middle', categoryId: 'category', activityId: 'reading', startTime: 300, endTime: 400, duration: 100, attributeValues: [{ attributeId: 'format', optionIds: ['paper', 'book'] }] },
      { id: 'latest', categoryId: 'category', activityId: 'reading', startTime: 500, endTime: 600, duration: 100, attributeValues: [{ attributeId: 'format', optionId: 'article' }] }
    ];

    expect(getSortedActivityAttributeOptions(options, logs, 'format').map((option) => option.id)).toEqual([
      'article', 'book', 'paper', 'unused'
    ]);
  });

  it('places options selected in the current unsaved form before historical options', () => {
    const options = [
      { id: 'book', label: 'Book' },
      { id: 'article', label: 'Article' },
      { id: 'paper', label: 'Paper' }
    ];
    const logs = [
      { id: 'latest', categoryId: 'category', activityId: 'reading', startTime: 500, endTime: 600, duration: 100, attributeValues: [{ attributeId: 'format', optionId: 'article' }] }
    ];

    expect(getSortedActivityAttributeOptions(options, logs, 'format', ['paper']).map((option) => option.id)).toEqual([
      'paper', 'article', 'book'
    ]);
  });

  it('shows a conditional field only after its parent single choice is selected', () => {
    const conditionalActivity: Activity = {
      id: 'exercise',
      name: 'Exercise',
      icon: 'run',
      color: 'bg-green-100',
      attributes: [
        { id: 'kind', name: 'Kind', type: 'single', options: [{ id: 'jump', label: 'Jump rope' }, { id: 'run', label: 'Run' }], order: 0, createdAt: 1, updatedAt: 1 },
        { id: 'reps', name: 'Reps', type: 'number', unit: 'reps', displayCondition: { attributeId: 'kind', optionIds: ['jump'] }, order: 1, createdAt: 1, updatedAt: 1 }
      ]
    };
    const reps = conditionalActivity.attributes?.[1];
    if (!reps) throw new Error('Missing conditional test attribute');

    expect(isActivityAttributeConditionMet(reps, [{ attributeId: 'kind', optionId: 'jump' }])).toBe(true);
    expect(isActivityAttributeConditionMet(reps, [{ attributeId: 'kind', optionId: 'run' }])).toBe(false);
    expect(getVisibleActivityAttributes(conditionalActivity, [{ attributeId: 'kind', optionId: 'jump' }]).map((attribute) => attribute.id)).toEqual(['kind', 'reps']);
    expect(getVisibleActivityAttributes(conditionalActivity, [{ attributeId: 'kind', optionId: 'run' }]).map((attribute) => attribute.id)).toEqual(['kind']);
  });

  it('keeps stored conditional fields visible during historical editing and removes them after their parent changes', () => {
    const conditionalActivity: Activity = {
      id: 'exercise',
      name: 'Exercise',
      icon: 'run',
      color: 'bg-green-100',
      attributes: [
        { id: 'kind', name: 'Kind', type: 'single', options: [{ id: 'jump', label: 'Jump rope' }, { id: 'run', label: 'Run' }], order: 0, createdAt: 1, updatedAt: 1 },
        { id: 'reps', name: 'Reps', type: 'number', displayCondition: { attributeId: 'kind', optionIds: ['jump'] }, order: 1, createdAt: 1, updatedAt: 1 }
      ]
    };
    const changedValues = [
      { attributeId: 'kind', optionId: 'run' },
      { attributeId: 'reps', value: 200 }
    ];

    expect(getVisibleActivityAttributes(conditionalActivity, changedValues, true).map((attribute) => attribute.id)).toEqual(['kind', 'reps']);
    expect(clearInapplicableActivityAttributeValues(changedValues, conditionalActivity)).toEqual([
      { attributeId: 'kind', optionId: 'run' }
    ]);
  });

  it('matches active choice options from a note, keeping all multi-choice matches and the longest single-choice match', () => {
    const matchingActivity: Activity = {
      id: 'food',
      name: '饮食',
      icon: 'food',
      color: 'bg-red-100',
      attributes: [
        { id: 'place', name: '地点', type: 'single', options: [{ id: 'hotpot', label: '麻辣烫' }, { id: 'short', label: '烫' }], order: 0, createdAt: 1, updatedAt: 1 },
        { id: 'content', name: '内容', type: 'multi', options: [{ id: 'hotpot', label: '麻辣烫' }, { id: 'drink', label: '可乐' }, { id: 'old', label: '旧选项', isArchived: true }], order: 1, createdAt: 1, updatedAt: 1 },
        { id: 'amount', name: '金额', type: 'number', options: [{ id: 'ignored', label: '麻辣烫' }], order: 2, createdAt: 1, updatedAt: 1 }
      ]
    };

    expect(getNoteMatchedActivityAttributeValues('午饭吃了麻辣烫和可乐', matchingActivity, [])).toEqual([
      { attributeId: 'place', optionId: 'hotpot' },
      { attributeId: 'content', optionIds: ['hotpot', 'drink'] }
    ]);
  });

  it('does not replace existing values and can unlock conditionally visible matched attributes', () => {
    const matchingActivity: Activity = {
      id: 'exercise',
      name: '运动',
      icon: 'run',
      color: 'bg-green-100',
      attributes: [
        { id: 'kind', name: '项目', type: 'single', options: [{ id: 'run', label: '跑步' }, { id: 'rope', label: '跳绳' }], order: 0, createdAt: 1, updatedAt: 1 },
        { id: 'place', name: '地点', type: 'multi', displayCondition: { attributeId: 'kind', optionIds: ['run'] }, options: [{ id: 'park', label: '公园' }], order: 1, createdAt: 1, updatedAt: 1 }
      ]
    };

    expect(getNoteMatchedActivityAttributeValues('去公园跑步', matchingActivity, [])).toEqual([
      { attributeId: 'kind', optionId: 'run' },
      { attributeId: 'place', optionIds: ['park'] }
    ]);
    expect(getNoteMatchedActivityAttributeValues('去公园跑步', matchingActivity, [{ attributeId: 'kind', optionId: 'rope' }])).toEqual([]);
  });
});
