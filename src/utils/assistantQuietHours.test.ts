import { describe, expect, it } from 'vitest';
import { normalizeAssistantQuietHoursValue } from './assistantQuietHours';

describe('normalizeAssistantQuietHoursValue', () => {
  it('accepts compact four-digit values', () => {
    expect(normalizeAssistantQuietHoursValue('2300')).toBe('2300');
    expect(normalizeAssistantQuietHoursValue('0730')).toBe('0730');
  });

  it('migrates legacy HH:MM values', () => {
    expect(normalizeAssistantQuietHoursValue('23:00')).toBe('2300');
    expect(normalizeAssistantQuietHoursValue('07:30')).toBe('0730');
  });

  it('rejects malformed or impossible times', () => {
    expect(normalizeAssistantQuietHoursValue('')).toBeUndefined();
    expect(normalizeAssistantQuietHoursValue('2400')).toBeUndefined();
    expect(normalizeAssistantQuietHoursValue('2360')).toBeUndefined();
    expect(normalizeAssistantQuietHoursValue('23')).toBeUndefined();
    expect(normalizeAssistantQuietHoursValue('abcd')).toBeUndefined();
  });
});
