/**
 * @file AppUsagePlugin.ts
 * @input N/A
 * @output Native Methods
 * @pos Plugin
 * @description Defines the interface for the AppUsage capacitor plugin, used for tracking app usage time and managing accessibility permissions on Android.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { registerPlugin } from '@capacitor/core';

export interface AppUsagePlugin {
    checkPermissions(): Promise<{ granted: boolean }>;
    requestPermissions(): Promise<void>;
    checkAccessibilityPermission(): Promise<{ granted: boolean }>;
    requestAccessibilityPermission(): Promise<void>;
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
