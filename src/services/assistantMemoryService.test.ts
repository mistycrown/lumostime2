import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assistantMemoryService } from './assistantMemoryService';

type LocalStorageMock = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const createLocalStorageMock = (): LocalStorageMock => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    }
  };
};

const reminderA = {
  id: 'reminder-a',
  type: 'self_followup' as const,
  dueAt: '2026-04-26T03:30:00.000Z',
  status: 'pending' as const,
  text: '收衣服',
  source: 'user' as const,
  createdAt: '2026-04-26T03:25:00.000Z'
};

const reminderB = {
  id: 'reminder-b',
  type: 'self_followup' as const,
  dueAt: '2026-04-26T04:00:00.000Z',
  status: 'pending' as const,
  text: '关窗',
  source: 'agent' as const,
  createdAt: '2026-04-26T03:40:00.000Z'
};

describe('assistantMemoryService', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true
    });
    vi.useRealTimers();
    assistantMemoryService.clearMemory();
  });

  it('replaceActiveReminders truly clears completed reminders', () => {
    assistantMemoryService.replaceActiveReminders([reminderA, reminderB]);
    expect(assistantMemoryService.getMemory().activeReminders).toHaveLength(2);

    assistantMemoryService.replaceActiveReminders([]);

    expect(assistantMemoryService.getMemory().activeReminders).toEqual([]);
  });

  it('replaceActiveReminders overwrites old reminder ids instead of merging stale entries', () => {
    assistantMemoryService.replaceActiveReminders([reminderA, reminderB]);
    assistantMemoryService.replaceActiveReminders([reminderB]);

    expect(assistantMemoryService.getMemory().activeReminders).toEqual([reminderB]);
  });

  it('appendEditableListEntry adds profile memory once and trims whitespace', () => {
    assistantMemoryService.appendEditableListEntry('profileMemory', '  用户正在准备论文答辩  ');
    assistantMemoryService.appendEditableListEntry('profileMemory', '用户正在准备论文答辩');

    expect(assistantMemoryService.getMemory().profileMemory).toEqual(['用户正在准备论文答辩']);
  });

  it('appendEditableListEntry keeps preference memory isolated from profile memory', () => {
    assistantMemoryService.appendEditableListEntry('preferenceMemory', '喜欢简短提醒');

    const memory = assistantMemoryService.getMemory();
    expect(memory.preferenceMemory).toEqual(['喜欢简短提醒']);
    expect(memory.profileMemory).toEqual([]);
  });

  it('removeEditableListEntry deletes only the targeted editable memory entry', () => {
    assistantMemoryService.appendEditableListEntry('profileMemory', '用户在准备作品集');
    assistantMemoryService.appendEditableListEntry('profileMemory', '用户最近在搬家');
    assistantMemoryService.appendEditableListEntry('preferenceMemory', '偏好先做一小步');

    assistantMemoryService.removeEditableListEntry('profileMemory', '用户在准备作品集');

    const memory = assistantMemoryService.getMemory();
    expect(memory.profileMemory).toEqual(['用户最近在搬家']);
    expect(memory.preferenceMemory).toEqual(['偏好先做一小步']);
  });

  it('removeEditableListEntry ignores missing values', () => {
    assistantMemoryService.appendEditableListEntry('profileMemory', '用户固定周三开组会');

    assistantMemoryService.removeEditableListEntry('profileMemory', '不存在的记忆');

    expect(assistantMemoryService.getMemory().profileMemory).toEqual(['用户固定周三开组会']);
  });
  it('appendDecisionSummary stores the latest readable summary only', () => {
    assistantMemoryService.appendDecisionSummary('这次先不打扰：当前状态还比较清晰。');
    assistantMemoryService.appendDecisionSummary('这次先不打扰：后续关注已经安排好了。');

    expect(assistantMemoryService.getMemory().recentDecisions).toEqual([
      '这次先不打扰：后续关注已经安排好了。'
    ]);
  });
});
