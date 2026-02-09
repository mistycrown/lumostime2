/**
 * @file useCustomPresets.ts
 * @description Hook for managing custom theme presets
 */
import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';

// LocalStorage key for custom presets
const CUSTOM_PRESETS_KEY = 'lumostime_custom_presets';
const CURRENT_PRESET_KEY = 'lumostime_current_preset';

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
        const data = localStorage.getItem(CUSTOM_PRESETS_KEY);
        if (!data) return [];
        
        const presets = JSON.parse(data) as ThemePreset[];
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
        localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets));
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
            appIcon: localStorage.getItem('lumostime_app_icon') || 'icon_simple',
            uiTheme: uiIconTheme,
            colorScheme: colorScheme,
            background: localStorage.getItem('lumos_current_background') || 'default',
            navigation: localStorage.getItem('navigation_decoration') || 'default',
            timePal: localStorage.getItem('lumostime_timepal_type') || 'none',
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
            const currentPresetId = localStorage.getItem(CURRENT_PRESET_KEY);
            if (currentPresetId === presetId) {
                localStorage.removeItem(CURRENT_PRESET_KEY);
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
