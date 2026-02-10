/**
 * @file dualIconMigrationService.ts
 * @input Categories, Scopes, TodoCategories, CheckTemplates without uiIcon field
 * @output Data with uiIcon field added
 * @pos Service (Data Migration)
 * @description 双图标系统迁移服务 - 为现有数据添加 uiIcon 字段
 * 
 * 核心功能：
 * - 检测是否已完成迁移
 * - 为所有数据实体添加 uiIcon 字段
 * - 使用 ensureUiIconField 工具函数处理
 * - 标记迁移完成状态
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { Category, Scope, TodoCategory, CheckTemplate } from '../types';
import { ensureUiIconField } from '../utils/iconUtils';

class DualIconMigrationService {
  private readonly MIGRATION_KEY = 'lumostime_dual_icon_migrated';

  /**
   * 检查是否已经完成迁移
   */
  isMigrated(): boolean {
    return localStorage.getItem(this.MIGRATION_KEY) === 'true';
  }

  /**
   * 标记迁移完成
   */
  markMigrated(): void {
    localStorage.setItem(this.MIGRATION_KEY, 'true');
  }

  /**
   * 重置迁移状态（用于测试）
   */
  resetMigration(): void {
    localStorage.removeItem(this.MIGRATION_KEY);
  }

  /**
   * 迁移 Categories 数据
   */
  migrateCategories(categories: Category[]): Category[] {
    return categories.map(category => {
      const migratedCategory = ensureUiIconField(category);
      
      // 迁移 activities
      const migratedActivities = category.activities.map(activity =>
        ensureUiIconField(activity)
      );
      
      return {
        ...migratedCategory,
        activities: migratedActivities
      };
    });
  }

  /**
   * 迁移 Scopes 数据
   */
  migrateScopes(scopes: Scope[]): Scope[] {
    return scopes.map(scope => ensureUiIconField(scope));
  }

  /**
   * 迁移 TodoCategories 数据
   */
  migrateTodoCategories(todoCategories: TodoCategory[]): TodoCategory[] {
    return todoCategories.map(category => ensureUiIconField(category));
  }

  /**
   * 迁移 CheckTemplates 数据
   */
  migrateCheckTemplates(checkTemplates: CheckTemplate[]): CheckTemplate[] {
    return checkTemplates.map(template => {
      // 迁移模板本身的图标
      const migratedTemplate = ensureUiIconField(template);
      
      // 迁移模板中的每个 item 的图标
      const migratedItems = template.items.map(item => ensureUiIconField(item));
      
      return {
        ...migratedTemplate,
        items: migratedItems
      };
    });
  }

  /**
   * 执行完整的数据迁移
   */
  async migrateAll(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // 检查是否已经迁移
      if (this.isMigrated()) {
        return {
          success: true,
          message: '数据已经迁移过了'
        };
      }

      // 读取数据
      const categoriesStr = localStorage.getItem('lumostime_categories');
      const scopesStr = localStorage.getItem('lumostime_scopes');
      const todoCategoriesStr = localStorage.getItem('lumostime_todoCategories');
      const checkTemplatesStr = localStorage.getItem('lumostime_checkTemplates');

      let migrated = false;

      // 迁移 categories
      if (categoriesStr) {
        const categories = JSON.parse(categoriesStr) as Category[];
        const migratedCategories = this.migrateCategories(categories);
        localStorage.setItem('lumostime_categories', JSON.stringify(migratedCategories));
        migrated = true;
      }

      // 迁移 scopes
      if (scopesStr) {
        const scopes = JSON.parse(scopesStr) as Scope[];
        const migratedScopes = this.migrateScopes(scopes);
        localStorage.setItem('lumostime_scopes', JSON.stringify(migratedScopes));
        migrated = true;
      }

      // 迁移 todoCategories
      if (todoCategoriesStr) {
        const todoCategories = JSON.parse(todoCategoriesStr) as TodoCategory[];
        const migratedTodoCategories = this.migrateTodoCategories(todoCategories);
        localStorage.setItem('lumostime_todoCategories', JSON.stringify(migratedTodoCategories));
        migrated = true;
      }

      // 迁移 checkTemplates
      if (checkTemplatesStr) {
        const checkTemplates = JSON.parse(checkTemplatesStr) as CheckTemplate[];
        const migratedCheckTemplates = this.migrateCheckTemplates(checkTemplates);
        localStorage.setItem('lumostime_checkTemplates', JSON.stringify(migratedCheckTemplates));
        migrated = true;
      }

      if (migrated) {
        this.markMigrated();
        return {
          success: true,
          message: '数据迁移成功'
        };
      }

      return {
        success: true,
        message: '没有需要迁移的数据'
      };
    } catch (error) {
      console.error('[DualIconMigrationService] 迁移失败:', error);
      return {
        success: false,
        message: '数据迁移失败: ' + (error as Error).message
      };
    }
  }
}

export const dualIconMigrationService = new DualIconMigrationService();
