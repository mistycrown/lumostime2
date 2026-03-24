/**
 * @file userStatsService.ts
 * @description User data statistics service that reads heavy log data through the async data repository instead of directly from localStorage.
 */
import { Log } from '../types';
import { dataRepository } from '../repositories/dataRepository';

export interface UserStats {
  totalTimeSeconds: number;
  totalTimeFormatted: string;
  totalWords: number;
  totalImages: number;
  daysUsed: number;
  firstUseDate: string;
}

class UserStatsService {
  async getUserStats(): Promise<UserStats> {
    const logs = await this.getLogs();
    const totalTimeSeconds = this.getTotalTimeRecorded(logs);
    const totalWords = this.getTotalWords(logs);
    const totalImages = this.getTotalImages(logs);
    const daysUsed = this.getDaysUsed(logs);
    const firstUseDate = this.getFirstUseDate(logs);

    return {
      totalTimeSeconds,
      totalTimeFormatted: this.formatDuration(totalTimeSeconds),
      totalWords,
      totalImages,
      daysUsed,
      firstUseDate
    };
  }

  private async getLogs(): Promise<Log[]> {
    try {
      return await dataRepository.getLogs();
    } catch (error) {
      console.error('[UserStatsService] Failed to load logs from repository', error);
      return [];
    }
  }

  private getTotalTimeRecorded(logs: Log[]): number {
    const totalSeconds = logs.reduce((sum, log) => {
      if (log.startTime && log.endTime) {
        return sum + (log.endTime - log.startTime) / 1000;
      }
      return sum;
    }, 0);

    return Math.floor(totalSeconds);
  }

  private getTotalWords(logs: Log[]): number {
    return logs.reduce((sum, log) => {
      let words = 0;

      if (typeof log.title === 'string') {
        words += log.title.length;
      }

      if (typeof log.note === 'string') {
        words += log.note.length;
      }

      return sum + words;
    }, 0);
  }

  private getTotalImages(logs: Log[]): number {
    return logs.reduce((sum, log) => {
      if (Array.isArray(log.images)) {
        return sum + log.images.length;
      }
      return sum;
    }, 0);
  }

  private getDaysUsed(logs: Log[]): number {
    if (!logs.length) {
      return 0;
    }

    const uniqueDates = new Set<string>();
    logs.forEach((log) => {
      if (log.startTime) {
        uniqueDates.add(new Date(log.startTime).toISOString().split('T')[0]);
      }
    });

    const firstUseDate = this.getFirstUseDate(logs);
    if (!firstUseDate) {
      return uniqueDates.size;
    }

    const first = new Date(firstUseDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - first.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  private getFirstUseDate(logs: Log[]): string {
    if (!logs.length) {
      return '';
    }

    const earliestLog = logs.reduce<Log | null>((earliest, log) => {
      if (!log.startTime) {
        return earliest;
      }

      if (!earliest || log.startTime < earliest.startTime) {
        return log;
      }

      return earliest;
    }, null);

    if (!earliestLog?.startTime) {
      return '';
    }

    return new Date(earliestLog.startTime).toISOString().split('T')[0];
  }

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
