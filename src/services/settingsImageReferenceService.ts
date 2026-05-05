/**
 * @file settingsImageReferenceService.ts
 * @input Local settings data stored in localStorage
 * @output Referenced image filenames used by settings features
 * @pos Service (Image Management)
 * @description Collects persisted settings-level image filenames so cleanup and sync manifest rebuild can keep user-owned assets.
 * @updated 2026-05-05: Added AI assistant persona and AI user avatar images to the protected settings reference set.
 */

import { TIMEPAL_KEYS, storage } from '../constants/storageKeys';

const AI_CHAT_PERSONAS_KEY = 'lumostime_ai_chat_personas_v1';
const AI_CHAT_USER_PROFILE_KEY = 'lumostime_ai_chat_user_profile_v1';

interface StoredCustomTimePalItem {
  stageFilenames?: unknown;
}

interface StoredAIChatPersona {
  avatarImage?: unknown;
}

interface StoredAIChatUserProfile {
  avatarImage?: unknown;
}

const isValidFilename = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0
);

const readRawJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`[settingsImageReferenceService] Failed to parse localStorage key "${key}"`, error);
    return fallback;
  }
};

export const getSettingsReferencedImages = (): Set<string> => {
  const referencedImages = new Set<string>();
  const customTimePalItems = storage.getJSON<StoredCustomTimePalItem[]>(TIMEPAL_KEYS.CUSTOM_ITEMS, []);
  const aiChatPersonas = readRawJson<StoredAIChatPersona[]>(AI_CHAT_PERSONAS_KEY, []);
  const aiChatUserProfile = readRawJson<StoredAIChatUserProfile | null>(AI_CHAT_USER_PROFILE_KEY, null);

  if (Array.isArray(customTimePalItems)) {
    customTimePalItems.forEach((item) => {
      if (!Array.isArray(item?.stageFilenames)) {
        return;
      }

      item.stageFilenames.forEach((filename) => {
        if (isValidFilename(filename)) {
          referencedImages.add(filename);
        }
      });
    });
  }

  if (Array.isArray(aiChatPersonas)) {
    aiChatPersonas.forEach((persona) => {
      if (isValidFilename(persona?.avatarImage)) {
        referencedImages.add(persona.avatarImage);
      }
    });
  }

  if (isValidFilename(aiChatUserProfile?.avatarImage)) {
    referencedImages.add(aiChatUserProfile.avatarImage);
  }

  return referencedImages;
};
