/**
 * @file TodoReminderButton.tsx
 * @input Source date, optional reminder, completion state and click handler
 * @output Compact theme-aware reminder action beside a todo date
 * @pos Component
 * @updated 2026-10-18: Uses icon color alone for compact active reminders and keeps their hit area inside the card header.
 * @updated 2026-10-18: Adds an icon-only active-colored variant for quick-action card headers.
 * @updated 2026-10-17: Shows reminder controls only for dated, incomplete todos.
 */
import React from 'react';
import { Bell, BellRing } from 'lucide-react';
import type { TodoReminderField, TodoReminderSetting } from '../types';
import { formatTodoReminder, TODO_REMINDER_LABELS } from '../utils/todoReminderUtils';

interface TodoReminderButtonProps {
  date?: string;
  field: TodoReminderField;
  setting?: TodoReminderSetting;
  completed: boolean;
  disabled?: boolean;
  iconOnly?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}

export const TodoReminderButton: React.FC<TodoReminderButtonProps> = ({ date, field, setting, completed, disabled, iconOnly, onClick }) => {
  if (!date || completed) return null;
  const Icon = setting ? BellRing : Bell;
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={`${setting ? '编辑' : '设置'}${TODO_REMINDER_LABELS[field]}`}
      data-active={Boolean(setting)} data-icon-only={Boolean(iconOnly)}
      title={disabled ? '请先填写待办名称' : setting ? formatTodoReminder(date, setting) : TODO_REMINDER_LABELS[field]}
      className={`todo-reminder-button inline-flex shrink-0 items-center text-[11px] font-medium transition-colors disabled:opacity-40 ${iconOnly ? 'mr-2 h-7 w-7 justify-center bg-transparent' : 'min-h-8 gap-1.5 rounded-full px-2.5 py-1 hover:bg-stone-100'} ${setting ? 'text-stone-700' : 'text-stone-400 hover:text-stone-600'}`}
      style={setting ? { color: 'var(--accent-color)' } : undefined}>
      <Icon size={iconOnly ? 14 : 13} strokeWidth={1.7} />
      {!iconOnly && <span>{setting ? `${setting.daysBefore === 0 ? '当天' : setting.daysBefore > 0 ? `提前${setting.daysBefore}天` : `延后${-setting.daysBefore}天`} ${setting.time}` : '提醒'}</span>}
    </button>
  );
};
