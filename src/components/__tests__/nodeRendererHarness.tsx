/**
 * @file nodeRendererHarness.tsx
 * @updated 2026-10-08: Checks saved and AI-generated Markdown headings/list styles with production CSS.
 * @updated 2026-10-07: Exercises review-card period filtering, review-kind navigation and cross-kind backlink transforms.
 * @updated 2026-10-07: Exercises merge choices, dirty-editor retention, rapid rename, navigation and persisted complete backlink updates.
 * @updated 2026-10-07: Verifies full-width alias links render, navigate and retain delimiters on rename.
 * @updated 2026-10-07: Exercises searchable pickers and capsule mouse/touch drag ordering across reloads.
 * @updated 2026-10-07: Verifies classifications and alias-label navigation/conversion across reloads.
 * @input Actual DataProvider, NodeProvider and node UI in an isolated Electron renderer
 * @output Interaction, persistence and mobile-layout regressions with capture checkpoints
 * @pos Test (Nodes Renderer)
 * @updated 2026-10-06: Exercises backlinks, metadata editing, AI race protection, rename and back navigation.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { DataProvider, useData } from '../../contexts/DataContext';
import { NodeProvider, useNodes } from '../../contexts/NodeContext';
import { PrivacyProvider } from '../../contexts/PrivacyContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { NodesSettingsView } from '../../views/settings/NodesSettingsView';
import { NodeDetailOverlay } from '../NodeDetailOverlay';
import { NodeSuggestions } from '../NodeSuggestions';
import { NodeNoteSuggestions } from '../NodeNoteSuggestions';
import { useLogManager } from '../../hooks/useLogManager';
import { dataRepository } from '../../repositories/dataRepository';
import { aiRequests, useNavigation } from './nodeRendererMocks';
import { runRegisteredHardwareBackHandler } from '../../utils/hardwareBackHandlerStack';
import type { Log } from '../../types';
import { getNodeNames } from '../../utils/nodeUtils';

declare global {
  interface Window {
    __nodeRendererResult?: { passed: string[]; error?: string };
    __nodeRendererCapture?: string | null;
    __nodeRendererPointer?: { phase: 'down' | 'move' | 'up' | 'cancel'; x: number; y: number; pointerType: string } | null;
  }
}
let data: ReturnType<typeof useData>;
let nodes: ReturnType<typeof useNodes>;
let manager: ReturnType<typeof useLogManager>;
let navigation: ReturnType<typeof useNavigation>;
const passed: string[] = [];
const root = createRoot(document.getElementById('root')!);
const delay = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const until = async (predicate: () => unknown, label: string) => {
  const start = Date.now();
  while (!predicate()) { if (Date.now() - start > 7000) throw new Error(`Timeout: ${label}`); await delay(); }
};
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find((element) => element.textContent?.trim() === text);
const click = async (text: string) => { const element = button(text); check(element, `Missing button: ${text}`); element!.click(); await delay(); };
const labelledClick = async (label: string) => { const element = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`); check(element, `Missing labelled button: ${label}`); element!.click(); await delay(); };
const input = async (label: string, value: string) => {
  const element = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[aria-label="${label}"]`);
  check(element, `Missing input: ${label}`);
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
  element!.dispatchEvent(new Event('input', { bubbles: true }));
  await delay();
};
const select = async (label: string, value: string) => {
  await labelledClick(label);
  const element = [...document.querySelectorAll<HTMLButtonElement>('[role="option"]')].find((option) => option.dataset.categoryValue === value);
  check(element, `Missing category: ${value}`); element!.click(); await delay();
};
const drag = async (source: HTMLElement, destination: HTMLElement, pointerType = 'mouse', after = false, cancel = false) => {
  const pointer = async (phase: 'down' | 'move' | 'up' | 'cancel', x: number, y: number) => {
    window.__nodeRendererPointer = { phase, x: Math.round(x), y: Math.round(y), pointerType };
    await until(() => !window.__nodeRendererPointer, `native ${pointerType} ${phase}`); await delay();
  };
  source.scrollIntoView({ block: 'center' }); await delay();
  const from = source.getBoundingClientRect();
  await pointer('down', from.left + from.width / 2, from.top + from.height / 2);
  destination.scrollIntoView({ block: 'center' }); await delay();
  const to = destination.getBoundingClientRect();
  const x = to.left + to.width * (after ? 0.8 : 0.2);
  const y = to.top + to.height * (after ? 0.8 : 0.2);
  await pointer('move', x, y);
  await pointer(cancel ? 'cancel' : 'up', x, y);
};
const capture = async (name: string) => { window.__nodeRendererCapture = name; await until(() => !window.__nodeRendererCapture, `capture ${name}`); };
const assertFits = () => check(document.documentElement.scrollWidth <= window.innerWidth, 'Horizontal overflow');

const DraftEditor = () => {
  const [note, setNote] = React.useState('');
  return <div className="fixed inset-0 z-[230] overflow-y-auto bg-[#faf9f6] p-7" data-testid="draft-editor">
    <label className="mb-3 block text-xs font-bold text-stone-400" htmlFor="node-test-note">备注</label>
    <textarea id="node-test-note" aria-label="测试备注草稿" value={note} onChange={(event) => setNote(event.target.value)} className="h-[100px] w-full resize-none rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-800" />
    <NodeNoteSuggestions note={note} onChange={setNote} />
  </div>;
};

const Probe = () => {
  data = useData(); nodes = useNodes(); manager = useLogManager(); navigation = useNavigation();
  return <><NodesSettingsView onBack={() => {}} /><NodeDetailOverlay />{navigation.isAddModalOpen && <DraftEditor />}
    <div className="fixed bottom-0 z-[210]" data-testid="saved-suggestions">{data.logs.find((log) => log.id === 'candidate') && <NodeSuggestions log={data.logs.find((log) => log.id === 'candidate')!} />}</div>
  </>;
};
const render = () => root.render(<ToastProvider><DataProvider><PrivacyProvider><NodeProvider><Probe /></NodeProvider></PrivacyProvider></DataProvider></ToastProvider>);
const fixture = (id: string, note: string, day: number): Log => ({ id, note, startTime: new Date(2026, 9, day, 12).getTime(), endTime: new Date(2026, 9, day, 13).getTime(), duration: 3600, categoryId: 'c', activityId: 'a' });

async function run() {
  await dataRepository.saveLogs([fixture('first', '和 [[小林]] 在 [[杭州]] 讨论了 [[LumosTime]]。[[小林]] 记录节点功能的设计。', 6), fixture('second', '和 ［［林林丨小林］］ 在 ［［杭州］］ 散步。', 5), fixture('candidate', '今天林林推荐了一本书。', 4)]);
  await dataRepository.saveNodes([{ id: 'person', name: '小林', aliases: ['林林'], description: '', createdAt: 1, updatedAt: 1 }]);
  render();
  await until(() => data?.isReady && nodes.nodes.length === 3, 'hydration and discovery');
  check(nodes.index.get('person')?.logs.length === 2, 'Repeated link inflated backlinks');
  passed.push('auto-discovery and distinct backlinks');
  check(document.querySelector('main h2')!.closest('button')!.getBoundingClientRect().height <= 64, 'Node directory row is too tall');
  assertFits(); await capture('nodes-directory-mobile');
  check(document.querySelector('main h3')?.textContent?.includes('未分类'), 'Legacy nodes are not in uncategorized');
  await click('新建分类'); await input('新分类名称', '人物'); await labelledClick('保存分类');
  check(nodes.nodeCategories.some((category) => category.name === '人物'), 'Empty category not created');
  const peopleCategory = nodes.nodeCategories.find((category) => category.name === '人物')!;
  await select('筛选节点分类', peopleCategory.id);
  check(document.querySelectorAll('main h2').length === 0, 'Category filter included uncategorized nodes');
  await select('筛选节点分类', 'all');
  await labelledClick('筛选节点分类'); await input('搜索节点分类', '人物');
  check(document.querySelectorAll('[role="option"]').length === 1, 'Category picker search failed');
  document.querySelector('[aria-label="搜索节点分类"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); await delay();
  check(document.activeElement?.getAttribute('role') === 'option', 'Category picker keyboard navigation failed');
  await capture('node-category-picker-mobile');
  document.querySelector('[aria-label="搜索节点分类"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await delay();
  check(!document.querySelector('[role="listbox"]'), 'Category picker did not close on Escape');
  await input('搜索节点', '林林');
  check(document.querySelectorAll('main h2').length === 1, 'Alias search failed');
  await input('搜索节点', '');
  await click('记录数量'); await click('名称'); await click('最近使用');
  nodes.openNode('小林');
  await until(() => document.querySelector('[aria-label="重命名节点"]'), 'detail render');
  check(document.querySelector('[role="dialog"] > header h1')?.textContent === '节点详情', 'Missing matching detail title bar');
  await until(() => document.body.textContent?.includes('记录节点功能的设计'), 'all-history timeline');
  check(document.querySelector('[aria-label="查看节点：杭州"]'), 'Timeline wiki-link is not clickable');
  check([...document.querySelectorAll('[aria-label="查看节点：小林"]')].some((element) => element.textContent === '林林'), 'Alias label was replaced by node name');
  assertFits(); await capture('node-timeline-mobile');
  await click('细节');
  await select('节点分类', peopleCategory.id);
  check(nodes.nodes.find((node) => node.id === 'person')?.categoryId === peopleCategory.id, 'Category assignment failed');
  // Creating a category and assigning it must work within the same React event.
  const createInDetail = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((element) => element.textContent?.trim() === '新建分类')!;
  createInDetail.click(); await delay();
  await input('新分类名称', '朋友'); await labelledClick('保存分类');
  const friendCategory = nodes.nodeCategories.find((category) => category.name === '朋友')!;
  check(nodes.nodes.find((node) => node.id === 'person')?.categoryId === friendCategory.id, 'New detail category not assigned immediately');
  await select('节点分类', '');
  check(!nodes.nodes.find((node) => node.id === 'person')?.categoryId, 'Clearing classification failed');
  await select('节点分类', peopleCategory.id);
  await labelledClick('编辑节点简介');
  const markdownDescription = '# 节点概览\n\n## 基本信息\n\n和小林共同记录的日常与项目讨论。\n\n- 身份：同事\n- 关系：项目伙伴\n  - 每周讨论进展\n\n### 最近交往\n\n1. 讨论项目\n2. 推荐书籍\n\n> 一起记录日常。';
  await input('节点简介', markdownDescription);
  await labelledClick('保存节点简介');
  const preview = document.querySelector<HTMLElement>('[aria-label="节点简介预览"]')!;
  const paragraph = preview.querySelector('p')!;
  const headingSizes = ['h1', 'h2', 'h3'].map((tag) => parseFloat(getComputedStyle(preview.querySelector(tag)!).fontSize));
  check(headingSizes[0] > headingSizes[1] && headingSizes[1] > headingSizes[2] && headingSizes[2] > parseFloat(getComputedStyle(paragraph).fontSize), 'Markdown heading hierarchy lost its styles');
  check(Number(getComputedStyle(preview.querySelector('h2')!).fontWeight) >= 600, 'Markdown heading is not emphasized');
  check(getComputedStyle(preview.querySelector('ul')!).listStyleType === 'disc', 'Markdown unordered list has no bullets');
  check(getComputedStyle(preview.querySelector('ol')!).listStyleType === 'decimal', 'Markdown ordered list has no numbering');
  check(parseFloat(getComputedStyle(preview.querySelector('ul ul')!).paddingLeft) > 0, 'Nested Markdown list has no indentation');
  check(parseFloat(getComputedStyle(preview.querySelector('blockquote')!).borderLeftWidth) > 0, 'Markdown blockquote lost its border');
  check(nodes.nodes.find((node) => node.id === 'person')?.description === markdownDescription, 'Saving Markdown changed the source text');
  preview.scrollIntoView({ block: 'center' });
  assertFits(); await capture('node-markdown-mobile');
  passed.push('saved Markdown heading hierarchy, list markers/nesting, blockquote and unchanged source');
  await labelledClick('编辑节点简介');
  await input('节点简介', '和小林共同记录的日常与项目讨论。');
  await input('新别名', '小林同学'); await labelledClick('添加别名');
  await labelledClick('编辑别名：小林同学'); await input('新别名', '林同学'); await labelledClick('保存别名');
  check(nodes.nodes.find((node) => node.id === 'person')?.aliases.includes('林同学'), 'Alias editing failed');
  await labelledClick('删除别名：林同学');
  check(!nodes.nodes.find((node) => node.id === 'person')?.aliases.includes('林同学'), 'Alias removal failed');
  await input('新别名', '小林同学'); await labelledClick('添加别名');
  await click('关联');
  await until(() => nodes.nodes.find((node) => node.id === 'person')?.aliases.includes('小林同学'), 'buffered alias save');
  check(nodes.nodes.find((node) => node.id === 'person')?.description.includes('共同记录'), 'Description lost on tab change');
  check(document.querySelector('[aria-label="查看相关节点：杭州"]')?.textContent?.includes('2 条'), 'Co-occurrence count failed');
  assertFits(); await capture('node-related-mobile');
  const relatedTab = [...document.querySelectorAll<HTMLButtonElement>('nav[aria-label="节点详情"] button')].find((element) => element.textContent?.trim() === '关联');
  check(relatedTab, 'Missing related tab'); relatedTab!.click(); await delay();
  check(![...document.querySelectorAll('h2')].some((heading) => heading.textContent?.includes('日报回答')), 'Related tab retained the old daily-answer section');
  const associate = [...document.querySelectorAll<HTMLButtonElement>('article button')].find((element) => element.textContent === '关联');
  check(associate, 'Missing candidate association'); associate!.click(); await delay();
  check(data.logs.find((log) => log.id === 'candidate')?.note === '今天[[林林丨小林]]推荐了一本书。', 'Alias conversion failed');
  check(nodes.index.get('person')?.logs.length === 3, 'Associated log did not join backlinks');
  check(!document.querySelector('article'), 'Candidate did not disappear');
  await labelledClick('查看相关节点：杭州');
  await until(() => document.querySelector('[data-node-name]')?.textContent === '杭州', 'related-node navigation');
  const aliasLink = [...document.querySelectorAll<HTMLButtonElement>('[aria-label="查看节点：小林"]')].find((element) => element.textContent === '林林');
  check(aliasLink, 'Related timeline lost alias display'); aliasLink!.click(); await delay();
  check(document.querySelector('[data-node-name]')?.textContent === '小林', 'Alias did not navigate to canonical node');
  check(runRegisteredHardwareBackHandler(), 'Alias detail did not unwind'); await delay();
  check(runRegisteredHardwareBackHandler(), 'Hardware back did not handle node history'); await delay();
  check(document.querySelector('[data-node-name]')?.textContent === '小林', 'Back did not restore prior node');
  await click('细节');
  await click('AI 生成'); await until(() => aiRequests.length === 1, 'AI request');
  check(JSON.parse(aiRequests[0].prompt).相关记录.length === 3, 'AI prompt omitted backlinks');
  aiRequests[0].resolve('相关记录涉及项目讨论、散步和书籍推荐。'); await delay();
  check(document.querySelector('[aria-label="节点简介预览"]')?.textContent?.includes('书籍推荐'), 'Generated text not rendered');
  const generatedPreview = document.querySelector('[aria-label="节点简介预览"]')!;
  check(generatedPreview.querySelector('h2')?.textContent === '基本信息', 'Generated biography did not parse Markdown headings');
  check(getComputedStyle(generatedPreview.querySelector('ul')!).listStyleType === 'disc', 'Generated biography list has no bullets');
  passed.push('AI-generated Markdown headings and list markers');
  await click('AI 生成'); await until(() => aiRequests.length === 2, 'second AI request');
  await labelledClick('编辑节点简介');
  await input('节点简介', '生成期间手写的简介。');
  aiRequests[1].resolve('过期 AI 内容'); await delay();
  check((document.querySelector('[aria-label="节点简介"]') as HTMLTextAreaElement).value === '生成期间手写的简介。', 'AI overwrote newer edits');
  assertFits(); await capture('node-details-mobile');
  passed.push('directory search/sorting, timeline links, aliases, candidates, AI and history');
  await click('时间线');
  const logCard = document.querySelector('[aria-label="查看节点：杭州"]')?.closest('[class*="cursor-pointer"]') as HTMLElement;
  check(logCard, 'Missing original record click target'); logCard!.click(); await delay();
  check(navigation.isAddModalOpen && navigation.editingLog?.id, 'Record did not open original log editor');
  const unchangedLogs = JSON.stringify(data.logs);
  await input('测试备注草稿', '今天和林林去了杭州。');
  check(document.querySelector('[aria-label="在备注中关联节点：小林"]'), 'Alias draft suggestion missing');
  check(document.querySelector('[aria-label="在备注中关联节点：杭州"]'), 'Name draft suggestion missing');
  await labelledClick('在备注中关联节点：小林');
  check((document.querySelector('[aria-label="测试备注草稿"]') as HTMLTextAreaElement).value === '今天和[[林林丨小林]]去了杭州。', 'Draft suggestion did not preserve alias');
  check(!document.querySelector('[aria-label="在备注中关联节点：小林"]'), 'Already-linked draft node is still suggested');
  await labelledClick('在备注中关联节点：杭州');
  check(JSON.stringify(data.logs) === unchangedLogs, 'Unsaved draft suggestion persisted a log');
  await input('测试备注草稿', '今天和林林去了杭州。');
  assertFits(); await capture('node-editor-suggestions-mobile');
  navigation.setIsAddModalOpen(false); await delay();
  logCard!.focus(); logCard!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await delay();
  check(navigation.isAddModalOpen && navigation.editingLog?.id, 'Record did not open from keyboard');
  navigation.setIsAddModalOpen(false); await delay();
  await labelledClick('重命名节点'); await input('节点名称', '杭州'); await labelledClick('保存名称');
  check(nodes.nodes.find((node) => node.id === 'person')?.name === '小林', 'Conflicting rename mutated data');
  await input('节点名称', '林老师'); await labelledClick('保存名称');
  check(nodes.nodes.find((node) => node.id === 'person')?.aliases.includes('小林'), 'Old name not preserved as alias');
  check(data.logs.every((log) => !log.note?.includes('[[小林]]')), 'Rename left old links');
  check(nodes.nodes.filter((node) => node.name === '小林').length === 0, 'Rename resurrected old node');
  check(data.logs.find((log) => log.id === 'second')?.note?.includes('［［林林丨林老师］］'), 'Rename changed full-width delimiters or alias label');
  manager.handleSaveLog(fixture('new', '和 [[林老师]] 去了 [[北京]]。', 3)); await delay();
  check(nodes.nodes.some((node) => node.name === '北京'), 'Saved log did not auto-create node');
  passed.push('original editor navigation, live draft suggestions, conflict protection and saved-log creation');
  nodes.closeNode(); await delay();
  data.setNodes((previous) => [...previous, ...Array.from({ length: 18 }, (_, index) => ({ id: `sample-${index}`, name: `节点 ${index + 1}`, aliases: [], description: '', createdAt: 1, updatedAt: 1 }))]); await delay();
  const hangzhou = nodes.nodes.find((node) => node.name === '杭州')!;
  const beijing = nodes.nodes.find((node) => node.name === '北京')!;
  nodes.assignCategory(hangzhou.id, friendCategory.id); nodes.assignCategory(beijing.id, friendCategory.id); await delay();
  await labelledClick('管理节点分类与排序');
  await until(() => document.querySelector('[data-testid="node-management"]'), 'capsule manager');
  const capsule = (id: string) => document.querySelector<HTMLElement>(`[data-node-capsule="${id}"]`)!;
  const group = (id: string) => document.querySelector<HTMLElement>(`[data-node-group="${id}"]`)!;
  const notesBeforeManagement = JSON.stringify(data.logs);
  await drag(capsule('person'), capsule(beijing.id), 'touch');
  check(nodes.nodes.find((node) => node.id === 'person')?.categoryId === friendCategory.id, 'Touch drag did not change category');
  await drag(capsule('person'), group(peopleCategory.id), 'mouse');
  check(nodes.nodes.find((node) => node.id === 'person')?.categoryId === peopleCategory.id, 'Empty category drop failed');
  await drag(capsule(beijing.id), capsule(hangzhou.id));
  check(nodes.nodes.filter((node) => node.categoryId === friendCategory.id)[0].id === beijing.id, 'Capsule order unchanged');
  const beforeCancel = JSON.stringify(nodes.nodes);
  await drag(capsule('person'), capsule(beijing.id), 'touch', false, true);
  check(JSON.stringify(nodes.nodes) === beforeCancel, 'Cancelled drag changed metadata');
  await drag(document.querySelector<HTMLElement>('[aria-label="拖动分类：朋友"]')!, group(peopleCategory.id), 'touch');
  check(nodes.nodeCategories[0].id === friendCategory.id, 'Category drag did not reorder');
  await labelledClick('管理节点：林老师'); await select('移动选中节点到分类', '');
  check(!nodes.nodes.find((node) => node.id === 'person')?.categoryId, 'Accessible category move failed');
  await select('移动选中节点到分类', peopleCategory.id);
  await labelledClick('管理节点：节点 1'); await labelledClick('节点向后移动');
  check(nodes.nodes.findIndex((node) => node.id === 'sample-0') > nodes.nodes.findIndex((node) => node.id === 'sample-1'), 'Accessible node reorder failed');
  check(JSON.stringify(data.logs) === notesBeforeManagement, 'Management changed wiki-link notes');
  const sample1 = capsule('sample-0').getBoundingClientRect();
  const sample2 = capsule('sample-1').getBoundingClientRect();
  check(sample1.top === sample2.top && sample1.width < window.innerWidth / 2, 'Capsules do not share a compact row');
  await labelledClick('取消选择节点');
  document.querySelector('[data-testid="node-management"] main')!.scrollTop = 0;
  document.querySelectorAll<HTMLButtonElement>('[class*="pointer-events-auto"] button').forEach((element) => element.click()); await delay();
  assertFits(); await capture('node-management-mobile');
  await labelledClick('返回节点列表');
  check(button('手动排序')?.getAttribute('aria-pressed') === 'true', 'Directory did not adopt manual order');
  passed.push('searchable pickers, touch/mouse cross-category drag, empty drops, node/category order, cancellation and accessible controls');
  await until(() => !document.body.textContent?.includes('正在加载'), 'settled view');
  await delay(350);
  const persisted = await dataRepository.loadDataContextSnapshot();
  check(persisted.nodes.some((node) => node.name === '林老师' && node.description === '生成期间手写的简介。'), 'Metadata did not persist');
  check(persisted.logs.every((log) => !log.note?.includes('[[小林]]')), 'Renamed notes did not persist');
  const previousData = data;
  root.unmount(); await delay();
  const restored = createRoot(document.getElementById('root')!);
  restored.render(<ToastProvider><DataProvider><PrivacyProvider><NodeProvider><Probe /></NodeProvider></PrivacyProvider></DataProvider></ToastProvider>);
  await until(() => data !== previousData && data.isReady && nodes.nodes.some((node) => node.name === '林老师'), 'reload');
  check(nodes.index.get('person')?.logs.length === 4, 'Reload lost backlinks');
  check(nodes.nodes.find((node) => node.id === 'person')?.description === '生成期间手写的简介。', 'Reload lost biography');
  check(nodes.nodeCategories.some((category) => category.id === peopleCategory.id), 'Reload lost categories');
  check(nodes.nodes.find((node) => node.id === 'person')?.categoryId === peopleCategory.id, 'Reload lost classification');
  check(nodes.nodeCategories[0].id === friendCategory.id, 'Reload lost category order');
  check(nodes.nodes.filter((node) => node.categoryId === friendCategory.id)[0].id === beijing.id, 'Reload lost capsule order');
  check(nodes.nodes.findIndex((node) => node.id === 'sample-0') > nodes.nodes.findIndex((node) => node.id === 'sample-1'), 'Reload lost accessible reorder');
  await capture('nodes-classified-directory-mobile');
  passed.push('persisted rename, aliases, biography and remount hydration');
  nodes.openNode('林老师'); await until(() => button('细节'), 'restored detail'); await click('细节');
  await capture('node-details-desktop');
  nodes.closeNode(); await delay(); await labelledClick('管理节点分类与排序');
  assertFits(); await capture('node-management-desktop');
  await labelledClick('返回节点列表');
  data.setNodes((previous) => [...previous, { id: 'merge-source', name: '浩特', aliases: ['小浩'], description: '待合并简介', categoryId: friendCategory.id, createdAt: 1, updatedAt: 1 }]);
  data.setLogs((previous) => [...previous, fixture('merge-source-log', '和 [[浩特]] 见面。', 1), fixture('merge-overlap', '[[林老师]] 和 ［［小浩丨浩特］］ 讨论。', 2)]); await delay();
  nodes.openNode('林老师'); await until(() => button('细节'), 'merge detail'); await click('细节');
  await labelledClick('编辑节点简介');
  await input('节点简介', '合并前手写简介');
  await click('AI 生成'); await until(() => aiRequests.length === 3, 'generation pending during merge');
  await click('合并节点'); await input('搜索待合并节点', '小浩'); await labelledClick('选择待合并节点：浩特');
  check(document.querySelectorAll('[aria-label^="选择待合并节点："]').length === 1, 'Merge picker alias search failed');
  await labelledClick('主节点：浩特'); check(document.querySelector('[aria-label="主节点：浩特"]')?.getAttribute('aria-checked') === 'true', 'Cannot choose another primary');
  const mergeNotesBefore = JSON.stringify(data.logs);
  await labelledClick('取消合并节点');
  check(nodes.nodes.some((node) => node.id === 'merge-source') && JSON.stringify(data.logs) === mergeNotesBefore, 'Cancel merge changed records');
  await click('合并节点'); await input('搜索待合并节点', '小浩'); await labelledClick('选择待合并节点：浩特');
  await labelledClick('主节点：林老师');
  document.querySelector('[aria-label="合并节点"]')!.scrollIntoView({ block: 'center' });
  assertFits(); await capture('node-merge-desktop');
  await labelledClick('确认合并节点');
  await until(() => !nodes.nodes.some((node) => node.id === 'merge-source'), 'source removed after merge');
  check(nodes.nodes.find((node) => node.id === 'person')?.categoryId === peopleCategory.id, 'Merge replaced primary classification');
  check(nodes.nodes.find((node) => node.id === 'person')?.aliases.includes('浩特'), 'Source name missing from merged aliases');
  check(nodes.nodes.find((node) => node.id === 'person')?.description === '合并前手写简介\n\n待合并简介', 'Merge lost dirty/other biography');
  check(nodes.index.get('person')?.logs.length === 6, 'Merge union double-counted or omitted records');
  check(data.logs.find((log) => log.id === 'merge-source-log')?.note?.includes('[[浩特丨林老师]]'), 'Merge did not retain old-name display alias');
  check(data.logs.find((log) => log.id === 'merge-overlap')?.note?.includes('［［小浩丨林老师］］'), 'Merge lost full-width alias reference');
  aiRequests[2].resolve('过期的合并前生成内容'); await delay();
  check(nodes.nodes.find((node) => node.id === 'person')?.description === '合并前手写简介\n\n待合并简介', 'In-flight AI overwrote merged biography');
  // Log updates and successive renames in a single batch must use the latest combined snapshot.
  data.setLogs((previous) => [...previous, fixture('queued-rename', '[[林老师]] 新增记录', 2)]);
  nodes.rename('person', '主节点一'); nodes.rename('person', '主节点二'); await delay();
  check(nodes.nodes.find((node) => node.id === 'person')?.name === '主节点二', 'Rapid rename lost latest name');
  check(data.logs.find((log) => log.id === 'queued-rename')?.note === '[[主节点二]] 新增记录', 'Queued record missed rename');
  check(data.logs.filter((log) => ['first', 'second', 'candidate', 'new', 'merge-source-log', 'merge-overlap', 'queued-rename'].includes(log.id)).every((log) => getNodeNames(log.note).includes('主节点二')), 'Rename omitted a linked historical/alias record');
  check(!nodes.nodes.some((node) => ['林老师', '主节点一', '浩特'].includes(node.name)), 'An intermediate node was rediscovered');
  data.setNodes((previous) => [...previous, { id: 'new-primary', name: '新主节点', aliases: [], description: '主节点简介', categoryId: friendCategory.id, createdAt: 1, updatedAt: 1 }]); await delay();
  await click('合并节点'); await input('搜索待合并节点', '新主'); await labelledClick('选择待合并节点：新主节点'); await labelledClick('主节点：新主节点'); await labelledClick('确认合并节点');
  await until(() => document.querySelector('[data-node-name]')?.textContent === '新主节点', 'redirect to selected other primary');
  check(!nodes.nodes.some((node) => node.id === 'person'), 'Second merge did not remove former primary');
  check(nodes.index.get('new-primary')?.logs.length === 7, 'Second merge lost backlinks');
  check(nodes.nodes.find((node) => node.id === 'new-primary')?.categoryId === friendCategory.id, 'Chosen other primary identity not retained');
  check(runRegisteredHardwareBackHandler(), 'Merged detail cannot go back'); await delay();
  check(nodes.selectedNodeId === null, 'Merge left duplicate/removed history entries');
  await delay(350);
  const mergedSnapshot = await dataRepository.loadDataContextSnapshot();
  check(mergedSnapshot.nodes.some((node) => node.id === 'new-primary' && node.aliases.includes('主节点二') && node.aliases.includes('浩特')), 'Merged aliases did not persist');
  check(!mergedSnapshot.nodes.some((node) => ['person', 'merge-source'].includes(node.id)), 'Removed source persisted');
  const beforeMergedData = data;
  restored.unmount(); await delay();
  const mergedRoot = createRoot(document.getElementById('root')!);
  mergedRoot.render(<ToastProvider><DataProvider><PrivacyProvider><NodeProvider><Probe /></NodeProvider></PrivacyProvider></DataProvider></ToastProvider>);
  await until(() => data !== beforeMergedData && data.isReady && nodes.nodes.some((node) => node.id === 'new-primary'), 'merged remount');
  check(nodes.index.get('new-primary')?.logs.length === 7, 'Reload lost merged/renamed history');
  check(!nodes.nodes.some((node) => ['person', 'merge-source'].includes(node.id)), 'Reload resurrected merged nodes');
  passed.push('both merge-primary choices, cancellation, dirty biographies/AI race, queued log plus rapid rename, all-record retargeting and persisted merged history');
  data.setNodes((previous) => previous.map((node) => node.id === 'new-primary' ? { ...node, description: markdownDescription } : node)); await delay();
  nodes.openNode('新主节点'); await delay(); await click('细节');
  await capture('node-markdown-desktop');
  const desktopPreview = document.querySelector('[aria-label="节点简介预览"]')!;
  check(getComputedStyle(desktopPreview.querySelector('ul')!).listStyleType === 'disc' && getComputedStyle(desktopPreview.querySelector('ol')!).listStyleType === 'decimal', 'Desktop Markdown list markers lost their styles');
  assertFits();
  passed.push('desktop Markdown preview without horizontal overflow');
  window.__nodeRendererResult = { passed };
}
run().catch((error) => { window.__nodeRendererResult = { passed, error: String(error?.stack || error) }; });
