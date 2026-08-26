/**
 * @file TimerFloating.tsx
 * @input props: activeSessions, todos
 * @output Floating UI Elements
 * @pos Component (Global UI)
 * @description Renders floating timer bubbles for active sessions, with responsive action visibility and a long-press cancel menu.
 * @updated 2026-08-25: Added a long-press menu that discards an active timer without creating a record.
 * @updated 2026-04-21: Narrowed Todo-view floating timers to the same avoidance scale used by Record-style layouts so they no longer collide with the bottom-right floating action button.
 * @updated 2026-07-21: Added semantic dark-mode surfaces for the floating timer panel and its activity icon.
 * @updated 2026-03-24
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActiveSession, TodoItem, AppView } from '../types';
import { X, CheckCircle2, Trash2 } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import { IconRenderer } from './IconRenderer';

interface TimerFloatingProps {
  sessions: ActiveSession[];
  todos: TodoItem[];
  onStop: (sessionId: string) => void;
  onCancel: (sessionId: string) => void;
  onClick: (session: ActiveSession) => void;
}

const GROUP_ONE_CANCEL_HIDE_CONTAINER_WIDTH = 352;
const GROUP_ONE_CANCEL_SHOW_CONTAINER_WIDTH = 380;
const GROUP_ONE_CANCEL_HIDE_TEXT_WIDTH = 190;
const GROUP_ONE_CANCEL_SHOW_TEXT_WIDTH = 216;
const GROUP_ONE_CANCEL_HIDE_OVERFLOW = 14;
const GROUP_ONE_CANCEL_SHOW_OVERFLOW = 4;

const GROUP_ONE_TAG_HIDE_CONTAINER_WIDTH = 312;
const GROUP_ONE_TAG_SHOW_CONTAINER_WIDTH = 340;
const GROUP_ONE_TAG_HIDE_TEXT_WIDTH = 150;
const GROUP_ONE_TAG_SHOW_TEXT_WIDTH = 176;
const GROUP_ONE_TAG_HIDE_OVERFLOW = 10;
const GROUP_ONE_TAG_SHOW_OVERFLOW = 0;
const LONG_PRESS_DELAY = 500;
const LONG_PRESS_MOVE_THRESHOLD = 12;

const SingleTimer: React.FC<{
  session: ActiveSession;
  todo?: TodoItem;
  onStop: () => void;
  onCancel: () => void;
  onClick: () => void;
}> = ({ session, todo, onStop, onCancel, onClick }) => {
  const [elapsed, setElapsed] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isBorderAnimating, setIsBorderAnimating] = useState(false);
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);
  const [isLongPressMenuOpen, setIsLongPressMenuOpen] = useState(false);
  const [responsiveVisibility, setResponsiveVisibility] = useState({
    hideCancelButton: false,
    hideTodoTag: false
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const textBlockRef = useRef<HTMLDivElement>(null);
  const titleRowRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const didTriggerLongPressRef = useRef(false);
  const { currentView } = useNavigation();

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - session.startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [session.startTime]);

  useEffect(() => {
    if (currentView !== AppView.RECORD && !isCollapsed && !isManuallyExpanded) {
      setIsCollapsed(true);
    }

    if (currentView === AppView.RECORD) {
      setIsManuallyExpanded(false);
    }
  }, [currentView, isCollapsed, isManuallyExpanded]);

  useEffect(() => {
    setIsLongPressMenuOpen(false);
  }, [currentView]);

  useEffect(() => {
    if (isCollapsed) {
      const timer = setTimeout(() => {
        setIsBorderAnimating(true);
      }, 500);

      return () => clearTimeout(timer);
    }

    setIsBorderAnimating(false);
  }, [isCollapsed]);

  const isGroupOne =
    currentView === AppView.RECORD ||
    currentView === AppView.REVIEW ||
    currentView === AppView.SCOPE ||
    currentView === AppView.TAGS;
  const isGroupTwo = currentView === AppView.TIMELINE;
  const isGroupThree = currentView === AppView.TODO;
  const shouldUseResponsiveVisibility = isGroupOne || isGroupThree;

  const updateResponsiveVisibility = useCallback(() => {
    if (!shouldUseResponsiveVisibility || isCollapsed) {
      setResponsiveVisibility(prev =>
        prev.hideCancelButton || prev.hideTodoTag
          ? { hideCancelButton: false, hideTodoTag: false }
          : prev
      );
      return;
    }

    const container = containerRef.current;
    const textBlock = textBlockRef.current;
    const titleRow = titleRowRef.current;

    if (!container || !textBlock || !titleRow) {
      return;
    }

    const containerWidth = container.clientWidth;
    const textWidth = textBlock.clientWidth;
    const titleOverflow = Math.max(0, titleRow.scrollWidth - titleRow.clientWidth);

    setResponsiveVisibility(prev => {
      const nextHideCancelButton = prev.hideCancelButton
        ? containerWidth < GROUP_ONE_CANCEL_SHOW_CONTAINER_WIDTH ||
          textWidth < GROUP_ONE_CANCEL_SHOW_TEXT_WIDTH ||
          titleOverflow > GROUP_ONE_CANCEL_SHOW_OVERFLOW
        : containerWidth < GROUP_ONE_CANCEL_HIDE_CONTAINER_WIDTH ||
          textWidth < GROUP_ONE_CANCEL_HIDE_TEXT_WIDTH ||
          titleOverflow > GROUP_ONE_CANCEL_HIDE_OVERFLOW;

      const nextHideTodoTag = prev.hideTodoTag
        ? containerWidth < GROUP_ONE_TAG_SHOW_CONTAINER_WIDTH ||
          textWidth < GROUP_ONE_TAG_SHOW_TEXT_WIDTH ||
          titleOverflow > GROUP_ONE_TAG_SHOW_OVERFLOW
        : containerWidth < GROUP_ONE_TAG_HIDE_CONTAINER_WIDTH ||
          textWidth < GROUP_ONE_TAG_HIDE_TEXT_WIDTH ||
          (nextHideCancelButton && titleOverflow > GROUP_ONE_TAG_HIDE_OVERFLOW);

      if (
        prev.hideCancelButton === nextHideCancelButton &&
        prev.hideTodoTag === nextHideTodoTag
      ) {
        return prev;
      }

      return {
        hideCancelButton: nextHideCancelButton,
        hideTodoTag: nextHideTodoTag
      };
    });
  }, [isCollapsed, shouldUseResponsiveVisibility]);

  useLayoutEffect(() => {
    updateResponsiveVisibility();
  }, [updateResponsiveVisibility, session.activityName, todo?.title]);

  useEffect(() => {
    if (!shouldUseResponsiveVisibility || isCollapsed) {
      return;
    }

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            window.requestAnimationFrame(updateResponsiveVisibility);
          });

    const observedElements = [
      containerRef.current,
      textBlockRef.current,
      titleRowRef.current
    ].filter((element): element is HTMLElement => Boolean(element));

    observedElements.forEach(element => resizeObserver?.observe(element));
    window.addEventListener('resize', updateResponsiveVisibility);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateResponsiveVisibility);
    };
  }, [isCollapsed, shouldUseResponsiveVisibility, updateResponsiveVisibility]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartPointRef.current = null;
  }, []);

  useEffect(() => clearLongPressTimer, [clearLongPressTimer]);

  useEffect(() => {
    if (!isLongPressMenuOpen) {
      return;
    }

    const closeMenuWhenClickingAway = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsLongPressMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeMenuWhenClickingAway);
    return () => document.removeEventListener('pointerdown', closeMenuWhenClickingAway);
  }, [isLongPressMenuOpen]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')}`;
  };

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (didTriggerLongPressRef.current) {
      didTriggerLongPressRef.current = false;
      return;
    }
    const nextCollapsedState = !isCollapsed;
    setIsCollapsed(nextCollapsedState);

    if (!nextCollapsedState && currentView !== AppView.RECORD) {
      setIsManuallyExpanded(true);
      return;
    }

    setIsManuallyExpanded(false);
  };

  const getContainerStyle = () => {
    if (isCollapsed) {
      if (isBorderAnimating) {
        return {
          border: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          width: '3rem',
          height: '3rem'
        };
      }

      return {
        border: '2px solid rgba(255, 255, 255, 0.8)',
        boxShadow:
          '0 8px 30px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8), 0 0 0 1px rgba(0,0,0,0.05)'
      };
    }

    return {
      border: '2px solid rgba(255, 255, 255, 0.8)',
      boxShadow:
        '0 8px 30px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8), 0 0 0 1px rgba(0,0,0,0.05)'
    };
  };

  const shouldHideCancelButton = shouldUseResponsiveVisibility && responsiveVisibility.hideCancelButton;
  const shouldHideTodoTag = shouldUseResponsiveVisibility && responsiveVisibility.hideTodoTag;

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) {
      return;
    }

    didTriggerLongPressRef.current = false;
    longPressStartPointRef.current = { x: event.clientX, y: event.clientY };
    longPressTimerRef.current = window.setTimeout(() => {
      didTriggerLongPressRef.current = true;
      longPressTimerRef.current = null;
      setIsLongPressMenuOpen(true);
    }, LONG_PRESS_DELAY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const startPoint = longPressStartPointRef.current;
    if (!startPoint) {
      return;
    }

    if (
      Math.hypot(event.clientX - startPoint.x, event.clientY - startPoint.y) >
      LONG_PRESS_MOVE_THRESHOLD
    ) {
      clearLongPressTimer();
    }
  };

  const handlePanelClick = () => {
    if (didTriggerLongPressRef.current) {
      didTriggerLongPressRef.current = false;
      return;
    }

    if (isLongPressMenuOpen) {
      setIsLongPressMenuOpen(false);
      return;
    }

    onClick();
  };

  const handleMenuCancel = () => {
    setIsLongPressMenuOpen(false);
    onCancel();
  };

  return (
    <div
      ref={containerRef}
      onClick={handlePanelClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearLongPressTimer}
      onPointerCancel={clearLongPressTimer}
      onPointerLeave={clearLongPressTimer}
      onContextMenu={event => event.preventDefault()}
      className={`timer-floating-panel relative bg-white/95 backdrop-blur-sm text-stone-800 flex items-center cursor-pointer active:scale-[0.99] overflow-visible ${
        isCollapsed
          ? `rounded-full justify-center items-center p-0 transition-all duration-500 ease-out ${
              isBorderAnimating ? 'w-12 h-12' : 'w-[3.5rem] h-[3.5rem]'
            } ${isBorderAnimating ? 'duration-300' : ''}`
          : `transition-all duration-500 ease-out rounded-full h-14 ${
              isGroupThree
                ? 'px-4 py-3 justify-between w-[75%]'
                : isGroupTwo
                  ? 'pl-3 pr-3 py-3 w-[50%]'
                  : 'pl-3 pr-2 py-3 justify-between w-[75%]'
            }`
      }`}
      style={{
        ...getContainerStyle(),
        zIndex: isCollapsed && isBorderAnimating
          ? 5
          : currentView === AppView.RECORD || currentView === AppView.TODO
            ? 40
            : currentView === AppView.TIMELINE || currentView === AppView.REVIEW
              ? 50
              : 10,
        ...(isCollapsed
          ? {
              width: isBorderAnimating ? '3rem' : '3.5rem',
              height: isBorderAnimating ? '3rem' : '3.5rem',
              minWidth: isBorderAnimating ? '3rem' : '3.5rem',
              minHeight: isBorderAnimating ? '3rem' : '3.5rem',
              maxWidth: isBorderAnimating ? '3rem' : '3.5rem',
              maxHeight: isBorderAnimating ? '3rem' : '3.5rem'
            }
          : {}),
        pointerEvents: 'auto'
      }}
    >
      {isCollapsed ? (
        <div
          onClick={toggleCollapse}
          className={`timer-floating-icon flex items-center justify-center hover:scale-110 transition-all cursor-pointer ${
            isBorderAnimating
              ? 'w-8 h-8 text-2xl duration-300'
              : 'w-10 h-10 text-xl rounded-full shadow-inner duration-500'
          }`}
          style={
            !isBorderAnimating
              ? { backgroundColor: 'color-mix(in srgb, var(--accent-color) 10%, white)' }
              : undefined
          }
          onMouseEnter={e => {
            if (!isBorderAnimating) {
              e.currentTarget.style.backgroundColor =
                'color-mix(in srgb, var(--accent-color) 20%, white)';
            }
          }}
          onMouseLeave={e => {
            if (!isBorderAnimating) {
              e.currentTarget.style.backgroundColor =
                'color-mix(in srgb, var(--accent-color) 10%, white)';
            }
          }}
        >
          <IconRenderer
            icon={session.activityIcon}
            uiIcon={session.activityUiIcon}
            size={20}
            className={isBorderAnimating ? 'text-2xl' : 'text-xl'}
          />
        </div>
      ) : (
        <>
          {isGroupTwo ? (
            <div className="flex items-center gap-3 relative">
              <div
                onClick={toggleCollapse}
                className="timer-floating-icon w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner shrink-0 transition-colors cursor-pointer absolute left-0"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent-color) 10%, white)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor =
                    'color-mix(in srgb, var(--accent-color) 20%, white)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor =
                    'color-mix(in srgb, var(--accent-color) 10%, white)';
                }}
              >
                <IconRenderer
                  icon={session.activityIcon}
                  uiIcon={session.activityUiIcon}
                  size={20}
                  className="text-xl"
                />
              </div>
              <div className="flex flex-col min-w-0 ml-14">
                <span className="font-semibold text-sm text-stone-700 truncate">
                  {session.activityName}
                </span>
                <span
                  className="text-xl font-mono font-medium tabular-nums tracking-tight leading-none mt-0.5"
                  style={{ color: 'var(--accent-color)' }}
                >
                  {formatTime(elapsed)}
                </span>
              </div>
            </div>
          ) : (
            <>
              <div
                className={`flex min-w-0 items-center ${
                  isGroupThree
                    ? 'flex-1 gap-4'
                    : isGroupOne
                      ? 'flex-1 gap-4 relative'
                      : 'gap-3 relative'
                }`}
              >
                <div
                  onClick={toggleCollapse}
                  className={`timer-floating-icon w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner shrink-0 transition-colors cursor-pointer ${
                    !isGroupThree ? 'absolute left-0' : ''
                  }`}
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--accent-color) 10%, white)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor =
                      'color-mix(in srgb, var(--accent-color) 20%, white)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor =
                      'color-mix(in srgb, var(--accent-color) 10%, white)';
                  }}
                >
                  <IconRenderer
                    icon={session.activityIcon}
                    uiIcon={session.activityUiIcon}
                    size={20}
                    className="text-xl"
                  />
                </div>
                <div
                  ref={textBlockRef}
                  className={`flex flex-1 flex-col min-w-0 transition-all duration-500 ease-out ${
                    !isGroupThree ? (isGroupOne ? 'ml-14' : 'ml-[3.25rem]') : ''
                  }`}
                >
                  <div ref={titleRowRef} className="flex min-w-0 items-center gap-2">
                    <span className="font-semibold text-sm text-stone-700 truncate">
                      {session.activityName}
                    </span>
                    {todo && !shouldHideTodoTag && (
                      <span className="shrink-0 text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full truncate max-w-[100px]">
                        @{todo.title}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-xl font-mono font-medium tabular-nums tracking-tight leading-none mt-0.5"
                    style={{ color: 'var(--accent-color)' }}
                  >
                    {formatTime(elapsed)}
                  </span>
                </div>
              </div>

              <div
                className={`flex shrink-0 items-center border-l border-stone-100 transition-all duration-500 ease-out ${
                  isGroupThree
                    ? 'pl-4 ml-2 gap-2'
                    : isGroupOne
                      ? shouldHideCancelButton
                        ? 'pl-0.5 ml-0 gap-0.5'
                        : 'pl-1 ml-0.5 gap-0.5'
                      : 'pl-2 ml-1 gap-1'
                }`}
                onClick={e => e.stopPropagation()}
              >
                {!shouldHideCancelButton && (
                  <button
                    onClick={onCancel}
                    className="shrink-0 p-2 text-stone-300 hover:text-stone-500 hover:bg-stone-100 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                )}
                <button
                  onClick={onStop}
                  className="timer-floating-confirm shrink-0 p-2 rounded-full transition-colors"
                  style={{
                    color: 'var(--accent-color)',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor =
                      'color-mix(in srgb, var(--accent-color) 10%, transparent)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <CheckCircle2 size={24} />
                </button>
              </div>
            </>
          )}
        </>
      )}
      {isLongPressMenuOpen && (
        <div
          role="menu"
          aria-label="计时操作"
          className="absolute bottom-[calc(100%+0.5rem)] left-0 z-[60] min-w-32 rounded-lg border border-stone-200 bg-white p-1 shadow-lg dark:border-stone-700 dark:bg-stone-800"
          onClick={event => event.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleMenuCancel}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
          >
            <Trash2 size={16} />
            取消计时
          </button>
        </div>
      )}
    </div>
  );
};

export const TimerFloating: React.FC<TimerFloatingProps> = ({
  sessions,
  todos,
  onStop,
  onCancel,
  onClick
}) => {
  if (sessions.length === 0) return null;

  const { currentView, isAchievementOpen } = useNavigation();
  if (isAchievementOpen) return null;
  const containerZIndex =
    currentView === AppView.TIMELINE || currentView === AppView.REVIEW ? 50 : 10;

  return (
    <div
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 right-4 md:left-4 md:right-4 flex flex-col-reverse gap-6 animate-in slide-in-from-bottom-5"
      style={{
        zIndex: containerZIndex,
        pointerEvents: 'none'
      }}
    >
      {sessions.map(session => (
        <SingleTimer
          key={session.id}
          session={session}
          todo={todos.find(t => t.id === session.linkedTodoId)}
          onStop={() => onStop(session.id)}
          onCancel={() => onCancel(session.id)}
          onClick={() => onClick(session)}
        />
      ))}
    </div>
  );
};
