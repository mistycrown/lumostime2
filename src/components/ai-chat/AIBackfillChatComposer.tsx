/**
 * @file AIBackfillChatComposer.tsx
 * @input Composer state, quick-command callbacks, and theme
 * @output AI chat composer
 * @pos Component Support (AI Integration)
 * @description Renders the composer menu, text input, and send/stop controls.
 * @updated 2026-09-22: Extracted the composer view.
 */

import { Plus, Send, Square } from 'lucide-react';

export function AIBackfillChatComposer(props: Record<string, any>) {
  const {
    AI_CHAT_THEME,
    QUICK_ADD_BACKFILL_PREFIX,
    QUICK_ADD_NOTE_PREFIX,
    QUICK_ADD_TODO_PREFIX,
    activeMonthlyReviewShortcutOptions,
    activePersona,
    activeSession,
    activeWeeklyReviewShortcutOptions,
    composerContainerClassName,
    composerMenuRef,
    composerTextareaRef,
    focusComposerAtEnd,
    handleFillDailyNarrativeCommand,
    handleFillDailyNewspaperCommand,
    handleFillWriteMonthlyNarrativeCommand,
    handleFillWriteWeeklyNarrativeCommand,
    handleKeyDown,
    handleSend,
    handleStopRequest,
    inputText,
    isComposerMenuOpen,
    isDesktopWidgetMode,
    isHomeView,
    isLoading,
    isPersonaPanelOpen,
    isStopActionVisible,
    keyboardBottomInset,
    scrollToLatestMessage,
    setInputText,
    setIsComposerMenuOpen,
    shortcuts
  } = props;
  return (
    <>
          {!isHomeView && !isPersonaPanelOpen && <div
            className="absolute inset-x-0 bottom-0 z-30 px-4 pt-3 backdrop-blur-xl sm:px-5"
            style={{
              backgroundColor: AI_CHAT_THEME.shellLayerBg,
              paddingBottom: `calc(env(safe-area-inset-bottom) + ${keyboardBottomInset}px + 0.75rem)`
            }}
          >
            <div
              className={`relative mx-auto flex ${composerContainerClassName} flex-wrap items-center gap-2 rounded-full border px-2 py-1.5`}
              ref={composerMenuRef}
              style={{
                borderColor: AI_CHAT_THEME.panelBorder,
                backgroundColor: AI_CHAT_THEME.panelBg,
                boxShadow: AI_CHAT_THEME.cardShadow
              }}
            >
              {isComposerMenuOpen && (
                <div
                  className="absolute bottom-[calc(100%+0.65rem)] left-0 z-20 w-[min(19rem,calc(100vw-2rem))] rounded-[1rem] border p-2"
                  style={{
                    borderColor: AI_CHAT_THEME.panelBorder,
                    backgroundColor: AI_CHAT_THEME.panelBg,
                    boxShadow: AI_CHAT_THEME.cardShadowStrong
                  }}
                >
                  <div className="grid grid-cols-2 gap-1">
                    <button type="button" onClick={() => { setInputText(QUICK_ADD_TODO_PREFIX); setIsComposerMenuOpen(false); focusComposerAtEnd(); }} className="min-h-10 rounded-[0.7rem] px-3 text-left text-xs" style={{ backgroundColor: AI_CHAT_THEME.inputBg, color: AI_CHAT_THEME.textPrimary }}>快速添加待办</button>
                    <button type="button" onClick={() => { setInputText(QUICK_ADD_NOTE_PREFIX); setIsComposerMenuOpen(false); focusComposerAtEnd(); }} className="min-h-10 rounded-[0.7rem] px-3 text-left text-xs" style={{ backgroundColor: AI_CHAT_THEME.inputBg, color: AI_CHAT_THEME.textPrimary }}>快速添加备注</button>
                    <button type="button" onClick={() => { setInputText(QUICK_ADD_BACKFILL_PREFIX); setIsComposerMenuOpen(false); focusComposerAtEnd(); }} className="min-h-10 rounded-[0.7rem] px-3 text-left text-xs" style={{ backgroundColor: AI_CHAT_THEME.inputBg, color: AI_CHAT_THEME.textPrimary }}>快速添加补记</button>
                    {!isDesktopWidgetMode && activeSession?.templateMeta?.templateType === 'weekly_review' && <button type="button" onClick={() => { handleFillWriteWeeklyNarrativeCommand(); setIsComposerMenuOpen(false); }} className="min-h-10 rounded-[0.7rem] px-3 text-left text-xs" style={{ backgroundColor: AI_CHAT_THEME.inputBg, color: AI_CHAT_THEME.textPrimary }}>写入 AI 叙事</button>}
                    {!isDesktopWidgetMode && activeSession?.templateMeta?.templateType === 'monthly_review' && <button type="button" onClick={() => { handleFillWriteMonthlyNarrativeCommand(); setIsComposerMenuOpen(false); }} className="min-h-10 rounded-[0.7rem] px-3 text-left text-xs" style={{ backgroundColor: AI_CHAT_THEME.inputBg, color: AI_CHAT_THEME.textPrimary }}>写入 AI 叙事</button>}
                    {!isDesktopWidgetMode && !activeSession?.templateMeta && <><button type="button" onClick={() => { handleFillDailyNarrativeCommand(); setIsComposerMenuOpen(false); }} className="min-h-10 rounded-[0.7rem] px-3 text-left text-xs" style={{ backgroundColor: AI_CHAT_THEME.inputBg, color: AI_CHAT_THEME.textPrimary }}>叙事</button><button type="button" onClick={() => { handleFillDailyNewspaperCommand(); setIsComposerMenuOpen(false); }} className="min-h-10 rounded-[0.7rem] px-3 text-left text-xs" style={{ backgroundColor: AI_CHAT_THEME.inputBg, color: AI_CHAT_THEME.textPrimary }}>小报</button></>}
                    {shortcuts.filter((shortcut) => shortcut.enabled).map((shortcut) => <button key={shortcut.id} type="button" onClick={() => { setInputText(shortcut.content); setIsComposerMenuOpen(false); focusComposerAtEnd(); }} className="min-h-10 rounded-[0.7rem] px-3 text-left text-xs" style={{ backgroundColor: AI_CHAT_THEME.inputBg, color: AI_CHAT_THEME.textPrimary }}>{shortcut.title}</button>)}
                    {[...activeWeeklyReviewShortcutOptions, ...activeMonthlyReviewShortcutOptions].map((option) => <button key={option.key} type="button" onClick={() => { if (!isLoading) void handleSend(option.value); setIsComposerMenuOpen(false); }} disabled={isLoading} className="min-h-10 rounded-[0.7rem] px-3 text-left text-xs disabled:opacity-50" style={{ backgroundColor: AI_CHAT_THEME.inputBg, color: AI_CHAT_THEME.textPrimary }}>{option.label}</button>)}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsComposerMenuOpen((open) => !open)}
                className="order-1 inline-flex h-9 w-9 shrink-0 items-center justify-center p-0 transition-opacity hover:opacity-70"
                style={{ color: AI_CHAT_THEME.textSecondary }}
                title="更多功能"
                aria-label="更多功能"
                aria-expanded={isComposerMenuOpen}
              >
                <Plus size={19} strokeWidth={1.8} />
              </button>
              <textarea
                ref={composerTextareaRef}
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  window.requestAnimationFrame(() => {
                    scrollToLatestMessage('auto');
                  });
                }}
                placeholder={`和 ${activePersona.assistantSelfName || 'AI'} 说点什么...`}
                className="scrollbar-hide order-2 min-h-[34px] max-h-[34px] min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-1 py-1 text-[15px] leading-6 outline-none"
                style={{ color: AI_CHAT_THEME.textPrimary }}
                autoFocus
              />
  
              <div className="contents">
                {!isDesktopWidgetMode && activeSession?.templateMeta?.templateType === 'weekly_review' && (
                  <button
                    onClick={handleFillWriteWeeklyNarrativeCommand}
                    disabled={isLoading}
                    className="hidden"
                    style={{
                      borderColor: AI_CHAT_THEME.panelBorder,
                      backgroundColor: AI_CHAT_THEME.panelBgStrong,
                      color: AI_CHAT_THEME.textSecondary
                    }}
                    title="填充写入 AI 叙事"
                  >
                    写入 AI 叙事
                  </button>
                )}
                {!isDesktopWidgetMode && activeSession?.templateMeta?.templateType === 'monthly_review' && (
                  <button
                    onClick={handleFillWriteMonthlyNarrativeCommand}
                    disabled={isLoading}
                    className="hidden"
                    style={{
                      borderColor: AI_CHAT_THEME.panelBorder,
                      backgroundColor: AI_CHAT_THEME.panelBgStrong,
                      color: AI_CHAT_THEME.textSecondary
                    }}
                    title="填充写入 AI 叙事"
                  >
                    写入 AI 叙事
                  </button>
                )}
                {!isDesktopWidgetMode && !activeSession?.templateMeta && (
                  <>
                    <button
                      onClick={handleFillDailyNarrativeCommand}
                      disabled={isLoading}
                      className="hidden"
                      style={{
                        borderColor: AI_CHAT_THEME.panelBorder,
                        backgroundColor: AI_CHAT_THEME.panelBgStrong,
                        color: AI_CHAT_THEME.textSecondary
                      }}
                      title="快速填充叙事"
                    >
                      叙事
                    </button>
                    <button
                      onClick={handleFillDailyNewspaperCommand}
                      disabled={isLoading}
                      className="hidden"
                      style={{
                        borderColor: AI_CHAT_THEME.panelBorder,
                        backgroundColor: AI_CHAT_THEME.panelBgStrong,
                        color: AI_CHAT_THEME.textSecondary
                      }}
                      title="快速填充小报"
                    >
                      小报
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setIsComposerMenuOpen(false);
                    if (isStopActionVisible) {
                      handleStopRequest();
                      return;
                    }
                    void handleSend();
                  }}
                  disabled={!isStopActionVisible && !inputText.trim()}
                  className="order-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  style={
                    isStopActionVisible
                      ? {
                          border: `1px solid ${AI_CHAT_THEME.chipBorder}`,
                          backgroundColor: AI_CHAT_THEME.inputBg,
                          color: AI_CHAT_THEME.textSecondary
                        }
                      : {
                          border: `1px solid ${AI_CHAT_THEME.primaryButtonBorder}`,
                          backgroundColor: AI_CHAT_THEME.primaryButtonBg,
                          color: AI_CHAT_THEME.primaryButtonText
                        }
                  }
                  title={isStopActionVisible ? '停止' : '发送'}
                >
                  {isStopActionVisible ? <Square size={16} /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </div>}
    </>
  );
}
