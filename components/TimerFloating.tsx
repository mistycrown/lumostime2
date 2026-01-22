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
  const { currentView } = useNavigation();

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - session.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [session.startTime]);

  // 监听页面切换，非记录页时自动收缩
  useEffect(() => {
    if (currentView !== AppView.RECORD && !isCollapsed) {
      setIsCollapsed(true);
    }
  }, [currentView, isCollapsed]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      onClick={onClick}
      className={`relative bg-white/95 backdrop-blur-sm text-stone-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center cursor-pointer active:scale-[0.99] transition-all duration-500 ease-out overflow-hidden ${
        isCollapsed 
          ? 'w-[5.5rem] h-[5.5rem] rounded-full justify-center items-center p-0' 
          : 'pl-[1.75rem] pr-4 py-4 justify-between rounded-full h-[5.5rem]'
      }`}
      style={{
        border: '2px solid rgba(255, 255, 255, 0.8)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8), 0 0 0 1px rgba(0,0,0,0.05)'
      }}
    >
      {isCollapsed ? (
        <div 
          onClick={toggleCollapse}
          className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-xl shadow-inner hover:bg-orange-100 transition-colors cursor-pointer"
        >
          {session.activityIcon}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 relative">
            <div 
              onClick={toggleCollapse}
              className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-xl shadow-inner shrink-0 hover:bg-orange-100 transition-colors cursor-pointer absolute left-0"
            >
              {session.activityIcon}
            </div>
            <div className="flex flex-col min-w-0 transition-all duration-500 ease-out ml-[3.25rem]">
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

          <div className="flex items-center gap-2 pl-4 border-l border-stone-100 ml-2 transition-all duration-500 ease-out" onClick={e => e.stopPropagation()}>
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

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 right-4 md:left-auto md:right-6 md:w-[360px] z-50 flex flex-col-reverse gap-6 animate-in slide-in-from-bottom-5">
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