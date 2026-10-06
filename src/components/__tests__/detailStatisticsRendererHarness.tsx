/**
 * @file detailStatisticsRendererHarness.tsx
 * @input Real filter/scope detail views, cards, selection controls, and isolated settings.
 * @output Browser regression results and screenshot checkpoints.
 * @pos Test (Detail Statistics Renderer)
 * @updated 2026-10-06: Exercises source restrictions, historical totals, scope persistence, and empty-card restoration.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Category, Filter, Log, Scope } from '../../types';
import { FiltersSettingsView } from '../../views/settings/FiltersSettingsView';
import { ScopeDetailView } from '../../views/ScopeDetailView';
import { CategoryDetailView } from '../../views/CategoryDetailView';

declare global {
  interface Window {
    __detailStatisticsResult?: { passed: string[]; error?: string };
    __detailStatisticsCapture?: string | null;
  }
}
const passed: string[] = [];
const delay = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const host = document.getElementById('root')!;
const root = createRoot(host);
const render = async (node: React.ReactNode) => { root.render(node); await delay(120); };
const button = (label: string, container: ParentNode = document) => Array.from(container.querySelectorAll('button')).find((item) => item.textContent?.trim() === label || item.getAttribute('aria-label') === label || item.title === label);
const click = async (label: string, container: ParentNode = document) => { const target = button(label, container); check(target, `Missing button: ${label}`); target!.click(); await delay(); };
const dialog = (name: string) => { const node = document.querySelector(`[role="dialog"][aria-label="${name}"]`); check(node, `Missing dialog: ${name}`); return node!; };
const capture = async (name: string) => {
  window.__detailStatisticsCapture = name;
  for (let i = 0; window.__detailStatisticsCapture && i < 100; i++) await delay();
  check(!window.__detailStatisticsCapture, 'Screenshot was not captured');
};
const setInput = async (placeholder: string, value: string) => {
  const input = document.querySelector<HTMLInputElement>(`input[placeholder="${placeholder}"]`)!;
  check(input, 'Missing input');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true })); await delay();
};

const categories: Category[] = [{ id: 'category', name: '学习', icon: '书', themeColor: '#6a7861', activities: [
  { id: 'reading', name: '阅读', icon: '书', color: '#6a7861' },
  { id: 'running', name: '跑步', icon: '跑', color: '#996666' }
] }];
const now = Date.now();
const oldStart = new Date(2020, 0, 1, 23, 30).getTime();
const record = (id: string, startTime: number, endTime: number, duration: number, overrides: Partial<Log> = {}): Log => ({
  id, categoryId: 'category', activityId: 'reading', startTime, endTime, duration, title: '阅读', scopeIds: ['scope', 'scope', 'another-scope'], ...overrides
});
const logs = [
  record('old', oldStart, oldStart + 7200000, 3600, { note: '历史阅读 学习记录' }),
  record('recent', now - 7200000, now - 3600000, 1800, { note: '近期阅读 专注学习' }),
  record('unmatched', now - 14400000, now - 10800000, 9000, { activityId: 'running', title: '跑步', scopeIds: ['another-scope'] }),
  record('planned', now - 3600000, now, 99999, { isPlanned: true, note: '计划记录' })
];
let savedFilters: Filter[] = [{ id: 'filter', name: '阅读筛选', filterExpression: '#阅读', createdAt: 1, icon: '星', order: 0 }];
const FiltersProbe = () => {
  const [filters, setFilters] = useState(savedFilters);
  return <FiltersSettingsView filters={filters} onUpdateFilters={(next) => { savedFilters = next; setFilters(next); }}
    logs={logs} categories={categories} scopes={[]} todos={[]} todoCategories={[]} onBack={() => undefined} onToast={() => undefined} />;
};
let savedScope: Scope = { id: 'scope', name: '阅读领域', icon: '域', isArchived: false, order: 0, themeColor: '#6a7861' };
const ScopeProbe = () => {
  const [scope, setScope] = useState(savedScope);
  return <ScopeDetailView scope={scope} onUpdate={(next) => { savedScope = next; setScope(next); }}
    logs={logs} categories={categories} todos={[]} goals={[]} majorGoals={[]} onBack={() => undefined} />;
};
let savedCategory = categories[0];
const CategoryProbe = () => {
  const [category, setCategory] = useState(savedCategory);
  return <CategoryDetailView categoryId={category.id} categories={[category]} logs={logs} todos={[]} scopes={[]}
    onUpdateCategory={(next) => { savedCategory = next; setCategory(next); }} />;
};
const openFilter = async () => { const heading = document.querySelector('h4')!; check(heading, 'Missing saved filter'); heading.click(); await delay(); await click('统计'); };
const editFirst = async () => { await click('管理'); await click('编辑记录时长 · 数值概览', dialog('管理统计卡片')); };

async function run() {
  await document.fonts.load('16px VerifiedChinese', '领域统计记录时长备注');
  await render(<FiltersProbe />); await openFilter();
  check(host.textContent?.includes('2 条记录'), 'Statistics included planned/unmatched records');
  await editFirst();
  await click('全部', dialog('编辑所选卡片'));
  check(savedFilters[0].statisticCards?.[0].range === 'all', 'All-time card was not saved');
  await click('记录时长', dialog('编辑所选卡片'));
  const choices = document.querySelectorAll('.max-h-60 button');
  check(choices.length === 2 && [...choices].every((item) => ['记录时长', '备注'].includes(item.textContent!.trim())), 'Unexpected statistic sources');
  await click('记录时长', document.querySelector('.max-h-60')!);
  await click('关闭', dialog('编辑所选卡片')); await click('关闭', dialog('管理统计卡片'));
  check(host.textContent?.includes('1h 30m'), 'All-time duration omitted history or counted duplicates');
  await capture('filter-statistics');
  passed.push('Filter statistics use matching actual records, save all-time totals, and expose only duration/notes');

  await click('管理'); await click('编辑备注 · 词云', dialog('管理统计卡片')); await click('全部', dialog('编辑所选卡片'));
  await click('关闭', dialog('编辑所选卡片')); await click('关闭', dialog('管理统计卡片'));
  check(host.textContent?.includes('历史') && !host.textContent?.includes('计划记录'), 'All-time note cloud omitted history or included a planned note');
  passed.push('All-time note clouds include historical matching notes and exclude planned notes');

  await click('配色');
  const paletteButton = document.querySelector<HTMLButtonElement>('[aria-label="图表配色"] button:nth-child(3)')!;
  check(paletteButton, 'Missing palette'); paletteButton.click(); await delay();
  const palette = savedFilters[0].statisticPalette;
  await click('关闭', dialog('配色'));
  await render(null); await render(<FiltersProbe />);
  // The edit action is the pen-icon button inside the saved filter row.
  const row = document.querySelector('h4')!.closest('.cursor-pointer')!;
  const actions = Array.from(row.querySelectorAll('button'));
  check(actions.length >= 4, 'Missing filter actions'); actions[2].click(); await delay();
  await setInput('例如:瑜伽训练', '阅读筛选改名');
  await setInput('例如:瑜伽 OR 跑步 #运动 %健康 ^🌸', '#阅读 -不存在');
  await click('保存');
  check(savedFilters[0].statisticCards?.[0].range === 'all' && savedFilters[0].statisticPalette === palette && savedFilters[0].icon === '星', 'Expression edit lost card/palette/icon settings');
  await openFilter();
  check(host.textContent?.includes('1h 30m'), 'Remounted filter lost all-time settings');
  await editFirst();
  await click('面积趋势', dialog('编辑所选卡片'));
  check(!button('全部', dialog('编辑所选卡片')), 'Unsupported trend exposed all-time');
  check(savedFilters[0].statisticCards?.[0].range === '30d', 'Chart switch retained unsupported all-time range');
  await click('时序图', dialog('编辑所选卡片')); await click('全部', dialog('编辑所选卡片')); await click('直方', dialog('编辑所选卡片'));
  await click('关闭', dialog('编辑所选卡片')); await click('关闭', dialog('管理统计卡片'));
  check(document.querySelector('svg[aria-label*="时序图，直方样式，全部"]'), 'All-time rhythm did not render');
  passed.push('Filter editing and remount retain cards/palette; type switches enforce valid ranges; all-time rhythm renders');

  await click('管理');
  await click('删除', dialog('管理统计卡片')); await click('删除', dialog('管理统计卡片')); await click('关闭', dialog('管理统计卡片'));
  await render(null); await render(<FiltersProbe />); await openFilter();
  check(savedFilters[0].statisticCards?.length === 0 && host.textContent?.includes('0 张卡片'), 'Deleted cards were recreated on reentry');
  await click('管理'); await click('恢复默认卡片', dialog('管理统计卡片')); await click('关闭', dialog('管理统计卡片'));
  check(savedFilters[0].statisticCards?.length === 2, 'Default restoration failed');
  passed.push('Deleting all cards remains persisted; explicit restore recreates two default cards');

  await render(null); await render(<ScopeProbe />); await click('统计');
  check(host.textContent?.includes('2 条记录'), 'Scope statistics counted duplicates/plans/unlinked logs');
  await editFirst(); await click('全部', dialog('编辑所选卡片')); await click('星期 × 小时热力图', dialog('编辑所选卡片'));
  await click('关闭', dialog('编辑所选卡片')); await click('关闭', dialog('管理统计卡片'));
  check(document.querySelector('[title="三 23:00 · 15m · 1 条"]') && document.querySelector('[title="四 00:00 · 30m · 1 条"]') && document.querySelector('[title="四 01:00 · 15m · 1 条"]'), 'Heatmap did not split paused cross-midnight history');
  await capture('scope-statistics');
  await render(null);
  check(savedScope.statisticCards?.[0].range === 'all' && savedScope.statisticCards[0].chartType === 'tagDurationWeekHourHeatmap', 'Scope exit did not persist statistics');
  await render(<ScopeProbe />); await click('统计');
  check(document.querySelector('[title="四 00:00 · 30m · 1 条"]'), 'Scope remount lost history/settings');
  await capture('scope-statistics-mobile');
  passed.push('Scope statistics conserve full linked duration, split weekday/hour heatmap, and persist on exit');

  await render(null); await render(<CategoryProbe />); await click('统计');
  check(savedCategory.statisticCards?.length === 3, 'Category with unset cards did not create its original defaults');
  await click('管理'); await click('编辑二级标签 · 选项分布', dialog('管理统计卡片')); await click('全部', dialog('编辑所选卡片'));
  await click('关闭', dialog('编辑所选卡片')); await click('关闭', dialog('管理统计卡片'));
  check(savedCategory.statisticCards?.find((card) => card.source.type === 'categoryActivity')?.range === 'all', 'Category tag distribution did not save all-time');
  await render(null); await render(<CategoryProbe />); await click('统计');
  await click('管理'); await click('删除', dialog('管理统计卡片')); await click('删除', dialog('管理统计卡片')); await click('删除', dialog('管理统计卡片')); await click('关闭', dialog('管理统计卡片'));
  await render(null); await render(<CategoryProbe />); await click('统计');
  check(savedCategory.statisticCards?.length === 0 && host.textContent?.includes('0 张卡片'), 'Category empty settings were not preserved');
  passed.push('Existing category defaults and all-time tag distribution work; explicitly empty category cards survive remount');
  window.__detailStatisticsResult = { passed };
}
run().catch((error) => { window.__detailStatisticsResult = { passed, error: error.stack || String(error) }; });
