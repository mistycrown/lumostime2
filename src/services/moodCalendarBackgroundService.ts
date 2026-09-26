/**
 * @file moodCalendarBackgroundService.ts
 * @input Built-in and uploaded Memoir mood-calendar background images
 * @output Current background, persisted tuning settings, and preview events
 * @pos Service (UI Customization)
 * @description Keeps Memoir mood-calendar background assets independent from navigation decoration settings.
 * @updated 2026-09-25: Added persisted five-week/six-week scale mapping for the Memoir mood calendar.
 */
import { resolveAssetPath } from '../utils/assetPath';
import { imageService } from './imageService';

export type MoodCalendarWeekScale = {
    fiveWeek?: number;
    sixWeek?: number;
};

export type MoodCalendarBackgroundSettings = {
    offsetY?: string;
    offsetX?: string;
    scale?: number;
    opacity?: number;
    weekScale?: MoodCalendarWeekScale;
};

export interface MoodCalendarBackgroundOption extends MoodCalendarBackgroundSettings {
    id: string;
    name: string;
    type: 'preset' | 'custom';
    url: string;
    thumbnail?: string;
    imageFilename?: string;
}

const CURRENT_KEY = 'mood_calendar_background';
const SETTINGS_KEY = 'mood_calendar_background_settings';
const CUSTOM_KEY = 'mood_calendar_background_custom_list';

export const MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT = 'moodCalendarBackgroundChange';
export const MOOD_CALENDAR_BACKGROUND_PREVIEW_EVENT = 'moodCalendarBackgroundPreview';

const DEFAULT_SETTINGS: Required<Omit<MoodCalendarBackgroundSettings, 'weekScale'>> & { weekScale: Required<MoodCalendarWeekScale> } = {
    offsetY: '0px',
    offsetX: '0px',
    scale: 1.35,
    opacity: 1,
    weekScale: {
        fiveWeek: 1,
        sixWeek: 0.86
    }
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const normalizeWeekScale = (value: MoodCalendarWeekScale | undefined): Required<MoodCalendarWeekScale> => ({
    fiveWeek: clamp(Number(value?.fiveWeek ?? DEFAULT_SETTINGS.weekScale.fiveWeek) || DEFAULT_SETTINGS.weekScale.fiveWeek, 0.5, 1.5),
    sixWeek: clamp(Number(value?.sixWeek ?? DEFAULT_SETTINGS.weekScale.sixWeek) || DEFAULT_SETTINGS.weekScale.sixWeek, 0.5, 1.5)
});

const normalizeSettings = (settings: MoodCalendarBackgroundSettings | undefined): MoodCalendarBackgroundSettings => ({
    offsetY: settings?.offsetY || DEFAULT_SETTINGS.offsetY,
    offsetX: settings?.offsetX || DEFAULT_SETTINGS.offsetX,
    scale: clamp(Number(settings?.scale ?? DEFAULT_SETTINGS.scale) || DEFAULT_SETTINGS.scale, 0.1, 3),
    opacity: clamp(Number(settings?.opacity ?? DEFAULT_SETTINGS.opacity) || 0, 0, 1),
    weekScale: normalizeWeekScale(settings?.weekScale)
});

export const getMoodCalendarMappedScale = (
    settings: MoodCalendarBackgroundSettings,
    weekCount: number
): number => {
    const weekScale = normalizeWeekScale(settings.weekScale);
    return (settings.scale || DEFAULT_SETTINGS.scale) * (weekCount >= 6 ? weekScale.sixWeek : weekScale.fiveWeek);
};

class MoodCalendarBackgroundService {
    private readonly builtIn: MoodCalendarBackgroundOption[] = [
        {
            id: 'none',
            name: '无背景',
            type: 'preset',
            url: '',
            ...DEFAULT_SETTINGS
        },
        {
            id: 'calendar-1',
            name: '兔子云朵',
            type: 'preset',
            url: '/calendar/1.webp',
            offsetY: '0px',
            offsetX: '0px',
            scale: 1.35,
            opacity: 1,
            weekScale: { ...DEFAULT_SETTINGS.weekScale, sixWeek: 0.86 }
        }
    ];

    constructor() {
        if (typeof localStorage !== 'undefined') {
            void this.hydrateCustomBackgrounds();
        }
    }

    getCurrentBackground(): string {
        const current = localStorage.getItem(CURRENT_KEY);
        return this.getAllBackgrounds().some((background) => background.id === current)
            ? current || 'none'
            : 'none';
    }

    setCurrentBackground(backgroundId: string): void {
        const nextId = this.getAllBackgrounds().some((background) => background.id === backgroundId)
            ? backgroundId
            : 'none';
        localStorage.setItem(CURRENT_KEY, nextId);
        window.dispatchEvent(new CustomEvent(MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT, { detail: { backgroundId: nextId } }));
    }

    private loadCustomBackgrounds(): MoodCalendarBackgroundOption[] {
        try {
            const stored = localStorage.getItem(CUSTOM_KEY);
            const parsed = stored ? JSON.parse(stored) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    private saveCustomBackgrounds(backgrounds: MoodCalendarBackgroundOption[]): void {
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(backgrounds));
    }

    async hydrateCustomBackgrounds(): Promise<void> {
        const backgrounds = this.loadCustomBackgrounds();
        let changed = false;
        const hydrated = await Promise.all(backgrounds.map(async (background) => {
            if (!background.imageFilename) return background;
            const url = await imageService.getImageUrl(background.imageFilename);
            if (!url || url === background.url) return background;
            changed = true;
            return { ...background, url, thumbnail: url };
        }));

        if (changed) {
            this.saveCustomBackgrounds(hydrated);
            window.dispatchEvent(new CustomEvent(MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT, {
                detail: { backgroundId: this.getCurrentBackground() }
            }));
        }
    }

    getAllBackgrounds(): MoodCalendarBackgroundOption[] {
        return [
            ...this.builtIn.map((background) => ({
                ...background,
                url: background.url ? resolveAssetPath(background.url) : '',
                thumbnail: background.thumbnail ? resolveAssetPath(background.thumbnail) : background.thumbnail
            })),
            ...this.loadCustomBackgrounds().map((background) => ({
                ...background,
                ...normalizeSettings(background)
            }))
        ];
    }

    getBackgroundById(id: string): MoodCalendarBackgroundOption | undefined {
        const background = this.getAllBackgrounds().find((item) => item.id === id);
        if (!background) return undefined;
        const settings = this.getCustomSettings()[id];
        return { ...background, ...normalizeSettings({ ...background, ...settings }) };
    }

    getBackgroundDefaultsById(id: string): MoodCalendarBackgroundOption | undefined {
        const background = this.getAllBackgrounds().find((item) => item.id === id);
        return background ? { ...background, ...normalizeSettings(background) } : undefined;
    }

    getCustomSettings(): Record<string, MoodCalendarBackgroundSettings> {
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);
            const parsed = stored ? JSON.parse(stored) : {};
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    }

    saveCustomSettings(backgroundId: string, settings: MoodCalendarBackgroundSettings): void {
        const allSettings = this.getCustomSettings();
        allSettings[backgroundId] = normalizeSettings({ ...allSettings[backgroundId], ...settings });
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(allSettings));
        window.dispatchEvent(new CustomEvent(MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT, { detail: { backgroundId } }));
    }

    async addCustomBackground(file: File): Promise<MoodCalendarBackgroundOption> {
        const imageFilename = await imageService.saveImage(file, 'theme');
        const url = await imageService.getImageUrl(imageFilename);
        const background: MoodCalendarBackgroundOption = {
            id: `mood_calendar_custom_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            type: 'custom',
            url,
            thumbnail: url,
            imageFilename,
            ...DEFAULT_SETTINGS
        };
        this.saveCustomBackgrounds([...this.loadCustomBackgrounds(), background]);
        return background;
    }

    async deleteCustomBackground(backgroundId: string): Promise<boolean> {
        const backgrounds = this.loadCustomBackgrounds();
        const target = backgrounds.find((background) => background.id === backgroundId);
        if (!target) return false;
        const wasCurrent = this.getCurrentBackground() === backgroundId;

        this.saveCustomBackgrounds(backgrounds.filter((background) => background.id !== backgroundId));
        if (target.imageFilename) {
            await imageService.deleteImage(target.imageFilename).catch(() => undefined);
        }
        if (wasCurrent) {
            this.setCurrentBackground('none');
        } else {
            window.dispatchEvent(new CustomEvent(MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT, { detail: { backgroundId: this.getCurrentBackground() } }));
        }
        return true;
    }
}

export const moodCalendarBackgroundService = new MoodCalendarBackgroundService();
