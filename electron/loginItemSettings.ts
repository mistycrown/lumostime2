/**
 * @file loginItemSettings.ts
 * @input Windows login-item registration and current application identity
 * @output Effective autostart status and explicit enable/disable settings
 * @pos Electron startup
 * @description Checks Windows startup approval as well as login-item registration.
 * @updated 2026-10-13: Prevents disabled Run entries from appearing enabled in the tray.
 */
import type { LoginItemSettings, Settings } from 'electron';

export const isLoginItemEnabled = (settings: LoginItemSettings, name: string): boolean => {
  const launchItem = settings.launchItems?.find((item) => item.name === name);
  return settings.openAtLogin && (launchItem?.enabled ?? settings.executableWillLaunchAtLogin);
};

export const buildLoginItemSettings = (
  enabled: boolean,
  query: { path: string; args: string[] },
  name: string
): Settings => ({ ...query, name, openAtLogin: enabled, enabled });
