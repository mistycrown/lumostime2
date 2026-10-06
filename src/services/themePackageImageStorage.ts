/**
 * @file themePackageImageStorage.ts
 * @input Persisted navigation and Memoir calendar image lists
 * @output Loaded runtime images and compacted metadata before theme package writes
 * @pos Service (Theme Package Import)
 * @updated 2026-10-05: Shares storage preparation across ZIP import and package application.
 */
import { navigationIconService } from './navigationIconService';
import { navigationBackgroundService } from './navigationBackgroundService';
import { navigationDecorationService } from './navigationDecorationService';
import { moodCalendarBackgroundService } from './moodCalendarBackgroundService';

export const prepareThemePackageImageStorage = async (): Promise<void> => {
  if (typeof localStorage === 'undefined') return;
  // Native image loading is asynchronous. Await compaction before image manifests,
  // package records, or appearance settings consume the same localStorage quota.
  const tasks: Array<[string, () => Promise<void>]> = [
    ['navigation_icon_custom_list_v1', () => navigationIconService.hydrateCustomIcons()],
    ['navigation_new_background_custom_list', () => navigationBackgroundService.hydrateCustomBackgrounds()],
    ['navigation_decoration_custom_list', () => navigationDecorationService.hydrateImageBackedCustomDecorations()],
    ['mood_calendar_fill_background_custom_list', () => moodCalendarBackgroundService.hydrateCustomBackgrounds()]
  ];
  await Promise.all(tasks.filter(([key]) => localStorage.getItem(key) !== null).map(([, hydrate]) => hydrate()));
};
