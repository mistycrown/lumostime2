/**
 * @file FeishuCalendarSettingsView.test.tsx
 * @input Feishu settings view with ready, empty local data.
 * @output Regression coverage for the connection entry and eight-digit date fields.
 * @pos Settings UI tests.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { FeishuCalendarSettingsView } from './FeishuCalendarSettingsView';

vi.mock('../../contexts/CategoryScopeContext', () => ({ useCategoryScope: () => ({ categories: [], isReady: true }) }));
vi.mock('../../contexts/DataContext', () => ({ useData: () => ({ logs: [], isReady: true, usesFallbackSeedData: false }) }));

it('renders a visible connection entry and numeric text dates before connection status loads', () => {
  const markup = renderToStaticMarkup(<FeishuCalendarSettingsView onBack={() => undefined} />);
  expect(markup).toContain('连接飞书</button>');
  expect(markup).toContain('导入到飞书日历');
  expect(markup).not.toContain('type="date"');
  expect(markup.match(/type="text" inputMode="numeric" maxLength="8" pattern="\[0-9\]\{8\}"/g)).toHaveLength(2);
  expect(markup.match(/value="\d{8}"/g)).toHaveLength(2);
  for (const preset of ['本周', '本月', '上周', '上月']) expect(markup).toContain(preset);
});
