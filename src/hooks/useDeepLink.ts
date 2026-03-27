/**
 * @file useDeepLink.ts
 * @input CategoryScopeContext (categories), SessionContext (activeSessions), ReviewContext (daily reviews and templates), ToastContext (addToast), callbacks for quick punch and activity control
 * @output Deep Link Listener (appUrlOpen event handler), NFC Listener (nfcTagScanned event handler)
 * @pos Hook (System Integration)
 * @description Handles app deep links and NFC scans with stable listeners, launch-url fallback, retained NFC error handling, NFC read-test interception, and stop-confirm routing for repeated activity tags.
 */
import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  NfcReadTestResultPayload,
  NfcService,
  NfcTagScannedPayload,
  NFC_READ_TEST_MODE_EVENT,
  NFC_READ_TEST_RESULT_EVENT
} from '../services/NfcService';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useSession } from '../contexts/SessionContext';
import { useReview } from '../contexts/ReviewContext';
import { useToast } from '../contexts/ToastContext';
import { getLocalDateStr } from '../utils/dateUtils';
import { applyDailyCheckActionForDate } from '../utils/dailyCheckUtils';

type DeepLinkStateSnapshot = {
  categories: ReturnType<typeof useCategoryScope>['categories'];
  activeSessions: ReturnType<typeof useSession>['activeSessions'];
  dailyReviews: ReturnType<typeof useReview>['dailyReviews'];
  checkTemplates: ReturnType<typeof useReview>['checkTemplates'];
  reviewTemplates: ReturnType<typeof useReview>['reviewTemplates'];
};

const dispatchReadTestResult = (payload: NfcReadTestResultPayload) => {
  window.dispatchEvent(new CustomEvent<NfcReadTestResultPayload>(NFC_READ_TEST_RESULT_EVENT, {
    detail: payload
  }));
};

export const useDeepLink = (
  handleQuickPunch: () => void,
  handleStartActivity: (activity: any, categoryId: string, todoId?: string, scopeIdOrIds?: string | string[], note?: string) => void,
  handleStopActivity: (sessionId: string) => void,
  handleRequestStopActivity: (sessionId: string) => void
) => {
  const { categories } = useCategoryScope();
  const { activeSessions } = useSession();
  const { dailyReviews, setDailyReviews, checkTemplates, reviewTemplates } = useReview();
  const { addToast } = useToast();

  const latestStateRef = useRef<DeepLinkStateSnapshot>({
    categories,
    activeSessions,
    dailyReviews,
    checkTemplates,
    reviewTemplates
  });
  const quickPunchRef = useRef(handleQuickPunch);
  const startActivityRef = useRef(handleStartActivity);
  const stopActivityRef = useRef(handleStopActivity);
  const requestStopActivityRef = useRef(handleRequestStopActivity);
  const addToastRef = useRef(addToast);
  const setDailyReviewsRef = useRef(setDailyReviews);
  const lastHandledUrlRef = useRef<{ key: string; timestamp: number } | null>(null);
  const isReadTestModeRef = useRef(false);

  useEffect(() => {
    latestStateRef.current = {
      categories,
      activeSessions,
      dailyReviews,
      checkTemplates,
      reviewTemplates
    };
  }, [activeSessions, categories, checkTemplates, dailyReviews, reviewTemplates]);

  useEffect(() => {
    quickPunchRef.current = handleQuickPunch;
  }, [handleQuickPunch]);

  useEffect(() => {
    startActivityRef.current = handleStartActivity;
  }, [handleStartActivity]);

  useEffect(() => {
    stopActivityRef.current = handleStopActivity;
  }, [handleStopActivity]);

  useEffect(() => {
    requestStopActivityRef.current = handleRequestStopActivity;
  }, [handleRequestStopActivity]);

  useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast]);

  useEffect(() => {
    setDailyReviewsRef.current = setDailyReviews;
  }, [setDailyReviews]);

  useEffect(() => {
    const handleReadTestModeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled?: boolean }>;
      isReadTestModeRef.current = !!customEvent.detail?.enabled;
    };

    window.addEventListener(NFC_READ_TEST_MODE_EVENT, handleReadTestModeChange as EventListener);
    return () => {
      window.removeEventListener(NFC_READ_TEST_MODE_EVENT, handleReadTestModeChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const handleDailyCheck = (checkItemId: string) => {
      const {
        dailyReviews: currentDailyReviews,
        checkTemplates: currentCheckTemplates,
        reviewTemplates: currentReviewTemplates
      } = latestStateRef.current;

      const result = applyDailyCheckActionForDate({
        dateStr: getLocalDateStr(new Date()),
        dailyReviews: currentDailyReviews,
        checkTemplates: currentCheckTemplates,
        reviewTemplates: currentReviewTemplates,
        checkItemId,
        actionMode: 'complete_once'
      });

      if (result.updatedReviews) {
        setDailyReviewsRef.current(result.updatedReviews);
      }

      if (result.status === 'not_found') {
        addToastRef.current('error', 'NFC 标签配置已失效，请重新写入');
        return;
      }

      if (result.status === 'unsupported_type') {
        addToastRef.current('error', '该日课类型暂不支持 NFC 打点');
        return;
      }

      if (result.status === 'already_completed') {
        addToastRef.current('info', '今日已完成，无需重复打点');
        return;
      }

      if (result.status === 'limit_reached') {
        addToastRef.current('info', '今日已达到最大次数');
        return;
      }

      if (result.status === 'incremented' || result.status === 'completed') {
        const content = result.item?.content || '日课';
        if (result.item?.manualMode === 'count') {
          addToastRef.current(
            'success',
            `已打点：${content}（${result.item.currentCount || 0}/${result.item.targetCount || 1}）`
          );
          return;
        }

        addToastRef.current('success', `已完成：${content}`);
      }
    };

    const handleStartAction = (catId: string, actId: string, toggleExisting: boolean) => {
      const { categories: currentCategories, activeSessions: currentActiveSessions } = latestStateRef.current;
      const category = currentCategories.find((entry) => entry.id === catId);
      const activity = category?.activities.find((entry) => entry.id === actId);

      if (!category || !activity) {
        addToastRef.current('error', '未找到对应的活动，请重新写入标签');
        return;
      }

      const existingSession = currentActiveSessions.find((session) => session.activityId === actId);
      if (toggleExisting && existingSession) {
        requestStopActivityRef.current(existingSession.id);
        return;
      }

      if (currentActiveSessions.length > 0) {
        currentActiveSessions.forEach((session) => stopActivityRef.current(session.id));
      }

      startActivityRef.current(activity, category.id);
      addToastRef.current('success', `已开始：${activity.name}`);
    };

    const handleRecordUrl = (urlObj: URL, toggleExistingActivity: boolean) => {
      if (urlObj.protocol !== 'lumostime:' || urlObj.host !== 'record') {
        return false;
      }

      const action = urlObj.searchParams.get('action');
      if (action === 'quick_punch' || action === 'quick_log') {
        quickPunchRef.current();
        return true;
      }

      if (action === 'start') {
        const catId = urlObj.searchParams.get('cat_id');
        const actId = urlObj.searchParams.get('act_id');
        if (catId && actId) {
          handleStartAction(catId, actId, toggleExistingActivity);
        } else {
          addToastRef.current('error', 'NFC 标签缺少活动配置');
        }
        return true;
      }

      if (action === 'daily_check') {
        const checkItemId = urlObj.searchParams.get('check_item_id');
        if (checkItemId) {
          handleDailyCheck(checkItemId);
        } else {
          addToastRef.current('error', 'NFC 标签缺少日课项目');
        }
        return true;
      }

      return false;
    };

    const processUrl = (urlString: string, toggleExistingActivity: boolean, source: 'scan' | 'deeplink') => {
      const now = Date.now();

      if (isReadTestModeRef.current) {
        dispatchReadTestResult({
          type: 'uri',
          value: urlString,
          source,
          scannedAt: now
        });
        return true;
      }

      const dedupeKey = urlString;
      const lastHandled = lastHandledUrlRef.current;
      if (lastHandled && lastHandled.key === dedupeKey && now - lastHandled.timestamp < 1000) {
        return true;
      }

      try {
        const urlObj = new URL(urlString);
        const handled = handleRecordUrl(urlObj, toggleExistingActivity);
        if (handled) {
          lastHandledUrlRef.current = { key: dedupeKey, timestamp: now };
        }
        return handled;
      } catch (error) {
        console.error('Deep link processing error', error);
        return false;
      }
    };

    const handleLaunchUrl = async () => {
      try {
        const launchUrl = await CapacitorApp.getLaunchUrl();
        if (launchUrl?.url) {
          processUrl(launchUrl.url, false, 'deeplink');
        }
      } catch (error) {
        console.error('Launch URL processing error', error);
      }
    };

    const setupDeepLink = async () => {
      const listener = await CapacitorApp.addListener('appUrlOpen', (data) => {
        console.log('Deep Link received:', data.url);
        processUrl(data.url, false, 'deeplink');
      });

      return listener;
    };

    const setupNfcScanListener = async () => {
      const listener = await NfcService.addListener('nfcTagScanned', (data: NfcTagScannedPayload) => {
        console.log('NFC Scanned:', data);

        if (isReadTestModeRef.current) {
          dispatchReadTestResult({
            ...data,
            source: 'scan',
            scannedAt: Date.now()
          });
          return;
        }

        if (data.type === 'error') {
          addToastRef.current('error', data.message ? `NFC 读取失败：${data.message}` : 'NFC 读取失败');
          return;
        }

        if (data.type !== 'uri' || !data.value) {
          addToastRef.current('info', data.message || 'NFC 已扫描，但标签中没有可执行的内容');
          return;
        }

        const handled = processUrl(data.value, true, 'scan');
        if (!handled) {
          addToastRef.current('info', `标签内容：${data.value}`);
        }
      });

      return listener;
    };

    let listenerHandle: { remove: () => void } | null = null;
    let scanListenerHandle: { remove: () => void } | null = null;
    let isDisposed = false;

    setupDeepLink().then((handle) => {
      if (isDisposed) {
        handle.remove();
        return;
      }
      listenerHandle = handle;
    });

    handleLaunchUrl();

    const platform = Capacitor.getPlatform();
    if (platform === 'android' || platform === 'ios') {
      setupNfcScanListener().then((handle) => {
        if (isDisposed) {
          handle.remove();
          return;
        }
        scanListenerHandle = handle;
      });
    }

    return () => {
      isDisposed = true;
      listenerHandle?.remove();
      scanListenerHandle?.remove();
    };
  }, []);
};
