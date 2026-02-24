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
import { IconRenderer } from './IconRenderer';

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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const { currentView } = useNavigation();

  // 监听窗口宽度变化
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // 判断是否需要缩小宽度以避免遮挡右侧悬浮按钮
  // 记录页：75%宽度，为右下角悬浮按钮留出空间
  // 待办页：100%宽度
  // 脉络页：60%宽度
  // 档案页和索引页：75%宽度
  // 其他页面：80%宽度

  // 响应式逻辑：根据页面类型和窗口宽度调整显示
  const isNarrowScreen = windowWidth < 450; // 设定阈值为450px
  const isExtraNarrowScreen = windowWidth < 380; // 极窄屏幕阈值
  
  // 第一组：记录页、档案页、索引页 - 完全一致的逻辑
  const isGroupOne = currentView === AppView.RECORD || 
                     currentView === AppView.REVIEW || 
                     currentView === AppView.SCOPE ||
                     currentView === AppView.TAGS;
  
  // 第二组：脉络页 - 简化布局
  const isGroupTwo = currentView === AppView.TIMELINE;
  
  // 第三组：待办页 - 完整显示
  const isGroupThree = currentView === AppView.TODO;
  
  // 第一组的响应式规则：窄屏时隐藏取消按钮，极窄屏时隐藏待办标签
  const shouldHideCancelButton = isGroupOne && isNarrowScreen;
  const shouldHideTodoTag = isGroupOne && isExtraNarrowScreen;

  return (
    <div
      onClick={onClick}
      className={`relative bg-white/95 backdrop-blur-sm text-stone-800 flex items-center cursor-pointer active:scale-[0.99] overflow-hidden ${
        isCollapsed 
          ? `rounded-full justify-center items-center p-0 transition-all duration-500 ease-out ${
              isBorderAnimating ? 'w-12 h-12' : 'w-[3.5rem] h-[3.5rem]'
            } ${isBorderAnimating ? 'duration-300' : ''}` 
          : `transition-all duration-500 ease-out rounded-full h-14 ${
              isGroupThree
                ? 'px-4 py-3 justify-between w-full'                        // 待办页：100%宽度
                : isGroupTwo
                  ? 'pl-3 pr-3 py-3 w-[50%]'                               // 脉络页：50%宽度，无按钮区域
                  : 'pl-3 pr-2 py-3 justify-between w-[75%]'               // 记录页、档案页、索引页：75%宽度
            }`
      }`}
      style={{
        ...getContainerStyle(),
        zIndex: isCollapsed && isBorderAnimating 
          ? 5  // 收缩后最低层级
          : currentView === AppView.RECORD || currentView === AppView.TODO
            ? 40  // 记录页和待办页保持高层级
            : currentView === AppView.TIMELINE || currentView === AppView.REVIEW
              ? 50  // 脉络页和档案页使用最高层级，确保在所有元素之上
              : 10,  // 其他页面使用低层级
        // 关键修复：收缩状态下明确设置宽高，确保是正圆
        ...(isCollapsed ? {
          width: isBorderAnimating ? '3rem' : '3.5rem',
          height: isBorderAnimating ? '3rem' : '3.5rem',
          minWidth: isBorderAnimating ? '3rem' : '3.5rem',
          minHeight: isBorderAnimating ? '3rem' : '3.5rem',
          maxWidth: isBorderAnimating ? '3rem' : '3.5rem',
          maxHeight: isBorderAnimating ? '3rem' : '3.5rem'
        } : {}),
        pointerEvents: 'auto'  // SingleTimer本身接收点击事件
      }}
    >
      {isCollapsed ? (
        <div 
          onClick={toggleCollapse}
          className={`flex items-center justify-center hover:scale-110 transition-all cursor-pointer ${
            isBorderAnimating 
              ? 'w-8 h-8 text-2xl duration-300'  // 最终状态：无背景，大图标
              : 'w-10 h-10 text-xl rounded-full shadow-inner duration-500'  // 第一阶段：保持背景
          }`}
          style={!isBorderAnimating ? {
            backgroundColor: 'color-mix(in srgb, var(--accent-color) 10%, white)'
          } : undefined}
          onMouseEnter={(e) => {
            if (!isBorderAnimating) {
              e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent-color) 20%, white)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isBorderAnimating) {
              e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent-color) 10%, white)';
            }
          }}
        >
          <IconRenderer 
            icon={session.activityIcon} 
            uiIcon={session.activityUiIcon}
            className={isBorderAnimating ? 'text-2xl' : 'text-xl'} 
          />
        </div>
      ) : (
        <>
          {/* 第二组：脉络页面的简化布局 - 保留图标，去掉按钮 */}
          {isGroupTwo ? (
            <div className="flex items-center gap-3 relative">
              <div 
                onClick={toggleCollapse}
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner shrink-0 transition-colors cursor-pointer absolute left-0"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent-color) 10%, white)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent-color) 20%, white)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent-color) 10%, white)';
                }}
              >
                <IconRenderer 
                  icon={session.activityIcon} 
                  uiIcon={session.activityUiIcon}
                  className="text-xl" 
                />
              </div>
              <div className="flex flex-col min-w-0 ml-14">
                <span className="font-semibold text-sm text-stone-700 truncate">{session.activityName}</span>
                <span className="text-xl font-mono font-medium tabular-nums tracking-tight leading-none mt-0.5" style={{ color: 'var(--accent-color)' }}>
                  {formatTime(elapsed)}
                </span>
              </div>
            </div>
          ) : (
            /* 第一组和第三组的正常布局 */
            <>
              <div className={`flex items-center ${
                isGroupThree
                  ? 'gap-4'  // 待办页：保持原有间距
                  : isGroupOne
                    ? 'gap-4 relative'  // 第一组：保持固定间距，不缩小
                    : 'gap-3 relative'  // 其他页面：中等间距
              }`}>
                <div 
                  onClick={toggleCollapse}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner shrink-0 transition-colors cursor-pointer ${
                    !isGroupThree
                      ? 'absolute left-0'  // 第一组：需要绝对定位
                      : ''  // 待办页：不需要绝对定位
                  }`}
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--accent-color) 10%, white)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent-color) 20%, white)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent-color) 10%, white)';
                  }}
                >
                  <IconRenderer 
                    icon={session.activityIcon} 
                    uiIcon={session.activityUiIcon}
                    className="text-xl" 
                  />
                </div>
                <div className={`flex flex-col min-w-0 transition-all duration-500 ease-out ${
                  !isGroupThree
                    ? isGroupOne
                      ? 'ml-14'  // 第一组：保持固定左边距
                      : 'ml-[3.25rem]'  // 其他页面：保持原边距
                    : ''
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-stone-700 truncate">{session.activityName}</span>
                    {todo && !shouldHideTodoTag && (
                      <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full truncate max-w-[100px]">
                        @{todo.title}
                      </span>
                    )}
                  </div>
                  <span className="text-xl font-mono font-medium tabular-nums tracking-tight leading-none mt-0.5" style={{ color: 'var(--accent-color)' }}>
                    {formatTime(elapsed)}
                  </span>
                </div>
              </div>

              <div className={`flex items-center border-l border-stone-100 transition-all duration-500 ease-out ${
                isGroupThree
                  ? 'pl-4 ml-2 gap-2'              // 待办页：完整间距，缩小按钮间距
                  : isGroupOne
                    ? isNarrowScreen 
                      ? 'pl-0.5 ml-0 gap-0.5'      // 第一组窄屏：极度紧凑，竖杠左移
                      : 'pl-1 ml-0.5 gap-0.5'      // 第一组正常屏幕：最紧凑，缩小按钮间距
                    : 'pl-2 ml-1 gap-1'            // 其他页面：中等间距，缩小按钮间距
              }`} onClick={e => e.stopPropagation()}>
                {/* 取消按钮 - 第一组窄屏时隐藏 */}
                {!shouldHideCancelButton && (
                  <button
                    onClick={onCancel}
                    className="p-2 text-stone-300 hover:text-stone-500 hover:bg-stone-100 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                )}
                <button
                  onClick={onStop}
                  className="p-2 rounded-full transition-colors"
                  style={{ 
                    color: 'var(--accent-color)',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent-color) 10%, transparent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <CheckCircle2 size={24} />
                </button>
              </div>
            </>
          )}
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
  const containerZIndex = currentView === AppView.TIMELINE || currentView === AppView.REVIEW ? 50 : 10;
  
  return (
    <div 
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 right-4 md:left-4 md:right-4 flex flex-col-reverse gap-6 animate-in slide-in-from-bottom-5" 
      style={{ 
        zIndex: containerZIndex,
        pointerEvents: 'none'  // 关键修复：容器本身不拦截点击事件，让事件穿透到下层
      }}
    >
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