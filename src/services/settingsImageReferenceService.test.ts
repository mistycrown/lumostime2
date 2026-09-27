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
const CUSTOM_NAVIGATION_ICON_KEY = 'navigation_icon_custom_list_v1';
const CUSTOM_MOOD_CALENDAR_FILL_BACKGROUND_KEY = 'mood_calendar_fill_background_custom_list';

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
    localStorage.setItem(CUSTOM_NAVIGATION_ICON_KEY, JSON.stringify([
      { imageFilename: 'custom-navigation-icon.webp' }
    ]));
    localStorage.setItem(CUSTOM_MOOD_CALENDAR_FILL_BACKGROUND_KEY, JSON.stringify([
      { imageFilename: 'custom-mood-calendar-fill.png' }
    ]));

    expect(Array.from(getSettingsReferencedImages()).sort()).toEqual([
      'custom-background.png',
      'custom-mood-calendar-fill.png',
      'custom-navigation-icon.webp',
      'custom-navigation.png',
      'thumb_custom-background.png',
      'thumb_custom-mood-calendar-fill.png',
      'thumb_custom-navigation-icon.webp',
      'thumb_custom-navigation.png'
    ]);
  });

  it('keeps imported theme package images and thumbnails protected', () => {
    localStorage.setItem('lumostime_theme_packages_v1', JSON.stringify([
      {
        imageAssets: {
          'assets/background/main.webp': 'theme-background.webp',
          'assets/stickers/moon/001.webp': 'theme-sticker.webp'
        }
      }
    ]));

    expect(Array.from(getSettingsReferencedImages()).sort()).toEqual([
      'theme-background.webp',
      'theme-sticker.webp',
      'thumb_theme-background.webp',
      'thumb_theme-sticker.webp'
    ]);
  });

  it('keeps named custom achievement icon-pack images and thumbnails protected', () => {
    localStorage.setItem('lumostime_achievement_bottle_custom_icon_packs_v1', JSON.stringify({
      'custom-comet': {
        name: 'Comet Pack',
        filenames: ['frame-1.png', 'frame-2.webp']
      }
    }));

    expect(Array.from(getSettingsReferencedImages()).sort()).toEqual([
      'frame-1.png',
      'frame-2.webp',
      'thumb_frame-1.png',
      'thumb_frame-2.webp'
    ]);
  });

  it('keeps custom card-background group images and thumbnails', () => {
    localStorage.setItem('lumostime_card_background_groups_v1', JSON.stringify([
      { imageFilenames: ['card-background-1.webp', 'card-background-2.png'] }
    ]));

    expect(Array.from(getSettingsReferencedImages()).sort()).toEqual([
      'card-background-1.webp',
      'card-background-2.png',
      'thumb_card-background-1.webp',
      'thumb_card-background-2.png'
    ]);
  });

  it('continues to read legacy achievement icon-pack filename arrays', () => {
    localStorage.setItem('lumostime_achievement_bottle_custom_icon_packs_v1', JSON.stringify({
      legacy: ['legacy-frame.png']
    }));

    expect(Array.from(getSettingsReferencedImages()).sort()).toEqual([
      'legacy-frame.png',
      'thumb_legacy-frame.png'
    ]);
  });
});
