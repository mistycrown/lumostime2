/**
 * @file FeishuCalendarSettingsView.test.tsx
 * @input Feishu settings view with hydrated logs and saved category preferences.
 * @output Regression coverage for connection, opt-in automatic sync, date text fields and multi-select filtering preview.
 * @pos Settings UI tests.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FeishuCalendarSettingsView } from './FeishuCalendarSettingsView';

const fixture = vi.hoisted(() => ({ categories: [] as any[], logs: [] as any[] }));
vi.mock('../../contexts/CategoryScopeContext', () => ({ useCategoryScope: () => ({ categories: fixture.categories, isReady: true }) }));
vi.mock('../../contexts/DataContext', () => ({ useData: () => ({ logs: fixture.logs, isReady: true, usesFallbackSeedData: false }) }));
beforeEach(() => { fixture.categories = []; fixture.logs = []; });
afterEach(() => vi.unstubAllGlobals());

it('renders a visible connection entry and numeric text dates before connection status loads', () => {
  const markup = renderToStaticMarkup(<FeishuCalendarSettingsView onBack={() => undefined} />);
  expect(markup).toContain('连接飞书</button>');
  expect(markup).toContain('同步到飞书日历');
  expect(markup).toContain('自动同步');
  expect(markup).toContain('role="switch"');
  expect(markup).toContain('立即同步');
  expect(markup).not.toContain('checked=""');
  expect(markup).not.toContain('type="date"');
  expect(markup.match(/type="text" inputMode="numeric" maxLength="8" pattern="\[0-9\]\{8\}"/g)).toHaveLength(2);
  expect(markup.match(/value="\d{8}"/g)).toHaveLength(2);
  for (const preset of ['本周', '本月', '上周', '上月']) expect(markup).toContain(preset);
});

it('renders saved multi-select choices beside the dates and filters the record count', () => {
  fixture.categories = ['work', 'life', 'other'].map((id) => ({ id, name: id, themeColor: '#336699', activities: [] }));
  fixture.logs = fixture.categories.map((category, index) => ({ id: `log-${index}`, categoryId: category.id,
    activityId: '', startTime: Date.now(), endTime: Date.now() + 3600000, duration: 3600 }));
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(['work', 'other']) });
  const markup = renderToStaticMarkup(<FeishuCalendarSettingsView onBack={() => undefined} />);
  expect(markup).toContain('<legend class="text-sm text-stone-600">忽略分类</legend>');
  expect(markup.match(/aria-pressed="true"/g)).toHaveLength(2);
  expect(markup.match(/aria-pressed="false"/g)).toHaveLength(1);
  expect(markup).toContain('范围内 1 条记录 · 1 个分类');
  expect(markup.indexOf('忽略分类')).toBeGreaterThan(markup.indexOf('结束日期'));
  expect(markup.indexOf('忽略分类')).toBeLessThan(markup.indexOf('范围内 1 条记录'));
});
