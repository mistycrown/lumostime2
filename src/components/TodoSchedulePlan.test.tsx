/**
 * @file TodoSchedulePlan.test.tsx
 * @input Plan and Trace fixtures plus persisted schedule display settings
 * @output Rendering regression coverage for Plan labels, colors, and month visibility
 * @pos Test (Todo scheduling)
 * @updated 2026-10-14: Verifies Plan rendering and compatibility with existing colors and Trace filtering.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { TodoBentoWeekView } from './TodoBentoWeekView';
import { TodoMonthView } from './TodoMonthView';
import { TodoScheduleTypeColorSettings } from './TodoScheduleTypeColorSettings';
import { DEFAULT_TODO_SCHEDULE_TYPE_COLORS, getResolvedTodoScheduleTypeColors, todoScheduleColorService } from '../services/todoScheduleColorService';
import { Log, TodoItem } from '../types';

const referenceDate = new Date('2026-04-20T12:00:00+08:00');
const todo: TodoItem = { id: 'plan-task', categoryId: 'cat', title: 'Planned task', isCompleted: false };
const log: Log = {
  id: 'plan', activityId: 'activity', categoryId: 'cat', linkedTodoId: todo.id,
  startTime: referenceDate.getTime(), endTime: referenceDate.getTime() + 3600000, duration: 3600, isPlanned: true
};
let stored: Map<string, string>;

beforeEach(() => {
  stored = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
    removeItem: (key: string) => stored.delete(key)
  });
  vi.useFakeTimers();
  vi.setSystemTime(referenceDate);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('renders full Plan beside Repeat without a Trace label for mixed planned and actual logs', () => {
  const markup = renderToStaticMarkup(<TodoBentoWeekView
    todos={[{ ...todo, recurrenceRule: { frequency: 'weekly', startDate: '2026-04-20', weekdays: [1] } }]}
    todoCategories={[]} logs={[log, { ...log, id: 'actual', isPlanned: false }]}
    weekStartDate={referenceDate} headerWeekLabel="April 20" isCurrentWeek
    onGoToPreviousWeek={() => {}} onGoToNextWeek={() => {}} onGoToCurrentWeek={() => {}}
    onOpenWeekPicker={() => {}} viewMenuNode={null}
  />);
  expect(markup).toContain('>Plan</span>');
  expect(markup).toContain('>Rep</span>');
  expect(markup).not.toContain('>Trace</span>');
});

test('keeps planned month entries visible when Trace types are hidden', () => {
  stored.set('todoMonthViewHideTraceTypes', 'true');
  const markup = renderToStaticMarkup(<TodoMonthView
    todos={[todo, { ...todo, id: 'actual-task', title: 'Actual task' }]}
    todoCategories={[]} activityCategories={[]} scopes={[]}
    logs={[log, { ...log, id: 'actual', linkedTodoId: 'actual-task', isPlanned: false }]}
    referenceDate={referenceDate} entryJumpSignal={0} viewMenuNode={null}
  />);
  expect(markup).toContain('Planned task');
  expect(markup).not.toContain('Actual task');
  expect(markup).toContain('131, 119, 161');
});

test('preserves old custom colors, defaults Plan, and offers Plan in the color editor', () => {
  const settings = todoScheduleColorService.saveSettings({ version: 1, mode: 'custom', colors: { inProgress: '#123456' }, updatedAt: 1 });
  expect(getResolvedTodoScheduleTypeColors(settings)).toMatchObject({ inProgress: '#123456', planned: DEFAULT_TODO_SCHEDULE_TYPE_COLORS.planned });
  const markup = renderToStaticMarkup(<TodoScheduleTypeColorSettings settings={settings} onChange={() => {}} />);
  expect(markup).toContain('>Plan</span>');
  expect(todoScheduleColorService.saveSettings({ ...settings, colors: { ...settings.colors, planned: '#abcdef' } }).colors.planned).toBe('#abcdef');
});
