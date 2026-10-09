/**
 * @file aiNodeUtils.ts
 * @input Current node metadata, logs and a structured node writeback request
 * @output Atomic node/log mutations and reversible snapshots
 * @pos Utils (AI Nodes)
 * @updated 2026-10-09: Matches canonical names/aliases and creates nodes through the latest actual log.
 */
import type { Log, NoteNode } from '../types';
import type { AssistantUpsertNodeToolCall } from '../types/assistant';
import { discoverNodes, getNodeNames, isValidNodeName, linkNodeInText } from './nodeUtils';

export interface AINodeSnapshot {
  nodeId?: string;
  name: string;
  previousNode?: NoteNode;
  nextNode?: NoteNode;
  previousLog?: Log;
  nextLog?: Log;
}

export const linkAINoteNodes = (text: string, nodes: NoteNode[], nodeIds?: string[]): string => {
  const candidates = nodeIds ? nodes.filter((node) => nodeIds.includes(node.id)) : nodes;
  const longestName = (node: NoteNode) => Math.max(node.name.length, ...node.aliases.map((alias) => alias.length));
  // Prefer longer names and skip ambiguous aliases rather than linking to an arbitrary node.
  return [...candidates].sort((left, right) => longestName(right) - longestName(left))
    .reduce((note, node) => linkNodeInText(note, {
      ...node,
      aliases: node.aliases.filter((alias) => !nodes.some((other) => other.id !== node.id && (other.name === alias || other.aliases.includes(alias))))
    }), text);
};

export const applyAINodeUpdate = (storedNodes: NoteNode[], logs: Log[], args: AssistantUpsertNodeToolCall['args'], now = Date.now()) => {
  const nodes = discoverNodes(storedNodes, logs, now);
  const name = args.name?.trim() || '';
  const description = args.description.trim();
  if (!description) throw new Error('节点简介不能为空。');
  if (args.mode !== undefined && args.mode !== 'append' && args.mode !== 'replace') throw new Error('节点简介修改方式无效。');
  let previousNode: NoteNode | undefined;
  if (args.nodeId) {
    previousNode = nodes.find((node) => node.id === args.nodeId);
    if (!previousNode) throw new Error('没有找到要修改的节点。');
    if (name && name !== previousNode.name && !previousNode.aliases.includes(name)) throw new Error('节点名称与指定节点不一致。');
  } else {
    if (!isValidNodeName(name)) throw new Error('请输入有效的节点名称。');
    previousNode = nodes.find((node) => node.name === name);
    if (!previousNode) {
      const aliases = nodes.filter((node) => node.aliases.includes(name));
      if (aliases.length > 1) throw new Error('这个别名对应多个节点，请指定节点名称。');
      previousNode = aliases[0];
    }
  }
  if (previousNode) {
    const current = previousNode.description.trim();
    const alreadyRecorded = current === description || current.split(/\n\s*\n/).includes(description);
    const nextDescription = args.mode === 'replace' || !current
      ? description
      : alreadyRecorded ? previousNode.description : `${previousNode.description.trimEnd()}\n\n${description}`;
    const nextNode = nextDescription === previousNode.description ? previousNode : { ...previousNode, description: nextDescription, updatedAt: now };
    return {
      nodes: nodes.map((node) => node.id === nextNode.id ? nextNode : node),
      logs,
      snapshot: { nodeId: nextNode.id, name: nextNode.name, previousNode, nextNode } satisfies AINodeSnapshot
    };
  }
  const previousLog = [...logs].filter((log) => !log.isPlanned).sort((left, right) => right.startTime - left.startTime)[0];
  if (!previousLog) throw new Error('还没有可提及新节点的活动记录，请先添加一条 Log。');
  const nextNode: NoteNode = { id: crypto.randomUUID(), name, aliases: [], description, createdAt: now, updatedAt: now };
  const mention = `[[${name}]]：${description}`;
  const linkedNote = linkNodeInText(previousLog.note || '', nextNode);
  const note = getNodeNames(linkedNote).includes(name) ? linkedNote : `${linkedNote}${linkedNote ? '\n' : ''}${mention}`;
  const nextLog = { ...previousLog, note };
  return {
    nodes: [...nodes, nextNode],
    logs: logs.map((log) => log.id === nextLog.id ? nextLog : log),
    snapshot: { nodeId: nextNode.id, name, nextNode, previousLog, nextLog } satisfies AINodeSnapshot
  };
};
