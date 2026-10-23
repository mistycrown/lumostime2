/**
 * @file journalStatistics.test.ts
 * @input Cross-midnight logs, duplicate labels, repeated scopes and Plan records
 * @output Regression checks for all six journal time attribution dimensions
 * @pos Tests (Journal statistics)
 * @updated 2026-10-23: Verifies clipping, identity, full multi-attribution and source immutability.
 */
import { describe, expect, it } from 'vitest';
import { buildJournalModel, type JournalExportData } from './journalExport';
import { buildJournalDistributions } from './journalStatistics';

describe('journal time distributions', () => {
  it('uses clipped actual time, keeps same-named identities and deduplicates scopes', () => {
    const data: JournalExportData = {
      categories: ['a', 'b'].map((id) => ({ id, name: '学习', icon: '', themeColor: '#557755', activities: [{ id, name: '阅读', icon: '', color: '#557755', keywords: ['阅读', '课程'] }] })),
      scopes: ['s', 't'].map((id) => ({ id, name: '领域' + id, icon: '', themeColor: '#557755', isArchived: false, order: 0 })),
      todoCategories: [{ id: 'work', name: '工作', icon: '', color: '#557755' }, { id: 'life', name: '生活', icon: '', color: '#998877' }],
      todos: [{ id: 'task1', title: '同名任务', categoryId: 'work', isCompleted: false }, { id: 'task2', title: '同名任务', categoryId: 'life', isCompleted: false }],
      logs: [
        { id: 'night', activityId: 'a', categoryId: 'a', title: '阅读课程', scopeIds: ['s', 's', 't'], linkedTodoId: 'task1', startTime: new Date(2026, 9, 19, 23).getTime(), endTime: new Date(2026, 9, 20, 1).getTime(), duration: 7200 },
        { id: 'day', activityId: 'b', categoryId: 'b', title: '写作', scopeIds: ['t'], linkedTodoId: 'task2', startTime: new Date(2026, 9, 20, 10).getTime(), endTime: new Date(2026, 9, 20, 11).getTime(), duration: 3600 },
        { id: 'plan', activityId: 'a', categoryId: 'a', title: '阅读课程', scopeIds: ['s'], linkedTodoId: 'task1', isPlanned: true, startTime: new Date(2026, 9, 20, 13).getTime(), endTime: new Date(2026, 9, 20, 14).getTime(), duration: 3600 }
      ], dailyReviews: [], weeklyReviews: [], monthlyReviews: []
    };
    const original = JSON.stringify(data);
    const model = buildJournalModel(data, { startDate: '2026-10-20', endDate: '2026-10-20', sections: ['monthly'], paperSize: 'a4', includeCover: false, includeEmptyDays: false });
    const groups = new Map(buildJournalDistributions(model.days).map((group) => [group.id, group]));
    expect(groups.size).toBe(6);
    expect(groups.get('categories')!.total).toBe(7200);
    expect(groups.get('activities')!.items).toHaveLength(2);
    expect(groups.get('activities')!.items.every((item) => item.name === '阅读' && item.seconds === 3600)).toBe(true);
    expect(groups.get('keywords')!.total).toBe(7200);
    expect(groups.get('keywords')!.items).toHaveLength(2);
    expect(groups.get('scopes')!.total).toBe(10800);
    expect(groups.get('scopes')!.items.find((item) => item.id === 's')!.seconds).toBe(3600);
    expect(groups.get('scopes')!.attributed).toBe(true);
    expect(groups.get('todos')!.items).toHaveLength(2);
    expect(groups.get('todos')!.total).toBe(7200);
    expect(groups.get('todoCategories')!.items).toHaveLength(2);
    expect(JSON.stringify(data)).toBe(original);
  });
});
