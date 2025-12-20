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
     * 停止专注通知
     */
    stopFocusNotification(): Promise<void>;

    /**
     * 检查是否有悬浮窗权限
     */
    checkFloatingPermission(): Promise<{ granted: boolean }>;

    /**
     * 请求悬浮窗权限
     */
    requestFloatingPermission(): Promise<void>;

    /**
     * 启动悬浮窗服务
     */
    startFloatingWindow(options?: { icon?: string, isFocusing?: boolean, startTime?: string }): Promise<void>;

    /**
     * 更新悬浮窗内容
     */
    updateFloatingWindow(options: { icon?: string, isFocusing: boolean, startTime?: string }): Promise<void>;

    /**
     * 停止悬浮窗服务
     */
    stopFloatingWindow(): Promise<void>;
}

const FocusNotification = registerPlugin<FocusNotificationPlugin>('FocusNotification', {
    web: () => import('./web').then(m => new m.FocusNotificationWeb()),
});

export default FocusNotification;
