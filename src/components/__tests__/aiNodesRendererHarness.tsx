/**
 * @file aiNodesRendererHarness.tsx
 * @input Real DataProvider, NodeProvider, chat action adapters and isolated repository
 * @output Offline smoke assertions for node writeback, navigation, undo, retry and persistence
 * @pos Test (AI Nodes Renderer)
 * @updated 2026-10-09: Exercises desktop/mobile result cards without accessing user data or AI APIs.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { DataProvider, useData } from '../../contexts/DataContext';
import { NodeProvider, useNodes } from '../../contexts/NodeContext';
import { dataRepository } from '../../repositories/dataRepository';
import { useAIBackfillChatActionHandlers } from '../ai-chat/useAIBackfillChatActionHandlers';
import { renderAppliedChatAction } from '../ai-chat/AIBackfillChatAppliedActionRenderer';
import { rollbackAppliedChatActions, type AppliedChatAction } from '../../services/assistantActionExecutor';
import { assistantContextBuilder } from '../../services/assistantContextBuilder';
import { useAIBackfillChatRetry } from '../ai-chat/useAIBackfillChatRetry';
import { useAIBackfillChatResultHandlers } from '../ai-chat/useAIBackfillChatResultHandlers';
import { categories } from './nodeRendererMocks';
import type { Log } from '../../types';

declare global {
  interface Window {
    __aiNodesResult?: { passed: string[]; error?: string };
    __aiNodesCapture?: string | null;
  }
}
let data: ReturnType<typeof useData>;
let nodes: ReturnType<typeof useNodes>;
let handlers: ReturnType<typeof useAIBackfillChatActionHandlers>;
let retry: ReturnType<typeof useAIBackfillChatRetry>;
let setActions: React.Dispatch<React.SetStateAction<AppliedChatAction[]>>;
let retried = false;
const passed: string[] = [];
const host = document.getElementById('root')!;
let root = createRoot(host);
const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const until = async (predicate: () => unknown, label: string) => {
  for (let i = 0; i < 120; i++) { if (predicate()) return; await delay(); }
  throw new Error(`Timeout: ${label}`);
};
const noop = () => {};
const theme = {
  activeBorder: '#b1a18e', chipBg: '#f5f0e8', chipBorder: '#e1d6c9', dangerBg: '#fff', dangerBorder: '#b44', dangerText: '#b44',
  inputBg: '#fff', successBg: '#fff', successBorder: '#384', successText: '#384', textMuted: '#877765', textPrimary: '#342c24',
  textSecondary: '#675e50', undoneBg: '#fff', undoneBorder: '#aaa', undoneText: '#888'
};
const fixture = (id: string, day: number, isPlanned = false): Log => ({ id, isPlanned, categoryId: 'c', activityId: 'a', duration: 3600,
  startTime: new Date(2026, 9, day, 12).getTime(), endTime: new Date(2026, 9, day, 13).getTime(), note: '原有备注' });

const Probe = () => {
  data = useData(); nodes = useNodes();
  const [actions, updateActions] = React.useState<AppliedChatAction[]>([]);
  setActions = updateActions;
  handlers = useAIBackfillChatActionHandlers({ ...data, categories, scopes: [], defaultDateKey: '2026-10-09', autoApplyAutoLinkRules: false, autoLinkRules: [] });
  retry = useAIBackfillChatRetry({ ...data, activeSession: { id: 'session' }, isLoading: false, retryingMessageIdRef: { current: null },
    rollbackAppliedChatActions, resetAssistantPartRevealState: noop, resolveRetrySourceUserMessageId: () => 'user',
    updateAppliedActionStatus: noop, addToast: noop, handleSend: () => {
      check(!data.nodes.some((node) => node.name === '小李'), 'Retry retained the new node');
      check(data.logs.find((log) => log.id === 'latest')?.note === '原有备注', 'Retry retained a node mention');
      retried = true;
    }
  });
  return <main className="mx-auto max-w-xl p-5">
    <h1 className="mb-6 text-xl">AI 节点操作</h1>
    {actions.map((action) => <React.Fragment key={action.actionId}>{renderAppliedChatAction({
      action, ...data, categories, theme, messageId: 'message', formatActionDate: () => '2026.10.09', formatTimeRange: () => '12:00–13:00',
      getActivityById: () => categories[0].activities[0], getActivityCategory: () => categories[0], getScopeNames: () => [],
      onOpenLogEditor: noop, onOpenPrincipleEditor: noop, onOpenSelfBeliefEditor: noop, onOpenTodoDetail: noop,
      onUndoCreateSubtaskAction: noop, onUndoEditLogAction: noop, onUndoLogAction: noop, onUndoPlannedLogAction: noop,
      onUndoPrincipleAction: noop, onUndoSelfBeliefAction: noop, onUndoTodoAction: noop, onUndoUpdateTodoAction: noop,
      onUndoNodeAction: (_messageId, current) => {
        const restored = rollbackAppliedChatActions([current], data.logs, data.todos, data.nodes);
        data.updateNodeRecords(() => ({ nodes: restored.nodes, logs: restored.logs }));
        updateActions((previous) => previous.map((item) => item.actionId === current.actionId ? { ...item, status: 'undone' } : item));
      }
    })}</React.Fragment>)}
  </main>;
};
const mount = () => root.render(<DataProvider><NodeProvider><Probe /></NodeProvider></DataProvider>);
const capture = async (name: string) => {
  window.__aiNodesCapture = name;
  await until(() => !window.__aiNodesCapture, 'screenshot');
  check(document.documentElement.scrollWidth <= window.innerWidth, 'Horizontal overflow');
};

async function run() {
  await dataRepository.saveLogs([fixture('latest', 8), fixture('older', 7), fixture('future-plan', 12, true)]);
  await dataRepository.saveNodes([{ id: 'wang', name: '王小明', aliases: ['小王'], description: '喜欢咖啡', createdAt: 1, updatedAt: 1 }]);
  mount(); await until(() => data?.isReady && data.nodes.length === 1, 'hydrate');
  check(assistantContextBuilder.buildDictionaryContext({ nodes: data.nodes }).nodes?.[0].aliases[0] === '小王', 'Dictionary lost aliases');
  setActions(handlers.applyUnifiedToolCalls([{ toolName: 'upsert_node', args: { name: '小王', description: '怕鸟' } }], '帮我记一下小王怕鸟'));
  await until(() => data.nodes[0].description.includes('怕鸟') && host.textContent?.includes('已更新简介'), 'update biography');
  await capture('ai-nodes-updated-desktop');
  document.querySelector<HTMLButtonElement>('button[title="打开节点"]')!.click(); await delay();
  check(nodes.selectedNodeId === 'wang', 'Node navigation failed'); nodes.closeNode();
  document.querySelector<HTMLButtonElement>('button[title="撤销"]')!.click(); await delay();
  check(data.nodes[0].description === '喜欢咖啡' && host.textContent?.includes('已撤销'), 'Biography undo failed');
  passed.push('existing aliases update biographies, open nodes and undo through React state');

  const createdActions = handlers.applyUnifiedToolCalls([{ toolName: 'upsert_node', args: { name: '小李', description: '怕鸟' } }], '帮我记一下小李怕鸟');
  setActions(createdActions);
  await until(() => data.nodes.some((node) => node.name === '小李') && host.textContent?.includes('已创建节点'), 'create node');
  const created = data.nodes.find((node) => node.name === '小李')!;
  check(nodes.index.get(created.id)?.logs[0].id === 'latest', 'Created node backlink targeted the wrong log');
  check(data.logs.find((log) => log.id === 'future-plan')?.note === '原有备注', 'Future plan was changed');
  await capture('ai-nodes-created-mobile');
  await delay(350);
  const snapshot = await dataRepository.loadDataContextSnapshot();
  check(snapshot.nodes.some((node) => node.id === created.id && node.description === '怕鸟'), 'Node description did not persist');
  check(snapshot.logs.find((log) => log.id === 'latest')?.note?.includes('[[小李]]'), 'Mention did not persist');
  passed.push('new nodes attach to the latest actual log across dates and persist with backlinks');

  const previousData = data;
  root.unmount(); await delay(); root = createRoot(host); mount();
  await until(() => data !== previousData && data.isReady && data.nodes.some((node) => node.id === created.id), 'reload');
  check(nodes.index.get(created.id)?.logs.length === 1, 'Reload lost backlinks');
  const extra = handlers.applyUnifiedToolCalls([{ toolName: 'upsert_node', args: { nodeId: created.id, description: '喜欢猫' } }], '记一下小李喜欢猫');
  await delay();
  const restoreExtra = rollbackAppliedChatActions(extra, data.logs, data.todos, data.nodes);
  data.updateNodeRecords(() => ({ nodes: restoreExtra.nodes, logs: restoreExtra.logs })); await delay();
  retry({ id: 'message', role: 'assistant', retryInput: '帮我记一下小李怕鸟', appliedActions: createdActions });
  await until(() => retried, 'retry rollback');
  passed.push('reload and retry restore node metadata and log notes before resending');

  const noteActions = handlers.applyQuickAddNoteToolCalls([{ toolName: 'append_log_notes', args: { items: [{ logId: 'latest', text: '小王怕鸟', nodeIds: ['wang'] }] } }], '小王怕鸟');
  await delay();
  check(data.logs.find((log) => log.id === 'latest')?.note === '原有备注\n[[小王丨王小明]]怕鸟', 'Quick note did not preserve alias links');
  check(nodes.index.get('wang')?.logs.length === 1, 'Quick note did not create a backlink');
  setActions(noteActions); await delay();
  passed.push('quick notes use the node dictionary and create alias-preserving backlinks');

  const olderHandler = handlers.applyUnifiedToolCalls;
  data.setLogs((previous) => [fixture('just-added', 9), ...previous]); await delay();
  const liveActions = olderHandler([{ toolName: 'upsert_node', args: { name: '小周', description: '喜欢猫' } }], '记一下小周喜欢猫');
  await delay();
  check(data.logs.find((log) => log.id === 'just-added')?.note?.includes('[[小周]]'), 'Delayed AI reply used stale logs');
  const restoredLive = rollbackAppliedChatActions(liveActions, data.logs, data.todos, data.nodes);
  data.updateNodeRecords(() => ({ nodes: restoredLive.nodes, logs: [] })); await delay();
  const failedActions = handlers.applyUnifiedToolCalls([{ toolName: 'upsert_node', args: { name: '小赵', description: '怕鸟' } }], '记一下小赵怕鸟');
  setActions(failedActions); await delay();
  check(host.textContent?.includes('修改失败') && !data.nodes.some((node) => node.name === '小赵'), 'No-log failure created a node');
  const replies = useAIBackfillChatResultHandlers({} as any);
  check(replies.resolveForegroundAssistantReply('已经记好了', '记一下小赵怕鸟', failedActions).includes('先添加一条 Log'), 'Failed writeback claimed success');
  passed.push('delayed replies use live logs and empty-log failures surface without claiming success');
  window.__aiNodesResult = { passed };
}
run().catch((error) => { window.__aiNodesResult = { passed, error: error.stack || String(error) }; });
