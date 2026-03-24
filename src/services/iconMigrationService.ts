/**
 * @file iconMigrationService.ts
 * @input Categories, scopes, todo categories, and check templates with emoji icons
 * @output Data with generated uiIcon fields based on emoji matching
 * @pos Service (Data Migration)
 * @description Generates uiIcon fields for legacy emoji-based data the first time custom icon themes are introduced.
 */
import { REVIEW_KEYS, storage } from '../constants/storageKeys';
import { dataRepository } from '../repositories/dataRepository';
import { Category, CheckTemplate, Scope, TodoCategory } from '../types';
import { uiIconService } from './uiIconService';

class IconMigrationService {
  private readonly MIGRATION_KEY = 'lumostime_uiicon_generated';

  isUiIconGenerated(): boolean {
    return localStorage.getItem(this.MIGRATION_KEY) === 'true';
  }

  markUiIconGenerated(): void {
    localStorage.setItem(this.MIGRATION_KEY, 'true');
  }

  private generateUiIcon(emoji: string): string | undefined {
    if (emoji.startsWith('ui:')) {
      return emoji;
    }

    if (uiIconService.isDefaultEmoji(emoji)) {
      return uiIconService.convertEmojiToUIIcon(emoji);
    }

    return undefined;
  }

  generateUiIconsForCategories(categories: Category[]): Category[] {
    return categories.map((category) => ({
      ...category,
      uiIcon: category.uiIcon || this.generateUiIcon(category.icon),
      activities: category.activities.map((activity) => ({
        ...activity,
        uiIcon: activity.uiIcon || this.generateUiIcon(activity.icon)
      }))
    }));
  }

  generateUiIconsForScopes(scopes: Scope[]): Scope[] {
    return scopes.map((scope) => ({
      ...scope,
      uiIcon: scope.uiIcon || this.generateUiIcon(scope.icon)
    }));
  }

  generateUiIconsForTodoCategories(todoCategories: TodoCategory[]): TodoCategory[] {
    return todoCategories.map((category) => ({
      ...category,
      uiIcon: category.uiIcon || this.generateUiIcon(category.icon)
    }));
  }

  generateUiIconsForCheckTemplates(checkTemplates: CheckTemplate[]): CheckTemplate[] {
    return checkTemplates.map((template) => ({
      ...template,
      uiIcon: template.uiIcon || (template.icon ? this.generateUiIcon(template.icon) : undefined),
      items: template.items.map((item) => ({
        ...item,
        uiIcon: item.uiIcon || (item.icon ? this.generateUiIcon(item.icon) : undefined)
      }))
    }));
  }

  async generateAllUiIcons(): Promise<{
    success: boolean;
    message: string;
    generatedCount: number;
    unmatchedCount: number;
  }> {
    try {
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

      const categoryScopeSnapshot = await dataRepository.loadCategoryScopeSnapshot();
      const dataSnapshot = await dataRepository.loadDataContextSnapshot();
      const checkTemplates = storage.getJSON<CheckTemplate[]>(REVIEW_KEYS.CHECK_TEMPLATES);

      if (categoryScopeSnapshot.categories.length) {
        const updated = this.generateUiIconsForCategories(categoryScopeSnapshot.categories);
        await dataRepository.saveCategories(updated);

        updated.forEach((category) => {
          if (category.uiIcon) {
            generatedCount += 1;
          } else {
            unmatchedCount += 1;
          }

          category.activities.forEach((activity) => {
            if (activity.uiIcon) {
              generatedCount += 1;
            } else {
              unmatchedCount += 1;
            }
          });
        });
      }

      if (categoryScopeSnapshot.scopes.length) {
        const updated = this.generateUiIconsForScopes(categoryScopeSnapshot.scopes);
        await dataRepository.saveScopes(updated);

        updated.forEach((scope) => {
          if (scope.uiIcon) {
            generatedCount += 1;
          } else {
            unmatchedCount += 1;
          }
        });
      }

      if (dataSnapshot.todoCategories.length) {
        const updated = this.generateUiIconsForTodoCategories(dataSnapshot.todoCategories);
        await dataRepository.saveTodoCategories(updated);

        updated.forEach((category) => {
          if (category.uiIcon) {
            generatedCount += 1;
          } else {
            unmatchedCount += 1;
          }
        });
      }

      if (checkTemplates?.length) {
        const updated = this.generateUiIconsForCheckTemplates(checkTemplates);
        storage.setJSON(REVIEW_KEYS.CHECK_TEMPLATES, updated);

        updated.forEach((template) => {
          if (template.uiIcon) {
            generatedCount += 1;
          } else {
            unmatchedCount += 1;
          }

          template.items.forEach((item) => {
            if (item.uiIcon) {
              generatedCount += 1;
            } else {
              unmatchedCount += 1;
            }
          });
        });
      }

      this.markUiIconGenerated();

      let message = `UI 图标生成完成，${generatedCount} 个已匹配`;
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
