/**
 * @file desktopTodoQuickEditorAnchorUtils.ts
 * @input Widget click or keyboard activation events plus optional Electron window bounds
 * @output Screen-space anchor coordinates for the external desktop todo quick editor
 * @pos Utility (desktop widget quick editor)
 * @description Converts renderer-local widget events into screen coordinates so the Electron quick-editor window can open beside the clicked todo row instead of being clipped inside the widget window.
 * @updated 2026-05-17: Added shared screen-anchor resolution for today, quick, and month desktop widget todo clicks.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

interface DesktopTodoQuickEditorAnchorEvent {
  currentTarget: EventTarget & HTMLElement;
  screenX?: number;
  screenY?: number;
}

const hasScreenPoint = (
  event: DesktopTodoQuickEditorAnchorEvent
): event is DesktopTodoQuickEditorAnchorEvent & { screenX: number; screenY: number } => (
  typeof event.screenX === 'number'
  && typeof event.screenY === 'number'
  && (event.screenX !== 0 || event.screenY !== 0)
);

export const resolveDesktopTodoQuickEditorScreenAnchor = async (
  event: DesktopTodoQuickEditorAnchorEvent
): Promise<{ x: number; y: number }> => {
  if (hasScreenPoint(event)) {
    return {
      x: Math.round(event.screenX),
      y: Math.round(event.screenY)
    };
  }

  const rect = event.currentTarget.getBoundingClientRect();
  const windowBounds = await window.desktopWidget?.getBounds?.();
  const offsetX = rect.left + (rect.width / 2);
  const offsetY = rect.top + Math.min(rect.height, 24);

  if (windowBounds) {
    return {
      x: Math.round(windowBounds.x + offsetX),
      y: Math.round(windowBounds.y + offsetY)
    };
  }

  return {
    x: Math.round(window.screenX + offsetX),
    y: Math.round(window.screenY + offsetY)
  };
};
