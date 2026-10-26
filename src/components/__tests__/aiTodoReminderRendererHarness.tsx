/**
 * @file aiTodoReminderRendererHarness.tsx
 * @input Offline todo actions, real chat renderer and isolated browser storage
 * @output Interactive reminder result/undo checks and Chinese screenshot fixtures
 * @pos Renderer test support
 * @updated 2026-10-26: Exercises application reminder cards at desktop and mobile widths.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { renderAppliedChatAction } from '../ai-chat/AIBackfillChatAppliedActionRenderer';
import { assistantActionExecutor, rollbackAppliedChatActions, type AppliedChatAction } from '../../services/assistantActionExecutor';
import type { TodoItem } from '../../types';

declare global {
  interface Window {
    __aiTodoResult?: { passed: string[]; error?: string };
    __aiTodoCapture?: string | null;
  }
}
const theme = {
  activeBorder: '#b1a18e', chipBg: '#f5f0e8', chipBorder: '#e1d6c9', dangerBg: '#fff', dangerBorder: '#b44', dangerText: '#b44',
  inputBg: '#fff', successBg: '#fff', successBorder: '#384', successText: '#384', textMuted: '#877765', textPrimary: '#342c24',
  textSecondary: '#675e50', undoneBg: '#fff', undoneBorder: '#aaa', undoneText: '#888'
};
const context = { defaultDateKey: '2099-12-30', logs: [], todos: [] as TodoItem[], categories: [], scopes: [], todoCategories: [],
  autoApplyAutoLinkRules: false, autoLinkRules: [] };
const created = assistantActionExecutor.applyTodoToolCalls(context, [{ toolName: 'create_todo', args: {
  title: '提交项目报告', categoryId: '__virtual_quick__', kind: 'quick', scheduledDate: '2099-12-31',
  reminders: { scheduledDate: { daysBefore: 1, time: '09:30', calendarSync: true } }
} }]);
const updated = assistantActionExecutor.applyTodoUpdateToolCalls({ ...context, todos: created.nextTodos }, [{ toolName: 'update_todo', args: {
  todoId: created.nextTodos[0].id, patch: { reminders: { scheduledDate: { daysBefore: 1, time: '08:00' } } }
} }]);
const actions = [...created.actions, ...updated.actions];
const check = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const delay = () => new Promise((resolve) => setTimeout(resolve, 50));
let currentTodos = updated.nextTodos;
let setActions: React.Dispatch<React.SetStateAction<AppliedChatAction[]>>;
const noop = () => {};
const Probe = () => {
  const [visible, updateActions] = React.useState(actions);
  setActions = updateActions;
  return <main className="mx-auto max-w-xl space-y-6 p-5">
    <h1 className="text-xl">待办提醒</h1>
    {visible.map((action) => <React.Fragment key={action.actionId}>{renderAppliedChatAction({
      action, theme, todos: currentTodos, todoCategories: [], categories: [], logs: [], messageId: 'test',
      formatActionDate: () => '2099.12.30', formatTimeRange: () => '', getActivityById: () => undefined,
      getActivityCategory: () => undefined, getScopeNames: () => [], onOpenTodoDetail: noop, onOpenLogEditor: noop,
      onOpenPrincipleEditor: noop, onOpenSelfBeliefEditor: noop, onUndoCreateSubtaskAction: noop, onUndoEditLogAction: noop,
      onUndoLogAction: noop, onUndoPlannedLogAction: noop, onUndoPrincipleAction: noop, onUndoSelfBeliefAction: noop,
      onUndoTodoAction: noop, onUndoUpdateTodoAction: (_messageId, current) => {
        currentTodos = rollbackAppliedChatActions([current], [], currentTodos).todos;
        updateActions((previous) => previous.map((item) => item.actionId === current.actionId ? { ...item, status: 'undone' } : item));
      }
    })}</React.Fragment>)}
  </main>;
};
createRoot(document.getElementById('root')!).render(<Probe />);
const capture = async (name: string) => {
  window.__aiTodoCapture = name;
  for (let i = 0; i < 100 && window.__aiTodoCapture; i++) await delay();
  check(!window.__aiTodoCapture, 'Screenshot timed out');
  check(document.documentElement.scrollWidth <= window.innerWidth, 'Horizontal overflow');
};
void (async () => {
  for (let i = 0; i < 100 && !setActions; i++) await delay();
  check(document.body.innerText.includes('安排提醒 2099.12.30 09:30'), 'Create reminder timestamp missing');
  check(document.body.innerText.includes('安排提醒 2099.12.30 08:00'), 'Update reminder timestamp missing');
  check(document.body.innerText.includes('同步日历'), 'Calendar setting missing');
  await capture('ai-todo-reminders-desktop');
  await capture('ai-todo-reminders-mobile');
  (document.querySelectorAll('button[title="撤销"]')[1] as HTMLButtonElement).click();
  await delay();
  check(currentTodos[0].reminders?.scheduledDate?.time === '09:30', 'Undo did not restore reminder');
  check(currentTodos[0].reminders?.scheduledDate?.calendarSync, 'Undo lost calendar setting');
  window.__aiTodoResult = { passed: ['create timestamp', 'update timestamp', 'calendar label', 'desktop/mobile layout', 'undo restores reminder and calendar'] };
})().catch((error) => { window.__aiTodoResult = { passed: [], error: String(error) }; });
