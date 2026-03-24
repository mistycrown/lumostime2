/**
 * @file dualIconMigrationService.ts
 * @input Categories, scopes, todo categories, and check templates without uiIcon fields
 * @output Data with uiIcon fields populated
 * @pos Service (Data Migration)
 * @description Adds uiIcon fields to legacy data so emoji and custom icon themes can coexist.
 */
import { dataRepository } from '../repositories/dataRepository';
import { Category, CheckTemplate, Scope, TodoCategory } from '../types';
import { ensureUiIconField } from '../utils/iconUtils';
import { REVIEW_KEYS, storage } from '../constants/storageKeys';

class DualIconMigrationService {
  private readonly MIGRATION_KEY = 'lumostime_dual_icon_migrated';

  isMigrated(): boolean {
    return localStorage.getItem(this.MIGRATION_KEY) === 'true';
  }

  markMigrated(): void {
    localStorage.setItem(this.MIGRATION_KEY, 'true');
  }

  resetMigration(): void {
    localStorage.removeItem(this.MIGRATION_KEY);
  }

  migrateCategories(categories: Category[]): Category[] {
    return categories.map((category) => ({
      ...ensureUiIconField(category),
      activities: category.activities.map((activity) => ensureUiIconField(activity))
    }));
  }

  migrateScopes(scopes: Scope[]): Scope[] {
    return scopes.map((scope) => ensureUiIconField(scope));
  }

  migrateTodoCategories(todoCategories: TodoCategory[]): TodoCategory[] {
    return todoCategories.map((category) => ensureUiIconField(category));
  }

  migrateCheckTemplates(checkTemplates: CheckTemplate[]): CheckTemplate[] {
    return checkTemplates.map((template) => ({
      ...ensureUiIconField(template),
      items: template.items.map((item) => ensureUiIconField(item))
    }));
  }

  async migrateAll(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      if (this.isMigrated()) {
        return {
          success: true,
          message: '数据已经迁移过了'
        };
      }

      let migrated = false;
      const categoryScopeSnapshot = await dataRepository.loadCategoryScopeSnapshot();
      const dataSnapshot = await dataRepository.loadDataContextSnapshot();
      const checkTemplates = storage.getJSON<CheckTemplate[]>(REVIEW_KEYS.CHECK_TEMPLATES);

      if (categoryScopeSnapshot.categories.length) {
        await dataRepository.saveCategories(this.migrateCategories(categoryScopeSnapshot.categories));
        migrated = true;
      }

      if (categoryScopeSnapshot.scopes.length) {
        await dataRepository.saveScopes(this.migrateScopes(categoryScopeSnapshot.scopes));
        migrated = true;
      }

      if (dataSnapshot.todoCategories.length) {
        await dataRepository.saveTodoCategories(this.migrateTodoCategories(dataSnapshot.todoCategories));
        migrated = true;
      }

      if (checkTemplates?.length) {
        storage.setJSON(REVIEW_KEYS.CHECK_TEMPLATES, this.migrateCheckTemplates(checkTemplates));
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
