import { describe, expect, it } from 'vitest';
import type { TodoItem } from '../types';
import { groupTodosByExecutionTags } from './todoExecutionGrouping';

const makeTodo = (id: string, title: string, executionTags?: TodoItem['executionTags']): TodoItem => ({
  id,
  categoryId: 'work',
  title,
  isCompleted: false,
  pin: false,
  completedUnits: 0,
  executionTags
});

describe('todo execution grouping', () => {
  it('groups a realistic mix of tasks in preset order and keeps untagged work visible', () => {
    const todos = [
      makeTodo('1', '\u56de\u590d\u90ae\u4ef6', [
        { id: 'energy:low', name: '\u4f4e\u7cbe\u529b', group: 'energy', source: 'preset' },
        { id: 'scene:computer', name: '\u7535\u8111\u524d', group: 'scene', source: 'preset' }
      ]),
      makeTodo('2', '\u5199\u63d0\u6848', [
        { id: 'energy:high', name: '\u9ad8\u7cbe\u529b', group: 'energy', source: 'preset' },
        { id: 'time:morning', name: '\u65e9\u6668', group: 'time', source: 'preset' }
      ]),
      makeTodo('3', '\u6574\u7406\u684c\u9762')
    ];

    expect(groupTodosByExecutionTags(todos).map((group) => group.label)).toEqual([
      '\u4f4e\u7cbe\u529b',
      '\u9ad8\u7cbe\u529b',
      '\u7535\u8111\u524d',
      '\u65e9\u6668',
      '\u672a\u8bbe\u7f6e\u6267\u884c\u6807\u7b7e'
    ]);
    expect(groupTodosByExecutionTags(todos)[0].todos.map((todo) => todo.id)).toEqual(['1']);
    expect(groupTodosByExecutionTags(todos).at(-1)?.todos.map((todo) => todo.id)).toEqual(['3']);
  });

  it('places a multi-label task in each group but only once per group', () => {
    const todo = makeTodo('1', '\u591a\u573a\u666f\u4efb\u52a1', [
      { id: 'scene:home', name: '\u5bb6\u91cc', group: 'scene', source: 'preset' },
      { id: 'scene:home', name: '\u5bb6\u91cc', group: 'scene', source: 'preset' },
      { id: 'time:evening', name: '\u665a\u4e0a', group: 'time', source: 'preset' }
    ]);

    const groups = groupTodosByExecutionTags([todo]);
    expect(groups.map((group) => group.todos.length)).toEqual([1, 1]);
    expect(groups.every((group) => group.todos[0].id === '1')).toBe(true);
  });

  it('can omit the fallback group for a label-only filter', () => {
    const todos = [
      makeTodo('1', '\u6709\u6807\u7b7e', [
        { id: 'scene:home', name: '\u5bb6\u91cc', group: 'scene', source: 'preset' }
      ]),
      makeTodo('2', '\u65e0\u6807\u7b7e')
    ];

    expect(groupTodosByExecutionTags(todos, { includeUntagged: false }).map((group) => group.label)).toEqual(['\u5bb6\u91cc']);
  });
});

