/**
 * @file statusBarService.ts
 * @input Background images, StatusBar plugin, EdgeToEdge plugin
 * @output Transparent status bar with adaptive icon colors
 * @pos Service (UI Customization)
 * @description 状态栏管理服务 - 让状态栏背景透明，并根据背景图片自动调整图标颜色
 * 
 * 核心功能：
 * - 使用 EdgeToEdge 设置状态栏背景为透明
 * - 分析背景图片顶部区域的亮度
 * - 根据背景亮度自动调整状态栏图标颜色
 * @updated 2026-05-03: Switched EdgeToEdge access from CommonJS `require()` to the plugin's ESM entry so Android WebView bundles can initialize without browser-side `require` failures.
 * @updated 2026-04-20: Cached per-image analysis results so background opacity tweaks no longer trigger redundant mobile image sampling.
 * @updated 2026-07-22: Keeps the native status bar black while the app is in dark mode.
 */

import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import NativeStatusBarAppearance from '../plugins/NativeStatusBarAppearancePlugin';
import { applyAndroidEdgeToEdgeBackgroundColor } from '../utils/statusBarTransitions';

// 动态导入 EdgeToEdge 插件（仅 Android）

const MANAGED_ANDROID_STATUS_BAR_BACKGROUND = '#fdfbf7';
const DARK_ANDROID_STATUS_BAR_BACKGROUND = '#000000';

interface ColorAnalysis {
    isDark: boolean;
    dominantColor: string;
    brightness: number;
}

class StatusBarService {
    private currentStyle: Style = Style.Light;
    private isInitialized = false;
    private imageAnalysisCache = new Map<string, ColorAnalysis>();
    private currentBackgroundUrl: string | null = null;

    private async applyAndroidStatusBarAppearance(color: string, lightIcons: boolean): Promise<void> {
        await applyAndroidEdgeToEdgeBackgroundColor(EdgeToEdge, color);
        await NativeStatusBarAppearance.apply({ color, lightIcons });
    }

    /**
     * 初始化状态栏服务 - 设置为透明背景
     */
    async init(): Promise<void> {
        if (this.isInitialized) return;
        
        const platform = Capacitor.getPlatform();
        if (platform !== 'android' && platform !== 'ios') {
            console.log('⚠️ StatusBar: Not on mobile platform, skipping initialization');
            return;
        }

        try {
            // Android: 使用 EdgeToEdge 设置透明状态栏
            if (platform === 'android' && EdgeToEdge) {
                // 设置状态栏背景为透明
                await this.applyAndroidStatusBarAppearance(MANAGED_ANDROID_STATUS_BAR_BACKGROUND, false);
                console.log('✅ Android: Status bar set to transparent');
            }
            
            // iOS: 使用 setOverlaysWebView
            if (platform === 'ios') {
                await StatusBar.setOverlaysWebView({ overlay: true });
                console.log('✅ iOS: Status bar overlay enabled');
            }
            
            // 设置默认图标样式
            await StatusBar.setStyle({ style: Style.Light });
            this.currentStyle = Style.Light;
            
            this.isInitialized = true;
            new MutationObserver(() => {
                void this.updateForBackground(this.currentBackgroundUrl);
            }).observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['data-theme-mode']
            });
            console.log('✅ StatusBar service initialized with transparent background');
        } catch (error) {
            console.error('❌ StatusBar initialization failed:', error);
        }
    }

    /**
     * 分析图片顶部区域的亮度
     */
    private async analyzeImage(imageUrl: string): Promise<ColorAnalysis> {
        const cachedAnalysis = this.imageAnalysisCache.get(imageUrl);
        if (cachedAnalysis) {
            return cachedAnalysis;
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    if (!ctx) {
                        reject(new Error('Failed to get canvas context'));
                        return;
                    }

                    // 只分析图片顶部区域（状态栏所在位置，约50-100px）
                    const sampleHeight = Math.min(100, img.height);
                    canvas.width = img.width;
                    canvas.height = sampleHeight;
                    
                    ctx.drawImage(img, 0, 0, img.width, sampleHeight, 0, 0, img.width, sampleHeight);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;
                    
                    let r = 0, g = 0, b = 0;
                    let count = 0;
                    
                    // 采样像素（每隔10个像素采样一次）
                    for (let i = 0; i < data.length; i += 40) {
                        r += data[i];
                        g += data[i + 1];
                        b += data[i + 2];
                        count++;
                    }
                    
                    // 计算平均颜色
                    r = Math.round(r / count);
                    g = Math.round(g / count);
                    b = Math.round(b / count);
                    
                    // 计算感知亮度
                    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                    
                    // 判断是深色还是浅色
                    const isDark = brightness < 0.5;
                    
                    const dominantColor = `rgb(${r}, ${g}, ${b})`;
                    
                    const analysis = {
                        isDark,
                        dominantColor,
                        brightness
                    };
                    this.imageAnalysisCache.set(imageUrl, analysis);
                    resolve(analysis);
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            img.src = imageUrl;
        });
    }

    /**
     * 根据背景图片URL更新状态栏（保持透明背景，调整图标颜色）
     */
    async updateForBackground(backgroundUrl: string | null): Promise<void> {
        this.currentBackgroundUrl = backgroundUrl;

        const platform = Capacitor.getPlatform();
        if (platform !== 'android' && platform !== 'ios') {
            return;
        }

        try {
            const isDarkMode = document.documentElement.getAttribute('data-theme-mode') === 'dark';

            if (isDarkMode) {
                if (platform === 'android' && EdgeToEdge) {
                    await this.applyAndroidStatusBarAppearance(DARK_ANDROID_STATUS_BAR_BACKGROUND, true);
                } else if (platform === 'ios') {
                    await StatusBar.setOverlaysWebView({ overlay: true });
                }

                await this.setIconStyle(Style.Dark);
                return;
            }

            // 确保状态栏背景保持透明
            if (platform === 'android' && EdgeToEdge) {
                await this.applyAndroidStatusBarAppearance(MANAGED_ANDROID_STATUS_BAR_BACKGROUND, false);
            } else if (platform === 'ios') {
                await StatusBar.setOverlaysWebView({ overlay: true });
            }
            
            // 如果没有背景或是默认背景，使用深色图标
            if (!backgroundUrl || backgroundUrl === '') {
                await this.setIconStyle(Style.Light);
                return;
            }

            // 分析背景图片
            const analysis = await this.analyzeImage(backgroundUrl);
            
            // 根据背景亮度设置图标颜色
            // 深色背景 → 浅色图标（白色）
            // 浅色背景 → 深色图标（黑色）
            const newStyle = analysis.isDark ? Style.Dark : Style.Light;
            
            await this.setIconStyle(newStyle);
            
            console.log(`🎨 StatusBar updated: brightness=${analysis.brightness.toFixed(2)}, icons=${newStyle === Style.Dark ? 'Light (White)' : 'Dark (Black)'}`);
        } catch (error) {
            console.error('❌ Failed to update status bar for background:', error);
            // 出错时使用默认样式
            await this.setIconStyle(Style.Light);
        }
    }

    /**
     * 设置状态栏图标样式（保持透明背景）
     */
    private async setIconStyle(style: Style): Promise<void> {
        if (this.currentStyle === style) {
            return;
        }

        try {
            await StatusBar.setStyle({ style });
            this.currentStyle = style;
        } catch (error) {
            console.error('❌ Failed to set status bar icon style:', error);
        }
    }

    /**
     * 重置状态栏为默认样式（透明背景 + 深色图标）
     */
    async reset(): Promise<void> {
        const platform = Capacitor.getPlatform();
        
        if (platform === 'android' && EdgeToEdge) {
            await this.applyAndroidStatusBarAppearance(MANAGED_ANDROID_STATUS_BAR_BACKGROUND, false);
        } else if (platform === 'ios') {
            await StatusBar.setOverlaysWebView({ overlay: true });
        }
        
        await this.setIconStyle(Style.Light);
    }

    /**
     * 获取当前状态栏图标样式
     */
    getCurrentStyle(): Style {
        return this.currentStyle;
    }
}

export const statusBarService = new StatusBarService();

// 在开发环境中暴露到全局，便于调试
if (typeof window !== 'undefined') {
    (window as any).statusBarService = statusBarService;
}
