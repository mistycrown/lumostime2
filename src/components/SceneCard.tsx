/**
 * @file SceneCard.tsx
 * @description 场景卡片组件 - 支持正反面翻转和滑动交互
 */
import React, { useState, useRef } from 'react';
import { IconRenderer } from './IconRenderer';
import { Clock, Check, ChevronRight } from 'lucide-react';
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
  const swipeThreshold = 0.3; // 滑动超过卡片宽度的30%就触发

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
      setSwipeOffset(Math.min(diff, 200)); // 限制最大偏移
      setTouchEnd(currentTouch);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || !isFlipped) {
      setSwipeOffset(0);
      setIsSwiping(false);
      return;
    }
    
    const cardWidth = cardRef.current?.offsetWidth || 300;
    const swipeDistance = touchEnd ? touchEnd - touchStart : 0;
    const swipePercentage = swipeDistance / cardWidth;
    
    // 判断是否达到翻转阈值
    if (swipeDistance > minSwipeDistance || swipePercentage > swipeThreshold) {
      // 翻转回正面
      setIsFlipped(false);
      
      // 如果是日课卡片，左滑表示取消完成
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

  return (
    <div
      ref={cardRef}
      className="scene-card-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className={`scene-card ${isFlipped ? 'flipped' : ''}`}
        style={{
          transform: isSwiping && isFlipped 
            ? `rotateY(180deg) translateX(${swipeOffset}px)` 
            : undefined,
          transition: isSwiping ? 'none' : undefined
        }}
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
          <CardBack data={data} isSwiping={isSwiping} swipeProgress={swipeOffset / 200} />
        </div>
      </div>
      
      {/* 滑动提示指示器 */}
      {isFlipped && !isSwiping && (
        <div className="absolute top-1/2 left-2 -translate-y-1/2 pointer-events-none z-10 opacity-30">
          <div className="flex items-center gap-1 text-stone-400">
            <ChevronRight size={16} className="animate-pulse" />
            <ChevronRight size={16} className="animate-pulse" style={{ animationDelay: '0.2s' }} />
          </div>
        </div>
      )}
    </div>
  );
};

// 卡片正面组件
const CardFront: React.FC<{ data: SceneCardData }> = ({ data }) => {
  // 根据卡片类型获取默认正面文字（如果用户未自定义）
  const getDefaultFrontText = () => {
    if (data.frontText) return data.frontText;
    
    switch (data.type) {
      case 'timer':
        return '点击开始计时';
      case 'todo':
        return '开始这个任务吧';
      case 'checklist':
        return '完成今日打卡';
      case 'navigation':
        return '查看更多内容';
      case 'text':
        return '点击查看详情';
      case 'stats':
        return '查看详细数据';
      default:
        return '点击开始';
    }
  };

  // 根据卡片类型获取颜色
  const getCardColor = () => {
    switch (data.type) {
      case 'timer':
        return 'bg-green-50 border-2 border-green-200';
      case 'todo':
        return 'bg-blue-50 border-2 border-blue-200';
      case 'checklist':
        return 'bg-amber-50 border-2 border-amber-200';
      case 'navigation':
        return 'bg-sky-50 border-2 border-sky-200';
      case 'text':
        return 'bg-stone-50 border-2 border-stone-200';
      case 'stats':
        return 'bg-indigo-50 border-2 border-indigo-200';
      default:
        return 'bg-white border-2 border-stone-200';
    }
  };

  return (
    <div className={`h-full rounded-2xl p-4 flex flex-col ${getCardColor()}`}>
      {/* 顶部：图标和标题 */}
      <div className="flex items-start gap-2.5 mb-auto">
        {data.icon && (
          <div className="text-base flex-shrink-0 mt-0.5">
            <IconRenderer icon={data.icon} uiIcon={data.uiIcon} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-stone-800 text-base leading-tight">{data.title}</h3>
          
          {/* 待办进度 */}
          {data.type === 'todo' && data.progress !== undefined && data.totalAmount && (
            <div className="mt-2">
              <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${Math.min(100, (data.progress / data.totalAmount) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-stone-500 mt-1">
                已完成 {data.progress} / {data.totalAmount}
              </p>
            </div>
          )}
          
          {/* 统计值 */}
          {data.type === 'stats' && data.statValue && (
            <div className="mt-2">
              <p className="text-2xl font-bold text-stone-800">{data.statValue}</p>
              <p className="text-xs text-stone-500">{data.statLabel}</p>
            </div>
          )}
        </div>
        
        {/* 日课打卡的圆圈 */}
        {data.type === 'checklist' && (
          <div className="w-5 h-5 rounded-full border-2 border-amber-400 flex-shrink-0"></div>
        )}
      </div>
      
      {/* 底部：操作文字 */}
      <div className="mt-3 pt-3 border-t border-current opacity-20">
        <p className="text-xs text-stone-600 font-medium">{getDefaultFrontText()}</p>
      </div>
    </div>
  );
};

// 卡片反面组件
const CardBack: React.FC<{ data: SceneCardData; isSwiping?: boolean; swipeProgress?: number }> = ({ data, isSwiping, swipeProgress = 0 }) => {
  const getBackgroundColor = () => {
    switch (data.type) {
      case 'timer':
        return 'bg-green-50 border-2 border-green-300';
      case 'todo':
        return 'bg-blue-50 border-2 border-blue-300';
      case 'checklist':
        return 'bg-amber-50 border-2 border-amber-300';
      case 'text':
        return 'bg-stone-50 border-2 border-stone-200';
      case 'navigation':
        return 'bg-sky-50 border-2 border-sky-300';
      case 'stats':
        return 'bg-indigo-50 border-2 border-indigo-300';
      default:
        return 'bg-white border-2 border-stone-200';
    }
  };

  // 根据卡片类型获取默认反面文字（如果用户未自定义）
  const getDefaultBackText = () => {
    if (data.backText) return data.backText;
    
    switch (data.type) {
      case 'timer':
        return '正在专注中，加油！';
      case 'todo':
        return '任务进行中，继续努力';
      case 'checklist':
        return '太棒了，今天又完成一项！';
      case 'text':
        return '';
      case 'stats':
        return '';
      default:
        return '进行中';
    }
  };

  // 根据滑动进度获取动态提示文字
  const getSwipeHintText = () => {
    if (!isSwiping) return getDefaultBackText();
    
    if (swipeProgress < 0.3) {
      return '→ 继续滑动返回';
    } else if (swipeProgress < 0.6) {
      return '→→ 快要成功了';
    } else {
      return '→→→ 松手即可返回';
    }
  };

  return (
    <div 
      className={`h-full rounded-2xl p-4 flex flex-col ${getBackgroundColor()} transition-opacity`}
      style={{ opacity: isSwiping ? Math.max(0.5, 1 - swipeProgress) : 1 }}
    >
      {/* 计时中状态 */}
      {(data.type === 'timer' || data.type === 'todo') && (
        <>
          <div className="flex items-start gap-2.5 mb-auto">
            <div className="text-base flex-shrink-0 mt-0.5">
              <Clock className="text-green-600" size={16} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-stone-800 text-base leading-tight">{data.title}</h3>
              <p className="text-sm text-stone-600 mt-1.5">00:00:00</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-current opacity-20">
            <p className="text-xs text-stone-600 font-medium">{getSwipeHintText()}</p>
          </div>
        </>
      )}
      
      {/* 日课已完成 */}
      {data.type === 'checklist' && (
        <>
          <div className="flex items-start gap-2.5 mb-auto">
            <div className="text-base flex-shrink-0 mt-0.5">
              <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                <Check className="text-white" size={12} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-stone-800 text-base leading-tight">{data.title}</h3>
              <p className="text-sm text-stone-600 mt-1.5">
                {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-current opacity-20">
            <p className="text-xs text-stone-600 font-medium">{getSwipeHintText()}</p>
          </div>
        </>
      )}
      
      {/* 文字内容 */}
      {data.type === 'text' && data.content && (
        <>
          <div className="flex items-start gap-2.5 mb-auto">
            {data.icon && (
              <div className="text-base flex-shrink-0 mt-0.5">
                <IconRenderer icon={data.icon} uiIcon={data.uiIcon} />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-bold text-stone-800 text-base leading-tight mb-2">{data.title}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{data.content}</p>
            </div>
          </div>
          {getDefaultBackText() && (
            <div className="mt-3 pt-3 border-t border-current opacity-20">
              <p className="text-xs text-stone-600 font-medium">{getSwipeHintText()}</p>
            </div>
          )}
        </>
      )}
      
      {/* 跳转提示 */}
      {data.type === 'navigation' && (
        <>
          <div className="flex items-start gap-2.5 mb-auto">
            <div className="text-base flex-shrink-0 mt-0.5">
              <ChevronRight className="text-stone-400" size={16} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-stone-800 text-base leading-tight">{data.title}</h3>
              <p className="text-sm text-stone-600 mt-1.5">正在为你打开...</p>
            </div>
          </div>
        </>
      )}
      
      {/* 统计详情 */}
      {data.type === 'stats' && (
        <>
          <div className="flex items-start gap-2.5 mb-auto">
            {data.icon && (
              <div className="text-base flex-shrink-0 mt-0.5">
                <IconRenderer icon={data.icon} uiIcon={data.uiIcon} />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-bold text-stone-800 text-base leading-tight mb-2">{data.title}</h3>
              <p className="text-2xl font-bold text-stone-800">{data.statValue}</p>
              <p className="text-xs text-stone-500 mt-1">{data.statLabel}</p>
            </div>
          </div>
          {getDefaultBackText() && (
            <div className="mt-3 pt-3 border-t border-current opacity-20">
              <p className="text-xs text-stone-600 font-medium">{getSwipeHintText()}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
