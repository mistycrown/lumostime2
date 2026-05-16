/**
 * @file MainLayout.tsx
 * @input children, navigation state, handlers
 * @output Main Application Layout
 * @updated 2026-04-25: Let floating switch-button fallback icons inherit the button theme color so default UI icons stay visible on accent-theme white buttons.
 * @updated 2026-04-25: Added a `min-h-0` guard on the main content shell so nested scene lists can keep scrolling on mobile WebViews.
 * @pos Component (Layout)
 * @description 主应用布局组件 - 包含顶部导航栏、主内容区域和浮动按钮
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useEffect } from 'react';
import { RefreshCw, ChevronLeft, Settings as SettingsIcon, Settings2, Maximize2, Target, Tag, AudioWaveform, BookHeart } from 'lucide-react';
import { AppView } from '../types';
import { VIEW_TITLES, INITIAL_LOGS, INITIAL_TODOS, CATEGORIES, SCOPES, MOCK_TODO_CATEGORIES, DEFAULT_REVIEW_TEMPLATES, DEFAULT_CHECK_TEMPLATES } from '../constants';
import { useNavigation } from '../contexts/NavigationContext';
import { useData } from '../contexts/DataContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useReview } from '../contexts/ReviewContext';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { UIIcon } from './UIIcon';
import { FloatingButton } from './FloatingButton';

interface MainLayoutProps {
    children: React.ReactNode;
    isHeaderScrolled: boolean;
    isSyncing: boolean;
    onQuickSync: (e: React.MouseEvent) => void;

    // Handlers for "Back" button custom logic
    handleBackFromTag: () => void;
    handleBackFromScope: () => void;
    // Review logic
    handleCloseDailyNewspaper: () => void;
    handleCloseDailyReview: () => void;
    handleCloseOnThisDay: () => void;
    handleCloseWeeklyReview: () => void;
    handleCloseMonthlyReview: () => void;

    // Stats Title
    statsTitle: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
    children,
    isHeaderScrolled,
    isSyncing,
    onQuickSync,
    handleBackFromTag,
    handleBackFromScope,
    handleCloseDailyNewspaper,
    handleCloseDailyReview,
    handleCloseOnThisDay,
    handleCloseWeeklyReview,
    handleCloseMonthlyReview,
    statsTitle
}) => {
    const [isTodoScheduleMode, setIsTodoScheduleMode] = useState<boolean>(() => localStorage.getItem('todoScreenMode') === 'week');
    const {
        currentView, setCurrentView,
        isSettingsOpen, setIsSettingsOpen,
        isDailyReviewOpen, isDailyNewspaperOpen, setIsDailyReviewOpen, setCurrentReviewDate, setCurrentDailyNewspaperDate, setIsDailyNewspaperOpen, isOpenedFromSearch, setIsSearchOpen, setIsOpenedFromSearch,
        isOnThisDayOpen,
        isWeeklyReviewOpen,
        isMonthlyReviewOpen,
        isAchievementOpen, setIsAchievementOpen,
        isStatsFullScreen, setIsStatsFullScreen,
        isTodoModalOpen,
        isTodoManaging, setIsTodoManaging,
        isGoalBatchManaging,
        isTagsManaging, setIsTagsManaging,
        isScopeManaging, setIsScopeManaging,
        selectedTagId, selectedCategoryId, selectedScopeId,
        isJournalMode, setIsJournalMode,
        returnToSearch, setReturnToSearch,
        previousView, setPreviousView,
        setStatsRange
    } = useNavigation();

    const {
        setLogs, setTodos, setTodoCategories
    } = useData();
    const {
        setScopes, setGoals, setCategories
    } = useCategoryScope();
    const {
        setReviewTemplates, setCheckTemplates,
        setDailyReviews, setWeeklyReviews, setMonthlyReviews
    } = useReview();
    const {
        setAutoLinkRules, setCustomNarrativeTemplates, setUserPersonalInfo, setFilters
    } = useSettings();
    const { addToast } = useToast();

    useEffect(() => {
        const handleTodoScheduleModeChange = (event: Event) => {
            const customEvent = event as CustomEvent<{ isWeekMode?: boolean }>;
            setIsTodoScheduleMode(Boolean(customEvent.detail?.isWeekMode));
        };

        window.addEventListener('todo-schedule-mode-changed', handleTodoScheduleModeChange as EventListener);
        return () => {
            window.removeEventListener('todo-schedule-mode-changed', handleTodoScheduleModeChange as EventListener);
        };
    }, []);

    const getHeaderTitle = () => {
        if (isDailyNewspaperOpen) return 'Daily Newspaper';
        if (isDailyReviewOpen) return 'Daily Review';
        if (isOnThisDayOpen) return 'On This Day';
        if (isWeeklyReviewOpen) return 'Weekly Review';
        if (isMonthlyReviewOpen) return 'Monthly Review';
        if (isAchievementOpen) return '成就瓶';
        if (currentView === AppView.TAGS) {
            if (selectedTagId) return '标签详情';
            if (selectedCategoryId) return '分类详情';
            return 'Tags';
        }
        if (currentView === AppView.REVIEW) {
            return isJournalMode ? 'Memoir' : 'Chronicle';
        }
        if (currentView === AppView.SCOPE) {
            if (selectedScopeId) return '领域详情';
            return 'Scopes';
        }
        if (currentView === AppView.STATS) {
            return statsTitle;
        }
        return VIEW_TITLES[currentView];
    };

    return (
        <div className={`h-screen w-screen flex flex-col text-stone-800 overflow-hidden select-none font-serif relative pb-[env(safe-area-inset-bottom)]`}>

            {/* Top Header Bar */}
            {!isSettingsOpen && (currentView !== AppView.TIMELINE || isDailyReviewOpen || isDailyNewspaperOpen || isOnThisDayOpen || isWeeklyReviewOpen || isMonthlyReviewOpen || isAchievementOpen) && !isStatsFullScreen &&
                !isTodoModalOpen &&
                !(currentView === AppView.TODO && isTodoManaging) &&
                !(currentView === AppView.TODO && isTodoScheduleMode) &&
                !(currentView === AppView.TAGS && isTagsManaging) &&
                !(currentView === AppView.SCOPE && isScopeManaging) &&
                !(currentView === AppView.SCOPE && isGoalBatchManaging) &&
                // Hide header for REVIEW view (Memoir/Chronicle use their own headers) UNLESS a modal review is open
                (currentView !== AppView.REVIEW || isDailyReviewOpen || isDailyNewspaperOpen || isOnThisDayOpen || isWeeklyReviewOpen || isMonthlyReviewOpen) && (
                    <header
                        className={`flex items-center justify-between px-5 border-b border-stone-100 shrink-0 z-30 transition-all duration-300 pt-[env(safe-area-inset-top)] ${isHeaderScrolled
                            ? 'h-[calc(3rem+env(safe-area-inset-top))] bg-[#faf9f6]/90 backdrop-blur-md shadow-sm'
                            : currentView === AppView.REVIEW ? 'h-[calc(3.5rem+env(safe-area-inset-top))] bg-[#faf9f6]/80 backdrop-blur-sm' : 'h-[calc(3.5rem+env(safe-area-inset-top))] bg-[#faf9f6]/80 backdrop-blur-sm'
                            }`}
                    >
                        <div className="w-8 flex items-center">
                            {(currentView === AppView.TODO || currentView === AppView.RECORD) && !isDailyReviewOpen && !isDailyNewspaperOpen && !isOnThisDayOpen && !isMonthlyReviewOpen && !isWeeklyReviewOpen && (
                                <button
                                    onClick={onQuickSync}
                                    disabled={isSyncing}
                                    className={`p-2 text-stone-400 hover:text-stone-600 rounded-full transition-all active:scale-95 -ml-2 ${isSyncing ? 'animate-spin text-purple-500' : ''}`}
                                    title="Sync from Cloud"
                                >
                                    <RefreshCw size={18} />
                                </button>
                            )}
                            {/* Show Back button if in Tag Detail, Category Detail, Scope Detail, Stats, or Daily/Weekly/Monthly Review */}
                            {((currentView === AppView.TAGS && (selectedTagId || selectedCategoryId)) ||
                                (currentView === AppView.SCOPE && selectedScopeId) ||
                                currentView === AppView.STATS ||
                                isDailyNewspaperOpen ||
                                isDailyReviewOpen ||
                                isOnThisDayOpen ||
                                isWeeklyReviewOpen ||
                                isMonthlyReviewOpen ||
                                isAchievementOpen) && (
                                    <button
                                        onClick={() => {
                                            if (returnToSearch) {
                                                // Re-open Search
                                                setIsSearchOpen(true);
                                                setReturnToSearch(false);

                                                // Also close the specific view to be clean (optional, but good for state)
                                                if (isDailyNewspaperOpen) handleCloseDailyNewspaper();
                                                else if (isDailyReviewOpen) handleCloseDailyReview();
                                                else if (isOnThisDayOpen) handleCloseOnThisDay();
                                                else if (isWeeklyReviewOpen) handleCloseWeeklyReview();
                                                else if (isMonthlyReviewOpen) handleCloseMonthlyReview();
                                                else if (isAchievementOpen) setIsAchievementOpen(false);
                                                else if (currentView === AppView.STATS) setCurrentView(AppView.TIMELINE);
                                                else if (currentView === AppView.SCOPE) handleBackFromScope();
                                                else handleBackFromTag();
                                                return;
                                            }

                                            if (isDailyNewspaperOpen) {
                                                handleCloseDailyNewspaper();
                                            } else if (isDailyReviewOpen) {
                                                handleCloseDailyReview();
                                                // If navigated from Scene page, return to Record view in scenes mode
                                                if (previousView === AppView.SCENE) {
                                                    localStorage.setItem('lumostime_recordViewMode', 'scenes');
                                                    setCurrentView(AppView.RECORD);
                                                    setPreviousView(null);
                                                }
                                            } else if (isOnThisDayOpen) {
                                                handleCloseOnThisDay();
                                                if (previousView === AppView.SCENE) {
                                                    localStorage.setItem('lumostime_recordViewMode', 'scenes');
                                                    setCurrentView(AppView.RECORD);
                                                    setPreviousView(null);
                                                }
                                            } else if (isWeeklyReviewOpen) {
                                                handleCloseWeeklyReview();
                                                // If navigated from Scene page, return to Record view in scenes mode
                                                if (previousView === AppView.SCENE) {
                                                    localStorage.setItem('lumostime_recordViewMode', 'scenes');
                                                    setCurrentView(AppView.RECORD);
                                                    setPreviousView(null);
                                                }
                                            } else if (isMonthlyReviewOpen) {
                                                handleCloseMonthlyReview();
                                                // If navigated from Scene page, return to Record view in scenes mode
                                                if (previousView === AppView.SCENE) {
                                                    localStorage.setItem('lumostime_recordViewMode', 'scenes');
                                                    setCurrentView(AppView.RECORD);
                                                    setPreviousView(null);
                                                }
                                            } else if (isAchievementOpen) {
                                                setIsAchievementOpen(false);
                                            } else if (currentView === AppView.STATS) {
                                                // Clear stats range when going back
                                                setStatsRange(null);
                                                // If navigated from Scene page, return to Record view in scenes mode
                                                if (previousView === AppView.SCENE) {
                                                    localStorage.setItem('lumostime_recordViewMode', 'scenes');
                                                    setCurrentView(AppView.RECORD);
                                                    setPreviousView(null);
                                                } else {
                                                    setCurrentView(AppView.TIMELINE);
                                                }
                                            } else if (currentView === AppView.SCOPE) {
                                                handleBackFromScope();
                                            } else {
                                                handleBackFromTag();
                                            }
                                        }}
                                        className="text-stone-400 hover:text-stone-600"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                )}
                        </div>
                        <h1 className="text-lg font-bold text-stone-700 tracking-wide">
                            {getHeaderTitle()}
                        </h1>
                        {(isDailyNewspaperOpen || isDailyReviewOpen || isOnThisDayOpen || isWeeklyReviewOpen || isMonthlyReviewOpen || isAchievementOpen) ? (
                            <div className="w-8" />
                        ) : currentView === AppView.RECORD ? (
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="w-8 flex justify-end text-stone-400 hover:text-stone-600 transition-colors"
                            >
                                <SettingsIcon size={20} />
                            </button>
                        ) : currentView === AppView.TODO && !isTodoManaging ? (
                            <button
                                onClick={() => setIsTodoManaging(true)}
                                className="w-8 flex justify-end text-stone-400 hover:text-stone-600 transition-colors"
                            >
                                <Settings2 size={20} />
                            </button>
                        ) : currentView === AppView.TAGS && !selectedTagId && !selectedCategoryId && !isTagsManaging ? (
                            <button
                                onClick={() => setIsTagsManaging(true)}
                                className="w-8 flex justify-end text-stone-400 hover:text-stone-600 transition-colors"
                            >
                                <Settings2 size={20} />
                            </button>
                        ) : currentView === AppView.SCOPE && !selectedScopeId && !isScopeManaging ? (
                            <button
                                onClick={() => setIsScopeManaging(true)}
                                className="w-8 flex justify-end text-stone-400 hover:text-stone-600 transition-colors"
                            >
                                <Settings2 size={20} />
                            </button>
                        ) : currentView === AppView.STATS ? (
                            <button
                                onClick={() => setIsStatsFullScreen(true)}
                                className="w-8 flex justify-end text-stone-400 hover:text-stone-600 transition-colors"
                            >
                                <Maximize2 size={20} />
                            </button>
                        ) : (
                            <div className="w-8" />
                        )}
                    </header>
                )}

            {/* Main Content Area */}
            <main className="flex-1 min-h-0 overflow-hidden relative">
                {children}

                {/* Global Floating Action Button for Tags/Scope Toggle */}
                {(currentView === AppView.TAGS || currentView === AppView.SCOPE) &&
                    !selectedTagId && !selectedCategoryId && !selectedScopeId && !isTodoModalOpen && (
                        <FloatingButton
                            onClick={() => setCurrentView(currentView === AppView.TAGS ? AppView.SCOPE : AppView.TAGS)}
                            ariaLabel={currentView === AppView.TAGS ? "Switch to Scope" : "Switch to Tags"}
                        >
                            <UIIcon 
                                type={currentView === AppView.TAGS ? "scope" : "tags"}
                                fallbackIcon={currentView === AppView.TAGS ? Target : Tag}
                                size={24}
                            />
                        </FloatingButton>
                    )}

                {/* Global Floating Action Button for Review/Journal Toggle */}
                {currentView === AppView.REVIEW && !isDailyReviewOpen && !isDailyNewspaperOpen && !isOnThisDayOpen && !isWeeklyReviewOpen && !isMonthlyReviewOpen && !isTodoModalOpen && (
                    <FloatingButton
                        onClick={() => setIsJournalMode(!isJournalMode)}
                        ariaLabel={isJournalMode ? "Switch to Chronicle" : "Switch to Memoir"}
                    >
                        {isJournalMode ? (
                            <UIIcon type="chronicle" fallbackIcon={BookHeart} size={24} />
                        ) : (
                            <UIIcon type="memoir" fallbackIcon={AudioWaveform} size={24} />
                        )}
                    </FloatingButton>
                )}

                {/* Full Screen Settings Overlay - Moved to App.tsx */}
            </main>
        </div>
    );
};
