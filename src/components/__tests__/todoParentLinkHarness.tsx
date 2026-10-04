/**
 * @file todoParentLinkHarness.tsx
 * @input Real quick-actions sheet, picker and save hook in an isolated renderer
 * @output Interaction regression results and narrow-screen capture checkpoints
 * @pos Test (Renderer)
 * @updated 2026-10-04: Verifies the mobile picker shares the quick-actions sheet's bottom edge and keeps its height across filtering.
 * @updated 2026-10-04: Exercises category/search selection, cancellation, back and latest-data association.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { TodoQuickActionsModal } from '../TodoQuickActionsModal';
import { useTodoQuickActions } from '../../hooks/useTodoQuickActions';
import { runRegisteredHardwareBackHandler } from '../../utils/hardwareBackHandlerStack';
import { TodoItem } from '../../types';

declare global {
  interface Window {
    __todoParentLinkResult?: { passed: string[]; error?: string };
    __todoParentLinkCapture?: string;
    __todoParentLinkCaptured?: boolean;
  }
}

const source: TodoItem = { id: 'source', title: '整理汉语拼音的文章的参考文献', categoryId: 'research', isCompleted: false };
const parent: TodoItem = { id: 'parent', title: '汉语拼音研究', categoryId: 'research', isCompleted: false, linkedActivityId: 'writing', defaultScopeIds: ['study'] };
let todos: TodoItem[] = [source, parent, { id: 'reading', title: '阅读计划', categoryId: 'books', isCompleted: false }];
const categories = [{ id: 'research', name: '研究', icon: '📚' }, { id: 'books', name: '读书', icon: '📖' }];
const saves: TodoItem[] = [];
let actions: ReturnType<typeof useTodoQuickActions>;
const noop = () => {};
const Probe = () => {
  actions = useTodoQuickActions({ todos, onSaveTodo: (todo) => saves.push(todo), onEditTodo: noop, onDeleteTodo: noop });
  return <TodoQuickActionsModal
    isOpen={Boolean(actions.quickActionTodo)} todo={actions.quickActionTodo} todos={todos} todoCategories={categories}
    onMoveDate={noop} onClearDate={noop} onOpenDetail={noop} onComplete={noop} onUndoComplete={noop}
    onTogglePin={noop} onDuplicate={noop} onEditMaybeDates={noop} onSkipNextRecurrence={noop}
    onSkipToMaybeDate={noop} onMoveCategory={noop} onDelete={noop} onClose={actions.closeQuickActions}
    onForceClose={() => actions.closeQuickActions(true)} onLinkParent={actions.handleQuickActionLinkParent}
  />;
};
const host = document.getElementById('root')!;
const root = createRoot(host);
const delay = () => new Promise((resolve) => setTimeout(resolve, 35));
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const render = async () => { root.render(<Probe />); await delay(); };
const dialog = () => host.querySelector('[role="dialog"]');
const click = async (label: string) => {
  const button = Array.from(host.querySelectorAll('button')).find((element) => element.textContent?.trim() === label || element.getAttribute('aria-label') === label);
  check(button, 'Missing button: ' + label);
  button!.click();
  await delay();
};
const search = async (value: string) => {
  const input = host.querySelector('input[type="search"]') as HTMLInputElement;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await delay();
};
const capture = async (name: string) => {
  window.__todoParentLinkCaptured = false;
  window.__todoParentLinkCapture = name;
  while (!window.__todoParentLinkCaptured) await delay();
  window.__todoParentLinkCapture = undefined;
};

async function run() {
  const passed: string[] = [];
  await render();
  actions.openQuickActions(source);
  await delay();
  await capture('quick-actions');
  await click('关联到主任务');
  check(dialog()?.textContent?.includes('汉语拼音研究'), 'Main tasks missing');
  const initialPickerHeight = dialog()!.getBoundingClientRect().height;
  await capture('parent-picker');
  await click('读书');
  check(!dialog()?.textContent?.includes('汉语拼音研究') && dialog()?.textContent?.includes('阅读计划'), 'Category filter failed');
  await search('拼音');
  check(dialog()?.textContent?.includes('未找到匹配的主任务'), 'Empty search state missing');
  check(Math.abs(dialog()!.getBoundingClientRect().height - initialPickerHeight) < 1, 'Empty search results changed picker height');
  await click('全部');
  check(dialog()?.textContent?.includes('汉语拼音研究') && !dialog()?.textContent?.includes('阅读计划'), 'Cross-category search failed');
  check(Math.abs(dialog()!.getBoundingClientRect().height - initialPickerHeight) < 1, 'Category switching changed picker height');
  passed.push('Category switching, Chinese search, empty results and all-category search');

  check(runRegisteredHardwareBackHandler(), 'Back was not consumed');
  await delay();
  check(!dialog() && host.textContent?.includes('创建副本'), 'Back closed the whole sheet');
  await click('关联到主任务');
  check((host.querySelector('input') as HTMLInputElement).value === '', 'Picker search was not reset');
  await click('关闭主任务选择');
  check(!dialog() && saves.length === 0, 'Cancel saved a task');
  await click('关联到主任务');
  dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await delay();
  check(!dialog() && host.textContent?.includes('创建副本'), 'Escape closed the whole sheet');
  passed.push('Hardware back, Escape, cancellation and clean picker reopening');

  await click('关联到主任务');
  const duplicateButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === '创建副本')!;
  const linkButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === '关联到主任务')!;
  check(duplicateButton.parentElement === linkButton.parentElement, 'Shortcuts are not adjacent');
  const a = duplicateButton.getBoundingClientRect();
  const b = linkButton.getBoundingClientRect();
  check(Math.abs(a.top - b.top) < 1 && b.left >= a.right, 'Narrow-screen shortcuts are not on the same row');
  const bounds = dialog()!.getBoundingClientRect();
  check(bounds.left >= 0 && bounds.right <= window.innerWidth && bounds.bottom <= window.innerHeight, 'Picker exceeds viewport');
  const sheetBounds = duplicateButton.closest('[style]')!.getBoundingClientRect();
  check(Math.abs(bounds.bottom - sheetBounds.bottom) < 1, 'Mobile picker is not aligned with the quick-actions bottom edge');
  check(Math.abs(bounds.height - sheetBounds.height) < 1, 'Picker does not match the outer quick-actions sheet height');
  passed.push('Narrow-screen adjacent shortcuts and bottom-aligned picker matching the fixed outer-sheet height');

  todos = todos.map((todo) => todo.id === source.id ? { ...todo, note: '最新备注' } : todo);
  await render();
  const parentButton = Array.from(dialog()!.querySelectorAll('button')).find((button) => button.textContent?.startsWith(parent.title));
  check(parentButton, 'Selected parent missing');
  parentButton!.click();
  await delay();
  check(saves.length === 1 && saves[0].parentTodoId === parent.id && saves[0].note === '最新备注', 'Association lost latest source data');
  check(saves[0].linkedActivityId === 'writing' && saves[0].defaultScopeIds?.[0] === 'study' && !host.textContent, 'Association did not inherit or close');
  passed.push('Actual selection saves latest task, inherits parent settings and closes sheet');

  actions.openQuickActions(source);
  await delay();
  todos = todos.filter((todo) => todo.id !== parent.id);
  await render();
  actions.handleQuickActionLinkParent(parent.id);
  await delay();
  check(saves.length === 1, 'Deleted parent was accepted');
  passed.push('Deleted main task is rejected using latest collection');
  root.unmount();
  window.__todoParentLinkResult = { passed };
}
run().catch((error) => { window.__todoParentLinkResult = { passed: [], error: error.stack || String(error) }; });
