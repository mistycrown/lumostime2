/**
 * @file narrativeUtils.ts
 * @input narrative markdown text
 * @output parsed title and content
 * @pos Utility (Text Processing)
 * @description 统一的 Narrative 解析工具 - 从 markdown 文本中提取标题和内容
 * 
 * 使用场景：
 * - JournalView
 * - DailyReviewView
 * - WeeklyReviewView
 * - MonthlyReviewView
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

export interface ParsedNarrative {
  title: string;
  content: string;
}

/**
 * 解析 Review 的 narrative 字段，提取标题和内容
 * 
 * @param narrative - Review 的 narrative markdown 文本
 * @param defaultTitle - 默认标题（如果无法从 narrative 提取）
 * @returns 包含 title 和 content 的对象
 * 
 * @example
 * ```typescript
 * const { title, content } = parseNarrative(review.narrative, '2024-01-15');
 * // title: "今日总结"
 * // content: "今天完成了很多工作..."
 * ```
 * 
 * @example
 * ```typescript
 * // 带引用块的 narrative
 * const narrative = `
 * # 今日总结
 * 
 * 今天的工作进展顺利。
 * 
 * > 最重要的收获是学会了新技能
 * `;
 * const { title, content } = parseNarrative(narrative, 'Daily Review');
 * // title: "今日总结"
 * // content: "最重要的收获是学会了新技能"
 * ```
 */
export const parseNarrative = (
  narrative: string,
  defaultTitle: string
): ParsedNarrative => {
  let title = defaultTitle;
  let content = '...';

  if (!narrative || !narrative.trim()) {
    return { title, content };
  }

  // 移除开头的 # 标记并清理
  const cleanNarrative = narrative.replace(/^#+\s*/, '').trim();
  const lines = cleanNarrative.split('\n');
  
  // 获取标题（第一行）
  title = lines[0].trim() || defaultTitle;

  // 获取内容（优先使用最后一个引用块，否则使用正文）
  const quoteRegex = /(?:^|\n)>\s*(.*?)(?=(?:\n\n|$))/gs;
  const matches = [...narrative.matchAll(quoteRegex)];

  if (matches.length > 0) {
    // 使用最后一个引用块作为内容
    content = matches[matches.length - 1][1]
      .replace(/\n>\s*/g, '\n')
      .trim();
  } else {
    // 使用正文（跳过标题行）
    const bodyText = lines.slice(1).join('\n').trim();
    
    if (bodyText) {
      // 如果内容过长，截断并添加省略号
      content = bodyText.length > 100 
        ? bodyText.slice(0, 100) + '...' 
        : bodyText;
    }
  }

  return { title, content };
};

/**
 * 从 narrative 中提取所有引用块
 * 
 * @param narrative - Narrative markdown 文本
 * @returns 引用块数组
 * 
 * @example
 * ```typescript
 * const quotes = extractQuotes(narrative);
 * // ['第一个引用', '第二个引用']
 * ```
 */
export const extractQuotes = (narrative: string): string[] => {
  if (!narrative || !narrative.trim()) {
    return [];
  }

  const quoteRegex = /(?:^|\n)>\s*(.*?)(?=(?:\n\n|$))/gs;
  const matches = [...narrative.matchAll(quoteRegex)];

  return matches.map(match => 
    match[1].replace(/\n>\s*/g, '\n').trim()
  );
};

/**
 * 从 narrative 中提取标题
 * 
 * @param narrative - Narrative markdown 文本
 * @param defaultTitle - 默认标题
 * @returns 标题字符串
 * 
 * @example
 * ```typescript
 * const title = extractTitle('# 今日总结\n\n内容...', 'Daily Review');
 * // '今日总结'
 * ```
 */
export const extractTitle = (
  narrative: string,
  defaultTitle: string = 'Untitled'
): string => {
  if (!narrative || !narrative.trim()) {
    return defaultTitle;
  }

  // 匹配 markdown 标题（# 开头）
  const titleMatch = narrative.match(/^#+\s*(.+?)$/m);
  if (titleMatch) {
    return titleMatch[1].trim();
  }

  // 如果没有标题标记，使用第一行
  const firstLine = narrative.split('\n')[0].trim();
  return firstLine || defaultTitle;
};

/**
 * 从 narrative 中提取正文内容（不包括标题和引用块）
 * 
 * @param narrative - Narrative markdown 文本
 * @returns 正文内容
 * 
 * @example
 * ```typescript
 * const body = extractBody(narrative);
 * // '今天完成了很多工作...'
 * ```
 */
export const extractBody = (narrative: string): string => {
  if (!narrative || !narrative.trim()) {
    return '';
  }

  // 移除标题
  let content = narrative.replace(/^#+\s*.+?$/m, '').trim();
  
  // 移除引用块
  content = content.replace(/(?:^|\n)>\s*.*?(?=(?:\n\n|$))/gs, '').trim();
  
  return content;
};

/**
 * 格式化 narrative 为简短摘要
 * 
 * @param narrative - Narrative markdown 文本
 * @param maxLength - 最大长度
 * @returns 摘要字符串
 * 
 * @example
 * ```typescript
 * const summary = formatSummary(narrative, 50);
 * // '今天完成了很多工作，学会了新技能...'
 * ```
 */
export const formatSummary = (
  narrative: string,
  maxLength: number = 100
): string => {
  const { content } = parseNarrative(narrative, '');
  
  if (!content || content === '...') {
    return '...';
  }

  if (content.length <= maxLength) {
    return content;
  }

  return content.slice(0, maxLength) + '...';
};

/**
 * 检查 narrative 是否为空或只包含默认内容
 * 
 * @param narrative - Narrative markdown 文本
 * @returns 是否为空
 * 
 * @example
 * ```typescript
 * const isEmpty = isNarrativeEmpty(review.narrative);
 * if (isEmpty) {
 *   // 显示"暂无内容"
 * }
 * ```
 */
export const isNarrativeEmpty = (narrative: string | undefined): boolean => {
  if (!narrative || !narrative.trim()) {
    return true;
  }

  const { content } = parseNarrative(narrative, '');
  return !content || content === '...';
};

/**
 * 清理 narrative 中的 markdown 标记
 * 
 * @param narrative - Narrative markdown 文本
 * @returns 纯文本内容
 * 
 * @example
 * ```typescript
 * const plain = stripMarkdown('# 标题\n\n**粗体** 和 *斜体*');
 * // '标题\n\n粗体 和 斜体'
 * ```
 */
export const stripMarkdown = (narrative: string): string => {
  if (!narrative || !narrative.trim()) {
    return '';
  }

  return narrative
    // 移除标题标记
    .replace(/^#+\s*/gm, '')
    // 移除粗体和斜体
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // 移除引用块标记
    .replace(/^>\s*/gm, '')
    // 移除链接
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    // 移除代码块
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.+?)`/g, '$1')
    .trim();
};

/**
 * 构建 narrative markdown 文本
 * 
 * @param title - 标题
 * @param body - 正文
 * @param quote - 引用块（可选）
 * @returns Narrative markdown 文本
 * 
 * @example
 * ```typescript
 * const narrative = buildNarrative(
 *   '今日总结',
 *   '今天完成了很多工作',
 *   '最重要的收获是学会了新技能'
 * );
 * // '# 今日总结\n\n今天完成了很多工作\n\n> 最重要的收获是学会了新技能'
 * ```
 */
export const buildNarrative = (
  title: string,
  body: string,
  quote?: string
): string => {
  let narrative = `# ${title}\n\n${body}`;
  
  if (quote && quote.trim()) {
    narrative += `\n\n> ${quote}`;
  }
  
  return narrative;
};
