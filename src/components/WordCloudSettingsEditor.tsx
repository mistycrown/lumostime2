/**
 * @file WordCloudSettingsEditor.tsx
 * @updated 2026-10-09: Uses personal words in selectable high-frequency terms.
 * @input Card-specific word rules, source text values, and a persistence callback.
 * @output Editable phrase/stop-word lists and ranked word selection.
 * @pos Component (Statistics Settings)
 * @updated 2026-10-09: Adds manual entry and ordered high-frequency word selection for each cloud.
 */
import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { WordCloudSettings } from '../types';
import { usePersonalDictionary } from '../hooks/usePersonalDictionary';
import { getRankedTextTerms, normalizeWordCloudSettings, normalizeWordList } from '../utils/textSegmentation';

interface WordCloudSettingsEditorProps {
  settings?: WordCloudSettings;
  values: string[];
  onChange: (settings: WordCloudSettings) => void;
}

const parseWords = (value: string) => normalizeWordList(value.split(/[,，、;；\n]+/));
const actionClass = 'rounded-md border border-[#d8cabb] px-3 py-2 text-xs text-[#77523d] disabled:opacity-35';

export const WordCloudSettingsEditor: React.FC<WordCloudSettingsEditorProps> = ({ settings, values, onChange }) => {
  const personalWords = usePersonalDictionary();
  const rules = normalizeWordCloudSettings(settings);
  const [mergeInput, setMergeInput] = useState('');
  const [stopInput, setStopInput] = useState('');
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  // Keep stopped words selectable so users can inspect and reverse exclusions.
  const rankedWords = useMemo(() => getRankedTextTerms(values, {
    mergeWords: settings?.mergeWords || [], stopWords: []
  }, personalWords).slice(0, 50), [values, settings?.mergeWords, personalWords]);

  const addWords = (key: keyof WordCloudSettings, words: string[]) => {
    onChange({ ...rules, [key]: normalizeWordList([...rules[key], ...words]) });
  };
  const toggleWord = (word: string) => {
    const next = selectedWords.includes(word) ? selectedWords.filter((item) => item !== word) : [...selectedWords, word];
    setSelectedWords(next);
    setMergeInput(next.join(''));
  };

  return <div className="space-y-5">
    {(['mergeWords', 'stopWords'] as const).map((key) => {
      const isMerge = key === 'mergeWords';
      const label = isMerge ? '合并词' : '停用词';
      const input = isMerge ? mergeInput : stopInput;
      const setInput = isMerge ? setMergeInput : setStopInput;
      return <section key={key}>
        <h3 className="mb-2 text-xs font-medium text-[#766657]">{label}</h3>
        <form className="flex items-start gap-2" onSubmit={(event) => {
          event.preventDefault();
          const words = parseWords(input);
          if (!words.length) return;
          addWords(key, words);
          setInput('');
          if (isMerge) setSelectedWords([]);
        }}>
          <input aria-label={label} value={input} onChange={(event) => setInput(event.target.value)}
            placeholder={isMerge ? '输入合并词，可从下方点选' : '输入停用词'}
            className="min-w-0 flex-1 rounded-md border border-[#d8cabb] bg-[#fffdfa] px-3 py-2 text-sm text-[#5c4b3c] outline-none focus:border-[#b16d4c]" />
          <button type="submit" disabled={!parseWords(input).length} className={actionClass}>添加{label}</button>
        </form>
        <div className="mt-2 flex flex-wrap gap-2">
          {rules[key].map((word) => <span key={word} className="inline-flex max-w-full items-center gap-1 rounded-md bg-[#f1e8de] px-2 py-1 text-xs text-[#77523d]">
            <span className="break-all">{word}</span>
            <button type="button" aria-label={`移除${label}：${word}`} onClick={() => onChange({ ...rules, [key]: rules[key].filter((item) => item !== word) })} className="shrink-0 p-0.5"><X size={12} /></button>
          </span>)}
        </div>
      </section>;
    })}
    <section className="border-t border-[#e0d6ca] pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-[#766657]">高频词</h3>
        <button type="button" disabled={!selectedWords.length} className={actionClass} onClick={() => {
          addWords('stopWords', selectedWords);
          setSelectedWords([]);
          setMergeInput('');
        }}>停用所选</button>
      </div>
      {rankedWords.length === 0 ? <p className="text-xs text-[#aa9b8b]">当前范围暂无有效文本</p> : <div className="flex flex-wrap gap-2">
        {rankedWords.map(([word, count]) => {
          const selectedIndex = selectedWords.indexOf(word);
          const stopped = rules.stopWords.includes(word);
          return <button key={word} type="button" aria-label={`选择高频词：${word}`} aria-pressed={selectedIndex >= 0}
            onClick={() => toggleWord(word)} className={`inline-flex max-w-full items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${selectedIndex >= 0 ? 'border-[#b16d4c] bg-[#f1e1d5] text-[#8f4f32]' : 'border-[#e0d6ca] text-[#8f7f70]'}`}>
            {selectedIndex >= 0 && <span className="font-mono text-[10px]">{selectedIndex + 1}</span>}
            <span className={`break-all ${stopped ? 'line-through opacity-50' : ''}`}>{word}</span>
            <span className="font-mono text-[10px] opacity-60">{count}</span>
          </button>;
        })}
      </div>}
    </section>
  </div>;
};
