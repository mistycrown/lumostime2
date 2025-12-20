import { WebPlugin } from '@capacitor/core';
import type { FocusNotificationPlugin } from './FocusNotificationPlugin';

/**
 * Web平台占位实现（不执行任何操作）
 * 插件仅在Android平台上工作
 */
export class FocusNotificationWeb extends WebPlugin implements FocusNotificationPlugin {
    async startFocusNotification(options: { taskName: string }): Promise<void> {
        console.log('FocusNotification.startFocusNotification (Web - No-op)', options);
    }

    async updateFocusTime(options: { elapsedSeconds: number }): Promise<void> {
        console.log('FocusNotification.updateFocusTime (Web - No-op)', options);
    }

    async stopFocusNotification(): Promise<void> {
        console.log('FocusNotification.stopFocusNotification (Web - No-op)');
    }
}
