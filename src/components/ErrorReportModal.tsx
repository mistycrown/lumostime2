/**
 * @file ErrorReportModal.tsx
 * @input Captured error reference, user-facing error message and close callback
 * @output Persistent feedback receipt with verified delivery, user ID and retry
 * @pos Component (Modal)
 * @description Connects automatic error notifications to the shared feedback report flow.
 * @updated 2026-10-25: Adds automatic error receipts using the manual report dialog.
 */
import React, { useEffect, useState } from 'react';
import { FeedbackReportModal } from './FeedbackReportModal';
import { getErrorReportUserId, retryErrorReport, waitForErrorReport } from '../services/errorReporting';

interface ErrorReportModalProps {
  eventId: string;
  message: string;
  onClose: () => void;
}

export const ErrorReportModal: React.FC<ErrorReportModalProps> = ({ eventId, message, onClose }) => {
  const [attempt, setAttempt] = useState(0);
  const [receipt, setReceipt] = useState<{
    status: 'sending' | 'sent' | 'failed' | 'disabled';
    eventId: string | null;
    userId: string;
  }>(() => ({ status: 'sending', eventId: null, userId: getErrorReportUserId(eventId) }));

  useEffect(() => {
    let active = true;
    setReceipt((current) => ({ ...current, status: 'sending', eventId: null }));
    const report = attempt === 0 ? waitForErrorReport(eventId) : retryErrorReport(eventId);
    void report.then((result) => {
      if (!active) return;
      setReceipt((current) => result.status === 'sent'
        ? { status: 'sent', eventId: result.eventId, userId: result.userId }
        : { ...current, status: result.status === 'disabled' ? 'disabled' : 'failed' });
    });
    return () => { active = false; };
  }, [attempt, eventId]);

  return <FeedbackReportModal {...receipt} message={message} onClose={onClose} onRetry={() => setAttempt((current) => current + 1)} />;
};
