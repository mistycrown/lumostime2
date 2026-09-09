/**
 * @file todoMonthFilterUtils.test.ts
 * @input Todo month-view filter mode and preset payloads
 * @output Regression coverage for mode exclusivity and persisted preset normalization
 */

import { describe, expect, test } from 'vitest';
import {
  getTodoMonthFilterExpression,
  normalizeTodoMonthFilterMode,
  normalizeTodoMonthFilterPresets
} from './todoMonthFilterUtils';

describe('todo month filter settings', () => {
  test('normalizes valid presets and drops incomplete entries', () => {
    expect(normalizeTodoMonthFilterPresets([
      { id: 'work', name: ' 工作 ', filterExpression: ' @写作 ' },
      { id: 'missing-expression', name: 'Missing' },
      null
    ])).toEqual([
      { id: 'work', name: '工作', filterExpression: '@写作' }
    ]);
  });

  test('uses only the expression for the active mode', () => {
    const presets = [{ id: 'work', name: '工作', filterExpression: '@写作' }];

    expect(getTodoMonthFilterExpression({
      mode: 'hidden',
      hiddenFilterExpression: ' @娱乐 ',
      presets,
      activePresetId: 'work'
    })).toBe('@娱乐');
    expect(getTodoMonthFilterExpression({
      mode: 'visible',
      hiddenFilterExpression: '@娱乐',
      presets,
      activePresetId: 'work'
    })).toBe('@写作');
    expect(getTodoMonthFilterExpression({
      mode: 'none',
      hiddenFilterExpression: '@娱乐',
      presets,
      activePresetId: 'work'
    })).toBe('');
  });

  test('falls back to no mode for unknown persisted values', () => {
    expect(normalizeTodoMonthFilterMode('unsupported')).toBe('none');
    expect(normalizeTodoMonthFilterMode('visible')).toBe('visible');
  });
});
