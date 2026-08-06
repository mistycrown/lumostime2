/**
 * @file PreferencesSettingsView.test.tsx
 * @description Verifies the selected timer auto-jump label shown in preferences.
 * @updated 2026-05-10: Added coverage for the new three-option post-start jump selector.
 * @updated 2026-08-06: Added coverage for the shared association-selector layout preference.
 */
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('../../contexts/SettingsContext', () => ({
  useSettings: () => ({
    themeMode: 'light',
    setThemeMode: vi.fn(),
    timelineLayout: 'timeline',
    setTimelineLayout: vi.fn(),
    associationSelectorColumns: 3,
    setAssociationSelectorColumns: vi.fn()
  })
}));

import { PreferencesSettingsView } from './PreferencesSettingsView';

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
