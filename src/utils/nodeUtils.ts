/**
 * @file nodeUtils.ts
 * @updated 2026-10-07: Indexes daily, weekly and monthly review answers with typed periods and applies node mutations across all review kinds.
 * @updated 2026-10-07: Merges nodes into a chosen primary, preserving labels/metadata and retargeting every linked log.
 * @updated 2026-10-07: Recognizes full-width brackets and supplies caret-aware quick bracket insertion.
 * @updated 2026-10-07: Adds metadata-preserving moves and persisted array ordering for node management.
 * @updated 2026-10-07: Parses alias-first links, preserves alias text on linking/rename, and validates node categories.
 * @input Log note text and lightweight NoteNode metadata
 * @output Wiki-link parsing, node discovery, backlinks, co-occurrence and text mutations
 * @pos Utils (Nodes)
 * @description Derives every node relationship from note text without storing relation tables.
 * @updated 2026-10-06: Added node parsing, alias candidates, indexing and rename helpers.
 */
import type { DailyReview, Log, MonthlyReview, NoteNode, NodeCategory, ReviewAnswer, WeeklyReview } from '../types';

export interface NodeLink { name: string; label?: string; start: number; end: number }
export interface NodeCandidate { node: NoteNode; matches: string[] }
export type NodeReviewKind = 'daily' | 'weekly' | 'monthly';
export interface NodeReviewAnswer {
  reviewId: string;
  kind: NodeReviewKind;
  startDate: string;
  endDate: string;
  answer: ReviewAnswer;
}
export interface NodeIndexEntry { logs: Log[]; reviewAnswers: NodeReviewAnswer[]; latestAt: number; related: Map<string, number> }

export const isValidNodeName = (name: string): boolean => Boolean(name.trim()) && !/[\[\]［］\r\n|丨]/.test(name);

export const parseNodeLinks = (text = ''): NodeLink[] => {
  const links: NodeLink[] = [];
  const pattern = /(?<![\[［])[\[［]{2}([^\[\]［］\r\n|]+)[\]］]{2}(?![\]］])/g;
  for (const match of text.matchAll(pattern)) {
    const parts = match[1].split('丨').map((part) => part.trim());
    if (parts.length > 2 || parts.some((part) => !part)) continue;
    const name = parts.at(-1)!;
    links.push({ name, ...(parts.length === 2 ? { label: parts[0] } : {}), start: match.index!, end: match.index! + match[0].length });
  }
  return links;
};

export const getNodeNames = (text = ''): string[] => [...new Set(parseNodeLinks(text).map((link) => link.name))];

export const insertNodeBrackets = (text: string, selectionStart = text.length, selectionEnd = selectionStart): { text: string; caret: number } => {
  const start = Math.max(0, Math.min(selectionStart, text.length));
  const end = Math.max(start, Math.min(selectionEnd, text.length));
  if (end > start) return { text: `${text.slice(0, start)}[[${text.slice(start, end)}]]${text.slice(end)}`, caret: end + 4 };
  let opening: RegExpMatchArray | undefined;
  for (const token of text.slice(0, start).matchAll(/[\[［]{1,2}|[\]］]{1,2}/g)) {
    if (/^[\[［]/.test(token[0])) opening = token;
    else opening = undefined;
  }
  if (!opening) return { text: `${text.slice(0, start)}[[${text.slice(start)}`, caret: start + 2 };
  const right = opening[0][0] === '［' ? '］］' : ']]';
  const suffix = text.slice(start);
  const hasClosing = /^[\]］]{2}/.test(suffix);
  // A manually typed single opening bracket is completed into usable node syntax.
  const missingLeft = opening[0].length === 1 ? opening[0] : '';
  const prefix = missingLeft ? text.slice(0, opening.index! + 1) + missingLeft + text.slice(opening.index! + 1, start) : text.slice(0, start);
  return { text: prefix + (hasClosing ? '' : right) + suffix, caret: start + missingLeft.length + 2 };
};

// Earlier versions treated the whole alias token as a name. Preserve its metadata when upgrading.
const normalizeLegacyAliasNodes = (nodes: NoteNode[]): NoteNode[] => {
  const legacy = nodes.filter((node) => parseNodeLinks(`[[${node.name}]]`)[0]?.label);
  if (!legacy.length) return nodes;
  const result = nodes.filter((node) => !legacy.includes(node));
  for (const node of legacy) {
    const link = parseNodeLinks(`[[${node.name}]]`)[0];
    const index = result.findIndex((item) => item.name === link.name);
    const target = index >= 0 ? result[index] : { ...node, name: link.name };
    const descriptions = [...new Set([target.description, node.description].filter(Boolean))];
    const merged = {
      ...target,
      aliases: [...new Set([...target.aliases, ...node.aliases, link.label!])].filter((alias) => alias !== link.name),
      description: descriptions.join('\n\n'),
      categoryId: target.categoryId || node.categoryId,
      createdAt: Math.min(target.createdAt, node.createdAt),
      updatedAt: Math.max(target.updatedAt, node.updatedAt)
    };
    if (index >= 0) result[index] = merged;
    else result.push(merged);
  }
  return result;
};

export const buildNodeReviewAnswers = (
  dailyReviews: DailyReview[] = [],
  weeklyReviews: WeeklyReview[] = [],
  monthlyReviews: MonthlyReview[] = []
): NodeReviewAnswer[] => [
  ...dailyReviews.flatMap((review) => (review.answers || []).map((answer) => ({
    reviewId: review.id,
    kind: 'daily' as const,
    startDate: review.date,
    endDate: review.date,
    answer
  }))),
  ...weeklyReviews.flatMap((review) => (review.answers || []).map((answer) => ({
    reviewId: review.id,
    kind: 'weekly' as const,
    startDate: review.weekStartDate,
    endDate: review.weekEndDate,
    answer
  }))),
  ...monthlyReviews.flatMap((review) => (review.answers || []).map((answer) => ({
    reviewId: review.id,
    kind: 'monthly' as const,
    startDate: review.monthStartDate,
    endDate: review.monthEndDate,
    answer
  })))
];

export const discoverNodes = (
  nodes: NoteNode[],
  logs: Log[],
  now = Date.now(),
  dailyReviews: DailyReview[] = [],
  weeklyReviews: WeeklyReview[] = [],
  monthlyReviews: MonthlyReview[] = []
): NoteNode[] => {
  const normalized = normalizeLegacyAliasNodes(nodes);
  const names = new Set(normalized.map((node) => node.name));
  const added: NoteNode[] = [];
  for (const log of logs) {
    for (const name of getNodeNames(log.note)) {
      if (names.has(name)) continue;
      names.add(name);
      added.push({ id: crypto.randomUUID(), name, aliases: [], description: '', createdAt: now, updatedAt: now });
    }
  }
  for (const reviewAnswer of buildNodeReviewAnswers(dailyReviews, weeklyReviews, monthlyReviews)) {
    for (const name of getNodeNames(reviewAnswer.answer.answer)) {
      if (names.has(name)) continue;
      names.add(name);
      added.push({ id: crypto.randomUUID(), name, aliases: [], description: '', createdAt: now, updatedAt: now });
    }
  }
  return added.length ? [...normalized, ...added] : normalized;
};

export const buildNodeIndex = (
  nodes: NoteNode[],
  logs: Log[],
  dailyReviews: DailyReview[] = [],
  weeklyReviews: WeeklyReview[] = [],
  monthlyReviews: MonthlyReview[] = []
): Map<string, NodeIndexEntry> => {
  const byName = new Map(nodes.map((node) => [node.name, node.id]));
  const index = new Map<string, NodeIndexEntry>(nodes.map((node) => [node.id, { logs: [], reviewAnswers: [], latestAt: 0, related: new Map() }]));
  const addRecord = (ids: string[], timestamp: number) => {
    for (const id of ids) {
      const entry = index.get(id)!;
      entry.latestAt = Math.max(entry.latestAt, timestamp);
      for (const otherId of ids) {
        if (otherId !== id) entry.related.set(otherId, (entry.related.get(otherId) || 0) + 1);
      }
    }
  };
  for (const log of logs) {
    const ids = [...new Set(getNodeNames(log.note).map((name) => byName.get(name)).filter((id): id is string => Boolean(id)))];
    ids.forEach((id) => index.get(id)!.logs.push(log));
    addRecord(ids, log.startTime);
  }
  for (const reviewAnswer of buildNodeReviewAnswers(dailyReviews, weeklyReviews, monthlyReviews)) {
    const timestamp = new Date(`${reviewAnswer.endDate}T12:00:00`).getTime();
    const ids = [...new Set(getNodeNames(reviewAnswer.answer.answer).map((name) => byName.get(name)).filter((id): id is string => Boolean(id)))];
    ids.forEach((id) => index.get(id)!.reviewAnswers.push(reviewAnswer));
    addRecord(ids, Number.isFinite(timestamp) ? timestamp : 0);
  }
  for (const entry of index.values()) {
    entry.logs.sort((a, b) => b.startTime - a.startTime);
    entry.reviewAnswers.sort((a, b) => b.endDate.localeCompare(a.endDate));
  }
  return index;
};

// Only ordinary text is eligible: never match or replace inside an existing wiki link.
const mapOrdinaryText = (text: string, map: (part: string) => string): string => {
  let offset = 0;
  let result = '';
  for (const match of text.matchAll(/[\[［]{2}[\s\S]*?[\]］]{2}/g)) {
    const start = match.index!;
    const end = start + match[0].length;
    result += map(text.slice(offset, start)) + text.slice(start, end);
    offset = end;
  }
  return result + map(text.slice(offset));
};

export const getNodeCandidates = (text: string, nodes: NoteNode[]): NodeCandidate[] => {
  const linked = new Set(getNodeNames(text));
  const ordinary = text.split(/[\[［]{2}[\s\S]*?[\]］]{2}/).join('\u0000');
  return nodes.flatMap((node) => {
    if (linked.has(node.name)) return [];
    const matches = [...new Set([node.name, ...node.aliases])].filter((name) => isValidNodeName(name) && ordinary.includes(name));
    return matches.length ? [{ node, matches }] : [];
  });
};

export const linkNodeInText = (text: string, node: NoteNode): string => {
  const names = [...new Set([node.name, ...node.aliases])].filter(isValidNodeName).sort((a, b) => b.length - a.length);
  const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!escaped.length) return text;
  const pattern = new RegExp(escaped.join('|'), 'g');
  return mapOrdinaryText(text, (part) => part.replace(pattern, (matched) => matched === node.name ? `[[${node.name}]]` : `[[${matched}丨${node.name}]]`));
};

export const renameNodeInText = (text: string, oldName: string, newName: string, preserveOldLabel = false): string => {
  let result = '';
  let offset = 0;
  for (const link of parseNodeLinks(text)) {
    const label = link.label || (preserveOldLabel ? oldName : undefined);
    result += text.slice(offset, link.start) + (link.name === oldName ? `${text.slice(link.start, link.start + 2)}${label ? `${label}丨` : ''}${newName}${text.slice(link.end - 2, link.end)}` : text.slice(link.start, link.end));
    offset = link.end;
  }
  return result + text.slice(offset);
};

export const renameNodeInAnswers = (answers: ReviewAnswer[], oldName: string, newName: string, preserveOldLabel = false): ReviewAnswer[] => answers.map((answer) => {
  const text = answer.answer || '';
  const next = renameNodeInText(text, oldName, newName, preserveOldLabel);
  return next === text ? answer : { ...answer, answer: next };
});

export const createNodeCategory = (categories: NodeCategory[], name: string, now = Date.now()): NodeCategory => {
  const normalized = name.trim();
  if (!normalized || /[\r\n]/.test(normalized)) throw new Error('请输入有效分类名称');
  if (normalized === '未分类' || normalized === '全部') throw new Error('请使用其他分类名称');
  if (categories.some((category) => category.name === normalized)) throw new Error('已存在同名分类');
  return { id: crypto.randomUUID(), name: normalized, createdAt: now, updatedAt: now };
};

export const getNodeCategoryId = (node: NoteNode, categories: NodeCategory[]): string => categories.some((category) => category.id === node.categoryId) ? node.categoryId! : '';

export const reorderNodeItems = <T extends { id: string }>(items: T[], id: string, targetId?: string, after = false): T[] => {
  const item = items.find((entry) => entry.id === id);
  if (!item || id === targetId || (targetId && !items.some((entry) => entry.id === targetId))) return items;
  const result = items.filter((entry) => entry.id !== id);
  const index = targetId ? result.findIndex((entry) => entry.id === targetId) + (after ? 1 : 0) : result.length;
  result.splice(index, 0, item);
  return result.every((entry, position) => entry === items[position]) ? items : result;
};

export const moveNodeToCategory = (nodes: NoteNode[], categories: NodeCategory[], id: string, categoryId: string, targetId?: string, after = false, now = Date.now()): NoteNode[] => {
  const node = nodes.find((entry) => entry.id === id);
  if (!node || (categoryId && !categories.some((category) => category.id === categoryId))) return nodes;
  if (targetId && (targetId === id || !nodes.some((entry) => entry.id === targetId && getNodeCategoryId(entry, categories) === categoryId))) return nodes;
  const siblings = nodes.filter((entry) => entry.id !== id && getNodeCategoryId(entry, categories) === categoryId);
  const destination = targetId || siblings.at(-1)?.id;
  const ordered = reorderNodeItems(nodes, id, destination, targetId ? after : true);
  if ((node.categoryId || '') === categoryId) return ordered;
  return ordered.map((entry) => entry.id === id ? { ...entry, categoryId: categoryId || undefined, updatedAt: now } : entry);
};

export const renameNode = (nodes: NoteNode[], logs: Log[], id: string, name: string, now = Date.now(), answers: ReviewAnswer[] = []) => {
  const source = nodes.find((node) => node.id === id);
  const nextName = name.trim();
  if (!source) throw new Error('节点不存在');
  if (!isValidNodeName(nextName)) throw new Error('请输入有效名称，名称不能包含方括号、竖线或换行');
  if (nodes.some((node) => node.id !== id && node.name === nextName)) throw new Error('已存在同名节点');
  if (source.name === nextName) return { nodes, logs, answers };
  return {
    nodes: nodes.map((node) => node.id === id ? {
      ...node, name: nextName,
      aliases: [...new Set([...node.aliases, node.name])].filter((alias) => alias !== nextName), updatedAt: now
    } : node),
    logs: logs.map((log) => {
      const note = renameNodeInText(log.note || '', source.name, nextName);
      return note !== (log.note || '') ? { ...log, note } : log;
    }),
    answers: renameNodeInAnswers(answers, source.name, nextName)
  };
};

export const mergeNodes = (nodes: NoteNode[], logs: Log[], sourceId: string, primaryId: string, now = Date.now(), answers: ReviewAnswer[] = []) => {
  if (sourceId === primaryId) throw new Error('请选择两个不同的节点');
  const source = nodes.find((node) => node.id === sourceId);
  const primary = nodes.find((node) => node.id === primaryId);
  if (!source || !primary) throw new Error('节点不存在');
  const descriptions = [...new Set([primary.description.trim(), source.description.trim()].filter(Boolean))];
  return {
    nodes: nodes.filter((node) => node.id !== sourceId).map((node) => node.id === primaryId ? {
      ...node,
      aliases: [...new Set([...primary.aliases, source.name, ...source.aliases].map((alias) => alias.trim()))].filter((alias) => isValidNodeName(alias) && alias !== primary.name),
      description: descriptions.join('\n\n'),
      updatedAt: now
    } : node),
    logs: logs.map((log) => {
      const note = renameNodeInText(log.note || '', source.name, primary.name, true);
      return note === (log.note || '') ? log : { ...log, note };
    }),
    answers: renameNodeInAnswers(answers, source.name, primary.name, true)
  };
};
