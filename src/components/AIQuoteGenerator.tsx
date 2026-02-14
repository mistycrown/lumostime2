/**
 * @file AIQuoteGenerator.tsx
 * @description AI 引言生成器组件 - 问答式交互生成月度引言
 */
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { QuoteQuestion, QuoteAnswer, getRandomQuestions, generateQuotes } from '../services/quoteService';

interface AIQuoteGeneratorProps {
  monthStartDate: Date;
  monthEndDate: Date;
  onSelectQuote: (quote: string) => void;
  onClose: () => void;
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

type Step = 'intro' | 'questions' | 'generating' | 'selection';

export const AIQuoteGenerator: React.FC<AIQuoteGeneratorProps> = ({
  monthStartDate,
  monthEndDate,
  onSelectQuote,
  onClose,
  addToast
}) => {
  const [step, setStep] = useState<Step>('intro');
  const [questions, setQuestions] = useState<QuoteQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuoteAnswer[]>([]);
  const [generatedQuotes, setGeneratedQuotes] = useState<string[]>([]);

  const monthStr = monthStartDate.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'long' 
  });

  // 开始问答
  const handleStart = () => {
    const randomQuestions = getRandomQuestions(5);
    setQuestions(randomQuestions);
    setStep('questions');
  };

  // 回答当前问题（点击选项直接跳转）
  const handleSelectOption = (option: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    const newAnswer: QuoteAnswer = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      answer: option
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    // 如果还有下一题，直接跳转
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // 所有问题回答完毕，开始生成
      handleGenerate(updatedAnswers);
    }
  };

  // 生成引言
  const handleGenerate = async (finalAnswers: QuoteAnswer[]) => {
    setStep('generating');
    try {
      const quotes = await generateQuotes(finalAnswers, monthStartDate, monthEndDate);
      setGeneratedQuotes(quotes);
      setStep('selection');
    } catch (error) {
      console.error('生成引言失败:', error);
      addToast('error', '生成引言失败，请检查 AI 配置');
      setStep('intro');
    }
  };

  // 选择引言
  const handleSelectQuote = (quote: string) => {
    onSelectQuote(quote);
    addToast('success', '引言已设置');
    onClose();
  };

  // 重新生成
  const handleRegenerate = () => {
    setStep('intro');
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setGeneratedQuotes([]);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#fdfbf7] w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-white/80 backdrop-blur sticky top-0 z-10 shrink-0">
          <h2 className="font-bold text-stone-800 text-lg">AI 引言生成器</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full text-stone-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar bg-[#faf9f6]">
          {/* Intro Step */}
          {step === 'intro' && (
            <div className="text-center space-y-6 py-8">
              <div>
                <h3 className="text-xl font-bold text-stone-900 mb-3">
                  为 {monthStr} 寻找一句引言
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  我会问你 5 个关于这个月期许的问题，<br />
                  然后根据你的回答生成 5 句引言供你选择
                </p>
              </div>
              <button
                onClick={handleStart}
                className="px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-lg"
                style={{
                  backgroundColor: 'var(--accent-color)',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-color)';
                }}
              >
                开始
              </button>
            </div>
          )}

          {/* Questions Step */}
          {step === 'questions' && currentQuestion && (
            <div className="space-y-6 py-4">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-stone-500">
                  <span>问题 {currentQuestionIndex + 1} / {questions.length}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--progress-bar-bg)' }}>
                  <div
                    className="h-full transition-all duration-300"
                    style={{ 
                      width: `${progress}%`,
                      backgroundColor: 'var(--progress-bar-fill)'
                    }}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="bg-stone-50 rounded-xl p-6 border border-stone-200">
                <h3 className="text-lg font-bold text-stone-900 mb-4">
                  {currentQuestion.question}
                </h3>
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectOption(option)}
                      className="w-full text-left px-4 py-3 rounded-xl border-2 border-stone-200 bg-white hover:border-stone-400 transition-all"
                    >
                      <span className="text-stone-800">{option}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Generating Step */}
          {step === 'generating' && (
            <div className="text-center space-y-6 py-12">
              <div className="w-16 h-16 border-4 border-stone-200 rounded-full animate-spin mx-auto"
                style={{ borderTopColor: 'var(--accent-color)' }}
              />
              <div>
                <h3 className="text-lg font-bold text-stone-900 mb-2">
                  AI 正在思考...
                </h3>
                <p className="text-stone-600">
                  根据你的期许生成引言
                </p>
              </div>
            </div>
          )}

          {/* Selection Step */}
          {step === 'selection' && (
            <div className="space-y-6 py-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-stone-900 mb-2">
                  选择你最喜欢的一句
                </h3>
                <p className="text-stone-600 text-sm">
                  点击即可设置为本月引言
                </p>
              </div>

              <div className="space-y-4">
                {generatedQuotes.map((quote, index) => {
                  // 提取引言内容，移除作者信息
                  // 支持多种分隔符：— – - ——
                  const separatorMatch = quote.match(/[—–\-]{1,2}\s*/);
                  let quoteText = quote;
                  
                  if (separatorMatch) {
                    // 只取分隔符前面的内容
                    quoteText = quote.split(separatorMatch[0])[0].trim();
                  }
                  
                  // 移除引号（支持中英文引号）
                  quoteText = quoteText.replace(/^["「『"]|["」』"]$/g, '').trim();
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleSelectQuote(quoteText)}
                      className="w-full text-left px-6 py-5 bg-stone-50 border-2 border-stone-200 rounded-xl transition-all hover:shadow-sm"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-color)';
                        e.currentTarget.style.backgroundColor = 'var(--card-bg)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '';
                        e.currentTarget.style.backgroundColor = '';
                      }}
                    >
                      <p className="text-base text-stone-800 leading-relaxed">
                        {quoteText}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-center gap-4 pt-4">
                <button
                  onClick={handleRegenerate}
                  className="px-6 py-2 text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  重新生成
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
