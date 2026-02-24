/**
 * @file CheckItemStreakBadge.tsx
 * @description 日课坚持天数徽章组件 - 显示总坚持天数和连续坚持天数
 * 
 * 用于在日课列表中显示激励信息，包含奖杯图标和两个数字
 */
import React from 'react';
import { Trophy } from 'lucide-react';
import { DailyReview } from '../types';
import { calculateCheckItemStreak } from '../utils/reviewStatsUtils';

interface CheckItemStreakBadgeProps {
    checkItemContent: string;
    dailyReviews: DailyReview[];
    targetDate?: Date;
    className?: string;
}

/**
 * 日课坚持天数徽章
 * 
 * @param checkItemContent - 日课内容（用于匹配）
 * @param dailyReviews - 所有日报列表
 * @param targetDate - 目标日期（默认为今天）
 * @param className - 额外的 CSS 类名
 */
export const CheckItemStreakBadge: React.FC<CheckItemStreakBadgeProps> = ({
    checkItemContent,
    dailyReviews,
    targetDate,
    className = ''
}) => {
    const stats = calculateCheckItemStreak(checkItemContent, dailyReviews, targetDate);

    // 如果没有任何完成记录，不显示徽章
    if (stats.totalDays === 0) {
        return null;
    }

    return (
        <div className={`flex items-center gap-1.5 text-xs text-amber-600 shrink-0 ${className}`}>
            <Trophy size={12} className="text-amber-500" />
            <span className="font-mono font-medium">
                {stats.totalDays}
            </span>
            <span className="text-stone-300">/</span>
            <span className="font-mono font-medium">
                {stats.currentStreak}
            </span>
        </div>
    );
};
