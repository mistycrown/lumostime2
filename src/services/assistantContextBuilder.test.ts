import { describe, expect, it } from 'vitest';
import type { Category, Log, Scope, TodoCategory, TodoItem } from '../types';
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

const todos: TodoItem[] = [
  {
    id: 'todo-parent',
    categoryId: 'todo-general',
    title: 'Thesis',
    isCompleted: false
  },
  {
    id: 'todo-draft',
    categoryId: 'todo-general',
    parentTodoId: 'todo-parent',
    title: 'Draft chapter',
    linkedActivityId: 'act-writing',
    defaultScopeIds: ['scope-research'],
    scheduledDate: '2026-04-27',
    deadlineDate: '2026-04-30',
    pin: true,
    isCompleted: false
  }
];

const scopes: Scope[] = [{
  id: 'scope-research',
  name: 'Research',
  icon: 'R',
  isArchived: false,
  order: 0,
  themeColor: '#222222'
}];

const todoCategories: TodoCategory[] = [{
  id: 'todo-general',
  name: 'General',
  icon: 'G'
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
  it('buildStateContext keeps only one local-offset current time anchor', () => {
    const stateContext = assistantContextBuilder.buildStateContext({
      currentDateTime: '2026-04-27T18:00:00+08:00',
      defaultDate: '2026-04-27',
      categories,
      todos,
      logs: []
    });

    expect(stateContext.currentDateTime).toBe('2026-04-27T18:00:00+08:00');
    expect('currentDateTimeLocal' in stateContext).toBe(false);
    expect('currentDateTimeUtc' in stateContext).toBe(false);
  });

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
      scopes,
      todoCategories,
      todos
    });

    expect('logs' in dictionaryContext).toBe(false);
    expect(dictionaryContext.todos).toHaveLength(2);
    expect(dictionaryContext.todos?.find((todo) => todo.id === 'todo-draft')?.parentTodoId).toBe('todo-parent');
  });

  it('buildDictionaryDigest renders all candidate groups as compact tables', () => {
    const dictionaryContext = assistantContextBuilder.buildDictionaryContext({
      categories,
      scopes,
      todoCategories,
      todos
    });

    const digest = assistantContextBuilder.buildDictionaryDigest(dictionaryContext);

    expect(digest).toContain('以下是候选词典无损表。字段与应用词典一一对应；活动通过 categoryId 关联分类；子任务通过 parentTodoId 关联父任务；数组字段保持 JSON 数组；空值记为 - 。');
    expect(digest).toContain('[ActivityCategories] rows=1');
    expect(digest).toContain('id\tname');
    expect(digest).toContain('"cat-work"\t"Work"');
    expect(digest).toContain('[Activities] rows=1');
    expect(digest).toContain('categoryId\tid\tname');
    expect(digest).toContain('"cat-work"\t"act-writing"\t"Writing"');
    expect(digest).toContain('[Scopes] rows=1');
    expect(digest).toContain('"scope-research"\t"Research"');
    expect(digest).toContain('[TodoCategories] rows=1');
    expect(digest).toContain('"todo-general"\t"General"');
    expect(digest).toContain('[Todos] rows=2');
    expect(digest).toContain('id\ttitle\tpath\tparentTodoId\tparentTodoTitle\tcategoryId\tcategoryName\tlinkedCategoryId\tlinkedActivityId\tlinkedActivityName\tdefaultScopeIds\tscheduledDate\tdeadlineDate\tpin\tisCompleted');
    expect(digest).toContain('"todo-parent"\t"Thesis"\t-\t-\t-\t"todo-general"\t"General"\t-\t-\t-\t-\t-\t-\tfalse\tfalse');
    expect(digest).toContain('"todo-draft"\t"Draft chapter"\t"Thesis / Draft chapter"\t"todo-parent"\t"Thesis"\t"todo-general"\t"General"\t-\t"act-writing"\t"Writing"\t["scope-research"]\t"2026-04-27"\t"2026-04-30"\ttrue\tfalse');
  });
});
