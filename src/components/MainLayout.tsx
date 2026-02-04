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
import { SettingsView } from '../views/SettingsView';

interface MainLayoutProps {
    children: React.ReactNode;
    isHeaderScrolled: boolean;
    isSyncing: boolean;
    onQuickSync: (e: React.MouseEvent) => void;

    // Handlers for "Back" button custom logic
    handleBackFromTag: () => void;
    handleBackFromScope: () => void;
    // Review logic
    handleCloseDailyReview: () => void;
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
    handleCloseDailyReview,
    handleCloseWeeklyReview,
    handleCloseMonthlyReview,
    statsTitle
}) => {
    const {
        currentView, setCurrentView,
        isSettingsOpen, setIsSettingsOpen,
        isDailyReviewOpen, setIsDailyReviewOpen, setCurrentReviewDate, isOpenedFromSearch, setIsSearchOpen, setIsOpenedFromSearch,
        isWeeklyReviewOpen,
        isMonthlyReviewOpen,
        isStatsFullScreen, setIsStatsFullScreen,
        isTodoManaging, setIsTodoManaging,
        isTagsManaging, setIsTagsManaging,
        isScopeManaging, setIsScopeManaging,
        selectedTagId, selectedCategoryId, selectedScopeId,
        isJournalMode, setIsJournalMode
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

    const getHeaderTitle = () => {
        if (isDailyReviewOpen) return 'Daily Review';
        if (isWeeklyReviewOpen) return 'Weekly Review';
        if (isMonthlyReviewOpen) return 'Monthly Review';
        if (currentView === AppView.TAGS) {
            if (selectedTagId) return 'Tag Details';
            if (selectedCategoryId) return 'Category Details';
            return 'Tags';
        }
        if (currentView === AppView.REVIEW) {
            return isJournalMode ? 'Memoir' : 'Chronicle';
        }
        if (currentView === AppView.SCOPE) {
            if (selectedScopeId) return 'Scope Details';
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
            {!isSettingsOpen && (currentView !== AppView.TIMELINE || isDailyReviewOpen || isWeeklyReviewOpen || isMonthlyReviewOpen) && !isStatsFullScreen &&
                !(currentView === AppView.TODO && isTodoManaging) &&
                !(currentView === AppView.TAGS && isTagsManaging) &&
                !(currentView === AppView.SCOPE && isScopeManaging) &&
                // Hide header for REVIEW view (Memoir/Chronicle use their own headers) UNLESS a modal review is open
                (currentView !== AppView.REVIEW || isDailyReviewOpen || isWeeklyReviewOpen || isMonthlyReviewOpen) && (
                    <header 
                        className={`flex items-center justify-between px-5 border-b border-stone-100 shrink-0 z-30 transition-all duration-300 pt-[env(safe-area-inset-top)] ${isHeaderScrolled
                            ? 'h-[calc(3rem+env(safe-area-inset-top))] bg-[#faf9f6]/90 backdrop-blur-md shadow-sm'
                            : currentView === AppView.REVIEW ? 'h-[calc(3.5rem+env(safe-area-inset-top))] bg-[#faf9f6]/80 backdrop-blur-sm' : 'h-[calc(3.5rem+env(safe-area-inset-top))] bg-[#faf9f6]/80 backdrop-blur-sm'
                        }`}
                    >
                        <div className="w-8 flex items-center">
                            {(currentView === AppView.TODO || currentView === AppView.RECORD) && !isDailyReviewOpen && !isMonthlyReviewOpen && !isWeeklyReviewOpen && (
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
                                isDailyReviewOpen ||
                                isWeeklyReviewOpen ||
                                isMonthlyReviewOpen) && (
                                    <button
                                        onClick={() => {
                                            if (isDailyReviewOpen) {
                                                handleCloseDailyReview();
                                            } else if (isWeeklyReviewOpen) {
                                                handleCloseWeeklyReview();
                                            } else if (isMonthlyReviewOpen) {
                                                handleCloseMonthlyReview();
                                            } else if (currentView === AppView.STATS) {
                                                setCurrentView(AppView.TIMELINE);
                                            } else if (currentView === AppView.SCOPE) {
                                                // Use history back to trigger popstate logic, ensuring consistency with hardware back button
                                                // Wait, App.tsx used window.history.back(), but since we are SPA, maybe handleBackFromScope is safer?
                                                // App.tsx code: window.history.back();
                                                // Let's stick to handleBackFromScope to avoid hash routing issues if any.
                                                // Actually original code for SCOPES used window.history.back()... let's try handleBackFromScope first as it is cleaner.
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
                        {(isDailyReviewOpen || isWeeklyReviewOpen || isMonthlyReviewOpen) ? (
                            <div className="w-8" />
                        ) : currentView === AppView.RECORD ? (
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="w-8 flex justify-end text-stone-400 hover:text-stone-600 transition-colors"
                            >
                                <SettingsIcon size={24} />
                            </button>
                        ) : currentView === AppView.TODO && !isTodoManaging ? (
                            <button
                                onClick={() => setIsTodoManaging(true)}
                                className="w-8 flex justify-end text-stone-400 hover:text-stone-600 transition-colors"
                            >
                                <Settings2 size={24} />
                            </button>
                        ) : currentView === AppView.TAGS && !selectedTagId && !selectedCategoryId && !isTagsManaging ? (
                            <button
                                onClick={() => setIsTagsManaging(true)}
                                className="w-8 flex justify-end text-stone-400 hover:text-stone-600 transition-colors"
                            >
                                <Settings2 size={24} />
                            </button>
                        ) : currentView === AppView.SCOPE && !selectedScopeId && !isScopeManaging ? (
                            <button
                                onClick={() => setIsScopeManaging(true)}
                                className="w-8 flex justify-end text-stone-400 hover:text-stone-600 transition-colors"
                            >
                                <Settings2 size={24} />
                            </button>
                        ) : currentView === AppView.STATS ? (
                            <button
                                onClick={() => setIsStatsFullScreen(true)}
                                className="w-8 flex justify-end text-stone-400 hover:text-stone-600 transition-colors"
                            >
                                <Maximize2 size={24} />
                            </button>
                        ) : (
                            <div className="w-8" />
                        )}
                    </header>
                )}

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative">
                {children}

                {/* Global Floating Action Button for Tags/Scope Toggle */}
                {(currentView === AppView.TAGS || currentView === AppView.SCOPE) &&
                    !selectedTagId && !selectedCategoryId && !selectedScopeId && (
                        <button
                            onClick={() => setCurrentView(currentView === AppView.TAGS ? AppView.SCOPE : AppView.TAGS)}
                            className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-6 w-14 h-14 bg-stone-900 rounded-full text-white shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40 border border-stone-800"
                            aria-label={currentView === AppView.TAGS ? "Switch to Scope" : "Switch to Tags"}
                        >
                            {currentView === AppView.TAGS ? <Target size={24} /> : <Tag size={24} />}
                        </button>
                    )}

                {/* Global Floating Action Button for Review/Journal Toggle */}
                {currentView === AppView.REVIEW && !isDailyReviewOpen && !isWeeklyReviewOpen && !isMonthlyReviewOpen && (
                    <button
                        onClick={() => setIsJournalMode(!isJournalMode)}
                        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-6 w-14 h-14 bg-stone-900 rounded-full text-white shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40 border border-stone-800"
                        aria-label={isJournalMode ? "Switch to Archive" : "Switch to Journal"}
                    >
                        {isJournalMode ? <BookHeart size={24} /> : <AudioWaveform size={24} />}
                    </button>
                )}

                {/* Full Screen Settings Overlay - Moved to App.tsx */}
            </main>
        </div>
    );
};
