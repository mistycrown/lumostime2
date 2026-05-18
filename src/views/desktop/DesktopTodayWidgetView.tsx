/**
 * @file DesktopTodayWidgetView.tsx
 * @description 桌面今日小组件的UI视图，采用极其紧凑的单行设计。支持轻量完成/计时（完全后台静默执行，不唤起主窗口），并自带显示设置面板（提供深浅配色切换与窗体透明度滑块调节）。
 * @updated 2026-05-17: 实现了显示设置中“任务颜色”选项，支持按“排期类型”与“任务分类”动态渲染小圆点前缀，并与周/月视图的自定义排期配色联动。
 * @updated 2026-05-18: Added one-level subtask rendering for the desktop today widget, nesting children beneath visible parents and falling back to `@parent` labels when a parent sits in another section.
 * @updated 2026-05-17: Keep completed todos visible inside each today-widget section while still ordering them after unfinished rows.
 * @updated 2026-05-17: Softened the completed checkbox treatment and hid finished rows from the overdue section while keeping them visible in pinned/today.
 * @updated 2026-05-17: Increased the unfinished checkbox outline contrast in the today widget so open tasks stay legible on the translucent background.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, X, Play, SlidersHorizontal } from 'lucide-react';
import {
  DesktopTodayWidgetSnapshot,
  DesktopWidgetTodoItem,
  loadDesktopTodayWidgetSnapshotAsync
} from '../../services/desktopWidgetService';
import {
  getResolvedTodoScheduleTypeColors,
  todoScheduleColorService
} from '../../services/todoScheduleColorService';
import { resolveDesktopTodoQuickEditorScreenAnchor } from '../../utils/desktopTodoQuickEditorAnchorUtils';

const APP_READY_EVENT = 'lumostime:app-ready';
const PENDING_TOGGLE_RESET_MS = 1800;

const formatWidgetHeaderDate = (dateKey: string): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  return date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });
};

const TODAY_GROUP_BADGE_ORDER: Record<DesktopWidgetTodoItem['badgeLabel'], number> = {
  PIN: 0,
  TODAY: 1,
  MAYBE: 2,
  LATE: 3
};

const sortTodaySectionItems = (
  items: DesktopWidgetTodoItem[]
): DesktopWidgetTodoItem[] => [...items].sort((left, right) => (
  Number(left.isCompleted) - Number(right.isCompleted)
  || TODAY_GROUP_BADGE_ORDER[left.badgeLabel] - TODAY_GROUP_BADGE_ORDER[right.badgeLabel]
  || left.title.localeCompare(right.title, 'zh-CN')
));

export interface DesktopTodayWidgetSectionRow {
  item: DesktopWidgetTodoItem;
  depth: 0 | 1;
  displayTitle: string;
}

export const buildDesktopTodayWidgetSectionRows = (
  items: DesktopWidgetTodoItem[]
): DesktopTodayWidgetSectionRow[] => {
  const visibleTodoIds = new Set(items.map((item) => item.todoId));
  const childMap = new Map<string, DesktopWidgetTodoItem[]>();
  const rootItems: DesktopWidgetTodoItem[] = [];

  items.forEach((item) => {
    if (item.parentTodoId && visibleTodoIds.has(item.parentTodoId)) {
      const currentChildren = childMap.get(item.parentTodoId) || [];
      currentChildren.push(item);
      childMap.set(item.parentTodoId, currentChildren);
      return;
    }

    rootItems.push(item);
  });

  return rootItems.flatMap((item) => {
    const rootRow: DesktopTodayWidgetSectionRow = {
      item,
      depth: 0,
      displayTitle: item.parentTodoId && item.parentTitle
        ? `${item.title} @${item.parentTitle}`
        : item.title
    };
    const childRows = (childMap.get(item.todoId) || []).map<DesktopTodayWidgetSectionRow>((child) => ({
      item: child,
      depth: 1,
      displayTitle: child.title
    }));

    return [rootRow, ...childRows];
  });
};

const TodoRow: React.FC<{
  item: DesktopWidgetTodoItem;
  depth: 0 | 1;
  displayTitle: string;
  isPending: boolean;
  onToggle: (todoId: string) => void;
  onOpen: (
    todoId: string,
    event: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
  ) => void;
  onStartFocus: (todoId: string) => void;
  theme: 'light' | 'dark';
  markerColorMode: 'schedule' | 'category';
  resolvedScheduleTypeColors: Record<string, string>;
}> = ({
  item,
  depth,
  displayTitle,
  isPending,
  onToggle,
  onOpen,
  onStartFocus,
  theme,
  markerColorMode,
  resolvedScheduleTypeColors
}) => {
  const isDark = theme === 'dark';

  const getTodoScheduleTypeColorKey = (todo: DesktopWidgetTodoItem): string => {
    if (todo.isCompleted) return 'completed';
    if (todo.badgeLabel === 'MAYBE') return 'maybe';
    if (todo.deadlineDate) return 'deadline';
    return 'scheduled';
  };

  const getMarkerColor = (): string | undefined => {
    const scheduleColor = resolvedScheduleTypeColors[getTodoScheduleTypeColorKey(item)];
    if (markerColorMode === 'schedule') {
      return scheduleColor;
    }
    return item.color || scheduleColor;
  };

  const dotColor = getMarkerColor();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(event) => onOpen(item.todoId, event)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(item.todoId, event);
        }
      }}
      className={`group flex w-full items-center justify-between gap-2.5 rounded px-2 py-1 text-left transition ${
        isDark ? 'hover:bg-stone-800/50' : 'hover:bg-stone-100/50'
      }`}
    >
      <div className={`flex min-w-0 flex-1 items-center gap-2 ${depth === 1 ? 'pl-4' : ''}`}>
        <button
          type="button"
          aria-label={item.isCompleted ? '取消完成任务' : '完成任务'}
          disabled={isPending}
          onClick={(event) => {
            event.stopPropagation();
            onToggle(item.todoId);
          }}
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition disabled:cursor-wait disabled:opacity-60 ${
            item.isCompleted
              ? isDark
                ? 'bg-stone-700/60 border-stone-600 text-stone-300'
                : 'bg-stone-200/80 border-stone-300 text-stone-500'
              : isDark
              ? 'bg-transparent border-stone-500 text-transparent hover:border-stone-300'
              : 'bg-transparent border-stone-400 text-transparent hover:border-stone-500'
          }`}
        >
          <Check size={10} strokeWidth={3} />
        </button>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {dotColor && (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: dotColor }}
            />
          )}
          <span className={`truncate text-[13px] font-medium leading-none transition-colors ${
            item.isCompleted
              ? isDark ? 'text-stone-500 line-through font-normal' : 'text-stone-400 line-through font-normal'
              : isDark ? 'text-stone-200' : 'text-stone-700'
          }`}>
            {displayTitle}
          </span>
          {item.activityLabel && (
            <span className={`shrink-0 text-[10px] font-normal scale-90 origin-left ${
              isDark ? 'text-stone-500' : 'text-stone-400'
            }`}>
              ({item.activityLabel})
            </span>
          )}
        </div>
      </div>
      
      <button
        type="button"
        aria-label="开始专注"
        onClick={(event) => {
          event.stopPropagation();
          onStartFocus(item.todoId);
        }}
        className={`opacity-0 group-hover:opacity-100 flex h-5 w-5 shrink-0 items-center justify-center rounded transition ${
          isDark
            ? 'text-stone-400 hover:bg-stone-800 hover:text-white'
            : 'text-stone-400 hover:bg-stone-200/50 hover:text-stone-700'
        }`}
      >
        <Play size={10} fill="currentColor" />
      </button>
    </div>
  );
};

export const DesktopTodayWidgetView: React.FC = () => {
  const [snapshot, setSnapshot] = useState<DesktopTodayWidgetSnapshot | null>(null);
  const [pendingTodoIds, setPendingTodoIds] = useState<string[]>([]);
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [opacity, setOpacityState] = useState<number>(0.95);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [markerColorMode, setMarkerColorMode] = useState<'schedule' | 'category'>('schedule');

  const [scheduleTypeColorSettings, setScheduleTypeColorSettings] = useState(() =>
    todoScheduleColorService.getSettings()
  );

  const resolvedScheduleTypeColors = useMemo(
    () => getResolvedTodoScheduleTypeColors(scheduleTypeColorSettings),
    [scheduleTypeColorSettings]
  );

  useEffect(() => {
    const handleUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setScheduleTypeColorSettings(customEvent.detail);
      }
    };
    window.addEventListener('lumostime:todo-schedule-type-colors-updated', handleUpdated);
    return () => {
      window.removeEventListener('lumostime:todo-schedule-type-colors-updated', handleUpdated);
    };
  }, []);

  const refreshSnapshot = React.useCallback(async () => {
    try {
      const result = await loadDesktopTodayWidgetSnapshotAsync();
      setSnapshot(result);
    } catch (error) {
      console.error('Failed to load widget snapshot', error);
    }
  }, []);

  // 挂载时加载保存的主题、透明度和着色方式设置
  useEffect(() => {
    try {
      const saved = localStorage.getItem('desktop-widget:display-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.theme) {
          setThemeState(parsed.theme);
          window.desktopWidget?.setTheme?.(parsed.theme);
        }
        if (parsed.opacity !== undefined) {
          const val = Number(parsed.opacity);
          setOpacityState(val);
          window.desktopWidget?.setOpacity?.(val);
        }
        if (parsed.markerColorMode) {
          setMarkerColorMode(parsed.markerColorMode);
        }
      }
    } catch (e) {
      console.error('Failed to load widget display settings', e);
    }
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    window.desktopWidget?.setTheme?.(newTheme);
    localStorage.setItem(
      'desktop-widget:display-settings',
      JSON.stringify({ theme: newTheme, opacity, markerColorMode })
    );
  };

  const handleOpacityChange = (newOpacity: number) => {
    setOpacityState(newOpacity);
    window.desktopWidget?.setOpacity?.(newOpacity);
    localStorage.setItem(
      'desktop-widget:display-settings',
      JSON.stringify({ theme, opacity: newOpacity, markerColorMode })
    );
  };

  const handleMarkerColorModeChange = (mode: 'schedule' | 'category') => {
    setMarkerColorMode(mode);
    localStorage.setItem(
      'desktop-widget:display-settings',
      JSON.stringify({ theme, opacity, markerColorMode: mode })
    );
  };

  useEffect(() => {
    refreshSnapshot().then(() => {
      window.dispatchEvent(new Event(APP_READY_EVENT));
    });
  }, [refreshSnapshot]);

  useEffect(() => {
    const handleFocus = () => refreshSnapshot();
    window.addEventListener('focus', handleFocus);
    
    // IndexedDB does not trigger storage events, so we poll slightly to stay fresh
    const intervalId = window.setInterval(refreshSnapshot, 10000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.clearInterval(intervalId);
    };
  }, [refreshSnapshot]);

  const sections = useMemo(() => {
    if (!snapshot) return [];
    
    const nextSections: Array<{ id: string; label: string; items: DesktopWidgetTodoItem[] }> = [];
    if (snapshot.pinned.length > 0) {
      nextSections.push({ id: 'pinned', label: '置顶', items: snapshot.pinned });
    }
    
    // 合并 arrange、due 和 maybe 的非完成任务作为今天分组
    const todayAndMaybe = sortTodaySectionItems([
      ...(snapshot.today || []),
      ...(snapshot.maybe || [])
    ]);

    if (todayAndMaybe.length > 0) {
      nextSections.push({ id: 'today', label: '今天', items: todayAndMaybe });
    }
    
    const overdueItems = snapshot.overdue.filter((item) => !item.isCompleted);
    if (overdueItems.length > 0) {
      nextSections.push({ id: 'overdue', label: '逾期未完成', items: overdueItems });
    }
    return nextSections;
  }, [snapshot]);

  const sectionRows = useMemo(() => (
    sections.map((section) => ({
      id: section.id,
      label: section.label,
      rows: buildDesktopTodayWidgetSectionRows(sortTodaySectionItems(section.items))
    }))
  ), [sections]);

  const handleOpenTodoQuickEditor = async (
    todoId: string,
    event: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
  ) => {
    const anchor = await resolveDesktopTodoQuickEditorScreenAnchor(event);
    window.desktopWidget?.openTodoQuickEditor?.({
      todoId,
      theme,
      x: anchor.x,
      y: anchor.y
    });
  };

  const handleToggleTodo = (todoId: string) => {
    setPendingTodoIds((previous) => (
      previous.includes(todoId) ? previous : [...previous, todoId]
    ));
    window.desktopWidget?.requestMainAction({
      type: 'toggle_todo',
      todoId
    });
    window.setTimeout(() => {
      setPendingTodoIds((previous) => previous.filter((value) => value !== todoId));
    }, PENDING_TOGGLE_RESET_MS);
  };

  const handleStartFocus = (todoId: string) => {
    window.desktopWidget?.requestMainAction({
      type: 'start_focus',
      todoId
    });
  };

  const startResize = async (e: React.MouseEvent, dir: string) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.screenX;
    const startY = e.screenY;
    
    const startBounds = await window.desktopWidget?.getBounds?.();
    if (!startBounds) return;

    const minWidth = 180;
    const minHeight = 200;

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

  const isEmpty = sectionRows.length === 0;
  const isDark = theme === 'dark';

  return (
    <div
      style={{
        backgroundColor: isDark
          ? `rgba(28, 28, 30, ${opacity})`
          : `rgba(250, 250, 250, ${opacity})`
      } as React.CSSProperties}
      className={`relative h-screen w-screen flex flex-col font-sans overflow-hidden border transition-colors duration-200 ${
        isDark
          ? 'text-stone-100 border-stone-800'
          : 'text-stone-800 border-stone-200/50'
      }`}
    >
      {/* 顶部控制栏 (可拖拽区域) */}
      <div
        className={`flex items-center justify-between px-4 py-2 shrink-0 border-b relative z-40 ${
          isDark ? 'border-stone-800' : 'border-stone-100'
        }`}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <h1 className={`text-sm font-bold tracking-tight ${isDark ? 'text-stone-100' : 'text-stone-800'}`}>今天</h1>
          <span className={`text-[10px] font-medium mt-0.5 ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
            {snapshot ? formatWidgetHeaderDate(snapshot.date) : ''}
          </span>
        </div>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            type="button"
            aria-label="打开主应用"
            onClick={() => window.desktopWidget?.openMainApp()}
            className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
              isDark
                ? 'text-stone-400 hover:bg-stone-800 hover:text-white'
                : 'text-stone-400 hover:bg-stone-200/50 hover:text-stone-700'
            }`}
          >
            <ExternalLink size={12} />
          </button>
          
          {/* 新增显示设置按钮 */}
          <button
            type="button"
            aria-label="显示设置"
            onClick={() => setShowDisplaySettings(!showDisplaySettings)}
            className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
              showDisplaySettings
                ? isDark
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-200 text-stone-800'
                : isDark
                ? 'text-stone-400 hover:bg-stone-800 hover:text-white'
                : 'text-stone-400 hover:bg-stone-200/50 hover:text-stone-700'
            }`}
          >
            <SlidersHorizontal size={12} />
          </button>

          <button
            type="button"
            aria-label="关闭小组件"
            onClick={() => window.desktopWidget?.close()}
            className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
              isDark
                ? 'text-stone-400 hover:bg-stone-800 hover:text-white'
                : 'text-stone-400 hover:bg-stone-200/50 hover:text-stone-700'
            }`}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 显示设置悬浮调节选项面板 */}
      {showDisplaySettings && (
        <div
          className={`absolute right-4 top-9 z-50 w-48 rounded-md border p-3 shadow-lg ${
            isDark
              ? 'border-stone-800 bg-[#1c1c1e] text-stone-100'
              : 'border-stone-200 bg-white text-stone-800'
          }`}
        >
          <div className="space-y-3">
            <div>
              <div className={`text-[10px] font-semibold tracking-wider mb-1.5 ${
                isDark ? 'text-stone-500' : 'text-stone-400'
              }`}>配色方案</div>
              <div className={`flex rounded p-0.5 text-[11px] ${
                isDark ? 'bg-stone-800/80' : 'bg-stone-100'
              }`}>
                <button
                  type="button"
                  onClick={() => handleThemeChange('light')}
                  className={`flex-1 py-1 text-center rounded transition font-medium ${
                    !isDark
                      ? 'bg-white text-stone-800 shadow-sm'
                      : 'text-stone-400 hover:text-stone-300'
                  }`}
                >
                  浅色 (白)
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange('dark')}
                  className={`flex-1 py-1 text-center rounded transition font-medium ${
                    isDark
                      ? 'bg-stone-700 text-white shadow-sm'
                      : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  深色 (黑)
                </button>
              </div>
            </div>

            <div>
              <div className={`text-[10px] font-semibold tracking-wider mb-1.5 ${
                isDark ? 'text-stone-500' : 'text-stone-400'
              }`}>任务颜色</div>
              <div className={`flex rounded p-0.5 text-[11px] ${
                isDark ? 'bg-stone-800/80' : 'bg-stone-100'
              }`}>
                <button
                  type="button"
                  onClick={() => handleMarkerColorModeChange('schedule')}
                  className={`flex-1 py-1 text-center rounded transition font-medium ${
                    markerColorMode === 'schedule'
                      ? isDark
                        ? 'bg-stone-700 text-white shadow-sm'
                        : 'bg-white text-stone-800 shadow-sm'
                      : isDark
                      ? 'text-stone-400 hover:text-stone-300'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  排期类型
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkerColorModeChange('category')}
                  className={`flex-1 py-1 text-center rounded transition font-medium ${
                    markerColorMode === 'category'
                      ? isDark
                        ? 'bg-stone-700 text-white shadow-sm'
                        : 'bg-white text-stone-800 shadow-sm'
                      : isDark
                      ? 'text-stone-400 hover:text-stone-300'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  任务分类
                </button>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center text-[10px] font-semibold tracking-wider mb-1.5">
                <span className={isDark ? 'text-stone-500' : 'text-stone-400'}>透明度</span>
                <span className="font-mono">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.20"
                max="1.00"
                step="0.05"
                value={opacity}
                onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-stone-700 bg-stone-200 dark:bg-stone-800 dark:accent-stone-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* 任务列表区域 */}
      <div className="flex-1 overflow-y-auto px-2 py-2 styled-scrollbar" onClick={() => setShowDisplaySettings(false)}>
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className={`text-xs font-medium ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
              今天没有待办事项
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {sectionRows.map((section) => (
              <section key={section.id} className="space-y-0.5">
                <div className={`px-2 text-[10px] font-semibold tracking-wider mb-1 ${
                  isDark ? 'text-stone-500' : 'text-stone-400'
                }`}>
                  {section.label}
                </div>
                <div className="space-y-0.5">
                  {section.rows.map((row) => (
                    <TodoRow
                      key={row.item.todoId}
                      item={row.item}
                      depth={row.depth}
                      displayTitle={row.displayTitle}
                      isPending={pendingTodoIds.includes(row.item.todoId)}
                      onToggle={handleToggleTodo}
                      onOpen={handleOpenTodoQuickEditor}
                      onStartFocus={handleStartFocus}
                      theme={theme}
                      markerColorMode={markerColorMode}
                      resolvedScheduleTypeColors={resolvedScheduleTypeColors}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* 自定义边缘缩放拖拽手势区域 */}
      <div className="absolute inset-0 pointer-events-none z-50">
        {/* 右边缘 */}
        <div className="absolute top-1 right-0 bottom-1 w-1.5 cursor-e-resize pointer-events-auto bg-transparent" onMouseDown={(e) => startResize(e, 'e')} />
        {/* 下边缘 */}
        <div className="absolute bottom-0 left-1 right-1 h-1.5 cursor-s-resize pointer-events-auto bg-transparent" onMouseDown={(e) => startResize(e, 's')} />
        {/* 右下角 */}
        <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize pointer-events-auto bg-transparent z-50" onMouseDown={(e) => startResize(e, 'se')} />
        {/* 左边缘 */}
        <div className="absolute top-1 left-0 bottom-1 w-1.5 cursor-w-resize pointer-events-auto bg-transparent" onMouseDown={(e) => startResize(e, 'w')} />
        {/* 上边缘 */}
        <div className="absolute top-0 left-1 right-1 h-1.5 cursor-n-resize pointer-events-auto bg-transparent" onMouseDown={(e) => startResize(e, 'n')} />
        {/* 左下角 */}
        <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize pointer-events-auto bg-transparent z-50" onMouseDown={(e) => startResize(e, 'sw')} />
        {/* 右上角 */}
        <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize pointer-events-auto bg-transparent z-50" onMouseDown={(e) => startResize(e, 'ne')} />
        {/* 左上角 */}
        <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize pointer-events-auto bg-transparent z-50" onMouseDown={(e) => startResize(e, 'nw')} />
      </div>
    </div>
  );
};
