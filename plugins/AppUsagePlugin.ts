import { registerPlugin } from '@capacitor/core';

export interface AppUsagePlugin {
    checkAccessibilityPermission(): Promise<{ granted: boolean }>;
    requestAccessibilityPermission(): Promise<void>;
    showFloatingText(options: { text: string }): Promise<void>;
    setSwitchPending(options: { pending: boolean }): Promise<void>;

    checkPermissions(): Promise<{ granted: boolean }>;
    requestPermissions(): Promise<void>;
    getRunningApp(): Promise<{ packageName: string }>;
    getInstalledApps(): Promise<{ apps: { packageName: string; label: string; icon: string }[] }>;
    saveAppRule(options: { packageName: string; activityId: string }): Promise<void>;
    removeAppRule(options: { packageName: string }): Promise<void>;
    getAppRules(): Promise<{ rules: { [packageName: string]: string } }>;
    startMonitor(): Promise<void>;
    stopMonitor(): Promise<void>;
}

const AppUsage = registerPlugin<AppUsagePlugin>('AppUsage');

export default AppUsage;
