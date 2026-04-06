import { describe, expect, test } from 'vitest';
import {
  buildImmersiveDisplayParts,
  getImmersiveDisplayFormatSegmentCount,
  getImmersiveDigitSlotWidth,
  toggleImmersiveDisplayFormat,
  toggleImmersiveDisplaySource,
} from './immersiveTimeDisplay';

describe('immersiveTimeDisplay', () => {
  test('formats elapsed hours-minutes-seconds', () => {
    expect(
      buildImmersiveDisplayParts({
        source: 'elapsed',
        format: 'hoursMinutesSeconds',
        elapsedSeconds: 4285,
        now: new Date('2026-04-06T13:30:18'),
      })
    ).toEqual([
      { kind: 'value', value: '01', label: '小时' },
      { kind: 'separator', value: ':' },
      { kind: 'value', value: '11', label: '分钟' },
      { kind: 'separator', value: ':' },
      { kind: 'value', value: '25', label: '秒' },
    ]);
  });

  test('formats elapsed hours-minutes', () => {
    expect(
      buildImmersiveDisplayParts({
        source: 'elapsed',
        format: 'hoursMinutes',
        elapsedSeconds: 4285,
        now: new Date('2026-04-06T13:30:18'),
      })
    ).toEqual([
      { kind: 'value', value: '01', label: '小时' },
      { kind: 'separator', value: ':' },
      { kind: 'value', value: '11', label: '分钟' },
    ]);
  });

  test('formats elapsed minutes-seconds using cumulative minutes', () => {
    expect(
      buildImmersiveDisplayParts({
        source: 'elapsed',
        format: 'minutesSeconds',
        elapsedSeconds: 4285,
        now: new Date('2026-04-06T13:30:18'),
      })
    ).toEqual([
      { kind: 'value', value: '71', label: '分钟' },
      { kind: 'separator', value: ':' },
      { kind: 'value', value: '25', label: '秒' },
    ]);
  });

  test('formats current hours-minutes from local time', () => {
    expect(
      buildImmersiveDisplayParts({
        source: 'current',
        format: 'hoursMinutes',
        elapsedSeconds: 5,
        now: new Date('2026-04-06T13:30:18'),
      })
    ).toEqual([
      { kind: 'value', value: '13', label: '小时' },
      { kind: 'separator', value: ':' },
      { kind: 'value', value: '30', label: '分钟' },
    ]);
  });

  test('formats current minutes-seconds from local time', () => {
    expect(
      buildImmersiveDisplayParts({
        source: 'current',
        format: 'minutesSeconds',
        elapsedSeconds: 5,
        now: new Date('2026-04-06T13:30:18'),
      })
    ).toEqual([
      { kind: 'value', value: '30', label: '分钟' },
      { kind: 'separator', value: ':' },
      { kind: 'value', value: '18', label: '秒' },
    ]);
  });

  test('formats current hours-minutes-seconds from local time', () => {
    expect(
      buildImmersiveDisplayParts({
        source: 'current',
        format: 'hoursMinutesSeconds',
        elapsedSeconds: 5,
        now: new Date('2026-04-06T13:30:18'),
      })
    ).toEqual([
      { kind: 'value', value: '13', label: '小时' },
      { kind: 'separator', value: ':' },
      { kind: 'value', value: '30', label: '分钟' },
      { kind: 'separator', value: ':' },
      { kind: 'value', value: '18', label: '秒' },
    ]);
  });

  test('widens digit slots for three-digit minute displays', () => {
    expect(getImmersiveDigitSlotWidth(['128', '08'])).toBe('3.36ch');
    expect(getImmersiveDigitSlotWidth(['09', '58'])).toBe('2.45ch');
  });

  test('toggles display source between elapsed and current', () => {
    expect(toggleImmersiveDisplaySource('elapsed')).toBe('current');
    expect(toggleImmersiveDisplaySource('current')).toBe('elapsed');
  });

  test('cycles display formats in the expected order', () => {
    expect(toggleImmersiveDisplayFormat('hoursMinutes', 'elapsed')).toBe('minutesSeconds');
    expect(toggleImmersiveDisplayFormat('minutesSeconds', 'elapsed')).toBe('hoursMinutesSeconds');
    expect(toggleImmersiveDisplayFormat('hoursMinutesSeconds', 'elapsed')).toBe('hoursMinutes');
  });

  test('skips minutes-seconds when the source is current time', () => {
    expect(toggleImmersiveDisplayFormat('hoursMinutes', 'current')).toBe('hoursMinutesSeconds');
    expect(toggleImmersiveDisplayFormat('hoursMinutesSeconds', 'current')).toBe('hoursMinutes');
  });

  test('maps display formats to compact icon segment counts', () => {
    expect(getImmersiveDisplayFormatSegmentCount('hoursMinutes')).toBe(2);
    expect(getImmersiveDisplayFormatSegmentCount('minutesSeconds')).toBe(2);
    expect(getImmersiveDisplayFormatSegmentCount('hoursMinutesSeconds')).toBe(3);
  });
});
