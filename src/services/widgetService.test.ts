/**
 * @file widgetService.test.ts
 * @input TODAY + PIN and principle-card payload builders plus native provider source text
 * @output Regression coverage for pinned/recurring TODAY + PIN widget payload items, principle-card sync, and native refresh bindings
 * @pos Test (widget service)
 * @description Verifies pinned and recurring-today todos can populate the TODAY + PIN widget payload, preserves mirrored source snapshots for native rebuilds, and guards the dedicated refresh-button wiring.
 * @updated 2026-07-22: Covers completed TODAY + PIN todos remaining visible after unfinished rows with completion state included in the native payload.
 * @updated 2026-05-21: Added TODAY + PIN native-rebuild regression coverage for mirrored `maybeDates` and recurrence `skipDates` so Android widget refreshes match app-side today visibility.
 * @updated 2026-04-27: Added regression coverage so recurring todos that match today are included in the TODAY + PIN widget payload.
 * @updated 2026-04-26: Added regression coverage for pinned todo actionability and removed header click bindings from the dedicated TODAY + PIN widgets.
 * @updated 2026-05-01: Added regression coverage for dedicated tracking-calendar payload builders across tag, scope, and daily sources.
 * @updated 2026-05-03: Added regression coverage to ensure unsupported UI-icon sanitization only updates templates that actually change.
 * @updated 2026-05-03: Added regression coverage for shortcut action default colors and Unicode-safe scene card title truncation.
 * @updated 2026-05-03: Added regression coverage for targeted native widget refresh routing in the Capacitor bridge.
 * @updated 2026-05-05: Added scene widget launch-app regression coverage so native scene cards can mirror in-app third-party app launches.
 * @updated 2026-05-10: Added native scene-card title layout regression coverage so widget launchers keep mixed-language labels centered and use ASCII ellipsis truncation.
 * @updated 2026-08-09: Added principle-card widget payload, PNG/WebP background scanning, and native provider wiring regression coverage.
 * @updated 2026-08-09: Added principle-card visual refresh regression coverage for rounded clipping, no mask, serif justified body text, and unlock refresh.
 * @updated 2026-08-10: Added widget template storage regression coverage for backup and restore payload persistence.
 * @updated 2026-08-12: Covers Android 12+ in-process scene-card collection rendering with the legacy service fallback retained for older launchers.
 * @updated 2026-08-12: Covers shared manual refresh-icon animation wiring across every widget family with a refresh control.
 * @updated 2026-09-11: Covers completion timestamps and recent-completed filtering for Android quick-todo widgets.
 */

import { describe, expect, it, vi } from 'vitest';
import type { ActiveSession, Category, CheckTemplate, DailyReview, Log, SceneGroupState, Scope, TodoItem } from '../types';
import { DEFAULT_PRINCIPLE_PRESETS } from '../constants/principlePresets';
import {
  buildPrincipleCardWidgetPayload,
  buildShortcutWidgetSlotConfig,
  buildTodoPinWidgetPayload,
  buildTrackingCalendarDailyConfig,
  buildTrackingCalendarScopeConfig,
  buildTrackingCalendarTagConfig,
  buildTrackingCalendarWidgetPayload,
  createWidgetTemplate,
  loadWidgetTemplatesFromStorage,
  saveWidgetTemplatesToStorage,
  sanitizeWidgetTemplatesForUiIconSupport
} from './widgetService';
import androidManifestSource from '../../android/app/src/main/AndroidManifest.xml?raw';
import quickLogWidgetPrincipleCard4x2Source from '../../android/app/src/main/java/com/mistycrown/lumostime/QuickLogWidgetPrincipleCard4x2.java?raw';
import widgetBridgePluginSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetBridgePlugin.kt?raw';
import widgetPrincipleCardBitmapRendererSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetPrincipleCardBitmapRenderer.kt?raw';
import widgetPrincipleCardProviderSupportSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetPrincipleCardProviderSupport.kt?raw';
import widgetProviderSupportSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetProviderSupport.java?raw';
import quickTodoProviderSupportSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetQuickTodoProviderSupport.java?raw';
import quickTodoRemoteViewsServiceSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetQuickTodoRemoteViewsService.java?raw';
import dailyCheckWeekProviderSupportSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetDailyCheckWeekProviderSupport.java?raw';
import dailyCheckWeek4x3ProviderSupportSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetDailyCheckWeek4x3ProviderSupport.java?raw';
import widgetRefreshCoordinatorSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetRefreshCoordinator.kt?raw';
import widgetSceneCardRendererSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetSceneCardRenderer.java?raw';
import widgetSceneCardsRemoteViewsServiceSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetSceneCardsRemoteViewsService.java?raw';
import widgetSceneProviderSupportSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetSceneProviderSupport.java?raw';
import widgetStoresSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetStores.kt?raw';
import widgetTimerControllerSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetTimerController.kt?raw';
import widgetTodoPinProviderSupportSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetTodoPinProviderSupport.java?raw';
import widgetPrincipleCardLayoutSource from '../../android/app/src/main/res/layout/widget_layout_principle_card_4x2.xml?raw';
import widgetSceneCardItemLayoutSource from '../../android/app/src/main/res/layout/widget_scene_card_item.xml?raw';
import widgetSceneLayoutSource from '../../android/app/src/main/res/layout/widget_layout_scene_4x3.xml?raw';
import widgetPrincipleCardInfoSource from '../../android/app/src/main/res/xml/widget_info_principle_card_4x2.xml?raw';

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

describe('widget template storage', () => {
  it('round-trips templates through the backup storage representation', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value)
    });

    try {
      const template = createWidgetTemplate('Backup template');
      saveWidgetTemplatesToStorage([template]);

      expect(loadWidgetTemplatesFromStorage()).toEqual([template]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

const buildTodo = (overrides: Partial<TodoItem>): TodoItem => ({
  id: 'todo-1',
  categoryId: 'todo-category-1',
  title: 'Pinned Todo',
  isCompleted: false,
  ...overrides
});

describe('buildTodoPinWidgetPayload', () => {
  it('keeps completed today todos after unfinished todos with their completion state', () => {
    const payload = buildTodoPinWidgetPayload({
      todos: [
        buildTodo({ id: 'completed', title: 'Completed', pin: true, isCompleted: true }),
        buildTodo({ id: 'unfinished', title: 'Unfinished', pin: true, isCompleted: false })
      ],
      categories,
      date: REFERENCE_DATE,
      now: 123456789
    });

    expect(payload.items).toEqual([
      expect.objectContaining({ todoId: 'unfinished', isCompleted: false }),
      expect.objectContaining({ todoId: 'completed', isCompleted: true })
    ]);
  });

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
      title: 'Pinned child todo · Parent todo',
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
      isRecurring: true,
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
        defaultScopeIds: ['scope-reading'],
        maybeDates: ['2026-04-26'],
        recurrenceRule: {
          frequency: 'daily',
          startDate: '2026-04-24',
          skipDates: ['2026-04-27']
        }
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
        defaultScopeIds: ['scope-reading'],
        maybeDates: ['2026-04-26'],
        recurrenceRule: expect.objectContaining({
          skipDates: ['2026-04-27']
        })
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

  it('mirrors todo completion timestamps for native quick-todo filtering', () => {
    const completedAt = '2026-04-26T12:34:56.000Z';
    const payload = buildTodoPinWidgetPayload({
      todos: [buildTodo({ id: 'completed-todo', isCompleted: true, completedAt })],
      categories,
      date: REFERENCE_DATE,
      now: 123456789
    });

    expect(payload.sourceTodos).toEqual([
      expect.objectContaining({ id: 'completed-todo', completedAt })
    ]);
  });
});

describe('buildPrincipleCardWidgetPayload', () => {
  it('normalizes valid principle cards and skips incomplete entries', () => {
    const payload = buildPrincipleCardWidgetPayload({
      principles: [
        {
          id: ' principle-1 ',
          title: ' 在行动中确立主体 ',
          frontText: ' 先做一个可见动作 ',
          backText: ' 把判断留给行动之后 '
        },
        {
          id: 'missing-front',
          title: 'Invalid',
          frontText: ''
        },
        null
      ],
      now: 123456789
    });

    expect(payload).toEqual({
      principles: [
        {
          id: 'principle-1',
          title: '在行动中确立主体',
          frontText: '先做一个可见动作',
          backText: '把判断留给行动之后'
        }
      ],
      syncedAt: 123456789
    });
  });

  it('falls back to the default principle presets when the library has no valid cards', () => {
    const payload = buildPrincipleCardWidgetPayload({
      principles: [],
      now: 987654321
    });

    expect(payload.syncedAt).toBe(987654321);
    expect(payload.principles).toHaveLength(DEFAULT_PRINCIPLE_PRESETS.length);
    expect(payload.principles[0]).toMatchObject({
      id: DEFAULT_PRINCIPLE_PRESETS[0].id,
      title: DEFAULT_PRINCIPLE_PRESETS[0].title,
      frontText: DEFAULT_PRINCIPLE_PRESETS[0].frontText,
      backText: DEFAULT_PRINCIPLE_PRESETS[0].backText
    });
  });

  it('uses stable fallback ids when a principle card has no stored id', () => {
    const principle = {
      title: '稳定行动',
      frontText: '先把下一步写清楚',
      backText: '让系统记住同一张卡'
    };

    const firstPayload = buildPrincipleCardWidgetPayload({ principles: [principle], now: 1 });
    const secondPayload = buildPrincipleCardWidgetPayload({ principles: [principle], now: 2 });

    expect(firstPayload.principles[0].id).toMatch(/^principle-[0-9a-z]+$/);
    expect(secondPayload.principles[0].id).toBe(firstPayload.principles[0].id);
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

describe('buildSceneWidgetPayload', () => {
  it('mirrors scene card app-launch metadata for timer and todo cards', async () => {
    const localStorageStub = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    vi.stubGlobal('localStorage', localStorageStub);

    const { buildSceneWidgetPayload: buildSceneWidgetPayloadLazy } = await import('./widgetSceneService');
    const todos: TodoItem[] = [
      buildTodo({
        id: 'scene-todo',
        title: 'Scene todo',
        linkedCategoryId: 'focus-category',
        linkedActivityId: 'writing-activity'
      })
    ];
    const sceneGroupState: SceneGroupState = {
      version: 1,
      switchMode: 'manual',
      activeGroupId: 'group-1',
      groups: [
        {
          id: 'group-1',
          name: 'Weekday',
          timeSlots: [
            {
              id: 'slot-1',
              name: 'Morning',
              icon: '🌅',
              startTime: '08:00',
              endTime: '12:00',
              cards: [
                {
                  id: 'timer-card',
                  type: 'timer',
                  title: 'Deep Work',
                  action: {
                    type: 'startTimer',
                    activityId: 'writing-activity',
                    categoryId: 'focus-category',
                    launchApp: true,
                    appPackageName: 'com.example.writer',
                    appName: 'Writer'
                  }
                },
                {
                  id: 'todo-card',
                  type: 'todo',
                  title: 'Draft chapter',
                  action: {
                    type: 'startTodo',
                    todoId: 'scene-todo',
                    launchApp: true,
                    appPackageName: 'com.example.todo',
                    appName: 'Todo App'
                  }
                }
              ]
            }
          ]
        }
      ]
    };

    const payload = buildSceneWidgetPayloadLazy({
      sceneGroupState,
      categories,
      todos,
      checkTemplates,
      now: 123456789
    });

    expect(payload.groups[0].timeSlots[0].items).toEqual([
      expect.objectContaining({
        id: 'timer-card',
        itemType: 'timer',
        launchApp: true,
        appPackageName: 'com.example.writer',
        appName: 'Writer'
      }),
      expect.objectContaining({
        id: 'todo-card',
        itemType: 'todo',
        launchApp: true,
        appPackageName: 'com.example.todo',
        appName: 'Todo App'
      })
    ]);

    vi.unstubAllGlobals();
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

describe('WidgetPrincipleCardProviderSupport', () => {
  it('wires card-face toggling, top-right refresh, and per-instance shuffle state', () => {
    expect(widgetPrincipleCardProviderSupportSource).toContain('ACTION_TOGGLE_PRINCIPLE_CARD_FACE');
    expect(widgetPrincipleCardProviderSupportSource).toContain('ACTION_REFRESH_PRINCIPLE_CARD');
    expect(widgetPrincipleCardProviderSupportSource).toContain('advanceSelection = true');
    expect(widgetPrincipleCardProviderSupportSource).toContain('forceFrontFace = true');
    expect(widgetPrincipleCardProviderSupportSource).toContain('Intent.ACTION_USER_PRESENT');
    expect(widgetPrincipleCardProviderSupportSource).toContain('@JvmOverloads');
    expect(widgetPrincipleCardProviderSupportSource).toContain('savePrincipleCardState');
    expect(widgetPrincipleCardProviderSupportSource).toContain('distinctBy { it.id }');
    expect(widgetPrincipleCardLayoutSource).toContain('widget_principle_card_refresh_root');
    expect(widgetPrincipleCardLayoutSource).toContain('widget_principle_card_bitmap');
    expect(widgetPrincipleCardLayoutSource).toContain('android:background="@android:color/transparent"');
    expect(widgetPrincipleCardLayoutSource).not.toContain('android:background="@drawable/widget_background"');
    expect(quickLogWidgetPrincipleCard4x2Source).toContain('WidgetPrincipleCardProviderSupport.INSTANCE.handleCommonReceive');
    expect(quickLogWidgetPrincipleCard4x2Source).toContain('refreshAllAsync(context)');
    expect(quickLogWidgetPrincipleCard4x2Source).toContain('refreshAllAsync(context, true, true)');
  });

  it('scans PNG and WebP card backgrounds from the Capacitor public assets directory', () => {
    expect(widgetPrincipleCardBitmapRendererSource).toContain('BACKGROUND_ASSET_DIR = "public/card"');
    expect(widgetPrincipleCardBitmapRendererSource).toContain('SUPPORTED_EXTENSIONS = setOf("png", "webp")');
    expect(widgetPrincipleCardBitmapRendererSource).toContain('it.endsWith(".webp", ignoreCase = true)');
    expect(widgetPrincipleCardBitmapRendererSource).toContain('it.endsWith(".png", ignoreCase = true)');
    expect(widgetPrincipleCardBitmapRendererSource).toContain('widthPx * 0.74f');
    expect(widgetPrincipleCardBitmapRendererSource).not.toContain('BACKGROUND_OVERSCAN_SCALE');
    expect(widgetPrincipleCardBitmapRendererSource).toContain('val left = widgetWidthPx - scaledWidth');
    expect(widgetPrincipleCardBitmapRendererSource).toContain('val top = widgetHeightPx - scaledHeight');
  });

  it('clips the card bitmap corners, removes the text mask, and uses smaller serif justified body text', () => {
    expect(widgetPrincipleCardBitmapRendererSource).toContain('CARD_CORNER_RADIUS_DP = 24f');
    expect(widgetPrincipleCardBitmapRendererSource).toContain('canvas.clipPath(clipPath)');
    expect(widgetPrincipleCardBitmapRendererSource).toContain('addRoundRect(');
    expect(widgetPrincipleCardBitmapRendererSource).not.toContain('LinearGradient');
    expect(widgetPrincipleCardBitmapRendererSource).not.toContain('drawReadabilityOverlay');
    expect(widgetPrincipleCardBitmapRendererSource).not.toContain('setShadowLayer(');
    expect(widgetPrincipleCardBitmapRendererSource).toContain('Typeface.create("serif"');
    expect(widgetPrincipleCardBitmapRendererSource).toContain('MIN_BODY_TEXT_SP = 10f');
    expect(widgetPrincipleCardBitmapRendererSource).toContain('MAX_BODY_TEXT_SP = 16f');
    expect(widgetPrincipleCardBitmapRendererSource).toContain('resolveInitialBodyTextSizeSp');
    expect(widgetPrincipleCardBitmapRendererSource).toContain('setJustificationMode(');
    expect(widgetPrincipleCardBitmapRendererSource).toContain('Layout.JUSTIFICATION_MODE_INTER_WORD');
    expect(widgetPrincipleCardBitmapRendererSource).toContain('BODY_LINE_SPACING_MULTIPLIER = 1.18f');
  });

  it('registers a dedicated 4x2 launcher widget with principle-card bridge storage and refresh routing', () => {
    const principleCardManifestBlock = androidManifestSource.slice(
      androidManifestSource.indexOf('android:name=".QuickLogWidgetPrincipleCard4x2"'),
      androidManifestSource.indexOf('android:name=".QuickLogWidgetTrackingCalendar2x2"')
    );

    expect(androidManifestSource).toContain('android:name=".QuickLogWidgetPrincipleCard4x2"');
    expect(androidManifestSource).toContain('@xml/widget_info_principle_card_4x2');
    expect(principleCardManifestBlock).toContain('android.intent.action.USER_PRESENT');
    expect(widgetPrincipleCardInfoSource).toContain('android:targetCellWidth="4"');
    expect(widgetPrincipleCardInfoSource).toContain('android:targetCellHeight="2"');
    expect(widgetPrincipleCardInfoSource).toContain('android:previewImage="@drawable/widget_preview_principle_card_4x2"');
    expect(widgetPrincipleCardBitmapRendererSource).toContain('PRINCIPLE_TEXT_COLOR = "#2F2F2F"');
    expect(widgetBridgePluginSource).toContain('fun syncPrincipleCardWidgetData(call: PluginCall)');
    expect(widgetBridgePluginSource).toContain('WidgetRefreshCoordinator.refreshPrincipleCardWidgets(context)');
    expect(widgetStoresSource).toContain('KEY_PRINCIPLE_CARD_SYNC');
    expect(widgetStoresSource).toContain('KEY_PRINCIPLE_CARD_STATES');
  });
});

describe('WidgetSceneCardsRemoteViewsService', () => {
  it('uses code-point-safe truncation for scene card titles', () => {
    expect(widgetSceneCardRendererSource).toContain('codePointCount');
    expect(widgetSceneCardRendererSource).toContain('offsetByCodePoints');
    expect(widgetSceneCardRendererSource).not.toContain('substring(0, maxChars)');
    expect(widgetSceneCardRendererSource).toContain('CARD_TITLE_ELLIPSIS = "..."');
    expect(widgetSceneCardsRemoteViewsServiceSource).toContain('WidgetSceneCardRenderer.render');
  });

  it('pins scene card titles to a centered single-line layout for launcher consistency', () => {
    expect(widgetSceneCardItemLayoutSource).toContain('android:layout_gravity="center_horizontal"');
    expect(widgetSceneCardItemLayoutSource).toContain('android:includeFontPadding="false"');
    expect(widgetSceneCardItemLayoutSource).toContain('android:singleLine="true"');
    expect(widgetSceneCardItemLayoutSource).toContain('android:textAlignment="center"');
  });
});

describe('WidgetSceneProviderSupport', () => {
  it('uses in-process card collections on Android 12+ and retains the service adapter for older systems', () => {
    expect(widgetSceneProviderSupportSource).toContain('private static void bindSceneCards');
    expect(widgetSceneProviderSupportSource).toContain('Build.VERSION.SDK_INT >= Build.VERSION_CODES.S');
    expect(widgetSceneProviderSupportSource).toContain('RemoteViews.RemoteCollectionItems.Builder items');
    expect(widgetSceneProviderSupportSource).toContain('WidgetSceneCardRenderer.render');
    expect(widgetSceneProviderSupportSource).toContain('new Intent(context, WidgetSceneCardsRemoteViewsService.class)');
    expect(widgetSceneProviderSupportSource).toContain('Build.VERSION.SDK_INT < Build.VERSION_CODES.S');
  });

  it('binds a manual refresh action, animates the refresh icon, and tracks morning unlock refreshes for the scene widget', () => {
    expect(widgetSceneProviderSupportSource).toContain('ACTION_REFRESH_SCENE_WIDGET');
    expect(widgetSceneProviderSupportSource).toContain('Intent.ACTION_USER_PRESENT');
    expect(widgetSceneProviderSupportSource).toContain('saveSceneMorningRefreshDate');
    expect(widgetSceneProviderSupportSource).toContain('saveSceneRefreshAnimationState');
    expect(widgetSceneProviderSupportSource).toContain('R.drawable.widget_todo_pin_refresh_icon');
    expect(widgetSceneProviderSupportSource).toContain('R.drawable.widget_todo_pin_refresh_icon_5');
    expect(widgetSceneProviderSupportSource).toContain('R.id.widget_scene_refresh_root');
    expect(widgetRefreshCoordinatorSource).toContain('fun refreshSceneWidgetWithFeedback(context: Context, appWidgetId: Int)');
    expect(widgetSceneLayoutSource).toContain('widget_scene_refresh_root');
    expect(widgetSceneLayoutSource).toContain('widget_scene_refresh_icon');
  });

  it('animates every other manual widget refresh control with the shared instance feedback', () => {
    expect(widgetRefreshCoordinatorSource).toContain('fun refreshWidgetWithRefreshFeedback(context: Context, appWidgetId: Int)');
    expect(widgetProviderSupportSource).toContain('WidgetRefreshCoordinator.INSTANCE.refreshWidgetWithRefreshFeedback(context, appWidgetId)');
    expect(widgetProviderSupportSource).toContain('WidgetRefreshIconResolver.resolve(context, appWidgetId)');
    expect(quickTodoProviderSupportSource).toContain('WidgetRefreshCoordinator.INSTANCE.refreshWidgetWithRefreshFeedback(context, appWidgetId)');
    expect(quickTodoProviderSupportSource).toContain('WidgetRefreshIconResolver.resolve(context, appWidgetId)');
    expect(dailyCheckWeekProviderSupportSource).toContain('WidgetRefreshCoordinator.INSTANCE.refreshWidgetWithRefreshFeedback(context, appWidgetId)');
    expect(dailyCheckWeek4x3ProviderSupportSource).toContain('WidgetRefreshCoordinator.INSTANCE.refreshWidgetWithRefreshFeedback(context, appWidgetId)');
    expect(widgetPrincipleCardProviderSupportSource).toContain('WidgetRefreshIconResolver.resolve(context, appWidgetId)');
  });

  it('keeps third-party app launch metadata wired through the native scene widget stack', () => {
    expect(widgetBridgePluginSource).toContain('launchApp = item.optBoolean("launchApp", false)');
    expect(widgetBridgePluginSource).toContain('appPackageName = parseNullableString(item.optString("appPackageName"))');
    expect(widgetStoresSource).toContain('put("launchApp", item.launchApp)');
    expect(widgetStoresSource).toContain('put("appPackageName", item.appPackageName ?: JSONObject.NULL)');
    expect(widgetTimerControllerSource).toContain('maybeLaunchSceneApp(context, item)');
    expect(widgetTimerControllerSource).toContain('getLaunchIntentForPackage(packageName)');
  });
});

describe('WidgetBridgePlugin refresh routing', () => {
  it('uses widget-family refresh helpers instead of refreshing every widget for targeted sync payloads', () => {
    expect(widgetRefreshCoordinatorSource).toContain('fun refreshTimerWidgets(context: Context)');
    expect(widgetRefreshCoordinatorSource).toContain('fun refreshTrackingCalendarWidgets(context: Context)');
    expect(widgetRefreshCoordinatorSource).toContain('fun refreshDailyRuntimeWidgets(context: Context)');
    expect(widgetRefreshCoordinatorSource).toContain('fun refreshTodoPinWidgets(context: Context)');
    expect(widgetRefreshCoordinatorSource).toContain('fun refreshPrincipleCardWidgets(context: Context)');
    expect(widgetRefreshCoordinatorSource).toContain('fun refreshSceneWidgets(context: Context)');

    expect(widgetBridgePluginSource).toContain('WidgetRefreshCoordinator.refreshTimerWidgets(context)');
    expect(widgetBridgePluginSource).toContain('WidgetRefreshCoordinator.refreshTrackingCalendarWidgets(context)');
    expect(widgetBridgePluginSource).toContain('WidgetRefreshCoordinator.refreshDailyRuntimeWidgets(context)');
    expect(widgetBridgePluginSource).toContain('WidgetRefreshCoordinator.refreshTodoPinWidgets(context)');
    expect(widgetBridgePluginSource).toContain('WidgetRefreshCoordinator.refreshPrincipleCardWidgets(context)');
    expect(widgetBridgePluginSource).toContain('WidgetRefreshCoordinator.refreshSceneWidgets(context)');
    expect(widgetBridgePluginSource).toContain('sourceTodos = it.optJSONArray("sourceTodos").toTodoPinSourceTodoList()');
    expect(widgetBridgePluginSource).toContain('sourceCategories = it.optJSONArray("sourceCategories").toTodoPinSourceCategoryList()');
    expect(widgetBridgePluginSource).toContain('maybeDates = item.optJSONArray("maybeDates").toStringList()');
    expect(widgetBridgePluginSource).toContain('skipDates = optJSONArray("skipDates").toStringList()');
    expect(widgetStoresSource).toContain('put("maybeDates", item.maybeDates.toJsonArray())');
    expect(widgetStoresSource).toContain('put("skipDates", skipDates.toJsonArray())');
    expect(widgetBridgePluginSource).toContain('completedAt = parseNullableString(item.optString("completedAt"))');
    expect(widgetStoresSource).toContain('completedAt = parseNullableString(item.optString("completedAt"))');
    expect(widgetStoresSource).toContain('put("completedAt", item.completedAt ?: JSONObject.NULL)');
    expect(quickTodoRemoteViewsServiceSource).toContain('nextItems.size() - completedCount + 5');
    expect(quickTodoRemoteViewsServiceSource).toContain('yyyy-MM-dd\'T\'HH:mm:ss.SSSZ');
    expect(widgetTodoPinProviderSupportSource).toContain('hasMaybeDate(todo, targetDate)');
    expect(widgetTodoPinProviderSupportSource).toContain('isSuppressedRecurringOccurrenceForDate(todo, targetDate)');
  });
});
