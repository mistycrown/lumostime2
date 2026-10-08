/**
 * @file obsidianExportService.test.ts
 * @updated 2026-10-08: Covers node-free daily/weekly/monthly exports and retained wiki links.
 * @input Logs with custom attributes and review metadata.
 * @output Regression coverage for complete Obsidian Markdown sections.
 * @pos Service test
 */

import { describe, expect, it } from 'vitest';
import type { Category, DailyReview, Log, NodeCategory, NoteNode, Scope, TodoItem } from '../types';
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
    expect(content).toContain('✓ 运动');
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
