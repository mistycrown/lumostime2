/**
 * @file navigationIconService.ts
 * @input Built-in navigation icon packs, uploaded icon images, and saved schemes
 * @output Persisted navigation icon scheme selection and icon URLs
 * @pos Service (UI Customization)
 * @description Manages text, built-in, and user-created image schemes for the five navigation slots.
 * @updated 2026-09-25: Added multiple editable custom schemes with legacy selection migration.
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
}

export const NAVIGATION_ICON_CHANGE_EVENT = 'navigationIconChange';
export const NAVIGATION_ICON_SELECTION_KEY = 'navigation_icon_selection_v1';
export const NAVIGATION_ICON_CUSTOM_KEY = 'navigation_icon_custom_list_v1';
export const NAVIGATION_ICON_SCHEMES_KEY = 'navigation_icon_schemes_v1';

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

    getSlots(): NavigationIconSlot[] { return NAVIGATION_SLOTS; }
    getBuiltInIcons(): NavigationIconOption[] { return this.builtIn; }

    private loadCustomIcons(): NavigationIconOption[] {
        if (typeof localStorage === 'undefined') return [];
        try {
            const raw = localStorage.getItem(NAVIGATION_ICON_CUSTOM_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    }

    private saveCustomIcons(icons: NavigationIconOption[]): void {
        if (typeof localStorage !== 'undefined') localStorage.setItem(NAVIGATION_ICON_CUSTOM_KEY, JSON.stringify(icons));
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
        if (changed) { this.saveCustomIcons(hydrated); this.emitChange(); }
    }

    getCustomIcons(): NavigationIconOption[] { return this.loadCustomIcons(); }
    getCustomSchemes(): NavigationIconScheme[] {
        return this.loadStoredSchemes().filter((scheme) => scheme?.type === 'custom' && typeof scheme.id === 'string');
    }

    getSelection(): NavigationIconSelection {
        const stored = this.readStoredSelection();
        let mode = stored.mode === 'pink' || stored.mode === 'custom' || stored.mode === 'text' ? stored.mode : 'text';
        const schemes = this.getCustomSchemes();
        const schemeId = mode === 'custom'
            ? (typeof stored.schemeId === 'string' && schemes.some((scheme) => scheme.id === stored.schemeId) ? stored.schemeId : schemes[0]?.id)
            : undefined;
        if (mode === 'custom' && !schemeId) mode = 'text';
        const activeScheme = schemeId ? schemes.find((scheme) => scheme.id === schemeId) : undefined;
        return {
            mode,
            schemeId,
            customMapping: activeScheme?.mapping || (stored.customMapping && typeof stored.customMapping === 'object' ? stored.customMapping : {})
        };
    }

    setMode(mode: NavigationIconMode): void { this.saveSelection({ ...this.getSelection(), mode }); }

    setActiveScheme(schemeId: string): void {
        const scheme = this.getCustomSchemes().find((item) => item.id === schemeId);
        if (scheme) this.saveSelection({ mode: 'custom', schemeId, customMapping: scheme.mapping });
    }

    createCustomScheme(name = '新方案'): NavigationIconScheme {
        const scheme: NavigationIconScheme = { id: `custom-scheme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: name.trim() || '新方案', type: 'custom', mapping: {} };
        this.saveSchemes([...this.getCustomSchemes(), scheme]);
        this.saveSelection({ mode: 'custom', schemeId: scheme.id, customMapping: {} });
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
            if (next) this.saveSelection({ mode: 'custom', schemeId: next.id, customMapping: next.mapping });
            else this.saveSelection({ mode: 'text', customMapping: {} });
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
        if (selection.mode === 'pink') return this.builtIn[NAVIGATION_SLOTS.indexOf(slot)];
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
