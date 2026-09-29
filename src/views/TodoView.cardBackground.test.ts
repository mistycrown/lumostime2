/**
 * @file TodoView.cardBackground.test.ts
 * @input Custom card-background active state
 * @output Regression coverage for todo-card auxiliary accent styling
 * @pos Test
 */
import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  });
});

vi.mock('../components/IconRenderer', () => ({
  IconRenderer: () => null
}));

vi.mock('../hooks/useCardBackground', () => ({
  useCardBackground: () => ({ active: false, style: {} })
}));

vi.mock('../hooks/useBackgroundDisplay', () => ({
  useBackgroundDisplay: () => ({
    backgroundUrl: null,
    hasBackground: false,
    panelOverlayOpacity: 0.5,
    useReducedEffects: true
  })
}));

vi.mock('../contexts/PrivacyContext', () => ({ usePrivacy: () => ({ hideSensitiveContent: false }) }));
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('../contexts/AIChatWindowContext', () => ({ useAIChatWindow: () => ({ openAIChat: vi.fn(), unreadCount: 0 }) }));
vi.mock('../hooks/useTodoQuickActions', () => ({ useTodoQuickActions: () => ({}) }));
vi.mock('../components/FloatingButton', () => ({ FloatingButton: () => null }));
vi.mock('../components/UIIcon', () => ({ UIIcon: () => null }));
vi.mock('../components/TodoScheduleAssignModal', () => ({ TodoScheduleAssignModal: () => null }));
vi.mock('../components/TodoDatePickerModal', () => ({ TodoDatePickerModal: () => null }));
vi.mock('../components/TodoDisplaySettingsModal', () => ({ TodoDisplaySettingsModal: () => null }));
vi.mock('../components/TodoDuplicateModal', () => ({ TodoDuplicateModal: () => null }));
vi.mock('../components/TodoQuickActionsModal', () => ({ TodoQuickActionsModal: () => null }));
vi.mock('../components/TodoMonthView', () => ({ TodoMonthView: () => null }));
vi.mock('../components/TodoBentoWeekView', () => ({ TodoBentoWeekView: () => null }));
vi.mock('../components/UnreadCountBadge', () => ({ UnreadCountBadge: () => null }));

import { getTodoCardBackgroundAccentStyle } from './TodoView';

describe('todo card background accent style', () => {
  it('returns the accent color only for an active card background', () => {
    expect(getTodoCardBackgroundAccentStyle(false)).toBeUndefined();
    expect(getTodoCardBackgroundAccentStyle(true)).toEqual({ color: 'var(--accent-color)' });
  });
});
