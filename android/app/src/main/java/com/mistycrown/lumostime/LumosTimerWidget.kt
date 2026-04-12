package com.mistycrown.lumostime

import android.content.Context
import android.graphics.Color.parseColor
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.ActionParameters
import androidx.glance.action.clickable
import androidx.glance.action.actionParametersOf
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Minimal 2x2 Glance widget for fast timer start/stop.
 */
class LumosTimerWidget : GlanceAppWidget() {
    override val sizeMode: SizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snapshot = WidgetSnapshotBuilder.build(context)
        provideContent {
            WidgetContent(snapshot)
        }
    }
}

object LumosTimerWidgetUpdater {
    suspend fun refreshAll(context: Context) {
        LumosTimerWidget().updateAll(context)
    }

    fun refreshAllAsync(context: Context) {
        CoroutineScope(Dispatchers.IO).launch {
            refreshAll(context)
        }
    }
}

class WidgetSlotAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        val slotIndex = parameters[KEY_SLOT_INDEX] ?: return
        WidgetTimerController.handleSlotTap(context, slotIndex)
    }

    companion object {
        val KEY_SLOT_INDEX = ActionParameters.Key<Int>("slot_index")
    }
}

@Composable
private fun WidgetContent(snapshot: WidgetSnapshot) {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ColorProvider(Color.White))
            .cornerRadius(28.dp)
            .padding(14.dp)
    ) {
        Column(
            modifier = GlanceModifier.fillMaxSize(),
            verticalAlignment = Alignment.Vertical.CenterVertically,
            horizontalAlignment = Alignment.Horizontal.CenterHorizontally
        ) {
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.Vertical.CenterVertically,
                horizontalAlignment = Alignment.Horizontal.CenterHorizontally
            ) {
                WidgetSlotCell(snapshot.slots[0])
                Spacer(modifier = GlanceModifier.width(14.dp))
                WidgetSlotCell(snapshot.slots[1])
            }
            Spacer(modifier = GlanceModifier.height(14.dp))
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.Vertical.CenterVertically,
                horizontalAlignment = Alignment.Horizontal.CenterHorizontally
            ) {
                WidgetSlotCell(snapshot.slots[2])
                Spacer(modifier = GlanceModifier.width(14.dp))
                WidgetSlotCell(snapshot.slots[3])
            }
        }
    }
}

@Composable
private fun WidgetSlotCell(slot: WidgetSnapshotSlot) {
    val action = if (slot.isConfigured) {
        actionRunCallback<WidgetSlotAction>(
            actionParametersOf(WidgetSlotAction.KEY_SLOT_INDEX to slot.slotIndex)
        )
    } else {
        null
    }

    val backgroundColor = if (slot.isActive) {
        parseWidgetColor(slot.color)
    } else {
        mixWithWhite(parseWidgetColor(slot.color), 0.78f)
    }
    val textColor = if (slot.isActive) Color.White else Color(0xFF1F2937)

    val clickableModifier = if (action != null) {
        GlanceModifier.clickable(action)
    } else {
        GlanceModifier
    }

    Box(
        modifier = GlanceModifier
            .size(62.dp)
            .cornerRadius(31.dp)
            .background(ColorProvider(backgroundColor))
            .then(clickableModifier),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = if (slot.isActive) "\u25A0" else slot.icon,
            style = TextStyle(
                color = ColorProvider(textColor),
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
        )
    }
}

private fun parseWidgetColor(raw: String): Color {
    return try {
        Color(parseColor(raw))
    } catch (_: IllegalArgumentException) {
        Color(0xFFE7E5E4)
    }
}

private fun mixWithWhite(color: Color, ratio: Float): Color {
    val clamped = ratio.coerceIn(0f, 1f)
    return Color(
        red = color.red + (1f - color.red) * clamped,
        green = color.green + (1f - color.green) * clamped,
        blue = color.blue + (1f - color.blue) * clamped,
        alpha = 1f
    )
}
