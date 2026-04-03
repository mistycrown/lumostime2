import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { StatsView } from './StatsView';

vi.hoisted(() => {
  const storage = new Map<string, string>();
  const localStorageMock = {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
    clear: vi.fn(() => {
      storage.clear();
    }),
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });
});

vi.mock('../contexts/PrivacyContext', () => ({
  usePrivacy: () => ({ isPrivacyMode: false }),
}));

vi.mock('../contexts/NavigationContext', () => ({
  useNavigation: () => ({ setIsExportViewOpen: vi.fn() }),
}));

vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({ scheduleStyle: 'timeline' }),
}));

vi.mock('../hooks/useStatsCalculation', () => ({
  useStatsCalculation: () => ({
    stats: { totalDuration: 0, categoryStats: [] },
    previousStats: null,
    filteredLogs: [],
  }),
}));

vi.mock('../hooks/useTodoStats', () => ({
  useTodoStats: () => ({
    todoStats: [],
    previousTodoStats: [],
  }),
}));

vi.mock('../hooks/useScopeStats', () => ({
  useScopeStats: () => ({
    scopeStats: [],
    previousScopeStats: [],
  }),
}));

vi.mock('./ChronoPrintView', () => ({
  ChronoPrintView: () => null,
}));

vi.mock('../components/stats/MatrixView', () => ({
  MatrixView: ({ matrixData }: { matrixData: { days: Date[] } }) => (
    <div data-testid="matrix-days">{matrixData.days.length}</div>
  ),
}));

describe('StatsView matrix date range', () => {
  it('keeps matrix weeks to 7 days when the week spans two months', () => {
    const markup = renderToStaticMarkup(
      <StatsView
        logs={[]}
        categories={[]}
        currentDate={new Date('2026-04-03T12:00:00')}
        onBack={() => {}}
        isFullScreen={false}
        onToggleFullScreen={() => {}}
        todos={[]}
        todoCategories={[]}
        scopes={[]}
        forcedView="matrix"
      />
    );

    expect(markup).toContain('>7<');
  });
});
