/**
 * @file RecordView.tsx
 * @input Categories, Activities
 * @output Measurement Start Event
 * @pos View (Main Tab)
 * @description The primary interface for starting new time blocks. Features a category sidebar and a grid of activity buttons with larger start-card icons.
 * @updated 2026-05-04: Added a custom-background-only sidebar scrim so left-rail category buttons stay legible over busy wallpapers.
 * @updated 2026-04-12: Softened the sidebar toggle button styling to reduce visual weight and keep it aligned with TodoView controls.
 * @updated 2026-04-20: Switched custom background rendering to the shared preloaded display hook and reduced mobile blur cost.
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useEffect } from 'react';
import { Category, Activity } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconRenderer } from '../components/IconRenderer';
import { getSoftColorCircleStyle } from '../utils/colorAdapterUtils';
import { useBackgroundDisplay } from '../hooks/useBackgroundDisplay';


interface RecordViewProps {
  onStartActivity: (activity: Activity, categoryId: string) => void;
  categories: Category[];
}

export const RecordView: React.FC<RecordViewProps> = ({ onStartActivity, categories }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { backgroundUrl, hasBackground, panelOverlayOpacity, useReducedEffects } = useBackgroundDisplay();

  // 初始化时从 localStorage 恢复用户上次选择的分组
  useEffect(() => {
    const savedCategoryId = localStorage.getItem('lastSelectedCategoryId');
    
    if (savedCategoryId && categories.some(c => c.id === savedCategoryId)) {
      // 如果保存的分组 ID 仍然存在，则使用它
      setSelectedCategoryId(savedCategoryId);
    } else if (categories.length > 0) {
      // 否则使用第一个分组
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories]);

  // 保存用户选择的分组到 localStorage
  useEffect(() => {
    if (selectedCategoryId) {
      localStorage.setItem('lastSelectedCategoryId', selectedCategoryId);
    }
  }, [selectedCategoryId]);

  // Fallback to first category if selected one is not found (e.g. was deleted)
  // Or if 'recent' is not implemented yet, just default to first.
  // Note: 'recent' logic was not fully implemented in previous code, it just defaulted to CATEGORIES[0] if not found.
  const selectedCategory = categories.find(c => c.id === selectedCategoryId) || categories[0];

  const getActivityButtonStyle = (activity: Activity) => {
    return getSoftColorCircleStyle(activity.color || '', 0.15);
  };

  return (
    <div 
      className="flex h-full relative"
      style={{
        backgroundColor: hasBackground ? 'transparent' : '#faf9f6'
      }}
    >
      {/* 背景图片层 */}
      {hasBackground && (
        <div 
          className="absolute inset-0 -z-20"
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            transform: 'translateZ(0)'
          }}
        />
      )}
      
      {/* 全局半透明遮罩层 - 覆盖整个下半部分 */}
      <div className="absolute inset-0 -z-10" style={{ backgroundColor: 'rgba(250, 249, 246, 0.5)' }}></div>
      
      {/* Left Sidebar - Categories */}
      {/* w-auto allows it to grow with text, max-w to prevent taking over too much space on tablets */}
      <div
        className={`flex-shrink-0 flex flex-col overflow-y-auto pt-6 pb-20 pl-0 pr-2 no-scrollbar z-0 transition-all duration-300 relative ${isSidebarOpen ? 'w-auto md:max-w-[14rem]' : 'w-16 items-center'}`}
      >
        {hasBackground && (
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{ backgroundColor: 'rgba(250, 249, 246, 0.62)' }}
          />
        )}

        <div className="relative z-10 flex-1 w-full">
          {categories.map((category) => {
            const isSelected = selectedCategoryId === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`
                  flex items-center gap-2 mb-1 transition-all duration-200 text-left relative rounded-r-2xl group
                  ${isSelected
                    ? 'text-stone-900 font-bold bg-white shadow-[2px_2px_10px_rgba(0,0,0,0.02)] z-10'
                    : 'text-stone-600 hover:text-stone-800'
                  }
                  ${!isSidebarOpen ? 'justify-center w-12 h-12 md:w-14 md:h-14' : 'w-full h-12 md:h-14 px-4'}
                `}
                title={!isSidebarOpen ? category.name : undefined}
              >
                {isSelected && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full" style={{ backgroundColor: 'var(--accent-color)' }}></div>
                )}
                <IconRenderer 
                  icon={category.icon} 
                  uiIcon={category.uiIcon}
                  size={20}
                  className={`text-xl flex-shrink-0 ${isSelected ? 'opacity-100' : 'opacity-100'}`} 
                />
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
            relative z-10 mt-4 mx-auto p-2 rounded-full text-stone-400 hover:bg-white/50 hover:text-stone-500 transition-all active:scale-95
            ${!isSidebarOpen ? 'bg-transparent' : 'self-end mr-4'}
          `}
        >
          {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Right Content - Activity Grid */}
      <div 
        className="flex-1 overflow-hidden flex flex-col p-5 md:p-10 rounded-tl-[2rem] shadow-[-5px_0_20px_rgba(0,0,0,0.08)] z-10 ml-[-10px] relative"
        id="record-content"
      >
        {/* 半透明白色遮罩层 - 透明度根据用户设置动态调整 */}
        <div 
          className={`absolute inset-0 -z-10 rounded-tl-[2rem] ${useReducedEffects ? '' : 'backdrop-blur-sm'}`}
          style={{
            backgroundColor: `rgba(255, 255, 255, ${panelOverlayOpacity})`
          }}
        />

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
              <div
                className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-sm"
                style={getActivityButtonStyle(activity)}
              >
                <IconRenderer 
                  icon={activity.icon} 
                  uiIcon={activity.uiIcon}
                  size={32}
                  className="text-3xl md:text-4xl" 
                />
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

