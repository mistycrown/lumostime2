/**
 * @file TodoView.tsx
 * @input Todos, Categories, Scopes
 * @output Todo Status Updates, Edit Triggers, Focus Timer Start
 * @pos View (Main Tab)
 * @description The main To-Do list interface. Displays tasks grouped by category, supports swipe actions (complete/duplicate), and filtering.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useEffect } from 'react';
import { MOCK_TODO_CATEGORIES } from '../constants';
import { Scope } from '../types';
import { TodoItem, TodoCategory, Category, AutoLinkRule } from '../types';
import { PlayCircle, CheckCircle2, Circle, Plus, MoreHorizontal, Settings2, ChevronLeft, ChevronRight, LayoutList, Rows, Sparkles } from 'lucide-react';
import { AITodoInputModal } from '../components/AITodoInputModal';
import { AITodoConfirmModal, ParsedTask } from '../components/AITodoConfirmModal';
import { aiService, AIParsedTodo } from '../services/aiService';
import { usePrivacy } from '../contexts/PrivacyContext';
import { backgroundService } from '../services/backgroundService';


interface TodoViewProps {
  todos: TodoItem[];
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
    } else if (diff < -minSwipeDistance) {
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
    return act && cat ? { categoryName: cat.name, categoryIcon: cat.icon, activityName: act.name, activityIcon: act.icon } : null;
  })();

  const linkedScopes = (!todo.defaultScopeIds || todo.defaultScopeIds.length === 0)
    ? []
    : todo.defaultScopeIds.map(id => scopes.find(s => s.id === id)).filter(Boolean) as Scope[];

  const { isPrivacyMode } = usePrivacy();

  // 计算圆角样式
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
        style={{ opacity: translateX < 0 ? 1 : 0 }}
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
                    stroke="#e7e5e4"
                    strokeWidth="2"
                  />
                  {/* Progress arc */}
                  <circle
                    cx="8"
                    cy="8"
                    r="7"
                    fill="none"
                    stroke="#2F4F4F"
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
                    <span className="text-xs">{linkedDetails.categoryIcon}</span>
                    <span className="opacity-90">{linkedDetails.categoryName}</span>
                    <span className="text-stone-300 px-0.5">/</span>
                    <span className="text-xs">{linkedDetails.activityIcon}</span>
                    <span className="opacity-90">{linkedDetails.activityName}</span>
                  </>
                ) : (
                  <span className="text-xs">{linkedDetails.activityIcon}</span>
                )}
              </span>
            )}
            {linkedScopes.map((scope, idx) => (
              <span key={idx} className={`text-[11px] text-stone-500 font-medium flex items-center gap-1 ${viewMode === 'compact' ? 'px-0 border-0 bg-transparent' : 'px-1.5 py-0.5 rounded-md border border-stone-200 bg-white/50'}`}>
                <span className="text-stone-300 font-sans">%</span>
                <span className="text-xs">{scope.icon}</span>
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
              <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-stone-900 rounded-full transition-all duration-500"
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

export const TodoView: React.FC<TodoViewProps> = ({ todos, categories, activityCategories, scopes, onToggleTodo, onEditTodo, onAddTodo, onStartFocus, onDuplicateTodo, onBatchAddTodos, autoLinkRules = [] }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || '');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState<string>('');
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(0.1);

  useEffect(() => {
    const updateBackground = () => {
      const bg = backgroundService.getCurrentBackgroundOption();
      const opacity = backgroundService.getBackgroundOpacity();
      setBackgroundUrl(bg?.url || '');
      setBackgroundOpacity(opacity);
    };
    
    updateBackground();
    
    // 监听localStorage变化
    const handleStorageChange = () => {
      updateBackground();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // 定期检查背景变化
    const interval = setInterval(updateBackground, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

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

  // 从 localStorage 读取用户上次选择的视图模式
  const [viewMode, setViewMode] = useState<'loose' | 'compact'>(() => {
    const saved = localStorage.getItem('todoViewMode');
    return (saved === 'compact' || saved === 'loose') ? saved : 'loose';
  });

  // 当 viewMode 改变时，保存到 localStorage
  React.useEffect(() => {
    localStorage.setItem('todoViewMode', viewMode);
  }, [viewMode]);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId) || categories[0];

  // 如果没有分类，显示空状态而不是崩溃
  if (!selectedCategory) {
    return (
      <div className="flex h-full items-center justify-center bg-[#faf9f6] flex-col gap-4">
        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-300">
          <LayoutList size={32} />
        </div>
        <div className="text-center">
          <p className="text-stone-500 font-bold mb-1">暂无待办分类</p>
          <p className="text-xs text-stone-400">请先创建分类以添加待办事项</p>
        </div>
      </div>
    );
  }

  const filteredTodos = todos
    .filter(t => t.categoryId === selectedCategoryId)
    .sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted));

  return (
    <div 
      className="flex h-full relative"
      style={{
        backgroundColor: backgroundUrl && backgroundUrl !== '' ? 'transparent' : '#faf9f6'
      }}
    >
      {/* 背景图片层 */}
      {backgroundUrl && backgroundUrl !== '' && (
        <div 
          className="absolute inset-0 -z-20"
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      )}
      
      {/* 全局半透明遮罩层 - 覆盖整个下半部分 */}
      <div className="absolute inset-0 bg-[#faf9f6]/50 backdrop-blur-md -z-10"></div>
      
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
                  flex items-center gap-2 px-4 py-4 md:py-3 mb-1 transition-all duration-200 text-left relative rounded-r-2xl group w-full
                  ${isSelected
                    ? 'text-stone-900 font-bold bg-white shadow-[2px_2px_10px_rgba(0,0,0,0.02)] z-10'
                    : 'text-stone-600 hover:text-stone-800'
                  }
                  ${!isSidebarOpen && 'justify-center px-0'}
                `}
                title={!isSidebarOpen ? category.name : undefined}
              >
                {isSelected && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-stone-900 rounded-r-full"></div>
                )}
                <span className={`text-xl ${isSelected ? 'opacity-100' : 'opacity-100'}`}>
                  {category.icon}
                </span>
                {isSidebarOpen && (
                  <span className={`text-sm md:text-base whitespace-nowrap transition-all ${isSelected ? 'font-bold' : 'font-medium'}`}>
                    {category.name}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* View Mode Toggle Button */}
        <button
          onClick={() => setViewMode(prev => prev === 'loose' ? 'compact' : 'loose')}
          className={`mt-2 p-2 rounded-full text-stone-600 hover:bg-white hover:text-stone-800 transition-all active:scale-95 mb-2 ${isSidebarOpen ? 'ml-auto mr-0' : 'mx-auto'}`}
          title={viewMode === 'loose' ? "Switch to Compact View" : "Switch to Loose View"}
        >
          {viewMode === 'loose' ? <Rows size={20} /> : <LayoutList size={20} />}
        </button>

        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`mt-1 p-2 rounded-full text-stone-600 hover:bg-white hover:text-stone-800 transition-all active:scale-95 ${isSidebarOpen ? 'ml-auto mr-0' : 'mx-auto'}`}
        >
          {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Right Content - Task List */}
      <div 
        className="flex-1 overflow-hidden flex flex-col p-5 md:p-10 rounded-tl-[2rem] shadow-[-5px_0_20px_rgba(0,0,0,0.08)] z-10 ml-[-10px] relative"
        id="todo-content"
      >
        {/* 主体部分的背景图片层 */}
        {backgroundUrl && backgroundUrl !== '' && (
          <div 
            className="absolute inset-0 -z-20 rounded-tl-[2rem]"
            style={{
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
        )}
        {/* 半透明白色遮罩层 - 透明度根据用户设置动态调整 */}
        <div 
          className="absolute inset-0 -z-10 backdrop-blur-sm rounded-tl-[2rem]"
          style={{
            backgroundColor: `rgba(255, 255, 255, ${1 - backgroundOpacity})`
          }}
        />

        {/* Header */}
        <div className="mb-6 flex items-center justify-between mt-2 md:mt-0">
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-3">
            {selectedCategory.name}
            <span className="text-stone-300 text-lg font-normal">Tasks</span>
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAIInputOpen(true)}
              className="w-8 h-8 rounded-full bg-stone-50 text-stone-400 flex items-center justify-center hover:bg-stone-100 hover:text-stone-600 active:scale-95 transition-all"
              title="AI Add Task"
            >
              <Sparkles size={16} />
            </button>
            <button
              onClick={() => onAddTodo(selectedCategoryId)}
              className="w-10 h-10 rounded-full bg-stone-900 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Task List */}
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