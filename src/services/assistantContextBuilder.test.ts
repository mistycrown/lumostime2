import { describe, expect, it } from 'vitest';
import type { Category, DailyReview, Log, Scope, TodoCategory, TodoItem } from '../types';
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

const dailyReviews: DailyReview[] = [
  {
    id: 'review-today',
    date: '2026-04-27',
    createdAt: 1,
    updatedAt: 1,
    answers: [],
    summary: '今天主要在推进论文草稿，整体状态还算稳。'
  },
  {
    id: 'review-yesterday',
    date: '2026-04-26',
    createdAt: 1,
    updatedAt: 1,
    answers: [],
    summary: '昨天把资料和结构重新理了一遍。'
  }
];

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
  it('buildStateContext keeps one local-offset current-time anchor and builds an absolute reference table', () => {
    const stateContext = assistantContextBuilder.buildStateContext({
      currentDateTime: '2026-04-27T18:00:00+08:00',
      stateContextDate: '2026-04-27',
      categories,
      todos,
      logs: []
    });

    expect(stateContext.currentDateTime).toBe('2026-04-27T18:00:00+08:00');
    expect(stateContext.stateContextDate).toBe('2026-04-27');
    expect(stateContext.currentLocalDate).toBe('2026-04-27');
    expect(stateContext.currentWeekday).toBe('周一');
    expect(stateContext.tomorrowDate).toBe('2026-04-28');
    expect(stateContext.dayAfterTomorrowDate).toBe('2026-04-29');
    expect(stateContext.currentWeekRange).toBe('2026-04-26..2026-05-02');
    expect(stateContext.nextWeekdayDates?.nextTuesday).toBe('2026-04-28');
    expect('currentDateTimeLocal' in stateContext).toBe(false);
    expect('currentDateTimeUtc' in stateContext).toBe(false);
  });

  it('buildStateContext exposes timeline summaries and scheduled todos through absolute field names', () => {
    const stateContext = assistantContextBuilder.buildStateContext({
      currentDateTime: '2026-04-27T18:00:00+08:00',
      stateContextDate: '2026-04-27',
      categories,
      todos,
      logs: [
        createLog('yesterday-log', 2026, 3, 26, 14, 15, 'draft note', 'todo-draft'),
        createLog('today-log', 2026, 3, 27, 9, 10, 'outline note', 'todo-draft')
      ],
      timelineReviewSummary: 'today and yesterday review digest'
    });

    expect(stateContext.timelineSummaryForDate).toContain('09:00-10:00 Work / Writing');
    expect(stateContext.timelineSummaryForDate).toContain('outline note');
    expect(stateContext.timelineSummaryForPreviousDate).toContain('14:00-15:00 Work / Writing');
    expect(stateContext.timelineSummaryForPreviousDate).toContain('draft note');
    expect(stateContext.timelineReviewSummary).toBe('today and yesterday review digest');
    expect(stateContext.scheduledTodosForDateSummary).toContain('stateContextDate=2026-04-27');
  });

  it('buildConversationContext keeps timestamps in recent turns and summary text', () => {
    const context = assistantContextBuilder.buildConversationContext([
      {
        role: 'user',
        content: '下周二帮我安排讲座',
        createdAt: '2026-05-13T21:47:00+08:00'
      },
      {
        role: 'assistant',
        content: '我先记下时间。',
        createdAt: '2026-05-13T21:47:10+08:00'
      }
    ]);

    expect(context.recentTurns[0]).toMatchObject({
      role: 'user',
      content: '下周二帮我安排讲座',
      createdAt: '2026-05-13T21:47:00+08:00'
    });
    expect(context.summary).toContain('User @ 2026-05-13T21:47:00+08:00: 下周二帮我安排讲座');
    expect(context.summary).toContain('Assistant @ 2026-05-13T21:47:10+08:00: 我先记下时间。');
  });

  it('buildRecentLogsDigest excludes the state context date and keeps log lines compact', () => {
    const digest = assistantContextBuilder.buildRecentLogsDigest({
      stateContextDate: '2026-04-26',
      categories,
      todos,
      logs: [
        createLog('today-log', 2026, 3, 26, 9, 10, 'today note'),
        createLog('older-log', 2026, 3, 25, 8, 9, 'older note', 'todo-draft')
      ]
    });

    expect(digest).toContain('stateContextDate=2026-04-26');
    expect(digest).toContain('2026-04-25 | 08:00-09:00 | Work / Writing | @Draft chapter | note:older note');
    expect(digest).not.toContain('today note');
  });

  it('buildRecentLogsDigest keeps only the most recent 20 non-stateContextDate logs', () => {
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
      stateContextDate: '2026-04-26',
      categories,
      todos,
      logs
    });

    const lines = digest?.split('\n') || [];
    expect(lines[0]).toBe('以下是最近日志摘要：已排除 stateContextDate=2026-04-26 的记录；当前提供 20 条；最多保留 20 条；按时间倒序排列。');
    expect(lines).toHaveLength(21);
    expect(digest).toContain('log-1');
    expect(digest).toContain('log-20');
    expect(digest).not.toContain('log-21');
    expect(digest).not.toContain('log-22');
  });

  it('buildTimelineSummaryDigest renders absolute day labels for current and previous dates', () => {
    const digest = assistantContextBuilder.buildTimelineSummaryDigest({
      stateContextDate: '2026-04-27',
      dailyReviews
    });

    expect(digest).toContain('以下是应用状态上下文。');
    expect(digest).toContain('stateContextDate（2026-04-27）的 timelineSummary：今天主要在推进论文草稿，整体状态还算稳。');
    expect(digest).toContain('previousDate（2026-04-26）的 timelineSummary：昨天把资料和结构重新理了一遍。');
  });

  it('buildTimelineSummaryDigest keeps missing day summaries explicit', () => {
    const digest = assistantContextBuilder.buildTimelineSummaryDigest({
      stateContextDate: '2026-04-28',
      dailyReviews
    });

    expect(digest).toContain('stateContextDate（2026-04-28）还没有填写 timelineSummary。');
    expect(digest).toContain('previousDate（2026-04-27）的 timelineSummary：今天主要在推进论文草稿，整体状态还算稳。');
  });

  it('buildDictionaryContext includes structured log candidates with ids for edit targeting', () => {
    const dictionaryContext = assistantContextBuilder.buildDictionaryContext({
      categories,
      scopes,
      todoCategories,
      todos,
      logs: [
        createLog('log-1', 2026, 3, 27, 9, 10, 'outline note', 'todo-draft')
      ]
    });

    expect(dictionaryContext.logs).toHaveLength(1);
    expect(dictionaryContext.logs?.[0]).toMatchObject({
      id: 'log-1',
      date: '2026-04-27',
      timeRange: '09:00-10:00',
      activityId: 'act-writing',
      activityName: 'Writing',
      linkedTodoId: 'todo-draft',
      linkedTodoTitle: 'Draft chapter',
      note: 'outline note'
    });
    expect(dictionaryContext.todos).toHaveLength(2);
    expect(dictionaryContext.todos?.find((todo) => todo.id === 'todo-draft')?.parentTodoId).toBe('todo-parent');
  });

  it('buildDictionaryDigest renders all candidate groups as compact tables including logs', () => {
    const dictionaryContext = assistantContextBuilder.buildDictionaryContext({
      categories,
      scopes,
      todoCategories,
      todos,
      logs: [
        createLog('log-1', 2026, 3, 27, 9, 10, 'outline note', 'todo-draft')
      ]
    });

    const digest = assistantContextBuilder.buildDictionaryDigest(dictionaryContext);

    expect(digest).toContain('日志候选中的 id 可直接用于 edit_log');
    expect(digest).toContain('[ActivityCategories] rows=1');
    expect(digest).toContain('id\tname');
    expect(digest).toContain('"cat-work"\t"Work"');
    expect(digest).toContain('[Activities] rows=1');
    expect(digest).toContain('categoryId\tid\tname');
    expect(digest).toContain('"cat-work"\t"act-writing"\t"Writing"');
    expect(digest).toContain('[Scopes] rows=1');
    expect(digest).toContain('"scope-research"\t"Research"');
    expect(digest).toContain('[TodoCategories] rows=3');
    expect(digest).toContain('"todo-general"\t"General"');
    expect(digest).toContain('"__virtual_future__"\t"未来"');
    expect(digest).toContain('"__virtual_quick__"\t"小事"');
    expect(digest).toContain('[Todos] rows=2');
    expect(digest).toContain('id\ttitle\tkind\tpath\tparentTodoId\tparentTodoTitle\tcategoryId\tcategoryName\tlinkedCategoryId\tlinkedActivityId\tlinkedActivityName\tdefaultScopeIds\tscheduledDate\tdeadlineDate\tpin\tisCompleted');
    expect(digest).toContain('"todo-parent"\t"Thesis"\t"project"\t-\t-\t-\t"todo-general"\t"General"\t-\t-\t-\t-\t-\t-\tfalse\tfalse');
    expect(digest).toContain('"todo-draft"\t"Draft chapter"\t"project"\t"Thesis / Draft chapter"\t"todo-parent"\t"Thesis"\t"todo-general"\t"General"\t-\t"act-writing"\t"Writing"\t["scope-research"]\t"2026-04-27"\t"2026-04-30"\ttrue\tfalse');
    expect(digest).toContain('[Logs] rows=1');
    expect(digest).toContain('id\tdate\ttimeRange\tcategoryId\tcategoryName\tactivityId\tactivityName\tlinkedTodoId\tlinkedTodoTitle\tnote');
    expect(digest).toContain('"log-1"\t"2026-04-27"\t"09:00-10:00"\t"cat-work"\t"Work"\t"act-writing"\t"Writing"\t"todo-draft"\t"Draft chapter"\t"outline note"');
  });
});
