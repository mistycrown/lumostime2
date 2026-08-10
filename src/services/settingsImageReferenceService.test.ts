import { beforeEach, describe, expect, it } from 'vitest';
import { TIMEPAL_KEYS } from '../constants/storageKeys';
import { getSettingsReferencedImages } from './settingsImageReferenceService';

type LocalStorageMock = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const AI_CHAT_PERSONAS_KEY = 'lumostime_ai_chat_personas_v1';
const AI_CHAT_USER_PROFILE_KEY = 'lumostime_ai_chat_user_profile_v1';
const CUSTOM_BACKGROUND_KEY = 'lumos_custom_backgrounds';
const CUSTOM_NAVIGATION_KEY = 'navigation_decoration_custom_list';

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

describe('getSettingsReferencedImages', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true
    });
  });

  it('keeps TimePal images and AI chat avatars in the protected reference set', () => {
    localStorage.setItem(TIMEPAL_KEYS.CUSTOM_ITEMS, JSON.stringify([
      {
        stageFilenames: ['timepal-stage-1.png', 'timepal-stage-2.png']
      }
    ]));
    localStorage.setItem(AI_CHAT_PERSONAS_KEY, JSON.stringify([
      { avatarImage: 'assistant-avatar.png' },
      { avatarImage: 'assistant-avatar-2.png' },
      { avatarImage: '   ' }
    ]));
    localStorage.setItem(AI_CHAT_USER_PROFILE_KEY, JSON.stringify({
      avatarImage: 'user-avatar.png'
    }));

    expect(Array.from(getSettingsReferencedImages()).sort()).toEqual([
      'assistant-avatar-2.png',
      'assistant-avatar.png',
      'timepal-stage-1.png',
      'timepal-stage-2.png',
      'user-avatar.png'
    ]);
  });

  it('keeps custom background and navigation theme images from being cleaned up', () => {
    localStorage.setItem(CUSTOM_BACKGROUND_KEY, JSON.stringify([
      { imageFilename: 'custom-background.png' }
    ]));
    localStorage.setItem(CUSTOM_NAVIGATION_KEY, JSON.stringify([
      { imageFilename: 'custom-navigation.png' }
    ]));

    expect(Array.from(getSettingsReferencedImages()).sort()).toEqual([
      'custom-background.png',
      'custom-navigation.png',
      'thumb_custom-background.png',
      'thumb_custom-navigation.png'
    ]);
  });
});
