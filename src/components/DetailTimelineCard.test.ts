/**
 * @file DetailTimelineCard.test.ts
 * @input Timeline logs and selected detail timeline view mode
 * @output Regression coverage for detail timeline date grouping
 * @description Verifies month views do not create cross-month or planned-only date headings while preserving same-day timeline records.
 * @updated 2026-08-09: Added month grouping coverage for cross-month and planned-only records.
 */
import { describe, expect, test } from 'vitest';
import { Log } from '../types';
import { buildDetailTimelineGroupedData } from '../utils/detailTimelineGrouping';

const makeLog = (id: string, date: Date, options: Partial<Log> = {}): Log => ({
    id,
    activityId: 'activity-1',
    categoryId: 'category-1',
    startTime: date.getTime(),
    endTime: date.getTime() + 30 * 60 * 1000,
    duration: 30 * 60,
    ...options
});

const dayTimestamp = (date: Date): number => (
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
);

describe('buildDetailTimelineGroupedData', () => {
    test('month view groups only countable dates from the selected month', () => {
        const augustDate = new Date(2026, 7, 2, 18, 52);
        const julyDate = new Date(2026, 6, 28, 10, 0);
        const plannedOnlyDate = new Date(2026, 7, 3, 9, 0);
        const augustPlannedLog = makeLog('august-planned', plannedOnlyDate, { isPlanned: true });
        const logs = [
            makeLog('august-countable', augustDate),
            makeLog('july-countable', julyDate),
            augustPlannedLog
        ];

        const result = buildDetailTimelineGroupedData(
            logs.filter((log) => new Date(log.startTime).getMonth() === 7),
            logs.filter((log) => log.isPlanned !== true),
            'month'
        );

        expect(Array.from(result.durationMap.keys())).toEqual([dayTimestamp(augustDate)]);
        expect(result.logsMap.get(dayTimestamp(augustDate))?.map((log) => log.id)).toEqual(['august-countable']);
        expect(result.logsMap.has(dayTimestamp(plannedOnlyDate))).toBe(false);
        expect(result.durationMap.has(dayTimestamp(julyDate))).toBe(false);
    });

    test('month view keeps a planned log when the same date has countable activity', () => {
        const date = new Date(2026, 7, 2, 18, 52);
        const countableLog = makeLog('countable', date);
        const plannedLog = makeLog('planned', new Date(2026, 7, 2, 20, 0), { isPlanned: true });

        const result = buildDetailTimelineGroupedData(
            [countableLog, plannedLog],
            [countableLog],
            'month'
        );

        expect(result.logsMap.get(dayTimestamp(date))?.map((log) => log.id)).toEqual(['countable', 'planned']);
    });

    test('all view keeps existing dates even when their logs are not countable', () => {
        const plannedOnlyDate = new Date(2026, 7, 3, 9, 0);
        const plannedLog = makeLog('planned-only', plannedOnlyDate, { isPlanned: true });

        const result = buildDetailTimelineGroupedData([plannedLog], [], 'all');

        expect(result.durationMap.get(dayTimestamp(plannedOnlyDate))).toBe(0);
        expect(result.logsMap.get(dayTimestamp(plannedOnlyDate))?.map((log) => log.id)).toEqual(['planned-only']);
    });
});
