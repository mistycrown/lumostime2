/**
 * @file resetDataTool.ts
 * @input Browser console commands
 * @output Data reset operations and migration-flag maintenance for debugging
 * @pos Utility (Development Tool)
 * @description Exposes debug helpers on window so repository-backed data can be reset and inspected without writing stale legacy localStorage payloads.
 */
import { CATEGORIES, MOCK_TODO_CATEGORIES, SCOPES } from '../constants';
import { dataRepository } from '../repositories/dataRepository';
import { uiIconService } from '../services/uiIconService';

class ResetDataTool {
  async resetCategories(): Promise<void> {
    console.log('[ResetDataTool] Resetting categories...');
    console.log('[ResetDataTool] Default data:', CATEGORIES);

    await dataRepository.saveCategories(CATEGORIES);

    console.log('[ResetDataTool] Categories have been reset to defaults.');
    console.log('[ResetDataTool] Refresh the page to verify the result.');
  }

  async resetScopes(): Promise<void> {
    console.log('[ResetDataTool] Resetting scopes...');
    console.log('[ResetDataTool] Default data:', SCOPES);

    await dataRepository.saveScopes(SCOPES);

    console.log('[ResetDataTool] Scopes have been reset to defaults.');
    console.log('[ResetDataTool] Refresh the page to verify the result.');
  }

  async resetTodoCategories(): Promise<void> {
    console.log('[ResetDataTool] Resetting todo categories...');
    console.log('[ResetDataTool] Default data:', MOCK_TODO_CATEGORIES);

    await dataRepository.saveTodoCategories(MOCK_TODO_CATEGORIES);

    console.log('[ResetDataTool] Todo categories have been reset to defaults.');
    console.log('[ResetDataTool] Refresh the page to verify the result.');
  }

  async resetAllData(): Promise<void> {
    console.log('[ResetDataTool] ========== Resetting all supported repository data ==========');

    await this.resetCategories();
    await this.resetScopes();
    await this.resetTodoCategories();

    console.log('[ResetDataTool] ========== Reset complete ==========');
    console.log('[ResetDataTool] Refresh the page to verify the result.');
  }

  clearMigrationFlags(): void {
    console.log('[ResetDataTool] Clearing migration flags...');

    const flags = [
      'lumostime_uiicon_generated',
      'lumostime_data_repair_v1_done',
      'lumostime_dual_icon_migrated'
    ];

    flags.forEach((flag) => {
      const value = localStorage.getItem(flag);
      if (value) {
        localStorage.removeItem(flag);
        console.log(`[ResetDataTool] Cleared ${flag} (previous value: ${value})`);
      } else {
        console.log(`[ResetDataTool] ${flag} does not exist`);
      }
    });

    console.log('[ResetDataTool] Migration flags cleared.');
  }

  async inspectData(): Promise<void> {
    console.log('[ResetDataTool] ========== Current repository-backed data ==========');

    const categoryScopeSnapshot = await dataRepository.loadCategoryScopeSnapshot();
    const dataSnapshot = await dataRepository.loadDataContextSnapshot();

    console.log('[Categories] Count:', categoryScopeSnapshot.categories.length);
    console.log('[Categories] First item:', categoryScopeSnapshot.categories[0]);
    console.log('[Categories] First activity:', categoryScopeSnapshot.categories[0]?.activities?.[0]);

    console.log('[Scopes] Count:', categoryScopeSnapshot.scopes.length);
    console.log('[Scopes] First item:', categoryScopeSnapshot.scopes[0]);

    console.log('[TodoCategories] Count:', dataSnapshot.todoCategories.length);
    console.log('[TodoCategories] First item:', dataSnapshot.todoCategories[0]);

    console.log('\n[Migration Flags]');
    console.log('- uiicon_generated:', localStorage.getItem('lumostime_uiicon_generated'));
    console.log('- data_repair_v1_done:', localStorage.getItem('lumostime_data_repair_v1_done'));
    console.log('- dual_icon_migrated:', localStorage.getItem('lumostime_dual_icon_migrated'));

    console.log('\n[Theme]');
    console.log('- UI theme:', localStorage.getItem('lumostime_ui_icon_theme'));
    console.log('- Color scheme:', localStorage.getItem('lumostime_color_scheme'));
    console.log('- Current preset:', localStorage.getItem('lumostime_current_preset'));

    console.log('[ResetDataTool] ===============================================');
  }

  help(): void {
    console.log(`
LumosTime ResetDataTool

Available commands:
1. window.resetAllData()
2. window.resetCategories()
3. window.resetScopes()
4. window.resetTodoCategories()
5. window.clearMigrationFlags()
6. window.inspectData()
7. window.resetDataHelp()
8. window.forceGenerateUiIcons()
9. window.testEmojiMatching()

Notes:
- These commands now operate on the repository-backed data path.
- Refresh the page after reset operations to verify the UI state.
    `);
  }

  async forceGenerateUiIcons(): Promise<void> {
    console.log('[ResetDataTool] ========== Forcing uiIcon generation ==========');

    try {
      localStorage.removeItem('lumostime_uiicon_generated');
      console.log('[ResetDataTool] Cleared uiIcon migration flag.');

      const { iconMigrationService } = await import('../services/iconMigrationService');
      const result = await iconMigrationService.generateAllUiIcons();

      console.log('[ResetDataTool] Generation result:', result);

      if (result.success) {
        const categories = await dataRepository.getCategories();
        console.log('[ResetDataTool] First category:', categories[0]);
        console.log('[ResetDataTool] First activity:', categories[0]?.activities?.[0]);
        console.log('[ResetDataTool] Refresh the page to verify the result.');
      }
    } catch (error) {
      console.error('[ResetDataTool] uiIcon generation failed:', error);
    }

    console.log('[ResetDataTool] ===============================================');
  }

  async testEmojiMatching(): Promise<void> {
    console.log('[ResetDataTool] ========== Testing emoji matching ==========');

    try {
      let totalCount = 0;
      let matchedCount = 0;
      const unmatchedEmojis: string[] = [];

      console.log('\n[Categories]');
      CATEGORIES.forEach((category) => {
        totalCount += 1;
        const matched = uiIconService.isDefaultEmoji(category.icon);
        if (matched) {
          matchedCount += 1;
          console.log(`OK ${category.icon} ${category.name} -> ${uiIconService.convertEmojiToUIIcon(category.icon)}`);
        } else {
          unmatchedEmojis.push(`${category.icon} (${category.name})`);
          console.log(`MISS ${category.icon} ${category.name}`);
        }

        category.activities.forEach((activity) => {
          totalCount += 1;
          const activityMatched = uiIconService.isDefaultEmoji(activity.icon);
          if (activityMatched) {
            matchedCount += 1;
            console.log(`  OK ${activity.icon} ${activity.name} -> ${uiIconService.convertEmojiToUIIcon(activity.icon)}`);
          } else {
            unmatchedEmojis.push(`${activity.icon} (${activity.name})`);
            console.log(`  MISS ${activity.icon} ${activity.name}`);
          }
        });
      });

      console.log('\n[Scopes]');
      SCOPES.forEach((scope) => {
        totalCount += 1;
        const matched = uiIconService.isDefaultEmoji(scope.icon);
        if (matched) {
          matchedCount += 1;
          console.log(`OK ${scope.icon} ${scope.name} -> ${uiIconService.convertEmojiToUIIcon(scope.icon)}`);
        } else {
          unmatchedEmojis.push(`${scope.icon} (${scope.name})`);
          console.log(`MISS ${scope.icon} ${scope.name}`);
        }
      });

      console.log('\n[TodoCategories]');
      MOCK_TODO_CATEGORIES.forEach((category) => {
        totalCount += 1;
        const matched = uiIconService.isDefaultEmoji(category.icon);
        if (matched) {
          matchedCount += 1;
          console.log(`OK ${category.icon} ${category.name} -> ${uiIconService.convertEmojiToUIIcon(category.icon)}`);
        } else {
          unmatchedEmojis.push(`${category.icon} (${category.name})`);
          console.log(`MISS ${category.icon} ${category.name}`);
        }
      });

      console.log('\n[Summary]');
      console.log(`Total: ${totalCount}`);
      console.log(`Matched: ${matchedCount} (${((matchedCount / totalCount) * 100).toFixed(1)}%)`);
      console.log(`Unmatched: ${unmatchedEmojis.length} (${((unmatchedEmojis.length / totalCount) * 100).toFixed(1)}%)`);

      if (unmatchedEmojis.length > 0) {
        console.log('\n[Unmatched Emojis]');
        unmatchedEmojis.forEach((emoji) => console.log(`- ${emoji}`));
      }
    } catch (error) {
      console.error('[ResetDataTool] Emoji matching test failed:', error);
    }

    console.log('[ResetDataTool] ===============================================');
  }
}

const resetDataTool = new ResetDataTool();

declare global {
  interface Window {
    resetAllData: () => Promise<void>;
    resetCategories: () => Promise<void>;
    resetScopes: () => Promise<void>;
    resetTodoCategories: () => Promise<void>;
    clearMigrationFlags: () => void;
    inspectData: () => Promise<void>;
    resetDataHelp: () => void;
    forceGenerateUiIcons: () => Promise<void>;
    testEmojiMatching: () => Promise<void>;
  }
}

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

  console.log('[ResetDataTool] Debug reset tool loaded.');
  console.log('[ResetDataTool] Run window.resetDataHelp() for available commands.');
}

export default resetDataTool;
