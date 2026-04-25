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

vi.mock('../components/IconRenderer', () => ({
  IconRenderer: () => null,
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

  it('filters check stats to enabled daily template items on the main stats view', () => {
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
        forcedView="check"
        forcedRange="week"
        dailyReviews={[
          {
            id: 'review-1',
            date: '2026-03-30',
            createdAt: 1,
            updatedAt: 1,
            answers: [],
            checkItems: [
              {
                id: 'item-1',
                category: '晨间',
                content: '冥想',
                isCompleted: true,
                type: 'manual',
                manualMode: 'binary',
              },
              {
                id: 'item-2',
                category: '晨间',
                content: '旧习惯',
                isCompleted: true,
                type: 'manual',
                manualMode: 'binary',
              },
              {
                id: 'item-3',
                category: '已停用分组',
                content: '停用项',
                isCompleted: true,
                type: 'manual',
                manualMode: 'binary',
              },
            ],
          },
        ]}
        checkTemplates={[
          {
            id: 'template-1',
            title: '晨间',
            items: [
              {
                id: 'template-item-1',
                content: '冥想',
              },
            ],
            enabled: true,
            order: 0,
            isDaily: true,
          },
          {
            id: 'template-2',
            title: '已停用分组',
            items: [
              {
                id: 'template-item-2',
                content: '停用项',
              },
            ],
            enabled: false,
            order: 1,
            isDaily: true,
          },
        ]}
      />
    );

    expect(markup).toContain('冥想');
    expect(markup).not.toContain('旧习惯');
    expect(markup).not.toContain('停用项');
  });

  it('shows no check items when the main stats view receives no enabled daily templates', () => {
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
        forcedView="check"
        forcedRange="week"
        dailyReviews={[
          {
            id: 'review-2',
            date: '2026-03-30',
            createdAt: 1,
            updatedAt: 1,
            answers: [],
            checkItems: [
              {
                id: 'item-4',
                category: '晨间',
                content: '冥想',
                isCompleted: true,
                type: 'manual',
                manualMode: 'binary',
              },
            ],
          },
        ]}
        checkTemplates={[]}
      />
    );

    expect(markup).toContain('该时间段无打卡记录');
    expect(markup).not.toContain('冥想');
  });
});
