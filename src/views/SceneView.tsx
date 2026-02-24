/**
 * @file SceneView.tsx
 * @description 场景化时间段视图 - 卡片式布局，支持正反面翻转
 */
import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { backgroundService } from '../services/backgroundService';
import { IconRenderer } from '../components/IconRenderer';
import { SceneCard } from '../components/SceneCard';
import { TimeSlot, SceneCardData } from '../types';

// Mock 时间段数据
const MOCK_TIME_SLOTS: TimeSlot[] = [
  {
    id: 'morning',
    name: '早晨',
    icon: '🌅',
    startTime: '06:00',
    endTime: '09:00',
    cards: [
      { 
        id: '1', 
        type: 'checklist', 
        title: '早起打卡', 
        icon: '☀️',
        frontText: '新的一天，从早起开始',
        backText: '太棒了，今天又完成一项！',
        action: { type: 'toggleCheck', checkItemId: 'check-1' }
      },
      { 
        id: '2', 
        type: 'timer', 
        title: '洗漱', 
        icon: '🚿',
        frontText: '点击开始计时',
        backText: '正在进行中...',
        action: { type: 'startTimer', activityId: 'hygiene', categoryId: 'life' }
      },
      { 
        id: '3', 
        type: 'timer', 
        title: '享用早餐', 
        icon: '🍱',
        action: { type: 'startTimer', activityId: 'meal', categoryId: 'life' }
      },
      { 
        id: '4', 
        type: 'text', 
        title: '今日提醒', 
        icon: '📝',
        content: '记得今天下午3点有组会，提前准备好汇报材料。晚上和朋友约了晚饭，不要忘记哦！',
        action: { type: 'none' }
      },
    ]
  },
  {
    id: 'forenoon',
    name: '上午',
    icon: '☀️',
    startTime: '09:00',
    endTime: '12:00',
    cards: [
      { 
        id: '5', 
        type: 'timer', 
        title: '上课/开会', 
        icon: '🏫',
        frontText: '开始专注学习',
        action: { type: 'startTimer', activityId: 'meeting', categoryId: 'study' }
      },
      { 
        id: '6', 
        type: 'timer', 
        title: '阅读文献', 
        icon: '📖',
        action: { type: 'startTimer', activityId: 'reading', categoryId: 'study' }
      },
      { 
        id: '7', 
        type: 'todo', 
        title: '完成论文第三章', 
        icon: '📝',
        progress: 3,
        totalAmount: 10,
        action: { type: 'startTodo', todoId: 'todo-1' }
      },
      { 
        id: '8', 
        type: 'stats', 
        title: '今日专注时长', 
        icon: '⏱️',
        statValue: '2h 30m',
        statLabel: '目标: 6小时',
        action: { type: 'none' }
      },
    ]
  },
  {
    id: 'noon',
    name: '中午',
    icon: '🌤️',
    startTime: '12:00',
    endTime: '14:00',
    cards: [
      { 
        id: '9', 
        type: 'timer', 
        title: '午餐时间', 
        icon: '🍱',
        action: { type: 'startTimer', activityId: 'meal', categoryId: 'life' }
      },
      { 
        id: '10', 
        type: 'timer', 
        title: '午间小憩', 
        icon: '🔋',
        frontText: '休息一下，充充电',
        action: { type: 'startTimer', activityId: 'nap', categoryId: 'sleep' }
      },
      { 
        id: '11', 
        type: 'checklist', 
        title: '午后散步', 
        icon: '🚶',
        action: { type: 'toggleCheck', checkItemId: 'check-2' }
      },
    ]
  },
  {
    id: 'afternoon',
    name: '下午',
    icon: '🌞',
    startTime: '14:00',
    endTime: '18:00',
    cards: [
      { 
        id: '12', 
        type: 'timer', 
        title: '论文写作', 
        icon: '✒️',
        frontText: '开始创作吧',
        backText: '写作中，思绪飞扬',
        action: { type: 'startTimer', activityId: 'writing', categoryId: 'study' }
      },
      { 
        id: '13', 
        type: 'timer', 
        title: '代码编程', 
        icon: '👾',
        action: { type: 'startTimer', activityId: 'coding', categoryId: 'study' }
      },
      { 
        id: '14', 
        type: 'todo', 
        title: '修复Bug #234', 
        icon: '🐛',
        progress: 0,
        totalAmount: 1,
        action: { type: 'startTodo', todoId: 'todo-2' }
      },
      { 
        id: '15', 
        type: 'navigation', 
        title: '查看时间轴', 
        icon: '📊',
        action: { type: 'navigate', targetView: 'timeline' }
      },
    ]
  },
  {
    id: 'evening',
    name: '晚上',
    icon: '🌆',
    startTime: '18:00',
    endTime: '22:00',
    cards: [
      { 
        id: '16', 
        type: 'timer', 
        title: '晚餐时光', 
        icon: '🍱',
        action: { type: 'startTimer', activityId: 'meal', categoryId: 'life' }
      },
      { 
        id: '17', 
        type: 'timer', 
        title: '运动健身', 
        icon: '🏃',
        frontText: '动起来，保持活力',
        action: { type: 'startTimer', activityId: 'workout', categoryId: 'self' }
      },
      { 
        id: '18', 
        type: 'checklist', 
        title: '晚间阅读', 
        icon: '📚',
        action: { type: 'toggleCheck', checkItemId: 'check-3' }
      },
      { 
        id: '19', 
        type: 'navigation', 
        title: '今日回顾', 
        icon: '📝',
        frontText: '回顾今天的收获',
        action: { type: 'navigate', targetView: 'daily-review' }
      },
    ]
  },
  {
    id: 'night',
    name: '深夜',
    icon: '🌙',
    startTime: '22:00',
    endTime: '06:00',
    cards: [
      { 
        id: '20', 
        type: 'timer', 
        title: '睡前洗漱', 
        icon: '🚿',
        action: { type: 'startTimer', activityId: 'hygiene', categoryId: 'life' }
      },
      { 
        id: '21', 
        type: 'text', 
        title: '明日计划', 
        icon: '📅',
        content: '明天上午9点开组会，记得提前准备PPT。下午完成实验报告，晚上整理本周笔记。',
        action: { type: 'none' }
      },
      { 
        id: '22', 
        type: 'checklist', 
        title: '睡前冥想', 
        icon: '🧘',
        action: { type: 'toggleCheck', checkItemId: 'check-4' }
      },
      { 
        id: '23', 
        type: 'stats', 
        title: '今日总结', 
        icon: '📊',
        statValue: '8h 45m',
        statLabel: '有效专注时长',
        action: { type: 'none' }
      },
    ]
  }
];

interface SceneViewProps {
  onConfigureSlots?: () => void;
}

export const SceneView: React.FC<SceneViewProps> = ({ onConfigureSlots }) => {
  const [backgroundUrl, setBackgroundUrl] = useState<string>('');
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(0.1);
  const [currentTime, setCurrentTime] = useState<string>('');
  
  // 当前选中的时间段索引
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [isManualSelection, setIsManualSelection] = useState(false);

  // 更新当前时间
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
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
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    for (let i = 0; i < MOCK_TIME_SLOTS.length; i++) {
      const slot = MOCK_TIME_SLOTS[i];
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
    if (!isManualSelection) {
      setSelectedSlotIndex(getCurrentTimeSlotIndex());
    }
  }, [isManualSelection]);

  // 重置手动选择状态（5分钟后）
  useEffect(() => {
    if (isManualSelection) {
      const timer = setTimeout(() => {
        setIsManualSelection(false);
      }, 5 * 60 * 1000); // 5分钟
      return () => clearTimeout(timer);
    }
  }, [isManualSelection]);

  const currentSlot = MOCK_TIME_SLOTS[selectedSlotIndex];
  const currentCards = currentSlot.cards;

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
          {MOCK_TIME_SLOTS.map((slot, index) => {
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
                <IconRenderer 
                  icon={slot.icon}
                  className={`text-xl flex-shrink-0 ${isSelected ? 'opacity-100' : 'opacity-100'}`} 
                />
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

        {/* 头部：当前时间 + 配置按钮 */}
        <div className="mb-8 md:mb-10 flex items-center justify-between mt-2 md:mt-0">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-mono font-light text-stone-700 tracking-tight">
              {currentTime}
            </h1>
          </div>

          <div className="h-px flex-1 bg-stone-100 ml-4"></div>

          {onConfigureSlots && (
            <button
              onClick={onConfigureSlots}
              className="p-2 rounded-full hover:bg-white/50 transition-colors active:scale-95 ml-4"
              title="配置时间段"
            >
              <Settings size={20} className="text-stone-600" />
            </button>
          )}
        </div>

        {/* 活动卡片网格 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 content-start overflow-y-auto pb-24 no-scrollbar">
          {currentCards.length === 0 ? (
            <div className="col-span-full flex items-center justify-center py-12">
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
