/**
 * @file CardStatsBadge.tsx
 * @description 场景卡片统计徽章组件 - 显示不同类型卡片的统计信息
 */
import React from 'react';
import { Clock, ListTodo, Trophy } from 'lucide-react';
import { DailyReview, Log, TodoItem } from '../types';
import { calculateCheckItemStreak } from '../utils/reviewStatsUtils';

interface CardStatsBadgeProps {
    type: 'timer' | 'todo' | 'checklist';
    color?: string;
    
    // 计时卡片相关
    activityId?: string;
    categoryId?: string;
    logs?: Log[];
    
    // 待办卡片相关
    todoId?: string;
    
    // 日课卡片相关
    checkItemContent?: string;
    dailyReviews?: DailyReview[];
}

/**
 * 格式化时长显示
 */
const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
};

/**
 * 计算今天某个活动的总时长（分钟）
 */
const calculateActivityDuration = (activityId: string, categoryId: string, logs: Log[]): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    const todayLogs = logs.filter(log => 
        log.activityId === activityId &&
        log.categoryId === categoryId &&
        log.startTime >= todayStart &&
        log.startTime < todayEnd
    );

    const totalSeconds = todayLogs.reduce((sum, log) => {
        return sum + ((log.endTime - log.startTime) / 1000);
    }, 0);

    return Math.round(totalSeconds / 60);
};

/**
 * 计算今天某个待办的总时长（分钟）
 */
const calculateTodoDuration = (todoId: string, logs: Log[]): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    const todayLogs = logs.filter(log => 
        log.linkedTodoId === todoId &&
        log.startTime >= todayStart &&
        log.startTime < todayEnd
    );

    const totalSeconds = todayLogs.reduce((sum, log) => {
        return sum + ((log.endTime - log.startTime) / 1000);
    }, 0);

    return Math.round(totalSeconds / 60);
};

export const CardStatsBadge: React.FC<CardStatsBadgeProps> = ({
    type,
    color,
    activityId,
    categoryId,
    logs = [],
    todoId,
    checkItemContent,
    dailyReviews = []
}) => {
    const badgeColor = color || '#d97706';

    // 日课卡片
    if (type === 'checklist' && checkItemContent) {
        const stats = calculateCheckItemStreak(checkItemContent, dailyReviews);
        
        if (stats.totalDays === 0) {
            return null;
        }

        return (
            <div className="flex items-center gap-1.5 text-xs shrink-0" style={{ color: badgeColor }}>
                <Trophy size={12} style={{ color: badgeColor }} />
                <span className="font-mono font-medium tracking-tighter">
                    {stats.totalDays}
                </span>
                <span className="opacity-50 -mx-0.5">/</span>
                <span className="font-mono font-medium tracking-tighter">
                    {stats.currentStreak}
                </span>
            </div>
        );
    }

    // 计时卡片
    if (type === 'timer' && activityId && categoryId) {
        const minutes = calculateActivityDuration(activityId, categoryId, logs);
        
        if (minutes === 0) {
            return null;
        }

        return (
            <div className="flex items-center gap-1.5 text-xs shrink-0" style={{ color: badgeColor }}>
                <Clock size={12} style={{ color: badgeColor }} />
                <span className="font-mono font-medium tracking-tight">
                    {formatDuration(minutes)}
                </span>
            </div>
        );
    }

    // 待办卡片
    if (type === 'todo' && todoId) {
        const minutes = calculateTodoDuration(todoId, logs);
        
        if (minutes === 0) {
            return null;
        }

        return (
            <div className="flex items-center gap-1.5 text-xs shrink-0" style={{ color: badgeColor }}>
                <ListTodo size={12} style={{ color: badgeColor }} />
                <span className="font-mono font-medium tracking-tight">
                    {formatDuration(minutes)}
                </span>
            </div>
        );
    }

    return null;
};
