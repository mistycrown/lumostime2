/**
 * @file useAIBackfillChatAssistantSettings.ts
 * @input Assistant agent configuration, editable draft values, and their state setters
 * @output Draft synchronization and commit/toggle handlers for assistant background settings
 * @pos Component Support Hook (AI Assistant Settings)
 * @description Owns validation, normalization, and scheduler updates for check-in, quiet-hours, and assistant-letter settings.
 * @updated 2026-09-22: Extracted assistant settings draft behavior from AIBackfillChatModal.
 */

import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';
import { assistantAgentConfigService } from '../../services/assistantAgentConfigService';
import { assistantLetterScheduler } from '../../services/assistantLetterScheduler';
import type { AssistantAgentConfig } from '../../types/assistant';
import {
  type AssistantAgentIntervalDrafts,
  type AssistantAgentIntervalField,
  type AssistantAgentQuietHoursDrafts,
  type AssistantAgentQuietHoursField,
  type AssistantLetterDrafts,
  buildAssistantAgentIntervalDrafts,
  buildAssistantAgentQuietHoursDrafts,
  buildAssistantLetterDrafts,
  validateAssistantAgentIntervalDrafts,
  validateAssistantAgentQuietHoursDrafts,
  validateAssistantLetterDrafts
} from './AIBackfillChatShared';
import { normalizeAssistantQuietHoursValue } from '../../utils/assistantQuietHours';

interface UseAIBackfillChatAssistantSettingsOptions {
  assistantAgentConfig: AssistantAgentConfig;
  setAssistantAgentConfig: Dispatch<SetStateAction<AssistantAgentConfig>>;
  assistantAgentIntervalDrafts: AssistantAgentIntervalDrafts;
  setAssistantAgentIntervalDrafts: Dispatch<SetStateAction<AssistantAgentIntervalDrafts>>;
  assistantAgentQuietHoursDrafts: AssistantAgentQuietHoursDrafts;
  setAssistantAgentQuietHoursDrafts: Dispatch<SetStateAction<AssistantAgentQuietHoursDrafts>>;
  assistantLetterDrafts: AssistantLetterDrafts;
  setAssistantLetterDrafts: Dispatch<SetStateAction<AssistantLetterDrafts>>;
  refreshAssistantMemorySnapshot: () => void;
}

export const useAIBackfillChatAssistantSettings = ({
  assistantAgentConfig,
  setAssistantAgentConfig,
  assistantAgentIntervalDrafts,
  setAssistantAgentIntervalDrafts,
  assistantAgentQuietHoursDrafts,
  setAssistantAgentQuietHoursDrafts,
  assistantLetterDrafts,
  setAssistantLetterDrafts,
  refreshAssistantMemorySnapshot
}: UseAIBackfillChatAssistantSettingsOptions) => {
  useEffect(() => {
    setAssistantAgentIntervalDrafts(buildAssistantAgentIntervalDrafts(assistantAgentConfig));
  }, [assistantAgentConfig.maxCheckinMinutes, assistantAgentConfig.minCheckinMinutes, setAssistantAgentIntervalDrafts]);

  useEffect(() => {
    setAssistantAgentQuietHoursDrafts(buildAssistantAgentQuietHoursDrafts(assistantAgentConfig));
  }, [
    assistantAgentConfig.quietHoursEnabled,
    assistantAgentConfig.quietHoursEnd,
    assistantAgentConfig.quietHoursStart,
    setAssistantAgentQuietHoursDrafts
  ]);

  useEffect(() => {
    setAssistantLetterDrafts(buildAssistantLetterDrafts(assistantAgentConfig));
  }, [
    assistantAgentConfig.letterFrequencyDays,
    assistantAgentConfig.letterWindowEnd,
    assistantAgentConfig.letterWindowStart,
    setAssistantLetterDrafts
  ]);

  const handleUpdateAssistantAgentConfig = useCallback((patch: Partial<AssistantAgentConfig>) => {
    const nextConfig = assistantAgentConfigService.saveConfig(patch);
    setAssistantAgentConfig(nextConfig);
    if (patch.longTermMemoryEnabled === false) {
      refreshAssistantMemorySnapshot();
    }
  }, [refreshAssistantMemorySnapshot, setAssistantAgentConfig]);

  const handleAssistantAgentIntervalDraftChange = useCallback((
    field: AssistantAgentIntervalField,
    nextValue: string
  ) => {
    setAssistantAgentIntervalDrafts((current) => ({ ...current, [field]: nextValue }));
  }, [setAssistantAgentIntervalDrafts]);

  const handleAssistantAgentQuietHoursDraftChange = useCallback((
    field: AssistantAgentQuietHoursField,
    nextValue: string
  ) => {
    const digitsOnly = nextValue.replace(/\D+/g, '').slice(0, 4);
    setAssistantAgentQuietHoursDrafts((current) => ({ ...current, [field]: digitsOnly }));
  }, [setAssistantAgentQuietHoursDrafts]);

  const handleAssistantLetterDraftChange = useCallback((
    field: keyof AssistantLetterDrafts,
    nextValue: string
  ) => {
    const normalizedValue = field === 'letterFrequencyDays'
      ? nextValue.replace(/\D+/g, '').slice(0, 2)
      : nextValue.replace(/\D+/g, '').slice(0, 4);
    setAssistantLetterDrafts((current) => ({ ...current, [field]: normalizedValue }));
  }, [setAssistantLetterDrafts]);

  const commitAssistantAgentIntervalDraft = useCallback((_field: AssistantAgentIntervalField) => {
    const nextErrors = validateAssistantAgentIntervalDrafts(assistantAgentIntervalDrafts);
    if (nextErrors.minCheckinMinutes || nextErrors.maxCheckinMinutes) {
      return;
    }

    handleUpdateAssistantAgentConfig({
      minCheckinMinutes: Number(assistantAgentIntervalDrafts.minCheckinMinutes.trim()),
      maxCheckinMinutes: Number(assistantAgentIntervalDrafts.maxCheckinMinutes.trim())
    });
  }, [assistantAgentIntervalDrafts, handleUpdateAssistantAgentConfig]);

  const commitAssistantAgentQuietHoursDraft = useCallback(() => {
    const nextErrors = validateAssistantAgentQuietHoursDrafts(assistantAgentQuietHoursDrafts, true);
    if (nextErrors.quietHoursStart || nextErrors.quietHoursEnd) {
      return;
    }

    handleUpdateAssistantAgentConfig({
      quietHoursStart: assistantAgentQuietHoursDrafts.quietHoursStart.trim(),
      quietHoursEnd: assistantAgentQuietHoursDrafts.quietHoursEnd.trim()
    });
  }, [assistantAgentQuietHoursDrafts, handleUpdateAssistantAgentConfig]);

  const handleToggleAssistantQuietHours = useCallback(() => {
    if (assistantAgentConfig.quietHoursEnabled) {
      handleUpdateAssistantAgentConfig({ quietHoursEnabled: false });
      return;
    }

    const nextDrafts: AssistantAgentQuietHoursDrafts = {
      quietHoursStart: normalizeAssistantQuietHoursValue(assistantAgentQuietHoursDrafts.quietHoursStart) || '2300',
      quietHoursEnd: normalizeAssistantQuietHoursValue(assistantAgentQuietHoursDrafts.quietHoursEnd) || '0800'
    };
    setAssistantAgentQuietHoursDrafts(nextDrafts);

    const nextErrors = validateAssistantAgentQuietHoursDrafts(nextDrafts, true);
    if (nextErrors.quietHoursStart || nextErrors.quietHoursEnd) {
      return;
    }

    handleUpdateAssistantAgentConfig({
      quietHoursEnabled: true,
      quietHoursStart: nextDrafts.quietHoursStart,
      quietHoursEnd: nextDrafts.quietHoursEnd
    });
  }, [
    assistantAgentConfig.quietHoursEnabled,
    assistantAgentQuietHoursDrafts,
    handleUpdateAssistantAgentConfig,
    setAssistantAgentQuietHoursDrafts
  ]);

  const commitAssistantLetterDraft = useCallback(() => {
    const nextErrors = validateAssistantLetterDrafts(assistantLetterDrafts, true);
    if (nextErrors.letterFrequencyDays || nextErrors.letterWindowStart || nextErrors.letterWindowEnd) {
      return;
    }

    const basePatch: Partial<AssistantAgentConfig> = {
      letterFrequencyDays: Number(assistantLetterDrafts.letterFrequencyDays.trim()),
      letterWindowStart: assistantLetterDrafts.letterWindowStart.trim(),
      letterWindowEnd: assistantLetterDrafts.letterWindowEnd.trim()
    };
    const nextSchedulePatch = assistantAgentConfig.letterEnabled
      ? assistantLetterScheduler.buildNextSchedulePatch({
        letterFrequencyDays: basePatch.letterFrequencyDays!,
        letterWindowStart: basePatch.letterWindowStart,
        letterWindowEnd: basePatch.letterWindowEnd,
        lastLetterSentAt: assistantAgentConfig.lastLetterSentAt
      }, { now: new Date() })
      : null;
    const nextConfig = assistantAgentConfigService.saveConfig({ ...basePatch, ...(nextSchedulePatch || {}) });
    setAssistantAgentConfig(nextConfig);
  }, [assistantAgentConfig, assistantLetterDrafts, setAssistantAgentConfig]);

  const handleToggleAssistantLetterEnabled = useCallback(() => {
    if (assistantAgentConfig.letterEnabled) {
      const nextConfig = assistantAgentConfigService.saveConfig({
        letterEnabled: false,
        ...assistantLetterScheduler.clearSchedule()
      });
      setAssistantAgentConfig(nextConfig);
      return;
    }

    const nextDrafts: AssistantLetterDrafts = {
      letterFrequencyDays: assistantLetterDrafts.letterFrequencyDays.trim() || String(assistantAgentConfig.letterFrequencyDays || 2),
      letterWindowStart: normalizeAssistantQuietHoursValue(assistantLetterDrafts.letterWindowStart) || '2000',
      letterWindowEnd: normalizeAssistantQuietHoursValue(assistantLetterDrafts.letterWindowEnd) || '2200'
    };
    setAssistantLetterDrafts(nextDrafts);

    const nextErrors = validateAssistantLetterDrafts(nextDrafts, true);
    if (nextErrors.letterFrequencyDays || nextErrors.letterWindowStart || nextErrors.letterWindowEnd) {
      return;
    }

    const nextSchedulePatch = assistantLetterScheduler.buildNextSchedulePatch({
      letterFrequencyDays: Number(nextDrafts.letterFrequencyDays),
      letterWindowStart: nextDrafts.letterWindowStart,
      letterWindowEnd: nextDrafts.letterWindowEnd,
      lastLetterSentAt: assistantAgentConfig.lastLetterSentAt
    }, { now: new Date() });
    const nextConfig = assistantAgentConfigService.saveConfig({
      letterEnabled: true,
      letterFrequencyDays: Number(nextDrafts.letterFrequencyDays),
      letterWindowStart: nextDrafts.letterWindowStart,
      letterWindowEnd: nextDrafts.letterWindowEnd,
      ...(nextSchedulePatch || {})
    });
    setAssistantAgentConfig(nextConfig);
  }, [assistantAgentConfig, assistantLetterDrafts, setAssistantAgentConfig, setAssistantLetterDrafts]);

  return {
    handleUpdateAssistantAgentConfig,
    handleAssistantAgentIntervalDraftChange,
    handleAssistantAgentQuietHoursDraftChange,
    handleAssistantLetterDraftChange,
    commitAssistantAgentIntervalDraft,
    commitAssistantAgentQuietHoursDraft,
    handleToggleAssistantQuietHours,
    commitAssistantLetterDraft,
    handleToggleAssistantLetterEnabled
  };
};
