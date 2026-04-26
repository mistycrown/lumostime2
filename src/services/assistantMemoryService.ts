/**
 * @file assistantMemoryService.ts
 * @input Local storage state plus optional assistant memory patches and decision summaries
 * @output Persistent structured assistant memory snapshots
 * @pos Service (Assistant Memory)
 * @description Stores and updates the Android-first assistant agent's structured memory so background turns can rely on compact durable state instead of replaying unbounded chat history.
 *
 * @updated 2026-04-26: Fixed active-reminder replacement so completed background reminders are truly removed from memory instead of being merged back in.
 * @updated 2026-04-26: Added structured assistant memory persistence, patch application, and decision-summary helpers for the new background AI agent.
 */

import type {
  AssistantMemory,
  AssistantMemoryPatch,
  AssistantOpenLoop,
  AssistantReminder
} from '../types/assistant';

const ASSISTANT_MEMORY_KEY = 'lumostime_assistant_memory_v1';

const MAX_MEMORY_ITEMS = 24;
const MAX_DECISIONS = 16;

const normalizeStringArray = (value: unknown, limit = MAX_MEMORY_ITEMS): string[] => (
  Array.isArray(value)
    ? value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .slice(0, limit)
    : []
);

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

const normalizeOpenLoop = (value: unknown): AssistantOpenLoop | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<AssistantOpenLoop>;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const status = typeof candidate.status === 'string' ? candidate.status.trim() : '';
  const updatedAt = typeof candidate.updatedAt === 'string' ? candidate.updatedAt.trim() : '';

  if (!id || !title || !status || !updatedAt) {
    return null;
  }

  return {
    id,
    title,
    status: candidate.status!,
    ...(typeof candidate.relatedTodoId === 'string' && candidate.relatedTodoId.trim()
      ? { relatedTodoId: candidate.relatedTodoId.trim() }
      : {}),
    ...(typeof candidate.note === 'string' && candidate.note.trim() ? { note: candidate.note.trim() } : {}),
    updatedAt
  };
};

const createDefaultMemory = (): AssistantMemory => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  profileMemory: [],
  preferenceMemory: [],
  openLoops: [],
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
    openLoops: Array.isArray(candidate.openLoops)
      ? candidate.openLoops.map(normalizeOpenLoop).filter((item): item is AssistantOpenLoop => Boolean(item))
      : [],
    activeReminders: Array.isArray(candidate.activeReminders)
      ? candidate.activeReminders.map(normalizeReminder).filter((item): item is AssistantReminder => Boolean(item))
      : [],
    recentDecisions: normalizeStringArray(candidate.recentDecisions, MAX_DECISIONS),
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

const mergeOpenLoops = (
  current: AssistantOpenLoop[],
  patch: AssistantOpenLoop[] | undefined
): AssistantOpenLoop[] => {
  if (!patch) {
    return current;
  }

  const nextMap = new Map<string, AssistantOpenLoop>();
  current.forEach((loop) => nextMap.set(loop.id, loop));
  patch.forEach((loop) => {
    const normalized = normalizeOpenLoop(loop);
    if (!normalized) {
      return;
    }
    nextMap.set(normalized.id, normalized);
  });
  return Array.from(nextMap.values()).slice(0, MAX_MEMORY_ITEMS);
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
      openLoops: mergeOpenLoops(current.openLoops, patch.openLoops),
      activeReminders: mergeReminders(current.activeReminders, patch.activeReminders),
      recentDecisions: patch.recentDecisions
        ? dedupeStrings([...current.recentDecisions, ...normalizeStringArray(patch.recentDecisions, MAX_DECISIONS)], MAX_DECISIONS)
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
