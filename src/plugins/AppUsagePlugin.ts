import { registerPlugin } from '@capacitor/core';

export interface AppUsagePlugin {
    checkPermissions(): Promise<{ granted: boolean }>;
    requestPermissions(): Promise<void>;
    checkAccessibilityPermission(): Promise<{ granted: boolean }>;
    requestAccessibilityPermission(): Promise<void>;
    showFloatingText(options: { text: string }): Promise<void>;
    getRunningApp(): Promise<{ packageName: string }>;
    getInstalledApps(): Promise<{ apps: any[] }>;
    startMonitor(): Promise<void>;
    stopMonitor(): Promise<void>;
    saveAppRule(options: { packageName: string, activityId: string }): Promise<void>;
    removeAppRule(options: { packageName: string }): Promise<void>;
    getAppRules(): Promise<{ rules: Record<string, string> }>;
    setSwitchPending(options: { pending: boolean }): Promise<void>;
}

const AppUsage = registerPlugin<AppUsagePlugin>('AppUsage');

export default AppUsage;
