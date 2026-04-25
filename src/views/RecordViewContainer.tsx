/**
 * @file RecordViewContainer.tsx
 * @description 计时页面容器 - 包含标签视图和场景视图的切换
 * @updated 2026-04-25: Added a flex min-height guard so Scene mode inherits a scrollable viewport height on mobile.
 */
import React, { useState, useEffect } from 'react';
import { Category, Activity, TodoItem } from '../types';
import { RecordView } from './RecordView';
import { SceneView } from './SceneView';
import { FloatingButton } from '../components/FloatingButton';
import { UIIcon } from '../components/UIIcon';
import { Grid3x3, Clock } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useNavigation } from '../contexts/NavigationContext';
import { AppView } from '../types';

export type RecordViewMode = 'tags' | 'scenes';

interface RecordViewContainerProps {
  onStartActivity: (activity: Activity, categoryId: string, autoEnterFocus?: boolean) => void;
  onStartTodoFocus?: (todo: TodoItem, autoEnterFocus?: boolean) => void;
  onAddLog?: (startTime?: number, endTime?: number, prefilledData?: { categoryId?: string; activityId?: string; linkedTodoId?: string }) => void;
  categories: Category[];
  todos?: TodoItem[];
}

export const RecordViewContainer: React.FC<RecordViewContainerProps> = ({
  onStartActivity,
  onStartTodoFocus,
  onAddLog,
  categories,
  todos = []
}) => {
  const { defaultRecordView } = useSettings();
  const { currentView } = useNavigation();
  
  // 从默认设置初始化视图模式
  const [viewMode, setViewMode] = useState<RecordViewMode>(() => {
    return defaultRecordView === 'SCENE' ? 'scenes' : 'tags';
  });
  
  // 当切换到记录页时，重置为默认视图
  useEffect(() => {
    if (currentView === AppView.RECORD) {
      const defaultMode = defaultRecordView === 'SCENE' ? 'scenes' : 'tags';
      setViewMode(defaultMode);
      
      // 触发一个自定义事件，通知 SceneView 重新检测时间
      window.dispatchEvent(new CustomEvent('recordViewActivated'));
    }
  }, [currentView, defaultRecordView]);

  // 保存视图模式到 localStorage（用于在同一会话中记住用户的手动切换）
  useEffect(() => {
    localStorage.setItem('lumostime_recordViewMode', viewMode);
  }, [viewMode]);

  // 切换视图模式
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'tags' ? 'scenes' : 'tags');
  };

  // 配置场景的处理函数
  const handleConfigureSlots = () => {
    alert('请前往「设置 → 通用 → 场景设置」配置时间段和快捷方式');
  };
  
  // 包装 onStartActivity 以支持 autoEnterFocus 参数
  const handleStartActivity = (activity: Activity, categoryId: string, autoEnterFocus?: boolean) => {
    onStartActivity(activity, categoryId, autoEnterFocus);
  };
  
  // 包装 onStartTodoFocus 以支持 autoEnterFocus 参数
  const handleStartTodoFocus = (todo: TodoItem, autoEnterFocus?: boolean) => {
    onStartTodoFocus?.(todo, autoEnterFocus);
  };

  return (
    <div className="h-full min-h-0 relative">
      {/* 主内容区域 */}
      {viewMode === 'tags' ? (
        <RecordView 
          onStartActivity={onStartActivity}
          categories={categories}
        />
      ) : (
        <SceneView 
          onConfigureSlots={handleConfigureSlots}
          onStartActivity={handleStartActivity}
          onStartTodoFocus={handleStartTodoFocus}
          onAddLog={onAddLog}
          categories={categories}
          todos={todos}
        />
      )}

      {/* 悬浮切换按钮 */}
      <FloatingButton
        onClick={toggleViewMode}
        ariaLabel={viewMode === 'tags' ? '切换到场景视图' : '切换到标签视图'}
        title={viewMode === 'tags' ? '切换到场景视图' : '切换到标签视图'}
      >
        {viewMode === 'tags' ? (
          <UIIcon type="calendar" fallbackIcon={Clock} size={24} className="text-white" />
        ) : (
          <UIIcon type="location" fallbackIcon={Grid3x3} size={24} className="text-white" />
        )}
      </FloatingButton>
    </div>
  );
};
