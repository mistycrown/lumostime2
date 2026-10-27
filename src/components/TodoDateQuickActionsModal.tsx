/**
 * @file TodoDateQuickActionsModal.tsx
 * @input Selected todo date and plan/reminder action callbacks
 * @output Compact follow-up actions for a newly selected arrange or deadline date
 * @pos Component (Modal)
 * @description Lets users add a planned time block, configure a reminder, or finish after selecting a todo date.
 * @updated 2026-10-27: Shares the complete plan/reminder flow between details and list quick actions.
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CalendarClock, X } from 'lucide-react';
import type { Log, TodoItem, TodoReminderField, TodoReminderSetting } from '../types';
import { useTodoDateDialog } from '../hooks/useTodoDateDialog';
import { TodoPlanBlockQuickAddModal } from './TodoPlanBlockQuickAddModal';
import { TodoReminderModal } from './TodoReminderModal';

interface TodoDateQuickActionsModalProps {
  date: string;
  field: TodoReminderField;
  todo: TodoItem;
  reminder?: TodoReminderSetting;
  onSavePlan?: (log: Log) => void;
  onSaveReminder?: (setting?: TodoReminderSetting) => void;
  onClose: () => void;
}

export const TodoDateQuickActionsModal: React.FC<TodoDateQuickActionsModalProps> = ({
  date,
  field,
  todo,
  reminder,
  onSavePlan,
  onSaveReminder,
  onClose
}) => {
  const [editor, setEditor] = useState<'plan' | 'reminder' | null>(null);
  const [planAdded, setPlanAdded] = useState(false);
  const panel = useTodoDateDialog(onClose, editor === null);
  const fieldLabel = field === 'scheduledDate' ? '安排日期' : '截止日期';

  if (editor === 'plan' && onSavePlan) return <TodoPlanBlockQuickAddModal todo={todo} date={date}
    onSave={(log) => { onSavePlan(log); setPlanAdded(true); }} onClose={() => setEditor(null)} />;
  if (editor === 'reminder' && onSaveReminder) return <TodoReminderModal field={field} date={date}
    value={reminder} onSave={onSaveReminder} onClose={() => setEditor(null)} />;

  return createPortal(
  <div className="todo-date-picker-backdrop fixed inset-0 z-[140] flex items-center justify-center bg-[rgba(245,241,236,0.72)] px-5 py-8 backdrop-blur-sm"
    onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="todo-date-quick-actions-title"
      className="todo-date-picker w-full max-w-[23rem] overflow-hidden rounded-[2rem] border border-stone-200 bg-[#fbf8f3] shadow-[0_24px_60px_rgba(0,0,0,0.08)]">
      <header className="flex items-start justify-between gap-3 border-b border-stone-200 px-6 py-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-stone-400">{fieldLabel}</p>
          <h2 id="todo-date-quick-actions-title" className="mt-1 text-xl font-semibold tracking-tight text-stone-800">
            {date.replaceAll('-', '.')}
          </h2>
        </div>
        <button type="button" onClick={onClose} aria-label="关闭日期快捷操作"
          className="rounded-full p-2 text-stone-400 transition-colors hover:bg-white hover:text-stone-600">
          <X size={18} />
        </button>
      </header>
      <div className="space-y-3 px-6 py-5">
        {onSavePlan && (
          <button type="button" onClick={() => setEditor('plan')}
            className="flex min-h-12 w-full items-center gap-3 border-b border-stone-200 pb-3 text-left text-sm text-stone-700 transition-colors hover:text-stone-950">
            <CalendarClock size={17} strokeWidth={1.6} className="text-stone-500" />
            {planAdded ? '继续添加计划块' : '添加当天计划块'}
          </button>
        )}
        {onSaveReminder && <button type="button" onClick={() => setEditor('reminder')}
          className="flex min-h-12 w-full items-center gap-3 text-left text-sm text-stone-700 transition-colors hover:text-stone-950">
          <Bell size={17} strokeWidth={1.6} className="text-stone-500" />
          {reminder ? '编辑' : '设置'}{fieldLabel}提醒
        </button>}
      </div>
      <footer className="flex justify-end border-t border-stone-200 px-6 py-4">
        <button type="button" onClick={onClose} className="text-sm text-stone-500 transition-colors hover:text-stone-800">完成</button>
      </footer>
    </div>
  </div>, document.body
  );
};
