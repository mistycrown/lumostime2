/**
 * @file assistantNativeDebug.ts
 * @input Native assistant diagnostic entries that may include serialized request/response payloads
 * @output Helpers that rebuild foreground-style debug exchanges for native background AI requests
 * @pos Utility (Assistant Native Debug)
 * @description Reconstructs the same prompt/request/response debug structure used by foreground AI calls so native Android background diagnostics can be inspected with the shared debug viewer.
 *
 * @updated 2026-08-10: Marks reconstructed native diagnostic exchanges as Android Native HTTP so the shared debug viewer reports the correct request channel.
 * @updated 2026-05-13: Added native diagnostic debug-exchange reconstruction so background Android runs can surface their actual assembled prompts and raw payloads in the shared Web debug UI.
 */

import type { AIDebugExchange } from '../services/aiService';
import type { AssistantNativeDiagnosticEntry } from '../types/assistant';

const parseJsonValue = (raw?: string): unknown | undefined => {
  if (typeof raw !== 'string' || !raw.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch (_error) {
    return undefined;
  }
};

const parseStatusCode = (raw?: string): number | undefined => {
  if (typeof raw !== 'string' || !raw.trim()) {
    return undefined;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeProvider = (raw?: string): 'openai' | 'gemini' | undefined => {
  if (typeof raw !== 'string') {
    return undefined;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === 'openai' || normalized === 'gemini') {
    return normalized;
  }
  return undefined;
};

const withModelHint = (body: unknown, model?: string): unknown => {
  if (!model?.trim() || !body || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }

  const candidate = body as Record<string, unknown>;
  if (typeof candidate.model === 'string' && candidate.model.trim()) {
    return body;
  }

  return {
    ...candidate,
    model: model.trim()
  };
};

const buildFallbackResponseBody = (entry: AssistantNativeDiagnosticEntry): unknown => {
  const errorMessage = entry.context?.error?.trim();
  if (errorMessage) {
    return {
      error: {
        message: errorMessage
      }
    };
  }

  const responseSummary = [
    entry.context?.assistantReply?.trim() || '',
    entry.context?.decisionSummary?.trim() || '',
    entry.message?.trim() || ''
  ].filter(Boolean).join('\n\n');

  return {
    choices: [{
      message: {
        content: responseSummary || 'Native background request completed without a captured response body.'
      }
    }]
  };
};

export const buildNativeDiagnosticDebugExchange = (
  entry: AssistantNativeDiagnosticEntry
): AIDebugExchange | undefined => {
  const context = entry.context;
  if (!context) {
    return undefined;
  }

  const provider = normalizeProvider(context.requestProvider);
  const requestUrl = context.requestUrl?.trim();
  const requestMethod = context.requestMethod?.trim() || 'POST';
  const requestModel = context.requestModel?.trim();
  const parsedRequestBody = withModelHint(parseJsonValue(context.requestBodyJson), requestModel);
  const parsedResponseBody = parseJsonValue(context.responseBodyJson);
  const responseStatus = parseStatusCode(context.responseStatus);
  const requestedAt = context.requestedAt?.trim() || entry.createdAt;
  const completedAt = context.completedAt?.trim() || entry.createdAt;

  if (!provider || !requestUrl || parsedRequestBody === undefined) {
    return undefined;
  }

  const normalizedStatus = responseStatus
    ?? (entry.type === 'native_request_failed' ? 500 : 200);

  return {
    provider,
    transport: 'native-http',
    requestedAt,
    completedAt,
    request: {
      url: requestUrl,
      method: requestMethod,
      headers: {
        'Content-Type': 'application/json'
      },
      body: parsedRequestBody
    },
    response: {
      status: normalizedStatus,
      ok: normalizedStatus >= 200 && normalizedStatus < 300,
      body: parsedResponseBody ?? buildFallbackResponseBody(entry)
    }
  };
};
