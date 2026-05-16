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

  it('returns defaults for the new log-submission trigger config', () => {
    expect(assistantAgentConfigService.getConfig()).toEqual(expect.objectContaining({
      logSubmissionTriggerEnabled: false,
      logSubmissionTriggerActivityIds: []
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
      logSubmissionTriggerActivityIds: [' coding ', '', 'coding', 123, 'reading']
    }));

    expect(assistantAgentConfigService.getConfig()).toEqual(expect.objectContaining({
      logSubmissionTriggerEnabled: true,
      logSubmissionTriggerActivityIds: ['coding', 'reading']
    }));
  });

  it('persists new log-submission trigger updates alongside existing config', () => {
    const saved = assistantAgentConfigService.saveConfig({
      enabled: true,
      logSubmissionTriggerEnabled: true,
      logSubmissionTriggerActivityIds: ['writing', 'review']
    });

    expect(saved).toEqual(expect.objectContaining({
      enabled: true,
      logSubmissionTriggerEnabled: true,
      logSubmissionTriggerActivityIds: ['writing', 'review']
    }));
    expect(assistantAgentConfigService.getConfig()).toEqual(expect.objectContaining({
      enabled: true,
      logSubmissionTriggerEnabled: true,
      logSubmissionTriggerActivityIds: ['writing', 'review']
    }));
  });
});
