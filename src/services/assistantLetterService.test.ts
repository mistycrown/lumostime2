import { beforeEach, describe, expect, it } from 'vitest';
import type { AssistantLetter } from '../types/assistant';
import { assistantLetterService } from './assistantLetterService';

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

const buildLetter = (overrides?: Partial<AssistantLetter>): AssistantLetter => ({
  id: 'letter-1',
  title: '晚安来信',
  preview: '今晚想给你留一封短短的信。',
  content: '正文',
  personaId: 'persona-1',
  personaName: '半两',
  scheduledFor: '2026-07-06T12:30:00.000Z',
  sentAt: '2026-07-06T12:42:00.000Z',
  createdAt: '2026-07-06T12:42:00.000Z',
  status: 'sent',
  ...overrides
});

describe('assistantLetterService', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true
    });
  });

  it('saves and lists letters in reverse sent order', () => {
    assistantLetterService.saveLetter(buildLetter({
      id: 'letter-older',
      sentAt: '2026-07-05T12:42:00.000Z',
      createdAt: '2026-07-05T12:42:00.000Z'
    }));
    assistantLetterService.saveLetter(buildLetter({
      id: 'letter-newer',
      sentAt: '2026-07-06T12:42:00.000Z',
      createdAt: '2026-07-06T12:42:00.000Z'
    }));

    expect(assistantLetterService.listLetters().map((item) => item.id)).toEqual([
      'letter-newer',
      'letter-older'
    ]);
  });

  it('gets and deletes letters by id', () => {
    assistantLetterService.saveLetter(buildLetter());

    expect(assistantLetterService.getLetter('letter-1')).toEqual(expect.objectContaining({
      id: 'letter-1',
      title: '晚安来信'
    }));

    assistantLetterService.deleteLetter('letter-1');
    expect(assistantLetterService.getLetter('letter-1')).toBeNull();
    expect(assistantLetterService.listLetters()).toEqual([]);
  });

  it('normalizes replaced backup letters and drops invalid entries', () => {
    assistantLetterService.replaceLetters([
      buildLetter(),
      {
        id: 'bad-letter',
        title: '',
        preview: 'x'
      } as any
    ]);

    expect(assistantLetterService.listLetters()).toHaveLength(1);
    expect(assistantLetterService.listLetters()[0].id).toBe('letter-1');
  });
});
