/**
 * @file assistantReasoning.ts
 * @input Provider-native reasoning/thinking payload fragments and persisted assistant reasoning candidates
 * @output Normalized assistant reasoning summaries safe for storage and chat rendering
 * @pos Utility (Assistant Reasoning)
 * @description Centralizes reasoning text cleanup and summary normalization so provider-specific extraction can stay in aiService while the rest of the app reads one stable assistant reasoning shape.
 *
 * @updated 2026-05-14: Added the first shared reasoning normalization helpers for provider extraction, persistence hydration, and UI rendering.
 */

import type { AssistantReasoningPart, AssistantReasoningSummary } from '../types/assistant';

const normalizeReasoningText = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return trimmed && !['null', 'undefined'].includes(trimmed.toLowerCase())
    ? trimmed
    : '';
};

const normalizeReasoningPart = (value: unknown): AssistantReasoningPart | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    const text = normalizeReasoningText(value);
    return text ? { text } : null;
  }

  const candidate = value as Partial<AssistantReasoningPart> & Record<string, unknown>;
  const text = normalizeReasoningText(candidate.text)
    || normalizeReasoningText(candidate.content)
    || normalizeReasoningText(candidate.reasoning)
    || normalizeReasoningText(candidate.thinking);

  return text ? { text } : null;
};

export const buildAssistantReasoningSummary = (
  parts: unknown[],
  providerLabel?: string
): AssistantReasoningSummary | undefined => {
  const dedupedParts: AssistantReasoningPart[] = [];
  const seen = new Set<string>();

  parts.forEach((part) => {
    const normalizedPart = normalizeReasoningPart(part);
    if (!normalizedPart || seen.has(normalizedPart.text)) {
      return;
    }

    seen.add(normalizedPart.text);
    dedupedParts.push(normalizedPart);
  });

  if (dedupedParts.length === 0) {
    return undefined;
  }

  return {
    parts: dedupedParts,
    ...(normalizeReasoningText(providerLabel) ? { providerLabel: normalizeReasoningText(providerLabel) } : {})
  };
};

export const normalizeAssistantReasoningSummary = (
  value: unknown
): AssistantReasoningSummary | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const candidate = value as Partial<AssistantReasoningSummary> & Record<string, unknown>;
  const parts = Array.isArray(candidate.parts)
    ? candidate.parts
    : [];

  return buildAssistantReasoningSummary(parts, normalizeReasoningText(candidate.providerLabel));
};
