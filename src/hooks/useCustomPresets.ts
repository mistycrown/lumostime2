/**
 * @file useCustomPresets.ts
 * @description Hook for managing custom theme presets
 */
import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { THEME_KEYS, TIMEPAL_KEYS, storage } from '../constants/storageKeys';

// Theme preset interface
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
    timePal: string;
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
    | null;

/**
 * Load custom presets from LocalStorage
 */
const loadCustomPresets = (): ThemePreset[] => {
    try {
        const presets = storage.getJSON<ThemePreset[]>(THEME_KEYS.CUSTOM_PRESETS, []);
        // Filter out invalid presets
        return presets.filter(preset => validatePresetData(preset));
    } catch (error) {
        console.error('[useCustomPresets] Failed to load custom presets:', error);
        return [];
    }
};

/**
 * Save custom presets to LocalStorage
 */
const saveCustomPresets = (presets: ThemePreset[]): void => {
    try {
        storage.setJSON(THEME_KEYS.CUSTOM_PRESETS, presets);
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
        default:
            return '';
    }
};

/**
 * Hook for managing custom theme presets
 */
export const useCustomPresets = () => {
    const { uiIconTheme, colorScheme } = useSettings();
    const [customPresets, setCustomPresets] = useState<ThemePreset[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load custom presets on mount
    useEffect(() => {
        const presets = loadCustomPresets();
        setCustomPresets(presets);
        setIsLoading(false);
    }, []);

    /**
     * Create a new custom preset from current settings
     */
    const createCustomPreset = useCallback((name: string): ThemePreset => {
        const timestamp = Date.now();
        
        return {
            id: `custom_${timestamp}`,
            name: name.trim(),
            description: '自定义方案',
            icon: '',
            appIcon: storage.get(THEME_KEYS.UI_ICON_THEME) || 'icon_simple',
            uiTheme: uiIconTheme,
            colorScheme: colorScheme,
            background: storage.get(THEME_KEYS.CURRENT_BACKGROUND) || 'default',
            navigation: storage.get(THEME_KEYS.NAVIGATION_DECORATION) || 'default',
            timePal: storage.get(TIMEPAL_KEYS.TYPE) || 'none',
            isCustom: true,
            createdAt: timestamp,
            updatedAt: timestamp
        };
    }, [uiIconTheme, colorScheme]);

    /**
     * Add a new custom preset
     */
    const addCustomPreset = useCallback((name: string): { success: boolean; error?: ValidationError; preset?: ThemePreset } => {
        // Validate name
        const validationError = validatePresetName(name, customPresets);
        if (validationError) {
            return { success: false, error: validationError };
        }

        try {
            const newPreset = createCustomPreset(name);
            const updatedPresets = [...customPresets, newPreset];
            
            saveCustomPresets(updatedPresets);
            setCustomPresets(updatedPresets);
            
            return { success: true, preset: newPreset };
        } catch (error) {
            console.error('[useCustomPresets] Failed to add preset:', error);
            return { success: false, error: 'INVALID_DATA' };
        }
    }, [customPresets, createCustomPreset]);

    /**
     * Update an existing custom preset
     */
    const updateCustomPreset = useCallback((updatedPreset: ThemePreset): { success: boolean; error?: ValidationError } => {
        // Validate name
        const validationError = validatePresetName(updatedPreset.name, customPresets, updatedPreset.id);
        if (validationError) {
            return { success: false, error: validationError };
        }

        // Validate data
        if (!validatePresetData(updatedPreset)) {
            return { success: false, error: 'INVALID_DATA' };
        }

        try {
            const updatedPresets = customPresets.map(preset =>
                preset.id === updatedPreset.id
                    ? { ...updatedPreset, updatedAt: Date.now() }
                    : preset
            );
            
            saveCustomPresets(updatedPresets);
            setCustomPresets(updatedPresets);
            
            return { success: true };
        } catch (error) {
            console.error('[useCustomPresets] Failed to update preset:', error);
            return { success: false, error: 'INVALID_DATA' };
        }
    }, [customPresets]);

    /**
     * Delete a custom preset
     */
    const deleteCustomPreset = useCallback((presetId: string): boolean => {
        try {
            const updatedPresets = customPresets.filter(preset => preset.id !== presetId);
            
            saveCustomPresets(updatedPresets);
            setCustomPresets(updatedPresets);
            
            // If deleted preset was current, clear current preset ID
            const currentPresetId = storage.get(THEME_KEYS.CURRENT_PRESET);
            if (currentPresetId === presetId) {
                storage.remove(THEME_KEYS.CURRENT_PRESET);
            }
            
            return true;
        } catch (error) {
            console.error('[useCustomPresets] Failed to delete preset:', error);
            return false;
        }
    }, [customPresets]);

    /**
     * Get a custom preset by ID
     */
    const getCustomPresetById = useCallback((presetId: string): ThemePreset | undefined => {
        return customPresets.find(preset => preset.id === presetId);
    }, [customPresets]);

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
        updateCustomPreset,
        deleteCustomPreset,
        getCustomPresetById,
        isPresetNameValid,
        validatePresetName: (name: string, excludeId?: string) => 
            validatePresetName(name, customPresets, excludeId)
    };
};
