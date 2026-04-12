package com.mistycrown.lumostime;

import androidx.annotation.NonNull;
import androidx.glance.appwidget.GlanceAppWidget;
import androidx.glance.appwidget.GlanceAppWidgetReceiver;

/**
 * Keeps the existing manifest receiver path while delegating rendering to the new Glance widget.
 */
public class QuickLogWidget extends GlanceAppWidgetReceiver {
    @NonNull
    @Override
    public GlanceAppWidget getGlanceAppWidget() {
        return new LumosTimerWidget();
    }
}
