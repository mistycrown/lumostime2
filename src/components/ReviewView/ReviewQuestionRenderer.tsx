/**
 * @file ReviewQuestionRenderer.tsx
 * @input Review question definitions, saved answers, reading/editing mode, answer update callback
 * @output Question UI for Review guide tabs
 * @description Shared component for rendering review questions in both edit and reading modes
 * @updated 2026-08-06: Added per-text-question expand/collapse controls so long guide answers have more room while editing.
 */
import React from 'react';
import { ReviewQuestion, ReviewAnswer } from '../../types';
import { COLOR_OPTIONS } from '../../constants';
import * as LucideIcons from 'lucide-react';

interface ReviewQuestionRendererProps {
    question: ReviewQuestion;
    answer?: ReviewAnswer;
    isReadingMode: boolean;
    onUpdateAnswer: (questionId: string, question: string, answer: string) => void;
}

export const ReviewQuestionRenderer: React.FC<ReviewQuestionRendererProps> = ({
    question: q,
    answer,
    isReadingMode,
    onUpdateAnswer
}) => {
    if (isReadingMode) {
        return <ReadingModeQuestion question={q} answer={answer} />;
    }
    return <EditModeQuestion question={q} answer={answer} onUpdateAnswer={onUpdateAnswer} />;
};

// Edit Mode Question Component
const EditModeQuestion: React.FC<{
    question: ReviewQuestion;
    answer?: ReviewAnswer;
    onUpdateAnswer: (questionId: string, question: string, answer: string) => void;
}> = ({ question: q, answer, onUpdateAnswer }) => {
    const [isTextAnswerExpanded, setIsTextAnswerExpanded] = React.useState(false);
    const textareaId = React.useId();

    if (q.type === 'text') {
        return (
            <div key={q.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <label htmlFor={textareaId} className="text-sm leading-relaxed text-stone-700">
                        {q.question}
                    </label>
                    <button
                        type="button"
                        onClick={() => setIsTextAnswerExpanded((current) => !current)}
                        className="shrink-0 rounded-md p-1 text-stone-400 transition-all duration-200 hover:bg-stone-100 hover:text-stone-600"
                        title={isTextAnswerExpanded ? '收缩输入框' : '扩展输入框'}
                        aria-label={isTextAnswerExpanded ? '收缩输入框' : '扩展输入框'}
                    >
                        {isTextAnswerExpanded
                            ? <LucideIcons.Minimize2 size={16} />
                            : <LucideIcons.Minimize2 size={16} className="rotate-180" />}
                    </button>
                </div>
                <textarea
                    id={textareaId}
                    value={answer?.answer || ''}
                    onChange={(e) => onUpdateAnswer(q.id, q.question, e.target.value)}
                    className={`w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-[15px] leading-relaxed text-stone-800 shadow-sm outline-none transition-[height,border-color] duration-150 ease-out placeholder:text-stone-300 focus:border-stone-400 ${
                        isTextAnswerExpanded ? 'h-[320px]' : 'h-[112px]'
                    }`}
                    placeholder="输入你的回答..."
                />
            </div>
        );
    }

    if (q.type === 'choice' && q.choices) {
        return (
            <div key={q.id} className="space-y-3">
                <label className="text-sm text-stone-700">{q.question}</label>
                <div className="flex gap-2 flex-wrap">
                    {q.choices.map(choice => (
                        <button
                            key={choice}
                            onClick={() => onUpdateAnswer(q.id, q.question, choice)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                answer?.answer === choice
                                    ? 'bg-stone-900 text-white shadow-md'
                                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                            }`}
                        >
                            {choice}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (q.type === 'rating') {
        const getIcon = (iconName?: string) => {
            if (!iconName) return LucideIcons.Star;
            const Icon = (LucideIcons as any)[iconName] || (LucideIcons as any)[iconName.charAt(0).toUpperCase() + iconName.slice(1)];
            return Icon || LucideIcons.Star;
        };
        const RatingIcon = getIcon(q.icon);
        const currentRating = parseInt(answer?.answer || '0');

        return (
            <div key={q.id} className="space-y-3">
                <label className="text-sm text-stone-700">{q.question}</label>
                <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map((rating) => {
                        const colorOption = COLOR_OPTIONS.find(c => c.id === q.colorId) || COLOR_OPTIONS.find(c => c.id === 'amber')!;
                        const isActive = currentRating >= rating;

                        return (
                            <button
                                key={rating}
                                onClick={() => onUpdateAnswer(q.id, q.question, rating.toString())}
                                className={`p-2 rounded-xl transition-all flex items-center justify-center aspect-square max-w-14 w-full mx-auto ${
                                    isActive
                                        ? `${colorOption.text} ${colorOption.bg} scale-105`
                                        : 'text-stone-200 hover:text-stone-300'
                                }`}
                            >
                                <RatingIcon
                                    size={28}
                                    className="shrink-0"
                                    fill={isActive ? "currentColor" : "none"}
                                    strokeWidth={isActive ? 0 : 2}
                                />
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return null;
};

// Reading Mode Question Component
const ReadingModeQuestion: React.FC<{
    question: ReviewQuestion;
    answer?: ReviewAnswer;
}> = ({ question: q, answer }) => {
    const hasAnswer = answer?.answer && answer.answer.trim().length > 0;

    return (
        <div key={q.id}>
            <p className="text-[15px] font-bold text-stone-800 mb-2">{q.question}</p>

            <div className="pl-3 border-l-2 border-stone-200">
                {q.type === 'text' && (
                    <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
                        !hasAnswer ? 'text-stone-400 italic' : 'text-stone-600'
                    }`}>
                        {hasAnswer ? answer.answer : '未填写'}
                    </div>
                )}

                {q.type === 'choice' && (
                    <div className="flex gap-2 flex-wrap pt-1">
                        {q.choices?.map(choice => (
                            <span
                                key={choice}
                                className={`px-3 py-1 rounded text-xs font-medium border ${
                                    answer?.answer === choice
                                        ? 'bg-stone-800 text-white border-stone-800'
                                        : 'text-stone-400 border-stone-200'
                                }`}
                            >
                                {choice}
                            </span>
                        ))}
                    </div>
                )}

                {q.type === 'rating' && (
                    <div className="flex gap-1 pt-1">
                        {[1, 2, 3, 4, 5].map((rating) => {
                            const currentRating = parseInt(answer?.answer || '0');
                            const getIcon = (iconName?: string) => {
                                if (!iconName) return LucideIcons.Star;
                                const Icon = (LucideIcons as any)[iconName] || (LucideIcons as any)[iconName.charAt(0).toUpperCase() + iconName.slice(1)];
                                return Icon || LucideIcons.Star;
                            };
                            const RatingIcon = getIcon(q.icon);
                            const colorOption = COLOR_OPTIONS.find(c => c.id === q.colorId) || COLOR_OPTIONS.find(c => c.id === 'amber')!;
                            const isActive = currentRating >= rating;

                            return (
                                <RatingIcon
                                    key={rating}
                                    size={18}
                                    className={isActive ? colorOption.text : "text-stone-200"}
                                    fill={isActive ? "currentColor" : "none"}
                                    strokeWidth={isActive ? 0 : 2}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
