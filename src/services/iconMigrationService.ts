/**
 * @file iconMigrationService.ts
 * @description 图标迁移服务 - 在启用自定义图标主题时，自动将默认 Emoji 替换为 UI 图标类型
 */

import { Category, Scope, TodoCategory } from '../types';
import { uiIconService } from './uiIconService';

/**
 * 图标迁移服务类
 */
class IconMigrationService {
    private readonly MIGRATION_KEY = 'lumostime_icon_migration_done';

    /**
     * 检查是否已经完成迁移
     */
    isMigrationDone(): boolean {
        return localStorage.getItem(this.MIGRATION_KEY) === 'true';
    }

    /**
     * 标记迁移已完成
     */
    markMigrationDone(): void {
        localStorage.setItem(this.MIGRATION_KEY, 'true');
    }

    /**
     * 重置迁移状态（用于测试）
     */
    resetMigration(): void {
        localStorage.removeItem(this.MIGRATION_KEY);
    }

    /**
     * 迁移分类数据
     * @param categories 分类数组
     * @returns 迁移后的分类数组
     */
    migrateCategories(categories: Category[]): Category[] {
        return categories.map(category => ({
            ...category,
            icon: this.migrateIcon(category.icon),
            activities: category.activities.map(activity => ({
                ...activity,
                icon: this.migrateIcon(activity.icon)
            }))
        }));
    }

    /**
     * 迁移领域数据
     * @param scopes 领域数组
     * @returns 迁移后的领域数组
     */
    migrateScopes(scopes: Scope[]): Scope[] {
        return scopes.map(scope => ({
            ...scope,
            icon: this.migrateIcon(scope.icon)
        }));
    }

    /**
     * 迁移待办分类数据
     * @param todoCategories 待办分类数组
     * @returns 迁移后的待办分类数组
     */
    migrateTodoCategories(todoCategories: TodoCategory[]): TodoCategory[] {
        return todoCategories.map(category => ({
            ...category,
            icon: this.migrateIcon(category.icon)
        }));
    }

    /**
     * 迁移单个图标
     * @param iconStr 图标字符串
     * @returns 迁移后的图标字符串
     */
    private migrateIcon(iconStr: string): string {
        // 如果已经是 UI 图标格式，不需要迁移
        if (iconStr.startsWith('ui:')) {
            return iconStr;
        }

        // 如果是默认 Emoji，转换为 UI 图标格式
        if (uiIconService.isDefaultEmoji(iconStr)) {
            const converted = uiIconService.convertEmojiToUIIcon(iconStr);
            console.log(`[IconMigration] 迁移图标: ${iconStr} -> ${converted}`);
            return converted;
        }

        // 用户自定义的 Emoji，保持不变
        return iconStr;
    }

    /**
     * 执行完整迁移
     * @param data 包含所有需要迁移的数据
     * @returns 迁移后的数据
     */
    migrateAll(data: {
        categories: Category[];
        scopes: Scope[];
        todoCategories: TodoCategory[];
    }): {
        categories: Category[];
        scopes: Scope[];
        todoCategories: TodoCategory[];
        migrated: boolean;
    } {
        // 如果已经迁移过，直接返回原数据
        if (this.isMigrationDone()) {
            console.log('[IconMigration] 迁移已完成，跳过');
            return { ...data, migrated: false };
        }

        console.log('[IconMigration] 开始迁移图标数据...');

        const migratedData = {
            categories: this.migrateCategories(data.categories),
            scopes: this.migrateScopes(data.scopes),
            todoCategories: this.migrateTodoCategories(data.todoCategories),
            migrated: true
        };

        // 标记迁移完成
        this.markMigrationDone();
        console.log('[IconMigration] 迁移完成');

        return migratedData;
    }
}

// 导出单例
export const iconMigrationService = new IconMigrationService();
