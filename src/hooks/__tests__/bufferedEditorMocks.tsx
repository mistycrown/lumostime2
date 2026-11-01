/**
 * @file bufferedEditorMocks.tsx
 * @updated 2026-11-01: Isolates timer attachments from note/review lifecycle regressions.
 * @updated 2026-10-16: Adds review state adapters for real manager save/reopen regressions.
 * @input Isolated editor test renders
 * @output Platform and unrelated overlay adapters
 * @pos Test Support
 */
import React from 'react';
export const reviewState: any = { dailyReviews: [], weeklyReviews: [], monthlyReviews: [], reviewTemplates: [], checkTemplates: [] };
export const useReview = () => ({
  ...reviewState,
  ...Object.fromEntries(['dailyReviews', 'weeklyReviews', 'monthlyReviews'].map(key => [
    `set${key[0].toUpperCase()}${key.slice(1)}`,
    (value: any) => { reviewState[key] = typeof value === 'function' ? value(reviewState[key]) : value; }
  ]))
});
export const useOptionalReview = () => undefined;
export const useCategoryScope = () => ({ scopes: [] });
export const narrativeService = { generateDailyNarrative: async () => 'Generated' };
export const nativeState = { callback: undefined as undefined | ((state: { isActive: boolean }) => void), removals: 0 };
export const Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android' };
export const registerPlugin = () => new Proxy({}, { get: () => async () => ({ remove: () => {} }) });
export const App = { addListener: async (_event: string, callback: typeof nativeState.callback) => {
  nativeState.callback = callback;
  return { remove: () => { nativeState.removals++; nativeState.callback = undefined; } };
} };
export const useNavigation = () => new Proxy({}, { get: () => () => undefined });
export const useSettings = () => ({ uiIconTheme: 'default', customEmojiUrls: {}, customEmojiNames: {} });
export const useAIChatWindow = () => ({ openAIChat: () => undefined });
export const useToast = () => ({ addToast: () => undefined });
export const TodoAssociation = () => null;
export const ScopeAssociation = () => null;
export const FocusScoreSelector = () => null;
export const MoodScoreSelector = () => null;
export const ImmersiveTimer = () => null;
export const FocusImageAttachments = () => null;
export const ReactionPicker = () => null;
export const ReactionList = () => null;
export const RecommendedNoteTemplates = () => null;
export const ActivityAttributeFields = () => null;
export const UIIcon = () => null;
export const UIIconSelector = () => null;
export const IconRenderer = () => null;
export const CheckItemStreakBadge = () => null;
export const NarrativeStyleSelectionModal = () => null;
export const CountInputModal = () => null;
export const AIQuoteGenerator = () => null;
export const MoodPickerModal = () => null;
export const StatsView = () => <div>Statistics</div>;
export const FloatingButton = ({ onClick, title, children }: any) => <button onClick={onClick} title={title}>{children}</button>;
