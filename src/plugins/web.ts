/**
 * @file web.ts
 * @input N/A
 * @output Web Console Logs
 * @pos Plugin Implementation (Web)
 * @description A no-op web implementation of the FocusNotification plugin to prevent errors when running in a browser environment.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { WebPlugin } from '@capacitor/core';
import type { FocusNotificationPlugin } from './FocusNotificationPlugin';

/**
 * Web平台占位实现（不执行任何操作）
 * 插件仅在Android平台上工作
 */
export class FocusNotificationWeb extends WebPlugin implements FocusNotificationPlugin {
    async checkFloatingPermission(): Promise<{ granted: boolean }> {
        console.log('FocusNotification.checkFloatingPermission (Web - No-op)');
        return { granted: true }; // Mock granted on web
    }

    async requestFloatingPermission(): Promise<void> {
        console.log('FocusNotification.requestFloatingPermission (Web - No-op)');
    }

    async startFloatingWindow(options?: { icon?: string, isFocusing?: boolean, startTime?: string }): Promise<void> {
        console.log('FocusNotification.startFloatingWindow (Web - No-op)', options);
    }

    async updateFloatingWindow(options: { icon?: string, isFocusing: boolean, startTime?: string }): Promise<void> {
        console.log('FocusNotification.updateFloatingWindow (Web - No-op)', options);
    }

    async stopFloatingWindow(): Promise<void> {
        console.log('FocusNotification.stopFloatingWindow (Web - No-op)');
    }
}
