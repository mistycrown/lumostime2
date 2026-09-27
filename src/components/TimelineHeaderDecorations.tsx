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
 */
import React from 'react';

export type TimelineHeaderTheme = 'pink-notebook' | 'little-prince';
export type TimelineHeaderThemeSelection = 'none' | TimelineHeaderTheme;
export type TimelineHeaderDecorationScope = 'header' | 'week-card';
export type TimelineHeaderStickerId = string;
export type TimelineHeaderStickerOffsets = Partial<Record<TimelineHeaderStickerId, { x: number; y: number }>>;
export type TimelineHeaderDateBackgroundScale = { x: number; y: number };

export interface TimelineHeaderThemeAdjustments {
  stickerOffsets: TimelineHeaderStickerOffsets;
  dateBackgroundScale: TimelineHeaderDateBackgroundScale;
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
  opacity?: number;
};

export type TimelineHeaderStickerAsset = TimelineHeaderLayerAsset & {
  kind: 'sticker';
  rotationDegrees?: number;
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
    topBackground: {
      id: 'prince-top-background',
      kind: 'top-background',
      label: '星空顶部背景',
      src: `${PRINCE_ASSET_ROOT}/bak.png`,
      className: 'absolute inset-x-0 top-0 z-0 h-[132px] w-full object-cover object-[center_43%]',
      opacity: 0.54
    },
    dateBackground: {
      id: 'prince-date-background',
      kind: 'date-background',
      label: '星空纸张日期栏',
      src: `${PRINCE_ASSET_ROOT}/calendar.png`,
      className: 'pointer-events-none absolute inset-0 z-0 h-full w-full object-fill',
      opacity: 1
    },
    selectedDateBackground: {
      id: 'prince-selected-date-background',
      kind: 'selected-date-background',
      label: '今日星光卡片',
      src: `${PRINCE_ASSET_ROOT}/highlight.png`,
      className: 'pointer-events-none absolute inset-0 z-0 h-full w-full object-cover',
      opacity: 0.96
    },
    stickers: {
      header: [],
      weekCard: []
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

export const getDefaultTimelineHeaderThemeAdjustments = (): TimelineHeaderThemeAdjustments => ({
  stickerOffsets: {},
  dateBackgroundScale: { ...DEFAULT_TIMELINE_HEADER_DATE_BACKGROUND_SCALE }
});

const normalizeThemeAdjustments = (value: unknown, theme: TimelineHeaderTheme): TimelineHeaderThemeAdjustments => {
  const rawValue = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    stickerOffsets: normalizeTimelineHeaderStickerOffsets(rawValue.stickerOffsets, theme),
    dateBackgroundScale: normalizeTimelineHeaderDateBackgroundScale(rawValue.dateBackgroundScale)
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
      ? { 'pink-notebook': { ...getDefaultTimelineHeaderThemeAdjustments(), stickerOffsets: legacyOffsets } }
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
): TimelineHeaderThemeAdjustments => adjustmentMap[theme] || getDefaultTimelineHeaderThemeAdjustments();

export const isTimelineHeaderThemeSelection = (value: unknown): value is TimelineHeaderThemeSelection => (
  value === 'none' || value === 'pink-notebook' || value === 'little-prince'
);

interface TimelineHeaderDecorationsProps {
  theme?: TimelineHeaderTheme;
  scope: TimelineHeaderDecorationScope;
  stickerOffsets?: TimelineHeaderStickerOffsets;
  dateBackgroundScale?: TimelineHeaderDateBackgroundScale;
}

const getAssetStyle = (
  asset: TimelineHeaderStickerAsset,
  stickerOffsets: TimelineHeaderStickerOffsets
): React.CSSProperties => {
  const offset = stickerOffsets[asset.id] || { x: 0, y: 0 };
  return {
    opacity: asset.opacity ?? 1,
    transform: `translate(${offset.x}px, ${offset.y}px)${asset.rotationDegrees ? ` rotate(${asset.rotationDegrees}deg)` : ''}`
  };
};

export const TimelineHeaderDecorations: React.FC<TimelineHeaderDecorationsProps> = ({
  theme,
  scope,
  stickerOffsets = {},
  dateBackgroundScale = DEFAULT_TIMELINE_HEADER_DATE_BACKGROUND_SCALE
}) => {
  const config = getTimelineHeaderThemeConfig(theme);

  if (!config) return null;

  const background = scope === 'header' ? config.topBackground : config.dateBackground;
  const stickers = scope === 'header' ? config.stickers.header : config.stickers.weekCard;

  return (
    <>
      {background && (
        <img
          aria-hidden="true"
          src={background.src}
          alt=""
          draggable={false}
          className={background.className}
          style={scope === 'week-card'
            ? { opacity: background.opacity ?? 1, transform: `scale(${dateBackgroundScale.x}, ${dateBackgroundScale.y})` }
            : { opacity: background.opacity ?? 1 }}
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
          style={getAssetStyle(asset, stickerOffsets)}
        />
      ))}
    </>
  );
};

interface TimelineHeaderSelectedDateBackgroundProps {
  theme?: TimelineHeaderTheme;
}

export const TimelineHeaderSelectedDateBackground: React.FC<TimelineHeaderSelectedDateBackgroundProps> = ({ theme }) => {
  const background = getTimelineHeaderThemeConfig(theme)?.selectedDateBackground;

  if (!background) return null;

  return (
    <img
      aria-hidden="true"
      src={background.src}
      alt=""
      draggable={false}
      className={background.className}
      style={{ opacity: background.opacity ?? 1 }}
    />
  );
};
