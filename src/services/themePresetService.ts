/**
 * @file themePresetService.ts
 * @input ThemePreset data and setter callbacks from settings-related views
 * @output Theme application result and synchronized preset updates
 * @pos Service (Theme Management)
 * @description Centralized theme preset application service. Applies theme-related settings in a consistent order and handles icon migration side effects.
 *
 * @updated 2026-03-28: Added achievement bottle icon-pack support so preset save/apply keeps bottle sprites in sync.
 */

import { ThemePreset } from '../hooks/useCustomPresets';
import { THEME_KEYS, TIMEPAL_KEYS, storage } from '../constants/storageKeys';
import { backgroundService } from './backgroundService';
import { navigationDecorationService } from './navigationDecorationService';
import { DEFAULT_ACHIEVEMENT_BOTTLE_STYLE, type AchievementBottleStyle } from './achievementBottleStyleService';
import { DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK, type AchievementBottleIconPack } from './achievementBottleIconPackService';

export interface ThemeApplyResult {
    success: boolean;
    message: string;
    needsReload?: boolean;
}

export class ThemePresetService {
    static async applyUiTheme(theme: string, setUiIconTheme: (theme: string) => void): Promise<void> {
        console.log('[ThemePresetService] apply UI theme:', theme);
        setUiIconTheme(theme);
    }

    static async applyColorScheme(scheme: string, setColorScheme: (scheme: string) => void): Promise<void> {
        console.log('[ThemePresetService] apply color scheme:', scheme);
        setColorScheme(scheme);
    }

    static async applyBackground(background: string): Promise<void> {
        console.log('[ThemePresetService] apply background:', background);
        backgroundService.setCurrentBackground(background);

        setTimeout(() => {
            backgroundService.applyBackgroundToElements();
        }, 100);
    }

    static async applyNavigation(navigation: string): Promise<void> {
        console.log('[ThemePresetService] apply navigation decoration:', navigation);
        navigationDecorationService.setCurrentDecoration(navigation);
    }

    static async applyTimePal(timePal: string): Promise<void> {
        console.log('[ThemePresetService] apply time pal:', timePal);
        storage.set(TIMEPAL_KEYS.TYPE, timePal);
        window.dispatchEvent(new Event('timepal-type-changed'));
    }

    static async applyAchievementBottleStyle(
        bottleStyle: AchievementBottleStyle,
        setAchievementBottleStyle: (style: AchievementBottleStyle) => void
    ): Promise<void> {
        console.log('[ThemePresetService] apply achievement bottle style:', bottleStyle);
        setAchievementBottleStyle(bottleStyle);
    }

    static async applyAchievementBottleIconPack(
        iconPack: AchievementBottleIconPack,
        setAchievementBottleIconPack: (pack: AchievementBottleIconPack) => void
    ): Promise<void> {
        console.log('[ThemePresetService] apply achievement bottle icon pack:', iconPack);
        setAchievementBottleIconPack(iconPack);
    }

    static saveCurrentPreset(presetId: string, setCurrentPresetId: (id: string) => void): void {
        console.log('[ThemePresetService] save current preset:', presetId);
        storage.set(THEME_KEYS.CURRENT_PRESET, presetId);
        setCurrentPresetId(presetId);
    }

    static async handleIconMigration(oldTheme: string, newTheme: string): Promise<ThemeApplyResult> {
        if (oldTheme === 'default' && newTheme !== 'default') {
            try {
                const { iconMigrationService } = await import('./iconMigrationService');

                if (!iconMigrationService.isUiIconGenerated()) {
                    console.log('[ThemePresetService] first custom UI theme switch, generating uiIcon...');

                    const result = await iconMigrationService.generateAllUiIcons();

                    if (result.success) {
                        console.log('[ThemePresetService] uiIcon generation succeeded:', result);
                        return {
                            success: true,
                            message: `${result.message}, reloading...`,
                            needsReload: true
                        };
                    }

                    console.error('[ThemePresetService] uiIcon generation failed:', result);
                    return {
                        success: false,
                        message: result.message
                    };
                }

                console.log('[ThemePresetService] uiIcon already exists, switching theme directly');
            } catch (error) {
                console.error('[ThemePresetService] icon migration failed:', error);
                return {
                    success: false,
                    message: 'Icon migration failed. Please try again.'
                };
            }
        }

        if (oldTheme !== 'default' && newTheme === 'default') {
            console.log('[ThemePresetService] switched back to default UI theme without migration');
        }

        return { success: true, message: '' };
    }

    static getAppIconMessage(preset: ThemePreset): string {
        return `Applied preset "${preset.name}"`;
    }

    static async applyThemePreset(
        preset: ThemePreset,
        oldTheme: string,
        setUiIconTheme: (theme: string) => void,
        setColorScheme: (scheme: string) => void,
        setAchievementBottleStyle: (style: AchievementBottleStyle) => void,
        setAchievementBottleIconPack: (pack: AchievementBottleIconPack) => void,
        setCurrentPresetId: (id: string) => void
    ): Promise<ThemeApplyResult> {
        try {
            console.log('[ThemePresetService] switch preset:', { from: oldTheme, to: preset.uiTheme });

            await this.applyUiTheme(preset.uiTheme, setUiIconTheme);
            await this.applyColorScheme(preset.colorScheme, setColorScheme);
            await this.applyBackground(preset.background);
            await this.applyNavigation(preset.navigation);
            await this.applyTimePal(preset.timePal);
            await this.applyAchievementBottleStyle(
                preset.achievementBottleStyle || DEFAULT_ACHIEVEMENT_BOTTLE_STYLE,
                setAchievementBottleStyle
            );
            await this.applyAchievementBottleIconPack(
                preset.achievementBottleIconPack || DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK,
                setAchievementBottleIconPack
            );

            this.saveCurrentPreset(preset.id, setCurrentPresetId);

            const migrationResult = await this.handleIconMigration(oldTheme, preset.uiTheme);
            if (!migrationResult.success || migrationResult.needsReload) {
                return migrationResult;
            }

            return {
                success: true,
                message: this.getAppIconMessage(preset)
            };
        } catch (error) {
            console.error('[ThemePresetService] preset application failed:', error);
            return {
                success: false,
                message: 'Applying the preset failed. Please try again.'
            };
        }
    }
}
