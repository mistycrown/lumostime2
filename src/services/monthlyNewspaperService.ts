/**
 * @file monthlyNewspaperService.ts
 * @input Monthly review range data, local review context, and optional existing monthly newspaper content
 * @output Structured monthly-newspaper prompt text plus helpers for persisting AI monthly newspapers onto Monthly Review
 * @pos Service (Monthly Review Newspaper)
 * @description Powers the ordinary-chat `月小报` command by packaging one month of local context, composing a strict AI writeback contract, and writing structured editorial newspaper data back onto `MonthlyReview`.
 * @updated 2026-06-07: Rewrote the monthly newspaper prompt toward a companion-style editorial voice, reducing report-speak, template phrasing, and rigid second-person evaluation.
 * @updated 2026-06-07: Added the first monthly newspaper service for AI chat writeback and dedicated monthly newspaper rendering.
 */

import type {
  DailyReview,
  MonthlyNewspaper,
  MonthlyReview,
  ReviewTemplate,
  WeeklyReview
} from '../types';
import { assistantPromptService } from './assistantPromptService';
import {
  monthlyReviewTemplateService,
  type MonthlyReviewTemplateSelectionLabel
} from './monthlyReviewTemplateService';

const stringifyJson = (value: unknown): string => JSON.stringify(value, null, 2);

const STRICT_JSON_OUTPUT_RULES = [
  '=== Structured Output Contract ===',
  'You must return exactly one strict JSON object.',
  'Do not return any text before or after the JSON object.',
  'Do not use Markdown fences, comments, headings, or explanation outside the JSON.',
  'Your entire response must be valid JSON parsable by JSON.parse with no cleanup step.'
].join('\n');

interface BuildMonthlyNewspaperPromptParams {
  personaPrompt?: string;
  monthDataText: string;
  conversationSummary?: string;
  existingNewspaper?: MonthlyNewspaper;
  mergeMode: 'create' | 'overwrite';
}

export interface MonthlyNewspaperWritebackToolCall {
  toolName: 'write_monthly_newspaper';
  args: {
    monthStartDate: string;
    monthEndDate: string;
    mode: 'create' | 'overwrite';
    title: string;
    overallComment: string;
    keyInsights: string[];
    monthlyTheme: string;
    weekSections: Array<{
      weekStartDate: string;
      weekEndDate: string;
      weekLabel: string;
      weeklySummary: string;
      highlights: string[];
      riskPoint: string;
    }>;
    nextPeriodPlan: string[];
  };
}

export interface MonthlyNewspaperWritebackResponse {
  assistantReply: string;
  newspaperToolCall: MonthlyNewspaperWritebackToolCall;
}

const compactText = (value?: string, maxLength = 100): string => {
  const normalized = (value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  return normalized.length > maxLength
    ? `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`
    : normalized;
};

const buildPersonaPromptLayer = (personaPrompt?: string): string => {
  const trimmed = personaPrompt?.trim();
  if (!trimmed) {
    return '';
  }

  return [
    '=== User Persona Prompt ===',
    trimmed,
    'Apply this only as tone and interaction style.',
    'Do not switch back to the generic assistant task routing.'
  ].join('\n');
};

export const monthlyNewspaperService = {
  ensureMonthlyReview(
    monthlyReviews: MonthlyReview[],
    reviewTemplates: ReviewTemplate[],
    monthStartDate: string,
    monthEndDate: string
  ): { monthlyReviews: MonthlyReview[]; monthlyReview: MonthlyReview; created: boolean } {
    return monthlyReviewTemplateService.ensureMonthlyReview(
      monthlyReviews,
      reviewTemplates,
      monthStartDate,
      monthEndDate
    );
  },

  updateMonthlyReviewNewspaper(
    monthlyReviews: MonthlyReview[],
    reviewId: string,
    newspaper: MonthlyNewspaper
  ): MonthlyReview[] {
    const updatedAt = Date.now();
    return monthlyReviews.map((review) => (
      review.id === reviewId
        ? {
          ...review,
          aiNewspaper: {
            ...newspaper,
            updatedAt
          },
          updatedAt
        }
        : review
    ));
  },

  buildMonthDataText(params: {
    monthStartDate: string;
    monthEndDate: string;
    selectedRangeLabel: MonthlyReviewTemplateSelectionLabel;
    logs: Parameters<typeof monthlyReviewTemplateService.buildMonthDataText>[0]['logs'];
    categories: Parameters<typeof monthlyReviewTemplateService.buildMonthDataText>[0]['categories'];
    todos: Parameters<typeof monthlyReviewTemplateService.buildMonthDataText>[0]['todos'];
    todoCategories: Parameters<typeof monthlyReviewTemplateService.buildMonthDataText>[0]['todoCategories'];
    scopes: Parameters<typeof monthlyReviewTemplateService.buildMonthDataText>[0]['scopes'];
    dailyReviews: DailyReview[];
    weeklyReviews: WeeklyReview[];
    monthlyReview?: MonthlyReview;
  }): string {
    const baseMonthData = monthlyReviewTemplateService.buildMonthDataText(params);

    return [
      baseMonthData,
      '',
      '[本月 Monthly Newspaper]',
      params.monthlyReview?.aiNewspaper
        ? [
          `title: ${params.monthlyReview.aiNewspaper.title}`,
          `overallComment: ${compactText(params.monthlyReview.aiNewspaper.overallComment, 180)}`,
          `weekSectionCount: ${params.monthlyReview.aiNewspaper.weekSections.length}`,
          `nextPeriodPlanCount: ${params.monthlyReview.aiNewspaper.nextPeriodPlan.length}`
        ].join('\n')
        : '暂无 Monthly Newspaper'
    ].join('\n');
  },

  async buildWritebackPrompts(
    params: BuildMonthlyNewspaperPromptParams
  ): Promise<{ systemPrompt: string; userPrompt: string }> {
    const monthStartDate = params.monthDataText.match(/monthStartDate:\s*(.+)/)?.[1]?.trim() || '';
    const monthEndDate = params.monthDataText.match(/monthEndDate:\s*(.+)/)?.[1]?.trim() || '';
    const assistantBasePrompt = await assistantPromptService.getAssistantBasePrompt();

    const systemPrompt = [
      buildPersonaPromptLayer(params.personaPrompt),
      '=== Assistant Base Prompt ===',
      assistantBasePrompt,
      '',
      '=== Monthly Newspaper Writeback Prompt ===',
      '你现在要为 LumosTime 准备一个本地 tool call。',
      'newspaperToolCall.toolName 必须精确等于 "write_monthly_newspaper"。',
      '请用中文写。',
      'assistantReply 是显示在对话框里的简短回复。',
      '这是一份月尺度的小报，不要重写成流水账，也不要退化成统计播报。',
      '写作立场不是“系统给用户做月度复盘报告”，而是“一个一直在场的 AI 伙伴陪用户把这个月慢慢翻出来”。',
      '正文主体请保持约 70% 围绕用户这个月真实发生的生活、节奏、情绪、转折与反复，约 30% 保留 AI 自己的在场感、联想和批注。',
      'AI 可以偶尔自然地使用“我”，但不要喧宾夺主，不要把正文写成 AI 自我抒情。',
      '不要整篇都用第二人称评价用户，不要频繁用“你……”起句，不要把口吻写成外部观察员打分。',
      '优先写月度气氛、几周之间的变化、反复出现的状态、节奏如何慢慢成形；少写抽象判断、口号式鼓励和管理式建议。',
      '允许不同周的笔墨轻重不同；整体要像陪伴式月信或月刊批注，而不是工整模板。',
      'overallComment 更像这个月的开场与底色，要先把整个月的氛围和主线捞出来，不要写成执行摘要。',
      'keyInsights 只保留 2-4 条最关键、最具体的观察，不要写成泛泛的正确话。',
      'monthlyTheme 不要写成口号，要像这个月最后浮出来的一条暗线或底层情绪。',
      'weekSections 需要按周输出；weeklySummary 要像对这一周位置感的回看，highlights 是 1-3 条短批注，riskPoint 也要写得像真实卡点，而不是风险管理术语。',
      'nextPeriodPlan 给出 2-4 条下个月可以靠近的方向，语气像顺手记下的方向感，不要写成待办清单、绩效建议或命令。',
      '明确压低报告腔、套话腔、结构腔。',
      '禁止高频使用这些套话或相近变体：“可以看出”“说明了”“值得肯定”“体现出”“总的来说”“综上”“首先”“其次”“最后”。',
      '禁止使用“不是……而是……”这一类 AI 套话，也不要写成“看似 X，实则 Y”这种论证式对比句。',
      '不要让每一段都过于对称、过于整齐、过于像固定栏目填空。',
      '除了 JSON 对象本身，不要输出任何多余文本。',
      '',
      STRICT_JSON_OUTPUT_RULES,
      '=== Output Schema ===',
      stringifyJson({
        assistantReply: 'string',
        newspaperToolCall: {
          toolName: 'write_monthly_newspaper',
          args: {
            monthStartDate: 'string',
            monthEndDate: 'string',
            mode: 'create | overwrite',
            title: 'string',
            overallComment: 'string',
            keyInsights: ['string'],
            monthlyTheme: 'string',
            weekSections: [
              {
                weekStartDate: 'string',
                weekEndDate: 'string',
                weekLabel: 'string',
                weeklySummary: 'string',
                highlights: ['string'],
                riskPoint: 'string'
              }
            ],
            nextPeriodPlan: ['string']
          }
        }
      })
    ].filter(Boolean).join('\n\n');

    const existingSection = params.existingNewspaper
      ? [
        '=== Existing Monthly Newspaper ===',
        `title: ${params.existingNewspaper.title}`,
        `overallComment: ${params.existingNewspaper.overallComment}`,
        `weekSectionCount: ${params.existingNewspaper.weekSections.length}`
      ].join('\n')
      : '';

    const userPrompt = [
      '=== Conversation Context ===',
      stringifyJson({
        summary: params.conversationSummary?.trim() || '暂无'
      }),
      '',
      '=== Monthly Newspaper Data ===',
      params.monthDataText,
      '',
      existingSection,
      '',
      '=== Required Tool Arguments ===',
      `monthStartDate: ${monthStartDate}`,
      `monthEndDate: ${monthEndDate}`,
      `mode: ${params.mergeMode}`,
      '',
      '请返回一个 JSON object。',
      'assistantReply 给用户看。',
      'newspaperToolCall 用于把月小报写回 Monthly Review。',
      '正文要有人味、有陪伴感，但仍然要建立在输入里真实存在的月数据之上。'
    ].filter(Boolean).join('\n');

    return { systemPrompt, userPrompt };
  },

  parseWritebackResponse(
    raw: unknown,
    expectedMonthStartDate: string,
    expectedMonthEndDate: string,
    expectedMode: 'create' | 'overwrite'
  ): MonthlyNewspaperWritebackResponse {
    const parsed = typeof raw === 'string'
      ? JSON.parse(raw) as {
        assistantReply?: unknown;
        newspaperToolCall?: Partial<MonthlyNewspaperWritebackToolCall>;
      }
      : raw as {
        assistantReply?: unknown;
        newspaperToolCall?: Partial<MonthlyNewspaperWritebackToolCall>;
      };

    if (
      !parsed.newspaperToolCall
      || parsed.newspaperToolCall.toolName !== 'write_monthly_newspaper'
      || !parsed.newspaperToolCall.args
    ) {
      throw new Error('AI 没有返回 write_monthly_newspaper 工具调用。');
    }

    const args = parsed.newspaperToolCall.args;
    const title = typeof args.title === 'string' ? args.title.trim() : '';
    const overallComment = typeof args.overallComment === 'string' ? args.overallComment.trim() : '';
    const keyInsights = Array.isArray(args.keyInsights)
      ? args.keyInsights.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
      : [];
    const monthlyTheme = typeof args.monthlyTheme === 'string' ? args.monthlyTheme.trim() : '';
    const weekSections = Array.isArray(args.weekSections)
      ? args.weekSections.flatMap((section) => {
        if (!section || typeof section !== 'object') {
          return [];
        }

        const weekStartDate = typeof section.weekStartDate === 'string' ? section.weekStartDate.trim() : '';
        const weekEndDate = typeof section.weekEndDate === 'string' ? section.weekEndDate.trim() : '';
        const weekLabel = typeof section.weekLabel === 'string' ? section.weekLabel.trim() : '';
        const weeklySummary = typeof section.weeklySummary === 'string' ? section.weeklySummary.trim() : '';
        const highlights = Array.isArray(section.highlights)
          ? section.highlights.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
          : [];
        const riskPoint = typeof section.riskPoint === 'string' ? section.riskPoint.trim() : '';

        if (!weekStartDate || !weekEndDate || !weekLabel || !weeklySummary || !riskPoint) {
          return [];
        }

        return [{
          weekStartDate,
          weekEndDate,
          weekLabel,
          weeklySummary,
          highlights,
          riskPoint
        }];
      })
      : [];
    const nextPeriodPlan = Array.isArray(args.nextPeriodPlan)
      ? args.nextPeriodPlan.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
      : [];

    if (!title) {
      throw new Error('AI 返回的月小报标题为空。');
    }

    if (!overallComment) {
      throw new Error('AI 返回的月小报总评为空。');
    }

    if (!monthlyTheme) {
      throw new Error('AI 返回的月小报主题为空。');
    }

    return {
      assistantReply: typeof parsed.assistantReply === 'string' && parsed.assistantReply.trim()
        ? parsed.assistantReply.trim()
        : '这个月的小报已经整理好了。',
      newspaperToolCall: {
        toolName: 'write_monthly_newspaper',
        args: {
          monthStartDate: expectedMonthStartDate,
          monthEndDate: expectedMonthEndDate,
          mode: expectedMode,
          title,
          overallComment,
          keyInsights,
          monthlyTheme,
          weekSections,
          nextPeriodPlan
        }
      }
    };
  },

  buildNewspaperFromToolCall(
    toolCall: MonthlyNewspaperWritebackToolCall,
    assistantReply: string
  ): MonthlyNewspaper {
    return {
      version: 1,
      monthStartDate: toolCall.args.monthStartDate,
      monthEndDate: toolCall.args.monthEndDate,
      title: toolCall.args.title.trim(),
      assistantReply: assistantReply.trim(),
      overallComment: toolCall.args.overallComment.trim(),
      keyInsights: toolCall.args.keyInsights.map((item) => item.trim()).filter(Boolean),
      monthlyTheme: toolCall.args.monthlyTheme.trim(),
      weekSections: toolCall.args.weekSections.map((section) => ({
        weekStartDate: section.weekStartDate.trim(),
        weekEndDate: section.weekEndDate.trim(),
        weekLabel: section.weekLabel.trim(),
        weeklySummary: section.weeklySummary.trim(),
        highlights: section.highlights.map((item) => item.trim()).filter(Boolean),
        riskPoint: section.riskPoint.trim()
      })),
      nextPeriodPlan: toolCall.args.nextPeriodPlan.map((item) => item.trim()).filter(Boolean),
      updatedAt: Date.now()
    };
  }
};
