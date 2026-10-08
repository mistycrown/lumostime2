/**
 * @file obsidianExportService.test.ts
 * @updated 2026-10-08: Covers node-free daily/weekly/monthly exports and retained wiki links.
 * @updated 2026-10-08: Checks task-list states, count progress and fresh automatic checks including previous-night logs.
 * @input Logs with custom attributes and review metadata.
 * @output Regression coverage for complete Obsidian Markdown sections.
 * @pos Service test
 */

import { describe, expect, it } from 'vitest';
import type { Category, CheckItem, DailyReview, Log, NodeCategory, NoteNode, Scope, TodoItem } from '../types';
import obsidianExportService from './obsidianExportService';

const categories: Category[] = [{
  id: 'cat',
  name: '学习',
  icon: '📚',
  themeColor: '#333',
  activities: [{
    id: 'activity',
    name: '阅读',
    icon: '📖',
    color: 'bg-stone-100',
    attributes: [{
      id: 'format',
      name: '形式',
      type: 'single',
      options: [{ id: 'book', label: '书籍' }],
      order: 0,
      createdAt: 1,
      updatedAt: 1
    }]
  }]
}];

const log: Log = {
  id: 'log',
  categoryId: 'cat',
  activityId: 'activity',
  startTime: new Date(2026, 9, 7, 9).getTime(),
  endTime: new Date(2026, 9, 7, 10).getTime(),
  duration: 3600,
  title: '上午阅读',
  note: '[[书籍]]',
  attributeValues: [{ attributeId: 'format', optionId: 'book' }],
  comments: [{ id: 'comment', content: '很好', createdAt: 1 }],
  reactions: ['⭐']
};

const review: DailyReview = {
  id: 'review',
  date: '2026-10-07',
  createdAt: 1,
  updatedAt: 1,
  answers: [],
  summary: '完成了阅读',
  moodEmoji: '🙂',
  checkItems: [{ id: 'check', content: '运动', isCompleted: true }]
};

describe('obsidianExportService', () => {
  it('exports completed and incomplete checks as task lists with normalized count progress', () => {
    const checkItems: CheckItem[] = [
      { id: 'done', content: '吃维生素', isCompleted: true },
      { id: 'pending', content: '擦脸', isCompleted: false },
      { id: 'count-done', content: '喝水', type: 'manual', manualMode: 'count', currentCount: 3, targetCount: 3, isCompleted: false },
      { id: 'count-pending', content: '运动', type: 'manual', manualMode: 'count', currentCount: 1, targetCount: 2, isCompleted: true },
      { id: 'legacy-count', content: '阅读', type: 'manual', manualMode: 'count', targetCount: 2, isCompleted: true }
    ];
    const before = JSON.stringify(checkItems);
    const content = obsidianExportService.generateReviewMetadataMarkdown({ ...review, checkItems });
    expect(content).toContain('**检查项**:\n\n- [x] 吃维生素\n- [ ] 擦脸');
    expect(content).toContain('- [x] 喝水（3/3）');
    expect(content).toContain('- [ ] 运动（1/2）');
    expect(content).toContain('- [x] 阅读（2/2）');
    expect(JSON.stringify(checkItems)).toBe(before);
  });

  it('refreshes automatic checks for the export date using full log history without changing daily statistics', () => {
    const checkItems: CheckItem[] = [
      { id: 'no-feed', content: 'no信息流', type: 'auto', isCompleted: false, autoConfig: { filterExpression: '信息流', comparisonType: 'duration', operator: '<=', targetValue: 0 } },
      { id: 'reading', content: '干点正事', type: 'auto', isCompleted: false, autoConfig: { filterExpression: '#阅读', comparisonType: 'duration', operator: '>=', targetValue: 30 } },
      { id: 'sleep', content: '早睡', type: 'auto', isCompleted: false, autoConfig: { filterExpression: '睡眠', comparisonType: 'nightEarliestStart', operator: '<=', targetValue: 23 * 60 } },
      { id: 'missing', content: '出门运动', type: 'auto', isCompleted: true, autoConfig: { filterExpression: '运动', comparisonType: 'count', operator: '>=', targetValue: 1 } }
    ];
    const previousNight: Log = { ...log, id: 'night', note: '睡眠', startTime: new Date(2026, 9, 6, 22).getTime(), endTime: new Date(2026, 9, 7, 7).getTime(), duration: 9 * 3600 };
    const otherDay: Log = { ...log, id: 'other', note: '信息流', startTime: new Date(2026, 9, 6, 9).getTime(), endTime: new Date(2026, 9, 6, 10).getTime() };
    const planned: Log = { ...log, id: 'planned', note: '运动', isPlanned: true };
    const dailyReview = { ...review, checkItems };
    const before = JSON.stringify(dailyReview);
    const content = obsidianExportService.generateFullMarkdown([log], categories, [], [], new Date(2026, 9, 7), dailyReview,
      { includeTimeline: true, includeStats: true, includeQuestions: false, includeNarrative: false }, [], [], { logs: [previousNight, otherDay, planned, log] });
    expect(content).toContain('- [x] no信息流');
    expect(content).toContain('- [x] 干点正事');
    expect(content).toContain('- [x] 早睡');
    expect(content).toContain('- [ ] 出门运动');
    expect(content).toContain('**总时长**: 1h 0m');
    expect(content).not.toContain('9h 0m');
    expect(JSON.stringify(dailyReview)).toBe(before);
  });

  it.each(['daily', 'weekly', 'monthly'] as const)('excludes node metadata from %s exports even with legacy arguments', (kind) => {
    const nodes: NoteNode[] = [{
      id: 'node', name: '样例人物', aliases: ['样例别名'], categoryId: 'people',
      description: '## 人物概况\n\n- 身份：样例身份\n\n## 互动方式\n\n- 样例活动',
      createdAt: 1, updatedAt: 1
    }];
    const nodeCategories: NodeCategory[] = [{ id: 'people', name: '人物', order: 0, createdAt: 1, updatedAt: 1 }];
    const options = { includeTimeline: true, includeStats: true, includeQuestions: true, includeNarrative: true };
    const linkedReview = { ...review, answers: [{ questionId: 'question', question: '今天做了什么？', answer: '阅读了 [[书籍]]。' }], narrative: '阅读后的日常叙事。' };
    const content = kind === 'daily'
      ? Reflect.apply(obsidianExportService.generateFullMarkdown, obsidianExportService, [[log], categories, [], [], new Date(2026, 9, 7), linkedReview, options, [], ['reading.png'], nodes, nodeCategories])
      : Reflect.apply(kind === 'weekly' ? obsidianExportService.generateWeeklyMarkdown : obsidianExportService.generateMonthlyMarkdown, obsidianExportService, [[log], categories, [], [], new Date(2026, 9, kind === 'weekly' ? 11 : 31), options, linkedReview, [], nodes, nodeCategories]);

    for (const text of ['## 节点', '样例人物', '样例别名', '人物概况', '样例身份', '互动方式', '样例活动']) {
      expect(content).not.toContain(text);
    }
    expect(content).toContain('[[书籍]]');
    expect(content).toContain('总时长');
    expect(content).toContain('1h 0m');
    expect(content).toContain('阅读后的日常叙事。');
    expect(content).toContain('**摘要**: 完成了阅读');
    if (kind === 'daily') expect(content).toContain('![[reading.png]]');
  });

  it('renders current log fields and review metadata in Markdown', () => {
    const content = obsidianExportService.generateFullMarkdown(
      [log],
      categories,
      [] as TodoItem[],
      [] as Scope[],
      new Date(2026, 9, 7),
      review,
      { includeTimeline: true, includeStats: true, includeQuestions: false, includeNarrative: false }
    );

    expect(content).toContain('形式: 书籍');
    expect(content).toContain('标题: 上午阅读');
    expect(content).toContain('评论: 很好');
    expect(content).toContain('**摘要**: 完成了阅读');
    expect(content).toContain('**心情**: 🙂');
    expect(content).toContain('- [x] 运动');
  });

  it('limits statistics to the logs passed for the selected date', () => {
    const content = obsidianExportService.generateStatsMarkdown(
      [log],
      categories,
      [],
      [],
      new Date(2026, 9, 7)
    );

    expect(content).toContain('总时长');
    expect(content).toContain('1h 0m');
  });
});
