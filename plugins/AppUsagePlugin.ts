import { registerPlugin } from '@capacitor/core';

export interface AppUsagePlugin {
    checkPermissions(): Promise<{ granted: boolean }>;
    requestPermissions(): Promise<void>;
    getRunningApp(): Promise<{ packageName: string }>;
    getInstalledApps(): Promise<{ apps: { packageName: string; label: string; icon: string }[] }>;
    saveAppRule(options: { packageName: string; activityId: string; activityName?: string }): Promise<void>;
    removeAppRule(options: { packageName: string }): Promise<void>;
    getAppRules(): Promise<{ rules: { [packageName: string]: string } }>;
    startMonitor(): Promise<void>;
    stopMonitor(): Promise<void>;
    showFloatingText(options: { text: string }): Promise<void>;
}

const AppUsage = registerPlugin<AppUsagePlugin>('AppUsage');

export default AppUsage;
