/**
 * @file assistantMemoryService.ts
 * @input Local storage state plus optional assistant memory patches and decision summaries
 * @output Persistent structured assistant memory snapshots
 * @pos Service (Assistant Memory)
 * @description Stores and updates the Android-first assistant agent's structured memory so background turns can rely on compact durable state instead of replaying unbounded chat history.
 *
 * @updated 2026-04-27: Accepted malformed single-string memory patch fields such as recentDecisions so foreground/background turns do not silently lose durable memory writes when model output drifts from the exact schema.
 * @updated 2026-04-27: Collapsed recent decision memory down to the latest single summary so the assistant keeps only the newest behavior snapshot.
 * @updated 2026-04-26: Removed an unused long-term-memory normalization and merge path from assistant memory persistence.
 * @updated 2026-04-26: Added narrow helpers for manually appending and removing profile/preference memory entries so the long-term-memory viewer can manage user-maintained notes without owning persistence logic.
 * @updated 2026-04-26: Fixed active-reminder replacement so completed background reminders are truly removed from memory instead of being merged back in.
 * @updated 2026-04-26: Added structured assistant memory persistence, patch application, and decision-summary helpers for the new background AI agent.
 */

import type {
  AssistantEditableMemoryListKey,
  AssistantMemory,
  AssistantMemoryPatch,
  AssistantReminder
} from '../types/assistant';

const ASSISTANT_MEMORY_KEY = 'lumostime_assistant_memory_v1';

const MAX_MEMORY_ITEMS = 24;
const MAX_DECISIONS = 1;

const normalizeStringArray = (value: unknown, limit = MAX_MEMORY_ITEMS): string[] => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed].slice(0, limit) : [];
  }

  return (
    Array.isArray(value)
      ? value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
        .slice(0, limit)
      : []
  );
};

const normalizeLatestDecisionArray = (value: unknown): string[] => {
  const normalized = normalizeStringArray(value, MAX_MEMORY_ITEMS);
  return normalized.length > 0 ? [normalized[normalized.length - 1]] : [];
};

const normalizeReminder = (value: unknown): AssistantReminder | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<AssistantReminder>;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const type = typeof candidate.type === 'string' ? candidate.type.trim() : '';
  const dueAt = typeof candidate.dueAt === 'string' ? candidate.dueAt.trim() : '';
  const status = typeof candidate.status === 'string' ? candidate.status.trim() : '';
  const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
  const source = typeof candidate.source === 'string' ? candidate.source.trim() : '';
  const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt.trim() : '';

  if (!id || !type || !dueAt || !status || !text || !source || !createdAt) {
    return null;
  }

  return {
    id,
    type: candidate.type!,
    dueAt,
    status: candidate.status!,
    text,
    ...(typeof candidate.todoId === 'string' && candidate.todoId.trim() ? { todoId: candidate.todoId.trim() } : {}),
    source: candidate.source!,
    createdAt
  };
};

const createDefaultMemory = (): AssistantMemory => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  profileMemory: [],
  preferenceMemory: [],
  activeReminders: [],
  recentDecisions: []
});

const normalizeMemory = (value: unknown): AssistantMemory => {
  if (!value || typeof value !== 'object') {
    return createDefaultMemory();
  }

  const candidate = value as Partial<AssistantMemory>;

  return {
    version: 1,
    updatedAt: typeof candidate.updatedAt === 'string' && candidate.updatedAt.trim()
      ? candidate.updatedAt.trim()
      : new Date().toISOString(),
    profileMemory: normalizeStringArray(candidate.profileMemory),
    preferenceMemory: normalizeStringArray(candidate.preferenceMemory),
    ...(typeof candidate.lastKnownState === 'string' && candidate.lastKnownState.trim()
      ? { lastKnownState: candidate.lastKnownState.trim() }
      : {}),
    ...(typeof candidate.workingMemorySummary === 'string' && candidate.workingMemorySummary.trim()
      ? { workingMemorySummary: candidate.workingMemorySummary.trim() }
      : {}),
    activeReminders: Array.isArray(candidate.activeReminders)
      ? candidate.activeReminders.map(normalizeReminder).filter((item): item is AssistantReminder => Boolean(item))
      : [],
    recentDecisions: normalizeLatestDecisionArray(candidate.recentDecisions),
    ...(typeof candidate.lastAgentRunAt === 'string' && candidate.lastAgentRunAt.trim()
      ? { lastAgentRunAt: candidate.lastAgentRunAt.trim() }
      : {})
  };
};

const dedupeStrings = (items: string[], limit = MAX_MEMORY_ITEMS): string[] => {
  const seen = new Set<string>();
  const next: string[] = [];

  items.forEach((item) => {
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    next.push(normalized);
  });

  return next.slice(0, limit);
};

const mergeReminders = (
  current: AssistantReminder[],
  patch: AssistantReminder[] | undefined
): AssistantReminder[] => {
  if (!patch) {
    return current;
  }

  const nextMap = new Map<string, AssistantReminder>();
  current.forEach((reminder) => nextMap.set(reminder.id, reminder));
  patch.forEach((reminder) => {
    const normalized = normalizeReminder(reminder);
    if (!normalized) {
      return;
    }
    nextMap.set(normalized.id, normalized);
  });
  return Array.from(nextMap.values())
    .sort((left, right) => left.dueAt.localeCompare(right.dueAt))
    .slice(0, MAX_MEMORY_ITEMS);
};

const normalizeReminderList = (value: unknown): AssistantReminder[] => (
  Array.isArray(value)
    ? value
      .map(normalizeReminder)
      .filter((item): item is AssistantReminder => Boolean(item))
      .sort((left, right) => left.dueAt.localeCompare(right.dueAt))
      .slice(0, MAX_MEMORY_ITEMS)
    : []
);

const safeParseJson = <T>(raw: string | null, fallback: T): T => {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error('[assistantMemoryService] Failed to parse assistant memory JSON', error);
    return fallback;
  }
};

export const assistantMemoryService = {
  getStorageKey(): string {
    return ASSISTANT_MEMORY_KEY;
  },

  getMemory(): AssistantMemory {
    return normalizeMemory(safeParseJson<unknown>(localStorage.getItem(ASSISTANT_MEMORY_KEY), null));
  },

  saveMemory(memory: AssistantMemory): AssistantMemory {
    const normalized = normalizeMemory(memory);
    const next = {
      ...normalized,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(ASSISTANT_MEMORY_KEY, JSON.stringify(next));
    return next;
  },

  applyPatch(patch: AssistantMemoryPatch): AssistantMemory {
    const current = assistantMemoryService.getMemory();
    const next: AssistantMemory = {
      ...current,
      updatedAt: new Date().toISOString(),
      profileMemory: patch.profileMemory
        ? dedupeStrings([...current.profileMemory, ...normalizeStringArray(patch.profileMemory)])
        : current.profileMemory,
      preferenceMemory: patch.preferenceMemory
        ? dedupeStrings([...current.preferenceMemory, ...normalizeStringArray(patch.preferenceMemory)])
        : current.preferenceMemory,
      activeReminders: mergeReminders(current.activeReminders, patch.activeReminders),
      recentDecisions: patch.recentDecisions
        ? normalizeLatestDecisionArray(patch.recentDecisions)
        : current.recentDecisions
    };

    if (patch.lastKnownState === null) {
      delete next.lastKnownState;
    } else if (typeof patch.lastKnownState === 'string' && patch.lastKnownState.trim()) {
      next.lastKnownState = patch.lastKnownState.trim();
    }

    if (patch.workingMemorySummary === null) {
      delete next.workingMemorySummary;
    } else if (typeof patch.workingMemorySummary === 'string' && patch.workingMemorySummary.trim()) {
      next.workingMemorySummary = patch.workingMemorySummary.trim();
    }

    if (patch.lastAgentRunAt === null) {
      delete next.lastAgentRunAt;
    } else if (typeof patch.lastAgentRunAt === 'string' && patch.lastAgentRunAt.trim()) {
      next.lastAgentRunAt = patch.lastAgentRunAt.trim();
    }

    return assistantMemoryService.saveMemory(next);
  },

  replaceActiveReminders(reminders: AssistantReminder[]): AssistantMemory {
    const current = assistantMemoryService.getMemory();
    return assistantMemoryService.saveMemory({
      ...current,
      activeReminders: normalizeReminderList(reminders)
    });
  },

  appendEditableListEntry(key: AssistantEditableMemoryListKey, value: string): AssistantMemory {
    const trimmed = value.trim();
    if (!trimmed) {
      return assistantMemoryService.getMemory();
    }

    return assistantMemoryService.applyPatch({
      [key]: [trimmed]
    } as AssistantMemoryPatch);
  },

  removeEditableListEntry(key: AssistantEditableMemoryListKey, value: string): AssistantMemory {
    const trimmed = value.trim();
    if (!trimmed) {
      return assistantMemoryService.getMemory();
    }

    const current = assistantMemoryService.getMemory();
    const nextList = current[key].filter((item) => item !== trimmed);
    if (nextList.length === current[key].length) {
      return current;
    }

    return assistantMemoryService.saveMemory({
      ...current,
      [key]: nextList
    });
  },

  appendDecisionSummary(summary: string): AssistantMemory {
    const trimmed = summary.trim();
    if (!trimmed) {
      return assistantMemoryService.getMemory();
    }

    return assistantMemoryService.applyPatch({
      recentDecisions: [trimmed],
      lastAgentRunAt: new Date().toISOString()
    });
  },

  clearMemory(): void {
    localStorage.removeItem(ASSISTANT_MEMORY_KEY);
  }
};
