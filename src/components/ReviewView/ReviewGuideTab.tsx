/**
 * @file ReviewGuideTab.tsx
 * @description Shared Guide Tab component for Review Views
 * @input Review templates, answers, optional log history and answer update callbacks
 * @output Shared reading/editing guide with inline answer completion
 * @updated 2026-10-11: Passes log history through to text-answer editors for note-style completion.
 */
import React from 'react';
import { Calendar } from 'lucide-react';
import { ReviewTemplateSnapshot, ReviewAnswer, Log } from '../../types';
import { IconRenderer } from '../IconRenderer';
import { ReviewQuestionRenderer } from './ReviewQuestionRenderer';
import { getTemplateDisplayInfo } from './reviewUtils';

interface ReviewGuideTabProps {
    templates: ReviewTemplateSnapshot[];
    answers: ReviewAnswer[];
    history?: readonly Log[];
    isReadingMode: boolean;
    onUpdateAnswer: (questionId: string, question: string, answer: string) => void;
    onToggleSyncToTimeline?: (templateId: string) => void;
}

export const ReviewGuideTab: React.FC<ReviewGuideTabProps> = ({
    templates,
    answers,
    history,
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

    // Edit Mode (Flat Style - No Card Nesting)
    return (
        <div className="space-y-8">
            {templates.map((template, idx, arr) => {
                const { emoji, text } = getTemplateDisplayInfo(template.title);
                return (
                    <div key={template.id}>
                        <div className="space-y-6 mb-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-stone-600 flex items-center gap-2">
                                    {emoji && <IconRenderer icon={emoji} size={16} />}
                                    <span>{text}</span>
                                </h3>
                                {/* syncToTimeline toggle */}
                                {onToggleSyncToTimeline && (
                                    <button
                                        onClick={() => onToggleSyncToTimeline(template.id)}
                                        className={`transition-colors ${
                                            template.syncToTimeline
                                                ? 'text-stone-800'
                                                : 'text-stone-300 hover:text-stone-400'
                                        }`}
                                        title={template.syncToTimeline ? '已同步到时间轴' : '未同步到时间轴'}
                                    >
                                        <Calendar size={14} />
                                    </button>
                                )}
                            </div>
                            <div className="space-y-6 pl-1">
                                {template.questions.map(q => {
                                    const answer = answers.find(a => a.questionId === q.id);
                                    return (
                                        <ReviewQuestionRenderer
                                            key={q.id}
                                            question={q}
                                            answer={answer}
                                            isReadingMode={false}
                                            history={history}
                                            onUpdateAnswer={onUpdateAnswer}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                        {/* Divider (except last) */}
                        {idx < arr.length - 1 && (
                            <div className="border-t border-stone-200" />
                        )}
                    </div>
                );
            })}
        </div>
    );
};
