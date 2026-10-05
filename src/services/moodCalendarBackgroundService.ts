/**
 * @file moodCalendarBackgroundService.ts
 * @input Uploaded Memoir mood-calendar background images
 * @output Current background, persisted opacity, and refresh events
 * @pos Service (UI Customization)
 * @description Stores a single fill image for each Memoir mood-calendar background.
 * @updated 2026-09-29: Deduplicates hydration, keeps temporary URLs out of storage, and merges results without overwriting concurrent edits.
 * @updated 2026-10-05: Avoids redundant storage writes and tolerates quota failures during startup hydration.
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

interface RuntimeMoodCalendarImage {
    url: string;
    imageFilename?: string;
}

class MoodCalendarBackgroundService {
    private readonly runtimeImages = new Map<string, RuntimeMoodCalendarImage>();
    private hydrationPromise: Promise<void> | null = null;

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
            if (!Array.isArray(parsed)) return [];

            return parsed.map((background) => {
                if (this.isDataUrl(background.url) && !this.getRuntimeImageUrl(background)) {
                    this.setRuntimeImage(background, background.url);
                }
                if (this.isDataUrl(background.thumbnail) && !this.getRuntimeImageUrl(background)) {
                    this.setRuntimeImage(background, background.thumbnail);
                }
                const runtimeUrl = this.getRuntimeImageUrl(background);
                const url = runtimeUrl || (this.isTemporaryUrl(background.url) ? '' : background.url);
                const thumbnail = runtimeUrl || (this.isTemporaryUrl(background.thumbnail) ? '' : background.thumbnail);
                return { ...background, url, thumbnail };
            });
        } catch {
            return [];
        }
    }

    private saveCustomBackgrounds(backgrounds: MoodCalendarBackgroundOption[]): void {
        const persisted = backgrounds.map((background) => {
            if (this.isTemporaryUrl(background.url)) this.setRuntimeImage(background, background.url);
            if (this.isTemporaryUrl(background.thumbnail) && !this.getRuntimeImageUrl(background)) {
                this.setRuntimeImage(background, background.thumbnail);
            }

            return {
                ...background,
                url: this.isTemporaryUrl(background.url) ? '' : background.url,
                thumbnail: this.isTemporaryUrl(background.thumbnail) ? '' : background.thumbnail
            };
        });
        const serialized = JSON.stringify(persisted);
        if (localStorage.getItem(MOOD_CALENDAR_BACKGROUND_CUSTOM_KEY) !== serialized) {
            localStorage.setItem(MOOD_CALENDAR_BACKGROUND_CUSTOM_KEY, serialized);
        }
    }

    private isDataUrl(value: unknown): value is string {
        return typeof value === 'string' && value.startsWith('data:');
    }

    private isTemporaryUrl(value: unknown): value is string {
        return typeof value === 'string' && (value.startsWith('blob:') || value.startsWith('data:'));
    }

    private getRuntimeImageUrl(background: Pick<MoodCalendarBackgroundOption, 'id' | 'imageFilename'>): string {
        const runtimeImage = this.runtimeImages.get(background.id);
        if (!runtimeImage || runtimeImage.imageFilename !== background.imageFilename) return '';
        return runtimeImage.url;
    }

    private setRuntimeImage(
        background: Pick<MoodCalendarBackgroundOption, 'id' | 'imageFilename'>,
        url: string
    ): void {
        this.runtimeImages.set(background.id, { url, imageFilename: background.imageFilename });
    }

    hydrateCustomBackgrounds(): Promise<void> {
        if (this.hydrationPromise) return this.hydrationPromise;

        const hydration = this.performHydration();
        const trackedHydration = hydration.finally(() => {
            if (this.hydrationPromise === trackedHydration) this.hydrationPromise = null;
        });
        this.hydrationPromise = trackedHydration;
        return trackedHydration;
    }

    private async performHydration(): Promise<void> {
        const attemptedAssets = new Set<string>();

        while (true) {
            const backgrounds = this.loadCustomBackgrounds();
            const pendingBackgrounds = backgrounds.filter((background) => {
                if (!background.imageFilename || this.getRuntimeImageUrl(background)) return false;
                return !attemptedAssets.has(`${background.id}\u0000${background.imageFilename}`);
            });
            if (pendingBackgrounds.length === 0) break;

            pendingBackgrounds.forEach((background) => {
                attemptedAssets.add(`${background.id}\u0000${background.imageFilename}`);
            });
            const hydrated = await Promise.all(pendingBackgrounds.map(async (background) => {
                try {
                    const url = await imageService.getImageUrl(background.imageFilename!);
                    if (!url) {
                        console.warn('[MoodCalendarBackgroundService] Background image is unavailable', {
                            backgroundId: background.id,
                            imageFilename: background.imageFilename
                        });
                        return null;
                    }
                    return { id: background.id, imageFilename: background.imageFilename, url };
                } catch (error) {
                    console.warn('[MoodCalendarBackgroundService] Failed to hydrate background image', {
                        backgroundId: background.id,
                        imageFilename: background.imageFilename,
                        error
                    });
                    return null;
                }
            }));

            const latestBackgrounds = this.loadCustomBackgrounds();
            const latestById = new Map(latestBackgrounds.map((background) => [background.id, background]));
            hydrated.forEach((result) => {
                if (!result) return;
                const latest = latestById.get(result.id);
                if (latest?.imageFilename === result.imageFilename) this.setRuntimeImage(latest, result.url);
            });
            this.pruneRuntimeImages(latestBackgrounds);
            this.persistLatestBackgrounds(latestBackgrounds);
        }

        const latestBackgrounds = this.loadCustomBackgrounds();
        this.pruneRuntimeImages(latestBackgrounds);
        this.persistLatestBackgrounds(latestBackgrounds);
        window.dispatchEvent(new CustomEvent(MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT, {
            detail: { backgroundId: this.getCurrentBackground() }
        }));
    }

    private pruneRuntimeImages(backgrounds: MoodCalendarBackgroundOption[]): void {
        const latestById = new Map(backgrounds.map((background) => [background.id, background]));
        Array.from(this.runtimeImages.entries()).forEach(([backgroundId, runtimeImage]) => {
            const latest = latestById.get(backgroundId);
            if (!latest || latest.imageFilename !== runtimeImage.imageFilename) this.runtimeImages.delete(backgroundId);
        });
    }

    private persistLatestBackgrounds(backgrounds: MoodCalendarBackgroundOption[]): void {
        try {
            this.saveCustomBackgrounds(backgrounds.map((background) => {
                const runtimeUrl = this.getRuntimeImageUrl(background);
                return runtimeUrl ? { ...background, url: runtimeUrl, thumbnail: runtimeUrl } : background;
            }));
        } catch (error) {
            console.warn('[MoodCalendarBackgroundService] Failed to compact background metadata', error);
        }
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

        this.runtimeImages.delete(backgroundId);
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
