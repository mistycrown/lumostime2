/**
 * @file TagDetailView.tsx
 * @updated 2026-09-20: Places the unlocked keyword color sequence action beside the title and opens a centered modal.
 * @updated 2026-09-20: Adds shared, unlock-aware keyword color sequences without changing existing keyword colors.
 * @updated 2026-09-12: Added a contextual hint beside tag keyword management.
 * @updated 2026-09-07: Uses the shared detail timeline attribute row rendered below notes.
 * @updated 2026-09-03: Passes the selected attribute keyword source into the detail keyword calendar.
 * @updated 2026-09-02: Debounced activity auto-save so attribute text inputs remain focused while typing.
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
import { Log, Category, Activity, ActivityKeyword, TodoItem, ActivityStatisticCard } from '../types';
import { COLOR_OPTIONS } from '../constants';
import { CalendarWidget } from '../components/CalendarWidget';
import { ArrowLeft, Clock, Calendar as CalendarIcon, MoreHorizontal, ChevronDown, Check, X, Zap, Save, CheckCircle2, Circle, Plus, Archive, ArchiveRestore, Palette } from 'lucide-react';
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
import { KeywordColorSequenceModal } from '../components/KeywordColorSequenceModal';
import { FeatureHint } from '../components/FeatureHint';
import { getDefaultKeywordColor, getRandomKeywordColor, normalizeActivityKeywords, syncActivityKeywordsWithAttribute } from '../utils/detailTimelineKeywordUtils';
import { createDefaultStatisticCard, normalizeStatisticCards } from '../utils/activityStatisticCardUtils';
import { getChartPalette } from '../utils/chartPalette';
import { useChartPaletteSequences } from '../hooks/useChartPaletteSequences';
import { useSponsorshipUnlocked } from '../hooks/useSponsorshipUnlocked';


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
   const [keywordColorTarget, setKeywordColorTarget] = useState<string | null>(null);
   const [keywordColorDraft, setKeywordColorDraft] = useState<string | null>(null);
   const [isKeywordSequenceModalOpen, setIsKeywordSequenceModalOpen] = useState(false);
   const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false); // State for category dropdown
   const customColors = useCustomColors();
   const customSequences = useChartPaletteSequences();
   const isSponsorshipUnlocked = useSponsorshipUnlocked();
   const keywordSequenceId = activity?.keywordColorSequenceId || 'default';
   const effectiveKeywordSequenceId = isSponsorshipUnlocked ? keywordSequenceId : 'default';
   const keywordSequence = useMemo(() => getChartPalette(effectiveKeywordSequenceId, customSequences), [customSequences, effectiveKeywordSequenceId]);
   const getNewKeywordColor = (index: number) => activity?.keywordColorSequenceEnabled
      ? keywordSequence.colors[index % keywordSequence.colors.length]
      : getRandomKeywordColor();
   const keywordAttribute = useMemo(() => (activity?.attributes || []).find((attribute) => (
      attribute.isKeywordSource
      && !attribute.isArchived
      && (attribute.type === 'single' || attribute.type === 'multi')
   )), [activity?.attributes]);

   const keywordRecords = useMemo(() => syncActivityKeywordsWithAttribute(activity?.keywords || [], activity?.attributes || [], getNewKeywordColor), [activity?.attributes, activity?.keywords, keywordSequence.colors, activity?.keywordColorSequenceEnabled]);

   useEffect(() => {
      if (!activity) return;
      if (JSON.stringify(activity.keywords || []) !== JSON.stringify(keywordRecords)) {
         setActivity({ ...activity, keywords: keywordRecords });
      }
   }, [activity, keywordRecords]);

   // 自动保存：为连续输入增加短暂防抖，避免每个按键都触发父级数据重建。
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
            activity.keywordColorSequenceEnabled !== initialActivity.keywordColorSequenceEnabled ||
            activity.keywordColorSequenceId !== initialActivity.keywordColorSequenceId ||
            JSON.stringify(activity.keywords) !== JSON.stringify(initialActivity.keywords) ||
            JSON.stringify(activity.noteTemplates || []) !== JSON.stringify(initialActivity.noteTemplates || []) ||
            JSON.stringify(activity.attributes || []) !== JSON.stringify(initialActivity.attributes || []) ||
            JSON.stringify(activity.statisticCards || []) !== JSON.stringify(initialActivity.statisticCards || []);
         
         if (hasChanges) {
            const saveTimer = window.setTimeout(() => onUpdateActivity(activity), 300);
            return () => window.clearTimeout(saveTimer);
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
   const getKeywordColor = (keyword: ActivityKeyword) => keyword.color || getDefaultKeywordColor(keyword.label);

   const handleAddKeyword = () => {
      if (!newKeyword.trim() || !activity) return;
      const currentKeywords = normalizeActivityKeywords(activity.keywords || []);
      if (!currentKeywords.some((keyword) => keyword.label === newKeyword.trim())) {
         setActivity({
            ...activity,
            keywords: [...currentKeywords, { label: newKeyword.trim(), source: 'manual', color: getNewKeywordColor(currentKeywords.length) }]
         });
      }
      setNewKeyword('');
   };

   const handleRemoveKeyword = (keywordToRemove: string) => {
      if (!activity) return;
      const currentKeywords = normalizeActivityKeywords(activity.keywords || []);
      setActivity({
         ...activity,
         keywords: currentKeywords.filter((keyword) => !(keyword.source === 'manual' && keyword.label === keywordToRemove))
      });
   };

   const handleKeywordColorChange = (label: string, color: string) => {
      if (!activity) return;
      const currentKeywords = normalizeActivityKeywords(activity.keywords || []);
      setActivity({ ...activity, keywords: currentKeywords.map((keyword) => keyword.label === label ? { ...keyword, color } : keyword) });
      setKeywordColorTarget(null);
   };

   const openKeywordColorPicker = (label: string) => {
      const target = keywordRecords.find((keyword) => keyword.label === label);
      setKeywordColorTarget(label);
      setKeywordColorDraft(target?.color || getDefaultKeywordColor(label));
   };

   const confirmKeywordColor = () => {
      if (keywordColorTarget && keywordColorDraft) handleKeywordColorChange(keywordColorTarget, keywordColorDraft);
      else setKeywordColorTarget(null);
      setKeywordColorDraft(null);
   };

   const getKeywordSoftColor = (color: string) => `color-mix(in srgb, ${color} 16%, white)`;

   const handleAttributesChange = (attributes: NonNullable<Activity['attributes']>) => {
      if (!activity) return;
      const existingCards = activity.statisticCards === undefined ? [] : normalizeStatisticCards(activity);
      const knownAttributeIds = new Set(existingCards
         .filter((card): card is ActivityStatisticCard & { source: { type: 'attribute'; attributeId: string } } => card.source.type === 'attribute')
         .map((card) => card.source.attributeId));
      const nextCards = attributes.reduce((cards, attribute) => (
         knownAttributeIds.has(attribute.id) ? cards : [...cards, createDefaultStatisticCard(attribute, cards.length)]
      ), existingCards).map((card, index) => ({ ...card, order: index }));
      setActivity({ ...activity, attributes, statisticCards: nextCards, keywords: syncActivityKeywordsWithAttribute(activity.keywords || [], attributes, getNewKeywordColor) });
   };

   const renderContent = () => {
      switch (activeTab) {
         case 'Details':
            return (
               <div className="space-y-12">
                  <section className="pt-0">
                     <div className="mb-7 flex items-end justify-between gap-4">
                        <div>
                           <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-400">01 / Identity</p>
                           <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-900">基本信息</h2>
                        </div>
                        <span className="text-xs text-stone-400">标签设置</span>
                     </div>
                     <div className="space-y-7">
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
                           <label className="mb-2 block text-sm font-semibold text-stone-600">名称（首字符作为图标）</label>
                           <input
                              type="text"
                              value={`${activity.icon}${activity.name} `}
                              onChange={(e) => handleNameChange(e.target.value)}
                              className="h-11 w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 text-[13px] font-medium text-stone-800 outline-none transition-colors focus:border-stone-400"
                           />
                        </div>
                        <div>
                           <label className="mb-2 block text-sm font-semibold text-stone-600">一级分类</label>
                           <div className="relative category-dropdown-container">
                              <button
                                 onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                 className="flex h-11 w-full items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-3.5 text-[13px] font-medium text-stone-800 outline-none transition-colors hover:border-stone-400"
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
                                          className={`flex h-10 w-full items-center gap-2 px-3.5 text-left text-[13px] transition-colors hover:bg-stone-50 ${cat.id === category?.id ? 'bg-stone-100' : ''}`}
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
                           <label className="mb-2 block text-sm font-semibold text-stone-600">专注评分</label>
                           <div className="flex h-11 rounded-lg bg-stone-100 p-1">
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
                                            flex h-full flex-1 items-center justify-center rounded-md px-2 transition-all
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
                           <label className="mb-2 block text-sm font-semibold text-stone-600">情绪评分</label>
                           <div className="flex h-11 rounded-lg bg-stone-100 p-1">
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
                                            flex h-full flex-1 items-center justify-center rounded-md px-2 transition-all
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
                           <label className="mb-2 block text-sm font-semibold text-stone-600">热力图范围（分钟）</label>
                           <div className="flex gap-4">
                              <div className="flex-1">
                                 <label className="mb-2 block text-sm font-semibold text-stone-600">最小值（最浅）</label>
                                 <input
                                    type="number"
                                    min={0}
                                    value={activity.heatmapMin ?? ''}
                                    onChange={(e) => setActivity({ ...activity, heatmapMin: parseInt(e.target.value) || undefined })}
                                    placeholder="默认：0"
                                    className="h-11 w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 text-[13px] font-medium text-stone-800 outline-none transition-colors focus:border-stone-400"
                                 />
                              </div>
                              <div className="flex-1">
                                 <label className="mb-2 block text-sm font-semibold text-stone-600">最大值（最深）</label>
                                 <input
                                    type="number"
                                    min={0}
                                    value={activity.heatmapMax ?? ''}
                                    onChange={(e) => setActivity({ ...activity, heatmapMax: parseInt(e.target.value) || undefined })}
                                    placeholder="默认：240"
                                    className="h-11 w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 text-[13px] font-medium text-stone-800 outline-none transition-colors focus:border-stone-400"
                                 />
                              </div>
                           </div>
                        </div>
                        
                        {/* UI Icon Selector - 仅在启用自定义主题时显示 */}
                        {isCustomThemeEnabled && (
                           <div>
                              <label className="mb-2 block text-sm font-semibold text-stone-600">
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
                  </section>

                  <section className="border-t border-stone-300 pt-6">
                     <div className="mb-7 flex items-end justify-between gap-4">
                        <div>
                           <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-400">02 / Appearance</p>
                           <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-900">外观</h2>
                        </div>
                     </div>
                     <div className="space-y-6">
                        <div>
                           <label className="mb-2 block text-sm font-semibold text-stone-600">背景颜色</label>
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
                  </section>

                  <NoteTemplateManager
                     templates={activity.noteTemplates}
                     onChange={(noteTemplates) => setActivity({ ...activity, noteTemplates })}
                  />

                  <ActivityAttributeManager
                     attributes={activity.attributes}
                     logs={tagLogs}
                     onChange={handleAttributesChange}
                     onDeleteAttributeData={handleDeleteAttributeData}
                  />

                  {/* Keywords Section */}
                  <section className="border-t border-stone-300 pt-6">
                     <div className="mb-7 flex items-start justify-between gap-4">
                        <div>
                           <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-400">05 / Keywords</p>
                           <div className="mt-1 flex items-center gap-2">
                              <h2 className="text-xl font-semibold tracking-tight text-stone-900">关键字</h2>
                              {isSponsorshipUnlocked && (
                                 <button
                                    type="button"
                                    onClick={() => setIsKeywordSequenceModalOpen(true)}
                                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                                       activity.keywordColorSequenceEnabled
                                          ? 'bg-stone-100 text-stone-800'
                                          : 'text-stone-400 hover:bg-stone-100 hover:text-stone-700'
                                    }`}
                                    title="关键字色彩序列"
                                    aria-label="关键字色彩序列"
                                 >
                                    <Palette size={15} strokeWidth={1.8} />
                                 </button>
                              )}
                           </div>
                        </div>
                        <FeatureHint
                           hintId="tag-detail-keywords"
                           message={'在此设置关键字，然后在添加记录时，备注输入关键字，系统会提示关联到此标签。\n\n偏好设置中，可以设置是否默认跳转到备注输入框，以便快速输入关键字。\n\n另外，在添加补记时，点击Total time 也可以快速定位至备注输入框，以快速输入关键字。'}
                           iconSize={12}
                        />
                     </div>
                     <div className="space-y-5">
                        <div className="flex flex-wrap gap-2">
                           {keywordRecords.map((keyword) => (
                              <div key={`${keyword.source}-${keyword.attributeId || ''}-${keyword.optionId || keyword.label}`} className="inline-flex items-stretch overflow-hidden rounded-lg border text-[11px] font-medium" style={{ backgroundColor: getKeywordSoftColor(getKeywordColor(keyword)), borderColor: getKeywordColor(keyword), color: getKeywordColor(keyword) }}>
                                 <button type="button" onClick={() => openKeywordColorPicker(keyword.label)} className="max-w-[120px] truncate px-3 py-1.5 text-left hover:brightness-90" title="修改颜色">{keyword.label}</button>
                                 {keyword.source === 'manual' && <button type="button" onClick={() => handleRemoveKeyword(keyword.label)} className="border-l px-1.5 text-current opacity-55 hover:opacity-100" style={{ borderColor: getKeywordColor(keyword) }} title="删除关键字"><X size={10} /></button>}
                              </div>
                           ))}
                           {keywordRecords.length === 0 && (
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
                              className="h-11 min-w-0 flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3.5 text-[13px] font-medium text-stone-700 outline-none transition-colors placeholder:font-normal focus:border-stone-400 focus:bg-white"
                           />
                           <button
                              type="button"
                              onClick={handleAddKeyword}
                              disabled={!newKeyword.trim()}
                              aria-label="添加关键字"
                              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-stone-800 text-white transition-colors hover:bg-stone-700 disabled:opacity-50 disabled:hover:bg-stone-800"
                           >
                              <Plus size={18} />
                           </button>
                        </div>
                     </div>
                  </section>
                  <KeywordColorSequenceModal
                     isOpen={isKeywordSequenceModalOpen}
                     activity={activity}
                     customSequences={customSequences}
                     effectiveSequenceId={effectiveKeywordSequenceId}
                     unlocked={isSponsorshipUnlocked}
                     onChange={setActivity}
                     onClose={() => setIsKeywordSequenceModalOpen(false)}
                  />
                  {keywordColorTarget && (() => {
                     const target = keywordRecords.find((keyword) => keyword.label === keywordColorTarget);
                     if (!target) return null;
                     return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) { setKeywordColorTarget(null); setKeywordColorDraft(null); } }}>
                        <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-label="选择关键字颜色">
                           <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-stone-800">选择颜色</h3><button type="button" onClick={() => { setKeywordColorTarget(null); setKeywordColorDraft(null); }} className="p-1 text-stone-400 hover:text-stone-800" title="关闭"><X size={16} /></button></div>
                           <div className="grid grid-cols-8 gap-2">
                              {COLOR_OPTIONS.map((option) => <button key={option.id} type="button" onClick={() => setKeywordColorDraft(option.hex)} className={`h-7 w-7 rounded-full border border-white shadow-sm ring-1 ring-stone-200 ${keywordColorDraft === option.hex ? 'ring-2 ring-stone-800' : ''}`} style={{ backgroundColor: option.hex }} aria-label={option.label} />)}
                              {customColors.map((option) => <button key={option.id} type="button" onClick={() => setKeywordColorDraft(option.color)} className={`h-7 w-7 rounded-full border border-white shadow-sm ring-1 ring-stone-200 ${keywordColorDraft === option.color ? 'ring-2 ring-stone-800' : ''}`} style={{ backgroundColor: option.color }} aria-label="自定义颜色" />)}
                              {activity.keywordColorSequenceEnabled && keywordSequence.colors.map((color, index) => <button key={`sequence-${index}-${color}`} type="button" onClick={() => setKeywordColorDraft(color)} className={`h-7 w-7 rounded-full border border-white shadow-sm ring-1 ring-stone-200 ${keywordColorDraft === color ? 'ring-2 ring-stone-800' : ''}`} style={{ backgroundColor: color }} aria-label={`${keywordSequence.label} ${index + 1}`} />)}
                           </div>
                           <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { setKeywordColorTarget(null); setKeywordColorDraft(null); }} className="rounded-lg px-3 py-2 text-xs text-stone-500 hover:bg-stone-50">取消</button><button type="button" onClick={confirmKeywordColor} className="rounded-lg bg-stone-800 px-3 py-2 text-xs font-medium text-white hover:bg-stone-700">确定</button></div>
                        </div>
                     </div>;
                  })()}
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
                  keywords={keywordRecords}
                  keywordRecords={keywordRecords}
                  enableFocusScore={activity.enableFocusScore ?? category?.enableFocusScore ?? false}
                  enableMoodScore={activity.enableMoodScore ?? category?.enableMoodScore ?? false}
                  renderLogMetadata={(log, { collectionNames }) => {
                     return (
                        <>
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
            return <ActivityAttributeStatistics activity={activity} logs={countableTagLogs} onChange={setActivity} />;

         case '关联':
            return (
               <div className="space-y-6">
                  <AssociatedTodoList
                     todos={associatedTodos}
                     logs={logs}
                     onEditTodo={onEditTodo}
                     onToggleTodo={onToggleTodo}
                     emptyDescription="关联到此标签的待办会显示在这里。"
                  />
                  {/* Cross Analysis Section (Scope Distribution) */}
                  <div className="border-t border-stone-300 pt-6">
                     <h3 className="mb-5 text-xl font-semibold tracking-tight text-stone-900">领域分析</h3>
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
