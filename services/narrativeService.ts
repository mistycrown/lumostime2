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
            systemRole = 'You are a professional daily review writer. You help users reflect on their day with empathy and insight.';
        } else if (periodType === 'weekly') {
            systemRole = 'You are a professional weekly review writer. You help users analyze their week, identifying trends, wins, and areas for improvement without getting bogged down in daily details.';
        } else { // monthly
            systemRole = 'You are a professional monthly review writer. You help users reflect on their month from a high-level perspective, focusing on long-term goals, life balance, and strategic direction.';
        }

        // --- SPECIFIC WRITING INSTRUCTIONS (To override "Diary" references) ---
        let writingInstructions = '';
        if (periodType === 'weekly') {
            writingInstructions = `
**IMPORTANT WRITING INSTRUCTIONS FOR WEEKLY REVIEW**:
1. **Scope**: This is a WEEKLY review. Do NOT write it as a daily diary.
2. **Focus**: Focus on the "Big Picture", trends throughout the week, and total time distribution.
3. **Structure**: Summarize key achievements and challenges across the whole week. Do not list events day by day unless critical.
4. **Tone**: Analytical yet encouraging.
`;
        } else if (periodType === 'monthly') {
            writingInstructions = `
**IMPORTANT WRITING INSTRUCTIONS FOR MONTHLY REVIEW**:
1. **Scope**: This is a MONTHLY review. Do NOT write it as a daily diary.
2. **Focus**: Focus on long-term growth, extensive time investment in key areas, and overall life balance.
3. **Structure**: highlighting the most significant shifts or consistency compared to general expectations.
4. **Tone**: Reflective, deep, and strategic.
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

        // Append specific instructions to the USER PROMPT to enforce the style
        // (We append it to ensure it overrides earlier "Diary" instructions in the template)
        if (writingInstructions) {
            promptTemplate += `\n\n${writingInstructions}`;
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
