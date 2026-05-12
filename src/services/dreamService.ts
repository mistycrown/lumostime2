/**
 * @file dreamService.ts
 * @input User-authored Dream topics, AI-generated Dream patch payloads, and optional query text for Dream-context selection
 * @output Persistent Dream state snapshots, scoped Dream context digests, and AI-generated Dream run results
 * @pos Service (Dream)
 * @description Stores the explicit-only Dream attention system separately from assistant memory, including user-maintained concern topics, AI-maintained observation entries, and the manual `dream` workflow that can add, rewrite, or delete entries while normal chat and background turns remain read-only consumers.
 *
 * @updated 2026-05-12: Added direct single-entry edit/delete helpers so users can manually refine or remove individual Dream observations without rerunning the whole workflow.
 * @updated 2026-05-12: Moved the Dream-mode prompt into a dedicated constants file, relaxed the fallback rules so sparse windows can still yield provisional observations, and kept the structured AI workflow runner for manual Dream refreshes.
 * @updated 2026-05-12: Added the first Dream persistence, topic CRUD, scoped read-only context builder, and structured AI workflow runner for manual Dream refreshes.
 */

import { aiService, type AIDebugExchange } from './aiService';
import { DREAM_MODE_SYSTEM_PROMPT } from '../constants/dreamModePrompt';
import { DREAM_TOPIC_PRESETS } from '../constants/dreamTopicPresets';
import type {
  DreamEntry,
  DreamEntryStatus,
  DreamPatch,
  DreamState,
  DreamTopic,
  DreamUpdateCard
} from '../types/assistant';

const DREAM_STORAGE_KEY = 'lumostime_dream_state_v1';
const DREAM_STATE_VERSION = 1;
const MAX_DREAM_CONTEXT_ENTRIES = 6;
const DREAM_TOPIC_TITLE_LIMIT = 40;
const DREAM_TOPIC_NOTE_LIMIT = 240;
const DREAM_RELATIVE_TIME_PATTERN = /最近几天|最近一周|最近7天|这段时间|近来|近期/;

interface DreamTopicDraftInput {
  title: string;
  note?: string;
}

interface DreamEntryUpdateInput {
  content: string;
}

interface RunDreamWorkflowParams {
  rangeLabel: string;
  rangeStartDate: string;
  rangeEndDate: string;
  currentDateTime: string;
  currentDate: string;
  conversationSummary?: string;
  stateContextText: string;
  dictionaryDigestText: string;
}

interface DreamWorkflowResult {
  assistantReply: string;
  patch: DreamPatch;
  cards: DreamUpdateCard[];
  debug?: AIDebugExchange;
}

interface RawDreamWorkflowResult {
  assistantReply?: unknown;
  dreamPatch?: unknown;
  dreamCards?: unknown;
}

const hasMeaningfulDreamWorkflowResult = (value: RawDreamWorkflowResult | null | undefined): boolean => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (typeof value.assistantReply === 'string' && value.assistantReply.trim()) {
    return true;
  }

  if (Array.isArray(value.dreamCards) && value.dreamCards.length > 0) {
    return true;
  }

  if (value.dreamPatch && typeof value.dreamPatch === 'object') {
    const candidate = value.dreamPatch as Record<string, unknown>;
    return Array.isArray(candidate.createdEntries)
      || Array.isArray(candidate.updatedEntries)
      || Array.isArray(candidate.deletedEntryIds);
  }

  return false;
};

const createDefaultDreamState = (): DreamState => {
  const now = new Date().toISOString();
  return {
    version: DREAM_STATE_VERSION,
    updatedAt: now,
    topics: DREAM_TOPIC_PRESETS.map((preset) => ({
      id: preset.id,
      title: preset.title,
      note: preset.note,
      enabled: true,
      createdAt: now,
      updatedAt: now
    })),
    entries: []
  };
};

const normalizeString = (value: unknown, maxLength = 400): string => (
  typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength).trim()
    : ''
);

const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

const normalizeDreamEntryStatus = (value: unknown): DreamEntryStatus => (
  value === 'stable' || value === 'risk' || value === 'archived'
    ? value
    : 'watch'
);

const normalizeDreamTopic = (value: unknown): DreamTopic | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<DreamTopic>;
  const id = normalizeString(candidate.id, 80);
  const title = normalizeString(candidate.title, DREAM_TOPIC_TITLE_LIMIT);
  const createdAt = normalizeString(candidate.createdAt, 80);
  const updatedAt = normalizeString(candidate.updatedAt, 80);
  const note = normalizeString(candidate.note, DREAM_TOPIC_NOTE_LIMIT);

  if (!id || !title || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id,
    title,
    ...(note ? { note } : {}),
    enabled: candidate.enabled !== false,
    createdAt,
    updatedAt
  };
};

const normalizeDreamEntry = (value: unknown): DreamEntry | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<DreamEntry>;
  const id = normalizeString(candidate.id, 80);
  const topicId = normalizeString(candidate.topicId, 80);
  const content = normalizeString(candidate.content, 400);
  const observedRangeStart = normalizeString(candidate.observedRangeStart, 20);
  const observedRangeEnd = normalizeString(candidate.observedRangeEnd, 20);
  const observedAt = normalizeString(candidate.observedAt, 80);
  const updatedAt = normalizeString(candidate.updatedAt, 80);
  const sourceSummary = normalizeString(candidate.sourceSummary, 120);

  if (!id || !topicId || !content || !observedAt || !updatedAt) {
    return null;
  }

  if (!isIsoDate(observedRangeStart) || !isIsoDate(observedRangeEnd)) {
    return null;
  }

  return {
    id,
    topicId,
    content,
    observedRangeStart,
    observedRangeEnd,
    observedAt,
    ...(sourceSummary ? { sourceSummary } : {}),
    status: normalizeDreamEntryStatus(candidate.status),
    updatedAt
  };
};

const normalizeDreamPatchEntry = (
  value: unknown,
  fallbackUpdatedAt: string
): DreamEntry | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<DreamEntry>;
  const topicId = normalizeString(candidate.topicId, 80);
  const content = normalizeString(candidate.content, 400);
  const observedRangeStart = normalizeString(candidate.observedRangeStart, 20);
  const observedRangeEnd = normalizeString(candidate.observedRangeEnd, 20);
  const updatedAt = normalizeString(candidate.updatedAt, 80) || fallbackUpdatedAt;
  const observedAt = normalizeString(candidate.observedAt, 80) || updatedAt;
  const sourceSummary = normalizeString(candidate.sourceSummary, 120);

  if (!topicId || !content) {
    return null;
  }

  if (!isIsoDate(observedRangeStart) || !isIsoDate(observedRangeEnd)) {
    return null;
  }

  return {
    id: normalizeString(candidate.id, 80) || crypto.randomUUID(),
    topicId,
    content,
    observedRangeStart,
    observedRangeEnd,
    observedAt,
    ...(sourceSummary ? { sourceSummary } : {}),
    status: normalizeDreamEntryStatus(candidate.status),
    updatedAt
  };
};

const normalizeDreamState = (value: unknown): DreamState => {
  if (!value || typeof value !== 'object') {
    return createDefaultDreamState();
  }

  const candidate = value as Partial<DreamState>;
  const topics = Array.isArray(candidate.topics)
    ? candidate.topics.map(normalizeDreamTopic).filter((item): item is DreamTopic => Boolean(item))
    : [];
  const topicIds = new Set(topics.map((topic) => topic.id));
  const entries = Array.isArray(candidate.entries)
    ? candidate.entries
      .map(normalizeDreamEntry)
      .filter((item): item is DreamEntry => Boolean(item) && topicIds.has(item.topicId))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    : [];

  return {
    version: DREAM_STATE_VERSION,
    updatedAt: normalizeString(candidate.updatedAt, 80) || new Date().toISOString(),
    ...(normalizeString(candidate.lastDreamRunAt, 80) ? { lastDreamRunAt: normalizeString(candidate.lastDreamRunAt, 80) } : {}),
    topics,
    entries
  };
};

const safeParseJson = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error('[dreamService] Failed to parse Dream JSON', error);
    return fallback;
  }
};

const parseJsonObject = (content: string): Record<string, unknown> => {
  if (content.includes('```json')) {
    content = content.replace(/```json\n?|\n?```/g, '');
  } else if (content.includes('```')) {
    content = content.replace(/```\n?|\n?```/g, '');
  }

  const objectStart = content.indexOf('{');
  const objectEnd = content.lastIndexOf('}') + 1;
  if (objectStart >= 0 && objectEnd > objectStart) {
    content = content.substring(objectStart, objectEnd);
  }

  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch (error) {
    console.error('[dreamService] Failed to parse Dream JSON object', error);
    return {};
  }
};

const repairJsonStringQuotes = (content: string): string => {
  let result = '';
  let inString = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (char === '\\') {
      result += char;
      if (index + 1 < content.length) {
        result += content[index + 1];
        index += 1;
      }
      continue;
    }

    if (char !== '"') {
      result += char;
      continue;
    }

    if (!inString) {
      inString = true;
      result += char;
      continue;
    }

    let cursor = index + 1;
    while (cursor < content.length && /\s/.test(content[cursor])) {
      cursor += 1;
    }

    const nextChar = cursor < content.length ? content[cursor] : '';
    const looksLikeClosingQuote = nextChar === ',' || nextChar === '}' || nextChar === ']' || nextChar === ':';

    if (looksLikeClosingQuote) {
      inString = false;
      result += char;
      continue;
    }

    result += '\\"';
  }

  return result;
};

const extractRawStructuredContentFromDebug = (debug?: AIDebugExchange): string | undefined => {
  const responseBody = debug?.response?.body;
  if (!responseBody || typeof responseBody !== 'object') {
    return undefined;
  }

  const candidate = responseBody as Record<string, unknown>;
  const openAiContent = (
    Array.isArray(candidate.choices)
    && candidate.choices[0]
    && typeof candidate.choices[0] === 'object'
    && candidate.choices[0] !== null
    && typeof (candidate.choices[0] as Record<string, unknown>).message === 'object'
    && (candidate.choices[0] as Record<string, unknown>).message !== null
  )
    ? ((candidate.choices[0] as Record<string, unknown>).message as Record<string, unknown>).content
    : undefined;
  if (typeof openAiContent === 'string' && openAiContent.trim()) {
    return openAiContent.trim();
  }

  const geminiContent = (
    Array.isArray(candidate.candidates)
    && candidate.candidates[0]
    && typeof candidate.candidates[0] === 'object'
    && candidate.candidates[0] !== null
  )
    ? (candidate.candidates[0] as Record<string, unknown>).content
    : undefined;
  if (
    geminiContent
    && typeof geminiContent === 'object'
    && Array.isArray((geminiContent as Record<string, unknown>).parts)
  ) {
    const firstPart = (geminiContent as Record<string, unknown>).parts?.[0];
    const text = firstPart && typeof firstPart === 'object'
      ? (firstPart as Record<string, unknown>).text
      : undefined;
    if (typeof text === 'string' && text.trim()) {
      return text.trim();
    }
  }

  return undefined;
};

const tryRepairDreamWorkflowResultFromDebug = (debug?: AIDebugExchange): RawDreamWorkflowResult | null => {
  const rawContent = extractRawStructuredContentFromDebug(debug);
  if (!rawContent) {
    return null;
  }

  const repaired = repairJsonStringQuotes(rawContent);
  const parsed = parseJsonObject(repaired) as RawDreamWorkflowResult;
  return hasMeaningfulDreamWorkflowResult(parsed) ? parsed : null;
};

const normalizeDreamPatch = (value: unknown): DreamPatch => {
  if (!value || typeof value !== 'object') {
    return {
      updatedAt: new Date().toISOString()
    };
  }

  const candidate = value as Partial<DreamPatch>;
  const updatedAt = normalizeString(candidate.updatedAt, 80) || new Date().toISOString();
  const createdEntries = Array.isArray(candidate.createdEntries)
    ? candidate.createdEntries
      .map((entry) => normalizeDreamPatchEntry(entry, updatedAt))
      .filter((item): item is DreamEntry => Boolean(item))
    : [];
  const updatedEntries = Array.isArray(candidate.updatedEntries)
    ? candidate.updatedEntries
      .map((entry) => normalizeDreamPatchEntry(entry, updatedAt))
      .filter((item): item is DreamEntry => Boolean(item))
    : [];
  const deletedEntryIds = Array.isArray(candidate.deletedEntryIds)
    ? candidate.deletedEntryIds.map((item) => normalizeString(item, 80)).filter(Boolean)
    : [];

  return {
    updatedAt,
    ...(createdEntries.length > 0 ? { createdEntries } : {}),
    ...(updatedEntries.length > 0 ? { updatedEntries } : {}),
    ...(deletedEntryIds.length > 0 ? { deletedEntryIds } : {})
  };
};

const normalizeDreamUpdateCard = (
  value: unknown,
  topicMap: Map<string, DreamTopic>,
  fallbackAction: DreamUpdateCard['action'] = 'updated'
): DreamUpdateCard | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<DreamUpdateCard>;
  const topicId = normalizeString(candidate.topicId, 80);
  const topicTitle = normalizeString(candidate.topicTitle, DREAM_TOPIC_TITLE_LIMIT)
    || topicMap.get(topicId)?.title
    || '';
  const content = normalizeString(candidate.content, 400);
  const updatedAt = normalizeString(candidate.updatedAt, 80) || new Date().toISOString();
  const observedRangeStart = normalizeString(candidate.observedRangeStart, 20);
  const observedRangeEnd = normalizeString(candidate.observedRangeEnd, 20);
  const action = candidate.action === 'created' || candidate.action === 'deleted' || candidate.action === 'updated'
    ? candidate.action
    : fallbackAction;

  if (!topicId || !topicTitle || !content) {
    return null;
  }

  return {
    topicId,
    topicTitle,
    action,
    content,
    ...(isIsoDate(observedRangeStart) ? { observedRangeStart } : {}),
    ...(isIsoDate(observedRangeEnd) ? { observedRangeEnd } : {}),
    updatedAt
  };
};

const buildFallbackDreamCards = (
  patch: DreamPatch,
  topicMap: Map<string, DreamTopic>
): DreamUpdateCard[] => ([
  ...((patch.createdEntries || []).flatMap((entry) => {
    const card = normalizeDreamUpdateCard({
      topicId: entry.topicId,
      topicTitle: topicMap.get(entry.topicId)?.title || '',
      action: 'created',
      content: entry.content,
      observedRangeStart: entry.observedRangeStart,
      observedRangeEnd: entry.observedRangeEnd,
      updatedAt: entry.updatedAt
    }, topicMap, 'created');
    return card ? [card] : [];
  })),
  ...((patch.updatedEntries || []).flatMap((entry) => {
    const card = normalizeDreamUpdateCard({
      topicId: entry.topicId,
      topicTitle: topicMap.get(entry.topicId)?.title || '',
      action: 'updated',
      content: entry.content,
      observedRangeStart: entry.observedRangeStart,
      observedRangeEnd: entry.observedRangeEnd,
      updatedAt: entry.updatedAt
    }, topicMap, 'updated');
    return card ? [card] : [];
  })),
  ...((patch.deletedEntryIds || []).flatMap((entryId) => {
    const entry = dreamService.getState().entries.find((item) => item.id === entryId);
    if (!entry) {
      return [];
    }
    const card = normalizeDreamUpdateCard({
      topicId: entry.topicId,
      topicTitle: topicMap.get(entry.topicId)?.title || '',
      action: 'deleted',
      content: entry.content,
      observedRangeStart: entry.observedRangeStart,
      observedRangeEnd: entry.observedRangeEnd,
      updatedAt: patch.updatedAt
    }, topicMap, 'deleted');
    return card ? [card] : [];
  }))
]);

const buildSummaryDreamCard = (
  assistantReply: string,
  rangeLabel: string,
  rangeStartDate: string,
  rangeEndDate: string,
  updatedAt: string
): DreamUpdateCard => ({
  topicId: '__dream_result__',
  topicTitle: `Dream · ${rangeLabel}`,
  action: 'updated',
  content: assistantReply.trim() || '这次 Dream 已完成整理。',
  observedRangeStart: rangeStartDate,
  observedRangeEnd: rangeEndDate,
  updatedAt
});

const buildPatchEntriesFromCards = (cards: DreamUpdateCard[]): DreamEntry[] => (
  cards.flatMap((card) => {
    if (!card.topicId || !card.content || !card.observedRangeStart || !card.observedRangeEnd) {
      return [];
    }

    if (!isIsoDate(card.observedRangeStart) || !isIsoDate(card.observedRangeEnd)) {
      return [];
    }

    return [{
      id: crypto.randomUUID(),
      topicId: card.topicId,
      content: card.content,
      observedRangeStart: card.observedRangeStart,
      observedRangeEnd: card.observedRangeEnd,
      observedAt: card.updatedAt,
      status: 'watch' as const,
      updatedAt: card.updatedAt
    }];
  })
);

const buildDreamEntryMatchKey = (
  value: Pick<DreamEntry, 'topicId' | 'content' | 'observedRangeStart' | 'observedRangeEnd'>
): string => [
  value.topicId.trim(),
  value.content.trim(),
  value.observedRangeStart.trim(),
  value.observedRangeEnd.trim()
].join('||');

const formatDreamEntryLine = (entry: DreamEntry): string => (
  [
    `- ${entry.content}`,
    `  观察窗口：${entry.observedRangeStart} 至 ${entry.observedRangeEnd}`,
    `  状态：${entry.status}`,
    entry.sourceSummary ? `  来源：${entry.sourceSummary}` : '',
    `  更新时间：${entry.updatedAt}`
  ].filter(Boolean).join('\n')
);

export const dreamService = {
  getStorageKey(): string {
    return DREAM_STORAGE_KEY;
  },

  getState(): DreamState {
    return normalizeDreamState(safeParseJson<unknown>(localStorage.getItem(DREAM_STORAGE_KEY), null));
  },

  saveState(state: DreamState): DreamState {
    const next = {
      ...normalizeDreamState(state),
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(DREAM_STORAGE_KEY, JSON.stringify(next));
    return next;
  },

  createTopic(input: DreamTopicDraftInput): DreamState {
    const title = normalizeString(input.title, DREAM_TOPIC_TITLE_LIMIT);
    const note = normalizeString(input.note, DREAM_TOPIC_NOTE_LIMIT);
    if (!title) {
      return dreamService.getState();
    }

    const current = dreamService.getState();
    const nextTopic: DreamTopic = {
      id: crypto.randomUUID(),
      title,
      ...(note ? { note } : {}),
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return dreamService.saveState({
      ...current,
      topics: [...current.topics, nextTopic]
    });
  },

  updateTopic(topicId: string, patch: Partial<Pick<DreamTopic, 'title' | 'note' | 'enabled'>>): DreamState {
    const current = dreamService.getState();
    const nextTopics = current.topics.map((topic) => {
      if (topic.id !== topicId) {
        return topic;
      }

      const nextTitle = normalizeString(patch.title, DREAM_TOPIC_TITLE_LIMIT) || topic.title;
      const nextNote = normalizeString(patch.note, DREAM_TOPIC_NOTE_LIMIT);
      return {
        ...topic,
        title: nextTitle,
        ...(nextNote ? { note: nextNote } : {}),
        ...(nextNote ? {} : { note: undefined }),
        enabled: patch.enabled ?? topic.enabled,
        updatedAt: new Date().toISOString()
      };
    });

    return dreamService.saveState({
      ...current,
      topics: nextTopics
    });
  },

  deleteTopic(topicId: string): DreamState {
    const current = dreamService.getState();
    return dreamService.saveState({
      ...current,
      topics: current.topics.filter((topic) => topic.id !== topicId),
      entries: current.entries.filter((entry) => entry.topicId !== topicId)
    });
  },

  applyPatch(patch: DreamPatch): DreamState {
    const current = dreamService.getState();
    const deletedEntryIds = new Set((patch.deletedEntryIds || []).map((item) => item.trim()).filter(Boolean));
    const entryMap = new Map<string, DreamEntry>();

    current.entries.forEach((entry) => {
      if (!deletedEntryIds.has(entry.id)) {
        entryMap.set(entry.id, entry);
      }
    });

    (patch.updatedEntries || []).forEach((entry) => {
      entryMap.set(entry.id, entry);
    });

    (patch.createdEntries || []).forEach((entry) => {
      entryMap.set(entry.id, entry);
    });

    return dreamService.saveState({
      ...current,
      lastDreamRunAt: patch.updatedAt,
      entries: Array.from(entryMap.values()).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    });
  },

  listEntriesByTopic(topicId: string): DreamEntry[] {
    return dreamService.getState().entries.filter((entry) => entry.topicId === topicId);
  },

  updateEntry(entryId: string, patch: DreamEntryUpdateInput): DreamState {
    const current = dreamService.getState();
    const nextContent = normalizeString(patch.content, 400);
    if (!nextContent) {
      return current;
    }

    const nextEntries = current.entries.map((entry) => (
      entry.id === entryId
        ? {
          ...entry,
          content: nextContent,
          updatedAt: new Date().toISOString()
        }
        : entry
    ));

    return dreamService.saveState({
      ...current,
      entries: nextEntries.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    });
  },

  deleteEntry(entryId: string): DreamState {
    const current = dreamService.getState();
    return dreamService.saveState({
      ...current,
      entries: current.entries.filter((entry) => entry.id !== entryId)
    });
  },

  buildContext(options?: {
    query?: string;
    maxEntries?: number;
  }): string | undefined {
    const state = dreamService.getState();
    const enabledTopics = state.topics.filter((topic) => topic.enabled);
    if (enabledTopics.length === 0) {
      return undefined;
    }

    const topicMap = new Map(enabledTopics.map((topic) => [topic.id, topic]));
    const query = normalizeString(options?.query, 120).toLowerCase();
    const maxEntries = options?.maxEntries ?? MAX_DREAM_CONTEXT_ENTRIES;
    const prioritizedEntries = state.entries
      .filter((entry) => topicMap.has(entry.topicId))
      .map((entry) => {
        const topic = topicMap.get(entry.topicId)!;
        const matchScore = query && (
          entry.content.toLowerCase().includes(query)
          || topic.title.toLowerCase().includes(query)
          || (topic.note || '').toLowerCase().includes(query)
        )
          ? 1
          : 0;
        return {
          entry,
          topic,
          matchScore
        };
      })
      .sort((left, right) => (
        right.matchScore - left.matchScore
        || right.entry.updatedAt.localeCompare(left.entry.updatedAt)
      ))
      .slice(0, maxEntries);

    if (prioritizedEntries.length === 0) {
      return undefined;
    }

    return [
      '以下是只读 Dream 持续关注上下文。Dream 只能被显式 `dream` 工作流更新；当前回合只允许参考它，不能改写它。',
      ...prioritizedEntries.map(({ entry, topic }) => [
        `[Dream 领域] ${topic.title}${topic.note ? `：${topic.note}` : ''}`,
        formatDreamEntryLine(entry)
      ].join('\n'))
    ].join('\n\n');
  },

  async runDreamWorkflow(params: RunDreamWorkflowParams): Promise<DreamWorkflowResult> {
    const state = dreamService.getState();
    const enabledTopics = state.topics.filter((topic) => topic.enabled);
    if (enabledTopics.length === 0) {
      const updatedAt = new Date().toISOString();
      const assistantReply = '现在还没有启用中的 Dream 关注领域。你先去 Dream 里加几个想让我持续关注的主题，我再帮你整理。';
      return {
        assistantReply,
        patch: {
          updatedAt
        },
        cards: [
          buildSummaryDreamCard(
            assistantReply,
            params.rangeLabel,
            params.rangeStartDate,
            params.rangeEndDate,
            updatedAt
          )
        ]
      };
    }

    const topicMap = new Map(state.topics.map((topic) => [topic.id, topic]));
    const systemPrompt = DREAM_MODE_SYSTEM_PROMPT;

    const userPrompt = [
      'Return exactly one JSON object with this shape:',
      '{',
      '  "assistantReply": "string",',
      '  "dreamPatch": {',
      '    "updatedAt": "ISO datetime",',
      '    "createdEntries": [DreamEntry],',
      '    "updatedEntries": [DreamEntry],',
      '    "deletedEntryIds": ["string"]',
      '  },',
      '  "dreamCards": [',
      '    {',
      '      "topicId": "string",',
      '      "topicTitle": "string",',
      '      "action": "created|updated|deleted",',
      '      "content": "string",',
      '      "observedRangeStart": "YYYY-MM-DD",',
      '      "observedRangeEnd": "YYYY-MM-DD",',
      '      "updatedAt": "ISO datetime"',
      '    }',
      '  ]',
      '}',
      '',
      `Current local datetime: ${params.currentDateTime}`,
      `Current local date: ${params.currentDate}`,
      `Selected Dream range label: ${params.rangeLabel}`,
      `Selected Dream range start: ${params.rangeStartDate}`,
      `Selected Dream range end: ${params.rangeEndDate}`,
      '',
      'Dream topics:',
      JSON.stringify(enabledTopics, null, 2),
      '',
      'Existing Dream entries:',
      JSON.stringify(state.entries.filter((entry) => topicMap.has(entry.topicId)), null, 2),
      '',
      'Conversation summary:',
      params.conversationSummary || '暂无',
      '',
      'Important:',
      '- Recent conversation context is a first-class source for Dream整理, not just a side note.',
      '- Do not rely only on logs; if recent chat reveals meaningful ongoing issues or themes, include them in Dream when they match a topic.',
      '- If logs and recent chat together support multiple semantically distinct observations, split them into multiple Dream entries.',
      '- Do not compress separate issues into one oversized entry just because they fall under nearby topics.',
      '',
      'State context:',
      params.stateContextText,
      '',
      'Dictionary digest:',
      params.dictionaryDigestText,
      '',
      'Rules:',
      '- Prefer updating or deleting stale overlapping entries instead of endlessly appending duplicates.',
      '- Create multiple entries when there are multiple distinct observations; do not force everything into one entry.',
      '- 1 to 3 entries per topic is acceptable when the observations are genuinely distinct.',
      '- If one returned entry starts reading like a list of separate issues, split it into multiple entries instead.',
      '- When recent chat adds meaningful evidence that logs alone would miss, fold that evidence into Dream entries rather than ignoring it.',
      '- If the evidence is thin, you may still create a provisional but honest observation.',
      '- If a topic has no meaningful new observation, you may leave it unchanged.',
      '- Prefer returning at least one trackable Dream update when the selected window contains any meaningful signal.',
      '- Only return an empty Dream patch when the selected window is effectively unusable or contains no meaningful signal.'
    ].join('\n');

    const { result, debug } = await aiService.requestStructuredJsonWithDebug<RawDreamWorkflowResult>({
      systemPrompt,
      userPrompt,
      cacheHint: {
        keySeed: `dream_refresh:${params.rangeStartDate}:${params.rangeEndDate}`,
        scope: 'dream_refresh'
      },
      normalizeResult: (rawValue) => rawValue as RawDreamWorkflowResult
    });
    const repairedResult = hasMeaningfulDreamWorkflowResult(result)
      ? result
      : (tryRepairDreamWorkflowResultFromDebug(debug) || result);

    const patch = normalizeDreamPatch(repairedResult.dreamPatch);
    const cards = Array.isArray(repairedResult.dreamCards)
      ? repairedResult.dreamCards
        .map((item) => normalizeDreamUpdateCard(item, topicMap))
        .filter((item): item is DreamUpdateCard => Boolean(item))
      : [];

    const assistantReply = normalizeString(repairedResult.assistantReply, 400) || '我把这次 Dream 整理过了。';
    const resolvedCards = cards.length > 0
      ? cards
      : buildFallbackDreamCards(patch, topicMap);
    const existingPatchEntryKeys = new Set([
      ...(patch.createdEntries || []).map((entry) => buildDreamEntryMatchKey(entry)),
      ...(patch.updatedEntries || []).map((entry) => buildDreamEntryMatchKey(entry))
    ]);
    const synthesizedEntries = resolvedCards.length > 0
      ? buildPatchEntriesFromCards(
        resolvedCards.filter((card) => (
          card.action !== 'deleted'
          && Boolean(card.observedRangeStart)
          && Boolean(card.observedRangeEnd)
          && !existingPatchEntryKeys.has(buildDreamEntryMatchKey({
            topicId: card.topicId,
            content: card.content,
            observedRangeStart: card.observedRangeStart!,
            observedRangeEnd: card.observedRangeEnd!
          }))
        ))
      )
      : [];
    const resolvedPatch = synthesizedEntries.length > 0 || (patch.createdEntries && patch.createdEntries.length > 0)
      ? {
        ...patch,
        createdEntries: [
          ...(patch.createdEntries || []),
          ...synthesizedEntries
        ]
      }
      : patch;

    return {
      assistantReply,
      patch: resolvedPatch,
      cards: resolvedCards.length > 0
        ? resolvedCards
        : [
          buildSummaryDreamCard(
            assistantReply,
            params.rangeLabel,
            params.rangeStartDate,
            params.rangeEndDate,
            resolvedPatch.updatedAt || new Date().toISOString()
          )
        ],
      debug
    };
  }
};
