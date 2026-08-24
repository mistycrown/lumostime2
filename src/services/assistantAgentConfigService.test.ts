import { beforeEach, describe, expect, it } from 'vitest';
import { assistantAgentConfigService } from './assistantAgentConfigService';

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

describe('assistantAgentConfigService', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true
    });
  });

  it('returns defaults for the new log-submission trigger config and letter config', () => {
    expect(assistantAgentConfigService.getConfig()).toEqual(expect.objectContaining({
      logSubmissionTriggerEnabled: false,
      logSubmissionTriggerActivityIds: [],
      letterEnabled: false,
      letterFrequencyDays: 2
    }));
  });

  it('normalizes persisted log-submission trigger values', () => {
    localStorage.setItem(assistantAgentConfigService.getStorageKey(), JSON.stringify({
      enabled: true,
      enableRandomCheckin: true,
      basePollMinutes: 5,
      minCheckinMinutes: 20,
      maxCheckinMinutes: 60,
      quietHoursEnabled: false,
      minimumNudgeGapMinutes: 30,
      longTermMemoryEnabled: true,
      logSubmissionTriggerEnabled: true,
      logSubmissionTriggerActivityIds: [' coding ', '', 'coding', 123, 'reading'],
      letterEnabled: true,
      letterFrequencyDays: 0,
      letterWindowStart: '20:00',
      letterWindowEnd: '2200',
      nextLetterAt: '2026-07-04T12:00:00+08:00',
      lastLetterSentAt: 'invalid',
      lastLetterScheduledAt: '2026-07-06T20:30:00+08:00'
    }));

    expect(assistantAgentConfigService.getConfig()).toEqual(expect.objectContaining({
      logSubmissionTriggerEnabled: true,
      logSubmissionTriggerActivityIds: ['coding', 'reading'],
      letterEnabled: true,
      letterFrequencyDays: 1,
      letterWindowStart: '2000',
      letterWindowEnd: '2200',
      nextLetterAt: '2026-07-04T04:00:00.000Z',
      lastLetterScheduledAt: '2026-07-06T12:30:00.000Z'
    }));
  });

  it('persists new log-submission trigger updates alongside existing config and letter config', () => {
    const saved = assistantAgentConfigService.saveConfig({
      enabled: true,
      logSubmissionTriggerEnabled: true,
      logSubmissionTriggerActivityIds: ['writing', 'review'],
      letterEnabled: true,
      letterFrequencyDays: 3,
      letterWindowStart: '2000',
      letterWindowEnd: '2200'
    });

    expect(saved).toEqual(expect.objectContaining({
      enabled: true,
      logSubmissionTriggerEnabled: true,
      logSubmissionTriggerActivityIds: ['writing', 'review'],
      letterEnabled: true,
      letterFrequencyDays: 3,
      letterWindowStart: '2000',
      letterWindowEnd: '2200'
    }));
    expect(assistantAgentConfigService.getConfig()).toEqual(expect.objectContaining({
      enabled: true,
      logSubmissionTriggerEnabled: true,
      logSubmissionTriggerActivityIds: ['writing', 'review'],
      letterEnabled: true,
      letterFrequencyDays: 3,
      letterWindowStart: '2000',
      letterWindowEnd: '2200'
    }));
  });

  it('removes the cached next letter time when letters are disabled', () => {
    assistantAgentConfigService.saveConfig({
      letterEnabled: true,
      letterFrequencyDays: 2,
      letterWindowStart: '2000',
      letterWindowEnd: '2200',
      nextLetterAt: '2026-08-24T12:00:00.000Z'
    });

    const saved = assistantAgentConfigService.saveConfig({
      letterEnabled: false,
      nextLetterAt: undefined
    });

    expect(saved.letterEnabled).toBe(false);
    expect(saved.nextLetterAt).toBeUndefined();
    expect(assistantAgentConfigService.getConfig().nextLetterAt).toBeUndefined();
  });
});
