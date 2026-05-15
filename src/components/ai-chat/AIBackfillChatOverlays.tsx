/**
 * @file AIBackfillChatOverlays.tsx
 * @input Background history timeline entries, debug viewer state, overlay theme colors, and overlay event handlers
 * @output Reusable full-screen overlays for AI background-history inspection and debug payload browsing
 * @pos Component Support (AI Integration)
 * @description Pulls the self-contained overlay render trees out of AIBackfillChatModal so the main modal can focus on conversation orchestration while keeping the overlay markup unchanged.
 * @updated 2026-05-14: Extracted background-history and debug-viewer overlays from AIBackfillChatModal.
 */
import React from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import type { AIDebugExchange } from '../../services/aiService';
import type {
  AssistantBackgroundTimelineEntry,
  DebugViewerState
} from './AIBackfillChatShared';

interface AIChatOverlayTheme {
  chipBorder: string;
  chipBorderStrong: string;
  dangerBg: string;
  dangerBorder: string;
  dangerText: string;
  panelBg: string;
  textPrimary: string;
  textSecondary: string;
}

interface AssistantBackgroundHistoryOverlayProps {
  entries: AssistantBackgroundTimelineEntry[];
  theme: AIChatOverlayTheme;
  onClear: () => void;
  onClose: () => void;
  onOpenDebug: (entry: AssistantBackgroundTimelineEntry) => void;
  getTriggerLabel: (triggerType?: string) => string;
  getRequestStatusLabel: (status: AssistantBackgroundTimelineEntry['requestStatus']) => string;
}

export const AssistantBackgroundHistoryOverlay: React.FC<AssistantBackgroundHistoryOverlayProps> = ({
  entries,
  theme,
  onClear,
  onClose,
  onOpenDebug,
  getTriggerLabel,
  getRequestStatusLabel
}) => (
  <div className="absolute inset-0 z-20 bg-[rgba(15,23,42,0.14)] backdrop-blur-[10px]">
    <div
      className="flex h-full flex-col bg-[#f3f4f6]"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <div className="flex h-14 items-center justify-between border-b border-[#e5e7eb] bg-[rgba(255,255,255,0.9)] px-4 backdrop-blur-md">
        <div>
          <h3 className="font-serif text-lg font-bold leading-none text-[#201c19]">后台调用记录</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors"
            style={{
              borderColor: theme.dangerBorder,
              backgroundColor: theme.dangerBg,
              color: theme.dangerText
            }}
          >
            清空记录
          </button>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] border border-[#e5e7eb] bg-white text-[#6b7280] transition-colors hover:border-[#cfd8e3] hover:bg-[#f9fafb] hover:text-[#111827]"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto max-w-4xl space-y-4">
          {entries.length === 0 ? (
            <div
              className="rounded-[0.95rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.96)] p-5"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)',
                backgroundColor: 'color-mix(in srgb, var(--accent-color) 2.5%, white)'
              }}
            >
              <p className="text-sm leading-6 text-stone-600">暂无后台诊断记录。</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-[0.95rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.96)] p-4"
                style={{
                  borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)',
                  backgroundColor: 'color-mix(in srgb, var(--accent-color) 2.5%, white)'
                }}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <p className="font-serif text-xl text-[#231f1b]">{getTriggerLabel(entry.triggerType)}</p>
                  <span
                    className="rounded-full border px-2 py-0.5 text-[11px]"
                    style={{
                      borderColor: theme.chipBorder,
                      backgroundColor: theme.panelBg,
                      color: theme.textSecondary
                    }}
                  >
                    {getRequestStatusLabel(entry.requestStatus)}
                  </span>
                  {entry.debugExchange && (
                    <button
                      onClick={() => onOpenDebug(entry)}
                      className="rounded-[0.75rem] border px-3 py-1 text-xs font-medium transition-colors"
                      style={{
                        borderColor: theme.chipBorderStrong,
                        backgroundColor: theme.panelBg,
                        color: theme.textPrimary
                      }}
                    >
                      查看请求
                    </button>
                  )}
                </div>
                <div className="mt-2 space-y-1 text-sm leading-6 text-stone-700">
                  <p>醒来时间：{entry.wakeAt || '未拿到原生时间'}</p>
                  <p>开始请求：{entry.requestStartedAt || '还没开始请求'}</p>
                  <p>请求结果：{entry.requestCompletedAt || (entry.requestStatus === 'pending' ? '进行中' : getRequestStatusLabel(entry.requestStatus))}</p>
                  {entry.triggerId && <p>Trigger ID：{entry.triggerId}</p>}
                  <p>结果内容：{entry.outcomeSummary}</p>
                  {entry.message && <p>返回消息：{entry.message}</p>}
                  {entry.errorMessage && <p style={{ color: theme.dangerText }}>错误：{entry.errorMessage}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  </div>
);

interface AIChatDebugViewerOverlayProps {
  viewer: DebugViewerState;
  expandedBlockKeys: Set<string>;
  onClose: () => void;
  onToggleBlock: (blockKey: string) => void;
  buildBlocks: (exchange: AIDebugExchange) => Array<{ label: string; content: string }>;
}

export const AIChatDebugViewerOverlay: React.FC<AIChatDebugViewerOverlayProps> = ({
  viewer,
  expandedBlockKeys,
  onClose,
  onToggleBlock,
  buildBlocks
}) => (
  <div className="absolute inset-0 z-20 bg-[rgba(15,23,42,0.14)] backdrop-blur-[10px]">
    <div
      className="flex h-full flex-col bg-[#f3f4f6]"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <div className="flex h-14 items-center justify-between border-b border-[#e5e7eb] bg-[rgba(255,255,255,0.9)] px-4 backdrop-blur-md">
        <div>
          <h3 className="font-serif text-lg font-bold leading-none text-[#201c19]">{viewer.title}</h3>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] border border-[#e5e7eb] bg-white text-[#6b7280] transition-colors hover:border-[#cfd8e3] hover:bg-[#f9fafb] hover:text-[#111827]"
        >
          <X size={20} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto max-w-4xl space-y-5">
          {viewer.sections.map((section, sectionIndex) => (
            <section
              key={`${section.label}-${sectionIndex}`}
              className="space-y-3 border-b border-[#e5e7eb] pb-5 last:border-b-0 last:pb-0"
            >
              <p className="px-1 font-serif text-xl text-[#231f1b]">{section.label}</p>
              <div className="mb-3 space-y-3">
                {buildBlocks(section.exchange).map((block, index) => {
                  const blockKey = `${section.label}-${block.label}-${index}`;
                  const isExpanded = expandedBlockKeys.has(blockKey);

                  return (
                    <div
                      key={blockKey}
                      className="overflow-hidden rounded-[0.85rem] border border-[#d8d2ca] bg-[rgba(255,255,255,0.72)]"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleBlock(blockKey)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.58)]"
                      >
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">{block.label}</span>
                        <span className="flex items-center gap-2 text-[11px] font-medium text-stone-400">
                          {isExpanded ? '收起' : '展开'}
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-[#e3ddd4] p-3 pt-3">
                          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-[0.85rem] border border-[#433a34] bg-[#2d2926] p-4 text-xs leading-6 text-[#efe7db] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                            {block.content}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  </div>
);
