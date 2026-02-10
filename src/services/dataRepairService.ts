/**
 * @file dataRepairService.ts
 * @input Categories, Scopes, TodoCategories with corrupted icon data
 * @output Repaired data with correct icon/uiIcon separation
 * @pos Service (Data Migration)
 * @description 数据修复服务 - 修复旧迁移逻辑造成的数据问题
 * 
 * 问题：旧的迁移逻辑将 icon 字段从 emoji 转换为 ui:iconType，导致切换回默认主题时无法显示 emoji
 * 解决：将 ui:iconType 格式的 icon 移动到 uiIcon 字段，并尝试恢复原始 emoji
 * 
 * 修复逻辑：
 * 1. 检测 icon 字段是否为 ui:iconType 格式
 * 2. 将其移动到 uiIcon 字段
 * 3. 通过 uiIconService 反向查找原始 emoji
 * 4. 恢复 icon 字段为 emoji（如果找到）
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { Category, Scope, TodoCategory } from '../types';
import { uiIconService } from './uiIconService';

class DataRepairService {
    private readonly REPAIR_KEY = 'lumostime_data_repair_v1_done';

    /**
     * 检查是否已经完成修复
     */
    isRepaired(): boolean {
        return localStorage.getItem(this.REPAIR_KEY) === 'true';
    }

    /**
     * 标记修复完成
     */
    markRepaired(): void {
        localStorage.setItem(this.REPAIR_KEY, 'true');
    }

    /**
     * 修复单个图标
     * @param icon 当前的 icon 值（可能是 emoji 或 ui:iconType）
     * @param uiIcon 当前的 uiIcon 值
     * @returns 修复后的 { icon, uiIcon }
     */
    private repairIcon(icon: string, uiIcon?: string): { icon: string; uiIcon?: string } {
        // 情况1: icon 是 emoji，uiIcon 不存在 → 正常，不需要修复
        if (!icon.startsWith('ui:') && !uiIcon) {
            return { icon, uiIcon: undefined };
        }

        // 情况2: icon 是 emoji，uiIcon 存在 → 正常，不需要修复
        if (!icon.startsWith('ui:') && uiIcon) {
            return { icon, uiIcon };
        }

        // 情况3: icon 是 ui: 格式，uiIcon 不存在 → 需要修复
        // 这是错误的数据结构，icon 被错误地替换成了 ui: 格式
        if (icon.startsWith('ui:') && !uiIcon) {
            // 尝试转换回 emoji
            const emoji = uiIconService.convertUIIconToEmoji(icon);
            
            return {
                icon: emoji,      // 恢复为 emoji（可能是 ❓ 如果无法转换）
                uiIcon: icon      // 将原来的 ui: 格式保存到 uiIcon
            };
        }

        // 情况4: icon 是 ui: 格式，uiIcon 也存在 → 需要修复
        // icon 应该是 emoji，但被错误地替换了
        if (icon.startsWith('ui:') && uiIcon) {
            // 尝试从 uiIcon 转换回 emoji
            const emoji = uiIconService.convertUIIconToEmoji(uiIcon);
            
            return {
                icon: emoji,      // 恢复为 emoji
                uiIcon: uiIcon    // 保持 uiIcon 不变
            };
        }

        // 默认情况
        return { icon, uiIcon };
    }

    /**
     * 修复 Categories 数据
     */
    repairCategories(categories: Category[]): Category[] {
        return categories.map(category => {
            const { icon, uiIcon } = this.repairIcon(category.icon, category.uiIcon);
            
            return {
                ...category,
                icon,
                uiIcon,
                activities: category.activities.map(activity => {
                    const activityRepair = this.repairIcon(activity.icon, activity.uiIcon);
                    return {
                        ...activity,
                        icon: activityRepair.icon,
                        uiIcon: activityRepair.uiIcon
                    };
                })
            };
        });
    }

    /**
     * 修复 Scopes 数据
     */
    repairScopes(scopes: Scope[]): Scope[] {
        return scopes.map(scope => {
            const { icon, uiIcon } = this.repairIcon(scope.icon, scope.uiIcon);
            return {
                ...scope,
                icon,
                uiIcon
            };
        });
    }

    /**
     * 修复 TodoCategories 数据
     */
    repairTodoCategories(todoCategories: TodoCategory[]): TodoCategory[] {
        return todoCategories.map(category => {
            const { icon, uiIcon } = this.repairIcon(category.icon, category.uiIcon);
            return {
                ...category,
                icon,
                uiIcon
            };
        });
    }

    /**
     * 执行完整的数据修复
     */
    async repairAll(): Promise<{
        success: boolean;
        message: string;
        repairedCount: number;
    }> {
        try {
            // 检查是否已经修复
            if (this.isRepaired()) {
                return {
                    success: true,
                    message: '数据已经修复过了',
                    repairedCount: 0
                };
            }

            let repairedCount = 0;

            // 读取数据
            const categoriesStr = localStorage.getItem('lumostime_categories');
            const scopesStr = localStorage.getItem('lumostime_scopes');
            const todoCategoriesStr = localStorage.getItem('lumostime_todoCategories');

            // 修复 categories
            if (categoriesStr) {
                const categories = JSON.parse(categoriesStr) as Category[];
                const repairedCategories = this.repairCategories(categories);
                localStorage.setItem('lumostime_categories', JSON.stringify(repairedCategories));
                
                // 统计修复数量
                categories.forEach(cat => {
                    if (cat.icon.startsWith('ui:')) repairedCount++;
                    cat.activities.forEach(act => {
                        if (act.icon.startsWith('ui:')) repairedCount++;
                    });
                });
            }

            // 修复 scopes
            if (scopesStr) {
                const scopes = JSON.parse(scopesStr) as Scope[];
                const repairedScopes = this.repairScopes(scopes);
                localStorage.setItem('lumostime_scopes', JSON.stringify(repairedScopes));
                
                scopes.forEach(scope => {
                    if (scope.icon.startsWith('ui:')) repairedCount++;
                });
            }

            // 修复 todoCategories
            if (todoCategoriesStr) {
                const todoCategories = JSON.parse(todoCategoriesStr) as TodoCategory[];
                const repairedTodoCategories = this.repairTodoCategories(todoCategories);
                localStorage.setItem('lumostime_todoCategories', JSON.stringify(repairedTodoCategories));
                
                todoCategories.forEach(cat => {
                    if (cat.icon.startsWith('ui:')) repairedCount++;
                });
            }

            // 标记修复完成
            this.markRepaired();

            return {
                success: true,
                message: `数据修复成功，共修复 ${repairedCount} 个图标`,
                repairedCount
            };
        } catch (error) {
            console.error('[DataRepairService] 修复失败:', error);
            return {
                success: false,
                message: '数据修复失败: ' + (error as Error).message,
                repairedCount: 0
            };
        }
    }
}

export const dataRepairService = new DataRepairService();
