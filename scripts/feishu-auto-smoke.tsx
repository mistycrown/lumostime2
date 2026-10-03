/**
 * @file feishu-auto-smoke.tsx
 * @input Isolated Chromium storage and a local simulated Feishu API.
 * @output Mounted settings view, first-install hydration, real providers, root scheduler and deterministic test controls.
 * @pos Browser smoke-test fixture; excluded from product build.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DataProvider, useData } from '../src/contexts/DataContext';
import { CategoryScopeProvider, useCategoryScope } from '../src/contexts/CategoryScopeContext';
import { FeishuCalendarSettingsView } from '../src/views/settings/FeishuCalendarSettingsView';
import { useFeishuAutoSync } from '../src/hooks/useFeishuAutoSync';
import { storageRepository, IndexedDbStorageRepository } from '../src/repositories/storageRepository';
import { feishuAutoSyncStore } from '../src/services/feishuAutoSyncStore';
import type { Log } from '../src/types';
import '../src/index.css';

async function mount() {
  const fresh = new URLSearchParams(location.search).has('fresh');
  if (await storageRepository.getData('logs') === null) {
    await storageRepository.setBatch([
      ...(!fresh ? [{ namespace: 'data' as const, key: 'logs', value: [] }, { namespace: 'data' as const, key: 'todos', value: [] }] : []),
      { namespace: 'data', key: 'categories', value: [{ id: 'work', name: '工作', themeColor: '#336699', activities: [{ id: 'write', name: '写作', icon: '📝' }] }] },
      { namespace: 'data', key: 'scopes', value: [] }, { namespace: 'meta', key: 'core-data-migration-v2', value: true }
    ]);
  }
  function Screen() {
    const { logs, setLogs, isReady, usesFallbackSeedData } = useData();
    const { isReady: categoriesReady } = useCategoryScope();
    const [show, setShow] = useState(true);
    useFeishuAutoSync(isReady && categoriesReady && !usesFallbackSeedData);
    Object.assign(window, { smoke: {
      ready: isReady && categoriesReady,
      usesFallbackSeedData,
      persisted: async () => ({ logs: await storageRepository.getData('logs'), todos: await storageRepository.getData('todos') }),
      prepareEmptyDataset: () => storageRepository.setBatch([
        { namespace: 'data', key: 'logs', value: [] }, { namespace: 'data', key: 'todos', value: [] }
      ]),
      add: (id: string, title: string) => {
        const startTime = Date.now() - 120000;
        const log: Log = { id, title, categoryId: 'work', activityId: 'write', startTime, endTime: startTime + 60000, duration: 60 };
        setLogs((previous) => [...previous, log]);
      },
      edit: (id: string, title: string) => setLogs((previous) => previous.map((log) => log.id === id ? { ...log, title } : log)),
      remove: (id: string) => setLogs((previous) => previous.filter((log) => log.id !== id)),
      setShow, state: () => feishuAutoSyncStore.read(), logs: () => logs,
      verifyAtomicRollback: async () => {
        const repository = new IndexedDbStorageRepository();
        await repository.set('data', 'smoke-batch-rollback', 'original');
        try {
          await repository.setBatch([
            { namespace: 'data', key: 'smoke-batch-rollback', value: 'changed' },
            { namespace: 'meta', key: 'smoke-uncloneable', value: () => undefined }
          ]);
          return false;
        } catch {
          return await repository.get('data', 'smoke-batch-rollback') === 'original'
            && await repository.get('meta', 'smoke-uncloneable') === null;
        }
      }
    } });
    return show ? <FeishuCalendarSettingsView onBack={() => setShow(false)} /> : <div>记录页面</div>;
  }
  function Categories() {
    const { logs, setLogs } = useData();
    return <CategoryScopeProvider activeSessions={[]} setActiveSessions={() => undefined} logs={logs} setLogs={setLogs}><Screen /></CategoryScopeProvider>;
  }
  createRoot(document.getElementById('root')!).render(<DataProvider><Categories /></DataProvider>);
}
void mount();
