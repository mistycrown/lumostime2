/**
 * @file FeishuCalendarSettingsView.tsx
 * @input Cookie-bound Feishu connection, local logs/categories and back navigation callback.
 * @output User authorization, category calendars, explicit test/Log imports and eight-digit date range.
 * @pos Settings / Data and Sync.
 * @description Hosts authorization and manual historical import; automatic scheduling runs globally after explicit opt-in.
 * @updated 2026-10-03: Exposes automatic sync settings and broadcasts ignored-category changes to the global queue.
 * @updated 2026-10-03: Manually synchronizes updates, deletions and category moves from a complete hydrated log snapshot.
 * @updated 2026-10-03: Persists multi-select ignored categories beside the date fields and preserves their existing events.
 * @updated 2026-10-03: Opens Android authorization externally while retaining the local connection session.
 * @updated 2026-10-03: Uses compact ignored-category buttons without ambiguous color dots.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { CalendarDays, Check, CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
import {
  getFeishuConnection, getFeishuImportedLogs, importFeishuLogs, requestFeishu, startFeishuAuthorization, testFeishuCalendar,
  validateFeishuAuthorizationUrl,
  type FeishuConnectionStatus, type FeishuTestRequest, type FeishuTestResult
} from '../../services/feishuCalendarClient';
import { FEISHU_IMPORT_PRESETS, getFeishuImportPreset, getFeishuImportRangeBounds } from '../../utils/feishuImportRange';
import { prepareFeishuLogImport } from '../../utils/feishuLogImport';
import { prepareFeishuSyncPlan } from '../../utils/feishuSyncPlan';
import { useCategoryScope } from '../../contexts/CategoryScopeContext';
import { useData } from '../../contexts/DataContext';
import { FeishuConnectionPanel } from '../../components/FeishuConnectionPanel';
import { CustomSelect } from '../../components/CustomSelect';
import { FeishuAutoSyncPanel } from '../../components/FeishuAutoSyncPanel';
import { publishFeishuEvent } from '../../services/feishuAutoSyncStore';

const PENDING_KEY = 'lumos_feishu_pending_test';
const IGNORED_CATEGORIES_KEY = 'lumos_feishu_ignored_categories';

export const FeishuCalendarSettingsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { categories, scopes, isReady: categoriesReady } = useCategoryScope();
  const { logs, todos, isReady: logsReady, usesFallbackSeedData } = useData();
  const [connection, setConnection] = useState<FeishuConnectionStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FeishuTestResult | null>(null);
  const [importRange, setImportRange] = useState(() => getFeishuImportPreset('thisWeek'));
  const [ignoredCategoryIds, setIgnoredCategoryIds] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(IGNORED_CATEGORIES_KEY) || '[]');
      return Array.isArray(saved) ? [...new Set(saved.filter((id): id is string => typeof id === 'string' && /^[\w-]{1,128}$/.test(id)))].slice(0, 1000) : [];
    } catch { return []; }
  });
  const ignoredCategories = new Set(ignoredCategoryIds);
  const [testCategoryId, setTestCategoryId] = useState('');
  const [importSummary, setImportSummary] = useState<{ created: number; updated: number; moved: number; deleted: number; skipped: number; failed: number; processed: number; total: number; errors: string[] } | null>(null);
  const locked = useRef(false);
  const mounted = useRef(true);
  const pending = useRef<{ target: string; request: FeishuTestRequest } | null>(null);
  const generation = useRef(0);
  const latestData = useRef({ logs, categories, scopes, todos, logsReady, categoriesReady, usesFallbackSeedData });
  latestData.current = { logs, categories, scopes, todos, logsReady, categoriesReady, usesFallbackSeedData };
  const testCategories = categories.filter((category) => !category.isArchived);
  const selectedTestCategory = testCategories.find((category) => category.id === testCategoryId) || testCategories[0];
  const filterCategories = [...categories.map((category) => ({ id: category.id, name: category.name })),
    ...(connection?.categoryCalendars || []).filter((calendar) => !categories.some((category) => category.id === calendar.categoryId))
      .map((calendar) => ({ id: calendar.categoryId, name: calendar.categoryName || calendar.name }))];

  useEffect(() => {
    try { localStorage.setItem(IGNORED_CATEGORIES_KEY, JSON.stringify(ignoredCategoryIds)); } catch { /* Keep session choices if storage is unavailable. */ }
    publishFeishuEvent();
  }, [ignoredCategoryIds]);

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
        if (Capacitor.getPlatform() === 'android') {
          const { openNativeFeishuAuthorization } = await import('../../services/feishuAuthorization');
          await openNativeFeishuAuthorization(url);
        } else if (native) window.location.assign(url);
        else if (desktop) window.open(url, '_blank');
        else if (popup && !popup.closed) popup.location.replace(url);
        else throw new Error('授权窗口已关闭，请重新连接。');
      } catch (failure) { popup?.close(); throw failure; }
    });
  };

  const continueAuthorization = async () => {
    if (busy || !connection?.authorizationUrl) return;
    try {
      const url = validateFeishuAuthorizationUrl(connection.authorizationUrl);
      if (Capacitor.getPlatform() === 'android') {
        const { openNativeFeishuAuthorization } = await import('../../services/feishuAuthorization');
        await openNativeFeishuAuthorization(url);
      } else if (Capacitor.isNativePlatform()) window.location.assign(url);
      else {
        const popup = window.open(url, '_blank');
        if (popup) popup.opener = null;
        else if (!window.feishuConnection) setError('请允许打开飞书确认窗口后重试。');
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : '飞书确认页面无效。'); }
  };

  const handleTest = () => void perform(async () => {
    if (connection?.status !== 'connected') throw new Error('请先连接飞书。');
    const category = selectedTestCategory;
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
    setImportSummary(null);
    const snapshot = latestData.current;
    const assertCurrentSnapshot = () => {
      const current = latestData.current;
      if (!current.logsReady || !current.categoriesReady || current.usesFallbackSeedData || current.logs !== snapshot.logs
        || current.categories !== snapshot.categories || current.scopes !== snapshot.scopes || current.todos !== snapshot.todos) {
        throw new Error('本地记录已变化，已停止本次同步，请重新同步。');
      }
    };
    const references = await getFeishuImportedLogs(getFeishuImportRangeBounds(importRange));
    if (!mounted.current) return;
    assertCurrentSnapshot();
    const candidates = prepareFeishuSyncPlan(snapshot.logs, snapshot.categories, importRange, references,
      { todos: snapshot.todos, scopes: snapshot.scopes, ignoredCategoryIds: ignoredCategories });
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
    const summary = { created: 0, updated: 0, moved: 0, deleted: 0, skipped: 0, failed: 0, processed: 0,
      total: candidates.records.length + candidates.deleteIds.length, errors: [] as string[] };
    setImportSummary({ ...summary });
    const operations = [...candidates.records.map((record) => ({ record, deleteId: undefined as string | undefined })),
      ...candidates.deleteIds.map((deleteId) => ({ record: undefined, deleteId }))];
    for (let offset = 0; offset < operations.length; offset += 5) {
      if (!mounted.current) break;
      assertCurrentSnapshot();
      const slice = operations.slice(offset, offset + 5);
      const records = slice.flatMap((item) => item.record ? [item.record] : []);
      const deleteIds = slice.flatMap((item) => item.deleteId ? [item.deleteId] : []);
      const categoryIds = new Set(records.map((record) => record.categoryId));
      const response = await importFeishuLogs({ sync: true, records, deleteIds,
        ignoredCategoryIds: candidates.ignoredCategoryIds,
        categories: candidates.categories.filter((category) => categoryIds.has(category.id)), timezone, range: candidates.range });
      response.results.forEach((item) => {
        if (item.status === 'created') summary.created++;
        else if (item.status === 'updated') summary.updated++;
        else if (item.status === 'moved') summary.moved++;
        else if (item.status === 'deleted') summary.deleted++;
        else if (item.status === 'skipped') summary.skipped++;
        else { summary.failed++; if (item.error && !summary.errors.includes(item.error)) summary.errors.push(item.error); }
      });
      summary.processed += slice.length;
      if (mounted.current) setImportSummary({ ...summary, errors: [...summary.errors] });
    }
    const status = await getFeishuConnection();
    if (mounted.current) setConnection(status);
  });

  let rangeError = '';
  let importCandidates: ReturnType<typeof prepareFeishuLogImport> | null = null;
  try { getFeishuImportRangeBounds(importRange); importCandidates = prepareFeishuLogImport(logs, categories, importRange, { todos, scopes, ignoredCategoryIds: ignoredCategories }); }
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
            <li>点击“连接飞书”，在飞书网页中登录并确认创建你自己的专属应用。</li>
            <li>返回这里，点击“授权飞书日历”，在飞书网页中同意日历授权。</li>
            <li>返回这里，看到“已连接”后，点击“测试导入一个日程”。</li>
            <li>测试成功后，在飞书日历中查看测试日程。</li>
            <li>填写八位数字日期或选择快捷范围，点击“同步到飞书日历”，新增、更新、删除和分类迁移会一并处理。如果历史数据过多，建议先小批次实验，然后分批次导入，避免卡顿。</li>
            <li>可以在飞书日历中更改每一个日历分类的颜色，这样显示更清晰。</li>
          </ol>
        </details>
        <FeishuConnectionPanel connection={connection} busy={busy} onConnect={connect} onContinue={continueAuthorization} onDisconnect={() => void perform(async () => {
          await requestFeishu('disconnect'); clearTest(); setImportSummary(null); if (mounted.current) setConnection(await getFeishuConnection());
        })} />
        <FeishuAutoSyncPanel connection={connection} ready={logsReady && categoriesReady && !usesFallbackSeedData} busy={busy} />
        {connection?.status === 'connected' && (
          <>
            <p className="text-sm text-stone-600">按活动分类自动创建日历，并使用分类颜色。</p>
            <CustomSelect label="测试分类" value={selectedTestCategory?.id || ''} disabled={busy} renderDropdownInPortal
              options={testCategories.length ? testCategories.map((category) => ({
                value: category.id, label: category.name,
                icon: <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{
                  backgroundColor: /^#[0-9a-f]{6}$/i.test(category.themeColor) ? category.themeColor : '#8b7c6b'
                }} />
              })) : [{ value: '', label: '主日历' }]}
              onChange={(id) => { setTestCategoryId(id); clearTest(); }} />
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
          {filterCategories.length > 0 && <fieldset className="min-w-0 space-y-2" disabled={busy || !categoriesReady}>
            <legend className="text-sm text-stone-600">忽略分类</legend>
            <div className="flex flex-wrap gap-1.5">{filterCategories.map((category) => {
              const selected = ignoredCategories.has(category.id);
              return <button key={category.id} type="button" aria-pressed={selected}
                onClick={() => {
                  setIgnoredCategoryIds((ids) => ids.includes(category.id) ? ids.filter((id) => id !== category.id) : [...ids, category.id]);
                  setImportSummary(null);
                }}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs leading-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-stone-500 disabled:opacity-50 ${selected ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                {category.name}{selected && <Check size={12} aria-hidden="true" />}
              </button>;
            })}</div>
          </fieldset>}
          {rangeError && <p id="feishu-import-range-error" role="alert" className="text-sm text-red-600">{rangeError}</p>}
          {importCandidates && <p className="text-sm text-stone-500">范围内 {importCandidates.records.length} 条记录 · {importCandidates.categories.length} 个分类</p>}
          {importCandidates && connection?.status === 'connected' && <dl className="space-y-2 text-sm text-stone-600">
            {importCandidates.categories.map((category) => <div key={category.id} className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />{category.name}</dt>
              <dd className="text-stone-400">{connection.categoryCalendars?.find((calendar) => calendar.categoryId === category.id)?.name || `LumosTime · ${category.name}`}</dd>
            </div>)}
          </dl>}
          <button disabled={busy || connection?.status !== 'connected' || Boolean(rangeError) || !logsReady || !categoriesReady || usesFallbackSeedData}
            onClick={handleImport} aria-busy={busy} className="w-full py-3 rounded-xl bg-stone-800 text-white text-sm disabled:opacity-50">
            {busy ? importSummary ? `正在同步 ${importSummary.processed}/${importSummary.total}…` : '正在核对记录…' : '同步到飞书日历'}
          </button>
          {importSummary && <div role="status" className="text-sm text-stone-600 space-y-2">
            <p>新增 {importSummary.created} · 更新 {importSummary.updated} · 迁移 {importSummary.moved} · 删除 {importSummary.deleted} · 跳过 {importSummary.skipped} · 失败 {importSummary.failed}</p>
            {importSummary.processed < importSummary.total && !busy && <p>已处理 {importSummary.processed}/{importSummary.total}，再次同步将核查并继续。</p>}
            {importSummary.errors.map((message) => <p key={message} className="text-red-600">{message}</p>)}
          </div>}
        </section>
      </div>
    </div>
  );
};
