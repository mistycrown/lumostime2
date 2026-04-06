import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FocusDetailView } from './FocusDetailView';

vi.mock('../components/TodoAssociation', () => ({
  TodoAssociation: () => null,
}));

vi.mock('../components/ScopeAssociation', () => ({
  ScopeAssociation: () => null,
}));

vi.mock('../components/FocusScoreSelector', () => ({
  FocusScoreSelector: () => null,
}));

vi.mock('../components/MoodScoreSelector', () => ({
  MoodScoreSelector: () => null,
}));

vi.mock('../components/ImmersiveTimer', () => ({
  ImmersiveTimer: ({ elapsed }: { elapsed: number }) => (
    <div data-testid="immersive-timer">{elapsed}</div>
  ),
}));

vi.mock('../components/IconRenderer', () => ({
  IconRenderer: () => <span data-testid="icon-renderer" />,
}));

vi.mock('../components/ReactionComponents', () => ({
  ReactionPicker: () => null,
  ReactionList: () => null,
}));

const baseSession = {
  id: 'session-1',
  startTime: 1710000000000,
  activityId: 'activity-1',
  categoryId: 'category-1',
  activityName: '深度工作',
  activityIcon: 'clock',
  activityUiIcon: 'clock',
  note: '',
  scopeIds: [],
  linkedTodoId: undefined,
  reactions: [],
} as any;

const categories = [
  {
    id: 'category-1',
    name: '工作',
    activities: [
      {
        id: 'activity-1',
        name: '深度工作',
        icon: 'clock',
        uiIcon: 'clock',
        keywords: [],
      },
    ],
  },
] as any;

describe('FocusDetailView immersive shell', () => {
  test('keeps the white detail shell in normal mode', () => {
    const html = renderToStaticMarkup(
      <FocusDetailView
        session={baseSession}
        todos={[]}
        categories={categories}
        todoCategories={[]}
        scopes={[]}
        onClose={() => {}}
        onComplete={() => {}}
        onUpdate={() => {}}
        autoEnterImmersive={false}
      />
    );

    expect(html).toContain('bg-white');
  });

  test('does not render the white detail shell when immersive mode starts immediately', () => {
    const html = renderToStaticMarkup(
      <FocusDetailView
        session={baseSession}
        todos={[]}
        categories={categories}
        todoCategories={[]}
        scopes={[]}
        onClose={() => {}}
        onComplete={() => {}}
        onUpdate={() => {}}
        autoEnterImmersive={true}
      />
    );

    expect(html).toContain('immersive-timer');
    expect(html).not.toContain('class="fixed inset-0 z-[100] bg-white');
  });
});
