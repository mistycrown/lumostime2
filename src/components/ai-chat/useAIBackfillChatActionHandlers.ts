/**
 * @file useAIBackfillChatActionHandlers.ts
 * @input Local logs/todos dictionaries, auto-link settings, and assistant tool-call payloads
 * @output Tool-call application helpers and local-query guards for the AI chat coordinator
 * @pos Component Support (AI Integration)
 * @description Keeps assistant action-context assembly and state synchronization out of the main chat modal.
 * @updated 2026-09-22: Extracted tool-call application adapters from AIBackfillChatModal.
 */
import type { Dispatch, SetStateAction } from 'react';
import type { AutoLinkRule, Category, Log, Scope, TodoCategory, TodoItem } from '../../types';
import type { AssistantLocalQueryResult } from '../../types/assistant';
import type {
  AIPlannedLogToolCall,
  AICreatePrincipleToolCall,
  AICreateSelfBeliefToolCall,
  AICreateSubtaskToolCall,
  AIEditLogToolCall,
  AITodoToolCall,
  AITodoUpdateToolCall
} from '../../services/aiService';
import { assistantActionExecutor, type AppliedChatAction, type AssistantActionExecutionContext } from '../../services/assistantActionExecutor';
import type { AIBackfillToolCall, AIQuickAddNoteToolCall } from '../../services/quickAddService';

export interface AIBackfillChatActionHandlerOptions {
  autoApplyAutoLinkRules: boolean;
  autoLinkRules: AutoLinkRule[];
  categories: Category[];
  defaultDateKey: string;
  logs: Log[];
  scopes: Scope[];
  setLogs: Dispatch<SetStateAction<Log[]>>;
  setTodos: Dispatch<SetStateAction<TodoItem[]>>;
  todoCategories: TodoCategory[];
  todos: TodoItem[];
}

export const useAIBackfillChatActionHandlers = ({
  autoApplyAutoLinkRules,
  autoLinkRules,
  categories,
  defaultDateKey,
  logs,
  scopes,
  setLogs,
  setTodos,
  todoCategories,
  todos
}: AIBackfillChatActionHandlerOptions) => {
  const buildAssistantActionContext = (): AssistantActionExecutionContext => ({
    defaultDateKey,
    logs,
    todos,
    categories,
    scopes,
    todoCategories,
    autoApplyAutoLinkRules,
    autoLinkRules
  });

  const getScopeNames = (scopeIds: string[]): string[] => (
    scopeIds
      .map((scopeId) => scopes.find((scope) => scope.id === scopeId)?.name)
      .filter((name): name is string => Boolean(name))
  );

  const getActivityCategory = (activityId?: string) => (
    activityId
      ? categories.find((category) => category.activities.some((activity) => activity.id === activityId))
      : undefined
  );

  const getActivityById = (activityId?: string) => (
    activityId
      ? categories.flatMap((category) => category.activities).find((activity) => activity.id === activityId)
      : undefined
  );

  const applyPlannedLogToolCalls = (toolCalls: AIBackfillToolCall[]): AppliedChatAction[] => {
    const result = assistantActionExecutor.applyLogToolCalls(buildAssistantActionContext(), toolCalls);
    if (result.actions.some((action) => action.kind === 'create_log' && action.status === 'applied')) {
      setLogs(result.nextLogs);
      setTodos(result.nextTodos);
    }
    return result.actions;
  };

  const applyPlannedTodoUpdateToolCalls = (toolCalls: AITodoUpdateToolCall[]): AppliedChatAction[] => {
    const result = assistantActionExecutor.applyTodoUpdateToolCalls(buildAssistantActionContext(), toolCalls);
    if (result.actions.some((action) => action.kind === 'update_todo' && action.status === 'applied')) {
      setTodos(result.nextTodos);
    }
    return result.actions;
  };

  const applyPlannedCreateSubtaskToolCalls = (
    toolCalls: AICreateSubtaskToolCall[],
    sourceText: string
  ): AppliedChatAction[] => {
    const result = assistantActionExecutor.applyCreateSubtaskToolCalls(buildAssistantActionContext(), toolCalls, sourceText);
    if (result.actions.some((action) => action.kind === 'create_subtask' && action.status === 'applied')) {
      setTodos(result.nextTodos);
    }
    return result.actions;
  };

  const applyPlannedEditLogToolCalls = (toolCalls: AIEditLogToolCall[]): AppliedChatAction[] => {
    const result = assistantActionExecutor.applyEditLogToolCalls(buildAssistantActionContext(), toolCalls);
    if (result.actions.some((action) => action.kind === 'edit_log' && action.status === 'applied')) {
      setLogs(result.nextLogs);
      setTodos(result.nextTodos);
    }
    return result.actions;
  };

  const applyQuickAddNoteToolCalls = (
    toolCalls: AIQuickAddNoteToolCall[],
    sourceText: string
  ): AppliedChatAction[] => {
    const result = assistantActionExecutor.applyAppendLogNotesToolCalls(
      buildAssistantActionContext(),
      toolCalls,
      sourceText
    );
    if (result.actions.some((action) => action.kind === 'edit_log' && action.status === 'applied')) {
      setLogs(result.nextLogs);
      setTodos(result.nextTodos);
    }

    return result.actions;
  };

  const applyTodoAndPlannedTimelineLogToolCalls = (
    toolCalls: Array<AITodoToolCall | AIPlannedLogToolCall>,
    sourceText: string
  ): AppliedChatAction[] => {
    const result = assistantActionExecutor.applyTodoAndPlannedLogToolCalls(buildAssistantActionContext(), toolCalls, sourceText);
    if (result.actions.some((action) => action.status === 'applied')) {
      setLogs(result.nextLogs);
      setTodos(result.nextTodos);
    }
    return result.actions;
  };

  const hasLocalQueryTarget = (
    localQueryHistory: AssistantLocalQueryResult[] | undefined,
    target: 'principles' | 'selfBeliefs'
  ): boolean => (
    Boolean(localQueryHistory?.some((result) => (
      result.status === 'executed'
      && result.request.targets.includes(target)
    )))
  );

  const applyPlannedPrincipleToolCalls = (toolCalls: AICreatePrincipleToolCall[]): AppliedChatAction[] => (
    assistantActionExecutor.applyPrincipleToolCalls(toolCalls)
  );

  const applyPlannedSelfBeliefToolCalls = (toolCalls: AICreateSelfBeliefToolCall[]): AppliedChatAction[] => (
    assistantActionExecutor.applySelfBeliefToolCalls(toolCalls)
  );

  return {
    applyPlannedCreateSubtaskToolCalls,
    applyPlannedEditLogToolCalls,
    applyPlannedLogToolCalls,
    applyPlannedPrincipleToolCalls,
    applyPlannedSelfBeliefToolCalls,
    applyPlannedTodoUpdateToolCalls,
    applyQuickAddNoteToolCalls,
    applyTodoAndPlannedTimelineLogToolCalls,
    getActivityById,
    getActivityCategory,
    getScopeNames,
    hasLocalQueryTarget
  };
};
