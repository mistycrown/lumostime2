/**
 * @file widgetTimerService.ts
 * @input None
 * @output Backward-compatible widget timer exports
 * @pos Service
 * @description Keeps existing widgetTimer imports working while the canonical implementation lives in widgetService.ts.
 * @updated 2026-04-16: Moved the widget implementation to widgetService.ts and kept this file as a compatibility shim.
 */
export * from './widgetService';
