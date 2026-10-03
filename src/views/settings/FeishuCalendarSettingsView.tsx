/**
 * @file FeishuCalendarSettingsView.tsx
 * @input Cookie-bound Feishu connection, local logs/categories and back navigation callback.
 * @output User authorization, category calendars, explicit test/Log imports and eight-digit date range.
 * @pos Settings / Data and Sync.
 * @description Polls authorization status only while waiting; never automatically imports events.
 * @updated 2026-10-03: Exports log attributes, ratings and resolved todo/scope names in calendar descriptions.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { CalendarDays, CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
import {
  getFeishuConnection, importFeishuLogs, requestFeishu, startFeishuAuthorization, testFeishuCalendar,
  type FeishuConnectionStatus, type FeishuTestRequest, type FeishuTestResult
} from '../../services/feishuCalendarClient';
import { FEISHU_IMPORT_PRESETS, getFeishuImportPreset, getFeishuImportRangeBounds } from '../../utils/feishuImportRange';
import { prepareFeishuLogImport } from '../../utils/feishuLogImport';
import { useCategoryScope } from '../../contexts/CategoryScopeContext';
import { useData } from '../../contexts/DataContext';
import { FeishuConnectionPanel } from '../../components/FeishuConnectionPanel';

const PENDING_KEY = 'lumos_feishu_pending_test';

export const FeishuCalendarSettingsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { categories, scopes, isReady: categoriesReady } = useCategoryScope();
  const { logs, todos, isReady: logsReady, usesFallbackSeedData } = useData();
  const [connection, setConnection] = useState<FeishuConnectionStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FeishuTestResult | null>(null);
  const [importRange, setImportRange] = useState(() => getFeishuImportPreset('thisWeek'));
  const [testCategoryId, setTestCategoryId] = useState('');
  const [importSummary, setImportSummary] = useState<{ created: number; skipped: number; failed: number; processed: number; total: number; errors: string[] } | null>(null);
  const locked = useRef(false);
  const mounted = useRef(true);
  const pending = useRef<{ target: string; request: FeishuTestRequest } | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    void getFeishuConnection().then((status) => { if (!cancelled) setConnection(status); })
      .catch((failure) => { if (!cancelled) setError(failure.message); });
    return () => { cancelled = true; mounted.current = false; };
  }, []);

  useEffect(() => {
    if (connection?.status !== 'pending') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const version = generation.current;
      try {
        const status = await getFeishuConnection();
        if (!cancelled && version === generation.current) {
          setConnection(status);
          setError('');
        }
      } catch (failure) {
        if (!cancelled && version === generation.current) setError(failure instanceof Error ? failure.message : '连接状态读取失败。');
      }
      if (!cancelled) timer = setTimeout(poll, 2500);
    };
    timer = setTimeout(poll, 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [connection?.status]);

  const clearTest = () => {
    pending.current = null;
    setResult(null);
    try { sessionStorage.removeItem(PENDING_KEY); } catch { /* Optional non-secret retry persistence. */ }
  };

  const perform = async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    generation.current++;
    setBusy(true);
    setError('');
    try { await action(); }
    catch (failure) {
      if (mounted.current) {
        setError(failure instanceof Error ? failure.message : '飞书操作失败，请重试。');
        // A revoked or expired connection is reflected immediately without importing again.
        try { setConnection(await getFeishuConnection()); } catch { /* Preserve the actionable original error. */ }
      }
    } finally {
      locked.current = false;
      generation.current++;
      if (mounted.current) setBusy(false);
    }
  };

  const connect = () => {
    if (locked.current) return;
    if (connection?.configured === false) {
      setError('LumosTime 的飞书连接服务尚未开通，暂时无法打开授权页。');
      return;
    }
    // Reserve the Web popup during the click; async OAuth setup must not lose user activation.
    const native = Capacitor.isNativePlatform();
    const desktop = Boolean(window.feishuConnection);
    const popup = !native && !desktop ? window.open('about:blank', '_blank') : null;
    if (!native && !desktop && !popup) { setError('请允许打开飞书授权窗口后重试。'); return; }
    if (popup) popup.opener = null;
    void perform(async () => {
      clearTest();
      try {
        const url = await startFeishuAuthorization();
        if (!mounted.current) { popup?.close(); return; }
        setConnection(await getFeishuConnection());
        if (native) window.location.assign(url);
        else if (desktop) window.open(url, '_blank');
        else if (popup && !popup.closed) popup.location.replace(url);
        else throw new Error('授权窗口已关闭，请重新连接。');
      } catch (failure) { popup?.close(); throw failure; }
    });
  };

  const handleTest = () => void perform(async () => {
    if (connection?.status !== 'connected') throw new Error('请先连接飞书。');
    const category = categories.find((item) => item.id === testCategoryId) || categories.find((item) => !item.isArchived);
    const descriptor = category ? { id: category.id, name: category.name.slice(0, 80), color: /^#[0-9a-f]{6}$/i.test(category.themeColor) ? category.themeColor : '#8b7c6b' } : undefined;
    const target = `${connection.accountId}:${category?.id || connection.calendarId}`;
    setResult(null);
    if (pending.current?.target !== target) pending.current = null;
    if (!pending.current) {
      try {
        const saved = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
        if (saved?.target === target && typeof saved.request?.requestId === 'string'
          && Math.abs(saved.request.startTime - Date.now()) < 86400000) pending.current = saved;
      } catch { /* Storage may be unavailable. */ }
    }
    if (!pending.current) pending.current = {
      target, request: { requestId: crypto.randomUUID(), startTime: Math.ceil((Date.now() + 5 * 60000) / 60000) * 60000,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai', category: descriptor }
    };
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending.current)); } catch { /* In-memory retries remain available. */ }
    const response = await testFeishuCalendar(pending.current.request);
    pending.current = null;
    try { sessionStorage.removeItem(PENDING_KEY); } catch { /* Optional persistence. */ }
    if (mounted.current) setResult(response);
    const status = await getFeishuConnection();
    if (mounted.current) setConnection(status);
  });

  const handleImport = () => void perform(async () => {
    if (connection?.status !== 'connected') throw new Error('请先连接飞书。');
    if (!logsReady || !categoriesReady || usesFallbackSeedData) throw new Error('本地记录尚未准备好，请稍后重试。');
    const candidates = prepareFeishuLogImport(logs, categories, importRange, { todos, scopes });
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
    const summary = { created: 0, skipped: 0, failed: 0, processed: 0, total: candidates.records.length, errors: [] as string[] };
    setImportSummary({ ...summary });
    for (let offset = 0; offset < candidates.records.length; offset += 5) {
      if (!mounted.current) break;
      const records = candidates.records.slice(offset, offset + 5);
      const categoryIds = new Set(records.map((record) => record.categoryId));
      const response = await importFeishuLogs({ records, categories: candidates.categories.filter((category) => categoryIds.has(category.id)), timezone, range: candidates.range });
      response.results.forEach((item) => {
        if (item.status === 'created') summary.created++;
        else if (item.status === 'skipped') summary.skipped++;
        else { summary.failed++; if (item.error && !summary.errors.includes(item.error)) summary.errors.push(item.error); }
      });
      summary.processed += records.length;
      if (mounted.current) setImportSummary({ ...summary, errors: [...summary.errors] });
    }
    const status = await getFeishuConnection();
    if (mounted.current) setConnection(status);
  });

  let rangeError = '';
  let importCandidates: ReturnType<typeof prepareFeishuLogImport> | null = null;
  try { getFeishuImportRangeBounds(importRange); importCandidates = prepareFeishuLogImport(logs, categories, importRange, { todos, scopes }); }
  catch (failure) { rangeError = failure instanceof Error ? failure.message : '请选择有效的日期范围。'; }
  const timeLabel = (time: number) => new Date(time).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: result?.timezone
  });

  return (
    <div className="sync-settings-view fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif pt-[var(--app-safe-area-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center gap-3 px-4 h-14 shrink-0 border-b border-stone-100">
        <button onClick={onBack} aria-label="返回设置" className="text-stone-400 hover:text-stone-600 p-1"><ChevronLeft size={24} /></button>
        <h2 className="text-stone-800 font-bold text-lg">飞书日历</h2>
      </div>
      <div className="p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center gap-3 text-stone-600"><CalendarDays size={24} /><h3 className="font-bold text-lg">连接飞书日历</h3></div>
        <details className="text-sm text-stone-600">
          <summary className="cursor-pointer">连接与导入步骤</summary>
          <ol className="mt-3 list-decimal pl-5 space-y-2 leading-relaxed">
            <li>点击“连接飞书”，在打开的飞书网页中登录并同意授权。</li>
            <li>返回这里，看到“已连接”后，点击“测试导入一个日程”。</li>
            <li>测试成功后，在飞书日历中查看测试日程。</li>
            <li>填写八位数字的开始和结束日期，例如 20261002，或选择快捷范围，点击“导入到飞书日历”。</li>
          </ol>
        </details>
        <FeishuConnectionPanel connection={connection} busy={busy} onConnect={connect} onDisconnect={() => void perform(async () => {
          await requestFeishu('disconnect'); clearTest(); setImportSummary(null); if (mounted.current) setConnection(await getFeishuConnection());
        })} />
        {connection?.status === 'connected' && (
          <>
            <p className="text-sm text-stone-600">按活动分类自动创建日历，并使用分类颜色。</p>
            <label className="block space-y-2 text-sm text-stone-600">
              <span>测试分类</span>
              <select value={testCategoryId || categories.find((category) => !category.isArchived)?.id || ''} disabled={busy} onChange={(event) => {
                setTestCategoryId(event.target.value); clearTest();
              }} className="w-full bg-transparent border-b border-stone-300 py-2 outline-none">
                {categories.filter((category) => !category.isArchived).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                {!categories.some((category) => !category.isArchived) && <option value="">主日历</option>}
              </select>
            </label>
            <button onClick={handleTest} disabled={busy} aria-busy={busy} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-800 text-white text-sm disabled:opacity-50">
              {busy && <Loader2 size={16} className="animate-spin" />}{busy ? '正在处理…' : result ? '再次测试导入' : '测试导入一个日程'}
            </button>
          </>
        )}
        {(error || connection?.error && connection.configured) && <p role="alert" className="text-sm text-red-600 leading-relaxed">{error || connection?.error}</p>}
        {result && <div role="status" className="border-t border-stone-200 pt-5 space-y-3 text-sm text-stone-600">
          <p className="flex items-center gap-2 text-green-700"><CheckCircle2 size={18} />测试导入成功</p>
          <dl className="space-y-2">
            <div><dt className="text-stone-400">目标日历</dt><dd>{result.calendarName}</dd></div>
            <div><dt className="text-stone-400">测试时间</dt><dd>{timeLabel(result.startTime)} — {timeLabel(result.endTime)}</dd></div>
            <div><dt className="text-stone-400">日程编号</dt><dd className="break-all font-sans text-xs">{result.eventId}</dd></div>
          </dl>
        </div>}
        <section className="border-t border-stone-200 pt-6 space-y-4" aria-labelledby="feishu-import-range-title">
          <h3 id="feishu-import-range-title" className="font-bold text-lg text-stone-600">导入时间范围</h3>
          <div className="flex flex-wrap gap-2">{FEISHU_IMPORT_PRESETS.map((preset) => (
            <button key={preset.key} type="button" onClick={() => { setImportRange(getFeishuImportPreset(preset.key)); setImportSummary(null); }}
              disabled={busy} className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg disabled:opacity-50">{preset.label}</button>
          ))}</div>
          <div className="grid grid-cols-2 gap-4">{(['startDate', 'endDate'] as const).map((field) => (
            <label key={field} className="block min-w-0 space-y-2 text-sm text-stone-600">
              <span>{field === 'startDate' ? '开始日期' : '结束日期'}</span>
              <input type="text" inputMode="numeric" maxLength={8} pattern="[0-9]{8}" placeholder="20261002" disabled={busy} value={importRange[field].replace(/-/g, '')}
                aria-invalid={Boolean(rangeError)} aria-describedby={rangeError ? 'feishu-import-range-error' : undefined}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
                  setImportRange((range) => ({ ...range, [field]: digits }));
                  setImportSummary(null);
                }}
                className="w-full min-w-0 bg-transparent border-b border-stone-300 py-2 outline-none font-sans" />
            </label>
          ))}</div>
          {rangeError && <p id="feishu-import-range-error" role="alert" className="text-sm text-red-600">{rangeError}</p>}
          {importCandidates && <p className="text-sm text-stone-500">范围内 {importCandidates.records.length} 条记录 · {importCandidates.categories.length} 个分类</p>}
          {importCandidates && connection?.status === 'connected' && <dl className="space-y-2 text-sm text-stone-600">
            {importCandidates.categories.map((category) => <div key={category.id} className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />{category.name}</dt>
              <dd className="text-stone-400">{connection.categoryCalendars?.find((calendar) => calendar.categoryId === category.id)?.name || `LumosTime · ${category.name}`}</dd>
            </div>)}
          </dl>}
          <button disabled={busy || connection?.status !== 'connected' || Boolean(rangeError) || !importCandidates?.records.length || !logsReady || !categoriesReady || usesFallbackSeedData}
            onClick={handleImport} aria-busy={busy} className="w-full py-3 rounded-xl bg-stone-800 text-white text-sm disabled:opacity-50">
            {busy && importSummary ? `正在导入 ${importSummary.processed}/${importSummary.total}…` : '导入到飞书日历'}
          </button>
          {importSummary && <div role="status" className="text-sm text-stone-600 space-y-2">
            <p>新增 {importSummary.created} · 已导入跳过 {importSummary.skipped} · 失败 {importSummary.failed}</p>
            {importSummary.processed < importSummary.total && !busy && <p>已处理 {importSummary.processed}/{importSummary.total}，再次导入将核查并继续。</p>}
            {importSummary.errors.map((message) => <p key={message} className="text-red-600">{message}</p>)}
          </div>}
        </section>
      </div>
    </div>
  );
};
