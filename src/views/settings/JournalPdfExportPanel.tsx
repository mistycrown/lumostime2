/**
 * @file JournalPdfExportPanel.tsx
 * @input Current journal datasets and toast callback
 * @output Date/page/paper selection, shared appearance controls and cancellable PDF export
 * @pos Settings (Data Management)
 * @updated 2026-10-23: Adds configurable offline journal PDF export alongside Excel.
 * @updated 2026-10-23: Replaces date pickers with eight-digit entry and adds complete current/previous periods.
 * @updated 2026-10-23: Defaults to daily detail and labels the whole-book A4 landscape orientation.
 * @updated 2026-10-23: Uses flat Radix controls with half-pixel borders and concise labels.
 * @updated 2026-10-24: Adds verified theme/two-font controls, nineteen independent parts and the shared dropdown.
 * @updated 2026-10-24: Uses page-level selection, neutral settings controls and the shared color palette without overriding dropdown styles.
 */
import React, { useEffect, useRef, useState } from 'react';
import './JournalPdfExportPanel.css';
import type { ToastType } from '../../components/Toast';
import { JOURNAL_PAGE_GROUPS, journalPartsForPages, journalSectionsForParts, getJournalQuickRange, parseJournalDateInput, validateJournalOptions, type JournalExportData, type JournalExportOptions, type JournalRangePreset, type JournalPageId } from '../../utils/journalExport';
import type { JournalPdfProgress } from '../../services/journalPdfService';
import { CustomSelect } from '../../components/CustomSelect';
import { RedemptionService } from '../../services/redemptionService';
import { fontService, type FontOption } from '../../services/fontService';
import { BookOpen, ChevronDown } from 'lucide-react';
import { ColorPalettePicker } from '../../components/ColorPalettePicker';

const pageItems = JOURNAL_PAGE_GROUPS.flatMap<typeof JOURNAL_PAGE_GROUPS[number]['items'][number]>((group) => group.items);
const allPages = pageItems.map((item) => item.id);

interface JournalPdfExportPanelProps {
  data: JournalExportData;
  onToast: (type: ToastType, message: string) => void;
}

export const JournalPdfExportPanel: React.FC<JournalPdfExportPanelProps> = ({ data, onToast }) => {
  const [options, setOptions] = useState<JournalExportOptions>(() => {
    return {
      ...getJournalQuickRange(data, 'month'),
      sections: ['yearly', 'monthly', 'weekly', 'daily', 'timeline', 'logs', 'checks', 'reviews'],
      parts: journalPartsForPages(allPages),
      accentColor: '#000000', printedFontId: 'default', contentFontId: 'lxgw-wenkai',
      paperSize: 'a4', includeCover: true, includeEmptyDays: false
    };
  });
  const [startInput, setStartInput] = useState(() => options.startDate.replace(/-/g, ''));
  const [endInput, setEndInput] = useState(() => options.endDate.replace(/-/g, ''));
  const [progress, setProgress] = useState<JournalPdfProgress | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [fonts, setFonts] = useState<FontOption[]>([]);
  const [useThemeColor, setUseThemeColor] = useState(true);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const themeColor = () => {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
    return /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
  };
  const [isExporting, setIsExporting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    void new RedemptionService().isVerified().then(async ({ isVerified }) => {
      if (!mounted.current) return;
      setUnlocked(isVerified);
      if (isVerified) {
        setOptions((previous) => ({ ...previous, accentColor: themeColor() }));
        const available = await fontService.refreshCustomFonts();
        if (mounted.current) setFonts(available);
      }
    }).catch(() => { if (mounted.current) setUnlocked(false); });
    return () => { mounted.current = false; controller.current?.abort(); };
  }, []);
  const update = (patch: Partial<JournalExportOptions>) => setOptions((previous) => ({ ...previous, ...patch }));
  const selectedPages = pageItems.filter((item) => item.parts.every((part) => options.parts!.includes(part))).map((item) => item.id);
  const setPages = (pages: JournalPageId[]) => {
    const parts = journalPartsForPages(pages);
    update({ parts, sections: journalSectionsForParts(parts) });
  };
  const togglePage = (page: JournalPageId) => setPages(selectedPages.includes(page) ? selectedPages.filter((item) => item !== page) : [...selectedPages, page]);
  const selectColor = (color: string) => {
    // PDF accents are opaque on paper; flatten optional custom-color alpha onto white.
    const alpha = color.length === 9 ? parseInt(color.slice(7), 16) / 255 : 1;
    const accentColor = '#' + [1, 3, 5].map((offset) => Math.round(parseInt(color.slice(offset, offset + 2), 16) * alpha + 255 * (1 - alpha)).toString(16).padStart(2, '0')).join('');
    setUseThemeColor(false);
    update({ accentColor });
    setColorPickerOpen(false);
  };
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
      const appearance = unlocked ? { accentColor: useThemeColor ? themeColor() : options.accentColor, printedFontId: options.printedFontId, contentFontId: options.contentFontId } : { accentColor: '#000000', printedFontId: 'default', contentFontId: 'lxgw-wenkai' };
      const result = await exportJournalPdf(data, { ...options, ...appearance }, (value) => { if (mounted.current) setProgress(value); }, abort.signal);
      if (mounted.current) onToast('success', `手账 PDF 导出成功，共 ${result.pageCount} 页${result.savedPath ? `：${result.savedPath}` : ''}`);
    } catch (cause) {
      if (mounted.current) onToast(abort.signal.aborted ? 'info' : 'error', abort.signal.aborted ? '已取消 PDF 导出' : `PDF 导出失败：${cause instanceof Error ? cause.message : '请重试'}`);
    } finally {
      controller.current = null;
      if (mounted.current) { setIsExporting(false); setIsCancelling(false); setProgress(null); }
    }
  };
  return (
    <section aria-label="手账 PDF 导出" className="journal-export bg-white rounded-2xl p-6 shadow-sm text-stone-700">
      <div className="flex items-center gap-3 text-stone-600 mb-6"><BookOpen size={24} className="shrink-0" /><h3 className="font-bold text-lg">导出手账 PDF</h3></div>
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
          <div className="journal-export-section-title"><span>导出页面</span><button type="button" onClick={() => setPages(selectedPages.length === allPages.length ? [] : allPages)}>{selectedPages.length === allPages.length ? '清空' : '全选'}</button></div>
          {JOURNAL_PAGE_GROUPS.map((group) => <div className="journal-export-part-group" key={group.label}><h4>{group.label}</h4><div className="journal-export-options">{group.items.map((item) => <label key={item.id}><input type="checkbox" checked={selectedPages.includes(item.id)} onChange={() => togglePage(item.id)} />{item.label}</label>)}</div></div>)}
        </div>
        <div className="journal-export-paper"><span>纸张</span><CustomSelect ariaLabel="PDF 纸张" disabled={isExporting} value={options.paperSize} options={[{ value: 'a4', label: 'A4 横版' }, { value: 'a5', label: 'A5 竖版' }]} onChange={(value) => update({ paperSize: value as 'a4' | 'a5' })} /></div>
        {unlocked && <div className="journal-export-appearance">
          <div>
            <div className="journal-export-paper"><span>主题色</span><button type="button" aria-label="PDF 主题色" aria-expanded={colorPickerOpen} onClick={() => setColorPickerOpen(!colorPickerOpen)} className="theme-select-trigger flex w-[min(66%,240px)] min-w-0 items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-900 hover:border-stone-300"><span className="flex min-w-0 items-center gap-2"><span className="h-4 w-4 shrink-0 rounded-full border border-stone-300" style={{ backgroundColor: useThemeColor ? themeColor() : options.accentColor }} /><span className="truncate">{useThemeColor ? '主题色' : options.accentColor?.toUpperCase()}</span></span><ChevronDown size={16} className="shrink-0 text-stone-400" /></button></div>
            {colorPickerOpen && <div className="journal-export-palette">
              <button type="button" aria-pressed={useThemeColor} className="mb-4 flex items-center gap-2 text-sm text-stone-700" onClick={() => { setUseThemeColor(true); setColorPickerOpen(false); }}><span className="h-4 w-4 rounded-full border border-stone-300" style={{ backgroundColor: themeColor() }} />主题色</button>
              <ColorPalettePicker value={useThemeColor ? undefined : options.accentColor} onChange={selectColor} />
            </div>}
          </div>
          <div className="journal-export-paper"><span>排版字体</span><CustomSelect ariaLabel="PDF 排版字体" disabled={isExporting} value={options.printedFontId!} options={fonts.map((font) => ({ value: font.id, label: font.id === 'default' ? '默认黑体' : font.displayName }))} onChange={(value) => update({ printedFontId: value })} /></div>
          <div className="journal-export-paper"><span>内容字体</span><CustomSelect ariaLabel="PDF 内容字体" disabled={isExporting} value={options.contentFontId!} options={fonts.map((font) => ({ value: font.id, label: font.id === 'default' ? '默认黑体' : font.displayName }))} onChange={(value) => update({ contentFontId: value })} /></div>
        </div>}
        <div className="journal-export-options"><label><input type="checkbox" checked={options.includeCover} onChange={(event) => update({ includeCover: event.target.checked })} />封面</label><label><input type="checkbox" checked={options.includeEmptyDays} onChange={(event) => update({ includeEmptyDays: event.target.checked })} />保留空白日期</label></div>
      </fieldset>
      {error && <p role="alert" className="journal-export-error">{error}</p>}
      {progress && <div role="status" aria-live="polite" className="journal-export-progress">{progress.message}{progress.pages > 0 ? `  ${progress.pages} 页` : ''}</div>}
      <div className="journal-export-actions"><button type="button" onClick={handleExport} disabled={isExporting || Boolean(error)}>{isExporting ? '导出中…' : '导出手账 PDF'}</button>{isExporting && <button type="button" disabled={isCancelling || progress?.message === '正在保存 PDF'} onClick={() => { setIsCancelling(true); controller.current?.abort(); }}>{isCancelling ? '取消中…' : '取消'}</button>}</div>
    </section>
  );
};
