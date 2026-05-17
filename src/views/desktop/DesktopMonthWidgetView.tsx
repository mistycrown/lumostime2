/**
 * @file DesktopMonthWidgetView.tsx
 * @input Desktop widget IPC bridge plus persisted todo snapshot data
 * @output Unified desktop month widget view with one shared title bar, fixed month grid, and planning sidebar
 * @pos View (Desktop widget)
 * @description Hosts the Electron desktop month widget, including one unified header, compact display settings, a fixed 6x7 month calendar body, and the right-side Arrange / Maybe / Due planning sidebar.
 * @updated 2026-05-17: Rebuilt the desktop month widget shell so the outer window owns the only title bar, merges widget display settings into one panel, supports wheel-based month switching, and adds quick month-height presets for the widget calendar.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, GripVertical, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { addMonths, startOfMonth, subMonths } from 'date-fns';
import { dataRepository } from '../../repositories/dataRepository';
import { Log, TodoCategory, TodoItem } from '../../types';
import { TodoDateEntry } from '../../utils/todoScheduleUtils';
import { DesktopMonthCalendar } from './DesktopMonthCalendar';

const APP_READY_EVENT = 'lumostime:app-ready';
const DISPLAY_SETTINGS_STORAGE_KEY = 'desktop-month-widget:display-settings';
const ROWS_PER_SCREEN_STORAGE_KEY = 'desktop-month-widget:rows-per-screen';
const ROWS_PER_SCREEN_OPTIONS = [2, 3, 4, 5] as const;
type WidgetRowsPerScreen = typeof ROWS_PER_SCREEN_OPTIONS[number];

const ROWS_PER_SCREEN_WINDOW_HEIGHT: Record<WidgetRowsPerScreen, number> = {
  2: 460,
  3: 560,
  4: 660,
  5: 760
};

export const DesktopMonthWidgetView: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoCategories, setTodoCategories] = useState<TodoCategory[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [externalDraggingTodoId, setExternalDraggingTodoId] = useState<string | null>(null);
  const [externalDraggingType, setExternalDraggingType] = useState<'scheduled' | 'deadline' | 'maybe' | null>(null);
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark');
  const [opacity, setOpacityState] = useState<number>(0.92);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'maybe' | 'deadline'>('scheduled');
  const [isScheduleLocked] = useState(false);
  const [displayMonth, setDisplayMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [rowsPerScreen, setRowsPerScreen] = useState<WidgetRowsPerScreen>(() => {
    const saved = Number(localStorage.getItem(ROWS_PER_SCREEN_STORAGE_KEY));
    return ROWS_PER_SCREEN_OPTIONS.includes(saved as WidgetRowsPerScreen)
      ? saved as WidgetRowsPerScreen
      : 4;
  });

  const persistDisplaySettings = useCallback((nextTheme: 'light' | 'dark', nextOpacity: number) => {
    localStorage.setItem(
      DISPLAY_SETTINGS_STORAGE_KEY,
      JSON.stringify({ theme: nextTheme, opacity: nextOpacity })
    );
  }, []);

  const applyRowsPerScreenPreset = useCallback(async (nextRows: WidgetRowsPerScreen) => {
    setRowsPerScreen(nextRows);
    localStorage.setItem(ROWS_PER_SCREEN_STORAGE_KEY, String(nextRows));

    const bounds = await window.desktopWidget?.getBounds?.();
    if (!bounds) {
      return;
    }

    const nextHeight = ROWS_PER_SCREEN_WINDOW_HEIGHT[nextRows];
    window.desktopWidget?.setBounds?.({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: nextHeight
    });
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const dataSnapshot = await dataRepository.loadDataContextSnapshot();

      setTodos(dataSnapshot.todos || []);
      setTodoCategories(dataSnapshot.todoCategories || []);
      setLogs(dataSnapshot.logs || []);
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
    persistDisplaySettings(nextTheme, opacity);
  };

  const handleOpacityChange = (nextOpacity: number) => {
    setOpacityState(nextOpacity);
    window.desktopWidget?.setOpacity?.(nextOpacity);
    persistDisplaySettings(theme, nextOpacity);
  };

  const sidebarTodos = useMemo(() => {
    const incomplete = todos.filter((todo) => !todo.isCompleted);
    if (activeTab === 'scheduled') {
      return incomplete.filter((todo) => !todo.scheduledDate && !todo.recurrence);
    }
    if (activeTab === 'deadline') {
      return incomplete.filter((todo) => !todo.deadlineDate && !todo.recurrence);
    }
    return incomplete.filter((todo) => !todo.recurrence);
  }, [todos, activeTab]);

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

  const handleOpenTodo = (todo: TodoItem) => {
    window.desktopWidget?.requestMainAction({
      type: 'open_todo',
      todoId: todo.id
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
  const monthLabel = `${displayMonth.getFullYear()}.${displayMonth.getMonth() + 1}`;
  const isCurrentMonthActive = (
    displayMonth.getFullYear() === new Date().getFullYear()
    && displayMonth.getMonth() === new Date().getMonth()
  );

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
              onClick={() => setDisplayMonth((previous) => startOfMonth(subMonths(previous, 1)))}
              className={`rounded-full p-1.5 transition-colors ${isDark ? 'text-stone-400 hover:bg-white/5 hover:text-stone-100' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'}`}
              aria-label="上一月"
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
            </button>
            <div className="px-1 text-[1.05rem] font-serif font-black italic leading-none">
              {monthLabel}
            </div>
            <button
              type="button"
              onClick={() => setDisplayMonth((previous) => startOfMonth(addMonths(previous, 1)))}
              className={`rounded-full p-1.5 transition-colors ${isDark ? 'text-stone-400 hover:bg-white/5 hover:text-stone-100' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'}`}
              aria-label="下一月"
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
              onClick={() => setDisplayMonth(startOfMonth(new Date()))}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] tracking-[0.14em] transition-colors ${
                isCurrentMonthActive
                  ? (isDark ? 'bg-stone-800 text-stone-200' : 'bg-stone-100 text-slate-600')
                  : (isDark ? 'text-stone-400 hover:bg-white/5 hover:text-stone-200' : 'text-slate-400 hover:bg-white/50 hover:text-slate-600')
              }`}
            >
              本月
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
              displayMonth={displayMonth}
              visibleRowsPerScreen={rowsPerScreen}
              onMoveScheduleEntry={handleMoveScheduleEntry}
              isScheduleLocked={isScheduleLocked}
              externalDraggingTodoId={externalDraggingTodoId}
              externalDraggingType={externalDraggingType}
              onOpenTodo={handleOpenTodo}
              isDark={isDark}
              onWheelMonthChange={(direction) => {
                setDisplayMonth((previous) => startOfMonth(
                  direction === 'next' ? addMonths(previous, 1) : subMonths(previous, 1)
                ));
              }}
            />
          </div>

          <div
            className={`flex w-72 shrink-0 flex-col border-l transition-colors duration-300 ${
              isDark ? 'border-stone-900 bg-stone-950/45' : 'border-stone-200/50 bg-stone-50/20'
            }`}
          >
            <div className="p-3.5 pb-2.5">
              <div className={`flex rounded-md p-0.5 text-xs ${isDark ? 'bg-stone-900/60' : 'bg-stone-200/40'}`}>
                <button
                  type="button"
                  onClick={() => setActiveTab('scheduled')}
                  className={`flex-1 rounded py-1 text-center font-medium transition ${
                    activeTab === 'scheduled'
                      ? (isDark ? 'bg-stone-800 text-white shadow-sm' : 'bg-white text-stone-800 shadow-sm')
                      : (isDark ? 'text-stone-400 hover:text-stone-200' : 'text-stone-500 hover:text-stone-800')
                  }`}
                >
                  安排
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('maybe')}
                  className={`flex-1 rounded py-1 text-center font-medium transition ${
                    activeTab === 'maybe'
                      ? (isDark ? 'bg-stone-800 text-white shadow-sm' : 'bg-white text-stone-800 shadow-sm')
                      : (isDark ? 'text-stone-400 hover:text-stone-200' : 'text-stone-500 hover:text-stone-800')
                  }`}
                >
                  暂定
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
                  截止
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3.5 pb-4 styled-scrollbar">
              {sidebarTodos.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-center">
                  <span className={`text-[11px] ${isDark ? 'text-stone-600' : 'text-stone-400'}`}>
                    无待排期事项
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {sidebarTodos.map((todo) => {
                    const isDraggingThis = externalDraggingTodoId === todo.id;
                    return (
                      <div
                        key={todo.id}
                        draggable
                        onDragStart={(event) => handleDragStart(event, todo.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleOpenTodo(todo)}
                        className={`group flex cursor-grab items-center gap-2 rounded border p-2 text-left transition select-none active:cursor-grabbing ${
                          isDraggingThis
                            ? 'border-dashed border-stone-500 opacity-40'
                            : isDark
                              ? 'border-stone-900 bg-stone-900/30 hover:border-stone-800 hover:bg-stone-900/60'
                              : 'border-stone-200 bg-white/60 hover:border-stone-300 hover:bg-white'
                        }`}
                      >
                        <GripVertical size={11} className={`shrink-0 ${isDark ? 'text-stone-700' : 'text-stone-400'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className={`truncate text-xs font-semibold leading-none ${isDark ? 'text-stone-200' : 'text-stone-700'}`}>
                              {todo.title}
                            </span>
                          </div>
                          {todo.linkedCategoryId && (
                            <div className={`mt-1 truncate text-[9px] ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                              类别: {todoCategories.find((category) => category.id === todo.linkedCategoryId)?.title || '无'}
                            </div>
                          )}
                        </div>
                        <ArrowRight size={10} className={`shrink-0 opacity-0 transition group-hover:opacity-100 ${isDark ? 'text-stone-500' : 'text-stone-400'}`} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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
              <div className={`mb-1.5 text-[10px] font-semibold tracking-wider ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                一屏显示几格
              </div>
              <div className="grid grid-cols-4 gap-1.5">
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
                      {option}格
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
