/**
 * @file themePackageApplicationService.ts
 * @input Imported theme package metadata, image filename mappings, and local-only font mappings
 * @output Applied theme settings and refresh events across appearance services
 * @pos Service (Theme Package Import)
 * @description Applies validated imported package configuration to the existing theme-related persistence models.
 * @updated 2026-09-26: Added package configuration application for appearance, stickers, TimePal, navigation, timeline, and Memoir.
 * @updated 2026-09-26: Applies imported achievement-bottle image packs and fixes TimePal package replacement IDs.
 * @updated 2026-09-27: Applies a single-image Memoir calendar background from theme packages.
 * @updated 2026-09-26: Applies achievement-bottle and other appearance settings from their manifest sections.
 * @updated 2026-09-26: Applies nested navigation icons, live background opacity, and refreshes packaged stickers.
 * @updated 2026-09-28: Applies complete 01-96 numbered UIIcon directories from theme packages.
 * @updated 2026-09-28: Scopes asset-based UIIcon IDs for retained-resource package copies.
 * @updated 2026-09-29: Applies packaged global floating-button image backgrounds.
 */

import { TIMEPAL_KEYS, THEME_KEYS, storage } from '../constants/storageKeys';
import { APPEARANCE_RESTORED_EVENT } from './appearanceBackupService';
import { backgroundService } from './backgroundService';
import { colorSchemeService } from './colorSchemeService';
import { fontService } from './fontService';
import {
  MOOD_CALENDAR_BACKGROUND_CURRENT_KEY,
  MOOD_CALENDAR_BACKGROUND_CUSTOM_KEY,
  moodCalendarBackgroundService
} from './moodCalendarBackgroundService';
import { navigationBackgroundService } from './navigationBackgroundService';
import { navigationDecorationService } from './navigationDecorationService';
import { NAVIGATION_ICON_CHANGE_EVENT, navigationIconService } from './navigationIconService';
import { themePackageImportService, type ImportedThemePackageRecord } from './themePackageImportService';
import { getUIIconTypeByNumber, uiIconService } from './uiIconService';
import { normalizeCustomStickerState } from './customStickerAssetService';
import type { CustomStickerRecord, CustomStickerSetRecord } from '../types';
import { CUSTOM_TIMEPAL_PREFIX } from '../constants/timePalConfig';
import {
  DEFAULT_TIMELINE_STYLE_CONFIGS,
  isTimelineStyleTheme,
  normalizeTimelineStyleConfigs,
  type TimelineStyleConfig
} from './timelineStyleService';
import { registerCustomAchievementBottleIconPack } from './achievementBottleIconPackService';
import {
  CARD_BACKGROUND_CHANGED_EVENT,
  CARD_BACKGROUND_CURRENT_KEY,
  CARD_BACKGROUND_GROUPS_KEY,
  CARD_BACKGROUND_OPACITY_EVENT
} from './cardBackgroundService';
import { floatingButtonBackgroundService } from './floatingButtonBackgroundService';

const CUSTOM_BACKGROUND_KEY = 'lumos_custom_backgrounds';
const CUSTOM_NAVIGATION_BACKGROUND_KEY = 'navigation_new_background_custom_list';
const LEGACY_NAVIGATION_DECORATIONS_KEY = 'navigation_decoration_custom_list';
const CUSTOM_NAVIGATION_BACKGROUND_SETTINGS_KEY = 'navigation_new_background_settings';
const CUSTOM_STICKER_SETS_KEY = 'lumostime_custom_sticker_sets_v2';
const CUSTOM_STICKERS_KEY = 'lumostime_custom_stickers_v2';
const CUSTOM_MOOD_CALENDAR_SETTINGS_KEY = 'mood_calendar_background_settings';
const NAVIGATION_ICON_CUSTOM_KEY = 'navigation_icon_custom_list_v1';
const NAVIGATION_ICON_SCHEMES_KEY = 'navigation_icon_schemes_v1';
const NAVIGATION_ICON_SELECTION_KEY = 'navigation_icon_selection_v1';
const DEFAULT_SELECTOR_PAGE_KEY = 'lumostime_default_selector_page';
const STICKER_SELECTOR_CONFIG_KEY = 'lumostime_sticker_selector_config';

const readArray = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readObject = <T extends object>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : fallback;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

const getConfigObject = (record: ImportedThemePackageRecord, key: string): Record<string, unknown> | null => {
  const value = record.manifest.config[key];
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
};

const getAssetFilename = (record: ImportedThemePackageRecord, path: unknown): string | undefined => {
  return typeof path === 'string' ? record.imageAssets[path] : undefined;
};

const getNamespacedId = (record: ImportedThemePackageRecord, suffix: string): string => (
  `theme:${record.id}:${suffix}`
);

const getPackageUiIconThemeId = (record: ImportedThemePackageRecord, configuredThemeId?: string): string => {
  const themeId = configuredThemeId || record.id;
  return record.sourcePackageId ? getNamespacedId(record, `uiicon-${themeId}`) : themeId;
};

const applyBackground = async (record: ImportedThemePackageRecord, warnings: string[]): Promise<void> => {
  const config = getConfigObject(record, 'background');
  if (!config) return;

  if (config.source === 'builtin' && typeof config.id === 'string') {
    backgroundService.setCurrentBackground(config.id);
    return;
  }

  const imageFilename = getAssetFilename(record, config.file);
  if (!imageFilename) {
    warnings.push('整体背景资源不存在');
    return;
  }

  const id = getNamespacedId(record, 'background');
  const backgrounds = readArray<Record<string, unknown>>(CUSTOM_BACKGROUND_KEY).filter((item) => item.id !== id);
  backgrounds.push({
    id,
    name: record.name,
    type: 'custom',
    url: '',
    thumbnail: '',
    imageFilename
  });
  writeJson(CUSTOM_BACKGROUND_KEY, backgrounds);
  backgroundService.setCurrentBackground(id);
  await backgroundService.hydrateImageBackedCustomBackgrounds();
  if (typeof config.opacity === 'number') {
    backgroundService.setBackgroundOpacity(config.opacity);
  }
};

const applyNavigationBackground = async (record: ImportedThemePackageRecord, warnings: string[]): Promise<void> => {
  const navigation = getConfigObject(record, 'navigation');
  if (navigation?.mode === 'legacy') {
    const decorationId = typeof navigation.decorationId === 'string' ? navigation.decorationId : 'default';
    if (navigation.decoration && typeof navigation.decoration === 'object' && !Array.isArray(navigation.decoration)) {
      const decoration = navigation.decoration as Record<string, unknown>;
      if (decoration.source === 'asset') {
        const imageFilename = getAssetFilename(record, decoration.file);
        if (!imageFilename) {
          warnings.push('旧版导航装饰资源不存在');
          return;
        }
        const id = getNamespacedId(record, 'navigation-decoration');
        const decorations = readArray<Record<string, unknown>>(LEGACY_NAVIGATION_DECORATIONS_KEY)
          .filter((item) => item.id !== id);
        decorations.push({
          id,
          name: record.name,
          type: 'custom',
          url: '',
          thumbnail: '',
          imageFilename,
          offsetY: typeof decoration.offsetY === 'string' ? decoration.offsetY : '60px',
          offsetX: typeof decoration.offsetX === 'string' ? decoration.offsetX : '0px',
          scale: typeof decoration.scale === 'number' ? decoration.scale : 1,
          opacity: typeof decoration.opacity === 'number' ? decoration.opacity : 1
        });
        writeJson(LEGACY_NAVIGATION_DECORATIONS_KEY, decorations);
        navigationBackgroundService.setEnabled(false);
        navigationDecorationService.setCurrentDecoration(id);
        await navigationDecorationService.hydrateImageBackedCustomDecorations();
        return;
      }
    }
    navigationBackgroundService.setEnabled(false);
    navigationDecorationService.setCurrentDecoration(decorationId);
    return;
  }

  const config = navigation?.background;
  if (!config || typeof config !== 'object' || Array.isArray(config)) return;

  const backgroundConfig = config as Record<string, unknown>;
  if (backgroundConfig.source === 'builtin' && typeof backgroundConfig.id === 'string') {
    navigationBackgroundService.setCurrentBackground(backgroundConfig.id);
    if (navigation.mode === 'modern') navigationBackgroundService.setEnabled(true);
    return;
  }

  const imageFilename = getAssetFilename(record, backgroundConfig.file);
  if (!imageFilename) {
    warnings.push('新版导航栏背景资源不存在');
    return;
  }

  const id = getNamespacedId(record, 'navigation-background');
  const backgrounds = readArray<Record<string, unknown>>(CUSTOM_NAVIGATION_BACKGROUND_KEY).filter((item) => item.id !== id);
  backgrounds.push({
    id,
    name: record.name,
    type: 'custom',
    url: '',
    thumbnail: '',
    imageFilename,
    offsetY: '0px',
    offsetX: '0px',
    scale: typeof backgroundConfig.scale === 'number' ? backgroundConfig.scale : 1,
    opacity: typeof backgroundConfig.opacity === 'number' ? backgroundConfig.opacity : 1
  });
  writeJson(CUSTOM_NAVIGATION_BACKGROUND_KEY, backgrounds);
  navigationBackgroundService.setCurrentBackground(id);
  navigationBackgroundService.setEnabled(true);
  writeJson(CUSTOM_NAVIGATION_BACKGROUND_SETTINGS_KEY, {
    ...readObject<Record<string, unknown>>(CUSTOM_NAVIGATION_BACKGROUND_SETTINGS_KEY, {}),
    [id]: {
      offsetY: typeof backgroundConfig.offsetY === 'string' ? backgroundConfig.offsetY : '0px',
      offsetX: typeof backgroundConfig.offsetX === 'string' ? backgroundConfig.offsetX : '0px',
      scale: typeof backgroundConfig.scale === 'number' ? backgroundConfig.scale : 1,
      opacity: typeof backgroundConfig.opacity === 'number' ? backgroundConfig.opacity : 1
    }
  });
  await navigationBackgroundService.hydrateCustomBackgrounds();
};

const applyNavigationIcons = async (record: ImportedThemePackageRecord, warnings: string[]): Promise<void> => {
  const navigation = getConfigObject(record, 'navigation');
  const icons = navigation?.icons;
  if (!icons || typeof icons !== 'object' || Array.isArray(icons)) return;

  const files = (icons as Record<string, unknown>).files;
  if (!files || typeof files !== 'object' || Array.isArray(files)) return;

  const customIcons = readArray<Record<string, unknown>>(NAVIGATION_ICON_CUSTOM_KEY)
    .filter((item) => !String(item.id || '').startsWith(`theme:${record.id}:`));
  const mapping: Record<string, string> = {};
  const validSlots = new Set(navigationIconService.getSlots());

  for (const [slot, path] of Object.entries(files as Record<string, unknown>)) {
    if (!validSlots.has(slot as never)) {
      warnings.push(`未知导航图标槽位：${slot}`);
      continue;
    }

    const imageFilename = getAssetFilename(record, path);
    if (!imageFilename) {
      warnings.push(`导航图标资源不存在：${slot}`);
      continue;
    }

    const iconId = getNamespacedId(record, `navigation-icon-${slot}`);
    customIcons.push({
      id: iconId,
      name: `${record.name} · ${slot}`,
      type: 'custom',
      url: '',
      imageFilename
    });
    mapping[slot] = iconId;
  }

  if (Object.keys(mapping).length === 0) return;

  if (navigation?.mode !== 'legacy') navigationBackgroundService.setEnabled(true);

  writeJson(NAVIGATION_ICON_CUSTOM_KEY, customIcons);
  const schemes = readArray<Record<string, unknown>>(NAVIGATION_ICON_SCHEMES_KEY)
    .filter((item) => item.id !== getNamespacedId(record, 'navigation-icons'));
  schemes.push({
    id: getNamespacedId(record, 'navigation-icons'),
    name: record.name,
    type: 'custom',
    mapping
  });
  writeJson(NAVIGATION_ICON_SCHEMES_KEY, schemes);
  writeJson(NAVIGATION_ICON_SELECTION_KEY, {
    mode: 'custom',
    schemeId: getNamespacedId(record, 'navigation-icons'),
    customMapping: mapping,
    showLabelWithIcon: navigationIconService.getSelection().showLabelWithIcon
  });
  await navigationIconService.hydrateCustomIcons();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(NAVIGATION_ICON_CHANGE_EVENT));
  }
};

const applyTimePal = (record: ImportedThemePackageRecord, warnings: string[]): void => {
  const config = getConfigObject(record, 'timePal');
  if (!config) return;

  const items = Array.isArray(config.items) ? config.items : [];
  const existingItems = storage.getJSON<Record<string, unknown>[]>(TIMEPAL_KEYS.CUSTOM_ITEMS, []) || [];
  const nextItems = existingItems.filter((item) => !String(item.id || '').startsWith(`theme:${record.id}:timepal-`));

  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const candidate = item as Record<string, unknown>;
    const stages = candidate.stages;
    if (!stages || typeof stages !== 'object' || Array.isArray(stages)) return;

    const stageFilenames = ['1', '2', '3', '4', '5'].map((stage) => getAssetFilename(record, (stages as Record<string, unknown>)[stage]));
    if (stageFilenames.some((filename) => !filename)) {
      warnings.push(`时间小友阶段资源不完整：${String(candidate.id || index)}`);
      return;
    }

    nextItems.push({
      id: getNamespacedId(record, `timepal-${String(candidate.id || index)}`),
      name: typeof candidate.name === 'string' ? candidate.name : record.name,
      stageFilenames,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  });

  storage.setJSON(TIMEPAL_KEYS.CUSTOM_ITEMS, nextItems);
  if (typeof config.selected === 'string') {
    const selectedId = getNamespacedId(record, `timepal-${config.selected}`);
    if (nextItems.some((item) => item.id === selectedId)) {
      storage.set(TIMEPAL_KEYS.TYPE, `${CUSTOM_TIMEPAL_PREFIX}${selectedId}`);
    }
  }
  if (Array.isArray(config.thresholds)) {
    storage.setJSON(TIMEPAL_KEYS.STAGE_THRESHOLDS, config.thresholds);
  }
};

const applyStickers = (record: ImportedThemePackageRecord): void => {
  const config = record.manifest.config.stickers;
  if (!Array.isArray(config)) return;

  const now = Date.now();
  const current = normalizeCustomStickerState(
    readArray<CustomStickerSetRecord>(CUSTOM_STICKER_SETS_KEY),
    readArray<CustomStickerRecord>(CUSTOM_STICKERS_KEY)
  );
  const importedSetIds = new Set<string>();
  const importedSets: CustomStickerSetRecord[] = [];
  const importedStickers: CustomStickerRecord[] = [];

  config.forEach((rawSet, setIndex) => {
    if (!rawSet || typeof rawSet !== 'object') return;
    const set = rawSet as Record<string, unknown>;
    const setId = getNamespacedId(record, `sticker-set-${String(set.id || setIndex)}`);
    importedSetIds.add(setId);

    const items = Array.isArray(set.items) ? set.items : [];
    const stickers = items.slice(0, 16).flatMap((rawItem, itemIndex) => {
      if (!rawItem || typeof rawItem !== 'object') return [];
      const item = rawItem as Record<string, unknown>;
      const imageFilename = getAssetFilename(record, item.file);
      if (!imageFilename) return [];

      return [{
        id: getNamespacedId(record, `sticker-${String(set.id || setIndex)}-${String(item.id || itemIndex)}`),
        setId,
        imageFilename,
        thumbnailFilename: `thumb_${imageFilename}`,
        label: typeof item.name === 'string' ? item.name : undefined,
        sortOrder: itemIndex,
        status: 'active' as const,
        createdAt: now,
        updatedAt: now
      }];
    });

    importedSets.push({
      id: setId,
      name: typeof set.name === 'string' ? set.name : record.name,
      description: undefined,
      stickerIds: stickers.map((item) => item.id),
      status: 'active',
      createdAt: now,
      updatedAt: now
    });
    importedStickers.push(...stickers);
  });

  const otherSets = current.customStickerSets.filter((set) => !importedSetIds.has(set.id));
  const otherStickers = current.customStickers.filter((sticker) => !importedSetIds.has(sticker.setId));
  const next = normalizeCustomStickerState(
    [...otherSets, ...importedSets],
    [...otherStickers, ...importedStickers]
  );
  storage.setJSON(CUSTOM_STICKER_SETS_KEY, next.customStickerSets);
  storage.setJSON(CUSTOM_STICKERS_KEY, next.customStickers);

  const stickerSelector = getConfigObject(record, 'stickerSelector');
  if (importedSets.length > 0) {
    const importedIds = new Set(importedSets.map((set) => set.id));
    const packageGroups = Array.isArray(stickerSelector?.groups)
      ? stickerSelector.groups.flatMap((rawGroup, index) => {
        if (!rawGroup || typeof rawGroup !== 'object' || Array.isArray(rawGroup)) return [];
        const group = rawGroup as Record<string, unknown>;
        const sourceSetIds = Array.isArray(group.sourceSetIds)
          ? group.sourceSetIds.filter((id): id is string => typeof id === 'string' && config.some((set) => (
            Boolean(set) && typeof set === 'object' && (set as Record<string, unknown>).id === id
          ))).map((id) => getNamespacedId(record, `sticker-set-${id}`))
          : [];
        if (!sourceSetIds.length) return [];
        return [{
          id: getNamespacedId(record, `sticker-group-${String(group.id || index + 1)}`),
          name: typeof group.name === 'string' ? group.name : record.name,
          sourceSetIds
        }];
      })
      : importedSets.length > 1
        ? [{
          id: getNamespacedId(record, 'sticker-group-all'),
          name: record.name,
          sourceSetIds: importedSets.map((set) => set.id)
        }]
        : [];
    const existingSelector = readObject<Record<string, unknown>>(STICKER_SELECTOR_CONFIG_KEY, {});
    const existingGroups = Array.isArray(existingSelector.groups) ? existingSelector.groups : [];
    const groups = [
      ...existingGroups.filter((group) => (
        !group || typeof group !== 'object' || !String((group as Record<string, unknown>).id || '').startsWith(`theme:${record.id}:sticker-group-`)
      )),
      ...packageGroups
    ];
    const defaultPageId = typeof stickerSelector?.defaultPage === 'string'
      ? stickerSelector.defaultPage
      : importedSets[0].id.replace(`theme:${record.id}:sticker-set-`, '');
    const defaultSet = importedSets.find((set) => set.id === getNamespacedId(record, `sticker-set-${defaultPageId}`));
    const defaultGroup = groups.find((group) => group.id === getNamespacedId(record, `sticker-group-${defaultPageId}`));
    localStorage.setItem(DEFAULT_SELECTOR_PAGE_KEY, defaultSet?.id || defaultGroup?.id || importedSets[0].id);
    localStorage.setItem(STICKER_SELECTOR_CONFIG_KEY, JSON.stringify({
      enabled: existingSelector.enabled === true || stickerSelector?.enabled === true || groups.length > 0,
      groups
    }));
  }
};

const applyCardBackground = (record: ImportedThemePackageRecord): void => {
  const config = getConfigObject(record, 'cardBackground');
  if (!config) return;

  const groupId = typeof config.id === 'string' ? config.id : undefined;
  const files = Array.isArray(config.files) ? config.files : [];
  if (!groupId || files.length === 0) return;
  const imageFilenames = files
    .map((path) => getAssetFilename(record, path))
    .filter((filename): filename is string => Boolean(filename));
  if (!imageFilenames.length) return;

  const id = getNamespacedId(record, `card-background-${groupId}`);
  const groups = readArray<Record<string, unknown>>(CARD_BACKGROUND_GROUPS_KEY)
    .filter((group) => group.id !== id);
  groups.push({
    id,
    name: typeof config.name === 'string' ? config.name : record.name,
    imageFilenames,
    alignment: config.alignment === 'right-top' || config.alignment === 'right-bottom'
      ? config.alignment
      : 'right'
  });
  localStorage.setItem(CARD_BACKGROUND_GROUPS_KEY, JSON.stringify(groups));

  if (typeof config.groupId === 'string') {
    const selectedGroupId = getNamespacedId(record, `card-background-${config.groupId}`);
    if (groups.some((group) => group.id === selectedGroupId)) {
      localStorage.setItem(CARD_BACKGROUND_CURRENT_KEY, selectedGroupId);
    }
  } else {
    localStorage.setItem(CARD_BACKGROUND_CURRENT_KEY, id);
  }
  if (typeof config.opacity === 'number') {
    localStorage.setItem('lumostime_card_background_opacity_v1', String(Math.min(1, Math.max(0, config.opacity))));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(CARD_BACKGROUND_OPACITY_EVENT));
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CARD_BACKGROUND_CHANGED_EVENT));
};

const applyFloatingButtonBackground = (record: ImportedThemePackageRecord, warnings: string[]): void => {
  const config = getConfigObject(record, 'floatingButtonBackground');
  const resources = Array.isArray(record.manifest.resources?.floatingButtonBackgrounds)
    ? record.manifest.resources?.floatingButtonBackgrounds
    : [];
  const schemes = resources.flatMap((resource) => {
    if (!resource || typeof resource !== 'object' || Array.isArray(resource)) return [];
    const item = resource as Record<string, unknown>;
    const resourceId = typeof item.id === 'string' ? item.id : '';
    const imageFilename = getAssetFilename(record, item.image);
    if (!resourceId || !imageFilename) return [];
    return [{
      id: `theme:${record.id}:floating-button-${resourceId}`,
      imageFilename,
      scale: config?.id === resourceId && typeof config.scale === 'number' ? config.scale : 100,
      source: 'package' as const
    }];
  });
  if (resources.length > 0 && schemes.length === 0) {
    warnings.push('主题包悬浮按钮背景资源不存在');
    return;
  }
  if (resources.length === 0 && config?.image) {
    const imageFilename = getAssetFilename(record, config.image);
    if (!imageFilename) {
      warnings.push('主题包悬浮按钮背景资源不存在');
      return;
    }
    const legacyId = `theme:${record.id}:floating-button-legacy`;
    floatingButtonBackgroundService.replacePackageSchemes(record.id, [{
      id: legacyId,
      imageFilename,
      scale: typeof config.scale === 'number' ? config.scale : 100,
      source: 'package'
    }], legacyId);
    return;
  }
  if (schemes.length > 0) {
    const selectedId = config && typeof config.id === 'string'
      ? `theme:${record.id}:floating-button-${config.id}`
      : undefined;
    floatingButtonBackgroundService.replacePackageSchemes(record.id, schemes, selectedId);
  }
};

const applyMemoirCalendar = async (record: ImportedThemePackageRecord, warnings: string[]): Promise<void> => {
  const memoir = getConfigObject(record, 'memoirCalendar');
  const background = memoir?.background;
  if (!background || typeof background !== 'object' || Array.isArray(background)) return;

  const config = background as Record<string, unknown>;
  const id = getNamespacedId(record, 'memoir-calendar');
  const imageFilename = getAssetFilename(record, config.image);
  if (!imageFilename) {
    warnings.push('Memoir 背景需要提供 background.image 图片资源');
    return;
  }
  const backgrounds = readArray<Record<string, unknown>>(MOOD_CALENDAR_BACKGROUND_CUSTOM_KEY)
    .filter((item) => item.id !== id);
  backgrounds.push({
    id,
    name: record.name,
    type: 'custom',
    url: '',
    thumbnail: '',
    imageFilename,
    ...(config.settings && typeof config.settings === 'object' ? config.settings : {})
  });
  writeJson(MOOD_CALENDAR_BACKGROUND_CUSTOM_KEY, backgrounds);
  localStorage.setItem(MOOD_CALENDAR_BACKGROUND_CURRENT_KEY, id);
  await moodCalendarBackgroundService.hydrateCustomBackgrounds();
};

const applySettings = async (record: ImportedThemePackageRecord, warnings: string[]): Promise<void> => {
  const color = getConfigObject(record, 'color');
  if (typeof color?.schemeId === 'string') {
    localStorage.setItem(THEME_KEYS.COLOR_SCHEME, color.schemeId);
    colorSchemeService.setScheme(color.schemeId as never);
  }

  const uiIcon = getConfigObject(record, 'uiIcon');
  if (uiIcon?.source === 'builtin' && typeof uiIcon.themeId === 'string') {
    localStorage.setItem(THEME_KEYS.UI_ICON_THEME, uiIcon.themeId);
    uiIconService.setTheme(uiIcon.themeId as never);
  } else if (uiIcon?.source === 'asset') {
    const files = uiIcon.files;
    const themeId = getPackageUiIconThemeId(
      record,
      typeof uiIcon.themeId === 'string' ? uiIcon.themeId : undefined
    );
    const numberedDirectory = typeof uiIcon.numberedDirectory === 'string'
      ? uiIcon.numberedDirectory.replace(/\/+$/, '')
      : '';
    if (numberedDirectory) {
      const mapping: Record<string, string> = {};
      for (let index = 1; index <= 96; index += 1) {
        const number = String(index).padStart(2, '0');
        const iconType = getUIIconTypeByNumber(number);
        const imageFilename = record.imageAssets[`${numberedDirectory}/${number}.png`]
          || record.imageAssets[`${numberedDirectory}/${number}.webp`];
        if (iconType && imageFilename) mapping[iconType] = imageFilename;
      }
      if (Object.keys(mapping).length !== 96) {
        warnings.push('主题包自定义 UIIcon 缺少完整的 96 张编号图片');
      } else {
        await uiIconService.registerCustomThemeAssets(themeId, mapping);
        localStorage.setItem(THEME_KEYS.UI_ICON_THEME, themeId);
        uiIconService.setTheme(themeId as never);
      }
    } else if (!files || typeof files !== 'object' || Array.isArray(files)) {
      warnings.push('主题包自定义 UIIcon 缺少 files 配置');
    } else {
      const mapping: Record<string, string> = {};
      Object.entries(files as Record<string, unknown>).forEach(([iconType, path]) => {
        const imageFilename = getAssetFilename(record, path);
        if (imageFilename) {
          mapping[iconType] = imageFilename;
        }
      });
      if (Object.keys(mapping).length === 0) {
        warnings.push('主题包自定义 UIIcon 没有可用图标资源');
      } else {
        await uiIconService.registerCustomThemeAssets(themeId, mapping);
        localStorage.setItem(THEME_KEYS.UI_ICON_THEME, themeId);
        uiIconService.setTheme(themeId as never);
      }
    }
  }

  const font = getConfigObject(record, 'font');
  if (font?.source === 'builtin' && typeof font.fontId === 'string') {
    const result = fontService.setFont(font.fontId);
    if (!result.success) warnings.push(`无法应用主题字体：${result.message}`);
  } else if (font?.source === 'asset') {
    const localFontId = themePackageImportService.getLocalAssets(record.id)?.fontId;
    if (localFontId) {
      const result = fontService.setFont(localFontId);
      if (!result.success) warnings.push(`无法应用主题字体：${result.message}`);
    } else {
      warnings.push('当前设备未找到主题字体，已保留默认字体');
    }
  }

  const achievementBottle = getConfigObject(record, 'achievementBottle');
  if (achievementBottle) {
    const style = achievementBottle.style;
    const iconPack = achievementBottle.iconPack;
    if (style && typeof style === 'object' && !Array.isArray(style) && typeof (style as Record<string, unknown>).id === 'string') {
      localStorage.setItem(THEME_KEYS.ACHIEVEMENT_BOTTLE_STYLE, String((style as Record<string, unknown>).id));
    }
    if (iconPack && typeof iconPack === 'object' && !Array.isArray(iconPack)) {
      const iconPackConfig = iconPack as Record<string, unknown>;
      if (iconPackConfig.source === 'asset' && Array.isArray(iconPackConfig.frames)) {
        const filenames = iconPackConfig.frames
          .map((path) => getAssetFilename(record, path))
          .filter((filename): filename is string => Boolean(filename));
        if (filenames.length > 0) {
          const packId = getNamespacedId(record, `achievement-bottle-${String(iconPackConfig.id || 'custom')}`);
          const packName = typeof iconPackConfig.name === 'string' ? iconPackConfig.name : record.name;
          await registerCustomAchievementBottleIconPack(packId, filenames, packName);
          localStorage.setItem(THEME_KEYS.ACHIEVEMENT_BOTTLE_ICON_PACK, packId);
        } else {
          warnings.push('成就瓶图标包没有可用图片');
        }
      } else if (typeof iconPackConfig.id === 'string') {
        localStorage.setItem(THEME_KEYS.ACHIEVEMENT_BOTTLE_ICON_PACK, iconPackConfig.id);
      }
    }
  }

  const timeline = getConfigObject(record, 'timeline');
  if (timeline) {
    if (typeof timeline.themeId === 'string' && isTimelineStyleTheme(timeline.themeId)) {
      localStorage.setItem(THEME_KEYS.TIMELINE_STYLE_THEME, timeline.themeId);
    }
    const themeId = typeof timeline.themeId === 'string' && isTimelineStyleTheme(timeline.themeId)
      ? timeline.themeId
      : 'default';
    const defaults = DEFAULT_TIMELINE_STYLE_CONFIGS[themeId];
    const rawConfig = timeline.config && typeof timeline.config === 'object' && !Array.isArray(timeline.config)
      ? timeline.config as Partial<TimelineStyleConfig>
      : {};
    const configs = normalizeTimelineStyleConfigs({
      ...readObject<Record<string, unknown>>(THEME_KEYS.TIMELINE_STYLE_CONFIGS, {}),
      [themeId]: { ...defaults, ...rawConfig }
    });
    localStorage.setItem(THEME_KEYS.TIMELINE_STYLE_CONFIGS, JSON.stringify(configs));
  }
};

export interface ThemePackageApplicationResult {
  warnings: string[];
  appliedSections: string[];
}

export const applyImportedThemePackage = async (
  record: ImportedThemePackageRecord
): Promise<ThemePackageApplicationResult> => {
  const warnings: string[] = [];
  const appliedSections: string[] = [];

  const sectionTasks: Array<[string, () => Promise<void>]> = [
    ['background', () => applyBackground(record, warnings)],
    ['navigation', () => applyNavigationBackground(record, warnings)],
    ['navigation-icons', () => applyNavigationIcons(record, warnings)],
    ['timePal', async () => applyTimePal(record, warnings)],
    ['stickers', async () => applyStickers(record)],
    ['cardBackground', async () => applyCardBackground(record)],
    ['floatingButtonBackground', async () => applyFloatingButtonBackground(record, warnings)],
    ['memoirCalendar', () => applyMemoirCalendar(record, warnings)],
    ['settings', async () => applySettings(record, warnings)]
  ];

  const hasSettingsConfiguration = ['color', 'uiIcon', 'font', 'achievementBottle', 'timeline']
    .some((key) => record.manifest.config[key] !== undefined);
  for (const [section, task] of sectionTasks) {
    const navigationConfig = getConfigObject(record, 'navigation');
    const shouldApply = section === 'settings'
      ? hasSettingsConfiguration
      : section === 'navigation-icons'
        ? navigationConfig?.icons !== undefined
        : section === 'stickers'
          ? record.manifest.config.stickers !== undefined || record.manifest.config.stickerSelector !== undefined
          : section === 'floatingButtonBackground'
            ? record.manifest.config.floatingButtonBackground !== undefined || Array.isArray(record.manifest.resources?.floatingButtonBackgrounds)
          : record.manifest.config[section] !== undefined;
    if (!shouldApply) continue;
    await task();
    appliedSections.push(section);
  }

  await new Promise<void>((resolve) => {
    queueMicrotask(resolve);
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(APPEARANCE_RESTORED_EVENT));
    window.dispatchEvent(new Event('timepal-custom-changed'));
    window.dispatchEvent(new Event('timepal-type-changed'));
    window.dispatchEvent(new Event('timepal-stage-thresholds-changed'));
    window.dispatchEvent(new Event('stickerSetsChanged'));
    window.dispatchEvent(new Event('imageListChanged'));
  }

  return { warnings, appliedSections };
};
