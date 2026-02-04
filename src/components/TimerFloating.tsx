/**
 * @file TimerFloating.tsx
 * @input props: activeSessions, todos
 * @output Floating UI Elements
 * @pos Component (Global UI)
 * @description Renders floating timer balls for active sessions, allowing quick access to stop or cancel ongoing activities.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useState } from 'react';
import { ActiveSession, TodoItem, AppView } from '../types';
import { StopCircle, X, CheckCircle2 } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';

interface TimerFloatingProps {
  sessions: ActiveSession[];
  todos: TodoItem[];
  onStop: (sessionId: string) => void;
  onCancel: (sessionId: string) => void;
  onClick: (session: ActiveSession) => void;
}

const SingleTimer: React.FC<{
  session: ActiveSession;
  todo?: TodoItem;
  onStop: () => void;
  onCancel: () => void;
  onClick: () => void;
}> = ({ session, todo, onStop, onCancel, onClick }) => {
  const [elapsed, setElapsed] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isBorderAnimating, setIsBorderAnimating] = useState(false);
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);
  const { currentView } = useNavigation();

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - session.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [session.startTime]);

  // 监听页面切换，非记录页时自动收缩（但不影响手动展开的状态）
  useEffect(() => {
    if (currentView !== AppView.RECORD && !isCollapsed && !isManuallyExpanded) {
      setIsCollapsed(true);
    }
    // 回到记录页时重置手动展开标记
    if (currentView === AppView.RECORD) {
      setIsManuallyExpanded(false);
    }
  }, [currentView, isCollapsed, isManuallyExpanded]);

  // 监听收缩状态变化，触发边框动画
  useEffect(() => {
    if (isCollapsed) {
      // 收缩动画完成后，开始边框消失动画
      const timer = setTimeout(() => {
        setIsBorderAnimating(true);
      }, 500); // 等待收缩动画完成（500ms）
      return () => clearTimeout(timer);
    } else {
      // 展开时重置边框状态
      setIsBorderAnimating(false);
    }
  }, [isCollapsed]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    
    // 如果在非记录页手动展开，设置手动展开标记
    if (!newCollapsedState && currentView !== AppView.RECORD) {
      setIsManuallyExpanded(true);
    } else {
      setIsManuallyExpanded(false);
    }
  };

  // 动态计算样式
  const getContainerStyle = () => {
    if (isCollapsed) {
      if (isBorderAnimating) {
        // 边框消失后的最终状态：更小的圆球，无边框，48px高度
        return {
          border: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          width: '3rem',
          height: '3rem'
        };
      } else {
        // 收缩状态：保持原有边框
        return {
          border: '2px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8), 0 0 0 1px rgba(0,0,0,0.05)'
        };
      }
    } else {
      // 展开状态：原有样式
      return {
        border: '2px solid rgba(255, 255, 255, 0.8)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8), 0 0 0 1px rgba(0,0,0,0.05)'
      };
    }
  };

  // 判断是否需要缩小宽度以避免遮挡右侧按钮
  // 现在使用相对宽度，不再需要这些变量，但保留以备后用
  // const shouldReduceWidth = currentView !== AppView.RECORD && currentView !== AppView.TODO;
  // const isTimelinePage = currentView === AppView.TIMELINE;

  return (
    <div
      onClick={onClick}
      className={`relative bg-white/95 backdrop-blur-sm text-stone-800 flex items-center cursor-pointer active:scale-[0.99] overflow-hidden ${
        isCollapsed 
          ? `rounded-full justify-center items-center p-0 transition-all duration-500 ease-out ${
              isBorderAnimating ? 'w-12 h-12' : 'w-[3.5rem] h-[3.5rem]'
            } ${isBorderAnimating ? 'duration-300' : ''}` 
          : `transition-all duration-500 ease-out rounded-full h-14 ${
              currentView === AppView.RECORD || currentView === AppView.TODO
                ? 'px-4 py-3 justify-between w-full'                          // 记录页和待办页：100%宽度
                : currentView === AppView.TIMELINE
                  ? 'pl-[1.75rem] pr-1 py-3 justify-between w-[65%]'          // 脉络页：65%宽度
                  : 'pl-[1.75rem] pr-2 py-3 justify-between w-[80%]'          // 其他页面：80%宽度
            }`
      }`}
      style={{
        ...getContainerStyle(),
        zIndex: isCollapsed && isBorderAnimating 
          ? 5  // 收缩后最低层级
          : currentView === AppView.RECORD || currentView === AppView.TODO
            ? 40  // 记录页和待办页保持高层级
            : currentView === AppView.TIMELINE
              ? 45  // 脉络页使用最高层级，确保在所有元素之上
              : 10  // 其他页面使用低层级
      }}
    >
      {isCollapsed ? (
        <div 
          onClick={toggleCollapse}
          className={`flex items-center justify-center hover:scale-110 transition-all cursor-pointer ${
            isBorderAnimating 
              ? 'w-8 h-8 text-2xl duration-300'  // 最终状态：无背景，大图标
              : 'w-10 h-10 text-xl rounded-full bg-orange-50 shadow-inner hover:bg-orange-100 duration-500'  // 第一阶段：保持背景
          }`}
        >
          {session.activityIcon}
        </div>
      ) : (
        <>
          <div className={`flex items-center ${
            currentView === AppView.RECORD || currentView === AppView.TODO 
              ? 'gap-4' 
              : 'gap-3 relative'
          }`}>
            <div 
              onClick={toggleCollapse}
              className={`w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-xl shadow-inner shrink-0 hover:bg-orange-100 transition-colors cursor-pointer ${
                currentView !== AppView.RECORD && currentView !== AppView.TODO ? 'absolute left-0' : ''
              }`}
            >
              {session.activityIcon}
            </div>
            <div className={`flex flex-col min-w-0 transition-all duration-500 ease-out ${
              currentView !== AppView.RECORD && currentView !== AppView.TODO ? 'ml-[3.25rem]' : ''
            }`}>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-stone-700 truncate">{session.activityName}</span>
                {todo && (
                  <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full truncate max-w-[100px]">
                    @{todo.title}
                  </span>
                )}
              </div>
              <span className="text-xl font-mono font-medium text-orange-500 tabular-nums tracking-tight leading-none mt-0.5">
                {formatTime(elapsed)}
              </span>
            </div>
          </div>

          <div className={`flex items-center gap-2 border-l border-stone-100 transition-all duration-500 ease-out ${
            currentView === AppView.RECORD || currentView === AppView.TODO
              ? 'pl-4 ml-2'                    // 记录页和待办页：完整间距
              : currentView === AppView.TIMELINE 
                ? 'pl-1 ml-0.5 gap-1'         // 脉络页：最紧凑
                : 'pl-2 ml-1'                  // 其他页面：中等间距
          }`} onClick={e => e.stopPropagation()}>
            <button
              onClick={onCancel}
              className="p-2 text-stone-300 hover:text-stone-500 hover:bg-stone-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <button
              onClick={onStop}
              className="p-2 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
            >
              <CheckCircle2 size={24} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export const TimerFloating: React.FC<TimerFloatingProps> = ({ sessions, todos, onStop, onCancel, onClick }) => {
  if (sessions.length === 0) return null;

  // 获取当前页面信息来决定外层容器的 z-index
  const { currentView } = useNavigation();
  
  // 计算外层容器的 z-index
  const containerZIndex = currentView === AppView.TIMELINE ? 50 : 10;
  
  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 right-4 md:left-4 md:right-4 flex flex-col-reverse gap-6 animate-in slide-in-from-bottom-5" style={{ zIndex: containerZIndex }}>
      {sessions.map(session => (
        <SingleTimer
          key={session.id}
          session={session}
          todo={todos.find(t => t.id === session.linkedTodoId)}
          onStop={() => onStop(session.id)}
          onCancel={() => onCancel(session.id)}
          onClick={() => onClick(session)}
        />
      ))}
    </div>
  );
};