/**
 * @file AppLauncherWeb.ts
 * @description Web平台的AppLauncher实现（占位）
 */
import { WebPlugin } from '@capacitor/core';
import type { AppLauncherPlugin, InstalledApp } from './AppLauncherService';

export class AppLauncherWeb extends WebPlugin implements AppLauncherPlugin {
  async getInstalledApps(): Promise<{ apps: InstalledApp[] }> {
    console.warn('AppLauncher.getInstalledApps() is not available on web');
    return { apps: [] };
  }

  async launchApp(_options: { packageName: string }): Promise<{ success: boolean }> {
    console.warn('AppLauncher.launchApp() is not available on web');
    return { success: false };
  }

  async canLaunchApp(_options: { packageName: string }): Promise<{ canLaunch: boolean }> {
    console.warn('AppLauncher.canLaunchApp() is not available on web');
    return { canLaunch: false };
  }
}
