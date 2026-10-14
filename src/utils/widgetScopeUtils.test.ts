/**
 * @file widgetScopeUtils.test.ts
 * @input Widget preferences, scope rules and explicit selections
 * @output Regression coverage for timer auto-association payloads
 * @pos Test
 * @updated 2026-10-14: Covers disabled preferences, multiple rules, archived scopes and existing selections.
 */
import { describe, expect, it } from 'vitest';
import type { AutoLinkRule, Scope } from '../types';
import { getWidgetTimerScopeRules, mergeWidgetTimerScopeIds } from './widgetScopeUtils';

const scopes: Scope[] = [
  { id: 'work', name: 'Work', icon: 'W', isArchived: false, order: 0, themeColor: '#78716c' },
  { id: 'study', name: 'Study', icon: 'S', isArchived: false, order: 1, themeColor: '#78716c' },
  { id: 'archived', name: 'Archived', icon: 'A', isArchived: true, order: 2, themeColor: '#78716c' }
];
const rules: AutoLinkRule[] = [
  { id: '1', activityId: 'reading', scopeId: 'work' },
  { id: '2', activityId: 'reading', scopeId: 'study' },
  { id: '3', activityId: 'reading', scopeId: 'work' },
  { id: '4', activityId: 'reading', scopeId: 'archived' },
  { id: '5', activityId: 'reading', scopeId: 'missing' },
  { id: '6', activityId: 'exercise', scopeId: 'work' }
];

describe('widget timer scope rules', () => {
  it('mirrors only unique, existing active scopes for each activity', () => {
    expect(getWidgetTimerScopeRules(true, rules, scopes)).toEqual({ reading: ['work', 'study'], exercise: ['work'] });
  });

  it('clears native auto-association when the preference is disabled', () => {
    const nativeRules = JSON.parse(JSON.stringify(getWidgetTimerScopeRules(false, rules, scopes)));
    expect(nativeRules).toEqual({});
    expect(mergeWidgetTimerScopeIds(['manual'], 'reading', nativeRules)).toEqual(['manual']);
    expect(mergeWidgetTimerScopeIds(null, 'reading', nativeRules)).toBeNull();
  });

  it('adds matching scopes to both empty and manually configured slots', () => {
    const nativeRules = JSON.parse(JSON.stringify(getWidgetTimerScopeRules(true, rules, scopes)));
    expect(mergeWidgetTimerScopeIds(null, 'reading', nativeRules)).toEqual(['work', 'study']);
    const selected = ['manual', 'work'];
    expect(mergeWidgetTimerScopeIds(selected, 'reading', nativeRules)).toEqual(['manual', 'work', 'study']);
    expect(selected).toEqual(['manual', 'work']);
  });

  it('keeps unmatched slots unchanged and follows edited or archived rules', () => {
    const firstRules = getWidgetTimerScopeRules(true, rules, scopes);
    expect(mergeWidgetTimerScopeIds(['manual'], 'unmatched', firstRules)).toEqual(['manual']);
    expect(mergeWidgetTimerScopeIds(null, null, firstRules)).toBeNull();
    const editedRules = getWidgetTimerScopeRules(true, [rules[1]], scopes.map((scope) => ({ ...scope, isArchived: true })));
    expect(editedRules).toEqual({});
  });
});
