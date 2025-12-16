import { DailyReview, Scope } from '../types';
import { aiService } from './aiService';

export const DEFAULT_NARRATIVE_PROMPT = `
Role: 你是一位善于通过叙事疗法进行心理抚慰的传记作家。

Task: 请根据【用户的时间数据】（客观骨架）和【用户的引导问答】（主观血肉），以第一人称写一篇日记。

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

---
# Core Narrative Techniques

1.  **问题外化**
    * ❌ 错误写法：“我今天很懒，我很焦虑。” (将问题内化为人格缺陷)
    * ✅ 正确写法：“‘拖延’今天占据了上风，让我的计划一度停滞。” / “焦虑感在下午2点来袭。” (将问题看作独立于人的外部因素)

2.  **寻找“例外”与“能动性”**
    * 在负面叙事中，必须挖掘用户做出的**主动选择**，哪怕非常微小。
    * ❌ 错误写法：“虽然很累，但这就是生活吧。” (被动接受，矫情无奈)
    * ✅ 正确写法：“面对疲惫，我没有强撑，而是**主动选择**了在两点钟停下来喝杯咖啡。这是我在照顾自己的身体。” (强调用户的主权)

3.  **去形容词化**
    * 多描写“动作”和“决定”，少描写“形容词”和“比喻”。
    * 用动词来构建力量感，而不是用形容词来渲染氛围。

---

# Output Structure (输出格式)
## [叙事重构]
(基于上述原则生成的日记。要体现出：我在面对问题时，我做了什么，这说明了我是什么样的人。)

## [行动脚注]
(提取一句基于“能动性”的短句。格式：虽然[问题]存在，但我[做了什么动作]，这很珍贵。)

---

**CRITICAL FORMATTING RULES**:
- 使用简体中文
- 使用 **加粗** 时不要在星号和文字间加空格（正确：**关键词**，错误：** 关键词 **）
- 段落之间使用**两个换行**分隔
- 全文控制在 300-400 字
- 我的个人信息和关注领域只是背景信息，请不要刻意提及。
- **第一人称**：始终用“我”。
- 日期：\${date}
`.trim();

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

        let promptTemplate = customPrompt || DEFAULT_NARRATIVE_PROMPT;

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
