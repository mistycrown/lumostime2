/**
 * @file TodoDatePickerModal.tsx
 * @updated 2026-07-21: Added dark-mode date-picker surface and outline-based selected dates.
 * @input open state, selected date/month value, optional multi-date value set, initial month value, callbacks
 * @output Standalone date/month picker modal for todo planning fields, Maybe-date multi-select, and Memoir month jumping
 * @pos Component (Modal)
 * @description A lightweight print-style modal that supports single-date selection, configurable multi-date toggling, or a month-only picker with a fast year/month jump view.
 * @updated 2026-05-18: Strictly validates incoming date strings and only mounts the calendar body while open so malformed short-month values can no longer crash the hidden picker tree.
 * @updated 2026-05-14: Added optional per-date selectability rules so recurrence `Skip Date` can disable days that do not belong to the active recurrence pattern, while also restoring damaged Chinese picker copy.
 * @updated 2026-05-14: Added configurable multi-date minimum-date rules so `Maybe Date` can stay future-only while recurrence `Skip Date` allows today plus future dates without needing a second calendar component.
 * @updated 2026-05-14: Added a future-only `multi-date` mode with local draft selection plus confirm/clear actions so todo details can edit `Maybe Date` values without disturbing the existing single-date scheduling flow.
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
  startOfMonth,
  startOfWeek
} from 'date-fns';
import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface TodoDatePickerModalProps {
  isOpen: boolean;
  title: string;
  value?: string;
  values?: string[];
  initialMonthValue?: string;
  mode?: 'date' | 'month' | 'multi-date';
  minDate?: 'future' | 'today-or-future';
  minMultiDate?: 'future' | 'today-or-future';
  isDateSelectable?: (value: string) => boolean;
  onSelect: (value: string) => void;
  onSelectMultiple?: (values: string[]) => void;
  onClear?: () => void;
  onClose: () => void;
}

type PickerView = 'calendar' | 'month';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const MONTH_PICKER_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

const buildStrictLocalDate = (year: number, month: number, day: number): Date | null => {
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const parsePickerValue = (value?: string): Date => {
  if (!value) return new Date();

  const trimmed = value.trim();
  if (!trimmed) {
    return new Date();
  }

  const fullDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (fullDateMatch) {
    const parsed = buildStrictLocalDate(
      Number(fullDateMatch[1]),
      Number(fullDateMatch[2]),
      Number(fullDateMatch[3])
    );
    return parsed || new Date();
  }

  const monthOnlyMatch = /^(\d{4})-(\d{2})$/.exec(trimmed);
  if (monthOnlyMatch) {
    const parsed = buildStrictLocalDate(
      Number(monthOnlyMatch[1]),
      Number(monthOnlyMatch[2]),
      1
    );
    return parsed || new Date();
  }

  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
};

const sortDateKeys = (values: string[]): string[] => [...values].sort((left, right) => left.localeCompare(right));

const TodoDatePickerModalContent: React.FC<TodoDatePickerModalProps> = ({
  title,
  value,
  values,
  initialMonthValue,
  mode = 'date',
  minDate,
  minMultiDate = 'future',
  isDateSelectable,
  onSelect,
  onSelectMultiple,
  onClear,
  onClose
}) => {
  const isMonthOnly = mode === 'month';
  const isMultiDate = mode === 'multi-date';
  const referenceValue = isMultiDate
    ? values?.[values.length - 1] || initialMonthValue
    : value || initialMonthValue;
  const [displayMonth, setDisplayMonth] = useState<Date>(() => startOfMonth(parsePickerValue(referenceValue)));
  const [pickerView, setPickerView] = useState<PickerView>(isMonthOnly ? 'month' : 'calendar');
  const [draftValues, setDraftValues] = useState<string[]>(() => sortDateKeys(values || []));

  useEffect(() => {
    const nextReferenceValue = isMultiDate
      ? values?.[values.length - 1] || initialMonthValue
      : value || initialMonthValue;
    setDisplayMonth(startOfMonth(parsePickerValue(nextReferenceValue)));
    setPickerView(isMonthOnly ? 'month' : 'calendar');
    setDraftValues(sortDateKeys(values || []));
  }, [initialMonthValue, isMonthOnly, isMultiDate, value, values]);

  const selectedDate = useMemo(
    () => (!isMonthOnly && !isMultiDate && value ? parsePickerValue(value) : null),
    [isMonthOnly, isMultiDate, value]
  );
  const selectedDateSet = useMemo(() => new Set(draftValues), [draftValues]);
  const today = useMemo(() => new Date(), []);
  const todayDateKey = useMemo(() => format(today, 'yyyy-MM-dd'), [today]);
  const minAllowedMultiDateKey = useMemo(() => todayDateKey, [todayDateKey]);
  const minAllowedDateKey = useMemo(
    () => (minDate === 'future' ? todayDateKey : minDate === 'today-or-future' ? todayDateKey : null),
    [minDate, todayDateKey]
  );

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

  const handleDaySelect = (dateKey: string) => {
    if (isDateSelectable && !isDateSelectable(dateKey)) {
      return;
    }

    if (isMultiDate) {
      const isBeforeMinimum = minMultiDate === 'today-or-future'
        ? dateKey < minAllowedMultiDateKey
        : dateKey <= minAllowedMultiDateKey;
      if (isBeforeMinimum) {
        return;
      }

      setDraftValues((previous) => (
        previous.includes(dateKey)
          ? previous.filter((item) => item !== dateKey)
          : sortDateKeys([...previous, dateKey])
      ));
      return;
    }

    if (minAllowedDateKey) {
      const isBeforeMinimum = minDate === 'today-or-future'
        ? dateKey < minAllowedDateKey
        : dateKey <= minAllowedDateKey;
      if (isBeforeMinimum) {
        return;
      }
    }

    onSelect(dateKey);
    onClose();
  };

  const handleMultiDateConfirm = () => {
    onSelectMultiple?.(draftValues);
    onClose();
  };

  const handleClear = () => {
    if (isMultiDate) {
      setDraftValues([]);
    }

    onClear?.();
    onClose();
  };

  return (
    <div className="todo-date-picker-backdrop fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(245,241,236,0.72)] px-5 py-8 backdrop-blur-sm">
      <div className="todo-date-picker w-full max-w-[23rem] overflow-hidden rounded-[2rem] border border-stone-200 bg-[#fbf8f3] shadow-[0_24px_60px_rgba(0,0,0,0.08)]">
        <div className="border-b border-stone-200 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-stone-400">
                {isMonthOnly ? 'Month Picker' : isMultiDate ? 'Multi Date Picker' : 'Date Picker'}
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
                    ? '快速切换月份'
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
                const dateKey = format(day, 'yyyy-MM-dd');
                const outsideMonth = day.getMonth() !== displayMonth.getMonth();
                const isSelected = isMultiDate
                  ? selectedDateSet.has(dateKey)
                  : (selectedDate ? isSameDay(day, selectedDate) : false);
                const todayMatch = isToday(day);
                const isOutsideSelectableRule = isDateSelectable ? !isDateSelectable(dateKey) : false;
                const isDisabledByMinimum = isMultiDate
                  ? (
                    minMultiDate === 'today-or-future'
                      ? dateKey < minAllowedMultiDateKey
                      : dateKey <= minAllowedMultiDateKey
                  )
                  : (minAllowedDateKey
                    ? (minDate === 'today-or-future'
                      ? dateKey < minAllowedDateKey
                      : dateKey <= minAllowedDateKey)
                    : false);
                const isDisabled = isDisabledByMinimum || isOutsideSelectableRule;

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleDaySelect(dateKey)}
                    disabled={isDisabled}
                    className={`relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm transition-all ${
                      isSelected
                        ? 'date-picker-selected border border-stone-900 bg-stone-900 text-white'
                        : isDisabled
                          ? 'cursor-not-allowed text-stone-300 opacity-50'
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
                          ? 'date-picker-selected border-stone-900 bg-stone-900 text-white'
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
            {isMultiDate ? (
              <>
                <span className="text-stone-500">
                  {draftValues.length > 0
                    ? `已选择 ${draftValues.length} 天`
                    : (minMultiDate === 'today-or-future' ? '仅可选择今天及未来日期' : '仅可选择未来日期')}
                </span>
                <div className="flex items-center gap-4">
                  {onClear && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="text-stone-400 transition-colors hover:text-stone-700"
                    >
                      清空
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleMultiDateConfirm}
                    className="text-stone-700 transition-colors hover:text-stone-900"
                  >
                    完成
                  </button>
                </div>
              </>
            ) : (
              <>
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
                    onClick={handleClear}
                    className="text-stone-400 transition-colors hover:text-stone-700"
                  >
                    清空
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const TodoDatePickerModal: React.FC<TodoDatePickerModalProps> = (props) => {
  if (!props.isOpen) {
    return null;
  }

  return <TodoDatePickerModalContent {...props} />;
};
