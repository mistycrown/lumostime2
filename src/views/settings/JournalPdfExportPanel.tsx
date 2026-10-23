/**
 * @file JournalPdfExportPanel.tsx
 * @input Current journal datasets and toast callback
 * @output Date/section/paper selection and cancellable PDF export controls
 * @pos Settings (Data Management)
 * @updated 2026-10-23: Adds configurable offline journal PDF export alongside Excel.
 * @updated 2026-10-23: Replaces date pickers with eight-digit entry and adds complete current/previous periods.
 * @updated 2026-10-23: Defaults to daily detail and labels the whole-book A4 landscape orientation.
 * @updated 2026-10-23: Uses flat Radix controls with half-pixel borders and concise labels.
 */
import React, { useEffect, useRef, useState } from 'react';
import './JournalPdfExportPanel.css';
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
    <section aria-label="手账 PDF 导出" className="journal-export">
      <h3>导出手账 PDF</h3>
      <fieldset disabled={isExporting}>
        <legend className="sr-only">PDF 导出选项</legend>
        <div className="journal-export-dates">
          <label>起始日期<input aria-label="PDF 起始日期" type="text" inputMode="numeric" maxLength={8} placeholder="YYYYMMDD" value={startInput} onChange={(event) => { const value = event.target.value.replace(/\D/g, '').slice(0, 8); setStartInput(value); update({ startDate: parseJournalDateInput(value) }); }} /></label>
          <label>结束日期<input aria-label="PDF 结束日期" type="text" inputMode="numeric" maxLength={8} placeholder="YYYYMMDD" value={endInput} onChange={(event) => { const value = event.target.value.replace(/\D/g, '').slice(0, 8); setEndInput(value); update({ endDate: parseJournalDateInput(value) }); }} /></label>
        </div>
        <div className="journal-export-shortcuts" aria-label="PDF 日期快捷选择">
          {([['today', '今天'], ['week', '本周'], ['lastWeek', '上周'], ['month', '本月'], ['lastMonth', '上月'], ['year', '本年'], ['lastYear', '去年'], ['all', '全部']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => quickRange(id)}>{label}</button>)}
        </div>
        <div className="journal-export-section">
          <div className="journal-export-section-title"><span>导出内容</span><button type="button" onClick={() => update({ sections: options.sections.length === JOURNAL_SECTIONS.length ? [] : JOURNAL_SECTIONS.map((item) => item.id) })}>{options.sections.length === JOURNAL_SECTIONS.length ? '清空' : '全选'}</button></div>
          <div className="journal-export-options">{JOURNAL_SECTIONS.map((section) => <label key={section.id}><input type="checkbox" checked={options.sections.includes(section.id)} onChange={() => toggleSection(section.id)} />{section.label}</label>)}</div>
        </div>
        <div className="journal-export-paper"><label htmlFor="journal-paper-size">纸张</label><select id="journal-paper-size" value={options.paperSize} onChange={(event) => update({ paperSize: event.target.value as 'a4' | 'a5' })}><option value="a4">A4 横版</option><option value="a5">A5 竖版</option></select></div>
        <div className="journal-export-options"><label><input type="checkbox" checked={options.includeCover} onChange={(event) => update({ includeCover: event.target.checked })} />封面</label><label><input type="checkbox" checked={options.includeEmptyDays} onChange={(event) => update({ includeEmptyDays: event.target.checked })} />保留空白日期</label></div>
      </fieldset>
      {error && <p role="alert" className="journal-export-error">{error}</p>}
      {progress && <div role="status" aria-live="polite" className="journal-export-progress">{progress.message}{progress.pages > 0 ? `  ${progress.pages} 页` : ''}</div>}
      <div className="journal-export-actions"><button type="button" onClick={handleExport} disabled={isExporting || Boolean(error)}>{isExporting ? '导出中…' : '导出手账 PDF'}</button>{isExporting && <button type="button" disabled={isCancelling || progress?.message === '正在保存 PDF'} onClick={() => { setIsCancelling(true); controller.current?.abort(); }}>{isCancelling ? '取消中…' : '取消'}</button>}</div>
    </section>
  );
};
