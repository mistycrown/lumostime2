/**
 * @file assistantLetterService.ts
 * @input Local assistant-letter payloads and backup-restore snapshots
 * @output Persistent assistant-letter records with list/get/save/delete helpers
 * @pos Service (Assistant Letter)
 * @description Stores scheduled AI letter records in a standalone local key so they can be browsed, deleted, and synced through the unified AI backup payload without mixing with ordinary chat messages.
 *
 * @updated 2026-07-04: Added the first standalone assistant-letter storage service for scheduled AI companion letters.
 */

import type { AssistantLetter } from '../types/assistant';
import { notifyAIBackupDataChanged } from '../utils/aiBackupChange';
import { normalizeAssistantDateTime, parseAssistantDateTime } from '../utils/assistantTime';

const ASSISTANT_LETTERS_KEY = 'lumostime_assistant_letters_v1';

const safeParseJson = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error('[assistantLetterService] Failed to parse JSON', error);
    return fallback;
  }
};

const normalizeLetter = (value: unknown): AssistantLetter | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<AssistantLetter>;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const preview = typeof candidate.preview === 'string' ? candidate.preview.trim() : '';
  const content = typeof candidate.content === 'string' ? candidate.content.trim() : '';
  const personaId = typeof candidate.personaId === 'string' ? candidate.personaId.trim() : '';
  const personaName = typeof candidate.personaName === 'string' ? candidate.personaName.trim() : '';
  const scheduledFor = normalizeAssistantDateTime(candidate.scheduledFor);
  const sentAt = normalizeAssistantDateTime(candidate.sentAt);
  const createdAt = normalizeAssistantDateTime(candidate.createdAt);
  const sourceTriggerId = typeof candidate.sourceTriggerId === 'string' && candidate.sourceTriggerId.trim()
    ? candidate.sourceTriggerId.trim()
    : undefined;

  if (!id || !title || !preview || !content || !personaId || !personaName || !scheduledFor || !sentAt || !createdAt) {
    return null;
  }

  return {
    id,
    title,
    preview,
    content,
    personaId,
    personaName,
    scheduledFor,
    sentAt,
    createdAt,
    ...(sourceTriggerId ? { sourceTriggerId } : {}),
    status: 'sent'
  };
};

const sortLetters = (letters: AssistantLetter[]): AssistantLetter[] => (
  [...letters].sort((left, right) => {
    const rightMs = parseAssistantDateTime(right.sentAt);
    const leftMs = parseAssistantDateTime(left.sentAt);
    if (Number.isFinite(rightMs) && Number.isFinite(leftMs) && rightMs !== leftMs) {
      return rightMs - leftMs;
    }

    return right.createdAt.localeCompare(left.createdAt);
  })
);

const loadLetters = (): AssistantLetter[] => (
  sortLetters(
    safeParseJson<unknown[]>(localStorage.getItem(ASSISTANT_LETTERS_KEY), [])
      .map(normalizeLetter)
      .filter((letter): letter is AssistantLetter => Boolean(letter))
  )
);

const saveLetters = (letters: AssistantLetter[]): AssistantLetter[] => {
  const normalized = sortLetters(
    letters
      .map((letter) => normalizeLetter(letter))
      .filter((letter): letter is AssistantLetter => Boolean(letter))
  );
  localStorage.setItem(ASSISTANT_LETTERS_KEY, JSON.stringify(normalized));
  notifyAIBackupDataChanged();
  return normalized;
};

export const assistantLetterService = {
  getStorageKey(): string {
    return ASSISTANT_LETTERS_KEY;
  },

  listLetters(): AssistantLetter[] {
    return loadLetters();
  },

  getLetter(letterId: string): AssistantLetter | null {
    const normalizedId = letterId.trim();
    if (!normalizedId) {
      return null;
    }

    return loadLetters().find((letter) => letter.id === normalizedId) || null;
  },

  saveLetter(letter: AssistantLetter): AssistantLetter[] {
    const normalized = normalizeLetter(letter);
    if (!normalized) {
      return loadLetters();
    }

    const current = loadLetters();
    const next = current.some((item) => item.id === normalized.id)
      ? current.map((item) => item.id === normalized.id ? normalized : item)
      : [normalized, ...current];
    return saveLetters(next);
  },

  deleteLetter(letterId: string): AssistantLetter[] {
    const normalizedId = letterId.trim();
    if (!normalizedId) {
      return loadLetters();
    }

    return saveLetters(loadLetters().filter((letter) => letter.id !== normalizedId));
  },

  replaceLetters(letters: AssistantLetter[]): AssistantLetter[] {
    return saveLetters(letters);
  },

  clearLetters(): void {
    localStorage.removeItem(ASSISTANT_LETTERS_KEY);
    notifyAIBackupDataChanged();
  }
};
