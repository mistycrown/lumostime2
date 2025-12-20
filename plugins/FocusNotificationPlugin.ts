import { registerPlugin } from '@capacitor/core';

/**
 * 专注通知插件接口
 * 用于在Android设备上显示小米超级岛/常驻通知
 */
export interface FocusNotificationPlugin {
    /**
     * 启动专注通知
     * @param options.taskName 任务标签名称（如"📚 学习"）
     */
    startFocusNotification(options: { taskName: string }): Promise<void>;

    /**
     * 更新专注计时
     * @param options.elapsedSeconds 已专注的秒数
     */
    updateFocusTime(options: { elapsedSeconds: number }): Promise<void>;

    /**
     * 停止专注通知
     */
    stopFocusNotification(): Promise<void>;
}

const FocusNotification = registerPlugin<FocusNotificationPlugin>('FocusNotification', {
    web: () => import('./web').then(m => new m.FocusNotificationWeb()),
});

export default FocusNotification;
