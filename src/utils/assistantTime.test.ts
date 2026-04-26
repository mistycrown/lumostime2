import { describe, expect, it } from 'vitest';
import {
  formatAssistantDateTimeForDisplay,
  getAssistantDelayMinutes,
  isAssistantDateTimeDue,
  normalizeAssistantDateTime,
  parseAssistantDateTime
} from './assistantTime';

describe('assistantTime', () => {
  it('normalizes offset datetimes into one canonical UTC instant', () => {
    const dueAt = '2026-04-26T11:30:39+08:00';

    expect(normalizeAssistantDateTime(dueAt)).toBe('2026-04-26T03:30:39.000Z');
    expect(parseAssistantDateTime(dueAt)).toBe(parseAssistantDateTime('2026-04-26T03:30:39.000Z'));
  });

  it('computes reminder delay correctly across local and UTC representations', () => {
    expect(
      getAssistantDelayMinutes(
        '2026-04-26T11:30:00+08:00',
        '2026-04-26T03:35:00.000Z'
      )
    ).toBe(5);
  });

  it('treats mixed-zone reminders as due once they reach the same instant', () => {
    expect(
      isAssistantDateTimeDue(
        '2026-04-26T11:30:00+08:00',
        new Date('2026-04-26T03:30:00.000Z')
      )
    ).toBe(true);
  });

  it('formats display timestamps without changing the represented instant', () => {
    const normalized = '2026-04-26T03:30:39.000Z';
    const displayValue = formatAssistantDateTimeForDisplay(normalized);

    expect(parseAssistantDateTime(displayValue)).toBe(parseAssistantDateTime(normalized));
  });
});
