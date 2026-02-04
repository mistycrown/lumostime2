/**
 * @file RecordView.tsx
 * @input Categories, Activities
 * @output Measurement Start Event
 * @pos View (Main Tab)
 * @description The primary interface for starting new time blocks. Features a category sidebar and a grid of activity buttons.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState } from 'react';
import { Category, Activity } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';


interface RecordViewProps {
  onStartActivity: (activity: Activity, categoryId: string) => void;
  categories: Category[];
}

export const RecordView: React.FC<RecordViewProps> = ({ onStartActivity, categories }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('recent');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fallback to first category if selected one is not found (e.g. was deleted)
  // Or if 'recent' is not implemented yet, just default to first.
  // Note: 'recent' logic was not fully implemented in previous code, it just defaulted to CATEGORIES[0] if not found.
  const selectedCategory = categories.find(c => c.id === selectedCategoryId) || categories[0];

  return (
    <div className="flex h-full bg-[#faf9f6]">
      {/* Left Sidebar - Categories */}
      {/* w-auto allows it to grow with text, max-w to prevent taking over too much space on tablets */}
      <div
        className={`flex-shrink-0 flex flex-col overflow-y-auto pt-6 pb-20 md:pl-4 pl-0 pr-2 no-scrollbar border-r border-stone-100 bg-[#faf9f6] z-10 transition-all duration-300 ${isSidebarOpen ? 'w-auto md:max-w-[14rem]' : 'w-16 items-center'}`}
      >
        <div className="flex-1 w-full">
          {categories.map((category) => {
            const isSelected = selectedCategoryId === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`
                  flex items-center gap-2 px-4 py-4 md:py-3 mb-1 transition-all duration-200 text-left relative rounded-r-2xl md:rounded-xl group w-full
                  ${isSelected
                    ? 'text-stone-900 font-bold bg-white shadow-[2px_2px_10px_rgba(0,0,0,0.02)] z-10'
                    : 'text-stone-400 hover:text-stone-600'
                  }
                  ${!isSidebarOpen && 'justify-center px-0'}
                `}
                title={!isSidebarOpen ? category.name : undefined}
              >
                {isSelected && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-stone-900 rounded-r-full md:hidden"></div>
                )}
                <span className={`text-xl flex-shrink-0 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-70'}`}>
                  {category.icon}
                </span>
                {/* whitespace-nowrap ensures text never wraps */}
                {isSidebarOpen && (
                  <span className={`text-sm md:text-base whitespace-nowrap transition-all ${isSelected ? 'font-bold' : 'font-medium'}`}>
                    {category.name}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`
            mt-4 mx-auto p-2 rounded-full text-stone-400 hover:bg-white hover:text-stone-600 transition-all active:scale-95
            ${!isSidebarOpen ? 'bg-transparent' : 'self-end mr-4'}
          `}
        >
          {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Right Content - Activity Grid */}
      <div 
        className="flex-1 overflow-hidden flex flex-col p-5 md:p-10 bg-white md:bg-transparent rounded-tl-[2rem] md:rounded-none shadow-[-5px_0_20px_rgba(0,0,0,0.02)] md:shadow-none z-0 ml-[-10px] md:ml-0"
        id="record-content"
      >

        {/* Header (Category Title) */}
        <div className="mb-8 md:mb-10 flex items-center gap-4 mt-2 md:mt-0">
          <h1 className="text-2xl md:text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap">
            {selectedCategory?.name || 'Select Category'}
          </h1>
          <div className="h-px flex-1 bg-stone-100"></div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-8 gap-x-4 md:gap-x-6 content-start overflow-y-auto pb-24 no-scrollbar">
          {selectedCategory?.activities.map((activity) => (
            <div
              key={activity.id}
              onClick={() => onStartActivity(activity, selectedCategory.id)}
              className="flex flex-col items-center gap-3 cursor-pointer active:scale-95 transition-transform"
            >
              {/* Use activity.color for background */}
              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-sm ${activity.color}`}>
                {activity.icon}
              </div>
              <span className="text-xs md:text-sm text-stone-600 font-medium text-center max-w-[80px] leading-tight">
                {activity.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};