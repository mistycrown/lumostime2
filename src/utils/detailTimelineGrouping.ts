/**
 * @file detailTimelineGrouping.ts
 * @input Detail timeline logs, countable logs, and the active timeline view mode
 * @output Date-keyed duration and log maps for detail timeline rendering
 * @description Builds consistent date groups for month and all-record detail timelines.
 * @updated 2026-08-09: Added month grouping that excludes cross-month and planned-only dates.
 */
import { Log } from '../types';

export type DetailTimelineViewMode = 'month' | 'all';

export interface DetailTimelineGroupedData {
    durationMap: Map<number, number>;
    logsMap: Map<number, Log[]>;
}

const getStartOfDayTimestamp = (log: Log): number => {
    const date = new Date(log.startTime);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

export const buildDetailTimelineGroupedData = (
    logsToDisplay: Log[],
    countableLogsToDisplay: Log[],
    viewMode: DetailTimelineViewMode
): DetailTimelineGroupedData => {
    const durationMap = new Map<number, number>();
    const logsMap = new Map<number, Log[]>();
    const displayedDateKeys = viewMode === 'month'
        ? new Set(logsToDisplay.map(getStartOfDayTimestamp))
        : undefined;

    if (viewMode === 'all') {
        logsToDisplay.forEach((log) => {
            const startOfDay = getStartOfDayTimestamp(log);
            if (!durationMap.has(startOfDay)) {
                durationMap.set(startOfDay, 0);
            }
            if (!logsMap.has(startOfDay)) {
                logsMap.set(startOfDay, []);
            }
            logsMap.get(startOfDay)!.push(log);
        });
    }

    countableLogsToDisplay.forEach((log) => {
        const startOfDay = getStartOfDayTimestamp(log);
        if (displayedDateKeys && !displayedDateKeys.has(startOfDay)) {
            return;
        }
        durationMap.set(startOfDay, (durationMap.get(startOfDay) || 0) + log.duration);
    });

    if (viewMode === 'month') {
        logsToDisplay.forEach((log) => {
            const startOfDay = getStartOfDayTimestamp(log);

            // Hide dates containing only planned/non-countable logs while
            // retaining those logs on a date with countable activity.
            if (!durationMap.has(startOfDay)) {
                return;
            }

            if (!logsMap.has(startOfDay)) {
                logsMap.set(startOfDay, []);
            }
            logsMap.get(startOfDay)!.push(log);
        });
    }

    return { durationMap, logsMap };
};
