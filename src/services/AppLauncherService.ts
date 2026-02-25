/**
 * @file AppLauncherService.ts
 * @description 应用启动服务 - 支持通过包名或URL Scheme启动外部应用
 * @pos Service (Native Integration)
 */
import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

export interface InstalledApp {
  packageName: string;
  appName: string;
  icon?: string;
}

export interface AppLauncherPlugin {
  /**
   * 获取已安装的应用列表（仅Android）
   */
  getInstalledApps(): Promise<{ apps: InstalledApp[] }>;
  
  /**
   * 通过包名启动应用（Android）
   */
  launchApp(options: { packageName: string }): Promise<{ success: boolean }>;
  
  /**
   * 检查应用是否已安装
   */
  canLaunchApp(options: { packageName: string }): Promise<{ canLaunch: boolean }>;
}

const AppLauncher = registerPlugin<AppLauncherPlugin>('AppLauncher', {
  web: () => import('./AppLauncherWeb').then(m => new m.AppLauncherWeb()),
});

/**
 * 应用启动服务
 */
export class AppLauncherService {
  /**
   * 获取已安装的应用列表
   */
  static async getInstalledApps(): Promise<InstalledApp[]> {
    if (!Capacitor.isNativePlatform()) {
      console.warn('[AppLauncher] 仅在原生平台支持获取应用列表');
      return [];
    }

    try {
      const result = await AppLauncher.getInstalledApps();
      return result.apps || [];
    } catch (error) {
      console.error('[AppLauncher] 获取应用列表失败:', error);
      return [];
    }
  }

  /**
   * 启动应用（仅Android）
   * @param packageName Android包名 (如: com.example.app)
   */
  static async launchApp(packageName: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.warn('[AppLauncher] 仅在Android平台支持启动应用');
      return false;
    }

    if (Capacitor.getPlatform() !== 'android') {
      console.warn('[AppLauncher] 当前仅支持Android平台');
      return false;
    }

    try {
      const result = await AppLauncher.launchApp({ packageName });
      return result.success;
    } catch (error) {
      console.error('[AppLauncher] 启动应用失败:', error);
      return false;
    }
  }

  /**
   * 检查应用是否可以启动
   */
  static async canLaunchApp(packageName: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const result = await AppLauncher.canLaunchApp({ packageName });
      return result.canLaunch;
    } catch (error) {
      console.error('[AppLauncher] 检查应用失败:', error);
      return false;
    }
  }
}
