/**
 * @file AchievementBottle.tsx
 * @description Physics-driven achievement bottle visualization with switchable bottle skins for the achievement page and sponsorship previews.
 *
 * @updated 2026-03-28: Softened the bottle skin palette, added pearl, linen, and mint variants, and kept the one-decimal counter while flooring rendered star bodies inside the chamber.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Bodies, Body, Composite, Engine, Runner, World } from 'matter-js';
import { Star } from 'lucide-react';
import {
  DEFAULT_ACHIEVEMENT_BOTTLE_STYLE,
  type AchievementBottleStyle
} from '../../services/achievementBottleStyleService';
import {
  DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK,
  type AchievementBottleIconPack
} from '../../services/achievementBottleIconPackService';
import {
  formatAchievementStars,
  getAchievementRenderableStarCount,
  normalizeAchievementStarValue
} from '../../utils/achievementUtils';

interface AchievementBottleProps {
  starCount: number;
  rebuildToken: number;
  compact?: boolean;
  styleVariant?: AchievementBottleStyle;
  iconPack?: AchievementBottleIconPack;
  renderMode?: 'live' | 'preview';
}

interface BottlePalette {
  outerBackground: string;
  outerBorderColor: string;
  outerShadow: string;
  outerRadius: string;
  haloBackground: string;
  neckBackground: string;
  eyebrowColor: string;
  countColor: string;
  chamberBackground: string;
  chamberBorderColor: string;
  chamberShadow: string;
  chamberRadius: string;
  sideHighlight: string;
  bottomGlow: string;
  topMist: string;
  emptyIconColor: string;
  emptyTitleColor: string;
  emptyBodyColor: string;
  starColor: string;
  starShadow: string;
  overflowBackground: string;
  overflowColor: string;
}

interface PreviewStarSpec {
  left: string;
  top: string;
  rotate: number;
  scale: number;
  opacity: number;
}

interface GravityState {
  baselineBeta: number | null;
  baselineGamma: number | null;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
}

const MAX_VISIBLE_STARS = 120;
const PREVIEW_VISIBLE_STARS = 12;
const STAR_SIZE = 26;
const STAR_IMAGE_SIZE = 20;
const STAR_SCALE_MIN = 0.92;
const STAR_SCALE_MAX = 1.08;
const BOTTLE_PADDING = 16;
const EMPTY_DIMENSIONS = { width: 0, height: 0 };
const DEFAULT_GRAVITY = { x: 0, y: 1 };
const GRAVITY_SCALE = 0.0016;
const GRAVITY_SMOOTHING = 0.12;
const MAX_SENSOR_TILT_DEGREES = 32;
const MAX_GRAVITY_SWAY_X = 0.78;
const MAX_GRAVITY_SWAY_Y = 0.24;
const MIN_GRAVITY_Y = 0.64;
const MAX_GRAVITY_Y = 1.16;
const BASELINE_RESET_THRESHOLD = 58;
const STAR_IMAGE_PATH_ENTRIES = Object.entries(
  import.meta.glob<string>(
    '../../../public/stars/*/*.{png,jpg,jpeg,webp,svg}',
    {
      eager: true,
      import: 'default'
    }
  )
)
  .sort(([firstPath], [secondPath]) => firstPath.localeCompare(secondPath, undefined, { numeric: true }));

const STAR_IMAGE_PATHS_BY_PACK = STAR_IMAGE_PATH_ENTRIES.reduce<Record<string, string[]>>((result, [filePath, assetUrl]) => {
  const segments = filePath.split('/');
  const packName = segments[segments.length - 2];

  if (!packName) {
    return result;
  }

  if (!result[packName]) {
    result[packName] = [];
  }

  result[packName].push(assetUrl);
  return result;
}, {});

const PREVIEW_STAR_LAYOUTS: PreviewStarSpec[] = [
  { left: '16%', top: '78%', rotate: -12, scale: 0.96, opacity: 0.74 },
  { left: '31%', top: '74%', rotate: 8, scale: 1.02, opacity: 0.82 },
  { left: '48%', top: '79%', rotate: -4, scale: 1.08, opacity: 0.78 },
  { left: '65%', top: '73%', rotate: 13, scale: 0.93, opacity: 0.86 },
  { left: '80%', top: '77%', rotate: -16, scale: 1.05, opacity: 0.76 },
  { left: '24%', top: '61%', rotate: 17, scale: 0.88, opacity: 0.68 },
  { left: '41%', top: '58%', rotate: -10, scale: 0.95, opacity: 0.8 },
  { left: '58%', top: '62%', rotate: 6, scale: 1.02, opacity: 0.72 },
  { left: '74%', top: '59%', rotate: -7, scale: 0.9, opacity: 0.83 },
  { left: '32%', top: '46%', rotate: -18, scale: 0.84, opacity: 0.64 },
  { left: '52%', top: '44%', rotate: 11, scale: 0.9, opacity: 0.7 },
  { left: '68%', top: '47%', rotate: -2, scale: 0.86, opacity: 0.66 }
];

const BOTTLE_PALETTES: Record<AchievementBottleStyle, BottlePalette> = {
  sunlit: {
    outerBackground: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.98), rgba(255,249,231,0.92) 46%, rgba(247,220,154,0.58) 100%)',
    outerBorderColor: 'rgba(255,255,255,0.82)',
    outerShadow: 'inset 0 1px 0 rgba(255,255,255,0.86), 0 18px 42px rgba(191,148,69,0.12)',
    outerRadius: '2rem',
    haloBackground: 'radial-gradient(circle, rgba(255,233,178,0.42), rgba(255,233,178,0))',
    neckBackground: 'linear-gradient(90deg, rgba(250,222,153,0.14), rgba(255,251,240,0.9), rgba(250,222,153,0.14))',
    eyebrowColor: '#be9b6c',
    countColor: '#74614d',
    chamberBackground: 'linear-gradient(180deg, rgba(255,255,255,0.54), rgba(255,250,239,0.24))',
    chamberBorderColor: 'rgba(244,200,109,0.28)',
    chamberShadow: 'inset 0 1px 0 rgba(255,255,255,0.66), inset 0 -10px 24px rgba(224,181,87,0.05)',
    chamberRadius: '1.75rem',
    sideHighlight: 'linear-gradient(180deg, rgba(255,255,255,0.64), rgba(255,255,255,0.04))',
    bottomGlow: 'linear-gradient(180deg, rgba(247,193,94,0), rgba(232,187,92,0.11))',
    topMist: 'radial-gradient(circle at top, rgba(255,255,255,0.94), rgba(255,255,255,0))',
    emptyIconColor: '#e8bb66',
    emptyTitleColor: '#67584a',
    emptyBodyColor: '#84776d',
    starColor: '#efb34a',
    starShadow: 'drop-shadow(0 4px 12px rgba(239,179,74,0.26))',
    overflowBackground: 'rgba(255,255,255,0.9)',
    overflowColor: '#66584d'
  },
  seaGlass: {
    outerBackground: 'radial-gradient(circle at 50% 0%, rgba(251,255,255,0.98), rgba(232,250,246,0.92) 46%, rgba(169,221,214,0.54) 100%)',
    outerBorderColor: 'rgba(235,253,249,0.92)',
    outerShadow: 'inset 0 1px 0 rgba(255,255,255,0.88), 0 18px 44px rgba(71,160,151,0.12)',
    outerRadius: '2.2rem',
    haloBackground: 'radial-gradient(circle, rgba(182,239,230,0.38), rgba(182,239,230,0))',
    neckBackground: 'linear-gradient(90deg, rgba(166,233,223,0.14), rgba(249,255,254,0.9), rgba(166,233,223,0.14))',
    eyebrowColor: '#6c9d97',
    countColor: '#486b67',
    chamberBackground: 'linear-gradient(180deg, rgba(247,255,254,0.58), rgba(230,248,244,0.24))',
    chamberBorderColor: 'rgba(92,208,191,0.24)',
    chamberShadow: 'inset 0 1px 0 rgba(255,255,255,0.68), inset 0 -14px 26px rgba(58,175,159,0.05)',
    chamberRadius: '2rem',
    sideHighlight: 'linear-gradient(180deg, rgba(255,255,255,0.66), rgba(255,255,255,0.05))',
    bottomGlow: 'linear-gradient(180deg, rgba(93,201,185,0), rgba(82,186,171,0.12))',
    topMist: 'radial-gradient(circle at top, rgba(255,255,255,0.88), rgba(232,250,246,0))',
    emptyIconColor: '#67bcaf',
    emptyTitleColor: '#3f6661',
    emptyBodyColor: '#64837f',
    starColor: '#59bdae',
    starShadow: 'drop-shadow(0 4px 12px rgba(89,189,174,0.24))',
    overflowBackground: 'rgba(247,255,253,0.9)',
    overflowColor: '#496b67'
  },
  midnight: {
    outerBackground: 'radial-gradient(circle at 50% 0%, rgba(242,246,255,0.98), rgba(213,223,247,0.9) 46%, rgba(150,171,221,0.6) 100%)',
    outerBorderColor: 'rgba(226,234,255,0.84)',
    outerShadow: 'inset 0 1px 0 rgba(255,255,255,0.76), 0 20px 48px rgba(92,112,171,0.18)',
    outerRadius: '1.9rem',
    haloBackground: 'radial-gradient(circle, rgba(177,191,239,0.34), rgba(177,191,239,0))',
    neckBackground: 'linear-gradient(90deg, rgba(158,176,229,0.14), rgba(244,247,255,0.92), rgba(158,176,229,0.14))',
    eyebrowColor: '#798ab8',
    countColor: '#44516f',
    chamberBackground: 'linear-gradient(180deg, rgba(244,247,255,0.58), rgba(220,227,247,0.26))',
    chamberBorderColor: 'rgba(133,154,223,0.24)',
    chamberShadow: 'inset 0 1px 0 rgba(255,255,255,0.64), inset 0 -14px 28px rgba(99,120,189,0.06)',
    chamberRadius: '1.6rem',
    sideHighlight: 'linear-gradient(180deg, rgba(255,255,255,0.54), rgba(255,255,255,0.04))',
    bottomGlow: 'linear-gradient(180deg, rgba(124,147,226,0), rgba(130,150,221,0.12))',
    topMist: 'radial-gradient(circle at top, rgba(255,255,255,0.82), rgba(220,228,248,0))',
    emptyIconColor: '#d3a75b',
    emptyTitleColor: '#4e5d7d',
    emptyBodyColor: '#69768f',
    starColor: '#e3b35a',
    starShadow: 'drop-shadow(0 4px 14px rgba(227,179,90,0.26))',
    overflowBackground: 'rgba(245,247,255,0.92)',
    overflowColor: '#4c5974'
  },
  blushBloom: {
    outerBackground: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.98), rgba(255,241,246,0.92) 46%, rgba(241,196,210,0.56) 100%)',
    outerBorderColor: 'rgba(255,255,255,0.84)',
    outerShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 18px 42px rgba(199,132,155,0.12)',
    outerRadius: '2.35rem',
    haloBackground: 'radial-gradient(circle, rgba(248,204,219,0.38), rgba(248,204,219,0))',
    neckBackground: 'linear-gradient(90deg, rgba(251,218,229,0.16), rgba(255,249,251,0.92), rgba(251,218,229,0.16))',
    eyebrowColor: '#bf8799',
    countColor: '#7d5d69',
    chamberBackground: 'linear-gradient(180deg, rgba(255,255,255,0.58), rgba(255,243,247,0.24))',
    chamberBorderColor: 'rgba(232,150,184,0.24)',
    chamberShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -12px 24px rgba(235,157,188,0.05)',
    chamberRadius: '2.1rem',
    sideHighlight: 'linear-gradient(180deg, rgba(255,255,255,0.68), rgba(255,255,255,0.04))',
    bottomGlow: 'linear-gradient(180deg, rgba(234,168,194,0), rgba(228,160,186,0.12))',
    topMist: 'radial-gradient(circle at top, rgba(255,255,255,0.94), rgba(255,244,248,0))',
    emptyIconColor: '#e39bb6',
    emptyTitleColor: '#755863',
    emptyBodyColor: '#91707b',
    starColor: '#e58ead',
    starShadow: 'drop-shadow(0 4px 12px rgba(229,142,173,0.24))',
    overflowBackground: 'rgba(255,251,252,0.92)',
    overflowColor: '#775763'
  },
  pearlMist: {
    outerBackground: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.99), rgba(244,245,247,0.94) 48%, rgba(221,225,232,0.6) 100%)',
    outerBorderColor: 'rgba(255,255,255,0.9)',
    outerShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 16px 36px rgba(160,168,181,0.12)',
    outerRadius: '2.15rem',
    haloBackground: 'radial-gradient(circle, rgba(230,234,240,0.36), rgba(230,234,240,0))',
    neckBackground: 'linear-gradient(90deg, rgba(223,228,236,0.16), rgba(252,253,255,0.94), rgba(223,228,236,0.16))',
    eyebrowColor: '#8a919c',
    countColor: '#616874',
    chamberBackground: 'linear-gradient(180deg, rgba(255,255,255,0.64), rgba(244,246,249,0.28))',
    chamberBorderColor: 'rgba(192,199,212,0.26)',
    chamberShadow: 'inset 0 1px 0 rgba(255,255,255,0.76), inset 0 -12px 24px rgba(169,177,189,0.05)',
    chamberRadius: '1.95rem',
    sideHighlight: 'linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.05))',
    bottomGlow: 'linear-gradient(180deg, rgba(201,209,221,0), rgba(196,203,214,0.11))',
    topMist: 'radial-gradient(circle at top, rgba(255,255,255,0.95), rgba(245,247,250,0))',
    emptyIconColor: '#a8afbb',
    emptyTitleColor: '#666f7a',
    emptyBodyColor: '#808892',
    starColor: '#b3bbc7',
    starShadow: 'drop-shadow(0 4px 12px rgba(179,187,199,0.24))',
    overflowBackground: 'rgba(252,253,255,0.94)',
    overflowColor: '#676f79'
  },
  linenCream: {
    outerBackground: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.99), rgba(250,246,238,0.94) 48%, rgba(231,217,193,0.58) 100%)',
    outerBorderColor: 'rgba(255,255,255,0.88)',
    outerShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 16px 38px rgba(181,154,114,0.12)',
    outerRadius: '2.2rem',
    haloBackground: 'radial-gradient(circle, rgba(240,228,205,0.34), rgba(240,228,205,0))',
    neckBackground: 'linear-gradient(90deg, rgba(235,220,190,0.14), rgba(255,252,247,0.94), rgba(235,220,190,0.14))',
    eyebrowColor: '#ae9272',
    countColor: '#766452',
    chamberBackground: 'linear-gradient(180deg, rgba(255,255,255,0.62), rgba(250,244,234,0.26))',
    chamberBorderColor: 'rgba(221,194,149,0.25)',
    chamberShadow: 'inset 0 1px 0 rgba(255,255,255,0.74), inset 0 -12px 24px rgba(200,171,123,0.05)',
    chamberRadius: '2rem',
    sideHighlight: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.04))',
    bottomGlow: 'linear-gradient(180deg, rgba(227,205,165,0), rgba(219,195,152,0.11))',
    topMist: 'radial-gradient(circle at top, rgba(255,255,255,0.95), rgba(252,248,241,0))',
    emptyIconColor: '#ccaf84',
    emptyTitleColor: '#746352',
    emptyBodyColor: '#8d7c6a',
    starColor: '#d4b27d',
    starShadow: 'drop-shadow(0 4px 12px rgba(212,178,125,0.22))',
    overflowBackground: 'rgba(255,253,249,0.94)',
    overflowColor: '#776452'
  },
  mintHaze: {
    outerBackground: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.99), rgba(239,251,246,0.94) 48%, rgba(194,230,214,0.56) 100%)',
    outerBorderColor: 'rgba(245,255,251,0.9)',
    outerShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 16px 38px rgba(112,181,153,0.12)',
    outerRadius: '2.22rem',
    haloBackground: 'radial-gradient(circle, rgba(205,241,226,0.34), rgba(205,241,226,0))',
    neckBackground: 'linear-gradient(90deg, rgba(193,233,218,0.14), rgba(250,255,253,0.94), rgba(193,233,218,0.14))',
    eyebrowColor: '#79a696',
    countColor: '#56756b',
    chamberBackground: 'linear-gradient(180deg, rgba(252,255,254,0.64), rgba(233,248,242,0.28))',
    chamberBorderColor: 'rgba(138,211,183,0.24)',
    chamberShadow: 'inset 0 1px 0 rgba(255,255,255,0.76), inset 0 -12px 24px rgba(111,194,163,0.05)',
    chamberRadius: '2rem',
    sideHighlight: 'linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.04))',
    bottomGlow: 'linear-gradient(180deg, rgba(167,220,196,0), rgba(153,213,186,0.11))',
    topMist: 'radial-gradient(circle at top, rgba(255,255,255,0.95), rgba(241,252,247,0))',
    emptyIconColor: '#7bc3a8',
    emptyTitleColor: '#5f7e73',
    emptyBodyColor: '#77938a',
    starColor: '#74c4a7',
    starShadow: 'drop-shadow(0 4px 12px rgba(116,196,167,0.22))',
    overflowBackground: 'rgba(250,255,253,0.94)',
    overflowColor: '#5d7b70'
  }
};

const getPalette = (styleVariant: AchievementBottleStyle): BottlePalette => {
  return BOTTLE_PALETTES[styleVariant] || BOTTLE_PALETTES[DEFAULT_ACHIEVEMENT_BOTTLE_STYLE];
};

const getStableStarHash = (seed: string): number => {
  let hash = 17;

  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash * 31) + seed.charCodeAt(i)) >>> 0;
  }

  return hash;
};

const getStableStarImagePath = (
  index: number,
  styleVariant: AchievementBottleStyle,
  iconPack: AchievementBottleIconPack
): string | null => {
  const imagePaths = STAR_IMAGE_PATHS_BY_PACK[iconPack] || STAR_IMAGE_PATHS_BY_PACK[DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK] || [];

  if (imagePaths.length === 0) {
    return null;
  }

  const hash = getStableStarHash(`${styleVariant}:${iconPack}:${index}:image`);

  return imagePaths[hash % imagePaths.length] || null;
};

const getStableStarScale = (index: number, styleVariant: AchievementBottleStyle): number => {
  const hash = getStableStarHash(`${styleVariant}:${index}:scale`);
  const normalized = (hash % 1000) / 999;

  return STAR_SCALE_MIN + ((STAR_SCALE_MAX - STAR_SCALE_MIN) * normalized);
};

const clamp = (value: number, min: number, max: number): number => (
  Math.min(max, Math.max(min, value))
);

const createGravityState = (): GravityState => ({
  baselineBeta: null,
  baselineGamma: null,
  currentX: DEFAULT_GRAVITY.x,
  currentY: DEFAULT_GRAVITY.y,
  targetX: DEFAULT_GRAVITY.x,
  targetY: DEFAULT_GRAVITY.y
});

const isAndroidTiltSupported = (): boolean => {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
    return false;
  }

  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform() === 'android';
  }

  return /Android/i.test(window.navigator.userAgent);
};

export const AchievementBottle: React.FC<AchievementBottleProps> = ({
  starCount,
  rebuildToken,
  compact = false,
  styleVariant = DEFAULT_ACHIEVEMENT_BOTTLE_STYLE,
  iconPack = DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK,
  renderMode = 'live'
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const starBodiesRef = useRef<Body[]>([]);
  const starNodeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const frameRef = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState(EMPTY_DIMENSIONS);

  const palette = getPalette(styleVariant);
  const normalizedStarCount = normalizeAchievementStarValue(starCount);
  const renderableStarCount = getAchievementRenderableStarCount(normalizedStarCount);
  const visibleCount = Math.max(0, Math.min(MAX_VISIBLE_STARS, renderableStarCount));
  const overflowCount = Math.max(0, renderableStarCount - visibleCount);

  const previewStars = useMemo(() => (
    PREVIEW_STAR_LAYOUTS.slice(0, Math.min(PREVIEW_VISIBLE_STARS, visibleCount))
  ), [visibleCount]);

  useEffect(() => {
    if (compact || renderMode !== 'live' || !containerRef.current) {
      setDimensions((previous) => (
        previous.width === 0 && previous.height === 0 ? previous : EMPTY_DIMENSIONS
      ));
      return;
    }

    const updateDimensions = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const nextWidth = Math.round(rect.width);
      const nextHeight = Math.round(rect.height);

      setDimensions((previous) => (
        previous.width === nextWidth && previous.height === nextHeight
          ? previous
          : { width: nextWidth, height: nextHeight }
      ));
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);
    window.addEventListener('resize', updateDimensions);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [compact, renderMode]);

  useEffect(() => {
    if (compact || renderMode !== 'live' || !dimensions.width || !dimensions.height) {
      return;
    }

    const engine = Engine.create();
    const runner = Runner.create();
    const gravityState = createGravityState();
    engine.gravity.x = DEFAULT_GRAVITY.x;
    engine.gravity.y = DEFAULT_GRAVITY.y;
    engine.gravity.scale = GRAVITY_SCALE;

    const wallThickness = 40;
    const width = dimensions.width;
    const height = dimensions.height;
    const leftWallX = BOTTLE_PADDING - (wallThickness / 2);
    const rightWallX = width - BOTTLE_PADDING + (wallThickness / 2);
    const floorY = height - BOTTLE_PADDING + (wallThickness / 2);
    const ceilingY = BOTTLE_PADDING - (wallThickness / 2);

    const boundaries = [
      Bodies.rectangle(width / 2, floorY, width - (BOTTLE_PADDING * 2), wallThickness, { isStatic: true, restitution: 0.2 }),
      Bodies.rectangle(leftWallX, height / 2, wallThickness, height - (BOTTLE_PADDING * 2), { isStatic: true, restitution: 0.2 }),
      Bodies.rectangle(rightWallX, height / 2, wallThickness, height - (BOTTLE_PADDING * 2), { isStatic: true, restitution: 0.2 }),
      Bodies.rectangle(width / 2, ceilingY, width - (BOTTLE_PADDING * 2), wallThickness, { isStatic: true, restitution: 0.2 })
    ];

    const stars = Array.from({ length: visibleCount }, (_, index) => {
      const starScale = getStableStarScale(index, styleVariant);
      const starRadius = (STAR_SIZE * starScale) / 2;
      const innerMinX = BOTTLE_PADDING + starRadius - 2;
      const innerMaxX = width - BOTTLE_PADDING - starRadius + 2;
      const spreadWidth = Math.max(0, innerMaxX - innerMinX);
      const normalizedX = visibleCount <= 1 ? 0.5 : (index / (visibleCount - 1));
      const baseX = innerMinX + (spreadWidth * normalizedX);
      const jitterLimit = Math.min(22, spreadWidth / Math.max(3, visibleCount * 1.35));
      const spawnX = Math.max(innerMinX, Math.min(innerMaxX, baseX + ((Math.random() - 0.5) * jitterLimit * 2)));
      const laneCount = Math.max(4, Math.floor(width / 70));
      const spawnY = BOTTLE_PADDING + 10 + (Math.floor(index / laneCount) * 24) + (Math.random() * 24);

      const star = Bodies.circle(spawnX, spawnY, starRadius, {
        restitution: 0.48,
        friction: 0.028,
        frictionAir: 0.011 + (Math.random() * 0.008),
        density: 0.0011 + (Math.random() * 0.00025),
        chamfer: { radius: 8 }
      });

      Body.setVelocity(star, {
        x: (Math.random() - 0.5) * 3.8,
        y: Math.random() * 0.9
      });
      Body.setAngularVelocity(star, (Math.random() - 0.5) * 0.16);
      return star;
    });

    World.add(engine.world, [...boundaries, ...stars]);
    Runner.run(runner, engine);
    starBodiesRef.current = stars;

    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      if (typeof event.beta !== 'number' || typeof event.gamma !== 'number') {
        return;
      }

      const nextBeta = event.beta;
      const nextGamma = event.gamma;

      if (gravityState.baselineBeta === null || gravityState.baselineGamma === null) {
        gravityState.baselineBeta = nextBeta;
        gravityState.baselineGamma = nextGamma;
        gravityState.targetX = DEFAULT_GRAVITY.x;
        gravityState.targetY = DEFAULT_GRAVITY.y;
        return;
      }

      const deltaBeta = nextBeta - gravityState.baselineBeta;
      const deltaGamma = nextGamma - gravityState.baselineGamma;

      // Re-anchor to a new neutral hold after large posture changes.
      if (Math.abs(deltaBeta) > BASELINE_RESET_THRESHOLD || Math.abs(deltaGamma) > BASELINE_RESET_THRESHOLD) {
        gravityState.baselineBeta = nextBeta;
        gravityState.baselineGamma = nextGamma;
        gravityState.targetX = DEFAULT_GRAVITY.x;
        gravityState.targetY = DEFAULT_GRAVITY.y;
        return;
      }

      const normalizedGamma = clamp(deltaGamma / MAX_SENSOR_TILT_DEGREES, -1, 1);
      const normalizedBeta = clamp(deltaBeta / MAX_SENSOR_TILT_DEGREES, -1, 1);

      gravityState.targetX = normalizedGamma * MAX_GRAVITY_SWAY_X;
      gravityState.targetY = clamp(
        DEFAULT_GRAVITY.y + (normalizedBeta * MAX_GRAVITY_SWAY_Y),
        MIN_GRAVITY_Y,
        MAX_GRAVITY_Y
      );
    };

    if (isAndroidTiltSupported()) {
      window.addEventListener('deviceorientation', handleDeviceOrientation, true);
    }

    const tick = () => {
      gravityState.currentX += (gravityState.targetX - gravityState.currentX) * GRAVITY_SMOOTHING;
      gravityState.currentY += (gravityState.targetY - gravityState.currentY) * GRAVITY_SMOOTHING;
      engine.gravity.x = gravityState.currentX;
      engine.gravity.y = gravityState.currentY;
      engine.gravity.scale = GRAVITY_SCALE;

      starBodiesRef.current.forEach((body, index) => {
        const node = starNodeRefs.current[index];
        if (!node) {
          return;
        }

        node.style.left = `${body.position.x}px`;
        node.style.top = `${body.position.y}px`;
        node.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`;
        node.style.opacity = String(0.76 + ((index % 5) * 0.04));
      });
      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }

      if (isAndroidTiltSupported()) {
        window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
      }

      Runner.stop(runner);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      starBodiesRef.current = [];
      starNodeRefs.current = [];
    };
  }, [compact, dimensions.height, dimensions.width, rebuildToken, renderMode, styleVariant, visibleCount]);

  return (
    <div
      className="relative h-full w-full overflow-hidden border transition-all"
      style={{
        borderColor: compact ? 'rgba(231,229,228,1)' : palette.outerBorderColor,
        background: compact ? '#fdfbf7' : palette.outerBackground,
        boxShadow: compact ? 'none' : palette.outerShadow,
        borderRadius: compact ? '1.6rem' : palette.outerRadius
      }}
    >
      {!compact && (
        <>
          <div
            className="pointer-events-none absolute left-1/2 top-2 z-0 h-16 w-40 -translate-x-1/2 rounded-full blur-2xl"
            style={{ background: palette.haloBackground }}
          />
          <div
            className="pointer-events-none absolute left-1/2 top-3 z-10 h-2 w-16 -translate-x-1/2 rounded-full opacity-55"
            style={{
              background: palette.neckBackground,
              boxShadow: '0 2px 8px rgba(255,255,255,0.1)'
            }}
          />
        </>
      )}

      <div className={`absolute inset-x-6 z-20 flex justify-center ${compact ? 'top-3.5' : 'top-6'}`}>
        <div className="flex flex-col items-center text-center">
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.32em]"
            style={{ color: palette.eyebrowColor }}
          >
            Bottle
          </div>
          <div
            className="mt-1 text-[1.85rem] font-semibold leading-none tracking-[-0.045em]"
            style={{ color: palette.countColor }}
          >
            {formatAchievementStars(normalizedStarCount)}
          </div>
        </div>
      </div>

      {!compact && (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-24"
            style={{ background: palette.topMist }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
            style={{ background: palette.bottomGlow }}
          />

          <div
            ref={containerRef}
            className="absolute inset-x-5 bottom-12 top-20 overflow-hidden border backdrop-blur-[2px]"
            style={{
              borderColor: palette.chamberBorderColor,
              background: palette.chamberBackground,
              boxShadow: palette.chamberShadow,
              borderRadius: palette.chamberRadius
            }}
          >
            <div
              className="pointer-events-none absolute inset-y-4 left-3 w-8 rounded-full blur-md"
              style={{ background: palette.sideHighlight }}
            />

            {visibleCount === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <Star size={28} className="mb-3" style={{ color: palette.emptyIconColor }} />
                <p className="text-base font-semibold" style={{ color: palette.emptyTitleColor }}>
                  瓶子还是空的
                </p>
                <p className="mt-2 max-w-xs text-sm leading-6" style={{ color: palette.emptyBodyColor }}>
                  配好规则、积累时间后，光点会自动落进这里。
                </p>
              </div>
            )}

            {renderMode === 'preview'
              ? previewStars.map((star, index) => {
                const imagePath = getStableStarImagePath(index, styleVariant, iconPack);
                const starScale = getStableStarScale(index, styleVariant);
                const starImageSize = STAR_IMAGE_SIZE * starScale;

                return (
                  <div
                    key={`preview-star-${styleVariant}-${iconPack}-${index}`}
                    className="pointer-events-none absolute flex h-9 w-9 items-center justify-center"
                    style={{
                      left: star.left,
                      top: star.top,
                      opacity: star.opacity,
                      transform: `translate(-50%, -50%) rotate(${star.rotate}deg) scale(${star.scale})`,
                      filter: palette.starShadow
                    }}
                  >
                    {imagePath
                      ? (
                        <img
                          src={imagePath}
                          alt=""
                          aria-hidden="true"
                          className="object-contain select-none"
                          style={{ width: starImageSize, height: starImageSize }}
                          draggable={false}
                        />
                      )
                      : (
                        <Star
                          aria-hidden="true"
                          size={starImageSize}
                          fill="currentColor"
                          strokeWidth={1.75}
                          style={{ color: palette.starColor }}
                        />
                      )}
                  </div>
                );
              })
              : Array.from({ length: visibleCount }, (_, index) => {
                const imagePath = getStableStarImagePath(index, styleVariant, iconPack);
                const starScale = getStableStarScale(index, styleVariant);
                const starImageSize = STAR_IMAGE_SIZE * starScale;

                return (
                  <div
                    key={`star-${index}`}
                    ref={(node) => {
                      starNodeRefs.current[index] = node;
                    }}
                    className="pointer-events-none absolute flex h-9 w-9 items-center justify-center"
                    style={{
                      left: 0,
                      top: 0,
                      transform: 'translate(-50%, -50%)',
                      opacity: 0,
                      filter: palette.starShadow
                    }}
                  >
                    {imagePath
                      ? (
                        <img
                          src={imagePath}
                          alt=""
                          aria-hidden="true"
                          className="object-contain select-none"
                          style={{ width: starImageSize, height: starImageSize }}
                          draggable={false}
                        />
                      )
                      : (
                        <Star
                          aria-hidden="true"
                          size={starImageSize}
                          fill="currentColor"
                          strokeWidth={1.75}
                          style={{ color: palette.starColor }}
                        />
                      )}
                  </div>
                );
              })}

            {overflowCount > 0 && (
              <div
                className="pointer-events-none absolute bottom-4 right-4 rounded-full px-3 py-1 text-xs font-semibold shadow-sm"
                style={{
                  background: palette.overflowBackground,
                  color: palette.overflowColor
                }}
              >
                +{overflowCount}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
