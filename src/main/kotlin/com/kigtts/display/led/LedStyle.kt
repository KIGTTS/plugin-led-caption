package com.kigtts.display.led

import com.kigtts.plugin.api.*
import java.io.File

/** Native controls send bounded values back; the renderer remains mounted during every adjustment. */
internal class LedStyle(file: File) {
    private val store = LedSettingsStore(file)

    fun renderer(): NativeSubtitleRenderer.Led = store.value.let { s ->
        NativeSubtitleRenderer.Led(
            foreground = argb(s.textColor), background = argb(s.backgroundColor),
            dotMatrix = s.dotMatrixEnabled, squareDots = s.dotShape == "square", dotRows = s.dotRowsPerLine,
            dotSize = s.dotSizeFraction, glow = if (s.glowEnabled) s.glowStrength else 0f,
            displayHeight = s.displayHeightFraction, wrap = s.adaptiveMultiLine,
            scrollSpeed = s.scrollSpeedDpPerSecond, scrollRight = s.scrollDirection == "right", loopGap = s.loopGapDp,
            alignment = when (s.shortTextAlignment) {
                "start" -> LedAlignment.START
                "end" -> LedAlignment.END
                else -> LedAlignment.CENTER
            },
            quickSwipe = false, keepScreenOn = false, screenBrightness = null,
        )
    }

    fun controls(text: (String) -> String): PluginOutcome.Controls {
        val s = store.value
        fun slider(key: String, title: String, value: Float, min: Float, max: Float, suffix: String = "", steps: Int = 0) =
            PluginControl.Slider(title, "$SET$key", value, min, max, steps, suffix)
        fun toggle(key: String, title: String, value: Boolean) = PluginControl.Toggle(title, "$SET$key", value)
        fun choice(key: String, title: String, value: String, vararg options: Pair<String, String>) =
            PluginControl.Choice(title, "$SET$key", options.map { PluginControlOption(it.first, it.second) }, value)
        return PluginOutcome.Controls(text("style.title"), listOf(
            PluginControl.Color(text("style.text_color"), "${SET}textColor", argb(s.textColor)),
            PluginControl.Color(text("style.background_color"), "${SET}backgroundColor", argb(s.backgroundColor)),
            toggle("dotMatrixEnabled", text("style.matrix"), s.dotMatrixEnabled),
            choice("dotShape", text("style.shape"), s.dotShape, "circle" to text("style.round"), "square" to text("style.square")),
            slider("dotRowsPerLine", text("style.density"), s.dotRowsPerLine.toFloat(), 8f, 256f, text("style.rows_unit"), 247),
            slider("dotSizeFraction", text("style.dot_size"), s.dotSizeFraction * 100, 10f, 100f, "%"),
            toggle("glowEnabled", text("style.glow"), s.glowEnabled),
            slider("glowStrength", text("style.glow_strength"), s.glowStrength * 100, 0f, 100f, "%"),
            slider("displayHeightFraction", text("style.height"), s.displayHeightFraction * 100, 35f, 100f, "%"),
            toggle("adaptiveMultiLine", text("style.wrap"), s.adaptiveMultiLine),
            slider("scrollSpeedDpPerSecond", text("style.scroll_speed"), s.scrollSpeedDpPerSecond, 24f, 1600f, " dp/s"),
            choice("scrollDirection", text("style.direction"), s.scrollDirection, "left" to text("style.left"), "right" to text("style.right")),
            slider("loopGapDp", text("style.gap"), s.loopGapDp, 24f, 1600f, " dp"),
            choice("shortTextAlignment", text("style.alignment"), s.shortTextAlignment, "start" to text("style.align_left"), "center" to text("style.align_center"), "end" to text("style.align_right")),
        ), resetActionId = RESET)
    }

    fun action(action: String, inputs: Map<String, String>, text: (String) -> String): PluginOutcome? {
        if (action == RESET) { store.reset(); return controls(text) }
        if (!action.startsWith("style/")) return null
        if (!action.startsWith(SET)) return PluginOutcome.Message(text("style.unknown_option"))
        val key = action.removePrefix(SET)
        val input = inputs["value"] ?: return PluginOutcome.Message(text("style.no_value"))
        val value = when {
            key in COLORS -> input.toLongOrNull()?.takeIf { it in 0..0xFFFFFFFFL }?.let { "#" + (it and 0xFFFFFF).toString(16).padStart(6, '0').uppercase() }
            key in PERCENT -> input.toFloatOrNull()?.takeIf(Float::isFinite)?.let { "${it / 100f}" }
            key in NUMBERS -> input.toFloatOrNull()?.takeIf(Float::isFinite)?.toString()
            key in BOOLEANS -> input.takeIf { it == "true" || it == "false" }
            key in CHOICES -> input.takeIf { it in CHOICES.getValue(key) }
            else -> null
        } ?: return PluginOutcome.Message(text("style.invalid_value"))
        if (!store.update(key, value)) return PluginOutcome.Message(text("style.unknown_option"))
        return PluginOutcome.NoAction
    }

    companion object {
        const val OPEN = "led-style"
        const val SET = "style/set/"
        const val RESET = "style/reset"
        private val COLORS = setOf("textColor", "backgroundColor")
        private val PERCENT = setOf("dotSizeFraction", "glowStrength", "displayHeightFraction")
        private val NUMBERS = setOf("dotRowsPerLine", "scrollSpeedDpPerSecond", "loopGapDp")
        private val BOOLEANS = setOf("dotMatrixEnabled", "glowEnabled", "adaptiveMultiLine")
        private val CHOICES = mapOf("dotShape" to setOf("circle", "square"), "scrollDirection" to setOf("left", "right"), "shortTextAlignment" to setOf("start", "center", "end"))
        private fun argb(color: String): Long = 0xFF000000L or color.removePrefix("#").toLong(16)
    }
}
