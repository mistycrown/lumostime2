/**
 * @file assistantDebugFormat.ts
 * @input Raw AI debug response bodies captured from foreground/background assistant requests
 * @output Readable failure summaries and debug-view text blocks for non-JSON AI responses
 * @pos Utils (Assistant Debug Formatting)
 * @description Extracts the useful troubleshooting signal from malformed or non-JSON AI responses, especially HTML gateway/error pages, so the chat UI can show concise failure summaries while still exposing complete raw payloads in debug views.
 * @updated 2026-05-14: Added HTML/non-JSON response summarization plus explicit raw-response debug blocks for assistant request failures.
 */

export interface AssistantDebugTextBlock {
  label: string;
  content: string;
}

const MAX_RESPONSE_SNIPPET_LENGTH = 140;

const toRecord = (value: unknown): Record<string, unknown> | null => (
  typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : null
);

const stringifyDebugValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const truncateWithEllipsis = (value: string, maxLength: number): string => (
  value.length > maxLength
    ? `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
    : value
);

const extractRawResponseText = (responseBody: unknown): string => {
  const record = toRecord(responseBody);
  const rawResponseText = record?.rawResponseText;
  return typeof rawResponseText === 'string' ? rawResponseText.trim() : '';
};

const extractTransportError = (responseBody: unknown): string => {
  const record = toRecord(responseBody);
  const transportError = record?.transportError;
  return typeof transportError === 'string' ? transportError.trim() : '';
};

const looksLikeHtmlDocument = (value: string): boolean => (
  /<!doctype html|<html\b|<head\b|<body\b|<title\b/i.test(value)
);

const extractHtmlTitle = (value: string): string => {
  const titleMatch = value.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return collapseWhitespace(titleMatch?.[1] || '');
};

const stripHtmlTags = (value: string): string => (
  collapseWhitespace(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
);

const extractGatewayHint = (value: string): string => {
  const normalized = value.toLowerCase();
  const hints: string[] = [];

  if (/\bcloudflare\b/.test(normalized)) {
    hints.push('Cloudflare');
  }
  if (/\bnginx\b/.test(normalized)) {
    hints.push('nginx');
  }
  if (/\bopenresty\b/.test(normalized)) {
    hints.push('OpenResty');
  }
  if (/\bapache\b/.test(normalized)) {
    hints.push('Apache');
  }
  if (/\bvercel\b/.test(normalized)) {
    hints.push('Vercel');
  }

  return hints.join(' / ');
};

const extractStatusHint = (rawResponseText: string, status?: number): string => {
  if (typeof status === 'number' && status > 0) {
    return `HTTP ${status}`;
  }

  const match = rawResponseText.match(/\b(401|403|404|429|500|502|503|504)\b/);
  return match ? `HTTP ${match[1]}` : '';
};

const extractPlainTextSnippet = (rawResponseText: string): string => {
  const normalized = collapseWhitespace(rawResponseText);
  return truncateWithEllipsis(normalized, MAX_RESPONSE_SNIPPET_LENGTH);
};

export const summarizeNonJsonDebugResponse = (
  responseBody: unknown,
  status?: number
): string | null => {
  const rawResponseText = extractRawResponseText(responseBody);
  if (!rawResponseText) {
    return null;
  }

  const statusHint = extractStatusHint(rawResponseText, status);
  if (looksLikeHtmlDocument(rawResponseText)) {
    const title = extractHtmlTitle(rawResponseText);
    const visibleText = stripHtmlTags(rawResponseText);
    const gatewayHint = extractGatewayHint(rawResponseText);
    const details = [
      statusHint,
      title ? `页面标题：${title}` : '',
      !title && visibleText ? `页面内容：${truncateWithEllipsis(visibleText, 80)}` : '',
      gatewayHint ? `网关线索：${gatewayHint}` : ''
    ].filter(Boolean);

    return details.length > 0
      ? `服务端返回了 HTML 页面（${details.join('，')}），不是 JSON 响应。`
      : '服务端返回了 HTML 页面，不是 JSON 响应。';
  }

  const snippet = extractPlainTextSnippet(rawResponseText);
  if (statusHint && snippet) {
    return `服务端返回了非 JSON 文本响应（${statusHint}）：${snippet}`;
  }
  if (snippet) {
    return `服务端返回了非 JSON 文本响应：${snippet}`;
  }
  if (statusHint) {
    return `服务端返回了非 JSON 文本响应（${statusHint}）。`;
  }

  return '服务端返回了非 JSON 文本响应。';
};

export const buildNonJsonDebugBlocks = (responseBody: unknown): AssistantDebugTextBlock[] => {
  const rawResponseText = extractRawResponseText(responseBody);
  const transportError = extractTransportError(responseBody);
  if (!rawResponseText && !transportError) {
    return [];
  }

  const blocks: AssistantDebugTextBlock[] = [];
  const summary = summarizeNonJsonDebugResponse(responseBody);

  if (summary) {
    blocks.push({
      label: '原始响应摘要',
      content: summary
    });
  }

  if (transportError) {
    blocks.push({
      label: '解析失败原因',
      content: transportError
    });
  }

  if (rawResponseText) {
    blocks.push({
      label: '原始响应文本',
      content: rawResponseText
    });
  }

  blocks.push({
    label: '完整响应体',
    content: stringifyDebugValue(responseBody)
  });

  return blocks;
};
