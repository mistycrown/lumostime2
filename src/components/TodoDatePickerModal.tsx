/**
 * @file TodoDatePickerModal.tsx
 * @input open state, selected date/month value, initial month value, callbacks
 * @output Standalone date/month picker modal for todo planning fields and Memoir month jumping
 * @pos Component (Modal)
 * @description A lightweight print-style modal that supports either day selection with a fast year/month jump view or a month-only picker for archive navigation.
 * @updated 2026-04-20: Added a month-only picker mode for Memoir and removed the duplicate footer close action.
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
import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface TodoDatePickerModalProps {
  isOpen: boolean;
  title: string;
  value?: string;
  initialMonthValue?: string;
  mode?: 'date' | 'month';
  onSelect: (value: string) => void;
  onClear?: () => void;
  onClose: () => void;
}

type PickerView = 'calendar' | 'month';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const MONTH_PICKER_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

const parsePickerValue = (value?: string): Date => {
  if (!value) return new Date();

  const patterns = ['yyyy-MM-dd', 'yyyy-MM'];
  for (const pattern of patterns) {
    const parsed = parse(value, pattern, new Date());
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
};

export const TodoDatePickerModal: React.FC<TodoDatePickerModalProps> = ({
  isOpen,
  title,
  value,
  initialMonthValue,
  mode = 'date',
  onSelect,
  onClear,
  onClose
}) => {
  const isMonthOnly = mode === 'month';
  const [displayMonth, setDisplayMonth] = useState<Date>(() => startOfMonth(parsePickerValue(value || initialMonthValue)));
  const [pickerView, setPickerView] = useState<PickerView>(isMonthOnly ? 'month' : 'calendar');

  useEffect(() => {
    if (isOpen) {
      setDisplayMonth(startOfMonth(parsePickerValue(value || initialMonthValue)));
      setPickerView(isMonthOnly ? 'month' : 'calendar');
    }
  }, [initialMonthValue, isMonthOnly, isOpen, value]);

  const selectedDate = useMemo(
    () => (!isMonthOnly && value ? parsePickerValue(value) : null),
    [isMonthOnly, value]
  );
  const today = useMemo(() => new Date(), []);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(displayMonth);
    const monthEnd = endOfMonth(displayMonth);
    const rangeStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const rangeEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  }, [displayMonth]);

  const shiftDisplayYear = (offset: number) => {
    setDisplayMonth((prev) => startOfMonth(new Date(prev.getFullYear() + offset, prev.getMonth(), 1)));
  };

  const handleMonthSelect = (monthIndex: number) => {
    const nextMonth = startOfMonth(new Date(displayMonth.getFullYear(), monthIndex, 1));
    setDisplayMonth(nextMonth);

    if (isMonthOnly) {
      onSelect(format(nextMonth, 'yyyy-MM'));
      onClose();
      return;
    }

    setPickerView('calendar');
  };

  const handleHeaderPrevious = () => {
    if (pickerView === 'month') {
      shiftDisplayYear(-1);
      return;
    }

    setDisplayMonth((prev) => addMonths(prev, -1));
  };

  const handleHeaderNext = () => {
    if (pickerView === 'month') {
      shiftDisplayYear(1);
      return;
    }

    setDisplayMonth((prev) => addMonths(prev, 1));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(245,241,236,0.72)] px-5 py-8 backdrop-blur-sm">
      <div className="w-full max-w-[23rem] overflow-hidden rounded-[2rem] border border-stone-200 bg-[#fbf8f3] shadow-[0_24px_60px_rgba(0,0,0,0.08)]">
        <div className="border-b border-stone-200 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-stone-400">
                {isMonthOnly ? 'Month Picker' : 'Date Picker'}
              </div>
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
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleHeaderPrevious}
              className="rounded-full border border-stone-200 p-2 text-stone-500 transition-colors hover:bg-white hover:text-stone-700"
              title={pickerView === 'month' ? '上一年' : '上个月'}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (isMonthOnly) return;
                setPickerView((prev) => (prev === 'calendar' ? 'month' : 'calendar'));
              }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-base font-medium tracking-[0.08em] text-stone-700 transition-colors hover:bg-white hover:text-stone-900"
              title={
                isMonthOnly
                  ? '选择月份'
                  : pickerView === 'calendar'
                    ? '快速跳转月份'
                    : '返回日期视图'
              }
            >
              <span>{pickerView === 'calendar' ? format(displayMonth, 'yyyy.MM') : format(displayMonth, 'yyyy')}</span>
              <ChevronDown
                size={16}
                className={`transition-transform ${pickerView === 'month' ? 'rotate-180' : ''} ${isMonthOnly ? 'opacity-60' : ''}`}
              />
            </button>
            <button
              type="button"
              onClick={handleHeaderNext}
              className="rounded-full border border-stone-200 p-2 text-stone-500 transition-colors hover:bg-white hover:text-stone-700"
              title={pickerView === 'month' ? '下一年' : '下个月'}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {pickerView === 'calendar' ? (
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
          ) : (
            <div className="rounded-[1.5rem] border border-stone-200 bg-white/70 p-3">
              <div className="mb-3 text-center text-[11px] uppercase tracking-[0.22em] text-stone-400">
                {isMonthOnly ? 'Select Month' : 'Quick Jump'}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MONTH_PICKER_LABELS.map((label, monthIndex) => {
                  const isActive = displayMonth.getMonth() === monthIndex;

                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleMonthSelect(monthIndex)}
                      className={`rounded-2xl border px-3 py-3 text-sm transition-all ${
                        isActive
                          ? 'border-stone-900 bg-stone-900 text-white shadow-[0_10px_22px_rgba(0,0,0,0.12)]'
                          : 'border-transparent text-stone-600 hover:border-stone-200 hover:bg-white hover:text-stone-900'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {!isMonthOnly && (
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
          </div>
        )}
      </div>
    </div>
  );
};
