/**
 * @file useSearchManager.ts
 * @input NavigationContext (search modal state, view navigation states)
 * @output Search Control (handleOpenSearch, handleCloseSearch), Navigation (handleSelectSearchScope, handleSelectSearchCategory, handleSelectSearchActivity), Wrapper Functions (handleSelectSearchLogWrapper, handleSelectSearchTodoWrapper)
 * @pos Hook (Data Manager)
 * @description 搜索管理 Hook - 处理搜索界面的打开关闭、搜索结果选择后的导航跳转
 * 
 * 设计说明：
 * - 搜索结果选择后会自动导航到对应的视图（Scope、Tags、Todo）
 * - 对于 Log 和 Todo 的选择，需要配合外部的 modal 打开函数使用
 * - 使用 returnToSearch 标记来支持从详情页返回搜索界面
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { Log, TodoItem, Category, AppView } from '../types';
import { useNavigation } from '../contexts/NavigationContext';

export const useSearchManager = () => {
    const {
        setIsSearchOpen,
        setCurrentView,
        setReturnToSearch,
        setSelectedScopeId,
        setSelectedCategoryId,
        setSelectedTagId,
        isSearchOpen
    } = useNavigation();

    // Note: These open functions are expected to be passed to SearchView
    // But SearchView also calls openEditModal / openEditTodoModal.
    // We should probably just expose the navigation logic here, 
    // and let the component calling this hook handle the modal opening if needed, or pass those handlers in.

    const handleOpenSearch = () => {
        setIsSearchOpen(true);
    };

    const handleCloseSearch = () => {
        setIsSearchOpen(false);
    };

    const handleSelectSearchScope = (scope: { id: string }) => {
        setReturnToSearch(true);
        setIsSearchOpen(false);
        setCurrentView(AppView.SCOPE);
        setSelectedScopeId(scope.id);
    };

    const handleSelectSearchCategory = (category: Category) => {
        setReturnToSearch(true);
        setIsSearchOpen(false);
        setCurrentView(AppView.TAGS);
        setSelectedCategoryId(category.id);
        setSelectedTagId(null); // Ensure we are in category mode
    };

    const handleSelectSearchActivity = (activity: { id: string }, categoryId: string) => {
        setReturnToSearch(true);
        setIsSearchOpen(false);
        setCurrentView(AppView.TAGS);
        setSelectedTagId(activity.id);
        setSelectedCategoryId(null); // Ensure we are in tag mode
    };

    /**
     * 处理搜索结果中的日志选择
     * 需要配合外部的 openEditModal 函数使用
     */
    const handleSelectSearchLogWrapper = (log: Log, openEditModal: (log: Log) => void) => {
        openEditModal(log);
    };

    /**
     * 处理搜索结果中的待办选择
     * 需要配合外部的 openEditTodoModal 函数使用
     */
    const handleSelectSearchTodoWrapper = (todo: TodoItem, openEditTodoModal: (todo: TodoItem) => void) => {
        setReturnToSearch(true);
        setIsSearchOpen(false);
        setCurrentView(AppView.TODO);
        setTimeout(() => openEditTodoModal(todo), 100);
    };

    return {
        isSearchOpen,
        handleOpenSearch,
        handleCloseSearch,
        handleSelectSearchScope,
        handleSelectSearchCategory,
        handleSelectSearchActivity,
        handleSelectSearchLogWrapper,
        handleSelectSearchTodoWrapper
    };
};
