import { describe, expect, it } from 'vitest';
import { getDailyCheckColorValues } from './dailyCheckColorUtils';

describe('dailyCheckColorUtils', () => {
  it('returns null when a legacy template has no stored color', () => {
    expect(getDailyCheckColorValues()).toBeNull();
  });

  it('resolves palette tokens and custom HEX colors for daily-check surfaces', () => {
    expect(getDailyCheckColorValues('bg-blue-50 text-blue-600')).toEqual({
      surface: '#bfdbfe',
      primary: '#3b82f6'
    });
    expect(getDailyCheckColorValues('#123456')).toEqual({
      surface: 'rgba(18, 52, 86, 0.16)',
      primary: '#123456'
    });
  });
});
