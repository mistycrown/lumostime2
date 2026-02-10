/**
 * @file reviewStatsUtils.ts
 * @description 回顾统计工具函数 - 用于日报、周报、月报的统计文本生成
 * 
 * 提供统一的统计文本生成逻辑，消除 DailyReviewView、WeeklyReviewView 和 MonthlyReviewView 之间的重复代码
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { Log, Category, Scope, TodoItem, TodoCategory, DailyReview } from '../types';

/**
 * 格式化时长（秒 → 小时分钟）
 */
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h`;
    } else {
        return `${minutes}m`;
    }
}

/**
 * 周范围接口
 */
export interface WeekRange {
    start: Date;
    end: Date;
}

/**
 * 获取指定日期范围内的周列表
 * 
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 周范围数组
 */
export function getWeeksInRange(startDate: Date, endDate: Date): WeekRange[] {
    const weeks: WeekRange[] = [];
    let current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    while (current <= endDate) {
        const weekStart = new Date(current);
        const weekEnd = new Date(current);
        
        // 前进到周末（周六）或月末
        const dayOfWeek = current.getDay();
        const daysToSat = 6 - dayOfWeek;
        weekEnd.setDate(current.getDate() + daysToSat);

        if (weekEnd > endDate) {
            weekEnd.setTime(endDate.getTime());
        }
        weekEnd.setHours(23, 59, 59, 999);

        weeks.push({ start: weekStart, end: weekEnd });

        // 前进到下周日
        current.setDate(current.getDate() + daysToSat + 1);
    }

    return weeks;
}

/**
 * 分类统计接口
 */
export interface CategoryStat {
    name: string;
    duration: number;
}

/**
 * 计算分类统计
 * 
 * @param logs - 日志列表
 * @param categories - 分类列表
 * @returns 分类统计数组（按时长降序）
 */
export function calculateCategoryStats(
    logs: Log[],
    categories: Category[]
): CategoryStat[] {
    const catDurations = new Map<string, number>();
    
    logs.forEach(log => {
        const catName = categories.find(c => c.id === log.categoryId)?.name || '未知';
        const duration = (log.endTime - log.startTime) / 1000;
        catDurations.set(catName, (catDurations.get(catName) || 0) + duration);
    });

    return Array.from(catDurations.entries())
        .map(([name, duration]) => ({ name, duration }))
        .sort((a, b) => b.duration - a.duration);
}

/**
 * 计算领域统计
 * 
 * @param logs - 日志列表
 * @param scopes - 领域列表
 * @returns 领域统计数组（按时长降序）
 */
export function calculateScopeStats(
    logs: Log[],
    scopes: Scope[]
): CategoryStat[] {
    const scopeDurations = new Map<string, number>();
    
    logs.forEach(log => {
        if (log.scopeIds && log.scopeIds.length > 0) {
            const duration = (log.endTime - log.startTime) / 1000;
            log.scopeIds.forEach(sid => {
                const sName = scopes.find(s => s.id === sid)?.name || '未知';
                scopeDurations.set(sName, (scopeDurations.get(sName) || 0) + duration);
            });
        }
    });

    return Array.from(scopeDurations.entries())
        .map(([name, duration]) => ({ name, duration }))
        .sort((a, b) => b.duration - a.duration);
}

/**
 * 计算待办总时长
 * 
 * @param logs - 日志列表
 * @returns 待办总时长（秒）
 */
export function calculateTodoTotalDuration(logs: Log[]): number {
    const todoLogs = logs.filter(l => l.linkedTodoId);
    return todoLogs.reduce((acc, l) => acc + (l.endTime - l.startTime) / 1000, 0);
}

/**
 * 生成周统计文本
 * 
 * @param logs - 所有日志
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @param categories - 分类列表
 * @param scopes - 领域列表
 * @returns 周统计文本
 */
export function generateWeeklyStatsText(
    logs: Log[],
    startDate: Date,
    endDate: Date,
    categories: Category[],
    scopes: Scope[]
): string {
    let text = '每周详细统计：\n';
    
    const weeks = getWeeksInRange(startDate, endDate);

    weeks.forEach((week, index) => {
        const weekLogs = logs.filter(l =>
            l.startTime >= week.start.getTime() &&
            l.endTime <= week.end.getTime()
        );

        if (weekLogs.length === 0) return;

        const dateRange = `${week.start.getMonth() + 1}/${week.start.getDate()} - ${week.end.getMonth() + 1}/${week.end.getDate()}`;
        text += `\n【第${index + 1}周 (${dateRange})】\n`;

        // 1. 标签分布
        const categoryStats = calculateCategoryStats(weekLogs, categories);
        text += `  标签分布：\n`;
        categoryStats.forEach(({ name, duration }) => {
            text += `    - ${name}: ${formatDuration(duration)}\n`;
        });

        // 2. 领域分布
        const scopeStats = calculateScopeStats(weekLogs, scopes);
        if (scopeStats.length > 0) {
            text += `  领域分布：\n`;
            scopeStats.forEach(({ name, duration }) => {
                text += `    - ${name}: ${formatDuration(duration)}\n`;
            });
        }

        // 3. 待办投入总时长
        const todoTotal = calculateTodoTotalDuration(weekLogs);
        if (todoTotal > 0) {
            text += `  待办投入总时长：${formatDuration(todoTotal)}\n`;
        }
    });

    return text;
}

/**
 * 日课统计项接口
 */
export interface CheckItemStat {
    category: string;
    content: string;
    total: number;
    completed: number;
    rate: number;
}

/**
 * 计算日课统计
 * 
 * @param dailyReviews - 日报列表
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 按分类分组的日课统计
 */
export function calculateCheckItemStats(
    dailyReviews: DailyReview[],
    startDate: Date,
    endDate: Date
): Record<string, CheckItemStat[]> {
    const monthStart = new Date(startDate);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(endDate);
    monthEnd.setHours(23, 59, 59, 999);

    // 筛选日期范围内的 dailyReviews
    const filteredReviews = dailyReviews.filter(r => {
        const reviewDate = new Date(r.date);
        return reviewDate >= monthStart && reviewDate <= monthEnd;
    });

    // 统计每个 check 项的完成情况
    const checkStats: Record<string, { category: string, total: number, completed: number }> = {};

    filteredReviews.forEach(review => {
        if (review.checkItems) {
            review.checkItems.forEach(item => {
                if (!item.category) return; // 跳过无分类项
                const key = `${item.category}|${item.content}`;
                if (!checkStats[key]) {
                    checkStats[key] = { category: item.category, total: 0, completed: 0 };
                }
                checkStats[key].total++;
                if (item.isCompleted) checkStats[key].completed++;
            });
        }
    });

    // 按分类分组
    const byCategory: Record<string, CheckItemStat[]> = {};
    Object.entries(checkStats).forEach(([key, stats]) => {
        const content = key.split('|')[1];
        const rate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
        if (!byCategory[stats.category]) byCategory[stats.category] = [];
        byCategory[stats.category].push({
            category: stats.category,
            content,
            total: stats.total,
            completed: stats.completed,
            rate
        });
    });

    return byCategory;
}

/**
 * 生成日课统计文本
 * 
 * @param dailyReviews - 日报列表
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 日课统计文本
 */
export function generateCheckItemStatsText(
    dailyReviews: DailyReview[],
    startDate: Date,
    endDate: Date
): string {
    const byCategory = calculateCheckItemStats(dailyReviews, startDate, endDate);

    if (Object.keys(byCategory).length === 0) return '';

    let text = '\n\n日课完成情况（本月汇总）：\n';
    Object.entries(byCategory).forEach(([category, items]) => {
        text += `\n${category}：\n`;
        items.forEach(item => {
            text += `  ${item.content}: ${item.completed}/${item.total} (${item.rate.toFixed(0)}%)\n`;
        });
    });

    return text;
}

/**
 * 月度统计概览接口
 */
export interface MonthlyStatsOverview {
    totalDuration: number;
    categoryStats: Array<{ name: string; duration: number; percentage: number }>;
    todoStats: Array<{ name: string; duration: number; percentage: number }>;
    scopeStats: Array<{ name: string; duration: number; percentage: number }>;
}

/**
 * 计算月度统计概览
 * 
 * @param logs - 日志列表
 * @param categories - 分类列表
 * @param todos - 待办列表
 * @param todoCategories - 待办分类列表
 * @param scopes - 领域列表
 * @returns 月度统计概览
 */
export function calculateMonthlyStats(
    logs: Log[],
    categories: Category[],
    todos: TodoItem[],
    todoCategories: TodoCategory[],
    scopes: Scope[]
): MonthlyStatsOverview {
    const totalDuration = logs.reduce((acc, log) => acc + (log.duration || 0), 0);

    // 分类统计
    const categoryStats = categories.map(cat => {
        const catLogs = logs.filter(l => l.categoryId === cat.id);
        const duration = catLogs.reduce((acc, l) => acc + (l.duration || 0), 0);
        const percentage = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;
        return { name: cat.name, duration, percentage };
    }).filter(c => c.duration > 0);

    // 待办统计
    const todoStats = todoCategories.map(cat => {
        const catTodos = todos.filter(t => t.categoryId === cat.id);
        const linkedLogs = logs.filter(l =>
            l.linkedTodoId && catTodos.some(t => t.id === l.linkedTodoId)
        );
        const duration = linkedLogs.reduce((acc, l) => acc + (l.duration || 0), 0);
        const percentage = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;
        return { name: cat.name, duration, percentage };
    }).filter(c => c.duration > 0);

    // 领域统计
    const scopeStats = scopes.map(scope => {
        const scopeLogs = logs.filter(l =>
            l.scopeIds && l.scopeIds.includes(scope.id)
        );
        const duration = scopeLogs.reduce((acc, l) => acc + (l.duration || 0), 0);
        const percentage = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;
        return { name: scope.name, duration, percentage };
    }).filter(s => s.duration > 0);

    return { totalDuration, categoryStats, todoStats, scopeStats };
}

/**
 * 生成月度统计文本
 * 
 * @param stats - 月度统计概览
 * @returns 月度统计文本
 */
export function generateMonthlyStatsText(stats: MonthlyStatsOverview): string {
    return `月度总览：\n` +
        `总时长：${formatDuration(stats.totalDuration)}\n` +
        `标签统计：\n${stats.categoryStats.map(c =>
            `- ${c.name}: ${formatDuration(c.duration)} (${c.percentage.toFixed(1)}%)`
        ).join('\n')}\n` +
        `领域统计：\n${stats.scopeStats.map(s =>
            `- ${s.name}: ${formatDuration(s.duration)} (${s.percentage.toFixed(1)}%)`
        ).join('\n')}\n`;
}

/**
 * 生成完整的月度统计文本（包含周统计和日课统计）
 * 
 * @param logs - 日志列表
 * @param categories - 分类列表
 * @param todos - 待办列表
 * @param todoCategories - 待办分类列表
 * @param scopes - 领域列表
 * @param dailyReviews - 日报列表
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 完整的月度统计文本
 */
export function generateCompleteMonthlyStatsText(
    logs: Log[],
    categories: Category[],
    todos: TodoItem[],
    todoCategories: TodoCategory[],
    scopes: Scope[],
    dailyReviews: DailyReview[],
    startDate: Date,
    endDate: Date
): string {
    // 1. 月度总览
    const monthlyStats = calculateMonthlyStats(logs, categories, todos, todoCategories, scopes);
    const overviewText = generateMonthlyStatsText(monthlyStats);

    // 2. 周统计
    const weeklyText = generateWeeklyStatsText(logs, startDate, endDate, categories, scopes);

    // 3. 日课统计
    const checkText = generateCheckItemStatsText(dailyReviews, startDate, endDate);

    return overviewText + '\n' + weeklyText + checkText;
}
