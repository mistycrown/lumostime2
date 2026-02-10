/**
 * @file useReviewState.ts
 * @description Shared state management hook for Review Views
 */
import { useState, useEffect } from 'react';
import { ReviewAnswer } from '../../types';

interface UseReviewStateProps {
    initialAnswers: ReviewAnswer[];
    initialNarrative: string;
    storageKey?: string; // For reading mode persistence
}

export const useReviewState = ({ 
    initialAnswers, 
    initialNarrative,
    storageKey = 'dailyReview_guideMode'
}: UseReviewStateProps) => {
    const [answers, setAnswers] = useState<ReviewAnswer[]>(initialAnswers);
    const [narrative, setNarrative] = useState(initialNarrative);
    const [isEditing, setIsEditing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [editedNarrative, setEditedNarrative] = useState('');
    const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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
        narrative,
        setNarrative,
        isEditing,
        setIsEditing,
        isGenerating,
        setIsGenerating,
        editedNarrative,
        setEditedNarrative,
        isStyleModalOpen,
        setIsStyleModalOpen,
        isDeleteConfirmOpen,
        setIsDeleteConfirmOpen,
        isReadingMode,
        toggleReadingMode
    };
};
