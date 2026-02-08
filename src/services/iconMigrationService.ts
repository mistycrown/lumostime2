/**
 * @file iconMigrationService.ts
 * @description 图标迁移服务 - 首次从默认主题切换到自定义主题时，生成 uiIcon 数据
 * 
 * 核心逻辑：
 * 1. 用户初始只有 emoji 系统（icon 字段）
 * 2. 首次切换到自定义主题时，通过 emoji 匹配生成 uiIcon 字段
 * 3. 之后两套系统共存，切换主题只是切换渲染，不再迁移数据
 */

import { Category, Scope, TodoCategory, CheckTemplate } from '../types';
import { uiIconService } from './uiIconService';

class IconMigrationService {
    private readonly MIGRATION_KEY = 'lumostime_uiicon_generated';

    /**
     * 检查是否已经生成过 uiIcon
     */
    isUiIconGenerated(): boolean {
        return localStorage.getItem(this.MIGRATION_KEY) === 'true';
    }

    /**
     * 标记 uiIcon 已生成
     */
    markUiIconGenerated(): void {
        localStorage.setItem(this.MIGRATION_KEY, 'true');
    }

    /**
     * 为单个 emoji 生成对应的 uiIcon
     * @param emoji emoji 字符
     * @returns UI 图标 ID 或 undefined（如果无法匹配）
     */
    private generateUiIcon(emoji: string): string | undefined {
        // 如果已经是 ui: 格式，直接返回
        if (emoji.startsWith('ui:')) {
            return emoji;
        }

        // 尝试通过 emoji 匹配 UI 图标
        if (uiIconService.isDefaultEmoji(emoji)) {
            const uiIcon = uiIconService.convertEmojiToUIIcon(emoji);
            console.log(`[IconMigration] 生成 UI 图标: ${emoji} -> ${uiIcon}`);
            return uiIcon;
        }

        // 无法匹配，返回 undefined（用户需要手动设置）
        console.log(`[IconMigration] 无法匹配 UI 图标: ${emoji}（需要用户手动设置）`);
        return undefined;
    }

    /**
     * 为 Categories 生成 uiIcon
     */
    generateUiIconsForCategories(categories: Category[]): Category[] {
        return categories.map(category => ({
            ...category,
            // 只在没有 uiIcon 时生成
            uiIcon: category.uiIcon || this.generateUiIcon(category.icon),
            activities: category.activities.map(activity => ({
                ...activity,
                // 只在没有 uiIcon 时生成
                uiIcon: activity.uiIcon || this.generateUiIcon(activity.icon)
            }))
        }));
    }

    /**
     * 为 Scopes 生成 uiIcon
     */
    generateUiIconsForScopes(scopes: Scope[]): Scope[] {
        return scopes.map(scope => ({
            ...scope,
            // 只在没有 uiIcon 时生成
            uiIcon: scope.uiIcon || this.generateUiIcon(scope.icon)
        }));
    }

    /**
     * 为 TodoCategories 生成 uiIcon
     */
    generateUiIconsForTodoCategories(todoCategories: TodoCategory[]): TodoCategory[] {
        return todoCategories.map(category => ({
            ...category,
            // 只在没有 uiIcon 时生成
            uiIcon: category.uiIcon || this.generateUiIcon(category.icon)
        }));
    }

    /**
     * 为 CheckTemplates 生成 uiIcon
     */
    generateUiIconsForCheckTemplates(checkTemplates: CheckTemplate[]): CheckTemplate[] {
        return checkTemplates.map(template => ({
            ...template,
            // 为模板本身生成 uiIcon
            uiIcon: template.uiIcon || (template.icon ? this.generateUiIcon(template.icon) : undefined),
            // 为模板中的每个 item 生成 uiIcon
            items: template.items.map(item => ({
                ...item,
                uiIcon: item.uiIcon || (item.icon ? this.generateUiIcon(item.icon) : undefined)
            }))
        }));
    }

    /**
     * 执行首次迁移：为所有 emoji 生成对应的 uiIcon
     */
    async generateAllUiIcons(): Promise<{
        success: boolean;
        message: string;
        generatedCount: number;
        unmatchedCount: number;
    }> {
        try {
            // 检查是否已经生成过
            if (this.isUiIconGenerated()) {
                return {
                    success: true,
                    message: 'UI 图标已经生成过了',
                    generatedCount: 0,
                    unmatchedCount: 0
                };
            }

            let generatedCount = 0;
            let unmatchedCount = 0;

            // 读取数据
            const categoriesStr = localStorage.getItem('lumostime_categories');
            const scopesStr = localStorage.getItem('lumostime_scopes');
            const todoCategoriesStr = localStorage.getItem('lumostime_todoCategories');
            const checkTemplatesStr = localStorage.getItem('lumostime_checkTemplates');

            // 生成 categories 的 uiIcon
            if (categoriesStr) {
                const categories = JSON.parse(categoriesStr) as Category[];
                const updated = this.generateUiIconsForCategories(categories);
                localStorage.setItem('lumostime_categories', JSON.stringify(updated));
                
                // 统计
                updated.forEach(cat => {
                    if (cat.uiIcon) generatedCount++; else unmatchedCount++;
                    cat.activities.forEach(act => {
                        if (act.uiIcon) generatedCount++; else unmatchedCount++;
                    });
                });
            }

            // 生成 scopes 的 uiIcon
            if (scopesStr) {
                const scopes = JSON.parse(scopesStr) as Scope[];
                const updated = this.generateUiIconsForScopes(scopes);
                localStorage.setItem('lumostime_scopes', JSON.stringify(updated));
                
                updated.forEach(scope => {
                    if (scope.uiIcon) generatedCount++; else unmatchedCount++;
                });
            }

            // 生成 todoCategories 的 uiIcon
            if (todoCategoriesStr) {
                const todoCategories = JSON.parse(todoCategoriesStr) as TodoCategory[];
                const updated = this.generateUiIconsForTodoCategories(todoCategories);
                localStorage.setItem('lumostime_todoCategories', JSON.stringify(updated));
                
                updated.forEach(cat => {
                    if (cat.uiIcon) generatedCount++; else unmatchedCount++;
                });
            }

            // 生成 checkTemplates 的 uiIcon
            if (checkTemplatesStr) {
                const checkTemplates = JSON.parse(checkTemplatesStr) as CheckTemplate[];
                const updated = this.generateUiIconsForCheckTemplates(checkTemplates);
                localStorage.setItem('lumostime_checkTemplates', JSON.stringify(updated));
                
                updated.forEach(template => {
                    if (template.uiIcon) generatedCount++; else unmatchedCount++;
                    template.items.forEach(item => {
                        if (item.uiIcon) generatedCount++; else unmatchedCount++;
                    });
                });
            }

            // 标记已生成
            this.markUiIconGenerated();

            let message = `UI 图标生成完成：${generatedCount} 个已匹配`;
            if (unmatchedCount > 0) {
                message += `，${unmatchedCount} 个需要手动设置`;
            }

            return {
                success: true,
                message,
                generatedCount,
                unmatchedCount
            };
        } catch (error) {
            console.error('[IconMigrationService] 生成失败:', error);
            return {
                success: false,
                message: '生成失败: ' + (error as Error).message,
                generatedCount: 0,
                unmatchedCount: 0
            };
        }
    }
}

export const iconMigrationService = new IconMigrationService();
