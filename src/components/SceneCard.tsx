/**
 * @file SceneCard.tsx
 * @description 场景卡片组件 - 支持正反面翻转和滑动交互
 */
import React, { useState, useRef } from 'react';
import { IconRenderer } from './IconRenderer';
import { Check, ChevronRight } from 'lucide-react';
import { SceneCardData } from '../types';

interface SceneCardProps {
  data: SceneCardData;
  onAction?: (action: SceneCardData['action']) => void;
}

export const SceneCard: React.FC<SceneCardProps> = ({ data, onAction }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 最小滑动距离（像素）
  const minSwipeDistance = 80;
  const maxSwipeDistance = 150; // 限制最大拖动距离

  const handleTouchStart = (e: React.TouchEvent) => {
    // 只在反面时才响应触摸
    if (!isFlipped) return;
    
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !isFlipped) return;
    
    const currentTouch = e.targetTouches[0].clientX;
    const diff = currentTouch - touchStart;
    
    // 只响应向右滑动（从左向右）
    if (diff > 0) {
      setIsSwiping(true);
      setSwipeOffset(Math.min(diff, maxSwipeDistance)); // 限制最大偏移
      setTouchEnd(currentTouch);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || !isFlipped) {
      setSwipeOffset(0);
      setIsSwiping(false);
      return;
    }
    
    const swipeDistance = touchEnd ? touchEnd - touchStart : 0;
    
    // 判断是否达到翻转阈值
    if (swipeDistance > minSwipeDistance) {
      // 翻转回正面
      setIsFlipped(false);
      
      // 如果是日课卡片，右滑表示取消完成
      if (data.type === 'checklist' && data.action.type === 'toggleCheck') {
        onAction?.({ ...data.action, checkItemId: data.action.checkItemId });
      }
    }
    
    // 重置状态
    setSwipeOffset(0);
    setIsSwiping(false);
    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleCardClick = () => {
    if (!isFlipped) {
      // 正面点击 - 翻转到反面并执行动作
      setIsFlipped(true);
      
      if (data.action.type !== 'none') {
        onAction?.(data.action);
      }
    } else {
      // 反面点击 - 根据卡片类型决定是否响应
      if (data.type === 'timer' || data.type === 'todo') {
        // 计时卡片和待办卡片的反面可以点击（停止计时）
        // TODO: 实现停止计时逻辑
      }
      // 其他类型的卡片反面不响应点击
    }
  };

  // 根据卡片类型获取滑动背景颜色
  const getSwipeBackgroundColor = () => {
    switch (data.type) {
      case 'timer':
        return 'bg-green-500';
      case 'todo':
        return 'bg-blue-500';
      case 'checklist':
        return 'bg-amber-500';
      case 'navigation':
        return 'bg-sky-500';
      case 'text':
        return 'bg-stone-400';
      case 'stats':
        return 'bg-indigo-500';
      default:
        return 'bg-stone-400';
    }
  };

  return (
    <div
      ref={cardRef}
      className="relative overflow-hidden select-none touch-pan-y"
    >
      {/* 滑动背景提示 - 只在反面显示，使用卡片类型对应的颜色 */}
      {isFlipped && (
        <div
          className={`absolute inset-0 ${getSwipeBackgroundColor()} flex items-center justify-end pr-6 text-white font-medium tracking-wide z-0 transition-opacity duration-200 rounded-2xl`}
          style={{ opacity: swipeOffset > 0 ? 1 : 0 }}
        >
          <span className="flex items-center gap-2">
            往右滑动返回 <ChevronRight size={20} />
          </span>
        </div>
      )}

      <div 
        className={`scene-card ${isFlipped ? 'flipped' : ''}`}
        style={{
          transform: isSwiping && isFlipped 
            ? `rotateY(180deg) translateX(${swipeOffset}px)` 
            : undefined,
          transition: isSwiping ? 'none' : undefined
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 正面 */}
        <div 
          className="scene-card-face scene-card-front"
          onClick={handleCardClick}
        >
          <CardFront data={data} />
        </div>

        {/* 反面 */}
        <div 
          className="scene-card-face scene-card-back"
          onClick={handleCardClick}
        >
          <CardBack data={data} isSwiping={isSwiping} swipeProgress={swipeOffset / maxSwipeDistance} />
        </div>
      </div>
    </div>
  );
};

// 卡片正面组件
const CardFront: React.FC<{ data: SceneCardData }> = ({ data }) => {
  // 根据卡片类型获取颜色
  const getCardColor = () => {
    switch (data.type) {
      case 'timer':
        return 'bg-white/90 backdrop-blur-sm shadow-sm border border-green-100';
      case 'todo':
        return 'bg-white/90 backdrop-blur-sm shadow-sm border border-blue-100';
      case 'checklist':
        return 'bg-white/90 backdrop-blur-sm shadow-sm border border-amber-100';
      case 'navigation':
        return 'bg-white/90 backdrop-blur-sm shadow-sm border border-sky-100';
      case 'text':
        return 'bg-white/90 backdrop-blur-sm shadow-sm border border-stone-100';
      case 'stats':
        return 'bg-white/90 backdrop-blur-sm shadow-sm border border-indigo-100';
      default:
        return 'bg-white/90 backdrop-blur-sm shadow-sm border border-stone-100';
    }
  };

  return (
    <div className={`h-full rounded-2xl p-4 flex items-center gap-3 ${getCardColor()}`}>
      {/* 左侧：标题 */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-stone-800 text-base leading-tight truncate">{data.title}</h3>
      </div>
      
      {/* 右侧：状态指示 */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* 待办进度 */}
        {data.type === 'todo' && data.progress !== undefined && data.totalAmount && (
          <div className="text-sm text-stone-500 font-medium">
            {data.progress}/{data.totalAmount}
          </div>
        )}
        
        {/* 统计值 */}
        {data.type === 'stats' && data.statValue && (
          <div className="text-right">
            <p className="text-base font-bold text-stone-800">{data.statValue}</p>
          </div>
        )}
        
        {/* 日课打卡的圆圈 */}
        {data.type === 'checklist' && (
          <div className="w-5 h-5 rounded-full border-2 border-amber-400"></div>
        )}
        
        {/* 正面文字（如果有） */}
        {data.frontText && (
          <div className="text-sm text-stone-500">
            {data.frontText}
          </div>
        )}
      </div>
    </div>
  );
};

// 卡片反面组件
const CardBack: React.FC<{ data: SceneCardData; isSwiping?: boolean; swipeProgress?: number }> = ({ data, isSwiping, swipeProgress = 0 }) => {
  const getBackgroundColor = () => {
    switch (data.type) {
      case 'timer':
        return 'bg-white/90 backdrop-blur-sm shadow-sm border border-green-200';
      case 'todo':
        return 'bg-white/90 backdrop-blur-sm shadow-sm border border-blue-200';
      case 'checklist':
        return 'bg-white/90 backdrop-blur-sm shadow-sm border border-amber-200';
      case 'text':
        return 'bg-white/90 backdrop-blur-sm shadow-sm border border-stone-100';
      case 'navigation':
        return 'bg-white/90 backdrop-blur-sm shadow-sm border border-sky-200';
      case 'stats':
        return 'bg-white/90 backdrop-blur-sm shadow-sm border border-indigo-200';
      default:
        return 'bg-white/90 backdrop-blur-sm shadow-sm border border-stone-100';
    }
  };

  // 根据卡片类型获取默认反面文字（如果用户未自定义）
  const getDefaultBackText = () => {
    if (data.backText) return data.backText;
    
    // 如果没有自定义反面文字，返回空字符串
    return '';
  };

  // 根据滑动进度获取动态提示文字
  const getSwipeHintText = () => {
    if (!isSwiping) return ''; // 不滑动时不显示提示
    
    if (swipeProgress < 0.4) {
      return '继续滑动...';
    } else if (swipeProgress < 0.7) {
      return '快要成功了';
    } else {
      return '松手即可返回';
    }
  };

  return (
    <div 
      className={`h-full rounded-2xl p-4 flex items-center gap-3 ${getBackgroundColor()} transition-opacity`}
      style={{ opacity: isSwiping ? Math.max(0.6, 1 - swipeProgress * 0.5) : 1 }}
    >
      {/* 计时卡片和待办卡片 - 显示反面文字 */}
      {(data.type === 'timer' || data.type === 'todo') && (
        <>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <Check className="text-white" size={14} />
            </div>
            <h3 className="font-bold text-stone-800 text-base leading-tight truncate">{data.title}</h3>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* 滑动时显示滑动提示，否则显示反面文字 */}
            {isSwiping ? (
              <p className="text-xs text-stone-400">{getSwipeHintText()}</p>
            ) : (
              data.backText && <p className="text-sm text-stone-600">{data.backText}</p>
            )}
          </div>
        </>
      )}
      
      {/* 日课已完成 - 显示反面文字 */}
      {data.type === 'checklist' && (
        <>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
              <Check className="text-white" size={14} />
            </div>
            <h3 className="font-bold text-stone-800 text-base leading-tight truncate">{data.title}</h3>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* 滑动时显示滑动提示，否则显示反面文字 */}
            {isSwiping ? (
              <p className="text-xs text-stone-400">{getSwipeHintText()}</p>
            ) : (
              data.backText && <p className="text-sm text-stone-600">{data.backText}</p>
            )}
          </div>
        </>
      )}
      
      {/* 文字内容 */}
      {data.type === 'text' && data.content && (
        <>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-stone-800 text-base leading-tight mb-1 truncate">{data.title}</h3>
            <p className="text-sm text-stone-600 line-clamp-2">{data.content}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {isSwiping && <p className="text-xs text-stone-400">{getSwipeHintText()}</p>}
          </div>
        </>
      )}
      
      {/* 跳转提示 */}
      {data.type === 'navigation' && (
        <>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ChevronRight className="text-sky-500 flex-shrink-0" size={18} />
            <h3 className="font-bold text-stone-800 text-base leading-tight truncate">{data.title}</h3>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {isSwiping ? (
              <p className="text-xs text-stone-400">{getSwipeHintText()}</p>
            ) : (
              data.backText && <p className="text-sm text-stone-600">{data.backText}</p>
            )}
          </div>
        </>
      )}
      
      {/* 统计详情 */}
      {data.type === 'stats' && (
        <>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-stone-800 text-base leading-tight mb-1 truncate">{data.title}</h3>
            <p className="text-xs text-stone-500">{data.statLabel}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <p className="text-base font-bold text-stone-800">{data.statValue}</p>
            {isSwiping && <p className="text-xs text-stone-400">{getSwipeHintText()}</p>}
          </div>
        </>
      )}
    </div>
  );
};
