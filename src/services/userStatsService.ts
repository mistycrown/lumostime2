/**
 * @file userStatsService.ts
 * @description 用户数据统计服务 - 计算用户在 lumostime 中的各项数据统计
 */

import { USER_DATA_KEYS } from '../constants/storageKeys';

export interface UserStats {
    /** 记录的总时长（秒） */
    totalTimeSeconds: number;
    /** 记录的总时长（格式化字符串） */
    totalTimeFormatted: string;
    /** 写的总字数 */
    totalWords: number;
    /** 记录的瞬间（图片）数量 */
    totalImages: number;
    /** 使用天数 */
    daysUsed: number;
    /** 第一次使用日期 */
    firstUseDate: string;
}

class UserStatsService {
    /**
     * 获取用户的所有统计数据
     */
    async getUserStats(): Promise<UserStats> {
        const totalTimeSeconds = this.getTotalTimeRecorded();
        const totalWords = this.getTotalWords();
        const totalImages = await this.getTotalImages();
        const daysUsed = this.getDaysUsed();
        const firstUseDate = this.getFirstUseDate();

        return {
            totalTimeSeconds,
            totalTimeFormatted: this.formatDuration(totalTimeSeconds),
            totalWords,
            totalImages,
            daysUsed,
            firstUseDate
        };
    }

    /**
     * 计算记录的总时长（秒）
     */
    private getTotalTimeRecorded(): number {
        try {
            const logsJson = localStorage.getItem(USER_DATA_KEYS.LOGS);
            if (!logsJson) return 0;

            const logs = JSON.parse(logsJson);
            if (!Array.isArray(logs)) return 0;

            // 计算所有日志的时长总和
            const totalSeconds = logs.reduce((sum, log) => {
                if (log.startTime && log.endTime) {
                    const duration = (log.endTime - log.startTime) / 1000; // 转换为秒
                    return sum + duration;
                }
                return sum;
            }, 0);

            return Math.floor(totalSeconds);
        } catch (error) {
            console.error('[UserStatsService] 计算总时长失败:', error);
            return 0;
        }
    }

    /**
     * 计算写的总字数
     */
    private getTotalWords(): number {
        try {
            const logsJson = localStorage.getItem(USER_DATA_KEYS.LOGS);
            if (!logsJson) return 0;

            const logs = JSON.parse(logsJson);
            if (!Array.isArray(logs)) return 0;

            // 统计所有日志中的文字数量
            const totalWords = logs.reduce((sum, log) => {
                let words = 0;
                
                // 统计 title 字数
                if (log.title && typeof log.title === 'string') {
                    words += log.title.length;
                }
                
                // 统计 note 字数
                if (log.note && typeof log.note === 'string') {
                    words += log.note.length;
                }
                
                return sum + words;
            }, 0);

            return totalWords;
        } catch (error) {
            console.error('[UserStatsService] 计算总字数失败:', error);
            return 0;
        }
    }

    /**
     * 计算记录的瞬间（图片）数量
     */
    private async getTotalImages(): Promise<number> {
        try {
            const logsJson = localStorage.getItem(USER_DATA_KEYS.LOGS);
            if (!logsJson) return 0;

            const logs = JSON.parse(logsJson);
            if (!Array.isArray(logs)) return 0;

            // 统计所有带图片的日志
            const imagesCount = logs.reduce((sum, log) => {
                if (log.images && Array.isArray(log.images)) {
                    return sum + log.images.length;
                }
                return sum;
            }, 0);

            return imagesCount;
        } catch (error) {
            console.error('[UserStatsService] 计算图片数量失败:', error);
            return 0;
        }
    }

    /**
     * 计算使用天数
     */
    private getDaysUsed(): number {
        try {
            const logsJson = localStorage.getItem(USER_DATA_KEYS.LOGS);
            if (!logsJson) return 0;

            const logs = JSON.parse(logsJson);
            if (!Array.isArray(logs) || logs.length === 0) return 0;

            // 获取所有不同的日期
            const uniqueDates = new Set<string>();
            logs.forEach(log => {
                if (log.startTime) {
                    const date = new Date(log.startTime);
                    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
                    uniqueDates.add(dateStr);
                }
            });

            // 计算从第一天到今天的天数
            const firstDate = this.getFirstUseDate();
            if (!firstDate) return uniqueDates.size;

            const first = new Date(firstDate);
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - first.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 包含第一天

            return diffDays;
        } catch (error) {
            console.error('[UserStatsService] 计算使用天数失败:', error);
            return 0;
        }
    }

    /**
     * 获取第一次使用日期
     */
    private getFirstUseDate(): string {
        try {
            const logsJson = localStorage.getItem(USER_DATA_KEYS.LOGS);
            if (!logsJson) return '';

            const logs = JSON.parse(logsJson);
            if (!Array.isArray(logs) || logs.length === 0) return '';

            // 找到最早的日志
            const earliestLog = logs.reduce((earliest, log) => {
                if (!log.startTime) return earliest;
                if (!earliest || log.startTime < earliest.startTime) {
                    return log;
                }
                return earliest;
            }, null);

            if (!earliestLog || !earliestLog.startTime) return '';

            const date = new Date(earliestLog.startTime);
            return date.toISOString().split('T')[0]; // YYYY-MM-DD
        } catch (error) {
            console.error('[UserStatsService] 获取首次使用日期失败:', error);
            return '';
        }
    }

    /**
     * 格式化时长
     */
    private formatDuration(seconds: number): string {
        if (seconds < 60) {
            return `${seconds}秒`;
        }

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours === 0) {
            return `${minutes}分`;
        }

        if (minutes === 0) {
            return `${hours}时`;
        }

        return `${hours}时${minutes}分`;
    }
}

export const userStatsService = new UserStatsService();
