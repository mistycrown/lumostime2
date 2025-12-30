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
 * - | 符号: 表示OR关系 (同一条件内)
 * - 空格: 表示AND关系 (不同条件间)
 * 
 * @example
 * parseFilterExpression("瑜伽|跑步 #运动 %健康|%工作")
 * // 返回: { tags: [["运动"]], scopes: [["健康", "工作"]], todos: [], notes: [["瑜伽", "跑步"]] }
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

    // 按空格分割表达式
    const parts = expression.trim().split(/\s+/);

    for (const part of parts) {
        if (!part) continue;

        if (part.startsWith('#')) {
            // 标签筛选 - 支持 | 分隔的OR逻辑
            const keywords = part.substring(1).split('|').filter(k => k.trim());
            if (keywords.length > 0) {
                condition.tags.push(keywords);
            }
        } else if (part.startsWith('%')) {
            // 领域筛选 - 支持 | 分隔的OR逻辑
            const keywords = part.substring(1).split('|').filter(k => k.trim());
            if (keywords.length > 0) {
                condition.scopes.push(keywords);
            }
        } else if (part.startsWith('@')) {
            // 代办筛选 - 支持 | 分隔的OR逻辑
            const keywords = part.substring(1).split('|').filter(k => k.trim());
            if (keywords.length > 0) {
                condition.todos.push(keywords);
            }
        } else {
            // 全文备注筛选 - 支持 | 分隔的OR逻辑
            const keywords = part.split('|').filter(k => k.trim());
            if (keywords.length > 0) {
                condition.notes.push(keywords);
            }
        }
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
 * - 同一条件内部 (| 分隔): OR 关系 (满足任一即可)
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
            return tagGroup.some(tag => activityNameLower.includes(tag.toLowerCase()));
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
