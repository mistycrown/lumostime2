/**
 * @file useHardwareBackButton.ts
 * @input NavigationContext (all modal/view states including settings submenu hierarchy, search origin state, and custom filter overlay state)
 * @output Hardware Back Button Handler (backButton event listener)
 * @pos Hook (System Integration)
 * @description 硬件返回键 Hook - 处理 Android 硬件返回键的层级导航逻辑（含设置子页逐级返回）
 * 
 * 优先级顺序：
 * 1. 模态框（Settings, AutoLink, Search, FocusDetail, AddLog, Todo, Reviews）
 * 2. 全屏/管理模式（Stats FullScreen, Todo Managing, Tags Managing）
 * 3. 视图导航（Stats → Timeline, Tag Detail → Tag List, Scope Detail → Scope List）
 * 4. 退出应用
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { AppView } from '../types';
import { useNavigation } from '../contexts/NavigationContext';

export const useHardwareBackButton = () => {
    const {
        isSettingsOpen, setIsSettingsOpen, settingsSubmenu, setSettingsSubmenu,
        isAutoLinkOpen, setIsAutoLinkOpen,
        isSearchOpen, setIsSearchOpen, isSearchOpenedFromSettings, setIsSearchOpenedFromSettings,
        isFiltersOpen, setIsFiltersOpen, activeFilterId, setActiveFilterId,
        focusDetailSessionId, setFocusDetailSessionId,
        isAddModalOpen, setIsAddModalOpen,
        isTodoModalOpen, setIsTodoModalOpen,
        isDailyReviewOpen, setIsDailyReviewOpen, setCurrentReviewDate,
        isOnThisDayOpen, setIsOnThisDayOpen, setCurrentOnThisDayDate,
        isWeeklyReviewOpen, setIsWeeklyReviewOpen, setCurrentWeeklyReviewStart, setCurrentWeeklyReviewEnd,
        isMonthlyReviewOpen, setIsMonthlyReviewOpen, setCurrentMonthlyReviewStart, setCurrentMonthlyReviewEnd,
        isStatsFullScreen, setIsStatsFullScreen,
        isTodoManaging, setIsTodoManaging,
        isTagsManaging, setIsTagsManaging,
        isScopeManaging, setIsScopeManaging,
        isShareViewOpen, setIsShareViewOpen,
        isGalleryViewOpen, setIsGalleryViewOpen,
        isExportViewOpen, setIsExportViewOpen,
        currentView, setCurrentView,
        selectedTagId, setSelectedTagId,
        selectedCategoryId, setSelectedCategoryId,
        selectedScopeId, setSelectedScopeId,
        returnToSearch, setReturnToSearch
    } = useNavigation();

    // Helper functions re-implemented locally or we could import them if we export them from useNavigation utils?
    // But most of them just access state setters.

    // We replicate the helpers here to keep the hook self-contained or import if possible.
    // Creating locals for now as they are simple one-liners mostly.

    const handleBackFromTag = () => {
        setSelectedTagId(null);
        setSelectedCategoryId(null);
        if (returnToSearch) {
            setIsSearchOpen(true);
            setReturnToSearch(false);
        }
    };

    const handleBackFromScope = () => {
        setSelectedScopeId(null);
        if (returnToSearch) {
            setIsSearchOpen(true);
            setReturnToSearch(false);
        }
    };

    // Standard close functions
    const closeModal = () => {
        setIsAddModalOpen(false);
    };
    const closeTodoModal = () => {
        setIsTodoModalOpen(false);
    };
    const closeSearch = () => {
        setIsSearchOpen(false);

        if (isSearchOpenedFromSettings) {
            setSettingsSubmenu('main');
            setIsSettingsOpen(true);
        }

        setIsSearchOpenedFromSettings(false);
    };
    const closeFilters = () => {
        if (activeFilterId) {
            setActiveFilterId(null);
            return;
        }

        setIsFiltersOpen(false);
    };

    useEffect(() => {
        const handleBackButton = ({ canGoBack }: { canGoBack: boolean }) => {
            // 1. Modals (High Priority)
            if (isSettingsOpen) {
                if (settingsSubmenu !== 'main') {
                    setSettingsSubmenu('main');
                    return;
                }
                setIsSettingsOpen(false);
                return;
            }
            if (isAutoLinkOpen) {
                setIsAutoLinkOpen(false);
                return;
            }
            if (isSearchOpen) {
                closeSearch();
                return;
            }
            if (isFiltersOpen) {
                closeFilters();
                return;
            }
            if (isExportViewOpen) {
                setIsExportViewOpen(false);
                return;
            }
            if (isGalleryViewOpen) {
                setIsGalleryViewOpen(false);
                return;
            }
            if (isShareViewOpen) {
                setIsShareViewOpen(false);
                return;
            }
            if (focusDetailSessionId) {
                setFocusDetailSessionId(null);
                return;
            }
            if (isAddModalOpen) {
                closeModal();
                return;
            }
            if (isTodoModalOpen) {
                closeTodoModal();
                return;
            }

            // 1.5. Daily/Weekly/Monthly Review
            if (isDailyReviewOpen) {
                setIsDailyReviewOpen(false);
                setCurrentReviewDate(null);
                return;
            }
            if (isOnThisDayOpen) {
                setIsOnThisDayOpen(false);
                setCurrentOnThisDayDate(null);
                return;
            }
            if (isWeeklyReviewOpen) {
                setIsWeeklyReviewOpen(false);
                setCurrentWeeklyReviewStart(null);
                setCurrentWeeklyReviewEnd(null);
                return;
            }
            if (isMonthlyReviewOpen) {
                setIsMonthlyReviewOpen(false);
                setCurrentMonthlyReviewStart(null);
                setCurrentMonthlyReviewEnd(null);
                return;
            }

            // 2. Full Screen / Management Modes
            if (isStatsFullScreen) {
                setIsStatsFullScreen(false);
                return;
            }
            if (isTodoManaging) {
                setIsTodoManaging(false);
                return;
            }
            if (isTagsManaging) {
                setIsTagsManaging(false);
                return;
            }
            if (isScopeManaging) {
                setIsScopeManaging(false);
                return;
            }

            // 3. Navigation (View Hierarchy)
            if (currentView === AppView.STATS) {
                setCurrentView(AppView.TIMELINE);
                return;
            }
            if (currentView === AppView.TAGS && (selectedTagId || selectedCategoryId)) {
                handleBackFromTag();
                return;
            }
            if (currentView === AppView.SCOPE && selectedScopeId) {
                handleBackFromScope();
                return;
            }

            // 4. Default: Exit App
            CapacitorApp.exitApp();
        };

        const listener = CapacitorApp.addListener('backButton', handleBackButton);

        return () => {
            listener.then(l => l.remove());
        };
    }, [
        isSettingsOpen, isAutoLinkOpen, isSearchOpen, isFiltersOpen, isExportViewOpen, isGalleryViewOpen, isShareViewOpen, focusDetailSessionId, isAddModalOpen, isTodoModalOpen,
        isDailyReviewOpen, isOnThisDayOpen, isWeeklyReviewOpen, isMonthlyReviewOpen,
        isStatsFullScreen, isTodoManaging, isTagsManaging, isScopeManaging,
        currentView, selectedTagId, selectedCategoryId, selectedScopeId, settingsSubmenu, isSearchOpenedFromSettings, activeFilterId
    ]);
};
