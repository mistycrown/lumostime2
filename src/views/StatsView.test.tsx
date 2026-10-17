/**
 * @file StatsView.test.tsx
 * @updated 2026-10-17: Verifies opt-in daily drilldown receives chart-filtered logs and stays disabled for other ranges.
 * @input Server-rendered statistics views and isolated hooks
 * @output Range, template filtering and inactive-statistics regression checks
 * @pos Test (Statistics View)
 * @updated 2026-10-11: Verifies check views never scan activity inputs and other views keep their original inputs.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { StatsView } from './StatsView';
import { useStatsCalculation } from '../hooks/useStatsCalculation';
import { useTodoStats } from '../hooks/useTodoStats';
import { useScopeStats } from '../hooks/useScopeStats';
import { PieChartView } from '../components/stats/PieChartView';
import type { Category, Log, Scope, TodoCategory, TodoItem } from '../types';

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

vi.mock('../components/stats/PieChartView', () => ({
  PieChartView: vi.fn(() => null),
}));

vi.mock('../hooks/useStatsCalculation', () => ({
  useStatsCalculation: vi.fn(() => ({
    stats: { totalDuration: 0, categoryStats: [] },
    previousStats: null,
    filteredLogs: [],
  })),
}));

vi.mock('../hooks/useTodoStats', () => ({
  useTodoStats: vi.fn(() => ({
    todoStats: { totalDuration: 0, categoryStats: [] },
    previousTodoStats: null,
  })),
}));

vi.mock('../hooks/useScopeStats', () => ({
  useScopeStats: vi.fn(() => ({
    scopeStats: { totalDuration: 0, categoryStats: [] },
    previousScopeStats: null,
  })),
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
  it.each([
    { enabled: true, range: 'day' as const, opens: true },
    { enabled: false, range: 'day' as const, opens: false },
    { enabled: true, range: 'week' as const, opens: false }
  ])('scopes log drilldown to enabled daily charts ($enabled, $range)', ({ enabled, range, opens }) => {
    const allLogs = [{ id: 'other-day' }, { id: 'current-day' }] as Log[];
    const filteredLogs = [allLogs[1]];
    const date = new Date(2026, 9, 16);
    vi.mocked(useStatsCalculation).mockReturnValueOnce({
      stats: { totalDuration: 0, categoryStats: [] }, previousStats: null, filteredLogs
    });
    renderToStaticMarkup(<StatsView
      logs={allLogs} categories={[]} todos={[]} todoCategories={[]} scopes={[]}
      currentDate={date} onBack={() => {}} isFullScreen={false} onToggleFullScreen={() => {}}
      forcedView="pie" forcedRange={range} enableLogDetails={enabled}
    />);
    const props = vi.mocked(PieChartView).mock.calls.at(-1)![0];
    if (opens) {
      expect(props.logDetails).toEqual({ logs: filteredLogs, date, isPrivacyMode: false });
      expect(props.logDetails?.logs).toBe(filteredLogs);
    } else {
      expect(props.logDetails).toBeUndefined();
    }
  });

  it('avoids scanning unrelated logs, categories, todos and scopes in the annual check view', () => {
    const category: Category = {
      id: 'unused', name: 'unused', icon: '', themeColor: '#123456',
      get activities(): Category['activities'] { throw new Error('The hidden activity matrix must not read categories'); }
    };
    const logs = [{ id: 'unused' }] as Log[];
    const todos = [{ id: 'unused' }] as TodoItem[];
    const scopes = [{ id: 'unused' }] as Scope[];
    const todoCategories = [{ id: 'unused' }] as TodoCategory[];
    renderToStaticMarkup(<StatsView
      logs={logs} categories={[category]} todos={todos} todoCategories={todoCategories} scopes={scopes}
      currentDate={new Date(2026, 5, 1)} onBack={() => {}} isFullScreen={false} onToggleFullScreen={() => {}}
      forcedView="check" forcedRange="year"
    />);
    expect(useStatsCalculation).toHaveBeenLastCalledWith(expect.objectContaining({ logs: [], categories: [], includePrevious: false }));
    expect(useTodoStats).toHaveBeenLastCalledWith(expect.objectContaining({ logs: [], todos: [], todoCategories: [], includePrevious: false }));
    expect(useScopeStats).toHaveBeenLastCalledWith(expect.objectContaining({ logs: [], categories: [], scopes: [], includePrevious: false }));
  });

  it('preserves real log inputs and comparisons in the pie view', () => {
    const logs = [{ id: 'real-log' }] as Log[];
    const categories = [{ id: 'real-category', activities: [] }] as Category[];
    renderToStaticMarkup(<StatsView
      logs={logs} categories={categories} todos={[]} todoCategories={[]} scopes={[]}
      currentDate={new Date(2026, 5, 1)} onBack={() => {}} isFullScreen={false} onToggleFullScreen={() => {}}
      forcedView="pie"
    />);
    expect(useStatsCalculation).toHaveBeenLastCalledWith(expect.objectContaining({ logs, categories, includePrevious: true }));
    expect(useTodoStats).toHaveBeenLastCalledWith(expect.objectContaining({ logs, includePrevious: true }));
    expect(useScopeStats).toHaveBeenLastCalledWith(expect.objectContaining({ logs, categories, includePrevious: true }));
  });

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
