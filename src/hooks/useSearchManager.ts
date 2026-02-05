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

    // For Logs and Todos, App.tsx handled them by opening modals.
    // We will return helper functions that behave similarly to App.tsx logic

    const handleSelectSearchLogWrapper = (log: Log, openEditModal: (log: Log) => void) => {
        // setIsSearchOpen(false); // Keep search open for modal context (as per App.tsx)
        openEditModal(log);
    };

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
