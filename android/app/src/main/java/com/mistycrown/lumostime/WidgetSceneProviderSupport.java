package com.mistycrown.lumostime;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.text.TextUtils;
import android.view.View;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * Shared rendering and tap handling for the dedicated 4x3 scene widget.
 * Updated 2026-08-10: Restores the 1.6.3 direct time-slot rendering path and uses in-process
 * RemoteCollectionItems for the optional scrollable rail on Android 12 and newer.
 */
public final class WidgetSceneProviderSupport {
    public static final String ACTION_SELECT_SCENE_TAB =
            "com.mistycrown.lumostime.action.SELECT_SCENE_TAB";
    public static final String ACTION_TOGGLE_SCENE_ITEM =
            "com.mistycrown.lumostime.action.TOGGLE_SCENE_ITEM";
    public static final String ACTION_REFRESH_SCENE_WIDGET =
            "com.mistycrown.lumostime.action.REFRESH_SCENE_WIDGET";
    public static final String EXTRA_SLOT_ID = "scene_slot_id";
    public static final String EXTRA_ITEM_ID = "scene_item_id";
    private static final int MORNING_REFRESH_START_HOUR = 4;
    private static final long SCENE_REFRESH_ANIMATION_DURATION_MS = 420L;

    private static final int[] TAB_ROOT_IDS = new int[] {
            R.id.widget_scene_tab_0_root,
            R.id.widget_scene_tab_1_root,
            R.id.widget_scene_tab_2_root,
            R.id.widget_scene_tab_3_root,
            R.id.widget_scene_tab_4_root,
            R.id.widget_scene_tab_5_root
    };

    private static final int[] TAB_BITMAP_IDS = new int[] {
            R.id.widget_scene_tab_0_bitmap,
            R.id.widget_scene_tab_1_bitmap,
            R.id.widget_scene_tab_2_bitmap,
            R.id.widget_scene_tab_3_bitmap,
            R.id.widget_scene_tab_4_bitmap,
            R.id.widget_scene_tab_5_bitmap
    };

    private WidgetSceneProviderSupport() {}

    static final class ResolvedSceneState {
        final WidgetScenePayload payload;
        final WidgetSceneGroup displayedGroup;
        final WidgetSceneTimeSlot currentAutoSlot;
        final WidgetSceneTimeSlot selectedSlot;
        final String currentAutoSlotId;
        final String selectedSlotId;

        ResolvedSceneState(
                WidgetScenePayload payload,
                WidgetSceneGroup displayedGroup,
                WidgetSceneTimeSlot currentAutoSlot,
                WidgetSceneTimeSlot selectedSlot,
                String currentAutoSlotId,
                String selectedSlotId
        ) {
            this.payload = payload;
            this.displayedGroup = displayedGroup;
            this.currentAutoSlot = currentAutoSlot;
            this.selectedSlot = selectedSlot;
            this.currentAutoSlotId = currentAutoSlotId;
            this.selectedSlotId = selectedSlotId;
        }
    }

    public static boolean handleCommonReceive(
            Context context,
            Intent intent,
            Class<? extends AppWidgetProvider> providerClass
    ) {
        if (intent == null) {
            return false;
        }

        String action = intent.getAction();
        if (ACTION_SELECT_SCENE_TAB.equals(action)) {
            int appWidgetId = intent.getIntExtra(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID
            );
            String slotId = intent.getStringExtra(EXTRA_SLOT_ID);
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID && !TextUtils.isEmpty(slotId)) {
                ResolvedSceneState state = resolveState(context, appWidgetId);
                WidgetStores.INSTANCE.saveSceneSelectionState(
                        context,
                        new WidgetSceneSelectionState(appWidgetId, slotId, state.currentAutoSlotId)
                );
                refreshSingleWidget(context, appWidgetId, providerClass);
            }
            return true;
        }

        if (ACTION_TOGGLE_SCENE_ITEM.equals(action)) {
            int appWidgetId = intent.getIntExtra(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID
            );
            String slotId = intent.getStringExtra(EXTRA_SLOT_ID);
            String itemId = intent.getStringExtra(EXTRA_ITEM_ID);
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID
                    && !TextUtils.isEmpty(slotId)
                    && !TextUtils.isEmpty(itemId)) {
                ResolvedSceneState state = resolveState(context, appWidgetId);
                WidgetSceneItem item = findSceneItem(state.displayedGroup, slotId, itemId);
                int itemIndex = findSceneItemIndex(state.displayedGroup, slotId, itemId);
                if (item != null
                        && itemIndex >= 0
                        && WidgetTimerController.INSTANCE.handleSceneItemTap(
                                context,
                                appWidgetId,
                                state.displayedGroup != null ? state.displayedGroup.getId() : null,
                                slotId,
                                item,
                                itemIndex
                        )) {
                    WidgetRefreshCoordinator.INSTANCE.refreshWidgetWithTapFeedback(context, appWidgetId);
                } else {
                    refreshSingleWidget(context, appWidgetId, providerClass);
                }
            }
            return true;
        }

        if (ACTION_REFRESH_SCENE_WIDGET.equals(action)) {
            int appWidgetId = intent.getIntExtra(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID
            );
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                long startedAt = System.currentTimeMillis();
                WidgetStores.INSTANCE.saveSceneRefreshAnimationState(
                        context,
                        new WidgetSceneRefreshAnimationState(
                                appWidgetId,
                                WidgetSceneRefreshAnimationModes.REFRESH,
                                startedAt,
                                startedAt + SCENE_REFRESH_ANIMATION_DURATION_MS
                        )
                );
            }
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                WidgetRefreshCoordinator.INSTANCE.refreshSceneWidgetWithFeedback(context, appWidgetId);
            } else {
                refreshAllWidgets(context, providerClass);
            }
            return true;
        }

        if (Intent.ACTION_USER_PRESENT.equals(action)) {
            if (shouldRefreshOnMorningUnlock(context)) {
                WidgetStores.INSTANCE.saveSceneMorningRefreshDate(
                        context,
                        buildMorningRefreshDateKey(new Date())
                );
                refreshAllWidgets(context, providerClass);
            }
            return true;
        }

        return Intent.ACTION_DATE_CHANGED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action);
    }

    public static void onDeleted(Context context, int[] appWidgetIds) {
        if (appWidgetIds == null) {
            return;
        }
        WidgetStores.INSTANCE.removeSceneSelectionStates(context, appWidgetIds);
    }

    public static void updateWidgets(
            Context context,
            AppWidgetManager appWidgetManager,
            int[] appWidgetIds,
            Class<? extends AppWidgetProvider> providerClass
    ) {
        if (appWidgetIds == null || appWidgetIds.length == 0) {
            return;
        }

        WidgetScenePayload payload = WidgetStores.INSTANCE.loadScenePayload(context);
        for (int appWidgetId : appWidgetIds) {
            ResolvedSceneState state = resolveState(context, appWidgetId, payload);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout_scene_4x3);

            bindSceneTabs(context, views, state, appWidgetId, providerClass);
            views.setTextViewText(R.id.widget_scene_slot_label, formatSlotLabel(state.selectedSlot));
            bindRefreshButton(context, views, appWidgetId, providerClass);

            Intent cardsIntent = new Intent(context, WidgetSceneCardsRemoteViewsService.class);
            cardsIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            cardsIntent.setData(Uri.parse(cardsIntent.toUri(Intent.URI_INTENT_SCHEME)));
            views.setRemoteAdapter(R.id.widget_scene_cards, cardsIntent);
            views.setPendingIntentTemplate(
                    R.id.widget_scene_cards,
                    buildCardTemplatePendingIntent(context, appWidgetId, providerClass)
            );
            appWidgetManager.notifyAppWidgetViewDataChanged(new int[] { appWidgetId }, R.id.widget_scene_cards);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    static ResolvedSceneState resolveState(Context context, int appWidgetId) {
        return resolveState(context, appWidgetId, WidgetStores.INSTANCE.loadScenePayload(context));
    }

    static ResolvedSceneState resolveState(
            Context context,
            int appWidgetId,
            WidgetScenePayload payload
    ) {
        WidgetSceneGroup displayedGroup = resolveDisplayedGroup(payload, new Date());
        WidgetSceneTimeSlot currentAutoSlot = resolveCurrentAutoSlot(displayedGroup, new Date());
        String currentAutoSlotId = currentAutoSlot != null
                ? currentAutoSlot.getId()
                : getFirstSlotId(displayedGroup);

        WidgetSceneSelectionState savedSelection = WidgetStores.INSTANCE.loadSceneSelectionState(context, appWidgetId);
        String selectedSlotId = null;
        if (displayedGroup != null) {
            if (savedSelection == null || !Objects.equals(savedSelection.getLastAutoSlotId(), currentAutoSlotId)) {
                selectedSlotId = currentAutoSlotId;
            } else if (findTimeSlotById(displayedGroup, savedSelection.getSelectedSlotId()) != null) {
                selectedSlotId = savedSelection.getSelectedSlotId();
            } else {
                selectedSlotId = currentAutoSlotId;
            }

            if (TextUtils.isEmpty(selectedSlotId)) {
                selectedSlotId = getFirstSlotId(displayedGroup);
            }
        }

        WidgetSceneTimeSlot selectedSlot = findTimeSlotById(displayedGroup, selectedSlotId);
        if (selectedSlot == null && displayedGroup != null && !displayedGroup.getTimeSlots().isEmpty()) {
            selectedSlot = displayedGroup.getTimeSlots().get(0);
            selectedSlotId = selectedSlot.getId();
        }

        if (appWidgetId > 0 && displayedGroup != null) {
            if (savedSelection == null
                    || !Objects.equals(savedSelection.getSelectedSlotId(), selectedSlotId)
                    || !Objects.equals(savedSelection.getLastAutoSlotId(), currentAutoSlotId)) {
                WidgetStores.INSTANCE.saveSceneSelectionState(
                        context,
                        new WidgetSceneSelectionState(appWidgetId, selectedSlotId, currentAutoSlotId)
                );
            }
        }

        return new ResolvedSceneState(
                payload,
                displayedGroup,
                currentAutoSlot,
                selectedSlot,
                currentAutoSlotId,
                selectedSlotId
        );
    }

    private static void bindSceneTabs(
            Context context,
            RemoteViews views,
            ResolvedSceneState state,
            int appWidgetId,
            Class<? extends AppWidgetProvider> providerClass
    ) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            views.setViewVisibility(R.id.widget_scene_static_tabs, View.GONE);
            views.setViewVisibility(R.id.widget_scene_tabs, View.VISIBLE);
            bindScrollableSceneTabs(context, views, state, appWidgetId, providerClass);
            return;
        }

        views.setViewVisibility(R.id.widget_scene_tabs, View.GONE);
        views.setViewVisibility(R.id.widget_scene_static_tabs, View.VISIBLE);
        bindStaticSceneTabs(context, views, state, appWidgetId, providerClass);
    }

    private static void bindStaticSceneTabs(
            Context context,
            RemoteViews views,
            ResolvedSceneState state,
            int appWidgetId,
            Class<? extends AppWidgetProvider> providerClass
    ) {
        List<WidgetSceneTimeSlot> slots = getSceneTimeSlots(state);
        for (int index = 0; index < TAB_ROOT_IDS.length; index += 1) {
            int rootId = TAB_ROOT_IDS[index];
            int bitmapId = TAB_BITMAP_IDS[index];
            if (index >= slots.size()) {
                views.setViewVisibility(rootId, View.INVISIBLE);
                continue;
            }

            WidgetSceneTimeSlot slot = slots.get(index);
            boolean isSelected = Objects.equals(slot.getId(), state.selectedSlotId);
            views.setViewVisibility(rootId, View.VISIBLE);
            views.setImageViewBitmap(
                    bitmapId,
                    WidgetSceneTabBitmapRenderer.INSTANCE.render(
                            context,
                            slot.getIcon(),
                            slot.getUiIconAssetPath(),
                            slot.getUiIconFallbackAssetPath(),
                            isSelected
                    )
            );
            views.setOnClickPendingIntent(
                    rootId,
                    buildTabPendingIntent(context, appWidgetId, providerClass, slot.getId(), index)
            );
        }
    }

    private static void bindScrollableSceneTabs(
            Context context,
            RemoteViews views,
            ResolvedSceneState state,
            int appWidgetId,
            Class<? extends AppWidgetProvider> providerClass
    ) {
        List<WidgetSceneTimeSlot> slots = getSceneTimeSlots(state);
        RemoteViews.RemoteCollectionItems.Builder items = new RemoteViews.RemoteCollectionItems.Builder();
        for (int index = 0; index < slots.size(); index += 1) {
            WidgetSceneTimeSlot slot = slots.get(index);
            RemoteViews row = new RemoteViews(context.getPackageName(), R.layout.widget_scene_tab_item);
            row.setImageViewBitmap(
                    R.id.widget_scene_tab_bitmap,
                    WidgetSceneTabBitmapRenderer.INSTANCE.render(
                            context,
                            slot.getIcon(),
                            slot.getUiIconAssetPath(),
                            slot.getUiIconFallbackAssetPath(),
                            Objects.equals(slot.getId(), state.selectedSlotId)
                    )
            );
            Intent fillInIntent = new Intent();
            fillInIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            fillInIntent.putExtra(EXTRA_SLOT_ID, slot.getId());
            row.setOnClickFillInIntent(R.id.widget_scene_tab_root, fillInIntent);
            row.setOnClickFillInIntent(R.id.widget_scene_tab_bitmap, fillInIntent);
            items.addItem(index, row);
        }
        views.setRemoteAdapter(R.id.widget_scene_tabs, items.build());
        views.setPendingIntentTemplate(
                R.id.widget_scene_tabs,
                buildTabTemplatePendingIntent(context, appWidgetId, providerClass)
        );
    }

    private static List<WidgetSceneTimeSlot> getSceneTimeSlots(ResolvedSceneState state) {
        return state.displayedGroup != null
                ? state.displayedGroup.getTimeSlots()
                : java.util.Collections.emptyList();
    }

    private static void refreshSingleWidget(
            Context context,
            int appWidgetId,
            Class<? extends AppWidgetProvider> providerClass
    ) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        updateWidgets(context, appWidgetManager, new int[] { appWidgetId }, providerClass);
    }

    private static void refreshAllWidgets(
            Context context,
            Class<? extends AppWidgetProvider> providerClass
    ) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new android.content.ComponentName(context, providerClass));
        updateWidgets(context, appWidgetManager, appWidgetIds, providerClass);
    }

    private static void bindRefreshButton(
            Context context,
            RemoteViews views,
            int appWidgetId,
            Class<? extends AppWidgetProvider> providerClass
    ) {
        WidgetSceneRefreshAnimationState animationState =
                WidgetStores.INSTANCE.loadSceneRefreshAnimationState(context);
        float progress = animationState != null && animationState.getAppWidgetId() == appWidgetId
                ? resolveRefreshAnimationProgress(animationState)
                : 0f;
        views.setImageViewResource(
                R.id.widget_scene_refresh_icon,
                resolveRefreshIconRes(progress)
        );
        views.setOnClickPendingIntent(
                R.id.widget_scene_refresh_root,
                buildRefreshPendingIntent(context, appWidgetId, providerClass)
        );
    }

    private static WidgetSceneGroup resolveDisplayedGroup(WidgetScenePayload payload, Date now) {
        if (payload == null || payload.getGroups().isEmpty()) {
            return null;
        }

        if (WidgetSceneGroupSwitchModes.AUTO.equals(
                WidgetSceneGroupSwitchModes.normalize(payload.getSwitchMode())
        )) {
            for (WidgetSceneGroup group : payload.getGroups()) {
                if (isAutoSwitchMatched(group, now)) {
                    return group;
                }
            }
        }

        if (!TextUtils.isEmpty(payload.getActiveGroupId())) {
            for (WidgetSceneGroup group : payload.getGroups()) {
                if (Objects.equals(group.getId(), payload.getActiveGroupId())) {
                    return group;
                }
            }
        }

        return payload.getGroups().get(0);
    }

    private static boolean isAutoSwitchMatched(WidgetSceneGroup group, Date date) {
        if (group == null) {
            return false;
        }

        WidgetSceneGroupAutoSwitchConfig config = group.getAutoSwitch();
        String mode = config != null
                ? WidgetSceneGroupAutoSwitchModes.normalize(config.getMode())
                : WidgetSceneGroupAutoSwitchModes.DEFAULT;
        if (WidgetSceneGroupAutoSwitchModes.DISABLED.equals(mode)) {
            return false;
        }

        @SuppressWarnings("deprecation")
        int weekday = date.getDay();
        if (WidgetSceneGroupAutoSwitchModes.WEEKDAY.equals(mode)) {
            return weekday >= 1 && weekday <= 5;
        }
        if (WidgetSceneGroupAutoSwitchModes.WEEKEND.equals(mode)) {
            return weekday == 0 || weekday == 6;
        }
        if (WidgetSceneGroupAutoSwitchModes.DATE_RANGE.equals(mode)) {
            String todayKey = new SimpleDateFormat("yyyyMMdd", Locale.getDefault()).format(date);
            return !TextUtils.isEmpty(config.getStartDate())
                    && !TextUtils.isEmpty(config.getEndDate())
                    && todayKey.compareTo(config.getStartDate()) >= 0
                    && todayKey.compareTo(config.getEndDate()) <= 0;
        }
        if (WidgetSceneGroupAutoSwitchModes.CUSTOM_WEEKDAYS.equals(mode)) {
            return config.getWeekdays() != null && config.getWeekdays().contains(weekday);
        }
        return false;
    }

    private static WidgetSceneTimeSlot resolveCurrentAutoSlot(WidgetSceneGroup group, Date now) {
        if (group == null || group.getTimeSlots().isEmpty()) {
            return null;
        }

        @SuppressWarnings("deprecation")
        int currentMinutes = (now.getHours() * 60) + now.getMinutes();
        for (WidgetSceneTimeSlot slot : group.getTimeSlots()) {
            if (slot.getDisableAutoSwitch()) {
                continue;
            }

            String[] startParts = slot.getStartTime().split(":");
            String[] endParts = slot.getEndTime().split(":");
            if (startParts.length != 2 || endParts.length != 2) {
                continue;
            }

            int startMinutes = safeParseInt(startParts[0]) * 60 + safeParseInt(startParts[1]);
            int endMinutes = safeParseInt(endParts[0]) * 60 + safeParseInt(endParts[1]);

            if (endMinutes < startMinutes) {
                if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
                    return slot;
                }
            } else if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
                return slot;
            }
        }

        return group.getTimeSlots().get(0);
    }

    static WidgetSceneItem findSceneItem(WidgetSceneGroup group, String slotId, String itemId) {
        WidgetSceneTimeSlot slot = findTimeSlotById(group, slotId);
        if (slot == null) {
            return null;
        }

        for (WidgetSceneItem item : slot.getItems()) {
            if (Objects.equals(item.getId(), itemId)) {
                return item;
            }
        }
        return null;
    }

    static int findSceneItemIndex(WidgetSceneGroup group, String slotId, String itemId) {
        WidgetSceneTimeSlot slot = findTimeSlotById(group, slotId);
        if (slot == null) {
            return -1;
        }

        List<WidgetSceneItem> items = slot.getItems();
        for (int index = 0; index < items.size(); index += 1) {
            if (Objects.equals(items.get(index).getId(), itemId)) {
                return index;
            }
        }
        return -1;
    }

    static WidgetSceneTimeSlot findTimeSlotById(WidgetSceneGroup group, String slotId) {
        if (group == null || TextUtils.isEmpty(slotId)) {
            return null;
        }

        for (WidgetSceneTimeSlot slot : group.getTimeSlots()) {
            if (Objects.equals(slot.getId(), slotId)) {
                return slot;
            }
        }
        return null;
    }

    private static String getFirstSlotId(WidgetSceneGroup group) {
        if (group == null || group.getTimeSlots().isEmpty()) {
            return null;
        }
        return group.getTimeSlots().get(0).getId();
    }

    private static String formatSlotLabel(WidgetSceneTimeSlot slot) {
        if (slot == null) {
            return "";
        }
        return slot.getName() + " " + slot.getStartTime() + "-" + slot.getEndTime();
    }

    private static int safeParseInt(String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private static PendingIntent buildTabPendingIntent(
            Context context,
            int appWidgetId,
            Class<? extends AppWidgetProvider> providerClass,
            String slotId,
            int position
    ) {
        Intent intent = new Intent(context, providerClass);
        intent.setAction(ACTION_SELECT_SCENE_TAB);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        intent.putExtra(EXTRA_SLOT_ID, slotId);
        return PendingIntent.getBroadcast(
                context,
                appWidgetId * 100 + position + 8500,
                intent,
                pendingIntentFlags()
        );
    }

    private static PendingIntent buildRefreshPendingIntent(
            Context context,
            int appWidgetId,
            Class<? extends AppWidgetProvider> providerClass
    ) {
        Intent intent = new Intent(context, providerClass);
        intent.setAction(ACTION_REFRESH_SCENE_WIDGET);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getBroadcast(
                context,
                appWidgetId + 8700,
                intent,
                pendingIntentFlags()
        );
    }

    private static PendingIntent buildTabTemplatePendingIntent(
            Context context,
            int appWidgetId,
            Class<? extends AppWidgetProvider> providerClass
    ) {
        Intent intent = new Intent(context, providerClass);
        intent.setAction(ACTION_SELECT_SCENE_TAB);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getBroadcast(
                context,
                appWidgetId * 1000 + 8500,
                intent,
                pendingIntentTemplateFlags()
        );
    }

    private static float resolveRefreshAnimationProgress(WidgetSceneRefreshAnimationState animationState) {
        long duration = Math.max(1L, animationState.getExpiresAt() - animationState.getStartedAt());
        long elapsed = Math.max(0L, System.currentTimeMillis() - animationState.getStartedAt());
        return Math.min(1f, elapsed / (float) duration);
    }

    private static int resolveRefreshIconRes(float progress) {
        if (progress <= 0f || progress >= 1f) {
            return R.drawable.widget_todo_pin_refresh_icon;
        }

        if (progress < 0.2f) {
            return R.drawable.widget_todo_pin_refresh_icon_1;
        }
        if (progress < 0.4f) {
            return R.drawable.widget_todo_pin_refresh_icon_2;
        }
        if (progress < 0.6f) {
            return R.drawable.widget_todo_pin_refresh_icon_3;
        }
        if (progress < 0.8f) {
            return R.drawable.widget_todo_pin_refresh_icon_4;
        }
        return R.drawable.widget_todo_pin_refresh_icon_5;
    }

    private static PendingIntent buildCardTemplatePendingIntent(
            Context context,
            int appWidgetId,
            Class<? extends AppWidgetProvider> providerClass
    ) {
        Intent intent = new Intent(context, providerClass);
        intent.setAction(ACTION_TOGGLE_SCENE_ITEM);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getBroadcast(
                context,
                appWidgetId + 8600,
                intent,
                pendingIntentTemplateFlags()
        );
    }

    private static int pendingIntentFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return flags;
    }

    private static int pendingIntentTemplateFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return flags;
    }

    private static boolean shouldRefreshOnMorningUnlock(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(
                new android.content.ComponentName(context, QuickLogWidgetScene4x3.class)
        );
        if (appWidgetIds == null || appWidgetIds.length == 0) {
            return false;
        }

        Calendar calendar = Calendar.getInstance();
        if (calendar.get(Calendar.HOUR_OF_DAY) < MORNING_REFRESH_START_HOUR) {
            return false;
        }

        String todayKey = buildMorningRefreshDateKey(calendar.getTime());
        return !todayKey.equals(WidgetStores.INSTANCE.loadSceneMorningRefreshDate(context));
    }

    private static String buildMorningRefreshDateKey(Date date) {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(date);
    }
}
