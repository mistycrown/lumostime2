/**
 * @file navigationIconService.ts
 * @input Built-in navigation icon packs, uploaded icon images, and slot mappings
 * @output Persisted navigation icon selection and icon URLs for the new navigation bar
 * @pos Service (UI Customization)
 * @description Manages text, built-in, and user-mapped image icons for the five navigation slots.
 */
import { resolveAssetPath } from '../utils/assetPath';
import { imageService } from './imageService';

export type NavigationIconSlot = 'record' | 'todo' | 'timeline' | 'review' | 'index';
export type NavigationIconMode = 'text' | 'pink' | 'custom';

export interface NavigationIconOption {
    id: string;
    name: string;
    type: 'preset' | 'custom';
    url: string;
    imageFilename?: string;
}

export interface NavigationIconSelection {
    mode: NavigationIconMode;
    customMapping: Partial<Record<NavigationIconSlot, string>>;
}

export const NAVIGATION_ICON_CHANGE_EVENT = 'navigationIconChange';
export const NAVIGATION_ICON_SELECTION_KEY = 'navigation_icon_selection_v1';
export const NAVIGATION_ICON_CUSTOM_KEY = 'navigation_icon_custom_list_v1';

const NAVIGATION_SLOTS: NavigationIconSlot[] = ['record', 'todo', 'timeline', 'review', 'index'];

export const getNavigationIconFallbackUrl = (url: string): string => (
    resolveAssetPath(url.replace(/\.webp(?=$|[?#])/i, '.png'))
);

class NavigationIconService {
    private readonly builtIn: NavigationIconOption[] = [1, 2, 3, 4, 5].map((number) => ({
        id: `pink-${number}`,
        name: String(number),
        type: 'preset' as const,
        url: resolveAssetPath(`/dchhicon/pink/${number}.webp`)
    }));

    constructor() {
        void this.hydrateCustomIcons();
    }

    getSlots(): NavigationIconSlot[] {
        return NAVIGATION_SLOTS;
    }

    getBuiltInIcons(): NavigationIconOption[] {
        return this.builtIn;
    }

    private loadCustomIcons(): NavigationIconOption[] {
        if (typeof localStorage === 'undefined') return [];
        try {
            const raw = localStorage.getItem(NAVIGATION_ICON_CUSTOM_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    private saveCustomIcons(icons: NavigationIconOption[]): void {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(NAVIGATION_ICON_CUSTOM_KEY, JSON.stringify(icons));
    }

    async hydrateCustomIcons(): Promise<void> {
        const icons = this.loadCustomIcons();
        let changed = false;
        const hydrated = await Promise.all(icons.map(async (icon) => {
            if (!icon.imageFilename) return icon;
            const url = await imageService.getImageUrl(icon.imageFilename).catch(() => '');
            if (!url || url === icon.url) return icon;
            changed = true;
            return { ...icon, url };
        }));
        if (changed) {
            this.saveCustomIcons(hydrated);
            this.emitChange();
        }
    }

    getCustomIcons(): NavigationIconOption[] {
        return this.loadCustomIcons();
    }

    getSelection(): NavigationIconSelection {
        if (typeof localStorage === 'undefined') {
            return { mode: 'text', customMapping: {} };
        }
        try {
            const raw = localStorage.getItem(NAVIGATION_ICON_SELECTION_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed?.mode === 'pink' || parsed?.mode === 'custom' || parsed?.mode === 'text') {
                return {
                    mode: parsed.mode,
                    customMapping: parsed.customMapping && typeof parsed.customMapping === 'object'
                        ? parsed.customMapping
                        : {}
                };
            }
        } catch {
            // Fall through to the safe text default.
        }
        return { mode: 'text', customMapping: {} };
    }

    setMode(mode: NavigationIconMode): void {
        this.saveSelection({ ...this.getSelection(), mode });
    }

    setCustomMapping(slot: NavigationIconSlot, iconId: string | null): void {
        const selection = this.getSelection();
        const customMapping = { ...selection.customMapping };
        if (iconId) customMapping[slot] = iconId;
        else delete customMapping[slot];
        this.saveSelection({ mode: 'custom', customMapping });
    }

    private saveSelection(selection: NavigationIconSelection): void {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(NAVIGATION_ICON_SELECTION_KEY, JSON.stringify(selection));
        this.emitChange();
    }

    async addCustomIcon(file: File): Promise<NavigationIconOption> {
        const imageFilename = await imageService.saveImage(file, 'theme');
        const url = await imageService.getImageUrl(imageFilename);
        const icon: NavigationIconOption = {
            id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            type: 'custom',
            url,
            imageFilename
        };
        this.saveCustomIcons([...this.loadCustomIcons(), icon]);
        this.emitChange();
        return icon;
    }

    async deleteCustomIcon(iconId: string): Promise<boolean> {
        const icons = this.loadCustomIcons();
        const target = icons.find((icon) => icon.id === iconId);
        if (!target) return false;
        this.saveCustomIcons(icons.filter((icon) => icon.id !== iconId));
        if (target.imageFilename) {
            await imageService.deleteImage(target.imageFilename).catch(() => undefined);
        }
        const selection = this.getSelection();
        const customMapping = Object.fromEntries(
            Object.entries(selection.customMapping).filter(([, value]) => value !== iconId)
        ) as Partial<Record<NavigationIconSlot, string>>;
        this.saveSelection({ ...selection, customMapping });
        return true;
    }

    getIconForSlot(slot: NavigationIconSlot): NavigationIconOption | undefined {
        const selection = this.getSelection();
        if (selection.mode === 'text') return undefined;
        if (selection.mode === 'pink') {
            return this.builtIn[NAVIGATION_SLOTS.indexOf(slot)];
        }
        const iconId = selection.customMapping[slot];
        return this.getCustomIcons().find((icon) => icon.id === iconId);
    }

    private emitChange(): void {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(NAVIGATION_ICON_CHANGE_EVENT));
        }
    }
}

export const navigationIconService = new NavigationIconService();
