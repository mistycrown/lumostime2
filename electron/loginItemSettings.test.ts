/**
 * @file loginItemSettings.test.ts
 * @input Windows Run registrations and startup approval flags
 * @output Regression checks for tray autostart status and toggles
 * @pos Electron tests
 * @updated 2026-10-13: Covers disabled startup entries and exact application identity.
 */
import { describe, expect, it } from 'vitest';
import type { LoginItemSettings } from 'electron';
import { buildLoginItemSettings, isLoginItemEnabled } from './loginItemSettings';

const settings = (overrides: Partial<LoginItemSettings>): LoginItemSettings => ({
  openAtLogin: true,
  executableWillLaunchAtLogin: true,
  launchItems: [{ name: 'lumostime', enabled: true, path: 'LumosTime.exe', args: ['--startup'], scope: 'user' }],
  ...overrides
} as LoginItemSettings);

describe('Windows autostart', () => {
  it('reflects startup approval even if another entry for the executable is enabled', () => {
    expect(isLoginItemEnabled(settings({}), 'lumostime')).toBe(true);
    expect(isLoginItemEnabled(settings({ openAtLogin: false }), 'lumostime')).toBe(false);
    const disabled = settings({});
    disabled.launchItems[0].enabled = false;
    expect(isLoginItemEnabled(disabled, 'lumostime')).toBe(false);
    expect(isLoginItemEnabled(settings({ launchItems: [], executableWillLaunchAtLogin: false }), 'lumostime')).toBe(false);
  });

  it('writes both the Run registration and startup approval using the same identity and args', () => {
    const query = { path: 'C:\\Program Files\\LumosTime\\LumosTime.exe', args: ['--startup'] };
    expect(buildLoginItemSettings(true, query, 'lumostime')).toEqual({ ...query, name: 'lumostime', openAtLogin: true, enabled: true });
    expect(buildLoginItemSettings(false, query, 'lumostime')).toEqual({ ...query, name: 'lumostime', openAtLogin: false, enabled: false });
  });
});
