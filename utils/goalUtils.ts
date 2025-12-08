import { Goal, Log, TodoItem } from '../types';

/**
 * 计算目标的当前进度值
 */
export const calculateGoalProgress = (
    goal: Goal,
    logs: Log[],
    todos: TodoItem[]
): { current: number; target: number; percentage: number } => {
    const { metric, targetValue, scopeId, filterActivityIds, filterTodoCategories, startDate, endDate } = goal;

    // 转换日期为时间戳
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).setHours(23, 59, 59, 999);

    // 过滤符合条件的logs
    let relevantLogs = logs.filter(log => {
        // 必须在时间范围内
        if (log.startTime < start || log.startTime > end) return false;

        // 必须关联到该领域
        if (!log.scopeIds?.includes(scopeId)) return false;

        // 如果有filterActivityIds筛选器，必须匹配activityId
        if (filterActivityIds && filterActivityIds.length > 0) {
            return filterActivityIds.includes(log.activityId);
        }

        return true;
    });

    let currentValue = 0;

    switch (metric) {
        case 'duration_raw':
            // 原始时长（秒）
            currentValue = relevantLogs.reduce((acc, log) => acc + log.duration, 0);
            break;

        case 'duration_weighted':
            // 有效时长：Duration × (FocusScore / 5)
            currentValue = relevantLogs.reduce((acc, log) => {
                const weight = (log.focusScore || 0) / 5;
                return acc + (log.duration * weight);
            }, 0);
            break;

        case 'frequency_days':
            // 活跃天数
            const uniqueDays = new Set(
                relevantLogs.map(log => {
                    const d = new Date(log.startTime);
                    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                })
            );
            currentValue = uniqueDays.size;
            break;

        case 'task_count':
            // 待办完成数量
            const relevantTodos = todos.filter(todo => {
                if (!todo.isCompleted) return false;
                if (!todo.defaultScopeIds?.includes(scopeId)) return false;

                // 如果有filterTodoCategories筛选器，必须匹配categoryId
                if (filterTodoCategories && filterTodoCategories.length > 0) {
                    if (!filterTodoCategories.includes(todo.categoryId)) return false;
                }


                // 检查待办的完成时间是否在目标时间范围内
                if (!todo.completedAt) return false;
                const completedTime = new Date(todo.completedAt).getTime();
                return completedTime >= start && completedTime <= end;
            });
            currentValue = relevantTodos.length;
            break;

        case 'duration_limit':
            // 时长上限（反向）- 计算方式同duration_raw
            currentValue = relevantLogs.reduce((acc, log) => acc + log.duration, 0);
            break;

        default:
            currentValue = 0;
    }

    const percentage = Math.min(100, Math.max(0, (currentValue / targetValue) * 100));

    return {
        current: currentValue,
        target: targetValue,
        percentage
    };
};

/**
 * 格式化目标值显示
 */
export const formatGoalValue = (value: number, metric: Goal['metric']): string => {
    switch (metric) {
        case 'duration_raw':
        case 'duration_weighted':
        case 'duration_limit':
            // 时长：转换为小时
            const hours = Math.floor(value / 3600);
            const mins = Math.floor((value % 3600) / 60);
            return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        case 'frequency_days':
            return `${Math.floor(value)}天`;

        case 'task_count':
            return `${Math.floor(value)}个`;

        default:
            return `${value}`;
    }
};

/**
 * 获取目标类型的中文名称
 */
export const getGoalMetricLabel = (metric: Goal['metric']): string => {
    switch (metric) {
        case 'duration_raw':
            return '投入时长';
        case 'duration_weighted':
            return '有效时长';
        case 'frequency_days':
            return '活跃天数';
        case 'task_count':
            return '完成任务';
        case 'duration_limit':
            return '时长上限';
        default:
            return '未知类型';
    }
};

/**
 * 获取目标类型的提示文本
 */
export const getGoalMetricHint = (metric: Goal['metric']): string => {
    switch (metric) {
        case 'duration_raw':
            return '设置累计投入时间目标（小时）';
        case 'duration_weighted':
            return '设置有效时长目标（考虑专注度，小时）';
        case 'frequency_days':
            return '设置活跃天数目标（天）';
        case 'task_count':
            return '设置完成待办数量目标（个）';
        case 'duration_limit':
            return '设置时长上限（不超过，小时）';
        default:
            return '设置目标阈值';
    }
};
