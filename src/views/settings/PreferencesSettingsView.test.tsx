/**
 * @file PreferencesSettingsView.test.tsx
 * @updated 2026-10-07: Verifies manual-only daily backup controls and four-digit selected time.
 * @description Verifies the selected timer auto-jump label shown in preferences.
 * @updated 2026-05-10: Added coverage for the new three-option post-start jump selector.
 * @updated 2026-08-06: Added coverage for the shared association-selector layout preference.
 * @updated 2026-09-15: Covers the global font-scale preference context shape.
 */
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('../../contexts/SettingsContext', () => ({
  useSettings: () => ({
    themeMode: 'light',
    setThemeMode: vi.fn(),
    fontScale: 1,
    setFontScale: vi.fn(),
    timelineLayout: 'timeline',
    setTimelineLayout: vi.fn(),
    associationSelectorColumns: 3,
    setAssociationSelectorColumns: vi.fn(),
    dailyBackupEnabled: true,
    setDailyBackupEnabled: vi.fn(),
    dailyBackupTime: '21:30',
    setDailyBackupTime: vi.fn()
  })
}));

import { PreferencesSettingsView } from './PreferencesSettingsView';

describe('PreferencesSettingsView daily backup', () => {
  test('shows the backup switch and selected time in manual mode', () => {
    const html = renderToStaticMarkup(<PreferencesSettingsView onBack={() => {}} onToast={() => {}} manualSyncMode />);
    expect(html).toContain('定时备份');
    expect(html).toContain('每日备份时间');
    expect(html).toContain('value="2130"');
    expect(html).toContain('aria-checked="true"');
  });

  test('hides daily backup controls in automatic mode', () => {
    const html = renderToStaticMarkup(<PreferencesSettingsView onBack={() => {}} onToast={() => {}} manualSyncMode={false} />);
    expect(html).not.toContain('定时备份');
    expect(html).not.toContain('daily-backup-time');
  });
});

describe('PreferencesSettingsView timer auto-jump selector', () => {
  test.each([
    ['none', '不跳转'],
    ['focus-detail', '跳转到正在计时页面'],
    ['immersive-timer', '跳转到沉浸式计时页面'],
  ] as const)('shows the selected label for %s', (mode, label) => {
    const html = renderToStaticMarkup(
      <PreferencesSettingsView
        onBack={() => {}}
        onToast={() => {}}
        autoStartTimerJumpMode={mode}
      />
    );

    expect(html).toContain('开始计时后自动跳转');
    expect(html).toContain(label);
  });
});

describe('PreferencesSettingsView association selector layout', () => {
  test('shows the shared selector layout options', () => {
    const html = renderToStaticMarkup(
      <PreferencesSettingsView
        onBack={() => {}}
        onToast={() => {}}
      />
    );

    expect(html).toContain('分类选择器布局');
    expect(html).toContain('三列');
    expect(html).toContain('四列');
  });
});
