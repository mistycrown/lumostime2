/**
 * @file moodCalendarBackgroundIntegration.test.ts
 * @input Mood calendar component and sync-manager source contracts
 * @output Regression coverage for display-path hydration and appearance auto-sync registration
 * @pos Test (UI Customization)
 * @description Guards the two integration edges that keep persisted mood-calendar backgrounds visible and synchronized.
 * @updated 2026-09-29: Added cold-start hydration and appearance-event contract coverage.
 */
import { describe, expect, it } from 'vitest';
import moodCalendarSource from '../components/MoodCalendar.tsx?raw';
import syncManagerSource from '../hooks/useSyncManager.ts?raw';

describe('mood calendar background integration', () => {
  it('hydrates persisted image URLs from the calendar display path', () => {
    expect(moodCalendarSource).toContain('void moodCalendarBackgroundService.hydrateCustomBackgrounds();');
  });

  it('registers mood-calendar changes with appearance auto sync', () => {
    expect(syncManagerSource).toContain('MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT');
    expect(syncManagerSource).toMatch(/appearanceEvents\s*=\s*\[[\s\S]*MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT[\s\S]*\]/);
  });
});
