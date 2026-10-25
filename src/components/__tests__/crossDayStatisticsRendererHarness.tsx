/**
 * @file crossDayStatisticsRendererHarness.tsx
 * @updated 2026-10-25: Checks actual SVG glyph bounds and inline icon toggles across cross-day and duration calendars.
 * @updated 2026-10-25: Covers standalone overview, palette sequence, complete fitted clock labels and occupied axes.
 * @input Real statistic cards/editor and deterministic split overnight fixtures.
 * @output Browser assertions and screenshot-ready desktop/mobile charts.
 * @pos Test (Cross-day Statistics Renderer)
 * @updated 2026-10-25: Exercises source selection, three metrics/charts, gaps and persisted settings.
 * @updated 2026-10-25: Verifies digit-only time editing, static compact year charts and all-time year paging.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Activity, ActivityStatisticCardType, ActivityStatisticRange, CrossDayMetric, Log } from '../../types';
import { ActivityAttributeStatistics } from '../ActivityAttributeStatistics';
import { InteractiveTrendChart } from '../stats/InteractiveTrendChart';
import { localDateKey } from '../../utils/crossDayStatsUtils';
import { getStatisticCardLabel } from '../../utils/activityStatisticCardUtils';

const host = document.getElementById('root')!;
const root = createRoot(host);
const delay = () => new Promise(resolve => setTimeout(resolve, 100));
const check = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const date = (offset: number, hours = 0, minutes = 0) => { const value = new Date(); value.setDate(value.getDate() - offset); value.setHours(hours, minutes, 0, 0); return value; };
const record = (start: Date, end: Date, overrides: Partial<Log> = {}): Log => ({
  id: crypto.randomUUID(), activityId: 'sleep', categoryId: 'rest', startTime: start.getTime(), endTime: end.getTime(),
  duration: (end.getTime() - start.getTime()) / 1000, ...overrides
});
const logs = [
  record(date(2, 23, 30), new Date(date(1).getTime() - 1)), record(date(1), date(1, 7, 30)),
  record(date(3, 0, 30), date(3, 8)),
  record(date(5, 23), date(4, 3)), record(date(4, 4), date(4, 7)),
  record(date(2, 12), date(1, 12), { isPlanned: true })
];
const initial: Activity = { id: 'sleep', name: '睡觉', icon: '月', color: '#658176', statisticCards: [] };
let saved: Activity = initial;
let displayLogs = logs;
const currentYear = new Date().getFullYear();
const history = [...logs, ...[1, 2].map(offset => record(new Date(currentYear - offset, 5, 14, 23), new Date(currentYear - offset, 5, 15, 7)))];
const Probe = ({ restricted = false }: { restricted?: boolean }) => {
  const [activity, setActivity] = useState<Activity>(() => JSON.parse(localStorage.getItem('cross-day-smoke') || JSON.stringify(saved)));
  return <ActivityAttributeStatistics activity={activity} logs={displayLogs} allowedSourceTypes={restricted ? ['recordDuration', 'note'] : undefined}
    onChange={next => { saved = next; localStorage.setItem('cross-day-smoke', JSON.stringify(next)); setActivity(next); }} />;
};
const render = async (node: React.ReactNode) => { root.render(node); await delay(); };
const click = async (label: string, container: ParentNode = document) => {
  const button = Array.from(container.querySelectorAll('button')).find(node => node.textContent?.trim() === label || node.getAttribute('aria-label') === label);
  check(button, `Missing control: ${label}`); button!.click(); await delay();
};
const dialog = (label: string) => document.querySelector(`[role="dialog"][aria-label="${label}"]`)!;
const edit = async () => { await click('管理'); await click(`编辑${getStatisticCardLabel(saved.statisticCards![0], [])}`, dialog('管理统计卡片')); };
const close = async () => { await click('关闭', dialog('编辑所选卡片')); await click('关闭', dialog('管理统计卡片')); };
const setBoundary = async (value: string) => {
  const input = document.querySelector<HTMLInputElement>('[aria-label="日期分界时间"]')!;
  input.focus();
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true })); await delay();
};
const fits = () => {
  check(document.documentElement.scrollWidth <= window.innerWidth + 1, 'Horizontal viewport overflow');
  check(!document.body.textContent?.includes('�'), 'Broken UTF-8 text');
  check(document.fonts.check('16px VerifiedChinese', '睡眠开始时间持续时长起床跨天活动'), 'Verified Chinese font not loaded');
};
const calendarGlyphsFit = () => {
  const labels = [...host.querySelectorAll<HTMLElement>('[data-calendar-value], [data-calendar-duration]')];
  for (const label of labels) {
    const text = label.querySelector<SVGTextElement>('text');
    check(text, 'Calendar label does not use bounded glyph rendering');
    const glyph = text!.getBoundingClientRect();
    const cell = (label.closest('[data-calendar-date]') || label.parentElement)!.getBoundingClientRect();
    check(glyph.left >= cell.left + 0.2 && glyph.right <= cell.right - 0.2,
      `Calendar glyphs extend into neighboring dates: ${label.textContent} glyph=${glyph.left.toFixed(2)}..${glyph.right.toFixed(2)} cell=${cell.left.toFixed(2)}..${cell.right.toFixed(2)} width=${window.innerWidth}`);
  }
};
const calendarIconIsInline = () => {
  const button = host.querySelector<HTMLButtonElement>('[aria-label="切换日历数值显示"]')!;
  const row = button?.closest('[data-statistics-title-row]');
  const heading = row?.querySelector('h2');
  check(button && heading && button.textContent === '' && row?.querySelectorAll('button').length === 1, 'Calendar does not use a single title-row icon');
  const a = button.getBoundingClientRect(); const b = heading!.getBoundingClientRect();
  check(Math.abs(a.top + a.height / 2 - b.top - b.height / 2) < 2, 'Calendar icon wraps below its title');
};

async function run() {
  await document.fonts.load('16px VerifiedChinese', '睡眠开始时间持续时长起床跨天活动');
  localStorage.removeItem('cross-day-smoke'); saved = initial; displayLogs = logs;
  await render(null); await render(<Probe />);
  await click('管理'); await click('新增卡片'); await click('编辑备注 · 词云', dialog('管理统计卡片'));
  await click('备注', dialog('编辑所选卡片')); await click('跨天活动');
  check(saved.statisticCards?.[0].source.type === 'crossDay', 'Source selection not persisted');
  await click('近 7 天', dialog('编辑所选卡片'));
  check(saved.statisticCards?.[0].dayBoundaryMinutes === 720, 'Wrong default boundary');
  const boundary = document.querySelector<HTMLInputElement>('[aria-label="日期分界时间"]')!;
  check(boundary.type === 'text' && boundary.inputMode === 'numeric' && boundary.maxLength === 4 && boundary.value === '1200', 'Boundary is not a four-digit text input');
  await setBoundary('10'); check(saved.statisticCards?.[0].dayBoundaryMinutes === 720, 'Partial time changed persisted boundary');
  await setBoundary('2460'); check(saved.statisticCards?.[0].dayBoundaryMinutes === 720 && boundary.getAttribute('aria-invalid') === 'true', 'Invalid time changed persisted boundary');
  boundary.blur(); await delay(); check(boundary.value === '1200', 'Invalid time was not restored on blur');
  await close();
  check(!host.querySelector('[data-cross-day-overview]') && !host.textContent?.includes('已记录天数'), 'Trend repeats the overview');
  const trend = host.querySelector<SVGSVGElement>('[role="slider"]')!;
  check(trend.querySelectorAll('polyline').length === 1, 'Trend connected across a missing date');
  trend.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })); await delay();
  check(host.querySelector('[role="status"]')?.textContent?.includes('无记录'), 'Missing day rendered as zero');
  trend.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })); await delay();
  check(host.querySelector('[role="status"]')?.textContent?.includes('8h 00m'), 'Keyboard did not select complete night');

  await edit(); await click('开始时间', dialog('编辑所选卡片')); await setBoundary('1000'); await click('本周', dialog('编辑所选卡片'));
  check(saved.statisticCards?.[0].dayBoundaryMinutes === 600, 'Boundary not saved');
  await close(); await render(null); await render(<Probe />);
  check(saved.statisticCards?.[0].crossDayMetric === 'start' && saved.statisticCards[0].range === 'week', 'Metric/range lost after remount');
  await edit(); await click('近 7 天', dialog('编辑所选卡片')); await close();
  check(host.textContent?.includes('23:40'), 'Cross-midnight clock mean is wrong');

  await edit(); await click('结束时间', dialog('编辑所选卡片')); await click('近 7 天', dialog('编辑所选卡片')); await close();
  check(host.textContent?.includes('07:30'), 'End-time mean is wrong');
  await edit(); await click('数据概览', dialog('编辑所选卡片'));
  check(!dialog('编辑所选卡片').textContent?.includes('统计指标'), 'Overview exposes an unused metric selector');
  await close();
  check(host.querySelectorAll('[data-overview-metric]').length === 3 && host.textContent?.includes('3 / 7'), 'Standalone overview omitted metrics or recorded-day count');
  check(host.querySelector('[data-overview-metric="start"] td')?.textContent === '23:40', 'Overview clock average is wrong');
  check(host.querySelector('[data-overview-metric="duration"] td')?.textContent === '7h30m', 'Overview duration average is wrong');
  await render(null); await render(<Probe />);
  check(saved.statisticCards?.[0].chartType === 'crossDayOverview' && host.querySelector('[data-cross-day-overview]'), 'Overview card was not persisted');
  await edit(); await click('时段图', dialog('编辑所选卡片'));
  check(!dialog('编辑所选卡片').textContent?.includes('统计指标'), 'Timeline exposes an unused metric selector');
  await close();
  const interrupted = host.querySelector(`[data-cross-day-timeline] [aria-label^="${localDateKey(date(4))}"]`)!;
  check(interrupted, 'Missing timeline night');
  check(interrupted.querySelectorAll('[data-cross-day-interval]').length === 2 && interrupted.textContent?.includes('7h 00m'), 'Timeline removed wake gap or counted wake time');
  check(!host.querySelector('[data-cross-day-timeline] button') && !host.querySelector('[role="status"]'), 'Timeline still selects daily details');
  check(!host.textContent?.includes('已记录天数') && !host.querySelector('[data-cross-day-overview]'), 'Timeline repeats the overview');
  const timelineAxis = host.querySelector<HTMLElement>('[data-cross-day-timeline]')!.dataset;
  check(Number(timelineAxis.axisStart) > 720 && Number(timelineAxis.axisEnd) < 2160, 'Timeline did not trim empty daytime edges');
  check(getComputedStyle(host.querySelector('.cross-day-timeline-scroll')!).scrollbarWidth === 'thin', 'Timeline scrollbar is not thin');
  await edit(); await click('本年', dialog('编辑所选卡片')); await close();
  check(host.querySelector('[data-cross-day-timeline="compact"]') && host.querySelectorAll('[data-cross-day-month]').length <= 12, 'Year timeline did not use monthly small multiples');
  check(host.querySelector('[data-cross-day-timeline]')!.getBoundingClientRect().height < 1100, 'Year timeline is too tall');

  await edit(); await click('指标日历', dialog('编辑所选卡片')); await click('持续时长', dialog('编辑所选卡片')); await click('本年', dialog('编辑所选卡片')); await close();
  const missing = host.querySelector(`[aria-label="${localDateKey(date(2))} 持续时长 无记录"]`)!;
  check(missing && missing.tagName === 'SPAN', 'Calendar missing date is not static');
  check(!host.querySelector('[data-cross-day-calendar] button') && !host.querySelector('[role="status"]'), 'Calendar still selects daily details');
  check(!host.textContent?.includes('已记录天数') && !host.querySelector('[data-cross-day-overview]'), 'Calendar repeats the overview');
  const columns = getComputedStyle(host.querySelector('[data-cross-day-months]')!).gridTemplateColumns.split(' ').length;
  check(columns >= 2 && host.querySelector('[data-cross-day-calendar]')!.getBoundingClientRect().height < 1100, 'Year calendar did not match compact duration calendars');
  check(!host.querySelector('[data-calendar-value]'), 'Calendar does not default to color blocks');
  calendarIconIsInline();
  await click('切换日历数值显示'); check(saved.statisticCards?.[0].showCalendarValues === true && host.querySelector('[data-calendar-value]'), 'Calendar value mode was not saved');
  await click('切换日历数值显示');
  await edit(); await click('全部', dialog('编辑所选卡片')); await close();
  displayLogs = history; await render(null); await render(<Probe />);
  check(host.querySelector('[aria-label="统计年份"]')?.textContent?.includes(String(currentYear)), 'All-time calendar did not start at latest year');
  await click('上一年');
  check([...host.querySelectorAll('[data-cross-day-month]')].every(node => node.getAttribute('data-cross-day-month')?.startsWith(`${currentYear - 1}-`)), 'All-time calendar stacked years instead of paging');
  await click('上一年'); check(host.querySelector<HTMLButtonElement>('[aria-label="上一年"]')?.disabled, 'Year paging passed earliest history');
  await click('下一年');
  await edit(); await click('时段图', dialog('编辑所选卡片')); await close();
  check(saved.statisticCards?.[0].range === 'all' && host.querySelector('[data-cross-day-timeline="compact"]'), 'All-time interval chart lost range or compact mode');
  check(new Set([...host.querySelectorAll('[data-cross-day-month]')].map(node => node.getAttribute('data-cross-day-month')?.slice(0, 4))).size === 1, 'All-time interval chart rendered multiple years');
  fits();

  await render(null); await render(<Probe restricted />); await click('管理'); await click('新增卡片');
  await click('编辑记录时长 · 数值面积趋势', dialog('管理统计卡片')); await click('记录时长', dialog('编辑所选卡片'));
  check(!document.querySelector('.max-h-60')?.textContent?.includes('跨天活动'), 'Cross-day source leaked into restricted statistics');
  await render(<InteractiveTrendChart title="Legacy" accent="#658176" formatValue={String}
    points={[{ key: '2026-10-20', value: -2 }, { key: '2026-10-21', value: 2 }]} />);
  check(host.querySelector('svg > line')?.getAttribute('y1') === '56', 'Legacy signed-number chart lost its zero baseline');
  check(host.querySelector('[role="status"]')?.textContent?.includes('2'), 'Legacy numeric chart failed');
  await render(<InteractiveTrendChart title="Missing" accent="#658176" formatValue={String}
    points={[{ key: '2026-10-20', value: null }, { key: '2026-10-21', value: null }]} />);
  check(host.querySelector('[role="status"]')?.textContent?.includes('无记录') && !host.querySelector('circle'), 'Empty trend drew false zero points');
  check(!/NaN|Infinity/.test(host.innerHTML), 'Empty trend has invalid coordinates');
  await prepare('crossDayCalendar', 'start', 'year', true);
  const clockLabels = [...host.querySelectorAll<HTMLElement>('[data-calendar-value]')].filter(node => node.textContent !== '—');
  check(clockLabels.length > 30 && clockLabels.every(node => /^\d{2}:\d{2}$/.test(node.textContent || '') && node.scrollWidth <= node.clientWidth + 1), 'Annual calendar clock text is clipped');
  calendarGlyphsFit(); calendarIconIsInline();
  const originalWidth = host.style.maxWidth;
  host.style.maxWidth = '300px'; document.documentElement.style.webkitTextSizeAdjust = '180%'; await delay();
  calendarGlyphsFit();
  document.documentElement.style.webkitTextSizeAdjust = ''; host.style.maxWidth = originalWidth; await delay();
  const calendarColors = new Set([...host.querySelectorAll<HTMLElement>('[data-calendar-date]')].filter(node => !node.getAttribute('aria-label')?.includes('无记录')).map(node => (node.firstElementChild as HTMLElement).style.backgroundColor));
  check(calendarColors.size > 2, 'Annual calendar ignores palette sequence');
  await prepare('crossDayTimeline', 'duration', 'year');
  check(new Set([...host.querySelectorAll('[data-cross-day-interval]')].map(node => node.getAttribute('fill'))).size > 2, 'Annual timeline ignores palette sequence');
  for (const source of ['tagDuration', 'categoryDuration'] as const) {
    await prepareDurationCalendar(source); calendarGlyphsFit(); calendarIconIsInline();
    await click('切换日历数值显示'); check(!host.querySelector('[data-calendar-duration]'), 'Duration calendar icon did not hide values');
    await click('切换日历数值显示'); check(host.querySelector('[data-calendar-duration]'), 'Duration calendar icon did not restore values');
    await render(null); await render(<Probe />); calendarGlyphsFit(); calendarIconIsInline();
  }
  await prepareDashboard();
  check(host.querySelectorAll('[data-cross-day-overview]').length === 1 && [...host.querySelectorAll('section')].filter(node => node.textContent?.includes('已记录天数')).length === 1, 'Multiple chart cards repeat the overview');
  fits();
  await render(null);
  return ['Four-digit boundary entry rejects partial/invalid times', 'Overview is an independent persisted table', 'Palette sequence applies to calendars and intervals', 'Actual calendar glyphs stay within cells under narrow widths and enlarged text', 'Cross-day/tag/category calendars share one inline icon toggle', 'Only trends select daily details', 'Occupied axes and year paging work', 'Restricted and legacy statistics remain valid', 'Chinese font and viewport layout verified'];
}

async function prepare(chartType: ActivityStatisticCardType, metric: CrossDayMetric = 'duration', range?: ActivityStatisticRange, showValues = false) {
  displayLogs = logs;
  if (range && range !== '7d' && range !== 'week') {
    displayLogs = range === 'all' ? history.slice(logs.length) : [];
    for (let day = new Date(currentYear, 0, 1), index = 0; day <= date(1); day.setDate(day.getDate() + 1), index++) {
      if (index % 9 === 0) continue;
      const start = new Date(day); start.setDate(start.getDate() - 1); start.setHours(22, 30 + index % 7 * 17, 0, 0);
      const end = new Date(day); end.setHours(7, index % 5 * 13, 0, 0);
      displayLogs.push(record(start, end));
    }
  }
  saved = { ...initial, statisticCards: [{ id: 'night', source: { type: 'crossDay' }, chartType, range: range || (chartType === 'crossDayCalendar' ? 'month' : '7d'), metric: 'count', crossDayMetric: metric, dayBoundaryMinutes: 720, showCalendarValues: showValues, order: 0 }] };
  localStorage.setItem('cross-day-smoke', JSON.stringify(saved));
  await render(null); await render(<Probe />); fits();
}

async function prepareDashboard() {
  displayLogs = logs;
  saved = { ...initial, statisticCards: (['crossDayOverview', 'crossDayTrend', 'crossDayTimeline', 'crossDayCalendar'] as ActivityStatisticCardType[]).map((chartType, order) => ({
    id: `night-${order}`, source: { type: 'crossDay' }, chartType, range: '7d', metric: 'count', crossDayMetric: 'duration', dayBoundaryMinutes: 720, order
  })) };
  localStorage.setItem('cross-day-smoke', JSON.stringify(saved));
  await render(null); await render(<Probe />); fits();
}

async function prepareDurationCalendar(source: 'tagDuration' | 'categoryDuration') {
  await prepare('crossDayCalendar', 'duration', 'year', true);
  saved = { ...saved, statisticCards: [{ ...saved.statisticCards![0], source: { type: source }, chartType: 'numberCalendar' }] };
  localStorage.setItem('cross-day-smoke', JSON.stringify(saved));
  await render(null); await render(<Probe />); fits();
}

Object.assign(window, { __crossDayHarness: { run, prepare, prepareDashboard, prepareDurationCalendar, edit } });
