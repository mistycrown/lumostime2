/**
 * @file AddLogModal.tsx
 * @input props: initialLog, time ranges, categories, todos, etc.
 * @output Modal Interaction (Save/Delete Log)
 * @pos Component (Modal)
 * @description A complex modal for creating or editing time logs. Handles duration calculation, activity selection, todo association, and focus scoring.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Category, Log, TodoItem, TodoCategory, Scope, AutoLinkRule, Comment } from '../types';
import { X, Trash2, TrendingUp, Plus, Minus, Lightbulb, Check, CheckCircle2, Clock, Camera, Image as ImageIcon, Maximize2, Minimize2, Share2 } from 'lucide-react';
import { TodoAssociation } from '../components/TodoAssociation';
import { TagAssociation } from '../components/TagAssociation';
import { ScopeAssociation } from '../components/ScopeAssociation';
import { FocusScoreSelector } from '../components/FocusScoreSelector';
import { CommentSection } from '../components/CommentSection';
import { ImagePreviewModal } from './ImagePreviewModal';
import { ReactionPicker, ReactionList } from './ReactionComponents';
import { IconRenderer } from './IconRenderer';
import { useLogForm, useTimeCalculation, useImageManager, useSuggestions } from '../hooks';
import { useNavigation } from '../contexts/NavigationContext';

interface AddLogModalProps {
  initialLog?: Log | null;
  initialStartTime?: number;
  initialEndTime?: number;
  onClose: () => void;
  onSave: (log: Log) => void;

  onDelete?: (id: string) => void;
  onImageRemove?: (logId: string, filename: string) => void;
  categories: Category[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  scopes: Scope[];
  autoLinkRules?: AutoLinkRule[];
  lastLogEndTime?: number;
  autoFocusNote?: boolean;
  allLogs?: Log[]; // 添加所有日志用于计算上一条记录
}

export const AddLogModal: React.FC<AddLogModalProps> = ({ initialLog, initialStartTime, initialEndTime, onClose, onSave, onDelete, onImageRemove, categories, todos, todoCategories, scopes, autoLinkRules = [], lastLogEndTime, autoFocusNote = true, allLogs = [] }) => {
  // 使用自定义 Hooks 管理状态
  const { setIsShareViewOpen, setSharingLog } = useNavigation();
  
  const { formState, updateField, updateFields, previousLogEndTime } = useLogForm({
    initialLog,
    initialStartTime,
    initialEndTime,
    categories,
    todos,
    todoCategories,
    lastLogEndTime,
    allLogs
  });

  // 时间计算
  const timeCalc = useTimeCalculation(
    formState.currentStartTime,
    formState.currentEndTime,
    formState.trackStartTime,
    formState.trackEndTime
  );

  // 图片管理
  const imageManager = useImageManager(formState.images);

  // 建议系统
  const suggestions = useSuggestions(
    formState.linkedTodoId,
    formState.note,
    formState.selectedActivityId,
    formState.scopeIds,
    categories,
    todos,
    scopes,
    autoLinkRules
  );

  // UI 状态
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);

  // Refs
  const sliderRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus note on new log
  useEffect(() => {
    if (!initialLog && noteRef.current && autoFocusNote) {
      setTimeout(() => {
        noteRef.current?.focus();
        noteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    }
  }, [initialLog, autoFocusNote]);

  // 同步图片状态到 formState
  useEffect(() => {
    if (imageManager.images !== formState.images) {
      updateField('images', imageManager.images);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageManager.images]); // 只依赖 imageManager.images，避免循环

  // 事件处理函数
  const handleTimeInput = (type: 'start' | 'end', field: 'h' | 'm', value: number) => {
    const newTime = timeCalc.createTimeFromInput(
      type === 'start' ? formState.currentStartTime : formState.currentEndTime,
      field,
      value
    );
    updateField(type === 'start' ? 'currentStartTime' : 'currentEndTime', newTime);
  };

  const handleSetStartToNow = () => {
    const now = timeCalc.setToNow('start', formState.currentStartTime);
    updateField('currentStartTime', now);
  };

  const handleSetEndToNow = () => {
    const now = timeCalc.setToNow('end', formState.currentStartTime);
    updateField('currentEndTime', now);
  };

  const handleSetStartToPreviousEnd = () => {
    if (previousLogEndTime) {
      updateField('currentStartTime', previousLogEndTime);
    } else {
      handleSetStartToNow();
    }
  };

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      await imageManager.handleAddImage(e.target.files[0]);
    }
  };

  const handleDeleteImage = async (filename: string) => {
    await imageManager.handleDeleteImage(filename);
    if (initialLog && onImageRemove) {
      onImageRemove(initialLog.id, filename);
    }
  };

  const handleAddComment = (content: string) => {
    const newComment: Comment = {
      id: crypto.randomUUID(),
      content,
      createdAt: Date.now()
    };
    updateField('comments', [...formState.comments, newComment]);
  };

  const handleEditComment = (commentId: string, content: string) => {
    updateField('comments', formState.comments.map(comment =>
      comment.id === commentId ? { ...comment, content } : comment
    ));
  };

  const handleDeleteComment = (commentId: string) => {
    updateField('comments', formState.comments.filter(c => c.id !== commentId));
  };

  const handleToggleReaction = (emoji: string) => {
    const reactions = formState.reactions;
    if (reactions.includes(emoji)) {
      updateField('reactions', reactions.filter(r => r !== emoji));
    } else {
      updateField('reactions', [...reactions, emoji]);
    }
  };

  const handleAcceptActivity = () => {
    if (suggestions.activity) {
      updateFields({
        selectedCategoryId: suggestions.activity.categoryId,
        selectedActivityId: suggestions.activity.id
      });
    }
  };

  const handleAcceptScope = (scopeId: string) => {
    const currentScopeIds = formState.scopeIds || [];
    if (!currentScopeIds.includes(scopeId)) {
      updateField('scopeIds', [...currentScopeIds, scopeId]);
    }
  };

  const handleSave = () => {
    const duration = (formState.currentEndTime - formState.currentStartTime) / 1000;
    if (duration <= 0) return;

    const newLog: Log = {
      id: initialLog ? initialLog.id : crypto.randomUUID(),
      categoryId: formState.selectedCategoryId,
      activityId: formState.selectedActivityId,
      startTime: formState.currentStartTime,
      endTime: formState.currentEndTime,
      duration: duration,
      note: formState.note.trim(),
      linkedTodoId: formState.linkedTodoId,
      progressIncrement: formState.linkedTodoId && formState.progressIncrement ? formState.progressIncrement : undefined,
      focusScore: formState.focusScore,
      scopeIds: formState.scopeIds,
      images: imageManager.images,
      comments: formState.comments.length > 0 ? formState.comments : undefined,
      reactions: formState.reactions.length > 0 ? formState.reactions : undefined,
    };
    onSave(newLog);
  };

  const handleDelete = () => {
    if (initialLog && onDelete) {
      onDelete(initialLog.id);
    }
  };

  // 滑块拖动逻辑
  const handleDragUpdate = (clientX: number) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const newTime = timeCalc.calculateTimeFromClientX(clientX, rect);
    if (newTime === null) return;

    if (isDraggingStart) {
      if (newTime > formState.currentEndTime) {
        updateField('currentStartTime', formState.currentEndTime);
      } else if (newTime < formState.trackStartTime) {
        updateField('currentStartTime', formState.trackStartTime);
      } else {
        updateField('currentStartTime', newTime);
      }
    } else if (isDraggingEnd) {
      if (newTime < formState.currentStartTime) {
        updateField('currentEndTime', formState.currentStartTime);
      } else if (newTime > formState.trackEndTime) {
        updateField('currentEndTime', formState.trackEndTime);
      } else {
        updateField('currentEndTime', newTime);
      }
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleDragUpdate(e.clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      handleDragUpdate(e.touches[0].clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingStart(false);
    setIsDraggingEnd(false);
  };

  useEffect(() => {
    if (isDraggingStart || isDraggingEnd) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingStart, isDraggingEnd, formState.currentStartTime, formState.currentEndTime, formState.trackStartTime, formState.trackEndTime]);

  // Derived values
  const selectedCategory = categories.find(c => c.id === formState.selectedCategoryId) || categories[0];
  const linkedTodo = todos.find(t => t.id === formState.linkedTodoId);
  const hasSuggestions = suggestions.activity || suggestions.scopes.length > 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-stone-900/40 backdrop-blur-sm animate-fadeIn pb-[env(safe-area-inset-bottom)]"
      onClick={onClose}
    >
      {/* Modal Content - Bottom Sheet on Mobile, Center on Desktop */}
      <div
        className="w-full h-[85vh] md:h-auto md:max-h-[85vh] md:max-w-2xl bg-[#faf9f6] rounded-t-[2rem] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-white/50">
          <button onClick={onClose} className="p-2 -ml-2 hover:bg-stone-100 rounded-full text-stone-500 transition-colors">
            <X size={24} />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-1">Total Time</span>
            <span className="text-2xl font-bold text-stone-900 tabular-nums font-mono">{timeCalc.durationDisplay}</span>
          </div>
          <div className="w-10 flex justify-end">
            <button
              onClick={handleSave}
              className="p-2 -mr-2 rounded-full transition-colors"
              style={{ color: 'var(--accent-color)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Check size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 no-scrollbar pb-60">

          {/* Time Input & Slider */}
          <div className="space-y-6">
            {/* Manual Inputs */}
            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Start</span>
                <div className="flex items-center bg-white rounded-xl border border-stone-200 px-3 py-2 shadow-sm">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0} max={23}
                    value={String(timeCalc.startHM.h).padStart(2, '0')}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '') return;
                      const num = parseInt(val);
                      if (!isNaN(num)) handleTimeInput('start', 'h', num);
                    }}
                    onBlur={e => {
                      const val = e.target.value;
                      if (val === '') handleTimeInput('start', 'h', 0);
                    }}
                    onFocus={e => e.target.select()}
                    className="w-8 text-center text-xl font-mono font-bold text-stone-800 outline-none bg-transparent"
                  />
                  <span className="text-stone-300 mx-1">:</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0} max={59}
                    value={String(timeCalc.startHM.m).padStart(2, '0')}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '') return; // 允许清空
                      const num = parseInt(val);
                      if (!isNaN(num)) handleTimeInput('start', 'm', num);
                    }}
                    onBlur={e => {
                      const val = e.target.value;
                      if (val === '') handleTimeInput('start', 'm', 0);
                    }}
                    onFocus={e => e.target.select()}
                    className="w-8 text-center text-xl font-mono font-bold text-stone-800 outline-none bg-transparent"
                  />
                </div>

                <button
                  onClick={handleSetStartToPreviousEnd}
                  className="mt-2 flex items-center gap-1 px-2 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors active:scale-95"
                  title="设置开始时间为上一条记录的结束时间"
                >
                  <Clock size={12} />
                  <span>到上尾</span>
                </button>
              </div>

              <div className="h-px w-8 bg-stone-300 mt-6"></div>

              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">End</span>
                <div className="flex items-center bg-white rounded-xl border border-stone-200 px-3 py-2 shadow-sm">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0} max={23}
                    value={String(timeCalc.endHM.h).padStart(2, '0')}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '') return;
                      const num = parseInt(val);
                      if (!isNaN(num)) handleTimeInput('end', 'h', num);
                    }}
                    onBlur={e => {
                      const val = e.target.value;
                      if (val === '') handleTimeInput('end', 'h', 0);
                    }}
                    onFocus={e => e.target.select()}
                    className="w-8 text-center text-xl font-mono font-bold text-stone-800 outline-none bg-transparent"
                  />
                  <span className="text-stone-300 mx-1">:</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0} max={59}
                    value={String(timeCalc.endHM.m).padStart(2, '0')}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '') return; // 允许清空
                      const num = parseInt(val);
                      if (!isNaN(num)) handleTimeInput('end', 'm', num);
                    }}
                    onBlur={e => {
                      const val = e.target.value;
                      if (val === '') handleTimeInput('end', 'm', 0);
                    }}
                    onFocus={e => e.target.select()}
                    className="w-8 text-center text-xl font-mono font-bold text-stone-800 outline-none bg-transparent"
                  />
                </div>
                <button
                  onClick={handleSetEndToNow}
                  className="mt-2 flex items-center gap-1 px-2 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors active:scale-95"
                  title="设置结束时间为当前时间"
                >
                  <Clock size={12} />
                  <span>到现在</span>
                </button>
              </div>
            </div>

            {/* Slider (Dual Handle) */}
            <div className="px-2 pt-4 pb-2">
              <div
                ref={sliderRef}
                className="relative h-2 bg-stone-200 rounded-full w-full touch-none"
              >
                {/* Track Fill */}
                <div
                  className="absolute top-0 h-full opacity-20 rounded-full"
                  style={{ 
                    left: `${timeCalc.startPercent}%`, 
                    width: `${timeCalc.endPercent - timeCalc.startPercent}%`,
                    backgroundColor: 'var(--accent-color)'
                  }}
                />

                {/* Left Handle */}
                <div
                  onMouseDown={() => setIsDraggingStart(true)}
                  onTouchStart={(e) => { e.stopPropagation(); setIsDraggingStart(true); }}
                  className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 rounded-full shadow-md z-10 flex items-center justify-center hover:scale-110 transition-transform cursor-grab active:cursor-grabbing"
                  style={{ 
                    left: `calc(${timeCalc.startPercent}% - 12px)`,
                    borderColor: 'var(--accent-color)'
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-color)' }} />
                </div>

                {/* Right Handle */}
                <div
                  onMouseDown={() => setIsDraggingEnd(true)}
                  onTouchStart={(e) => { e.stopPropagation(); setIsDraggingEnd(true); }}
                  className="absolute top-1/2 -translate-y-1/2 w-6 h-6 border-2 rounded-full shadow-md z-10 flex items-center justify-center hover:scale-110 transition-transform cursor-grab active:cursor-grabbing"
                  style={{ 
                    left: `calc(${timeCalc.endPercent}% - 12px)`,
                    backgroundColor: 'var(--accent-color)',
                    borderColor: 'var(--accent-color)'
                  }}
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-stone-400 font-mono">
                <span>{new Date(formState.trackStartTime).getHours()}:{String(new Date(formState.trackStartTime).getMinutes()).padStart(2, '0')}</span>
                <span>Max: {Math.floor(timeCalc.trackDuration / 1000 / 60)}m</span>
                <span>{new Date(formState.trackEndTime).getHours()}:{String(new Date(formState.trackEndTime).getMinutes()).padStart(2, '0')}</span>
              </div>
            </div>
          </div>

          {/* Activity Selection (Grid) */}
          <TagAssociation
            categories={categories}
            selectedCategoryId={formState.selectedCategoryId}
            selectedActivityId={formState.selectedActivityId}
            onCategorySelect={(id) => updateField('selectedCategoryId', id)}
            onActivitySelect={(id) => updateField('selectedActivityId', id)}
          />

          {/* Todo Association with Embedded Progress */}
          <div className="space-y-0">
            <TodoAssociation
              todos={todos}
              todoCategories={todoCategories}
              linkedTodoId={formState.linkedTodoId}
              onChange={(id) => {
                updateFields({
                  linkedTodoId: id,
                  progressIncrement: 0
                });
              }}
              renderExtraContent={(tId) => {
                const t = todos.find(x => x.id === tId);
                if (!t?.isProgress) return null;
                return (
                  <div className="pt-0 flex items-center justify-between animate-in slide-in-from-top-2">
                    {/* Left: Label + Stats */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-stone-400">P.</span>
                      <div className="flex items-center gap-1.5 text-[10px] text-stone-400 px-2 py-1 rounded-md border border-stone-100 bg-stone-50">
                        <TrendingUp size={10} />
                        <span className="font-mono">{t.completedUnits || 0} / {t.totalAmount}</span>
                      </div>
                    </div>

                    {/* Right: Controls */}
                    <div className="flex items-center rounded-lg p-0.5 scale-90 origin-right">
                      <button
                        onClick={() => updateField('progressIncrement', Math.max(0, formState.progressIncrement - 1))}
                        className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100/50 rounded-md transition-colors active:scale-95"
                      >
                        <Minus size={16} />
                      </button>
                      <div className="flex items-center justify-center min-w-[40px]">
                        {formState.progressIncrement > 0 && <span className="text-xs font-bold text-stone-800 mr-0.5">+</span>}
                        <input
                          type="number"
                          min={0}
                          value={formState.progressIncrement}
                          onChange={(e) => updateField('progressIncrement', Math.max(0, parseInt(e.target.value) || 0))}
                          className={`w-8 text-left text-sm font-bold tabular-nums bg-transparent outline-none p-0 border-none focus:ring-0 ${formState.progressIncrement > 0 ? 'text-stone-800' : 'text-stone-300'}`}
                        />
                      </div>
                      <button
                        onClick={() => updateField('progressIncrement', formState.progressIncrement + 1)}
                        className="w-8 h-8 flex items-center justify-center text-stone-600 hover:bg-stone-100/50 rounded-md transition-colors active:scale-95"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                );
              }}
            />
          </div>

          {/* Scope Association */}
          <div className="space-y-0">
            <ScopeAssociation
              scopes={scopes}
              selectedScopeIds={formState.scopeIds}
              onSelect={(ids) => updateField('scopeIds', ids)}
            />
          </div>

          {/* Focus Score Selector */}
          {
            (() => {
              const cat = categories.find(c => c.id === formState.selectedCategoryId);
              const act = cat?.activities.find(a => a.id === formState.selectedActivityId);

              // Check if should show focus score: activity > category > any associated scope
              let shouldShowFocus = act?.enableFocusScore ?? cat?.enableFocusScore;

              // Also check if any of the selected scopes has enableFocusScore
              if (!shouldShowFocus && formState.scopeIds && formState.scopeIds.length > 0) {
                shouldShowFocus = formState.scopeIds.some(sid => {
                  const scope = scopes.find(s => s.id === sid);
                  return scope?.enableFocusScore === true;
                });
              }

              if (shouldShowFocus) {
                return (
                  <div className="space-y-4 animate-in slide-in-from-top-2">
                    <FocusScoreSelector value={formState.focusScore} onChange={(score) => updateField('focusScore', score)} />
                  </div>
                );
              }
              return null;
            })()
          }

          {/* Smart Association Suggestion (Unified) */}
          {hasSuggestions && (
            <div className="p-3 rounded-xl animate-in slide-in-from-top-2" style={{ backgroundColor: 'var(--secondary-button-bg)', borderColor: 'var(--secondary-button-border)', borderWidth: '1px' }}>
              <div className="flex items-start gap-2">
                <Lightbulb size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-color)' }} />
                <div className="flex-1">
                  <p className="text-xs font-bold mb-2" style={{ color: 'var(--accent-color)' }}>建议关联</p>
                  <div className="flex flex-wrap gap-2">

                    {/* Activity Suggestions */}
                    {suggestions.activity && (
                      <button
                        onClick={handleAcceptActivity}
                        className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg text-xs font-medium transition-colors active:scale-95"
                        style={{ borderColor: 'var(--accent-color)', borderWidth: '1px', color: 'var(--accent-color)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--secondary-button-hover-bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <span className="opacity-70 text-[10px] mr-0.5">[{suggestions.activity.reason}]</span>
                        <IconRenderer icon={suggestions.activity.icon} className="text-xs" />
                        <span>{suggestions.activity.name}</span>
                        <CheckCircle2 size={12} />
                      </button>
                    )}

                    {/* Scope Suggestions */}
                    {suggestions.scopes.map(scope => (
                      <button
                        key={scope.id}
                        onClick={() => handleAcceptScope(scope.id)}
                        className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg text-xs font-medium transition-colors active:scale-95"
                        style={{ borderColor: 'var(--accent-color)', borderWidth: '1px', color: 'var(--accent-color)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--secondary-button-hover-bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <span className="opacity-70 text-[10px] mr-0.5">[{scope.reason}]</span>
                        <IconRenderer 
                            icon={scope.icon} 
                            className="text-xs" 
                        />
                        <span>{scope.name}</span>
                        <CheckCircle2 size={12} />
                      </button>
                    ))}

                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Note Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Note</span>
              <button
                onClick={() => setIsNoteExpanded(!isNoteExpanded)}
                className="text-stone-400 hover:text-stone-600 transition-all duration-200 p-1 rounded-md hover:bg-stone-100"
                title={isNoteExpanded ? "收缩输入框" : "扩展输入框"}
              >
                {isNoteExpanded ? <Minimize2 size={16} /> : <Minimize2 size={16} className="rotate-180" />}
              </button>
            </div>
            <textarea
              ref={noteRef}
              value={formState.note}
              onChange={e => updateField('note', e.target.value)}
              className={`w-full bg-white border border-stone-200 rounded-2xl p-4 text-stone-800 text-sm shadow-sm focus:outline-none focus:ring-1 focus:border-stone-200 resize-none placeholder:text-stone-300 font-serif transition-[height] duration-150 ease-out ${isNoteExpanded ? 'h-[400px]' : 'h-[100px]'
                }`}
              style={{
                '--tw-ring-color': 'var(--accent-color)'
              } as React.CSSProperties}
              placeholder="Add a note..."
            />
          </div>

          {/* Image Attachments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Images</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-stone-500 hover:text-stone-800 transition-colors"
              >
                <Plus size={18} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAddImage}
              />
            </div>

            {imageManager.images.length > 0 ? (
              <div className="flex flex-wrap gap-3 pb-2">
                {imageManager.images.map(img => (
                  <div key={img} className="relative group flex-shrink-0">
                    <div
                      className="w-20 h-20 rounded-xl overflow-hidden border border-stone-200 cursor-zoom-in"
                      onClick={() => imageManager.setPreviewFilename(img)}
                    >
                      {imageManager.imageUrls[img] ? (
                        <img src={imageManager.imageUrls[img]} alt="attachment" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-stone-100 flex items-center justify-center">
                          <ImageIcon size={20} className="text-stone-300" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 border border-dashed border-stone-200 rounded-xl flex items-center justify-center gap-2 text-stone-400 hover:text-stone-600 hover:bg-stone-50 cursor-pointer transition-colors"
              >
                <Camera size={18} />
                <span className="text-sm">Add Photos</span>
              </div>
            )}
          </div>

          {/* Reactions Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Reactions</span>
              <ReactionPicker
                onSelect={(emoji) => handleToggleReaction(emoji)}
                currentReactions={formState.reactions}
                align="inline-slide-left"
              />
            </div>
            {formState.reactions.length > 0 ? (
              <ReactionList
                reactions={formState.reactions}
                onToggle={handleToggleReaction}
                className="mt-2"
              />
            ) : (
              <div className="text-xs text-stone-300 italic pt-1 pb-2">No reactions yet</div>
            )}

          </div>

          {/* Comments Section */}
          <div>
            <CommentSection
              comments={formState.comments}
              onAddComment={handleAddComment}
              onEditComment={handleEditComment}
              onDeleteComment={handleDeleteComment}
            />
          </div>

          {/* Share Button */}
          {initialLog && (
            <div className="pt-2">
              <button
                onClick={() => {
                  setSharingLog(initialLog);
                  setIsShareViewOpen(true);
                  onClose(); // Close the log detail modal
                }}
                className="w-full py-3 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-full font-medium text-sm transition-colors active:scale-95"
              >
                Share
              </button>
            </div>
          )}

          {/* Delete Button */}
          {initialLog && onDelete && (
            <div className="pt-2">
              <button
                onClick={handleDelete}
                className="w-full py-3 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full font-medium text-sm transition-colors active:scale-95"
              >
                Delete Task
              </button>
            </div>
          )}

        </div>

      </div >

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>

      {/* Full Screen Image Preview */}
      <ImagePreviewModal
        imageUrl={imageManager.previewFilename ? (imageManager.imageUrls[imageManager.previewFilename] || '') : null}
        onClose={() => imageManager.setPreviewFilename(null)}
        onDelete={() => {
          if (imageManager.previewFilename) {
            handleDeleteImage(imageManager.previewFilename);
            imageManager.setPreviewFilename(null);
          }
        }}
      />
    </div >
  );
};