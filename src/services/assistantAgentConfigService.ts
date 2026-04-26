/**
 * @file assistantAgentConfigService.ts
 * @input Partial assistant-agent config updates from UI or startup hydration
 * @output Persistent Android-first assistant agent config snapshots
 * @pos Service (Assistant Agent Config)
 * @description Stores the background assistant agent's runtime configuration, including polling, random check-in, and long-term-memory toggles, so the shared AI window and native plugin can stay in sync.
 *
 * @updated 2026-04-26: Added persistent assistant agent config storage for AI chat settings, native polling sync, and long-term-memory control.
 */

import type { AssistantAgentConfig } from '../types/assistant';

const ASSISTANT_AGENT_CONFIG_KEY = 'lumostime_assistant_agent_config_v1';

const DEFAULT_ASSISTANT_AGENT_CONFIG: AssistantAgentConfig = {
  enabled: false,
  enableRandomCheckin: true,
  basePollMinutes: 5,
  minCheckinMinutes: 45,
  maxCheckinMinutes: 120,
  quietHoursEnabled: false,
  minimumNudgeGapMinutes: 45,
  longTermMemoryEnabled: true
};

const clampMinutes = (value: unknown, fallback: number, minimum: number, maximum: number): number => {
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
    basePollMinutes: clampMinutes(candidate.basePollMinutes, DEFAULT_ASSISTANT_AGENT_CONFIG.basePollMinutes, 1, 60),
    minCheckinMinutes,
    maxCheckinMinutes,
    quietHoursEnabled: candidate.quietHoursEnabled === true,
    ...(typeof candidate.quietHoursStart === 'string' && candidate.quietHoursStart.trim()
      ? { quietHoursStart: candidate.quietHoursStart.trim() }
      : {}),
    ...(typeof candidate.quietHoursEnd === 'string' && candidate.quietHoursEnd.trim()
      ? { quietHoursEnd: candidate.quietHoursEnd.trim() }
      : {}),
    minimumNudgeGapMinutes: clampMinutes(
      candidate.minimumNudgeGapMinutes,
      DEFAULT_ASSISTANT_AGENT_CONFIG.minimumNudgeGapMinutes,
      1,
      24 * 60
    ),
    longTermMemoryEnabled: candidate.longTermMemoryEnabled !== false
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
    return next;
  },

  clearConfig(): void {
    localStorage.removeItem(ASSISTANT_AGENT_CONFIG_KEY);
  }
};
