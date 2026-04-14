/**
 * @file confettiEffects.ts
 * @input DOM rectangles that define where a celebratory effect should originate
 * @output Shared canvas-confetti helpers used by reward and reaction interactions
 * @description Centralizes reusable confetti bursts so the same celebration effect can be triggered across the app.
 *
 * @updated 2026-04-14: Extracted the mixed-burst fireworks effect for reuse in achievement reward redemption.
 */
import confetti from 'canvas-confetti';

type ConfettiOptions = NonNullable<Parameters<typeof confetti>[0]>;

const CONFETTI_Z_INDEX = 9999;

const getViewportOriginFromRect = (rect: DOMRect) => ({
  x: (rect.left + rect.width / 2) / window.innerWidth,
  y: (rect.top + rect.height / 2) / window.innerHeight
});

export const launchFireworkBurstFromRect = (rect: DOMRect) => {
  const origin = getViewportOriginFromRect(rect);
  const count = 100;
  const defaults: ConfettiOptions = {
    origin,
    zIndex: CONFETTI_Z_INDEX
  };

  const fire = (particleRatio: number, options: ConfettiOptions = {}) => {
    confetti({
      ...defaults,
      ...options,
      particleCount: Math.floor(count * particleRatio)
    });
  };

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
};
