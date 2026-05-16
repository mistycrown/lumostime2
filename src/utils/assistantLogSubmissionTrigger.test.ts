import { describe, expect, it, vi } from 'vitest';
import type { Log } from '../types';
import type { AssistantAgentConfig } from '../types/assistant';
import {
  buildAssistantLogSubmissionTrigger,
  buildAssistantLogSubmissionUserMessage,
  isNewLogInsertion,
  matchesAssistantLogSubmissionTrigger,
  upsertLogForAssistantContext
} from './assistantLogSubmissionTrigger';

const baseConfig: AssistantAgentConfig = {
  enabled: true,
  enableRandomCheckin: true,
  basePollMinutes: 5,
  minCheckinMinutes: 30,
  maxCheckinMinutes: 90,
  quietHoursEnabled: false,
  minimumNudgeGapMinutes: 30,
  longTermMemoryEnabled: true,
  logSubmissionTriggerEnabled: true,
  logSubmissionTriggerActivityIds: ['activity-coding']
};

const sampleLog: Log = {
  id: 'log-1',
  categoryId: 'category-work',
  activityId: 'activity-coding',
  startTime: new Date(2026, 4, 16, 14, 10, 0, 0).getTime(),
  endTime: new Date(2026, 4, 16, 14, 55, 0, 0).getTime(),
  duration: 45 * 60,
  linkedTodoId: 'todo-1',
  scopeIds: ['scope-work', 'scope-product'],
  note: '把登录页状态错乱的问题修掉了'
};

describe('assistantLogSubmissionTrigger', () => {
  it('treats only missing previous logs as new insertions', () => {
    expect(isNewLogInsertion(undefined)).toBe(true);
    expect(isNewLogInsertion(null)).toBe(true);
    expect(isNewLogInsertion(sampleLog)).toBe(false);
  });

  it('matches only when the assistant and log trigger are both enabled and the activity is selected', () => {
    expect(matchesAssistantLogSubmissionTrigger(baseConfig, sampleLog)).toBe(true);
    expect(matchesAssistantLogSubmissionTrigger({
      ...baseConfig,
      logSubmissionTriggerEnabled: false
    }, sampleLog)).toBe(false);
    expect(matchesAssistantLogSubmissionTrigger({
      ...baseConfig,
      enabled: false
    }, sampleLog)).toBe(false);
    expect(matchesAssistantLogSubmissionTrigger({
      ...baseConfig,
      logSubmissionTriggerActivityIds: ['other-activity']
    }, sampleLog)).toBe(false);
  });

  it('builds the fixed submitted-log system trigger with todo, scopes, and note context', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-16T15:00:00+08:00'));

    const trigger = buildAssistantLogSubmissionTrigger({
      log: sampleLog,
      categories: [{
        id: 'category-work',
        name: '工作',
        icon: '💼',
        activities: [{
          id: 'activity-coding',
          name: '写代码',
          icon: '💻',
          color: 'bg-blue-500'
        }],
        themeColor: '#000000'
      }],
      scopes: [
        {
          id: 'scope-work',
          name: '工作',
          icon: '💼',
          isArchived: false,
          order: 0,
          themeColor: '#111111'
        },
        {
          id: 'scope-product',
          name: '产品',
          icon: '📦',
          isArchived: false,
          order: 1,
          themeColor: '#222222'
        }
      ],
      todos: [{
        id: 'todo-1',
        title: '修复登录页状态错乱',
        categoryId: 'todo-project',
        isCompleted: false,
        createdAt: '',
        updatedAt: ''
      }]
    });

    expect(trigger.type).toBe('log_submitted');
    expect(trigger.source).toBe('system');
    expect(trigger.metadata).toEqual(expect.objectContaining({
      logId: 'log-1',
      activityId: 'activity-coding',
      linkedTodoId: 'todo-1',
      durationMinutes: 45
    }));
    expect(trigger.text).toContain('System: 用户刚才完成了一条时间记录。');
    expect(trigger.text).toContain('标签：工作 / 写代码');
    expect(trigger.text).toContain('时长：45 分钟');
    expect(trigger.text).toContain('开始：14:10');
    expect(trigger.text).toContain('结束：14:55');
    expect(trigger.text).toContain('关联待办：修复登录页状态错乱');
    expect(trigger.text).toContain('关联领域：工作 / 产品');
    expect(trigger.text).toContain('备注：把登录页状态错乱的问题修掉了');
    expect(trigger.text).toContain('请基于这条新完成记录做出简短反应。');

    vi.useRealTimers();
  });

  it('upserts a just-saved log into temporary assistant context', () => {
    const olderLog: Log = {
      ...sampleLog,
      id: 'log-older',
      startTime: new Date(2026, 4, 16, 9, 0, 0, 0).getTime(),
      endTime: new Date(2026, 4, 16, 9, 30, 0, 0).getTime()
    };

    expect(upsertLogForAssistantContext([olderLog], sampleLog)).toEqual([sampleLog, olderLog]);
    expect(upsertLogForAssistantContext([olderLog, sampleLog], {
      ...sampleLog,
      note: '新备注'
    })[1].note).toBe('新备注');
  });

  it('builds a compact submitted-log user message for chat history', () => {
    const message = buildAssistantLogSubmissionUserMessage(
      sampleLog,
      [{
        id: 'category-work',
        name: '工作',
        icon: '💼',
        activities: [{
          id: 'activity-coding',
          name: '写代码',
          icon: '💻',
          color: 'bg-blue-500'
        }],
        themeColor: '#000000'
      }],
      [
        {
          id: 'scope-work',
          name: '工作',
          icon: '💼',
          isArchived: false,
          order: 0,
          themeColor: '#111111'
        }
      ],
      [{
        id: 'todo-1',
        title: '修复登录页状态错乱',
        categoryId: 'todo-project',
        isCompleted: false,
        createdAt: '',
        updatedAt: ''
      }]
    );

    expect(message).toContain('刚刚完成了 工作 / 写代码，耗时 45 分钟。');
    expect(message).toContain('待办：修复登录页状态错乱');
    expect(message).toContain('领域：工作');
    expect(message).toContain('备注：把登录页状态错乱的问题修掉了');
  });
});
