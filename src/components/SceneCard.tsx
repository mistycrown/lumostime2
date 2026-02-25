﻿﻿﻿﻿﻿﻿﻿/**
 * @file SceneCard.tsx
 * @description 场景卡片组件 - 支持正反面翻转和滑动交互
 */
import React, { useState, useRef } from 'react';
import { Check, ChevronRight, Clock, CheckSquare, ListTodo, BarChart3, BookOpen, Link2 } from 'lucide-react';
import { SceneCardData, DailyReview, Log } from '../types';
import { CardStatsBadge } from './CardStatsBadge';
import { AppLauncherService } from '../services/AppLauncherService';

// 莫兰迪色系默认颜色映射
const DEFAULT_COLORS = {
  timer: '#a8b5a0',      // 莫兰迪绿
  todo: '#9eadb8',       // 莫兰迪蓝
  checklist: '#d4b896',  // 莫兰迪琥珀
  navigation: '#a8c5d4', // 莫兰迪天蓝
  principle: '#b5b0a8',  // 莫兰迪石灰
  reference: '#c5a8b5',  // 莫兰迪紫
  stats: '#a8a8c5',      // 莫兰迪靛蓝
};

interface SceneCardProps {
  data: SceneCardData;
  dailyReviews?: DailyReview[];
  logs?: Log[]; // 用于计算计时和待办的时长统计
  onAction?: (action: SceneCardData['action'], autoEnterFocus?: boolean) => void;
}

export const SceneCard: React.FC<SceneCardProps> = ({ data, dailyReviews = [], logs = [], onAction }) => {
  // 获取卡片颜色（优先使用自定义颜色，否则使用默认颜色）
  const cardColor = data.color || DEFAULT_COLORS[data.type];
  
  // 处理原则卡片的内容（支持随机选取和从原则库选择）
  const [displayData, setDisplayData] = useState(data);
  
  React.useEffect(() => {
    if (data.type === 'principle') {
      if (data.principleSource === 'random') {
        // 随机选取模式：每天随机选择一个原则
        const stored = localStorage.getItem('lumostime_principles');
        if (stored) {
          const principles = JSON.parse(stored);
          if (principles.length > 0) {
            // 获取今天的日期
            const today = getTodayDateString();
            const cacheKey = `principle_random_${data.id}_${today}`;
            
            // 检查是否有今天的缓存
            const cachedPrincipleId = localStorage.getItem(cacheKey);
            let selectedPrinciple;
            
            if (cachedPrincipleId) {
              // 使用缓存的原则
              selectedPrinciple = principles.find((p: any) => p.id === cachedPrincipleId);
            }
            
            // 如果没有缓存或缓存的原则不存在，重新随机选择
            if (!selectedPrinciple) {
              const randomIndex = Math.floor(Math.random() * principles.length);
              selectedPrinciple = principles[randomIndex];
              // 保存到缓存
              localStorage.setItem(cacheKey, selectedPrinciple.id);
            }
            
            setDisplayData({
              ...data,
              title: selectedPrinciple.title,
              frontText: selectedPrinciple.frontText,
              backText: selectedPrinciple.backText
            });
            return;
          }
        }
      } else if (data.principleSource === 'library' && data.principleId) {
        // 从原则库选择模式：根据 principleId 获取原则内容
        const stored = localStorage.getItem('lumostime_principles');
        if (stored) {
          const principles = JSON.parse(stored);
          const principle = principles.find((p: any) => p.id === data.principleId);
          if (principle) {
            setDisplayData({
              ...data,
              title: principle.title,
              frontText: principle.frontText,
              backText: principle.backText
            });
            return;
          }
        }
      }
    }
    // 其他情况或手动输入模式，直接使用原始数据
    setDisplayData(data);
  }, [data]);
  
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

  // 最小滑动距离（像素）
  const minSwipeDistance = 80;
  const maxSwipeDistance = 150;

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
    
    // 只响应向右滑动（从左向右），但卡片向左移动
    if (diff > 0) {
      setIsSwiping(true);
      setSwipeOffset(-Math.min(diff, maxSwipeDistance)); // 负值，卡片向左移动
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

  const handleCardClick = async () => {
    if (!isFlipped) {
      // 正面点击 - 翻转到反面并执行动作
      setIsFlipped(true);
      saveFlipState(true);
      
      // 如果配置了应用跳转，先尝试启动应用
      if (data.action.launchApp && data.action.appPackageName) {
        const success = await AppLauncherService.launchApp(data.action.appPackageName);
        
        if (success) {
          console.log(`[SceneCard] 成功启动应用: ${data.action.appName}`);
        } else {
          console.warn(`[SceneCard] 启动应用失败: ${data.action.appName}`);
        }
      }
      
      if (data.action.type !== 'none') {
        // 对于导航卡片，延迟执行以显示翻转动画
        if (data.action.type === 'navigate') {
          setTimeout(() => {
            onAction?.(data.action, data.autoEnterFocus);
          }, 300);
        } else {
          onAction?.(data.action, data.autoEnterFocus);
        }
      }
    } else {
      // 反面点击 - 根据卡片类型决定是否响应
      switch (data.type) {
        case 'timer':
        case 'todo':
          // 如果配置了应用跳转，再次启动应用
          if (data.action.launchApp && data.action.appPackageName) {
            await AppLauncherService.launchApp(data.action.appPackageName);
          }
          
          if (data.action.type !== 'none') {
            onAction?.(data.action, data.autoEnterFocus);
          }
          break;
        
        case 'navigation':
          if (data.action.type === 'navigate') {
            onAction?.(data.action, data.autoEnterFocus);
          }
          break;
        
        case 'checklist':
        case 'principle':
        case 'stats':
          // 这些类型的卡片反面不响应点击
          break;
        
        case 'reference':
          // 引用卡片反面点击跳转到对应的日报
          if (data.action.type === 'reference') {
            onAction?.(data.action);
          }
          break;
      }
    }
  };

  return (
    <div
      ref={cardRef}
      className="relative select-none touch-pan-y"
    >
      {/* 滑动背景提示 - 只在反面显示，使用卡片颜色 */}
      {isFlipped && (
        <div
          className="absolute inset-0 flex items-center justify-end pr-6 text-white font-medium tracking-wide z-0 transition-opacity duration-200 rounded-2xl overflow-hidden"
          style={{ 
            backgroundColor: cardColor,
            opacity: swipeOffset < 0 ? 1 : 0 
          }}
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
          <CardFront data={data} displayData={displayData} cardColor={cardColor} />
        </div>

        {/* 反面 */}
        <div 
          ref={backRef}
          className="scene-card-face scene-card-back"
          onClick={handleCardClick}
        >
          <CardBack 
            data={data}
            displayData={displayData}
            cardColor={cardColor}
            dailyReviews={dailyReviews}
            logs={logs}
            isSwiping={isSwiping} 
            swipeProgress={swipeOffset / maxSwipeDistance}
            isClickable={data.type === 'timer' || data.type === 'todo' || data.type === 'navigation'}
          />
        </div>
      </div>
    </div>
  );
};

// 卡片正面组件
const CardFront: React.FC<{ data: SceneCardData; displayData: SceneCardData; cardColor: string }> = ({ data, displayData, cardColor }) => {
  // 根据卡片颜色获取边框颜色（30%透明度）
  const getBorderColor = () => {
    return `${cardColor}4D`; // 4D = 30% opacity in hex
  };

  // 根据卡片颜色获取图标
  const getFrontIcon = () => {
    const iconProps = { size: 14, style: { color: cardColor } };
    
    switch (data.type) {
      case 'timer':
        return <Clock {...iconProps} />;
      case 'todo':
        return <ListTodo {...iconProps} />;
      case 'checklist':
        return <CheckSquare {...iconProps} />;
      case 'navigation':
        return <ChevronRight {...iconProps} />;
      case 'principle':
        return <BookOpen {...iconProps} />;
      case 'reference':
        return <Link2 {...iconProps} />;
      case 'stats':
        return <BarChart3 {...iconProps} />;
      default:
        return <Check {...iconProps} />;
    }
  };

  return (
    <div 
      className="rounded-2xl p-4 bg-white/90 backdrop-blur-sm shadow-sm border relative"
      style={{ borderColor: getBorderColor() }}
    >
      {/* 右上角状态指示 */}
      <div className="absolute top-4 right-4">
        {/* 待办进度 */}
        {data.type === 'todo' && data.progress !== undefined && data.totalAmount && (
          <div className="text-sm text-stone-500 font-medium whitespace-nowrap">
            {data.progress}/{data.totalAmount}
          </div>
        )}
      </div>
      
      {/* 第一行：名称 */}
      <div className={data.type === 'stats' ? 'mb-2' : 'pr-12 mb-2'}>
        <h3 className="font-bold text-stone-800 text-base leading-tight break-words overflow-wrap-anywhere">
          {data.title}
        </h3>
      </div>
      
      {/* 统计卡片的进度条（如果启用了目标值） */}
      {data.type === 'stats' && data.enableGoal && data.goalValue && data.statMinutes !== undefined && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 mb-1">
            <span>{data.statMinutes}m / {data.goalValue}m</span>
            <span>{Math.min(100, Math.round((data.statMinutes / data.goalValue) * 100))}%</span>
          </div>
          <div 
            className="h-1 w-full rounded-full overflow-hidden relative" 
            style={{ backgroundColor: 'var(--progress-bar-bg)' }}
          >
            {data.goalType === 'max' ? (
              // 小于等于目标：从右向左的反向进度条，半透明
              <div
                className="h-full rounded-full transition-all duration-500 absolute right-0"
                style={{
                  backgroundColor: 'var(--progress-bar-fill)',
                  width: `${Math.min(100, (data.statMinutes / data.goalValue) * 100)}%`,
                  opacity: 0.6
                }}
              />
            ) : (
              // 大于等于目标：从左向右的正向进度条
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  backgroundColor: 'var(--progress-bar-fill)',
                  width: `${Math.min(100, (data.statMinutes / data.goalValue) * 100)}%`
                }}
              />
            )}
          </div>
        </div>
      )}
      
      {/* 第二行：正面文字（如果有） */}
      {displayData.frontText && (
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 flex items-center justify-center">
            {getFrontIcon()}
          </div>
          <p className="text-sm text-stone-600 break-words overflow-wrap-anywhere flex-1 leading-[1.4]">
            {displayData.frontText}
          </p>
          {/* 统计卡片：在文字右侧显示统计值 */}
          {data.type === 'stats' && data.statValue && (
            <p className="text-sm font-bold text-stone-800 whitespace-nowrap ml-2 self-end">{data.statValue}</p>
          )}
        </div>
      )}
      
      {/* 引用卡片：如果没有 frontText，显示引用的问题 */}
      {data.type === 'reference' && !displayData.frontText && (
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 flex items-center justify-center mt-0.5">
            {getFrontIcon()}
          </div>
          <p className="text-sm text-stone-600 break-words overflow-wrap-anywhere flex-1 leading-[1.4]">
            {data.referencedQuestion || data.action.fallbackText || '暂无引用内容'}
          </p>
        </div>
      )}
      
      {/* 统计卡片：如果没有正面文字，单独显示统计值 */}
      {data.type === 'stats' && data.statValue && !displayData.frontText && (
        <div className="flex justify-end">
          <p className="text-base font-bold text-stone-800 whitespace-nowrap">{data.statValue}</p>
        </div>
      )}
    </div>
  );
};

// 卡片反面组件
const CardBack: React.FC<{ 
  data: SceneCardData;
  displayData: SceneCardData;
  cardColor: string;
  dailyReviews?: DailyReview[];
  logs?: Log[];
  isSwiping?: boolean; 
  swipeProgress?: number;
  isClickable?: boolean;
}> = ({ data, displayData, cardColor, dailyReviews = [], logs = [], isSwiping, swipeProgress = 0, isClickable = false }) => {
  // 根据卡片颜色获取边框颜色（50%透明度，反面稍深）
  const getBorderColor = () => {
    return `${cardColor}80`; // 80 = 50% opacity in hex
  };

  // 根据卡片类型获取图标和背景色
  const getBackIcon = () => {
    const icon = data.type === 'navigation' 
      ? <ChevronRight size={14} className="text-white" />
      : <Check size={14} className="text-white" />;
    
    return { icon, bgColor: cardColor };
  };

  // 根据滑动进度获取动态提示文字
  const getSwipeHintText = () => {
    if (!isSwiping) return '';
    
    // swipeProgress 现在是负值，取绝对值
    const progress = Math.abs(swipeProgress);
    
    if (progress < 0.4) {
      return '继续滑动...';
    } else if (progress < 0.7) {
      return '快要成功了';
    } else {
      return '松手即可返回';
    }
  };

  const { icon, bgColor } = getBackIcon();

  return (
    <div 
      className="rounded-2xl p-4 bg-white/90 backdrop-blur-sm shadow-sm border transition-opacity relative"
      style={{ 
        borderColor: getBorderColor(),
        opacity: isSwiping ? Math.max(0.6, 1 - Math.abs(swipeProgress) * 0.5) : 1,
        cursor: isClickable ? 'pointer' : 'default'
      }}
    >
      {/* 右上角完成按钮、滑动提示或统计值 */}
      <div className="absolute top-4 right-4">
        {isSwiping ? (
          <p className="text-xs text-stone-400 whitespace-nowrap">{getSwipeHintText()}</p>
        ) : (
          <div 
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: bgColor }}
          >
            {icon}
          </div>
        )}
      </div>
      
      {/* 右下角：统计徽章（日课/计时/待办） */}
      {!isSwiping && (
        <div className="absolute bottom-4 right-4">
          {data.type === 'checklist' && data.checkItemContent && (
            <CardStatsBadge
              type="checklist"
              color={cardColor}
              checkItemContent={data.checkItemContent}
              dailyReviews={dailyReviews}
            />
          )}
          {data.type === 'timer' && data.action.activityId && data.action.categoryId && (
            <CardStatsBadge
              type="timer"
              color={cardColor}
              activityId={data.action.activityId}
              categoryId={data.action.categoryId}
              logs={logs}
            />
          )}
          {data.type === 'todo' && data.action.todoId && (
            <CardStatsBadge
              type="todo"
              color={cardColor}
              todoId={data.action.todoId}
              logs={logs}
            />
          )}
        </div>
      )}
      
      {/* 第一行：标题 */}
      <div className={data.type === 'stats' ? 'mb-2' : 'pr-12 mb-2'}>
        <h3 className="font-bold text-stone-800 text-base leading-tight break-words overflow-wrap-anywhere">
          {displayData.title}
        </h3>
      </div>
      
      {/* 统计卡片的进度条（如果启用了目标值） */}
      {data.type === 'stats' && data.enableGoal && data.goalValue && data.statMinutes !== undefined && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 mb-1">
            <span>{data.statMinutes}m / {data.goalValue}m</span>
            <span>{Math.min(100, Math.round((data.statMinutes / data.goalValue) * 100))}%</span>
          </div>
          <div 
            className="h-1 w-full rounded-full overflow-hidden relative" 
            style={{ backgroundColor: 'var(--progress-bar-bg)' }}
          >
            {data.goalType === 'max' ? (
              // 小于等于目标：从右向左的反向进度条，半透明
              <div
                className="h-full rounded-full transition-all duration-500 absolute right-0"
                style={{
                  backgroundColor: 'var(--progress-bar-fill)',
                  width: `${Math.min(100, (data.statMinutes / data.goalValue) * 100)}%`,
                  opacity: 0.6
                }}
              />
            ) : (
              // 大于等于目标：从左向右的正向进度条
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  backgroundColor: 'var(--progress-bar-fill)',
                  width: `${Math.min(100, (data.statMinutes / data.goalValue) * 100)}%`
                }}
              />
            )}
          </div>
        </div>
      )}
      
      {/* 第二行：反面文字（如果有） */}
      {displayData.backText && data.type !== 'reference' && (
        <div className="flex items-end gap-2">
          <p className="text-sm text-stone-600 break-words overflow-wrap-anywhere flex-1 leading-[1.4]">
            {displayData.backText}
          </p>
          {/* 统计卡片：在文字右侧显示统计值 */}
          {data.type === 'stats' && data.statValue && (
            <p className="text-sm font-bold text-stone-800 whitespace-nowrap">{data.statValue}</p>
          )}
        </div>
      )}
      
      {/* 引用卡片：显示引用的回答 */}
      {data.type === 'reference' && (
        <div className="flex items-start gap-2 pr-8">
          <p className="text-sm text-stone-700 break-words overflow-wrap-anywhere flex-1 leading-[1.4]">
            {data.referencedAnswer || data.action.fallbackText || '暂无回答内容'}
          </p>
        </div>
      )}
      
      {/* 统计卡片：如果没有反面文字，单独显示统计值 */}
      {data.type === 'stats' && data.statValue && !displayData.backText && (
        <div className="flex justify-end">
          <p className="text-sm font-bold text-stone-800 whitespace-nowrap">{data.statValue}</p>
        </div>
      )}
    </div>
  );
};
