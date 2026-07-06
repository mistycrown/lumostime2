/**
 * @file AIBackfillChatForegroundTurn.ts
 * @input Foreground send text, active session state, and modal orchestration callbacks
 * @output Shared foreground-turn preparation helpers and unified-turn runner for ordinary chat
 * @pos Component Support (AI Integration)
 * @description Extracts the pre-request foreground turn setup and the ordinary unified-turn execution path out of AIBackfillChatModal so the main send handler becomes a thin dispatcher.
 * @updated 2026-07-06: Enforced structured log-query routing, duplicate-query rejection, and clearer local-query summaries so repeated foreground retrieval rounds must actually change the retrieval expression.
 * @updated 2026-07-05: Surfaced local-query keywords and hit summaries in pending chat feedback, and added debug sections for query request/result/retry rounds.
 * @updated 2026-07-05: Wired the foreground local-query loop back into real category/review data and fed accumulated query history into follow-up unified turns.
 * @updated 2026-05-15: Added foreground turn preparation plus unified-turn execution helpers.
 */

import type { AIConversationTurn } from '../../services/aiService';
import type { AppliedChatAction } from '../../services/assistantActionExecutor';
import { assistantLocalSearchService } from '../../services/assistantLocalSearchService';
import type {
  Category,
  DailyReview,
  MonthlyReview,
  Scope,
  TodoCategory,
  TodoItem,
  WeeklyReview
} from '../../types';
import type {
  AssistantLocalQueryRequest,
  AssistantLocalQueryResult,
  AssistantLocalQueryResultItem,
  AssistantTurnDictionaryContext,
  AssistantUnifiedTurnOutput
} from '../../types/assistant';
import type {
  AIChatDebugSection,
  AIChatDebugTextBlock,
  AIChatMemoryUpdateSection,
  AIChatPersona,
  AIChatSession
} from './AIBackfillChatShared';

export interface ForegroundTurnPreparationResult {
  canRetryInPlace: boolean;
  historyBeforeCurrent: AIConversationTurn[];
  now: number;
  pendingMessageId: string;
  sessionId: string;
  userMessageId: string;
}

interface PrepareForegroundTurnOptions {
  activeSession: AIChatSession;
  buildRetryConversationHistory: (sessionId: string, retrySourceUserMessageId?: string) => AIConversationTurn[];
  conversationHistoryCache: Map<string, AIConversationTurn[]>;
  createSessionTitleFromUserMessage: (value: string) => string;
  isMonthlyReviewTemplateSession: boolean;
  isWeeklyReviewTemplateSession: boolean;
  mutateSession: (sessionId: string, updater: (session: AIChatSession) => AIChatSession) => void;
  notifyUserTurn: (text: string, at: string) => Promise<void>;
  onNotifyUserTurnError: (error: unknown) => void;
  retrySourceUserMessageId?: string;
  replaceMessageId?: string;
  setInputText: (value: string) => void;
  trimmedText: string;
}

interface ReplacePendingResultOptions {
  appliedActions?: AppliedChatAction[];
  debugSections?: AIChatDebugSection[];
  displayParts?: string[];
  localQueryResults?: AssistantLocalQueryResult[];
  memoryUpdates?: AIChatMemoryUpdateSection[];
  reasoning?: AssistantUnifiedTurnOutput['reasoning'];
  reminderUpdates?: string[];
  retryInput?: string;
  retrySourceUserMessageId?: string;
  tone?: 'normal' | 'system' | 'error' | 'pending';
}

interface RunOrdinaryForegroundTurnOptions {
  activePersona: AIChatPersona;
  activeRequestRef: { current: { controller: AbortController; pendingMessageId: string; sessionId: string } | null };
  applyAssistantMemoryPatch: (patch?: AssistantUnifiedTurnOutput['memoryPatch']) => AIChatMemoryUpdateSection[];
  applyUnifiedReminders: (output: AssistantUnifiedTurnOutput) => string[];
  applyUnifiedToolCalls: (toolCalls: any[], sourceText: string) => AppliedChatAction[];
  assistantMemoryEnabled: boolean;
  buildDictionaryContext: () => AssistantTurnDictionaryContext | undefined;
  buildDreamContext: (query?: string) => string | undefined;
  buildForegroundAssistantMemory: () => any;
  buildForegroundAssistantReminderSummary: () => string | undefined;
  categories: Category[];
  buildPromptLayers: () => Promise<{ basePrompt: string; foregroundModePrompt: string }>;
  buildStateContext: (currentTurnDate: Date, reminderSummary?: string) => any;
  controller: AbortController;
  debugMode: boolean;
  getErrorDebugSections: (error: unknown, label: string, enabled: boolean) => AIChatDebugSection[] | undefined;
  getRetryableAIErrorMessage: (error: unknown) => string;
  handleRunUnifiedTurn: (args: {
    conversation: any;
    dictionaryContext?: AssistantTurnDictionaryContext;
    dreamContext?: string;
    localQueryHistory?: AssistantLocalQueryResult[];
    memory: any;
    memoryEnabled: boolean;
    modePrompt: string;
    now: number;
    stateContext: any;
    systemPrompt: string;
    userMessage: string;
    userPersonaPrompt: string;
  }, options: { signal: AbortSignal }) => Promise<{ debug: any; output: AssistantUnifiedTurnOutput }>;
  historyBeforeCurrent: AIConversationTurn[];
  isAbortError: (error: unknown) => boolean;
  logs: any[];
  narrowConversationContext: (history: AIConversationTurn[]) => any;
  notifyAssistantTaskStateChanged: () => void;
  now: number;
  pendingMessageId: string;
  replacePendingWithResult: (
    sessionId: string,
    pendingMessageId: string,
    content: string,
    options?: ReplacePendingResultOptions
  ) => void;
  resolveAssistantDisplayParts: (content: string) => string[] | undefined;
  resolveAssistantReplyContent: (
    output?: Pick<AssistantUnifiedTurnOutput, 'assistantReply' | 'outcome'>,
    fallbackReply?: string
  ) => string;
  resolveForegroundAssistantReply: (
    rawContent: string,
    sourceText: string,
    appliedActions: AppliedChatAction[]
  ) => string;
  sessionId: string;
  setIsLoading: (value: boolean) => void;
  todoCategories: TodoCategory[];
  todos: TodoItem[];
  trimmedText: string;
  userMessageId: string;
  weeklyReviews: WeeklyReview[];
  monthlyReviews: MonthlyReview[];
  dailyReviews: DailyReview[];
  scopes: Scope[];
}

const MAX_LOCAL_QUERY_ROUNDS = 3;
const LOCAL_QUERY_CHAT_PREVIEW_LIMIT = 3;

export const prepareForegroundTurn = ({
  activeSession,
  buildRetryConversationHistory,
  conversationHistoryCache,
  createSessionTitleFromUserMessage,
  isMonthlyReviewTemplateSession,
  isWeeklyReviewTemplateSession,
  mutateSession,
  notifyUserTurn,
  onNotifyUserTurnError,
  retrySourceUserMessageId,
  replaceMessageId,
  setInputText,
  trimmedText
}: PrepareForegroundTurnOptions): ForegroundTurnPreparationResult => {
  const sessionId = activeSession.id;
  const canRetryInPlace = Boolean(
    replaceMessageId && activeSession.messages.some((message) => message.id === replaceMessageId)
  );
  const userMessageId = retrySourceUserMessageId || crypto.randomUUID();
  const pendingMessageId = canRetryInPlace && replaceMessageId
    ? replaceMessageId
    : crypto.randomUUID();
  const now = Date.now();
  const historyBeforeCurrent = canRetryInPlace
    ? buildRetryConversationHistory(sessionId, retrySourceUserMessageId)
    : (conversationHistoryCache.get(sessionId) || []);
  const shouldRenameTitle = !isWeeklyReviewTemplateSession
    && !isMonthlyReviewTemplateSession
    && !canRetryInPlace
    && !activeSession.messages.some((message) => message.role === 'user');

  if (canRetryInPlace) {
    mutateSession(sessionId, (session) => ({
      ...session,
      messages: session.messages.map((message) => (
        message.id === pendingMessageId
          ? {
            id: pendingMessageId,
            role: 'assistant',
            content: '我先想一想。',
            createdAt: now,
            tone: 'pending'
          }
          : message
      ))
    }));
  } else {
    mutateSession(sessionId, (session) => ({
      ...session,
      title: shouldRenameTitle ? createSessionTitleFromUserMessage(trimmedText) : session.title,
      messages: [
        ...session.messages,
        {
          id: userMessageId,
          role: 'user',
          content: trimmedText,
          createdAt: now
        },
        {
          id: pendingMessageId,
          role: 'assistant',
          content: '我先想一想。',
          createdAt: now + 1,
          tone: 'pending'
        }
      ]
    }));
  }

  if (!canRetryInPlace) {
    void notifyUserTurn(trimmedText, new Date(now).toISOString()).catch(onNotifyUserTurnError);
    setInputText('');
  }

  return {
    canRetryInPlace,
    historyBeforeCurrent,
    now,
    pendingMessageId,
    sessionId,
    userMessageId
  };
};

const formatQueryTargets = (targets: AssistantLocalQueryRequest['targets']): string => targets.join(' / ');

const normalizeQueryText = (value: string): string => value.trim().replace(/\s+/g, ' ');

const hasLocalQueryOperator = (query: string): boolean => /[#%@^]/.test(query);

const buildQueryPreviewLine = (item: AssistantLocalQueryResultItem, index: number): string => (
  `${index + 1}. [${item.itemType}] ${item.title} | ${item.summary}`
);

const buildLocalQueryDebugSection = (
  label: string,
  blocks: AIChatDebugTextBlock[]
): AIChatDebugSection => ({
  label,
  blocks
});

const isLikelyLogLookup = (userMessage: string, targets: AssistantLocalQueryRequest['targets']): boolean => {
  if (targets.length === 1 && targets[0] === 'logs') {
    return true;
  }

  return /(记录|日志|log|时间线|做了什么|写了什么|最近.*记录)/i.test(userMessage);
};

const resolveQueryRoute = (
  userMessage: string,
  request: AssistantLocalQueryRequest
): Pick<AssistantLocalQueryRequest, 'mode' | 'targets'> => {
  if (isLikelyLogLookup(userMessage, request.targets)) {
    return {
      mode: 'filter_expression',
      targets: ['logs']
    };
  }

  const normalizedTargets = request.targets.includes('all')
    ? ['todos', 'reviews', 'categories', 'activities', 'scopes']
    : request.targets.filter((target) => target !== 'logs');

  return {
    mode: 'keyword_search',
    targets: normalizedTargets.length > 0 ? normalizedTargets : ['todos']
  };
};

const buildLogFilterExpression = (
  rawQuery: string,
  userMessage: string,
  categories: Category[],
  scopes: Scope[]
): string => {
  const searchText = `${rawQuery} ${userMessage}`.toLowerCase();
  const matchedTagNames = Array.from(new Set(categories.flatMap((category) => {
    const matchedNames: string[] = [];
    if (category.name && searchText.includes(category.name.toLowerCase())) {
      matchedNames.push(category.name);
    }
    category.activities.forEach((activity) => {
      if (activity.name && searchText.includes(activity.name.toLowerCase())) {
        matchedNames.push(activity.name);
      }
    });
    return matchedNames;
  }))).slice(0, 3);
  const matchedScopeNames = Array.from(new Set(scopes
    .filter((scope) => scope.name && searchText.includes(scope.name.toLowerCase()))
    .map((scope) => scope.name))).slice(0, 3);

  const parts: string[] = [];
  if (matchedTagNames.length === 1) {
    parts.push(`#${matchedTagNames[0]}`);
  } else if (matchedTagNames.length > 1) {
    parts.push(matchedTagNames.map((name) => `#${name}`).join(' OR '));
  }

  if (matchedScopeNames.length === 1) {
    parts.push(`%${matchedScopeNames[0]}`);
  } else if (matchedScopeNames.length > 1) {
    parts.push(matchedScopeNames.map((name) => `%${name}`).join(' OR '));
  }

  if (parts.length > 0) {
    return parts.join(' ');
  }

  return normalizeQueryText(rawQuery || userMessage);
};

const resolveFilterTagName = (token: string, categories: Category[]): string => {
  const normalized = token.trim().toLowerCase();
  if (!normalized) {
    return token;
  }

  for (const category of categories) {
    if (category.name.toLowerCase() === normalized || category.id.toLowerCase() === normalized) {
      return category.name;
    }

    for (const activity of category.activities) {
      if (activity.name.toLowerCase() === normalized || activity.id.toLowerCase() === normalized) {
        return activity.name;
      }
    }
  }

  return token;
};

const resolveFilterScopeName = (token: string, scopes: Scope[]): string => {
  const normalized = token.trim().toLowerCase();
  if (!normalized) {
    return token;
  }

  const matchedScope = scopes.find((scope) => (
    scope.name.toLowerCase() === normalized || scope.id.toLowerCase() === normalized
  ));

  return matchedScope?.name || token;
};

const resolveFilterTodoName = (
  token: string,
  todos: TodoItem[],
  todoCategories: TodoCategory[]
): string => {
  const normalized = token.trim().toLowerCase();
  if (!normalized) {
    return token;
  }

  const matchedTodo = todos.find((todo) => todo.id.toLowerCase() === normalized || todo.title.toLowerCase() === normalized);
  if (matchedTodo) {
    return matchedTodo.title;
  }

  const matchedCategory = todoCategories.find((category) => (
    category.name.toLowerCase() === normalized || category.id.toLowerCase() === normalized
  ));
  return matchedCategory?.name || token;
};

const normalizeFilterExpressionNames = (
  expression: string,
  categories: Category[],
  scopes: Scope[],
  todos: TodoItem[],
  todoCategories: TodoCategory[]
): string => (
  expression
    .split(/\s+/)
    .map((token) => {
      if (!token) {
        return token;
      }

      if (token.startsWith('#')) {
        return `#${resolveFilterTagName(token.slice(1), categories)}`;
      }

      if (token.startsWith('%')) {
        return `%${resolveFilterScopeName(token.slice(1), scopes)}`;
      }

      if (token.startsWith('@')) {
        return `@${resolveFilterTodoName(token.slice(1), todos, todoCategories)}`;
      }

      return token;
    })
    .join(' ')
    .trim()
);

const normalizeKeywordQueryNames = (
  query: string,
  categories: Category[],
  scopes: Scope[],
  todos: TodoItem[],
  todoCategories: TodoCategory[]
): string => (
  query
    .split(/\s+/)
    .map((token) => {
      const normalized = token.trim();
      if (!normalized) {
        return normalized;
      }

      return resolveFilterTagName(
        resolveFilterScopeName(
          resolveFilterTodoName(normalized, todos, todoCategories),
          scopes
        ),
        categories
      );
    })
    .join(' ')
    .trim()
);

export const normalizeLocalQueryRequestForExecution = (
  userMessage: string,
  request: AssistantLocalQueryRequest,
  categories: Category[],
  scopes: Scope[],
  todos: TodoItem[],
  todoCategories: TodoCategory[]
): AssistantLocalQueryRequest => {
  const route = resolveQueryRoute(userMessage, request);
  const baseQuery = normalizeQueryText(request.query || userMessage);
  const routedQuery = route.mode === 'filter_expression'
    ? (
      hasLocalQueryOperator(baseQuery)
        ? baseQuery
        : buildLogFilterExpression(baseQuery, userMessage, categories, scopes)
    )
    : baseQuery;
  const query = route.mode === 'filter_expression'
    ? normalizeFilterExpressionNames(routedQuery, categories, scopes, todos, todoCategories)
    : normalizeKeywordQueryNames(routedQuery, categories, scopes, todos, todoCategories);

  return {
    ...request,
    mode: route.mode,
    targets: route.targets,
    query
  };
};

const buildQuerySignature = (request: AssistantLocalQueryRequest): string => (
  `${request.mode}|${request.targets.join(',')}|${request.query.trim().toLowerCase()}|${request.limit || 20}`
);

const buildQueryRequestSummary = (
  request: AssistantLocalQueryRequest,
  round: number
): string => ([
  `正在查询第 ${round} 轮`,
  `范围：${formatQueryTargets(request.targets)}`,
  `关键词：${request.query}`,
  `方式：${request.mode === 'filter_expression' ? '筛选表达式' : '关键词检索'}`,
  `请求回灌：${request.limit || 20} 条`
].join('\n'));

const buildQueryResultSummary = (result: AssistantLocalQueryResult): string => {
  if (result.status === 'rejected_duplicate') {
    return [
      `第 ${result.round} 轮未执行`,
      `范围：${formatQueryTargets(result.request.targets)}`,
      `关键词：${result.request.query}`,
      `请求回灌：${result.request.limit || 20} 条`,
      result.statusMessage || '这轮查询与上一轮完全相同，已拒绝执行。'
    ].join('\n');
  }

  const previewItems = result.items.slice(0, LOCAL_QUERY_CHAT_PREVIEW_LIMIT);

  return [
    `第 ${result.round} 轮查询完成`,
    `范围：${formatQueryTargets(result.request.targets)}`,
    `关键词：${result.request.query}`,
    `完整命中：${result.hitCount} 条`,
    `当前回灌：${result.items.length} 条（请求 ${result.request.limit || 20} 条）`,
    ...(previewItems.length > 0
      ? [
        '前几条结果：',
        ...previewItems.map(buildQueryPreviewLine)
      ]
      : ['结果：没有找到匹配项']),
    '我继续基于这些结果分析…'
  ].join('\n');
};

export const runOrdinaryForegroundTurn = async ({
  activePersona,
  activeRequestRef,
  applyAssistantMemoryPatch,
  applyUnifiedReminders,
  applyUnifiedToolCalls,
  assistantMemoryEnabled,
  buildDictionaryContext,
  buildDreamContext,
  buildForegroundAssistantMemory,
  buildForegroundAssistantReminderSummary,
  categories,
  buildPromptLayers,
  buildStateContext,
  controller,
  debugMode,
  getErrorDebugSections,
  getRetryableAIErrorMessage,
  handleRunUnifiedTurn,
  historyBeforeCurrent,
  isAbortError,
  logs,
  narrowConversationContext,
  notifyAssistantTaskStateChanged,
  now,
  pendingMessageId,
  replacePendingWithResult,
  resolveAssistantDisplayParts,
  resolveAssistantReplyContent,
  resolveForegroundAssistantReply,
  sessionId,
  setIsLoading,
  trimmedText,
  todoCategories,
  todos,
  userMessageId,
  weeklyReviews,
  monthlyReviews,
  dailyReviews,
  scopes
}: RunOrdinaryForegroundTurnOptions): Promise<void> => {
  try {
    const currentTurnDate = new Date();
    const debugSections: AIChatDebugSection[] = [];
    let aiCallCount = 0;
    const { basePrompt, foregroundModePrompt } = await buildPromptLayers();
    const narrowedConversationContext = narrowConversationContext(historyBeforeCurrent);
    const stateContext = buildStateContext(
      currentTurnDate,
      buildForegroundAssistantReminderSummary()
    );
    const dictionaryContext = buildDictionaryContext();
    const dreamContext = buildDreamContext(trimmedText);
    const localQueryHistory: AssistantLocalQueryResult[] = [];

    const runTurn = async () => {
      aiCallCount += 1;
      const unifiedTurnResult = await handleRunUnifiedTurn({
        conversation: narrowedConversationContext,
        ...(dictionaryContext ? { dictionaryContext } : {}),
        ...(dreamContext ? { dreamContext } : {}),
        ...(localQueryHistory.length > 0 ? { localQueryHistory: [...localQueryHistory] } : {}),
        memory: buildForegroundAssistantMemory(),
        memoryEnabled: assistantMemoryEnabled,
        modePrompt: foregroundModePrompt,
        now,
        stateContext,
        systemPrompt: basePrompt,
        userMessage: trimmedText,
        userPersonaPrompt: activePersona.systemPrompt ? '' : ''
      }, {
        signal: controller.signal
      });

      if (debugMode) {
        debugSections.push({
          label: localQueryHistory.length > 0
            ? `统一单轮调用 · 第 ${aiCallCount} 次（带本地查询上下文）`
            : `统一单轮调用 · 第 ${aiCallCount} 次`,
          exchange: unifiedTurnResult.debug
        });
      }

      return unifiedTurnResult.output;
    };

    let output = await runTurn();
    let round = 0;

    while (output.localQueryRequest && round < MAX_LOCAL_QUERY_ROUNDS && !controller.signal.aborted) {
      round += 1;
      const queryRequest = normalizeLocalQueryRequestForExecution(
        trimmedText,
        output.localQueryRequest,
        categories,
        scopes,
        todos,
        todoCategories
      );
      const querySignature = buildQuerySignature(queryRequest);
      const hasDuplicateQuery = localQueryHistory.some((entry) => buildQuerySignature(entry.request) === querySignature);

      replacePendingWithResult(sessionId, pendingMessageId, buildQueryRequestSummary(queryRequest, round), {
        tone: 'pending'
      });

      if (debugMode) {
        debugSections.push(buildLocalQueryDebugSection(`本地查询请求 · 第 ${round} 轮`, [{
          label: '请求摘要',
          content: buildQueryRequestSummary(queryRequest, round)
        }]));
      }

      const queryResult = hasDuplicateQuery
        ? assistantLocalSearchService.buildSkippedResult(
          round,
          queryRequest,
          '这轮查询与上一轮检索式完全相同，已拒绝执行。请改用新的筛选表达式或新的关键词。'
        )
        : assistantLocalSearchService.runQuery({
          round,
          request: queryRequest,
          logs: (logs || []) as never[],
          categories,
          todos,
          todoCategories,
          scopes,
          dailyReviews,
          weeklyReviews,
          monthlyReviews
        });

      localQueryHistory.push(queryResult);
      replacePendingWithResult(sessionId, pendingMessageId, buildQueryResultSummary(queryResult), {
        tone: 'pending'
      });

      if (debugMode) {
        debugSections.push(buildLocalQueryDebugSection(`本地查询结果 · 第 ${round} 轮`, [
          {
            label: '结果摘要',
            content: buildQueryResultSummary(queryResult)
          },
          {
            label: '结构化结果',
            content: JSON.stringify(queryResult, null, 2)
          },
          {
            label: '回灌 Digest',
            content: queryResult.digest
          }
        ]));
      }

      output = await runTurn();
    }

    if (controller.signal.aborted || activeRequestRef.current?.pendingMessageId !== pendingMessageId) {
      return;
    }

    const outputForReply = output.localQueryRequest && localQueryHistory.length >= MAX_LOCAL_QUERY_ROUNDS
      ? {
        ...output,
        localQueryRequest: undefined,
        outcome: 'reply' as const,
        assistantReply: output.assistantReply || '我已经查过本地资料了，但还是没找到足够确定的依据。你可以再补一句更具体的线索。'
      }
      : output;

    const toolCalls = outputForReply.toolCalls || [];
    const unifiedAppliedActions = toolCalls.length > 0
      ? applyUnifiedToolCalls(toolCalls, trimmedText)
      : [];
    const unifiedSuccessCount = unifiedAppliedActions.filter((action) => action.status === 'applied').length;

    const reminderUpdates = applyUnifiedReminders(outputForReply);
    const memoryUpdates = assistantMemoryEnabled && outputForReply.memoryAction === 'update_memory'
      ? applyAssistantMemoryPatch(outputForReply.memoryPatch)
      : [];

    const rawUnifiedContent = resolveAssistantReplyContent(
      outputForReply,
      unifiedSuccessCount > 0
        ? `我先帮你处理好了 ${unifiedSuccessCount} 项。`
        : ((outputForReply.reminders || []).length > 0
          ? '我记下来了，之后会提醒你。'
          : undefined)
    );
    const unifiedContent = resolveForegroundAssistantReply(rawUnifiedContent, trimmedText, unifiedAppliedActions);
    const displayParts = resolveAssistantDisplayParts(unifiedContent);

    replacePendingWithResult(sessionId, pendingMessageId, unifiedContent, {
      ...(outputForReply.reasoning ? { reasoning: outputForReply.reasoning } : {}),
      ...(localQueryHistory.length > 0 ? { localQueryResults: localQueryHistory } : {}),
      ...(displayParts?.length ? { displayParts } : {}),
      debugSections,
      ...(unifiedAppliedActions.length > 0 ? { appliedActions: unifiedAppliedActions } : {}),
      ...(memoryUpdates.length > 0 ? { memoryUpdates: memoryUpdates } : {}),
      ...(reminderUpdates.length > 0 ? { reminderUpdates } : {})
    });
    if (unifiedAppliedActions.length > 0 || reminderUpdates.length > 0) {
      notifyAssistantTaskStateChanged();
    }
  } catch (error) {
    const isCurrentPendingRequest = activeRequestRef.current?.pendingMessageId === pendingMessageId;

    if (isAbortError(error)) {
      if (isCurrentPendingRequest) {
        replacePendingWithResult(sessionId, pendingMessageId, '已停止这次请求。', {
          tone: 'system'
        });
      }
      return;
    }

    if (!isCurrentPendingRequest || controller.signal.aborted) {
      return;
    }

    const message = getRetryableAIErrorMessage(error);
    replacePendingWithResult(sessionId, pendingMessageId, message, {
      tone: 'error',
      retryInput: trimmedText,
      retrySourceUserMessageId: userMessageId,
      debugSections: getErrorDebugSections(error, '统一单轮调用', debugMode)
    });
  } finally {
    if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
      activeRequestRef.current = null;
      setIsLoading(false);
    }
  }
};
