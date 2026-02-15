/**
 * @file themePresetService.ts
 * @input ThemePreset data, LocalStorage settings
 * @output Theme application result, Settings updates
 * @pos Service (Theme Management)
 * @description 主题预设应用服务 - 拆分复杂的主题切换逻辑
 * 
 * 核心功能：
 * - 主题预设应用
 * - 设置项批量更新
 * - 主题切换验证
 * - 错误处理和回滚
 * 
 * 支持的设置项：
 * - UI 图标主题
 * - 配色方案
 * - 背景图片
 * - 导航栏装饰
 * - TimePal 角色
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { Capacitor } from '@capacitor/core';
import { ThemePreset } from '../hooks/useCustomPresets';
import { THEME_KEYS, TIMEPAL_KEYS, storage } from '../constants/storageKeys';

export interface ThemeApplyResult {
    success: boolean;
    message: string;
    needsReload?: boolean;
}

/**
 * 主题预设应用服务
 */
export class ThemePresetService {
    /**
     * 应用 UI 主题
     */
    static async applyUiTheme(theme: string, setUiIconTheme: (theme: string) => void): Promise<void> {
        console.log('[ThemePresetService] 应用 UI 主题:', theme);
        setUiIconTheme(theme);
    }

    /**
     * 应用配色方案
     */
    static async applyColorScheme(scheme: string, setColorScheme: (scheme: string) => void): Promise<void> {
        console.log('[ThemePresetService] 应用配色方案:', scheme);
        setColorScheme(scheme);
    }

    /**
     * 应用背景图片
     */
    static async applyBackground(background: string): Promise<void> {
        console.log('[ThemePresetService] 应用背景:', background);
        const { backgroundService } = await import('./backgroundService');
        backgroundService.setCurrentBackground(background);
        
        // 延迟触发背景重新应用
        setTimeout(() => {
            backgroundService.applyBackgroundToElements();
        }, 100);
    }

    /**
     * 应用导航装饰
     */
    static async applyNavigation(navigation: string): Promise<void> {
        console.log('[ThemePresetService] 应用导航装饰:', navigation);
        const { navigationDecorationService } = await import('./navigationDecorationService');
        navigationDecorationService.setCurrentDecoration(navigation);
    }

    /**
     * 应用时光小友设置
     */
    static async applyTimePal(timePal: string): Promise<void> {
        console.log('[ThemePresetService] 应用时光小友:', timePal);
        storage.set(TIMEPAL_KEYS.TYPE, timePal);
        window.dispatchEvent(new Event('timepal-type-changed'));
    }

    /**
     * 保存当前预设 ID
     */
    static saveCurrentPreset(presetId: string, setCurrentPresetId: (id: string) => void): void {
        console.log('[ThemePresetService] 保存当前预设:', presetId);
        storage.set(THEME_KEYS.CURRENT_PRESET, presetId);
        setCurrentPresetId(presetId);
    }

    /**
     * 处理图标迁移（首次从 default 切换到自定义主题）
     */
    static async handleIconMigration(oldTheme: string, newTheme: string): Promise<ThemeApplyResult> {
        // 只在首次从 default 切换到自定义主题时生成 uiIcon
        if (oldTheme === 'default' && newTheme !== 'default') {
            try {
                const { iconMigrationService } = await import('./iconMigrationService');
                
                // 检查是否已经生成过 uiIcon
                if (!iconMigrationService.isUiIconGenerated()) {
                    console.log('[ThemePresetService] 首次切换到自定义主题，生成 uiIcon...');
                    
                    // 执行一次性生成
                    const result = await iconMigrationService.generateAllUiIcons();
                    
                    if (result.success) {
                        console.log('[ThemePresetService] uiIcon 生成成功:', result);
                        return {
                            success: true,
                            message: `${result.message}，正在刷新...`,
                            needsReload: true
                        };
                    } else {
                        console.error('[ThemePresetService] uiIcon 生成失败:', result);
                        return {
                            success: false,
                            message: result.message
                        };
                    }
                } else {
                    console.log('[ThemePresetService] uiIcon 已存在，直接切换主题');
                }
            } catch (error) {
                console.error('[ThemePresetService] 图标迁移失败:', error);
                return {
                    success: false,
                    message: '图标迁移失败，请重试'
                };
            }
        }
        
        // 从自定义主题切换回 default，或在自定义主题之间切换
        if (oldTheme !== 'default' && newTheme === 'default') {
            console.log('[ThemePresetService] 从自定义主题切换回默认主题，不做数据迁移');
        }
        
        return { success: true, message: '' };
    }

    /**
     * 生成应用图标提示消息
     */
    static getAppIconMessage(preset: ThemePreset): string {
        return `已应用"${preset.name}"主题方案`;
    }

    /**
     * 应用完整的主题预设
     */
    static async applyThemePreset(
        preset: ThemePreset,
        oldTheme: string,
        setUiIconTheme: (theme: string) => void,
        setColorScheme: (scheme: string) => void,
        setCurrentPresetId: (id: string) => void
    ): Promise<ThemeApplyResult> {
        try {
            console.log('[ThemePresetService] 主题切换:', { from: oldTheme, to: preset.uiTheme });
            
            // 1. 应用 UI 主题
            await this.applyUiTheme(preset.uiTheme, setUiIconTheme);
            
            // 2. 应用配色方案
            await this.applyColorScheme(preset.colorScheme, setColorScheme);
            
            // 3. 应用背景
            await this.applyBackground(preset.background);
            
            // 4. 应用导航装饰
            await this.applyNavigation(preset.navigation);
            
            // 5. 应用时光小友
            await this.applyTimePal(preset.timePal);
            
            // 6. 保存当前预设
            this.saveCurrentPreset(preset.id, setCurrentPresetId);
            
            // 7. 处理图标迁移
            const migrationResult = await this.handleIconMigration(oldTheme, preset.uiTheme);
            if (!migrationResult.success) {
                return migrationResult;
            }
            if (migrationResult.needsReload) {
                return migrationResult;
            }
            
            // 8. 生成成功消息
            const message = this.getAppIconMessage(preset);
            
            return {
                success: true,
                message
            };
            
        } catch (error) {
            console.error('[ThemePresetService] 执行主题方案切换失败:', error);
            return {
                success: false,
                message: '应用主题方案失败，请重试'
            };
        }
    }
}
