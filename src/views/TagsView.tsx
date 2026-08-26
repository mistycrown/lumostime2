/**
 * @file TagsView.tsx
 * @updated 2026-08-06: Added archived tag index section and active-tag filtering.
 * @input Categories, Logs
 * @output Selection Events, Category Updates
 * @pos View (Main Tab)
 * @description The main "Library" view displaying all Categories and Activities in a hierarchical list. Supports expanding/collapsing categories, switching to a Batch Management mode, and clearer activity card icon sizing.
 * @updated 2026-08-09: Planned timeline blocks are excluded from tag and category log counts.
 * @updated 2026-08-26: Passes activity migration preview and execution handlers into batch management.
 * @updated 2026-08-26: Separates archived categories from active categories and allows archived categories to be reopened for cascading restore.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useMemo } from 'react';
import { Log, Category } from '../types';
import { ChevronDown, ChevronRight, Settings2, Archive } from 'lucide-react';
import { BatchManageView } from './BatchManageView';
import { IconRenderer } from '../components/IconRenderer';
import { isActivityArchived, isCategoryArchived } from '../utils/archiveUtils';
import { filterCountableLogs } from '../utils/statLogUtils';
import type { ActivityMigrationImpact } from '../utils/activityReferenceMigration';


interface TagsViewProps {
   logs: Log[];
   onSelectTag: (tagId: string) => void;
   onSelectCategory: (catId: string) => void;
   categories: Category[];
   onUpdateCategories: (categories: Category[]) => void;
   onPreviewActivityMigration?: (sourceActivityId: string) => ActivityMigrationImpact;
   onMigrateAndDeleteActivity?: (sourceActivityId: string, targetActivityId: string) => Promise<ActivityMigrationImpact>;
   isManaging: boolean;
   onStopManaging: () => void;
}

export const TagsView: React.FC<TagsViewProps> = ({ logs, onSelectTag, onSelectCategory, categories, onUpdateCategories, onPreviewActivityMigration, onMigrateAndDeleteActivity, isManaging, onStopManaging }) => {
   const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
   const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);

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

       filterCountableLogs(logs).forEach(log => {
         catCounts.set(log.categoryId, (catCounts.get(log.categoryId) || 0) + 1);
         actCounts.set(log.activityId, (actCounts.get(log.activityId) || 0) + 1);
      });
      return { catCounts, actCounts };
   }, [logs]);

   const activeCategories = useMemo(
      () => categories
         .filter(category => !isCategoryArchived(category))
         .map(category => ({ ...category, activities: category.activities.filter(activity => !isActivityArchived(activity)) })),
      [categories]
   );
   const archivedCategories = useMemo(
      () => categories
         .map(category => ({
            ...category,
            activities: isCategoryArchived(category)
               ? category.activities
               : category.activities.filter(isActivityArchived)
         }))
         .filter(category => isCategoryArchived(category) || category.activities.some(isActivityArchived)),
      [categories]
   );

   if (isManaging) {
      return (
         <BatchManageView
            onBack={onStopManaging}
            categories={categories}
            onPreviewActivityMigration={onPreviewActivityMigration}
            onMigrateAndDeleteActivity={onMigrateAndDeleteActivity}
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
                     if (expandedCategories.size === activeCategories.length) {
                        setExpandedCategories(new Set());
                     } else {
                        setExpandedCategories(new Set(activeCategories.map(c => c.id)));
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
               <span>{activeCategories.reduce((count, category) => count + category.activities.length, 0)}</span>
            </div>
         </div>

         <div className="space-y-1">
            {activeCategories.map(category => {
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
                           <IconRenderer 
                              icon={category.icon} 
                              uiIcon={category.uiIcon}
                              size={16} 
                           />
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
                                       {act.icon && <IconRenderer 
                                          icon={act.icon} 
                                          uiIcon={act.uiIcon}
                                          className="opacity-100"
                                       />}
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

         {archivedCategories.length > 0 && (
            <div className="mt-8 pt-5 border-t border-stone-200">
               <button
                  type="button"
                  onClick={() => setIsArchivedExpanded(prev => !prev)}
                  className="w-full flex items-center gap-2 px-2 mb-3 text-[10px] text-stone-400 font-bold uppercase tracking-widest text-left"
               >
                  {isArchivedExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <Archive size={13} />
                  <span>已归档</span>
                  <span className="ml-auto">{archivedCategories.reduce((count, category) => count + category.activities.length, 0)}</span>
               </button>
               {isArchivedExpanded && <div className="space-y-1">
                  {archivedCategories.map(category => {
                     const archiveKey = `archived:${category.id}`;
                     const isExpanded = expandedCategories.has(archiveKey);
                     return (
                        <div key={category.id} className="flex flex-col">
                           <div
                              onClick={() => toggleCategory(archiveKey)}
                              className="flex items-center justify-between py-2 px-3 cursor-pointer rounded-lg transition-colors group"
                           >
                              <div className="flex items-center gap-3">
                                 <span className="text-stone-300 font-bold">#</span>
                                 <IconRenderer icon={category.icon} uiIcon={category.uiIcon} size={16} />
                                 <span className="font-bold text-stone-500">{category.name}</span>
                                 <span className="text-xs text-stone-400 font-mono ml-1">({category.activities.length})</span>
                              </div>
                              <button
                                 type="button"
                                 onClick={(event) => { event.stopPropagation(); onSelectCategory(category.id); }}
                                 className="p-1 text-stone-300 hover:text-stone-600 transition-colors"
                                 title="打开分类"
                              >
                                 <ChevronRight size={16} />
                              </button>
                              {isExpanded ? <ChevronDown size={18} className="text-stone-300" /> : <ChevronRight size={18} className="text-stone-300" />}
                           </div>
                           {isExpanded && (
                              <div className="pl-9 flex flex-col gap-2 mt-1 mb-2">
                                 {category.activities.map(act => (
                                    <div
                                       key={act.id}
                                       onClick={() => onSelectTag(act.id)}
                                       className="flex items-center justify-between bg-stone-50 border border-stone-100 rounded-lg px-4 py-3 cursor-pointer transition-all opacity-70"
                                    >
                                       <div className="flex items-center gap-3">
                                          <span className="text-stone-300 font-light text-sm">#</span>
                                          {act.icon && <IconRenderer icon={act.icon} uiIcon={act.uiIcon} className="opacity-70" />}
                                          <span className="text-stone-500 font-medium text-sm">{act.name}</span>
                                       </div>
                                       <span className="text-xs text-stone-400 font-mono">{counts.actCounts.get(act.id) || 0}</span>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>
                     );
                  })}
               </div>}
            </div>
         )}
      </div>
   );
};
