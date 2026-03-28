/**
 * @file AchievementBottle.tsx
 * @description Physics-driven achievement bottle visualization with switchable bottle skins for the achievement page and sponsorship previews.
 *
 * @updated 2026-03-28: Added reusable bottle style variants plus static preview rendering for the sponsorship style picker.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bodies, Body, Composite, Engine, Runner, World } from 'matter-js';
import { Star } from 'lucide-react';
import {
  DEFAULT_ACHIEVEMENT_BOTTLE_STYLE,
  type AchievementBottleStyle
} from '../../services/achievementBottleStyleService';

interface AchievementBottleProps {
  starCount: number;
  rebuildToken: number;
  compact?: boolean;
  styleVariant?: AchievementBottleStyle;
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

const MAX_VISIBLE_STARS = 120;
const PREVIEW_VISIBLE_STARS = 12;
const STAR_SIZE = 26;
const BOTTLE_PADDING = 16;
const EMPTY_DIMENSIONS = { width: 0, height: 0 };
const STAR_IMAGE_PATHS = Object.entries(
  import.meta.glob<string>(
    '../../../public/stars/star1/*.{png,jpg,jpeg,webp,svg}',
    {
      eager: true,
      import: 'default'
    }
  )
)
  .sort(([firstPath], [secondPath]) => firstPath.localeCompare(secondPath, undefined, { numeric: true }))
  .map(([, assetUrl]) => assetUrl);

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
    outerBackground: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.95), rgba(255,246,214,0.82) 42%, rgba(246,203,118,0.52) 100%)',
    outerBorderColor: 'rgba(255,255,255,0.58)',
    outerShadow: 'inset 0 1px 0 rgba(255,255,255,0.76), 0 20px 60px rgba(180,126,36,0.18)',
    outerRadius: '2rem',
    haloBackground: 'radial-gradient(circle, rgba(255,232,164,0.55), rgba(255,232,164,0))',
    neckBackground: 'linear-gradient(90deg, rgba(249,214,127,0.2), rgba(255,247,223,0.82), rgba(249,214,127,0.2))',
    eyebrowColor: '#c7965f',
    countColor: '#6a594a',
    chamberBackground: 'linear-gradient(180deg, rgba(255,255,255,0.36), rgba(255,255,255,0.18))',
    chamberBorderColor: 'rgba(251,191,36,0.42)',
    chamberShadow: 'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -12px 28px rgba(217,119,6,0.08)',
    chamberRadius: '1.75rem',
    sideHighlight: 'linear-gradient(180deg, rgba(255,255,255,0.52), rgba(255,255,255,0.02))',
    bottomGlow: 'linear-gradient(180deg, rgba(245,158,11,0), rgba(217,119,6,0.18))',
    topMist: 'radial-gradient(circle at top, rgba(255,255,255,0.88), rgba(255,255,255,0))',
    emptyIconColor: '#f5c46c',
    emptyTitleColor: '#5f5449',
    emptyBodyColor: '#7c6f65',
    starColor: '#f59e0b',
    starShadow: 'drop-shadow(0 4px 12px rgba(245,158,11,0.45))',
    overflowBackground: 'rgba(255,255,255,0.84)',
    overflowColor: '#57534e'
  },
  seaGlass: {
    outerBackground: 'radial-gradient(circle at 50% 0%, rgba(244,255,253,0.96), rgba(211,246,239,0.86) 45%, rgba(126,197,198,0.58) 100%)',
    outerBorderColor: 'rgba(220,252,248,0.86)',
    outerShadow: 'inset 0 1px 0 rgba(255,255,255,0.82), 0 22px 62px rgba(36,127,125,0.17)',
    outerRadius: '2.2rem',
    haloBackground: 'radial-gradient(circle, rgba(168,243,233,0.5), rgba(168,243,233,0))',
    neckBackground: 'linear-gradient(90deg, rgba(147,230,218,0.18), rgba(247,255,254,0.78), rgba(147,230,218,0.18))',
    eyebrowColor: '#5f938d',
    countColor: '#325b58',
    chamberBackground: 'linear-gradient(180deg, rgba(242,255,254,0.42), rgba(223,248,244,0.18))',
    chamberBorderColor: 'rgba(45,212,191,0.35)',
    chamberShadow: 'inset 0 1px 0 rgba(255,255,255,0.58), inset 0 -18px 30px rgba(13,148,136,0.08)',
    chamberRadius: '2rem',
    sideHighlight: 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.04))',
    bottomGlow: 'linear-gradient(180deg, rgba(20,184,166,0), rgba(15,118,110,0.2))',
    topMist: 'radial-gradient(circle at top, rgba(255,255,255,0.72), rgba(224,250,247,0))',
    emptyIconColor: '#5bc1b3',
    emptyTitleColor: '#2c615c',
    emptyBodyColor: '#537b77',
    starColor: '#14b8a6',
    starShadow: 'drop-shadow(0 4px 12px rgba(20,184,166,0.34))',
    overflowBackground: 'rgba(244,255,254,0.8)',
    overflowColor: '#335b57'
  },
  midnight: {
    outerBackground: 'radial-gradient(circle at 50% 0%, rgba(66,85,150,0.95), rgba(34,43,88,0.92) 40%, rgba(13,18,44,0.96) 100%)',
    outerBorderColor: 'rgba(129,140,248,0.28)',
    outerShadow: 'inset 0 1px 0 rgba(196,203,255,0.16), 0 24px 72px rgba(7,11,31,0.45)',
    outerRadius: '1.9rem',
    haloBackground: 'radial-gradient(circle, rgba(99,102,241,0.45), rgba(99,102,241,0))',
    neckBackground: 'linear-gradient(90deg, rgba(94,108,196,0.18), rgba(202,214,255,0.72), rgba(94,108,196,0.18))',
    eyebrowColor: '#c7d2fe',
    countColor: '#f8fafc',
    chamberBackground: 'linear-gradient(180deg, rgba(16,24,56,0.52), rgba(8,13,33,0.36))',
    chamberBorderColor: 'rgba(129,140,248,0.26)',
    chamberShadow: 'inset 0 1px 0 rgba(191,219,254,0.12), inset 0 -16px 36px rgba(56,78,177,0.12)',
    chamberRadius: '1.6rem',
    sideHighlight: 'linear-gradient(180deg, rgba(194,201,255,0.26), rgba(194,201,255,0.02))',
    bottomGlow: 'linear-gradient(180deg, rgba(79,70,229,0), rgba(129,140,248,0.24))',
    topMist: 'radial-gradient(circle at top, rgba(165,180,252,0.32), rgba(30,41,59,0))',
    emptyIconColor: '#f9d273',
    emptyTitleColor: '#e2e8f0',
    emptyBodyColor: '#cbd5e1',
    starColor: '#fbbf24',
    starShadow: 'drop-shadow(0 4px 14px rgba(251,191,36,0.38))',
    overflowBackground: 'rgba(15,23,42,0.74)',
    overflowColor: '#f8fafc'
  },
  blushBloom: {
    outerBackground: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.96), rgba(255,232,239,0.88) 45%, rgba(245,178,194,0.58) 100%)',
    outerBorderColor: 'rgba(255,255,255,0.72)',
    outerShadow: 'inset 0 1px 0 rgba(255,255,255,0.84), 0 22px 60px rgba(190,104,132,0.18)',
    outerRadius: '2.35rem',
    haloBackground: 'radial-gradient(circle, rgba(255,196,217,0.55), rgba(255,196,217,0))',
    neckBackground: 'linear-gradient(90deg, rgba(255,212,225,0.2), rgba(255,248,250,0.8), rgba(255,212,225,0.2))',
    eyebrowColor: '#c48196',
    countColor: '#754d5c',
    chamberBackground: 'linear-gradient(180deg, rgba(255,255,255,0.42), rgba(255,240,245,0.18))',
    chamberBorderColor: 'rgba(244,114,182,0.26)',
    chamberShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -16px 28px rgba(244,114,182,0.08)',
    chamberRadius: '2.1rem',
    sideHighlight: 'linear-gradient(180deg, rgba(255,255,255,0.58), rgba(255,255,255,0.03))',
    bottomGlow: 'linear-gradient(180deg, rgba(244,114,182,0), rgba(236,72,153,0.18))',
    topMist: 'radial-gradient(circle at top, rgba(255,255,255,0.88), rgba(255,241,245,0))',
    emptyIconColor: '#f59fbe',
    emptyTitleColor: '#6f4d59',
    emptyBodyColor: '#85626f',
    starColor: '#f472b6',
    starShadow: 'drop-shadow(0 4px 12px rgba(244,114,182,0.34))',
    overflowBackground: 'rgba(255,250,252,0.86)',
    overflowColor: '#6b4c57'
  }
};

const getPalette = (styleVariant: AchievementBottleStyle): BottlePalette => {
  return BOTTLE_PALETTES[styleVariant] || BOTTLE_PALETTES[DEFAULT_ACHIEVEMENT_BOTTLE_STYLE];
};

const getStableStarImagePath = (index: number, styleVariant: AchievementBottleStyle): string | null => {
  if (STAR_IMAGE_PATHS.length === 0) {
    return null;
  }

  let hash = 17;
  const seed = `${styleVariant}:${index}`;

  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash * 31) + seed.charCodeAt(i)) >>> 0;
  }

  return STAR_IMAGE_PATHS[hash % STAR_IMAGE_PATHS.length] || null;
};

export const AchievementBottle: React.FC<AchievementBottleProps> = ({
  starCount,
  rebuildToken,
  compact = false,
  styleVariant = DEFAULT_ACHIEVEMENT_BOTTLE_STYLE,
  renderMode = 'live'
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const starBodiesRef = useRef<Body[]>([]);
  const starNodeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const frameRef = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState(EMPTY_DIMENSIONS);

  const palette = getPalette(styleVariant);
  const visibleCount = Math.max(0, Math.min(MAX_VISIBLE_STARS, starCount));
  const overflowCount = Math.max(0, starCount - visibleCount);

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
    engine.gravity.x = 0;
    engine.gravity.y = 1;
    engine.gravity.scale = 0.0016;

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
      const innerMinX = BOTTLE_PADDING + (STAR_SIZE / 2) - 2;
      const innerMaxX = width - BOTTLE_PADDING - (STAR_SIZE / 2) + 2;
      const spreadWidth = Math.max(0, innerMaxX - innerMinX);
      const normalizedX = visibleCount <= 1 ? 0.5 : (index / (visibleCount - 1));
      const baseX = innerMinX + (spreadWidth * normalizedX);
      const jitterLimit = Math.min(22, spreadWidth / Math.max(3, visibleCount * 1.35));
      const spawnX = Math.max(innerMinX, Math.min(innerMaxX, baseX + ((Math.random() - 0.5) * jitterLimit * 2)));
      const laneCount = Math.max(4, Math.floor(width / 64));
      const spawnY = BOTTLE_PADDING + 8 + (Math.floor(index / laneCount) * 20) + (Math.random() * 28);

      const star = Bodies.circle(spawnX, spawnY, STAR_SIZE / 2, {
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

    const tick = () => {
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

      Runner.stop(runner);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      starBodiesRef.current = [];
      starNodeRefs.current = [];
    };
  }, [compact, dimensions.height, dimensions.width, rebuildToken, renderMode, visibleCount]);

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
            {starCount}
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
                const imagePath = getStableStarImagePath(index, styleVariant);

                return (
                  <div
                    key={`preview-star-${styleVariant}-${index}`}
                    className="pointer-events-none absolute flex h-8 w-8 items-center justify-center"
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
                          className="h-6 w-6 object-contain select-none"
                          draggable={false}
                        />
                      )
                      : (
                        <Star
                          aria-hidden="true"
                          size={20}
                          fill="currentColor"
                          strokeWidth={1.75}
                          style={{ color: palette.starColor }}
                        />
                      )}
                  </div>
                );
              })
              : Array.from({ length: visibleCount }, (_, index) => {
                const imagePath = getStableStarImagePath(index, styleVariant);

                return (
                  <div
                    key={`star-${index}`}
                    ref={(node) => {
                      starNodeRefs.current[index] = node;
                    }}
                    className="pointer-events-none absolute flex h-8 w-8 items-center justify-center"
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
                          className="h-6 w-6 object-contain select-none"
                          draggable={false}
                        />
                      )
                      : (
                        <Star
                          aria-hidden="true"
                          size={20}
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
