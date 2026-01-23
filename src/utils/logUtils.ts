/**
 * @file logUtils.ts
 * @input Log objects
 * @output Processed/Split logs
 * @pos Utility (Log Data Manipulation)
 * @description Helper functions for processing time logs, specifically handling logs that cross midnight boundaries.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { Log } from '../types';

/**
 * 检测一条记录是否跨天
 */
export function isCrossingMidnight(startTime: number, endTime: number): boolean {
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // 比较日期部分（忽略时间）
    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    return startDay.getTime() !== endDay.getTime();
}

/**
 * 将跨天的Log记录按日期拆分为多条记录
 * 每条记录归属于各自的日期，从午夜0点分割
 * 
 * @param baseLog - 基础Log对象（不包含id，因为每条拆分记录需要新id）
 * @returns 拆分后的Log数组，如果不跨天则返回单条记录
 * 
 * @example
 * // 睡眠记录：23:30 - 次日01:30
 * const logs = splitLogByDays({
 *   startTime: new Date('2024-01-01 23:30').getTime(),
 *   endTime: new Date('2024-01-02 01:30').getTime(),
 *   // ... other fields
 * });
 * // 返回2条记录：
 * // 1. 2024-01-01 23:30 - 23:59:59.999 (30分钟)
 * // 2. 2024-01-02 00:00:00.000 - 01:30 (90分钟)
 */
export function splitLogByDays(baseLog: Omit<Log, 'id'>): Log[] {
    // 如果不跨天，直接返回单条记录
    if (!isCrossingMidnight(baseLog.startTime, baseLog.endTime)) {
        return [{
            ...baseLog,
            id: crypto.randomUUID()
        }];
    }

    const logs: Log[] = [];
    let currentStart = baseLog.startTime;
    const endTime = baseLog.endTime;

    // 循环拆分，处理跨多天的情况
    while (currentStart < endTime) {
        const currentDate = new Date(currentStart);

        // 计算当天的结束时间（23:59:59.999）
        const endOfDay = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
            23, 59, 59, 999
        ).getTime();

        // 当前段的结束时间是当天结束或总结束时间，取较小值
        const currentEnd = Math.min(endOfDay, endTime);
        const duration = (currentEnd - currentStart) / 1000;

        // 创建当天的记录
        logs.push({
            ...baseLog,
            id: crypto.randomUUID(),
            startTime: currentStart,
            endTime: currentEnd,
            duration: duration
        });

        // 移动到下一天的开始（00:00:00.000）
        currentStart = endOfDay + 1;
    }

    return logs;
}
