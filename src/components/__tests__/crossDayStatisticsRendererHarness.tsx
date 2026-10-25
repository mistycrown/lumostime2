/**
 * @file crossDayStatisticsRendererHarness.tsx
 * @input Real statistic cards/editor and deterministic split overnight fixtures.
 * @output Browser assertions and screenshot-ready desktop/mobile charts.
 * @pos Test (Cross-day Statistics Renderer)
 * @updated 2026-10-25: Exercises source selection, three metrics/charts, gaps and persisted settings.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Activity, ActivityStatisticCardType, CrossDayMetric, Log } from '../../types';
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
const Probe = ({ restricted = false }: { restricted?: boolean }) => {
  const [activity, setActivity] = useState<Activity>(() => JSON.parse(localStorage.getItem('cross-day-smoke') || JSON.stringify(saved)));
  return <ActivityAttributeStatistics activity={activity} logs={logs} allowedSourceTypes={restricted ? ['recordDuration', 'note'] : undefined}
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
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true })); await delay();
};
const fits = () => {
  check(document.documentElement.scrollWidth <= window.innerWidth + 1, 'Horizontal viewport overflow');
  check(!document.body.textContent?.includes('�'), 'Broken UTF-8 text');
  check(document.fonts.check('16px VerifiedChinese', '睡眠开始时间持续时长起床跨天活动'), 'Verified Chinese font not loaded');
};

async function run() {
  await document.fonts.load('16px VerifiedChinese', '睡眠开始时间持续时长起床跨天活动');
  localStorage.removeItem('cross-day-smoke'); saved = initial;
  await render(null); await render(<Probe />);
  await click('管理'); await click('新增卡片'); await click('编辑备注 · 词云', dialog('管理统计卡片'));
  await click('备注', dialog('编辑所选卡片')); await click('跨天活动');
  check(saved.statisticCards?.[0].source.type === 'crossDay', 'Source selection not persisted');
  await click('近 7 天', dialog('编辑所选卡片'));
  check(saved.statisticCards?.[0].dayBoundaryMinutes === 720, 'Wrong default boundary');
  await close();
  check(host.textContent?.includes('7h 30m') && host.textContent?.includes('3 / 7'), 'Night union/average or missing-date count is wrong');
  const trend = host.querySelector<SVGSVGElement>('[role="slider"]')!;
  check(trend.querySelectorAll('polyline').length === 1, 'Trend connected across a missing date');
  trend.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })); await delay();
  check(host.querySelector('[role="status"]')?.textContent?.includes('无记录'), 'Missing day rendered as zero');
  trend.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })); await delay();
  check(host.querySelector('[role="status"]')?.textContent?.includes('8h 00m'), 'Keyboard did not select complete night');

  await edit(); await click('开始时间', dialog('编辑所选卡片')); await setBoundary('10:00'); await click('本周', dialog('编辑所选卡片'));
  check(saved.statisticCards?.[0].dayBoundaryMinutes === 600, 'Boundary not saved');
  await close(); await render(null); await render(<Probe />);
  check(saved.statisticCards?.[0].crossDayMetric === 'start' && saved.statisticCards[0].range === 'week', 'Metric/range lost after remount');
  await edit(); await click('近 7 天', dialog('编辑所选卡片')); await close();
  check(host.textContent?.includes('23:40'), 'Cross-midnight clock mean is wrong');

  await edit(); await click('结束时间', dialog('编辑所选卡片')); await click('近 7 天', dialog('编辑所选卡片')); await close();
  check(host.textContent?.includes('07:30'), 'End-time mean is wrong');
  await edit(); await click('时段图', dialog('编辑所选卡片'));
  check(!dialog('编辑所选卡片').textContent?.includes('统计指标'), 'Timeline exposes an unused metric selector');
  await close();
  const interrupted = Array.from(host.querySelectorAll('button')).find(button => button.getAttribute('aria-label')?.startsWith(localDateKey(date(4))))!;
  check(interrupted, 'Missing timeline night');
  check(interrupted.querySelectorAll('.h-3').length === 2, 'Timeline removed the wake gap');
  interrupted.click(); await delay();
  check(host.querySelector('[role="status"]')?.textContent?.includes('7h 00m'), 'Selected timeline duration counted wake time');

  await edit(); await click('指标日历', dialog('编辑所选卡片')); await click('持续时长', dialog('编辑所选卡片')); await click('本年', dialog('编辑所选卡片')); await close();
  const missing = host.querySelector<HTMLButtonElement>(`[aria-label="${localDateKey(date(2))} 持续时长 无记录"]`)!;
  check(missing, 'Calendar omitted missing date'); missing.click(); await delay();
  check(host.querySelector('[role="status"]')?.textContent?.includes('无记录'), 'Calendar missing-day readout is wrong');
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
  await render(null);
  return ['Source, metrics, three charts and ranges work', 'Missing nights, clock means and wake gaps are correct', 'Boundary/metric/range survive persistence', 'Restricted statistics keep their sources', 'Legacy signed-number and empty trends remain valid', 'Chinese font and viewport layout verified'];
}

async function prepare(chartType: ActivityStatisticCardType, metric: CrossDayMetric = 'duration') {
  saved = { ...initial, statisticCards: [{ id: 'night', source: { type: 'crossDay' }, chartType, range: chartType === 'crossDayCalendar' ? 'month' : '7d', metric: 'count', crossDayMetric: metric, dayBoundaryMinutes: 720, order: 0 }] };
  localStorage.setItem('cross-day-smoke', JSON.stringify(saved));
  await render(null); await render(<Probe />); fits();
}

Object.assign(window, { __crossDayHarness: { run, prepare, edit } });
