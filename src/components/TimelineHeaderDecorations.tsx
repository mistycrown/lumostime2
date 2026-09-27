/**
 * @file TimelineHeaderDecorations.tsx
 * @input A timeline header theme, its scoped decoration layers, and optional per-theme adjustments.
 * @output Non-interactive visual layers for the timeline toolbar, date strip, selected date, and stickers.
 * @description Declares the four-layer timeline-header theme model so artwork never takes over calendar interactions.
 * @updated 2026-09-27: Added the configurable pink-notebook header decoration theme.
 * @updated 2026-09-27: Added persisted selection metadata for the timeline style settings entry.
 * @updated 2026-09-27: Kept the week-card paw sticker within the animated calendar clipping boundary.
 * @updated 2026-09-27: Removed the opaque week-card surface for the continuous pink header layout.
 * @updated 2026-09-27: Added stable sticker IDs and offset helpers for live theme debugging.
 * @updated 2026-09-27: Reworked header themes into top, date-strip, selected-date, and sticker layers; added the Little Prince theme and per-theme adjustment helpers.
 * @updated 2026-09-27: Added Little Prince sticker assets and a persisted, adjustable toolbar foreground color for dark header artwork.
 * @updated 2026-09-27: Aligned Little Prince toolbar and sticker defaults with the supplied full-width preview composition.
 * @updated 2026-09-27: Refined Little Prince sticker scale and edge placement to preserve the header's functional controls and date labels.
 * @updated 2026-09-27: Preserves the Little Prince date-paper artwork aspect ratio instead of stretching it into the date strip.
 * @updated 2026-09-27: Keeps the Little Prince illustration at sticker scale and hides it during expanded calendar browsing.
 * @updated 2026-09-27: Extends configured top backgrounds through expanded calendars and adds a subtle left-toolbar control surface.
 * @updated 2026-09-27: Adds persistent scale and opacity controls for every themed background and sticker layer.
 * @updated 2026-09-27: Gives Little Prince left-toolbar shortcuts distinct white circular surfaces.
 * @updated 2026-09-27: Adds independent X/Y offsets so every image layer shares the same four visual controls.
 * @updated 2026-09-27: Leaves left shortcut surface opacity to the concrete toolbar buttons for a lighter result.
 */
import React from 'react';

export type TimelineHeaderTheme = 'pink-notebook' | 'little-prince';
export type TimelineHeaderThemeSelection = 'none' | TimelineHeaderTheme;
export type TimelineHeaderDecorationScope = 'header' | 'week-card';
export type TimelineHeaderStickerId = string;
export type TimelineHeaderStickerOffsets = Partial<Record<TimelineHeaderStickerId, { x: number; y: number }>>;
export type TimelineHeaderLayerScale = { x: number; y: number };
export type TimelineHeaderLayerOffset = { x: number; y: number };
export type TimelineHeaderDateBackgroundScale = TimelineHeaderLayerScale;
export type TimelineHeaderStickerScales = Partial<Record<TimelineHeaderStickerId, number>>;
export type TimelineHeaderStickerOpacities = Partial<Record<TimelineHeaderStickerId, number>>;

export interface TimelineHeaderThemeAdjustments {
  stickerOffsets: TimelineHeaderStickerOffsets;
  stickerScales: TimelineHeaderStickerScales;
  stickerOpacities: TimelineHeaderStickerOpacities;
  topBackgroundOffset: TimelineHeaderLayerOffset;
  topBackgroundScale: TimelineHeaderLayerScale;
  topBackgroundOpacity: number;
  dateBackgroundOffset: TimelineHeaderLayerOffset;
  dateBackgroundScale: TimelineHeaderDateBackgroundScale;
  dateBackgroundOpacity: number;
  selectedDateBackgroundOffset: TimelineHeaderLayerOffset;
  selectedDateBackgroundScale: TimelineHeaderLayerScale;
  selectedDateBackgroundOpacity: number;
  toolbarForegroundColor?: string;
}

export type TimelineHeaderThemeAdjustmentMap = Partial<Record<TimelineHeaderTheme, TimelineHeaderThemeAdjustments>>;

export interface TimelineHeaderThemeOption {
  value: TimelineHeaderThemeSelection;
  label: string;
  description: string;
}

type TimelineHeaderLayerKind = 'top-background' | 'date-background' | 'selected-date-background' | 'sticker';

type TimelineHeaderLayerAsset = {
  id: string;
  label: string;
  src: string;
  className: string;
  expandedClassName?: string;
  opacity?: number;
};

export type TimelineHeaderStickerAsset = TimelineHeaderLayerAsset & {
  kind: 'sticker';
  rotationDegrees?: number;
  hideWhenCalendarExpanded?: boolean;
};

type TimelineHeaderBackgroundAsset = TimelineHeaderLayerAsset & {
  kind: Exclude<TimelineHeaderLayerKind, 'sticker'>;
};

export type TimelineHeaderThemeConfig = {
  id: TimelineHeaderTheme;
  containerClassName: string;
  collapsedCalendarHeight: number;
  dateStripClassName: string;
  darkOpacityMultiplier: number;
  toolbarForegroundColor?: string;
  toolbarButtonClassName?: string;
  toolbarLeftButtonClassName?: string;
  topBackground?: TimelineHeaderBackgroundAsset;
  dateBackground?: TimelineHeaderBackgroundAsset;
  selectedDateBackground?: TimelineHeaderBackgroundAsset;
  stickers: {
    header: TimelineHeaderStickerAsset[];
    weekCard: TimelineHeaderStickerAsset[];
  };
};

export const DEFAULT_TIMELINE_HEADER_THEME: TimelineHeaderThemeSelection = 'none';
export const DEFAULT_TIMELINE_HEADER_DATE_BACKGROUND_SCALE: TimelineHeaderDateBackgroundScale = { x: 1, y: 1 };
export const DEFAULT_TIMELINE_HEADER_LAYER_SCALE: TimelineHeaderLayerScale = { x: 1, y: 1 };
export const DEFAULT_TIMELINE_HEADER_LAYER_OFFSET: TimelineHeaderLayerOffset = { x: 0, y: 0 };

export const TIMELINE_HEADER_THEME_OPTIONS: TimelineHeaderThemeOption[] = [
  { value: 'none', label: '原版', description: '保留简洁顶部' },
  { value: 'pink-notebook', label: '粉色手账', description: '云朵、猫咪与贴纸' },
  { value: 'little-prince', label: '小王子星空', description: '星空、纸张日期栏与今日卡片' }
];

const PINK_ASSET_ROOT = '/mdlo/pink';
const PRINCE_ASSET_ROOT = '/mdlo/prince';

export const TIMELINE_HEADER_THEME_CONFIGS: Record<TimelineHeaderTheme, TimelineHeaderThemeConfig> = {
  'pink-notebook': {
    id: 'pink-notebook',
    containerClassName: 'bg-white/80 backdrop-blur-md',
    collapsedCalendarHeight: 77,
    dateStripClassName: 'mx-2 h-[77px]',
    darkOpacityMultiplier: 0.55,
    topBackground: {
      id: 'pink-top-background',
      kind: 'top-background',
      label: '顶部浅色云纹',
      src: `${PINK_ASSET_ROOT}/01_top_header_cloud_border.png`,
      className: 'absolute inset-x-0 top-0 z-0 h-[132px] w-full object-cover object-center',
      expandedClassName: 'absolute inset-0 z-0 h-full w-full object-cover object-center',
      opacity: 0.62
    },
    stickers: {
      header: [
        {
          id: 'watercolor-cloud',
          kind: 'sticker',
          label: '水彩云朵',
          src: `${PINK_ASSET_ROOT}/07_pink_watercolor_cloud.png`,
          className: 'pointer-events-none absolute -left-12 top-9 z-[1] w-44 max-[380px]:hidden',
          opacity: 0.34
        },
        {
          id: 'peeking-cat',
          kind: 'sticker',
          label: '趴边小猫',
          src: `${PINK_ASSET_ROOT}/02_peeking_cat.png`,
          className: 'pointer-events-none absolute right-[clamp(5.75rem,26vw,10rem)] top-2 z-20 w-[76px] max-[380px]:hidden',
          opacity: 0.62
        }
      ],
      weekCard: [
        {
          id: 'washi-tape',
          kind: 'sticker',
          label: '星星胶带',
          src: `${PINK_ASSET_ROOT}/03_pink_star_washi_tape.png`,
          className: 'pointer-events-none absolute -left-2 -top-2 z-20 w-16',
          opacity: 0.94,
          rotationDegrees: -6
        },
        {
          id: 'corner-paw',
          kind: 'sticker',
          label: '右下爪印',
          src: `${PINK_ASSET_ROOT}/06_large_corner_paw_sticker.png`,
          className: 'pointer-events-none absolute bottom-1 right-1 z-20 w-8',
          opacity: 0.92,
          rotationDegrees: -12
        },
        {
          id: 'star-sparkles',
          kind: 'sticker',
          label: '黄色星光',
          src: `${PINK_ASSET_ROOT}/04_yellow_star_sparkles.png`,
          className: 'pointer-events-none absolute -right-1 top-0 z-20 w-7',
          opacity: 0.8
        }
      ]
    }
  },
  'little-prince': {
    id: 'little-prince',
    containerClassName: 'bg-[#f7f2ee]/50 backdrop-blur-[1px]',
    collapsedCalendarHeight: 77,
    dateStripClassName: 'mx-2 h-[77px]',
    darkOpacityMultiplier: 0.5,
    toolbarForegroundColor: '#806861',
    toolbarButtonClassName: '[&_button]:!bg-white/90 [&_button]:!shadow-[0_2px_8px_rgba(85,65,55,0.16)]',
    topBackground: {
      id: 'prince-top-background',
      kind: 'top-background',
      label: '星空顶部背景',
      src: `${PRINCE_ASSET_ROOT}/01_top_header_background.png`,
      className: 'absolute inset-x-0 top-0 z-0 h-[132px] w-full object-cover object-[center_43%]',
      expandedClassName: 'absolute inset-0 z-0 h-full w-full object-cover object-center',
      opacity: 0.54
    },
    dateBackground: {
      id: 'prince-date-background',
      kind: 'date-background',
      label: '星空纸张日期栏',
      src: `${PRINCE_ASSET_ROOT}/02_date_bar_background.png`,
      className: 'pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center',
      opacity: 1
    },
    selectedDateBackground: {
      id: 'prince-selected-date-background',
      kind: 'selected-date-background',
      label: '今日星光卡片',
      src: `${PRINCE_ASSET_ROOT}/08_selected_date_card.png`,
      className: 'pointer-events-none absolute inset-0 z-0 h-full w-full object-cover',
      opacity: 0.96
    },
    stickers: {
      header: [
        {
          id: 'prince-golden-constellation',
          kind: 'sticker',
          label: '金色星轨',
          src: `${PRINCE_ASSET_ROOT}/04_golden_star_constellation.png`,
          className: 'pointer-events-none absolute -left-9 -top-2 z-[1] w-44',
          opacity: 0.08
        },
        {
          id: 'prince-peach-planet',
          kind: 'sticker',
          label: '蜜桃环形星球',
          src: `${PRINCE_ASSET_ROOT}/05_peach_ringed_planet.png`,
          className: 'pointer-events-none absolute left-2 top-3 z-[2] w-10',
          opacity: 0.2
        },
        {
          id: 'prince-with-rose',
          kind: 'sticker',
          label: '小王子与玫瑰',
          src: `${PRINCE_ASSET_ROOT}/03_little_prince_planet_with_rose.png`,
          className: 'pointer-events-none absolute right-28 top-1 z-[3] w-20 max-[380px]:w-[4.5rem]',
          opacity: 0.9,
          hideWhenCalendarExpanded: true
        }
      ],
      weekCard: [
        {
          id: 'prince-beige-planet',
          kind: 'sticker',
          label: '云间米色星球',
          src: `${PRINCE_ASSET_ROOT}/06_beige_ringed_planet_with_clouds.png`,
          className: 'pointer-events-none absolute -bottom-3 right-0 z-20 w-12',
          opacity: 0.18
        },
        {
          id: 'prince-pastel-clouds',
          kind: 'sticker',
          label: '粉蓝云团',
          src: `${PRINCE_ASSET_ROOT}/07_pastel_cloud_cluster.png`,
          className: 'pointer-events-none absolute -bottom-2 right-16 z-[1] w-20',
          opacity: 0.1
        }
      ]
    }
  }
};

export const getTimelineHeaderThemeConfig = (theme?: TimelineHeaderTheme): TimelineHeaderThemeConfig | undefined => (
  theme ? TIMELINE_HEADER_THEME_CONFIGS[theme] : undefined
);

export const getTimelineHeaderThemeAssets = (theme: TimelineHeaderTheme): TimelineHeaderStickerAsset[] => {
  const config = TIMELINE_HEADER_THEME_CONFIGS[theme];
  return [...config.stickers.header, ...config.stickers.weekCard];
};

const normalizeOffsetValue = (value: unknown): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.min(200, Math.max(-200, numberValue)) : 0;
};

const normalizeScaleValue = (value: unknown): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.min(2, Math.max(0.5, numberValue)) : 1;
};

const normalizeOpacityValue = (value: unknown): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.min(1, Math.max(0, numberValue)) : 1;
};

export const normalizeTimelineHeaderStickerOffsets = (value: unknown, theme?: TimelineHeaderTheme): TimelineHeaderStickerOffsets => {
  const rawOffsets = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const allowedIds = theme ? new Set(getTimelineHeaderThemeAssets(theme).map((asset) => asset.id)) : undefined;

  return Object.entries(rawOffsets).reduce<TimelineHeaderStickerOffsets>((offsets, [id, rawOffset]) => {
    if (allowedIds && !allowedIds.has(id)) return offsets;
    if (!rawOffset || typeof rawOffset !== 'object') return offsets;
    const position = rawOffset as { x?: unknown; y?: unknown };
    const x = normalizeOffsetValue(position.x);
    const y = normalizeOffsetValue(position.y);
    if (x !== 0 || y !== 0) offsets[id] = { x, y };
    return offsets;
  }, {});
};

export const normalizeTimelineHeaderDateBackgroundScale = (value: unknown): TimelineHeaderDateBackgroundScale => {
  const rawScale = value && typeof value === 'object' ? value as { x?: unknown; y?: unknown } : {};
  return {
    x: normalizeScaleValue(rawScale.x),
    y: normalizeScaleValue(rawScale.y)
  };
};

export const normalizeTimelineHeaderLayerOffset = (value: unknown): TimelineHeaderLayerOffset => {
  const rawOffset = value && typeof value === 'object' ? value as { x?: unknown; y?: unknown } : {};
  return {
    x: normalizeOffsetValue(rawOffset.x),
    y: normalizeOffsetValue(rawOffset.y)
  };
};

const normalizeTimelineHeaderStickerValues = (
  value: unknown,
  theme: TimelineHeaderTheme,
  normalizeValue: (value: unknown) => number,
  defaultValue: number
): Partial<Record<TimelineHeaderStickerId, number>> => {
  const rawValues = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const allowedIds = new Set(getTimelineHeaderThemeAssets(theme).map((asset) => asset.id));

  return Object.entries(rawValues).reduce<Partial<Record<TimelineHeaderStickerId, number>>>((values, [id, rawValue]) => {
    if (!allowedIds.has(id)) return values;
    const normalized = normalizeValue(rawValue);
    if (normalized !== defaultValue) values[id] = normalized;
    return values;
  }, {});
};

export const normalizeTimelineHeaderStickerScales = (value: unknown, theme: TimelineHeaderTheme): TimelineHeaderStickerScales => (
  normalizeTimelineHeaderStickerValues(value, theme, normalizeScaleValue, 1)
);

export const normalizeTimelineHeaderStickerOpacities = (value: unknown, theme: TimelineHeaderTheme): TimelineHeaderStickerOpacities => (
  normalizeTimelineHeaderStickerValues(value, theme, normalizeOpacityValue, 1)
);

const normalizeToolbarForegroundColor = (value: unknown, fallback?: string): string | undefined => {
  if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) return value.toUpperCase();
  return fallback;
};

export const getDefaultTimelineHeaderThemeAdjustments = (theme?: TimelineHeaderTheme): TimelineHeaderThemeAdjustments => ({
  stickerOffsets: {},
  stickerScales: {},
  stickerOpacities: {},
  topBackgroundOffset: { ...DEFAULT_TIMELINE_HEADER_LAYER_OFFSET },
  topBackgroundScale: { ...DEFAULT_TIMELINE_HEADER_LAYER_SCALE },
  topBackgroundOpacity: 1,
  dateBackgroundOffset: { ...DEFAULT_TIMELINE_HEADER_LAYER_OFFSET },
  dateBackgroundScale: { ...DEFAULT_TIMELINE_HEADER_DATE_BACKGROUND_SCALE },
  dateBackgroundOpacity: 1,
  selectedDateBackgroundOffset: { ...DEFAULT_TIMELINE_HEADER_LAYER_OFFSET },
  selectedDateBackgroundScale: { ...DEFAULT_TIMELINE_HEADER_LAYER_SCALE },
  selectedDateBackgroundOpacity: 1,
  toolbarForegroundColor: getTimelineHeaderThemeConfig(theme)?.toolbarForegroundColor
});

const normalizeThemeAdjustments = (value: unknown, theme: TimelineHeaderTheme): TimelineHeaderThemeAdjustments => {
  const rawValue = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    stickerOffsets: normalizeTimelineHeaderStickerOffsets(rawValue.stickerOffsets, theme),
    stickerScales: normalizeTimelineHeaderStickerScales(rawValue.stickerScales, theme),
    stickerOpacities: normalizeTimelineHeaderStickerOpacities(rawValue.stickerOpacities, theme),
    topBackgroundOffset: normalizeTimelineHeaderLayerOffset(rawValue.topBackgroundOffset),
    topBackgroundScale: normalizeTimelineHeaderDateBackgroundScale(rawValue.topBackgroundScale),
    topBackgroundOpacity: normalizeOpacityValue(rawValue.topBackgroundOpacity),
    dateBackgroundOffset: normalizeTimelineHeaderLayerOffset(rawValue.dateBackgroundOffset),
    dateBackgroundScale: normalizeTimelineHeaderDateBackgroundScale(rawValue.dateBackgroundScale),
    dateBackgroundOpacity: normalizeOpacityValue(rawValue.dateBackgroundOpacity),
    selectedDateBackgroundOffset: normalizeTimelineHeaderLayerOffset(rawValue.selectedDateBackgroundOffset),
    selectedDateBackgroundScale: normalizeTimelineHeaderDateBackgroundScale(rawValue.selectedDateBackgroundScale),
    selectedDateBackgroundOpacity: normalizeOpacityValue(rawValue.selectedDateBackgroundOpacity),
    toolbarForegroundColor: normalizeToolbarForegroundColor(rawValue.toolbarForegroundColor, getTimelineHeaderThemeConfig(theme)?.toolbarForegroundColor)
  };
};

export const normalizeTimelineHeaderThemeAdjustmentMap = (value: unknown): TimelineHeaderThemeAdjustmentMap => {
  const rawValue = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const hasThemeShape = Object.keys(TIMELINE_HEADER_THEME_CONFIGS).some((theme) => (
    rawValue[theme] && typeof rawValue[theme] === 'object'
  ));

  if (!hasThemeShape) {
    const legacyOffsets = normalizeTimelineHeaderStickerOffsets(rawValue, 'pink-notebook');
    return Object.keys(legacyOffsets).length > 0
      ? { 'pink-notebook': { ...getDefaultTimelineHeaderThemeAdjustments('pink-notebook'), stickerOffsets: legacyOffsets } }
      : {};
  }

  return (Object.keys(TIMELINE_HEADER_THEME_CONFIGS) as TimelineHeaderTheme[]).reduce<TimelineHeaderThemeAdjustmentMap>((adjustments, theme) => {
    if (rawValue[theme] && typeof rawValue[theme] === 'object') {
      adjustments[theme] = normalizeThemeAdjustments(rawValue[theme], theme);
    }
    return adjustments;
  }, {});
};

export const getTimelineHeaderThemeAdjustments = (
  adjustmentMap: TimelineHeaderThemeAdjustmentMap,
  theme: TimelineHeaderTheme
): TimelineHeaderThemeAdjustments => adjustmentMap[theme] || getDefaultTimelineHeaderThemeAdjustments(theme);

export const isTimelineHeaderThemeSelection = (value: unknown): value is TimelineHeaderThemeSelection => (
  value === 'none' || value === 'pink-notebook' || value === 'little-prince'
);

interface TimelineHeaderDecorationsProps {
  theme?: TimelineHeaderTheme;
  scope: TimelineHeaderDecorationScope;
  stickerOffsets?: TimelineHeaderStickerOffsets;
  stickerScales?: TimelineHeaderStickerScales;
  stickerOpacities?: TimelineHeaderStickerOpacities;
  topBackgroundOffset?: TimelineHeaderLayerOffset;
  topBackgroundScale?: TimelineHeaderLayerScale;
  topBackgroundOpacity?: number;
  dateBackgroundOffset?: TimelineHeaderLayerOffset;
  dateBackgroundScale?: TimelineHeaderDateBackgroundScale;
  dateBackgroundOpacity?: number;
  isCalendarExpanded?: boolean;
}

const getAssetStyle = (
  asset: TimelineHeaderStickerAsset,
  stickerOffsets: TimelineHeaderStickerOffsets,
  stickerScales: TimelineHeaderStickerScales,
  stickerOpacities: TimelineHeaderStickerOpacities
): React.CSSProperties => {
  const offset = stickerOffsets[asset.id] || { x: 0, y: 0 };
  const scale = stickerScales[asset.id] ?? 1;
  const opacity = stickerOpacities[asset.id] ?? 1;
  return {
    opacity: (asset.opacity ?? 1) * opacity,
    transform: `translate(${offset.x}px, ${offset.y}px)${asset.rotationDegrees ? ` rotate(${asset.rotationDegrees}deg)` : ''} scale(${scale})`
  };
};

export const TimelineHeaderDecorations: React.FC<TimelineHeaderDecorationsProps> = ({
  theme,
  scope,
  stickerOffsets = {},
  stickerScales = {},
  stickerOpacities = {},
  topBackgroundOffset = DEFAULT_TIMELINE_HEADER_LAYER_OFFSET,
  topBackgroundScale = DEFAULT_TIMELINE_HEADER_LAYER_SCALE,
  topBackgroundOpacity = 1,
  dateBackgroundOffset = DEFAULT_TIMELINE_HEADER_LAYER_OFFSET,
  dateBackgroundScale = DEFAULT_TIMELINE_HEADER_DATE_BACKGROUND_SCALE,
  dateBackgroundOpacity = 1,
  isCalendarExpanded = false
}) => {
  const config = getTimelineHeaderThemeConfig(theme);

  if (!config) return null;

  const background = scope === 'header' ? config.topBackground : config.dateBackground;
  const stickers = (scope === 'header' ? config.stickers.header : config.stickers.weekCard)
    .filter((asset) => !isCalendarExpanded || !asset.hideWhenCalendarExpanded);
  const backgroundScale = scope === 'header' ? topBackgroundScale : dateBackgroundScale;
  const backgroundOpacity = scope === 'header' ? topBackgroundOpacity : dateBackgroundOpacity;
  const backgroundOffset = scope === 'header' ? topBackgroundOffset : dateBackgroundOffset;

  return (
    <>
      {background && (
        <img
          aria-hidden="true"
          src={background.src}
          alt=""
          draggable={false}
          className={scope === 'header' && isCalendarExpanded
            ? background.expandedClassName || background.className
            : background.className}
          style={{
            opacity: (background.opacity ?? 1) * backgroundOpacity,
            transform: `translate(${backgroundOffset.x}px, ${backgroundOffset.y}px) scale(${backgroundScale.x}, ${backgroundScale.y})`
          }}
        />
      )}
      {stickers.map((asset) => (
        <img
          key={asset.id}
          aria-hidden="true"
          src={asset.src}
          alt=""
          draggable={false}
          className={asset.className}
          style={getAssetStyle(asset, stickerOffsets, stickerScales, stickerOpacities)}
        />
      ))}
    </>
  );
};

interface TimelineHeaderSelectedDateBackgroundProps {
  theme?: TimelineHeaderTheme;
  offset?: TimelineHeaderLayerOffset;
  scale?: TimelineHeaderLayerScale;
  opacity?: number;
}

export const TimelineHeaderSelectedDateBackground: React.FC<TimelineHeaderSelectedDateBackgroundProps> = ({
  theme,
  offset = DEFAULT_TIMELINE_HEADER_LAYER_OFFSET,
  scale = DEFAULT_TIMELINE_HEADER_LAYER_SCALE,
  opacity = 1
}) => {
  const background = getTimelineHeaderThemeConfig(theme)?.selectedDateBackground;

  if (!background) return null;

  return (
    <img
      aria-hidden="true"
      src={background.src}
      alt=""
      draggable={false}
      className={background.className}
      style={{ opacity: (background.opacity ?? 1) * opacity, transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale.x}, ${scale.y})` }}
    />
  );
};
