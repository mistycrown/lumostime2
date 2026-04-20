/**
 * @file TodoDatePickerModal.tsx
 * @input open state, selected date value, callbacks
 * @output Standalone date picker modal for todo planning fields
 * @pos Component (Modal)
 * @description A lightweight print-style calendar modal used by todo planning fields instead of the browser's default date input popup.
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  parse,
  startOfMonth,
  startOfWeek
} from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface TodoDatePickerModalProps {
  isOpen: boolean;
  title: string;
  value?: string;
  onSelect: (date: string) => void;
  onClear?: () => void;
  onClose: () => void;
}

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

const parseDateValue = (value?: string): Date => {
  if (!value) return new Date();
  const parsed = parse(value, 'yyyy-MM-dd', new Date());
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const TodoDatePickerModal: React.FC<TodoDatePickerModalProps> = ({
  isOpen,
  title,
  value,
  onSelect,
  onClear,
  onClose
}) => {
  const [displayMonth, setDisplayMonth] = useState<Date>(() => startOfMonth(parseDateValue(value)));

  useEffect(() => {
    if (isOpen) {
      setDisplayMonth(startOfMonth(parseDateValue(value)));
    }
  }, [isOpen, value]);

  const selectedDate = useMemo(() => (value ? parseDateValue(value) : null), [value]);
  const today = useMemo(() => new Date(), []);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(displayMonth);
    const monthEnd = endOfMonth(displayMonth);
    const rangeStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const rangeEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  }, [displayMonth]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(245,241,236,0.72)] px-5 py-8 backdrop-blur-sm">
      <div className="w-full max-w-[23rem] overflow-hidden rounded-[2rem] border border-stone-200 bg-[#fbf8f3] shadow-[0_24px_60px_rgba(0,0,0,0.08)]">
        <div className="border-b border-stone-200 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-stone-400">Date Picker</div>
              <div className="mt-1 text-xl font-semibold tracking-tight text-stone-800">{title}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-stone-400 transition-colors hover:bg-white hover:text-stone-600"
              title="关闭"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setDisplayMonth((prev) => addMonths(prev, -1))}
              className="rounded-full border border-stone-200 p-2 text-stone-500 transition-colors hover:bg-white hover:text-stone-700"
              title="上个月"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-base font-medium tracking-[0.08em] text-stone-700">
              {format(displayMonth, 'yyyy.MM')}
            </div>
            <button
              type="button"
              onClick={() => setDisplayMonth((prev) => addMonths(prev, 1))}
              className="rounded-full border border-stone-200 p-2 text-stone-500 transition-colors hover:bg-white hover:text-stone-700"
              title="下个月"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-2 text-center">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="pb-1 text-[11px] tracking-[0.16em] text-stone-400">
                {label}
              </div>
            ))}

            {calendarDays.map((day) => {
              const outsideMonth = day.getMonth() !== displayMonth.getMonth();
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const todayMatch = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    onSelect(format(day, 'yyyy-MM-dd'));
                    onClose();
                  }}
                  className={`relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm transition-all ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-[0_10px_22px_rgba(0,0,0,0.14)]'
                      : outsideMonth
                        ? 'text-stone-300 hover:bg-white'
                        : 'text-stone-700 hover:bg-white'
                  }`}
                >
                  <span>{format(day, 'd')}</span>
                  {todayMatch && !isSelected && (
                    <span className="absolute bottom-1 h-[2px] w-4 rounded-full bg-stone-300" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-stone-200 px-5 py-4 text-sm">
          <button
            type="button"
            onClick={() => {
              onSelect(format(today, 'yyyy-MM-dd'));
              onClose();
            }}
            className="text-stone-500 transition-colors hover:text-stone-800"
          >
            今天
          </button>
          <div className="flex items-center gap-4">
            {onClear && (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  onClose();
                }}
                className="text-stone-400 transition-colors hover:text-stone-700"
              >
                清除
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-stone-500 transition-colors hover:text-stone-800"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
