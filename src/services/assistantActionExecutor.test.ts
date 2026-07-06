import { beforeEach, describe, expect, it } from 'vitest';
import {
  assistantActionExecutor,
  removeStoredPrincipleById,
  removeStoredSelfBeliefById,
  type AssistantActionExecutionContext
} from './assistantActionExecutor';
import type { AICreatePrincipleToolCall, AICreateSelfBeliefToolCall, AITodoToolCall } from './aiService';

const installLocalStorageMock = () => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear()
    }
  });
};

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
  beforeEach(() => {
    installLocalStorageMock();
  });

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

describe('assistantActionExecutor principle-library tool calls', () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  it('creates principles in localStorage and supports undo removal', () => {
    const toolCalls: AICreatePrincipleToolCall[] = [{
      toolName: 'create_principle',
      args: {
        title: '先降低行动颗粒度',
        frontText: '卡住时先做一个小到不会害怕的动作。',
        backText: '适用于启动困难。'
      }
    }];

    const actions = assistantActionExecutor.applyPrincipleToolCalls(toolCalls);
    const action = actions[0];
    const stored = JSON.parse(localStorage.getItem('lumostime_principles') || '[]');

    expect(action.kind).toBe('create_principle');
    expect(action.status).toBe('applied');
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe('先降低行动颗粒度');

    if (action.kind !== 'create_principle' || !action.snapshot.principleId) {
      throw new Error('Expected principle action snapshot.');
    }

    expect(removeStoredPrincipleById(action.snapshot.principleId)).toBe(true);
    expect(JSON.parse(localStorage.getItem('lumostime_principles') || '[]')).toHaveLength(0);
  });

  it('updates existing principles by id and supports snapshot restore', () => {
    localStorage.setItem('lumostime_principles', JSON.stringify([{
      id: 'principle-1',
      title: '启动要轻',
      frontText: '卡住时先开始。',
      backText: '旧解释'
    }]));

    const toolCalls: AICreatePrincipleToolCall[] = [{
      toolName: 'create_principle',
      args: {
        id: 'principle-1',
        descriptions: [{
          text: '今天发现写一个最小步骤能缓解拖延。',
          date: '2026-07-06'
        }]
      }
    }];

    const actions = assistantActionExecutor.applyPrincipleToolCalls(toolCalls);
    const action = actions[0];
    const stored = JSON.parse(localStorage.getItem('lumostime_principles') || '[]');

    expect(action.kind).toBe('create_principle');
    expect(action.status).toBe('applied');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('principle-1');
    expect(stored[0].descriptions[0]).toMatchObject({
      text: '今天发现写一个最小步骤能缓解拖延。',
      source: 'ai'
    });

    if (action.kind !== 'create_principle' || !action.snapshot.previousPrinciple) {
      throw new Error('Expected principle update snapshot.');
    }

    expect(action.snapshot.previousPrinciple.backText).toBe('旧解释');
    expect(action.snapshot.nextPrinciple?.descriptions).toHaveLength(1);
  });

  it('creates self-beliefs in localStorage with AI descriptions and supports undo removal', () => {
    const toolCalls: AICreateSelfBeliefToolCall[] = [{
      toolName: 'create_self_belief',
      args: {
        title: '我是一个学习能力很强的人',
        descriptions: [{
          text: '两周学完基础编程并做出第一个工具。',
          date: '2026-07-06'
        }]
      }
    }];

    const actions = assistantActionExecutor.applySelfBeliefToolCalls(toolCalls);
    const action = actions[0];
    const stored = JSON.parse(localStorage.getItem('lumostime_self_beliefs') || '[]');

    expect(action.kind).toBe('create_self_belief');
    expect(action.status).toBe('applied');
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe('我是一个学习能力很强的人');
    expect(stored[0].descriptions[0]).toMatchObject({
      text: '两周学完基础编程并做出第一个工具。',
      date: '2026-07-06',
      source: 'ai'
    });

    if (action.kind !== 'create_self_belief' || !action.snapshot.selfBeliefId) {
      throw new Error('Expected self-belief action snapshot.');
    }

    expect(removeStoredSelfBeliefById(action.snapshot.selfBeliefId)).toBe(true);
    expect(JSON.parse(localStorage.getItem('lumostime_self_beliefs') || '[]')).toHaveLength(0);
  });

  it('updates existing self-beliefs by id while preserving previous snapshot', () => {
    localStorage.setItem('lumostime_self_beliefs', JSON.stringify([{
      id: 'belief-1',
      title: '我是一个学习能力很强的人',
      descriptions: [{
        id: 'description-old',
        text: '以前两周学完基础编程。',
        date: '2026-07-01',
        source: 'manual',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z'
      }],
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z'
    }]));

    const toolCalls: AICreateSelfBeliefToolCall[] = [{
      toolName: 'create_self_belief',
      args: {
        id: 'belief-1',
        descriptions: [{
          text: '今天又把原则库接入了 AI 写入流程。',
          date: '2026-07-06'
        }]
      }
    }];

    const actions = assistantActionExecutor.applySelfBeliefToolCalls(toolCalls);
    const action = actions[0];
    const stored = JSON.parse(localStorage.getItem('lumostime_self_beliefs') || '[]');

    expect(action.kind).toBe('create_self_belief');
    expect(action.status).toBe('applied');
    expect(stored).toHaveLength(1);
    expect(stored[0].descriptions).toHaveLength(2);
    expect(stored[0].descriptions[1]).toMatchObject({
      text: '今天又把原则库接入了 AI 写入流程。',
      source: 'ai'
    });

    if (action.kind !== 'create_self_belief' || !action.snapshot.previousSelfBelief) {
      throw new Error('Expected self-belief update snapshot.');
    }

    expect(action.snapshot.previousSelfBelief.descriptions).toHaveLength(1);
    expect(action.snapshot.nextSelfBelief?.descriptions).toHaveLength(2);
  });
});
