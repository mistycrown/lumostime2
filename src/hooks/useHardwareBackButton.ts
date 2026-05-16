/**
 * @file useHardwareBackButton.ts
 * @updated 2026-05-13: Reordered overlay back priority so collection-launched log/todo details close before the underlying settings stack unwinds, keeping Android back aligned with on-screen close buttons.
 * @updated 2026-05-12: Routed todo-detail hardware back presses through the shared nested detail-history stack so child-task pages return to their parent detail before leaving the todo surface.
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
 * @updated 2026-05-04: Added a shared overlay back-handler stack so transient sheets can consume Android hardware back before app-level navigation or exit runs.
 * @updated 2026-04-30: Routed Android hardware back presses through the shared AI chat back handler so AI subpages unwind before app-level exit logic runs.
 */
import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { AppView } from '../types';
import { useNavigation } from '../contexts/NavigationContext';
import { useAIChatWindow } from '../contexts/AIChatWindowContext';
import { runRegisteredHardwareBackHandler } from '../utils/hardwareBackHandlerStack';

export const useHardwareBackButton = () => {
    const { isAIChatOpen, handleAIChatBack } = useAIChatWindow();
    const {
        isSettingsOpen, setIsSettingsOpen, settingsSubmenu, setSettingsSubmenu,
        settingsSubmenuBackCloses, setSettingsSubmenuBackCloses,
        isAutoLinkOpen, setIsAutoLinkOpen,
        isSearchOpen, setIsSearchOpen, isSearchOpenedFromSettings, setIsSearchOpenedFromSettings,
        isFiltersOpen, setIsFiltersOpen, activeFilterId, setActiveFilterId,
        focusDetailSessionId, setFocusDetailSessionId,
        isAddModalOpen, setIsAddModalOpen,
        isTodoModalOpen, closeTodoDetail,
        isDailyReviewOpen, isDailyNewspaperOpen, setIsDailyReviewOpen, setCurrentReviewDate, setIsDailyNewspaperOpen, setCurrentDailyNewspaperDate,
        isOnThisDayOpen, setIsOnThisDayOpen, setCurrentOnThisDayDate,
        isWeeklyReviewOpen, setIsWeeklyReviewOpen, setCurrentWeeklyReviewStart, setCurrentWeeklyReviewEnd,
        isMonthlyReviewOpen, setIsMonthlyReviewOpen, setCurrentMonthlyReviewStart, setCurrentMonthlyReviewEnd,
        isAchievementOpen, setIsAchievementOpen,
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
            if (runRegisteredHardwareBackHandler()) {
                return;
            }

            if (isAIChatOpen && handleAIChatBack()) {
                return;
            }

            // 1. Modals (High Priority)
            if (focusDetailSessionId) {
                setFocusDetailSessionId(null);
                return;
            }
            if (isAddModalOpen) {
                closeModal();
                return;
            }
            if (isTodoModalOpen) {
                closeTodoDetail();
                return;
            }
            if (isSettingsOpen) {
                if (settingsSubmenu !== 'main') {
                    if (settingsSubmenuBackCloses) {
                        setSettingsSubmenuBackCloses(false);
                        setSettingsSubmenu('main');
                        setIsSettingsOpen(false);
                        return;
                    }
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

            // 1.5. Daily/Weekly/Monthly Review
            if (isDailyNewspaperOpen) {
                setIsDailyNewspaperOpen(false);
                setCurrentDailyNewspaperDate(null);
                return;
            }
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
            if (isAchievementOpen) {
                setIsAchievementOpen(false);
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
        closeTodoDetail, handleAIChatBack, isAIChatOpen,
        isSettingsOpen, isAutoLinkOpen, isSearchOpen, isFiltersOpen, isExportViewOpen, isGalleryViewOpen, isShareViewOpen, focusDetailSessionId, isAddModalOpen, isTodoModalOpen,
        isDailyNewspaperOpen, isDailyReviewOpen, isOnThisDayOpen, isWeeklyReviewOpen, isMonthlyReviewOpen, isAchievementOpen,
        isStatsFullScreen, isTodoManaging, isTagsManaging, isScopeManaging,
        currentView, selectedTagId, selectedCategoryId, selectedScopeId, settingsSubmenu, settingsSubmenuBackCloses, isSearchOpenedFromSettings, activeFilterId
    ]);
};
