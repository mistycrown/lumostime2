/**
 * @file AchievementBottle.tsx
 * @description Physics-driven achievement bottle visualization with lightweight test controls and optional device gravity.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bodies, Body, Composite, Engine, Runner, World } from 'matter-js';
import { Compass, RefreshCcw, RotateCcw, Star, Trash2 } from 'lucide-react';

interface AchievementBottleProps {
  starCount: number;
  onAddTestStar: () => void;
  onRemoveTestStar: () => void;
  onRebuild: () => void;
  rebuildToken: number;
}

type GravityPreset = 'down' | 'left' | 'right' | 'up';

const MAX_VISIBLE_STARS = 120;
const STAR_SIZE = 26;

const GRAVITY_PRESETS: Record<GravityPreset, { x: number; y: number; label: string }> = {
  down: { x: 0, y: 1, label: '下' },
  left: { x: -1, y: 0, label: '左' },
  right: { x: 1, y: 0, label: '右' },
  up: { x: 0, y: -1, label: '上' }
};

export const AchievementBottle: React.FC<AchievementBottleProps> = ({
  starCount,
  onAddTestStar,
  onRemoveTestStar,
  onRebuild,
  rebuildToken
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const runnerRef = useRef<Runner | null>(null);
  const starBodiesRef = useRef<Body[]>([]);
  const frameRef = useRef<number | null>(null);
  const [frameTick, setFrameTick] = useState(0);
  const [gravityPreset, setGravityPreset] = useState<GravityPreset>('down');
  const [isSensorGravityEnabled, setIsSensorGravityEnabled] = useState(false);
  const [supportsDeviceGravity, setSupportsDeviceGravity] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const visibleCount = Math.max(0, Math.min(MAX_VISIBLE_STARS, starCount));
  const overflowCount = Math.max(0, starCount - visibleCount);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const updateDimensions = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      setDimensions({
        width: rect.width,
        height: rect.height
      });
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);
    window.addEventListener('resize', updateDimensions);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  useEffect(() => {
    setSupportsDeviceGravity(typeof window !== 'undefined' && 'DeviceOrientationEvent' in window);
  }, []);

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) {
      return;
    }

    const engine = Engine.create();
    const runner = Runner.create();
    engine.gravity.x = GRAVITY_PRESETS[gravityPreset].x;
    engine.gravity.y = GRAVITY_PRESETS[gravityPreset].y;
    engine.gravity.scale = 0.0016;

    const wallThickness = 40;
    const width = dimensions.width;
    const height = dimensions.height;

    const boundaries = [
      Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, { isStatic: true, restitution: 0.2 }),
      Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, restitution: 0.2 }),
      Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, restitution: 0.2 }),
      Bodies.rectangle(width / 2, -wallThickness / 2, width, wallThickness, { isStatic: true, restitution: 0.2 })
    ];

    const stars = Array.from({ length: visibleCount }, (_, index) => {
      const columnOffset = (index % 6) * (STAR_SIZE * 0.65);
      const spawnX = width * 0.3 + columnOffset + (Math.random() * 24);
      const spawnY = 24 + Math.floor(index / 6) * 8;
      return Bodies.circle(spawnX, spawnY, STAR_SIZE / 2, {
        restitution: 0.4,
        friction: 0.03,
        frictionAir: 0.015,
        density: 0.0012,
        chamfer: { radius: 8 }
      });
    });

    World.add(engine.world, [...boundaries, ...stars]);
    Runner.run(runner, engine);

    engineRef.current = engine;
    runnerRef.current = runner;
    starBodiesRef.current = stars;

    const tick = () => {
      setFrameTick((previous) => previous + 1);
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
      runnerRef.current = null;
      engineRef.current = null;
    };
  }, [dimensions.height, dimensions.width, gravityPreset, rebuildToken, visibleCount]);

  useEffect(() => {
    if (!isSensorGravityEnabled || !supportsDeviceGravity || !engineRef.current) {
      return;
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!engineRef.current) {
        return;
      }

      const gamma = Math.max(-45, Math.min(45, event.gamma || 0));
      const beta = Math.max(-45, Math.min(45, event.beta || 0));
      engineRef.current.gravity.x = gamma / 45;
      engineRef.current.gravity.y = beta / 45;
      engineRef.current.gravity.scale = 0.0014;
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isSensorGravityEnabled, supportsDeviceGravity]);

  useEffect(() => {
    if (isSensorGravityEnabled || !engineRef.current) {
      return;
    }

    engineRef.current.gravity.x = GRAVITY_PRESETS[gravityPreset].x;
    engineRef.current.gravity.y = GRAVITY_PRESETS[gravityPreset].y;
    engineRef.current.gravity.scale = 0.0016;
  }, [gravityPreset, isSensorGravityEnabled]);

  const starStyles = useMemo(() => {
    void frameTick;
    return starBodiesRef.current.map((body, index) => ({
      id: `${index}-${body.id}`,
      left: body.position.x,
      top: body.position.y,
      angle: body.angle,
      opacity: 0.78 + ((index % 5) * 0.04)
    }));
  }, [frameTick]);

  const cycleGravityPreset = () => {
    setIsSensorGravityEnabled(false);
    setGravityPreset((previous) => {
      if (previous === 'down') {
        return 'left';
      }
      if (previous === 'left') {
        return 'right';
      }
      if (previous === 'right') {
        return 'up';
      }
      return 'down';
    });
  };

  const resetBottle = () => {
    setIsSensorGravityEnabled(false);
    setGravityPreset('down');
    onRebuild();
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-white/50 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),rgba(255,247,220,0.75)_42%,rgba(255,236,179,0.5)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_20px_60px_rgba(180,126,36,0.18)]">
      <div className="absolute inset-x-5 top-4 z-20 flex items-center justify-between gap-3">
        <div className="rounded-2xl bg-white/70 px-4 py-2 shadow-sm backdrop-blur-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600">Bottle</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-stone-900">{starCount}</span>
            <span className="text-sm text-stone-500">显示中 {visibleCount}</span>
          </div>
          {overflowCount > 0 && (
            <p className="mt-1 text-xs text-stone-500">为了保持流畅，仅渲染前 {MAX_VISIBLE_STARS} 颗，另有 +{overflowCount}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onAddTestStar}
            className="rounded-full bg-white/80 px-3 py-2 text-xs font-semibold text-stone-700 shadow-sm"
          >
            +1 星
          </button>
          <button
            type="button"
            onClick={onRemoveTestStar}
            className="rounded-full bg-white/80 px-3 py-2 text-xs font-semibold text-stone-700 shadow-sm"
          >
            <span className="inline-flex items-center gap-1">
              <Trash2 size={12} />
              -1 星
            </span>
          </button>
          <button
            type="button"
            onClick={cycleGravityPreset}
            className="rounded-full bg-white/80 px-3 py-2 text-xs font-semibold text-stone-700 shadow-sm"
          >
            <span className="inline-flex items-center gap-1">
              <Compass size={12} />
              重力 {GRAVITY_PRESETS[gravityPreset].label}
            </span>
          </button>
          {supportsDeviceGravity && (
            <button
              type="button"
              onClick={() => setIsSensorGravityEnabled((previous) => !previous)}
              className={`rounded-full px-3 py-2 text-xs font-semibold shadow-sm ${
                isSensorGravityEnabled
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/80 text-stone-700'
              }`}
            >
              感应 {isSensorGravityEnabled ? '开' : '关'}
            </button>
          )}
          <button
            type="button"
            onClick={resetBottle}
            className="rounded-full bg-white/80 px-3 py-2 text-xs font-semibold text-stone-700 shadow-sm"
          >
            <span className="inline-flex items-center gap-1">
              <RefreshCcw size={12} />
              重建
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSensorGravityEnabled(false);
              setGravityPreset('down');
            }}
            className="rounded-full bg-white/80 px-3 py-2 text-xs font-semibold text-stone-700 shadow-sm"
          >
            <span className="inline-flex items-center gap-1">
              <RotateCcw size={12} />
              复位
            </span>
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),rgba(255,255,255,0))]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,rgba(245,158,11,0),rgba(217,119,6,0.18))]" />

      <div ref={containerRef} className="absolute inset-x-5 bottom-5 top-24 overflow-hidden rounded-[1.75rem] border border-amber-200/70 bg-white/25 backdrop-blur-[2px]">
        <div className="pointer-events-none absolute inset-y-4 left-3 w-8 rounded-full bg-white/40 blur-md" />
        {visibleCount === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-stone-500">
            <Star size={28} className="mb-3 text-amber-300" />
            <p className="text-base font-semibold text-stone-700">瓶子还是空的</p>
            <p className="mt-2 max-w-xs text-sm leading-6">
              配好规则、积累时间后，星星会自动落进这里。测试阶段也可以先用右上角按钮体验瓶子效果。
            </p>
          </div>
        )}
        {starStyles.map((starStyle) => (
          <div
            key={starStyle.id}
            className="pointer-events-none absolute flex h-8 w-8 items-center justify-center text-[20px] drop-shadow-[0_4px_12px_rgba(245,158,11,0.45)]"
            style={{
              left: `${starStyle.left}px`,
              top: `${starStyle.top}px`,
              transform: `translate(-50%, -50%) rotate(${starStyle.angle}rad)`,
              opacity: starStyle.opacity
            }}
          >
            <span aria-hidden="true">⭐</span>
          </div>
        ))}
      </div>
    </div>
  );
};
