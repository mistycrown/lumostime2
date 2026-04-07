/**
 * @file iconService.ts
 * @input Icon selection, Platform detection
 * @output App icon updates (desktop/mobile)
 * @pos Service (App Customization)
 * @description 应用图标管理服务 - 支持电脑端和手机端图标切换
 * 
 * 核心功能：
 * - 预设图标选项管理
 * - 平台检测（桌面端/移动端）
 * - 图标切换和应用
 * - Electron file:// 场景下的图标路径兼容
 * - 图标预览
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { Capacitor } from '@capacitor/core';
import { resolveAssetPath } from '../utils/assetPath';

export interface IconOption {
    id: string;
    name: string;
    preview: string;
    description: string;
    desktopIcon?: string;
    mobileIcon?: string;
}

export const ICON_OPTIONS: IconOption[] = [
    {
        id: 'default',
        name: '默认',
        preview: '⏰',
        description: '经典时钟图标',
        desktopIcon: '/icon.ico',
        mobileIcon: 'default'
    },
    {
        id: 'neon',
        name: '霓虹',
        preview: '🌟',
        description: '霓虹风格图标',
        desktopIcon: '/icon_style/icon_neon.png',
        mobileIcon: 'neon'
    },
    {
        id: 'paper',
        name: '纸质',
        preview: '📄',
        description: '纸质风格图标',
        desktopIcon: '/icon_style/icon_paper.png',
        mobileIcon: 'paper'
    },
    {
        id: 'pixel',
        name: '像素',
        preview: '🎮',
        description: '像素风格图标',
        desktopIcon: '/icon_style/icon_pixel.png',
        mobileIcon: 'pixel'
    },
    {
        id: 'sketch',
        name: '手绘',
        preview: '✏️',
        description: '手绘风格图标',
        desktopIcon: '/icon_style/icon_sketch.png',
        mobileIcon: 'sketch'
    },
    {
        id: 'art-deco',
        name: '装饰艺术',
        preview: '🎨',
        description: '装饰艺术风格',
        desktopIcon: '/icon_style/icon_Art%20Deco.png',
        mobileIcon: 'art-deco'
    },
    {
        id: 'blueprint',
        name: '蓝图',
        preview: '📐',
        description: '蓝图风格',
        desktopIcon: '/icon_style/icon_Blueprint.png',
        mobileIcon: 'blueprint'
    },
    {
        id: 'chalkboard',
        name: '黑板',
        preview: '📝',
        description: '黑板风格',
        desktopIcon: '/icon_style/icon_Chalkboard.png',
        mobileIcon: 'chalkboard'
    },
    {
        id: 'christmas',
        name: '圣诞',
        preview: '🎄',
        description: '圣诞风格',
        desktopIcon: '/icon_style/icon_Christmas.png',
        mobileIcon: 'christmas'
    },
    {
        id: 'embroidery',
        name: '刺绣',
        preview: '🧵',
        description: '刺绣风格',
        desktopIcon: '/icon_style/icon_Embroidery.png',
        mobileIcon: 'embroidery'
    },
    {
        id: 'graffiti',
        name: '涂鸦',
        preview: '🎨',
        description: '涂鸦风格',
        desktopIcon: '/icon_style/icon_Graffiti.png',
        mobileIcon: 'graffiti'
    },
    {
        id: 'lego',
        name: '乐高',
        preview: '🧱',
        description: '乐高风格',
        desktopIcon: '/icon_style/icon_lego.png',
        mobileIcon: 'lego'
    },
    {
        id: 'origami',
        name: '折纸',
        preview: '📜',
        description: '折纸风格',
        desktopIcon: '/icon_style/icon_origami.png',
        mobileIcon: 'origami'
    },
    {
        id: 'pointillism',
        name: '点彩',
        preview: '🎨',
        description: '点彩风格',
        desktopIcon: '/icon_style/icon_Pointillism.png',
        mobileIcon: 'pointillism'
    },
    {
        id: 'pop-art',
        name: '波普艺术',
        preview: '🎨',
        description: '波普艺术风格',
        desktopIcon: '/icon_style/icon_Pop%20Art.png',
        mobileIcon: 'pop-art'
    },
    {
        id: 'stained-glass',
        name: '彩色玻璃',
        preview: '🌈',
        description: '彩色玻璃风格',
        desktopIcon: '/icon_style/icon_Stained%20Glass.png',
        mobileIcon: 'stained-glass'
    },
    {
        id: 'ukiyo-e',
        name: '浮世绘',
        preview: '🌊',
        description: '浮世绘风格',
        desktopIcon: '/icon_style/icon_Ukiyo-e.png',
        mobileIcon: 'ukiyo-e'
    },
    {
        id: 'simple',
        name: '简约',
        preview: '⚪',
        description: '简约风格',
        desktopIcon: '/icon_style/icon_simple.png',
        mobileIcon: 'simple'
    },
    {
        id: 'cat',
        name: '猫咪',
        preview: '🐱',
        description: '猫咪主题',
        desktopIcon: '/icon_style/icon_cat.png',
        mobileIcon: 'cat'
    },
    {
        id: 'fox',
        name: '狐狸',
        preview: '🦊',
        description: '狐狸主题',
        desktopIcon: '/icon_style/icon_fox.png',
        mobileIcon: 'fox'
    },
    {
        id: 'frog',
        name: '青蛙',
        preview: '🐸',
        description: '青蛙主题',
        desktopIcon: '/icon_style/icon_frog.png',
        mobileIcon: 'frog'
    },
    {
        id: 'panda',
        name: '熊猫',
        preview: '🐼',
        description: '熊猫主题',
        desktopIcon: '/icon_style/icon_panda.png',
        mobileIcon: 'panda'
    },
    {
        id: 'heart',
        name: '爱心',
        preview: '❤️',
        description: '爱心主题',
        desktopIcon: '/icon_style/icon_heart.png',
        mobileIcon: 'heart'
    },
    {
        id: 'moon',
        name: '月亮',
        preview: '🌙',
        description: '月亮主题',
        desktopIcon: '/icon_style/icon_moon.png',
        mobileIcon: 'moon'
    },
    {
        id: 'mushroom',
        name: '蘑菇',
        preview: '🍄',
        description: '蘑菇主题',
        desktopIcon: '/icon_style/icon_mushroom.png',
        mobileIcon: 'mushroom'
    },
    {
        id: 'plant',
        name: '植物',
        preview: '🌱',
        description: '植物主题',
        desktopIcon: '/icon_style/icon_plant.png',
        mobileIcon: 'plant'
    },
    {
        id: 'sea',
        name: '海洋',
        preview: '🌊',
        description: '海洋主题',
        desktopIcon: '/icon_style/icon_sea.png',
        mobileIcon: 'sea'
    },
    {
        id: 'knot',
        name: '结绳',
        preview: '🪢',
        description: '结绳主题',
        desktopIcon: '/icon_style/icon_knot.png',
        mobileIcon: 'knot'
    },
    {
        id: 'bijiaso',
        name: '笔记本',
        preview: '📔',
        description: '笔记本主题',
        desktopIcon: '/icon_style/icon_bijiaso.png',
        mobileIcon: 'bijiaso'
    },
    {
        id: 'cdqm',
        name: '彩蛋',
        preview: '🥚',
        description: '彩蛋主题',
        desktopIcon: '/icon_style/icon_cdqm.png',
        mobileIcon: 'cdqm'
    },
    {
        id: 'ciww',
        name: '创意',
        preview: '💡',
        description: '创意主题',
        desktopIcon: '/icon_style/icon_ciww.png',
        mobileIcon: 'ciww'
    },
    {
        id: 'uvcd',
        name: '紫外线',
        preview: '🔮',
        description: '紫外线主题',
        desktopIcon: '/icon_style/icon_uvcd.png',
        mobileIcon: 'uvcd'
    },
    {
        id: 'wjugjp',
        name: '抽象',
        preview: '🎭',
        description: '抽象主题',
        desktopIcon: '/icon_style/icon_wjugjp.png',
        mobileIcon: 'wjugjp'
    }
];

class IconService {
    private readonly STORAGE_KEY = 'lumos_selected_icon';

    /**
     * 获取当前选中的图标ID
     */
    getCurrentIcon(): string {
        return localStorage.getItem(this.STORAGE_KEY) || 'default';
    }

    /**
     * 设置图标
     */
    async setIcon(iconId: string): Promise<{ success: boolean; message: string }> {
        console.log('[iconService] ========== setIcon 开始 ==========');
        console.log('[iconService] 请求的iconId:', iconId);
        
        const iconOption = ICON_OPTIONS.find(option => option.id === iconId);
        console.log('[iconService] 找到的iconOption:', iconOption);
        
        if (!iconOption) {
            console.log('[iconService] ❌ 图标选项不存在');
            return { success: false, message: '图标选项不存在' };
        }

        try {
            // 保存选择到本地存储
            localStorage.setItem(this.STORAGE_KEY, iconId);
            console.log('[iconService] ✓ 已保存到localStorage:', iconId);

            // 根据平台设置图标
            const platform = Capacitor.getPlatform();
            const isNative = Capacitor.isNativePlatform();
            console.log('[iconService] 平台信息:', { platform, isNative });
            
            if (isNative) {
                console.log('[iconService] 使用移动端图标设置');
                // 手机端 - 通过Android原生代码设置
                await this.setMobileIcon(iconOption);
            } else {
                console.log('[iconService] 使用桌面端图标设置');
                // 电脑端 - 更新favicon和标题栏图标
                await this.setDesktopIcon(iconOption);
            }

            console.log('[iconService] ✓ 图标设置成功');
            console.log('[iconService] ========== setIcon 结束 ==========');
            return { success: true, message: '图标已更新' };
        } catch (error: any) {
            console.error('[iconService] ❌ 设置图标失败:', error);
            console.log('[iconService] ========== setIcon 结束（失败）==========');
            return { success: false, message: error.message || '设置图标失败' };
        }
    }

    /**
     * 设置桌面端图标
     */
    private async setDesktopIcon(iconOption: IconOption): Promise<void> {
        console.log('[iconService] setDesktopIcon 开始');
        console.log('[iconService] iconOption:', iconOption);
        
        if (!iconOption.desktopIcon) {
            console.log('[iconService] ❌ 没有desktopIcon配置');
            return;
        }

        console.log('[iconService] 准备更新favicon:', iconOption.desktopIcon);
        const resolvedDesktopIcon = resolveAssetPath(iconOption.desktopIcon);

        // 更新favicon（浏览器支持 PNG）
        const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        console.log('[iconService] 当前favicon元素:', favicon);
        
        if (favicon) {
            const oldHref = favicon.href;
            favicon.href = resolvedDesktopIcon;
            console.log('[iconService] ✓ favicon已更新');
            console.log('[iconService]   旧路径:', oldHref);
            console.log('[iconService]   新路径:', favicon.href);
        } else {
            // 如果没有favicon，创建一个
            console.log('[iconService] 创建新的favicon元素');
            const newFavicon = document.createElement('link');
            newFavicon.rel = 'icon';
            newFavicon.href = resolvedDesktopIcon;
            document.head.appendChild(newFavicon);
            console.log('[iconService] ✓ 新favicon已创建并添加');
        }

        // 更新其他相关的图标链接
        const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
        if (appleTouchIcon) {
            appleTouchIcon.href = resolvedDesktopIcon;
            console.log('[iconService] ✓ apple-touch-icon已更新');
        }

        // 如果是Electron环境，通知主进程更新应用图标
        if ((window as any).ipcRenderer) {
            console.log('[iconService] 检测到Electron环境，通知主进程');
            try {
                (window as any).ipcRenderer.send('update-app-icon', iconOption.desktopIcon);
                console.log('[iconService] ✓ Electron IPC消息已发送:', iconOption.desktopIcon);
            } catch (error) {
                console.warn('[iconService] ❌ Electron图标更新失败:', error);
            }
        } else {
            console.log('[iconService] 非Electron环境，跳过IPC通知');
        }
        
        console.log('[iconService] setDesktopIcon 完成');
    }

    /**
     * 设置移动端图标
     */
    private async setMobileIcon(iconOption: IconOption): Promise<void> {
        if (!iconOption.mobileIcon) return;

        // 通过Capacitor插件调用Android原生代码
        try {
            // 动态导入插件以避免在Web环境下出错
            const { default: IconPlugin } = await import('../plugins/IconPlugin');
            
            // 设置图标
            const result = await IconPlugin.setIcon({ iconId: iconOption.mobileIcon });
            
            if (!result.success) {
                throw new Error(result.message || '图标设置失败');
            }
            
            // 延迟刷新启动器
            setTimeout(async () => {
                try {
                    await IconPlugin.refreshLauncher();
                    console.log('启动器刷新请求已发送');
                } catch (error) {
                    console.warn('刷新启动器失败:', error);
                }
            }, 1500);
            
        } catch (error) {
            console.error('移动端图标设置失败:', error);
            throw error;
        }
    }

    /**
     * 获取当前图标的调试信息
     */
    getDebugInfo(): any {
        const currentIconId = this.getCurrentIcon();
        const currentIcon = ICON_OPTIONS.find(option => option.id === currentIconId);
        
        return {
            platform: Capacitor.getPlatform(),
            isNative: Capacitor.isNativePlatform(),
            currentIconId,
            currentIcon,
            availableIcons: ICON_OPTIONS.map(icon => ({
                id: icon.id,
                name: icon.name,
                hasDesktopIcon: !!icon.desktopIcon,
                hasMobileIcon: !!icon.mobileIcon
            })),
            favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href'),
            appleTouchIcon: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href'),
            hasElectronIPC: !!(window as any).ipcRenderer,
            hasIconPlugin: !!(window as any).IconPlugin
        };
    }

    /**
     * 手动刷新启动器（仅Android）
     */
    async refreshLauncher(): Promise<{ success: boolean; message: string }> {
        if (!Capacitor.isNativePlatform()) {
            return { success: false, message: '仅Android平台支持启动器刷新' };
        }

        try {
            const { default: IconPlugin } = await import('../plugins/IconPlugin');
            const result = await IconPlugin.refreshLauncher();
            return { success: result.success, message: result.message || '启动器刷新完成' };
        } catch (error: any) {
            console.error('刷新启动器失败:', error);
            return { success: false, message: error.message || '刷新启动器失败' };
        }
    }

    /**
     * 重置到默认图标
     */
    async resetToDefault(): Promise<{ success: boolean; message: string }> {
        return await this.setIcon('default');
    }
}

export const iconService = new IconService();
