/**
 * @file quoteService.ts
 * @description AI 引言生成服务 - 处理月度引言的问题库和 AI 生成
 */
import { aiService } from './aiService';

// 问题库 - 抽象的选择题
export interface QuoteQuestion {
  id: string;
  question: string;
  options: string[];
}

export const QUOTE_QUESTIONS: QuoteQuestion[] = [
  // 固定问题：语言偏好（总是第一个）
  {
    id: 'language',
    question: '你希望引言是中文还是英文？',
    options: ['中文', '英文']
  },
  // 感受与心情
  {
    id: 'feeling',
    question: '你希望这个月的感受是怎样的？',
    options: ['平静如水', '充满期待', '温暖踏实', '轻盈自在', '沉稳有力']
  },
  {
    id: 'mood',
    question: '你期待这个月的心情如何？',
    options: ['明亮轻盈', '沉静内敛', '温柔舒缓', '激昂澎湃', '从容淡定']
  },
  // 物象与意象
  {
    id: 'season',
    question: '你希望这个月像哪个季节？',
    options: ['春天的萌芽', '夏天的热烈', '秋天的沉淀', '冬天的静谧', '四季的流转']
  },
  {
    id: 'element',
    question: '你希望自己像哪种元素？',
    options: ['流动的水', '燃烧的火', '坚实的土', '自由的风', '生长的木']
  },
  {
    id: 'light',
    question: '你希望这个月是什么样的光？',
    options: ['清晨的曙光', '正午的阳光', '黄昏的余晖', '月光的温柔', '星光的闪烁']
  },
  {
    id: 'landscape',
    question: '你希望内心像什么样的风景？',
    options: ['辽阔的海洋', '宁静的湖泊', '连绵的山脉', '茂密的森林', '开阔的平原']
  },
  // 抽象感受
  {
    id: 'rhythm',
    question: '你想要什么样的节奏？',
    options: ['舒缓流畅', '稳健有力', '轻快跳跃', '深沉悠长', '自然随性']
  },
  {
    id: 'color',
    question: '你希望这个月的主色调是什么？',
    options: ['温暖的橙', '沉静的蓝', '生机的绿', '纯净的白', '深邃的紫']
  },
  {
    id: 'texture',
    question: '你希望生活的质感是？',
    options: ['柔软温润', '清爽利落', '厚重踏实', '轻盈飘逸', '粗粝真实']
  },
  // 期许与方向
  {
    id: 'goal',
    question: '这个月你最想实现什么？',
    options: ['完成重要目标', '养成新习惯', '突破自我', '保持平衡', '探索新领域']
  },
  {
    id: 'focus',
    question: '你想把精力放在哪里？',
    options: ['工作事业', '学习成长', '健康生活', '人际关系', '兴趣爱好']
  },
  {
    id: 'attitude',
    question: '你希望用什么态度度过？',
    options: ['积极进取', '从容淡定', '勇敢尝试', '专注投入', '享受当下']
  },
  {
    id: 'growth',
    question: '你想在哪方面成长？',
    options: ['专业能力', '情绪管理', '人际交往', '自我认知', '生活智慧']
  },
  {
    id: 'direction',
    question: '你想朝什么方向前进？',
    options: ['更高的目标', '更好的自己', '更深的理解', '更广的视野', '更稳的状态']
  },
  // 灵性与哲思
  {
    id: 'essence',
    question: '对你来说，什么最重要？',
    options: ['真实的自己', '内心的平静', '持续的成长', '深刻的连接', '自由的选择']
  },
  {
    id: 'wisdom',
    question: '你想从这个月获得什么智慧？',
    options: ['接纳与放下', '坚持与突破', '平衡与取舍', '觉察与理解', '勇气与温柔']
  },
  {
    id: 'energy',
    question: '你希望拥有什么样的能量？',
    options: ['温暖治愈', '清醒理性', '热情活力', '沉稳坚定', '柔韧包容']
  },
  {
    id: 'state',
    question: '你期待的状态是？',
    options: ['专注而投入', '松弛而有度', '清醒而热爱', '坚定而温柔', '自由而自律']
  },
  {
    id: 'journey',
    question: '你希望这个月像一场什么样的旅程？',
    options: ['探险之旅', '回归之旅', '修行之旅', '发现之旅', '疗愈之旅']
  }
];

// 随机选择问题（语言问题固定在第一个，其余随机选择）
export const getRandomQuestions = (count: number = 5): QuoteQuestion[] => {
  // 第一个问题固定是语言选择
  const languageQuestion = QUOTE_QUESTIONS[0];
  
  // 从剩余问题中随机选择
  const otherQuestions = QUOTE_QUESTIONS.slice(1);
  const shuffled = [...otherQuestions].sort(() => Math.random() - 0.5);
  const selectedOthers = shuffled.slice(0, count - 1);
  
  return [languageQuestion, ...selectedOthers];
};

// 用户回答
export interface QuoteAnswer {
  questionId: string;
  question: string;
  answer: string;
}

// AI 生成引言
export const generateQuotes = async (
  answers: QuoteAnswer[],
  monthStartDate: Date,
  monthEndDate: Date
): Promise<string[]> => {
  // 提取语言偏好
  const languageAnswer = answers.find(a => a.questionId === 'language');
  const preferredLanguage = languageAnswer?.answer || '中文';
  const isEnglish = preferredLanguage === '英文';
  
  // 其他回答
  const otherAnswers = answers.filter(a => a.questionId !== 'language');
  const answersText = otherAnswers
    .map(a => `问题：${a.question}\n回答：${a.answer}`)
    .join('\n\n');

  const monthStr = monthStartDate.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'long' 
  });

  const prompt = isEnglish 
    ? `You are a knowledgeable literary scholar and life mentor. The user is about to start ${monthStr} and has answered questions about their aspirations for this month:

${answersText}

Based on the user's aspirations and expectations for the upcoming month, please select 5 REAL famous quotes from historical figures, philosophers, writers, or other notable people that match their goals and mindset.

Requirements:

1. **REAL QUOTES ONLY**: All quotes MUST be authentic quotes from real people. DO NOT create or fabricate quotes.
2. **Include Attribution**: Each quote must include the author's name in the format: "Quote text" — Author Name
3. **Future-Oriented**: Quotes should inspire and guide the user through the upcoming month
4. **Diverse Styles**: Include different styles - inspirational, philosophical, poetic, warm, clear-minded
5. **Concise**: Keep quotes relatively short and impactful
6. **Relevant**: Quotes should align with the user's stated goals and desired attitude
7. **Motivational**: Quotes should provide strength and direction throughout the month

Please output 5 quotes directly, one per line, in the format: "Quote text" — Author Name
Do not number them or add extra explanations.`
    : `你是一位博学的文学学者和人生导师。用户即将开始 ${monthStr}，并回答了关于这个月期许的问题：

${answersText}

请基于用户对未来这个月的期许和展望，从古今中外的名人名言中选择 5 句真实的名言。这些名言将在月初展示，陪伴用户度过整个月。

要求：

1. **必须是真实名言**：所有名言都必须是真实存在的、有据可查的名人名言，不要编造或杜撰
2. **标注出处**：每句名言必须标注说这句话的人，格式为："名言内容" —— 人名
3. **面向未来**：名言应该能够激励和指引用户度过即将到来的这个月
4. **风格多样**：包含不同的风格，如励志、哲理、诗意、温暖、清醒等
5. **简洁有力**：选择相对简短、有冲击力的名言
6. **贴合用户**：名言要能反映用户对这个月的期待和想要的状态
7. **激励性**：能够在整个月中给用户力量和方向感

请直接输出 5 句名言，每句一行，格式为："名言内容" —— 人名
不要编号，不要额外解释。`;

  try {
    const response = await aiService.generateNarrative(prompt, '');
    
    // 解析返回的引言
    const quotes = response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.length <= 200) // 增加长度限制以容纳作者名
      .slice(0, 5); // 只取前5句

    if (quotes.length === 0) {
      throw new Error('AI 未返回有效的引言');
    }

    return quotes;
  } catch (error) {
    console.error('生成引言失败:', error);
    throw error;
  }
};
