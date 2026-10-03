/**
 * @file feishuLogDescription.ts
 * @input A saved log, its category/activity definitions and linked todo/scope names.
 * @output Plain-text calendar descriptions with readable sections and complete record metadata.
 * @pos Feishu export formatting; excludes images and comments.
 */
import type { Activity, Category, Log, Scope, TodoItem } from '../types';

export interface FeishuLogDescriptionContext {
  todos?: Pick<TodoItem, 'id' | 'title'>[];
  scopes?: Pick<Scope, 'id' | 'name'>[];
}

export const FEISHU_LOG_DESCRIPTION_LIMIT = 12000;
const text = (value: string) => value.replace(/\r\n?/g, '\n').trim();
const bullet = (value: string) => `• ${value.replace(/\n/g, '\n  ')}`;

export function formatFeishuLogDescription(log: Log, category: Category, activity?: Activity,
  context: FeishuLogDescriptionContext = {}): string {
  const sections: string[] = [];
  if (log.note?.trim()) sections.push(`【备注】\n${text(log.note)}`);

  const definitions = new Map(activity?.attributes?.map((attribute) => [attribute.id, attribute]));
  const attributes = [...(log.attributeValues || [])]
    .sort((left, right) => (definitions.get(left.attributeId)?.order ?? Infinity) - (definitions.get(right.attributeId)?.order ?? Infinity))
    .flatMap((saved) => {
      const definition = definitions.get(saved.attributeId);
      let value: string;
      if ('value' in saved) {
        if (typeof saved.value === 'number' && !Number.isFinite(saved.value)) return [];
        value = text(String(saved.value));
        if (typeof saved.value === 'number' && definition?.unit?.trim()) value += ` ${text(definition.unit)}`;
      } else {
        const ids = 'optionId' in saved ? [saved.optionId] : saved.optionIds;
        value = [...new Set(ids)].map((id) => text(definition?.options?.find((option) => option.id === id)?.label || `选项（${id}）`)).join('、');
      }
      if (!value) return [];
      return [bullet(`${text(definition?.name || `属性（${saved.attributeId}）`)}：${value}`)];
    });
  if (attributes.length) sections.push(`【属性】\n${attributes.join('\n')}`);

  const ratings: string[] = [];
  for (const [label, value] of [['专注度', log.focusScore], ['情绪度', log.moodScore]] as const) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 5) ratings.push(`${label}：${value} / 5`);
  }
  if (ratings.length) sections.push(`【状态】\n${ratings.join('\n')}`);

  const links: string[] = [];
  if (log.linkedTodoId) {
    const todo = context.todos?.find((item) => item.id === log.linkedTodoId);
    links.push(`关联待办：${text(todo?.title || '已删除或不可用')}\n待办 ID：${log.linkedTodoId}`);
  }
  if (log.scopeIds?.length) {
    links.push(`关联领域：\n${[...new Set(log.scopeIds)].map((id) => {
      const scope = context.scopes?.find((item) => item.id === id);
      return bullet(`${text(scope?.name || '已删除或不可用')}（ID：${id}）`);
    }).join('\n')}`);
  }
  if (typeof log.progressIncrement === 'number' && Number.isFinite(log.progressIncrement)) links.push(`本次进度：${log.progressIncrement}`);
  if (links.length) sections.push(`【关联】\n${links.join('\n\n')}`);

  sections.push(`【记录来源】\nLumosTime\n分类：${text(category.name)}${activity ? `\n标签：${text(activity.name)}` : ''}\nLog ID：${log.id}`);
  const description = sections.join('\n\n');
  if (description.length > FEISHU_LOG_DESCRIPTION_LIMIT) {
    throw new Error(`记录“${log.title?.trim() || activity?.name || log.id}”的日历备注超过 ${FEISHU_LOG_DESCRIPTION_LIMIT} 字符，请缩短备注或属性后导入。`);
  }
  return description;
}
