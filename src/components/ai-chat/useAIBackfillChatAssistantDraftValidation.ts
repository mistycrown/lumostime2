/**
 * @file useAIBackfillChatAssistantDraftValidation.ts
 * @input Assistant configuration and editable draft values
 * @output Validation errors and next-letter preview for assistant settings
 * @pos Component Support (AI Integration)
 * @description Keeps assistant settings form derivations out of the main chat coordinator.
 */
import { useMemo } from 'react';
import { assistantLetterScheduler } from '../../services/assistantLetterScheduler';
import type { AssistantAgentConfig } from '../../types/assistant';
import {
  type AssistantAgentIntervalDrafts,
  type AssistantAgentQuietHoursDrafts,
  type AssistantLetterDrafts,
  validateAssistantAgentIntervalDrafts,
  validateAssistantAgentQuietHoursDrafts,
  validateAssistantLetterDrafts
} from './AIBackfillChatShared';

export const useAIBackfillChatAssistantDraftValidation = ({
  assistantAgentConfig,
  assistantAgentIntervalDrafts,
  assistantAgentQuietHoursDrafts,
  assistantLetterDrafts
}: {
  assistantAgentConfig: AssistantAgentConfig;
  assistantAgentIntervalDrafts: AssistantAgentIntervalDrafts;
  assistantAgentQuietHoursDrafts: AssistantAgentQuietHoursDrafts;
  assistantLetterDrafts: AssistantLetterDrafts;
}) => {
  const assistantAgentIntervalErrors = useMemo(
    () => validateAssistantAgentIntervalDrafts(assistantAgentIntervalDrafts),
    [assistantAgentIntervalDrafts]
  );
  const assistantAgentQuietHoursErrors = useMemo(
    () => validateAssistantAgentQuietHoursDrafts(
      assistantAgentQuietHoursDrafts,
      assistantAgentConfig.quietHoursEnabled
    ),
    [assistantAgentConfig.quietHoursEnabled, assistantAgentQuietHoursDrafts]
  );
  const assistantLetterDraftErrors = useMemo(
    () => validateAssistantLetterDrafts(
      assistantLetterDrafts,
      assistantAgentConfig.letterEnabled
    ),
    [assistantAgentConfig.letterEnabled, assistantLetterDrafts]
  );
  const nextAssistantLetterPreview = useMemo(
    () => assistantLetterScheduler.formatNextLetterPreview(assistantAgentConfig.nextLetterAt),
    [assistantAgentConfig.nextLetterAt]
  );

  return {
    assistantAgentIntervalErrors,
    assistantAgentQuietHoursErrors,
    assistantLetterDraftErrors,
    nextAssistantLetterPreview
  };
};
