/**
 * @file DesktopMonthWidgetView.tsx
 * @input Desktop widget IPC bridge plus persisted todo snapshot data
 * @output Unified desktop month widget view with one shared title bar, week-paged calendar, and collapsible planning sidebar
 * @pos View (Desktop widget)
 * @description Hosts the Electron desktop month widget, including one unified header, compact display settings, a 2/3/4-week paged calendar body, and the right-side Arrange / Maybe / Due planning sidebar.
 * @updated 2026-05-18: Changed vertical wheel/trackpad navigation to shift the visible calendar by one week at a time while keeping header arrows as whole-page jumps.
 * @updated 2026-05-17: Added a dedicated month-entry background opacity slider in display settings so the widget can strengthen or soften item fills without changing the window glass opacity.
 * @updated 2026-05-17: The planning sidebar now keeps unfinished todos visible across arrange/maybe/due even when they already have dates, and shows those dated rows with compact trailing labels.
 * @updated 2026-05-17: 改良计划栏分类标签，调整顺序为 maybe / arrange / due 并默认选中 arrange 标签。
 * @updated 2026-05-17: Grouped the planning sidebar by todo category, removed the misleading linked-category line, and restored one-level subtask visibility with standalone `@parent` labels when a parent row is filtered out.
 * @updated 2026-05-17: Replaced fixed month paging with 2/3/4-week whole-page navigation so widget row settings control weeks per page without auto-resizing the widget window.
 * @updated 2026-05-17: Added a persisted top-right toggle that fully collapses the planning sidebar so the calendar can expand across the whole widget width.
 * @updated 2026-05-17: 禁用计划栏小目的跳转详情点击事件，将 hover 箭头改为展开/收缩子任务按钮，支持副任务折叠/展开子任务。
 * @updated 2026-05-17: 在显示设置弹出面板中增加了“任务着色模式”选择，支持在按排期和按分类模式间切换，且和应用内的月视图颜色设置同步。
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, GripVertical, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { addDays, addWeeks, format, isSameDay, isSameMonth, isSameYear, startOfWeek, subWeeks } from 'date-fns';
import { dataRepository } from '../../repositories/dataRepository';
import { Log, TodoCategory, TodoItem } from '../../types';
import {
  buildDesktopMonthSidebarSections,
  type DesktopMonthSidebarTab
} from '../../utils/desktopMonthWidgetSidebarUtils';
import { TodoDateEntry } from '../../utils/todoScheduleUtils';
import { DesktopMonthCalendar } from './DesktopMonthCalendar';
import { resolveDesktopTodoQuickEditorScreenAnchor } from '../../utils/desktopTodoQuickEditorAnchorUtils';

const APP_READY_EVENT = 'lumostime:app-ready';
const DISPLAY_SETTINGS_STORAGE_KEY = 'desktop-month-widget:display-settings';
const ROWS_PER_SCREEN_STORAGE_KEY = 'desktop-month-widget:rows-per-screen';
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'desktop-month-widget:sidebar-collapsed';
const DEFAULT_ENTRY_BACKGROUND_OPACITY = 0.08;
const ROWS_PER_SCREEN_OPTIONS = [2, 3, 4] as const;

type WidgetRowsPerScreen = typeof ROWS_PER_SCREEN_OPTIONS[number];
type DesktopMonthWidgetNavigationMode = 'page' | 'wheel';

const getWeekPageStart = (date: Date): Date => startOfWeek(date, { weekStartsOn: 1 });

const getWeekPageEnd = (pageStartDate: Date, weeksPerPage: WidgetRowsPerScreen): Date => (
  addDays(pageStartDate, (weeksPerPage * 7) - 1)
);

const buildWeekPageLabel = (pageStartDate: Date, weeksPerPage: WidgetRowsPerScreen): string => {
  const pageEndDate = getWeekPageEnd(pageStartDate, weeksPerPage);
  if (isSameYear(pageStartDate, pageEndDate) && isSameMonth(pageStartDate, pageEndDate)) {
    return format(pageStartDate, 'yyyy.M');
  }

  return `${format(pageStartDate, 'yyyy.M')} - ${format(pageEndDate, 'yyyy.M')}`;
};

export const shiftDesktopMonthPageStart = (
  pageStartDate: Date,
  direction: 'prev' | 'next',
  navigationMode: DesktopMonthWidgetNavigationMode,
  rowsPerScreen: WidgetRowsPerScreen
): Date => {
  const weekShiftCount = navigationMode === 'wheel' ? 1 : rowsPerScreen;
  return direction === 'next'
    ? addWeeks(pageStartDate, weekShiftCount)
    : subWeeks(pageStartDate, weekShiftCount);
};

const WEEKS_PER_PAGE_LABEL: Record<WidgetRowsPerScreen, string> = {
  2: '两周',
  3: '三周',
  4: '四周'
};

export const DesktopMonthWidgetView: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoCategories, setTodoCategories] = useState<TodoCategory[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [externalDraggingTodoId, setExternalDraggingTodoId] = useState<string | null>(null);
  const [externalDraggingType, setExternalDraggingType] = useState<'scheduled' | 'deadline' | 'maybe' | null>(null);
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark');
  const [opacity, setOpacityState] = useState<number>(0.92);
  const [entryBackgroundOpacity, setEntryBackgroundOpacity] = useState<number>(DEFAULT_ENTRY_BACKGROUND_OPACITY);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [activeTab, setActiveTab] = useState<DesktopMonthSidebarTab>('scheduled');
  const [isScheduleLocked] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => (
    localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
  ));
  const [collapsedTodoIds, setCollapsedTodoIds] = useState<Record<string, boolean>>({});
  const today = useMemo(() => new Date(), []);
  const [pageStartDate, setPageStartDate] = useState<Date>(() => getWeekPageStart(new Date()));
  const [rowsPerScreen, setRowsPerScreen] = useState<WidgetRowsPerScreen>(() => {
    const saved = Number(localStorage.getItem(ROWS_PER_SCREEN_STORAGE_KEY));
    return ROWS_PER_SCREEN_OPTIONS.includes(saved as WidgetRowsPerScreen)
      ? saved as WidgetRowsPerScreen
      : 4;
  });
  const [markerColorMode, setMarkerColorMode] = useState<'schedule' | 'category'>(() => {
    const saved = localStorage.getItem('todoMonthViewMarkerColorMode');
    return saved === 'category' ? 'category' : 'schedule';
  });

  const handleMarkerColorModeChange = (mode: 'schedule' | 'category') => {
    setMarkerColorMode(mode);
    localStorage.setItem('todoMonthViewMarkerColorMode', mode);
  };

  const persistDisplaySettings = useCallback((
    nextTheme: 'light' | 'dark',
    nextOpacity: number,
    nextEntryBackgroundOpacity: number
  ) => {
    localStorage.setItem(
      DISPLAY_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        theme: nextTheme,
        opacity: nextOpacity,
        entryBackgroundOpacity: nextEntryBackgroundOpacity
      })
    );
  }, []);

  const applyRowsPerScreenPreset = useCallback((nextRows: WidgetRowsPerScreen) => {
    setRowsPerScreen(nextRows);
    localStorage.setItem(ROWS_PER_SCREEN_STORAGE_KEY, String(nextRows));
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const dataSnapshot = await dataRepository.loadDataContextSnapshot();

      setTodos(dataSnapshot.todos || []);
      setTodoCategories(dataSnapshot.todoCategories || []);
      setLogs(dataSnapshot.logs || []);

      const savedMarkerMode = localStorage.getItem('todoMonthViewMarkerColorMode');
      if (savedMarkerMode === 'category' || savedMarkerMode === 'schedule') {
        setMarkerColorMode(savedMarkerMode);
      }
    } catch (error) {
      console.error('Failed to load desktop month widget data:', error);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DISPLAY_SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.theme === 'light' || parsed.theme === 'dark') {
          setThemeState(parsed.theme);
          window.desktopWidget?.setTheme?.(parsed.theme);
        }
        if (parsed.opacity !== undefined) {
          const nextOpacity = Number(parsed.opacity);
          setOpacityState(nextOpacity);
          window.desktopWidget?.setOpacity?.(nextOpacity);
        }
        if (parsed.entryBackgroundOpacity !== undefined) {
          const nextEntryBackgroundOpacity = Number(parsed.entryBackgroundOpacity);
          if (!Number.isNaN(nextEntryBackgroundOpacity)) {
            setEntryBackgroundOpacity(Math.min(0.4, Math.max(0, nextEntryBackgroundOpacity)));
          }
        }
      }

      const savedMarkerMode = localStorage.getItem('todoMonthViewMarkerColorMode');
      if (savedMarkerMode === 'category' || savedMarkerMode === 'schedule') {
        setMarkerColorMode(savedMarkerMode);
      }
    } catch (error) {
      console.error('Failed to load desktop month widget display settings:', error);
    }

    void refreshData().then(() => {
      window.dispatchEvent(new Event(APP_READY_EVENT));
    });
  }, [refreshData]);

  useEffect(() => {
    const syncChannel = new BroadcastChannel('lumostime-data-sync');
    const handleChannelMessage = (event: MessageEvent) => {
      if (event.data === 'todos-updated') {
        void refreshData();
      }
    };

    const handleFocus = () => {
      void refreshData();
    };

    syncChannel.addEventListener('message', handleChannelMessage);
    window.addEventListener('focus', handleFocus);
    const intervalId = window.setInterval(refreshData, 10000);

    return () => {
      syncChannel.removeEventListener('message', handleChannelMessage);
      syncChannel.close();
      window.removeEventListener('focus', handleFocus);
      window.clearInterval(intervalId);
    };
  }, [refreshData]);

  const handleThemeChange = (nextTheme: 'light' | 'dark') => {
    setThemeState(nextTheme);
    window.desktopWidget?.setTheme?.(nextTheme);
    persistDisplaySettings(nextTheme, opacity, entryBackgroundOpacity);
  };

  const handleOpacityChange = (nextOpacity: number) => {
    setOpacityState(nextOpacity);
    window.desktopWidget?.setOpacity?.(nextOpacity);
    persistDisplaySettings(theme, nextOpacity, entryBackgroundOpacity);
  };

  const handleEntryBackgroundOpacityChange = (nextOpacity: number) => {
    setEntryBackgroundOpacity(nextOpacity);
    persistDisplaySettings(theme, opacity, nextOpacity);
  };

  const sidebarSections = useMemo(
    () => buildDesktopMonthSidebarSections(todos, todoCategories, activeTab),
    [activeTab, todoCategories, todos]
  );

  const handleMoveScheduleEntry = async (entry: TodoDateEntry, targetDateKey: string) => {
    const todoId = entry.todo.id;
    const type = entry.primaryKind;

    try {
      const snapshot = await dataRepository.loadDataContextSnapshot();
      const updatedTodos = snapshot.todos.map((todo) => {
        if (todo.id !== todoId) {
          return todo;
        }

        const nextTodo = { ...todo };
        if (type === 'scheduled') {
          nextTodo.scheduledDate = targetDateKey;
        } else if (type === 'deadline') {
          nextTodo.deadlineDate = targetDateKey;
        } else if (type === 'maybe') {
          const originalDateKey = entry.dateKey;
          const maybeDates = Array.isArray(nextTodo.maybeDates) ? [...nextTodo.maybeDates] : [];
          const remainingMaybeDates = originalDateKey
            ? maybeDates.filter((dateKey) => dateKey !== originalDateKey)
            : maybeDates;
          const nextMaybeDates = Array.from(new Set([...remainingMaybeDates, targetDateKey])).sort();
          nextTodo.maybeDates = nextMaybeDates.length > 0 ? nextMaybeDates : undefined;
        }
        return nextTodo;
      });

      await dataRepository.saveTodos(updatedTodos);

      const syncChannel = new BroadcastChannel('lumostime-data-sync');
      syncChannel.postMessage('todos-updated');
      syncChannel.close();

      await refreshData();
    } catch (error) {
      console.error('Failed to update schedule in desktop widget:', error);
    }
  };

  const handleDragStart = (event: React.DragEvent, todoId: string) => {
    setExternalDraggingTodoId(todoId);
    setExternalDraggingType(activeTab);
    event.dataTransfer.setData('text/plain', todoId);
  };

  const handleDragEnd = () => {
    setExternalDraggingTodoId(null);
    setExternalDraggingType(null);
  };

  const handleToggleSidebar = () => {
    handleDragEnd();
    setIsSidebarCollapsed((previous) => {
      const nextValue = !previous;
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(nextValue));
      return nextValue;
    });
  };

  const toggleCollapse = (todoId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setCollapsedTodoIds((prev) => ({
      ...prev,
      [todoId]: !prev[todoId]
    }));
  };

  const handleOpenTodoQuickEditor = (todo: TodoItem, anchor: { x: number; y: number }) => {
    window.desktopWidget?.openTodoQuickEditor?.({
      todoId: todo.id,
      theme,
      x: anchor.x,
      y: anchor.y
    });
  };

  const startResize = async (event: React.MouseEvent, dir: string) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.screenX;
    const startY = event.screenY;
    const startBounds = await window.desktopWidget?.getBounds?.();
    if (!startBounds) {
      return;
    }

    const minWidth = 480;
    const minHeight = 360;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.screenX - startX;
      const dy = moveEvent.screenY - startY;

      let newWidth = startBounds.width;
      let newHeight = startBounds.height;
      let newX = startBounds.x;
      let newY = startBounds.y;

      if (dir.includes('e')) {
        newWidth = Math.max(minWidth, startBounds.width + dx);
      }
      if (dir.includes('w')) {
        const potentialWidth = startBounds.width - dx;
        if (potentialWidth >= minWidth) {
          newWidth = potentialWidth;
          newX = startBounds.x + dx;
        }
      }
      if (dir.includes('s')) {
        newHeight = Math.max(minHeight, startBounds.height + dy);
      }
      if (dir.includes('n')) {
        const potentialHeight = startBounds.height - dy;
        if (potentialHeight >= minHeight) {
          newHeight = potentialHeight;
          newY = startBounds.y + dy;
        }
      }

      window.desktopWidget?.setBounds?.({
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newWidth),
        height: Math.round(newHeight)
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const isDark = theme === 'dark';
  const pageLabel = useMemo(
    () => buildWeekPageLabel(pageStartDate, rowsPerScreen),
    [pageStartDate, rowsPerScreen]
  );
  const currentWeekPageStart = useMemo(() => getWeekPageStart(today), [today]);
  const isCurrentWeekPageActive = isSameDay(pageStartDate, currentWeekPageStart);

  return (
    <div
      className={`relative flex h-screen w-screen select-none overflow-hidden rounded-xl border font-sans backdrop-blur-md transition-all duration-300 ${
        isDark
          ? 'border-stone-800/40 bg-stone-950/85 text-stone-100 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)]'
          : 'border-stone-200/60 bg-[#faf9f6]/90 text-stone-900 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.15)]'
      }`}
      style={{ opacity }}
    >
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={`flex h-12 shrink-0 items-center justify-between border-b px-4 ${isDark ? 'border-stone-800' : 'border-black'}`}
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div
            className="flex items-center gap-1 select-none"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              type="button"
              onClick={() => setPageStartDate((previous) => (
                shiftDesktopMonthPageStart(previous, 'prev', 'page', rowsPerScreen)
              ))}
              className={`rounded-full p-1.5 transition-colors ${isDark ? 'text-stone-400 hover:bg-white/5 hover:text-stone-100' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'}`}
              aria-label="上一页"
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
            </button>
            <div className="px-1 text-[1.05rem] font-serif font-black italic leading-none">
              {pageLabel}
            </div>
            <button
              type="button"
              onClick={() => setPageStartDate((previous) => (
                shiftDesktopMonthPageStart(previous, 'next', 'page', rowsPerScreen)
              ))}
              className={`rounded-full p-1.5 transition-colors ${isDark ? 'text-stone-400 hover:bg-white/5 hover:text-stone-100' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'}`}
              aria-label="下一页"
            >
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          </div>

          <div
            className="flex items-center gap-2"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              type="button"
              onClick={() => setPageStartDate(currentWeekPageStart)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] tracking-[0.14em] transition-colors ${
                isCurrentWeekPageActive
                  ? (isDark ? 'bg-stone-800 text-stone-200' : 'bg-stone-100 text-slate-600')
                  : (isDark ? 'text-stone-400 hover:bg-white/5 hover:text-stone-200' : 'text-slate-400 hover:bg-white/50 hover:text-slate-600')
              }`}
            >
              本页
            </button>
            <button
              type="button"
              aria-label={isSidebarCollapsed ? '展开侧栏' : '收起侧栏'}
              title={isSidebarCollapsed ? '展开侧栏' : '收起侧栏'}
              onClick={handleToggleSidebar}
              className={`flex h-7 w-7 items-center justify-center rounded transition ${
                isDark
                  ? 'text-stone-400 hover:bg-stone-900 hover:text-white'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-950'
              }`}
            >
              {isSidebarCollapsed ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
            </button>
            <button
              type="button"
              aria-label="显示设置"
              onClick={() => setShowDisplaySettings((previous) => !previous)}
              className={`flex h-7 w-7 items-center justify-center rounded transition ${
                showDisplaySettings
                  ? (isDark ? 'bg-stone-800 text-white' : 'bg-stone-200 text-stone-900')
                  : (isDark ? 'text-stone-400 hover:bg-stone-900 hover:text-white' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-950')
              }`}
            >
              <SlidersHorizontal size={13} />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="min-w-0 flex-1 overflow-hidden">
            <DesktopMonthCalendar
              todos={todos}
              logs={logs}
              pageStartDate={pageStartDate}
              weeksPerPage={rowsPerScreen}
              onMoveScheduleEntry={handleMoveScheduleEntry}
              isScheduleLocked={isScheduleLocked}
              externalDraggingTodoId={externalDraggingTodoId}
              externalDraggingType={externalDraggingType}
              onOpenTodo={handleOpenTodoQuickEditor}
              isDark={isDark}
              markerColorMode={markerColorMode}
              entryBackgroundOpacity={entryBackgroundOpacity}
              todoCategories={todoCategories}
              onWheelPageChange={(direction) => {
                setPageStartDate((previous) => (
                  shiftDesktopMonthPageStart(previous, direction, 'wheel', rowsPerScreen)
                ));
              }}
            />
          </div>

          {!isSidebarCollapsed && (
            <div
              className={`flex w-72 shrink-0 flex-col border-l transition-colors duration-300 ${
                isDark ? 'border-stone-900 bg-stone-950/45' : 'border-stone-200/50 bg-stone-50/20'
              }`}
            >
              <div className="p-3.5 pb-2.5">
                <div className={`flex rounded-md p-0.5 text-xs ${isDark ? 'bg-stone-900/60' : 'bg-stone-200/40'}`}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('maybe')}
                    className={`flex-1 rounded py-1 text-center font-medium transition ${
                      activeTab === 'maybe'
                        ? (isDark ? 'bg-stone-800 text-white shadow-sm' : 'bg-white text-stone-800 shadow-sm')
                        : (isDark ? 'text-stone-400 hover:text-stone-200' : 'text-stone-500 hover:text-stone-800')
                    }`}
                  >
                    maybe
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('scheduled')}
                    className={`flex-1 rounded py-1 text-center font-medium transition ${
                      activeTab === 'scheduled'
                        ? (isDark ? 'bg-stone-800 text-white shadow-sm' : 'bg-white text-stone-800 shadow-sm')
                        : (isDark ? 'text-stone-400 hover:text-stone-200' : 'text-stone-500 hover:text-stone-800')
                    }`}
                  >
                    arrange
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('deadline')}
                    className={`flex-1 rounded py-1 text-center font-medium transition ${
                      activeTab === 'deadline'
                        ? (isDark ? 'bg-stone-800 text-white shadow-sm' : 'bg-white text-stone-800 shadow-sm')
                        : (isDark ? 'text-stone-400 hover:text-stone-200' : 'text-stone-500 hover:text-stone-800')
                    }`}
                  >
                    due
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3.5 pb-4 styled-scrollbar">
                {sidebarSections.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center text-center">
                    <span className={`text-[11px] ${isDark ? 'text-stone-600' : 'text-stone-400'}`}>
                      无待排期事项
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sidebarSections.map((section) => {
                      const visibleRows = section.rows.filter((row) => {
                        if (row.level === 1 && row.todo.parentTodoId) {
                          return !collapsedTodoIds[row.todo.parentTodoId];
                        }
                        return true;
                      });

                      return (
                        <div key={section.categoryId} className="space-y-1.5">
                          <div className={`px-1 text-[10px] font-semibold tracking-[0.16em] ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                            {section.title}
                          </div>
                          <div className="space-y-1.5">
                            {visibleRows.map((row) => {
                              const isDraggingThis = externalDraggingTodoId === row.todo.id;
                              const isChildRow = row.level === 1;
                              const hasChildren = section.rows.some(
                                (r) => r.level === 1 && r.todo.parentTodoId === row.todo.id
                              );
                              const isCollapsed = !!collapsedTodoIds[row.todo.id];

                              return (
                                <div
                                  key={row.todo.id}
                                  role="button"
                                  tabIndex={0}
                                  draggable
                                  onClick={(event) => {
                                    void resolveDesktopTodoQuickEditorScreenAnchor(event).then((anchor) => {
                                      handleOpenTodoQuickEditor(row.todo, anchor);
                                    });
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.preventDefault();
                                      void resolveDesktopTodoQuickEditorScreenAnchor(event).then((anchor) => {
                                        handleOpenTodoQuickEditor(row.todo, anchor);
                                      });
                                    }
                                  }}
                                  onDragStart={(event) => handleDragStart(event, row.todo.id)}
                                  onDragEnd={handleDragEnd}
                                  className={`group flex cursor-grab items-center gap-2 rounded border p-2 text-left transition select-none active:cursor-grabbing ${
                                    isDraggingThis
                                      ? 'border-dashed border-stone-500 opacity-40'
                                      : isDark
                                        ? 'border-stone-900 bg-stone-900/30 hover:border-stone-800 hover:bg-stone-900/60'
                                        : 'border-stone-200 bg-white/60 hover:border-stone-300 hover:bg-white'
                                  } ${isChildRow ? 'ml-4' : ''}`}
                                >
                                  <GripVertical size={11} className={`shrink-0 ${isDark ? 'text-stone-700' : 'text-stone-400'}`} />
                                  <div className={`min-w-0 flex-1 ${isChildRow ? 'pl-2' : ''}`}>
                                    <div className="flex items-center gap-1">
                                      <span className={`truncate text-xs font-semibold leading-none ${isDark ? 'text-stone-200' : 'text-stone-700'}`}>
                                        {row.displayTitle}
                                      </span>
                                    </div>
                                  </div>
                                  {row.trailingDateText && (
                                    <span
                                      className={`shrink-0 text-[10px] font-medium tabular-nums ${
                                        isDark ? 'text-stone-500' : 'text-stone-400'
                                      }`}
                                    >
                                      {row.trailingDateText}
                                    </span>
                                  )}
                                  {row.level === 0 && hasChildren && (
                                    <button
                                      type="button"
                                      onClick={(event) => toggleCollapse(row.todo.id, event)}
                                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded transition-all ${
                                        isDark
                                          ? 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
                                          : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
                                      } ${isCollapsed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                      aria-label={isCollapsed ? '展开子任务' : '收起子任务'}
                                    >
                                      {isCollapsed ? (
                                        <ChevronRight size={12} strokeWidth={2.5} />
                                      ) : (
                                        <ChevronDown size={12} strokeWidth={2.5} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showDisplaySettings && (
        <div
          className={`absolute right-4 top-12 z-50 w-64 rounded-lg border p-4 shadow-xl backdrop-blur-xl transition ${
            isDark
              ? 'border-stone-800 bg-stone-900/95 text-stone-200 shadow-black/80'
              : 'border-stone-200 bg-white/95 text-stone-800 shadow-stone-300/40'
          }`}
        >
          <div className="space-y-4">
            <div>
              <div className={`mb-1.5 text-[10px] font-semibold tracking-wider ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                主题方案
              </div>
              <div className={`flex rounded p-0.5 text-xs ${isDark ? 'bg-stone-950' : 'bg-stone-100'}`}>
                <button
                  type="button"
                  onClick={() => handleThemeChange('light')}
                  className={`flex-1 rounded py-1 text-center font-medium transition ${
                    !isDark ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-300'
                  }`}
                >
                  浅色
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange('dark')}
                  className={`flex-1 rounded py-1 text-center font-medium transition ${
                    isDark ? 'bg-stone-700 text-white shadow-sm' : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  深色
                </button>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold tracking-wider">
                <span className={isDark ? 'text-stone-500' : 'text-stone-400'}>透明度</span>
                <span className="font-mono">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.20"
                max="1.00"
                step="0.05"
                value={opacity}
                onChange={(event) => handleOpacityChange(parseFloat(event.target.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-stone-200 accent-stone-700 dark:bg-stone-800 dark:accent-stone-400"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold tracking-wider">
                <span className={isDark ? 'text-stone-500' : 'text-stone-400'}>条目背景</span>
                <span className="font-mono">{Math.round(entryBackgroundOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.00"
                max="0.40"
                step="0.02"
                value={entryBackgroundOpacity}
                onChange={(event) => handleEntryBackgroundOpacityChange(parseFloat(event.target.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-stone-200 accent-stone-700 dark:bg-stone-800 dark:accent-stone-400"
              />
            </div>

            <div>
              <div className={`mb-1.5 text-[10px] font-semibold tracking-wider ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                任务着色模式
              </div>
              <div className={`flex rounded p-0.5 text-xs ${isDark ? 'bg-stone-950' : 'bg-stone-100'}`}>
                <button
                  type="button"
                  onClick={() => handleMarkerColorModeChange('schedule')}
                  className={`flex-1 rounded py-1 text-center font-medium transition ${
                    markerColorMode === 'schedule'
                      ? (isDark ? 'bg-stone-800 text-white shadow-sm' : 'bg-white text-stone-800 shadow-sm')
                      : (isDark ? 'text-stone-400 hover:text-stone-300' : 'text-stone-500 hover:text-stone-800')
                  }`}
                >
                  按排期
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkerColorModeChange('category')}
                  className={`flex-1 rounded py-1 text-center font-medium transition ${
                    markerColorMode === 'category'
                      ? (isDark ? 'bg-stone-800 text-white shadow-sm' : 'bg-white text-stone-800 shadow-sm')
                      : (isDark ? 'text-stone-400 hover:text-stone-300' : 'text-stone-500 hover:text-stone-800')
                  }`}
                >
                  按分类
                </button>
              </div>
            </div>

            <div>
              <div className={`mb-1.5 text-[10px] font-semibold tracking-wider ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                一页显示几周
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {ROWS_PER_SCREEN_OPTIONS.map((option) => {
                  const isSelected = rowsPerScreen === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        void applyRowsPerScreenPreset(option);
                      }}
                      className={`rounded-xl px-2.5 py-2 text-center text-[12px] tracking-[0.04em] transition-colors ${
                        isSelected
                          ? (isDark ? 'bg-stone-800 text-stone-100' : 'bg-stone-100 text-slate-700')
                          : (isDark ? 'text-stone-400 hover:bg-stone-900/60 hover:text-stone-200' : 'text-slate-500 hover:bg-stone-100/70 hover:text-slate-700')
                      }`}
                    >
                      {WEEKS_PER_PAGE_LABEL[option]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 z-50">
        <div className="pointer-events-auto absolute top-1 right-0 bottom-1 w-1.5 cursor-e-resize bg-transparent" onMouseDown={(event) => startResize(event, 'e')} />
        <div className="pointer-events-auto absolute bottom-0 left-1 right-1 h-1.5 cursor-s-resize bg-transparent" onMouseDown={(event) => startResize(event, 's')} />
        <div className="pointer-events-auto absolute bottom-0 right-0 z-50 h-3 w-3 cursor-se-resize bg-transparent" onMouseDown={(event) => startResize(event, 'se')} />
        <div className="pointer-events-auto absolute top-1 left-0 bottom-1 w-1.5 cursor-w-resize bg-transparent" onMouseDown={(event) => startResize(event, 'w')} />
        <div className="pointer-events-auto absolute top-0 left-1 right-1 h-1.5 cursor-n-resize bg-transparent" onMouseDown={(event) => startResize(event, 'n')} />
        <div className="pointer-events-auto absolute bottom-0 left-0 z-50 h-3 w-3 cursor-sw-resize bg-transparent" onMouseDown={(event) => startResize(event, 'sw')} />
        <div className="pointer-events-auto absolute top-0 right-0 z-50 h-3 w-3 cursor-ne-resize bg-transparent" onMouseDown={(event) => startResize(event, 'ne')} />
        <div className="pointer-events-auto absolute top-0 left-0 z-50 h-3 w-3 cursor-nw-resize bg-transparent" onMouseDown={(event) => startResize(event, 'nw')} />
      </div>
    </div>
  );
};
