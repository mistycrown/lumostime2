/**
 * @file ImmersiveMaskedDigits.tsx
 * @input Immersive display parts, digit width, selected art source, and motion style
 * @output Static digit masking layer that reveals an animated art background inside the numbers only
 * @pos Component
 * @description Renders immersive timer digits as a fixed mask while the selected artwork moves behind the mask, keeping the digits spatially stable in both landscape and portrait layouts.
 */

import React from 'react';
import {
  IMMERSIVE_TIMER_FONT_FAMILY,
  IMMERSIVE_TIMER_FONT_WEIGHT,
  IMMERSIVE_TIMER_LETTER_SPACING,
  IMMERSIVE_TIMER_SEPARATOR_SLOT_WIDTH,
} from './immersiveTimerConfig';
import { ImmersiveDisplayPart } from '../utils/immersiveTimeDisplay';
import { ImmersiveMotionStyle } from '../utils/immersiveVisuals';

interface ImmersiveMaskedDigitsProps {
  orientation: 'landscape' | 'portrait';
  displayParts: ImmersiveDisplayPart[];
  digitSlotWidth: string;
  artSrc: string;
  motionStyle: ImmersiveMotionStyle;
}

const MASK_HEIGHT = 120;
const MASK_VALUE_FONT_SIZE = 108;
const MASK_SEPARATOR_FONT_SIZE = 86;

const parseCh = (width: string): number => {
  const parsed = Number.parseFloat(width);
  return Number.isFinite(parsed) ? parsed : 0;
};

const encodeSvgDataUri = (svg: string): string =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

const formatChWidth = (value: number): string =>
  `${value.toFixed(2).replace(/\.?0+$/, '')}ch`;

const buildMaskSvg = (
  displayParts: ImmersiveDisplayPart[],
  digitSlotWidth: string
): { maskImage: string; widthInCh: number } => {
  const digitWidth = parseCh(digitSlotWidth);
  const separatorWidth = parseCh(IMMERSIVE_TIMER_SEPARATOR_SLOT_WIDTH);
  const widths = displayParts.map((part) => (part.kind === 'value' ? digitWidth : separatorWidth));
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);

  let cursor = 0;
  const textNodes = displayParts.map((part, index) => {
    const width = widths[index];
    const centerX = cursor + width / 2;
    cursor += width;

    return `<text x="${centerX}" y="84" text-anchor="middle" fill="white" font-family="${IMMERSIVE_TIMER_FONT_FAMILY}" font-weight="${IMMERSIVE_TIMER_FONT_WEIGHT}" font-size="${
      part.kind === 'value' ? MASK_VALUE_FONT_SIZE : MASK_SEPARATOR_FONT_SIZE
    }" letter-spacing="${IMMERSIVE_TIMER_LETTER_SPACING}" dominant-baseline="middle">${part.value}</text>`;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.max(totalWidth, 0.1)} ${MASK_HEIGHT}" preserveAspectRatio="none"><rect width="100%" height="100%" fill="black" />${textNodes.join('')}</svg>`;

  return {
    maskImage: encodeSvgDataUri(svg),
    widthInCh: totalWidth,
  };
};

const buildValueMaskSvg = (value: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" preserveAspectRatio="none"><rect width="100%" height="100%" fill="black" /><text x="50" y="84" text-anchor="middle" fill="white" font-family="${IMMERSIVE_TIMER_FONT_FAMILY}" font-weight="${IMMERSIVE_TIMER_FONT_WEIGHT}" font-size="${MASK_VALUE_FONT_SIZE}" letter-spacing="${IMMERSIVE_TIMER_LETTER_SPACING}" dominant-baseline="middle">${value}</text></svg>`;
  return encodeSvgDataUri(svg);
};

const immersiveMaskStyles = `
.immersive-mask {
  position: relative;
  isolation: isolate;
  display: block;
  flex-shrink: 0;
}

.immersive-mask__art {
  position: absolute;
  inset: 0;
  background-repeat: no-repeat;
  background-size: 190% 190%;
  background-position: center;
  filter: saturate(1.12) contrast(1.06) brightness(1.04);
  transform-origin: center;
  will-change: transform, background-position;
}

.immersive-mask__art--sweep {
  animation: immersive-mask-sweep 11.5s ease-in-out infinite;
}

.immersive-mask__art--orbit {
  animation: immersive-mask-orbit 8.9s ease-in-out infinite;
}

.immersive-mask__art--drift {
  animation: immersive-mask-drift 13.5s ease-in-out infinite;
}

.immersive-mask--landscape {
  height: 0.94em;
}

.immersive-mask__portrait-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.immersive-mask__portrait-value {
  position: relative;
  height: 0.96em;
}

.immersive-mask__portrait-label {
  margin-top: 0.32rem;
  text-align: center;
  font-size: 0.12em;
  font-weight: 500;
  letter-spacing: 0.28em;
  color: rgba(255, 255, 255, 0.6);
}

.immersive-mask__portrait-divider {
  width: 3rem;
  height: 1px;
  background: rgba(255, 255, 255, 0.24);
}

@keyframes immersive-mask-sweep {
  0% {
    transform: translate3d(-8%, -6%, 0) scale(1.22) rotate(-5deg);
    background-position: 16% 28%;
  }
  40% {
    transform: translate3d(9%, 7%, 0) scale(1.34) rotate(6deg);
    background-position: 78% 36%;
  }
  75% {
    transform: translate3d(-2%, 10%, 0) scale(1.28) rotate(-3deg);
    background-position: 34% 88%;
  }
  100% {
    transform: translate3d(-8%, -6%, 0) scale(1.22) rotate(-5deg);
    background-position: 16% 28%;
  }
}

@keyframes immersive-mask-orbit {
  0% {
    transform: translate3d(-10%, -12%, 0) scale(1.3) rotate(-14deg);
    background-position: 10% 12%;
  }
  28% {
    transform: translate3d(13%, -4%, 0) scale(1.24) rotate(5deg);
    background-position: 84% 24%;
  }
  62% {
    transform: translate3d(6%, 15%, 0) scale(1.36) rotate(18deg);
    background-position: 62% 94%;
  }
  100% {
    transform: translate3d(-10%, -12%, 0) scale(1.3) rotate(-14deg);
    background-position: 10% 12%;
  }
}

@keyframes immersive-mask-drift {
  0% {
    transform: translate3d(-6%, 5%, 0) scale(1.18) rotate(-6deg);
    background-position: 18% 34%;
  }
  34% {
    transform: translate3d(8%, -8%, 0) scale(1.24) rotate(4deg);
    background-position: 82% 22%;
  }
  74% {
    transform: translate3d(-1%, 10%, 0) scale(1.2) rotate(8deg);
    background-position: 36% 84%;
  }
  100% {
    transform: translate3d(-6%, 5%, 0) scale(1.18) rotate(-6deg);
    background-position: 18% 34%;
  }
}
`;

const buildMaskedArtLayerStyle = (artSrc: string, maskImage: string): React.CSSProperties => ({
  backgroundImage: `url(${artSrc})`,
  WebkitMaskImage: maskImage,
  maskImage,
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
  WebkitMaskSize: '100% 100%',
  maskSize: '100% 100%',
});

export const ImmersiveMaskedDigits: React.FC<ImmersiveMaskedDigitsProps> = ({
  orientation,
  displayParts,
  digitSlotWidth,
  artSrc,
  motionStyle,
}) => {
  const valueParts = displayParts.filter((part) => part.kind === 'value');

  if (orientation === 'portrait') {
    return (
      <>
        <style>{immersiveMaskStyles}</style>
        <div className="immersive-mask__portrait-stack" data-motion-style={motionStyle}>
          {valueParts.map((part, index) => {
            const maskImage = buildValueMaskSvg(part.value);

            return (
              <React.Fragment key={`${part.value}-${index}`}>
                <div>
                  <div
                    className="immersive-mask immersive-mask__portrait-value"
                    style={{ width: digitSlotWidth }}
                  >
                    <div
                      data-art-layer="true"
                      className={`immersive-mask__art immersive-mask__art--${motionStyle}`}
                      style={buildMaskedArtLayerStyle(artSrc, maskImage)}
                    />
                  </div>
                  <div className="immersive-mask__portrait-label">{part.label}</div>
                </div>

                {index < valueParts.length - 1 ? <div className="immersive-mask__portrait-divider" /> : null}
              </React.Fragment>
            );
          })}
        </div>
      </>
    );
  }

  const { maskImage, widthInCh } = buildMaskSvg(displayParts, digitSlotWidth);

  return (
    <>
      <style>{immersiveMaskStyles}</style>
      <div
        className="immersive-mask immersive-mask--landscape"
        data-motion-style={motionStyle}
        style={{ width: formatChWidth(widthInCh) }}
      >
        <div
          data-art-layer="true"
          className={`immersive-mask__art immersive-mask__art--${motionStyle}`}
          style={buildMaskedArtLayerStyle(artSrc, maskImage)}
        />
      </div>
    </>
  );
};
