/**
 * @file resetDataTool.ts
 * @input Browser console commands
 * @output Data reset operations, Migration flag clearing
 * @pos Utility (Development Tool)
 * @description 控制台数据重置工具 - 用于在浏览器控制台中重置数据为默认值
 * 
 * 使用方法：
 * 在浏览器控制台中执行：
 * 
 * 1. 重置所有数据（categories + scopes + todoCategories）：
 *    window.resetAllData()
 * 
 * 2. 只重置 categories：
 *    window.resetCategories()
 * 
 * 3. 只重置 scopes：
 *    window.resetScopes()
 * 
 * 4. 只重置 todoCategories：
 *    window.resetTodoCategories()
 * 
 * 5. 清除迁移标记（用于测试首次迁移）：
 *    window.clearMigrationFlags()
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { CATEGORIES, SCOPES, MOCK_TODO_CATEGORIES } from '../constants';

class ResetDataTool {
    /**
     * 重置 Categories 为默认值
     */
    resetCategories(): void {
        console.log('[ResetDataTool] 重置 Categories...');
        console.log('[ResetDataTool] 默认数据:', CATEGORIES);
        
        localStorage.setItem('lumostime_categories', JSON.stringify(CATEGORIES));
        
        console.log('[ResetDataTool] ✅ Categories 已重置为默认值');
        console.log('[ResetDataTool] 请刷新页面查看效果');
    }

    /**
     * 重置 Scopes 为默认值
     */
    resetScopes(): void {
        console.log('[ResetDataTool] 重置 Scopes...');
        console.log('[ResetDataTool] 默认数据:', SCOPES);
        
        localStorage.setItem('lumostime_scopes', JSON.stringify(SCOPES));
        
        console.log('[ResetDataTool] ✅ Scopes 已重置为默认值');
        console.log('[ResetDataTool] 请刷新页面查看效果');
    }

    /**
     * 重置 TodoCategories 为默认值
     */
    resetTodoCategories(): void {
        console.log('[ResetDataTool] 重置 TodoCategories...');
        console.log('[ResetDataTool] 默认数据:', MOCK_TODO_CATEGORIES);
        
        localStorage.setItem('lumostime_todoCategories', JSON.stringify(MOCK_TODO_CATEGORIES));
        
        console.log('[ResetDataTool] ✅ TodoCategories 已重置为默认值');
        console.log('[ResetDataTool] 请刷新页面查看效果');
    }

    /**
     * 重置所有数据为默认值
     */
    resetAllData(): void {
        console.log('[ResetDataTool] ========== 开始重置所有数据 ==========');
        
        this.resetCategories();
        this.resetScopes();
        this.resetTodoCategories();
        
        console.log('[ResetDataTool] ========== 所有数据已重置 ==========');
        console.log('[ResetDataTool] 请刷新页面查看效果');
    }

    /**
     * 清除所有迁移标记（用于测试）
     */
    clearMigrationFlags(): void {
        console.log('[ResetDataTool] 清除迁移标记...');
        
        const flags = [
            'lumostime_uiicon_generated',
            'lumostime_data_repair_v1_done',
            'lumostime_dual_icon_migration_done'
        ];
        
        flags.forEach(flag => {
            const value = localStorage.getItem(flag);
            if (value) {
                localStorage.removeItem(flag);
                console.log(`[ResetDataTool] ✅ 已清除: ${flag} (原值: ${value})`);
            } else {
                console.log(`[ResetDataTool] ⚪ 不存在: ${flag}`);
            }
        });
        
        console.log('[ResetDataTool] ✅ 迁移标记已清除');
    }

    /**
     * 查看当前数据状态
     */
    inspectData(): void {
        console.log('[ResetDataTool] ========== 当前数据状态 ==========');
        
        // Categories
        const categoriesStr = localStorage.getItem('lumostime_categories');
        if (categoriesStr) {
            const categories = JSON.parse(categoriesStr);
            console.log('[Categories] 数量:', categories.length);
            console.log('[Categories] 第一个:', categories[0]);
            console.log('[Categories] 第一个 activity:', categories[0]?.activities?.[0]);
        } else {
            console.log('[Categories] ❌ 不存在');
        }
        
        // Scopes
        const scopesStr = localStorage.getItem('lumostime_scopes');
        if (scopesStr) {
            const scopes = JSON.parse(scopesStr);
            console.log('[Scopes] 数量:', scopes.length);
            console.log('[Scopes] 第一个:', scopes[0]);
        } else {
            console.log('[Scopes] ❌ 不存在');
        }
        
        // TodoCategories
        const todoCategoriesStr = localStorage.getItem('lumostime_todoCategories');
        if (todoCategoriesStr) {
            const todoCategories = JSON.parse(todoCategoriesStr);
            console.log('[TodoCategories] 数量:', todoCategories.length);
            console.log('[TodoCategories] 第一个:', todoCategories[0]);
        } else {
            console.log('[TodoCategories] ❌ 不存在');
        }
        
        // 迁移标记
        console.log('\n[迁移标记]');
        console.log('- uiicon_generated:', localStorage.getItem('lumostime_uiicon_generated'));
        console.log('- data_repair_v1_done:', localStorage.getItem('lumostime_data_repair_v1_done'));
        console.log('- dual_icon_migration_done:', localStorage.getItem('lumostime_dual_icon_migration_done'));
        
        // 当前主题
        console.log('\n[当前主题]');
        console.log('- UI 主题:', localStorage.getItem('lumostime_ui_icon_theme'));
        console.log('- 配色方案:', localStorage.getItem('lumostime_color_scheme'));
        console.log('- 当前方案:', localStorage.getItem('lumostime_current_preset'));
        
        console.log('[ResetDataTool] ========================================');
    }

    /**
     * 显示帮助信息
     */
    help(): void {
        console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    LumosTime 数据重置工具                        ║
╚════════════════════════════════════════════════════════════════╝

📋 可用命令：

1. 重置所有数据（categories + scopes + todoCategories）：
   window.resetAllData()

2. 只重置 categories：
   window.resetCategories()

3. 只重置 scopes：
   window.resetScopes()

4. 只重置 todoCategories：
   window.resetTodoCategories()

5. 清除迁移标记（用于测试首次迁移）：
   window.clearMigrationFlags()

6. 查看当前数据状态：
   window.inspectData()

7. 显示帮助信息：
   window.resetDataHelp()

8. 🆕 强制生成 uiIcon（用于调试）：
   window.forceGenerateUiIcons()

⚠️  注意：重置后需要刷新页面才能看到效果！

💡 推荐流程：
   1. window.inspectData()      // 查看当前状态
   2. window.resetAllData()     // 重置所有数据
   3. window.clearMigrationFlags()  // 清除迁移标记
   4. 刷新页面
   5. 从默认主题切换到自定义主题（首次生成 uiIcon）
        `);
    }

    /**
     * 强制生成 uiIcon（用于调试）
     */
    async forceGenerateUiIcons(): Promise<void> {
        console.log('[ResetDataTool] ========== 强制生成 uiIcon ==========');
        
        try {
            // 清除迁移标记
            localStorage.removeItem('lumostime_uiicon_generated');
            console.log('[ResetDataTool] ✅ 已清除迁移标记');
            
            // 动态导入 iconMigrationService
            const { iconMigrationService } = await import('../services/iconMigrationService');
            
            // 执行生成
            console.log('[ResetDataTool] 开始生成 uiIcon...');
            const result = await iconMigrationService.generateAllUiIcons();
            
            console.log('[ResetDataTool] 生成结果:', result);
            
            if (result.success) {
                console.log(`[ResetDataTool] ✅ ${result.message}`);
                console.log(`[ResetDataTool] 已匹配: ${result.generatedCount} 个`);
                console.log(`[ResetDataTool] 未匹配: ${result.unmatchedCount} 个`);
                
                // 查看生成后的数据
                const categories = JSON.parse(localStorage.getItem('lumostime_categories') || '[]');
                console.log('[ResetDataTool] 第一个 category:', categories[0]);
                console.log('[ResetDataTool] 第一个 activity:', categories[0]?.activities?.[0]);
                
                console.log('[ResetDataTool] 请刷新页面查看效果');
            } else {
                console.error('[ResetDataTool] ❌ 生成失败:', result.message);
            }
        } catch (error) {
            console.error('[ResetDataTool] ❌ 生成异常:', error);
        }
        
        console.log('[ResetDataTool] ========================================');
    }

    /**
     * 测试 emoji 匹配（用于调试）
     */
    async testEmojiMatching(): Promise<void> {
        console.log('[ResetDataTool] ========== 测试 Emoji 匹配 ==========');
        
        try {
            // 动态导入
            const { uiIconService } = await import('../services/uiIconService');
            const { CATEGORIES, SCOPES, MOCK_TODO_CATEGORIES } = await import('../constants');
            
            let totalCount = 0;
            let matchedCount = 0;
            let unmatchedEmojis: string[] = [];
            
            // 测试 Categories
            console.log('\n[Categories]');
            CATEGORIES.forEach(cat => {
                totalCount++;
                const matched = uiIconService.isDefaultEmoji(cat.icon);
                if (matched) {
                    matchedCount++;
                    const uiIcon = uiIconService.convertEmojiToUIIcon(cat.icon);
                    console.log(`✅ ${cat.icon} ${cat.name} -> ${uiIcon}`);
                } else {
                    unmatchedEmojis.push(`${cat.icon} (${cat.name})`);
                    console.log(`❌ ${cat.icon} ${cat.name} -> 无匹配`);
                }
                
                // 测试 Activities
                cat.activities.forEach(act => {
                    totalCount++;
                    const actMatched = uiIconService.isDefaultEmoji(act.icon);
                    if (actMatched) {
                        matchedCount++;
                        const uiIcon = uiIconService.convertEmojiToUIIcon(act.icon);
                        console.log(`  ✅ ${act.icon} ${act.name} -> ${uiIcon}`);
                    } else {
                        unmatchedEmojis.push(`${act.icon} (${act.name})`);
                        console.log(`  ❌ ${act.icon} ${act.name} -> 无匹配`);
                    }
                });
            });
            
            // 测试 Scopes
            console.log('\n[Scopes]');
            SCOPES.forEach(scope => {
                totalCount++;
                const matched = uiIconService.isDefaultEmoji(scope.icon);
                if (matched) {
                    matchedCount++;
                    const uiIcon = uiIconService.convertEmojiToUIIcon(scope.icon);
                    console.log(`✅ ${scope.icon} ${scope.name} -> ${uiIcon}`);
                } else {
                    unmatchedEmojis.push(`${scope.icon} (${scope.name})`);
                    console.log(`❌ ${scope.icon} ${scope.name} -> 无匹配`);
                }
            });
            
            // 测试 TodoCategories
            console.log('\n[TodoCategories]');
            MOCK_TODO_CATEGORIES.forEach(cat => {
                totalCount++;
                const matched = uiIconService.isDefaultEmoji(cat.icon);
                if (matched) {
                    matchedCount++;
                    const uiIcon = uiIconService.convertEmojiToUIIcon(cat.icon);
                    console.log(`✅ ${cat.icon} ${cat.name} -> ${uiIcon}`);
                } else {
                    unmatchedEmojis.push(`${cat.icon} (${cat.name})`);
                    console.log(`❌ ${cat.icon} ${cat.name} -> 无匹配`);
                }
            });
            
            // 总结
            console.log('\n[总结]');
            console.log(`总计: ${totalCount} 个`);
            console.log(`已匹配: ${matchedCount} 个 (${(matchedCount/totalCount*100).toFixed(1)}%)`);
            console.log(`未匹配: ${unmatchedEmojis.length} 个 (${(unmatchedEmojis.length/totalCount*100).toFixed(1)}%)`);
            
            if (unmatchedEmojis.length > 0) {
                console.log('\n[未匹配的 Emoji]');
                unmatchedEmojis.forEach(emoji => console.log(`  - ${emoji}`));
            }
            
        } catch (error) {
            console.error('[ResetDataTool] ❌ 测试异常:', error);
        }
        
        console.log('[ResetDataTool] ========================================');
    }
}

// 创建单例
const resetDataTool = new ResetDataTool();

// 挂载到 window 对象
declare global {
    interface Window {
        resetAllData: () => void;
        resetCategories: () => void;
        resetScopes: () => void;
        resetTodoCategories: () => void;
        clearMigrationFlags: () => void;
        inspectData: () => void;
        resetDataHelp: () => void;
        forceGenerateUiIcons: () => void;
        testEmojiMatching: () => void;
    }
}

// 导出初始化函数
export function initResetDataTool(): void {
    window.resetAllData = () => resetDataTool.resetAllData();
    window.resetCategories = () => resetDataTool.resetCategories();
    window.resetScopes = () => resetDataTool.resetScopes();
    window.resetTodoCategories = () => resetDataTool.resetTodoCategories();
    window.clearMigrationFlags = () => resetDataTool.clearMigrationFlags();
    window.inspectData = () => resetDataTool.inspectData();
    window.resetDataHelp = () => resetDataTool.help();
    window.forceGenerateUiIcons = () => resetDataTool.forceGenerateUiIcons();
    window.testEmojiMatching = () => resetDataTool.testEmojiMatching();
    
    console.log('[ResetDataTool] ✅ 数据重置工具已加载');
    console.log('[ResetDataTool] 💡 输入 window.resetDataHelp() 查看帮助');
    console.log('[ResetDataTool] 🧪 输入 window.testEmojiMatching() 测试 emoji 匹配');
}

export default resetDataTool;
