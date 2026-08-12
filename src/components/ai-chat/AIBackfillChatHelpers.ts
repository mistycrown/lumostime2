/**
 * @file AIBackfillChatHelpers.ts
 * @input AI debug exchanges, assistant memory/reminder snapshots, background history entries, and lightweight chat formatting values
 * @output Reusable formatter/debug/helper functions for AIBackfillChatModal
 * @pos Component Support (AI Integration)
 * @description Moves pure formatting, debug rendering, and retry/error helpers out of AIBackfillChatModal so the modal can focus on state transitions and user actions.
 * @updated 2026-08-11: Added a debug-mode fallback section for AI exceptions that do not carry a captured request exchange, so Dream and other failed turns retain an inspectable error record.
 * @updated 2026-08-10: Shows the concrete AI request transport in request metadata so Android native and Web Fetch failures can be distinguished.
 * @updated 2026-05-16: Preserved pre-section prompt text in debug rendering so unlabeled instructions remain visible above structured prompt sections.
 * @updated 2026-05-16: Limited persona custom prompt block serialization to enabled blocks only.
 * @updated 2026-05-16: Extended persona prompt assembly so labeled custom prompt blocks are appended into the AI request alongside the base persona prompt.
 * @updated 2026-05-15: Extracted chat formatting, debug block generation, background-history labels, and retry/debug helpers from AIBackfillChatModal.
 */
import type { AIDebugExchange } from '../../services/aiService';
import type { AssistantBackgroundCallHistoryEntry } from '../../services/assistantOrchestratorService';
import type {
  AssistantMemory,
  AssistantNativeDiagnosticEntry,
  AssistantReminder
} from '../../types/assistant';
import {
  formatAssistantDateTimeForDisplay,
  formatAssistantLocalDateTime,
  getAssistantDelayMinutes
} from '../../utils/assistantTime';
import {
  buildNonJsonDebugBlocks,
  summarizeNonJsonDebugResponse,
  type AssistantDebugTextBlock as DebugTextBlock
} from '../../utils/assistantDebugFormat';
import type {
  AIChatCustomPromptBlock,
  AIChatDebugSection,
  AIChatMemoryUpdateSection,
  AIChatPersona,
  AssistantBackgroundTimelineEntry
} from './AIBackfillChatShared';

export const formatDateLabel = (date: Date): string => (
  new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(date)
);

export const formatTimeRange = (startTime: number, endTime: number): string => {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return `${formatter.format(startTime)} - ${formatter.format(endTime)}`;
};

export const formatDateTimeRange = (startTime: number, endTime: number): string => (
  `${new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  }).format(startTime)} · ${formatTimeRange(startTime, endTime)}`
);

export const formatActionDate = (timestamp: number): string => (
  new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric'
  }).format(timestamp)
);

export const formatConversationTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${month}月${day}日 ${hour}:${minute}`;
};

export const createSessionTitleFromUserMessage = (text: string): string => {
  const condensed = text.trim().replace(/\s+/g, ' ');
  if (!condensed) {
    return '新对话';
  }
  return condensed.length > 18 ? `${condensed.slice(0, 18)}…` : condensed;
};

export const truncateText = (value: string, maxLength: number): string => (
  value.length > maxLength
    ? `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
    : value
);

export const TIME_SENSITIVE_MESSAGE_PATTERN = /今天|明天|后天|昨天|今晚|今早|明早|下午|晚上|下周|本周|这周|周[一二三四五六日天]|星期[一二三四五六日天]|月底|月初|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}月\d{1,2}日|\d{1,2}:\d{2}/;

export const formatLocalDateTimeContext = (date: Date): string => formatAssistantLocalDateTime(date);

export const formatAssistantDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const buildAssistantCurrentTimeSnapshot = (date: Date) => ({
  currentDateTime: formatLocalDateTimeContext(date),
  stateContextDate: formatAssistantDateKey(date)
});

const splitLabeledSections = (content: string): { leadingContent: string; sections: DebugTextBlock[] } => {
  const normalized = content.trim();
  if (!normalized.includes('=== ')) {
    return {
      leadingContent: '',
      sections: []
    };
  }

  const markerRegex = /^===\s+(.+?)\s+===$/gm;
  const matches = Array.from(normalized.matchAll(markerRegex));
  if (matches.length === 0) {
    return {
      leadingContent: '',
      sections: []
    };
  }

  const sections = matches.map((match, index) => {
    const label = match[1]?.trim() || '';
    const start = (match.index || 0) + match[0].length;
    const end = index + 1 < matches.length ? (matches[index + 1].index || normalized.length) : normalized.length;
    const sectionContent = normalized.slice(start, end).trim();
    return {
      label,
      content: sectionContent
    };
  }).filter((section) => section.label && section.content);

  return {
    leadingContent: normalized.slice(0, matches[0]?.index || 0).trim(),
    sections
  };
};

const mapPromptSectionLabel = (label: string): string => {
  switch (label) {
    case 'Assistant Base Prompt':
      return '基础 System Prompt';
    case 'Foreground Mode Prompt':
      return '前台调用 Prompt';
    case 'Background Mode Prompt':
      return '后台调用 Prompt';
    case 'User Persona Prompt':
      return '人格 Prompt';
    case 'Foreground Tool Prompt':
    case 'Background Tool Prompt':
    case 'Tool and Mode Rules':
      return '工具与模式规则 Prompt';
    case 'Memory Update Rules':
      return '记忆更新规则 Prompt';
    case 'Unified Turn Output Schema':
      return '统一输出 Schema';
    case 'Memory Snapshot':
      return '长期记忆快照';
    case 'State Context':
      return '应用状态上下文';
    case 'Recent Logs Digest':
      return '近期日志摘要上下文';
    case 'Dictionary Context':
      return '应用候选字典上下文';
    case 'Trigger':
      return '触发信息';
    case 'Conversation Context':
      return '对话上下文';
    default:
      return label;
  }
};

const toPrettyJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    console.error('[AIBackfillChatModal] Failed to stringify debug payload', error);
    return String(value);
  }
};

const normalizeDebugText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }
  return toPrettyJson(value).trim();
};

export const buildMemoryUpdateSections = (
  before: AssistantMemory,
  after: AssistantMemory
): AIChatMemoryUpdateSection[] => {
  const sections: AIChatMemoryUpdateSection[] = [];

  const addedProfile = after.profileMemory.filter((item) => !before.profileMemory.includes(item));
  if (addedProfile.length > 0) {
    sections.push({ label: '用户画像记忆', items: addedProfile });
  }

  const addedPreferences = after.preferenceMemory.filter((item) => !before.preferenceMemory.includes(item));
  if (addedPreferences.length > 0) {
    sections.push({ label: '偏好记忆', items: addedPreferences });
  }

  if (after.lastKnownState && after.lastKnownState !== before.lastKnownState) {
    sections.push({ label: '当前状态', items: [after.lastKnownState] });
  }

  if (after.workingMemorySummary && after.workingMemorySummary !== before.workingMemorySummary) {
    sections.push({ label: '工作记忆摘要', items: [after.workingMemorySummary] });
  }

  const addedDecisions = after.recentDecisions.filter((item) => !before.recentDecisions.includes(item));
  if (addedDecisions.length > 0) {
    sections.push({ label: '决策摘要', items: addedDecisions });
  }

  return sections;
};

export const buildDebugBlocks = (exchange: AIDebugExchange): DebugTextBlock[] => {
  const blocks: DebugTextBlock[] = [];
  const requestBody = exchange.request.body as Record<string, unknown> | null | undefined;
  const responseBody = exchange.response.body as Record<string, unknown> | null | undefined;

  blocks.push({
    label: '请求元信息',
    content: [
      `provider: ${exchange.provider}`,
      `transport: ${exchange.transport === 'native-http' ? 'Android Native HTTP' : 'Web Fetch'}`,
      `requestedAt: ${exchange.requestedAt}`,
      `completedAt: ${exchange.completedAt}`,
      `url: ${exchange.request.url}`,
      `method: ${exchange.request.method}`
    ].join('\n')
  });

  if (exchange.cache) {
    const cacheLines = [
      `providerFamily: ${exchange.cache.providerFamily}`,
      `strategy: ${exchange.cache.strategy}`,
      ...(exchange.cache.key ? [`key: ${exchange.cache.key}`] : []),
      ...(exchange.cache.metrics?.cachedTokens !== undefined ? [`cachedTokens: ${exchange.cache.metrics.cachedTokens}`] : []),
      ...(exchange.cache.metrics?.promptCacheHitTokens !== undefined ? [`promptCacheHitTokens: ${exchange.cache.metrics.promptCacheHitTokens}`] : []),
      ...(exchange.cache.metrics?.promptCacheMissTokens !== undefined ? [`promptCacheMissTokens: ${exchange.cache.metrics.promptCacheMissTokens}`] : []),
      ...(exchange.cache.metrics?.cacheCreationInputTokens !== undefined ? [`cacheCreationInputTokens: ${exchange.cache.metrics.cacheCreationInputTokens}`] : []),
      ...(exchange.cache.metrics?.cacheReadInputTokens !== undefined ? [`cacheReadInputTokens: ${exchange.cache.metrics.cacheReadInputTokens}`] : []),
      ...(exchange.cache.metrics?.cacheWriteTokens !== undefined ? [`cacheWriteTokens: ${exchange.cache.metrics.cacheWriteTokens}`] : [])
    ];

    blocks.push({
      label: '缓存信息',
      content: cacheLines.join('\n')
    });
  }

  blocks.push({
    label: '请求头',
    content: toPrettyJson(exchange.request.headers)
  });

  blocks.push({
    label: '完整请求体',
    content: toPrettyJson(exchange.request.body)
  });

  const modelValue = typeof requestBody?.model === 'string'
    ? requestBody.model
    : typeof requestBody?.['model'] === 'string'
      ? String(requestBody.model)
      : '';
  if (modelValue) {
    blocks.push({
      label: '模型',
      content: modelValue
    });
  }

  const openAIMessages = Array.isArray(requestBody?.messages)
    ? requestBody.messages as Array<{ role?: string; content?: unknown }>
    : [];
  if (openAIMessages.length > 0) {
    const systemMessage = openAIMessages.find((message) => message.role === 'system');
    const historyMessages = openAIMessages.slice(systemMessage ? 1 : 0, -1);
    const latestUserMessage = openAIMessages[openAIMessages.length - 1];

    if (systemMessage?.content) {
      const systemPromptContent = normalizeDebugText(systemMessage.content);
      const { leadingContent, sections: promptSections } = splitLabeledSections(systemPromptContent);
      if (promptSections.length > 0) {
        if (leadingContent) {
          blocks.push({
            label: '前置系统提示',
            content: leadingContent
          });
        }
        blocks.push(...promptSections.map((section) => ({
          label: mapPromptSectionLabel(section.label),
          content: section.content
        })));
      } else {
        blocks.push({
          label: '系统提示词',
          content: systemPromptContent
        });
      }
    }

    if (historyMessages.length > 0) {
      blocks.push({
        label: '对话上下文',
        content: historyMessages.map((message) => (
          `${message.role === 'assistant' ? 'assistant' : 'user'}:\n${normalizeDebugText(message.content || '')}`
        )).join('\n\n')
      });
    }

    if (latestUserMessage?.content) {
      const userPromptContent = normalizeDebugText(latestUserMessage.content);
      const { leadingContent, sections: userPromptSections } = splitLabeledSections(userPromptContent);
      if (userPromptSections.length > 0) {
        if (leadingContent) {
          blocks.push({
            label: '前置用户输入',
            content: leadingContent
          });
        }
        blocks.push(...userPromptSections.map((section) => ({
          label: mapPromptSectionLabel(section.label),
          content: section.content
        })));
      } else {
        blocks.push({
          label: '最终用户输入',
          content: userPromptContent
        });
      }
    }
  }

  const geminiSystemInstruction = requestBody?.system_instruction as { parts?: Array<{ text?: string }> } | undefined;
  if (!openAIMessages.length && geminiSystemInstruction?.parts?.length) {
    const systemPromptContent = geminiSystemInstruction.parts.map((part) => part.text || '').filter(Boolean).join('\n\n').trim();
    const { leadingContent, sections: promptSections } = splitLabeledSections(systemPromptContent);
    if (promptSections.length > 0) {
      if (leadingContent) {
        blocks.push({
          label: '前置系统提示',
          content: leadingContent
        });
      }
      blocks.push(...promptSections.map((section) => ({
        label: mapPromptSectionLabel(section.label),
        content: section.content
      })));
    } else {
      blocks.push({
        label: '系统提示词',
        content: systemPromptContent
      });
    }
  }

  const geminiContents = Array.isArray(requestBody?.contents)
    ? requestBody.contents as Array<{ role?: string; parts?: Array<{ text?: string }> }>
    : [];
  if (!openAIMessages.length && geminiContents.length > 0) {
    const conversationItems = geminiContents.slice(0, -1);
    const finalUser = geminiContents[geminiContents.length - 1];

    if (conversationItems.length > 0) {
      blocks.push({
        label: '对话上下文',
        content: conversationItems.map((item) => (
          `${item.role || 'user'}:\n${(item.parts || []).map((part) => part.text || '').filter(Boolean).join('\n')}`
        )).join('\n\n')
      });
    }

    if (finalUser?.parts?.length) {
      const userPromptContent = finalUser.parts.map((part) => part.text || '').filter(Boolean).join('\n').trim();
      const { leadingContent, sections: userPromptSections } = splitLabeledSections(userPromptContent);
      if (userPromptSections.length > 0) {
        if (leadingContent) {
          blocks.push({
            label: '前置用户输入',
            content: leadingContent
          });
        }
        blocks.push(...userPromptSections.map((section) => ({
          label: mapPromptSectionLabel(section.label),
          content: section.content
        })));
      } else {
        blocks.push({
          label: '最终用户输入',
          content: userPromptContent
        });
      }
    }
  }

  const openAIResponseContent = typeof (responseBody as any)?.choices?.[0]?.message?.content === 'string'
    ? (responseBody as any).choices[0].message.content.trim()
    : '';
  const geminiResponseContent = typeof (responseBody as any)?.candidates?.[0]?.content?.parts?.[0]?.text === 'string'
    ? (responseBody as any).candidates[0].content.parts[0].text.trim()
    : '';
  const responseContent = openAIResponseContent || geminiResponseContent;
  if (responseContent) {
    blocks.push({
      label: '模型原始输出',
      content: responseContent
    });
  }

  blocks.push(...buildNonJsonDebugBlocks(responseBody));

  return blocks.filter((block) => block.content.trim().length > 0);
};

export const buildBackgroundSummaryDebugExchange = (
  entry: AssistantBackgroundCallHistoryEntry
): AIDebugExchange => {
  const summaryLines = [
    `triggerType: ${entry.triggerType || '-'}`,
    ...(entry.triggerId ? [`triggerId: ${entry.triggerId}`] : []),
    `status: ${entry.status}`,
    `action: ${entry.action}`,
    `memoryAction: ${entry.memoryAction}`,
    `reminderCount: ${entry.reminderCount}`,
    ...(entry.silentReason ? [`silentReason: ${entry.silentReason}`] : []),
    ...(entry.sideEffects?.length ? [`sideEffects: ${entry.sideEffects.join('；')}`] : []),
    ...(entry.decisionSummary ? [`decisionSummary: ${entry.decisionSummary}`] : []),
    ...(entry.errorMessage ? [`errorMessage: ${entry.errorMessage}`] : [])
  ];

  const responseSummary = [
    entry.message?.trim() || '',
    entry.decisionSummary?.trim() || '',
    entry.errorMessage?.trim() || ''
  ].filter(Boolean).join('\n\n');

  return {
    provider: 'openai',
    transport: 'native-http',
    requestedAt: entry.requestedAt,
    completedAt: entry.completedAt || entry.requestedAt,
    request: {
      url: 'native://assistant-background-summary',
      method: 'POST',
      headers: {},
      body: {
        model: 'native-background-summary',
        messages: [
          {
            role: 'system',
            content: [
              '=== 后台摘要 ===',
              summaryLines.join('\n')
            ].join('\n')
          },
          {
            role: 'user',
            content: [
              '=== 后台触发 ===',
              `triggerText: ${entry.triggerText || '-'}`,
              ...(entry.targetSessionId ? [`targetSessionId: ${entry.targetSessionId}`] : [])
            ].join('\n')
          }
        ]
      }
    },
    response: {
      status: entry.status === 'failed' ? 500 : 200,
      ok: entry.status !== 'failed',
      body: {
        choices: [{
          message: {
            content: responseSummary || '后台原生请求没有返回更详细的调试正文。'
          }
        }]
      }
    }
  };
};

export const normalizeAssistantNativeDiagnostics = (value: unknown): AssistantNativeDiagnosticEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Partial<AssistantNativeDiagnosticEntry>;
    const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
    const type = typeof candidate.type === 'string' ? candidate.type.trim() : '';
    const level = candidate.level === 'success'
      || candidate.level === 'warning'
      || candidate.level === 'error'
      ? candidate.level
      : 'info';
    const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt.trim() : '';
    const message = typeof candidate.message === 'string' ? candidate.message.trim() : '';
    const context = candidate.context && typeof candidate.context === 'object'
      ? Object.fromEntries(
        Object.entries(candidate.context as Record<string, unknown>)
          .map(([key, entryValue]) => [key.trim(), typeof entryValue === 'string' ? entryValue.trim() : String(entryValue ?? '')])
          .filter(([key, entryValue]) => key && entryValue)
      )
      : undefined;

    if (!id || !type || !createdAt || !message) {
      return [];
    }

    return [{
      id,
      type: type as AssistantNativeDiagnosticEntry['type'],
      level,
      createdAt,
      message,
      ...(typeof candidate.triggerId === 'string' && candidate.triggerId.trim() ? { triggerId: candidate.triggerId.trim() } : {}),
      ...(typeof candidate.triggerType === 'string' && candidate.triggerType.trim() ? { triggerType: candidate.triggerType.trim() as AssistantNativeDiagnosticEntry['triggerType'] } : {}),
      ...(typeof candidate.reason === 'string' && candidate.reason.trim() ? { reason: candidate.reason.trim() } : {}),
      ...(context && Object.keys(context).length > 0 ? { context } : {})
    }];
  });
};

export const getAssistantBackgroundTriggerLabel = (triggerType?: string): string => {
  switch (triggerType) {
    case 'checkin':
      return '后台 check-in';
    case 'assistant_letter_due':
      return 'AI 来信';
    case 'manual_background_nudge':
      return '手动后台触发';
    case 'reminder_due':
      return 'Reminder 到点';
    case 'long_idle':
      return '长时间空闲';
    case 'log_submitted':
      return '日志提交';
    case 'focus_started':
      return '专注开始';
    case 'focus_ended':
      return '专注结束';
    case 'todo_changed':
      return '任务变更';
    default:
      return triggerType || '后台触发';
  }
};

export const getAssistantBackgroundRequestStatusLabel = (status: AssistantBackgroundTimelineEntry['requestStatus']): string => {
  switch (status) {
    case 'not_started':
      return '未开始请求';
    case 'pending':
      return '请求中';
    case 'completed':
      return '请求成功';
    case 'failed':
      return '请求失败';
    default:
      return status;
  }
};

export const formatAssistantReminderSnapshot = (reminders: AssistantReminder[]): string => {
  if (!reminders.length) {
    return '暂无';
  }

  return reminders.map((reminder, index) => {
    const delayMinutes = getAssistantDelayMinutes(reminder.dueAt, reminder.lastDispatchedAt);

    return [
      `${index + 1}. ${reminder.text}`,
      `   type: ${reminder.type}`,
      `   status: ${reminder.status}`,
      `   scheduledDueAt: ${formatAssistantDateTimeForDisplay(reminder.dueAt)}`,
      `   lastDispatchAttemptAt: ${formatAssistantDateTimeForDisplay(reminder.lastDispatchAttemptAt) || '-'}`,
      `   actualDispatchAt: ${formatAssistantDateTimeForDisplay(reminder.lastDispatchedAt) || '-'}`,
      `   delayMinutes: ${delayMinutes ?? '-'}`,
      `   dispatchAttemptCount: ${reminder.dispatchAttemptCount || 0}`
    ].join('\n');
  }).join('\n\n');
};

export const buildPersonaPrompt = (
  persona: AIChatPersona,
  customPromptBlocks: AIChatCustomPromptBlock[] = []
): string => {
  const lines: string[] = [];
  const enabledCustomPromptBlocks = customPromptBlocks.filter((block) => (
    block.enabled && (block.title.trim() || block.content.trim())
  ));

  if (persona.name.trim()) {
    lines.push(`你当前的人设名字是“${persona.name.trim()}”。`);
  }
  if (persona.assistantSelfName.trim()) {
    lines.push(`如果需要自称，优先使用“${persona.assistantSelfName.trim()}”。`);
  }
  if (persona.userCallName.trim()) {
    lines.push(`称呼用户时优先使用“${persona.userCallName.trim()}”。`);
  }
  if (persona.systemPrompt.trim()) {
    lines.push(persona.systemPrompt.trim());
  }
  if (enabledCustomPromptBlocks.length > 0) {
    lines.push('请额外遵守以下自定义提示词块：');
    enabledCustomPromptBlocks.forEach((block, index) => {
      const label = block.title.trim() || `提示词块 ${index + 1}`;
      const content = block.content.trim();
      lines.push(content ? `【${label}】\n${content}` : `【${label}】`);
    });
  }

  return lines.join('\n\n');
};

export const dedupeStringArray = (values: Array<string | undefined | null>): string[] => (
  Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim())).map((value) => value.trim())))
);

export const isAbortError = (error: unknown): boolean => (
  error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error
      ? error.name === 'AbortError' || /aborted|abort/i.test(error.message)
      : false
);

export const getRetryableAIErrorMessage = (error: unknown): string => {
  const debugExchange = (
    typeof error === 'object'
    && error !== null
    && 'debug' in error
  )
    ? (error as { debug?: AIDebugExchange }).debug
    : undefined;
  const debugResponseBody = debugExchange?.response?.body;
  const nonJsonSummary = summarizeNonJsonDebugResponse(debugResponseBody, debugExchange?.response?.status);
  if (nonJsonSummary) {
    return `AI 请求失败：${nonJsonSummary}`;
  }

  const debugTransportError = (
    typeof debugResponseBody === 'object'
    && debugResponseBody !== null
    && 'transportError' in (debugResponseBody as Record<string, unknown>)
  )
    ? String((debugResponseBody as Record<string, unknown>).transportError || '')
    : '';

  const rawMessage = error instanceof Error ? error.message : String(error || '');
  const message = (debugTransportError || rawMessage || '').trim();

  if (!message) {
    return 'AI 请求失败了。你可以点“重试”再试一次。';
  }

  if (/failed to fetch|networkerror|load failed|err_connection_closed|err_connection_reset|err_connection_close/i.test(message)) {
    return '网络连接失败，可能是连接被关闭、网络波动，或 AI 服务暂时不可用。你可以点“重试”再试一次。';
  }

  if (/timeout|timed out|network request failed/i.test(message)) {
    return '请求超时了，可能是网络较慢或 AI 服务响应过久。你可以点“重试”再试一次。';
  }

  return `AI 请求失败：${message}`;
};

export const getErrorDebugSections = (
  error: unknown,
  label: string,
  enabled: boolean
): AIChatDebugSection[] | undefined => {
  if (!enabled) {
    return undefined;
  }

  const exchange = (
    typeof error === 'object'
    && error !== null
    && 'debug' in error
  )
    ? (error as { debug?: AIDebugExchange }).debug
    : undefined;
  return exchange
    ? [{
      label,
      exchange
    }]
    : [{
      label,
      blocks: [
        {
          label: '异常信息',
          content: error instanceof Error
            ? [
              `名称：${error.name || 'Error'}`,
              `消息：${error.message || '无错误消息'}`,
              ...(error.stack ? [`堆栈：\n${error.stack}`] : [])
            ].join('\n\n')
            : String(error || '未知错误')
        },
        {
          label: '请求快照状态',
          content: '该异常未携带 AI 服务层捕获的请求/响应快照。请结合异常信息检查 Dream 工作流或上游服务日志。'
        }
      ]
    }];
};
