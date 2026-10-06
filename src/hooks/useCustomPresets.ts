/**
 * @file useCustomPresets.ts
 * @input SettingsContext (uiIconTheme, colorScheme), LocalStorage (custom presets data)
 * @output Immutable saved theme snapshots with create, delete, and name validation
 * @pos Hook (Data Manager)
 * @description 自定义主题方案 Hook - 管理完整外观快照，支持新增、删除和名称验证
 * @updated 2026-09-26: Saves full appearance snapshots and removes editing operations.
 * @updated 2026-09-28: Adds optional modern-navigation and Memoir calendar selections for legacy built-in presets.
 * @updated 2026-09-28: Adds optional card-background and font selections for legacy built-in presets.
 * @updated 2026-10-05: Compacts legacy snapshot image URLs on load/save and reports failed preset persistence.
 * @updated 2026-10-06: Marks persisted edits immediately, refreshes restored lists, and mutates the latest stored presets.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { THEME_KEYS, TIMEPAL_KEYS, storage } from '../constants/storageKeys';
import { sanitizeThemePresetsForStorage } from '../utils/imageAssetStorage';
import { markLocalDataEdited } from '../utils/localDataTimestamp';
import { APPEARANCE_RESTORED_EVENT } from '../services/appearanceBackupService';
import type { AchievementBottleStyle } from '../services/achievementBottleStyleService';
import type { AchievementBottleIconPack } from '../services/achievementBottleIconPackService';
import type { NavigationIconMode } from '../services/navigationIconService';
import {
    captureThemeSettingsSnapshot,
    deleteUnusedSnapshotImages,
    type ThemeSettingsSnapshot
} from '../services/themeSnapshotService';

/** @updated 2026-09-26: Stores full immutable appearance snapshots for newly saved themes. */

// Theme preset interface
export interface ModernNavigationPreset {
    enabled: boolean;
    background: string;
    transparent: boolean;
    iconMode: NavigationIconMode;
    showLabelWithIcon: boolean;
}

export interface ThemePreset {
    id: string;
    name: string;
    description: string;
    icon: string;
    appIcon: string;
    uiTheme: string;
    colorScheme: string;
    background: string;
    navigation: string;
    navigationMode?: 'legacy' | 'modern';
    modernNavigation?: ModernNavigationPreset;
    memoirCalendarBackground?: string;
    cardBackgroundGroupId?: string | null;
    fontId?: string;
    timePal: string;
    achievementBottleStyle?: AchievementBottleStyle;
    achievementBottleIconPack?: AchievementBottleIconPack;
    snapshot?: ThemeSettingsSnapshot;
    isCustom?: boolean;
    createdAt?: number;
    updatedAt?: number;
}

// Validation error types
export type ValidationError = 
    | 'EMPTY_NAME'
    | 'NAME_TOO_LONG'
    | 'DUPLICATE_NAME'
    | 'INVALID_DATA'
    | 'STORAGE_ERROR'
    | null;

export const CUSTOM_PRESETS_CHANGED_EVENT = 'lumostime:custom-presets-changed';

const notifyPresetsChanged = (): void => {
    // The durable edit marker also protects saves made before the first sync audit.
    // A notification failure must not turn an already persisted save into a failed save.
    try {
        markLocalDataEdited();
    } catch (error) {
        console.error('[useCustomPresets] Failed to mark preset edit for sync:', error);
    }
    window.dispatchEvent(new Event(CUSTOM_PRESETS_CHANGED_EVENT));
};

/**
 * Load custom presets from LocalStorage
 */
const loadCustomPresets = (): ThemePreset[] => {
    try {
        const presets = storage.getJSON<ThemePreset[]>(THEME_KEYS.CUSTOM_PRESETS, []);
        const compacted = sanitizeThemePresetsForStorage(presets);
        if (JSON.stringify(compacted) !== JSON.stringify(presets)) {
            storage.setJSON(THEME_KEYS.CUSTOM_PRESETS, compacted);
        }
        // Filter out invalid presets
        return compacted.filter(preset => validatePresetData(preset));
    } catch (error) {
        console.error('[useCustomPresets] Failed to load custom presets:', error);
        return [];
    }
};

/**
 * Save custom presets to LocalStorage
 */
const saveCustomPresets = (presets: ThemePreset[]): ThemePreset[] => {
    try {
        const compacted = sanitizeThemePresetsForStorage(presets);
        if (!storage.setJSON(THEME_KEYS.CUSTOM_PRESETS, compacted)) {
            throw new Error('Failed to persist custom presets');
        }
        return compacted;
    } catch (error) {
        console.error('[useCustomPresets] Failed to save custom presets:', error);
        throw new Error('保存失败，请重试');
    }
};

/**
 * Validate preset data structure
 */
const validatePresetData = (preset: any): preset is ThemePreset => {
    return !!(
        preset &&
        typeof preset === 'object' &&
        preset.id &&
        preset.name &&
        preset.uiTheme &&
        preset.colorScheme &&
        preset.background &&
        preset.navigation &&
        preset.timePal
    );
};

/**
 * Validate preset name
 */
const validatePresetName = (
    name: string,
    existingPresets: ThemePreset[],
    excludeId?: string
): ValidationError => {
    const trimmedName = name.trim();
    
    // Check if empty
    if (!trimmedName) {
        return 'EMPTY_NAME';
    }
    
    // Check length
    if (trimmedName.length > 50) {
        return 'NAME_TOO_LONG';
    }
    
    // Check for duplicates
    const isDuplicate = existingPresets.some(
        preset => preset.name === trimmedName && preset.id !== excludeId
    );
    
    if (isDuplicate) {
        return 'DUPLICATE_NAME';
    }
    
    return null;
};

/**
 * Get error message for validation error
 */
export const getValidationErrorMessage = (error: ValidationError): string => {
    switch (error) {
        case 'EMPTY_NAME':
            return '方案名称不能为空';
        case 'NAME_TOO_LONG':
            return '方案名称不能超过 50 个字符';
        case 'DUPLICATE_NAME':
            return '方案名称已存在，请使用其他名称';
        case 'INVALID_DATA':
            return '方案数据不完整，请重试';
        case 'STORAGE_ERROR':
            return '方案保存失败，请重试';
        default:
            return '';
    }
};

/**
 * Hook for managing custom theme presets
 */
export const useCustomPresets = () => {
    const { uiIconTheme, colorScheme, achievementBottleStyle, achievementBottleIconPack } = useSettings();
    const [customPresets, setCustomPresets] = useState<ThemePreset[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Restores and other mounted instances can replace the persisted list.
    useEffect(() => {
        const reload = () => {
            setCustomPresets(loadCustomPresets());
            setIsLoading(false);
        };
        const onStorage = (event: StorageEvent) => {
            if (event.storageArea === localStorage && (event.key === THEME_KEYS.CUSTOM_PRESETS || event.key === null)) {
                reload();
            }
        };
        reload();
        window.addEventListener(APPEARANCE_RESTORED_EVENT, reload);
        window.addEventListener(CUSTOM_PRESETS_CHANGED_EVENT, reload);
        window.addEventListener('storage', onStorage);
        return () => {
            window.removeEventListener(APPEARANCE_RESTORED_EVENT, reload);
            window.removeEventListener(CUSTOM_PRESETS_CHANGED_EVENT, reload);
            window.removeEventListener('storage', onStorage);
        };
    }, []);

    /**
     * Create a new custom preset from current settings
     */
    const createCustomPreset = useCallback((name: string): ThemePreset => {
        const timestamp = Date.now();
        
        return {
            id: `custom_${timestamp}_${crypto.randomUUID()}`,
            name: name.trim(),
            description: '自定义方案',
            icon: '',
            appIcon: storage.get(THEME_KEYS.UI_ICON_THEME) || 'icon_simple',
            uiTheme: uiIconTheme,
            colorScheme: colorScheme,
            background: storage.get(THEME_KEYS.CURRENT_BACKGROUND) || 'default',
            navigation: storage.get(THEME_KEYS.NAVIGATION_DECORATION) || 'default',
            timePal: storage.get(TIMEPAL_KEYS.TYPE) || 'none',
            achievementBottleStyle,
            achievementBottleIconPack,
            navigationMode: localStorage.getItem('navigation_new_mode_enabled') === 'true' ? 'modern' : 'legacy',
            snapshot: captureThemeSettingsSnapshot(),
            isCustom: true,
            createdAt: timestamp,
            updatedAt: timestamp
        };
    }, [achievementBottleIconPack, achievementBottleStyle, colorScheme, uiIconTheme]);

    /**
     * Add a new custom preset
     */
    const addCustomPreset = useCallback((name: string): { success: boolean; error?: ValidationError; preset?: ThemePreset } => {
        try {
            // Do not overwrite a restore or another save with an old React closure.
            const latestPresets = loadCustomPresets();
            const validationError = validatePresetName(name, latestPresets);
            if (validationError) {
                return { success: false, error: validationError };
            }
            const newPreset = createCustomPreset(name);
            if (!validatePresetData(newPreset)) {
                return { success: false, error: 'INVALID_DATA' };
            }
            const updatedPresets = saveCustomPresets([...latestPresets, newPreset]);
            
            setCustomPresets(updatedPresets);
            notifyPresetsChanged();
            
            return { success: true, preset: newPreset };
        } catch (error) {
            console.error('[useCustomPresets] Failed to add preset:', error);
            return { success: false, error: 'STORAGE_ERROR' };
        }
    }, [createCustomPreset]);

    /**
     * Delete a custom preset
     */
    const deleteCustomPreset = useCallback((presetId: string): boolean => {
        try {
            const latestPresets = loadCustomPresets();
            const deleted = latestPresets.find((preset) => preset.id === presetId);
            if (!deleted) return false;
            const updatedPresets = saveCustomPresets(latestPresets.filter(preset => preset.id !== presetId));
            
            setCustomPresets(updatedPresets);
            
            // If deleted preset was current, clear current preset ID
            const currentPresetId = storage.get(THEME_KEYS.CURRENT_PRESET);
            if (currentPresetId === presetId) {
                storage.remove(THEME_KEYS.CURRENT_PRESET);
            }
            notifyPresetsChanged();
            if (deleted.snapshot) void deleteUnusedSnapshotImages(deleted.snapshot);
            
            return true;
        } catch (error) {
            console.error('[useCustomPresets] Failed to delete preset:', error);
            return false;
        }
    }, []);

    /**
     * Check if a preset name is valid
     */
    const isPresetNameValid = useCallback((name: string, excludeId?: string): boolean => {
        return validatePresetName(name, customPresets, excludeId) === null;
    }, [customPresets]);

    return {
        customPresets,
        isLoading,
        addCustomPreset,
        deleteCustomPreset,
        isPresetNameValid,
        validatePresetName: (name: string, excludeId?: string) => 
            validatePresetName(name, customPresets, excludeId)
    };
};
