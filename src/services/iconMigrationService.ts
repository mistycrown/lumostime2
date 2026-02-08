/**
 * @file iconMigrationService.ts
 * @description 图标迁移服务 - 在启用自定义图标主题时，自动将 Emoji 转换为 UI 图标并存储在 uiIcon 字段
 * 
 * 新的设计：
 * - icon 字段：始终保存 emoji（用于默认主题）
 * - uiIcon 字段：保存 UI 图标 ID（用于自定义主题）
 * - 切换主题时不会丢失任何数据
 */

import { Category, Scope, TodoCategory } from '../types';
import { uiIconService } from './uiIconService';

/**
 * 图标迁移服务类
 */
class IconMigrationService {
    /**
     * 迁移分类数据 - 将 emoji 转换为 uiIcon
     * @param categories 分类数组
     * @returns 迁移后的分类数组
     */
    migrateCategories(categories: Category[]): Category[] {
        return categories.map(category => ({
            ...category,
            uiIcon: this.convertEmojiToUiIcon(category.icon),
            activities: category.activities.map(activity => ({
                ...activity,
                uiIcon: this.convertEmojiToUiIcon(activity.icon)
            }))
        }));
    }

    /**
     * 迁移领域数据 - 将 emoji 转换为 uiIcon
     * @param scopes 领域数组
     * @returns 迁移后的领域数组
     */
    migrateScopes(scopes: Scope[]): Scope[] {
        return scopes.map(scope => ({
            ...scope,
            uiIcon: this.convertEmojiToUiIcon(scope.icon)
        }));
    }

    /**
     * 迁移待办分类数据 - 将 emoji 转换为 uiIcon
     * @param todoCategories 待办分类数组
     * @returns 迁移后的待办分类数组
     */
    migrateTodoCategories(todoCategories: TodoCategory[]): TodoCategory[] {
        return todoCategories.map(category => ({
            ...category,
            uiIcon: this.convertEmojiToUiIcon(category.icon)
        }));
    }

    /**
     * 清除 uiIcon 数据（切换回默认主题时）
     * @param categories 分类数组
     * @returns 清除后的分类数组
     */
    clearUiIconsFromCategories(categories: Category[]): Category[] {
        return categories.map(category => ({
            ...category,
            uiIcon: undefined,
            activities: category.activities.map(activity => ({
                ...activity,
                uiIcon: undefined
            }))
        }));
    }

    /**
     * 清除 uiIcon 数据（切换回默认主题时）
     * @param scopes 领域数组
     * @returns 清除后的领域数组
     */
    clearUiIconsFromScopes(scopes: Scope[]): Scope[] {
        return scopes.map(scope => ({
            ...scope,
            uiIcon: undefined
        }));
    }

    /**
     * 清除 uiIcon 数据（切换回默认主题时）
     * @param todoCategories 待办分类数组
     * @returns 清除后的待办分类数组
     */
    clearUiIconsFromTodoCategories(todoCategories: TodoCategory[]): TodoCategory[] {
        return todoCategories.map(category => ({
            ...category,
            uiIcon: undefined
        }));
    }

    /**
     * 将 emoji 转换为 uiIcon
     * @param emoji emoji 字符串
     * @returns UI 图标 ID 或 undefined
     */
    private convertEmojiToUiIcon(emoji: string): string | undefined {
        // 如果是默认 Emoji，转换为 UI 图标格式
        if (uiIconService.isDefaultEmoji(emoji)) {
            const converted = uiIconService.convertEmojiToUIIcon(emoji);
            console.log(`[IconMigration] 转换图标: ${emoji} -> ${converted}`);
            return converted;
        }

        // 用户自定义的 Emoji，返回 undefined（保持使用 emoji）
        console.log(`[IconMigration] 保持自定义 emoji: ${emoji}`);
        return undefined;
    }
}

// 导出单例
export const iconMigrationService = new IconMigrationService();
