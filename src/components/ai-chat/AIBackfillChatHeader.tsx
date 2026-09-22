/**
 * @file AIBackfillChatHeader.tsx
 * @input AI chat theme, current persona, and navigation callbacks
 * @output AI chat header toolbar
 * @pos Component Support (AI Integration)
 * @description Renders the desktop widget and modal header controls.
 * @updated 2026-09-22: Extracted the chat header toolbar.
 */

import { ArrowLeft, ChevronRight, ExternalLink, History, Settings, X } from 'lucide-react';
import { PersonaAvatar } from './AIBackfillChatShared';

export function AIBackfillChatHeader(props: Record<string, any>) {
  const { AI_CHAT_THEME, activePersona, debugMode, isDesktopWidgetMode, isHomeView, isLoading, onClose, onHideToEdge, onOpenMainApp, setIsHistoryPanelOpen, setIsPersonaPanelOpen, setIsHomeView } = props;
  return (
          <div
            className="relative flex h-[3.25rem] items-center justify-between gap-3 px-4 backdrop-blur-md"
            style={{
              backgroundColor: AI_CHAT_THEME.panelBg,
              ...(isDesktopWidgetMode ? { WebkitAppRegion: 'drag' as const } : {})
            }}
          >
            <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-base transition-all"
                style={{
                  backgroundColor: AI_CHAT_THEME.avatarBg,
                  boxShadow: AI_CHAT_THEME.avatarShadow,
                  ...(isDesktopWidgetMode ? { WebkitAppRegion: 'no-drag' as const } : {})
                }}
                title={isDesktopWidgetMode ? '桌面 AI 快聊窗' : '打开 AI 设置'}
                onClick={() => {
                  if (!isDesktopWidgetMode && !isLoading) {
                    setIsPersonaPanelOpen(true);
                  }
                }}
              >
                <PersonaAvatar persona={activePersona} iconClassName="text-base" />
              </div>
  
              <div className="min-w-0 self-center">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-serif text-[1.05rem] font-bold leading-none" style={{ color: AI_CHAT_THEME.textPrimary }}>
                    {activePersona.name || 'AI 助手'}
                  </h2>
                  {isDesktopWidgetMode && (
                    <span
                      className="text-[10px] tracking-[0.08em]"
                      style={{ color: AI_CHAT_THEME.textMuted }}
                    >
                      快聊窗
                    </span>
                  )}
                  {debugMode && (
                    <span
                      className="text-[10px] tracking-[0.08em]"
                      style={{
                        color: AI_CHAT_THEME.textMuted
                      }}
                    >
                      调试中
                    </span>
                  )}
                </div>
              </div>
            </div>
  
            <div
              className="flex shrink-0 items-center gap-2"
              style={isDesktopWidgetMode ? ({ WebkitAppRegion: 'no-drag' } as any) : undefined}
            >
              {isDesktopWidgetMode ? (
                <>
                  <button
                    onClick={onOpenMainApp}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12px] transition-colors"
                    style={{
                      backgroundColor: AI_CHAT_THEME.panelBg,
                      color: AI_CHAT_THEME.textSecondary
                    }}
                    title="打开主应用"
                  >
                    <ExternalLink size={16} />
                    <span className="hidden sm:inline">主窗</span>
                  </button>
                  <button
                    onClick={onHideToEdge}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                    style={{
                      backgroundColor: AI_CHAT_THEME.panelBg,
                      color: AI_CHAT_THEME.textMuted
                    }}
                    title="贴边隐藏"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                    style={{
                      backgroundColor: AI_CHAT_THEME.panelBg,
                      color: AI_CHAT_THEME.textMuted
                    }}
                    title="关闭"
                  >
                    <X size={18} />
                  </button>
                </>
              ) : (
                <>
                  {!isHomeView && (
                    <button
                      onClick={() => setIsHomeView(true)}
                      disabled={isLoading}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12px] transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ color: AI_CHAT_THEME.textMuted }}
                      title="返回 AI 工作台"
                    >
                      <ArrowLeft size={15} />
                      <span className="hidden sm:inline">工作台</span>
                    </button>
                  )}
                  <button
                    onClick={() => !isLoading && (isHomeView ? setIsPersonaPanelOpen(true) : setIsHistoryPanelOpen(true))}
                    disabled={isLoading}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      backgroundColor: AI_CHAT_THEME.panelBg,
                      color: AI_CHAT_THEME.textSecondary
                    }}
                    title={isHomeView ? 'AI 设置' : '历史对话'}
                  >
                    {isHomeView ? <Settings size={18} /> : <History size={18} />}
                    <span className="hidden sm:inline">{isHomeView ? '设置' : '历史'}</span>
                  </button>
  
                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                    style={{
                      backgroundColor: AI_CHAT_THEME.panelBg,
                      color: AI_CHAT_THEME.textMuted
                    }}
                    title="关闭"
                  >
                    <X size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
  );
}
