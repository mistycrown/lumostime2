/**
 * @file moodCalendarBackgroundService.ts
 * @input Uploaded Memoir mood-calendar background images
 * @output Current background, persisted opacity, and refresh events
 * @pos Service (UI Customization)
 * @description Stores a single fill image for each Memoir mood-calendar background.
 * @updated 2026-09-27: Removed paired overflow backgrounds; Memoir now uses one clipped fill image.
 */
import { imageService } from './imageService';

export interface MoodCalendarBackgroundSettings {
    opacity?: number;
}

export interface MoodCalendarBackgroundOption extends MoodCalendarBackgroundSettings {
    id: string;
    name: string;
    type: 'preset' | 'custom';
    url: string;
    thumbnail?: string;
    imageFilename?: string;
}

export const MOOD_CALENDAR_BACKGROUND_CURRENT_KEY = 'mood_calendar_fill_background';
export const MOOD_CALENDAR_BACKGROUND_CUSTOM_KEY = 'mood_calendar_fill_background_custom_list';
const SETTINGS_KEY = 'mood_calendar_background_settings';

export const MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT = 'moodCalendarBackgroundChange';

const DEFAULT_SETTINGS: Required<MoodCalendarBackgroundSettings> = {
    opacity: 1
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const normalizeSettings = (settings: MoodCalendarBackgroundSettings | undefined): MoodCalendarBackgroundSettings => ({
    opacity: clamp(Number(settings?.opacity ?? DEFAULT_SETTINGS.opacity), 0, 1)
});

class MoodCalendarBackgroundService {
    getCurrentBackground(): string {
        const current = localStorage.getItem(MOOD_CALENDAR_BACKGROUND_CURRENT_KEY);
        return this.getAllBackgrounds().some((background) => background.id === current)
            ? current || 'none'
            : 'none';
    }

    setCurrentBackground(backgroundId: string): void {
        const nextId = this.getAllBackgrounds().some((background) => background.id === backgroundId)
            ? backgroundId
            : 'none';
        localStorage.setItem(MOOD_CALENDAR_BACKGROUND_CURRENT_KEY, nextId);
        window.dispatchEvent(new CustomEvent(MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT, {
            detail: { backgroundId: nextId }
        }));
    }

    private loadCustomBackgrounds(): MoodCalendarBackgroundOption[] {
        try {
            const stored = localStorage.getItem(MOOD_CALENDAR_BACKGROUND_CUSTOM_KEY);
            const parsed = stored ? JSON.parse(stored) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    private saveCustomBackgrounds(backgrounds: MoodCalendarBackgroundOption[]): void {
        localStorage.setItem(MOOD_CALENDAR_BACKGROUND_CUSTOM_KEY, JSON.stringify(backgrounds));
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

        if (changed) this.saveCustomBackgrounds(hydrated);
        window.dispatchEvent(new CustomEvent(MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT, {
            detail: { backgroundId: this.getCurrentBackground() }
        }));
    }

    getAllBackgrounds(): MoodCalendarBackgroundOption[] {
        return [
            { id: 'none', name: '无背景', type: 'preset', url: '' },
            ...this.loadCustomBackgrounds()
        ];
    }

    getBackgroundById(id: string): MoodCalendarBackgroundOption | undefined {
        const background = this.getAllBackgrounds().find((item) => item.id === id);
        if (!background) return undefined;
        const settings = this.getCustomSettings()[id];
        return { ...background, ...normalizeSettings({ ...background, ...settings }) };
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

    async addCustomBackground(file: File, name?: string): Promise<MoodCalendarBackgroundOption> {
        const imageFilename = await imageService.saveImage(file, 'theme');
        const url = await imageService.getImageUrl(imageFilename);
        const background: MoodCalendarBackgroundOption = {
            id: `mood_calendar_fill_custom_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            name: name?.trim() || file.name.replace(/\.[^/.]+$/, ''),
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
        if (target.imageFilename) await imageService.deleteImage(target.imageFilename).catch(() => undefined);
        if (wasCurrent) this.setCurrentBackground('none');
        else window.dispatchEvent(new CustomEvent(MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT, {
            detail: { backgroundId: this.getCurrentBackground() }
        }));
        return true;
    }
}

export const moodCalendarBackgroundService = new MoodCalendarBackgroundService();
