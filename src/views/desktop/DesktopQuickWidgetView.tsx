/**
 * @file DesktopQuickWidgetView.tsx
 * @description 桌面“小事”清单小组件的UI视图，采用极其紧凑的单行设计。移除了任务颜色圆点展示、顶部日期与任务分组标题以保持极致清爽的随手记编辑风格，支持快捷添加小事并在屏幕内渲染优美输入框。
 * @updated 2026-05-17: 移除了所有分组标题（包括“今天/置顶/逾期”），使得列表完全扁平化展示，视觉更加纯粹精简，完美匹配“小事待办”的产品调性。
 * @updated 2026-05-17: 移除了顶部控制栏的日期显示，使标题栏更加纯粹极简。
 * @updated 2026-05-17: 移除任务圆点及任务颜色设置，增加屏幕内快速添加小事功能（提供加号快捷按钮、精致输入窗与回车/ESC按键处理）。
 * @updated 2026-05-17: Keep completed quick todos visible in the flat list and place them after unfinished rows.
 * @updated 2026-05-17: Softened the completed checkbox treatment so finished rows read quieter than unfinished rows.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, X, SlidersHorizontal, Plus } from 'lucide-react';
import {
  DesktopTodayWidgetSnapshot,
  DesktopWidgetTodoItem,
  loadDesktopQuickWidgetSnapshotAsync
} from '../../services/desktopWidgetService';
import { resolveDesktopTodoQuickEditorScreenAnchor } from '../../utils/desktopTodoQuickEditorAnchorUtils';

const APP_READY_EVENT = 'lumostime:app-ready';
const PENDING_TOGGLE_RESET_MS = 1800;

const TodoRow: React.FC<{
  item: DesktopWidgetTodoItem;
  isPending: boolean;
  onToggle: (todoId: string) => void;
  onOpen: (
    todoId: string,
    event: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
  ) => void;
  theme: 'light' | 'dark';
}> = ({
  item,
  isPending,
  onToggle,
  onOpen,
  theme
}) => {
  const isDark = theme === 'dark';

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
      <div className="flex items-center gap-2 min-w-0 flex-1">
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
              ? 'bg-transparent border-stone-700 text-transparent hover:border-stone-500'
              : 'bg-transparent border-stone-300 text-transparent hover:border-stone-500'
          }`}
        >
          <Check size={10} strokeWidth={3} />
        </button>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className={`truncate text-[13px] font-medium leading-none transition-colors ${
            item.isCompleted
              ? isDark ? 'text-stone-500 line-through font-normal' : 'text-stone-400 line-through font-normal'
              : isDark ? 'text-stone-200' : 'text-stone-700'
          }`}>
            {item.title}
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
    </div>
  );
};

export const DesktopQuickWidgetView: React.FC = () => {
  const [snapshot, setSnapshot] = useState<DesktopTodayWidgetSnapshot | null>(null);
  const [pendingTodoIds, setPendingTodoIds] = useState<string[]>([]);
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [opacity, setOpacityState] = useState<number>(0.95);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);

  // 快速添加小事相关状态
  const [showAddInput, setShowAddInput] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const refreshSnapshot = React.useCallback(async () => {
    try {
      const result = await loadDesktopQuickWidgetSnapshotAsync();
      setSnapshot(result);
    } catch (error) {
      console.error('Failed to load quick widget snapshot', error);
    }
  }, []);

  // 挂载时加载保存的主题和透明度设置
  useEffect(() => {
    try {
      const saved = localStorage.getItem('desktop-quick-widget:display-settings');
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
      }
    } catch (e) {
      console.error('Failed to load quick widget display settings', e);
    }
  }, []);

  // 自动将焦点定位到输入框
  useEffect(() => {
    if (showAddInput) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [showAddInput]);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    window.desktopWidget?.setTheme?.(newTheme);
    localStorage.setItem(
      'desktop-quick-widget:display-settings',
      JSON.stringify({ theme: newTheme, opacity })
    );
  };

  const handleOpacityChange = (newOpacity: number) => {
    setOpacityState(newOpacity);
    window.desktopWidget?.setOpacity?.(newOpacity);
    localStorage.setItem(
      'desktop-quick-widget:display-settings',
      JSON.stringify({ theme, opacity: newOpacity })
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
    
    // IndexedDB 数据无感知更新，轻量轮询保持刷新
    const intervalId = window.setInterval(refreshSnapshot, 10000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.clearInterval(intervalId);
    };
  }, [refreshSnapshot]);

  const todoList = useMemo<DesktopWidgetTodoItem[]>(() => {
    if (!snapshot) return [];

    const pinnedItems = snapshot.pinned || [];
    const pinnedIds = new Set(pinnedItems.map(item => item.todoId));

    const otherItems = [
      ...(snapshot.today || []),
      ...(snapshot.maybe || []),
      ...(snapshot.overdue || [])
    ].filter(item => !item.isCompleted && !pinnedIds.has(item.todoId));

    const visibleTodoIds = new Set([
      ...pinnedItems.map((item) => item.todoId),
      ...otherItems.map((item) => item.todoId)
    ]);
    const completedItems = (snapshot.completed || []).filter(
      (item) => !visibleTodoIds.has(item.todoId)
    );

    return [...pinnedItems, ...otherItems, ...completedItems];
  }, [snapshot]);

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

  const handleAddQuickTodo = () => {
    const title = newTodoTitle.trim();
    if (!title) return;

    window.desktopWidget?.requestMainAction({
      type: 'add_quick_todo',
      title
    });

    setNewTodoTitle('');
    setShowAddInput(false);
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

  const isEmpty = todoList.length === 0;
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
          <h1 className={`text-sm font-bold tracking-tight ${isDark ? 'text-stone-100' : 'text-stone-800'}`}>小事</h1>
        </div>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {/* 快速添加小事按钮 */}
          <button
            type="button"
            aria-label="快速添加小事"
            onClick={() => {
              setShowAddInput(!showAddInput);
              setShowDisplaySettings(false);
            }}
            className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
              showAddInput
                ? isDark
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-200 text-stone-800'
                : isDark
                ? 'text-stone-400 hover:bg-stone-800 hover:text-white'
                : 'text-stone-400 hover:bg-stone-200/50 hover:text-stone-700'
            }`}
          >
            <Plus size={14} />
          </button>

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
          
          {/* 显示设置按钮 */}
          <button
            type="button"
            aria-label="显示设置"
            onClick={() => {
              setShowDisplaySettings(!showDisplaySettings);
              setShowAddInput(false);
            }}
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
            onClick={() => window.desktopWidget?.closeQuick?.()}
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

      {/* 快速添加小事输入栏 */}
      {showAddInput && (
        <div className={`px-4 py-2 shrink-0 border-b relative z-30 ${
          isDark ? 'border-stone-800/80 bg-stone-900/30' : 'border-stone-100 bg-stone-50/50'
        }`}>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="添加一件小事..."
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddQuickTodo();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setNewTodoTitle('');
                  setShowAddInput(false);
                }
              }}
              className={`flex-1 px-2.5 py-1 text-xs rounded border outline-none font-medium transition-colors ${
                isDark
                  ? 'bg-stone-950/80 border-stone-800 text-stone-100 placeholder-stone-600 focus:border-stone-600'
                  : 'bg-white border-stone-200 text-stone-800 placeholder-stone-400 focus:border-stone-400'
              }`}
            />
            <button
              type="button"
              onClick={handleAddQuickTodo}
              className={`px-3 py-1 text-xs font-semibold rounded transition shrink-0 ${
                isDark
                  ? 'bg-stone-800 text-stone-100 hover:bg-stone-700'
                  : 'bg-stone-200 text-stone-850 hover:bg-stone-300'
              }`}
            >
              确定
            </button>
          </div>
        </div>
      )}

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
      <div 
        className="flex-1 overflow-y-auto px-2 py-2 styled-scrollbar" 
        onClick={() => {
          setShowDisplaySettings(false);
        }}
      >
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className={`text-xs font-medium ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
              没有待办小事
            </div>
          </div>
        ) : (
          <div className="space-y-0.5">
            {todoList.map((item) => (
              <TodoRow
                key={item.todoId}
                item={item}
                isPending={pendingTodoIds.includes(item.todoId)}
                onToggle={handleToggleTodo}
                onOpen={handleOpenTodoQuickEditor}
                theme={theme}
              />
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
