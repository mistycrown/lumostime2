/**
 * @file filterUtils.ts
 * @input Filter表达式, Log数据, App上下文数据
 * @output 解析后的筛选条件, 匹配结果, 统计数据
 * @pos Utils (筛选逻辑)
 * @description 自定义筛选器的核心逻辑,包括表达式解析、记录匹配和统计计算
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { Log, Filter, ParsedFilterCondition, Category, Scope, TodoItem, TodoCategory } from '../types';

/**
 * 解析筛选表达式
 * 支持的语法:
 * - #关键词: 匹配标签名称
 * - %关键词: 匹配领域名称
 * - @关键词: 匹配代办标题
 * - 关键词: 匹配备注全文
 * - OR: 逻辑或 (不区分大小写, 用于连接同类型条件)
 * - 空格: 逻辑与 (默认)
 * 
 * 特性:
 * - 前缀继承: "#工作 OR 学习" 等同于 "#工作 OR #学习"
 * - 结合性: OR 的优先级高于空格 (实现为分组逻辑)
 * - 混合: "%健康 瑜伽 OR 冥想" -> (领域包含健康) AND (备注包含瑜伽 OR 冥想)
 * 
 * @example
 * parseFilterExpression("#运动 OR 学习 %健康")
 * // 返回: { tags: [["运动", "学习"]], scopes: [["健康"]], ... }
 */
export function parseFilterExpression(expression: string): ParsedFilterCondition {
    const condition: ParsedFilterCondition = {
        tags: [],
        scopes: [],
        todos: [],
        notes: []
    };

    if (!expression || !expression.trim()) {
        return condition;
    }

    // 1. Tokenize: 按空格分割
    // 处理可能的多余空格
    const tokens = expression.trim().split(/\s+/);

    // 帮助函数: 识别类型并提取内容
    // Returns: { type: 'tags'|'scopes'|'todos'|'notes', content: string }
    const parseToken = (token: string) => {
        if (token.startsWith('#')) return { type: 'tags' as const, content: token.substring(1) };
        if (token.startsWith('%')) return { type: 'scopes' as const, content: token.substring(1) };
        if (token.startsWith('@')) return { type: 'todos' as const, content: token.substring(1) };
        return { type: 'notes' as const, content: token };
    };

    let pendingOR = false;
    let lastType: 'tags' | 'scopes' | 'todos' | 'notes' | null = null;

    for (const token of tokens) {
        if (!token) continue;

        // 检查 OR 关键字 (不区分大小写)
        if (token.toUpperCase() === 'OR') {
            pendingOR = true;
            continue;
        }

        const current = parseToken(token);

        // 确定生效的类型 (处理前缀继承)
        let effectiveType = current.type;

        // 处理 OR 逻辑
        if (pendingOR && lastType) {
            // 前缀继承: 如果当前词无前缀(notes)，且上一个词不是notes，则继承上一个词的类型
            if (current.type === 'notes' && lastType !== 'notes') {
                effectiveType = lastType;
            }

            // 如果类型一致，则合并到上一个分组 (实现 OR 逻辑)
            if (effectiveType === lastType) {
                const groupList = condition[effectiveType];
                if (groupList.length > 0) {
                    const lastGroup = groupList[groupList.length - 1];
                    lastGroup.push(current.content);
                } else {
                    // 理论上不会走到这里，作为防御
                    groupList.push([current.content]);
                }
            } else {
                // 类型不一致，跨类型OR暂不支持，降级为 AND (新分组)
                condition[effectiveType].push([current.content]);
            }
        } else {
            // AND 逻辑: 开启新分组
            condition[effectiveType].push([current.content]);
        }

        // 更新状态
        lastType = effectiveType;
        pendingOR = false; // 重置 OR 标志
    }

    return condition;
}

/**
 * App上下文数据,用于筛选匹配
 */
export interface FilterContext {
    categories: Category[];
    scopes: Scope[];
    todos: TodoItem[];
    todoCategories: TodoCategory[];
}

/**
 * 检查单条 Log 是否匹配筛选条件
 * - 不同条件之间: AND 关系 (所有条件必须满足)
 * - 同一条件内部 (OR 分隔): OR 关系 (满足任一即可)
 * - 每个关键词: 包含匹配 (不区分大小写)
 */
export function matchesFilter(
    log: Log,
    condition: ParsedFilterCondition,
    context: FilterContext
): boolean {
    // 1. 检查标签筛选 (#)
    if (condition.tags.length > 0) {
        const category = context.categories.find(c => c.id === log.categoryId);
        const activity = category?.activities.find(a => a.id === log.activityId);

        if (!activity) return false;

        const activityNameLower = activity.name.toLowerCase();

        // 所有标签条件组都必须满足 (AND)
        const allTagGroupsMatch = condition.tags.every(tagGroup => {
            // 每个条件组内,只要有一个匹配即可 (OR)
            // 修改: 支持匹配 Activity 名称 OR Category 名称
            return tagGroup.some(tag => {
                const lowerTag = tag.toLowerCase();
                const activityMatch = activityNameLower.includes(lowerTag);
                const categoryMatch = category ? category.name.toLowerCase().includes(lowerTag) : false;
                return activityMatch || categoryMatch;
            });
        });

        if (!allTagGroupsMatch) return false;
    }

    // 2. 检查领域筛选 (%)
    if (condition.scopes.length > 0) {
        if (!log.scopeIds || log.scopeIds.length === 0) return false;

        const logScopes = context.scopes.filter(s => log.scopeIds?.includes(s.id));
        const scopeNames = logScopes.map(s => s.name.toLowerCase());

        // 所有领域条件组都必须满足 (AND)
        const allScopeGroupsMatch = condition.scopes.every(scopeGroup => {
            // 每个条件组内,只要有一个匹配即可 (OR)
            return scopeGroup.some(scopeKeyword => {
                return scopeNames.some(scopeName =>
                    scopeName.includes(scopeKeyword.toLowerCase())
                );
            });
        });

        if (!allScopeGroupsMatch) return false;
    }

    // 3. 检查代办筛选 (@)
    if (condition.todos.length > 0) {
        if (!log.linkedTodoId) return false;

        const linkedTodo = context.todos.find(t => t.id === log.linkedTodoId);
        if (!linkedTodo) return false;

        const todoTitleLower = linkedTodo.title.toLowerCase();

        // 所有代办条件组都必须满足 (AND)
        const allTodoGroupsMatch = condition.todos.every(todoGroup => {
            // 每个条件组内,只要有一个匹配即可 (OR)
            return todoGroup.some(todoKeyword =>
                todoTitleLower.includes(todoKeyword.toLowerCase())
            );
        });

        if (!allTodoGroupsMatch) return false;
    }

    // 4. 检查全文备注筛选
    if (condition.notes.length > 0) {
        if (!log.note) return false;

        const noteLower = log.note.toLowerCase();

        // 所有备注条件组都必须满足 (AND)
        const allNoteGroupsMatch = condition.notes.every(noteGroup => {
            // 每个条件组内,只要有一个匹配即可 (OR)
            return noteGroup.some(noteKeyword =>
                noteLower.includes(noteKeyword.toLowerCase())
            );
        });

        if (!allNoteGroupsMatch) return false;
    }

    // 所有条件都满足
    return true;
}

/**
 * 计算筛选器的匹配统计
 * 返回匹配的记录数量和总时长
 */
export function getFilterStats(
    logs: Log[],
    filter: Filter,
    context: FilterContext
): { count: number; totalDuration: number } {
    const condition = parseFilterExpression(filter.filterExpression);

    let count = 0;
    let totalDuration = 0;

    for (const log of logs) {
        if (matchesFilter(log, condition, context)) {
            count++;
            totalDuration += log.duration;
        }
    }

    return { count, totalDuration };
}

/**
 * 获取匹配筛选器的所有记录
 */
export function getFilteredLogs(
    logs: Log[],
    filter: Filter,
    context: FilterContext
): Log[] {
    const condition = parseFilterExpression(filter.filterExpression);
    return logs.filter(log => matchesFilter(log, condition, context));
}
