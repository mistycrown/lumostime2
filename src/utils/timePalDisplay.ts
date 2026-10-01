/**
 * @file timePalDisplay.ts
 * @description Formatting helpers for the TimePal card display.
 * @input seconds: number - Accumulated focus time in seconds.
 * @input showSeconds: boolean - Whether the card should include seconds.
 * @output A zero-padded duration string for the TimePal card.
 */

const padTimeUnit = (value: number): string => value.toString().padStart(2, '0');

export const formatTimePalDuration = (seconds: number, showSeconds: boolean): string => {
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (!showSeconds) {
    return `${padTimeUnit(hours)}:${padTimeUnit(minutes)}`;
  }

  const remainingSeconds = Math.floor(totalSeconds % 60);
  return `${padTimeUnit(hours)}:${padTimeUnit(minutes)}:${padTimeUnit(remainingSeconds)}`;
};
