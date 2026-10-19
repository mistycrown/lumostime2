/**
 * @file TodoReminderModal.tsx
 * @input Source date, optional date-relative reminder and save/close callbacks
 * @output Accessible print-style reminder date/time editor and permission actions
 * @pos Component (Modal)
 * @updated 2026-10-18: Adds opt-in system calendar reminders with explicit permission and calendar-only saving.
 * @updated 2026-10-18: Matches AddLog's numeric hour/minute inputs and auto-advances after two hour digits.
 * @updated 2026-10-17: Reuses date-picker surfaces and theme colors for independent local reminders.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Bell, BellOff, CalendarDays, Check, X } from 'lucide-react';
import type { TodoReminderField, TodoReminderSetting } from '../types';
import type { TodoReminderStatus } from '../plugins/TodoReminderPlugin';
import { todoReminderService, TODO_REMINDER_STATUS_EVENT } from '../services/todoReminderService';
import { getReminderDaysBefore, getTodoReminderDate, getTodoReminderTimestamp, TODO_REMINDER_LABELS } from '../utils/todoReminderUtils';
import { registerHardwareBackHandler } from '../utils/hardwareBackHandlerStack';
import { TodoDatePickerModal } from './TodoDatePickerModal';
import { useToast } from '../contexts/ToastContext';

interface TodoReminderModalProps {
  field: TodoReminderField;
  date: string;
  value?: TodoReminderSetting;
  onSave: (value?: TodoReminderSetting) => void;
  onClose: () => void;
}

export const TodoReminderModal: React.FC<TodoReminderModalProps> = ({ field, date, value, onSave, onClose }) => {
  const [reminderDate, setReminderDate] = useState(getTodoReminderDate(date, value?.daysBefore || 0) || date);
  const [time, setTime] = useState(value?.time || '09:00');
  const [showCalendar, setShowCalendar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<TodoReminderStatus | null>(null);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [calendarSync, setCalendarSync] = useState(value?.calendarSync === true);
  const [requestingCalendar, setRequestingCalendar] = useState(false);
  const [calendarRequested, setCalendarRequested] = useState(false);
  const [error, setError] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const minuteInput = useRef<HTMLInputElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const calendarOpen = useRef(false);
  calendarOpen.current = showCalendar;
  const { addToast } = useToast();
  const daysBefore = getReminderDaysBefore(date, reminderDate);
  const [hours, minutes] = time.split(':');

  const changeTimeSegment = (field: 'h' | 'm', rawValue: string) => {
    // Match AddLogModal: replace the selected segment, retain the last two digits and clamp its range.
    const digits = rawValue.replace(/\D/g, '').slice(-2);
    if (!digits) return;
    const segment = String(Math.min(field === 'h' ? 23 : 59, Number(digits))).padStart(2, '0');
    setTime((previous) => {
      const [hour, minute] = previous.split(':');
      return field === 'h' ? `${segment}:${minute}` : `${hour}:${segment}`;
    });
    setError('');
    if (field === 'h' && digits.length === 2) {
      window.setTimeout(() => {
        minuteInput.current?.focus();
        minuteInput.current?.select();
      }, 0);
    }
  };

  useEffect(() => {
    let disposed = false;
    const refresh = () => {
      void todoReminderService.getStatus().then((next) => {
        if (!disposed) {
          setStatus(next);
          if (todoReminderService.getError() && !next.calendar?.error) setError('本地提醒设置失败，请重新保存重试');
        }
      }).catch(() => { if (!disposed) setError('无法读取提醒权限，请重试'); });
    };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener(TODO_REMINDER_STATUS_EVENT, refresh);
    const listener = Capacitor.isNativePlatform()
      ? App.addListener('appStateChange', ({ isActive }) => { if (isActive) refresh(); }) : undefined;
    return () => {
      disposed = true;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener(TODO_REMINDER_STATUS_EVENT, refresh);
      void listener?.then((handle) => handle.remove());
    };
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const closeTop = () => {
      if (calendarOpen.current) setShowCalendar(false);
      else closeRef.current();
      return true;
    };
    const unregister = registerHardwareBackHandler(closeTop);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeTop(); }
      if (event.key !== 'Tab') return;
      const focusRoot = calendarOpen.current ? backdrop.current?.lastElementChild : panel.current;
      const focusable = focusRoot?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      unregister();
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const requestNotifications = async () => {
    setError('');
    try {
      if (permissionRequested && !status?.notifications && status?.background) {
        await todoReminderService.openSettings('notifications');
      } else {
        setPermissionRequested(true);
        const next = await todoReminderService.requestNotifications();
        setStatus(next);
        if (!next.notifications && !next.background) setError('请在浏览器的网站设置中允许通知');
      }
    } catch { setError('无法开启通知，请在系统设置中检查'); }
  };

  const changeCalendarSync = async (enabled: boolean) => {
    setError('');
    if (!enabled) { setCalendarSync(false); return; }
    setRequestingCalendar(true);
    try {
      setCalendarRequested(true);
      const next = await todoReminderService.requestCalendar();
      setStatus(next);
      if (next.calendar?.granted && next.calendar.supported) setCalendarSync(true);
      else setError(next.calendar?.supported ? '请先允许日历权限' : '此设备暂不支持系统日历同步');
    } catch { setError('无法开启系统日历，请检查日历权限'); }
    finally { setRequestingCalendar(false); }
  };

  const save = async () => {
    const setting: TodoReminderSetting = { daysBefore: daysBefore!, time, ...(calendarSync ? { calendarSync: true } : {}) };
    const at = daysBefore === null ? null : getTodoReminderTimestamp(date, setting);
    if (at === null || at <= Date.now()) { setError('请选择未来的有效提醒时间'); return; }
    setSaving(true);
    setError('');
    try {
      let current = await todoReminderService.getStatus();
      if (!current.supported) {
        setError(current.background ? '请更新 Android 安装包以启用本地提醒' : '此设备暂不支持系统通知');
        return;
      }
      if (calendarSync && (!current.calendar?.supported || !current.calendar.granted)) {
        setStatus(current);
        setError('请先允许日历权限，或关闭系统日历同步');
        return;
      }
      if (!current.notifications && !calendarSync) {
        setPermissionRequested(true);
        current = await todoReminderService.requestNotifications();
        setStatus(current);
      }
      if (!current.notifications && !calendarSync) { setError('请先开启通知，再保存提醒'); return; }
      if (at <= Date.now()) { setError('请选择未来的有效提醒时间'); return; }
      onSave(setting);
      addToast(current.background && !current.exact && !calendarSync ? 'info' : 'success',
        calendarSync ? '已保存提醒，系统日历同步中'
          : current.background && !current.exact ? '已保存提醒时间，未开启准时提醒权限，可能延迟' : '已保存提醒时间');
      onClose();
    } catch { setError('保存提醒失败，请重试'); }
    finally { setSaving(false); }
  };

  return createPortal(
    <div ref={backdrop} className="todo-date-picker-backdrop fixed inset-0 z-[130] flex items-center justify-center bg-[rgba(245,241,236,0.72)] px-5 py-8 backdrop-blur-sm"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="todo-reminder-title"
        className="todo-date-picker max-h-[calc(100dvh-4rem)] w-full max-w-[23rem] overflow-y-auto rounded-[2rem] border border-stone-200 bg-[#fbf8f3] shadow-[0_24px_60px_rgba(0,0,0,0.08)]">
        <header className="flex items-center justify-between gap-3 border-b border-stone-200 px-6 py-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-stone-400">Reminder</p>
            <h2 id="todo-reminder-title" className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight text-stone-800">
              <Bell size={19} strokeWidth={1.5} />{TODO_REMINDER_LABELS[field]}
            </h2>
          </div>
          <button ref={closeButton} type="button" onClick={onClose} aria-label="关闭提醒设置" disabled={saving}
            className="rounded-full p-2 text-stone-400 transition-colors hover:bg-white hover:text-stone-600"><X size={18} /></button>
        </header>
        <div className="space-y-6 px-6 py-6">
          <div>
            <label className="text-xs font-medium text-stone-400">提醒日期</label>
            <button type="button" onClick={() => setShowCalendar(true)} aria-label="选择提醒日期"
              className="mt-2 flex w-full items-center justify-between border-b border-stone-200 pb-3 text-left text-xl font-medium tracking-[0.06em] text-stone-800">
              {reminderDate.replaceAll('-', '.')}<CalendarDays size={18} strokeWidth={1.5} className="text-stone-400" />
            </button>
            <div className="mt-3 flex flex-wrap gap-2">
              {[0, 1, 3].map((offset) => (
                <button key={offset} type="button" aria-pressed={daysBefore === offset}
                  onClick={() => { setReminderDate(getTodoReminderDate(date, offset)!); setError(''); }}
                  className="todo-reminder-choice rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-500 transition-colors hover:bg-white">
                  {offset === 0 ? '当天' : `提前 ${offset} 天`}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p id="todo-reminder-time-label" className="text-xs font-medium text-stone-400">提醒时刻</p>
            <div role="group" aria-labelledby="todo-reminder-time-label"
              className="mt-2 flex items-center gap-1 border-b border-stone-200 pb-3 font-mono text-4xl font-light text-stone-800 focus-within:border-stone-500">
              <input id="todo-reminder-hour" type="text" inputMode="numeric" autoComplete="off" aria-label="提醒小时"
                value={hours} onChange={(event) => changeTimeSegment('h', event.target.value)}
                onFocus={(event) => event.target.select()}
                className="w-[2.6ch] min-w-0 border-0 bg-transparent p-0 text-center outline-none" />
              <span aria-hidden="true" className="text-stone-400">:</span>
              <input ref={minuteInput} id="todo-reminder-minute" type="text" inputMode="numeric" autoComplete="off" aria-label="提醒分钟"
                value={minutes} onChange={(event) => changeTimeSegment('m', event.target.value)}
                onFocus={(event) => event.target.select()}
                className="w-[2.6ch] min-w-0 border-0 bg-transparent p-0 text-center outline-none" />
            </div>
          </div>
          {(status?.calendar?.supported || calendarSync) && (
            <div className="space-y-3 border-t border-stone-200 pt-4">
              <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 text-sm text-stone-700">
                <span className="flex items-center gap-2"><CalendarDays size={16} strokeWidth={1.5} />同步系统日历</span>
                <input type="checkbox" role="switch" aria-label="同步系统日历" checked={calendarSync}
                  disabled={saving || requestingCalendar || (!status?.calendar?.supported && !calendarSync)}
                  onChange={(event) => void changeCalendarSync(event.target.checked)}
                  className="h-5 w-5 shrink-0 accent-stone-700" />
              </label>
              {(calendarRequested || calendarSync || status?.calendar?.error) && !status?.calendar?.granted && (
                <button type="button" disabled={saving || requestingCalendar}
                  onClick={() => void todoReminderService.openSettings('calendar').catch(() => setError('无法打开日历权限设置'))}
                  className="text-xs text-stone-500 underline decoration-stone-300 underline-offset-4">日历权限设置</button>
              )}
              {status?.calendar?.error && <p role="status" className="text-xs leading-relaxed text-red-500">{status.calendar.error}</p>}
            </div>
          )}
          {status && (
            <div className="space-y-3 border-t border-stone-200 pt-4 text-xs text-stone-500" aria-label="提醒权限状态">
              {!status.supported ? <p>{status.background ? '需要更新 Android 安装包' : '此设备暂不支持系统通知'}</p>
                : !status.background && <p>应用运行时提醒</p>}
              {status.supported && !status.notifications && (
                <div className="flex items-center justify-between gap-3"><span>通知未开启</span>
                  <button type="button" onClick={() => void requestNotifications()} className="font-medium underline decoration-stone-300 underline-offset-4">
                    {permissionRequested && status.background ? '前往设置' : '开启通知'}
                  </button>
                </div>
              )}
              {status.supported && status.background && !status.exact && (
                <div className="flex items-center justify-between gap-3"><span>提醒可能延迟</span>
                  <button type="button" onClick={() => void todoReminderService.openSettings('exact').catch(() => setError('无法打开准时提醒设置'))}
                    className="font-medium underline decoration-stone-300 underline-offset-4">允许准时提醒</button>
                </div>
              )}
              {status.supported && status.background && status.notifications && status.exact && <p className="flex items-center gap-1.5"><Check size={13} />系统提醒已就绪</p>}
            </div>
          )}
          {error && <p role="alert" className="text-xs leading-relaxed text-red-500">{error}</p>}
        </div>
        <footer className="flex items-center gap-3 border-t border-stone-200 px-6 py-4">
          <button type="button" disabled={saving} onClick={() => { onSave(undefined); onClose(); }}
            className="flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-xs text-stone-400 transition-colors hover:text-stone-600 disabled:opacity-40">
            <BellOff size={14} />不提醒
          </button>
          <button type="button" disabled={saving || requestingCalendar} onClick={() => void save()}
            className="todo-reminder-save ml-auto min-h-11 rounded-full px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50">
            {saving ? '保存中…' : '保存提醒'}
          </button>
        </footer>
      </div>
      <TodoDatePickerModal isOpen={showCalendar} title="选择提醒日期" value={reminderDate} minDate="today-or-future"
        onSelect={(next) => { setReminderDate(next); setError(''); }} onClose={() => setShowCalendar(false)} />
    </div>, document.body
  );
};
