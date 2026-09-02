/**
 * @file assistantAgentConfigService.ts
 * @input Partial assistant-agent config updates from UI or startup hydration
 * @output Persistent Android-first assistant agent config snapshots
 * @pos Service (Assistant Agent Config)
 * @description Stores the background assistant agent's runtime configuration, including random check-in scheduling and long-term-memory toggles, so the shared AI window and native plugin can stay in sync.
 * @updated 2026-09-03: Removed the legacy base polling interval because random check-ins are now scheduled at their concrete alarm time.
 *
 * @updated 2026-07-04: Added assistant-letter scheduling config normalization, including frequency, time-window, and persisted next-send timestamps.
 * @updated 2026-05-17: Assistant-agent config writes now mark the unified AI backup state as changed so background-setting edits update sync timestamps too.
 * @updated 2026-05-16: Added normalization and persistence support for post-log assistant trigger toggles plus selected activity ids.
 * @updated 2026-05-12: Normalized assistant quiet-hours values to compact `HHMM` strings so the UI can accept user-entered four-digit random-check-in protection windows while still migrating older `HH:MM` data.
 * @updated 2026-09-02: Reduced the default minimum random-check-in nudge gap from 45 minutes to 10 minutes.
 * @updated 2026-04-26: Added persistent assistant agent config storage for AI chat settings, native polling sync, and long-term-memory control.
 */

import type { AssistantAgentConfig } from '../types/assistant';
import { notifyAIBackupDataChanged } from '../utils/aiBackupChange';
import { normalizeAssistantQuietHoursValue } from '../utils/assistantQuietHours';
import { normalizeAssistantDateTime } from '../utils/assistantTime';

const ASSISTANT_AGENT_CONFIG_KEY = 'lumostime_assistant_agent_config_v1';

const DEFAULT_ASSISTANT_AGENT_CONFIG: AssistantAgentConfig = {
  enabled: false,
  enableRandomCheckin: true,
  minCheckinMinutes: 45,
  maxCheckinMinutes: 120,
  quietHoursEnabled: false,
  minimumNudgeGapMinutes: 10,
  longTermMemoryEnabled: true,
  logSubmissionTriggerEnabled: false,
  logSubmissionTriggerActivityIds: [],
  letterEnabled: false,
  letterFrequencyDays: 2
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
  ));
};

const clampMinutes = (value: unknown, fallback: number, minimum: number, maximum: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
};

const clampDays = (value: unknown, fallback: number, minimum: number, maximum: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
};

const normalizeConfig = (value: unknown): AssistantAgentConfig => {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_ASSISTANT_AGENT_CONFIG };
  }

  const candidate = value as Partial<AssistantAgentConfig>;
  const minCheckinMinutes = clampMinutes(candidate.minCheckinMinutes, DEFAULT_ASSISTANT_AGENT_CONFIG.minCheckinMinutes, 1, 24 * 60);
  const maxCheckinMinutes = Math.max(
    minCheckinMinutes,
    clampMinutes(candidate.maxCheckinMinutes, DEFAULT_ASSISTANT_AGENT_CONFIG.maxCheckinMinutes, 1, 24 * 60)
  );

  return {
    enabled: candidate.enabled === true,
    enableRandomCheckin: candidate.enableRandomCheckin !== false,
    minCheckinMinutes,
    maxCheckinMinutes,
    quietHoursEnabled: candidate.quietHoursEnabled === true,
    ...(normalizeAssistantQuietHoursValue(candidate.quietHoursStart)
      ? { quietHoursStart: normalizeAssistantQuietHoursValue(candidate.quietHoursStart) }
      : {}),
    ...(normalizeAssistantQuietHoursValue(candidate.quietHoursEnd)
      ? { quietHoursEnd: normalizeAssistantQuietHoursValue(candidate.quietHoursEnd) }
      : {}),
    minimumNudgeGapMinutes: clampMinutes(
      candidate.minimumNudgeGapMinutes,
      DEFAULT_ASSISTANT_AGENT_CONFIG.minimumNudgeGapMinutes,
      1,
      24 * 60
    ),
    longTermMemoryEnabled: candidate.longTermMemoryEnabled !== false,
    logSubmissionTriggerEnabled: candidate.logSubmissionTriggerEnabled === true,
    logSubmissionTriggerActivityIds: normalizeStringArray(candidate.logSubmissionTriggerActivityIds),
    letterEnabled: candidate.letterEnabled === true,
    letterFrequencyDays: clampDays(candidate.letterFrequencyDays, DEFAULT_ASSISTANT_AGENT_CONFIG.letterFrequencyDays, 1, 30),
    ...(normalizeAssistantQuietHoursValue(candidate.letterWindowStart)
      ? { letterWindowStart: normalizeAssistantQuietHoursValue(candidate.letterWindowStart) }
      : {}),
    ...(normalizeAssistantQuietHoursValue(candidate.letterWindowEnd)
      ? { letterWindowEnd: normalizeAssistantQuietHoursValue(candidate.letterWindowEnd) }
      : {}),
    ...(normalizeAssistantDateTime(candidate.nextLetterAt)
      ? { nextLetterAt: normalizeAssistantDateTime(candidate.nextLetterAt)! }
      : {}),
    ...(normalizeAssistantDateTime(candidate.lastLetterSentAt)
      ? { lastLetterSentAt: normalizeAssistantDateTime(candidate.lastLetterSentAt)! }
      : {}),
    ...(normalizeAssistantDateTime(candidate.lastLetterScheduledAt)
      ? { lastLetterScheduledAt: normalizeAssistantDateTime(candidate.lastLetterScheduledAt)! }
      : {})
  };
};

const safeParseJson = <T>(raw: string | null, fallback: T): T => {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error('[assistantAgentConfigService] Failed to parse assistant config JSON', error);
    return fallback;
  }
};

export const assistantAgentConfigService = {
  getStorageKey(): string {
    return ASSISTANT_AGENT_CONFIG_KEY;
  },

  getDefaultConfig(): AssistantAgentConfig {
    return { ...DEFAULT_ASSISTANT_AGENT_CONFIG };
  },

  getConfig(): AssistantAgentConfig {
    return normalizeConfig(
      safeParseJson<unknown>(localStorage.getItem(ASSISTANT_AGENT_CONFIG_KEY), DEFAULT_ASSISTANT_AGENT_CONFIG)
    );
  },

  saveConfig(config: Partial<AssistantAgentConfig>): AssistantAgentConfig {
    const current = assistantAgentConfigService.getConfig();
    const next = normalizeConfig({
      ...current,
      ...config
    });
    localStorage.setItem(ASSISTANT_AGENT_CONFIG_KEY, JSON.stringify(next));
    notifyAIBackupDataChanged();
    return next;
  },

  clearConfig(): void {
    localStorage.removeItem(ASSISTANT_AGENT_CONFIG_KEY);
    notifyAIBackupDataChanged();
  }
};
