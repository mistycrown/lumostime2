/**
 * @file navigationBackgroundService.ts
 * @input Uploaded and theme-package navigation background image files
 * @output New navigation background selection, persistence, and adjustment events
 * @pos Service (UI Customization)
 * @description Keeps the new navigation-background mode isolated from the legacy foreground decoration mode.
 * @updated 2026-09-25: Registers uploaded navigation backgrounds in the theme image manifest group.
 * @updated 2026-09-25: Added a persisted transparent-navigation toggle for the supported primary pages.
 * @updated 2026-09-26: Added a built-in no-background option that restores the default navigation surface.
 * @updated 2026-09-28: Removed the packaged background image and migrate its saved selection to no background.
 * @updated 2026-09-28: Persists independent vertical stretching for new navigation backgrounds.
 * @updated 2026-10-05: Stores file references only and keeps hydrated background images in memory.
 */
import { resolveAssetPath } from '../utils/assetPath';
import { imageService } from './imageService';
import { ImageAssetListStorage } from './imageAssetListStorage';
import type { NavigationDecorationOption } from './navigationDecorationService';

export type NavigationBackgroundSettings = {
    offsetY?: string;
    offsetX?: string;
    scale?: number;
    verticalStretch?: number;
    opacity?: number;
};

const ENABLED_KEY = 'navigation_new_mode_enabled';
const CURRENT_KEY = 'navigation_new_background';
const SETTINGS_KEY = 'navigation_new_background_settings';
const CUSTOM_KEY = 'navigation_new_background_custom_list';
const TRANSPARENT_NAVIGATION_KEY = 'navigation_transparent_enabled';

export const NAVIGATION_BACKGROUND_MODE_CHANGE_EVENT = 'navigationBackgroundModeChange';
export const NAVIGATION_BACKGROUND_CHANGE_EVENT = 'navigationBackgroundChange';
export const NAVIGATION_BACKGROUND_PREVIEW_EVENT = 'navigationBackgroundPreview';
export const NAVIGATION_TRANSPARENCY_CHANGE_EVENT = 'navigationTransparencyChange';

class NavigationBackgroundService {
    private readonly customBackgrounds = new ImageAssetListStorage<NavigationDecorationOption>(CUSTOM_KEY);
    private readonly builtIn: NavigationDecorationOption[] = [
        {
            id: 'new-none',
            name: '无背景',
            type: 'preset',
            url: ''
        },
    ];

    constructor() {
        void this.hydrateCustomBackgrounds();
    }

    isEnabled(): boolean {
        return localStorage.getItem(ENABLED_KEY) === 'true';
    }

    setEnabled(enabled: boolean): void {
        localStorage.setItem(ENABLED_KEY, String(enabled));
        window.dispatchEvent(new CustomEvent(NAVIGATION_BACKGROUND_MODE_CHANGE_EVENT, { detail: { enabled } }));
    }

    isTransparentNavigationEnabled(): boolean {
        return localStorage.getItem(TRANSPARENT_NAVIGATION_KEY) === 'true';
    }

    setTransparentNavigationEnabled(enabled: boolean): void {
        localStorage.setItem(TRANSPARENT_NAVIGATION_KEY, String(enabled));
        window.dispatchEvent(new CustomEvent(NAVIGATION_TRANSPARENCY_CHANGE_EVENT, { detail: { enabled } }));
    }

    getCurrentBackground(): string {
        const currentId = localStorage.getItem(CURRENT_KEY) || 'new-none';
        if (currentId === 'new-default' || !this.getAllBackgrounds().some((background) => background.id === currentId)) {
            return 'new-none';
        }
        return currentId;
    }

    setCurrentBackground(backgroundId: string): void {
        const resolvedId = this.getAllBackgrounds().some((background) => background.id === backgroundId)
            ? backgroundId
            : 'new-none';
        localStorage.setItem(CURRENT_KEY, resolvedId);
        window.dispatchEvent(new CustomEvent(NAVIGATION_BACKGROUND_CHANGE_EVENT, { detail: { backgroundId: resolvedId } }));
    }

    private loadCustomBackgrounds(): NavigationDecorationOption[] {
        return this.customBackgrounds.load();
    }

    private saveCustomBackgrounds(backgrounds: NavigationDecorationOption[]): void {
        this.customBackgrounds.save(backgrounds);
    }

    hydrateCustomBackgrounds(): Promise<void> {
        return this.customBackgrounds.hydrate(() => {
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(NAVIGATION_BACKGROUND_CHANGE_EVENT, {
                detail: { backgroundId: this.getCurrentBackground() }
            }));
        });
    }

    getAllBackgrounds(): NavigationDecorationOption[] {
        return [
            ...this.builtIn.map((background) => ({
                ...background,
                url: resolveAssetPath(background.url),
                thumbnail: background.thumbnail ? resolveAssetPath(background.thumbnail) : background.thumbnail
            })),
            ...this.loadCustomBackgrounds()
        ];
    }

    getBackgroundById(id: string): NavigationDecorationOption | undefined {
        const background = this.getAllBackgrounds().find((item) => item.id === id);
        if (!background) return undefined;
        const settings = this.getCustomSettings()[id];
        return {
            ...background,
            ...settings,
            verticalStretch: settings?.verticalStretch ?? background.verticalStretch ?? 1
        };
    }

    getCustomSettings(): Record<string, NavigationBackgroundSettings> {
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    }

    saveCustomSettings(backgroundId: string, settings: NavigationBackgroundSettings): void {
        const allSettings = this.getCustomSettings();
        allSettings[backgroundId] = { ...allSettings[backgroundId], ...settings };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(allSettings));
        window.dispatchEvent(new CustomEvent(NAVIGATION_BACKGROUND_CHANGE_EVENT, { detail: { backgroundId } }));
    }

    async addCustomBackground(file: File): Promise<NavigationDecorationOption> {
        const imageFilename = await imageService.saveImage(file, 'theme');
        const url = await imageService.getImageUrl(imageFilename);
        const background: NavigationDecorationOption = {
            id: `new_custom_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            type: 'custom',
            url,
            thumbnail: url,
            imageFilename,
            offsetY: '0px',
            offsetX: '0px',
            scale: 1,
            opacity: 1
        };
        this.saveCustomBackgrounds([...this.loadCustomBackgrounds(), background]);
        return background;
    }

    async deleteCustomBackground(backgroundId: string): Promise<boolean> {
        const backgrounds = this.loadCustomBackgrounds();
        const target = backgrounds.find((background) => background.id === backgroundId);
        if (!target) return false;

        this.saveCustomBackgrounds(backgrounds.filter((background) => background.id !== backgroundId));
        if (target.imageFilename) {
            await imageService.deleteImage(target.imageFilename).catch(() => undefined);
        }
        if (this.getCurrentBackground() === backgroundId) {
            this.setCurrentBackground('new-none');
        }
        return true;
    }
}

export const navigationBackgroundService = new NavigationBackgroundService();
