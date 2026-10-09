/**
 * @file detailStatisticsRendererHarness.tsx
 * @updated 2026-10-09: Exercises independent word rules, ordered selection, persistence, notes, and conditional clouds.
 * @input Real filter/scope detail views, cards, selection controls, and isolated settings.
 * @output Browser regression results and screenshot checkpoints.
 * @pos Test (Detail Statistics Renderer)
 * @updated 2026-10-06: Exercises source restrictions, historical totals, scope persistence, and empty-card restoration.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Activity, Category, Filter, Log, Scope } from '../../types';
import { ActivityAttributeStatistics } from '../ActivityAttributeStatistics';
import { runRegisteredHardwareBackHandler } from '../../utils/hardwareBackHandlerStack';
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

let savedWordActivity: Activity = {
  id: 'word-activity', name: '吃饭', color: '#996666', icon: '饭',
  attributes: [
    { id: 'place', name: '地点', type: 'text', order: 0, createdAt: 1, updatedAt: 1 },
    { id: 'kind', name: '餐别', type: 'single', options: [{ id: 'lunch', label: '午餐' }], order: 1, createdAt: 1, updatedAt: 1 },
    { id: 'conditional', name: '午餐地点', type: 'text', displayCondition: { attributeId: 'kind', optionIds: ['lunch'] }, order: 2, createdAt: 1, updatedAt: 1 }
  ],
  statisticCards: [
    { id: 'place-cloud', source: { type: 'attribute', attributeId: 'place' }, chartType: 'textCloud', range: 'all', metric: 'count', order: 0 },
    { id: 'other-cloud', source: { type: 'attribute', attributeId: 'place' }, chartType: 'textCloud', range: 'all', metric: 'count', order: 1 },
    { id: 'note-cloud', source: { type: 'note' }, chartType: 'textCloud', range: 'all', metric: 'count', order: 2 },
    { id: 'conditional-cloud', source: { type: 'attribute', attributeId: 'conditional' }, chartType: 'textCloud', range: 'all', metric: 'count', order: 3 }
  ]
};
const wordLogs = [
  record('word-old', oldStart, oldStart + 3600000, 3600, { note: '美食广场 咖啡', attributeValues: [{ attributeId: 'place', value: '美食广场 美食广场 咖啡' }, { attributeId: 'kind', optionId: 'lunch' }, { attributeId: 'conditional', value: '美食广场' }] }),
  record('word-new', now - 3600000, now, 3600, { note: '咖啡', attributeValues: [{ attributeId: 'place', value: '美食和广场' }, { attributeId: 'kind', optionId: 'dinner' }, { attributeId: 'conditional', value: '隐藏地点' }] })
];
const WordProbe = () => {
  const [activity, setActivity] = useState(savedWordActivity);
  return <ActivityAttributeStatistics activity={activity} logs={wordLogs} onChange={(next) => { savedWordActivity = next; setActivity(next); }} />;
};
const setWordInput = async (label: string, value: string) => {
  const input = dialog('词云设置').querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
  check(input, `Missing word input: ${label}`);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true })); await delay();
};
const cloudTerms = (index: number) => Array.from(host.querySelectorAll('.cursor-default')).filter((node) => {
  const cloud = host.querySelectorAll('[aria-label^="词云设置："]')[index]?.closest('section');
  return cloud?.contains(node);
});
const findCloudTerm = (index: number, word: string) => cloudTerms(index).find((node) => node.textContent === word);

async function checkWordClouds() {
  await render(<WordProbe />);
  await click('词云设置：地点 · 词云');
  await click('选择高频词：美食', dialog('词云设置')); await click('选择高频词：广场', dialog('词云设置'));
  check(dialog('词云设置').querySelector<HTMLInputElement>('input[aria-label="合并词"]')?.value === '美食广场', 'Selection order did not build the phrase');
  await click('添加合并词', dialog('词云设置'));
  await click('选择高频词：咖啡', dialog('词云设置')); await click('停用所选', dialog('词云设置'));
  check(savedWordActivity.statisticCards?.[0].wordCloudSettings?.mergeWords[0] === '美食广场', 'Phrase was not persisted');
  await capture('word-cloud-settings');
  await click('关闭', dialog('词云设置'));
  check(findCloudTerm(0, '美食广场')?.getAttribute('title') === '2 次', 'Merged phrase count did not match literal occurrences');
  check(findCloudTerm(0, '美食')?.getAttribute('title') === '1 次' && !findCloudTerm(0, '咖啡'), 'Split terms were overcounted or stopped term remained');
  check(findCloudTerm(1, '美食')?.getAttribute('title') === '3 次' && findCloudTerm(1, '咖啡'), 'Settings leaked into another card');
  await render(null); await render(<WordProbe />);
  check(findCloudTerm(0, '美食广场') && !findCloudTerm(0, '咖啡'), 'Reopening lost saved word rules');
  await click('词云设置：地点 · 词云'); await click('移除停用词：咖啡', dialog('词云设置'));
  await setWordInput('停用词', '美食广场，咖啡'); await click('添加停用词', dialog('词云设置'));
  await click('关闭', dialog('词云设置'));
  check(!findCloudTerm(0, '美食广场') && !findCloudTerm(0, '咖啡'), 'Manual stop words failed');
  await click('词云设置：备注 · 词云'); await setWordInput('合并词', '美食广场'); await click('添加合并词', dialog('词云设置'));
  await setWordInput('停用词', '咖啡'); await click('添加停用词', dialog('词云设置')); await click('关闭', dialog('词云设置'));
  check(findCloudTerm(2, '美食广场')?.getAttribute('title') === '1 次' && !findCloudTerm(2, '咖啡'), 'Note cloud rules did not apply');
  await click('词云设置：午餐地点 · 词云');
  check(!button('选择高频词：隐藏', dialog('词云设置')), 'Word settings ignored the conditional source');
  await setWordInput('合并词', '美食广场'); await click('添加合并词', dialog('词云设置'));
  await capture('word-cloud-settings-mobile'); await click('关闭', dialog('词云设置'));
  check(findCloudTerm(3, '美食广场')?.getAttribute('title') === '1 次', 'Conditional cloud rules did not apply');
  await click('词云设置：地点 · 词云'); await click('移除合并词：美食广场', dialog('词云设置')); await click('移除停用词：咖啡', dialog('词云设置')); await click('关闭', dialog('词云设置'));
  check(!findCloudTerm(0, '美食广场') && findCloudTerm(0, '美食')?.getAttribute('title') === '3 次' && findCloudTerm(0, '咖啡'), 'Removing rules did not restore default segmentation');
  await click('词云设置：地点 · 词云');
  dialog('词云设置').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await delay();
  check(!document.querySelector('[role="dialog"][aria-label="词云设置"]'), 'Escape did not dismiss word settings');
  await click('词云设置：地点 · 词云'); check(runRegisteredHardwareBackHandler(), 'Word settings did not register hardware back'); await delay();
  check(!document.querySelector('[role="dialog"][aria-label="词云设置"]'), 'Hardware back did not dismiss word settings');
  await click('管理'); await click('编辑地点 · 词云', dialog('管理统计卡片')); await click('近 30 天', dialog('编辑所选卡片'));
  check(!button('选择高频词：咖啡', dialog('编辑所选卡片')), 'High-frequency settings did not follow the card range');
  await click('全部', dialog('编辑所选卡片')); check(button('选择高频词：咖啡', dialog('编辑所选卡片')), 'All-time word settings lost history');
  await click('关闭', dialog('编辑所选卡片')); await click('关闭', dialog('管理统计卡片'));
  await capture('word-cloud-results-mobile');
  passed.push('Word clouds support ordered merge selection, manual and selected stop words, removal, independent settings, remount persistence, notes, and conditional sources');
  await render(null);
}

async function run() {
  await document.fonts.load('16px VerifiedChinese', '领域统计记录时长备注');
  await checkWordClouds();
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
