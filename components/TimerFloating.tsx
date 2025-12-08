import React, { useEffect, useState } from 'react';
import { ActiveSession, TodoItem } from '../types';
import { StopCircle, X, CheckCircle2 } from 'lucide-react';

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

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - session.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [session.startTime]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      onClick={onClick}
      className="bg-white/95 backdrop-blur-sm text-stone-800 p-4 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-stone-100 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-xl shadow-inner shrink-0">
          {session.activityIcon}
        </div>
        <div className="flex flex-col min-w-0">
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

      <div className="flex items-center gap-2 pl-4 border-l border-stone-100 ml-2" onClick={e => e.stopPropagation()}>
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
    </div>
  );
};

export const TimerFloating: React.FC<TimerFloatingProps> = ({ sessions, todos, onStop, onCancel, onClick }) => {
  if (sessions.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-[360px] z-50 flex flex-col-reverse gap-6 animate-in slide-in-from-bottom-5">
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