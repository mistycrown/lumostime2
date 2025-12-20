import { registerPlugin } from '@capacitor/core';

export interface AppUsagePlugin {
    checkPermissions(): Promise<{ granted: boolean }>;
    requestPermissions(): Promise<void>;
}

const AppUsage = registerPlugin<AppUsagePlugin>('AppUsage');

export default AppUsage;
