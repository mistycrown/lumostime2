/**
 * @file narrativeService.ts
 * @input User Review Data, Statistics Text, AI Service
 * @output Generated Narrative String (Markdown)
 * @pos Service (Business Logic for Reviews)
 * @description Orchestrates the generation of daily, weekly, and monthly AI narratives by constructing prompts and calling the AI Service.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { DailyReview, Scope } from '../types';
import { aiService } from './aiService';
import { Solar } from 'lunar-javascript';


export const narrativeService = {
    /**
     * Generates a cohesive, first-person daily review narrative based on the provided data.
     */
    generateDailyNarrative: async (
        review: DailyReview,
        statsText: string,
        timelineText: string,
        customPrompt?: string,
        scopes?: Scope[],
        userPersonalInfo?: string,
        periodType: 'daily' | 'weekly' | 'monthly' = 'daily'
    ): Promise<string> => {
        // Debug info
        console.log(`%c[AI Request] Generating ${periodType} Narrative...`, 'color: #3b82f6; font-weight: bold');

        // Construct Prompt
        const answersText = review.answers.map(a => `问题: ${a.question}\n回答: ${a.answer}`).join('\n\n');

        // Format Scopes Info
        let scopesInfo = '暂无设置';
        if (scopes && scopes.length > 0) {
            const activeScopes = scopes.filter(s => !s.isArchived);
            if (activeScopes.length > 0) {
                scopesInfo = activeScopes
                    .map(s => `${s.icon} ${s.name}${s.description ? ` - ${s.description}` : ''}`)
                    .join('；');
            }
        }

        // User Info (use provided or default message)
        const userInfo = userPersonalInfo || '（用户未设置个人信息）';

        let promptTemplate = customPrompt || '';

        // Determine context labels based on periodType
        const periodLabelMap = {
            'daily': '今日数据',
            'weekly': '本周数据',
            'monthly': '本月数据'
        };
        const periodLabel = periodLabelMap[periodType];

        // --- DYNAMIC SYSTEM ROLE ---
        let systemRole = '';
        if (periodType === 'daily') {
            systemRole = '你是一位专业的日复盘写作者。你帮助用户以有同理心、有洞察力的方式回顾这一天。';
        } else if (periodType === 'weekly') {
            systemRole = '你是一位专业的周复盘写作者。你帮助用户分析这一周，识别趋势、收获与可改进之处，同时不过度陷入逐日细节。';
        } else { // monthly
            systemRole = '你是一位专业的月复盘写作者。你帮助用户从更高层视角回顾这个月，关注长期目标、生活平衡与战略方向。';
        }

        // --- SPECIFIC WRITING INSTRUCTIONS (To override "Diary" references) ---
        let writingInstructions = '';
        if (periodType === 'weekly') {
            writingInstructions = `
**周复盘写作重要要求**：
1. **范围**：这是一次周复盘，不要把它写成日记式流水账。
2. **焦点**：关注整周的大图景、贯穿一周的趋势，以及总体时间分布。
3. **结构**：概括整周的关键收获与挑战；除非必要，不要按天逐条列事件。
4. **语气**：保持分析性，同时给人支持感。
`;
        } else if (periodType === 'monthly') {
            writingInstructions = `
**月复盘写作重要要求**：
1. **范围**：这是一次月复盘，不要把它写成日记式流水账。
2. **焦点**：关注长期成长、关键领域里的持续投入，以及整体生活平衡。
3. **结构**：突出最显著的变化，或那些超出一般预期的持续一致性。
4. **语气**：保持反思感、深度和战略视角。
`;
        }

        // Smart Prompt Assembly:
        // If the template is just a persona (doesn't include ${statsText}), 
        // automatically append the standard data structure.
        if (!promptTemplate.includes('${statsText}') && !promptTemplate.includes('${timelineText}')) {
            promptTemplate += `\n
User Context (用户背景):
- **我的背景**: \${userInfo}
- **我关注的人生领域**: \${scopesInfo}

Data Provided (${periodLabel}):
1. **时间统计**:
\${statsText}
`;

            // Only add timeline section if text is provided (Weekly/Monthly might not have it or it's empty)
            if (timelineText && timelineText.trim().length > 0) {
                promptTemplate += `
2. **活动时间轴**:
\${timelineText}
`;
            }

            promptTemplate += `
3. **我的自我反思 (问答)**:
\${answersText}

**Date**: \${date}
`;
        }

        // --- GLOBAL FORMATTING RULES (Applies to ALL templates) ---
        // These rules are appended last to ensure they override any specific template looseness
        const GLOBAL_COSMIC_RULES = `
\n\n*** GLOBAL SYSTEM INSTRUCTIONS (MUST FOLLOW) ***
全局输出要求：
1. 使用Markdown格式。
2. 第一行必须是标题，不包含任何前缀。标题的格式为【固定icon】+【具体标题内容】。固定icon将在人设提示词中给出。
3. 最后一部分必须且只能是一个引用块 (Blockquote, >)，内容必须短小精悍。
4. 禁止使用 "根据数据..."、"通过分析..." 等废话作为开头，直接进入叙事或分析。
5. 禁止使用多余的比喻句、形容词、引号、破折号，请尽量像人那样写作。打破总结的模板，使句式丰富多样。
6. 你写的内容需要通顺易懂，态度谦虚真诚，突出自然真实，不要过度夸张。
`;
        promptTemplate += GLOBAL_COSMIC_RULES;

        // Append specific instructions to the USER PROMPT to enforce the style
        // (We append it to ensure it overrides earlier "Diary" instructions in the template)
        if (writingInstructions) {
            promptTemplate += `\n\n${writingInstructions}`;
        }

        // --- INJECT LUNAR DATA (For Cyber Almanac) ---
        if (promptTemplate.includes('${lunar_data}')) {
            try {
                // Ensure date string is parsed correctly (DailyReview date is YYYY-MM-DD)
                const dateStr = (review as any).date;
                let solar: Solar;

                if (dateStr && typeof dateStr === 'string' && dateStr.includes('-')) {
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                        solar = Solar.fromYmd(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]));
                    } else {
                        solar = Solar.fromDate(new Date());
                    }
                } else {
                    solar = Solar.fromDate(new Date());
                }

                const lunar = solar.getLunar();
                const nextSolar = solar.next(1);
                const nextLunar = nextSolar.getLunar();

                const lunarDataStr = `
【今日 (${solar.toYmd()})】
阴历：${lunar.toString()}
八字：${lunar.getBaZi().join(' ')}
五行：${lunar.getBaZiWuXing().join(' ')}
纳音：${lunar.getBaZiNaYin().join(' ')}
星宿：${lunar.getXiu()}宿${lunar.getXiuLuck()}

【明日 (${nextSolar.toYmd()})】
阴历：${nextLunar.toString()}
八字：${nextLunar.getBaZi().join(' ')}
五行：${nextLunar.getBaZiWuXing().join(' ')}
纳音：${nextLunar.getBaZiNaYin().join(' ')}
星宿：${nextLunar.getXiu()}宿${nextLunar.getXiuLuck()}
`;
                promptTemplate = promptTemplate.replace('${lunar_data}', lunarDataStr);
            } catch (e) {
                console.error('Failed to inject lunar data', e);
            }
        }

        // Replace placeholders
        const prompt = promptTemplate
            .replace(/\${date}/g, (review as any).date || (review as any).weekStartDate || (review as any).monthStartDate) // Handle different date fields
            .replace(/\${statsText}/g, statsText)
            .replace(/\${timelineText}/g, timelineText)
            .replace(/\${answersText}/g, answersText)
            .replace(/\${userInfo}/g, userInfo)
            .replace(/\${scopesInfo}/g, scopesInfo);

        console.log('Input Data:', {
            period: periodType,
            promptLength: prompt.length,
            // Only logging the final prompt to avoid confusion about duplication
            fullPrompt: prompt
        });

        try {
            // Pass the dynamic systemRole
            const narrative = await aiService.generateNarrative(prompt, systemRole);

            // Debug info
            console.log('%c[AI Response] Received Result:', 'color: #10b981; font-weight: bold');
            console.log('Output:', narrative);

            return narrative;
        } catch (error) {
            console.error('AI Generation Failed:', error);
            throw error;
        }
    }
};
