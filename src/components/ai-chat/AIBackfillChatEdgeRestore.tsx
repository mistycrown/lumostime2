/**
 * @file AIBackfillChatEdgeRestore.tsx
 * @input Desktop widget edge state and theme
 * @output Edge restore control
 * @pos Component Support (AI Integration)
 * @description Renders the compact restore handle when the widget is hidden at an edge.
 * @updated 2026-09-22: Extracted the edge restore view.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';

export function AIBackfillChatEdgeRestore(props: Record<string, any>) {
  const { AI_CHAT_THEME, desktopWidgetAnimationStyles, hiddenEdge, onRestoreFromEdge } = props;
  if (!props.isDesktopWidgetMode || !props.edgeHidden) {
    return null;
  }
  const restoreIcon = hiddenEdge === 'left' ? <ChevronRight size={16} /> : <ChevronLeft size={16} />;

  return (
    <div
      className="fixed inset-0 flex h-full w-full items-center justify-center bg-transparent"
      style={{ color: AI_CHAT_THEME.textSecondary }}
    >
      {desktopWidgetAnimationStyles}
      <button
        type="button"
        onClick={onRestoreFromEdge}
        className="flex h-14 w-4 items-center justify-center rounded-full border shadow-sm transition-colors"
        style={{
          borderColor: AI_CHAT_THEME.chipBorder,
          backgroundColor: AI_CHAT_THEME.panelBg,
          color: AI_CHAT_THEME.textPrimary,
          animation: 'aiWidgetHandleReveal 150ms cubic-bezier(0.22, 1, 0.36, 1)',
          ['--ai-widget-enter-x' as string]: hiddenEdge === 'left' ? '-7px' : '7px'
        }}
        title="展开 AI 对话窗"
      >
        {restoreIcon}
      </button>
    </div>
  );
}
