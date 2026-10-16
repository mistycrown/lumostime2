/**
 * @file referenceDeleteHarness.tsx
 * @input Real deletion dialog, todo target builder and native renderer interactions
 * @output Migration/search/back regression results and responsive screenshot checkpoints
 * @pos Test (Renderer)
 * @updated 2026-10-16: Covers hierarchical search, selection safety, back navigation and short viewports.
 * @updated 2026-10-16: Verifies default collapsed groups and explicit subtask expansion.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ReferenceDeleteModal } from '../ReferenceDeleteModal';
import { getTodoReferenceDeleteTargets, type ReferenceDeleteTarget } from '../../utils/referenceDeleteTargets';
import { runRegisteredHardwareBackHandler } from '../../utils/hardwareBackHandlerStack';
import type { ReferenceDeleteDecision } from '../../utils/referenceDeletion';
import type { TodoItem } from '../../types';

declare global {
  interface Window {
    __referenceDeleteResult?: { passed: string[]; error?: string };
    __referenceDeleteCapture?: { name: string; width: number; height: number };
    __referenceDeleteCaptured?: boolean;
  }
}

const todo = (id: string, title: string, extra: Partial<TodoItem> = {}): TodoItem => ({ id, title, categoryId: 'reading', isCompleted: false, ...extra });
const todos = [
  todo('source', '看完《百年孤独》'),
  todo('source-child', '整理百年孤独笔记', { parentTodoId: 'source' }),
  todo('reading', '阅读计划'),
  todo('book', '看完《活着》', { parentTodoId: 'reading', childOrder: 1 }),
  todo('history', '看完《人类简史》', { parentTodoId: 'reading', childOrder: 2 }),
  todo('notes', '阅读笔记', { parentTodoId: 'reading', childOrder: 3 }),
  todo('writing', '写作计划'),
  todo('other-notes', '阅读笔记', { parentTodoId: 'writing' }),
  todo('exercise', '每周运动'),
  todo('run', '晨跑三公里', { parentTodoId: 'exercise' }),
  todo('done', '已完成的计划', { isCompleted: true }),
  todo('open-child', '尚未整理的资料', { parentTodoId: 'done' }),
  ...Array.from({ length: 30 }, (_, index) => todo(`extra-${index}`, `其他待办 ${index + 1}`))
];
let targets = getTodoReferenceDeleteTargets(todos, ['source', 'source-child']);
let isOpen = true;
let targetLabel = '待办';
let closeCount = 0;
const decisions: ReferenceDeleteDecision[] = [];
const host = document.getElementById('root')!;
const root = createRoot(host);
const delay = () => new Promise((resolve) => setTimeout(resolve, 50));
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const render = async () => {
  root.render(<ReferenceDeleteModal isOpen={isOpen} title="删除待办并处理关联" description="请先选择历史记录和当前计时的处理方式。" sourceName="看完《百年孤独》" targetLabel={targetLabel} impact={{ logs: 3, activeSessions: 0 }} targets={targets} onClose={() => { closeCount += 1; }} onConfirm={(decision) => decisions.push(decision)} />);
  await delay();
};
const button = (label: string) => Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find((element) => element.textContent?.trim() === label || element.getAttribute('aria-label') === label);
const click = async (label: string) => {
  const control = button(label);
  check(control && !control.disabled, 'Missing or disabled button: ' + label);
  control!.click();
  await delay();
};
const search = async (value: string) => {
  const input = host.querySelector<HTMLInputElement>('input[type="search"]')!;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await delay();
};
const capture = async (name: string, width = 390, height = 844) => {
  window.__referenceDeleteCaptured = false;
  window.__referenceDeleteCapture = { name, width, height };
  while (!window.__referenceDeleteCaptured) await delay();
  window.__referenceDeleteCapture = undefined;
  const rect = host.querySelector('[role="dialog"]')!.getBoundingClientRect();
  check(rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight, 'Dialog exceeds viewport: ' + name);
};

async function run() {
  const passed: string[] = [];
  await render();
  await click('迁移关联');
  check(button('确定删除')!.disabled, 'Migration must require a target');
  await capture('01-confirm');
  await click('选择待办');
  check(!button('选择待办：看完《百年孤独》') && !button('选择待办：看完《百年孤独》 / 整理百年孤独笔记'), 'Deleted subtree is selectable');
  check(!host.querySelector('[aria-expanded="true"]') && !button('选择待办：阅读计划 / 看完《活着》'), 'Subtasks should be collapsed by default');
  check(button('选择待办：已完成的计划')!.disabled, 'Completed parent is selectable');
  await capture('02-hierarchy');
  passed.push('Default collapsed hierarchy, excluded subtree, completed-parent context and guarded confirmation');

  await click('展开阅读计划的子任务');
  check(button('选择待办：阅读计划 / 看完《活着》'), 'Explicit expansion did not show children');
  await click('收起阅读计划的子任务');
  check(!button('选择待办：阅读计划 / 看完《活着》'), 'Collapse did not hide children');
  await search('活着');
  check(button('选择待办：阅读计划') && button('选择待办：阅读计划 / 看完《活着》'), 'Search lost parent context or collapsed match');
  check(!button('选择待办：阅读计划 / 看完《人类简史》'), 'Search included an unrelated sibling');
  await capture('03-search');
  await capture('04-short-viewport', 390, 420);
  await capture('05-desktop', 1100, 800);
  passed.push('Child search retains parent, expands collapsed matches and fits short/mobile/desktop viewports');

  await click('选择待办：阅读计划 / 看完《活着》');
  check(!host.querySelector('input'), 'Selection did not return to confirmation');
  check(button('阅读计划 / 看完《活着》') && !button('确定删除')!.disabled, 'Selected path is missing');
  check(decisions.length === 0, 'Selecting a target deleted the source');
  await capture('06-selected');
  await click('确定删除');
  check(decisions[0]?.action === 'migrate' && decisions[0]?.targetId === 'book', 'Confirmed the wrong target');
  passed.push('Selection only updates the target; explicit confirmation submits the correct child ID');

  await click('阅读计划 / 看完《活着》');
  await search('阅读计划');
  check(button('选择待办：阅读计划 / 看完《人类简史》'), 'Parent search did not reveal children');
  await search('阅读笔记');
  check(button('选择待办：阅读计划 / 阅读笔记') && button('选择待办：写作计划 / 阅读笔记'), 'Duplicate child titles lost their distinct parent contexts');
  await search('没有这样的任务');
  check(host.textContent?.includes('没有匹配的待办'), 'Missing empty search state');
  await click('清空搜索');
  check(document.activeElement?.tagName === 'INPUT', 'Clearing search lost keyboard focus');
  check(!button('选择待办：阅读计划 / 看完《活着》'), 'Clearing search should restore collapse state');
  await click('展开阅读计划的子任务');
  check(button('选择待办：阅读计划 / 看完《活着》')?.getAttribute('aria-pressed') === 'true', 'Reopening lost current selection');
  passed.push('Parent-name search, duplicate child titles, empty results, clear focus and selection retention');

  check(runRegisteredHardwareBackHandler(), 'Picker hardware back was not handled');
  await delay();
  check(closeCount === 0 && button('阅读计划 / 看完《活着》'), 'Hardware back discarded the selection or closed confirmation');
  await click('阅读计划 / 看完《活着》');
  host.querySelector('input')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await delay();
  check(closeCount === 0 && button('阅读计划 / 看完《活着》'), 'Escape did not return to confirmation');
  await click('取消关联');
  await click('确定删除');
  check(decisions[1]?.action === 'unlink' && decisions[1]?.targetId === undefined, 'Unlink retained migration ID');
  passed.push('Hardware/Escape back preserve selection; unlink confirms without a target ID');

  targets = targets.filter((target) => target.id !== 'book');
  await render();
  await click('迁移关联');
  check(button('确定删除')!.disabled, 'A removed migration target is still valid');
  isOpen = false;
  await render();
  check(!host.querySelector('[role="dialog"]'), 'Closed dialog still rendered');
  check(!runRegisteredHardwareBackHandler(), 'Closed dialog left a hardware handler');
  targets = [];
  isOpen = true;
  await render();
  await click('迁移关联');
  await click('选择待办');
  check(host.textContent?.includes('暂无可迁移的待办'), 'Missing empty target state');
  await click('返回删除确认');
  check(button('确定删除')!.disabled, 'Empty targets permit migration');
  passed.push('Removed targets invalidate selection, reopening resets state, empty targets block deletion');

  isOpen = false;
  await render();
  targetLabel = '领域';
  targets = [{ id: 'scope', name: '阅读', icon: '📖' }] satisfies ReferenceDeleteTarget[];
  isOpen = true;
  await render();
  await click('迁移关联');
  await click('选择领域');
  await search('阅读');
  await click('选择领域：阅读');
  await click('确定删除');
  check(decisions[2]?.targetId === 'scope', 'Flat scope targets broke');
  passed.push('Shared flat scope migration remains searchable and selectable');
  window.__referenceDeleteResult = { passed };
}
run().catch((error) => { window.__referenceDeleteResult = { passed: [], error: error.stack || String(error) }; });
