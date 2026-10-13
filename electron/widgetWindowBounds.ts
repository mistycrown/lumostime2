/**
 * @file widgetWindowBounds.ts
 * @input Widget window and desired bounds in device-independent pixels
 * @output Restored native bounds without accumulating fractional-DPI rounding
 * @pos Electron window management
 * @description Corrects Windows frameless constructor borders and fractional scale rounding.
 * @updated 2026-10-13: Keeps saved widget layouts stable across desktop restarts.
 */
import type { BrowserWindow, Rectangle } from 'electron';

export const restoreWidgetBounds = (targetWindow: BrowserWindow, bounds: Rectangle): void => {
  let requested = { ...bounds };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    targetWindow.setBounds(requested);
    const actual = targetWindow.getBounds();
    if (Object.keys(bounds).every((key) => actual[key] === bounds[key])) {
      return;
    }
    requested = {
      x: requested.x + bounds.x - actual.x,
      y: requested.y + bounds.y - actual.y,
      // A docked AI handle can be narrower than Windows' native minimum width.
      width: bounds.width < 50 ? bounds.width : Math.max(1, requested.width + bounds.width - actual.width),
      height: Math.max(1, requested.height + bounds.height - actual.height)
    };
  }
};
