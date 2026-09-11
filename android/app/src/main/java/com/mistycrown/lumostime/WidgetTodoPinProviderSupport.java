package com.mistycrown.lumostime;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.text.TextUtils;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Shared rendering and tap handling for the dedicated TODAY + PIN widgets.
 * Updated 2026-07-22: Appends a subtask's parent title when rebuilding TODAY + PIN widget rows from mirrored sources.
 * Updated 2026-08-10: Propagates recurrence state so recurring widget rows cannot be completed.
 * Updated 2026-05-21: Matched native TODAY + PIN rebuild visibility to the app's today schedule helper, including `maybeDates` and recurrence `skipDates` suppression.
 * Updated 2026-09-11: Keeps completion timestamps when widget-side todo completion changes are applied locally.
 */
public final class WidgetTodoPinProviderSupport {
    public static final String ACTION_TOGGLE_TODO_ITEM =
            "com.mistycrown.lumostime.action.TOGGLE_TODO_PIN_ITEM";
    public static final String ACTION_REFRESH_TODO_PIN =
            "com.mistycrown.lumostime.action.REFRESH_TODO_PIN";
    public static final String EXTRA_TODO_ID = "todo_pin_todo_id";
    public static final String EXTRA_TODO_PIN_ACTION = "todo_pin_action";
    public static final String TODO_PIN_ACTION_COMPLETE = "complete";
    private static final long TODO_PIN_REFRESH_ANIMATION_DURATION_MS = 420L;

    private WidgetTodoPinProviderSupport() {}

    public static boolean handleCommonReceive(
            Context context,
            Intent intent,
            Class<?> providerClass
    ) {
        if (intent == null) {
            return false;
        }

        String action = intent.getAction();
        if (ACTION_REFRESH_TODO_PIN.equals(action)) {
            int appWidgetId = intent.getIntExtra(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID
            );
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                long startedAt = System.currentTimeMillis();
                WidgetStores.INSTANCE.saveTodoPinRefreshAnimationState(
                        context,
                        new WidgetTodoPinRefreshAnimationState(
                                appWidgetId,
                                startedAt,
                                startedAt + TODO_PIN_REFRESH_ANIMATION_DURATION_MS
                        )
                );
            }
            refreshTodoPinPayloadFromMirroredSources(context);
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                WidgetRefreshCoordinator.INSTANCE.refreshTodoPinWidgetWithFeedback(context, appWidgetId);
            } else {
                WidgetRefreshCoordinator.INSTANCE.refreshTodoPinWidgets(context);
            }
            return true;
        }

        if (ACTION_TOGGLE_TODO_ITEM.equals(action)) {
            int appWidgetId = intent.getIntExtra(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID
            );
            String todoId = intent.getStringExtra(EXTRA_TODO_ID);
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID && todoId != null && !todoId.trim().isEmpty()) {
                if (TODO_PIN_ACTION_COMPLETE.equals(intent.getStringExtra(EXTRA_TODO_PIN_ACTION))) {
                    if (toggleTodoCompletion(context, todoId)) {
                        WidgetRefreshCoordinator.INSTANCE.refreshTodoPinWidgets(context);
                    }
                    return true;
                }
                WidgetTodoPinPayload payload = WidgetStores.INSTANCE.loadTodoPinPayload(context);
                WidgetTodoPinItem item = findItem(payload, todoId);
                if (item != null && item.isActionable()) {
                    boolean didChange = WidgetTimerController.INSTANCE.handleTodoPinItemTap(context, appWidgetId, todoId);
                    if (didChange) {
                        WidgetRefreshCoordinator.INSTANCE.refreshAllAsync(context);
                    }
                } else {
                    launchApp(context, appWidgetId);
                }
            }
            return true;
        }

        return Intent.ACTION_DATE_CHANGED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action);
    }

    public static void updateWidgets(
            Context context,
            AppWidgetManager appWidgetManager,
            int[] appWidgetIds,
            Class<? extends AppWidgetProvider> providerClass
    ) {
        updateWidgets(
                context,
                appWidgetManager,
                appWidgetIds,
                R.layout.widget_layout_todo_pin_4x2,
                providerClass
        );
    }

    public static void updateWidgets(
            Context context,
            AppWidgetManager appWidgetManager,
            int[] appWidgetIds,
            int layoutResId,
            Class<? extends AppWidgetProvider> providerClass
    ) {
        if (appWidgetIds == null || appWidgetIds.length == 0) {
            return;
        }

        WidgetTodoPinPayload payload = WidgetStores.INSTANCE.loadTodoPinPayload(context);
        payload = ensurePayloadFreshForToday(context, payload);
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), layoutResId);
            Intent serviceIntent = new Intent(context, WidgetTodoPinRemoteViewsService.class);
            serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            serviceIntent.setData(Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));

            views.setRemoteAdapter(R.id.widget_todo_pin_list, serviceIntent);
            views.setEmptyView(R.id.widget_todo_pin_list, R.id.widget_todo_pin_empty);
            views.setTextViewText(R.id.widget_todo_pin_subtitle, formatHeaderDate());
            bindRefreshButton(context, views, appWidgetId, providerClass);
            views.setOnClickPendingIntent(
                    R.id.widget_todo_pin_refresh_button,
                    buildRefreshPendingIntent(context, appWidgetId, providerClass)
            );
            views.setPendingIntentTemplate(
                    R.id.widget_todo_pin_list,
                    buildItemTemplatePendingIntent(context, appWidgetId, providerClass)
            );

            appWidgetManager.notifyAppWidgetViewDataChanged(
                    new int[] { appWidgetId },
                    R.id.widget_todo_pin_list
            );
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    private static void bindRefreshButton(
            Context context,
            RemoteViews views,
            int appWidgetId,
            Class<? extends AppWidgetProvider> providerClass
    ) {
        WidgetTodoPinRefreshAnimationState animationState =
                WidgetStores.INSTANCE.loadTodoPinRefreshAnimationState(context);
        float progress = animationState != null && animationState.getAppWidgetId() == appWidgetId
                ? resolveRefreshAnimationProgress(animationState)
                : 0f;
        views.setImageViewResource(
                R.id.widget_todo_pin_refresh_button,
                resolveRefreshIconRes(progress)
        );
        views.setOnClickPendingIntent(
                R.id.widget_todo_pin_refresh_button,
                buildRefreshPendingIntent(context, appWidgetId, providerClass)
        );
    }

    private static float resolveRefreshAnimationProgress(WidgetTodoPinRefreshAnimationState animationState) {
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

    private static WidgetTodoPinPayload ensurePayloadFreshForToday(
            Context context,
            WidgetTodoPinPayload payload
    ) {
        if (payload == null) {
            return null;
        }

        if (isPayloadForToday(payload)) {
            return payload;
        }

        if (payload.getSourceTodos().isEmpty()) {
            return null;
        }

        WidgetTodoPinPayload refreshedPayload = rebuildTodoPinPayloadForToday(payload);
        WidgetStores.INSTANCE.saveTodoPinPayload(context, refreshedPayload);
        return refreshedPayload;
    }

    static void refreshTodoPinPayloadFromMirroredSources(Context context) {
        WidgetTodoPinPayload payload = WidgetStores.INSTANCE.loadTodoPinPayload(context);
        if (payload == null || payload.getSourceTodos().isEmpty()) {
            return;
        }

        WidgetStores.INSTANCE.saveTodoPinPayload(context, rebuildTodoPinPayloadForToday(payload));
    }

    private static WidgetTodoPinItem findItem(WidgetTodoPinPayload payload, String todoId) {
        if (payload == null || todoId == null) {
            return null;
        }

        for (WidgetTodoPinItem item : payload.getItems()) {
            if (todoId.equals(item.getTodoId())) {
                return item;
            }
        }
        return null;
    }

    private static boolean isPayloadForToday(WidgetTodoPinPayload payload) {
        if (payload == null) {
            return false;
        }
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
        return today.equals(payload.getDate());
    }

    private static WidgetTodoPinPayload rebuildTodoPinPayloadForToday(WidgetTodoPinPayload payload) {
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
        List<WidgetTodoPinSourceTodo> sourceTodos = payload.getSourceTodos();
        List<WidgetTodoPinSourceCategory> sourceCategories = payload.getSourceCategories();
        List<WidgetTodoPinItem> items = buildTodoPinItemsForDate(sourceTodos, sourceCategories, today);
        return new WidgetTodoPinPayload(
                today,
                items,
                System.currentTimeMillis(),
                sourceTodos,
                sourceCategories
        );
    }

    private static List<WidgetTodoPinItem> buildTodoPinItemsForDate(
            List<WidgetTodoPinSourceTodo> sourceTodos,
            List<WidgetTodoPinSourceCategory> sourceCategories,
            String targetDate
    ) {
        if (sourceTodos == null || sourceTodos.isEmpty()) {
            return Collections.emptyList();
        }

        Map<String, WidgetTodoPinSourceTodo> todoById = new HashMap<>();
        for (WidgetTodoPinSourceTodo todo : sourceTodos) {
            todoById.put(todo.getId(), todo);
        }

        Map<String, WidgetTodoPinSourceCategory> categoryById = new HashMap<>();
        Map<String, WidgetTodoPinSourceActivity> activityById = new HashMap<>();
        if (sourceCategories != null) {
            for (WidgetTodoPinSourceCategory category : sourceCategories) {
                categoryById.put(category.getId(), category);
                for (WidgetTodoPinSourceActivity activity : category.getActivities()) {
                    activityById.put(activity.getId(), activity);
                }
            }
        }

        List<WidgetTodoPinSourceTodo> visibleTodos = new ArrayList<>();
        for (WidgetTodoPinSourceTodo todo : sourceTodos) {
            if (isTodoInAssociationTodayCategory(todo, targetDate)) {
                visibleTodos.add(todo);
            }
        }

        Collections.sort(visibleTodos, new Comparator<WidgetTodoPinSourceTodo>() {
            @Override
            public int compare(WidgetTodoPinSourceTodo left, WidgetTodoPinSourceTodo right) {
                if (left.isCompleted() != right.isCompleted()) {
                    return left.isCompleted() ? 1 : -1;
                }
                if (left.getPin() != right.getPin()) {
                    return left.getPin() ? -1 : 1;
                }
                return left.getTitle().compareToIgnoreCase(right.getTitle());
            }
        });

        List<WidgetTodoPinItem> items = new ArrayList<>();
        for (WidgetTodoPinSourceTodo todo : visibleTodos) {
            ResolvedTodoPinLinkedTarget linkedTarget = resolveTodoPinLinkedTarget(
                    todo,
                    todoById,
                    categoryById,
                    activityById
            );
            items.add(new WidgetTodoPinItem(
                    todo.getId(),
                    formatTodoPinTitle(todo, todoById),
                    todo.isCompleted(),
                    todo.getRecurrenceRule() != null,
                    todo.getPin() ? "PIN" : "TODAY",
                    linkedTarget.categoryId,
                    linkedTarget.activityId,
                    linkedTarget.activityLabel,
                    linkedTarget.icon,
                    linkedTarget.color,
                    todo.getDefaultScopeIds()
            ));
        }
        return items;
    }

    public static boolean toggleTodoCompletion(Context context, String todoId) {
        WidgetTodoPinPayload payload = WidgetStores.INSTANCE.loadTodoPinPayload(context);
        if (payload == null) return false;

        WidgetTodoPinSourceTodo target = null;
        for (WidgetTodoPinSourceTodo todo : payload.getSourceTodos()) {
            if (todoId.equals(todo.getId())) {
                target = todo;
                break;
            }
        }
        if (target == null) return false;
        if (target.getRecurrenceRule() != null) return false;

        boolean isCompleted = !target.isCompleted();
        List<WidgetTodoPinSourceTodo> updatedSourceTodos = new ArrayList<>();
        for (WidgetTodoPinSourceTodo todo : payload.getSourceTodos()) {
            updatedSourceTodos.add(todoId.equals(todo.getId())
                    ? new WidgetTodoPinSourceTodo(
                            todo.getId(), todo.getTitle(), todo.getKind(), isCompleted, todo.getParentTodoId(),
                            todo.getLinkedCategoryId(), todo.getLinkedActivityId(), todo.getDefaultScopeIds(),
                            todo.getPin(), todo.getScheduledDate(), todo.getDeadlineDate(), todo.getMaybeDates(),
                            todo.getRecurrenceRule(), isCompleted ? formatCompletionTimestamp() : null)
                    : todo);
        }
        WidgetTodoPinPayload updatedPayload = new WidgetTodoPinPayload(
                payload.getDate(),
                buildTodoPinItemsForDate(updatedSourceTodos, payload.getSourceCategories(), payload.getDate()),
                System.currentTimeMillis(), updatedSourceTodos, payload.getSourceCategories());
        WidgetStores.INSTANCE.saveTodoPinPayload(context, updatedPayload);
        WidgetStores.INSTANCE.appendPendingTodoPinAction(context, new WidgetPendingTodoPinAction(
                "todo-pin-" + todoId + "-" + System.currentTimeMillis(),
                todoId,
                isCompleted,
                System.currentTimeMillis(),
                "completion",
                null
        ));
        return true;
    }

    private static String formatTodoPinTitle(
            WidgetTodoPinSourceTodo todo,
            Map<String, WidgetTodoPinSourceTodo> todoById
    ) {
        String parentTodoId = todo.getParentTodoId();
        WidgetTodoPinSourceTodo parentTodo = parentTodoId == null ? null : todoById.get(parentTodoId);
        String parentTitle = parentTodo == null ? null : parentTodo.getTitle();
        if (parentTitle == null || parentTitle.trim().isEmpty()) {
            return todo.getTitle();
        }
        return String.format("%s %c %s", todo.getTitle(), 0x00B7, parentTitle.trim());
    }

    private static boolean isTodoInAssociationTodayCategory(
            WidgetTodoPinSourceTodo todo,
            String targetDate
    ) {
        boolean hasExplicitTodayMatch = TextUtils.equals(targetDate, todo.getScheduledDate())
                || TextUtils.equals(targetDate, todo.getDeadlineDate())
                || hasMaybeDate(todo, targetDate);
        boolean hasRecurringMatch = matchesRecurrenceRule(todo.getRecurrenceRule(), targetDate, false);

        if (!hasExplicitTodayMatch
                && !hasRecurringMatch
                && isSuppressedRecurringOccurrenceForDate(todo, targetDate)) {
            return false;
        }

        return todo.getPin() || hasExplicitTodayMatch || hasRecurringMatch;
    }

    private static boolean hasMaybeDate(
            WidgetTodoPinSourceTodo todo,
            String targetDate
    ) {
        List<String> maybeDates = todo.getMaybeDates();
        return maybeDates != null && maybeDates.contains(targetDate);
    }

    private static boolean isSuppressedRecurringOccurrenceForDate(
            WidgetTodoPinSourceTodo todo,
            String targetDate
    ) {
        WidgetTodoPinSourceRecurrenceRule recurrenceRule = todo.getRecurrenceRule();
        List<String> skipDates = recurrenceRule == null ? null : recurrenceRule.getSkipDates();
        if (skipDates == null || !skipDates.contains(targetDate)) {
            return false;
        }

        return matchesRecurrenceRule(recurrenceRule, targetDate, true);
    }

    private static boolean matchesRecurrenceRule(
            WidgetTodoPinSourceRecurrenceRule rule,
            String targetDateKey,
            boolean ignoreSkipDates
    ) {
        if (rule == null || TextUtils.isEmpty(rule.getStartDate())) {
            return false;
        }

        Calendar targetDate = parseDateKey(targetDateKey);
        Calendar startDate = parseDateKey(rule.getStartDate());
        Calendar endDate = parseDateKey(rule.getEndDate());
        if (targetDate == null || startDate == null) {
            return false;
        }
        if (targetDate.before(startDate)) {
            return false;
        }
        if (endDate != null && targetDate.after(endDate)) {
            return false;
        }
        if (!ignoreSkipDates) {
            List<String> skipDates = rule.getSkipDates();
            if (skipDates != null && skipDates.contains(targetDateKey)) {
                return false;
            }
        }

        String frequency = rule.getFrequency();
        if ("daily".equals(frequency)) {
            int interval = Math.max(1, rule.getInterval() == null ? 1 : rule.getInterval());
            return getDayDiff(startDate, targetDate) % interval == 0;
        }
        if ("weekly".equals(frequency)) {
            int interval = Math.max(1, rule.getInterval() == null ? 1 : rule.getInterval());
            List<Integer> weekdays = rule.getWeekdays();
            Set<Integer> weekdaySet = new HashSet<>(weekdays == null || weekdays.isEmpty()
                    ? Collections.singletonList(startDate.get(Calendar.DAY_OF_WEEK) - 1)
                    : weekdays);
            int targetWeekday = targetDate.get(Calendar.DAY_OF_WEEK) - 1;
            if (!weekdaySet.contains(targetWeekday)) {
                return false;
            }
            Calendar startWeek = startOfWeek(startDate);
            Calendar targetWeek = startOfWeek(targetDate);
            int weekDiff = getDayDiff(startWeek, targetWeek) / 7;
            return weekDiff % interval == 0;
        }
        if ("monthly".equals(frequency)) {
            int interval = Math.max(1, rule.getInterval() == null ? 1 : rule.getInterval());
            List<Integer> monthDays = rule.getMonthDays();
            List<Integer> normalizedMonthDays = monthDays == null || monthDays.isEmpty()
                    ? Collections.singletonList(startDate.get(Calendar.DAY_OF_MONTH))
                    : monthDays;
            Set<Integer> daySet = new HashSet<>();
            int lastDayOfTargetMonth = targetDate.getActualMaximum(Calendar.DAY_OF_MONTH);
            for (Integer monthDay : normalizedMonthDays) {
                if (monthDay == null) {
                    continue;
                }
                if (rule.getFallbackToMonthEnd() && monthDay == 31) {
                    daySet.add(Math.min(monthDay, lastDayOfTargetMonth));
                } else {
                    daySet.add(monthDay);
                }
            }
            int monthDiff = getMonthDiff(startDate, targetDate);
            return monthDiff % interval == 0
                    && daySet.contains(targetDate.get(Calendar.DAY_OF_MONTH));
        }

        return false;
    }

    private static Calendar parseDateKey(String dateKey) {
        if (TextUtils.isEmpty(dateKey)) {
            return null;
        }

        try {
            String[] parts = dateKey.split("-");
            if (parts.length != 3) {
                return null;
            }
            int year = Integer.parseInt(parts[0]);
            int month = Integer.parseInt(parts[1]);
            int day = Integer.parseInt(parts[2]);
            Calendar calendar = Calendar.getInstance();
            calendar.setLenient(false);
            calendar.set(year, month - 1, day, 0, 0, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            calendar.getTime();
            return calendar;
        } catch (Exception ignored) {
            return null;
        }
    }

    private static int getDayDiff(Calendar start, Calendar end) {
        long diffMs = normalizeDate(end).getTimeInMillis() - normalizeDate(start).getTimeInMillis();
        return (int) (diffMs / (24L * 60L * 60L * 1000L));
    }

    private static int getMonthDiff(Calendar start, Calendar end) {
        return (end.get(Calendar.YEAR) - start.get(Calendar.YEAR)) * 12
                + (end.get(Calendar.MONTH) - start.get(Calendar.MONTH));
    }

    private static Calendar startOfWeek(Calendar source) {
        Calendar calendar = normalizeDate(source);
        int dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK);
        int offset = dayOfWeek == Calendar.SUNDAY ? -6 : Calendar.MONDAY - dayOfWeek;
        calendar.add(Calendar.DAY_OF_MONTH, offset);
        return normalizeDate(calendar);
    }

    private static Calendar normalizeDate(Calendar source) {
        Calendar normalized = (Calendar) source.clone();
        normalized.set(Calendar.HOUR_OF_DAY, 0);
        normalized.set(Calendar.MINUTE, 0);
        normalized.set(Calendar.SECOND, 0);
        normalized.set(Calendar.MILLISECOND, 0);
        return normalized;
    }

    private static ResolvedTodoPinLinkedTarget resolveTodoPinLinkedTarget(
            WidgetTodoPinSourceTodo todo,
            Map<String, WidgetTodoPinSourceTodo> todoById,
            Map<String, WidgetTodoPinSourceCategory> categoryById,
            Map<String, WidgetTodoPinSourceActivity> activityById
    ) {
        List<WidgetTodoPinSourceTodo> candidates = new ArrayList<>();
        candidates.add(todo);
        if (!TextUtils.isEmpty(todo.getParentTodoId())) {
            WidgetTodoPinSourceTodo parentTodo = todoById.get(todo.getParentTodoId());
            if (parentTodo != null) {
                candidates.add(parentTodo);
            }
        }

        for (WidgetTodoPinSourceTodo candidate : candidates) {
            WidgetTodoPinSourceCategory linkedCategory = candidate.getLinkedCategoryId() == null
                    ? null
                    : categoryById.get(candidate.getLinkedCategoryId());
            WidgetTodoPinSourceActivity linkedActivity = candidate.getLinkedActivityId() == null
                    ? null
                    : activityById.get(candidate.getLinkedActivityId());

            String resolvedCategoryId = linkedCategory != null ? linkedCategory.getId() : null;
            if (resolvedCategoryId == null && linkedActivity != null) {
                for (WidgetTodoPinSourceCategory category : categoryById.values()) {
                    for (WidgetTodoPinSourceActivity activity : category.getActivities()) {
                        if (TextUtils.equals(activity.getId(), linkedActivity.getId())) {
                            resolvedCategoryId = category.getId();
                            linkedCategory = category;
                            break;
                        }
                    }
                    if (resolvedCategoryId != null) {
                        break;
                    }
                }
            }

            if (resolvedCategoryId != null && linkedActivity != null) {
                String icon = !TextUtils.isEmpty(linkedActivity.getIcon())
                        ? linkedActivity.getIcon()
                        : linkedCategory != null ? linkedCategory.getIcon() : null;
                String color = coalesceColor(
                        linkedActivity.getColor(),
                        linkedCategory == null ? null : linkedCategory.getThemeColor()
                );
                return new ResolvedTodoPinLinkedTarget(
                        resolvedCategoryId,
                        linkedActivity.getId(),
                        linkedActivity.getName(),
                        icon,
                        color
                );
            }
        }

        return new ResolvedTodoPinLinkedTarget(null, null, null, null, null);
    }

    private static String coalesceColor(String activityColor, String categoryColor) {
        if (!TextUtils.isEmpty(activityColor)) {
            return activityColor;
        }
        if (!TextUtils.isEmpty(categoryColor)) {
            return categoryColor;
        }
        return null;
    }

    private static final class ResolvedTodoPinLinkedTarget {
        private final String categoryId;
        private final String activityId;
        private final String activityLabel;
        private final String icon;
        private final String color;

        private ResolvedTodoPinLinkedTarget(
                String categoryId,
                String activityId,
                String activityLabel,
                String icon,
                String color
        ) {
            this.categoryId = categoryId;
            this.activityId = activityId;
            this.activityLabel = activityLabel;
            this.icon = icon;
            this.color = color;
        }
    }

    private static String formatHeaderDate() {
        return new SimpleDateFormat("EEEE / MMM dd", Locale.ENGLISH)
                .format(new Date())
                .toUpperCase(Locale.ENGLISH);
    }

    private static void launchApp(Context context, int appWidgetId) {
        try {
            PendingIntent intent = buildOpenAppPendingIntent(context, appWidgetId);
            intent.send();
        } catch (PendingIntent.CanceledException ignored) {
        }
    }

    private static PendingIntent buildOpenAppPendingIntent(Context context, int appWidgetId) {
        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent == null) {
            launchIntent = new Intent(context, MainActivity.class);
        }

        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launchIntent.setAction(Intent.ACTION_VIEW);
        launchIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getActivity(
                context,
                appWidgetId + 6400,
                launchIntent,
                pendingIntentFlags()
        );
    }

    private static PendingIntent buildRefreshPendingIntent(
            Context context,
            int appWidgetId,
            Class<? extends AppWidgetProvider> providerClass
    ) {
        Intent intent = new Intent(context, providerClass);
        intent.setAction(ACTION_REFRESH_TODO_PIN);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getBroadcast(
                context,
                appWidgetId + 6900,
                intent,
                pendingIntentFlags()
        );
    }

    private static PendingIntent buildItemTemplatePendingIntent(
            Context context,
            int appWidgetId,
            Class<? extends AppWidgetProvider> providerClass
    ) {
        Intent intent = new Intent(context, providerClass);
        intent.setAction(ACTION_TOGGLE_TODO_ITEM);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getBroadcast(
                context,
                appWidgetId + 7400,
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

    private static String formatCompletionTimestamp() {
        return new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ", Locale.US)
                .format(new Date());
    }
}
