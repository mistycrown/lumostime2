/**
 * @file useIconMigration.ts
 * @description 图标迁移 Hook - 在启用自定义图标主题时自动迁移数据
 */

import { useEffect, useRef } from 'react';
import { Category, Scope, TodoCategory } from '../types';
import { iconMigrationService } from '../services/iconMigrationService';
import { uiIconService } from '../services/uiIconService';

interface UseIconMigrationProps {
    uiIconTheme: string;
    categories: Category[];
    scopes: Scope[];
    todoCategories: TodoCategory[];
    onCategoriesUpdate: (categories: Category[]) => void;
    onScopesUpdate: (scopes: Scope[]) => void;
    onTodoCategoriesUpdate: (todoCategories: TodoCategory[]) => void;
}

/**
 * 图标迁移 Hook
 * 
 * 当用户首次启用自定义图标主题时，自动将默认 Emoji 替换为 UI 图标类型
 * 
 * 使用示例：
 * ```tsx
 * useIconMigration({
 *   uiIconTheme,
 *   categories,
 *   scopes,
 *   todoCategories,
 *   onCategoriesUpdate: setCategories,
 *   onScopesUpdate: setScopes,
 *   onTodoCategoriesUpdate: setTodoCategories
 * });
 * ```
 */
export const useIconMigration = ({
    uiIconTheme,
    categories,
    scopes,
    todoCategories,
    onCategoriesUpdate,
    onScopesUpdate,
    onTodoCategoriesUpdate
}: UseIconMigrationProps) => {
    const previousTheme = useRef<string>(uiIconTheme);
    const migrationTriggered = useRef<boolean>(false);

    useEffect(() => {
        // 只在主题从 default 切换到其他主题时触发迁移
        const isThemeChanged = previousTheme.current !== uiIconTheme;
        const isEnablingCustomTheme = previousTheme.current === 'default' && uiIconTheme !== 'default';
        
        if (isThemeChanged && isEnablingCustomTheme && !migrationTriggered.current) {
            console.log('[useIconMigration] 检测到启用自定义主题，开始迁移...');
            
            // 执行迁移
            const result = iconMigrationService.migrateAll({
                categories,
                scopes,
                todoCategories
            });

            if (result.migrated) {
                console.log('[useIconMigration] 迁移完成，更新数据...');
                
                // 更新数据
                onCategoriesUpdate(result.categories);
                onScopesUpdate(result.scopes);
                onTodoCategoriesUpdate(result.todoCategories);
                
                migrationTriggered.current = true;
            }
        }

        // 更新上一次的主题
        previousTheme.current = uiIconTheme;
    }, [uiIconTheme, categories, scopes, todoCategories, onCategoriesUpdate, onScopesUpdate, onTodoCategoriesUpdate]);
};

/**
 * 手动触发迁移（用于测试或重置）
 */
export const triggerManualMigration = (data: {
    categories: Category[];
    scopes: Scope[];
    todoCategories: TodoCategory[];
}) => {
    // 重置迁移状态
    iconMigrationService.resetMigration();
    
    // 执行迁移
    return iconMigrationService.migrateAll(data);
};
