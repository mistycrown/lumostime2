/**
 * @file IconPlugin.ts
 * @description Capacitor插件，用于Android端图标切换
 */

import { registerPlugin } from '@capacitor/core';

export interface IconPlugin {
    /**
     * 设置应用图标
     */
    setIcon(options: { iconId: string }): Promise<{ success: boolean; message?: string }>;
    
    /**
     * 获取当前图标
     */
    getCurrentIcon(): Promise<{ iconId: string }>;
    
    /**
     * 获取可用图标列表
     */
    getAvailableIcons(): Promise<{ icons: string[] }>;
    
    /**
     * 刷新启动器显示
     */
    refreshLauncher(): Promise<{ success: boolean; message?: string }>;
}

const IconPlugin = registerPlugin<IconPlugin>('IconPlugin', {
    web: {
        setIcon: async (options: { iconId: string }) => {
            console.log('Web平台不支持原生图标切换:', options);
            return { success: false, message: 'Web平台不支持原生图标切换' };
        },
        getCurrentIcon: async () => {
            return { iconId: 'default' };
        },
        getAvailableIcons: async () => {
            return { icons: ['default'] };
        },
        refreshLauncher: async () => {
            console.log('Web平台不需要刷新启动器');
            return { success: true, message: 'Web平台不需要刷新启动器' };
        }
    }
});

export default IconPlugin;