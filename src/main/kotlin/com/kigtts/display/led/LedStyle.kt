package com.kigtts.display.led

import com.kigtts.plugin.api.*
import java.io.File

/** Native controls send bounded values back; the renderer remains mounted during every adjustment. */
internal class LedStyle(file: File, renderer: File) {
    private val store = LedSettingsStore(file, renderer)

    fun controls(): PluginOutcome.Controls {
        val s = store.value
        fun slider(key: String, title: String, value: Float, min: Float, max: Float, suffix: String = "", steps: Int = 0) =
            PluginControl.Slider(title, "$SET$key", value, min, max, steps, suffix)
        fun toggle(key: String, title: String, value: Boolean) = PluginControl.Toggle(title, "$SET$key", value)
        fun choice(key: String, title: String, value: String, vararg options: Pair<String, String>) =
            PluginControl.Choice(title, "$SET$key", options.map { PluginControlOption(it.first, it.second) }, value)
        return PluginOutcome.Controls("LED 样式", listOf(
            PluginControl.Color("字幕颜色", "${SET}textColor", argb(s.textColor)),
            PluginControl.Color("背景颜色", "${SET}backgroundColor", argb(s.backgroundColor)),
            toggle("dotMatrixEnabled", "使用灯珠点阵", s.dotMatrixEnabled),
            choice("dotShape", "灯珠形状", s.dotShape, "circle" to "圆点", "square" to "方点"),
            slider("dotRowsPerLine", "灯珠密度", s.dotRowsPerLine.toFloat(), 8f, 256f, " 行", 247),
            slider("dotSizeFraction", "灯珠尺寸", s.dotSizeFraction * 100, 10f, 100f, "%"),
            toggle("glowEnabled", "发光效果", s.glowEnabled),
            slider("glowStrength", "发光强度", s.glowStrength * 100, 0f, 100f, "%"),
            slider("displayHeightFraction", "显示高度", s.displayHeightFraction * 100, 35f, 92f, "%"),
            toggle("adaptiveMultiLine", "内容较多时自动换行", s.adaptiveMultiLine),
            slider("scrollSpeedDpPerSecond", "滚动速度", s.scrollSpeedDpPerSecond, 24f, 1600f, " dp/s"),
            choice("scrollDirection", "滚动方向", s.scrollDirection, "left" to "向左", "right" to "向右"),
            slider("loopGapDp", "字幕间距", s.loopGapDp, 24f, 1600f, " dp"),
            choice("shortTextAlignment", "文本对齐", s.shortTextAlignment, "start" to "居左", "center" to "居中", "end" to "居右"),
            toggle("quickSwipeOpensQuickText", "快速左滑打开快捷文本", s.quickSwipeOpensQuickText),
            toggle("keepScreenOn", "保持屏幕常亮", s.keepScreenOn),
            toggle("followSystemBrightness", "亮度跟随系统", s.followSystemBrightness),
            slider("screenBrightness", "屏幕亮度", s.screenBrightness * 100, 10f, 100f, "%"),
        ), resetActionId = RESET)
    }

    fun action(action: String, inputs: Map<String, String>): PluginOutcome? {
        if (action == RESET) { store.reset(); return controls() }
        if (!action.startsWith("style/")) return null
        if (!action.startsWith(SET)) return PluginOutcome.Message("未知样式选项")
        val key = action.removePrefix(SET)
        val input = inputs["value"] ?: return PluginOutcome.Message("没有收到设置值")
        val value = when {
            key in COLORS -> input.toLongOrNull()?.takeIf { it in 0..0xFFFFFFFFL }?.let { "#" + (it and 0xFFFFFF).toString(16).padStart(6, '0').uppercase() }
            key in PERCENT -> input.toFloatOrNull()?.takeIf(Float::isFinite)?.let { "${it / 100f}" }
            key in NUMBERS -> input.toFloatOrNull()?.takeIf(Float::isFinite)?.toString()
            key in BOOLEANS -> input.takeIf { it == "true" || it == "false" }
            key in CHOICES -> input.takeIf { it in CHOICES.getValue(key) }
            else -> null
        } ?: return PluginOutcome.Message("设置值无效")
        if (!store.update(key, value)) return PluginOutcome.Message("未知样式选项")
        return PluginOutcome.NoAction
    }

    companion object {
        const val OPEN = "led-style"
        const val SET = "style/set/"
        const val RESET = "style/reset"
        private val COLORS = setOf("textColor", "backgroundColor")
        private val PERCENT = setOf("dotSizeFraction", "glowStrength", "displayHeightFraction", "screenBrightness")
        private val NUMBERS = setOf("dotRowsPerLine", "scrollSpeedDpPerSecond", "loopGapDp")
        private val BOOLEANS = setOf("dotMatrixEnabled", "glowEnabled", "adaptiveMultiLine", "quickSwipeOpensQuickText", "keepScreenOn", "followSystemBrightness")
        private val CHOICES = mapOf("dotShape" to setOf("circle", "square"), "scrollDirection" to setOf("left", "right"), "shortTextAlignment" to setOf("start", "center", "end"))
        private fun argb(color: String): Long = 0xFF000000L or color.removePrefix("#").toLong(16)
    }
}
