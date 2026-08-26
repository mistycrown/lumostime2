/**
 * @file TagDetailView.tsx
 * @updated 2026-08-25: Refined Activity attribute management, deletion cleanup, and compact record-style controls.
 * @updated 2026-08-26: Displays the current archive status beside the tag archive/restore action.
 * @updated 2026-08-24: Added Activity custom attribute definition management and base attribute statistics.
 * @updated 2026-08-06: Added archive and restore control for tags.
 * @input Activity ID, Logs, Associated Todos, Categories
 * @output Activity Updates (Name, Color), Todo Toggles
 * @pos View (Detail Page)
 * @description Detailed analytics and settings for a specific Activity (Tag). Features an activity heatmap, history timeline, keyword management, note template editing, and associated To-Do tracking.
 * @updated 2026-06-13: Reused the shared hierarchical associated-todo list so subtasks render under parent todos in the association tab.
 * @updated 2026-08-09: Planned timeline blocks are excluded from tag statistics.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { Log, Category, Activity, TodoItem } from '../types';
import { COLOR_OPTIONS } from '../constants';
import { CalendarWidget } from '../components/CalendarWidget';
import { ArrowLeft, Clock, Calendar as CalendarIcon, MoreHorizontal, ChevronDown, Check, X, Zap, Save, CheckCircle2, Circle, Plus, Archive, ArchiveRestore } from 'lucide-react';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { MatrixAnalysisChart } from '../components/MatrixAnalysisChart';
import { Scope } from '../types';
import { DetailTimelineCard } from '../components/DetailTimelineCard';
import { UIIconSelector } from '../components/UIIconSelector';
import { uiIconService } from '../services/uiIconService';
import { useSettings } from '../contexts/SettingsContext';
import { IconRenderer } from '../components/IconRenderer';
import { useCustomColors } from '../hooks/useCustomColors';
import { isStoredColorSelected } from '../utils/colorUtils';
import { getColorHexForCharts } from '../utils/colorAdapterUtils';
import { getNormalizedScopeIds } from '../utils/scopeStatsUtils';
import { NoteTemplateManager } from '../components/NoteTemplateManager';
import { AssociatedTodoList } from '../components/AssociatedTodoList';
import { filterCountableLogs } from '../utils/statLogUtils';
import { ActivityAttributeManager } from '../components/ActivityAttributeManager';
import { ActivityAttributeStatistics } from '../components/ActivityAttributeStatistics';
import { ActivityAttributeSummary } from '../components/ActivityAttributeSummary';


interface TagDetailViewProps {
   tagId: string;
   logs: Log[];
   todos: TodoItem[];
   onToggleTodo: (id: string) => void;
   categories: Category[];
   onUpdateActivity: (activity: Activity) => void;
   onCategoryChange?: (activityId: string, newCategoryId: string) => void;
   onEditLog?: (log: Log) => void;
   onUpdateLog?: (log: Log) => void;
   onEditTodo?: (todo: TodoItem) => void;
   scopes: Scope[];
}

export const TagDetailView: React.FC<TagDetailViewProps> = ({ tagId, logs, todos, onToggleTodo, categories, onUpdateActivity, onCategoryChange, onEditLog, onUpdateLog, onEditTodo, scopes }) => {
   // Find Activity and Category
   let initialActivity: Activity | undefined;
   let initialCategory: Category | undefined;

   for (const c of categories) {
      const a = c.activities.find(act => act.id === tagId);
      if (a) {
         initialActivity = a;
         initialCategory = c;
         break;
      }
   }

   // Local state for editing (simulated)
   const [activity, setActivity] = useState<Activity | undefined>(initialActivity);
   const [category, setCategory] = useState<Category | undefined>(initialCategory);
   
   // 获取当前 UI 图标主题
   const { uiIconTheme } = useSettings();
   const isCustomThemeEnabled = uiIconTheme !== 'default';

   // State
   const [activeTab, setActiveTab] = useState('Timeline');
   const [displayDate, setDisplayDate] = useState(new Date());
   const [analysisRange, setAnalysisRange] = useState<'Week' | 'Month' | 'Year' | 'All'>('Month');
   const [analysisDate, setAnalysisDate] = useState(new Date());
   const [newKeyword, setNewKeyword] = useState(''); // New State for adding keyword
   const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false); // State for category dropdown
   const customColors = useCustomColors();

   // 实时保存：当 activity 状态变化时自动保存
   useEffect(() => {
      if (activity && initialActivity) {
         // 检查是否有实际变化
         const hasChanges = 
            activity.name !== initialActivity.name ||
            activity.icon !== initialActivity.icon ||
            activity.uiIcon !== initialActivity.uiIcon ||
            activity.color !== initialActivity.color ||
            activity.heatmapMin !== initialActivity.heatmapMin ||
            activity.heatmapMax !== initialActivity.heatmapMax ||
            activity.enableFocusScore !== initialActivity.enableFocusScore ||
            activity.enableMoodScore !== initialActivity.enableMoodScore ||
            activity.isArchived !== initialActivity.isArchived ||
            JSON.stringify(activity.keywords) !== JSON.stringify(initialActivity.keywords) ||
            JSON.stringify(activity.noteTemplates || []) !== JSON.stringify(initialActivity.noteTemplates || []) ||
            JSON.stringify(activity.attributes || []) !== JSON.stringify(initialActivity.attributes || []);
         
         if (hasChanges) {
            onUpdateActivity(activity);
         }
      }
   }, [activity]); // 只监听 activity 变化

   // Sync state when categories prop changes (e.g., after save)
   useEffect(() => {
      for (const c of categories) {
         const a = c.activities.find(act => act.id === tagId);
         if (a) {
            setActivity(a);
            setCategory(c);
            break;
         }
      }
   }, [categories, tagId]);

   // Close dropdown when clicking outside
   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (isCategoryDropdownOpen) {
            const target = event.target as HTMLElement;
            if (!target.closest('.category-dropdown-container')) {
               setIsCategoryDropdownOpen(false);
            }
         }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
         document.removeEventListener('mousedown', handleClickOutside);
      };
   }, [isCategoryDropdownOpen]);

   if (!activity || !category) return <div>Tag not found</div>;

   // Filter logs for this tag (All time)
   const tagLogs = useMemo(() => logs.filter(l => l.activityId === tagId), [logs, tagId]);
   const countableTagLogs = useMemo(() => filterCountableLogs(tagLogs), [tagLogs]);

   const handleDeleteAttributeData = (attributeId: string, optionId?: string) => {
      if (!onUpdateLog) return;
      tagLogs.forEach((log) => {
         const currentValues = log.attributeValues || [];
         const nextValues = currentValues.flatMap((value) => {
            if (value.attributeId !== attributeId) return [value];
            if (!optionId) return [];
            if ('optionId' in value) return value.optionId === optionId ? [] : [value];
            if ('optionIds' in value) {
               const nextOptionIds = value.optionIds.filter((id) => id !== optionId);
               return nextOptionIds.length > 0 ? [{ ...value, optionIds: nextOptionIds }] : [];
            }
            return [value];
         });
         if (JSON.stringify(currentValues) !== JSON.stringify(nextValues)) {
            onUpdateLog({ ...log, attributeValues: nextValues.length > 0 ? nextValues : undefined });
         }
      });
   };

   // Total Stats (All time)
   const totalSeconds = countableTagLogs.reduce((acc, curr) => acc + curr.duration, 0);
   const totalHours = Math.floor(totalSeconds / 3600);
   const totalMins = Math.floor((totalSeconds % 3600) / 60);

   // Prepare Heatmap Data (Based on Display Date)
   const displayMonth = displayDate.getMonth();
   const displayYear = displayDate.getFullYear();

   const heatmapData = useMemo(() => {
      const map = new Map<number, number>();
      countableTagLogs.forEach(log => {
         const d = new Date(log.startTime);
         if (d.getMonth() === displayMonth && d.getFullYear() === displayYear) {
            const day = d.getDate();
            map.set(day, (map.get(day) || 0) + log.duration);
         }
      });
      return map;
   }, [countableTagLogs, displayMonth, displayYear]);

   // Month Stats (Current month only)
   const monthLogs = useMemo(() => countableTagLogs.filter(log => {
      const d = new Date(log.startTime);
      return d.getMonth() === displayMonth && d.getFullYear() === displayYear;
   }), [countableTagLogs, displayMonth, displayYear]);

   const monthSeconds = monthLogs.reduce((acc, curr) => acc + curr.duration, 0);
   const monthHours = Math.floor(monthSeconds / 3600);
   const monthMins = Math.floor((monthSeconds % 3600) / 60);
   const monthDays = new Set(monthLogs.map(l => new Date(l.startTime).getDate())).size;

   // Month Navigation
   const handleMonthChange = (offset: number) => {
      const newDate = new Date(displayDate);
      newDate.setMonth(newDate.getMonth() + offset);
      setDisplayDate(newDate);
   };

   // Associated Todos
   const associatedTodos = useMemo(() =>
      todos.filter(t => t.linkedActivityId === tagId)
         .sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted)),
      [todos, tagId]);

   // Matrix Stats (Scope Distribution)
   const matrixStats = useMemo(() => {
      // Filter logs based on analysisRange
       const filteredLogs = countableTagLogs.filter(log => {
         if (analysisRange === 'All') return true;
         const d = new Date(log.startTime);
         const target = analysisDate;

         if (analysisRange === 'Year') {
            return d.getFullYear() === target.getFullYear();
         }
         if (analysisRange === 'Month') {
            return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
         }
         if (analysisRange === 'Week') {
            // Check if in same week
            const getWeekStart = (date: Date) => {
               const d = new Date(date);
               const day = d.getDay();
               const diff = d.getDate() - day + (day === 0 ? -6 : 1);
               d.setDate(diff);
               d.setHours(0, 0, 0, 0);
               return d;
            };
            const wStart = getWeekStart(target);
            const wEnd = new Date(wStart);
            wEnd.setDate(wStart.getDate() + 7);
            return d >= wStart && d < wEnd;
         }
         return true;
      });

      const stats = new Map<string, number>();
      filteredLogs.forEach(log => {
         const scopeIds = getNormalizedScopeIds(log.scopeIds);
         if (scopeIds.length > 0) {
            scopeIds.forEach(scopeId => {
               stats.set(scopeId, (stats.get(scopeId) || 0) + log.duration);
            });
         } else {
            stats.set('uncategorized', (stats.get('uncategorized') || 0) + log.duration);
         }
      });

      return Array.from(stats.entries()).map(([scId, duration]) => {
         const scope = scopes.find(s => s.id === scId);
         return {
            id: scId,
            label: scope ? scope.name : 'unscoped',
            value: duration,
            color: (() => {
               return getColorHexForCharts(scope?.themeColor || '');
            })(),
            icon: scope?.icon
         };
      });
   }, [countableTagLogs, scopes, analysisRange, analysisDate]);

   // Calculate total duration for the filtered range
   const analysisTotalDuration = useMemo(() => {
      return matrixStats.reduce((acc, curr) => acc + curr.value, 0);
   }, [matrixStats]);

   const handleNameChange = (val: string) => {
      if (!activity) return;
      const firstChar = Array.from(val)[0] || '';
      const icon = firstChar;
      const name = val.slice(firstChar.length).trim();
      setActivity({ ...activity, icon, name });
   };

   const handleColorChange = (color: string) => {
      if (!activity) return;
      setActivity({ ...activity, color });
   };

   const handleToggleArchive = () => {
      if (activity) setActivity({ ...activity, isArchived: activity.isArchived !== true });
   };

   // 关键字颜色系统（用于Details tab中的关键字显示）
   const KEYWORD_COLORS = [
      'bg-red-100 text-red-600 border-red-200 hover:bg-red-200',
      'bg-cyan-100 text-cyan-600 border-cyan-200 hover:bg-cyan-200',
      'bg-yellow-100 text-yellow-600 border-yellow-200 hover:bg-yellow-200',
      'bg-blue-100 text-blue-600 border-blue-200 hover:bg-blue-200',
      'bg-orange-100 text-orange-600 border-orange-200 hover:bg-orange-200',
      'bg-teal-100 text-teal-600 border-teal-200 hover:bg-teal-200',
      'bg-amber-100 text-amber-600 border-amber-200 hover:bg-amber-200',
      'bg-indigo-100 text-indigo-600 border-indigo-200 hover:bg-indigo-200',
      'bg-lime-100 text-lime-600 border-lime-200 hover:bg-lime-200',
      'bg-purple-100 text-purple-600 border-purple-200 hover:bg-purple-200',
      'bg-green-100 text-green-600 border-green-200 hover:bg-green-200',
      'bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200 hover:bg-fuchsia-200',
      'bg-emerald-100 text-emerald-600 border-emerald-200 hover:bg-emerald-200',
      'bg-pink-100 text-pink-600 border-pink-200 hover:bg-pink-200',
      'bg-sky-100 text-sky-600 border-sky-200 hover:bg-sky-200',
      'bg-rose-100 text-rose-600 border-rose-200 hover:bg-rose-200',
      'bg-violet-100 text-violet-600 border-violet-200 hover:bg-violet-200',
   ];

   const getKeywordColor = (keyword: string) => {
      const keywords = activity?.keywords || [];
      let index = keywords.indexOf(keyword);
      if (index === -1) {
         let hash = 0;
         for (let i = 0; i < keyword.length; i++) {
            hash = keyword.charCodeAt(i) + ((hash << 5) - hash);
         }
         index = Math.abs(hash);
      }
      const colorIndex = index % KEYWORD_COLORS.length;
      return KEYWORD_COLORS[colorIndex];
   };

   const handleAddKeyword = () => {
      if (!newKeyword.trim() || !activity) return;
      const currentKeywords = activity.keywords || [];
      if (!currentKeywords.includes(newKeyword.trim())) {
         setActivity({
            ...activity,
            keywords: [...currentKeywords, newKeyword.trim()]
         });
      }
      setNewKeyword('');
   };

   const handleRemoveKeyword = (keywordToRemove: string) => {
      if (!activity) return;
      const currentKeywords = activity.keywords || [];
      setActivity({
         ...activity,
         keywords: currentKeywords.filter(k => k !== keywordToRemove)
      });
   };

   const renderContent = () => {
      switch (activeTab) {
         case 'Details':
            return (
               <div className="space-y-6">
                  <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                     <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">基本信息</h3>
                     <div className="space-y-4">
                        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                           <span className="text-sm font-medium text-stone-600">归档状态</span>
                           <div className="flex items-center gap-3">
                              <span className="text-sm text-stone-500">{activity.isArchived === true ? '已归档' : '未归档'}</span>
                              <button
                                 type="button"
                                 onClick={handleToggleArchive}
                                 className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                 title={activity.isArchived === true ? '恢复标签' : '归档标签'}
                              >
                                 {activity.isArchived === true ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                                 {activity.isArchived === true ? '恢复标签' : '归档标签'}
                              </button>
                           </div>
                        </div>
                        <div>
                           <label className="text-xs text-stone-400 font-medium mb-1.5 block">名称（首字符作为图标）</label>
                           <input
                              type="text"
                              value={`${activity.icon}${activity.name} `}
                              onChange={(e) => handleNameChange(e.target.value)}
                              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                           />
                        </div>
                        <div>
                           <label className="text-xs text-stone-400 font-medium mb-1.5 block">一级分类</label>
                           <div className="relative category-dropdown-container">
                              <button
                                 onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                 className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none hover:border-stone-400 transition-colors flex items-center justify-between"
                              >
                                 <div className="flex items-center gap-2">
                                    <span className="text-lg">{category?.icon}</span>
                                    <span>{category?.name}</span>
                                 </div>
                                 <ChevronDown size={18} className={`text-stone-400 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                              </button>
                              {isCategoryDropdownOpen && (
                                 <div className="absolute z-10 w-full mt-2 bg-white border border-stone-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                    {categories.map(cat => (
                                       <button
                                          key={cat.id}
                                          onClick={() => {
                                             if (onCategoryChange && cat.id !== category?.id) {
                                                onCategoryChange(activity.id, cat.id);
                                                setCategory(cat);
                                             }
                                             setIsCategoryDropdownOpen(false);
                                          }}
                                          className={`w-full px-4 py-3 text-left hover:bg-stone-50 transition-colors flex items-center gap-2 ${cat.id === category?.id ? 'bg-stone-100' : ''}`}
                                       >
                                          <span className="text-lg">{cat.icon}</span>
                                          <span className="font-bold text-stone-800">{cat.name}</span>
                                          {cat.id === category?.id && (
                                             <Check size={16} className="ml-auto text-stone-600" />
                                          )}
                                       </button>
                                    ))}
                                 </div>
                              )}
                           </div>
                        </div>

                        {/* Focus Score Setting */}
                        <div>
                           <label className="text-xs text-stone-400 font-medium mb-1.5 block">专注评分</label>
                           <div className="flex bg-stone-100 p-1 rounded-xl">
                              {[
                                 { value: 'inherit', label: '继承' },
                                 { value: 'true', label: '开启' },
                                 { value: 'false', label: '关闭' }
                              ].map((option) => {
                                 const currentValue = activity.enableFocusScore === undefined ? 'inherit' : activity.enableFocusScore.toString();
                                 const isSelected = currentValue === option.value;

                                 let labelNode = <span className="text-xs font-bold">{option.label}</span>;
                                 if (option.value === 'inherit') {
                                    labelNode = (
                                       <div className="flex flex-col items-center leading-none">
                                          <span className="text-xs font-bold">继承</span>
                                          <span className="text-[9px] opacity-60 mt-0.5">
                                             （分类：{category?.enableFocusScore ? '开启' : '关闭'}）
                                          </span>
                                       </div>
                                    );
                                 }

                                 return (
                                    <button
                                       key={option.value}
                                       onClick={() => {
                                          let newVal: boolean | undefined = undefined;
                                          if (option.value === 'true') newVal = true;
                                          if (option.value === 'false') newVal = false;
                                          setActivity({ ...activity, enableFocusScore: newVal });
                                       }}
                                       className={`
                                            flex-1 flex items-center justify-center py-2 rounded-lg transition-all
                                          ${isSelected
                                             ? 'bg-white text-stone-900 shadow-sm ring-1 ring-black/5'
                                             : 'text-stone-400 hover:text-stone-600 hover:bg-stone-200/50'
                                          }
`}
                                       title={option.value === 'inherit' ? `继承分类设置（当前：${category?.enableFocusScore ? '开启' : '关闭'}）` : ''}
                                    >
                                       {labelNode}
                                    </button>
                                 );
                              })}
                           </div>
                        </div>

                        {/* Mood Score Setting */}
                        <div>
                           <label className="text-xs text-stone-400 font-medium mb-1.5 block">情绪评分</label>
                           <div className="flex bg-stone-100 p-1 rounded-xl">
                              {[
                                 { value: 'inherit', label: '继承' },
                                 { value: 'true', label: '开启' },
                                 { value: 'false', label: '关闭' }
                              ].map((option) => {
                                 const currentValue = activity.enableMoodScore === undefined ? 'inherit' : activity.enableMoodScore.toString();
                                 const isSelected = currentValue === option.value;

                                 let labelNode = <span className="text-xs font-bold">{option.label}</span>;
                                 if (option.value === 'inherit') {
                                    labelNode = (
                                       <div className="flex flex-col items-center leading-none">
                                          <span className="text-xs font-bold">继承</span>
                                          <span className="text-[9px] opacity-60 mt-0.5">
                                             （分类：{category?.enableMoodScore ? '开启' : '关闭'}）
                                          </span>
                                       </div>
                                    );
                                 }

                                 return (
                                    <button
                                       key={option.value}
                                       onClick={() => {
                                          let newVal: boolean | undefined = undefined;
                                          if (option.value === 'true') newVal = true;
                                          if (option.value === 'false') newVal = false;
                                          setActivity({ ...activity, enableMoodScore: newVal });
                                       }}
                                       className={`
                                            flex-1 flex items-center justify-center py-2 rounded-lg transition-all
                                          ${isSelected
                                             ? 'bg-white text-stone-900 shadow-sm ring-1 ring-black/5'
                                             : 'text-stone-400 hover:text-stone-600 hover:bg-stone-200/50'
                                          }
`}
                                       title={option.value === 'inherit' ? `继承分类设置（当前：${category?.enableMoodScore ? '开启' : '关闭'}）` : ''}
                                    >
                                       {labelNode}
                                    </button>
                                 );
                              })}
                           </div>
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
                                    value={activity.heatmapMin ?? ''}
                                    onChange={(e) => setActivity({ ...activity, heatmapMin: parseInt(e.target.value) || undefined })}
                                    placeholder="默认：0"
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                                 />
                              </div>
                              <div className="flex-1">
                                 <label className="text-xs text-stone-400 font-medium mb-1.5 block">最大值（最深）</label>
                                 <input
                                    type="number"
                                    min={0}
                                    value={activity.heatmapMax ?? ''}
                                    onChange={(e) => setActivity({ ...activity, heatmapMax: parseInt(e.target.value) || undefined })}
                                    placeholder="默认：240"
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                                 />
                              </div>
                           </div>
                        </div>
                        
                        {/* UI Icon Selector - 仅在启用自定义主题时显示 */}
                        {isCustomThemeEnabled && (
                           <div>
                              <label className="text-xs text-stone-400 font-medium mb-2 block">
                                 UI 图标
                                 <span className="text-stone-300 ml-1">(可选)</span>
                              </label>
                              <UIIconSelector
                                 currentIcon={activity.icon}
                                 currentUiIcon={activity.uiIcon}
                                 onSelectDual={(emoji, uiIcon) => {
                                    // 只更新 uiIcon 字段，不修改 icon（emoji）
                                    setActivity(prev => ({ ...prev, uiIcon }));
                                 }}
                              />
                           </div>
                        )}
                     </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                     <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">外观</h3>
                     <div className="space-y-4">
                        <div>
                           <label className="text-xs text-stone-400 font-medium mb-1.5 block">背景颜色</label>
                           <div className="flex gap-2 flex-wrap">
                              {COLOR_OPTIONS.map(opt => (
                                 <button
                                    key={opt.id}
                                    onClick={() => handleColorChange(`${opt.bg} ${opt.text} `)}
                                    title={opt.label}
                                    className={`w-7 h-7 rounded-full ${opt.bg} ${isStoredColorSelected(activity?.color, `${opt.bg} ${opt.text}`) ? `ring-1 ${opt.ring} ring-offset-1` : ''}`}
                                 />
                              ))}
                              {customColors.map((item) => (
                                 <button
                                    key={item.id}
                                    onClick={() => handleColorChange(item.color)}
                                    title={item.color}
                                    className={`w-7 h-7 rounded-full border border-stone-300 ${
                                       isStoredColorSelected(activity?.color, item.color)
                                          ? 'ring-1 ring-stone-400 ring-offset-1'
                                          : ''
                                    }`}
                                    style={{ backgroundColor: item.color }}
                                 />
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>

                  <NoteTemplateManager
                     templates={activity.noteTemplates}
                     onChange={(noteTemplates) => setActivity({ ...activity, noteTemplates })}
                  />

                  <ActivityAttributeManager
                     attributes={activity.attributes}
                     logs={tagLogs}
                     onChange={(attributes) => setActivity({ ...activity, attributes })}
                     onDeleteAttributeData={handleDeleteAttributeData}
                  />

                  {/* Keywords Section */}
                  <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                     <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">关键字</h3>
                     <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                           {(activity.keywords || []).map(keyword => (
                              <button
                                 key={keyword}
                                 onClick={() => handleRemoveKeyword(keyword)}
                                 className={`
                                    px-3 py-1.5 rounded-lg text-[11px] font-medium text-center border transition-colors flex items-center justify-center gap-1.5 truncate group
                                    ${getKeywordColor(keyword)}
                                 `}
                              >
                                 <span className="truncate max-w-[100px]">{keyword}</span>
                                 <X size={10} className="opacity-40 hover:opacity-100 transition-opacity" />
                              </button>
                           ))}
                           {(activity.keywords || []).length === 0 && (
                              <span className="text-xs text-stone-300 italic">还没有添加关键字。</span>
                           )}
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                           <input
                              type="text"
                              value={newKeyword}
                              onChange={(e) => setNewKeyword(e.target.value)}
                              onKeyDown={(e) => {
                                 if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddKeyword();
                                 }
                              }}
                              placeholder="添加关键字..."
                              className="flex-1 min-w-0 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-bold text-stone-700 outline-none focus:border-stone-400 focus:bg-white transition-colors placeholder:font-normal"
                           />
                           <button
                              onClick={handleAddKeyword}
                              disabled={!newKeyword.trim()}
                              className="p-2.5 bg-stone-800 text-white rounded-xl hover:bg-stone-700 disabled:opacity-50 disabled:hover:bg-stone-800 transition-colors shrink-0"
                           >
                              <Plus size={18} />
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            );
         case 'Timeline':
            return (
               <DetailTimelineCard
                  filteredLogs={tagLogs}
                  displayDate={displayDate}
                  onDateChange={setDisplayDate}
                  customScale={
                     (activity.heatmapMin !== undefined || activity.heatmapMax !== undefined)
                        ? { min: (activity.heatmapMin || 30) * 60, max: (activity.heatmapMax || 240) * 60 }
                        : undefined
                  }
                  entityInfo={{
                     icon: activity.icon,
                     name: activity.name,
                     type: 'activity'
                  }}
                  onEditLog={onEditLog}
                  categories={categories}
                  todos={todos}
                  keywords={activity.keywords || []}
                  enableFocusScore={activity.enableFocusScore ?? category?.enableFocusScore ?? false}
                  enableMoodScore={activity.enableMoodScore ?? category?.enableMoodScore ?? false}
                  renderLogMetadata={(log, { collectionNames }) => {
                     return (
                        <>
                        <ActivityAttributeSummary activity={activity} values={log.attributeValues} />
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                           {/* Linked Todo */}
                           {(() => {
                              const linkedTodo = todos.find(t => t.id === log.linkedTodoId);
                              if (linkedTodo) {
                                 return (
                                    <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                       <span className="text-stone-400 font-bold">@</span>
                                       <span className="line-clamp-1">{linkedTodo.title}</span>
                                       {log.progressIncrement && log.progressIncrement > 0 && (
                                          <span className="font-mono text-stone-400 ml-0.5">+{log.progressIncrement}</span>
                                       )}
                                    </span>
                                 );
                              }
                              return null;
                           })()}

                           {collectionNames.map((collectionName) => (
                              <span key={`${log.id}-collection-${collectionName}`} className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                 <span className="text-stone-400 font-bold">◬</span>
                                 <span className="line-clamp-1">{collectionName}</span>
                              </span>
                           ))}

                           {/* Category Tag */}
                           <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                              <span className="font-bold text-stone-400">#</span>
                              <IconRenderer icon={category?.icon || ''} uiIcon={category?.uiIcon} className="text-xs" />
                              <span className="flex items-center">
                                 <span>{category?.name}</span>
                                 <span className="mx-1 text-stone-300">/</span>
                                 <IconRenderer icon={activity?.icon || ''} uiIcon={activity?.uiIcon} className="text-xs mr-1" />
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
                        </div>
                        </>
                     );
                  }}
               />
            );

         case 'Attributes':
            return <ActivityAttributeStatistics activity={activity} logs={countableTagLogs} />;

         case '关联':
            return (
               <div className="space-y-6">
                  <AssociatedTodoList
                     todos={associatedTodos}
                     logs={logs}
                     onEditTodo={onEditTodo}
                     onToggleTodo={onToggleTodo}
                     emptyDescription="Link todos to this activity to see them here."
                  />
                  {/* Cross Analysis Card (Scope Distribution) */}
                  <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                     <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Scope Analysis</h3>
                     <DateRangeFilter
                        rangeType={analysisRange}
                        date={analysisDate}
                        onRangeChange={setAnalysisRange}
                        onDateChange={setAnalysisDate}
                     />
                     <MatrixAnalysisChart
                        items={matrixStats}
                        totalDuration={analysisTotalDuration}
                     />
                  </div>
               </div>
            );
         default:
            return null;
      }
   };

   return (
      <div className="h-full bg-[#faf9f6] overflow-y-auto no-scrollbar pb-24 px-7 pt-4">
         {/* Header */}
         <div className="mb-6">
            <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-3">
               <span className="text-stone-300 font-normal">#</span>
               {activity.icon && <IconRenderer 
                  icon={activity.icon} 
                  uiIcon={activity.uiIcon}
                  size={17}
                  className="text-2xl" 
               />}
               {activity.name}
            </h1>
            <span className="text-stone-400 text-sm font-medium ml-1 mt-1 flex items-center gap-2">
               <IconRenderer 
                  icon={category.icon} 
                  uiIcon={category.uiIcon}
                  className="text-base" 
               />
               <span>{category.name}</span>
            </span>
         </div>

         {/* Tabs */}
         <div className="flex gap-6 border-b border-stone-200 mb-8 overflow-x-auto no-scrollbar">
            {['Details', 'Timeline', 'Attributes', '关联'].map((tab) => (
               <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-serif tracking-wide whitespace-nowrap transition-colors ${activeTab === tab ? 'text-stone-900 border-b-2 border-stone-900 font-bold' : 'text-stone-400 hover:text-stone-600'}`}
               >
                  {tab === 'Timeline' ? '時間線' : tab === 'Details' ? '细节' : tab === 'Attributes' ? '属性' : tab}
               </button>
            ))}
         </div>

         {renderContent()}
      </div>
   );
};
