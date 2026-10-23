/**
 * @file JournalPdfExportPanel.tsx
 * @input Current journal datasets and toast callback
 * @output Date/section/paper selection and cancellable PDF export controls
 * @pos Settings (Data Management)
 * @updated 2026-10-23: Adds configurable offline journal PDF export alongside Excel.
 * @updated 2026-10-23: Replaces date pickers with eight-digit entry and adds complete current/previous periods.
 * @updated 2026-10-23: Defaults to daily detail and labels the whole-book A4 landscape orientation.
 */
import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Download, Loader2 } from 'lucide-react';
import type { ToastType } from '../../components/Toast';
import { JOURNAL_SECTIONS, getJournalQuickRange, parseJournalDateInput, validateJournalOptions, type JournalExportData, type JournalExportOptions, type JournalRangePreset, type JournalSection } from '../../utils/journalExport';
import type { JournalPdfProgress } from '../../services/journalPdfService';

interface JournalPdfExportPanelProps {
  data: JournalExportData;
  onToast: (type: ToastType, message: string) => void;
}

export const JournalPdfExportPanel: React.FC<JournalPdfExportPanelProps> = ({ data, onToast }) => {
  const [options, setOptions] = useState<JournalExportOptions>(() => {
    return {
      ...getJournalQuickRange(data, 'month'),
      sections: ['yearly', 'monthly', 'weekly', 'daily', 'timeline', 'logs', 'checks', 'reviews'],
      paperSize: 'a4', includeCover: true, includeEmptyDays: false
    };
  });
  const [startInput, setStartInput] = useState(() => options.startDate.replace(/-/g, ''));
  const [endInput, setEndInput] = useState(() => options.endDate.replace(/-/g, ''));
  const [progress, setProgress] = useState<JournalPdfProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); };
  }, []);
  const update = (patch: Partial<JournalExportOptions>) => setOptions((previous) => ({ ...previous, ...patch }));
  const toggleSection = (section: JournalSection) => update({ sections: options.sections.includes(section) ? options.sections.filter((item) => item !== section) : [...options.sections, section] });
  const quickRange = (range: JournalRangePreset) => {
    const dates = getJournalQuickRange(data, range);
    setStartInput(dates.startDate.replace(/-/g, ''));
    setEndInput(dates.endDate.replace(/-/g, ''));
    update(dates);
  };
  const error = validateJournalOptions(options);
  const handleExport = async () => {
    if (controller.current) return;
    if (error) { onToast('error', error); return; }
    const abort = new AbortController();
    controller.current = abort;
    setIsExporting(true);
    setIsCancelling(false);
    setProgress({ message: '正在准备手账', pages: 0 });
    try {
      const { exportJournalPdf } = await import('../../services/journalPdfService');
      const result = await exportJournalPdf(data, options, (value) => { if (mounted.current) setProgress(value); }, abort.signal);
      if (mounted.current) onToast('success', `手账 PDF 导出成功，共 ${result.pageCount} 页${result.savedPath ? `：${result.savedPath}` : ''}`);
    } catch (cause) {
      if (mounted.current) onToast(abort.signal.aborted ? 'info' : 'error', abort.signal.aborted ? '已取消 PDF 导出' : `PDF 导出失败：${cause instanceof Error ? cause.message : '请重试'}`);
    } finally {
      controller.current = null;
      if (mounted.current) { setIsExporting(false); setIsCancelling(false); setProgress(null); }
    }
  };
  return (
    <section aria-label="手账 PDF 导出" className="bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-sm text-stone-800 dark:text-stone-100">
      <div className="flex items-center gap-3 mb-6"><BookOpen size={24} /><h3 className="font-bold text-lg">导出为手账 PDF</h3></div>
      <fieldset disabled={isExporting} className="space-y-5 disabled:opacity-60">
        <legend className="sr-only">PDF 导出选项</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="min-w-0 text-xs text-stone-500 dark:text-stone-400">起始日期
            <input aria-label="PDF 起始日期" type="text" inputMode="numeric" maxLength={8} placeholder="YYYYMMDD" value={startInput} onChange={(event) => { const value = event.target.value.replace(/\D/g, '').slice(0, 8); setStartInput(value); update({ startDate: parseJournalDateInput(value) }); }} className="mt-2 block w-full min-w-0 rounded-lg border border-stone-200 dark:border-stone-700 bg-transparent px-3 py-2.5 text-sm font-mono text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300" />
          </label>
          <label className="min-w-0 text-xs text-stone-500 dark:text-stone-400">结束日期
            <input aria-label="PDF 结束日期" type="text" inputMode="numeric" maxLength={8} placeholder="YYYYMMDD" value={endInput} onChange={(event) => { const value = event.target.value.replace(/\D/g, '').slice(0, 8); setEndInput(value); update({ endDate: parseJournalDateInput(value) }); }} className="mt-2 block w-full min-w-0 rounded-lg border border-stone-200 dark:border-stone-700 bg-transparent px-3 py-2.5 text-sm font-mono text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300" />
          </label>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="PDF 日期快捷选择">
          {([['today', '今天'], ['week', '本周'], ['lastWeek', '上周'], ['month', '本月'], ['lastMonth', '上月'], ['year', '本年'], ['lastYear', '去年'], ['all', '全部']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => quickRange(id)} className="px-3 py-1.5 text-xs bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg">{label}</button>)}
        </div>
        <div>
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-700 pb-2 mb-2">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 tracking-widest">导出章节</span>
            <button type="button" onClick={() => update({ sections: options.sections.length === JOURNAL_SECTIONS.length ? [] : JOURNAL_SECTIONS.map((item) => item.id) })} className="text-xs py-1 px-2 hover:text-stone-500">{options.sections.length === JOURNAL_SECTIONS.length ? '清空' : '全选'}</button>
          </div>
          <div className="grid grid-cols-2 gap-x-3">
            {JOURNAL_SECTIONS.map((section) => <label key={section.id} className="flex items-center gap-2 py-2.5 text-sm cursor-pointer"><input type="checkbox" checked={options.sections.includes(section.id)} onChange={() => toggleSection(section.id)} className="h-4 w-4 accent-stone-700 shrink-0" />{section.label}</label>)}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-800 pt-4">
          <label htmlFor="journal-paper-size" className="text-sm">纸张</label>
          <select id="journal-paper-size" value={options.paperSize} onChange={(event) => update({ paperSize: event.target.value as 'a4' | 'a5' })} className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm"><option value="a4">A4 · 全书横版</option><option value="a5">A5 · 竖版跨页</option></select>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 pb-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={options.includeCover} onChange={(event) => update({ includeCover: event.target.checked })} className="h-4 w-4 accent-stone-700" />封面</label>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={options.includeEmptyDays} onChange={(event) => update({ includeEmptyDays: event.target.checked })} className="h-4 w-4 accent-stone-700" />保留空白日期</label>
        </div>
      </fieldset>
      {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {progress && <div role="status" aria-live="polite" className="mt-4 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400"><Loader2 size={14} className="animate-spin shrink-0" />{progress.message}{progress.pages > 0 ? ` · ${progress.pages} 页` : ''}</div>}
      <div className="mt-5 flex gap-3">
        <button type="button" onClick={handleExport} disabled={isExporting || Boolean(error)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 font-medium hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"><Download size={18} />{isExporting ? '导出中…' : '导出手账 PDF'}</button>
        {isExporting && <button type="button" disabled={isCancelling || progress?.message === '正在保存 PDF'} onClick={() => { setIsCancelling(true); controller.current?.abort(); }} className="px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 text-sm disabled:opacity-50">{isCancelling ? '取消中…' : '取消'}</button>}
      </div>
    </section>
  );
};
