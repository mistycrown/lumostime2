/**
 * @file useAIBackfillChatResultNavigation.ts
 * @input AI result target ids/dates, local data, and navigation context setters
 * @output Result-card handlers for opening logs, todos, reviews, and newspapers
 * @pos Component Support (AI Integration)
 * @description Keeps result-card navigation and desktop-widget forwarding out of the main chat modal.
 * @updated 2026-09-22: Extracted result navigation handlers from AIBackfillChatModal.
 */
import { AppView, type Log, type TodoItem } from '../../types';

export interface AIBackfillChatResultNavigationOptions {
  addToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  isDesktopWidgetMode: boolean;
  logs: Log[];
  onClose: () => void;
  onOpenMainApp?: () => void;
  onRequestReturnToAI?: () => void;
  setCurrentDailyNewspaperDate: (date: Date | null) => void;
  setCurrentDailyReviewInitialTab: (tab: 'check' | 'data' | 'guide' | 'narrative' | null) => void;
  setCurrentMonthlyNewspaperStart: (date: Date | null) => void;
  setCurrentMonthlyNewspaperEnd: (date: Date | null) => void;
  setCurrentMonthlyReviewInitialTab: (tab: 'data' | 'guide' | 'narrative' | 'cite' | null) => void;
  setCurrentMonthlyReviewStart: (date: Date | null) => void;
  setCurrentMonthlyReviewEnd: (date: Date | null) => void;
  setCurrentReviewDate: (date: Date | null) => void;
  setCurrentView: (view: AppView) => void;
  setCurrentWeeklyNewspaperStart: (date: Date | null) => void;
  setCurrentWeeklyNewspaperEnd: (date: Date | null) => void;
  setCurrentWeeklyReviewInitialTab: (tab: 'data' | 'guide' | 'narrative' | null) => void;
  setCurrentWeeklyReviewStart: (date: Date | null) => void;
  setCurrentWeeklyReviewEnd: (date: Date | null) => void;
  setEditingLog: (log: Log | null) => void;
  setEditingTodo: (todo: TodoItem | null) => void;
  setInitialLogTimes: (times: {
    start?: number;
    end?: number;
    prefilledData?: {
      categoryId?: string;
      activityId?: string;
      linkedTodoId?: string;
    };
  } | null) => void;
  setIsAddModalOpen: (open: boolean) => void;
  setIsDailyNewspaperOpen: (open: boolean) => void;
  setIsDailyReviewOpen: (open: boolean) => void;
  setIsMonthlyNewspaperOpen: (open: boolean) => void;
  setIsMonthlyReviewOpen: (open: boolean) => void;
  setIsTodoModalOpen: (open: boolean) => void;
  setIsWeeklyNewspaperOpen: (open: boolean) => void;
  setIsWeeklyReviewOpen: (open: boolean) => void;
  setNewTodoDraft: (draft: Partial<TodoItem> | null) => void;
  setTodoCategoryToAdd: (id: string) => void;
  todos: TodoItem[];
}

export const useAIBackfillChatResultNavigation = ({
  addToast,
  isDesktopWidgetMode,
  logs,
  onClose,
  onOpenMainApp,
  onRequestReturnToAI,
  setCurrentDailyNewspaperDate,
  setCurrentDailyReviewInitialTab,
  setCurrentMonthlyNewspaperStart,
  setCurrentMonthlyNewspaperEnd,
  setCurrentMonthlyReviewInitialTab,
  setCurrentMonthlyReviewStart,
  setCurrentMonthlyReviewEnd,
  setCurrentReviewDate,
  setCurrentView,
  setCurrentWeeklyNewspaperStart,
  setCurrentWeeklyNewspaperEnd,
  setCurrentWeeklyReviewInitialTab,
  setCurrentWeeklyReviewStart,
  setCurrentWeeklyReviewEnd,
  setEditingLog,
  setEditingTodo,
  setInitialLogTimes,
  setIsAddModalOpen,
  setIsDailyNewspaperOpen,
  setIsDailyReviewOpen,
  setIsMonthlyNewspaperOpen,
  setIsMonthlyReviewOpen,
  setIsTodoModalOpen,
  setIsWeeklyNewspaperOpen,
  setIsWeeklyReviewOpen,
  setNewTodoDraft,
  setTodoCategoryToAdd,
  todos
}: AIBackfillChatResultNavigationOptions) => {
    const handleOpenLogEditor = (logId?: string) => {
      if (!logId) {
        return;
      }
  
      if (isDesktopWidgetMode) {
        onOpenMainApp?.();
        return;
      }
  
      const liveLog = logs.find((log) => log.id === logId);
      if (!liveLog) {
        addToast('info', '这条记录已经不存在了。');
        return;
      }
  
      setEditingLog(liveLog);
      setInitialLogTimes(null);
      setIsAddModalOpen(true);
    };
  
    const handleOpenTodoDetail = (todoId?: string) => {
      if (!todoId) {
        return;
      }
  
      if (isDesktopWidgetMode) {
        onOpenMainApp?.();
        window.desktopWidget?.requestMainAction({
          type: 'open_todo',
          todoId
        });
        return;
      }
  
      const liveTodo = todos.find((todo) => todo.id === todoId);
      if (!liveTodo) {
        addToast('info', '这条待办已经不存在了。');
        return;
      }
  
      setEditingTodo(liveTodo);
      setTodoCategoryToAdd(liveTodo.categoryId);
      setNewTodoDraft(null);
      setIsTodoModalOpen(true);
    };
  
    const handleOpenWeeklyReviewNarrative = (weekStartDate: string, weekEndDate: string) => {
      if (isDesktopWidgetMode) {
        onOpenMainApp?.();
        return;
      }
  
      const weekStart = new Date(`${weekStartDate}T12:00:00`);
      const weekEnd = new Date(`${weekEndDate}T12:00:00`);
      if (Number.isNaN(weekStart.getTime()) || Number.isNaN(weekEnd.getTime())) {
        addToast('info', '这个周回顾的日期范围无效。');
        return;
      }
  
      setCurrentView(AppView.REVIEW);
      setCurrentWeeklyReviewInitialTab('narrative');
      setCurrentWeeklyReviewStart(weekStart);
      setCurrentWeeklyReviewEnd(weekEnd);
      setIsWeeklyReviewOpen(true);
      onClose();
    };
  
    const handleOpenDailyReviewNarrative = (date: string) => {
      if (isDesktopWidgetMode) {
        onOpenMainApp?.();
        return;
      }
  
      const reviewDate = new Date(`${date}T12:00:00`);
      if (Number.isNaN(reviewDate.getTime())) {
        addToast('info', '这个日报日期无效。');
        return;
      }
  
      setCurrentView(AppView.REVIEW);
      setCurrentReviewDate(reviewDate);
      setCurrentDailyReviewInitialTab('narrative');
      setIsDailyReviewOpen(true);
      onClose();
    };
  
    const handleOpenDailyNewspaper = (date: string) => {
      if (isDesktopWidgetMode) {
        onOpenMainApp?.();
        return;
      }
  
      const reviewDate = new Date(`${date}T12:00:00`);
      if (Number.isNaN(reviewDate.getTime())) {
        addToast('info', '这个小报日期无效。');
        return;
      }
  
      setCurrentView(AppView.REVIEW);
      setCurrentDailyNewspaperDate(reviewDate);
      setIsDailyNewspaperOpen(true);
      onRequestReturnToAI?.();
      onClose();
    };
  
    const handleOpenWeeklyNewspaper = (weekStartDate: string, weekEndDate: string) => {
      if (isDesktopWidgetMode) {
        onOpenMainApp?.();
        return;
      }
  
      const weekStart = new Date(`${weekStartDate}T12:00:00`);
      const weekEnd = new Date(`${weekEndDate}T12:00:00`);
      if (Number.isNaN(weekStart.getTime()) || Number.isNaN(weekEnd.getTime())) {
        addToast('info', '这个周小报的日期范围无效。');
        return;
      }
  
      setCurrentView(AppView.REVIEW);
      setCurrentWeeklyNewspaperStart(weekStart);
      setCurrentWeeklyNewspaperEnd(weekEnd);
      setIsWeeklyNewspaperOpen(true);
      onRequestReturnToAI?.();
      onClose();
    };
  
    const handleOpenMonthlyReviewNarrative = (monthStartDate: string, monthEndDate: string) => {
      if (isDesktopWidgetMode) {
        onOpenMainApp?.();
        return;
      }
  
      const monthStart = new Date(`${monthStartDate}T12:00:00`);
      const monthEnd = new Date(`${monthEndDate}T12:00:00`);
      if (Number.isNaN(monthStart.getTime()) || Number.isNaN(monthEnd.getTime())) {
        addToast('info', '这个月回顾的日期范围无效。');
        return;
      }
  
      setCurrentView(AppView.REVIEW);
      setCurrentMonthlyReviewInitialTab('narrative');
      setCurrentMonthlyReviewStart(monthStart);
      setCurrentMonthlyReviewEnd(monthEnd);
      setIsMonthlyReviewOpen(true);
      onClose();
    };
  
    const handleOpenMonthlyNewspaper = (monthStartDate: string, monthEndDate: string) => {
      if (isDesktopWidgetMode) {
        onOpenMainApp?.();
        return;
      }
  
      const monthStart = new Date(`${monthStartDate}T12:00:00`);
      const monthEnd = new Date(`${monthEndDate}T12:00:00`);
      if (Number.isNaN(monthStart.getTime()) || Number.isNaN(monthEnd.getTime())) {
        addToast('info', '这个月小报的日期范围无效。');
        return;
      }
  
      setCurrentView(AppView.REVIEW);
      setCurrentMonthlyNewspaperStart(monthStart);
      setCurrentMonthlyNewspaperEnd(monthEnd);
      setIsMonthlyNewspaperOpen(true);
      onRequestReturnToAI?.();
      onClose();
    };
  return {
    handleOpenDailyNewspaper,
    handleOpenDailyReviewNarrative,
    handleOpenLogEditor,
    handleOpenMonthlyNewspaper,
    handleOpenMonthlyReviewNarrative,
    handleOpenTodoDetail,
    handleOpenWeeklyNewspaper,
    handleOpenWeeklyReviewNarrative
  };
};
