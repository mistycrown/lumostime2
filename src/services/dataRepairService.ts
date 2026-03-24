/**
 * @file dataRepairService.ts
 * @input Categories, scopes, and todo categories with corrupted icon data
 * @output Repaired data with correct icon/uiIcon separation
 * @pos Service (Data Migration)
 * @description Repairs icon field corruption by moving ui-style icon values back into uiIcon while restoring emoji icons into icon.
 */
import { dataRepository } from '../repositories/dataRepository';
import { Category, Scope, TodoCategory } from '../types';
import { uiIconService } from './uiIconService';

class DataRepairService {
  private readonly REPAIR_KEY = 'lumostime_data_repair_v1_done';

  isRepaired(): boolean {
    return localStorage.getItem(this.REPAIR_KEY) === 'true';
  }

  markRepaired(): void {
    localStorage.setItem(this.REPAIR_KEY, 'true');
  }

  private repairIcon(icon: string, uiIcon?: string): { icon: string; uiIcon?: string } {
    if (!icon.startsWith('ui:') && !uiIcon) {
      return { icon, uiIcon: undefined };
    }

    if (!icon.startsWith('ui:') && uiIcon) {
      return { icon, uiIcon };
    }

    if (icon.startsWith('ui:') && !uiIcon) {
      return {
        icon: uiIconService.convertUIIconToEmoji(icon),
        uiIcon: icon
      };
    }

    if (icon.startsWith('ui:') && uiIcon) {
      return {
        icon: uiIconService.convertUIIconToEmoji(uiIcon),
        uiIcon
      };
    }

    return { icon, uiIcon };
  }

  repairCategories(categories: Category[]): Category[] {
    return categories.map((category) => {
      const { icon, uiIcon } = this.repairIcon(category.icon, category.uiIcon);
      return {
        ...category,
        icon,
        uiIcon,
        activities: category.activities.map((activity) => {
          const repaired = this.repairIcon(activity.icon, activity.uiIcon);
          return {
            ...activity,
            icon: repaired.icon,
            uiIcon: repaired.uiIcon
          };
        })
      };
    });
  }

  repairScopes(scopes: Scope[]): Scope[] {
    return scopes.map((scope) => {
      const { icon, uiIcon } = this.repairIcon(scope.icon, scope.uiIcon);
      return {
        ...scope,
        icon,
        uiIcon
      };
    });
  }

  repairTodoCategories(todoCategories: TodoCategory[]): TodoCategory[] {
    return todoCategories.map((category) => {
      const { icon, uiIcon } = this.repairIcon(category.icon, category.uiIcon);
      return {
        ...category,
        icon,
        uiIcon
      };
    });
  }

  async repairAll(): Promise<{
    success: boolean;
    message: string;
    repairedCount: number;
  }> {
    try {
      if (this.isRepaired()) {
        return {
          success: true,
          message: '数据已经修复过了',
          repairedCount: 0
        };
      }

      let repairedCount = 0;
      const categoryScopeSnapshot = await dataRepository.loadCategoryScopeSnapshot();
      const dataSnapshot = await dataRepository.loadDataContextSnapshot();

      if (categoryScopeSnapshot.categories.length) {
        const repairedCategories = this.repairCategories(categoryScopeSnapshot.categories);
        await dataRepository.saveCategories(repairedCategories);

        categoryScopeSnapshot.categories.forEach((category) => {
          if (category.icon.startsWith('ui:')) {
            repairedCount += 1;
          }
          category.activities.forEach((activity) => {
            if (activity.icon.startsWith('ui:')) {
              repairedCount += 1;
            }
          });
        });
      }

      if (categoryScopeSnapshot.scopes.length) {
        const repairedScopes = this.repairScopes(categoryScopeSnapshot.scopes);
        await dataRepository.saveScopes(repairedScopes);

        categoryScopeSnapshot.scopes.forEach((scope) => {
          if (scope.icon.startsWith('ui:')) {
            repairedCount += 1;
          }
        });
      }

      if (dataSnapshot.todoCategories.length) {
        const repairedTodoCategories = this.repairTodoCategories(dataSnapshot.todoCategories);
        await dataRepository.saveTodoCategories(repairedTodoCategories);

        dataSnapshot.todoCategories.forEach((category) => {
          if (category.icon.startsWith('ui:')) {
            repairedCount += 1;
          }
        });
      }

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
