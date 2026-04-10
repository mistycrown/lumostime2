/**
 * @file TodoDetailModal.tsx
 * @input props: TodoItem, logs, categories
 * @output Modal Interaction (Edit Todo, View History)
 * @pos Component (Modal)
 * @description Displays detailed information for a specific Todo item, including its progress, associated history logs, and focus stats.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TodoItem, TodoCategory, Log, Category, Scope } from '../types';
import { ScopeAssociation } from './ScopeAssociation';
import { TagAssociation } from './TagAssociation';
import { Trash2, CheckCircle2, TrendingUp, ChevronLeft, Circle, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { DetailTimelineCard } from './DetailTimelineCard';
import { TimelineImage } from './TimelineImage';
import { imageService } from '../services/imageService';
import { IconRenderer } from './IconRenderer';
import { useToast } from '../contexts/ToastContext';

interface TodoDetailModalProps {
  initialTodo?: TodoItem | null;
  currentCategory: TodoCategory;
  displayMode?: 'overlay' | 'page';
  onClose: () => void;
  onSave: (todo: TodoItem) => void;
  onDelete?: (id: string) => void;
  logs: Log[];
  onLogUpdate?: (log: Log) => void;
  onEditLog?: (log: Log) => void;
  todoCategories: TodoCategory[];
  categories: Category[];
  scopes: Scope[];
}

type Tab = '细节' | '時間線';

export const TodoDetailModal: React.FC<TodoDetailModalProps> = ({ initialTodo, currentCategory, displayMode = 'overlay', onClose, onSave, onDelete, logs, onLogUpdate, onEditLog, todoCategories, categories, scopes }) => {
  const { addToast } = useToast();
  const [isEntering, setIsEntering] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(initialTodo ? '時間線' : '细节');

  // Stable ID for the session
  const [todoId] = useState(initialTodo?.id || crypto.randomUUID());

  // Ref for Task Name input
  const taskNameInputRef = useRef<HTMLInputElement>(null);

  // --- Detail State ---
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialTodo?.categoryId || currentCategory.id);
  const [title, setTitle] = useState(initialTodo?.title || '');

  const [note, setNote] = useState(initialTodo?.note || '');
  const [isCompleted, setIsCompleted] = useState(initialTodo?.isCompleted || false);

  // Link to Record Activity
  const [linkedCategoryId, setLinkedCategoryId] = useState<string>(initialTodo?.linkedCategoryId || '');
  const [linkedActivityId, setLinkedActivityId] = useState<string>(initialTodo?.linkedActivityId || '');
  const [defaultScopeIds, setDefaultScopeIds] = useState<string[] | undefined>(initialTodo?.defaultScopeIds);

  // Progress State
  const [isProgress, setIsProgress] = useState(initialTodo?.isProgress || false);
  const [totalAmount, setTotalAmount] = useState(initialTodo?.totalAmount || 100);
  const [unitAmount, setUnitAmount] = useState(initialTodo?.unitAmount || 1);
  const [completedUnits, setCompletedUnits] = useState(initialTodo?.completedUnits || 0);

  // Heatmap State
  const [heatmapMin, setHeatmapMin] = useState<number | undefined>(initialTodo?.heatmapMin);
  const [heatmapMax, setHeatmapMax] = useState<number | undefined>(initialTodo?.heatmapMax);

  // Cover Image State
  const [coverImage, setCoverImage] = useState<string | undefined>(initialTodo?.coverImage);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Timeline / Calendar State
  const [displayDate, setDisplayDate] = useState(new Date());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsEntering(false);
    }, 320);

    return () => window.clearTimeout(timer);
  }, []);

  // Auto-focus Task Name input when creating a new task
  useEffect(() => {
    if (!initialTodo && activeTab === '细节' && taskNameInputRef.current) {
      // 延迟聚焦以确保动画完成
      const timer = setTimeout(() => {
        taskNameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialTodo, activeTab]);

  // 实时保存：当状态变化时自动保存
  React.useEffect(() => {
    if (!title.trim()) return; // 不保存空标题

    // 检查是否有实际变化
    if (initialTodo) {
      const hasChanges = 
        selectedCategoryId !== initialTodo.categoryId ||
        title.trim() !== initialTodo.title ||
        note.trim() !== initialTodo.note ||
        isCompleted !== initialTodo.isCompleted ||
        linkedCategoryId !== (initialTodo.linkedCategoryId || '') ||
        linkedActivityId !== (initialTodo.linkedActivityId || '') ||
        JSON.stringify(defaultScopeIds) !== JSON.stringify(initialTodo.defaultScopeIds) ||
        isProgress !== initialTodo.isProgress ||
        totalAmount !== initialTodo.totalAmount ||
        unitAmount !== initialTodo.unitAmount ||
        completedUnits !== initialTodo.completedUnits ||
        heatmapMin !== initialTodo.heatmapMin ||
        heatmapMax !== initialTodo.heatmapMax ||
        coverImage !== initialTodo.coverImage;
      
      if (!hasChanges) return;
    }

    const newTodo: TodoItem = {
      id: todoId,
      categoryId: selectedCategoryId,
      title: title.trim(),
      isCompleted: isCompleted,
      completedAt: isCompleted
        ? (initialTodo?.isCompleted ? initialTodo.completedAt : new Date().toISOString())
        : undefined,
      note: note.trim(),
      linkedCategoryId: linkedCategoryId || undefined,
      linkedActivityId: linkedActivityId || undefined,
      defaultScopeIds,
      isProgress,
      totalAmount: isProgress ? totalAmount : undefined,
      unitAmount: isProgress ? unitAmount : undefined,
      completedUnits: isProgress ? completedUnits : undefined,
      heatmapMin,
      heatmapMax,
      coverImage,
    };
    onSave(newTodo);
  }, [selectedCategoryId, title, note, isCompleted, linkedCategoryId, linkedActivityId, defaultScopeIds, isProgress, totalAmount, unitAmount, completedUnits, heatmapMin, heatmapMax, coverImage]); // 监听所有状态变化

  const selectedCategory = todoCategories?.find(c => c.id === selectedCategoryId) || currentCategory;

  const handleDelete = () => {
    if (initialTodo && onDelete) {
      // 如果有封面图片，删除它
      if (initialTodo.coverImage) {
        imageService.deleteImage(initialTodo.coverImage).catch(err => {
          console.error('Failed to delete cover image:', err);
        });
      }
      onDelete(initialTodo.id);
      onClose();
    }
  };

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 检查文件大小（限制为 10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }

    setIsUploadingImage(true);
    try {
      // 如果已有封面图片，先删除旧的
      if (coverImage) {
        await imageService.deleteImage(coverImage);
      }

      // 保存新图片
      const filename = await imageService.saveImage(file);
      setCoverImage(filename);
      console.log('Cover image uploaded:', filename);
    } catch (error) {
      console.error('Failed to upload cover image:', error);
      alert('图片上传失败，请重试');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // 删除封面图片
  const handleRemoveCoverImage = async () => {
    if (!coverImage) return;

    try {
      await imageService.deleteImage(coverImage);
      setCoverImage(undefined);
      console.log('Cover image removed:', coverImage);
    } catch (error) {
      console.error('Failed to remove cover image:', error);
      alert('删除图片失败，请重试');
    }
  };

  const handleLogProgressChange = (log: Log, change: number) => {
    if (!onLogUpdate) return;
    const currentIncrement = log.progressIncrement || 0;
    const newIncrement = Math.max(0, currentIncrement + change);

    onLogUpdate({
      ...log,
      progressIncrement: newIncrement
    });
  };

  const selectedLinkCategory = categories?.find(c => c.id === linkedCategoryId);

  // Linked Logs
  const linkedLogs = useMemo(() => logs.filter(l => l.linkedTodoId === todoId), [logs, todoId]);

  const handleRecalculateProgressFromLogs = () => {
    if (!isProgress) return;
    const recalculated = linkedLogs.reduce((sum, log) => sum + (log.progressIncrement || 0), 0);
    setCompletedUnits(Math.max(0, recalculated));
    addToast('success', `已按日志重算进度：${Math.max(0, recalculated)}`);
  };

  // Stats
  const totalSeconds = linkedLogs.reduce((acc, curr) => acc + curr.duration, 0);
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMins = Math.floor((totalSeconds % 3600) / 60);

  // Check if linked activity has focus enabled
  const linkedActivity = linkedCategoryId && linkedActivityId
    ? categories?.find(c => c.id === linkedCategoryId)?.activities.find(a => a.id === linkedActivityId)
    : null;
  const linkedActivityCategory = linkedCategoryId
    ? categories?.find(c => c.id === linkedCategoryId)
    : null;
  
  // 检查是否应该显示专注打分：
  // 1. 首先检查日志中是否有专注打分数据（最直接的判断）
  // 2. 如果有关联活动，也检查活动的设置
  // 3. 如果日志中有任何一个活动启用了专注打分，就显示
  const hasLogFocusData = linkedLogs.some(log => log.focusScore !== undefined && log.focusScore > 0);
  const linkedActivityFocusEnabled = linkedActivity 
    ? (linkedActivity.enableFocusScore ?? linkedActivityCategory?.enableFocusScore ?? false)
    : false;
  
  // 检查日志所属的活动是否有启用专注打分的
  const logActivitiesFocusEnabled = linkedLogs.some(log => {
    const logCategory = categories?.find(c => c.id === log.categoryId);
    const logActivity = logCategory?.activities.find(a => a.id === log.activityId);
    return logActivity && (logActivity.enableFocusScore ?? logCategory?.enableFocusScore ?? false);
  });
  
  const enableFocusScore = hasLogFocusData || linkedActivityFocusEnabled || logActivitiesFocusEnabled;

  // 检查是否应该显示情绪评分
  const hasLogMoodData = linkedLogs.some(log => log.moodScore !== undefined && log.moodScore > 0);
  const linkedActivityMoodEnabled = linkedActivity 
    ? (linkedActivity.enableMoodScore ?? linkedActivityCategory?.enableMoodScore ?? false)
    : false;
  
  const logActivitiesMoodEnabled = linkedLogs.some(log => {
    const logCategory = categories?.find(c => c.id === log.categoryId);
    const logActivity = logCategory?.activities.find(a => a.id === log.activityId);
    return logActivity && (logActivity.enableMoodScore ?? logCategory?.enableMoodScore ?? false);
  });
  
  const enableMoodScore = hasLogMoodData || linkedActivityMoodEnabled || logActivitiesMoodEnabled;

  // Unit Heatmap Constants
  const totalSquares = Math.ceil(totalAmount / unitAmount);
  const renderSquares = totalSquares > 3000 ? 3000 : totalSquares;
  const containerClassName = displayMode === 'page'
    ? 'h-full bg-[#faf9f6] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
    : `absolute inset-0 z-[60] bg-[#faf9f6] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${isEntering ? 'animate-in slide-in-from-right duration-300' : ''}`;

  return (
    <div
      className={containerClassName}
    >

      {/* Top Bar */}
      <div className="px-4 py-3 flex items-center shrink-0 justify-center relative">
        <button onClick={onClose} className="absolute left-4 p-2 text-stone-400 hover:text-stone-600 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <span className="font-bold text-stone-800 text-lg font-serif">待办详情</span>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-7 pb-24 no-scrollbar pt-2">

        {/* Header Section (Like TagDetail) */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl font-bold text-stone-300">@</span>
            <span className="text-2xl font-bold text-stone-900 break-all line-clamp-2">{title || '新待办'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-500 text-sm font-medium bg-stone-100 px-3 py-1 rounded-full flex items-center gap-2">
              <IconRenderer icon={selectedCategory.icon} uiIcon={selectedCategory.uiIcon} className="text-sm" />
              <span>{selectedCategory.name}</span>
            </span>
            {isProgress && (
              <span className="btn-template-filled text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                <TrendingUp size={12} />
                进度追踪
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-8 border-b border-stone-200 mb-8">
          {['细节', '時間線'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as Tab)}
              className={`pb-3 text-sm font-serif tracking-wide transition-colors ${activeTab === tab ? 'text-stone-900 border-b-2 border-stone-900 font-bold' : 'text-stone-400 hover:text-stone-600'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === '细节' && (
          <div className="space-y-6 animate-in slide-in-from-left-4 fade-in">
            {/* Edit Form */}
            <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">基本信息</h3>
                <button
                  onClick={() => setIsCompleted(!isCompleted)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${isCompleted ? 'bg-stone-900 text-white shadow-md' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                >
                  {isCompleted ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  {isCompleted ? '已完成' : '标记完成'}
                </button>
              </div>
              <div>
                <label className="text-xs text-stone-400 font-medium mb-1.5 block">分类</label>
                <div className="grid grid-cols-4 gap-2">
                  {todoCategories?.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`
                            px-2 py-2 rounded-lg text-[10px] font-medium text-center border transition-colors truncate flex items-center justify-center gap-1.5
                            ${selectedCategoryId === cat.id
                          ? 'btn-template-filled border-transparent'
                          : 'bg-stone-50 text-stone-500 border-stone-100 hover:bg-stone-100'}
                        `}
                    >
                      <IconRenderer icon={cat.icon} uiIcon={cat.uiIcon} className="text-xs" />
                      <span className="truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-stone-400 font-medium mb-1.5 block">待办名称</label>
                <input
                  ref={taskNameInputRef}
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 font-medium mb-1.5 block">备注</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-700 text-sm outline-none focus:border-stone-400 transition-colors min-h-[100px] resize-none"
                  placeholder="添加备注..."
                />
              </div>
              
              {/* Cover Image */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-stone-400 font-medium">封面图片</label>
                  {coverImage && (
                    <button
                      type="button"
                      onClick={handleRemoveCoverImage}
                      className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="删除封面图片"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                {coverImage ? (
                  // 显示已上传的图片 - 缩小尺寸
                  <div className="h-20 rounded-lg overflow-hidden bg-stone-100">
                    <TimelineImage 
                      filename={coverImage} 
                      className="w-full h-full object-cover"
                      useThumbnail={false}
                    />
                  </div>
                ) : (
                  // 上传按钮 - 缩小尺寸
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploadingImage}
                    />
                    <div className="h-20 rounded-lg border-2 border-dashed border-stone-200 hover:border-stone-400 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 bg-stone-50 hover:bg-stone-100">
                      {isUploadingImage ? (
                        <>
                          <div className="w-5 h-5 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                          <span className="text-[10px] text-stone-500 font-medium">上传中...</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon size={18} className="text-stone-400" />
                          <span className="text-[10px] text-stone-500 font-medium">点击上传封面图片</span>
                        </>
                      )}
                    </div>
                  </label>
                )}
              </div>

              {/* Progress Tracking */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-stone-400 font-medium">进度追踪</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRecalculateProgressFromLogs}
                      disabled={!isProgress}
                      className={`text-[10px] px-2 py-1 rounded-md border transition-colors flex items-center gap-1 ${isProgress ? 'text-stone-600 border-stone-200 hover:bg-stone-50' : 'text-stone-300 border-stone-100 cursor-not-allowed'}`}
                      title={isProgress ? '按关联日志重算进度' : '请先开启进度追踪'}
                    >
                      <RotateCcw size={10} />
                      重算
                    </button>
                    <div
                      className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer ${isProgress ? '' : 'bg-stone-200'}`}
                      style={isProgress ? { backgroundColor: 'var(--progress-bar-fill)' } : undefined}
                      onClick={() => setIsProgress(!isProgress)}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isProgress ? 'left-7' : 'left-1'}`}></div>
                    </div>
                  </div>
                </div>

                {isProgress && (
                  <div className="pt-2 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 fade-in">
                    <div>
                      <label className="text-xs text-stone-400 font-medium mb-1.5 block">总量</label>
                      <input type="number" value={totalAmount} onChange={e => setTotalAmount(parseInt(e.target.value) || 0)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs text-stone-400 font-medium mb-1.5 block">单位大小</label>
                      <input type="number" value={unitAmount} onChange={e => setUnitAmount(parseInt(e.target.value) || 0)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors" />
                    </div>
                  </div>
                )}
              </div>

              {/* Heatmap Scale */}
              <div>
                <label className="text-xs text-stone-400 font-medium mb-1.5 block">热力图范围（分钟）</label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-stone-400 font-medium mb-1.5 block">最小值（最浅）</label>
                    <input
                      type="number"
                      min={0}
                      value={heatmapMin ?? ''}
                      onChange={(e) => setHeatmapMin(parseInt(e.target.value) || undefined)}
                      placeholder="默认：0"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-stone-400 font-medium mb-1.5 block">最大值（最深）</label>
                    <input
                      type="number"
                      min={0}
                      value={heatmapMax ?? ''}
                      onChange={(e) => setHeatmapMax(parseInt(e.target.value) || undefined)}
                      placeholder="默认：240"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Link Activity */}
            <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">关联标签</span>
                {(linkedCategoryId || linkedActivityId) && (
                  <button
                    onClick={() => { 
                      setLinkedCategoryId(''); 
                      setLinkedActivityId(''); 
                    }}
                    className="text-[10px] text-stone-400 hover:text-red-400 transition-colors"
                  >
                    清除
                  </button>
                )}
              </div>
              
              <TagAssociation
                categories={categories}
                selectedCategoryId={linkedCategoryId || categories[0]?.id || ''}
                selectedActivityId={linkedActivityId || categories[0]?.activities[0]?.id || ''}
                onCategorySelect={setLinkedCategoryId}
                onActivitySelect={setLinkedActivityId}
              />
            </div>

            {/* Scope Association */}
            <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
              <ScopeAssociation
                scopes={scopes}
                selectedScopeIds={defaultScopeIds}
                onSelect={setDefaultScopeIds}
              />
            </div>

            {initialTodo && onDelete && (
              <button onClick={handleDelete} className="w-full py-4 text-red-500 font-bold text-sm hover:bg-red-50 rounded-xl transition-colors">
                删除待办
              </button>
            )}
          </div>
        )}

        {activeTab === '時間線' && (
          <DetailTimelineCard
            filteredLogs={linkedLogs}
              displayDate={displayDate}
              onDateChange={setDisplayDate}
              customScale={
                (heatmapMin !== undefined || heatmapMax !== undefined)
                  ? { min: (heatmapMin || 30) * 60, max: (heatmapMax || 240) * 60 }
                  : undefined
              }
              entityInfo={{
                icon: '@',
                name: title || 'Task',
                type: 'other'
              }}
            onEditLog={onEditLog}
            categories={categories}
            todos={[{
              id: todoId,
              categoryId: selectedCategoryId,
              title: title.trim(),
              isCompleted: isCompleted,
              completedAt: isCompleted
                ? (initialTodo?.isCompleted ? initialTodo.completedAt : new Date().toISOString())
                : undefined,
              note: note.trim(),
              linkedCategoryId: linkedCategoryId || undefined,
              linkedActivityId: linkedActivityId || undefined,
              defaultScopeIds,
              isProgress,
              totalAmount: isProgress ? totalAmount : undefined,
              unitAmount: isProgress ? unitAmount : undefined,
              completedUnits: isProgress ? completedUnits : undefined,
              heatmapMin,
              heatmapMax,
              coverImage,
            }]}
            enableFocusScore={enableFocusScore}
            enableMoodScore={enableMoodScore}
            progressTracking={isProgress ? {
              isProgress,
              totalAmount,
              unitAmount,
              completedUnits
            } : undefined}
            renderLogMetadata={(log) => {
              const category = categories?.find(c => c.id === log.categoryId);
              const activity = category?.activities.find(a => a.id === log.activityId);

              return (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {/* Category Tag */}
                  <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                    <span className="font-bold text-stone-400">#</span>
                    <IconRenderer icon={category?.icon || ''} uiIcon={category?.uiIcon} className="text-xs" size={12} />
                    <span className="flex items-center">
                      <span>{category?.name}</span>
                      <span className="mx-1 text-stone-300">/</span>
                      <IconRenderer icon={activity?.icon || ''} uiIcon={activity?.uiIcon} className="text-xs" size={12} />
                      <span className="text-stone-500">{activity?.name}</span>
                    </span>
                  </span>

                  {/* Scope Tags */}
                  {log.scopeIds && log.scopeIds.length > 0 && log.scopeIds.map(scopeId => {
                    const linkedScope = scopes.find(s => s.id === scopeId);
                    if (linkedScope) {
                      return (
                        <span key={scopeId} className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                          <span className="text-stone-400 font-bold">%</span>
                          <IconRenderer icon={linkedScope.icon || '📍'} uiIcon={linkedScope.uiIcon} className="text-xs" />
                          <span>{linkedScope.name}</span>
                        </span>
                      );
                    }
                    return null;
                  })}

                  {/* Progress Increment */}
                  {log.progressIncrement && log.progressIncrement > 0 && (
                    <span className="text-[10px] font-medium border px-2 py-0.5 rounded flex items-center gap-1 btn-template-filled">
                      <TrendingUp size={10} />
                      <span className="font-mono">+{log.progressIncrement}</span>
                    </span>
                  )}
                </div>
              );
            }}
          />
        )}
      </div>
    </div >
  );
};
