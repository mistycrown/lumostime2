/**
 * @file journalExport.test.ts
 * @input Synthetic journal data and local date ranges
 * @output Regression coverage for export boundaries, schedule/check semantics and source immutability
 * @pos Tests (Journal PDF)
 * @updated 2026-10-23: Covers midnight, recurrence, automatic/manual checks and partial reviews.
 * @updated 2026-10-23: Verifies parent/child progress cutoffs and skips unanswered daily templates.
 * @updated 2026-10-24: Verifies complete page switches retain all embedded content without duplicate or hidden parts.
 */
import { describe, expect, it } from 'vitest';
import { JOURNAL_PAGE_GROUPS, JOURNAL_PART_GROUPS, journalPartsForPages, journalSectionsForParts, buildJournalModel, getJournalDataRange, getJournalDayPlans, getJournalQuickRange, parseJournalDateInput, journalCheckValue, journalTodoStatus, validateJournalOptions, type JournalExportData, type JournalExportOptions } from './journalExport';
import type { DailyReview, Log, TodoItem } from '../types';

const options: JournalExportOptions = { startDate: '2026-10-19', endDate: '2026-10-25', sections: ['monthly', 'timeline'], paperSize: 'a4', includeCover: true, includeEmptyDays: false };
const data = (patch: Partial<JournalExportData> = {}): JournalExportData => ({ logs: [], categories: [{ id: 'work', name: '工作', activities: [{ id: 'reading', name: '阅读' }] } as never], scopes: [], todos: [], todoCategories: [], dailyReviews: [], weeklyReviews: [], monthlyReviews: [], ...patch });
const log = (start: string, end: string, patch: Partial<Log> = {}): Log => ({ id: 'log', activityId: 'reading', categoryId: 'work', startTime: new Date(start).getTime(), endTime: new Date(end).getTime(), duration: (new Date(end).getTime() - new Date(start).getTime()) / 1000, ...patch });
const review = (date: string, patch: Partial<DailyReview> = {}): DailyReview => ({ id: date, date, createdAt: 0, updatedAt: 0, answers: [], ...patch });

describe('journal page selection', () => {
  it('keeps reviews with their overview pages and exports every element of a daily page together', () => {
    expect(journalPartsForPages(['monthCalendar'])).toEqual(['monthCalendar', 'monthReview']);
    expect(journalPartsForPages(['weekTimeline'])).toEqual(['weekTimeline', 'weekReview']);
    const daily = journalPartsForPages(['daily']);
    expect(daily).toEqual(['dayPlans', 'dayLogs', 'dayChecks', 'daySummary', 'dayReview']);
    expect(journalSectionsForParts(daily)).toEqual(['daily', 'logs', 'reviews']);
  });
  it('covers all renderer content exactly once and leaves no hidden data selected after clearing', () => {
    const pages = JOURNAL_PAGE_GROUPS.flatMap((group) => group.items.map((item) => item.id));
    const parts = journalPartsForPages(pages);
    expect(new Set(parts).size).toBe(parts.length);
    expect([...parts].sort()).toEqual(JOURNAL_PART_GROUPS.flatMap((group) => group.items.map((item) => item.id)).sort());
    expect(journalPartsForPages([])).toEqual([]);
    expect(journalSectionsForParts(journalPartsForPages([]))).toEqual([]);
  });
});

describe('journal date validation', () => {
  it('accepts exactly eight real date digits and never reuses stale valid input', () => {
    expect(parseJournalDateInput('20240229')).toBe('2024-02-29');
    for (const input of ['20260229', '202610', '20261301', '20260132', '2026-01-01', '']) expect(parseJournalDateInput(input)).toBe('');
  });
  it('uses full current and previous weeks, months and years across year boundaries', () => {
    const today = new Date(2026, 0, 1);
    expect(getJournalQuickRange(data(), 'week', today)).toEqual({ startDate: '2025-12-29', endDate: '2026-01-04' });
    expect(getJournalQuickRange(data(), 'lastWeek', today)).toEqual({ startDate: '2025-12-22', endDate: '2025-12-28' });
    expect(getJournalQuickRange(data(), 'month', today)).toEqual({ startDate: '2026-01-01', endDate: '2026-01-31' });
    expect(getJournalQuickRange(data(), 'lastMonth', today)).toEqual({ startDate: '2025-12-01', endDate: '2025-12-31' });
    expect(getJournalQuickRange(data(), 'year', today)).toEqual({ startDate: '2026-01-01', endDate: '2026-12-31' });
    expect(getJournalQuickRange(data(), 'lastYear', today)).toEqual({ startDate: '2025-01-01', endDate: '2025-12-31' });
  });
  it('rejects rolled-over, noncanonical and reversed dates and empty sections', () => {
    for (const startDate of ['2026-02-30', '2026-2-01', '2026-10-19-extra', '']) expect(validateJournalOptions({ ...options, startDate })).toBeTruthy();
    expect(validateJournalOptions({ ...options, startDate: '2026-11-01' })).toContain('晚于');
    expect(validateJournalOptions({ ...options, startDate: '2000-01-01' })).toContain('3660');
    expect(validateJournalOptions({ ...options, sections: [] })).toContain('章节');
  });
  it('includes both ends and handles leap days and year/week boundaries', () => {
    const model = buildJournalModel(data(), { ...options, startDate: '2024-02-28', endDate: '2024-03-01' });
    expect(model.days.map((day) => day.date)).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
    expect(model.months).toEqual(['2024-02', '2024-03']);
    expect(buildJournalModel(data(), { ...options, startDate: '2026-12-31', endDate: '2027-01-01' }).years).toEqual([2026, 2027]);
    expect(buildJournalModel(data(), { ...options, startDate: '9999-12-31', endDate: '9999-12-31' }).days).toHaveLength(1);
  });
});

describe('journal record projection', () => {
  it('merges linked plan logs into a single readable calendar schedule entry', () => {
    const model = buildJournalModel(data({ todos: [{ id: 't', categoryId: 'c', title: '完成作业', isCompleted: false, scheduledDate: '2026-10-19' }], logs: [log('2026-10-19T09:00:00', '2026-10-19T10:00:00', { isPlanned: true, linkedTodoId: 't', title: '完成作业' })] }), options);
    const entries = getJournalDayPlans(model.days[0]);
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('完成作业');
    expect(entries[0].times).toEqual(['09:00–10:00']);
  });
  it('finds all-history dates from reviews and planned occurrences, including future periods', () => {
    expect(getJournalDataRange(data({
      monthlyReviews: [{ monthStartDate: '2020-01-01', monthEndDate: '2020-01-31' }] as never,
      todos: [{ recurrenceRule: { startDate: '2026-10-01', endDate: '2027-02-01' }, maybeDates: ['2027-03-01'] }] as never
    }), new Date(2026, 9, 23))).toEqual({ startDate: '2020-01-01', endDate: '2027-03-01' });
  });
  it('evaluates overnight automatic checks against the previous night', () => {
    const model = buildJournalModel(data({ logs: [log('2026-10-18T23:00:00', '2026-10-18T23:30:00')], dailyReviews: [review('2026-10-19', { checkItems: [{ id: 'sleep', content: '早睡', type: 'auto', isCompleted: false, autoConfig: { filterExpression: '#阅读', comparisonType: 'nightEarliestStart', operator: '<=', targetValue: 23 * 60 } }] })] }), options);
    expect(model.days[0].checks[0].isCompleted).toBe(true);
  });
  it('clips overnight records, includes end-date evenings and excludes adjacent records', () => {
    const model = buildJournalModel(data({ logs: [
      log('2026-10-18T23:00:00', '2026-10-19T01:00:00', { duration: 3600 }),
      log('2026-10-25T23:30:00', '2026-10-26T00:30:00', { id: 'late' }),
      log('2026-10-26T09:00:00', '2026-10-26T10:00:00', { id: 'outside' })
    ] }), options);
    expect(model.days[0].actualSeconds).toBe(1800);
    expect(model.days[6].actualSeconds).toBe(1800);
    expect(model.days.flatMap((day) => day.logs).map((entry) => entry.source.id)).toEqual(['log', 'late']);
  });
  it('splits midnight once and excludes plan blocks from actual totals without losing long notes', () => {
    const note = '跨日记录完整保存。'.repeat(600);
    const source = data({ logs: [log('2026-10-19T23:00:00', '2026-10-20T01:00:00', { note }), log('2026-10-19T12:00:00', '2026-10-19T13:00:00', { id: 'plan', isPlanned: true }), log('2026-10-19T08:00:00', '2026-10-19T08:00:00', { id: 'invalid' })] });
    const before = JSON.stringify(source);
    const model = buildJournalModel(source, options);
    expect(model.days[0].actualSeconds).toBe(3600);
    expect(model.days[1].actualSeconds).toBe(3600);
    expect(model.days[1].logs[0].source.note).toBe(note);
    expect(model.days.flatMap((day) => day.logs)).toHaveLength(3);
    expect(JSON.stringify(source)).toBe(before);
  });
  it('preserves skipped recurring days and single-occurrence completion', () => {
    const task: TodoItem = { id: 'repeat', categoryId: 'todo', title: '每日读书', isCompleted: false, recurrenceRule: { frequency: 'daily', startDate: '2026-10-19', skipDates: ['2026-10-20'] }, occurrenceCompletions: { '2026-10-19': { completedAt: '2026-10-19T09:00:00' } } };
    const model = buildJournalModel(data({ todos: [task] }), options);
    expect(journalTodoStatus(model.days[0].todos[0])).toBe('已完成');
    expect(model.days[1].todos).toHaveLength(0);
    expect(journalTodoStatus(model.days[2].todos[0])).toBe('待办');
    expect(task.isCompleted).toBe(false);
  });
  it('retains missing vs incomplete checks and refreshes counts and automatic completion', () => {
    const source = data({ logs: [log('2026-10-19T09:00:00', '2026-10-19T10:00:00')], dailyReviews: [review('2026-10-19', { checkItems: [
      { id: 'manual', content: '喝水', isCompleted: false },
      { id: 'count', content: '阅读次数', manualMode: 'count', currentCount: 3, targetCount: 2, isCompleted: false },
      { id: 'auto', content: '阅读一小时', type: 'auto', isCompleted: false, autoConfig: { filterExpression: '#阅读', comparisonType: 'duration', operator: '>=', targetValue: 60 } }
    ] })] });
    const model = buildJournalModel(source, options);
    expect(model.days[1].checks).toEqual([]);
    expect(model.days[0].checks.map((item) => item.isCompleted)).toEqual([false, true, true]);
    expect(journalCheckValue(model.days[0].checks[1])).toBe('2/2');
    expect(source.dailyReviews[0].checkItems![2].isCompleted).toBe(false);
  });
  it('includes overlapping review periods and intersects goals without leaking daily reviews', () => {
    const source = data({
      dailyReviews: [review('2026-10-18'), review('2026-10-19')],
      weeklyReviews: [ { id: 'partial', weekStartDate: '2026-10-12', weekEndDate: '2026-10-19', answers: [] }, { id: 'full', weekStartDate: '2026-10-19', weekEndDate: '2026-10-25', answers: [] } ] as never,
      monthlyReviews: [{ id: 'outside', monthStartDate: '2026-10-01', monthEndDate: '2026-10-31', answers: [] }] as never,
      goals: [{ id: 'goal', title: '目标', startDate: '2026-01-01', endDate: '2026-12-31' }, { id: 'old', startDate: '2025-01-01', endDate: '2025-12-31' }] as never
    });
    const model = buildJournalModel(source, options);
    expect(model.weeklyReviews.map((item) => item.id)).toEqual(['partial', 'full']);
    expect(model.monthlyReviews).toHaveLength(1);
    expect(model.goals.map((item) => item.id)).toEqual(['goal']);
    expect(model.days.flatMap((day) => day.review ? [day.review.id] : [])).toEqual(['2026-10-19']);
  });
  it('calculates parent/child goal progress as of the export end and keeps planned/future logs out', () => {
    const source = data({
      logs: [log('2026-10-19T09:00', '2026-10-19T10:00', { id: 'actual', scopeIds: ['s'] }), log('2026-10-26T09:00', '2026-10-26T10:00', { id: 'future', scopeIds: ['s'] }), log('2026-10-20T09:00', '2026-10-20T10:00', { id: 'plan', scopeIds: ['s'], isPlanned: true })],
      goals: [{ id: 'child', majorGoalId: 'parent', title: '子目标', scopeId: 's', metric: 'duration_raw', targetValue: 7200, startDate: '2026-01-01', endDate: '2026-12-31', status: 'active' }],
      majorGoals: [{ id: 'parent', title: '大目标', scopeId: 's', metric: 'duration_raw', targetValue: 14400, startDate: '2026-01-01', endDate: '2026-12-31', status: 'active', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }]
    });
    const model = buildJournalModel(source, options);
    expect(model.goalProgress.child).toEqual({ current: 3600, target: 7200, percentage: 50 });
    expect(model.goalProgress.parent).toEqual({ current: 3600, target: 14400, percentage: 25 });
    expect(source.logs).toHaveLength(3);
  });
  it('does not treat an unanswered review template as a populated daily page', () => {
    const source = data({ dailyReviews: [review('2026-10-19', { answers: [{ questionId: 'q', question: '今天怎么样？', answer: '' }] })] });
    const model = buildJournalModel(source, options);
    expect(model.days[0].hasContent).toBe(false);
  });
});
