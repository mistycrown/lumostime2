/**
 * @file FocusNotificationPlugin.ts
 * @input N/A
 * @output Native Methods
 * @pos Plugin
 * @description Defines the interface for the FocusNotification capacitor plugin, managing the persistent notification bar and floating window overlay on Android.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { registerPlugin } from '@capacitor/core';

/**
 * 专注通知插件接口
 */
export interface FocusNotificationPlugin {
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

    /**
     * Add a listener for a plugin event
     */
    addListener(eventName: string, listenerFunc: (data: any) => void): Promise<import('@capacitor/core').PluginListenerHandle> & import('@capacitor/core').PluginListenerHandle;

    /**
     * Remove all listeners for this plugin
     */
    removeAllListeners(): Promise<void>;
}

const FocusNotification = registerPlugin<FocusNotificationPlugin>('FocusNotification', {
    web: () => import('./web').then(m => new m.FocusNotificationWeb()),
});

export default FocusNotification;
