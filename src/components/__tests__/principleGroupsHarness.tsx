/**
 * @file principleGroupsHarness.tsx
 * @updated 2026-10-18: Covers shared dropdowns and draft batch movement with native mouse/touch input.
 * @input Real principle library, scene settings/card components and isolated test storage
 * @output Group CRUD, assignment, scene persistence, live updates and screenshot checkpoints
 * @updated 2026-10-18: Verifies principle group workflows in an isolated Chromium renderer.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { PrincipleLibraryView } from '../../views/settings/PrincipleLibraryView';
import { SceneSettingsView } from '../../views/SceneSettingsView';
import { SceneCard } from '../SceneCard';
import { buildSceneGroupStateFromLegacySlots, loadSceneGroupStateFromStorage, saveSceneGroupStateToStorage } from '../../utils/sceneGroupStorage';
import type { SceneCardData } from '../../types';

declare global {
  interface Window {
    __principleResult?: { passed: string[]; error?: string };
    __principleCapture?: string;
    __principleCaptured?: boolean;
    __principlePointer?: { phase: 'down' | 'move' | 'up' | 'cancel'; x: number; y: number; pointerType: string } | null;
  }
}
const root = createRoot(document.getElementById('root')!);
const passed: string[] = [];
const delay = () => new Promise((resolve) => setTimeout(resolve, 60));
const check = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const click = async (text: string) => {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent?.trim() === text || item.getAttribute('aria-label') === text);
  if (!button) throw new Error(`Missing button: ${text}`);
  check(!button.disabled, `Disabled button: ${text}`);
  button.click();
  await delay();
};
const setValue = async (selector: string, value: string) => {
  const element = document.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>(selector);
  if (!element) throw new Error(`Missing field: ${selector}`);
  if (element instanceof HTMLButtonElement) {
    element.click();
    await delay();
    const option = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="option"]')).find((item) => item.dataset.selectValue === value);
    check(option, `Missing option: ${value}`);
    option!.click();
    await delay();
    return;
  }
  const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype
    : element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
  element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  await delay();
};
const capture = async (name: string) => {
  await document.fonts.ready;
  window.__principleCaptured = false;
  window.__principleCapture = name;
  for (let i = 0; i < 100 && !window.__principleCaptured; i++) await delay();
  check(window.__principleCaptured, 'Screenshot timed out');
};
const storedPrinciples = () => JSON.parse(localStorage.getItem('lumostime_principles') || '[]');
const storedGroups = () => JSON.parse(localStorage.getItem('lumostime_principle_groups') || '[]');
const baseCard: SceneCardData = { id: 'random-card', type: 'principle', title: '随机原则', principleSource: 'random', action: { type: 'none' } };
const drag = async (label: string, destination: HTMLElement, pointerType: string, cancel = false) => {
  const source = document.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;
  check(source && destination, `Missing drag endpoints: ${label}`);
  const pointer = async (phase: 'down' | 'move' | 'up' | 'cancel', x: number, y: number) => {
    window.__principlePointer = { phase, x: Math.round(x), y: Math.round(y), pointerType };
    for (let i = 0; i < 100 && window.__principlePointer; i++) await delay();
    check(!window.__principlePointer, 'Native pointer input timed out');
    await delay();
  };
  source.scrollIntoView({ block: 'center' }); await delay();
  const from = source.getBoundingClientRect();
  await pointer('down', from.left + from.width / 2, from.top + from.height / 2);
  destination.scrollIntoView({ block: 'center' }); await delay();
  const to = destination.getBoundingClientRect();
  await pointer('move', to.left + to.width / 2, to.top + 10);
  await pointer(cancel ? 'cancel' : 'up', to.left + to.width / 2, to.top + 10);
};

async function run() {
  localStorage.clear();
  localStorage.setItem('lumostime_principles', JSON.stringify([
    { id: 'legacy', title: '旧原则', frontText: '原有内容', backText: '保留背面' },
    { id: 'other', title: '另一原则', frontText: '另一条内容', backText: '' }
  ]));
  root.render(<PrincipleLibraryView onBack={() => {}} />);
  await delay();
  check(document.body.innerText.includes('旧原则'), 'Legacy principles must remain visible');
  await click('新建分组');
  await setValue('[aria-label="分组名称"]', '工作');
  const groupInputStyle = getComputedStyle(document.querySelector('[aria-label="分组名称"]')!);
  check(groupInputStyle.outlineStyle === 'none' || groupInputStyle.outlineColor === 'rgba(0, 0, 0, 0)', 'Group editor must suppress the native focus outline');
  await capture('principle-group-create');
  await click('保存');
  const groupId = storedGroups()[0].id;
  check(document.body.innerText.includes('该分组暂无原则'), 'New group must start empty');
  await click('添加新原则');
  check(document.querySelector('[aria-label="原则分组"]')?.textContent === '工作', 'New principle inherits selected group');
  await setValue('input[placeholder="例如：拥抱现实"]', '专注当下');
  await setValue('textarea[placeholder="例如：痛苦 + 反思 = 进步"]', '一次只做一件事');
  await click('创建');
  check(storedPrinciples().find((item: any) => item.title === '专注当下')?.groupId === groupId, 'Assignment must persist');
  await click('重命名分组');
  await setValue('[aria-label="分组名称"]', '工作原则');
  await click('保存');
  check(storedGroups()[0].id === groupId && storedGroups()[0].name === '工作原则', 'Rename retains stable group ID');
  await capture('principle-groups-light');
  await click('筛选原则分组');
  check(!document.querySelector('select') && document.querySelector('[role="listbox"]'), 'Group filter must use the shared custom dropdown');
  await capture('principle-group-dropdown');
  await click('筛选原则分组');
  document.documentElement.dataset.themeMode = 'dark';
  await capture('principle-groups-dark');
  await click('筛选原则分组');
  await capture('principle-group-dropdown-dark');
  await click('筛选原则分组');
  document.documentElement.dataset.themeMode = 'light';
  passed.push('Legacy library, group creation/rename, inherited assignment and persistence');

  await setValue('[aria-label="筛选原则分组"]', '__ungrouped__');
  const legacyHeading = Array.from(document.querySelectorAll('h3')).find((item) => item.textContent === '旧原则')!;
  legacyHeading.parentElement!.querySelector<HTMLButtonElement>('button[title="编辑"]')!.click();
  await delay();
  await setValue('[aria-label="原则分组"]', groupId);
  await click('保存');
  check(storedPrinciples().find((item: any) => item.id === 'legacy').groupId === groupId, 'Moving a legacy principle persists');
  passed.push('Moving existing principles between groups');

  await click('新建分组');
  await setValue('[aria-label="分组名称"]', '生活');
  await click('保存');
  const lifeId = storedGroups()[1].id;
  const originalPrinciples = localStorage.getItem('lumostime_principles');
  await click('批量管理原则');
  await click('选择原则：旧原则');
  await click('选择原则：专注当下');
  await setValue('[aria-label="批量移动到分组"]', lifeId);
  check(localStorage.getItem('lumostime_principles') === originalPrinciples, 'Batch moves stay local until save');
  await click('取消批量管理');
  check(localStorage.getItem('lumostime_principles') === originalPrinciples, 'Cancelling discards batch draft');
  await click('批量管理原则');
  await click('选择原则：旧原则');
  await click('选择原则：专注当下');
  await setValue('[aria-label="批量移动到分组"]', lifeId);
  await click('保存批量修改');
  check(storedPrinciples().filter((item: any) => item.groupId === lifeId).length === 2, 'Batch move persists both selected principles');
  await click('批量管理原则');
  const group = (id: string) => document.querySelector<HTMLElement>(`[data-principle-batch-group="${id}"]`)!;
  await drag('拖动原则：旧原则', group(groupId), 'mouse');
  await drag('拖动原则：专注当下', group(groupId), 'touch', true);
  check(group(lifeId).innerText.includes('专注当下'), 'Touch cancellation preserves original grouping');
  await click('选择原则：旧原则');
  await click('选择原则：专注当下');
  await drag('拖动原则：旧原则', group(lifeId), 'mouse');
  check(!group(groupId).querySelector('[data-principle-batch-row]'), 'Dragging a selected principle moves the whole selected block');
  await click('选择原则：旧原则');
  await click('选择原则：专注当下');
  await drag('拖动原则：旧原则', group(groupId), 'mouse');
  await drag('拖动原则：专注当下', group(groupId), 'touch');
  check(group(groupId).innerText.includes('旧原则') && group(groupId).innerText.includes('专注当下'), 'Mouse and touch move principles between groups');
  await click('专注当下上移');
  await drag('拖动分组：生活', group(groupId), 'touch');
  await capture('principle-batch-light');
  document.documentElement.dataset.themeMode = 'dark';
  await capture('principle-batch-dark');
  document.documentElement.dataset.themeMode = 'light';
  await click('保存批量修改');
  check(storedGroups()[0].id === lifeId, 'Group drag order persists');
  check(storedPrinciples().filter((item: any) => item.groupId === groupId)[0].title === '专注当下', 'Within-group order persists');
  passed.push('Batch selection, save/cancel, native mouse/touch drag, touch cancellation, and group/principle ordering');

  saveSceneGroupStateToStorage(buildSceneGroupStateFromLegacySlots([
    { id: 'slot', name: '验证时段', icon: 'book', startTime: '00:00', endTime: '23:59', cards: [baseCard] }
  ]));
  root.render(<SceneSettingsView onBack={() => {}} />);
  await delay();
  Array.from(document.querySelectorAll('button')).find((item) => item.textContent?.includes('验证时段'))!.click();
  await delay();
  const cardHeading = Array.from(document.querySelectorAll('h3')).find((item) => item.textContent === '随机原则')!;
  cardHeading.closest('.p-3.bg-white')!.querySelector<HTMLButtonElement>('button[title="编辑"]')!.click();
  await delay();
  await setValue('[aria-label="随机原则分组"]', groupId);
  await capture('principle-group-scene');
  await click('保存');
  const savedCard = loadSceneGroupStateFromStorage().groups[0].timeSlots[0].cards[0];
  check(savedCard.principleGroupId === groupId, 'Scene card must persist selected group');
  passed.push('Real scene editor selects and saves the random group scope');

  root.render(<SceneCard data={savedCard} />);
  await delay();
  check(!document.body.innerText.includes('另一条内容'), 'Random card cannot display another group');
  localStorage.setItem('lumostime_principles', JSON.stringify(storedPrinciples().map((item: any) => item.groupId === groupId ? { ...item, title: '组内更新', frontText: '实时更新内容' } : item)));
  window.dispatchEvent(new Event('principleLibraryChanged'));
  await delay();
  check(document.body.innerText.includes('实时更新内容'), 'Library updates refresh visible card');
  passed.push('Scene card group isolation and live library updates');

  root.render(<PrincipleLibraryView onBack={() => {}} />);
  await delay();
  await setValue('[aria-label="筛选原则分组"]', groupId);
  await click('删除分组');
  await click('删除');
  check(storedGroups().length === 1 && storedPrinciples().length === 3, 'Deleting group preserves principles');
  check(!storedPrinciples().some((item: any) => item.groupId === groupId), 'Deleted group members become ungrouped');
  root.render(<SceneCard data={savedCard} />);
  await delay();
  check(document.body.innerText.includes('原则分组已删除'), 'Deleted scope must not fall back to other groups');
  passed.push('Group deletion preserves principles and invalidates configured random scope');
  window.__principleResult = { passed };
}
void run().catch((error) => { window.__principleResult = { passed, error: error instanceof Error ? error.stack : String(error) }; });
