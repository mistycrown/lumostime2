/**
 * @file SceneCard.tsx
 * @description 场景卡片组件 - 支持正反面翻转和滑动交互
 */
import React, { useState, useRef } from 'react';
import { Check, ChevronRight, Clock, CheckSquare, FileText, ListTodo, BarChart3 } from 'lucide-react';
import { SceneCardData } from '../types';

interface SceneCardProps {
  data: SceneCardData;
  onAction?: (action: SceneCardData['action']) => void;
}

export const SceneCard: React.FC<SceneCardProps> = ({ data, onAction }) => {
  // 获取今天的日期字符串（YYYY-MM-DD）
  const getTodayDateString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  // 检查并重置每日状态
  const checkAndResetDailyState = () => {
    const lastResetDate = localStorage.getItem('scene_cards_last_reset_date');
    const today = getTodayDateString();
    
    if (lastResetDate !== today) {
      // 新的一天，清除所有卡片翻转状态
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.startsWith('scene_card_flipped_')) {
          localStorage.removeItem(key);
        }
      });
      // 更新最后重置日期
      localStorage.setItem('scene_cards_last_reset_date', today);
    }
  };

  // 从 localStorage 读取翻转状态
  const getStoredFlipState = (): boolean => {
    checkAndResetDailyState();
    const stored = localStorage.getItem(`scene_card_flipped_${data.id}`);
    if (stored !== null) {
      return stored === 'true';
    }
    // 对于日课卡片，如果已完成则初始状态为翻转
    return data.type === 'checklist' && !!data.isCompleted;
  };

  const [isFlipped, setIsFlipped] = useState(getStoredFlipState());
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);
  const cardRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  // 当 isCompleted 状态变化时，更新翻转状态
  React.useEffect(() => {
    if (data.type === 'checklist') {
      const newFlipState = !!data.isCompleted;
      setIsFlipped(newFlipState);
      // 同步到 localStorage
      localStorage.setItem(`scene_card_flipped_${data.id}`, String(newFlipState));
    }
  }, [data.isCompleted, data.type, data.id]);

  // 保存翻转状态到 localStorage
  const saveFlipState = (flipped: boolean) => {
    localStorage.setItem(`scene_card_flipped_${data.id}`, String(flipped));
  };

  // 动态测量并设置卡片高度 - 在切换动画完成后执行
  React.useEffect(() => {
    const updateHeight = () => {
      if (isFlipped && backRef.current) {
        setCardHeight(backRef.current.offsetHeight);
      } else if (!isFlipped && frontRef.current) {
        setCardHeight(frontRef.current.offsetHeight);
      }
    };

    // 等待切换动画完成（0.3s）后再调整高度
    const timer = setTimeout(updateHeight, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [isFlipped]);

  // 监听内容变化，实时更新高度
  React.useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (isFlipped && backRef.current) {
        setCardHeight(backRef.current.offsetHeight);
      } else if (!isFlipped && frontRef.current) {
        setCardHeight(frontRef.current.offsetHeight);
      }
    });
    
    if (frontRef.current) observer.observe(frontRef.current);
    if (backRef.current) observer.observe(backRef.current);

    return () => {
      observer.disconnect();
    };
  }, [isFlipped]);

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
      saveFlipState(false);
      
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
      saveFlipState(true);
      
      // 执行动作（除了 'none' 类型）
      if (data.action.type !== 'none') {
        // 对于导航卡片，延迟执行以显示翻转动画
        if (data.action.type === 'navigate') {
          setTimeout(() => {
            onAction?.(data.action);
          }, 300);
        } else {
          onAction?.(data.action);
        }
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
      className="relative select-none touch-pan-y"
      style={{ height: cardHeight }}
    >
      {/* 滑动背景提示 - 只在反面显示，使用卡片类型对应的颜色 */}
      {isFlipped && (
        <div
          className={`absolute inset-0 ${getSwipeBackgroundColor()} flex items-center justify-end pr-6 text-white font-medium tracking-wide z-0 transition-opacity duration-200 rounded-2xl overflow-hidden`}
          style={{ opacity: swipeOffset > 0 ? 1 : 0 }}
        >
          <span className="flex items-center gap-2">
            往右滑动返回 <ChevronRight size={20} />
          </span>
        </div>
      )}

      <div 
        className={`scene-card ${isFlipped ? 'flipped' : ''} overflow-hidden rounded-2xl`}
        style={isSwiping && isFlipped ? {
          transform: `translateX(${swipeOffset}px)`,
          transition: 'none'
        } : undefined}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 正面 */}
        <div 
          ref={frontRef}
          className="scene-card-face scene-card-front"
          onClick={handleCardClick}
        >
          <CardFront data={data} />
        </div>

        {/* 反面 */}
        <div 
          ref={backRef}
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

  // 根据卡片类型获取图标
  const getFrontIcon = () => {
    switch (data.type) {
      case 'timer':
        return <Clock size={14} className="text-green-500" />;
      case 'todo':
        return <ListTodo size={14} className="text-blue-500" />;
      case 'checklist':
        return <CheckSquare size={14} className="text-amber-500" />;
      case 'navigation':
        return <ChevronRight size={14} className="text-sky-500" />;
      case 'text':
        return <FileText size={14} className="text-stone-500" />;
      case 'stats':
        return <BarChart3 size={14} className="text-indigo-500" />;
      default:
        return <Check size={14} className="text-stone-500" />;
    }
  };

  return (
    <div className={`rounded-2xl p-4 ${getCardColor()} relative`}>
      {/* 右上角状态指示 */}
      <div className="absolute top-4 right-4">
        {/* 待办进度 */}
        {data.type === 'todo' && data.progress !== undefined && data.totalAmount && (
          <div className="text-sm text-stone-500 font-medium whitespace-nowrap">
            {data.progress}/{data.totalAmount}
          </div>
        )}
        
        {/* 统计值 */}
        {data.type === 'stats' && data.statValue && (
          <p className="text-base font-bold text-stone-800 whitespace-nowrap">{data.statValue}</p>
        )}
      </div>
      
      {/* 第一行：名称 */}
      <div className="pr-12 mb-2">
        <h3 className="font-bold text-stone-800 text-base leading-tight break-words overflow-wrap-anywhere">
          {data.title}
        </h3>
      </div>
      
      {/* 第二行：正面文字（如果有） */}
      {data.frontText && (
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 flex items-center justify-center">
            {getFrontIcon()}
          </div>
          <p className="text-sm text-stone-600 break-words overflow-wrap-anywhere flex-1 leading-[1.4]">
            {data.frontText}
          </p>
        </div>
      )}
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

  // 根据卡片类型获取图标和颜色
  const getBackIcon = () => {
    switch (data.type) {
      case 'timer':
        return { icon: <Check size={14} className="text-white" />, bgColor: 'bg-green-500' };
      case 'todo':
        return { icon: <Check size={14} className="text-white" />, bgColor: 'bg-blue-500' };
      case 'checklist':
        return { icon: <Check size={14} className="text-white" />, bgColor: 'bg-amber-500' };
      case 'navigation':
        return { icon: <ChevronRight size={14} className="text-white" />, bgColor: 'bg-sky-500' };
      case 'text':
        return { icon: <Check size={14} className="text-white" />, bgColor: 'bg-stone-500' };
      case 'stats':
        return { icon: <Check size={14} className="text-white" />, bgColor: 'bg-indigo-500' };
      default:
        return { icon: <Check size={14} className="text-white" />, bgColor: 'bg-stone-500' };
    }
  };

  // 根据滑动进度获取动态提示文字
  const getSwipeHintText = () => {
    if (!isSwiping) return '';
    
    if (swipeProgress < 0.4) {
      return '继续滑动...';
    } else if (swipeProgress < 0.7) {
      return '快要成功了';
    } else {
      return '松手即可返回';
    }
  };

  const { icon, bgColor } = getBackIcon();

  return (
    <div 
      className={`rounded-2xl p-4 ${getBackgroundColor()} transition-opacity relative`}
      style={{ opacity: isSwiping ? Math.max(0.6, 1 - swipeProgress * 0.5) : 1 }}
    >
      {/* 右上角完成按钮、滑动提示或统计值 */}
      <div className="absolute top-4 right-4">
        {isSwiping ? (
          <p className="text-xs text-stone-400 whitespace-nowrap">{getSwipeHintText()}</p>
        ) : data.type === 'stats' && data.statValue ? (
          // 统计卡片显示统计值而不是对勾
          <p className="text-base font-bold text-stone-800 whitespace-nowrap">{data.statValue}</p>
        ) : (
          <div className={`w-5 h-5 rounded-full ${bgColor} flex items-center justify-center`}>
            {icon}
          </div>
        )}
      </div>
      
      {/* 反面文字 - 不显示左侧图标 */}
      <div className="pr-12">
        {data.backText && (
          <p className="text-sm text-stone-600 break-words overflow-wrap-anywhere">
            {data.backText}
          </p>
        )}
      </div>
    </div>
  );
};
