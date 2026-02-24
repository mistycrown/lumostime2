/**
 * @file SceneView.tsx
 * @description 场景化时间段视图 - 卡片式布局，支持正反面翻转
 */
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { backgroundService } from '../services/backgroundService';
import { IconRenderer } from '../components/IconRenderer';
import { UIIcon } from '../components/UIIcon';
import { SceneCard } from '../components/SceneCard';
import { TimeSlot, SceneCardData } from '../types';
import { DEFAULT_SCENE_PRESETS } from '../constants/scenePresets';

interface SceneViewProps {
  onConfigureSlots?: () => void;
}

export const SceneView: React.FC<SceneViewProps> = ({ onConfigureSlots }) => {
  const [backgroundUrl, setBackgroundUrl] = useState<string>('');
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(0.1);
  
  // 时间段数据（从 localStorage 加载，如果没有则使用 mock 数据）
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  // 当前选中的时间段索引
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [isManualSelection, setIsManualSelection] = useState(false);

  // 加载时间段数据
  useEffect(() => {
    const saved = localStorage.getItem('sceneTimeSlots');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTimeSlots(parsed);
      } catch (e) {
        console.error('Failed to parse scene time slots:', e);
        setTimeSlots(DEFAULT_SCENE_PRESETS);
      }
    } else {
      setTimeSlots(DEFAULT_SCENE_PRESETS);
    }
  }, []);

  // 背景更新逻辑
  useEffect(() => {
    const updateBackground = () => {
      const bg = backgroundService.getCurrentBackgroundOption();
      const opacity = backgroundService.getBackgroundOpacity();
      setBackgroundUrl(bg?.url || '');
      setBackgroundOpacity(opacity);
    };
    updateBackground();
    const interval = setInterval(updateBackground, 500);
    return () => clearInterval(interval);
  }, []);

  // 获取当前时间对应的时间段索引
  const getCurrentTimeSlotIndex = (): number => {
    if (timeSlots.length === 0) return 0;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    for (let i = 0; i < timeSlots.length; i++) {
      const slot = timeSlots[i];
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      
      let startMinutes = startHour * 60 + startMin;
      let endMinutes = endHour * 60 + endMin;
      
      // 处理跨天情况（如深夜 22:00 - 06:00）
      if (endMinutes < startMinutes) {
        if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
          return i;
        }
      } else {
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
          return i;
        }
      }
    }
    
    return 0; // 默认返回第一个
  };

  // 自动切换到当前时间段（仅在非手动选择时）
  useEffect(() => {
    if (!isManualSelection && timeSlots.length > 0) {
      setSelectedSlotIndex(getCurrentTimeSlotIndex());
    }
  }, [isManualSelection, timeSlots]);

  // 重置手动选择状态（5分钟后）
  useEffect(() => {
    if (isManualSelection) {
      const timer = setTimeout(() => {
        setIsManualSelection(false);
      }, 5 * 60 * 1000); // 5分钟
      return () => clearTimeout(timer);
    }
  }, [isManualSelection]);

  const currentSlot = timeSlots[selectedSlotIndex];
  const currentCards = currentSlot?.cards || [];

  // 如果没有时间段数据，显示空状态
  if (timeSlots.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-[#faf9f6]">
        <div className="text-center">
          <p className="text-stone-400 mb-4">暂无场景配置</p>
          {onConfigureSlots && (
            <button
              onClick={onConfigureSlots}
              className="px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
            >
              前往配置
            </button>
          )}
        </div>
      </div>
    );
  }

  // 卡片动作处理
  const handleCardAction = (action: SceneCardData['action']) => {
    switch (action.type) {
      case 'startTimer':
        console.log('开始计时:', action.activityId, action.categoryId);
        // TODO: 实现实际的计时逻辑
        break;
      case 'startTodo':
        console.log('开始待办计时:', action.todoId);
        // TODO: 实现待办计时逻辑
        break;
      case 'toggleCheck':
        console.log('日课打卡:', action.checkItemId);
        // TODO: 实现日课打卡逻辑
        break;
      case 'navigate':
        console.log('跳转到:', action.targetView);
        // TODO: 实现页面跳转逻辑
        break;
    }
  };

  return (
    <div 
      className="flex h-full relative"
      style={{
        backgroundColor: backgroundUrl && backgroundUrl !== '' ? 'transparent' : '#faf9f6'
      }}
    >
      {/* 背景图片层 */}
      {backgroundUrl && backgroundUrl !== '' && (
        <div 
          className="absolute inset-0 -z-20"
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      )}
      
      {/* 全局半透明遮罩层 */}
      <div className="absolute inset-0 bg-[#faf9f6]/50 backdrop-blur-md -z-10"></div>

      {/* 左侧边栏 - 时间段列表 */}
      <div className="flex-shrink-0 flex flex-col overflow-y-auto pt-6 pb-20 pl-0 pr-2 no-scrollbar z-0 transition-all duration-300 relative w-16 items-center">
        <div className="flex-1 w-full">
          {timeSlots.map((slot, index) => {
            const isSelected = selectedSlotIndex === index;
            return (
              <button
                key={slot.id}
                onClick={() => {
                  setIsManualSelection(true);
                  setSelectedSlotIndex(index);
                }}
                className={`
                  flex items-center justify-center gap-2 mb-1 transition-all duration-200 text-left relative rounded-r-2xl group
                  w-12 h-12 md:w-14 md:h-14
                  ${isSelected
                    ? 'text-stone-900 font-bold bg-white shadow-[2px_2px_10px_rgba(0,0,0,0.02)] z-10'
                    : 'text-stone-600 hover:text-stone-800'
                  }
                `}
                title={slot.name}
              >
                {isSelected && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full" style={{ backgroundColor: 'var(--accent-color)' }}></div>
                )}
                {/* 使用 IconRenderer 统一处理图标渲染 */}
                <div className="flex-shrink-0">
                  <IconRenderer 
                    icon={slot.icon || '⏰'}
                    uiIcon={slot.uiIcon}
                    size={24}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 右侧主体内容 */}
      <div 
        className="flex-1 overflow-hidden flex flex-col p-5 md:p-10 rounded-tl-[2rem] shadow-[-5px_0_20px_rgba(0,0,0,0.08)] z-10 ml-[-10px] relative"
        id="scene-content"
      >
        {/* 主体部分的背景图片层 */}
        {backgroundUrl && backgroundUrl !== '' && (
          <div 
            className="absolute inset-0 -z-20 rounded-tl-[2rem]"
            style={{
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
        )}
        {/* 半透明白色遮罩层 */}
        <div 
          className="absolute inset-0 -z-10 backdrop-blur-sm rounded-tl-[2rem]"
          style={{
            backgroundColor: `rgba(255, 255, 255, ${1 - backgroundOpacity})`
          }}
        />

        {/* 头部：当前时间段标题或时间 */}
        <div className="mb-8 md:mb-10 flex items-center mt-2 md:mt-0">
          <h1 className="text-xl md:text-2xl font-mono font-light text-stone-600 tracking-tight">
            {currentSlot.displayTitle || `${currentSlot.startTime} - ${currentSlot.endTime}`}
          </h1>
          <div className="h-px flex-1 bg-stone-100 ml-4"></div>
        </div>

        {/* 活动卡片列表 - 单列布局 */}
        <div className="flex flex-col gap-3 overflow-y-auto pb-24 no-scrollbar">
          {currentCards.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-stone-400">
                <p className="mb-4">该时间段暂无卡片</p>
                {onConfigureSlots && (
                  <button
                    onClick={onConfigureSlots}
                    className="px-4 py-2 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors text-sm"
                  >
                    添加卡片
                  </button>
                )}
              </div>
            </div>
          ) : (
            currentCards.map((card) => (
              <SceneCard
                key={card.id}
                data={card}
                onAction={handleCardAction}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
