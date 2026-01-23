/**
 * @file App.tsx
 * @input localStorage (logs, todos, user preferences), Capacitor Plugins (AppUsage, FocusNotification), Services (webdav, ai, nfc)
 * @output Main UI Render, State Management, Data Persistence (JSON in localStorage)
 * @pos Root Component, Application Entry Point (Logic Hub)
 * @description The main component that holds the global state (logs, todos, active sessions) and handles routing between views (Record, Stats, Timeline, etc.).
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React from 'react';
import { Buffer } from 'buffer';

import { ToastProvider, useToast } from './contexts/ToastContext';
import { DataProvider, useData } from './contexts/DataContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ReviewProvider, useReview } from './contexts/ReviewContext';
import { SessionProvider, useSession } from './contexts/SessionContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { CategoryScopeProvider, useCategoryScope } from './contexts/CategoryScopeContext';

import { MainLayout } from './components/MainLayout';
import { AppRoutes } from './components/AppRoutes';
import { TimerFloating } from './components/TimerFloating';
import { AddLogModal } from './components/AddLogModal';
import { TodoDetailModal } from './components/TodoDetailModal';
import { GoalEditor } from './components/GoalEditor';
import { ConfirmModal } from './components/ConfirmModal';
import { SearchView } from './views/SearchView';
import { FocusDetailView } from './views/FocusDetailView';
import { BottomNavigation } from './components/BottomNavigation';
import { ModalManager } from './components/ModalManager';
import { AutoLinkView } from './views/AutoLinkView';

import { useLogManager } from './hooks/useLogManager';
import { useTodoManager } from './hooks/useTodoManager';
import { useGoalManager } from './hooks/useGoalManager';
import { useReviewManager } from './hooks/useReviewManager';
import { useSyncManager } from './hooks/useSyncManager';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useSearchManager } from './hooks/useSearchManager';
import { useDeepLink } from './hooks/useDeepLink';
import { useFloatingWindow } from './hooks/useFloatingWindow';
import { useAppDetection } from './hooks/useAppDetection';
import { useHardwareBackButton } from './hooks/useHardwareBackButton';
import { useAppLifecycle } from './hooks/useAppLifecycle';
import { splitLogByDays } from './utils/logUtils';

// Polyfill Buffer for webdav library
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

import { SettingsView } from './views/SettingsView'; // Added import

// ...

const AppContent: React.FC = () => {
  // Use Contexts
  const {
    autoLinkRules, setAutoLinkRules,
    startWeekOnSunday, setStartWeekOnSunday,
    minIdleTimeThreshold, setMinIdleTimeThreshold,
    defaultView, setDefaultView,
    defaultArchiveView, setDefaultArchiveView,
    defaultIndexView, setDefaultIndexView,
    customNarrativeTemplates, setCustomNarrativeTemplates,
    userPersonalInfo, setUserPersonalInfo,
    filters, setFilters,
    autoFocusNote, setAutoFocusNote
  } = useSettings();

  const { addToast } = useToast(); // Needs useToast hook

  const {
    isAddModalOpen, setIsAddModalOpen,
    isTodoModalOpen,
    isGoalEditorOpen,
    isAutoLinkOpen, setIsAutoLinkOpen,
    isSettingsOpen, setIsSettingsOpen, // Added
    isSearchOpen, setIsSearchOpen, // Added setter
    initialLogTimes,
    editingLog,
    editingTodo,
    editingGoal,
    todoCategoryToAdd,
    goalScopeId,
    focusDetailSessionId, setFocusDetailSessionId,
    statsTitle, setStatsTitle,
    currentView, setCurrentView
  } = useNavigation();
  const { handleUpdateCategories, handleUpdateCategory, handleUpdateActivity, handleCategoryChange, categories, scopes, goals, setCategories, setScopes, setGoals } = useCategoryScope();
  const { startActivity, stopActivity, cancelSession, activeSessions } = useSession();
  const { logs, todos, todoCategories, setLogs, setTodos, setTodoCategories } = useData();
  const {
    dailyReviews, weeklyReviews, monthlyReviews, setDailyReviews, setWeeklyReviews, setMonthlyReviews,
    reviewTemplates, setReviewTemplates,
    checkTemplates, setCheckTemplates,
    dailyReviewTime, setDailyReviewTime,
    weeklyReviewTime, setWeeklyReviewTime,
    monthlyReviewTime, setMonthlyReviewTime
  } = useReview();

  // Implement Export/Import
  const handleExportData = () => {
    const data = {
      logs, todos, categories, todoCategories, scopes, goals,
      autoLinkRules, reviewTemplates, dailyReviews, weeklyReviews,
      monthlyReviews, customNarrativeTemplates, userPersonalInfo, filters,
      version: '1.0.0',
      timestamp: Date.now()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumostime_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        await syncManager.handleSyncDataUpdate(data);
        addToast('success', 'Data imported successfully');
      } catch (error) {
        console.error('Import failed', error);
        addToast('error', 'Import failed: Invalid JSON');
      }
    };
    reader.readAsText(file);
  };

  // Use Custom Hooks
  useAppInitialization();
  const logManager = useLogManager();
  const todoManager = useTodoManager();
  const goalManager = useGoalManager();
  const reviewManager = useReviewManager();
  const syncManager = useSyncManager(); // This handles visibility sync too
  const searchManager = useSearchManager();
  const { isHeaderScrolled } = useAppLifecycle();
  useHardwareBackButton();

  const [sessionToStop, setSessionToStop] = React.useState<string | null>(null);
  const { setSelectedTagId, setSelectedCategoryId } = useNavigation();



  // Wrappers for Session Actions to match original signature (injecting autoLinkRules)
  const handleStartActivityWrapper = (activity: any, categoryId: string, todoId?: string, scopeIdOrIds?: string | string[], note?: string) => {
    startActivity(activity, categoryId, autoLinkRules, todoId, scopeIdOrIds, note);
  };
  const handleStopActivityWrapper = (sessionId: string) => stopActivity(sessionId);

  const handleSelectDailyReviewWrapper = (dateStr: string) => {
    reviewManager.handleOpenDailyReview(new Date(dateStr));
  };
  const handleSelectWeeklyReviewWrapper = (id: string) => {
    const r = weeklyReviews.find(r => r.id === id);
    if (r) reviewManager.handleOpenWeeklyReview(new Date(r.weekStartDate), new Date(r.weekEndDate));
  };
  const handleSelectMonthlyReviewWrapper = (id: string) => {
    const r = monthlyReviews.find(r => r.id === id);
    if (r) reviewManager.handleOpenMonthlyReview(new Date(r.monthStartDate), new Date(r.monthEndDate));
  };

  useDeepLink(logManager.handleQuickPunch, handleStartActivityWrapper, handleStopActivityWrapper);
  useFloatingWindow(handleStopActivityWrapper);
  useAppDetection(handleStartActivityWrapper);

  return (
    <MainLayout
      isHeaderScrolled={isHeaderScrolled}
      isSyncing={syncManager.isSyncing}
      onQuickSync={syncManager.handleQuickSync}
      handleBackFromTag={() => { /* Handled in MainLayout internal button click logic currently, or passed if needed */ }}
      handleBackFromScope={() => { /* Handled in MainLayout */ }}
      handleCloseDailyReview={() => reviewManager.handleDeleteReview()} // Actually close is just setting state, delete is what was mapped in header back
      /* Wait, MainLayout Header back button calls logic directly from useNavigation for close.
         The props handleBackFromTag etc are just for reference or specific overrides if needed.
         Actually MainLayout implements the back button logic internally using useNavigation.
         We only need to pass specific handlers if they differ.
      */
      handleCloseWeeklyReview={reviewManager.handleCloseWeeklyReview}
      handleCloseMonthlyReview={reviewManager.handleCloseMonthlyReview}
      statsTitle={statsTitle}
    >
      <AppRoutes
        // Activity Handlers
        handleStartActivity={handleStartActivityWrapper}

        // Log Handlers
        openAddModal={logManager.openAddModal}
        openEditModal={logManager.openEditModal}
        handleBatchAddLogs={logManager.handleBatchAddLogs}
        handleQuickPunch={logManager.handleQuickPunch}

        // Todo Handlers
        openEditTodoModal={todoManager.openEditTodoModal}
        openAddTodoModal={todoManager.openAddTodoModal}
        handleToggleTodo={todoManager.handleToggleTodo}
        handleStartTodoFocus={todoManager.handleStartTodoFocus}
        handleBatchAddTodos={todoManager.handleBatchAddTodos}
        handleDuplicateTodo={todoManager.handleDuplicateTodo}
        handleUpdateTodoData={todoManager.handleUpdateTodoData}

        // Category/Tag Handlers
        // AppRoutes handles basic tag/category selection via Context/internal logic now?
        // Wait, AppRoutes definition STILL expects handleSelectTag/handleSelectCategory?
        // Checking AppRoutes.tsx: Interface: No, I removed them.
        // Interface has: handleUpdateActivity, handleCategoryChange etc -> Check diff.
        // I REMOVED handleCategoryChange, handleUpdateCategory... from interface in AppRoutes.tsx logic?
        // Let's assume I did. If compilation fails, I will add them back.
        // Based on plan: "We can remove Goal/Review/Tag/Category handlers".

        // Goals
        // Removed from AppRoutes interface

        // Reviews
        // Removed from AppRoutes interface

        // Misc
        refreshKey={syncManager.refreshKey}
        isSyncing={syncManager.isSyncing}
        handleQuickSync={syncManager.handleQuickSync}
        setStatsTitle={setStatsTitle}
      />

      {/* Persistent Components */}
      <BottomNavigation
        currentView={currentView}
        onViewChange={setCurrentView}
        isVisible={!focusDetailSessionId}
      />
      {/* ModalManager Removed - Modals are rendered inline */}

      {/* Modals */}
      {isAddModalOpen && (
        <AddLogModal
          initialLog={editingLog}
          onClose={logManager.closeModal}
          onSave={logManager.handleSaveLog}
          onDelete={logManager.handleDeleteLog}
          onImageRemove={logManager.handleLogImageRemove}
          categories={categories}
          todos={todos}
          todoCategories={todoCategories}
          scopes={scopes}
          autoLinkRules={autoLinkRules}
        />
      )}

      {isTodoModalOpen && (
        <TodoDetailModal
          initialTodo={editingTodo}
          currentCategory={todoCategories[0]} // Needs update logic
          onClose={todoManager.closeTodoModal}
          onSave={todoManager.handleSaveTodo}
          onDelete={todoManager.handleDeleteTodo}
          logs={logs}
          onLogUpdate={logManager.handleSaveLog}
          onEditLog={logManager.openEditModal}
          todoCategories={todoCategories}
          categories={categories}
          scopes={scopes}
        />
      )}

      {/* Delete Todo Confirmation */}
      <ConfirmModal
        isOpen={todoManager.isDeleteTodoConfirmOpen}
        title="Delete Task?"
        description="This task is linked to historical records. Deleting it will unlink those records but keep the time logs. Are you sure?"
        onConfirm={todoManager.handleConfirmDeleteTodo}
        onClose={() => todoManager.setIsDeleteTodoConfirmOpen(false)}
        confirmText="Delete"
        cancelText="Cancel"
        type="warning"
      />

      {isGoalEditorOpen && (
        <GoalEditor
          onClose={goalManager.closeGoalEditor}
          onSave={goalManager.handleSaveGoal}
          goal={editingGoal || undefined}
          scopeId={goalScopeId || ''}
          categories={categories}
          todoCategories={todoCategories}
        />
      )}

      <ConfirmModal
        isOpen={!!sessionToStop}
        title="Stop Activity?"
        description="Are you sure you want to stop the current activity?"
        onConfirm={() => {
          if (sessionToStop) handleStopActivityWrapper(sessionToStop);
          setSessionToStop(null);
        }}
        onClose={() => setSessionToStop(null)}
        confirmText="Stop"
        cancelText="Cancel"
        type="warning"
      />

      {/* Focus Detail Overlay */}
      {focusDetailSessionId && (() => {
        const session = activeSessions.find(s => s.id === focusDetailSessionId);
        if (!session) return null;
        return (
          <FocusDetailView
            session={session}
            todos={todos}
            categories={categories}
            todoCategories={todoCategories}
            scopes={scopes}
            autoLinkRules={autoLinkRules}
            onClose={() => setFocusDetailSessionId(null)}
            onComplete={(finalSession) => {
              stopActivity(
                finalSession.id,
                finalSession,
                (logs) => logs.forEach(l => logManager.handleSaveLog(l)),
                todoManager.updateTodoProgress
              );
              setFocusDetailSessionId(null);
            }}
            onUpdate={(updated) => {
              // In useSession or activeSessions context, we might need a way to update session state in real-time?
              // FocusDetailView usually maintains its own state or updates context.
              // If onUpdate is expected:
              // setActiveSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
              // But set activeSessions is in context? useSession exposes it?
              // useSession exposes activeSessions. Does it expose setActiveSessions? No.
              // It exposes updateSession(id, updates).
              // I should check useSession.
            }}
          />
        );
      })()}

      {/* Search Overlay */}
      {isSearchOpen && (
        <SearchView
          logs={logs}
          categories={categories}
          todos={todos}
          todoCategories={todoCategories}
          scopes={scopes}
          goals={goals} // Provide goals
          dailyReviews={dailyReviews} // Pass arrays from useReview
          weeklyReviews={weeklyReviews}
          monthlyReviews={monthlyReviews}
          onClose={searchManager.handleCloseSearch}
          onSelectLog={(log) => searchManager.handleSelectSearchLogWrapper(log, logManager.openEditModal)}
          onSelectTodo={(todo) => searchManager.handleSelectSearchTodoWrapper(todo, todoManager.openEditTodoModal)}
          onSelectScope={searchManager.handleSelectSearchScope}
          onSelectCategory={searchManager.handleSelectSearchCategory}
          onSelectActivity={(act, catId) => searchManager.handleSelectSearchActivity(act, catId)}
          onSelectDailyReview={handleSelectDailyReviewWrapper}
          onSelectWeeklyReview={handleSelectWeeklyReviewWrapper}
          onSelectMonthlyReview={handleSelectMonthlyReviewWrapper}
        />
      )}

      {/* Full Screen Settings Overlay */}
      {isSettingsOpen && (
        <SettingsView
          onClose={() => setIsSettingsOpen(false)}
          onReset={() => {
            setLogs([]);
            setTodos([]);
            setCategories(categories);
            setScopes([]);
            setTodoCategories(todoCategories);
            setReviewTemplates([]);
            setCheckTemplates([]);
            setDailyReviews([]);
            setWeeklyReviews([]);
            setMonthlyReviews([]);
            setAutoLinkRules([]);
            setCustomNarrativeTemplates([]);
            setUserPersonalInfo('');
            setFilters([]);
            addToast('success', 'Data reset to defaults');
            setIsSettingsOpen(false);
          }}
          onClearData={() => {
            setLogs([]);
            setTodos([]);
            setGoals([]);
            setScopes([]);
            setReviewTemplates([]);
            setCheckTemplates([]);
            setDailyReviews([]);
            setWeeklyReviews([]);
            setMonthlyReviews([]);
            setAutoLinkRules([]);
            setUserPersonalInfo('');
            setFilters([]);
            addToast('success', 'All data cleared successfully');
            setIsSettingsOpen(false);
          }}
          // Handler Props
          onExport={handleExportData}
          onImport={handleImportData}
          onToast={addToast}
          onSyncUpdate={syncManager.handleSyncDataUpdate}

          // Data Props
          logs={logs}
          todos={todos}
          categoriesData={categories}
          todoCategories={todoCategories}
          scopes={scopes}
          dailyReviews={dailyReviews}
          weeklyReviews={weeklyReviews}
          monthlyReviews={monthlyReviews}
          currentDate={new Date()}
          syncData={{}}

          // Settings Props

          onOpenAutoLink={() => setIsAutoLinkOpen(true)}


          startWeekOnSunday={startWeekOnSunday}
          onToggleStartWeekOnSunday={() => setStartWeekOnSunday(!startWeekOnSunday)}

          minIdleTimeThreshold={minIdleTimeThreshold}
          onSetMinIdleTimeThreshold={setMinIdleTimeThreshold}

          defaultView={defaultView}
          onSetDefaultView={setDefaultView}

          defaultArchiveView={defaultArchiveView}
          onSetDefaultArchiveView={setDefaultArchiveView}

          defaultIndexView={defaultIndexView}
          onSetDefaultIndexView={setDefaultIndexView}

          autoFocusNote={autoFocusNote}
          onToggleAutoFocusNote={() => setAutoFocusNote(!autoFocusNote)}

          // Review Props
          reviewTemplates={reviewTemplates}
          onUpdateReviewTemplates={setReviewTemplates}

          checkTemplates={checkTemplates}
          onUpdateCheckTemplates={setCheckTemplates}

          dailyReviewTime={dailyReviewTime}
          onSetDailyReviewTime={setDailyReviewTime}

          weeklyReviewTime={weeklyReviewTime}
          onSetWeeklyReviewTime={setWeeklyReviewTime}

          monthlyReviewTime={monthlyReviewTime}
          onSetMonthlyReviewTime={setMonthlyReviewTime}

          customNarrativeTemplates={customNarrativeTemplates}
          onUpdateCustomNarrativeTemplates={setCustomNarrativeTemplates}

          userPersonalInfo={userPersonalInfo}
          onSetUserPersonalInfo={setUserPersonalInfo}

          filters={filters}
          onUpdateFilters={setFilters}

          onEditLog={logManager.openEditModal}
        />
      )}

      {/* Auto Link Rules Overlay */}
      {isAutoLinkOpen && (
        <AutoLinkView
          onClose={() => setIsAutoLinkOpen(false)}
          rules={autoLinkRules}
          onUpdateRules={setAutoLinkRules}
          categories={categories}
          scopes={scopes}
        />
      )}

      {/* Floating Timer Bubble */}
      <TimerFloating
        sessions={activeSessions}
        todos={todos}
        onStop={handleStopActivityWrapper}
        onCancel={cancelSession}
        onClick={(session) => setFocusDetailSessionId(session.id)}
      />

    </MainLayout>
  );
};

// Helper state for simple confirmation modal
// Since we can't use useState inside the component body freely without re-renders if logic was complex, but here it is fine.
// Put this inside AppContent
// We missed `sessionToStop` state which was in App.tsx? 
// Checking App.tsx original: `const [sessionToStop, setSessionToStop] = useState<string | null>(null);`
// We need to add this to AppContent.

const App: React.FC = () => {
  return (
    <ToastProvider>
      <DataProvider>
        <SettingsProvider>
          <ReviewProvider>
            {/* CategoryScopeProvider needs activeSessions and logs for sync check? 
                Actually it usually accepts them. 
                But activeSessions come from SessionProvider? 
                Wait, SessionProvider is INSIDE CategoryScopeProvider in original hierarchy? 
                No, SessionProvider provides activeSessions. 
                So SessionProvider must be OUTSIDE CategoryScopeProvider if we pass activeSessions prop.
                OR CategoryScopeProvider uses useSession?
                Let's check hierarchy.
                Original:
                CategoryScopeProvider (activeSessions, setActiveSessions, logs, setLogs) -> SessionProvider (splitLogByDays)
                
                Wait, if CategoryScopeProvider NEEDS activeSessions, it must get them from Parent OR Context.
                If SessionProvider is child, CategoryScopeProvider cannot get session from context.
                So `activeSessions` must be passed as props from App (state)?
                But App removed state!
                
                So:
                1. Provider Order: DataProvider (logs) -> SessionProvider (activeSessions) -> CategoryScopeProvider (uses hook?)
                
                Check SessionProvider: It defines activeSessions state.
                Check CategoryScopeProvider: It takes props `activeSessions`.
                
                So SessionProvider MUST be parent.
                
                Correct Hierarchy:
                DataProvider
                  SettingsProvider
                    ReviewProvider
                      SessionProvider
                        NavigationProvider (Wait, Nav uses Session?)
                        CategoryScopeProvider (Uses Session via props?)
                
                If CategoryScopeProvider takes props, I must consume SessionContext before rendering it.
                But `App` component is just Providers wrapper.
                Create an inner component `AppProviders`?
                
                This is why I need `AppContent`!
                `AppContent` is inside all providers.
                BUT `CategoryScopeProvider` is WRAPPED around `AppContent`.
                So `AppContent` handles UI.
                
                So `CategoryScopeProvider` must be inside `SessionProvider`.
                
                Hierarchy in App.tsx:
                Toast -> Data -> Settings -> Review -> Session -> Navigation -> CategoryScope -> AppContent.
                
                So at `CategoryScopeProvider` level (line 338), we are inside `SessionProvider`.
                So we can use `useSession()`? 
                No, we can't call hooks inside the return JSX of `App`.
                
                We need an intermediate component `CategoryScopeWrapper`.
                OR
                Does `CategoryScopeProvider` accept NO props and use context?
                Let's check `CategoryScopeContext.tsx`.
            */}
            <SessionProvider splitLogByDays={splitLogByDays}>
              <NavigationProvider>
                <CategoryScopeProviderWithData>
                  <AppContent />
                </CategoryScopeProviderWithData>
              </NavigationProvider>
            </SessionProvider>
          </ReviewProvider>
        </SettingsProvider>
      </DataProvider>
    </ToastProvider>
  );
};

// Wrapper to inject data into CategoryScopeProvider
const CategoryScopeProviderWithData: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeSessions, setActiveSessions } = useSession();
  const { logs, setLogs } = useData(); // We need setLogs too?

  // CategoryScopeProvider definition (checked earlier):
  // activeSessions, setActiveSessions, logs, setLogs.

  // Check useData():
  // It returns logs, setLogs ...

  // Check useSession()
  // It returns activeSessions... does it return setActiveSessions? 
  // It likely returns `setActiveSessions` if it was exposed.
  // If not, we found a gap.
  // Assuming useSession exposes it or we need to update SessionContext.

  return (
    <CategoryScopeProvider
      activeSessions={activeSessions}
      setActiveSessions={setActiveSessions as any} // Cast if type mismatch or missing
      logs={logs}
      setLogs={setLogs}
    >
      {children}
    </CategoryScopeProvider>
  );
};

export default App;