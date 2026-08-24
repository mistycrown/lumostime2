/**
 * @file AppUsagePlugin.ts
 * @input N/A
 * @output Native Methods
 * @pos Plugin
 * @description Defines the interface for the AppUsage capacitor plugin, used for tracking foreground apps, managing app association rules, and controlling per-app ignore state on Android.
 * @updated 2026-08-24: Added explicit workflow cancellation so the Android detector can clear its foreground-app deduplication cache.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { registerPlugin } from '@capacitor/core';

export interface AppRulesResult {
    rules: { [packageName: string]: string };
    ignoredApps: { [packageName: string]: boolean };
}

export interface AppAwarenessBindingsResult {
    bindings: { [packageName: string]: string };
}

export interface AppAwarenessOverlayButton {
    id: string;
    label: string;
    style?: 'primary' | 'secondary' | 'danger';
    value?: string;
    submitTextValue?: boolean;
}

export interface AppAwarenessOverlayPayload {
    title: string;
    body?: string;
    progressText?: string;
    allowClose?: boolean;
    countdownSeconds?: number;
    showInput?: boolean;
    inputValue?: string;
    inputPlaceholder?: string;
    inputHint?: string;
    buttons: AppAwarenessOverlayButton[];
}

export interface PendingAppAwarenessNativeStartPayload {
    nativeTimerId?: string;
    packageName?: string;
    appLabel?: string;
    workflowTemplateId?: string;
    answers?: Record<string, unknown>;
    selectedActivity?: {
        categoryId?: string;
        activityId?: string;
        label?: string;
        icon?: string;
    };
    expectedDurationMinutes?: number;
    startedAt?: number;
}

export interface PendingAppAwarenessNativeFinishPayload {
    nativeTimerId?: string;
    packageName?: string;
    finishedAt?: number;
}

export interface AppUsagePlugin {
    checkPermissions(): Promise<{ granted: boolean }>;
    requestPermissions(): Promise<void>;
    checkAccessibilityPermission(): Promise<{ granted: boolean }>;
    requestAccessibilityPermission(): Promise<void>;
    getRunningApp(): Promise<{ packageName: string }>;
    getInstalledApps(): Promise<{ apps: { packageName: string; label: string; icon: string }[] }>;
    saveAppRule(options: { packageName: string; activityId: string; activityName?: string }): Promise<void>;
    removeAppRule(options: { packageName: string }): Promise<void>;
    setAppIgnored(options: { packageName: string; ignored: boolean }): Promise<void>;
    getAppRules(): Promise<AppRulesResult>;
    syncAppAwarenessBindings(options: { bindings: { [packageName: string]: string } }): Promise<void>;
    syncAppAwarenessTemplates(options: { templates: unknown[] }): Promise<void>;
    getAppAwarenessBindings(): Promise<AppAwarenessBindingsResult>;
    consumePendingAppAwarenessStart(): Promise<{ hasPending: boolean } & PendingAppAwarenessNativeStartPayload>;
    acknowledgePendingAppAwarenessStart(): Promise<void>;
    consumePendingAppAwarenessFinish(): Promise<{ hasPending: boolean } & PendingAppAwarenessNativeFinishPayload>;
    acknowledgePendingAppAwarenessFinish(): Promise<void>;
    showAppAwarenessOverlay(options: { payload: AppAwarenessOverlayPayload }): Promise<void>;
    hideAppAwarenessOverlay(): Promise<void>;
    cancelAppAwarenessWorkflow(): Promise<void>;
    stopCurrentAppAwarenessTimer(): Promise<void>;
    startMonitor(): Promise<void>;
    stopMonitor(): Promise<void>;
    showFloatingText(options: { text: string }): Promise<void>;
}

const AppUsage = registerPlugin<AppUsagePlugin>('AppUsage');

export default AppUsage;
