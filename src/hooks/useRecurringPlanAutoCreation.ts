/**
 * @file useRecurringPlanAutoCreation.ts
 * @input DataContext todos/logs and localStorage daily check marker
 * @output Missing recurring auto-Plan logs inserted into the timeline log store
 * @pos Hook (Todo planning automation)
 * @description Runs the finite Repeat todo auto-Plan materialization pass once per local day and again when relevant todo planning configs change.
 * @updated 2026-07-30: Added the first recurring auto-Plan creation hook for timeline Plan replenishment.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { formatDateKey } from '../utils/todoScheduleUtils';
import {
  buildRecurringPlanInsertions,
  buildRecurringPlanTodoSignature
} from '../utils/todoRecurringPlanUtils';

const RECURRING_PLAN_DAILY_CHECK_KEY = 'lumostime_recurring_plan_auto_check_date';

export const useRecurringPlanAutoCreation = () => {
  const { isReady, todos, setLogs } = useData();
  const latestTodosRef = useRef(todos);
  const previousSignatureRef = useRef<string | null>(null);
  const configSignature = useMemo(() => buildRecurringPlanTodoSignature(todos), [todos]);

  useEffect(() => {
    latestTodosRef.current = todos;
  }, [todos]);

  useEffect(() => {
    if (!isReady || typeof window === 'undefined') {
      return;
    }

    const todayDateKey = formatDateKey(new Date());
    const lastCheckedDateKey = window.localStorage.getItem(RECURRING_PLAN_DAILY_CHECK_KEY);
    const hasCheckedToday = lastCheckedDateKey === todayDateKey;
    const isFirstRun = previousSignatureRef.current === null;
    const hasConfigChanged = !isFirstRun && previousSignatureRef.current !== configSignature;

    previousSignatureRef.current = configSignature;

    if (isFirstRun && hasCheckedToday) {
      return;
    }

    if (hasCheckedToday && !hasConfigChanged) {
      return;
    }

    setLogs((previousLogs) => {
      const insertions = buildRecurringPlanInsertions(latestTodosRef.current, previousLogs, {
        referenceDate: new Date()
      });

      return insertions.length > 0
        ? [...previousLogs, ...insertions]
        : previousLogs;
    });

    if (!hasCheckedToday) {
      window.localStorage.setItem(RECURRING_PLAN_DAILY_CHECK_KEY, todayDateKey);
    }
  }, [configSignature, isReady, setLogs]);
};
