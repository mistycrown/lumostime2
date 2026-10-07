/**
 * @file nodeDescriptionService.ts
 * @updated 2026-10-07: Supports AI-selected node types and custom biography sections while preserving legacy fields.
 * @input Node metadata and all related logs with timestamps
 * @output Concise editable node description through the existing AI configuration
 * @pos Service (Nodes)
 * @updated 2026-10-06: Added evidence-bounded node description generation.
 */
import type { Log, NoteNode } from '../types';
import { aiService } from './aiService';

export interface NodeDescriptionAiResult {
  nodeType: string;
  sections: Array<{ title: string; items: Array<{ label: string; value: string }> }>;
  basicInfo: { identity: string; relationship: string };
  bioAdditions: string[];
  recentInteractions: Array<{ date: string; summary: string }>;
}

const emptyResult = (): NodeDescriptionAiResult => ({ nodeType: '', sections: [], basicInfo: { identity: '', relationship: '' }, bioAdditions: [], recentInteractions: [] });

export const buildNodeDescriptionPrompt = (node: NoteNode, logs: Log[], reviewAnswers: Array<{ date: string; question: string; answer: string }> = []): string => JSON.stringify({
  名称: node.name,
  别名: node.aliases,
  已有简介: node.description,
  相关记录: logs.map((log) => ({
    时间: new Date(log.startTime).toLocaleString('zh-CN', { hour12: false }),
    标题: log.title || '',
    备注: log.note || ''
  })),
  日报回答: reviewAnswers.map((answer) => ({ 日期: answer.date, 问题: answer.question, 回答: answer.answer }))
});

const requestNodeDescription = async (node: NoteNode, logs: Log[], reviewAnswers: Array<{ date: string; question: string; answer: string }> = []): Promise<string> => {
  const config = aiService.getConfig();
  if (!config.apiKey?.trim()) throw new Error('请先在 AI 设置中配置服务');
  if (!logs.length && !reviewAnswers.length) throw new Error('暂无关联记录');
  return aiService.generateNarrative(buildNodeDescriptionPrompt(node, logs, reviewAnswers), [
    '请只返回严格 JSON，不要 Markdown 代码块或额外说明。',
    'JSON schema: {"nodeType":"人物|地点|项目|书籍|组织|其他","sections":[{"title":"大块标题","items":[{"label":"字段名","value":"内容"}]}],"basicInfo":{"identity":"","relationship":""},"bioAdditions":[""],"recentInteractions":[{"date":"YYYY-MM-DD","summary":""}]}。',
    '请根据名称、分类和记录判断节点类型，并自行设计最有用的 2-5 个大块标题；人物通常包含基本信息和最近交往记录，其他类型应使用适合其类型的字段。基本信息只能填写记录明确支持的身份和关系，不知道就留空。已有简介不可覆盖，只能提供事实性补充。最近交往记录按日期输出，同日内容可合并。禁止猜测性格、动机、亲密程度或用户情感。'
  ].join('\n'));
};

export const parseNodeDescriptionResult = (raw: string): NodeDescriptionAiResult => {
  const normalized = raw.trim();
  if (!normalized) throw new Error('AI 未返回简介，请重试');
  try {
    const parsed = JSON.parse(normalized) as Partial<NodeDescriptionAiResult>;
    const sections = Array.isArray(parsed.sections) ? parsed.sections.flatMap((section) => {
      if (!section || typeof section.title !== 'string' || !section.title.trim() || !Array.isArray(section.items)) return [];
      const items = section.items.flatMap((item) => item && typeof item.label === 'string' && typeof item.value === 'string' && item.value.trim() ? [{ label: item.label.trim(), value: item.value.trim() }] : []);
      return items.length ? [{ title: section.title.trim(), items }] : [];
    }) : [];
    return {
      nodeType: typeof parsed.nodeType === 'string' ? parsed.nodeType.trim() : '',
      sections,
      basicInfo: {
        identity: typeof parsed.basicInfo?.identity === 'string' ? parsed.basicInfo.identity.trim() : '',
        relationship: typeof parsed.basicInfo?.relationship === 'string' ? parsed.basicInfo.relationship.trim() : ''
      },
      bioAdditions: Array.isArray(parsed.bioAdditions) ? parsed.bioAdditions.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : [],
      recentInteractions: Array.isArray(parsed.recentInteractions) ? parsed.recentInteractions.flatMap((item) => (
        item && typeof item.date === 'string' && typeof item.summary === 'string' && item.summary.trim()
          ? [{ date: item.date.trim(), summary: item.summary.trim() }]
          : []
      )) : []
    };
  } catch {
    return { ...emptyResult(), bioAdditions: [normalized] };
  }
};

const section = (text: string, heading: string): string => {
  const match = text.match(new RegExp(`^## ${heading}\\s*$([\\s\\S]*?)(?=^## |$)`, 'm'));
  return match?.[1]?.trim() || '';
};

export const formatNodeDescription = (existing: string, result: NodeDescriptionAiResult): string => {
  const old = existing.trim();
  if (result.sections.length > 0) {
    const output = old ? [old] : [];
    const existingText = new Set(old.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
    for (const section of result.sections) {
      const newItems = section.items.map((item) => `- ${item.label}：${item.value}`).filter((line) => !existingText.has(line));
      if (!newItems.length) continue;
      const hasHeading = existingText.has(`## ${section.title}`);
      output.push([`## ${section.title}${hasHeading ? '（补充）' : ''}`, ...newItems].join('\n'));
    }
    if (output.length > 0) return output.join('\n\n').trim();
  }
  const oldBasic = section(old, '基本信息');
  const oldBio = section(old, '简介') || (old && !old.includes('## ') ? old : '');
  const oldRecent = section(old, '最近交往记录');
  const identity = oldBasic.match(/^- 身份：\s*(.*)$/m)?.[1]?.trim() || result.basicInfo.identity;
  const relationship = oldBasic.match(/^- 关系：\s*(.*)$/m)?.[1]?.trim() || result.basicInfo.relationship;
  const additions = result.bioAdditions.filter((item) => !oldBio.includes(item));
  const interactions = new Map<string, string[]>();
  for (const line of oldRecent.split('\n')) {
    const match = line.match(/^-\s*(\S+?)：\s*(.+)$/);
    if (match) interactions.set(match[1], [...(interactions.get(match[1]) || []), match[2]]);
  }
  for (const item of result.recentInteractions) interactions.set(item.date, [...(interactions.get(item.date) || []), item.summary]);
  const recent = [...interactions.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, items]) => {
    const parsedDate = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const displayDate = parsedDate ? `${Number(parsedDate[2])}月${Number(parsedDate[3])}日` : date;
    return `- ${displayDate}：${[...new Set(items)].join('；')}`;
  });
  return [
    '## 基本信息',
    `- 身份：${identity}`,
    `- 关系：${relationship}`,
    '',
    '## 简介',
    oldBio,
    ...additions,
    '',
    '## 最近交往记录',
    ...recent
  ].filter((line, index, lines) => !(line === '' && lines[index - 1] === '')).join('\n').trim();
};

export const generateNodeDescriptionResult = async (node: NoteNode, logs: Log[], reviewAnswers: Array<{ date: string; question: string; answer: string }> = []): Promise<NodeDescriptionAiResult> => parseNodeDescriptionResult(await requestNodeDescription(node, logs, reviewAnswers));

export const generateNodeDescription = async (node: NoteNode, logs: Log[]): Promise<string> => {
  const raw = await requestNodeDescription(node, logs);
  const parsed = parseNodeDescriptionResult(raw);
  return raw.trim().startsWith('{') ? formatNodeDescription(node.description, parsed) : parsed.bioAdditions[0];
};
