/**
 * @file bufferedEditorMocks.tsx
 * @input Isolated editor test renders
 * @output Platform and unrelated overlay adapters
 * @pos Test Support
 */
import React from 'react';
export const nativeState = { callback: undefined as undefined | ((state: { isActive: boolean }) => void), removals: 0 };
export const Capacitor = { isNativePlatform: () => true };
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
