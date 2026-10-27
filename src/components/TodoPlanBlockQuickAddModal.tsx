/**
 * @file TodoPlanBlockQuickAddModal.tsx
 * @input Existing todo, selected local date, and plan log callbacks
 * @output Validated same-day planned timeline block from HHMM digit inputs
 * @pos Component (Modal)
 * @description Collects a start and end time for a planned block on the selected todo date.
 * @updated 2026-10-27: Portals above isolated pages and handles keyboard/Android dismissal without closing the todo.
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock, X } from 'lucide-react';
import type { Log, TodoItem } from '../types';
import { buildTimelinePlannedLog } from '../utils/todoRecurringPlanUtils';
import { parseDateKey } from '../utils/todoScheduleUtils';
import { useTodoDateDialog } from '../hooks/useTodoDateDialog';

interface TodoPlanBlockQuickAddModalProps {
  todo: TodoItem;
  date: string;
  onSave: (log: Log) => void;
  onClose: () => void;
}

const parseFourDigitTime = (value: string): number | null => {
  if (!/^\d{4}$/.test(value)) return null;
  const hours = Number(value.slice(0, 2));
  const minutes = Number(value.slice(2, 4));
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const timestampForDate = (dateKey: string, minutes: number): number | null => {
  const date = parseDateKey(dateKey);
  if (!date) return null;
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date.getTime();
};

export const TodoPlanBlockQuickAddModal: React.FC<TodoPlanBlockQuickAddModalProps> = ({ todo, date, onSave, onClose }) => {
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [error, setError] = useState('');
  const panel = useTodoDateDialog(onClose);

  const save = () => {
    const startMinutes = parseFourDigitTime(startInput);
    const endMinutes = parseFourDigitTime(endInput);
    if (startMinutes === null || endMinutes === null) {
      setError('请输入有效的 HHMM 时间');
      return;
    }
    if (endMinutes <= startMinutes) {
      setError('结束时间需要晚于开始时间');
      return;
    }

    const startTime = timestampForDate(date, startMinutes);
    const endTime = timestampForDate(date, endMinutes);
    if (startTime === null || endTime === null) {
      setError('日期无效，请重新选择');
      return;
    }

    const plannedLog = buildTimelinePlannedLog(todo, startTime, endTime);
    if (!plannedLog) {
      setError('无法创建计划块，请检查时间');
      return;
    }
    onSave(plannedLog);
    onClose();
  };

  const normalizeTimeInput = (value: string, setValue: (next: string) => void) => {
    setValue(value.replace(/\D/g, '').slice(0, 4));
    setError('');
  };

  return createPortal(
    <div className="todo-date-picker-backdrop fixed inset-0 z-[140] flex items-center justify-center bg-[rgba(245,241,236,0.78)] px-5 py-8 backdrop-blur-sm"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="todo-plan-block-title"
        className="todo-date-picker max-h-[calc(100dvh-4rem)] w-full max-w-[23rem] overflow-y-auto rounded-[2rem] border border-stone-200 bg-[#fbf8f3] shadow-[0_24px_60px_rgba(0,0,0,0.1)]">
        <header className="flex items-start justify-between gap-3 border-b border-stone-200 px-6 py-5">
          <div>
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-stone-400"><CalendarClock size={14} />{date.replaceAll('-', '.')}</p>
            <h2 id="todo-plan-block-title" className="mt-1 text-xl font-semibold tracking-tight text-stone-800">添加计划块</h2>
            <p className="mt-1 truncate text-xs text-stone-500">{todo.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭计划块设置" className="rounded-full p-2 text-stone-400 transition-colors hover:bg-white hover:text-stone-600">
            <X size={18} />
          </button>
        </header>
        <div className="space-y-4 px-6 py-6">
          <label className="block text-xs font-medium text-stone-500">
            开始时间
            <input aria-label="计划开始时间" type="text" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="HHMM"
              value={startInput} onChange={(event) => normalizeTimeInput(event.target.value, setStartInput)}
              className="mt-2 w-full border-0 border-b border-stone-200 bg-transparent py-2 font-mono text-2xl tracking-[0.12em] text-stone-800 outline-none placeholder:text-stone-300 focus:border-stone-500" />
          </label>
          <label className="block text-xs font-medium text-stone-500">
            结束时间
            <input aria-label="计划结束时间" type="text" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="HHMM"
              value={endInput} onChange={(event) => normalizeTimeInput(event.target.value, setEndInput)}
              className="mt-2 w-full border-0 border-b border-stone-200 bg-transparent py-2 font-mono text-2xl tracking-[0.12em] text-stone-800 outline-none placeholder:text-stone-300 focus:border-stone-500" />
          </label>
          {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
        </div>
        <footer className="flex items-center justify-end gap-5 border-t border-stone-200 px-6 py-4">
          <button type="button" onClick={onClose} className="text-sm text-stone-500 transition-colors hover:text-stone-800">取消</button>
          <button type="button" onClick={save} className="text-sm font-medium text-stone-800 transition-colors hover:text-stone-950">保存计划块</button>
        </footer>
      </div>
    </div>, document.body
  );
};
