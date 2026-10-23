/**
 * @file journalLogContent.ts
 * @input Original Log values, archived attribute definitions and node-aware notes
 * @output Readable field values and inline node runs with original canonical targets
 * @pos Utility (Journal content projection)
 * @updated 2026-10-23: Preserves zero values, deleted choices, scores, workflow answers and inline node aliases.
 */
import type { Activity, Log } from '../types';
import { parseNodeLinks } from './nodeUtils';

export interface JournalField { label: string; value: string }
export const journalLogFields = (log: Log, activity?: Activity): JournalField[] => {
  const fields: JournalField[] = [];
  const add = (label: string, value: unknown) => {
    if (value !== undefined && value !== null) fields.push({ label, value: typeof value === 'string' ? value : String(value) });
  };
  add('专注评分', log.focusScore === undefined ? undefined : `${log.focusScore}/5`);
  add('心情评分', log.moodScore === undefined ? undefined : `${log.moodScore}/5`);
  add('进度增量', log.progressIncrement);
  for (const stored of log.attributeValues || []) {
    const definition = activity?.attributes?.find((item) => item.id === stored.attributeId);
    const option = (id: string) => definition?.options?.find((item) => item.id === id)?.label ?? `已删除选项 (${id})`;
    const value = 'optionId' in stored ? option(stored.optionId) : 'optionIds' in stored ? stored.optionIds.map(option).join(' / ') : String(stored.value);
    add(definition?.name || `属性 (${stored.attributeId})`, value + (definition?.unit ? ` ${definition.unit}` : ''));
  }
  const meta = log.appAwarenessMeta;
  if (meta) {
    add('来源应用', meta.sourceAppName || meta.sourceAppPackage);
    add('工作流', meta.workflowTemplateName || meta.workflowTemplateId);
    Object.entries(meta.answers).forEach(([key, value]) => add(key, typeof value === 'object' ? value.label : typeof value === 'boolean' ? value ? '是' : '否' : value));
    add('预计时长', meta.expectedDurationMinutes === undefined ? undefined : `${meta.expectedDurationMinutes} 分钟`);
    if (meta.extensionHistory?.length) add('延长记录', meta.extensionHistory.map((minutes) => `${minutes} 分钟`).join(' / '));
  }
  return fields;
};

export interface JournalNoteRun { text: string; node?: string }
export const journalNoteRuns = (text: string): JournalNoteRun[] => {
  const runs: JournalNoteRun[] = [];
  let offset = 0;
  for (const link of parseNodeLinks(text)) {
    if (offset < link.start) runs.push({ text: text.slice(offset, link.start) });
    runs.push({ text: link.label || link.name, node: link.name });
    offset = link.end;
  }
  if (offset < text.length) runs.push({ text: text.slice(offset) });
  return runs;
};

/** Keep short node labels together while retaining explicit paragraph breaks and CJK punctuation. */
export const wrapJournalNoteRuns = (runs: JournalNoteRun[], width: number, measure: (text: string) => number): JournalNoteRun[][] => {
  const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' });
  const lines: JournalNoteRun[][] = [];
  let line: JournalNoteRun[] = [];
  let used = 0;
  const flush = () => { lines.push(line); line = []; used = 0; };
  runs.forEach((run, runIndex) => {
    run.text.split('\n').forEach((text, paragraphIndex) => {
      if (paragraphIndex) flush();
      const closing = runs[runIndex + 1]?.text.match(/^[，。！？、：；）》」』】〕…]/u)?.[0] || '';
      const atomWidth = measure(text + closing);
      if (run.node && atomWidth <= width && used + atomWidth > width && line.length) flush();
      for (const { segment: glyph } of segmenter.segment(text)) {
        const next = measure(glyph);
        if (line.length && used + next > width) {
          let carry: JournalNoteRun | undefined;
          const last = line[line.length - 1];
          if (line.length > 1 && measure(last.text) + next <= width && (/^[，。！？、：；）》」』】〕…]/u.test(glyph) || /[（《「『【〔]$/u.test(last.text))) carry = line.pop();
          flush();
          if (carry) { line.push(carry); used = measure(carry.text); }
        }
        line.push({ text: glyph, node: run.node });
        used += next;
      }
    });
  });
  flush();
  return lines;
};
