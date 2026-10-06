/**
 * @file detailStatisticsRendererMocks.tsx
 * @input Detail renderer tests requiring isolated settings and unrelated panels.
 * @output Offline platform and ancillary UI adapters.
 * @pos Test Support
 * @updated 2026-10-06: Keeps real detail views, buffered scope saving, charts, and card editor under test.
 */
import React from 'react';
export const useSettings = () => ({ uiIconTheme: 'default' });
export const useNavigation = () => ({ isGoalBatchManaging: false, setIsGoalBatchManaging: () => undefined });
export const useSponsorshipUnlocked = () => true;
export const useChartPaletteSequences = () => [];
export const useCustomColors = () => [];
export const useGoalStatus = () => ({});
export const DetailTimelineCard = () => <div>时间线</div>;
export const IconRenderer = ({ icon }: { icon: string }) => <span>{icon}</span>;
export const UIIconSelector = () => null;
export const GoalCard = () => null;
export const MajorGoalCard = () => null;
export const GoalBatchManageView = () => null;
export const NoteTemplateManager = () => null;
export const AssociatedTodoList = () => null;
export const ConfirmModal = () => null;
