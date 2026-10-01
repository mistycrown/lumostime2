import { describe, expect, it } from 'vitest';
import { formatTimePalDuration } from './timePalDisplay';

describe('formatTimePalDuration', () => {
    it('keeps seconds in the default card format', () => {
        expect(formatTimePalDuration(3661, true)).toBe('01:01:01');
    });

    it('hides seconds when the card setting is disabled', () => {
        expect(formatTimePalDuration(3661, false)).toBe('01:01');
    });

    it('truncates partial minutes without seconds', () => {
        expect(formatTimePalDuration(59, false)).toBe('00:00');
    });
});
