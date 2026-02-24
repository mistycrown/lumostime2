/**
 * @file RecordViewContainer.tsx
 * @description 计时页面容器 - 包含标签视图和场景视图的切换
 */
import React, { useState, useEffect } from 'react';
import { Category, Activity } from '../types';
import { RecordView } from './RecordView';
import { SceneView } from './SceneView';
import { FloatingButton } from '../components/FloatingButton';
import { UIIcon } from '../components/UIIcon';
import { Grid3x3, Clock } from 'lucide-react';

export type RecordViewMode = 'tags' | 'scenes';

interface RecordViewContainerProps {
  onStartActivity: (activity: Activity, categoryId: string) => void;
  categories: Category[];
}

export const RecordViewContainer: React.FC<RecordViewContainerProps> = ({
  onStartActivity,
  categories
}) => {
  // 从 localStorage 读取上次的视图模式
  const [viewMode, setViewMode] = useState<RecordViewMode>(() => {
    const saved = localStorage.getItem('lumostime_recordViewMode');
    return (saved as RecordViewMode) || 'tags';
  });

  // 保存视图模式到 localStorage
  useEffect(() => {
    localStorage.setItem('lumostime_recordViewMode', viewMode);
  }, [viewMode]);

  // 切换视图模式
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'tags' ? 'scenes' : 'tags');
  };

  return (
    <div className="h-full relative">
      {/* 主内容区域 */}
      {viewMode === 'tags' ? (
        <RecordView 
          onStartActivity={onStartActivity}
          categories={categories}
        />
      ) : (
        <SceneView />
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
          <UIIcon type="tags" fallbackIcon={Grid3x3} size={24} className="text-white" />
        )}
      </FloatingButton>
    </div>
  );
};
