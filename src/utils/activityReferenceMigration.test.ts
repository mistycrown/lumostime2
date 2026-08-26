import { describe, expect, it } from 'vitest';
import { migrateActivityReferences } from './activityReferenceMigration';
import type { ActivityReferenceMigrationInput } from './activityReferenceMigration';

const buildInput = (): ActivityReferenceMigrationInput => ({
  logs: [{ id: 'log-1', activityId: 'old', categoryId: 'old-cat', startTime: 1, endTime: 2, duration: 1 }],
  todos: [{ id: 'todo-1', categoryId: 'todo-cat', title: 'Todo', isCompleted: false, linkedActivityId: 'old', linkedCategoryId: 'old-cat' }],
  activeSessions: [{ id: 'session-1', activityId: 'old', categoryId: 'old-cat', activityName: 'Old', activityIcon: 'O', startTime: 1, appAwarenessMeta: { sourceAppPackage: 'com.example.app', sourceAppName: 'Example', workflowTemplateId: 'template-1', workflowTemplateName: 'Template', answers: { activity: { categoryId: 'old-cat', activityId: 'old', label: 'Old' } } } }],
  autoLinkRules: [{ id: 'rule-1', activityId: 'old', scopeId: 'scope-1' }],
  appRules: { 'com.example.app': 'old' },
  appAwarenessTemplates: [{
    id: 'template-1', name: 'Template', isPreset: false, enabled: true, createdAt: 1, updatedAt: 1,
    steps: [{ id: 'step-1', type: 'start_record', title: 'Start', answerKey: 'activity', activityOptions: [{ id: 'option-1', categoryId: 'old-cat', activityId: 'old', label: 'Old' }] }]
  }],
  appAwarenessActiveRun: null,
  achievementRules: [{ id: 'achievement-1', name: 'Rule', enabled: true, effectType: 'earn', targetType: 'activity', targetIds: ['old', 'new'], unitAmount: 1, deltaPerUnit: 1, roundingMode: 'floor', createdAt: 1, updatedAt: 1 }, { id: 'achievement-2', name: 'Filter', enabled: true, effectType: 'earn', targetType: 'filterDuration', targetIds: [], filterExpression: '#Old', unitAmount: 1, deltaPerUnit: 1, roundingMode: 'floor', createdAt: 1, updatedAt: 1 }],
  sceneState: { version: 1, switchMode: 'manual', activeGroupId: 'group-1', groups: [{ id: 'group-1', name: 'Group', timeSlots: [{ id: 'slot-1', name: 'Slot', icon: 'S', startTime: '09:00', endTime: '10:00', cards: [{ id: 'card-1', type: 'timer', title: 'Old', action: { type: 'startTimer', activityId: 'old', categoryId: 'old-cat' } }] }] }] },
  widgetTemplates: [{ id: 'widget-1', name: 'Widget', size: '2x2', slots: [{ slotIndex: 0, slotType: 'timer', activityId: 'old', categoryId: 'old-cat', icon: 'O', label: 'Old', color: '' }], createdAt: 1, updatedAt: 1 }],
  memoirFilterConfig: { hasImage: false, minNoteLength: 0, relatedTagIds: ['old', 'new'], relatedScopeIds: [] },
  filters: [{ id: 'filter-1', name: 'Filter', filterExpression: '#Old', createdAt: 1 }],
  goals: [{ id: 'goal-1', title: 'Goal', scopeId: 'scope-1', metric: 'duration_raw', targetValue: 1, startDate: '2026-01-01', endDate: '2026-12-31', filterActivityIds: ['old', 'new'], status: 'active' }],
  majorGoals: [],
  timePalFilterActivityIds: ['old', 'new']
});

describe('migrateActivityReferences', () => {
  it('migrates scalar references and synchronizes the replacement category', () => {
    const result = migrateActivityReferences(buildInput(), 'old', 'new', 'new-cat', 'Old', 'New');

    expect(result.logs[0]).toMatchObject({ activityId: 'new', categoryId: 'new-cat' });
    expect(result.todos[0]).toMatchObject({ linkedActivityId: 'new', linkedCategoryId: 'new-cat' });
    expect(result.activeSessions[0]).toMatchObject({ activityId: 'new', categoryId: 'new-cat' });
    expect((result.activeSessions[0].appAwarenessMeta?.answers.activity as any).activityId).toBe('new');
    expect(result.appRules['com.example.app']).toBe('new');
    expect(result.appAwarenessTemplates[0].steps[0]).toMatchObject({ type: 'start_record' });
    expect((result.appAwarenessTemplates[0].steps[0] as any).activityOptions[0]).toMatchObject({ activityId: 'new', categoryId: 'new-cat' });
  });

  it('deduplicates array references and migrates scenes, widgets, and memoir filters', () => {
    const result = migrateActivityReferences(buildInput(), 'old', 'new', 'new-cat', 'Old', 'New');

    expect(result.achievementRules[0].targetIds).toEqual(['new']);
    expect(result.achievementRules[1].filterExpression).toBe('#New');
    expect(result.memoirFilterConfig.relatedTagIds).toEqual(['new']);
    expect(result.filters[0].filterExpression).toBe('#New');
    expect(result.sceneState?.groups[0].timeSlots[0].cards[0].action).toMatchObject({ activityId: 'new', categoryId: 'new-cat' });
    expect(result.widgetTemplates?.[0].slots[0]).toMatchObject({ activityId: 'new', categoryId: 'new-cat' });
    expect(result.goals[0].filterActivityIds).toEqual(['new']);
    expect(result.timePalFilterActivityIds).toEqual(['new']);
  });
});
