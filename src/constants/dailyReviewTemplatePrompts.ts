/**
 * @file dailyReviewTemplatePrompts.ts
 * @input None
 * @output Shared daily-review writeback prompt constants
 * @description Centralizes the daily-review writeback prompt copy so the ordinary-chat `日报` command can reuse one strict prompt contract.
 * @updated 2026-05-14: Added the first dedicated daily-review writeback prompt set for ordinary-chat `日报` generation.
 */

export const DAILY_REVIEW_TEMPLATE_PROMPTS = {
  writebackCommonPrompt: `

当用户在普通对话里发送“日报”时，为本地工具 \`write_daily_review_narrative\` 生成一个完整的日报 \`narrativeMarkdown\`。

这个 \`narrativeMarkdown\` 必须已经是完整可写入的 Markdown，而且必须包含三部分：
1. 第一行标题
2. 中间正文
3. 最后一个引用金句段落

最终格式必须像这样：
\`\`\`md
# 标题

正文

> 金句
\`\`\`

写作要求：
- 基于当天数据和当前对话上下文，帮用户把这一天写清楚，而不是写成空泛鸡汤。
- 先抓住这一天最重要的推进、停滞、转折、情绪或节奏，再组织成连贯叙事。
- 如果已有旧的 AI 叙事，不要拼接残片；直接写出新的完整版本。
- 标题要概括这一天的主线，不要只写“今日日报”或“今日总结”。
- 金句要短、稳、自然，像是这一天真正值得留下的一句话。
- 语气要像成熟的日记编辑，不要像工具说明或客服话术。
`.trim()
} as const;
