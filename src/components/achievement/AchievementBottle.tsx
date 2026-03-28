/**
 * @file AchievementBottle.tsx
 * @description Physics-driven achievement bottle visualization with compact header mode and stable star rendering.
 *
 * @updated 2026-03-28: Prevented resize-driven render loops, replaced corrupted glyph stars with Lucide icons, refined the bottle header into a centered single-focus display, and persisted settled star poses across expand/collapse remounts.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Bodies, Body, Composite, Engine, Runner, World } from 'matter-js';
import { Star } from 'lucide-react';

interface AchievementBottleProps {
  starCount: number;
  rebuildToken: number;
  compact?: boolean;
}

interface CachedStarPose {
  angle: number;
  xRatio: number;
  yRatio: number;
}

const MAX_VISIBLE_STARS = 120;
const STAR_SIZE = 26;
const BOTTLE_PADDING = 16;
const EMPTY_DIMENSIONS = { width: 0, height: 0 };
let cachedStarPoses: CachedStarPose[] = [];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const AchievementBottle: React.FC<AchievementBottleProps> = ({
  starCount,
  rebuildToken,
  compact = false
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const starBodiesRef = useRef<Body[]>([]);
  const starNodeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const frameRef = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState(EMPTY_DIMENSIONS);

  const visibleCount = Math.max(0, Math.min(MAX_VISIBLE_STARS, starCount));
  const overflowCount = Math.max(0, starCount - visibleCount);

  useEffect(() => {
    if (compact || !containerRef.current) {
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
  }, [compact]);

  useEffect(() => {
    if (compact || !dimensions.width || !dimensions.height) {
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
    const innerMinX = BOTTLE_PADDING + (STAR_SIZE / 2) - 2;
    const innerMaxX = width - BOTTLE_PADDING - (STAR_SIZE / 2) + 2;
    const innerMinY = BOTTLE_PADDING + (STAR_SIZE / 2);
    const innerMaxY = height - BOTTLE_PADDING - (STAR_SIZE / 2);
    const usableWidth = Math.max(1, innerMaxX - innerMinX);
    const usableHeight = Math.max(1, innerMaxY - innerMinY);

    const boundaries = [
      Bodies.rectangle(width / 2, floorY, width - (BOTTLE_PADDING * 2), wallThickness, { isStatic: true, restitution: 0.2 }),
      Bodies.rectangle(leftWallX, height / 2, wallThickness, height - (BOTTLE_PADDING * 2), { isStatic: true, restitution: 0.2 }),
      Bodies.rectangle(rightWallX, height / 2, wallThickness, height - (BOTTLE_PADDING * 2), { isStatic: true, restitution: 0.2 }),
      Bodies.rectangle(width / 2, ceilingY, width - (BOTTLE_PADDING * 2), wallThickness, { isStatic: true, restitution: 0.2 })
    ];

    const stars = Array.from({ length: visibleCount }, (_, index) => {
      const cachedPose = cachedStarPoses[index];
      const spreadWidth = Math.max(0, innerMaxX - innerMinX);
      const normalizedX = visibleCount <= 1 ? 0.5 : (index / (visibleCount - 1));
      const baseX = innerMinX + (spreadWidth * normalizedX);
      const jitterLimit = Math.min(22, spreadWidth / Math.max(3, visibleCount * 1.35));
      const spawnX = cachedPose
        ? clamp(innerMinX + (cachedPose.xRatio * usableWidth), innerMinX, innerMaxX)
        : Math.max(innerMinX, Math.min(innerMaxX, baseX + ((Math.random() - 0.5) * jitterLimit * 2)));
      const laneCount = Math.max(4, Math.floor(width / 64));
      const spawnY = cachedPose
        ? clamp(innerMinY + (cachedPose.yRatio * usableHeight), innerMinY, innerMaxY)
        : BOTTLE_PADDING + 8 + (Math.floor(index / laneCount) * 20) + (Math.random() * 28);

      const star = Bodies.circle(spawnX, spawnY, STAR_SIZE / 2, {
        restitution: 0.48,
        friction: 0.028,
        frictionAir: 0.011 + (Math.random() * 0.008),
        density: 0.0011 + (Math.random() * 0.00025),
        chamfer: { radius: 8 }
      });

      if (cachedPose) {
        Body.setAngle(star, cachedPose.angle);
        Body.setVelocity(star, { x: 0, y: 0 });
        Body.setAngularVelocity(star, 0);
      } else {
        Body.setVelocity(star, {
          x: (Math.random() - 0.5) * 3.8,
          y: Math.random() * 0.9
        });
        Body.setAngularVelocity(star, (Math.random() - 0.5) * 0.16);
      }
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
        node.style.opacity = String(0.78 + ((index % 5) * 0.04));
      });
      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      cachedStarPoses = starBodiesRef.current.slice(0, visibleCount).map((body) => ({
        angle: body.angle,
        xRatio: usableWidth <= 0 ? 0.5 : (clamp(body.position.x, innerMinX, innerMaxX) - innerMinX) / usableWidth,
        yRatio: usableHeight <= 0 ? 1 : (clamp(body.position.y, innerMinY, innerMaxY) - innerMinY) / usableHeight
      }));

      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }

      Runner.stop(runner);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      starBodiesRef.current = [];
      starNodeRefs.current = [];
    };
  }, [compact, dimensions.height, dimensions.width, rebuildToken, visibleCount]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-[2rem] border transition-all ${
        compact
          ? 'border-stone-200 bg-[#fdfbf7] shadow-none'
          : 'border-white/50 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),rgba(255,247,220,0.75)_42%,rgba(255,236,179,0.5)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_20px_60px_rgba(180,126,36,0.18)]'
      }`}
    >
      <div className={`absolute inset-x-6 z-20 flex justify-center ${compact ? 'top-3.5' : 'top-6'}`}>
        <div className="flex flex-col items-center text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#c7965f]">Bottle</div>
          <div className="mt-1 text-[1.85rem] font-semibold leading-none tracking-[-0.045em] text-[#6a594a]">
            {starCount}
          </div>
        </div>
      </div>

      {!compact && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.88),rgba(255,255,255,0))]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,rgba(245,158,11,0),rgba(217,119,6,0.18))]" />

          <div
            ref={containerRef}
            className="absolute inset-x-5 bottom-12 top-20 overflow-hidden rounded-[1.75rem] border border-amber-200/70 bg-white/25 backdrop-blur-[2px]"
          >
            <div className="pointer-events-none absolute inset-y-4 left-3 w-8 rounded-full bg-white/40 blur-md" />
            {visibleCount === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-stone-500">
                <Star size={28} className="mb-3 text-amber-300" />
                <p className="text-base font-semibold text-stone-700">瓶子还是空的</p>
                <p className="mt-2 max-w-xs text-sm leading-6">
                  配好规则、累计时间后，光点会自动落进这里。
                </p>
              </div>
            )}
            {Array.from({ length: visibleCount }, (_, index) => (
              <div
                key={`star-${index}`}
                ref={(node) => {
                  starNodeRefs.current[index] = node;
                }}
                className="pointer-events-none absolute flex h-8 w-8 items-center justify-center drop-shadow-[0_4px_12px_rgba(245,158,11,0.45)]"
                style={{
                  left: 0,
                  top: 0,
                  transform: 'translate(-50%, -50%)',
                  opacity: 0
                }}
              >
                <Star
                  aria-hidden="true"
                  size={20}
                  fill="currentColor"
                  strokeWidth={1.75}
                  className="text-amber-400"
                />
              </div>
            ))}
            {overflowCount > 0 && (
              <div className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-stone-600 shadow-sm">
                +{overflowCount}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
