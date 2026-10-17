/**
 * @file dailyStatsLogsHarness.tsx
 * @input Real statistics hook, pie chart and daily log modal
 * @output Interaction assertions and mobile/desktop/dark screenshot checkpoints
 * @updated 2026-10-17: Verifies category/tag filtering, day boundaries, planned logs, dismissal, focus and scrolling.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PieChartView } from '../PieChartView';
import { useStatsCalculation } from '../../../hooks/useStatsCalculation';
import { runRegisteredHardwareBackHandler } from '../../../utils/hardwareBackHandlerStack';
import type { Category, Log } from '../../../types';

declare global {
  interface Window {
    __dailyStatsLogsResult?: { passed: string[]; error?: string };
    __dailyStatsLogsCapture?: { name: string; width: number; height: number };
    __dailyStatsLogsCaptured?: boolean;
  }
}

const categories: Category[] = [
  { id: 'study', name: '学习', icon: '📚', themeColor: '#a7f3d0', activities: [
    { id: 'reading', name: '书籍文献', icon: '📖', color: '#a7f3d0' },
    { id: 'writing', name: '写作整理', icon: '✍️', color: '#bae6fd' }
  ] },
  { id: 'self', name: '与自己', icon: '🌻', themeColor: '#e9d5ff', activities: [
    { id: 'reading', name: '运动健身', icon: '🏃', color: '#e9d5ff' }
  ] }
];
const timestamp = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).getTime();
const log = (id: string, hour: number, minutes: number, extra: Partial<Log> = {}): Log => ({
  id, categoryId: 'study', activityId: 'reading', startTime: timestamp(16, hour),
  endTime: timestamp(16, hour, minutes), duration: minutes * 60, ...extra
});
let logs = [
  log('afternoon', 14, 38, { title: '把阅读变成自己的理解', note: '整理今天读到的内容，记下值得继续追问的问题。\n下次从这里继续。' }),
  log('morning', 9, 30, { title: '早晨的阅读', note: '读完一个章节，给自己留一点安静的时间。' }),
  log('writing', 16, 20, { activityId: 'writing', note: '将零散笔记整理成一篇短文。' }),
  log('other-category', 18, 26, { categoryId: 'self', note: 'OTHER_CATEGORY' }),
  log('yesterday', 9, 40, { startTime: timestamp(15, 9), endTime: timestamp(15, 9, 40), note: 'YESTERDAY' }),
  log('tomorrow', 9, 40, { startTime: timestamp(17, 9), endTime: timestamp(17, 9, 40), note: 'TOMORROW' }),
  log('plan', 20, 30, { isPlanned: true, note: 'PLANNED' })
];
let date = new Date(2026, 9, 16);
let privacy = false;
let enabled = true;
let underlyingTouches = 0;
const root = createRoot(document.getElementById('root')!);

const App = () => {
  const [excluded, setExcluded] = useState<string[]>([]);
  const { stats, filteredLogs } = useStatsCalculation({
    logs, categories, excludedCategoryIds: excluded,
    dateRange: { start: new Date(date.getFullYear(), date.getMonth(), date.getDate()), end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999) }
  });
  return <main className="mx-auto max-w-md px-7 py-6" onTouchEnd={() => underlyingTouches++}>
    <h1 className="mb-8 font-serif text-xl text-stone-800">Daily Review · 数据</h1>
    <PieChartView
      stats={stats} previousStats={null}
      todoStats={{ totalDuration: 0, categoryStats: [] }} previousTodoStats={null}
      scopeStats={{ totalDuration: 0, categoryStats: [] }} previousScopeStats={null}
      pieRange="day" categories={categories} excludedCategoryIds={excluded}
      onToggleExclusion={id => setExcluded(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id])}
      logDetails={enabled ? { logs: filteredLogs, date, isPrivacyMode: privacy } : undefined}
    />
  </main>;
};
const render = () => root.render(<App />);
const tick = () => new Promise(resolve => setTimeout(resolve, 60));
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const button = (label: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
const close = async () => { button('关闭记录明细').click(); await tick(); };
const open = async (label: string) => { const target = button(label); target.focus(); target.click(); await tick(); };
const capture = async (name: string, width: number, height: number) => {
  window.__dailyStatsLogsCaptured = false;
  window.__dailyStatsLogsCapture = { name, width, height };
  for (let index = 0; index < 150 && !window.__dailyStatsLogsCaptured; index++) await tick();
  assert(window.__dailyStatsLogsCaptured, 'Screenshot checkpoint timed out');
  window.__dailyStatsLogsCapture = undefined;
};

const run = async () => {
  const passed: string[] = [];
  render(); await tick();
  const categoryButton = button('查看学习分类的当日记录');
  categoryButton.focus();
  categoryButton.querySelector<HTMLElement>('.h-1\\.5')!.click(); await tick();
  assert(dialog()?.textContent?.includes('3 条记录'), 'Category did not include every activity');
  assert(dialog()?.textContent?.includes('1小时 28分钟'), 'Modal and chart totals differ');
  assert(!/YESTERDAY|TOMORROW|PLANNED|OTHER_CATEGORY/.test(dialog()!.textContent!), 'Date/category/planned filtering leaked logs');
  const rows = Array.from(dialog()!.querySelectorAll('li'));
  assert(rows[0].textContent?.includes('早晨的阅读') && rows[2].textContent?.includes('写作整理'), 'Records are not chronological');
  assert(document.body.style.overflow === 'hidden', 'Background scroll was not locked');
  assert(document.activeElement === button('关闭记录明细'), 'Modal did not take focus');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  assert(document.activeElement === button('关闭记录明细'), 'Focus escaped the dialog');
  dialog()!.dispatchEvent(new Event('touchend', { bubbles: true }));
  assert(underlyingTouches === 0, 'Modal touch bubbled to date navigation');
  await capture('daily-stats-category-mobile', 390, 844);
  await close();
  assert(!dialog() && document.body.style.overflow !== 'hidden' && document.activeElement === categoryButton, 'Close did not restore focus/scroll');
  passed.push('category and progress bar: exact daily records, chronology, totals, focus and scroll');

  await open('查看书籍文献标签的当日记录');
  assert(dialog()?.textContent?.includes('2 条记录') && dialog()?.textContent?.includes('1小时 8分钟'), 'Activity filter or total failed');
  assert(!dialog()?.textContent?.includes('写作整理') && !dialog()?.textContent?.includes('OTHER_CATEGORY'), 'Activity crossed category boundaries');
  await capture('daily-stats-activity-desktop', 1100, 820);
  document.documentElement.dataset.themeMode = 'dark';
  await capture('daily-stats-activity-dark', 390, 844);
  delete document.documentElement.dataset.themeMode;
  assert(runRegisteredHardwareBackHandler(), 'Hardware back did not consume overlay');
  await tick(); assert(!dialog(), 'Hardware back did not close dialog');
  assert(!runRegisteredHardwareBackHandler(), 'Hardware handler was not cleaned up');
  passed.push('activity filter and Android back; responsive light/dark layouts');

  button('按二级标签显示标签颜色').click(); await tick();
  button('查看书籍文献标签的当日记录').querySelector<HTMLElement>('.h-1\\.5')!.click(); await tick();
  assert(!!dialog(), 'Activity progress bar did not open modal');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await tick(); assert(!dialog(), 'Escape did not close dialog');
  await open('查看学习分类的当日记录');
  dialog()!.parentElement!.click(); await tick(); assert(!dialog(), 'Backdrop did not close dialog');
  passed.push('second-level progress bars, Escape and backdrop dismissal');

  privacy = true; render(); await tick(); await open('查看学习分类的当日记录');
  assert(dialog()!.querySelector('.blur-sm')?.textContent?.includes('早晨的阅读'), 'Privacy mode did not cover titles and notes');
  logs = []; render(); await tick();
  assert(dialog()?.textContent?.includes('暂无记录') && dialog()?.textContent?.includes('0 条记录'), 'Live empty-state update failed');
  date = new Date(2026, 9, 17); render(); await tick(); assert(!dialog(), 'Date change kept a stale dialog');
  passed.push('privacy, live log updates, empty state and date changes');

  date = new Date(2026, 9, 16); privacy = false;
  logs = Array.from({ length: 18 }, (_, index) => log(`long-${index}`, index, 20, { note: '较长的记录内容需要自然换行，不应挤出屏幕。'.repeat(5) }));
  render(); await tick(); await open('查看学习分类的当日记录');
  await capture('daily-stats-long-list-mobile', 360, 640);
  assert(dialog()!.getBoundingClientRect().top >= 0, 'Dialog top was clipped: ' + JSON.stringify({ viewport: [innerWidth, innerHeight], rect: dialog()!.getBoundingClientRect().toJSON(), maxHeight: getComputedStyle(dialog()!).maxHeight }));
  const scroller = dialog()!.querySelector<HTMLElement>('.overflow-y-auto')!;
  assert(scroller.scrollHeight > scroller.clientHeight, 'Long lists did not scroll internally');
  assert(dialog()!.getBoundingClientRect().right <= innerWidth && dialog()!.scrollWidth <= dialog()!.clientWidth, 'Narrow dialog overflowed');
  await close();
  enabled = false; render(); await tick();
  assert(!button('查看学习分类的当日记录'), 'Non-enabled charts gained log interactions');
  passed.push('long notes, internal scroll, narrow layout and opt-in scope');
  window.__dailyStatsLogsResult = { passed };
};
run().catch(error => { window.__dailyStatsLogsResult = { passed: [], error: String(error.stack || error) }; });
