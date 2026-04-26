import { describe, expect, it } from 'vitest';
import type { Category, Log, TodoItem } from '../types';
import { assistantContextBuilder } from './assistantContextBuilder';

const categories: Category[] = [{
  id: 'cat-work',
  name: 'Work',
  icon: 'W',
  activities: [{
    id: 'act-writing',
    name: 'Writing',
    icon: 'P',
    color: '#000000'
  }],
  themeColor: '#111111'
}];

const todos: TodoItem[] = [{
  id: 'todo-draft',
  categoryId: 'todo-general',
  title: 'Draft chapter',
  isCompleted: false
}];

const createLog = (
  id: string,
  year: number,
  monthIndex: number,
  day: number,
  startHour: number,
  endHour: number,
  note?: string,
  linkedTodoId?: string
): Log => {
  const startTime = new Date(year, monthIndex, day, startHour, 0, 0, 0).getTime();
  const endTime = new Date(year, monthIndex, day, endHour, 0, 0, 0).getTime();

  return {
    id,
    categoryId: 'cat-work',
    activityId: 'act-writing',
    startTime,
    endTime,
    duration: Math.max(0, (endTime - startTime) / 1000),
    ...(note ? { note } : {}),
    ...(linkedTodoId ? { linkedTodoId } : {})
  };
};

describe('assistantContextBuilder', () => {
  it('buildRecentLogsDigest excludes the default date and keeps log lines compact', () => {
    const digest = assistantContextBuilder.buildRecentLogsDigest({
      defaultDate: '2026-04-26',
      categories,
      todos,
      logs: [
        createLog('today-log', 2026, 3, 26, 9, 10, 'today note'),
        createLog('older-log', 2026, 3, 25, 8, 9, 'older note', 'todo-draft')
      ]
    });

    expect(digest).toContain('以下是最近日志摘要：已排除今天（2026-04-26）的记录；当前提供 1 条；最多保留 20 条；按时间倒序排列。');
    expect(digest).toContain('2026-04-25 | 08:00-09:00 | Work / Writing | @Draft chapter | note:older note');
    expect(digest).not.toContain('today note');
  });

  it('buildRecentLogsDigest keeps only the most recent 20 non-today logs', () => {
    const logs = Array.from({ length: 22 }, (_, index) => (
      createLog(
        `older-${index + 1}`,
        2026,
        3,
        25 - index,
        8,
        9,
        `log-${index + 1}`
      )
    ));

    const digest = assistantContextBuilder.buildRecentLogsDigest({
      defaultDate: '2026-04-26',
      categories,
      todos,
      logs
    });

    const lines = digest?.split('\n') || [];
    expect(lines[0]).toBe('以下是最近日志摘要：已排除今天（2026-04-26）的记录；当前提供 20 条；最多保留 20 条；按时间倒序排列。');
    expect(lines).toHaveLength(21);
    expect(digest).toContain('log-1');
    expect(digest).toContain('log-20');
    expect(digest).not.toContain('log-21');
    expect(digest).not.toContain('log-22');
  });

  it('buildDictionaryContext no longer includes raw log objects', () => {
    const dictionaryContext = assistantContextBuilder.buildDictionaryContext({
      categories,
      todos
    });

    expect('logs' in dictionaryContext).toBe(false);
    expect(dictionaryContext.todos).toHaveLength(1);
  });
});
