/**
 * @file TodoView.tsx
 * @input Todos, Categories, Scopes
 * @output Todo Status Updates, Edit Triggers, Focus Timer Start
 * @pos View (Main Tab)
 * @description The main To-Do list interface. Displays tasks grouped by category, supports swipe actions, and now includes a week planning view with schedule and history badges.
 * @updated 2026-04-20: Added list/week switching, seven-row week planning layout, and first-pass schedule/history badge rendering.
 * @updated 2026-04-12: Matched the expanded sidebar action button spacing with RecordView, added a persisted toggle for showing completed todos, and softened the shared sidebar control styling.
 * @updated 2026-04-20: Switched custom background rendering to the shared preloaded display hook and reduced mobile blur cost.
 *
 * 閳跨媴绗?Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Scope, TodoItem, TodoCategory, Category, AutoLinkRule, Log } from '../types';
import { PlayCircle, CheckCircle2, Plus, MoreHorizontal, ChevronLeft, ChevronRight, LayoutList, Rows, Sparkles, Eye, EyeOff, CalendarDays, Flag, Repeat2, TrendingUp, ListTodo } from 'lucide-react';
import { AITodoInputModal } from '../components/AITodoInputModal';
import { AITodoConfirmModal, ParsedTask } from '../components/AITodoConfirmModal';
import { aiService } from '../services/aiService';
import { usePrivacy } from '../contexts/PrivacyContext';
import { IconRenderer } from '../components/IconRenderer';
import { useBackgroundDisplay } from '../hooks/useBackgroundDisplay';
import { FloatingButton } from '../components/FloatingButton';
import { UIIcon } from '../components/UIIcon';
import { uiIconService } from '../services/uiIconService';
import { WeekTodoEntry, buildWeekTodoBuckets, formatDateKey, getTodayDateKey, getWeekDates, parseDateKey } from '../utils/todoScheduleUtils';


interface TodoViewProps {
  todos: TodoItem[];
  logs: Log[];
  categories: TodoCategory[];
  activityCategories: Category[];
  scopes: Scope[];
  onToggleTodo: (id: string) => void;
  onEditTodo: (todo: TodoItem) => void;
  onAddTodo: (categoryId: string) => void;
  onStartFocus: (todo: TodoItem) => void;
  onDuplicateTodo: (todo: TodoItem) => void;
  onBatchAddTodos?: (todos: Partial<TodoItem>[]) => void;
  autoLinkRules?: AutoLinkRule[];
}

// Sub-component for Swipeable Item
const SwipeableTodoItem: React.FC<{
  todo: TodoItem;
  categories: TodoCategory[];
  activityCategories: Category[];
  scopes: Scope[];
  onToggle: (id: string) => void;
  onEdit: (todo: TodoItem) => void;
  onStartFocus: (todo: TodoItem) => void;
  onDuplicate: (todo: TodoItem) => void;
  viewMode: 'loose' | 'compact';
  isFirst?: boolean;
  isLast?: boolean;
}> = ({ todo, categories, activityCategories, scopes, onToggle, onEdit, onStartFocus, onDuplicate, viewMode, isFirst = false, isLast = false }) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const canQuickToggle = !todo.recurrenceRule;

  // Constants
  const minSwipeDistance = 100;
  const maxSwipeDistance = 150; // Limit drag visual

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentTouch = e.targetTouches[0].clientX;
    const diff = currentTouch - touchStart;

    if (diff < 0 && !canQuickToggle) {
      setTranslateX(0);
      return;
    }

    // Allow swipe in both directions but clamp
    if (Math.abs(diff) < maxSwipeDistance) {
      setTranslateX(diff);
    } else {
      // Clamp to max distance, keeping sign
      setTranslateX(diff > 0 ? maxSwipeDistance : -maxSwipeDistance);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) {
      setTranslateX(0); // Reset if tap
      return;
    }

    const currentTouch = e.changedTouches[0].clientX;
    const diff = currentTouch - touchStart;

    if (diff > minSwipeDistance) {
      // Right Swipe -> Duplicate
      onDuplicate(todo);
    } else if (canQuickToggle && diff < -minSwipeDistance) {
      // Left Swipe -> Toggle Complete
      onToggle(todo.id);
    }

    // Reset
    setTranslateX(0);
    setTouchStart(null);
  };

  const linkedDetails = (() => {
    if (!todo.linkedCategoryId || !todo.linkedActivityId) return null;
    const cat = activityCategories.find(c => c.id === todo.linkedCategoryId);
    const act = cat?.activities.find(a => a.id === todo.linkedActivityId);
    return act && cat ? { 
      categoryName: cat.name, 
      categoryIcon: cat.icon, 
      categoryUiIcon: cat.uiIcon,
      activityName: act.name, 
      activityIcon: act.icon,
      activityUiIcon: act.uiIcon
    } : null;
  })();

  const linkedScopes = (!todo.defaultScopeIds || todo.defaultScopeIds.length === 0)
    ? []
    : todo.defaultScopeIds.map(id => scopes.find(s => s.id === id)).filter(Boolean) as Scope[];

  const { isPrivacyMode } = usePrivacy();

  // 鐠侊紕鐣婚崷鍡氼潡閺嶅嘲绱?
  const getRoundedClass = () => {
    if (viewMode !== 'compact') return 'rounded-2xl';
    if (isFirst && isLast) return 'rounded-xl';
    if (isFirst) return 'rounded-t-xl';
    if (isLast) return 'rounded-b-xl';
    return '';
  };

  return (
    <div className={`relative overflow-hidden select-none touch-pan-y group ${viewMode === 'compact' ? `mb-0 ${getRoundedClass()}` : 'mb-3 rounded-2xl'}`}>
      {/* Background Actions (Right Swipe -> Duplicate) */}
      <div
        className={`absolute inset-0 bg-blue-500 flex items-center justify-start pl-6 text-white font-bold tracking-wider z-0 transition-opacity duration-200 ${viewMode === 'compact' ? getRoundedClass() : 'rounded-2xl'}`}
        style={{ opacity: translateX > 0 ? 1 : 0 }}
      >
        <span className="flex items-center gap-2">
          <Plus size={20} /> DUPLICATE
        </span>
      </div>

      {/* Background Actions (Left Swipe -> Complete/Uncomplete) */}
      <div
        className={`absolute inset-0 flex items-center justify-end pr-6 text-white font-bold tracking-wider z-0 transition-opacity duration-200 ${todo.isCompleted ? 'bg-stone-400' : 'bg-green-500'} ${viewMode === 'compact' ? getRoundedClass() : 'rounded-2xl'}`}
        style={{ opacity: canQuickToggle && translateX < 0 ? 1 : 0 }}
      >
        <span className="flex items-center gap-2">
          {todo.isCompleted ? 'UNDO' : 'COMPLETE'} <CheckCircle2 size={20} />
        </span>
      </div>

      {/* Foreground Content */}
      <div
        className={`
          relative z-10 flex gap-3 transition-transform duration-200
          ${viewMode === 'compact'
            ? `p-3 border-b border-stone-100 min-h-[3.5rem] items-center ${getRoundedClass()}`
            : 'p-4 rounded-2xl border min-h-[5rem] mb-0 items-start'
          }
          ${todo.isCompleted
            ? (viewMode === 'compact' ? 'bg-stone-50/50' : 'bg-stone-50/80 backdrop-blur-md border-stone-100') // Compact completed style
            : (viewMode === 'compact' ? 'bg-white' : 'bg-white/80 backdrop-blur-md border-stone-100 shadow-sm')
          }
        `}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Content (Click to Edit) */}
        <div className={`flex-1 cursor-pointer ${todo.isCompleted ? 'opacity-60' : ''} ${viewMode === 'compact' ? 'flex items-center gap-2 min-w-0' : 'py-0.5'}`} onClick={() => onEdit(todo)}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`font-bold leading-tight ${todo.isCompleted ? 'text-stone-400 line-through' : 'text-stone-800'} ${viewMode === 'compact' ? 'text-sm truncate' : 'text-base'} transition-all duration-500`}>
              {todo.title}
            </div>

            {/* Progress Circle - Only in Compact Mode for Progress Tasks */}
            {todo.isProgress && viewMode === 'compact' && (
              <div className="flex-shrink-0 relative" style={{ width: '16px', height: '16px' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" className="-rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="8"
                    cy="8"
                    r="7"
                    fill="none"
                    stroke="var(--progress-bar-bg)"
                    strokeWidth="2"
                  />
                  {/* Progress arc */}
                  <circle
                    cx="8"
                    cy="8"
                    r="7"
                    fill="none"
                    stroke="var(--progress-bar-fill)"
                    strokeWidth="2"
                    strokeDasharray={`${2 * Math.PI * 7}`}
                    strokeDashoffset={`${2 * Math.PI * 7 * (1 - (todo.completedUnits || 0) / (todo.totalAmount || 1))}`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Note - Hide in Compact Mode */}
          {viewMode === 'loose' && todo.note && (
            <div className={`text-xs text-stone-400 mt-1 line-clamp-1 ${isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'}`}>{todo.note}</div>
          )}

          {/* Linked Tags/Scopes */}
          <div className={`flex items-center gap-1.5 flex-wrap flex-shrink-0 ${viewMode === 'compact' ? 'mt-0' : 'mt-1.5'}`}>
            {linkedDetails && (
              <span className={`text-[11px] text-stone-500 font-medium flex items-center gap-1 ${viewMode === 'compact' ? 'px-0 border-0 bg-transparent' : 'px-1.5 py-0.5 rounded-md border border-stone-200 bg-white/50'}`}>
                <span className="text-stone-300 font-sans">#</span>
                {viewMode === 'loose' ? (
                  <>
                    <IconRenderer icon={linkedDetails.categoryIcon} uiIcon={linkedDetails.categoryUiIcon} className="text-xs" />
                    <span className="opacity-90">{linkedDetails.categoryName}</span>
                    <span className="text-stone-300 px-0.5">/</span>
                    <IconRenderer icon={linkedDetails.activityIcon} uiIcon={linkedDetails.activityUiIcon} className="text-xs" />
                    <span className="opacity-90">{linkedDetails.activityName}</span>
                  </>
                ) : (
                  <IconRenderer icon={linkedDetails.activityIcon} uiIcon={linkedDetails.activityUiIcon} className="text-xs" />
                )}
              </span>
            )}
            {linkedScopes.map((scope, idx) => (
              <span key={idx} className={`text-[11px] text-stone-500 font-medium flex items-center gap-1 ${viewMode === 'compact' ? 'px-0 border-0 bg-transparent' : 'px-1.5 py-0.5 rounded-md border border-stone-200 bg-white/50'}`}>
                <span className="text-stone-300 font-sans">%</span>
                <IconRenderer 
                    icon={scope.icon} 
                    uiIcon={scope.uiIcon}
                    className="text-xs" 
                />
                {/* Show Scope Name only in Loose Mode */}
                {viewMode === 'loose' && <span className="opacity-90 ml-0.5">{scope.name}</span>}
              </span>
            ))}
          </div>

          {/* Progress Bar - Only in Loose Mode */}
          {todo.isProgress && viewMode === 'loose' && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-stone-400 font-medium mb-1.5 uppercase tracking-wider">
                <span>Progress</span>
                <span>{Math.round((todo.completedUnits || 0) / (todo.totalAmount || 1) * 100)}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${Math.min(100, Math.max(0, (todo.completedUnits || 0) / (todo.totalAmount || 1) * 100))}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-stone-400 text-right font-mono">
                {todo.completedUnits} / {todo.totalAmount}
              </div>
            </div>
          )}
        </div>

        {/* Right Actions Column */}
        <div className={`flex items-end pl-2 ${viewMode === 'compact' ? 'items-center' : 'flex-col justify-between self-stretch'}`}>
          {/* Spacer only for Loose mode */}
          {viewMode === 'loose' && <div className="flex-1"></div>}

          {/* Bottom Right: Start Focus */}
          {!todo.isCompleted && (
            <button
              onClick={(e) => { e.stopPropagation(); onStartFocus(todo); }}
              className={`text-stone-300 hover:text-orange-500 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 ${viewMode === 'compact' ? '' : 'pt-2'}`}
            >
              <PlayCircle size={viewMode === 'compact' ? 20 : 26} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const WEEKDAY_ROW_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const WeekTodoLineItem: React.FC<{
  entry: WeekTodoEntry;
}> = ({ entry }) => {
  const { todo, badges } = entry;
  const isHistoricalOnly = !badges.scheduled && !badges.deadline && !badges.recurring && (badges.completed || badges.inProgress);
  const iconClassName = isHistoricalOnly ? 'text-stone-300' : 'text-stone-400';
  const titleClassName = isHistoricalOnly ? 'text-stone-400' : 'text-stone-700';
  const noteClassName = isHistoricalOnly ? 'text-stone-300' : 'text-stone-400';

  const leadingIcon = badges.completed
    ? <CheckCircle2 size={12} className={iconClassName} />
    : badges.inProgress
      ? <TrendingUp size={12} className={iconClassName} />
      : badges.deadline
        ? <Flag size={12} className={iconClassName} />
        : badges.recurring
          ? <Repeat2 size={12} className={iconClassName} />
          : <CalendarDays size={12} className={iconClassName} />;

  const orderedBadges = [
    badges.deadline ? { key: 'deadline', label: 'Due', color: '#8f6f6b' } : null,
    badges.scheduled ? { key: 'scheduled', label: 'Arrange', color: '#7c8b97' } : null,
    badges.recurring ? { key: 'recurring', label: 'Repeat', color: '#8b8f79' } : null,
    badges.completed ? { key: 'completed', label: 'Done', color: '#7f8c84' } : null,
    badges.inProgress ? { key: 'inProgress', label: 'Trace', color: '#8b8096' } : null
  ].filter(Boolean) as Array<{ key: string; label: string; color: string }>;

  return (
    <div className="flex w-full items-center gap-2 py-1 text-left">
      <span className="shrink-0 self-center">
        {leadingIcon}
      </span>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-[14px] font-medium leading-5 ${titleClassName}`}>
          {todo.title}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-1.5 text-[9px] tracking-[0.16em] uppercase">
        {orderedBadges.map((badge) => (
          <span key={badge.key} style={{ color: badge.color }}>
            {badge.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export const TodoView: React.FC<TodoViewProps> = ({ todos, logs, categories, activityCategories, scopes, onToggleTodo, onEditTodo, onAddTodo, onStartFocus, onDuplicateTodo, onBatchAddTodos, autoLinkRules = [] }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { backgroundUrl, hasBackground, panelOverlayOpacity, useReducedEffects } = useBackgroundDisplay();
  const [screenMode, setScreenMode] = useState<'list' | 'week'>(() => {
    const saved = localStorage.getItem('todoScreenMode');
    return saved === 'week' ? 'week' : 'list';
  });
  const [weekReferenceDate, setWeekReferenceDate] = useState<Date>(new Date());
  const [hasCustomIconTheme, setHasCustomIconTheme] = useState(() => uiIconService.isCustomTheme());

  // AI States
  const [isAIInputOpen, setIsAIInputOpen] = useState(false);
  const [isAIConfirmOpen, setIsAIConfirmOpen] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false); // Loading state
  const [aiParsedTasks, setAiParsedTasks] = useState<ParsedTask[]>([]);

  const handleAIGenerate = async (text: string) => {
    setIsAIGenerating(true);
    try {
      // Call AI Service
      const parsedTodos = await aiService.parseTodoText(text, {
        todoCategories: categories,
        activityCategories: activityCategories,
        scopes: scopes
      });

      // Map to Modal Data Structure
      const tasksWithId: ParsedTask[] = parsedTodos.map((t, idx) => ({
        id: Date.now().toString() + idx,
        title: t.title,
        categoryId: t.categoryId || selectedCategoryId, // Use AI's or fallback to current
        linkedActivityId: t.linkedActivityId,
        linkedCategoryId: undefined, // Let Modal auto-derive
        defaultScopeIds: t.defaultScopeIds || [],
      }));

      // Apply Auto-Link Rules (Rule > AI)
      const tasksWithRules = tasksWithId.map(task => {
        if (task.linkedActivityId) {
          const rule = autoLinkRules.find(r => r.activityId === task.linkedActivityId);
          if (rule) {
            return { ...task, defaultScopeIds: [rule.scopeId] };
          }
        }
        return task;
      });

      setAiParsedTasks(tasksWithRules);
      setIsAIInputOpen(false); // Close input ONLY on success
      setIsAIConfirmOpen(true); // Open confirm
    } catch (error) {
      console.error("AI Generation Failed", error);
      alert("AI Analysis Failed. Please check your network or API Key settings in Settings -> AI Integration.");
      // Ideally use toast, but alert is safer if toast prop is missing/optional
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleAISave = (tasks: ParsedTask[]) => {
    const newTodos: Partial<TodoItem>[] = tasks.map(t => {
      // Auto-infer linkedCategoryId if missing but linkedActivityId exists
      let finalLinkedCategoryId = t.linkedCategoryId;
      if (t.linkedActivityId && !finalLinkedCategoryId) {
        const foundCat = activityCategories.find(c => c.activities.some(a => a.id === t.linkedActivityId));
        if (foundCat) {
          finalLinkedCategoryId = foundCat.id;
        }
      }

      return {
        title: t.title,
        categoryId: t.categoryId,
        linkedActivityId: t.linkedActivityId,
        linkedCategoryId: finalLinkedCategoryId,
        defaultScopeIds: t.defaultScopeIds,
        isCompleted: false
      };
    });
    onBatchAddTodos?.(newTodos);
    setIsAIConfirmOpen(false);
  };

  // 娴?localStorage 鐠囪褰囬悽銊﹀煕娑撳﹥顐奸柅澶嬪閻ㄥ嫯顫嬮崶鐐佸?
  const [viewMode, setViewMode] = useState<'loose' | 'compact'>(() => {
    const saved = localStorage.getItem('todoViewMode');
    return (saved === 'compact' || saved === 'loose') ? saved : 'loose';
  });
  const [showCompletedTodos, setShowCompletedTodos] = useState<boolean>(() => {
    const saved = localStorage.getItem('todoShowCompleted');
    return saved !== 'false';
  });

  // 瑜?viewMode 閺€鐟板綁閺冭绱濇穱婵嗙摠閸?localStorage
  React.useEffect(() => {
    localStorage.setItem('todoViewMode', viewMode);
  }, [viewMode]);

  React.useEffect(() => {
    localStorage.setItem('todoShowCompleted', showCompletedTodos ? 'true' : 'false');
  }, [showCompletedTodos]);

  React.useEffect(() => {
    localStorage.setItem('todoScreenMode', screenMode);
    window.dispatchEvent(new CustomEvent('todo-schedule-mode-changed', {
      detail: { isWeekMode: screenMode === 'week' }
    }));
    return () => {
      window.dispatchEvent(new CustomEvent('todo-schedule-mode-changed', {
        detail: { isWeekMode: false }
      }));
    };
  }, [screenMode]);

  React.useEffect(() => {
    const handleThemeChange = () => {
      setHasCustomIconTheme(uiIconService.isCustomTheme());
    };

    window.addEventListener('ui-icon-theme-changed', handleThemeChange);
    return () => {
      window.removeEventListener('ui-icon-theme-changed', handleThemeChange);
    };
  }, []);

  // 閸掓繂顫愰崠鏍偓澶夎厬閻ㄥ嫬鍨庣猾浼欑窗婵″倹鐏夊▽鈩冩箒闁鑵戞禒璁崇秿閸掑棛琚敍宀勭帛鐠併倝鈧鑵戠粭顑跨娑?
  React.useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId) || categories[0];

  // 婵″倹鐏夊▽鈩冩箒閸掑棛琚敍灞炬▔缁€铏光敄閻樿埖鈧浇鈧奔绗夐弰顖氱┛濠?
  if (!selectedCategory) {
    return (
      <div className="flex h-full items-center justify-center bg-[#faf9f6] flex-col gap-4">
        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-300">
          <LayoutList size={32} />
        </div>
        <div className="text-center">
          <p className="text-stone-500 font-bold mb-1">No todo categories yet.</p>
          <p className="text-xs text-stone-400">Create a category first to start adding tasks.</p>
        </div>
      </div>
    );
  }

  const filteredTodos = todos
    .filter(t => t.categoryId === selectedCategoryId)
    .filter(t => showCompletedTodos || !t.isCompleted)
    .sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted));

  const weekTodos = useMemo(() => todos, [todos]);

  const weekBuckets = useMemo(
    () => buildWeekTodoBuckets(weekTodos, logs, weekReferenceDate),
    [weekReferenceDate, weekTodos, logs]
  );

  const weekDates = useMemo(() => getWeekDates(weekReferenceDate), [weekReferenceDate]);
  const isCurrentWeek = useMemo(
    () => weekDates.some((date) => getTodayDateKey() === formatDateKey(date)),
    [weekDates]
  );
  const currentWeekLabel = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    if (!start || !end) return '';
    const startMonth = start.getMonth() + 1;
    const endMonth = end.getMonth() + 1;
    return startMonth === endMonth
      ? `${startMonth}.${start.getDate()} - ${end.getDate()}`
      : `${startMonth}.${start.getDate()} - ${endMonth}.${end.getDate()}`;
  }, [weekDates]);

  if (screenMode === 'week') {
    return (
      <div
        className="relative h-full overflow-hidden"
        style={{
          backgroundColor: hasBackground ? 'transparent' : 'rgb(250, 249, 246)'
        }}
      >
        {hasBackground && (
          <div
            className="absolute inset-0 -z-20"
            style={{
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              transform: 'translateZ(0)'
            }}
          />
        )}

        <div className="absolute inset-0 -z-10" style={{ backgroundColor: 'rgba(250, 249, 246, 0.92)' }}></div>

        <div className={`relative z-10 flex h-full flex-col px-4 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] md:px-8 ${useReducedEffects ? '' : 'backdrop-blur-[2px]'}`}>
          <div className="shrink-0 border-b border-stone-300/70">
            <div className="flex h-14 items-center">
              <div className="flex items-center gap-2 text-slate-500">
                <button
                  type="button"
                  onClick={() => setWeekReferenceDate((prev) => {
                    const next = new Date(prev);
                    next.setDate(prev.getDate() - 7);
                    return next;
                  })}
                  className="rounded-full p-1.5 transition-colors hover:bg-white/60 hover:text-slate-700"
                  title="上一周"
                >
                  <ChevronLeft size={15} />
                </button>
                <div className="text-[13px] tracking-[0.16em] text-slate-500">{currentWeekLabel}</div>
                <button
                  type="button"
                  onClick={() => setWeekReferenceDate((prev) => {
                    const next = new Date(prev);
                    next.setDate(prev.getDate() + 7);
                    return next;
                  })}
                  className="rounded-full p-1.5 transition-colors hover:bg-white/60 hover:text-slate-700"
                  title="下一周"
                >
                  <ChevronRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setWeekReferenceDate(new Date())}
                  className={`ml-1 rounded-full px-2.5 py-1 text-[10px] tracking-[0.14em] transition-colors ${
                    isCurrentWeek
                      ? 'bg-stone-100 text-slate-600'
                      : 'text-slate-400 hover:bg-white/50 hover:text-slate-600'
                  }`}
                >
                  本周
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
            <div className="border-t border-stone-300/70">
              {weekBuckets.map((bucket, index) => {
                const bucketDate = parseDateKey(bucket.date);
                const isToday = bucket.date === getTodayDateKey();

                return (
                  <section
                    key={bucket.date}
                    className="grid min-h-[5.5rem] grid-cols-[4.25rem_minmax(0,1fr)] border-b border-stone-300/70 md:grid-cols-[4.75rem_minmax(0,1fr)]"
                  >
                    <div className="flex flex-col justify-center border-r border-stone-300/70 px-2 py-3 text-center md:px-3">
                      <div className={`text-[12px] tracking-[0.02em] ${isToday ? 'text-slate-600' : 'text-slate-400'}`}>
                        {WEEKDAY_ROW_LABELS[index]}
                      </div>
                      <div className={`mt-1 text-[19px] leading-none md:text-[22px] font-calendar ${isToday ? 'font-semibold text-slate-800' : 'font-medium text-slate-700'}`}>
                        {bucketDate?.getDate() || '--'}
                      </div>
                      <div className="mt-1 text-[10px] tracking-[0.02em] text-slate-400">
                        {bucketDate ? `${bucketDate.getMonth() + 1}月` : ''}
                      </div>
                    </div>

                    <div className="flex min-w-0 items-stretch px-4 py-3 md:px-5">
                      <div className="flex min-h-full w-full items-center">
                        {bucket.items.length > 0 ? (
                          <div className="w-full space-y-0.5">
                            {bucket.items.map((entry) => (
                              <WeekTodoLineItem
                                key={`${bucket.date}-${entry.todo.id}`}
                                entry={entry}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="w-full py-2 text-[14px] italic text-slate-300">
                            Silence is part of the schedule.
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>

        <FloatingButton
          onClick={() => setScreenMode('list')}
          title="切换回列表"
          ariaLabel="切换回列表"
          disableThemeStyle={!hasCustomIconTheme}
          className="text-white shadow-[0_14px_34px_rgba(15,23,42,0.16)]"
        >
          <UIIcon type="tags" fallbackIcon={ListTodo} size={24} className="text-white" style={{ color: '#ffffff' }} />
        </FloatingButton>

        {isAIInputOpen && (
          <AITodoInputModal
            onClose={() => setIsAIInputOpen(false)}
            onGenerate={handleAIGenerate}
            isLoading={isAIGenerating}
          />
        )}

        {isAIConfirmOpen && (
          <AITodoConfirmModal
            onClose={() => setIsAIConfirmOpen(false)}
            onSave={handleAISave}
            initialTasks={aiParsedTasks}
            todoCategories={categories}
            activityCategories={activityCategories}
            scopes={scopes}
            autoLinkRules={autoLinkRules}
          />
        )}
      </div>
    );
  }

  return (
    <div 
      className="flex h-full relative"
      style={{
        backgroundColor: hasBackground ? 'transparent' : '#faf9f6'
      }}
    >
      {/* 閼冲本娅欓崶鍓у鐏?*/}
      {hasBackground && (
        <div 
          className="absolute inset-0 -z-20"
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            transform: 'translateZ(0)'
          }}
        />
      )}
      
      {/* 閸忋劌鐪崡濠団偓蹇旀闁喚鍍电仦?- 鐟曞棛娲婇弫缈犻嚋娑撳宕愰柈銊ュ瀻 */}
      <div className="absolute inset-0 -z-10" style={{ backgroundColor: 'rgba(250, 249, 246, 0.5)' }}></div>
      
      {/* Left Sidebar - Todo Categories */}
      <div
        className={`flex-shrink-0 flex flex-col overflow-y-auto pt-6 pb-20 pl-0 pr-2 no-scrollbar z-0 transition-all duration-300 relative ${isSidebarOpen ? 'w-auto md:min-w-[12rem]' : 'w-16 items-center'}`}
      >
        <div className="flex-1 w-full">
          {categories.map((category) => {
            const isSelected = selectedCategoryId === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`
                  flex items-center gap-2 mb-1 transition-all duration-200 text-left relative rounded-r-2xl group
                  ${isSelected
                    ? 'text-stone-900 font-bold bg-white shadow-[2px_2px_10px_rgba(0,0,0,0.02)] z-10'
                    : 'text-stone-600 hover:text-stone-800'
                  }
                  ${!isSidebarOpen ? 'justify-center w-12 h-12 md:w-14 md:h-14' : 'w-full h-12 md:h-14 px-4'}
                `}
                title={!isSidebarOpen ? category.name : undefined}
              >
                {isSelected && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full" style={{ backgroundColor: 'var(--accent-color)' }}></div>
                )}
                <IconRenderer 
                  icon={category.icon} 
                  uiIcon={category.uiIcon}
                  size={20}
                  className={`text-xl flex-shrink-0 ${isSelected ? 'opacity-100' : 'opacity-100'}`} 
                />
                {isSidebarOpen && (
                  <span className={`text-sm md:text-base whitespace-nowrap transition-all ${isSelected ? 'font-bold' : 'font-medium'}`}>
                    {category.name}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowCompletedTodos(prev => !prev)}
          className={`mt-2 mb-2 p-2 rounded-full text-stone-400 hover:bg-white/50 hover:text-stone-500 transition-all active:scale-95 ${isSidebarOpen ? 'self-end mr-4' : 'mx-auto'}`}
          title={showCompletedTodos ? 'Hide Completed Todos' : 'Show Completed Todos'}
        >
          {showCompletedTodos ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>

        {/* View Mode Toggle Button */}
        <button
          onClick={() => setViewMode(prev => prev === 'loose' ? 'compact' : 'loose')}
          className={`mb-2 p-2 rounded-full text-stone-400 hover:bg-white/50 hover:text-stone-500 transition-all active:scale-95 ${isSidebarOpen ? 'self-end mr-4' : 'mx-auto'}`}
          title={viewMode === 'loose' ? "Switch to Compact View" : "Switch to Loose View"}
        >
          {viewMode === 'loose' ? <Rows size={20} /> : <LayoutList size={20} />}
        </button>

        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`mt-1 p-2 rounded-full text-stone-400 hover:bg-white/50 hover:text-stone-500 transition-all active:scale-95 ${isSidebarOpen ? 'self-end mr-4' : 'mx-auto'}`}
        >
          {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Right Content - Task List */}
      <div 
        className="flex-1 overflow-hidden flex flex-col p-5 md:p-10 rounded-tl-[2rem] shadow-[-5px_0_20px_rgba(0,0,0,0.08)] z-10 ml-[-10px] relative"
        id="todo-content"
      >
        {/* 閸楀﹪鈧繑妲戦惂鍊熷闁喚鍍电仦?- 闁繑妲戞惔锔界壌閹诡喚鏁ら幋鐤啎缂冾喖濮╅幀浣界殶閺?*/}
        <div 
          className={`absolute inset-0 -z-10 rounded-tl-[2rem] ${useReducedEffects ? '' : 'backdrop-blur-sm'}`}
          style={{
            backgroundColor: `rgba(255, 255, 255, ${panelOverlayOpacity})`
          }}
        />

        {/* Header */}
        <div className="mb-6 flex items-center justify-between mt-2 md:mt-0">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-3">
              {selectedCategory.name}
              <span className="text-stone-300 text-lg font-normal">Tasks</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAIInputOpen(true)}
              className="theme-icon-button"
              title="AI Add Task"
            >
              <Sparkles size={16} />
            </button>
            <button
              onClick={() => onAddTodo(selectedCategoryId)}
              className="floating-button w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
          {filteredTodos.map((todo, index) => (
            <SwipeableTodoItem
              key={todo.id}
              todo={todo}
              categories={categories}
              activityCategories={activityCategories}
              scopes={scopes}
              onToggle={onToggleTodo}
              onEdit={onEditTodo}
              onStartFocus={onStartFocus}
              onDuplicate={onDuplicateTodo}
              viewMode={viewMode}
              isFirst={index === 0}
              isLast={index === filteredTodos.length - 1}
            />
          ))}

          {filteredTodos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-stone-300">
              <MoreHorizontal size={40} className="mb-4 opacity-50" />
              <p className="text-sm font-serif italic">No tasks yet.</p>
            </div>
          )}
        </div>
      </div>

      <FloatingButton
        onClick={() => setScreenMode((prev) => prev === 'list' ? 'week' : 'list')}
        title={screenMode === 'list' ? '切换到周视图' : '切换回列表'}
        ariaLabel={screenMode === 'list' ? '切换到周视图' : '切换回列表'}
        disableThemeStyle={!hasCustomIconTheme}
      >
        {screenMode === 'list' ? (
          <UIIcon type="calendar" fallbackIcon={CalendarDays} size={24} className={hasCustomIconTheme ? 'text-white' : 'text-stone-600'} />
        ) : (
          <UIIcon type="tags" fallbackIcon={ListTodo} size={24} className={hasCustomIconTheme ? 'text-white' : 'text-stone-600'} />
        )}
      </FloatingButton>

      {isAIInputOpen && (
        <AITodoInputModal
          onClose={() => setIsAIInputOpen(false)}
          onGenerate={handleAIGenerate}
          isLoading={isAIGenerating}
        />
      )}

      {isAIConfirmOpen && (
        <AITodoConfirmModal
          onClose={() => setIsAIConfirmOpen(false)}
          onSave={handleAISave}
          initialTasks={aiParsedTasks}
          todoCategories={categories}
          activityCategories={activityCategories}
          scopes={scopes}
          autoLinkRules={autoLinkRules}
        />
      )}
    </div>
  );
};
