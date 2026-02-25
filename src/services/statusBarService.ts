/**
 * @file statusBarService.ts
 * @input Background images, StatusBar plugin
 * @output Dynamic status bar styling based on background
 * @pos Service (UI Customization)
 * @description 状态栏管理服务 - 根据背景图片自动调整状态栏颜色和样式
 * 
 * 核心功能：
 * - 分析背景图片的主色调
 * - 根据背景亮度自动调整状态栏样式
 * - 支持自定义状态栏背景色
 */

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

interface ColorAnalysis {
    isDark: boolean;
    dominantColor: string;
    brightness: number;
}

class StatusBarService {
    private currentStyle: Style = Style.Light;
    private isInitialized = false;

    /**
     * 初始化状态栏服务
     */
    async init(): Promise<void> {
        if (this.isInitialized) return;
        
        const platform = Capacitor.getPlatform();
        if (platform !== 'android' && platform !== 'ios') {
            console.log('⚠️ StatusBar: Not on mobile platform, skipping initialization');
            return;
        }

        try {
            // 设置默认样式
            await StatusBar.setStyle({ style: Style.Light });
            this.currentStyle = Style.Light;
            this.isInitialized = true;
            console.log('✅ StatusBar service initialized');
        } catch (error) {
            console.error('❌ StatusBar initialization failed:', error);
        }
    }

    /**
     * 分析图片的主色调和亮度
     */
    private async analyzeImage(imageUrl: string): Promise<ColorAnalysis> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            
            img.onload = () => {
                try {
                    // 创建 canvas 来分析图片
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    if (!ctx) {
                        reject(new Error('Failed to get canvas context'));
                        return;
                    }

                    // 只分析图片顶部区域（状态栏所在位置）
                    const sampleHeight = Math.min(100, img.height);
                    canvas.width = img.width;
                    canvas.height = sampleHeight;
                    
                    ctx.drawImage(img, 0, 0, img.width, sampleHeight, 0, 0, img.width, sampleHeight);
                    
                    // 获取像素数据
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;
                    
                    let r = 0, g = 0, b = 0;
                    let count = 0;
                    
                    // 采样像素（每隔10个像素采样一次以提高性能）
                    for (let i = 0; i < data.length; i += 40) { // RGBA，所以是4的倍数
                        r += data[i];
                        g += data[i + 1];
                        b += data[i + 2];
                        count++;
                    }
                    
                    // 计算平均颜色
                    r = Math.round(r / count);
                    g = Math.round(g / count);
                    b = Math.round(b / count);
                    
                    // 计算亮度（使用感知亮度公式）
                    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                    
                    // 判断是深色还是浅色（阈值为0.5）
                    const isDark = brightness < 0.5;
                    
                    const dominantColor = `rgb(${r}, ${g}, ${b})`;
                    
                    resolve({
                        isDark,
                        dominantColor,
                        brightness
                    });
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
     * 根据背景图片URL更新状态栏样式
     */
    async updateForBackground(backgroundUrl: string | null): Promise<void> {
        const platform = Capacitor.getPlatform();
        if (platform !== 'android' && platform !== 'ios') {
            return;
        }

        try {
            // 如果没有背景或是默认背景，使用浅色状态栏
            if (!backgroundUrl || backgroundUrl === '') {
                await this.setStyle(Style.Light);
                return;
            }

            // 分析背景图片
            const analysis = await this.analyzeImage(backgroundUrl);
            
            // 根据背景亮度设置状态栏样式
            // 如果背景是深色的，使用浅色图标（Style.Dark）
            // 如果背景是浅色的，使用深色图标（Style.Light）
            const newStyle = analysis.isDark ? Style.Dark : Style.Light;
            
            await this.setStyle(newStyle);
            
            console.log(`🎨 StatusBar updated: brightness=${analysis.brightness.toFixed(2)}, style=${newStyle === Style.Dark ? 'Dark' : 'Light'}`);
        } catch (error) {
            console.error('❌ Failed to update status bar for background:', error);
            // 出错时使用默认样式
            await this.setStyle(Style.Light);
        }
    }

    /**
     * 设置状态栏样式
     */
    private async setStyle(style: Style): Promise<void> {
        if (this.currentStyle === style) {
            return; // 避免重复设置
        }

        try {
            await StatusBar.setStyle({ style });
            this.currentStyle = style;
        } catch (error) {
            console.error('❌ Failed to set status bar style:', error);
        }
    }

    /**
     * 重置状态栏为默认样式
     */
    async reset(): Promise<void> {
        await this.setStyle(Style.Light);
    }

    /**
     * 获取当前状态栏样式
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
