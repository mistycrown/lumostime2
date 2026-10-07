/**
 * @file nodeUtils.ts
 * @updated 2026-10-07: Recognizes full-width brackets and supplies caret-aware quick bracket insertion.
 * @updated 2026-10-07: Adds metadata-preserving moves and persisted array ordering for node management.
 * @updated 2026-10-07: Parses alias-first links, preserves alias text on linking/rename, and validates node categories.
 * @input Log note text and lightweight NoteNode metadata
 * @output Wiki-link parsing, node discovery, backlinks, co-occurrence and text mutations
 * @pos Utils (Nodes)
 * @description Derives every node relationship from note text without storing relation tables.
 * @updated 2026-10-06: Added node parsing, alias candidates, indexing and rename helpers.
 */
import type { Log, NoteNode, NodeCategory } from '../types';

export interface NodeLink { name: string; label?: string; start: number; end: number }
export interface NodeCandidate { node: NoteNode; matches: string[] }
export interface NodeIndexEntry { logs: Log[]; latestAt: number; related: Map<string, number> }

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

export const discoverNodes = (nodes: NoteNode[], logs: Log[], now = Date.now()): NoteNode[] => {
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
  return added.length ? [...normalized, ...added] : normalized;
};

export const buildNodeIndex = (nodes: NoteNode[], logs: Log[]): Map<string, NodeIndexEntry> => {
  const byName = new Map(nodes.map((node) => [node.name, node.id]));
  const index = new Map<string, NodeIndexEntry>(nodes.map((node) => [node.id, { logs: [], latestAt: 0, related: new Map() }]));
  for (const log of logs) {
    const ids = getNodeNames(log.note).map((name) => byName.get(name)).filter((id): id is string => Boolean(id));
    for (const id of ids) {
      const entry = index.get(id)!;
      entry.logs.push(log);
      entry.latestAt = Math.max(entry.latestAt, log.startTime);
      for (const otherId of ids) {
        if (otherId !== id) entry.related.set(otherId, (entry.related.get(otherId) || 0) + 1);
      }
    }
  }
  for (const entry of index.values()) entry.logs.sort((a, b) => b.startTime - a.startTime);
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

export const renameNodeInText = (text: string, oldName: string, newName: string): string => {
  let result = '';
  let offset = 0;
  for (const link of parseNodeLinks(text)) {
    result += text.slice(offset, link.start) + (link.name === oldName ? `${text.slice(link.start, link.start + 2)}${link.label ? `${link.label}丨` : ''}${newName}${text.slice(link.end - 2, link.end)}` : text.slice(link.start, link.end));
    offset = link.end;
  }
  return result + text.slice(offset);
};

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

export const renameNode = (nodes: NoteNode[], logs: Log[], id: string, name: string, now = Date.now()) => {
  const source = nodes.find((node) => node.id === id);
  const nextName = name.trim();
  if (!source) throw new Error('节点不存在');
  if (!isValidNodeName(nextName)) throw new Error('请输入有效名称，名称不能包含方括号、竖线或换行');
  if (nodes.some((node) => node.id !== id && node.name === nextName)) throw new Error('已存在同名节点');
  if (source.name === nextName) return { nodes, logs };
  return {
    nodes: nodes.map((node) => node.id === id ? {
      ...node, name: nextName,
      aliases: [...new Set([...node.aliases, node.name])].filter((alias) => alias !== nextName), updatedAt: now
    } : node),
    logs: logs.map((log) => {
      const note = renameNodeInText(log.note || '', source.name, nextName);
      return note !== (log.note || '') ? { ...log, note } : log;
    })
  };
};
