/**
 * @file navigationIconService.ts
 * @input Uploaded and theme-package navigation icon images and saved schemes
 * @output Persisted navigation icon scheme selection and icon URLs
 * @pos Service (UI Customization)
 * @description Manages text and user-created image schemes for the five navigation slots.
 * @updated 2026-09-25: Added multiple editable custom schemes with legacy selection migration.
 * @updated 2026-09-26: Added persisted opt-in labels below image navigation icons.
 * @updated 2026-09-28: Removed the packaged pink icon set and migrate its saved selection to text.
 * @updated 2026-09-30: Added a normalized size scale for custom navigation images.
 * @updated 2026-10-05: Keeps resolved image URLs in memory and compacts legacy metadata without quota failures.
 */
import { resolveAssetPath } from '../utils/assetPath';
import { imageService } from './imageService';
import { ImageAssetListStorage } from './imageAssetListStorage';

export type NavigationIconSlot = 'record' | 'todo' | 'timeline' | 'review' | 'index';
export type NavigationIconMode = 'text' | 'custom';

export interface NavigationIconOption {
    id: string;
    name: string;
    type: 'preset' | 'custom';
    url: string;
    imageFilename?: string;
}

export interface NavigationIconScheme {
    id: string;
    name: string;
    type: 'preset' | 'custom';
    mapping: Partial<Record<NavigationIconSlot, string>>;
}

export interface NavigationIconSelection {
    mode: NavigationIconMode;
    schemeId?: string;
    customMapping: Partial<Record<NavigationIconSlot, string>>;
    showLabelWithIcon: boolean;
    iconScale: number;
}

export const NAVIGATION_ICON_CHANGE_EVENT = 'navigationIconChange';
export const NAVIGATION_ICON_SELECTION_KEY = 'navigation_icon_selection_v1';
export const NAVIGATION_ICON_CUSTOM_KEY = 'navigation_icon_custom_list_v1';
export const NAVIGATION_ICON_SCHEMES_KEY = 'navigation_icon_schemes_v1';
export const NAVIGATION_ICON_SCALE_MIN = 70;
export const NAVIGATION_ICON_SCALE_MAX = 140;
export const DEFAULT_NAVIGATION_ICON_SCALE = 100;

const NAVIGATION_SLOTS: NavigationIconSlot[] = ['record', 'todo', 'timeline', 'review', 'index'];

export const normalizeNavigationIconScale = (value: unknown): number => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_NAVIGATION_ICON_SCALE;
    return Math.min(NAVIGATION_ICON_SCALE_MAX, Math.max(NAVIGATION_ICON_SCALE_MIN, Math.round(value)));
};

export const getNavigationIconFallbackUrl = (url: string): string => (
    resolveAssetPath(url.replace(/\.webp(?=$|[?#])/i, '.png'))
);

class NavigationIconService {
    private readonly customIcons = new ImageAssetListStorage<NavigationIconOption>(NAVIGATION_ICON_CUSTOM_KEY);

    constructor() {
        void this.hydrateCustomIcons();
    }

    getSlots(): NavigationIconSlot[] { return NAVIGATION_SLOTS; }

    private loadCustomIcons(): NavigationIconOption[] {
        return this.customIcons.load();
    }

    private saveCustomIcons(icons: NavigationIconOption[]): void {
        this.customIcons.save(icons);
    }

    private readStoredSelection(): Partial<NavigationIconSelection> {
        if (typeof localStorage === 'undefined') return {};
        try {
            const raw = localStorage.getItem(NAVIGATION_ICON_SELECTION_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch { return {}; }
    }

    private loadStoredSchemes(): NavigationIconScheme[] {
        if (typeof localStorage === 'undefined') return [];
        try {
            const raw = localStorage.getItem(NAVIGATION_ICON_SCHEMES_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch { return []; }
        const legacy = this.readStoredSelection();
        if (legacy.mode === 'custom' && legacy.customMapping && typeof legacy.customMapping === 'object') {
            return [{ id: 'custom-default', name: '自定义方案', type: 'custom', mapping: legacy.customMapping }];
        }
        return [];
    }

    private saveSchemes(schemes: NavigationIconScheme[]): void {
        if (typeof localStorage !== 'undefined') localStorage.setItem(NAVIGATION_ICON_SCHEMES_KEY, JSON.stringify(schemes));
    }

    hydrateCustomIcons(): Promise<void> {
        return this.customIcons.hydrate(() => this.emitChange());
    }

    getCustomIcons(): NavigationIconOption[] { return this.loadCustomIcons(); }
    getCustomSchemes(): NavigationIconScheme[] {
        return this.loadStoredSchemes().filter((scheme) => scheme?.type === 'custom' && typeof scheme.id === 'string');
    }

    getSelection(): NavigationIconSelection {
        const stored = this.readStoredSelection();
        let mode = stored.mode === 'custom' || stored.mode === 'text' ? stored.mode : 'text';
        const schemes = this.getCustomSchemes();
        const schemeId = mode === 'custom'
            ? (typeof stored.schemeId === 'string' && schemes.some((scheme) => scheme.id === stored.schemeId) ? stored.schemeId : schemes[0]?.id)
            : undefined;
        if (mode === 'custom' && !schemeId) mode = 'text';
        const activeScheme = schemeId ? schemes.find((scheme) => scheme.id === schemeId) : undefined;
        return {
            mode,
            schemeId,
            customMapping: activeScheme?.mapping || (stored.customMapping && typeof stored.customMapping === 'object' ? stored.customMapping : {}),
            showLabelWithIcon: stored.showLabelWithIcon === true,
            iconScale: normalizeNavigationIconScale(stored.iconScale)
        };
    }

    setMode(mode: NavigationIconMode): void { this.saveSelection({ ...this.getSelection(), mode }); }

    setShowLabelWithIcon(enabled: boolean): void {
        this.saveSelection({ ...this.getSelection(), showLabelWithIcon: enabled });
    }

    setIconScale(scale: number): void {
        this.saveSelection({ ...this.getSelection(), iconScale: normalizeNavigationIconScale(scale) });
    }

    setActiveScheme(schemeId: string): void {
        const scheme = this.getCustomSchemes().find((item) => item.id === schemeId);
        if (scheme) this.saveSelection({ ...this.getSelection(), mode: 'custom', schemeId, customMapping: scheme.mapping });
    }

    createCustomScheme(name = '新方案'): NavigationIconScheme {
        const scheme: NavigationIconScheme = { id: `custom-scheme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: name.trim() || '新方案', type: 'custom', mapping: {} };
        this.saveSchemes([...this.getCustomSchemes(), scheme]);
        this.saveSelection({ ...this.getSelection(), mode: 'custom', schemeId: scheme.id, customMapping: {} });
        return scheme;
    }

    updateCustomScheme(schemeId: string, updates: Partial<Pick<NavigationIconScheme, 'name' | 'mapping'>>): void {
        const schemes = this.getCustomSchemes().map((scheme) => scheme.id === schemeId ? { ...scheme, ...updates, name: updates.name?.trim() || scheme.name } : scheme);
        this.saveSchemes(schemes);
        const selection = this.getSelection();
        if (selection.schemeId === schemeId) this.saveSelection({ ...selection, customMapping: schemes.find((scheme) => scheme.id === schemeId)?.mapping || {} });
        else this.emitChange();
    }

    deleteCustomScheme(schemeId: string): boolean {
        const schemes = this.getCustomSchemes();
        if (!schemes.some((scheme) => scheme.id === schemeId)) return false;
        const remaining = schemes.filter((scheme) => scheme.id !== schemeId);
        this.saveSchemes(remaining);
        const selection = this.getSelection();
        if (selection.schemeId === schemeId) {
            const next = remaining[0];
            if (next) this.saveSelection({ ...selection, mode: 'custom', schemeId: next.id, customMapping: next.mapping });
            else this.saveSelection({ ...selection, mode: 'text', customMapping: {} });
        } else this.emitChange();
        return true;
    }

    setSchemeMapping(schemeId: string, slot: NavigationIconSlot, iconId: string | null): void {
        const scheme = this.getCustomSchemes().find((item) => item.id === schemeId);
        if (!scheme) return;
        const mapping = { ...scheme.mapping };
        if (iconId) mapping[slot] = iconId; else delete mapping[slot];
        this.updateCustomScheme(schemeId, { mapping });
    }

    async addCustomIcon(file: File): Promise<NavigationIconOption> {
        const imageFilename = await imageService.saveImage(file, 'theme');
        const url = await imageService.getImageUrl(imageFilename);
        const icon: NavigationIconOption = { id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, name: file.name.replace(/\.[^/.]+$/, ''), type: 'custom', url, imageFilename };
        this.saveCustomIcons([...this.loadCustomIcons(), icon]);
        this.emitChange();
        return icon;
    }

    async deleteCustomIcon(iconId: string): Promise<boolean> {
        const icons = this.loadCustomIcons();
        const target = icons.find((icon) => icon.id === iconId);
        if (!target) return false;
        this.saveCustomIcons(icons.filter((icon) => icon.id !== iconId));
        if (target.imageFilename) await imageService.deleteImage(target.imageFilename).catch(() => undefined);
        this.saveSchemes(this.getCustomSchemes().map((scheme) => ({ ...scheme, mapping: Object.fromEntries(Object.entries(scheme.mapping).filter(([, value]) => value !== iconId)) })));
        const selection = this.getSelection();
        this.saveSelection({ ...selection, customMapping: Object.fromEntries(Object.entries(selection.customMapping).filter(([, value]) => value !== iconId)) });
        return true;
    }

    getIconForSlot(slot: NavigationIconSlot): NavigationIconOption | undefined {
        const selection = this.getSelection();
        if (selection.mode === 'text') return undefined;
        return this.getCustomIcons().find((icon) => icon.id === selection.customMapping[slot]);
    }

    getPreviewIconForScheme(scheme: NavigationIconScheme): NavigationIconOption | undefined {
        const firstMappedIconId = NAVIGATION_SLOTS.map((slot) => scheme.mapping[slot]).find(Boolean);
        return this.getCustomIcons().find((icon) => icon.id === firstMappedIconId) || this.getCustomIcons()[0];
    }

    private saveSelection(selection: NavigationIconSelection): void {
        if (typeof localStorage !== 'undefined') { localStorage.setItem(NAVIGATION_ICON_SELECTION_KEY, JSON.stringify(selection)); this.emitChange(); }
    }

    private emitChange(): void {
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(NAVIGATION_ICON_CHANGE_EVENT));
    }
}

export const navigationIconService = new NavigationIconService();
