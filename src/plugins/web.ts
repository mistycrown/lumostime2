/**
 * @file web.ts
 * @input N/A
 * @output Web Console Logs
 * @pos Plugin Implementation (Web)
 * @description A no-op web implementation of the FocusNotification plugin to prevent errors when running in a browser environment.
 * @updated 2026-05-09: Added web no-op support for pending floating-stop recovery and session-id sync payloads.
 * @updated 2026-05-09: Added no-op active-session syncing for the shared Android timer notification title path.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { WebPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
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

    async checkNotificationPermission(): Promise<{ granted: boolean }> {
        console.log('FocusNotification.checkNotificationPermission (Web - No-op)');
        return { granted: true };
    }

    async requestFloatingPermission(): Promise<void> {
        console.log('FocusNotification.requestFloatingPermission (Web - No-op)');
    }

    async requestNotificationPermission(): Promise<{ granted: boolean }> {
        console.log('FocusNotification.requestNotificationPermission (Web - No-op)');
        return { granted: true };
    }

    async startFloatingWindow(options?: { icon?: string, isFocusing?: boolean, startTime?: string, sessionId?: string }): Promise<void> {
        console.log('FocusNotification.startFloatingWindow (Web - No-op)', options);
    }

    async updateFloatingWindow(options: { icon?: string, isFocusing: boolean, startTime?: string, sessionId?: string }): Promise<void> {
        console.log('FocusNotification.updateFloatingWindow (Web - No-op)', options);
    }

    async stopFloatingWindow(): Promise<void> {
        console.log('FocusNotification.stopFloatingWindow (Web - No-op)');
    }

    async syncActiveSessions(options: { sessions: { id: string; label: string; startTime: number }[] }): Promise<void> {
        console.log('FocusNotification.syncActiveSessions (Web - No-op)', options);
    }

    async consumePendingStopRequest(): Promise<{ hasPending: boolean, sessionId?: string | null, stoppedAt?: number | null }> {
        console.log('FocusNotification.consumePendingStopRequest (Web - No-op)');
        return { hasPending: false, sessionId: null, stoppedAt: null };
    }

    addListener(
        eventName: string,
        listenerFunc: (data: any) => void
    ): Promise<PluginListenerHandle> & PluginListenerHandle {
        return super.addListener(eventName, listenerFunc) as Promise<PluginListenerHandle> & PluginListenerHandle;
    }
}
