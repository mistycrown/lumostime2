import { DailyReview } from '../types';
import { aiService } from './aiService';

export const DEFAULT_NARRATIVE_PROMPT = `
Role: You are a thoughtful, personal journaling assistant.
Task: Write a cohesive, first-person daily review narrative based on the provided data for today (\${date}).

Data Provided:
1. **Time Statistics**:
\${statsText}

2. **Activity Timeline**:
\${timelineText}

3. **My Self-Reflection (Q&A)**:
\${answersText}

Guidelines:
- Write in Chinese (Simplified).
- Use a reflective, natural, and personal tone.
- Do not just list the data; weave it into a story of the day.
- Highlight the "Highs" and "Lows" mentioned in the reflections.
- Conclude with a thought on growth or tomorrow's outlook.
- Use Markdown formatting for emphasis. **IMPORTANT**: Do NOT add spaces between asterisks and text (e.g., use **Keyword**, NOT ** Keyword **).
- **CRITICAL**: Use DOUBLE LINE BREAKS to separate paragraphs clearly.
- Use > Quote block for key takeaways or distinct thoughts.
- Keep it concise but meaningful (around 300-500 words).
`.trim();

export const narrativeService = {
    /**
     * Generates a cohesive, first-person daily review narrative based on the provided data.
     */
    generateDailyNarrative: async (review: DailyReview, statsText: string, timelineText: string, customPrompt?: string): Promise<string> => {
        // Debug info
        console.log('%c[AI Request] Generating Narrative...', 'color: #3b82f6; font-weight: bold');

        // Construct Prompt
        const answersText = review.answers.map(a => `问题: ${a.question}\n回答: ${a.answer}`).join('\n\n');

        let promptTemplate = customPrompt || DEFAULT_NARRATIVE_PROMPT;

        // Replace placeholders
        const prompt = promptTemplate
            .replace(/\${date}/g, review.date)
            .replace(/\${statsText}/g, statsText)
            .replace(/\${timelineText}/g, timelineText)
            .replace(/\${answersText}/g, answersText);

        console.log('Input Data:', {
            date: review.date,
            stats: statsText,
            timeline: timelineText,
            answers: review.answers,
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
