/**
 * @file TimelineHeaderDecorations.tsx
 * @input A timeline header theme and decoration scope.
 * @output Non-interactive visual layers for the timeline calendar header and week card.
 * @description Keeps timeline header artwork in declarative theme configuration so visual themes do not change calendar behavior.
 * @updated 2026-09-27: Added the configurable pink-notebook header decoration theme.
 * @updated 2026-09-27: Added persisted selection metadata for the timeline style settings entry.
 * @updated 2026-09-27: Kept the week-card paw sticker within the animated calendar clipping boundary.
 * @updated 2026-09-27: Removed the opaque week-card surface for the continuous pink header layout.
 * @updated 2026-09-27: Added stable sticker IDs and offset helpers for live theme debugging.
 */
import React from 'react';

export type TimelineHeaderTheme = 'pink-notebook';
export type TimelineHeaderThemeSelection = 'none' | TimelineHeaderTheme;
export type TimelineHeaderDecorationScope = 'header' | 'week-card';
export type TimelineHeaderStickerId = 'cloud-border' | 'watercolor-cloud' | 'peeking-cat' | 'washi-tape' | 'corner-paw' | 'star-sparkles';
export type TimelineHeaderStickerOffsets = Partial<Record<TimelineHeaderStickerId, { x: number; y: number }>>;

export interface TimelineHeaderThemeOption {
  value: TimelineHeaderThemeSelection;
  label: string;
  description: string;
}

export const DEFAULT_TIMELINE_HEADER_THEME: TimelineHeaderThemeSelection = 'none';

export const TIMELINE_HEADER_THEME_OPTIONS: TimelineHeaderThemeOption[] = [
  { value: 'none', label: '原版', description: '保留简洁顶部' },
  { value: 'pink-notebook', label: '粉色手账', description: '云朵、猫咪与贴纸' }
];

export type TimelineHeaderDecorationAsset = {
  id: TimelineHeaderStickerId;
  label: string;
  src: string;
  className: string;
  opacity?: number;
  rotationDegrees?: number;
};

export type TimelineHeaderThemeConfig = {
  id: TimelineHeaderTheme;
  headerBackgroundOpacity: number;
  catWidth: number;
  catTop: number;
  catRight: string;
  collapsedCardClassName: string;
  darkOpacityMultiplier: number;
  headerAssets: TimelineHeaderDecorationAsset[];
  weekCardAssets: TimelineHeaderDecorationAsset[];
};

const PINK_ASSET_ROOT = '/mdlo/pink';

export const TIMELINE_HEADER_THEME_CONFIGS: Record<TimelineHeaderTheme, TimelineHeaderThemeConfig> = {
  'pink-notebook': {
    id: 'pink-notebook',
    headerBackgroundOpacity: 0.62,
    catWidth: 76,
    catTop: 8,
    catRight: 'clamp(5.75rem, 26vw, 10rem)',
    collapsedCardClassName: '',
    darkOpacityMultiplier: 0.55,
    headerAssets: [
      {
        id: 'cloud-border',
        label: '顶部云朵',
        src: `${PINK_ASSET_ROOT}/01_top_header_cloud_border.png`,
        className: 'absolute inset-x-0 top-0 h-36 w-full object-cover object-center'
      },
      {
        id: 'watercolor-cloud',
        label: '水彩云朵',
        src: `${PINK_ASSET_ROOT}/07_pink_watercolor_cloud.png`,
        className: 'absolute -left-12 top-9 w-44 max-[380px]:hidden',
        opacity: 0.34
      },
      {
        id: 'peeking-cat',
        label: '趴边小猫',
        src: `${PINK_ASSET_ROOT}/02_peeking_cat.png`,
        className: 'absolute max-[380px]:hidden'
      }
    ],
    weekCardAssets: [
      {
        id: 'washi-tape',
        label: '星星胶带',
        src: `${PINK_ASSET_ROOT}/03_pink_star_washi_tape.png`,
        className: 'absolute -left-2 -top-2 z-0 w-16',
        opacity: 0.94,
        rotationDegrees: -6
      },
      {
        id: 'corner-paw',
        label: '右下爪印',
        src: `${PINK_ASSET_ROOT}/06_large_corner_paw_sticker.png`,
        className: 'absolute bottom-1 right-1 z-0 w-8',
        opacity: 0.92,
        rotationDegrees: -12
      },
      {
        id: 'star-sparkles',
        label: '黄色星光',
        src: `${PINK_ASSET_ROOT}/04_yellow_star_sparkles.png`,
        className: 'absolute -right-1 top-0 z-0 w-7',
        opacity: 0.8
      }
    ]
  }
};

export const getTimelineHeaderThemeConfig = (theme?: TimelineHeaderTheme): TimelineHeaderThemeConfig | undefined => (
  theme ? TIMELINE_HEADER_THEME_CONFIGS[theme] : undefined
);

export const getTimelineHeaderThemeAssets = (theme: TimelineHeaderTheme): TimelineHeaderDecorationAsset[] => {
  const config = TIMELINE_HEADER_THEME_CONFIGS[theme];
  return [...config.headerAssets, ...config.weekCardAssets];
};

const STICKER_IDS: TimelineHeaderStickerId[] = ['cloud-border', 'watercolor-cloud', 'peeking-cat', 'washi-tape', 'corner-paw', 'star-sparkles'];

const normalizeOffsetValue = (value: unknown): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.min(200, Math.max(-200, numberValue)) : 0;
};

export const normalizeTimelineHeaderStickerOffsets = (value: unknown): TimelineHeaderStickerOffsets => {
  const rawOffsets = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return STICKER_IDS.reduce<TimelineHeaderStickerOffsets>((offsets, id) => {
    const rawOffset = rawOffsets[id];
    if (!rawOffset || typeof rawOffset !== 'object') return offsets;
    const position = rawOffset as { x?: unknown; y?: unknown };
    const x = normalizeOffsetValue(position.x);
    const y = normalizeOffsetValue(position.y);
    if (x !== 0 || y !== 0) offsets[id] = { x, y };
    return offsets;
  }, {});
};

export const isTimelineHeaderThemeSelection = (value: unknown): value is TimelineHeaderThemeSelection => (
  value === 'none' || value === 'pink-notebook'
);

interface TimelineHeaderDecorationsProps {
  theme?: TimelineHeaderTheme;
  scope: TimelineHeaderDecorationScope;
  stickerOffsets?: TimelineHeaderStickerOffsets;
}

export const TimelineHeaderDecorations: React.FC<TimelineHeaderDecorationsProps> = ({ theme, scope, stickerOffsets = {} }) => {
  const config = getTimelineHeaderThemeConfig(theme);

  if (!config) return null;

  const assets = scope === 'header' ? config.headerAssets : config.weekCardAssets;
  const catAsset = scope === 'header'
    ? assets.find((asset) => asset.id === 'peeking-cat')
    : undefined;
  const backgroundAssets = assets.filter((asset) => asset !== catAsset);

  return (
    <>
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 z-0 ${scope === 'header' ? 'overflow-hidden' : 'overflow-visible'}`}>
        {backgroundAssets.map((asset) => (
          <img
            key={asset.src}
            src={asset.src}
            alt=""
            draggable={false}
            className={asset.className}
            style={{
              opacity: asset.opacity ?? config.headerBackgroundOpacity,
              transform: `translate(${stickerOffsets[asset.id]?.x || 0}px, ${stickerOffsets[asset.id]?.y || 0}px)${asset.rotationDegrees ? ` rotate(${asset.rotationDegrees}deg)` : ''}`
            }}
          />
        ))}
      </div>
      {catAsset && (
        <img
          aria-hidden="true"
          src={catAsset.src}
          alt=""
          draggable={false}
          className={`${catAsset.className} pointer-events-none z-20`}
          style={{
            width: config.catWidth,
            top: config.catTop,
            right: config.catRight,
            opacity: config.headerBackgroundOpacity,
            transform: `translate(${stickerOffsets[catAsset.id]?.x || 0}px, ${stickerOffsets[catAsset.id]?.y || 0}px)`
          }}
        />
      )}
    </>
  );
};
