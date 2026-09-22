/**
 * @file useAIBackfillChatRenderHelpers.ts
 * @input Applied-action rendering dependencies and responsive chat mode
 * @output Render callback and prompt/layout helpers
 * @pos Component Support (AI Integration)
 * @description Keeps static prompt examples and render adapters out of the modal coordinator.
 * @updated 2026-09-22: Extracted chat render helpers.
 */

export function useAIBackfillChatRenderHelpers(options: Record<string, any>) {
  const {
    AI_CHAT_THEME,
    categories,
    formatActionDate,
    formatTimeRange,
    getActivityById,
    getActivityCategory,
    getScopeNames,
    handleOpenLogEditor,
    handleOpenPrincipleEditor,
    handleOpenSelfBeliefEditor,
    handleOpenTodoDetail,
    handleUndoCreateSubtaskAction,
    handleUndoEditLogAction,
    handleUndoLogAction,
    handleUndoPlannedLogAction,
    handleUndoPrincipleAction,
    handleUndoSelfBeliefAction,
    handleUndoTodoAction,
    handleUndoUpdateTodoAction,
    isDesktopWidgetMode,
    logs,
    renderAppliedChatAction,
    todoCategories,
    todos
  } = options;

  const renderAppliedAction = (messageId: string, action: any) => (
    renderAppliedChatAction({
      action,
      categories,
      formatActionDate,
      formatTimeRange,
      getActivityById,
      getActivityCategory,
      getScopeNames,
      logs,
      messageId,
      onOpenLogEditor: handleOpenLogEditor,
      onOpenPrincipleEditor: handleOpenPrincipleEditor,
      onOpenSelfBeliefEditor: handleOpenSelfBeliefEditor,
      onOpenTodoDetail: handleOpenTodoDetail,
      onUndoCreateSubtaskAction: handleUndoCreateSubtaskAction,
      onUndoEditLogAction: handleUndoEditLogAction,
      onUndoLogAction: handleUndoLogAction,
      onUndoPlannedLogAction: handleUndoPlannedLogAction,
      onUndoPrincipleAction: handleUndoPrincipleAction,
      onUndoSelfBeliefAction: handleUndoSelfBeliefAction,
      onUndoTodoAction: handleUndoTodoAction,
      onUndoUpdateTodoAction: handleUndoUpdateTodoAction,
      theme: AI_CHAT_THEME,
      todoCategories,
      todos
    })
  );

  const fullPromptExampleGroups = [
    { title: '添加补记', prompt: '今天下午两点到三点半写周报，挂到工作 / 写作。' },
    { title: '添加待办', prompt: '帮我建一个明天下午提交的待办：论文初稿。' },
    { title: '规划今天', prompt: '我今天计划推进论文初稿、整理实验数据、晚上去跑步，帮我拆成待办，也顺手安排几个提醒。', requirement: '开启后台助理和长期记忆' },
    { title: '定时提醒', prompt: '今晚 8 点提醒我做拉伸，10 点再提醒我准备睡觉。', requirement: '开启后台助理和长期记忆' },
    { title: '长期记忆', prompt: '记住我喜欢先做难的事，提醒时语气可以直接一点。', requirement: '开启长期记忆' },
    { title: '随口聊聊', prompt: '我今天感觉有点乱，也有点累，陪我理一理现在最该做什么。' }
  ];
  const compactPromptExampleGroups = fullPromptExampleGroups.slice(0, 3);

  return {
    renderAppliedAction,
    emptyPromptExampleGroups: isDesktopWidgetMode ? compactPromptExampleGroups : fullPromptExampleGroups,
    conversationMaxWidthClassName: isDesktopWidgetMode ? 'max-w-none' : 'max-w-[920px]',
    emptyStateMaxWidthClassName: isDesktopWidgetMode ? 'max-w-none' : 'max-w-2xl',
    composerContainerClassName: isDesktopWidgetMode ? 'max-w-none' : 'max-w-[920px]'
  };
}
