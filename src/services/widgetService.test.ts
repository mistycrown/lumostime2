/**
 * @file widgetService.test.ts
 * @input TODAY + PIN payload builders plus native provider source text
 * @output Regression coverage for pinned/recurring TODAY + PIN widget payload items and native refresh bindings
 * @pos Test (widget service)
 * @description Verifies pinned and recurring-today todos can populate the TODAY + PIN widget payload, preserves mirrored source snapshots for native rebuilds, and guards the dedicated refresh-button wiring.
 * @updated 2026-04-27: Added regression coverage so recurring todos that match today are included in the TODAY + PIN widget payload.
 * @updated 2026-04-26: Added regression coverage for pinned todo actionability and removed header click bindings from the dedicated TODAY + PIN widgets.
 * @updated 2026-05-01: Added regression coverage for dedicated tracking-calendar payload builders across tag, scope, and daily sources.
 * @updated 2026-05-03: Added regression coverage to ensure unsupported UI-icon sanitization only updates templates that actually change.
 * @updated 2026-05-03: Added regression coverage for shortcut action default colors and Unicode-safe scene card title truncation.
 * @updated 2026-05-03: Added regression coverage for targeted native widget refresh routing in the Capacitor bridge.
 */

import { describe, expect, it, vi } from 'vitest';
import type { ActiveSession, Category, CheckTemplate, DailyReview, Log, Scope, TodoItem } from '../types';
import {
  buildShortcutWidgetSlotConfig,
  buildTodoPinWidgetPayload,
  buildTrackingCalendarDailyConfig,
  buildTrackingCalendarScopeConfig,
  buildTrackingCalendarTagConfig,
  buildTrackingCalendarWidgetPayload,
  createWidgetTemplate,
  sanitizeWidgetTemplatesForUiIconSupport
} from './widgetService';
import widgetBridgePluginSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetBridgePlugin.kt?raw';
import widgetSceneRefreshBitmapRendererSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetSceneRefreshBitmapRenderer.kt?raw';
import widgetRefreshCoordinatorSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetRefreshCoordinator.kt?raw';
import widgetSceneCardsRemoteViewsServiceSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetSceneCardsRemoteViewsService.java?raw';
import widgetSceneProviderSupportSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetSceneProviderSupport.java?raw';
import widgetTodoPinProviderSupportSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetTodoPinProviderSupport.java?raw';
import widgetSceneLayoutSource from '../../android/app/src/main/res/layout/widget_layout_scene_4x3.xml?raw';

const REFERENCE_DATE = new Date('2026-04-26T09:30:00+08:00');

const categories: Category[] = [
  {
    id: 'focus-category',
    name: 'Focus',
    icon: '🎯',
    themeColor: '#7C3AED',
    activities: [
      {
        id: 'writing-activity',
        name: 'Writing',
        icon: '✍️',
        color: '#8B5CF6'
      }
    ]
  }
];

const scopes: Scope[] = [
  {
    id: 'scope-reading',
    name: '阅读',
    icon: '📚',
    themeColor: '#93C5FD',
    isArchived: false,
    order: 1
  }
];

const checkTemplates: CheckTemplate[] = [
  {
    id: 'check-template-1',
    title: '晨间',
    order: 1,
    enabled: true,
    isDaily: true,
    syncToTimeline: false,
    items: [
      {
        id: 'daily-check-1',
        content: '晨读',
        icon: '📖',
        type: 'manual',
        manualMode: 'binary'
      }
    ]
  }
];

const buildTrackingTemplate = (name: string) => createWidgetTemplate(name, '2x2', 'trackingCalendar');

const emptySessions: ActiveSession[] = [];

const buildTodo = (overrides: Partial<TodoItem>): TodoItem => ({
  id: 'todo-1',
  categoryId: 'todo-category-1',
  title: 'Pinned Todo',
  isCompleted: false,
  ...overrides
});

describe('buildTodoPinWidgetPayload', () => {
  it('keeps pinned todos startable when they inherit linked activity metadata from the parent todo', () => {
    const todos: TodoItem[] = [
      buildTodo({
        id: 'parent-todo',
        title: 'Parent todo',
        linkedCategoryId: 'focus-category',
        linkedActivityId: 'writing-activity'
      }),
      buildTodo({
        id: 'child-pinned-todo',
        title: 'Pinned child todo',
        parentTodoId: 'parent-todo',
        pin: true
      })
    ];

    const payload = buildTodoPinWidgetPayload({
      todos,
      categories,
      date: REFERENCE_DATE,
      now: 123456789
    });

    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({
      todoId: 'child-pinned-todo',
      badgeLabel: 'PIN',
      categoryId: 'focus-category',
      activityId: 'writing-activity',
      activityLabel: 'Writing',
      icon: '✍️'
    });
  });
  it('includes recurring todos that match today in the TODAY + PIN widget payload', () => {
    const todos: TodoItem[] = [
      buildTodo({
        id: 'recurring-todo',
        title: 'Recurring today todo',
        linkedCategoryId: 'focus-category',
        linkedActivityId: 'writing-activity',
        recurrenceRule: {
          frequency: 'daily',
          startDate: '2026-04-20'
        }
      }),
      buildTodo({
        id: 'other-day-todo',
        title: 'Other day todo',
        scheduledDate: '2026-04-27'
      })
    ];

    const payload = buildTodoPinWidgetPayload({
      todos,
      categories,
      date: REFERENCE_DATE,
      now: 123456789
    });

    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({
      todoId: 'recurring-todo',
      badgeLabel: 'TODAY',
      categoryId: 'focus-category',
      activityId: 'writing-activity',
      activityLabel: 'Writing'
    });
  });

  it('includes mirrored source snapshots so native refresh can rebuild today items', () => {
    const todos: TodoItem[] = [
      buildTodo({
        id: 'pinned-todo',
        title: 'Pinned todo',
        pin: true,
        linkedCategoryId: 'focus-category',
        linkedActivityId: 'writing-activity',
        defaultScopeIds: ['scope-reading']
      })
    ];

    const payload = buildTodoPinWidgetPayload({
      todos,
      categories,
      date: REFERENCE_DATE,
      now: 123456789
    });

    expect(payload.sourceTodos).toEqual([
      expect.objectContaining({
        id: 'pinned-todo',
        pin: true,
        linkedCategoryId: 'focus-category',
        linkedActivityId: 'writing-activity',
        defaultScopeIds: ['scope-reading']
      })
    ]);
    expect(payload.sourceCategories).toEqual([
      expect.objectContaining({
        id: 'focus-category',
        activities: [
          expect.objectContaining({
            id: 'writing-activity',
            name: 'Writing'
          })
        ]
      })
    ]);
  });
});

describe('buildTrackingCalendarWidgetPayload', () => {
  it('aggregates matching tag logs by local day for tracking-calendar templates', () => {
    const template = buildTrackingTemplate('写作日历');
    const category = categories[0];
    const activity = category.activities[0];
    template.trackingConfig = buildTrackingCalendarTagConfig(category, activity);

    const logs: Log[] = [
      {
        id: 'log-1',
        categoryId: 'focus-category',
        activityId: 'writing-activity',
        startTime: new Date('2026-04-24T09:00:00+08:00').getTime(),
        endTime: new Date('2026-04-24T10:30:00+08:00').getTime(),
        duration: 90 * 60
      },
      {
        id: 'log-2',
        categoryId: 'focus-category',
        activityId: 'writing-activity',
        startTime: new Date('2026-04-26T08:00:00+08:00').getTime(),
        endTime: new Date('2026-04-26T08:45:00+08:00').getTime(),
        duration: 45 * 60
      }
    ];

    const payload = buildTrackingCalendarWidgetPayload({
      templates: [template],
      logs,
      activeSessions: emptySessions,
      categories,
      scopes,
      dailyReviews: [],
      checkTemplates,
      date: REFERENCE_DATE,
      now: 123456789
    });

    expect(payload.templates).toHaveLength(1);
    expect(payload.templates[0].entries).toEqual([
      { date: '2026-04-24', value: 90 },
      { date: '2026-04-26', value: 45 }
    ]);
  });

  it('aggregates scope-linked logs by day for scope tracking', () => {
    const template = buildTrackingTemplate('阅读日历');
    template.trackingConfig = buildTrackingCalendarScopeConfig(scopes[0]);

    const logs: Log[] = [
      {
        id: 'scope-log-1',
        categoryId: 'focus-category',
        activityId: 'writing-activity',
        startTime: new Date('2026-04-25T19:00:00+08:00').getTime(),
        endTime: new Date('2026-04-25T20:00:00+08:00').getTime(),
        duration: 60 * 60,
        scopeIds: ['scope-reading']
      },
      {
        id: 'scope-log-2',
        categoryId: 'focus-category',
        activityId: 'writing-activity',
        startTime: new Date('2026-04-25T21:00:00+08:00').getTime(),
        endTime: new Date('2026-04-25T21:30:00+08:00').getTime(),
        duration: 30 * 60,
        scopeIds: ['scope-reading']
      }
    ];

    const payload = buildTrackingCalendarWidgetPayload({
      templates: [template],
      logs,
      activeSessions: emptySessions,
      categories,
      scopes,
      dailyReviews: [],
      checkTemplates,
      date: REFERENCE_DATE,
      now: 123456789
    });

    expect(payload.templates[0].entries).toEqual([
      { date: '2026-04-25', value: 90 }
    ]);
  });

  it('marks completed daily checks with value 1 for daily tracking', () => {
    const template = buildTrackingTemplate('晨读日历');
    const dailyBinding = {
      checkTemplateId: 'check-template-1',
      checkItemId: 'daily-check-1',
      content: '晨读',
      category: '晨间',
      type: 'manual' as const,
      manualMode: 'binary' as const,
      targetCount: 1,
      icon: '📖'
    };
    template.trackingConfig = buildTrackingCalendarDailyConfig(dailyBinding);

    const dailyReviews: DailyReview[] = [
      {
        id: 'review-1',
        date: '2026-04-24',
        createdAt: 1,
        updatedAt: 1,
        answers: [],
        checkCategorySyncToTimeline: {},
        templateSnapshot: [],
        checkItems: [
          {
            id: 'daily-check-1',
            category: '晨间',
            content: '晨读',
            icon: '📖',
            isCompleted: true,
            type: 'manual',
            manualMode: 'binary',
            currentCount: 1,
            targetCount: 1
          }
        ]
      },
      {
        id: 'review-2',
        date: '2026-04-25',
        createdAt: 1,
        updatedAt: 1,
        answers: [],
        checkCategorySyncToTimeline: {},
        templateSnapshot: [],
        checkItems: [
          {
            id: 'daily-check-1',
            category: '晨间',
            content: '晨读',
            icon: '📖',
            isCompleted: false,
            type: 'manual',
            manualMode: 'binary',
            currentCount: 0,
            targetCount: 1
          }
        ]
      }
    ];

    const payload = buildTrackingCalendarWidgetPayload({
      templates: [template],
      logs: [],
      activeSessions: emptySessions,
      categories,
      scopes,
      dailyReviews,
      checkTemplates,
      date: REFERENCE_DATE,
      now: 123456789
    });

    expect(payload.templates[0].entries).toEqual([
      { date: '2026-04-24', value: 1 }
    ]);
  });

  it('falls back to the default color for daily tracking when no color override is provided', () => {
    const dailyBinding = {
      checkTemplateId: 'check-template-1',
      checkItemId: 'daily-check-1',
      content: '晨读',
      category: '晨间',
      type: 'manual' as const,
      manualMode: 'binary' as const,
      targetCount: 1,
      icon: '📉'
    };

    const config = buildTrackingCalendarDailyConfig(dailyBinding);

    expect(config.color).toBe('#E7E5E4');
  });
});

describe('sanitizeWidgetTemplatesForUiIconSupport', () => {
  it('only updates templates that actually lose unsupported UI icon assets', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(5000);
    const templateNeedingSanitization = createWidgetTemplate('Needs sanitize');
    templateNeedingSanitization.updatedAt = 1000;
    templateNeedingSanitization.slots[0] = {
      ...templateNeedingSanitization.slots[0],
      slotType: 'timer',
      categoryId: 'focus-category',
      activityId: 'writing-activity',
      uiIconAssetPath: '/icons/focus.png',
      uiIconFallbackAssetPath: '/icons/focus-fallback.png'
    };

    const untouchedTemplate = createWidgetTemplate('Already clean');
    untouchedTemplate.updatedAt = 2000;

    const sanitized = sanitizeWidgetTemplatesForUiIconSupport(
      [templateNeedingSanitization, untouchedTemplate],
      false
    );

    expect(sanitized[0].slots[0].uiIconAssetPath).toBeNull();
    expect(sanitized[0].slots[0].uiIconFallbackAssetPath).toBeNull();
    expect(sanitized[0].updatedAt).toBe(5000);
    expect(sanitized[1].updatedAt).toBe(2000);

    nowSpy.mockRestore();
  });

  it('keeps updatedAt unchanged when templates are already sanitized', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(9999);
    const template = createWidgetTemplate('Clean template');
    template.updatedAt = 3000;

    const sanitized = sanitizeWidgetTemplatesForUiIconSupport([template], false);

    expect(sanitized[0].updatedAt).toBe(3000);

    nowSpy.mockRestore();
  });
});

describe('buildShortcutWidgetSlotConfig', () => {
  it('uses the action-specific default color when no override is provided', () => {
    const shortcutSlot = buildShortcutWidgetSlotConfig('open_gallery', 0);

    expect(shortcutSlot).toMatchObject({
      slotType: 'shortcut',
      label: '画廊',
      color: '#DCFCE7'
    });
  });
});

describe('WidgetTodoPinProviderSupport', () => {
  it('binds a dedicated refresh action instead of a header status tap for the TODAY + PIN widgets', () => {
    expect(widgetTodoPinProviderSupportSource).not.toContain('views.setOnClickPendingIntent(R.id.widget_todo_pin_header');
    expect(widgetTodoPinProviderSupportSource).toContain('ACTION_REFRESH_TODO_PIN');
    expect(widgetTodoPinProviderSupportSource).toContain('widget_todo_pin_refresh_button');
    expect(widgetTodoPinProviderSupportSource).toContain('refreshTodoPinWidgetWithFeedback');
    expect(widgetTodoPinProviderSupportSource).toContain('saveTodoPinRefreshAnimationState');
    expect(widgetTodoPinProviderSupportSource).toContain('views.setPendingIntentTemplate(');
  });
});

describe('WidgetSceneCardsRemoteViewsService', () => {
  it('uses code-point-safe truncation for scene card titles', () => {
    expect(widgetSceneCardsRemoteViewsServiceSource).toContain('codePointCount');
    expect(widgetSceneCardsRemoteViewsServiceSource).toContain('offsetByCodePoints');
    expect(widgetSceneCardsRemoteViewsServiceSource).not.toContain('substring(0, maxChars)');
  });
});

describe('WidgetSceneProviderSupport', () => {
  it('binds a manual refresh action, animates the refresh icon, and tracks morning unlock refreshes for the scene widget', () => {
    expect(widgetSceneProviderSupportSource).toContain('ACTION_REFRESH_SCENE_WIDGET');
    expect(widgetSceneProviderSupportSource).toContain('Intent.ACTION_USER_PRESENT');
    expect(widgetSceneProviderSupportSource).toContain('saveSceneMorningRefreshDate');
    expect(widgetSceneProviderSupportSource).toContain('saveSceneRefreshAnimationState');
    expect(widgetSceneProviderSupportSource).toContain('WidgetSceneRefreshBitmapRenderer.INSTANCE.render');
    expect(widgetSceneProviderSupportSource).toContain('R.id.widget_scene_refresh_root');
    expect(widgetSceneRefreshBitmapRendererSource).toContain('TOTAL_ROTATION_DEGREES = 360f');
    expect(widgetRefreshCoordinatorSource).toContain('fun refreshSceneWidgetWithFeedback(context: Context, appWidgetId: Int)');
    expect(widgetSceneLayoutSource).toContain('widget_scene_refresh_root');
    expect(widgetSceneLayoutSource).toContain('widget_scene_refresh_icon');
  });
});

describe('WidgetBridgePlugin refresh routing', () => {
  it('uses widget-family refresh helpers instead of refreshing every widget for targeted sync payloads', () => {
    expect(widgetRefreshCoordinatorSource).toContain('fun refreshTimerWidgets(context: Context)');
    expect(widgetRefreshCoordinatorSource).toContain('fun refreshTrackingCalendarWidgets(context: Context)');
    expect(widgetRefreshCoordinatorSource).toContain('fun refreshDailyRuntimeWidgets(context: Context)');
    expect(widgetRefreshCoordinatorSource).toContain('fun refreshTodoPinWidgets(context: Context)');
    expect(widgetRefreshCoordinatorSource).toContain('fun refreshSceneWidgets(context: Context)');

    expect(widgetBridgePluginSource).toContain('WidgetRefreshCoordinator.refreshTimerWidgets(context)');
    expect(widgetBridgePluginSource).toContain('WidgetRefreshCoordinator.refreshTrackingCalendarWidgets(context)');
    expect(widgetBridgePluginSource).toContain('WidgetRefreshCoordinator.refreshDailyRuntimeWidgets(context)');
    expect(widgetBridgePluginSource).toContain('WidgetRefreshCoordinator.refreshTodoPinWidgets(context)');
    expect(widgetBridgePluginSource).toContain('WidgetRefreshCoordinator.refreshSceneWidgets(context)');
    expect(widgetBridgePluginSource).toContain('sourceTodos = it.optJSONArray("sourceTodos").toTodoPinSourceTodoList()');
    expect(widgetBridgePluginSource).toContain('sourceCategories = it.optJSONArray("sourceCategories").toTodoPinSourceCategoryList()');
  });
});
