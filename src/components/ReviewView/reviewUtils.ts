/**
 * @file reviewUtils.ts
 * @description Shared utility functions for Review Views
 */

/**
 * Extract emoji or UI icon from template title
 */
export const getTemplateDisplayInfo = (title: string) => {
    const iconRegex = /^(ui:[a-z_]+|\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u;
    const match = title.match(iconRegex);
    if (match) {
        return {
            emoji: match[1],
            text: title.substring(match[0].length).trim()
        };
    }
    return { emoji: null, text: title };
};

/**
 * Format duration in seconds to Chinese readable format
 */
export const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}小时${m}分钟`;
    return `${m}分钟`;
};

/**
 * Format date to YYYY/MM/DD
 */
export const formatDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
};

/**
 * Format title date for weekly review (YYYY/MM/DD - MM/DD)
 */
export const formatWeeklyTitleDate = (start: Date, end: Date): string => {
    const startYear = start.getFullYear();
    const startMonth = String(start.getMonth() + 1).padStart(2, '0');
    const startDay = String(start.getDate()).padStart(2, '0');

    const endYear = end.getFullYear();
    const endMonth = String(end.getMonth() + 1).padStart(2, '0');
    const endDay = String(end.getDate()).padStart(2, '0');

    if (startYear === endYear) {
        return `${startYear}/${startMonth}/${startDay} - ${endMonth}/${endDay}`;
    }
    return `${startYear}/${startMonth}/${startDay} - ${endYear}/${endMonth}/${endDay}`;
};

/**
 * Format title date for monthly review (YYYY/MM)
 */
export const formatMonthlyTitleDate = (start: Date): string => {
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, '0');
    return `${year}/${month}`;
};
