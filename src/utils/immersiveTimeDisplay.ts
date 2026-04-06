/**
 * @file immersiveTimeDisplay.ts
 * @input Display source, display format, elapsed seconds, and current time
 * @output Immersive timer display parts and adaptive digit-slot width helpers
 * @pos Utility
 * @description Centralizes immersive timer display parsing so source and format switches can be tested without coupling to the React component tree.
 */

import {
  IMMERSIVE_TIMER_DIGIT_SLOT_WIDTH,
  IMMERSIVE_TIMER_DIGIT_SLOT_WIDTH_PER_CHARACTER,
} from '../components/immersiveTimerConfig';

export type ImmersiveDisplaySource = 'elapsed' | 'current';
export type ImmersiveDisplayFormat = 'hoursMinutes' | 'minutesSeconds' | 'hoursMinutesSeconds';

export interface ImmersiveDisplayPart {
  kind: 'value' | 'separator';
  value: string;
  label?: '小时' | '分钟' | '秒';
}

interface BuildImmersiveDisplayPartsInput {
  source: ImmersiveDisplaySource;
  format: ImmersiveDisplayFormat;
  elapsedSeconds: number;
  now: Date;
}

const padTwoDigits = (value: number) => value.toString().padStart(2, '0');

const padMinimumTwoDigits = (value: number) => {
  if (value >= 100) {
    return value.toString();
  }

  return padTwoDigits(value);
};

export const toggleImmersiveDisplaySource = (
  source: ImmersiveDisplaySource
): ImmersiveDisplaySource => (source === 'elapsed' ? 'current' : 'elapsed');

export const toggleImmersiveDisplayFormat = (
  format: ImmersiveDisplayFormat,
  source: ImmersiveDisplaySource
): ImmersiveDisplayFormat => {
  if (source === 'current') {
    return format === 'hoursMinutes' ? 'hoursMinutesSeconds' : 'hoursMinutes';
  }

  if (format === 'hoursMinutes') {
    return 'minutesSeconds';
  }

  if (format === 'minutesSeconds') {
    return 'hoursMinutesSeconds';
  }

  return 'hoursMinutes';
};

export const getDefaultImmersiveDisplayFormatForSource = (
  source: ImmersiveDisplaySource,
  format: ImmersiveDisplayFormat
): ImmersiveDisplayFormat => {
  if (source === 'current' && format === 'minutesSeconds') {
    return 'hoursMinutes';
  }

  return format;
};

export const buildImmersiveDisplayParts = ({
  source,
  format,
  elapsedSeconds,
  now,
}: BuildImmersiveDisplayPartsInput): ImmersiveDisplayPart[] => {
  const elapsedHours = Math.floor(elapsedSeconds / 3600);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const elapsedMinutesWithinHour = Math.floor((elapsedSeconds % 3600) / 60);
  const elapsedSecondsWithinMinute = elapsedSeconds % 60;

  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentSeconds = now.getSeconds();

  if (source === 'current') {
    if (format === 'hoursMinutes') {
      return [
        { kind: 'value', value: padTwoDigits(currentHours), label: '小时' },
        { kind: 'separator', value: ':' },
        { kind: 'value', value: padTwoDigits(currentMinutes), label: '分钟' },
      ];
    }

    if (format === 'minutesSeconds') {
      return [
        { kind: 'value', value: padTwoDigits(currentMinutes), label: '分钟' },
        { kind: 'separator', value: ':' },
        { kind: 'value', value: padTwoDigits(currentSeconds), label: '秒' },
      ];
    }

    return [
      { kind: 'value', value: padTwoDigits(currentHours), label: '小时' },
      { kind: 'separator', value: ':' },
      { kind: 'value', value: padTwoDigits(currentMinutes), label: '分钟' },
      { kind: 'separator', value: ':' },
      { kind: 'value', value: padTwoDigits(currentSeconds), label: '秒' },
    ];
  }

  if (format === 'hoursMinutes') {
    return [
      { kind: 'value', value: padMinimumTwoDigits(elapsedHours), label: '小时' },
      { kind: 'separator', value: ':' },
      { kind: 'value', value: padTwoDigits(elapsedMinutesWithinHour), label: '分钟' },
    ];
  }

  if (format === 'minutesSeconds') {
    return [
      { kind: 'value', value: padMinimumTwoDigits(elapsedMinutes), label: '分钟' },
      { kind: 'separator', value: ':' },
      { kind: 'value', value: padTwoDigits(elapsedSecondsWithinMinute), label: '秒' },
    ];
  }

  return [
    { kind: 'value', value: padMinimumTwoDigits(elapsedHours), label: '小时' },
    { kind: 'separator', value: ':' },
    { kind: 'value', value: padTwoDigits(elapsedMinutesWithinHour), label: '分钟' },
    { kind: 'separator', value: ':' },
    { kind: 'value', value: padTwoDigits(elapsedSecondsWithinMinute), label: '秒' },
  ];
};

export const getImmersiveDigitSlotWidth = (values: string[]): string => {
  const maxLength = values.reduce((longest, value) => Math.max(longest, value.length), 2);

  if (maxLength <= 2) {
    return IMMERSIVE_TIMER_DIGIT_SLOT_WIDTH;
  }

  return `${(maxLength * IMMERSIVE_TIMER_DIGIT_SLOT_WIDTH_PER_CHARACTER).toFixed(2).replace(/\.?0+$/, '')}ch`;
};
