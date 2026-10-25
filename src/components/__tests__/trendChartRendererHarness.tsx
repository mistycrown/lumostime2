/**
 * @file trendChartRendererHarness.tsx
 * @updated 2026-10-25: Verifies single-icon calendar mode actions remain on the title row.
 * @updated 2026-10-23: Verifies calendar display modes, independent persistence and below-cell labels.
 * @input Shared custom statistics, synthetic duration/numeric records and native touch input.
 * @output Browser regression checks for date selection, responsive layout and range updates.
 * @pos Test (Custom Statistics Renderer)
 * @updated 2026-10-23: Covers category/tag/record sources, sparse days and keyboard navigation.
 * @updated 2026-10-23: Captures the mobile chart while focused to verify its border-free presentation.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ActivityAttributeStatistics } from '../ActivityAttributeStatistics';
import { InteractiveTrendChart } from '../stats/InteractiveTrendChart';
import type { Activity, Log } from '../../types';

declare global {
  interface Window {
    __trendResult?: { passed: string[]; error?: string };
    __trendTouch?: { x: number; y: number };
    __trendCapture?: string;
  }
}

const root = createRoot(document.getElementById('root')!);
const passed: string[] = [];
const delay = () => new Promise(resolve => setTimeout(resolve, 50));
const check = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const host = document.getElementById('root')!;
const day = (offset: number) => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + offset); return date; };
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const log = (offset: number, duration: number, id = String(offset)): Log => ({
  id, categoryId: 'category', activityId: 'activity', startTime: day(offset).getTime(),
  endTime: day(offset).getTime() + duration * 1000, duration
});
const logs = [log(-29, 1800), log(-15, 3600), log(-1, 3600), log(-1, 1800, 'extra'), log(0, 7200)];
const slider = () => host.querySelector<SVGSVGElement>('[role="slider"]')!;
const status = () => host.querySelector('[role="status"]')!.textContent!;
const clickAt = async (ratio: number) => {
  const svg = slider();
  const point = svg.createSVGPoint(); point.x = 8 + 304 * ratio; point.y = 50;
  const client = point.matrixTransform(svg.getScreenCTM()!);
  svg.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: client.x, clientY: client.y }));
  await delay();
};
const key = async (value: string) => { slider().dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true })); await delay(); };
const capture = async (name: string) => { window.__trendCapture = name; while (window.__trendCapture) await delay(); };

async function run() {
  for (const source of ['categoryDuration', 'tagDuration', 'recordDuration'] as const) {
    const activity: Activity = {
      id: source, name: '阅读', icon: 'Book', color: '#52796f', attributes: [],
      statisticCards: [{ id: 'trend', source: { type: source }, chartType: 'numberArea', range: '30d', metric: 'value', order: 0 }]
    };
    root.render(<ActivityAttributeStatistics activity={activity} logs={logs} allowedSourceTypes={[source]} />);
    await delay(); await delay();
    check(slider()?.getAttribute('aria-valuemax') === '30', `${source}: full 30-day range missing`);
    check(status().includes('2h'), `${source}: latest value missing`);
    await clickAt(0);
    check(status().includes('30m'), `${source}: first-date tap did not select oldest record`);
    check(slider().getAttribute('aria-valuenow') === '1', 'First date index incorrect');
    check(host.querySelector<HTMLButtonElement>('[aria-label="上一个日期"]')!.disabled, 'First-date boundary not disabled');
    await key('ArrowRight');
    check(status().includes('0m'), 'Missing day should have zero duration');
    host.querySelector<HTMLButtonElement>('[aria-label="上一个日期"]')!.click(); await delay();
    check(status().includes('30m'), 'Previous-date button should update the value');
    host.querySelector<HTMLButtonElement>('[aria-label="下一个日期"]')!.click(); await delay();
    check(status().includes('0m'), 'Next-date button should update the value');
    await key('End'); await key('ArrowLeft');
    check(status().includes('1h 30m'), 'Same-day records must sum before selection');
    const selectedText = slider().getAttribute('aria-valuetext')!;
    check(selectedText.includes(String(day(-1).getFullYear())), 'Readout must include full year');
    const svg = slider(); const point = svg.createSVGPoint(); point.x = 8 + 304 * (14 / 29); point.y = 50;
    const touch = point.matrixTransform(svg.getScreenCTM()!);
    window.__trendTouch = { x: touch.x, y: touch.y };
    while (window.__trendTouch) await delay();
    check(status().includes('1h') && slider().getAttribute('aria-valuenow') === '15', 'Native touch should select nearest date');
    passed.push(`${source}: 30-day totals, click/touch, zero days and keyboard boundaries`);
    if (source === 'categoryDuration') {
      slider().focus();
      await capture('trend-mobile');
      for (const range of ['7d', 'year'] as const) {
        const next = { ...activity, statisticCards: activity.statisticCards!.map(card => ({ ...card, range })) };
        root.render(<ActivityAttributeStatistics activity={next} logs={logs} allowedSourceTypes={[source]} />);
        await delay(); await delay();
        const count = Number(slider().getAttribute('aria-valuemax'));
        check(range === '7d' ? count === 7 : count > 14, `${range}: range edit must update all dates`);
        check(slider().getAttribute('aria-valuenow') === String(count), 'Range edit must reset to latest date');
      }
      passed.push('seven-day/year range changes refresh dates and clear stale selection');
    }
  }

  const points = [{ key: '2026-10-20', value: 10 }, { key: '2026-10-21', value: -5 }, { key: '2026-10-22', value: 0 }];
  const renderNumeric = (items = points) => root.render(<InteractiveTrendChart title="数值" points={items} accent="#52796f" formatValue={value => `${value} kg`} />);
  renderNumeric(); await delay();
  await clickAt(0.5); check(status().includes('-5 kg'), 'Numeric value/unit selection failed');
  await key('ArrowRight'); check(status().includes('0 kg'), 'Zero-valued numeric selection failed');
  await key('Home'); check(status().includes('10 kg'), 'Home should select first point');
  renderNumeric([{ ...points[0], value: 12 }]); await delay();
  check(status().includes('12 kg'), 'Selected date should update with live data');
  check(!slider().innerHTML.includes('NaN'), 'Single-point geometry is invalid');
  check([...host.querySelectorAll<HTMLButtonElement>('button')].every(button => button.disabled), 'Single-point navigation must be disabled');
  renderNumeric([{ key: '2026-10-23', value: 7 }]); await delay();
  check(status().includes('7 kg'), 'Stale selection must fall back after range replacement');
  renderNumeric([]); await delay(); check(!slider(), 'Empty data should not render an invalid slider');
  passed.push('numeric units, negative/zero values, single/empty series and data replacement');

  const year = new Date().getFullYear();
  const januaryFirst = `${year}-01-01`;
  const calendarLogs = Array.from({ length: new Date().getMonth() + 1 }, (_, month) => {
    const startTime = new Date(year, month, 1, 9).getTime();
    return { ...log(0, 5400, `month-${month}`), startTime, endTime: startTime + 5400000 };
  });
  calendarLogs.push({ ...calendarLogs[0], id: 'extra-january', duration: 900 });
  const longDayStart = new Date(year, 0, 2, 8).getTime();
  calendarLogs.push({ ...calendarLogs[0], id: 'long-day', startTime: longDayStart, endTime: longDayStart + 38700000, duration: 38700 });
  for (const source of ['categoryDuration', 'tagDuration', 'recordDuration'] as const) {
    let saved: Activity = {
      id: `calendar-${source}`, name: '阅读', icon: 'Book', color: '#52796f', attributes: [],
      statisticCards: ['first', 'second'].map((id, order) => ({ id, source: { type: source }, chartType: 'numberCalendar', range: 'year', metric: 'value', order }))
    };
    const renderCalendar = () => root.render(<ActivityAttributeStatistics key={saved.id} activity={saved} logs={calendarLogs} allowedSourceTypes={[source]} onChange={next => { saved = next; }} />);
    const groups = () => [...host.querySelectorAll<HTMLButtonElement>('[aria-label="切换日历数值显示"]')];
    const mode = async (index: number, label: string) => {
      const button = groups()[index];
      if ((button.getAttribute('aria-pressed') === 'true') !== (label === '时长')) button.click(); await delay();
      check((button.getAttribute('aria-pressed') === 'true') === (label === '时长'), `Mode ${label} should be selected`);
      check(button.closest('[data-statistics-title-row]')?.querySelector('h2') && !button.textContent, 'Calendar toggle must be an inline icon');
    };
    renderCalendar(); await delay(); await delay();
    check(groups().length === 2, 'Each duration calendar needs its own mode switch');
    check(!host.querySelector('[data-calendar-duration]'), 'Legacy cards should default to color-only mode');
    await mode(0, '时长');
    const firstSection = groups()[0].closest('section')!;
    const januaryCell = firstSection.querySelector(`[data-calendar-date="${januaryFirst}"]`)!;
    const label = januaryCell.querySelector<HTMLElement>('[data-calendar-duration]')!;
    check(label.textContent === '1:45', 'Daily calendar labels should sum records with minute precision');
    const swatch = januaryCell.firstElementChild!;
    check(label.getBoundingClientRect().top >= swatch.getBoundingClientRect().bottom, 'Duration label must sit below its color cell');
    check(!groups()[1].closest('section')!.querySelector('[data-calendar-duration]'), 'Mode switches must not affect sibling cards');
    check(saved.statisticCards![0].showCalendarValues === true, 'Display preference must reach persistence callback');
    await mode(0, '色块');
    check(!host.querySelector('[data-calendar-duration]'), 'Color mode should remove labels');
    await mode(0, '时长');
    root.render(null); await delay(); renderCalendar(); await delay(); await delay();
    check(host.querySelector('[data-calendar-duration]'), 'Persisted duration mode should survive remount');
    check(document.documentElement.scrollWidth <= window.innerWidth, 'Calendar captions must not cause horizontal overflow');
    if (source === 'categoryDuration') {
      await capture('calendar-values-mobile');
      await capture('calendar-values-narrow');
      check([...host.querySelectorAll<HTMLElement>('[data-calendar-duration]')].every(item => item.scrollWidth <= item.clientWidth), 'Narrow calendars should keep full duration labels visible');
    }
    passed.push(`${source}: calendar modes, totals, independent preferences and persistence`);
  }

  await capture('calendar-values-desktop');

  renderNumeric(Array.from({ length: 30 }, (_, index) => ({ key: dateKey(day(index - 29)), value: (index % 6) * 12 })));
  await delay();
  await capture('trend-desktop');
  await clickAt(15 / 29); check(slider().getAttribute('aria-valuenow') === '16', 'Desktop coordinate conversion failed');
  check(document.documentElement.scrollWidth <= window.innerWidth, 'Readout should not overflow');
  passed.push('desktop resize and responsive SVG coordinate conversion');
  window.__trendResult = { passed };
}

run().catch(error => { window.__trendResult = { passed, error: String(error.stack || error) }; });
