/**
 * @file nodeUtils.ts
 * @input Log note text and lightweight NoteNode metadata
 * @output Wiki-link parsing, node discovery, backlinks, co-occurrence and text mutations
 * @pos Utils (Nodes)
 * @description Derives every node relationship from note text without storing relation tables.
 * @updated 2026-10-06: Added node parsing, alias candidates, indexing and rename helpers.
 */
import type { Log, NoteNode } from '../types';

export interface NodeLink { name: string; start: number; end: number }
export interface NodeCandidate { node: NoteNode; matches: string[] }
export interface NodeIndexEntry { logs: Log[]; latestAt: number; related: Map<string, number> }

export const isValidNodeName = (name: string): boolean => Boolean(name.trim()) && !/[\[\]\r\n|]/.test(name);

export const parseNodeLinks = (text = ''): NodeLink[] => {
  const links: NodeLink[] = [];
  const pattern = /(?<!\[)\[\[([^\[\]\r\n|]+)\]\](?!\])/g;
  for (const match of text.matchAll(pattern)) {
    const name = match[1].trim();
    if (name) links.push({ name, start: match.index!, end: match.index! + match[0].length });
  }
  return links;
};

export const getNodeNames = (text = ''): string[] => [...new Set(parseNodeLinks(text).map((link) => link.name))];

export const discoverNodes = (nodes: NoteNode[], logs: Log[], now = Date.now()): NoteNode[] => {
  const names = new Set(nodes.map((node) => node.name));
  const added: NoteNode[] = [];
  for (const log of logs) {
    for (const name of getNodeNames(log.note)) {
      if (names.has(name)) continue;
      names.add(name);
      added.push({ id: crypto.randomUUID(), name, aliases: [], description: '', createdAt: now, updatedAt: now });
    }
  }
  return added.length ? [...nodes, ...added] : nodes;
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
  for (const match of text.matchAll(/\[\[[\s\S]*?\]\]/g)) {
    const start = match.index!;
    const end = start + match[0].length;
    result += map(text.slice(offset, start)) + text.slice(start, end);
    offset = end;
  }
  return result + map(text.slice(offset));
};

export const getNodeCandidates = (text: string, nodes: NoteNode[]): NodeCandidate[] => {
  const linked = new Set(getNodeNames(text));
  const ordinary = text.split(/\[\[[\s\S]*?\]\]/).join('\u0000');
  return nodes.flatMap((node) => {
    if (linked.has(node.name)) return [];
    const matches = [...new Set([node.name, ...node.aliases])].filter((name) => name && ordinary.includes(name));
    return matches.length ? [{ node, matches }] : [];
  });
};

export const linkNodeInText = (text: string, node: NoteNode): string => {
  const names = [...new Set([node.name, ...node.aliases])].filter(Boolean).sort((a, b) => b.length - a.length);
  const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!escaped.length) return text;
  const pattern = new RegExp(escaped.join('|'), 'g');
  return mapOrdinaryText(text, (part) => part.replace(pattern, () => `[[${node.name}]]`));
};

export const renameNodeInText = (text: string, oldName: string, newName: string): string => {
  let result = '';
  let offset = 0;
  for (const link of parseNodeLinks(text)) {
    result += text.slice(offset, link.start) + (link.name === oldName ? `[[${newName}]]` : text.slice(link.start, link.end));
    offset = link.end;
  }
  return result + text.slice(offset);
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
