/**
 * @file ImmersiveMaskedDigits.tsx
 * @input Immersive display parts, digit width, selected art source, and motion style
 * @output Static digit clipping layer that reveals an animated art background inside the numbers only
 * @pos Component
 * @description Renders immersive timer digits as fixed SVG text clips while the selected artwork moves behind the text, keeping the digits spatially stable in both landscape and portrait layouts.
 */

import React, { useId } from 'react';
import {
  IMMERSIVE_TIMER_FONT_FAMILY,
  IMMERSIVE_TIMER_FONT_WEIGHT,
  IMMERSIVE_TIMER_LANDSCAPE_DIGIT_WIDTH_SCALE,
  IMMERSIVE_TIMER_LETTER_SPACING,
  IMMERSIVE_TIMER_SEPARATOR_SLOT_WIDTH,
} from './immersiveTimerConfig';
import { ImmersiveDisplayPart } from '../utils/immersiveTimeDisplay';
import { ImmersiveMotionStyle } from '../utils/immersiveVisuals';

interface ImmersiveMaskedDigitsProps {
  orientation: 'landscape' | 'portrait';
  displayParts: ImmersiveDisplayPart[];
  digitSlotWidth: string;
  fontFamily?: string;
  fontWeight?: number;
  artSrc: string;
  motionStyle: ImmersiveMotionStyle;
}

interface SvgTextSegment {
  kind: ImmersiveDisplayPart['kind'];
  value: string;
  centerX: number;
  fontSize: number;
}

interface SvgLayout {
  segments: SvgTextSegment[];
  widthInCh: number;
  widthInUnits: number;
}

const SVG_HEIGHT = 120;
const SVG_UNITS_PER_CH = 100;
const VALUE_FONT_SIZE = 108;
const SEPARATOR_FONT_SIZE = 86;
const ART_WIDTH_SCALE = 2.15;
const ART_HEIGHT_SCALE = 2.25;
const ART_OFFSET_X = -0.58;
const ART_OFFSET_Y = -0.62;

const parseCh = (width: string): number => {
  const parsed = Number.parseFloat(width);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatChWidth = (value: number): string =>
  `${value.toFixed(2).replace(/\.?0+$/, '')}ch`;

const buildSvgLayout = (
  displayParts: ImmersiveDisplayPart[],
  digitSlotWidth: string,
  orientation: 'landscape' | 'portrait'
): SvgLayout => {
  const digitWidth = parseCh(digitSlotWidth)
    * (orientation === 'landscape' ? IMMERSIVE_TIMER_LANDSCAPE_DIGIT_WIDTH_SCALE : 1);
  const separatorWidth = parseCh(IMMERSIVE_TIMER_SEPARATOR_SLOT_WIDTH);
  const widths = displayParts.map((part) => (part.kind === 'value' ? digitWidth : separatorWidth));
  const widthInCh = widths.reduce((sum, width) => sum + width, 0);

  let cursor = 0;
  const segments = displayParts.map((part, index) => {
    const width = widths[index] * SVG_UNITS_PER_CH;
    const centerX = cursor + width / 2;
    cursor += width;

    return {
      kind: part.kind,
      value: part.value,
      centerX,
      fontSize: part.kind === 'value' ? VALUE_FONT_SIZE : SEPARATOR_FONT_SIZE,
    };
  });

  return {
    segments,
    widthInCh,
    widthInUnits: Math.max(widthInCh * SVG_UNITS_PER_CH, 1),
  };
};

const immersiveMaskStyles = `
.immersive-mask {
  position: relative;
  isolation: isolate;
  display: block;
  flex-shrink: 0;
}

.immersive-mask__svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.immersive-mask--landscape,
.immersive-mask__landscape {
  height: 0.98em;
}

.immersive-mask__portrait-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.28rem;
}

.immersive-mask__portrait-value {
  position: relative;
  height: 1em;
}

.immersive-mask__motion,
.immersive-mask__motion-secondary {
  transform-box: fill-box;
  transform-origin: center;
  will-change: transform;
}

.immersive-mask__motion-secondary {
  mix-blend-mode: screen;
  opacity: 0;
}

.immersive-mask__image {
  filter: saturate(1.14) contrast(1.08) brightness(1.04);
}

.immersive-mask__motion--sweep {
  animation: immersive-mask-sweep 11.5s ease-in-out infinite;
}

.immersive-mask__motion--orbit {
  animation: immersive-mask-orbit 8.9s ease-in-out infinite;
}

.immersive-mask__motion--drift {
  animation: immersive-mask-drift 13.5s ease-in-out infinite;
}

.immersive-mask__motion-secondary--drift {
  opacity: 0.4;
  animation: immersive-mask-drift-secondary 10.6s ease-in-out infinite;
}

@keyframes immersive-mask-sweep {
  0% {
    transform: translate(-11%, -7%) scale(1.16) rotate(-7deg);
  }
  38% {
    transform: translate(10%, 5%) scale(1.3) rotate(4deg);
  }
  72% {
    transform: translate(-3%, 10%) scale(1.24) rotate(8deg);
  }
  100% {
    transform: translate(-11%, -7%) scale(1.16) rotate(-7deg);
  }
}

@keyframes immersive-mask-orbit {
  0% {
    transform: translate(-13%, -12%) scale(1.24) rotate(-15deg);
  }
  28% {
    transform: translate(12%, -2%) scale(1.16) rotate(4deg);
  }
  62% {
    transform: translate(7%, 15%) scale(1.31) rotate(17deg);
  }
  100% {
    transform: translate(-13%, -12%) scale(1.24) rotate(-15deg);
  }
}

@keyframes immersive-mask-drift {
  0% {
    transform: translate(-7%, 6%) scale(1.12) rotate(-5deg);
  }
  34% {
    transform: translate(8%, -8%) scale(1.2) rotate(3deg);
  }
  74% {
    transform: translate(-1%, 11%) scale(1.16) rotate(7deg);
  }
  100% {
    transform: translate(-7%, 6%) scale(1.12) rotate(-5deg);
  }
}

@keyframes immersive-mask-drift-secondary {
  0% {
    transform: translate(9%, -8%) scale(1.28) rotate(10deg);
  }
  40% {
    transform: translate(-6%, 6%) scale(1.18) rotate(-5deg);
  }
  78% {
    transform: translate(4%, 12%) scale(1.26) rotate(14deg);
  }
  100% {
    transform: translate(9%, -8%) scale(1.28) rotate(10deg);
  }
}
`;

const buildArtFrame = (layout: SvgLayout) => ({
  x: layout.widthInUnits * ART_OFFSET_X,
  y: SVG_HEIGHT * ART_OFFSET_Y,
  width: layout.widthInUnits * ART_WIDTH_SCALE,
  height: SVG_HEIGHT * ART_HEIGHT_SCALE,
});

const renderTextSegments = (
  segments: SvgTextSegment[],
  fontFamily: string,
  fontWeight: number
) =>
  segments.map((segment, index) => (
    <text
      key={`${segment.value}-${index}`}
      x={segment.centerX}
      y={SVG_HEIGHT / 2}
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily={fontFamily}
      fontWeight={fontWeight}
      fontSize={segment.fontSize}
      letterSpacing={IMMERSIVE_TIMER_LETTER_SPACING}
      style={{
        fontVariantNumeric: 'lining-nums tabular-nums',
        fontFeatureSettings: '"tnum" 1',
      }}
    >
      {segment.value}
    </text>
  ));

interface MaskedArtSvgProps {
  layout: SvgLayout;
  artSrc: string;
  fontFamily: string;
  fontWeight: number;
  motionStyle: ImmersiveMotionStyle;
  clipId: string;
}

const MaskedArtSvg: React.FC<MaskedArtSvgProps> = ({
  layout,
  artSrc,
  fontFamily,
  fontWeight,
  motionStyle,
  clipId,
}) => {
  const artFrame = buildArtFrame(layout);

  return (
    <svg
      className="immersive-mask__svg"
      viewBox={`0 0 ${layout.widthInUnits} ${SVG_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          {renderTextSegments(layout.segments, fontFamily, fontWeight)}
        </clipPath>
      </defs>

      <g
        data-art-layer="true"
        clipPath={`url(#${clipId})`}
      >
        <g className={`immersive-mask__motion immersive-mask__motion--${motionStyle}`}>
          <image
            className="immersive-mask__image"
            href={artSrc}
            x={artFrame.x}
            y={artFrame.y}
            width={artFrame.width}
            height={artFrame.height}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>

        {motionStyle === 'drift' ? (
          <g className="immersive-mask__motion-secondary immersive-mask__motion-secondary--drift">
            <image
              className="immersive-mask__image"
              href={artSrc}
              x={artFrame.x + layout.widthInUnits * 0.08}
              y={artFrame.y - SVG_HEIGHT * 0.06}
              width={artFrame.width * 1.02}
              height={artFrame.height * 1.02}
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        ) : null}
      </g>
    </svg>
  );
};

export const ImmersiveMaskedDigits: React.FC<ImmersiveMaskedDigitsProps> = ({
  orientation,
  displayParts,
  digitSlotWidth,
  fontFamily = IMMERSIVE_TIMER_FONT_FAMILY,
  fontWeight = IMMERSIVE_TIMER_FONT_WEIGHT,
  artSrc,
  motionStyle,
}) => {
  const clipBaseId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const valueParts = displayParts.filter((part) => part.kind === 'value');

  if (orientation === 'portrait') {
    return (
      <>
        <style>{immersiveMaskStyles}</style>
        <div className="immersive-mask__portrait-stack" data-motion-style={motionStyle}>
          {valueParts.map((part, index) => {
            const layout = buildSvgLayout([part], digitSlotWidth, orientation);

            return (
              <div
                key={`${part.value}-${index}`}
                className="immersive-mask immersive-mask__portrait-value"
                style={{ width: digitSlotWidth }}
              >
                <MaskedArtSvg
                  layout={layout}
                  artSrc={artSrc}
                  fontFamily={fontFamily}
                  fontWeight={fontWeight}
                  motionStyle={motionStyle}
                  clipId={`${clipBaseId}-portrait-${index}`}
                />
              </div>
            );
          })}
        </div>
      </>
    );
  }

  const layout = buildSvgLayout(displayParts, digitSlotWidth, orientation);

  return (
    <>
      <style>{immersiveMaskStyles}</style>
      <div
        className="immersive-mask immersive-mask--landscape immersive-mask__landscape"
        data-motion-style={motionStyle}
        style={{ width: formatChWidth(layout.widthInCh) }}
      >
        <MaskedArtSvg
          layout={layout}
          artSrc={artSrc}
          fontFamily={fontFamily}
          fontWeight={fontWeight}
          motionStyle={motionStyle}
          clipId={`${clipBaseId}-landscape`}
        />
      </div>
    </>
  );
};
