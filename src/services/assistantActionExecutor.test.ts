import { describe, expect, it } from 'vitest';
import { assistantActionExecutor, type AssistantActionExecutionContext } from './assistantActionExecutor';
import type { AITodoToolCall } from './aiService';

const buildBaseContext = (): AssistantActionExecutionContext => ({
  defaultDateKey: '2026-05-15',
  logs: [],
  todos: [],
  categories: [
    {
      id: 'study',
      name: '学习',
      icon: '📚',
      activities: [
        {
          id: 'writing',
          name: '写作',
          icon: '✍️'
        }
      ]
    }
  ],
  scopes: [],
  todoCategories: [
    {
      id: 'project-general',
      name: '项目',
      icon: '📁'
    }
  ],
  autoApplyAutoLinkRules: false,
  autoLinkRules: []
});

describe('assistantActionExecutor applyTodoToolCalls', () => {
  it('creates quick todos inside the reserved 小事 bucket without requiring linked activity', () => {
    const toolCalls: AITodoToolCall[] = [
      {
        toolName: 'create_todo',
        args: {
          title: '取快递',
          categoryId: '__virtual_quick__',
          kind: 'quick',
          scheduledDate: '2026-05-15'
        }
      }
    ];

    const result = assistantActionExecutor.applyTodoToolCalls(buildBaseContext(), toolCalls);
    const createdTodo = result.nextTodos[0];
    const action = result.actions[0];

    expect(action.kind).toBe('create_todo');
    expect(action.status).toBe('applied');
    if (action.kind !== 'create_todo' || action.status !== 'applied') {
      throw new Error('Expected quick todo creation to succeed.');
    }

    expect(createdTodo.kind).toBe('quick');
    expect(createdTodo.categoryId).toBe('__virtual_quick__');
    expect(createdTodo.linkedActivityId).toBeUndefined();
    expect(action.snapshot.categoryId).toBe('__virtual_quick__');
    expect(action.snapshot.categoryName).toBe('小事');
  });

  it('keeps future todos in the reserved 未来 bucket while preserving project linkage', () => {
    const toolCalls: AITodoToolCall[] = [
      {
        toolName: 'create_todo',
        args: {
          title: '系统梳理博士申请材料',
          categoryId: '__virtual_future__',
          kind: 'project',
          linkedCategoryId: 'study',
          linkedActivityId: 'writing'
        }
      }
    ];

    const result = assistantActionExecutor.applyTodoToolCalls(buildBaseContext(), toolCalls);
    const createdTodo = result.nextTodos[0];
    const action = result.actions[0];

    expect(action.kind).toBe('create_todo');
    expect(action.status).toBe('applied');
    if (action.kind !== 'create_todo' || action.status !== 'applied') {
      throw new Error('Expected future todo creation to succeed.');
    }

    expect(createdTodo.kind).toBe('project');
    expect(createdTodo.categoryId).toBe('__virtual_future__');
    expect(createdTodo.linkedCategoryId).toBe('study');
    expect(createdTodo.linkedActivityId).toBe('writing');
    expect(action.snapshot.categoryId).toBe('__virtual_future__');
    expect(action.snapshot.categoryName).toBe('未来');
    expect(action.snapshot.linkedCategoryId).toBe('study');
    expect(action.snapshot.linkedActivityId).toBe('writing');
  });
});
