/**
 * @file useReviewState.ts
 * @description Shared state management hook for Review Views with Reading/Editing modes
 */
import { useState } from 'react';
import { ReviewAnswer } from '../../types';

interface UseReviewStateProps {
    initialAnswers: ReviewAnswer[];
    initialSummary?: string;
    initialNarrative: string;
    storageKey?: string; // For reading mode persistence
}

export const useReviewState = ({ 
    initialAnswers, 
    initialSummary = '',
    initialNarrative,
    storageKey = 'dailyReview_guideMode'
}: UseReviewStateProps) => {
    const [answers, setAnswers] = useState<ReviewAnswer[]>(initialAnswers);
    const [summary, setSummary] = useState(initialSummary);
    const [narrative, setNarrative] = useState(initialNarrative);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
    const [isDeleteSummaryConfirmOpen, setIsDeleteSummaryConfirmOpen] = useState(false);
    const [isDeleteNarrativeConfirmOpen, setIsDeleteNarrativeConfirmOpen] = useState(false);

    // Reading mode state
    const [isReadingMode, setIsReadingMode] = useState(() => {
        return localStorage.getItem(storageKey) === 'reading';
    });

    // Toggle reading mode
    const toggleReadingMode = () => {
        const newMode = !isReadingMode;
        setIsReadingMode(newMode);
        localStorage.setItem(storageKey, newMode ? 'reading' : 'editing');
    };

    return {
        answers,
        setAnswers,
        summary,
        setSummary,
        narrative,
        setNarrative,
        isGenerating,
        setIsGenerating,
        isStyleModalOpen,
        setIsStyleModalOpen,
        isDeleteSummaryConfirmOpen,
        setIsDeleteSummaryConfirmOpen,
        isDeleteNarrativeConfirmOpen,
        setIsDeleteNarrativeConfirmOpen,
        isReadingMode,
        setIsReadingMode,
        toggleReadingMode
    };
};
