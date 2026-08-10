/**
 * @file widgetService.dailyCheckWeek.test.ts
 * @input Daily-review history and daily-check templates
 * @output Regression coverage for the Android weekly daily-check widget payload
 * @pos Test (widget service)
 * @description Verifies that the native weekly widget receives Monday-to-Sunday progress and item colors.
 * @created 2026-08-09
 * @updated 2026-08-10: Added compact 4x3 scrollable widget wiring coverage.
 * @updated 2026-08-10: Added shared reference-style visual wiring coverage.
 * @updated 2026-08-10: Added dense-row and unscaled compact-content coverage.
 * @updated 2026-08-10: Added reference-gap and RemoteViews cache-busting coverage.
 * @updated 2026-08-10: Added single-header collection and shared-size coverage.
 */
import { describe, expect, it } from 'vitest';
import type { CheckTemplate, DailyReview } from '../types';
import { buildDailyWidgetSyncPayload } from './widgetService';
import androidManifestSource from '../../android/app/src/main/AndroidManifest.xml?raw';
import rendererSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetDailyCheckWeekBitmapRenderer.kt?raw';
import compactRendererSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetDailyCheckWeek4x3RowBitmapRenderer.kt?raw';
import sharedVisualsSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetDailyCheckWeekVisuals.kt?raw';
import providerSupportSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetDailyCheckWeekProviderSupport.java?raw';
import compactProviderSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetDailyCheckWeek4x3ProviderSupport.java?raw';
import compactServiceSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetDailyCheckWeek4x3RemoteViewsService.java?raw';
import widgetInfoSource from '../../android/app/src/main/res/xml/widget_info_daily_check_week_4x4.xml?raw';
import compactWidgetInfoSource from '../../android/app/src/main/res/xml/widget_info_daily_check_week_4x3.xml?raw';
import widgetLayoutSource from '../../android/app/src/main/res/layout/widget_layout_daily_check_week_4x4.xml?raw';
import compactWidgetLayoutSource from '../../android/app/src/main/res/layout/widget_layout_daily_check_week_4x3.xml?raw';
import compactWeekdayItemSource from '../../android/app/src/main/res/layout/widget_daily_check_week_4x3_weekday_item.xml?raw';
import widgetPreviewSource from '../../android/app/src/main/res/drawable/widget_preview_daily_check_week_4x4.xml?raw';
import compactWidgetPreviewSource from '../../android/app/src/main/res/drawable/widget_preview_daily_check_week_4x3.xml?raw';

const checkTemplates: CheckTemplate[] = [{
  id: 'daily-template',
  title: 'Daily',
  enabled: true,
  order: 1,
  isDaily: true,
  items: [{
    id: 'daily-check',
    content: 'Read',
    color: '#f43f5e',
    type: 'manual',
    manualMode: 'binary'
  }, {
    id: 'automatic-check',
    content: 'Sleep',
    type: 'auto'
  }]
}];

const review = (date: string, isCompleted: boolean): DailyReview => ({
  id: `review-${date}`,
  date,
  createdAt: 1,
  updatedAt: 1,
  answers: [],
  checkItems: [{
    id: 'daily-check',
    content: 'Read',
    isCompleted,
    type: 'manual',
    manualMode: 'binary'
  }]
});

describe('buildDailyWidgetSyncPayload', () => {
  it('sends the current Monday-to-Sunday window with colored daily-check progress', () => {
    const payload = buildDailyWidgetSyncPayload({
      dailyReviews: [review('2026-08-03', true), review('2026-08-05', true)],
      checkTemplates,
      date: new Date(2026, 7, 5, 9, 0, 0)
    });

    expect(payload.weekStartDate).toBe('2026-08-03');
    expect(payload.weekEndDate).toBe('2026-08-09');
    expect(payload.items).toEqual([
      expect.objectContaining({ checkItemId: 'daily-check', color: '#f43f5e' }),
      expect.objectContaining({ checkItemId: 'automatic-check' })
    ]);
    expect(payload.progress).toHaveLength(14);
    expect(payload.progress.filter((entry) => entry.isCompleted).map((entry) => entry.date)).toEqual([
      '2026-08-03',
      '2026-08-05'
    ]);
  });
});

describe('daily-check weekly Android widget wiring', () => {
  it('registers a 4x4 read-only widget with a dedicated refresh action', () => {
    expect(androidManifestSource).toContain('android:name=".QuickLogWidgetDailyCheckWeek4x4"');
    expect(androidManifestSource).toContain('@xml/widget_info_daily_check_week_4x4');
    expect(widgetInfoSource).toContain('android:targetCellWidth="4"');
    expect(widgetInfoSource).toContain('android:targetCellHeight="4"');
    expect(widgetInfoSource).toContain('@drawable/widget_preview_daily_check_week_4x4');
    expect(providerSupportSource).toContain('ACTION_REFRESH');
    expect(providerSupportSource).toContain('R.id.widget_daily_check_week_refresh_root');
    expect(providerSupportSource).not.toContain('getLaunchIntentForPackage');
    expect(widgetLayoutSource).toContain('widget_daily_check_week_refresh_root');
    expect(rendererSource).toContain('resolveWeekDates');
    expect(rendererSource).toContain('weekStartDate');
    expect(rendererSource).toContain('WidgetDailyCheckWeekVisuals.drawStateCell');
    expect(rendererSource).toContain('min(31f * density');
    expect(rendererSource).toContain('grid(width, density, 16f)');
    expect(widgetLayoutSource).toContain('widget_daily_check_week_date');
    expect(widgetPreviewSource).toContain('android:width="250dp"');
    expect(widgetPreviewSource).toContain('@drawable/ic_widget_refresh');
  });

  it('wires a separate scrollable 4x3 variant without row actions or scrollbars', () => {
    expect(androidManifestSource).toContain('android:name=".QuickLogWidgetDailyCheckWeek4x3"');
    expect(androidManifestSource).toContain('android:name=".WidgetDailyCheckWeek4x3RemoteViewsService"');
    expect(compactWidgetInfoSource).toContain('android:targetCellWidth="4"');
    expect(compactWidgetInfoSource).toContain('android:targetCellHeight="3"');
    expect(compactProviderSource).toContain('setRemoteAdapter');
    expect(compactProviderSource).toContain('ACTION_REFRESH');
    expect(compactProviderSource).toContain('REMOTE_VIEWS_VERSION = "v4"');
    expect(compactServiceSource).toContain('WidgetDailyCheckWeek4x3RowBitmapRenderer');
    expect(compactServiceSource).toContain('items.size() + 1');
    expect(compactServiceSource).toContain('getViewTypeCount()');
    expect(compactServiceSource).toContain('return 2;');
    expect(compactRendererSource).toContain('renderWeekdays');
    expect(compactRendererSource).toContain('WidgetDailyCheckWeekVisuals.drawStateCell');
    expect(compactRendererSource).toContain('CONTENT_HORIZONTAL_INSET_DP');
    expect(sharedVisualsSource).toContain('pastelAccentColor');
    expect(sharedVisualsSource).toContain('foregroundAccentColor');
    expect(sharedVisualsSource).toContain('GRID_LEFT_RATIO = 0.43f');
    expect(compactWidgetLayoutSource).toContain('android:scrollbars="none"');
    expect(compactWidgetLayoutSource).not.toContain('widget_daily_check_week_4x3_weekdays');
    expect(compactWeekdayItemSource).toContain('widget_daily_check_week_4x3_weekday_bitmap');
    expect(compactWidgetLayoutSource).toContain('widget_daily_check_week_4x3_refresh');
    expect(compactWidgetPreviewSource).toContain('android:width="220dp"');
  });
});
