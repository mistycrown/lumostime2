/**
 * @file useCustomPresets.test.ts
 * @description Unit tests for useCustomPresets hook
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCustomPresets, ThemePreset, getValidationErrorMessage } from './useCustomPresets';

// Mock SettingsContext
vi.mock('../contexts/SettingsContext', () => ({
    useSettings: () => ({
        uiIconTheme: 'purple',
        colorScheme: 'morandi-purple'
    })
}));

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        }
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('useCustomPresets', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    describe('Initial state', () => {
        it('should start with empty presets when localStorage is empty', () => {
            const { result } = renderHook(() => useCustomPresets());
            
            expect(result.current.customPresets).toEqual([]);
            expect(result.current.isLoading).toBe(false);
        });

        it('should load existing presets from localStorage', () => {
            const mockPresets: ThemePreset[] = [
                {
                    id: 'custom_1',
                    name: 'Test Preset',
                    description: '自定义方案',
                    icon: '✨',
                    appIcon: 'icon_simple',
                    uiTheme: 'purple',
                    colorScheme: 'morandi-purple',
                    background: 'default',
                    navigation: 'default',
                    timePal: 'none',
                    isCustom: true,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                }
            ];

            localStorageMock.setItem('lumostime_custom_presets', JSON.stringify(mockPresets));

            const { result } = renderHook(() => useCustomPresets());
            
            expect(result.current.customPresets).toHaveLength(1);
            expect(result.current.customPresets[0].name).toBe('Test Preset');
        });
    });

    describe('addCustomPreset', () => {
        it('should add a new custom preset', () => {
            const { result } = renderHook(() => useCustomPresets());

            act(() => {
                const response = result.current.addCustomPreset('My Custom Theme');
                expect(response.success).toBe(true);
                expect(response.preset).toBeDefined();
            });

            expect(result.current.customPresets).toHaveLength(1);
            expect(result.current.customPresets[0].name).toBe('My Custom Theme');
            expect(result.current.customPresets[0].isCustom).toBe(true);
        });

        it('should reject empty names', () => {
            const { result } = renderHook(() => useCustomPresets());

            act(() => {
                const response = result.current.addCustomPreset('   ');
                expect(response.success).toBe(false);
                expect(response.error).toBe('EMPTY_NAME');
            });

            expect(result.current.customPresets).toHaveLength(0);
        });

        it('should reject names longer than 50 characters', () => {
            const { result } = renderHook(() => useCustomPresets());

            act(() => {
                const longName = 'a'.repeat(51);
                const response = result.current.addCustomPreset(longName);
                expect(response.success).toBe(false);
                expect(response.error).toBe('NAME_TOO_LONG');
            });

            expect(result.current.customPresets).toHaveLength(0);
        });

        it('should reject duplicate names', () => {
            const { result } = renderHook(() => useCustomPresets());

            act(() => {
                result.current.addCustomPreset('Duplicate Name');
            });

            act(() => {
                const response = result.current.addCustomPreset('Duplicate Name');
                expect(response.success).toBe(false);
                expect(response.error).toBe('DUPLICATE_NAME');
            });

            expect(result.current.customPresets).toHaveLength(1);
        });

        it('should trim whitespace from names', () => {
            const { result } = renderHook(() => useCustomPresets());

            act(() => {
                result.current.addCustomPreset('  Trimmed Name  ');
            });

            expect(result.current.customPresets[0].name).toBe('Trimmed Name');
        });
    });

    describe('updateCustomPreset', () => {
        it('should update an existing preset', () => {
            const { result } = renderHook(() => useCustomPresets());

            let presetId: string;

            act(() => {
                const response = result.current.addCustomPreset('Original Name');
                presetId = response.preset!.id;
            });

            act(() => {
                const updatedPreset = {
                    ...result.current.customPresets[0],
                    name: 'Updated Name',
                    description: 'Updated description'
                };
                const response = result.current.updateCustomPreset(updatedPreset);
                expect(response.success).toBe(true);
            });

            expect(result.current.customPresets[0].name).toBe('Updated Name');
            expect(result.current.customPresets[0].description).toBe('Updated description');
        });

        it('should reject invalid names when updating', () => {
            const { result } = renderHook(() => useCustomPresets());

            act(() => {
                result.current.addCustomPreset('Original Name');
            });

            act(() => {
                const updatedPreset = {
                    ...result.current.customPresets[0],
                    name: ''
                };
                const response = result.current.updateCustomPreset(updatedPreset);
                expect(response.success).toBe(false);
                expect(response.error).toBe('EMPTY_NAME');
            });

            expect(result.current.customPresets[0].name).toBe('Original Name');
        });

        it('should allow updating to same name', () => {
            const { result } = renderHook(() => useCustomPresets());

            act(() => {
                result.current.addCustomPreset('Same Name');
            });

            act(() => {
                const updatedPreset = {
                    ...result.current.customPresets[0],
                    description: 'Updated description'
                };
                const response = result.current.updateCustomPreset(updatedPreset);
                expect(response.success).toBe(true);
            });
        });
    });

    describe('deleteCustomPreset', () => {
        it('should delete a preset', () => {
            const { result } = renderHook(() => useCustomPresets());

            let presetId: string;

            act(() => {
                const response = result.current.addCustomPreset('To Delete');
                presetId = response.preset!.id;
            });

            expect(result.current.customPresets).toHaveLength(1);

            act(() => {
                const success = result.current.deleteCustomPreset(presetId);
                expect(success).toBe(true);
            });

            expect(result.current.customPresets).toHaveLength(0);
        });

        it('should clear current preset ID if deleted preset was current', () => {
            const { result } = renderHook(() => useCustomPresets());

            let presetId: string;

            act(() => {
                const response = result.current.addCustomPreset('Current Preset');
                presetId = response.preset!.id;
            });

            localStorageMock.setItem('lumostime_current_preset', presetId);

            act(() => {
                result.current.deleteCustomPreset(presetId);
            });

            expect(localStorageMock.getItem('lumostime_current_preset')).toBeNull();
        });
    });

    describe('getCustomPresetById', () => {
        it('should return preset by ID', () => {
            const { result } = renderHook(() => useCustomPresets());

            let presetId: string;

            act(() => {
                const response = result.current.addCustomPreset('Find Me');
                presetId = response.preset!.id;
            });

            const found = result.current.getCustomPresetById(presetId);
            expect(found).toBeDefined();
            expect(found?.name).toBe('Find Me');
        });

        it('should return undefined for non-existent ID', () => {
            const { result } = renderHook(() => useCustomPresets());

            const found = result.current.getCustomPresetById('non_existent');
            expect(found).toBeUndefined();
        });
    });

    describe('isPresetNameValid', () => {
        it('should validate preset names', () => {
            const { result } = renderHook(() => useCustomPresets());

            act(() => {
                result.current.addCustomPreset('Existing Name');
            });

            expect(result.current.isPresetNameValid('New Name')).toBe(true);
            expect(result.current.isPresetNameValid('Existing Name')).toBe(false);
            expect(result.current.isPresetNameValid('')).toBe(false);
            expect(result.current.isPresetNameValid('a'.repeat(51))).toBe(false);
        });
    });

    describe('getValidationErrorMessage', () => {
        it('should return correct error messages', () => {
            expect(getValidationErrorMessage('EMPTY_NAME')).toBe('方案名称不能为空');
            expect(getValidationErrorMessage('NAME_TOO_LONG')).toBe('方案名称不能超过 50 个字符');
            expect(getValidationErrorMessage('DUPLICATE_NAME')).toBe('方案名称已存在，请使用其他名称');
            expect(getValidationErrorMessage('INVALID_DATA')).toBe('方案数据不完整，请重试');
            expect(getValidationErrorMessage(null)).toBe('');
        });
    });
});
