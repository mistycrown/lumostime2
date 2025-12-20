import { registerPlugin } from '@capacitor/core';

export interface AppUsagePlugin {
    checkPermissions(): Promise<{ granted: boolean }>;
    requestPermissions(): Promise<void>;
    // Will be added later
    // getRunningApp(): Promise<{ packageName: string }>;
}

const AppUsage = registerPlugin<AppUsagePlugin>('AppUsage');

export default AppUsage;
