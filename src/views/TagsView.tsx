/**
 * @file TagsView.tsx
 * @input Categories, Logs
 * @output Selection Events, Category Updates
 * @pos View (Main Tab)
 * @description The main "Library" view displaying all Categories and Activities in a hierarchical list. Supports expanding/collapsing categories and switching to a Batch Management mode.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useMemo } from 'react';
import { Log, Category } from '../types';
import { ChevronDown, ChevronRight, Settings2 } from 'lucide-react';
import { BatchManageView } from './BatchManageView';
import { IconRenderer } from '../components/IconRenderer';


interface TagsViewProps {
   logs: Log[];
   onSelectTag: (tagId: string) => void;
   onSelectCategory: (catId: string) => void;
   categories: Category[];
   onUpdateCategories: (categories: Category[]) => void;
   isManaging: boolean;
   onStopManaging: () => void;
}

export const TagsView: React.FC<TagsViewProps> = ({ logs, onSelectTag, onSelectCategory, categories, onUpdateCategories, isManaging, onStopManaging }) => {
   const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

   const toggleCategory = (id: string) => {
      const newSet = new Set(expandedCategories);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setExpandedCategories(newSet);
   };

   // Calculate counts
   const counts = useMemo(() => {
      const catCounts = new Map<string, number>();
      const actCounts = new Map<string, number>();

      logs.forEach(log => {
         catCounts.set(log.categoryId, (catCounts.get(log.categoryId) || 0) + 1);
         actCounts.set(log.activityId, (actCounts.get(log.activityId) || 0) + 1);
      });
      return { catCounts, actCounts };
   }, [logs]);

   if (isManaging) {
      return (
         <BatchManageView
            onBack={onStopManaging}
            categories={categories}
            onSave={(newCats) => {
               onUpdateCategories(newCats);
               onStopManaging();
            }}
         />
      );
   }

   return (
      <div 
         className="h-full bg-[#faf9f6] overflow-y-auto no-scrollbar pb-24 px-4 pt-4"
         id="tags-content"
      >

         <div className="flex justify-between items-center px-2 mb-4 text-[10px] text-stone-400 font-bold uppercase tracking-widest">
            <span>Main Categories</span>
            <div className="flex items-center gap-3">
               <button
                  onClick={() => {
                     if (expandedCategories.size === categories.length) {
                        setExpandedCategories(new Set());
                     } else {
                        setExpandedCategories(new Set(categories.map(c => c.id)));
                     }
                  }}
                  className="text-stone-400 hover:text-stone-600 transition-colors"
                  title={expandedCategories.size === categories.length ? "Collapse All" : "Expand All"}
               >
                  {expandedCategories.size === categories.length ? (
                     // Collapse Icon (custom using chevrons)
                     <div className="flex flex-col -space-y-1">
                        <ChevronDown size={14} />
                        <ChevronDown size={14} className="rotate-180" />
                     </div>
                  ) : (
                     <Settings2 size={16} className="rotate-90" />
                  )}
               </button>
               <span>{categories.length}</span>
            </div>
         </div>

         <div className="space-y-1">
            {categories.map(category => {
               const isExpanded = expandedCategories.has(category.id);
               const totalCount = counts.catCounts.get(category.id) || 0;

               return (
                  <div key={category.id} className="flex flex-col">
                     {/* Level 1 Item */}
                     <div
                        onClick={() => toggleCategory(category.id)}
                        className="flex items-center justify-between py-2 px-3 cursor-pointer active:bg-stone-100 rounded-lg transition-colors group"
                     >
                        <div className="flex items-center gap-3">
                           <span className="text-stone-300 font-bold">#</span>
                           {/* Removed grayscale, added opacity-100 */}
                           <IconRenderer icon={category.icon} className="text-lg opacity-100" />
                           <span className="font-bold text-stone-800">{category.name}</span>
                           <span className="text-xs text-stone-400 font-mono ml-1">({totalCount})</span>
                        </div>
                        <div className="flex items-center gap-3 text-stone-300">
                           <button
                              onClick={(e) => { e.stopPropagation(); onSelectCategory(category.id); }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-stone-200 rounded-full transition-all text-stone-400"
                           >
                              <ChevronRight size={16} />
                           </button>
                           {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                     </div>

                     {/* Level 2 Items (Accordion) */}
                     {isExpanded && (
                        <div className="pl-9 flex flex-col gap-2 mt-1 mb-2 animate-in slide-in-from-top-2 duration-200">
                           {category.activities.map(act => {
                              const count = counts.actCounts.get(act.id) || 0;
                              return (
                                 <div
                                    key={act.id}
                                    onClick={() => onSelectTag(act.id)}
                                    className="flex items-center justify-between bg-white/80 backdrop-blur-md border border-stone-100 rounded-lg px-4 py-3 cursor-pointer active:scale-[0.98] transition-all"
                                 >
                                    <div className="flex items-center gap-3">
                                       <span className="text-stone-300 font-light text-sm">#</span>
                                       {/* Swapped icon and name */}
                                       {act.icon && <IconRenderer icon={act.icon} className="opacity-100 text-sm" />}
                                       <span className="text-stone-600 font-medium text-sm">{act.name}</span>
                                    </div>
                                    <span className="text-xs text-stone-400 font-mono">{count}</span>
                                 </div>
                              );
                           })}
                        </div>
                     )}
                  </div>
               );
            })}
         </div>
      </div>
   );
};