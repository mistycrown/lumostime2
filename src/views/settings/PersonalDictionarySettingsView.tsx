/**
 * @file PersonalDictionarySettingsView.tsx
 * @input Reactive personal words and settings back navigation
 * @output Searchable, persistent dictionary with batch addition and word removal
 * @pos View (Settings / Content)
 * @updated 2026-10-09: Adds a minimal print-inspired personal dictionary editor.
 */
import React, { useMemo, useState } from 'react';
import { ChevronLeft, Plus, Search, X } from 'lucide-react';
import { usePersonalDictionary } from '../../hooks/usePersonalDictionary';
import { personalDictionaryService } from '../../services/personalDictionaryService';
import { normalizePersonalDictionary, parsePersonalDictionaryInput } from '../../utils/personalDictionary';

export const PersonalDictionarySettingsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const words = usePersonalDictionary();
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const visibleWords = useMemo(() => words.filter((word) => word.toLowerCase().includes(query.trim().toLowerCase())), [words, query]);
  const save = (next: string[]) => {
    try { personalDictionaryService.setAll(next); setMessage(''); return true; }
    catch { setMessage('保存失败，请重试'); return false; }
  };

  return <div className="fixed inset-0 z-50 flex flex-col bg-[#faf9f6] pt-[var(--app-safe-area-top,0px)]">
    <header className="flex shrink-0 items-center gap-3 border-b border-stone-100 bg-[#faf9f6]/80 px-4 pb-3 pt-4 backdrop-blur-md">
      <button type="button" aria-label="返回设置" onClick={onBack} className="p-1 text-stone-400 hover:text-stone-600"><ChevronLeft size={24} /></button>
      <h1 className="text-lg font-bold text-stone-800">个人词典</h1>
      <span className="ml-auto font-mono text-xs tabular-nums text-stone-400">{words.length}</span>
    </header>
    <main className="min-h-0 flex-1 overflow-y-auto px-7 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-7">
      <div className="mx-auto max-w-3xl">
        <form onSubmit={(event) => {
          event.preventDefault();
          const added = parsePersonalDictionaryInput(draft);
          if (!added.length) return;
          const current = personalDictionaryService.getAll();
          const next = normalizePersonalDictionary([...current, ...added]);
          if (next.length === current.length) { setMessage('词条已存在'); return; }
          if (save(next)) setDraft('');
        }}>
          <label htmlFor="personal-dictionary-entry" className="mb-3 block text-xs font-medium tracking-wider text-stone-500">添加词条</label>
          <div className="flex items-end gap-4 border-b border-stone-300 pb-3 focus-within:border-stone-600">
            <textarea id="personal-dictionary-entry" aria-label="添加词条" rows={2} value={draft}
              onChange={(event) => { setDraft(event.target.value); setMessage(''); }} placeholder="输入词条，每行一个"
              className="min-w-0 flex-1 resize-none bg-transparent text-sm leading-7 text-stone-800 outline-none placeholder:text-stone-400" />
            <button type="submit" disabled={!parsePersonalDictionaryInput(draft).length}
              className="flex shrink-0 items-center gap-1.5 px-1 py-2 text-xs font-medium text-stone-700 hover:text-stone-950 disabled:opacity-30">
              <Plus size={16} /><span>添加</span>
            </button>
          </div>
          {message && <p role="status" className="mt-2 text-xs text-stone-500">{message}</p>}
        </form>
        <div className="mb-3 mt-8 flex items-center gap-3 border-b border-stone-200 pb-3 focus-within:border-stone-500">
          <Search size={16} className="shrink-0 text-stone-400" />
          <input aria-label="搜索词条" placeholder="搜索词条" value={query} onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400" />
          {query && <button type="button" aria-label="清除搜索" onClick={() => setQuery('')} className="p-1 text-stone-400 hover:text-stone-700"><X size={16} /></button>}
        </div>
        <div className="flex items-center justify-between py-3 text-[10px] font-medium tracking-widest text-stone-400">
          <span>词条</span><span className="font-mono tabular-nums">{visibleWords.length} / {words.length}</span>
        </div>
        <ul className="divide-y divide-stone-200 border-y border-stone-200">
          {visibleWords.map((word, index) => <li key={word.toLowerCase()} className="flex items-center gap-4 py-3">
            <span aria-hidden="true" className="shrink-0 font-mono text-[10px] tabular-nums text-stone-400">{String(index + 1).padStart(3, '0')}</span>
            <span className="min-w-0 flex-1 break-words text-sm leading-6 text-stone-800">{word}</span>
            <button type="button" aria-label={`删除词条：${word}`} onClick={() => save(personalDictionaryService.getAll().filter((item) => item !== word))}
              className="shrink-0 p-2 text-stone-400 hover:text-stone-800"><X size={16} /></button>
          </li>)}
        </ul>
        {visibleWords.length === 0 && <p className="py-12 text-center text-sm text-stone-400">{words.length ? '没有匹配的词条' : '暂无词条'}</p>}
      </div>
    </main>
  </div>;
};
