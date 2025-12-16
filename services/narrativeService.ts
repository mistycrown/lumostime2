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
        userPersonalInfo?: string
    ): Promise<string> => {
        // Debug info
        console.log('%c[AI Request] Generating Narrative...', 'color: #3b82f6; font-weight: bold');

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

        // Smart Prompt Assembly:
        // If the template is just a persona (doesn't include ${statsText}), 
        // automatically append the standard data structure.
        if (!promptTemplate.includes('${statsText}') && !promptTemplate.includes('${timelineText}')) {
            promptTemplate += `\n
User Context (用户背景):
- **我的背景**: \${userInfo}
- **我关注的人生领域**: \${scopesInfo}

Data Provided (今日数据):
1. **时间统计**:
\${statsText}

2. **活动时间轴**:
\${timelineText}

3. **我的自我反思 (问答)**:
\${answersText}

**Date**: \${date}
`;
        }

        // Replace placeholders
        const prompt = promptTemplate
            .replace(/\${date}/g, review.date)
            .replace(/\${statsText}/g, statsText)
            .replace(/\${timelineText}/g, timelineText)
            .replace(/\${answersText}/g, answersText)
            .replace(/\${userInfo}/g, userInfo)
            .replace(/\${scopesInfo}/g, scopesInfo);

        console.log('Input Data:', {
            date: review.date,
            promptLength: prompt.length,
            // Only logging the final prompt to avoid confusion about duplication
            fullPrompt: prompt
        });

        try {
            const narrative = await aiService.generateNarrative(prompt);

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
