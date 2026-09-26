/**
 * @file moodCalendarBackgroundService.ts
 * @input Built-in and uploaded Memoir mood-calendar background images
 * @output Current background, persisted tuning settings, and preview events
 * @pos Service (UI Customization)
 * @description Keeps Memoir mood-calendar background assets independent from navigation decoration settings.
 * @updated 2026-09-26: Switched to paired five-week/six-week background images and removed week scaling.
 * @updated 2026-09-26: Persists single-image Fill backgrounds separately from paired Overflow backgrounds.
 */
import { resolveAssetPath } from '../utils/assetPath';
import { imageService } from './imageService';

export type MoodCalendarBackgroundSettings = {
    offsetY?: string;
    offsetX?: string;
    scale?: number;
    heightScale?: number;
    opacity?: number;
};

export type MoodCalendarBackgroundMode = 'overflow' | 'fill';

export interface MoodCalendarBackgroundOption extends MoodCalendarBackgroundSettings {
    id: string;
    name: string;
    type: 'preset' | 'custom';
    url: string;
    thumbnail?: string;
    sixWeekUrl?: string;
    sixWeekThumbnail?: string;
    imageFilename?: string;
    sixWeekImageFilename?: string;
}

const CURRENT_KEY = 'mood_calendar_background';
const SETTINGS_KEY = 'mood_calendar_background_settings';
const CUSTOM_KEY = 'mood_calendar_background_custom_list';
export const MOOD_CALENDAR_BACKGROUND_MODE_KEY = 'mood_calendar_background_mode';
export const FILL_MOOD_CALENDAR_BACKGROUND_CURRENT_KEY = 'mood_calendar_fill_background';
export const FILL_MOOD_CALENDAR_BACKGROUND_CUSTOM_KEY = 'mood_calendar_fill_background_custom_list';

export const MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT = 'moodCalendarBackgroundChange';
export const MOOD_CALENDAR_BACKGROUND_PREVIEW_EVENT = 'moodCalendarBackgroundPreview';

const DEFAULT_SETTINGS: Required<MoodCalendarBackgroundSettings> = {
    offsetY: '0px',
    offsetX: '0px',
    scale: 1.35,
    heightScale: 1,
    opacity: 1
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const normalizeSettings = (settings: MoodCalendarBackgroundSettings | undefined): MoodCalendarBackgroundSettings => ({
    offsetY: settings?.offsetY || DEFAULT_SETTINGS.offsetY,
    offsetX: settings?.offsetX || DEFAULT_SETTINGS.offsetX,
    scale: clamp(Number(settings?.scale ?? DEFAULT_SETTINGS.scale) || DEFAULT_SETTINGS.scale, 0.1, 3),
    heightScale: clamp(Number(settings?.heightScale ?? DEFAULT_SETTINGS.heightScale) || DEFAULT_SETTINGS.heightScale, 0.1, 3),
    opacity: clamp(Number(settings?.opacity ?? DEFAULT_SETTINGS.opacity) || 0, 0, 1)
});

class MoodCalendarBackgroundService {
    private readonly builtIn: MoodCalendarBackgroundOption[] = [
        {
            id: 'none',
            name: '无背景',
            type: 'preset',
            url: '',
            sixWeekUrl: '',
            ...DEFAULT_SETTINGS
        },
        {
            id: 'calendar-1',
            name: '兔子云朵',
            type: 'preset',
            url: '/calendar/tuzi/5.png',
            sixWeekUrl: '/calendar/tuzi/6.png',
            offsetY: '0px',
            offsetX: '0px',
            scale: 1.35,
            // 5.png 的透明上下留白较多，默认提高纵向主体高度以覆盖五周日历。
            heightScale: 1.2,
            opacity: 1
        }
    ];

    constructor() {
        if (typeof localStorage !== 'undefined') {
            void this.hydrateCustomBackgrounds();
        }
    }

    getMode(): MoodCalendarBackgroundMode {
        return localStorage.getItem(MOOD_CALENDAR_BACKGROUND_MODE_KEY) === 'fill' ? 'fill' : 'overflow';
    }

    setMode(mode: MoodCalendarBackgroundMode): void {
        localStorage.setItem(MOOD_CALENDAR_BACKGROUND_MODE_KEY, mode);
        window.dispatchEvent(new CustomEvent(MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT, {
            detail: { mode, backgroundId: this.getCurrentBackground(mode) }
        }));
    }

    getCurrentBackground(mode: MoodCalendarBackgroundMode = this.getMode()): string {
        const currentKey = mode === 'fill' ? FILL_MOOD_CALENDAR_BACKGROUND_CURRENT_KEY : CURRENT_KEY;
        const current = localStorage.getItem(currentKey);
        return this.getAllBackgrounds(mode).some((background) => background.id === current)
            ? current || 'none'
            : 'none';
    }

    setCurrentBackground(backgroundId: string, mode: MoodCalendarBackgroundMode = this.getMode()): void {
        const currentKey = mode === 'fill' ? FILL_MOOD_CALENDAR_BACKGROUND_CURRENT_KEY : CURRENT_KEY;
        const nextId = this.getAllBackgrounds(mode).some((background) => background.id === backgroundId)
            ? backgroundId
            : 'none';
        localStorage.setItem(currentKey, nextId);
        window.dispatchEvent(new CustomEvent(MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT, {
            detail: { mode: this.getMode(), backgroundId: this.getCurrentBackground() }
        }));
    }

    private loadCustomBackgrounds(mode: MoodCalendarBackgroundMode = 'overflow'): MoodCalendarBackgroundOption[] {
        try {
            const stored = localStorage.getItem(mode === 'fill' ? FILL_MOOD_CALENDAR_BACKGROUND_CUSTOM_KEY : CUSTOM_KEY);
            const parsed = stored ? JSON.parse(stored) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    private saveCustomBackgrounds(backgrounds: MoodCalendarBackgroundOption[], mode: MoodCalendarBackgroundMode = 'overflow'): void {
        localStorage.setItem(mode === 'fill' ? FILL_MOOD_CALENDAR_BACKGROUND_CUSTOM_KEY : CUSTOM_KEY, JSON.stringify(backgrounds));
    }

    async hydrateCustomBackgrounds(): Promise<void> {
        for (const mode of ['overflow', 'fill'] as const) {
            const backgrounds = this.loadCustomBackgrounds(mode);
            let changed = false;
            const hydrated = await Promise.all(backgrounds.map(async (background) => {
                if (!background.imageFilename && !background.sixWeekImageFilename) return background;
                const [url, sixWeekUrl] = await Promise.all([
                    background.imageFilename ? imageService.getImageUrl(background.imageFilename) : Promise.resolve(background.url),
                    background.sixWeekImageFilename ? imageService.getImageUrl(background.sixWeekImageFilename) : Promise.resolve(background.sixWeekUrl || background.url)
                ]);
                if ((!url || url === background.url) && (!sixWeekUrl || sixWeekUrl === background.sixWeekUrl)) return background;
                changed = true;
                return { ...background, url: url || background.url, thumbnail: url || background.thumbnail, sixWeekUrl: sixWeekUrl || background.sixWeekUrl, sixWeekThumbnail: sixWeekUrl || background.sixWeekThumbnail };
            }));

            if (changed) {
                this.saveCustomBackgrounds(hydrated, mode);
            }
        }
        window.dispatchEvent(new CustomEvent(MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT, {
            detail: { mode: this.getMode(), backgroundId: this.getCurrentBackground() }
        }));
    }

    getAllBackgrounds(mode: MoodCalendarBackgroundMode = this.getMode()): MoodCalendarBackgroundOption[] {
        if (mode === 'fill') {
            return [
                { id: 'none', name: '无背景', type: 'preset', url: '' },
                ...this.loadCustomBackgrounds('fill')
            ];
        }
        return [
            ...this.builtIn.map((background) => ({
                ...background,
                url: background.url ? resolveAssetPath(background.url) : '',
                thumbnail: background.thumbnail ? resolveAssetPath(background.thumbnail) : background.thumbnail,
                sixWeekUrl: background.sixWeekUrl ? resolveAssetPath(background.sixWeekUrl) : background.sixWeekUrl,
                sixWeekThumbnail: background.sixWeekThumbnail ? resolveAssetPath(background.sixWeekThumbnail) : background.sixWeekThumbnail
            })),
            ...this.loadCustomBackgrounds('overflow').map((background) => ({
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

    async addCustomBackground(fiveWeekFile: File, sixWeekFile: File, name?: string): Promise<MoodCalendarBackgroundOption> {
        const [imageFilename, sixWeekImageFilename] = await Promise.all([
            imageService.saveImage(fiveWeekFile, 'theme'),
            imageService.saveImage(sixWeekFile, 'theme')
        ]);
        const [url, sixWeekUrl] = await Promise.all([
            imageService.getImageUrl(imageFilename),
            imageService.getImageUrl(sixWeekImageFilename)
        ]);
        const background: MoodCalendarBackgroundOption = {
            id: `mood_calendar_custom_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            name: name?.trim() || fiveWeekFile.name.replace(/\.[^/.]+$/, ''),
            type: 'custom',
            url,
            thumbnail: url,
            sixWeekUrl,
            sixWeekThumbnail: sixWeekUrl,
            imageFilename,
            sixWeekImageFilename,
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
        if (target.sixWeekImageFilename) {
            await imageService.deleteImage(target.sixWeekImageFilename).catch(() => undefined);
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
