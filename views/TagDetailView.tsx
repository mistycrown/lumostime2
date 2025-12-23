/**
 * @file TagDetailView.tsx
 * @input Activity ID, Logs, Associated Todos, Categories
 * @output Activity Updates (Name, Color), Todo Toggles
 * @pos View (Detail Page)
 * @description Detailed analytics and settings for a specific Activity (Tag). Features an activity heatmap, history timeline, keyword management, and associated To-Do tracking.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { Log, Category, Activity, TodoItem } from '../types';
import { COLOR_OPTIONS } from '../constants';
import { CalendarWidget } from '../components/CalendarWidget';
import { ArrowLeft, Clock, Calendar as CalendarIcon, MoreHorizontal, ChevronDown, Check, X, Zap, Save, CheckCircle2, Circle, Plus } from 'lucide-react';
import { FocusCharts } from '../components/FocusCharts';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { MatrixAnalysisChart } from '../components/MatrixAnalysisChart';
import { Scope } from '../types';


interface TagDetailViewProps {
   tagId: string;
   logs: Log[];
   todos: TodoItem[];
   onToggleTodo: (id: string) => void;
   categories: Category[];
   onUpdateActivity: (activity: Activity) => void;
   onCategoryChange?: (activityId: string, newCategoryId: string) => void;
   onEditLog?: (log: Log) => void;
   onEditTodo?: (todo: TodoItem) => void;
   scopes: Scope[];
}

export const TagDetailView: React.FC<TagDetailViewProps> = ({ tagId, logs, todos, onToggleTodo, categories, onUpdateActivity, onCategoryChange, onEditLog, onEditTodo, scopes }) => {
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
   const [isSaveSuccess, setIsSaveSuccess] = useState(false);

   // State
   const [activeTab, setActiveTab] = useState('Timeline');
   const [displayDate, setDisplayDate] = useState(new Date());
   const [analysisRange, setAnalysisRange] = useState<'Week' | 'Month' | 'Year' | 'All'>('Month');
   const [analysisDate, setAnalysisDate] = useState(new Date());
   const [newKeyword, setNewKeyword] = useState(''); // New State for adding keyword
   const [expandedKeywords, setExpandedKeywords] = useState<Set<string>>(new Set()); // Track expanded keyword sections
   const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false); // State for category dropdown

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

   // Total Stats (All time)
   const totalSeconds = tagLogs.reduce((acc, curr) => acc + curr.duration, 0);
   const totalHours = Math.floor(totalSeconds / 3600);
   const totalMins = Math.floor((totalSeconds % 3600) / 60);

   // Prepare Heatmap Data (Based on Display Date)
   const displayMonth = displayDate.getMonth();
   const displayYear = displayDate.getFullYear();

   const heatmapData = useMemo(() => {
      const map = new Map<number, number>();
      tagLogs.forEach(log => {
         const d = new Date(log.startTime);
         if (d.getMonth() === displayMonth && d.getFullYear() === displayYear) {
            const day = d.getDate();
            map.set(day, (map.get(day) || 0) + log.duration);
         }
      });
      return map;
   }, [tagLogs, displayMonth, displayYear]);

   // Month Stats (Current month only)
   const monthLogs = useMemo(() => tagLogs.filter(log => {
      const d = new Date(log.startTime);
      return d.getMonth() === displayMonth && d.getFullYear() === displayYear;
   }), [tagLogs, displayMonth, displayYear]);

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
      const filteredLogs = tagLogs.filter(log => {
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
         if (log.scopeIds && log.scopeIds.length > 0) {
            // 如果有多个scope，将时长平均分配给每个scope
            const durationPerScope = log.duration / log.scopeIds.length;
            log.scopeIds.forEach(scopeId => {
               stats.set(scopeId, (stats.get(scopeId) || 0) + durationPerScope);
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
               const colorClass = scope?.themeColor || '';
               // Try to match tailwind class first, else hex, else default
               const match = colorClass.match(/(?:text|bg)-([a-z]+)-/);
               const colorName = match ? match[1] : (colorClass.startsWith('#') ? 'custom' : 'stone');
               if (colorName === 'custom') return colorClass;
               const option = COLOR_OPTIONS.find(opt => opt.id === colorName);
               return option ? option.hex : '#78716c';
            })(),
            icon: scope?.icon
         };
      });
   }, [tagLogs, scopes, analysisRange, analysisDate]);

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

   // Keyword Logic - 颜色按跳跃式排列，相邻颜色对比度高
   const KEYWORD_COLORS = [
      'bg-red-100 text-red-600 border-red-200 hover:bg-red-200',        // 红
      'bg-cyan-100 text-cyan-600 border-cyan-200 hover:bg-cyan-200',    // 青
      'bg-yellow-100 text-yellow-600 border-yellow-200 hover:bg-yellow-200',  // 黄
      'bg-blue-100 text-blue-600 border-blue-200 hover:bg-blue-200',    // 蓝
      'bg-orange-100 text-orange-600 border-orange-200 hover:bg-orange-200',  // 橙
      'bg-teal-100 text-teal-600 border-teal-200 hover:bg-teal-200',    // 蓝绿
      'bg-amber-100 text-amber-600 border-amber-200 hover:bg-amber-200',  // 琥珀
      'bg-indigo-100 text-indigo-600 border-indigo-200 hover:bg-indigo-200',  // 靛蓝
      'bg-lime-100 text-lime-600 border-lime-200 hover:bg-lime-200',    // 青柠
      'bg-purple-100 text-purple-600 border-purple-200 hover:bg-purple-200',  // 紫
      'bg-green-100 text-green-600 border-green-200 hover:bg-green-200',  // 绿
      'bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200 hover:bg-fuchsia-200',  // 紫红
      'bg-emerald-100 text-emerald-600 border-emerald-200 hover:bg-emerald-200',  // 翠绿
      'bg-pink-100 text-pink-600 border-pink-200 hover:bg-pink-200',    // 粉
      'bg-sky-100 text-sky-600 border-sky-200 hover:bg-sky-200',        // 天蓝
      'bg-rose-100 text-rose-600 border-rose-200 hover:bg-rose-200',    // 玫瑰
      'bg-violet-100 text-violet-600 border-violet-200 hover:bg-violet-200',  // 紫罗兰
   ];

   const getKeywordColor = (keyword: string) => {
      // Logic: Use Index in the list
      const keywords = activity?.keywords || [];
      let index = keywords.indexOf(keyword);

      // If not in list (e.g. new keyword being typed or removed), try to predictable hash or simple mod
      if (index === -1) {
         // Fallback to avoid error, maybe hash
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
                     <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Basic Info</h3>
                     <div className="space-y-4">
                        <div>
                           <label className="text-xs text-stone-400 font-medium mb-1.5 block">Name (First char is icon)</label>
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
                     </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                     <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Appearance</h3>
                     <div className="space-y-4">
                        <div>
                           <label className="text-xs text-stone-400 font-medium mb-1.5 block">Background Color</label>
                           <div className="flex gap-2 flex-wrap">
                              {COLOR_OPTIONS.map(opt => (
                                 <button
                                    key={opt.id}
                                    onClick={() => handleColorChange(`${opt.bg} ${opt.text} `)}
                                    title={opt.label}
                                    className={`w-7 h-7 rounded-full ${opt.bg} ${activity?.color.includes(opt.bg) ? `ring-1 ${opt.ring} ring-offset-1` : ''}`}
                                 />
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Keywords Section */}
                  <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                     <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Keywords</h3>
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
                              <span className="text-xs text-stone-300 italic">No keywords added yet.</span>
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
                              placeholder="Add a keyword..."
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

                  <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                     <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Heatmap Scale (Minutes)</h3>
                     <div className="flex gap-4">
                        <div className="flex-1">
                           <label className="text-xs text-stone-400 font-medium mb-1.5 block">Min (Lightest)</label>
                           <input
                              type="number"
                              min={0}
                              value={activity.heatmapMin ?? ''}
                              onChange={(e) => setActivity({ ...activity, heatmapMin: parseInt(e.target.value) || undefined })}
                              placeholder="Default: 0"
                              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                           />
                        </div>
                        <div className="flex-1">
                           <label className="text-xs text-stone-400 font-medium mb-1.5 block">Max (Darkest)</label>
                           <input
                              type="number"
                              min={0}
                              value={activity.heatmapMax ?? ''}
                              onChange={(e) => setActivity({ ...activity, heatmapMax: parseInt(e.target.value) || undefined })}
                              placeholder="Default: 240"
                              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-bold outline-none focus:border-stone-400 transition-colors"
                           />
                        </div>
                     </div>
                  </div>

                  {/* Focus Score Settings */}
                  <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                     <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Focus Score</h3>
                     <div className="space-y-4">
                        <div>
                           <div className="flex bg-stone-100 p-1 rounded-xl">
                              {[
                                 { value: 'inherit', label: 'Inherit' },
                                 { value: 'true', label: 'On' },
                                 { value: 'false', label: 'Off' }
                              ].map((option) => {
                                 const currentValue = activity.enableFocusScore === undefined ? 'inherit' : activity.enableFocusScore.toString();
                                 const isSelected = currentValue === option.value;

                                 // Add status text for Inherit option
                                 let labelNode = <span className="text-xs font-bold">{option.label}</span>;
                                 if (option.value === 'inherit') {
                                    labelNode = (
                                       <div className="flex flex-col items-center leading-none">
                                          <span className="text-xs font-bold">Inherit</span>
                                          <span className="text-[9px] opacity-60 mt-0.5">
                                             (Cat: {category?.enableFocusScore ? 'On' : 'Off'})
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
                                       title={option.value === 'inherit' ? `Inherit from Category(${category?.enableFocusScore ? 'Enabled' : 'Disabled'})` : ''}
                                    >
                                       {labelNode}
                                    </button>
                                 );
                              })}
                           </div>
                        </div>
                     </div>
                  </div>

                  <button
                     onClick={() => {
                        if (activity) {
                           onUpdateActivity(activity);
                           setIsSaveSuccess(true);
                           setTimeout(() => setIsSaveSuccess(false), 2000);
                        }
                     }}
                     className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl active:scale-[0.99] transition-all flex items-center justify-center gap-2 ${isSaveSuccess ? 'bg-[#2F4F4F] text-white' : 'bg-stone-900 text-white hover:bg-black'}`}
                  >
                     {isSaveSuccess ? (
                        <>
                           <Check size={20} />
                           <span>Saved Successfully</span>
                        </>
                     ) : (
                        <>
                           <Save size={20} />
                           <span>Save Changes</span>
                        </>
                     )}
                  </button>
               </div>
            );
         case 'Timeline':
            return (
               <>
                  {/* Heatmap Section */}
                  <div className="bg-white rounded-[2rem] p-0 mb-8 border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
                     <CalendarWidget
                        currentDate={displayDate}
                        onDateChange={(newDate) => {
                           if (newDate.getMonth() !== displayDate.getMonth() || newDate.getFullYear() !== displayDate.getFullYear()) {
                              setDisplayDate(newDate);
                           }
                        }}
                        logs={tagLogs}
                        isExpanded={true}
                        onExpandToggle={() => { }}
                        customScale={
                           (activity.heatmapMin !== undefined || activity.heatmapMax !== undefined)
                              ? { min: (activity.heatmapMin || 30) * 60, max: (activity.heatmapMax || 240) * 60 }
                              : undefined
                        }
                        disableSelection={true}
                     />

                     <div className="px-6 pb-6 pt-2 flex flex-wrap gap-y-4 items-end justify-between">
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
                              const totalDays = new Set(tagLogs.map(l => new Date(l.startTime).toDateString())).size;
                              return (
                                 <div className="text-xs text-stone-500 bg-stone-100 inline-block px-2 py-1 rounded mt-2 font-medium">
                                    Recorded {totalDays} days / {monthDays} days
                                 </div>
                              );
                           })()}
                        </div>
                        <div className="text-right ml-auto">
                           <div className="text-[10px] uppercase tracking-widest text-stone-400 mb-1 font-bold">Avg. Daily</div>
                           <div className="text-lg font-bold text-stone-700 font-mono">
                              {(() => {
                                 const totalDays = new Set(tagLogs.map(l => new Date(l.startTime).toDateString())).size;
                                 return totalDays > 0 ? Math.round(totalSeconds / 60 / totalDays) : 0;
                              })()}m
                              <span className="text-base text-stone-400 mx-2 font-sans">/</span>
                              <span className="text-base font-bold text-stone-600">
                                 {monthDays > 0 ? Math.round(monthSeconds / 60 / monthDays) : 0}m
                              </span>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* History List for Selected Month */}
                  <div className="space-y-2 mt-8">
                     <div className="flex items-center gap-2 mb-6 px-2">
                        <Clock size={16} className="text-stone-400" />
                        <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">History ({displayMonth + 1}/{displayYear})</span>
                     </div>

                     {heatmapData.size === 0 ? (
                        <div className="text-center py-12 text-stone-400 text-sm italic border border-dashed border-stone-200 rounded-3xl mx-2">
                           No activity recorded in this month.
                        </div>
                     ) : (
                        Array.from(heatmapData.keys()).sort((a: number, b: number) => b - a).map((day: number) => {
                           const daySeconds = heatmapData.get(day) || 0;
                           const dayLogsFiltered = tagLogs.filter(l => {
                              const d = new Date(l.startTime);
                              return d.getDate() === day && d.getMonth() === displayMonth && d.getFullYear() === displayYear;
                           });

                           // Get day of week
                           const date = new Date(displayYear, displayMonth, day);
                           const weekDay = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getDay()];

                           return (
                              <div key={day} className="mb-8 last:mb-0">
                                 {/* Day Header */}
                                 <div className="flex items-baseline justify-between mb-6 px-2 sticky top-0 bg-[#faf9f6]/95 backdrop-blur z-10 py-2 border-b border-stone-100">
                                    <div className="flex items-baseline gap-3">
                                       <span className="text-2xl font-black text-stone-900 font-mono tracking-tighter">
                                          {String(displayMonth + 1).padStart(2, '0')}/{String(day).padStart(2, '0')}
                                       </span>
                                       <span className="text-xs font-bold text-stone-400 tracking-[0.2em]">{weekDay}</span>
                                    </div>
                                    <span className="font-mono text-sm font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md">
                                       {Math.floor(daySeconds / 60)}m
                                    </span>
                                 </div>

                                 {/* Timeline Items */}
                                 <div className="relative border-l border-stone-300 ml-[70px] space-y-6 pb-4">
                                    {dayLogsFiltered.sort((a, b) => b.startTime - a.startTime).map(log => {
                                       const d = new Date(log.startTime);
                                       const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} `;
                                       const durationMins = Math.round(log.duration / 60);
                                       const h = Math.floor(durationMins / 60);
                                       const m = durationMins % 60;
                                       const durStr = h > 0 ? `${h}h ${m} m` : `${m} m`;

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
                                                      {activity?.name || "Activity"}
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

                                                   {/* Category Tag */}
                                                   <span className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                                      <span className="font-bold text-stone-400">#</span>
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
                                                      const linkedScope = scopes.find(s => s.id === scopeId);
                                                      if (linkedScope) {
                                                         return (
                                                            <span key={scopeId} className="text-[10px] font-medium text-stone-500 border border-stone-200 px-2 py-0.5 rounded flex items-center gap-1 bg-stone-50/30">
                                                               <span className="text-stone-400 font-bold">%</span>
                                                               <span>{linkedScope.icon || '📍'}</span>
                                                               <span>{linkedScope.name}</span>
                                                            </span>
                                                         );
                                                      }
                                                      return null;
                                                   })}
                                                </div>
                                             </div>
                                          </div>
                                       );
                                    })}
                                 </div>
                              </div>
                           );
                        })
                     )}
                  </div>
               </>
            );

         case '关联':
            return (
               <div className="space-y-6">
                  {/* Associated Todos Card */}
                  <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                     <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Associated Todos</h3>
                     <div className="space-y-0 text-sm">
                        {associatedTodos.length === 0 ? (
                           <div className="text-center py-8 text-stone-400 border border-dashed border-stone-200 rounded-xl">
                              <p className="text-xs font-medium opacity-60">No associated todos</p>
                              <p className="text-xs mt-2 opacity-40">Link todos to this activity to see them here.</p>
                           </div>
                        ) : (
                           associatedTodos.map(todo => {
                              const todoDuration = logs
                                 .filter(l => l.linkedTodoId === todo.id)
                                 .reduce((acc, curr) => acc + curr.duration, 0);

                              const h = Math.floor(todoDuration / 3600);
                              const m = Math.floor((todoDuration % 3600) / 60);
                              const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

                              return (
                                 <div key={todo.id}
                                    onClick={() => onEditTodo?.(todo)}
                                    className="group flex items-center gap-3 py-2 border-b border-stone-100 last:border-0 hover:bg-stone-50 md:-mx-2 md:px-2 transition-colors cursor-pointer">
                                    <button onClick={() => onToggleTodo(todo.id)} className="shrink-0 transition-colors">
                                       <div className={`w-4 h-4 shrink-0 rounded-[4px] border-2 flex items-center justify-center transition-colors ${todo.isCompleted ? 'bg-stone-900 border-stone-900' : 'border-stone-300 group-hover:border-stone-400'}`}>
                                          {todo.isCompleted && <span className="text-white text-[10px]">✓</span>}
                                       </div>
                                    </button>
                                    <span className={`flex-1 text-sm font-medium truncate min-w-0 ${todo.isCompleted ? 'line-through text-stone-300' : 'text-stone-700'}`}>
                                       {todo.title}
                                    </span>

                                    {((todo.isCompleted) || todoDuration > 0) && (
                                       <span className="text-xs text-stone-300 font-serif whitespace-nowrap shrink-0">
                                          {todo.isCompleted && todo.completedAt ? (() => {
                                             const d = new Date(todo.completedAt);
                                             return `${d.getFullYear().toString().slice(-2)}/${d.getMonth() + 1}/${d.getDate()} `;
                                          })() : ''}
                                          {todoDuration > 0 && `共 ${timeStr}`}
                                       </span>
                                    )}
                                 </div>
                              );
                           })
                        )}
                     </div>
                  </div>

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
         case 'Focus':
            return (
               <FocusCharts
                  logs={tagLogs}
                  currentDate={displayDate}
                  onDateChange={setDisplayDate}
               />
            );
         case 'Keywords':
            return (
               <>
                  <div className="bg-white rounded-[2rem] p-0 mb-8 border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
                     <CalendarWidget
                        currentDate={displayDate}
                        onDateChange={(newDate) => {
                           if (newDate.getMonth() !== displayDate.getMonth() || newDate.getFullYear() !== displayDate.getFullYear()) {
                              setDisplayDate(newDate);
                           }
                        }}
                        logs={tagLogs} // Pass logs for basic tracking, but visual is overridden
                        isExpanded={true}
                        onExpandToggle={() => { }}
                        staticMode={true} // Disable default heat map coloring
                        disableSelection={true}
                        renderCustomDay={(date, isSelected, isToday) => {
                           // Find logs for this day
                           const dayLogs = tagLogs.filter(l => {
                              const d = new Date(l.startTime);
                              return d.getDate() === date.getDate() &&
                                 d.getMonth() === date.getMonth() &&
                                 d.getFullYear() === date.getFullYear();
                           });

                           if (dayLogs.length === 0) return null;

                           // Find matched keywords in these logs
                           const matchedKeywords = new Set<string>();
                           const currentActivityKeywords = activity.keywords || [];

                           dayLogs.forEach(log => {
                              // Check title and note for keywords
                              currentActivityKeywords.forEach(kw => {
                                 if ((log.title && log.title.includes(kw)) || (log.note && log.note.includes(kw))) {
                                    matchedKeywords.add(kw);
                                 }
                              });
                           });

                           // 1. Logs but no keywords matched -> Gray
                           if (matchedKeywords.size === 0) {
                              return <div className="w-full h-full bg-stone-200/50" />;
                           }

                           // 2. Matched keywords -> Split colors
                           const keywordsArray = Array.from(matchedKeywords);
                           return (
                              <div className="w-full h-full flex">
                                 {keywordsArray.map(kw => {
                                    // Extract background color class from getKeywordColor return string
                                    // The string is like "bg-red-50 text-red-500 ..."
                                    // We just apply the whole class string, but maybe force opacity or brightness?
                                    // Actually the bg-xxx-50 might be too light for a calendar cell background which needs to be visible.
                                    // Let's try using the class directly first.
                                    return (
                                       <div
                                          key={kw}
                                          className={`h-full flex-1 ${getKeywordColor(kw)}`}
                                          style={{ border: 'none' }} // Remove borders from the keyword pill style
                                       />
                                    );
                                 })}
                              </div>
                           );
                        }}
                     />
                     <div className="p-6 pt-2 border-t border-stone-100">
                        <div className="flex flex-wrap gap-2 justify-center">
                           <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded bg-stone-200/50"></div>
                              <span className="text-xs text-stone-500">Unmatched</span>
                           </div>
                           {(activity.keywords || []).map(kw => (
                              <div key={kw} className="flex items-center gap-1.5 ml-2">
                                 <div className={`w-3 h-3 rounded ${getKeywordColor(kw).split(' ')[0]}`}></div> {/* Take just the bg class */}
                                 <span className="text-xs text-stone-500">{kw}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  {/* Keyword Grouped Lists */}
                  <div className="space-y-6">
                     {(() => {
                        // Filter logs for current month
                        const currentMonthLogs = tagLogs.filter(l => {
                           const d = new Date(l.startTime);
                           return d.getMonth() === displayDate.getMonth() && d.getFullYear() === displayDate.getFullYear();
                        });

                        // Group logic
                        const groups = (activity.keywords || []).map(kw => {
                           const logs = currentMonthLogs.filter(l =>
                              (l.title && l.title.includes(kw)) || (l.note && l.note.includes(kw))
                           );
                           return { keyword: kw, logs };
                        });

                        // Also maybe "Unmatched"? (Optional, but good for UX)
                        // Let's stick to defined keywords first as requested.

                        return groups.map(group => {
                           const totalDuration = group.logs.reduce((acc, curr) => acc + curr.duration, 0);
                           const h = Math.floor(totalDuration / 3600);
                           const m = Math.floor((totalDuration % 3600) / 60);
                           const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
                           const isExpanded = expandedKeywords.has(group.keyword);

                           return (
                              <div key={group.keyword} className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm transition-all">
                                 {/* Header */}
                                 <div
                                    onClick={() => {
                                       const newSet = new Set(expandedKeywords);
                                       if (newSet.has(group.keyword)) {
                                          newSet.delete(group.keyword);
                                       } else {
                                          newSet.add(group.keyword);
                                       }
                                       setExpandedKeywords(newSet);
                                    }}
                                    className="flex items-center justify-between cursor-pointer group select-none"
                                 >
                                    <div className="flex items-center gap-3">
                                       <div className={`w-3 h-3 rounded-full ${getKeywordColor(group.keyword).split(' ')[0]}`}></div>
                                       <h3 className="text-sm font-bold text-stone-700 uppercase tracking-widest">{group.keyword}</h3>
                                       <span className="bg-stone-100 text-stone-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                          {group.logs.length}
                                       </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                       <span className="font-mono text-sm font-bold text-stone-400 group-hover:text-stone-600 transition-colors">
                                          {timeStr}
                                       </span>
                                       <ChevronDown size={16} className={`text-stone-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                 </div>

                                 {/* List */}
                                 {isExpanded && (
                                    <div className="mt-6 space-y-0 text-sm animate-in slide-in-from-top-2 fade-in duration-200">
                                       {group.logs.length === 0 ? (
                                          <div className="text-center py-8 text-stone-300 italic text-xs">
                                             No records found for this keyword in this month.
                                          </div>
                                       ) : (
                                          group.logs
                                             .sort((a, b) => b.startTime - a.startTime)
                                             .map(log => {
                                                const logH = Math.floor(log.duration / 3600);
                                                const logM = Math.floor((log.duration % 3600) / 60);
                                                const logTimeStr = logH > 0 ? `${logH}h ${logM}m` : `${logM}m`;
                                                const dateObj = new Date(log.startTime);

                                                return (
                                                   <div
                                                      key={log.id}
                                                      onClick={() => onEditLog?.(log)}
                                                      className="group flex items-center gap-3 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50 md:-mx-2 md:px-2 transition-colors cursor-pointer"
                                                   >
                                                      <div className="w-8 flex flex-col items-center justify-center shrink-0">
                                                         <span className="text-[10px] font-bold text-stone-400 leading-none">
                                                            {dateObj.getDate()}
                                                         </span>
                                                         <span className="text-[8px] text-stone-300 uppercase leading-none mt-0.5">
                                                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()]}
                                                         </span>
                                                      </div>

                                                      <div className="w-1 h-8 rounded-full bg-stone-100 group-hover:bg-stone-200 transition-colors shrink-0"></div>

                                                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                         <span className="font-medium truncate text-stone-700 leading-tight">
                                                            {log.note || log.title || "No description"}
                                                         </span>
                                                         <span className="text-[10px] text-stone-400 mt-0.5 font-mono">
                                                            {dateObj.getHours().toString().padStart(2, '0')}:{dateObj.getMinutes().toString().padStart(2, '0')}
                                                         </span>
                                                      </div>

                                                      <span className="text-xs text-stone-400 font-mono whitespace-nowrap shrink-0 group-hover:text-stone-600">
                                                         {logTimeStr}
                                                      </span>
                                                   </div>
                                                );
                                             })
                                       )}
                                    </div>
                                 )}
                              </div>
                           );
                        });
                     })()}
                  </div>
               </>
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
               {activity.icon && <span className="text-2xl">{activity.icon}</span>}
               {activity.name}
            </h1>
            <span className="text-stone-400 text-sm font-medium ml-1 mt-1 flex items-center gap-2">
               <span>{category.icon}</span>
               <span>{category.name}</span>
            </span>
         </div>

         {/* Tabs */}
         <div className="flex gap-6 border-b border-stone-200 mb-8 overflow-x-auto no-scrollbar">
            {['Details', 'Timeline', '关联']
               .concat((activity.enableFocusScore ?? category.enableFocusScore) ? ['Focus'] : [])
               .concat((activity.keywords && activity.keywords.length > 0) ? ['Keywords'] : [])
               .map((tab) => (
                  <button
                     key={tab}
                     onClick={() => setActiveTab(tab)}
                     className={`pb-3 text-sm font-serif tracking-wide whitespace-nowrap transition-colors ${activeTab === tab ? 'text-stone-900 border-b-2 border-stone-900 font-bold' : 'text-stone-400 hover:text-stone-600'}`}
                  >
                     {tab === 'Timeline' ? '時間線' : tab === 'Details' ? '细节' : tab === 'Focus' ? '专 注' : tab === 'Keywords' ? '关键字' : tab}
                  </button>
               ))}
         </div>

         {renderContent()}
      </div>
   );
};
