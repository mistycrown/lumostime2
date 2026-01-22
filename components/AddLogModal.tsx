/**
 * @file AddLogModal.tsx
 * @input props: initialLog, time ranges, categories, todos, etc.
 * @output Modal Interaction (Save/Delete Log)
 * @pos Component (Modal)
 * @description A complex modal for creating or editing time logs. Handles duration calculation, activity selection, todo association, and focus scoring.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Category, Log, TodoItem, TodoCategory, Scope, AutoLinkRule, Comment } from '../types';
import { X, Trash2, TrendingUp, Plus, Minus, Lightbulb, CheckCircle2, Clock, Camera, Image as ImageIcon, Maximize2, Minimize2 } from 'lucide-react';
import { TodoAssociation } from '../components/TodoAssociation';
import { ScopeAssociation } from '../components/ScopeAssociation';
import { FocusScoreSelector } from '../components/FocusScoreSelector';
import { CommentSection } from '../components/CommentSection';
import { imageService } from '../services/imageService';
import { ImagePreviewModal } from './ImagePreviewModal';

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
}

export const AddLogModal: React.FC<AddLogModalProps> = ({ initialLog, initialStartTime, initialEndTime, onClose, onSave, onDelete, onImageRemove, categories, todos, todoCategories, scopes, autoLinkRules = [], lastLogEndTime, autoFocusNote = true }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0].id);
  const [selectedActivityId, setSelectedActivityId] = useState<string>(categories[0].activities[0].id);
  const [note, setNote] = useState('');

  const [linkedTodoId, setLinkedTodoId] = useState<string | undefined>(undefined);

  const [progressIncrement, setProgressIncrement] = useState(0);
  const [focusScore, setFocusScore] = useState<number | undefined>(undefined);
  const [scopeIds, setScopeIds] = useState<string[] | undefined>(undefined);
  const [images, setImages] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [previewFilename, setPreviewFilename] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);

  // --- TIME STATE (New Logic) ---
  const [trackStartTime, setTrackStartTime] = useState<number>(0);
  const [trackEndTime, setTrackEndTime] = useState<number>(0);
  const [currentStartTime, setCurrentStartTime] = useState<number>(0);
  const [currentEndTime, setCurrentEndTime] = useState<number>(0);

  useEffect(() => {
    let tStart = 0;
    let tEnd = 0;
    let cStart = 0;
    let cEnd = 0;

    if (initialLog) {
      // Scenario 1: Edit Log -> Track is FIXED to original bounds
      tStart = initialLog.startTime;
      tEnd = initialLog.endTime;
      cStart = initialLog.startTime;
      cEnd = initialLog.endTime;

      setSelectedCategoryId(initialLog.categoryId);
      setSelectedActivityId(initialLog.activityId);
      setNote(initialLog.note || '');
      setLinkedTodoId(initialLog.linkedTodoId);
      setProgressIncrement(initialLog.progressIncrement || 0);
      setFocusScore(initialLog.focusScore);
      setScopeIds(initialLog.scopeIds);
      setImages(initialLog.images || []);
      setComments(initialLog.comments || []);

      // Sync Todo Category
      // (Logic moved to TodoAssociation)

    } else if (initialStartTime && initialEndTime) {
      // Scenario 2: Gap -> Track is Gap, Default Full Selection
      tStart = initialStartTime;
      tEnd = initialEndTime;
      cStart = initialStartTime;
      cEnd = initialEndTime;

      setSelectedCategoryId(categories[0].id);
      setSelectedActivityId(categories[0].activities[0].id);
      setNote('');
      setLinkedTodoId(undefined);
      setProgressIncrement(0);
      setFocusScore(undefined);
      setScopeIds(undefined);
      setImages([]);
      setComments([]);

    } else {
      // Scenario 3: New Button -> Default 1 Hour duration ending Now
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      tStart = oneHourAgo;
      tEnd = now;
      cStart = oneHourAgo;
      cEnd = now;

      setSelectedCategoryId(categories[0].id);
      setSelectedActivityId(categories[0].activities[0].id);
      setNote('');
      setLinkedTodoId(undefined);
      setProgressIncrement(0);
      setFocusScore(undefined);
      setScopeIds(undefined);
      setImages([]);
      setComments([]);

    }

    setTrackStartTime(tStart);
    setTrackEndTime(tEnd);
    setCurrentStartTime(cStart);
    setCurrentEndTime(cEnd);
  }, [initialLog, initialStartTime, initialEndTime, categories, todos, todoCategories]);

  // Unified Suggestion State
  const [suggestions, setSuggestions] = useState<{
    activity?: { id: string; categoryId: string; name: string; icon: string; reason: string; matchedKeyword?: string };
    scopes: { id: string; name: string; icon: string; reason: string }[];
  }>({ scopes: [] });

  // Unified Suggestion Logic
  useEffect(() => {
    const newSuggestions: typeof suggestions = { scopes: [] };

    // 1. Activity Suggestions (Priority: Linked Todo > Note Keywords)
    const linkedTodo = todos.find(t => t.id === linkedTodoId);

    // Check Linked Todo Activity
    if (linkedTodo?.linkedActivityId && linkedTodo.linkedCategoryId) {
      // Only suggest if not already selected
      if (linkedTodo.linkedActivityId !== selectedActivityId) {
        const cat = categories.find(c => c.id === linkedTodo.linkedCategoryId);
        const act = cat?.activities.find(a => a.id === linkedTodo.linkedActivityId);
        if (cat && act) {
          newSuggestions.activity = {
            id: act.id,
            categoryId: cat.id,
            name: act.name,
            icon: act.icon,
            reason: '关联待办'
          };
        }
      }
    }

    // If no todo suggestion, check Note Keywords
    if (!newSuggestions.activity && note) {
      for (const cat of categories) {
        for (const act of cat.activities) {
          // Skip currently selected
          if (act.id === selectedActivityId) continue;

          for (const kw of (act.keywords || [])) {
            if (note.includes(kw)) {
              newSuggestions.activity = {
                id: act.id,
                categoryId: cat.id,
                name: act.name,
                icon: act.icon,
                reason: '关键词匹配',
                matchedKeyword: kw
              };
              break;
            }
          }
          if (newSuggestions.activity) break;
        }
        if (newSuggestions.activity) break;
      }
    }

    // 2. Scope Suggestions (Combine Todo Scopes + AutoLink Rules + Keyword Matching)
    const candidateScopes = new Map<string, { id: string; name: string; icon: string; reason: string }>();

    // From Linked Todo
    if (linkedTodo?.defaultScopeIds) {
      for (const sId of linkedTodo.defaultScopeIds) {
        // Skip if already selected
        if (scopeIds?.includes(sId)) continue;

        const s = scopes.find(scope => scope.id === sId);
        if (s) {
          candidateScopes.set(sId, { id: s.id, name: s.name, icon: s.icon, reason: '关联待办' });
        }
      }
    }

    // From AutoLink Rules (based on currently selected Activity)
    const activeRules = autoLinkRules.filter(r => r.activityId === selectedActivityId);
    for (const rule of activeRules) {
      if (scopeIds?.includes(rule.scopeId)) continue;

      const s = scopes.find(scope => scope.id === rule.scopeId);
      if (s) {
        // If already added by Todo, keep Todo reason (or overwrite? Todo seems more specific)
        if (!candidateScopes.has(rule.scopeId)) {
          candidateScopes.set(rule.scopeId, { id: s.id, name: s.name, icon: s.icon, reason: '自动规则' });
        }
      }
    }

    // From Keyword Matching (based on note content)
    if (note) {
      for (const scope of scopes) {
        // Skip if already selected
        if (scopeIds?.includes(scope.id)) continue;
        // Skip if already suggested by other means
        if (candidateScopes.has(scope.id)) continue;

        // Check if note contains any of the scope's keywords
        for (const kw of (scope.keywords || [])) {
          if (note.includes(kw)) {
            candidateScopes.set(scope.id, {
              id: scope.id,
              name: scope.name,
              icon: scope.icon,
              reason: '关键词匹配'
            });
            break;
          }
        }
      }
    }

    newSuggestions.scopes = Array.from(candidateScopes.values());

    setSuggestions(newSuggestions);

  }, [linkedTodoId, note, selectedActivityId, scopeIds, categories, todos, scopes, autoLinkRules]);

  // Derived Values for Display and Inputs
  // Helper to get H/M from timestamp
  const getHM = (ts: number) => {
    const d = new Date(ts);
    return { h: d.getHours(), m: d.getMinutes() };
  };

  const startHM = useMemo(() => getHM(currentStartTime), [currentStartTime]);
  const endHM = useMemo(() => getHM(currentEndTime), [currentEndTime]);

  // Handle Input Changes (H/M)
  const handleTimeInput = (type: 'start' | 'end', field: 'h' | 'm', value: number) => {
    // 获取日期基准：使用 trackStartTime 的日期部分，确保所有时间都在同一天
    const baseDate = new Date(trackStartTime);
    baseDate.setHours(0, 0, 0, 0);

    // 获取当前时间的小时和分钟
    let targetTime = type === 'start' ? currentStartTime : currentEndTime;
    const currentHM = getHM(targetTime);

    // 根据用户输入创建新的时间
    let newHours = currentHM.h;
    let newMinutes = currentHM.m;

    if (field === 'h') {
      newHours = Math.max(0, Math.min(23, value)); // 限制在 0-23
    } else {
      newMinutes = Math.max(0, Math.min(59, value)); // 限制在 0-59
    }

    // 基于同一天的基准日期构建新时间戳
    const newDate = new Date(baseDate);
    newDate.setHours(newHours, newMinutes, 0, 0);
    const newTime = newDate.getTime();

    // 直接设置新时间，不做约束检查，允许用户自由输入
    // 如果出现 start > end 的情况，在保存时会被验证（handleSave 中 duration <= 0 会阻止保存）
    if (type === 'start') {
      setCurrentStartTime(newTime);
    } else {
      setCurrentEndTime(newTime);
    }
  };

  // --- Image Logic ---
  useEffect(() => {
    const loadUrls = async () => {
      const newUrls: Record<string, string> = {};
      const missingImgs: string[] = [];
      let changed = false;

      for (const img of images) {
        if (!imageUrls[img]) {
          const url = await imageService.getImageUrl(img);
          if (!url) {
            missingImgs.push(img);
          } else {
            newUrls[img] = url;
            changed = true;
          }
        } else if (imageUrls[img] === '') {
          // Double check if existing empty url needs removal
          missingImgs.push(img);
        }
      }

      // Auto-remove missing images
      if (missingImgs.length > 0) {
        console.log('Auto-removing missing images:', missingImgs);
        setImages(prev => prev.filter(i => !missingImgs.includes(i)));
      }

      if (changed) {
        setImageUrls(prev => ({ ...prev, ...newUrls }));
      }
    };
    if (images.length > 0) loadUrls();
  }, [images, imageUrls]);

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        const filename = await imageService.saveImage(file);
        setImages(prev => [...prev, filename]);
      } catch (err) {
        console.error('Failed to save image', err);
      }
    }
  };

  const handleDeleteImage = async (filename: string) => {
    try {
      await imageService.deleteImage(filename);
      setImages(prev => prev.filter(img => img !== filename));

      // Immediately remove reference from global log state if editing an existing log
      if (initialLog && onImageRemove) {
        onImageRemove(initialLog.id, filename);
      }
    } catch (err) {
      console.error('Failed to delete image', err);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理添加评论
  const handleAddComment = (content: string) => {
    const newComment: Comment = {
      id: crypto.randomUUID(),
      content,
      createdAt: Date.now()
    };
    setComments(prev => [...prev, newComment]);
  };

  // 处理编辑评论
  const handleEditComment = (commentId: string, content: string) => {
    setComments(prev => prev.map(comment => 
      comment.id === commentId 
        ? { ...comment, content }
        : comment
    ));
  };

  // 处理删除评论
  const handleDeleteComment = (commentId: string) => {
    setComments(prev => prev.filter(comment => comment.id !== commentId));
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId) || categories[0];
  const linkedTodo = todos.find(t => t.id === linkedTodoId);

  // Apply Handlers
  const handleAcceptActivity = () => {
    if (suggestions.activity) {
      setSelectedCategoryId(suggestions.activity.categoryId);
      setSelectedActivityId(suggestions.activity.id);
      // Suggestions will update automatically via useEffect
    }
  };

  const handleAcceptScope = (scopeId: string) => {
    const currentScopeIds = scopeIds || [];
    if (!currentScopeIds.includes(scopeId)) {
      setScopeIds([...currentScopeIds, scopeId]);
    }
    // Suggestions will update automatically via useEffect
  };

  // 设置开始时间为当前时间
  const handleSetStartToNow = () => {
    const now = Date.now();
    setCurrentStartTime(now);
  };

  // 设置结束时间为当前时间
  const handleSetEndToNow = () => {
    const now = Date.now();
    const startDate = new Date(currentStartTime);
    const nowDate = new Date(now);

    // 如果跨天（比如昨天开始，现在是今天凌晨），则限制到昨天23:59:59
    if (startDate.toDateString() !== nowDate.toDateString()) {
      const endOfDay = new Date(currentStartTime);
      endOfDay.setHours(23, 59, 59, 999);
      setCurrentEndTime(endOfDay.getTime());
    } else {
      setCurrentEndTime(now);
    }
  };

  const durationDisplay = useMemo(() => {
    const diff = (currentEndTime - currentStartTime) / 1000 / 60; // mins

    // 如果持续时间为负数或零，显示占位符
    if (diff <= 0) return '---';

    const h = Math.floor(diff / 60);
    const m = Math.round(diff % 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }, [currentStartTime, currentEndTime]);

  const handleSave = () => {
    const duration = (currentEndTime - currentStartTime) / 1000;
    if (duration <= 0) return; // Prevent zero duration logs

    const newLog: Log = {
      id: initialLog ? initialLog.id : crypto.randomUUID(),
      categoryId: selectedCategoryId,
      activityId: selectedActivityId,
      startTime: currentStartTime,
      endTime: currentEndTime,
      duration: duration,
      note: note.trim(),
      linkedTodoId: linkedTodoId,
      progressIncrement: linkedTodoId && progressIncrement ? progressIncrement : undefined,
      focusScore: focusScore,
      scopeIds: scopeIds,
      images: images,
      comments: comments.length > 0 ? comments : undefined,
    };
    onSave(newLog);
  };

  const handleDelete = () => {
    if (initialLog && onDelete) {
      onDelete(initialLog.id);
    }
  };

  // --- Slider Logic ---
  const sliderRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus note on new log
  useEffect(() => {
    if (!initialLog && noteRef.current && autoFocusNote) {
      setTimeout(() => {
        noteRef.current?.focus();
        noteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400); // 延时稍长一点以等待动画完成
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);

  // Convert Time to Percentage relative to Track
  const trackDuration = trackEndTime - trackStartTime;
  // If trackDuration is 0 (shouldn't happen), prevent division by zero
  const safeTrackDuration = trackDuration > 0 ? trackDuration : 1;

  const startPercent = Math.max(0, Math.min(100, ((currentStartTime - trackStartTime) / safeTrackDuration) * 100));
  const endPercent = Math.max(0, Math.min(100, ((currentEndTime - trackStartTime) / safeTrackDuration) * 100));

  const calculateTimeFromClientX = (clientX: number) => {
    if (!sliderRef.current || trackDuration <= 0) return null;
    const rect = sliderRef.current.getBoundingClientRect();
    const percent = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));

    // Calculate time from percent
    let newTime = trackStartTime + (percent / 100) * trackDuration;
    const MS_PER_MIN = 60000;
    // Round to nearest minute
    return Math.round(newTime / MS_PER_MIN) * MS_PER_MIN;
  };

  const handleDragUpdate = (clientX: number) => {
    const newTime = calculateTimeFromClientX(clientX);
    if (newTime === null) return;

    if (isDraggingStart) {
      // Constraint: start <= end
      if (newTime > currentEndTime) {
        setCurrentStartTime(currentEndTime); // Stick to end
      } else if (newTime < trackStartTime) {
        setCurrentStartTime(trackStartTime); // Stick to start
      } else {
        setCurrentStartTime(newTime);
      }
    } else if (isDraggingEnd) {
      // Constraint: end >= start
      if (newTime < currentStartTime) {
        setCurrentEndTime(currentStartTime); // Stick to start
      } else if (newTime > trackEndTime) {
        setCurrentEndTime(trackEndTime); // Stick to end
      } else {
        setCurrentEndTime(newTime);
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
  }, [isDraggingStart, isDraggingEnd]);

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
            <span className="text-2xl font-bold text-stone-900 tabular-nums font-mono">{durationDisplay}</span>
          </div>
          <div className="w-10 flex justify-end">
            {initialLog && onDelete && (
              <button
                onClick={handleDelete}
                className="p-2 -mr-2 text-stone-300 hover:text-red-500 hover:bg-stone-100 rounded-full transition-colors"
              >
                <Trash2 size={20} />
              </button>
            )}
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
                    value={String(startHM.h).padStart(2, '0')}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '') return; // 允许清空
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
                    value={String(startHM.m).padStart(2, '0')}
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
                  onClick={() => {
                    if (lastLogEndTime) {
                      setCurrentStartTime(lastLogEndTime);
                    } else {
                      // Fallback to now if no last log
                      handleSetStartToNow();
                    }
                  }}
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
                    value={String(endHM.h).padStart(2, '0')}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '') return; // 允许清空
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
                    value={String(endHM.m).padStart(2, '0')}
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
                  className="absolute top-0 h-full bg-stone-800 opacity-20 rounded-full"
                  style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
                />

                {/* Left Handle */}
                <div
                  onMouseDown={() => setIsDraggingStart(true)}
                  onTouchStart={(e) => { e.stopPropagation(); setIsDraggingStart(true); }}
                  className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-stone-800 rounded-full shadow-md z-10 flex items-center justify-center hover:scale-110 transition-transform cursor-grab active:cursor-grabbing"
                  style={{ left: `calc(${startPercent}% - 12px)` }}
                >
                  <div className="w-1.5 h-1.5 bg-stone-800 rounded-full" />
                </div>

                {/* Right Handle */}
                <div
                  onMouseDown={() => setIsDraggingEnd(true)}
                  onTouchStart={(e) => { e.stopPropagation(); setIsDraggingEnd(true); }}
                  className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-stone-800 border-2 border-stone-800 rounded-full shadow-md z-10 flex items-center justify-center hover:scale-110 transition-transform cursor-grab active:cursor-grabbing"
                  style={{ left: `calc(${endPercent}% - 12px)` }}
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-stone-400 font-mono">
                <span>{getHM(trackStartTime).h}:{String(getHM(trackStartTime).m).padStart(2, '0')}</span>
                <span>Max: {Math.floor(trackDuration / 1000 / 60)}m</span>
                <span>{getHM(trackEndTime).h}:{String(getHM(trackEndTime).m).padStart(2, '0')}</span>
              </div>
            </div>
          </div>

          {/* Activity Selection (Grid) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Associated Tag</span>
            </div>

            {/* Category Grid */}
            <div className="grid grid-cols-4 gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategoryId(cat.id); setSelectedActivityId(cat.activities[0].id); }}
                  className={`
                        px-2 py-2 rounded-lg text-[10px] font-medium text-center border transition-colors flex items-center justify-center gap-1.5 truncate
                        ${selectedCategoryId === cat.id
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'}
                     `}
                >
                  <span>{cat.icon}</span>
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>

            {/* Activity Grid */}
            <div className="grid grid-cols-4 gap-3 pt-2">
              {selectedCategory.activities.map(act => {
                const isActive = selectedActivityId === act.id;
                return (
                  <button
                    key={act.id}
                    onClick={() => setSelectedActivityId(act.id)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 active:scale-95 hover:bg-stone-50"
                  >
                    <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all
                          ${isActive ? 'ring-1 ring-stone-300 ring-offset-1 scale-110' : ''}
                          ${act.color}
                       `}>
                      {act.icon}
                    </div>
                    <span className={`text-xs text-center font-medium leading-tight ${isActive ? 'text-stone-900 font-bold' : 'text-stone-400'}`}>
                      {act.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Todo Association with Embedded Progress */}
          <div className="space-y-0">
            <TodoAssociation
              todos={todos}
              todoCategories={todoCategories}
              linkedTodoId={linkedTodoId}
              onChange={(id) => {
                setLinkedTodoId(id);
                setProgressIncrement(0);
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
                        onClick={() => setProgressIncrement(Math.max(0, progressIncrement - 1))}
                        className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100/50 rounded-md transition-colors active:scale-95"
                      >
                        <Minus size={16} />
                      </button>
                      <div className="flex items-center justify-center min-w-[40px]">
                        {progressIncrement > 0 && <span className="text-xs font-bold text-stone-800 mr-0.5">+</span>}
                        <input
                          type="number"
                          min={0}
                          value={progressIncrement}
                          onChange={(e) => setProgressIncrement(Math.max(0, parseInt(e.target.value) || 0))}
                          className={`w-8 text-left text-sm font-bold tabular-nums bg-transparent outline-none p-0 border-none focus:ring-0 ${progressIncrement > 0 ? 'text-stone-800' : 'text-stone-300'}`}
                        />
                      </div>
                      <button
                        onClick={() => setProgressIncrement(progressIncrement + 1)}
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
              selectedScopeIds={scopeIds}
              onSelect={setScopeIds}
            />
          </div>

          {/* Focus Score Selector */}
          {
            (() => {
              const cat = categories.find(c => c.id === selectedCategoryId);
              const act = cat?.activities.find(a => a.id === selectedActivityId);

              // Check if should show focus score: activity > category > any associated scope
              let shouldShowFocus = act?.enableFocusScore ?? cat?.enableFocusScore;

              // Also check if any of the selected scopes has enableFocusScore
              if (!shouldShowFocus && scopeIds && scopeIds.length > 0) {
                shouldShowFocus = scopeIds.some(sid => {
                  const scope = scopes.find(s => s.id === sid);
                  return scope?.enableFocusScore === true;
                });
              }

              if (shouldShowFocus) {
                return (
                  <div className="space-y-4 animate-in slide-in-from-top-2">
                    <FocusScoreSelector value={focusScore} onChange={setFocusScore} />
                  </div>
                );
              }
              return null;
            })()
          }

          {/* Smart Association Suggestion (Unified) */}
          {hasSuggestions && (
            <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl animate-in slide-in-from-top-2">
              <div className="flex items-start gap-2">
                <Lightbulb size={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-purple-900 mb-2">建议关联</p>
                  <div className="flex flex-wrap gap-2">

                    {/* Activity Suggestions */}
                    {suggestions.activity && (
                      <button
                        onClick={handleAcceptActivity}
                        className="flex items-center gap-1 px-2 py-1 bg-white border border-purple-200 rounded-lg text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors active:scale-95"
                      >
                        <span className="opacity-70 text-[10px] mr-0.5">[{suggestions.activity.reason}]</span>
                        <span>{suggestions.activity.icon}</span>
                        <span>{suggestions.activity.name}</span>
                        <CheckCircle2 size={12} />
                      </button>
                    )}

                    {/* Scope Suggestions */}
                    {suggestions.scopes.map(scope => (
                      <button
                        key={scope.id}
                        onClick={() => handleAcceptScope(scope.id)}
                        className="flex items-center gap-1 px-2 py-1 bg-white border border-purple-200 rounded-lg text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors active:scale-95"
                      >
                        <span className="opacity-70 text-[10px] mr-0.5">[{scope.reason}]</span>
                        <span>{scope.icon}</span>
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
                onClick={() => {
                  const textarea = noteRef.current;
                  if (textarea) {
                    const isExpanded = textarea.style.minHeight === '200px';
                    textarea.style.minHeight = isExpanded ? '100px' : '200px';
                    textarea.style.transition = 'min-height 0.3s ease';
                  }
                }}
                className="text-stone-400 hover:text-stone-600 transition-colors p-1 rounded-md hover:bg-stone-100"
                title="扩展/收缩输入框"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15,3 21,3 21,9"></polyline>
                  <polyline points="9,21 3,21 3,15"></polyline>
                  <line x1="21" y1="3" x2="14" y2="10"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              </button>
            </div>
            <textarea
              ref={noteRef}
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-stone-800 text-sm min-h-[100px] shadow-sm focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 transition-all resize-none placeholder:text-stone-300 font-serif"
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

            {images.length > 0 ? (
              <div className="flex flex-wrap gap-3 pb-2">
                {images.map(img => (
                  <div key={img} className="relative group flex-shrink-0">
                    <div
                      className="w-20 h-20 rounded-xl overflow-hidden border border-stone-200 cursor-zoom-in"
                      onClick={() => setPreviewFilename(img)}
                    >
                      {imageUrls[img] ? (
                        <img src={imageUrls[img]} alt="attachment" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-stone-100 flex items-center justify-center">
                          <ImageIcon size={20} className="text-stone-300" />
                        </div>
                      )}
                    </div>
                    {/* Hover Delete Button Removed */}
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

          {/* Comments Section */}
          <div>
            <CommentSection
              comments={comments}
              onAddComment={handleAddComment}
              onEditComment={handleEditComment}
              onDeleteComment={handleDeleteComment}
            />
          </div>

        </div>

        {/* Footer */}
        < div className="p-6 bg-white border-t border-stone-100" >
          <button
            onClick={handleSave}
            className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold text-base shadow-xl active:scale-[0.99] transition-all hover:bg-black"
          >
            {initialLog ? 'Update Log' : 'Save Log'}
          </button>
        </div >

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
        imageUrl={previewFilename ? (imageUrls[previewFilename] || '') : null}
        onClose={() => setPreviewFilename(null)}
        onDelete={() => {
          if (previewFilename) {
            handleDeleteImage(previewFilename);
            setPreviewFilename(null);
          }
        }}
      />
    </div >
  );
};