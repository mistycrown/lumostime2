/**
 * @file NavigationContext.tsx
 * @description 统一管理应用的所有导航和模态状态（含设置子页层级）
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppView, Log, TodoItem, Goal, SearchType } from '../types';
import { useSettings } from './SettingsContext';

export type SettingsSubmenu =
    | 'main'
    | 'data'
    | 'cloud'
    | 's3'
    | 'ai'
    | 'preferences'
    | 'guide'
    | 'nfc'
    | 'templates'
    | 'check_templates'
    | 'narrative_prompt'
    | 'auto_record'
    | 'autolink'
    | 'obsidian_export'
    | 'filters'
    | 'memoir_filter'
    | 'batch_manage'
    | 'sponsorship_preview'
    | 'scene'
    | 'emoji'
    | 'principle'
    | 'widget';

interface NavigationContextType {
    // 主视图
    currentView: AppView;
    setCurrentView: (view: AppView) => void;

    // 模态框状态
    isSettingsOpen: boolean;
    setIsSettingsOpen: (open: boolean) => void;
    settingsSubmenu: SettingsSubmenu;
    setSettingsSubmenu: (submenu: SettingsSubmenu) => void;
    settingsSubmenuBackCloses: boolean;
    setSettingsSubmenuBackCloses: (value: boolean) => void;
    isAutoLinkOpen: boolean;
    setIsAutoLinkOpen: (open: boolean) => void;
    isSearchOpen: boolean;
    setIsSearchOpen: (open: boolean) => void;
    isFiltersOpen: boolean;
    setIsFiltersOpen: (open: boolean) => void;
    activeFilterId: string | null;
    setActiveFilterId: (id: string | null) => void;

    // Search Persistence
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchMode: 'all' | 'partial';
    setSearchMode: (mode: 'all' | 'partial') => void;
    selectedSearchTypes: SearchType[];
    setSelectedSearchTypes: (types: SearchType[]) => void;

    isStatsFullScreen: boolean;
    setIsStatsFullScreen: (open: boolean) => void;
    isAddModalOpen: boolean;
    setIsAddModalOpen: (open: boolean) => void;
    isTodoModalOpen: boolean;
    setIsTodoModalOpen: (open: boolean) => void;
    isTodoManaging: boolean;
    setIsTodoManaging: (managing: boolean) => void;

    // Goal Batch Manage (Scope > Goals)
    isGoalBatchManaging: boolean;
    setIsGoalBatchManaging: (managing: boolean) => void;
    isGoalEditorOpen: boolean;
    setIsGoalEditorOpen: (open: boolean) => void;
    isTagsManaging: boolean;
    setIsTagsManaging: (managing: boolean) => void;
    isScopeManaging: boolean;
    setIsScopeManaging: (managing: boolean) => void;

    // Review 模态框
    isDailyReviewOpen: boolean;
    setIsDailyReviewOpen: (open: boolean) => void;
    isOnThisDayOpen: boolean;
    setIsOnThisDayOpen: (open: boolean) => void;
    isWeeklyReviewOpen: boolean;
    setIsWeeklyReviewOpen: (open: boolean) => void;
    isMonthlyReviewOpen: boolean;
    setIsMonthlyReviewOpen: (open: boolean) => void;
    isAchievementOpen: boolean;
    setIsAchievementOpen: (open: boolean) => void;

    // 档案页面模式切换
    isJournalMode: boolean;
    setIsJournalMode: (mode: boolean) => void;

    // 导航选择状态
    selectedTagId: string | null;
    setSelectedTagId: (id: string | null) => void;
    selectedCategoryId: string | null;
    setSelectedCategoryId: (id: string | null) => void;
    selectedScopeId: string | null;
    setSelectedScopeId: (id: string | null) => void;

    // 编辑状态
    editingLog: Log | null;
    setEditingLog: (log: Log | null) => void;
    editingTodo: TodoItem | null;
    setEditingTodo: (todo: TodoItem | null) => void;
    editingGoal: Goal | null;
    setEditingGoal: (goal: Goal | null) => void;

    // Review 编辑状态
    currentReviewDate: Date | null;
    setCurrentReviewDate: (date: Date | null) => void;
    currentOnThisDayDate: Date | null;
    setCurrentOnThisDayDate: (date: Date | null) => void;
    currentWeeklyReviewStart: Date | null;
    setCurrentWeeklyReviewStart: (date: Date | null) => void;
    currentWeeklyReviewEnd: Date | null;
    setCurrentWeeklyReviewEnd: (date: Date | null) => void;
    currentMonthlyReviewStart: Date | null;
    setCurrentMonthlyReviewStart: (date: Date | null) => void;
    currentMonthlyReviewEnd: Date | null;
    setCurrentMonthlyReviewEnd: (date: Date | null) => void;

    // 其他导航状态
    returnToSearch: boolean;
    setReturnToSearch: (value: boolean) => void;
    isOpenedFromSearch: boolean;
    setIsOpenedFromSearch: (value: boolean) => void;
    isSearchOpenedFromSettings: boolean;
    setIsSearchOpenedFromSettings: (value: boolean) => void;
    statsTitle: string;
    setStatsTitle: (title: string) => void;
    statsRange: 'day' | 'week' | 'month' | 'year' | null;
    setStatsRange: (range: 'day' | 'week' | 'month' | 'year' | null) => void;
    todoCategoryToAdd: string;
    setTodoCategoryToAdd: (id: string) => void;
    newTodoDraft: Partial<TodoItem> | null;
    setNewTodoDraft: (draft: Partial<TodoItem> | null) => void;
    goalScopeId: string;
    setGoalScopeId: (id: string) => void;
    initialLogTimes: { start?: number; end?: number; prefilledData?: { categoryId?: string; activityId?: string; linkedTodoId?: string } } | null;
    setInitialLogTimes: (times: { start?: number; end?: number; prefilledData?: { categoryId?: string; activityId?: string; linkedTodoId?: string } } | null) => void;

    // Session Focus Detail
    focusDetailSessionId: string | null;
    setFocusDetailSessionId: (id: string | null) => void;

    // Share View
    isShareViewOpen: boolean;
    setIsShareViewOpen: (open: boolean) => void;
    sharingLog: Log | null;
    setSharingLog: (log: Log | null) => void;

    // Gallery View
    isGalleryViewOpen: boolean;
    setIsGalleryViewOpen: (open: boolean) => void;

    // Export Views (ChronoPrint, EmojiExport, etc.)
    isExportViewOpen: boolean;
    setIsExportViewOpen: (open: boolean) => void;

    // Global Date State
    currentDate: Date;
    setCurrentDate: (date: Date) => void;

    // Navigation History
    previousView: AppView | null;
    setPreviousView: (view: AppView | null) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
};

interface NavigationProviderProps {
    children: ReactNode;
    initialView?: AppView;
    initialTodoCategory?: string;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
    children,
    initialView,
    initialTodoCategory
}) => {
    // 主视图
    const [currentView, setCurrentView] = useState<AppView>(() => {
        const saved = localStorage.getItem('lumos_default_view');
        return initialView || (saved as AppView) || AppView.RECORD;
    });

    const { defaultArchiveView, defaultIndexView } = useSettings();

    // Wrapper for setting view to handle default preferences
    const handleSetCurrentView = (view: AppView) => {
        // Handle Archive Page Preference (Reset to default on entry)
        if (view === AppView.REVIEW) {
            setIsJournalMode(defaultArchiveView === 'MEMOIR');
        }

        setCurrentView(view);
    };

    // 模态框状态
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsSubmenu, setSettingsSubmenu] = useState<SettingsSubmenu>('main');
    const [settingsSubmenuBackCloses, setSettingsSubmenuBackCloses] = useState(false);
    const [isAutoLinkOpen, setIsAutoLinkOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

    useEffect(() => {
        if (!isSettingsOpen && settingsSubmenu !== 'main') {
            setSettingsSubmenu('main');
        }
    }, [isSettingsOpen, settingsSubmenu]);

    // Search Persistence State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchMode, setSearchMode] = useState<'all' | 'partial'>('all');
    const [selectedSearchTypes, setSelectedSearchTypes] = useState<SearchType[]>([]);

    const [isStatsFullScreen, setIsStatsFullScreen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
    const [isTodoManaging, setIsTodoManaging] = useState(false);
    const [isGoalBatchManaging, setIsGoalBatchManaging] = useState(false);
    const [isGoalEditorOpen, setIsGoalEditorOpen] = useState(false);
    const [isTagsManaging, setIsTagsManaging] = useState(false);
    const [isScopeManaging, setIsScopeManaging] = useState(false);

    // Review 模态框
    const [isDailyReviewOpen, setIsDailyReviewOpen] = useState(false);
    const [isOnThisDayOpen, setIsOnThisDayOpen] = useState(false);
    const [isWeeklyReviewOpen, setIsWeeklyReviewOpen] = useState(false);
    const [isMonthlyReviewOpen, setIsMonthlyReviewOpen] = useState(false);
    const [isAchievementOpen, setIsAchievementOpen] = useState(false);

    // 档案页面模式切换
    const [isJournalMode, setIsJournalMode] = useState(() => defaultArchiveView === 'MEMOIR');

    // Update isJournalMode if defaultArchiveView changes (optional, but good for immediate feedback if settings changed while in view)
    // Actually, let's NOT auto-switch if user is already looking at it, only on entry (handled above).
    // But we should ensure initial state is correct.

    // 导航选择状态
    const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedScopeId, setSelectedScopeId] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedScopeId) {
            setIsGoalBatchManaging(false);
        }
    }, [selectedScopeId]);

    // 编辑状态
    const [editingLog, setEditingLog] = useState<Log | null>(null);
    const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

    // Review 编辑状态
    const [currentReviewDate, setCurrentReviewDate] = useState<Date | null>(null);
    const [currentOnThisDayDate, setCurrentOnThisDayDate] = useState<Date | null>(null);
    const [currentWeeklyReviewStart, setCurrentWeeklyReviewStart] = useState<Date | null>(null);
    const [currentWeeklyReviewEnd, setCurrentWeeklyReviewEnd] = useState<Date | null>(null);
    const [currentMonthlyReviewStart, setCurrentMonthlyReviewStart] = useState<Date | null>(null);
    const [currentMonthlyReviewEnd, setCurrentMonthlyReviewEnd] = useState<Date | null>(null);

    // 其他导航状态
    const [returnToSearch, setReturnToSearch] = useState(false);
    const [isOpenedFromSearch, setIsOpenedFromSearch] = useState(false);
    const [isSearchOpenedFromSettings, setIsSearchOpenedFromSettings] = useState(false);
    const [statsTitle, setStatsTitle] = useState<string>('数据统计');
    const [statsRange, setStatsRange] = useState<'day' | 'week' | 'month' | 'year' | null>(null);
    const [todoCategoryToAdd, setTodoCategoryToAdd] = useState<string>(
        initialTodoCategory || 'work'
    );
    const [newTodoDraft, setNewTodoDraft] = useState<Partial<TodoItem> | null>(null);
    const [goalScopeId, setGoalScopeId] = useState<string>('');
    const [initialLogTimes, setInitialLogTimes] = useState<{ start?: number; end?: number; prefilledData?: { categoryId?: string; activityId?: string; linkedTodoId?: string } } | null>(null);

    const [focusDetailSessionId, setFocusDetailSessionId] = useState<string | null>(null);
    const [isShareViewOpen, setIsShareViewOpen] = useState(false);
    const [sharingLog, setSharingLog] = useState<Log | null>(null);
    const [isGalleryViewOpen, setIsGalleryViewOpen] = useState(false);
    const [isExportViewOpen, setIsExportViewOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [previousView, setPreviousView] = useState<AppView | null>(null);
    const handleSetIsSettingsOpen = (open: boolean) => {
        if (open) {
            setSettingsSubmenu('main');
            setSettingsSubmenuBackCloses(false);
        } else {
            setSettingsSubmenuBackCloses(false);
        }
        setIsSettingsOpen(open);
    };

    return (
        <NavigationContext.Provider value={{
            currentView,
            setCurrentView: handleSetCurrentView,
            isSettingsOpen,
            setIsSettingsOpen: handleSetIsSettingsOpen,
            settingsSubmenu,
            setSettingsSubmenu,
            settingsSubmenuBackCloses,
            setSettingsSubmenuBackCloses,
            isAutoLinkOpen,
            setIsAutoLinkOpen,
            isSearchOpen,
            setIsSearchOpen,
            isFiltersOpen,
            setIsFiltersOpen,
            activeFilterId,
            setActiveFilterId,
            searchQuery,
            setSearchQuery,
            searchMode,
            setSearchMode,
            selectedSearchTypes,
            setSelectedSearchTypes,
            isStatsFullScreen,
            setIsStatsFullScreen,
            isAddModalOpen,
            setIsAddModalOpen,
            isTodoModalOpen,
            setIsTodoModalOpen,
            isTodoManaging,
            setIsTodoManaging,
            isGoalBatchManaging,
            setIsGoalBatchManaging,
            isGoalEditorOpen,
            setIsGoalEditorOpen,
            isTagsManaging,
            setIsTagsManaging,
            isScopeManaging,
            setIsScopeManaging,
            isDailyReviewOpen,
            setIsDailyReviewOpen,
            isOnThisDayOpen,
            setIsOnThisDayOpen,
            isWeeklyReviewOpen,
            setIsWeeklyReviewOpen,
            isMonthlyReviewOpen,
            setIsMonthlyReviewOpen,
            isAchievementOpen,
            setIsAchievementOpen,
            isJournalMode,
            setIsJournalMode,
            selectedTagId,
            setSelectedTagId,
            selectedCategoryId,
            setSelectedCategoryId,
            selectedScopeId,
            setSelectedScopeId,
            editingLog,
            setEditingLog,
            editingTodo,
            setEditingTodo,
            editingGoal,
            setEditingGoal,
            currentReviewDate,
            setCurrentReviewDate,
            currentOnThisDayDate,
            setCurrentOnThisDayDate,
            currentWeeklyReviewStart,
            setCurrentWeeklyReviewStart,
            currentWeeklyReviewEnd,
            setCurrentWeeklyReviewEnd,
            currentMonthlyReviewStart,
            setCurrentMonthlyReviewStart,
            currentMonthlyReviewEnd,
            setCurrentMonthlyReviewEnd,
            returnToSearch,
            setReturnToSearch,
            isOpenedFromSearch,
            setIsOpenedFromSearch,
            isSearchOpenedFromSettings,
            setIsSearchOpenedFromSettings,
            statsTitle,
            setStatsTitle,
            statsRange,
            setStatsRange,
            todoCategoryToAdd,
            setTodoCategoryToAdd,
            newTodoDraft,
            setNewTodoDraft,
            goalScopeId,
            setGoalScopeId,
            initialLogTimes,
            setInitialLogTimes,
            focusDetailSessionId,
            setFocusDetailSessionId,
            isShareViewOpen,
            setIsShareViewOpen,
            sharingLog,
            setSharingLog,
            isGalleryViewOpen,
            setIsGalleryViewOpen,
            isExportViewOpen,
            setIsExportViewOpen,
            currentDate,
            setCurrentDate,
            previousView,
            setPreviousView
        }}>
            {children}
        </NavigationContext.Provider>
    );
};
