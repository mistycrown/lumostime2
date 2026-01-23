/**
 * @file NavigationContext.tsx
 * @description 统一管理应用的所有导航和模态状态
 */
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppView, Log, TodoItem, Goal } from '../types';
import { useSettings } from './SettingsContext';

interface NavigationContextType {
    // 主视图
    currentView: AppView;
    setCurrentView: (view: AppView) => void;

    // 模态框状态
    isSettingsOpen: boolean;
    setIsSettingsOpen: (open: boolean) => void;
    isAutoLinkOpen: boolean;
    setIsAutoLinkOpen: (open: boolean) => void;
    isSearchOpen: boolean;
    setIsSearchOpen: (open: boolean) => void;
    isStatsFullScreen: boolean;
    setIsStatsFullScreen: (open: boolean) => void;
    isAddModalOpen: boolean;
    setIsAddModalOpen: (open: boolean) => void;
    isTodoModalOpen: boolean;
    setIsTodoModalOpen: (open: boolean) => void;
    isTodoManaging: boolean;
    setIsTodoManaging: (managing: boolean) => void;
    isGoalEditorOpen: boolean;
    setIsGoalEditorOpen: (open: boolean) => void;
    isTagsManaging: boolean;
    setIsTagsManaging: (managing: boolean) => void;
    isScopeManaging: boolean;
    setIsScopeManaging: (managing: boolean) => void;

    // Review 模态框
    isDailyReviewOpen: boolean;
    setIsDailyReviewOpen: (open: boolean) => void;
    isWeeklyReviewOpen: boolean;
    setIsWeeklyReviewOpen: (open: boolean) => void;
    isMonthlyReviewOpen: boolean;
    setIsMonthlyReviewOpen: (open: boolean) => void;

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
    todoCategoryToAdd: string;
    setTodoCategoryToAdd: (id: string) => void;
    goalScopeId: string;
    setGoalScopeId: (id: string) => void;
    initialLogTimes: { start?: number; end?: number } | null;
    setInitialLogTimes: (times: { start?: number; end?: number } | null) => void;

    // Session Focus Detail
    focusDetailSessionId: string | null;
    setFocusDetailSessionId: (id: string | null) => void;

    // Global Date State
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
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
        // Handle Index Page Preference
        if (view === AppView.TAGS) {
            if (defaultIndexView === 'SCOPE' && currentView !== AppView.SCOPE) {
                setCurrentView(AppView.SCOPE);
                return;
            }
        }

        // Handle Archive Page Preference (Reset to default on entry)
        if (view === AppView.REVIEW) {
            setIsJournalMode(defaultArchiveView === 'MEMOIR');
        }

        setCurrentView(view);
    };

    // 模态框状态
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAutoLinkOpen, setIsAutoLinkOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isStatsFullScreen, setIsStatsFullScreen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
    const [isTodoManaging, setIsTodoManaging] = useState(false);
    const [isGoalEditorOpen, setIsGoalEditorOpen] = useState(false);
    const [isTagsManaging, setIsTagsManaging] = useState(false);
    const [isScopeManaging, setIsScopeManaging] = useState(false);

    // Review 模态框
    const [isDailyReviewOpen, setIsDailyReviewOpen] = useState(false);
    const [isWeeklyReviewOpen, setIsWeeklyReviewOpen] = useState(false);
    const [isMonthlyReviewOpen, setIsMonthlyReviewOpen] = useState(false);

    // 档案页面模式切换
    const [isJournalMode, setIsJournalMode] = useState(() => defaultArchiveView === 'MEMOIR');

    // Update isJournalMode if defaultArchiveView changes (optional, but good for immediate feedback if settings changed while in view)
    // Actually, let's NOT auto-switch if user is already looking at it, only on entry (handled above).
    // But we should ensure initial state is correct.

    // 导航选择状态
    const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedScopeId, setSelectedScopeId] = useState<string | null>(null);

    // 编辑状态
    const [editingLog, setEditingLog] = useState<Log | null>(null);
    const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

    // Review 编辑状态
    const [currentReviewDate, setCurrentReviewDate] = useState<Date | null>(null);
    const [currentWeeklyReviewStart, setCurrentWeeklyReviewStart] = useState<Date | null>(null);
    const [currentWeeklyReviewEnd, setCurrentWeeklyReviewEnd] = useState<Date | null>(null);
    const [currentMonthlyReviewStart, setCurrentMonthlyReviewStart] = useState<Date | null>(null);
    const [currentMonthlyReviewEnd, setCurrentMonthlyReviewEnd] = useState<Date | null>(null);

    // 其他导航状态
    const [returnToSearch, setReturnToSearch] = useState(false);
    const [isOpenedFromSearch, setIsOpenedFromSearch] = useState(false);
    const [isSearchOpenedFromSettings, setIsSearchOpenedFromSettings] = useState(false);
    const [statsTitle, setStatsTitle] = useState<string>('数据统计');
    const [todoCategoryToAdd, setTodoCategoryToAdd] = useState<string>(
        initialTodoCategory || 'work'
    );
    const [goalScopeId, setGoalScopeId] = useState<string>('');
    const [initialLogTimes, setInitialLogTimes] = useState<{ start?: number; end?: number } | null>(null);

    const [focusDetailSessionId, setFocusDetailSessionId] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState<Date>(new Date());

    return (
        <NavigationContext.Provider value={{
            currentView,
            setCurrentView: handleSetCurrentView,
            isSettingsOpen,
            setIsSettingsOpen,
            isAutoLinkOpen,
            setIsAutoLinkOpen,
            isSearchOpen,
            setIsSearchOpen,
            isStatsFullScreen,
            setIsStatsFullScreen,
            isAddModalOpen,
            setIsAddModalOpen,
            isTodoModalOpen,
            setIsTodoModalOpen,
            isTodoManaging,
            setIsTodoManaging,
            isGoalEditorOpen,
            setIsGoalEditorOpen,
            isTagsManaging,
            setIsTagsManaging,
            isScopeManaging,
            setIsScopeManaging,
            isDailyReviewOpen,
            setIsDailyReviewOpen,
            isWeeklyReviewOpen,
            setIsWeeklyReviewOpen,
            isMonthlyReviewOpen,
            setIsMonthlyReviewOpen,
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
            todoCategoryToAdd,
            setTodoCategoryToAdd,
            goalScopeId,
            setGoalScopeId,
            initialLogTimes,
            setInitialLogTimes,
            focusDetailSessionId,
            setFocusDetailSessionId,
            currentDate,
            setCurrentDate
        }}>
            {children}
        </NavigationContext.Provider>
    );
};
