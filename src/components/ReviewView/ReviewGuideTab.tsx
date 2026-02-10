/**
 * @file ReviewGuideTab.tsx
 * @description Shared Guide Tab component for Review Views
 */
import React from 'react';
import { Calendar } from 'lucide-react';
import { ReviewTemplateSnapshot, ReviewAnswer } from '../../types';
import { IconRenderer } from '../IconRenderer';
import { ReviewQuestionRenderer } from './ReviewQuestionRenderer';
import { getTemplateDisplayInfo } from './reviewUtils';

interface ReviewGuideTabProps {
    templates: ReviewTemplateSnapshot[];
    answers: ReviewAnswer[];
    isReadingMode: boolean;
    onUpdateAnswer: (questionId: string, question: string, answer: string) => void;
    onToggleSyncToTimeline?: (templateId: string) => void;
}

export const ReviewGuideTab: React.FC<ReviewGuideTabProps> = ({
    templates,
    answers,
    isReadingMode,
    onUpdateAnswer,
    onToggleSyncToTimeline
}) => {
    if (templates.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-stone-400">暂无启用的回顾模板</p>
                <p className="text-xs text-stone-300 mt-2">请在设置中启用回顾模板</p>
            </div>
        );
    }

    if (isReadingMode) {
        // Reading Mode (Receipt Style)
        return (
            <div className="space-y-8 px-1">
                {templates.map((template, idx, arr) => {
                    const { emoji, text } = getTemplateDisplayInfo(template.title);
                    return (
                        <div key={template.id}>
                            <div className="space-y-6 mb-8">
                                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                                    {emoji && <IconRenderer icon={emoji} size={20} />}
                                    <span>{text}</span>
                                </h3>
                                <div className="space-y-8 pl-1">
                                    {template.questions.map(q => {
                                        const answer = answers.find(a => a.questionId === q.id);
                                        return (
                                            <ReviewQuestionRenderer
                                                key={q.id}
                                                question={q}
                                                answer={answer}
                                                isReadingMode={true}
                                                onUpdateAnswer={onUpdateAnswer}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                            {/* Divider (except last) */}
                            {idx < arr.length - 1 && (
                                <div className="h-px bg-stone-100" />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    // Edit Mode (Card Style)
    return (
        <>
            {templates.map(template => {
                const { emoji, text } = getTemplateDisplayInfo(template.title);
                return (
                    <div key={template.id} className="bg-white rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                                {emoji && <IconRenderer icon={emoji} size={20} />}
                                <span>{text}</span>
                            </h3>
                            {/* syncToTimeline toggle */}
                            {onToggleSyncToTimeline && (
                                <button
                                    onClick={() => onToggleSyncToTimeline(template.id)}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                        template.syncToTimeline
                                            ? 'bg-stone-800 text-white'
                                            : 'bg-stone-100 text-stone-400'
                                    }`}
                                    title={template.syncToTimeline ? '已同步到时间轴' : '未同步到时间轴'}
                                >
                                    <Calendar size={16} />
                                </button>
                            )}
                        </div>
                        <div className="space-y-6">
                            {template.questions.map(q => {
                                const answer = answers.find(a => a.questionId === q.id);
                                return (
                                    <div key={q.id}>
                                        <ReviewQuestionRenderer
                                            question={q}
                                            answer={answer}
                                            isReadingMode={false}
                                            onUpdateAnswer={onUpdateAnswer}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </>
    );
};
