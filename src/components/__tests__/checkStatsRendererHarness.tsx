/**
 * @file checkStatsRendererHarness.tsx
 * @input Real StatsView, multiyear synthetic reviews/logs and native touch gestures
 * @output Mobile/desktop checks for scrolling, date navigation, rendering and fresh data
 * @pos Test (Statistics Renderer)
 * @updated 2026-10-11: Exercises annual check gestures and inactive-view performance regressions.
 */
import React, { Profiler, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StatsView } from '../../views/StatsView';
import type { Category, CheckTemplate, DailyReview, Log } from '../../types';

declare global {
  interface Window {
    __checkStatsResult?: { passed: string[]; error?: string; initialRenderMs: number };
    __checkStatsTouch?: { x: number; y: number }[];
    __checkStatsCapture?: string;
  }
}

const passed: string[] = [];
const host = document.getElementById('root')!;
const root = createRoot(host);
const delay = () => new Promise(resolve => setTimeout(resolve, 40));
const check = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const noop = () => {};
const categories: Category[] = [{
  id: 'activities', name: '活动', icon: '📚', themeColor: '#123456',
  activities: Array.from({ length: 30 }, (_, i) => ({ id: `activity-${i}`, name: `活动${i}`, icon: '📚', color: '#123456' }))
}];
const templates: CheckTemplate[] = [{
  id: 'daily', title: '日常', enabled: true, isDaily: true, order: 0,
  items: Array.from({ length: 12 }, (_, i) => ({ id: `habit-${i}`, content: i === 0 ? '阅读' : `日课${i}`, icon: '📚', color: '#52796f' }))
}];
const reviews: DailyReview[] = [];
const logs: Log[] = [];
for (let year = 2025; year <= 2027; year++) {
  for (let day = new Date(year, 0, 1); day.getFullYear() === year; day.setDate(day.getDate() + 1)) {
    const date = `${year}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    reviews.push({
      id: date, date, createdAt: 1, updatedAt: 1, answers: [],
      checkItems: templates[0].items.map((item, i) => ({
        id: item.id, content: item.content, category: '日常', type: 'manual', manualMode: i === 1 ? 'count' : 'binary',
        isCompleted: i === 0 ? true : day.getDate() % 2 === 0, currentCount: 2, targetCount: 3
      }))
    });
    for (let i = 0; i < 6; i++) logs.push({
      id: `${date}-${i}`, categoryId: 'activities', activityId: `activity-${(day.getDate() + i) % 30}`,
      startTime: day.getTime() + i * 3600000, endTime: day.getTime() + (i + 1) * 3600000, duration: 3600
    });
  }
}
let dateChanges = 0;
let commits = 0;
let initialRenderMs = 0;
let refreshReviews: () => void;
const Probe = () => {
  const [date, setDate] = useState(new Date(2026, 5, 15));
  const [dailyReviews, setReviews] = useState(reviews);
  refreshReviews = () => setReviews(items => items.map(item => item.date === '2026-01-01'
    ? { ...item, checkItems: item.checkItems.map((checkItem, i) => i === 0 ? { ...checkItem, isCompleted: false } : checkItem) }
    : item));
  return <Profiler id="stats" onRender={(_, phase, duration) => { commits++; if (phase === 'mount') initialRenderMs = duration; }}>
    <StatsView
      logs={logs} categories={categories} dailyReviews={dailyReviews} checkTemplates={templates}
      todos={[]} todoCategories={[]} scopes={[]} currentDate={date} onBack={noop} onToggleFullScreen={noop}
      onDateChange={value => { dateChanges++; setDate(value); }} isFullScreen={false} forcedView="check" forcedRange="year"
    />
    <span id="current-year">{date.getFullYear()}</span>
  </Profiler>;
};
const click = async (label: string) => {
  const button = Array.from(host.querySelectorAll('button')).find(item => item.getAttribute('aria-label') === label || item.textContent?.trim() === label);
  check(button, `Missing button: ${label}`);
  button!.click();
  await delay();
};
const firstCard = () => host.querySelector('.daily-check-stat-card')!;
const capture = async (name: string) => {
  window.__checkStatsCapture = name;
  while (window.__checkStatsCapture) await delay();
};
const nativeSwipe = async (element: Element) => {
  const rect = element.getBoundingClientRect();
  const right = Math.min(rect.right - 12, window.innerWidth - 20);
  const left = Math.max(rect.left + 12, 20);
  window.__checkStatsTouch = Array.from({ length: 13 }, (_, i) => ({ x: right + (left - right) * i / 12, y: rect.top + 45 }));
  while (window.__checkStatsTouch) await delay();
  await new Promise(resolve => setTimeout(resolve, 250));
};
const syntheticSwipe = async (element: Element, startX: number, startY: number, endX: number, endY: number, cancel = false) => {
  const dispatch = (type: string, x: number, y: number, ended = false) => {
    const event = new Event(type, { bubbles: true });
    Object.defineProperty(event, 'touches', { value: ended ? [] : [{ clientX: x, clientY: y }] });
    element.dispatchEvent(event);
  };
  dispatch('touchstart', startX, startY);
  dispatch('touchmove', endX, endY);
  if (cancel) dispatch('touchcancel', endX, endY, true);
  dispatch('touchend', endX, endY, true);
  await delay();
};

async function run() {
  root.render(<Probe />);
  await delay();
  check(firstCard().textContent?.includes('365次'), 'Annual totals missing');
  const horizontal = firstCard().querySelector('.overflow-x-auto') as HTMLElement;
  check(horizontal.scrollWidth > horizontal.clientWidth, 'Year heatmap should scroll on mobile');
  const initialCommits = commits;
  await nativeSwipe(horizontal);
  check(horizontal.scrollLeft > 100, 'Native gesture did not scroll within the heatmap');
  check(dateChanges === 0 && host.querySelector('#current-year')?.textContent === '2026', 'Heatmap swipe navigated years');
  check(commits === initialCommits, 'Touch movement rerendered annual statistics');
  await capture('year-mobile-scrolled');
  passed.push('Native horizontal touch scroll stays within the year and does not rerender');

  await syntheticSwipe(firstCard(), 300, 160, 20, 160);
  check(dateChanges === 0, 'Card swipe navigated dates');
  await click('上一时间段');
  check(host.querySelector('#current-year')?.textContent === '2025', 'Previous-year arrow failed');
  await click('下一时间段');
  check(host.querySelector('#current-year')?.textContent === '2026', 'Return-year arrow failed');
  await click('下一时间段');
  check(host.querySelector('#current-year')?.textContent === '2027', 'Next-year arrow failed');
  await click('上一时间段');
  refreshReviews();
  await delay();
  check(firstCard().textContent?.includes('364次'), 'Review update left stale cached totals');
  await click('上一时间段');
  await click('下一时间段');
  check(firstCard().textContent?.includes('364次'), 'Returning to year restored stale cache');
  passed.push('Year arrows and revisits work; editing a review invalidates cached totals');

  await click('月');
  check(host.querySelectorAll('.daily-check-month-cell').length === 12 * 30, 'Month cells changed');
  await click('周');
  check(host.querySelectorAll('.daily-check-week-cell').length === 12 * 7, 'Week cells changed');
  await capture('week-mobile');
  await click('年');
  await capture('year-desktop');
  passed.push('Month, week and desktop annual layouts retain their grids and counts');

  const pieButton = host.querySelector('button svg.lucide-chart-pie, button svg.lucide-pie-chart')?.closest('button');
  check(pieButton, 'Pie view switch missing');
  pieButton!.click();
  await delay();
  const main = host.firstElementChild!;
  const beforeSwipeCommits = commits;
  const beforeDates = dateChanges;
  const movement = (type: string, x: number) => {
    const event = new Event(type, { bubbles: true });
    Object.defineProperty(event, 'touches', { value: [{ clientX: x, clientY: 200 }] });
    main.dispatchEvent(event);
  };
  movement('touchstart', 300);
  for (let x = 290; x >= 80; x -= 10) movement('touchmove', x);
  await delay();
  check(commits === beforeSwipeCommits, 'Non-check touch movement rerendered the page');
  main.dispatchEvent(new Event('touchend', { bubbles: true }));
  await delay();
  check(dateChanges === beforeDates + 1, 'Other views lost swipe date navigation');
  await syntheticSwipe(main, 300, 100, 100, 500);
  check(dateChanges === beforeDates + 1, 'Vertical scroll triggered date navigation');
  await syntheticSwipe(main, 0, 200, 250, 200, true);
  check(dateChanges === beforeDates + 1, 'Canceled gesture triggered date navigation');
  await syntheticSwipe(main, 0, 200, 250, 200);
  check(dateChanges === beforeDates + 2, 'Swipe starting at x=0 was ignored');
  passed.push('Other views retain horizontal navigation without move rerenders; vertical/canceled gestures are ignored');
  root.unmount();
  window.__checkStatsResult = { passed, initialRenderMs };
}
run().catch(error => { window.__checkStatsResult = { passed, initialRenderMs, error: error.stack || String(error) }; });
