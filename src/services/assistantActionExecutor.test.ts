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

  it('creates nested subtasks together with a parent todo and strips child dates unless explicitly requested', () => {
    const toolCalls: AITodoToolCall[] = [
      {
        toolName: 'create_todo',
        args: {
          title: 'Paper revision sprint',
          categoryId: 'project-general',
          kind: 'project',
          linkedCategoryId: 'study',
          linkedActivityId: 'writing',
          subtasks: [
            {
              title: 'Draft outline',
              scheduledDate: '2026-05-16'
            },
            {
              title: 'Review citations',
              note: 'Check Zotero tags',
              deadlineDate: '2026-05-20'
            }
          ]
        }
      }
    ];

    const result = assistantActionExecutor.applyTodoToolCalls(buildBaseContext(), toolCalls, '帮我拆成两个子任务');
    const parentTodo = result.nextTodos.find((todo) => !todo.parentTodoId);
    const childTodos = result.nextTodos.filter((todo) => todo.parentTodoId);
    const outlineTodo = childTodos.find((todo) => todo.title === 'Draft outline');
    const citationTodo = childTodos.find((todo) => todo.title === 'Review citations');
    const action = result.actions[0];

    expect(action.kind).toBe('create_todo');
    expect(action.status).toBe('applied');
    if (action.kind !== 'create_todo' || action.status !== 'applied' || !parentTodo) {
      throw new Error('Expected nested todo creation to succeed.');
    }

    expect(childTodos).toHaveLength(2);
    expect(childTodos.every((todo) => todo.parentTodoId === parentTodo.id)).toBe(true);
    expect(outlineTodo?.scheduledDate).toBeUndefined();
    expect(citationTodo?.deadlineDate).toBeUndefined();
    expect(citationTodo?.note).toBe('Check Zotero tags');
    expect(action.snapshot.createdSubtaskIds).toHaveLength(2);
  });
});
