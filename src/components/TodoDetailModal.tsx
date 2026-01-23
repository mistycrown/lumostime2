/**
 * @file TodoDetailModal.tsx
 * @input props: TodoItem, logs, categories
 * @output Modal Interaction (Edit Todo, View History)
 * @pos Component (Modal)
 * @description Displays detailed information for a specific Todo item, including its progress, associated history logs, and focus stats.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useMemo } from 'react';
import { TodoItem, TodoCategory, Log, Category, Scope } from '../types';
import { ScopeAssociation } from './ScopeAssociation';
import { X, Trash2, Link as LinkIcon, CheckCircle2, TrendingUp, BarChart3, List, Plus, Minus, Clock, Save, MoreHorizontal, ChevronLeft, Check, ChevronDown, Zap, Circle } from 'lucide-react';
import { CalendarWidget } from './CalendarWidget';
import { FocusCharts } from './FocusCharts';
import { TimelineImage } from './TimelineImage';

interface TodoDetailModalProps {
  initialTodo?: TodoItem | null;
  currentCategory: TodoCategory;
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

type Tab = '细节' | '時間線' | '专注';

export const TodoDetailModal: React.FC<TodoDetailModalProps> = ({ initialTodo, currentCategory, onClose, onSave, onDelete, logs, onLogUpdate, onEditLog, todoCategories, categories, scopes }) => {
  const [activeTab, setActiveTab] = useState<Tab>(initialTodo ? '時間線' : '细节');
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);

  // Stable ID for the session
  const [todoId] = useState(initialTodo?.id || crypto.randomUUID());

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

  // Timeline / Calendar State
  const [displayDate, setDisplayDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'all'>('month');

  const selectedCategory = todoCategories?.find(c => c.id === selectedCategoryId) || currentCategory;

  const handleSave = () => {
    if (!title.trim()) return;

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
    };
    onSave(newTodo);

    // Show success state
    setIsSaveSuccess(true);
    setTimeout(() => setIsSaveSuccess(false), 2000);
  };

  const handleDelete = () => {
    if (initialTodo && onDelete) {
      onDelete(initialTodo.id);
      onClose();
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

  // Stats
  const totalSeconds = linkedLogs.reduce((acc, curr) => acc + curr.duration, 0);
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMins = Math.floor((totalSeconds % 3600) / 60);

  const getActivityInfo = (catId: string, actId: string) => {
    const cat = categories?.find(c => c.id === catId);
    const act = cat?.activities.find(a => a.id === actId);
    return {
      name: act ? act.name : (cat ? cat.name : 'Unknown'),
      icon: act ? act.icon : '•',
      color: act ? act.color : 'bg-stone-200'
    };
  };

  // Check if linked activity has focus enabled
  const linkedActivity = linkedCategoryId && linkedActivityId
    ? categories?.find(c => c.id === linkedCategoryId)?.activities.find(a => a.id === linkedActivityId)
    : null;
  const linkedActivityCategory = linkedCategoryId
    ? categories?.find(c => c.id === linkedCategoryId)
    : null;
  const showFocusTab = linkedActivity && (linkedActivity.enableFocusScore ?? linkedActivityCategory?.enableFocusScore);

  // Month Stats (Current month only)
  const displayMonth = displayDate.getMonth();
  const displayYear = displayDate.getFullYear();

  const monthLogs = useMemo(() => linkedLogs.filter(log => {
    const d = new Date(log.startTime);
    return d.getMonth() === displayMonth && d.getFullYear() === displayYear;
  }), [linkedLogs, displayMonth, displayYear]);

  const logsToDisplay = viewMode === 'month' ? monthLogs : linkedLogs;

  const monthSeconds = monthLogs.reduce((acc, curr) => acc + curr.duration, 0);
  const monthHours = Math.floor(monthSeconds / 3600);
  const monthMins = Math.floor((monthSeconds % 3600) / 60);

  // Unit Heatmap Constants
  const totalSquares = Math.ceil(totalAmount / unitAmount);
  const renderSquares = totalSquares > 3000 ? 3000 : totalSquares;

  return (
    <div className="fixed inset-0 z-[60] bg-[#faf9f6] flex flex-col animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">

      {/* Top Bar */}
      <div className="px-4 py-3 flex items-center shrink-0 justify-center relative">
        <button onClick={onClose} className="absolute left-4 p-2 text-stone-400 hover:text-stone-600 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <span className="font-bold text-stone-800 text-lg font-serif">Task Details</span>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-7 pb-24 no-scrollbar pt-2">

        {/* Header Section (Like TagDetail) */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl font-bold text-stone-300">@</span>
            <span className="text-2xl font-bold text-stone-900 break-all line-clamp-2">{title || 'New Task'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-500 text-sm font-medium bg-stone-100 px-3 py-1 rounded-full flex items-center gap-2">
              <span>{selectedCategory.icon}</span>
              <span>{selectedCategory.name}</span>
            </span>
            {isProgress && (
              <span className="text-[#2F4F4F] bg-[#2F4F4F]/10 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                <TrendingUp size={12} />
                Tracking
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-8 border-b border-stone-200 mb-8">
          {['细节', '時間線'].concat(showFocusTab ? ['专注'] : []).map(tab => (
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
                <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">Basic Info</h3>
                <button
                  onClick={() => setIsCompleted(!isCompleted)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${isCompleted ? 'bg-stone-900 text-white shadow-md' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                >
                  {isCompleted ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  {isCompleted ? 'Completed' : 'Mark Complete'}
                </button>
              </div>
              <div>
                <label className="text-xs text-stone-400 font-medium mb-1.5 block">Category</label>
                <div className="grid grid-cols-4 gap-2">
                  {todoCategories?.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`
                            px-2 py-2 rounded-lg text-[10px] font-medium text-center border transition-colors truncate flex items-center justify-center gap-1.5
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
              </div>
              <div>
                <label className="text-xs text-stone-400 font-medium mb-1.5 block">Task Name</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 font-medium mb-1.5 block">Notes</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-700 text-sm outline-none focus:border-stone-400 transition-colors min-h-[100px] resize-none"
                  placeholder="Add notes..."
                />
              </div>
            </div>

            {/* Link Activity */}
            <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Associated Tag</h3>
                {(linkedCategoryId || linkedActivityId) && (
                  <button
                    onClick={() => { setLinkedCategoryId(undefined); setLinkedActivityId(undefined); }}
                    className="text-[10px] text-stone-400 hover:text-red-400 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category Grid */}
              <div className="grid grid-cols-4 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setLinkedCategoryId(cat.id); setLinkedActivityId(cat.activities[0].id); }}
                    className={`
                          px-2 py-2 rounded-lg text-[10px] font-medium text-center border transition-colors truncate flex items-center justify-center gap-1.5
                          ${linkedCategoryId === cat.id
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
              {selectedLinkCategory && (
                <div className="grid grid-cols-4 gap-3 pt-2">
                  {selectedLinkCategory.activities.map(act => (
                    <button
                      key={act.id}
                      onClick={() => setLinkedActivityId(act.id)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 active:scale-95"
                    >
                      <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all
                            ${linkedActivityId === act.id ? 'ring-1 ring-stone-300 ring-offset-1 scale-110' : ''}
                            ${act.color}
                         `}>
                        {act.icon}
                      </div>
                      <span className={`text-xs text-center font-medium leading-tight ${linkedActivityId === act.id ? 'text-stone-900 font-bold' : 'text-stone-400'}`}>
                        {act.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Scope Association */}
            <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
              <ScopeAssociation
                scopes={scopes}
                selectedScopeIds={defaultScopeIds}
                onSelect={setDefaultScopeIds}
              />
            </div>

            {/* Heatmap Settings */}
            <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Heatmap Scale (Minutes)</h3>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-stone-400 font-medium mb-1.5 block">Min (Lightest)</label>
                  <input
                    type="number"
                    min={0}
                    value={heatmapMin ?? ''}
                    onChange={(e) => setHeatmapMin(parseInt(e.target.value) || undefined)}
                    placeholder="Default: 0"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-stone-400 font-medium mb-1.5 block">Max (Darkest)</label>
                  <input
                    type="number"
                    min={0}
                    value={heatmapMax ?? ''}
                    onChange={(e) => setHeatmapMax(parseInt(e.target.value) || undefined)}
                    placeholder="Default: 240"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Progress Settings */}
            <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">Progress Tracking</h3>
                <div
                  className={`w-12 h-7 rounded-full relative transition-colors cursor-pointer ${isProgress ? 'bg-[#2F4F4F]' : 'bg-stone-200'}`}
                  onClick={() => setIsProgress(!isProgress)}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${isProgress ? 'left-6' : 'left-1'}`}></div>
                </div>
              </div>

              {isProgress && (
                <div className="pt-2 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 fade-in">
                  <div>
                    <label className="text-xs text-stone-400 font-medium mb-1.5 block">Total Amount</label>
                    <input type="number" value={totalAmount} onChange={e => setTotalAmount(parseInt(e.target.value) || 0)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-400 font-medium mb-1.5 block">Unit Size</label>
                    <input type="number" value={unitAmount} onChange={e => setUnitAmount(parseInt(e.target.value) || 0)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors" />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl active:scale-[0.99] transition-all flex items-center justify-center gap-2 ${isSaveSuccess ? 'bg-[#2F4F4F] text-white' : 'bg-stone-900 text-white hover:bg-black'}`}
            >
              {isSaveSuccess ? (
                <>
                  <Check size={20} />
                  Saved Successfully
                </>
              ) : (
                'Save Changes'
              )}
            </button>

            {initialTodo && onDelete && (
              <button onClick={handleDelete} className="w-full py-4 text-red-500 font-bold text-sm hover:bg-red-50 rounded-xl transition-colors">
                Delete Task
              </button>
            )}
          </div>
        )}

        {activeTab === '時間線' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
            {/* Calendar Card */}
            {/* Top Stats Card (Conditional) */}
            {viewMode === 'month' ? (
              <div className="bg-white rounded-2xl p-0 border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="border-b border-stone-100/50">
                  <CalendarWidget
                    currentDate={displayDate}
                    onDateChange={setDisplayDate}
                    logs={linkedLogs}
                    isExpanded={true}
                    onExpandToggle={() => { }}
                    disableSelection={true}
                    customScale={
                      (heatmapMin !== undefined || heatmapMax !== undefined)
                        ? { min: (heatmapMin || 30) * 60, max: (heatmapMax || 240) * 60 }
                        : undefined
                    }
                  />
                </div>
                <div className="px-6 pb-6 pt-4 flex flex-wrap gap-y-4 items-end justify-between border-t border-stone-50">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-stone-400 mb-1 font-bold">Total Time</div>
                    <div className="text-2xl font-bold text-stone-900 font-mono">
                      {totalHours}<span className="text-base text-stone-400 mx-1 font-sans">h</span>{totalMins}<span className="text-base text-stone-400 ml-1 font-sans">m</span>
                      <span className="text-lg text-stone-300 mx-2 font-sans">/</span>
                      <span className="text-lg font-bold text-stone-600">
                        {monthHours}<span className="text-sm text-stone-400 mx-1 font-sans">h</span>{monthMins}<span className="text-sm text-stone-400 ml-1 font-sans">m</span>
                      </span>
                    </div>
                    {(() => {
                      const totalDays = new Set(linkedLogs.map(l => new Date(l.startTime).toDateString())).size;
                      const monthDays = new Set(monthLogs.map(l => new Date(l.startTime).toDateString())).size;
                      return (
                        <div className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded inline-block mt-1">
                          Recorded {totalDays} days / {monthDays} days
                        </div>
                      );
                    })()}
                  </div>
                  <div className="text-right ml-auto">
                    <div className="text-[10px] uppercase tracking-widest text-stone-400 mb-1 font-bold">Avg. Daily</div>
                    <div className="text-xl font-bold text-stone-700 font-mono">
                      {(() => {
                        const totalDays = new Set(linkedLogs.map(l => new Date(l.startTime).toDateString())).size;
                        const monthDays = new Set(monthLogs.map(l => new Date(l.startTime).toDateString())).size;
                        const avgTotal = totalDays > 0 ? Math.round(totalSeconds / 60 / totalDays) : 0;
                        const avgMonth = monthDays > 0 ? Math.round(monthSeconds / 60 / monthDays) : 0;
                        return (
                          <>
                            {avgTotal}m
                            <span className="text-base text-stone-400 mx-2 font-sans">/</span>
                            <span className="text-base font-bold text-stone-600">{avgMonth}m</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // All View Summary (Matches DetailTimelineCard layout)
              <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] mb-8">
                <div className="flex items-start justify-around">
                  {/* Total Duration */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-bold text-stone-900 tracking-wider">累计投入</span>
                    <div className="flex items-baseline text-stone-800">
                      <span className="text-3xl font-black font-mono tracking-tight">{totalHours}</span>
                      <span className="text-sm font-bold opacity-60 ml-0.5 mr-1 text-stone-400">h</span>
                      <span className="text-xl font-bold font-mono tracking-tight">{totalMins}</span>
                      <span className="text-xs font-bold opacity-60 ml-0.5 text-stone-400">m</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-10 bg-stone-200/50 mt-1"></div>

                  {/* Count */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-bold text-stone-900 tracking-wider">累计次数</span>
                    <div className="flex items-baseline text-stone-800">
                      <span className="text-3xl font-black font-mono tracking-tight">{linkedLogs.length}</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-10 bg-stone-200/50 mt-1"></div>

                  {/* Avg Duration */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-bold text-stone-900 tracking-wider">平均时长</span>
                    <div className="flex items-baseline text-stone-800">
                      {(() => {
                        const avgDurationMins = linkedLogs.length > 0
                          ? Math.round(totalSeconds / linkedLogs.length / 60)
                          : 0;
                        const avgDurationH = Math.floor(avgDurationMins / 60);
                        const avgDurationM = avgDurationMins % 60;

                        return avgDurationH > 0 ? (
                          <>
                            <span className="text-3xl font-black font-mono tracking-tight">{avgDurationH}</span>
                            <span className="text-sm font-bold opacity-60 ml-0.5 mr-1 text-stone-400">h</span>
                            {avgDurationM > 0 && (
                              <>
                                <span className="text-xl font-bold font-mono tracking-tight">{avgDurationM}</span>
                                <span className="text-xs font-bold opacity-60 ml-0.5 text-stone-400">m</span>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-3xl font-black font-mono tracking-tight">{avgDurationM}</span>
                            <span className="text-sm font-bold opacity-60 ml-0.5 text-stone-400">m</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Unit Progress Card (Ink Grid Style) */}
            {isProgress && (
              <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-stone-900 font-bold text-lg font-serif">Progress</h3>
                    <div className="text-stone-400 text-xs mt-1 font-sans font-medium uppercase tracking-wider">
                      {completedUnits} / {totalAmount}
                    </div>
                  </div>
                  <div className="text-2xl font-black text-stone-900 font-mono">
                    {Math.round((completedUnits / (totalAmount || 1)) * 100)}%
                  </div>
                </div>

                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: Math.ceil(totalAmount / (unitAmount || 1)) }).map((_, i) => {
                    // Logic for State
                    const tileStart = i * (unitAmount || 1);
                    const tileEnd = (i + 1) * (unitAmount || 1);

                    let styleClass = '';
                    let inlineStyle = {};

                    if (completedUnits >= tileEnd) {
                      // Case A: Completed (Solid Ink)
                      styleClass = 'bg-[#2F4F4F]';
                    } else if (completedUnits > tileStart && completedUnits < tileEnd) {
                      // Case B: Active (Watercolor)
                      const remainder = completedUnits - tileStart;
                      const opacity = Math.max(0.15, remainder / (unitAmount || 1));
                      styleClass = 'bg-[#2F4F4F]';
                      inlineStyle = { opacity: opacity };
                    } else {
                      // Case C: Empty (Outline)
                      styleClass = 'border border-gray-300 bg-transparent';
                    }

                    return (
                      <div
                        key={i}
                        className={`rounded-md aspect-[4/3] transition-all duration-500 ${styleClass}`}
                        style={inlineStyle}
                      />
                    );
                  })}
                </div>

                {/* Legend / Info */}
                <div className="mt-4 flex items-center justify-end gap-3 text-[10px] text-stone-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2F4F4F]"></span> Completed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2F4F4F] opacity-50"></span> Active
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full border border-gray-300"></span> Future
                  </span>
                </div>
              </div>
            )}

            {/* History List - Timeline Style */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-stone-400" />
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                    {viewMode === 'month'
                      ? `History (${displayMonth + 1}/${displayYear})`
                      : `History (All)`
                    }
                  </span>
                </div>

                {/* Toggle Button */}
                <div className="flex bg-stone-100/50 p-0.5 rounded-lg">
                  <button
                    onClick={() => setViewMode('all')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === 'all'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-400 hover:text-stone-600'
                      }`}
                  >
                    全部
                  </button>
                  <button
                    onClick={() => setViewMode('month')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === 'month'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-400 hover:text-stone-600'
                      }`}
                  >
                    {displayMonth + 1}月
                  </button>
                </div>
              </div>

              {logsToDisplay.length === 0 ? (
                <div className="text-center text-stone-400 text-xs italic py-8 border border-dashed border-stone-200 rounded-2xl">
                  {viewMode === 'month' ? 'No records found in this month.' : 'No records found.'}
                </div>
              ) : (
                (() => {
                  const groups: { [key: string]: Log[] } = {};
                  logsToDisplay.forEach(log => {
                    const d = new Date(log.startTime);
                    const key = d.toDateString();
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(log);
                  });

                  return Object.keys(groups)
                    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                    .map(dateKey => {
                      const logs = groups[dateKey].sort((a, b) => b.startTime - a.startTime);
                      const dateObj = new Date(dateKey);
                      const month = dateObj.getMonth() + 1;
                      const day = dateObj.getDate();
                      const weekDay = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][dateObj.getDay()];
                      const totalDuration = logs.reduce((acc, l) => acc + l.duration, 0);

                      return (
                        <div key={dateKey} className="mb-8 last:mb-0">
                          {/* Date Header */}
                          <div className="flex items-baseline justify-between mb-6 px-2 py-2 border-b border-stone-100">
                            <div className="flex items-baseline gap-3">
                              <span className="text-2xl font-black text-stone-900 font-mono tracking-tighter">
                                {String(month).padStart(2, '0')}/{String(day).padStart(2, '0')}
                              </span>
                              <span className="text-xs font-bold text-stone-400 tracking-[0.2em]">{weekDay}</span>
                            </div>
                            <span className="font-mono text-sm font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md">
                              {Math.floor(totalDuration / 60)}m
                            </span>
                          </div>

                          {/* Timeline Items */}
                          <div className="relative border-l border-stone-300 ml-[70px] space-y-6 pb-4">
                            {logs.map(log => {
                              // Find full context for 2-level tags
                              const category = categories?.find(c => c.id === log.categoryId);
                              const activity = category?.activities.find(a => a.id === log.activityId);

                              const d = new Date(log.startTime);
                              const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                              const durationMins = Math.round(log.duration / 60);
                              const h = Math.floor(durationMins / 60);
                              const m = durationMins % 60;
                              const durStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

                              return (
                                <div
                                  key={log.id}
                                  className="relative pl-8 group cursor-pointer rounded-xl hover:bg-stone-50/80 transition-colors p-2 -ml-2"
                                  onClick={() => onEditLog?.(log)}
                                >
                                  {/* Time & Duration - Absolute Left */}
                                  <div className="absolute -left-[60px] top-0 w-[45px] text-right flex flex-col items-end">
                                    <span className="text-sm font-bold text-stone-800 leading-none font-mono">
                                      {timeStr}
                                    </span>
                                    <span className="text-[10px] font-medium text-stone-400 mt-1">
                                      {durStr}
                                    </span>
                                  </div>

                                  {/* Timeline Dot */}
                                  <div className="absolute left-[3px] top-2 w-2.5 h-2.5 rounded-full bg-stone-900 border-2 border-[#faf9f6] z-10" />

                                  {/* Content Content (Minimalist) */}
                                  <div className="relative top-[-2px]">
                                    {/* Title */}
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="text-lg font-bold text-stone-900 leading-tight">
                                        {activity?.name || category?.name || 'Unknown'}
                                      </h4>
                                      {log.focusScore && log.focusScore > 0 && (
                                        <span className="text-sm font-bold text-stone-400 font-mono flex items-center gap-0.5">
                                          <Zap size={12} fill="currentColor" />
                                          {log.focusScore}
                                        </span>
                                      )}
                                    </div>

                                    {/* Note */}
                                    {log.note && (
                                      <p className="text-sm text-stone-500 leading-relaxed mb-2 font-light whitespace-pre-wrap">
                                        {log.note}
                                      </p>
                                    )}

                                    {/* Tags / Metadata */}
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      {/* Self-Referencing Todo Tag (for consistency & progress) */}
                                      <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                        <span className="text-stone-400 font-bold">@</span>
                                        <span className="line-clamp-1">{title}</span>
                                        {log.progressIncrement && log.progressIncrement > 0 && (
                                          <span className="font-mono text-stone-400 ml-0.5">+{log.progressIncrement}</span>
                                        )}
                                      </span>

                                      {/* Category Tag (2-Level) */}
                                      <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                        <span className="font-bold text-stone-400" style={{ color: category?.themeColor }}>#</span>
                                        <span>{category?.icon}</span>
                                        <span className="flex items-center">
                                          <span>{category?.name}</span>
                                          <span className="mx-1 text-stone-300">/</span>
                                          <span className="mr-1">{activity?.icon}</span>
                                          <span className="text-stone-500">{activity?.name}</span>
                                        </span>
                                      </span>

                                      {/* Scope Tags */}
                                      {log.scopeIds && log.scopeIds.length > 0 && log.scopeIds.map(scopeId => {
                                        const scope = scopes.find(s => s.id === scopeId);
                                        if (!scope) return null;
                                        return (
                                          <span key={scopeId} className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded inline-flex items-center gap-1 bg-stone-50/30">
                                            <span className="text-stone-400 font-bold">%</span>
                                            <span>{scope.icon}</span>
                                            <span className="line-clamp-1">{scope.name}</span>
                                          </span>
                                        );
                                      })}
                                    </div>

                                    {/* Images */}
                                    {log.images && log.images.length > 0 && (
                                      <div className="flex gap-2 mt-2 mb-1 overflow-x-auto pb-1 no-scrollbar w-full">
                                        {(log.images.length > 3
                                          ? log.images.slice(0, 2)
                                          : log.images
                                        ).map(img => (
                                          <TimelineImage key={img} filename={img} className="w-16 h-16 shadow-sm" useThumbnail={true} />
                                        ))}
                                        {log.images.length > 3 && (
                                          <div className="w-16 h-16 rounded-xl bg-stone-100 flex items-center justify-center border border-stone-200 text-stone-400 font-bold text-sm shrink-0">
                                            +{log.images.length - 2}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                })()
              )}
            </div>
          </div>
        )}

        {/* Focus Tab Content */}
        {activeTab === '专注' && (
          <div className="animate-in slide-in-from-right-4 fade-in">
            <FocusCharts
              logs={linkedLogs}
              currentDate={displayDate}
              onDateChange={setDisplayDate}
            />
          </div>
        )}
      </div>
    </div >
  );
};