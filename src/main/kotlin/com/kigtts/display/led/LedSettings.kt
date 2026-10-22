package com.kigtts.display.led

import java.util.Properties
import kotlin.math.roundToInt

/** Renderer settings are independent of Android and never contain executable text or paths. */
internal data class LedSettings(
    val textColor: String = "#FFFFFF",
    val backgroundColor: String = "#000000",
    val dotMatrixEnabled: Boolean = true,
    val dotShape: String = "circle",
    val dotRowsPerLine: Int = 24,
    val dotSizeFraction: Float = .58f,
    val glowEnabled: Boolean = true,
    val glowStrength: Float = .42f,
    val displayHeightFraction: Float = .72f,
    val fontScale: Float = 1f,
    val adaptiveMultiLine: Boolean = false,
    val scrollSpeedDpPerSecond: Float = 72f,
    val scrollDirection: String = "left",
    val loopGapDp: Float = 96f,
    val shortTextAlignment: String = "center",
    val quickSwipeOpensQuickText: Boolean = true,
    val keepScreenOn: Boolean = true,
    val followSystemBrightness: Boolean = false,
    val screenBrightness: Float = 1f,
) {
    fun values(): Map<String, String> = linkedMapOf(
        "textColor" to textColor, "backgroundColor" to backgroundColor,
        "dotMatrixEnabled" to "$dotMatrixEnabled", "dotShape" to dotShape,
        "dotRowsPerLine" to "$dotRowsPerLine", "dotSizeFraction" to "$dotSizeFraction",
        "glowEnabled" to "$glowEnabled", "glowStrength" to "$glowStrength",
        "displayHeightFraction" to "$displayHeightFraction", "fontScale" to "$fontScale", "adaptiveMultiLine" to "$adaptiveMultiLine",
        "scrollSpeedDpPerSecond" to "$scrollSpeedDpPerSecond", "scrollDirection" to scrollDirection,
        "loopGapDp" to "$loopGapDp", "shortTextAlignment" to shortTextAlignment,
        "quickSwipeOpensQuickText" to "$quickSwipeOpensQuickText", "keepScreenOn" to "$keepScreenOn",
        "followSystemBrightness" to "$followSystemBrightness", "screenBrightness" to "$screenBrightness",
    )

    fun json(): String = values().entries.joinToString(",", "{", "}") { (key, value) ->
        val literal = if (key in STRING_KEYS) "\"$value\"" else value
        "\"$key\":$literal"
    }

    companion object {
        val STRING_KEYS = setOf("textColor", "backgroundColor", "dotShape", "scrollDirection", "shortTextAlignment")
        private val COLORS = mapOf("amber" to "#FFA424", "white" to "#C8E0FF", "green" to "#4EE48F", "cyan" to "#41CAF3", "rose" to "#FF60B1")
        fun load(properties: Properties): LedSettings = from(properties.stringPropertyNames().associateWith { properties.getProperty(it) })

        fun from(raw: Map<String, String>): LedSettings {
            val defaults = LedSettings()
            fun color(key: String, fallback: String) = raw[key]?.takeIf { it.matches(Regex("#[a-fA-F0-9]{6}")) }?.uppercase() ?: fallback
            fun boolean(key: String, fallback: Boolean) = raw[key]?.toBooleanStrictOrNull() ?: fallback
            fun number(key: String, fallback: Float, min: Float, max: Float) = raw[key]?.toFloatOrNull()?.takeIf { it.isFinite() }?.coerceIn(min, max) ?: fallback
            fun choice(key: String, fallback: String, vararg options: String) = raw[key]?.takeIf { it in options } ?: fallback
            // 0.1.1 stored four named presets. Upgrade them once, keeping every custom value.
            val legacyColor = COLORS[raw["color"]] ?: defaults.textColor
            val legacyRows = when (raw["density"]) { "fine" -> 30f; "bold" -> 18f; else -> 24f }
            val legacyGlow = when (raw["glow"]) { "soft" -> .2f; "bright" -> .8f; else -> defaults.glowStrength }
            val legacySpeed = when (raw["speed"]) { "slow" -> 36f; "fast" -> 128f; else -> defaults.scrollSpeedDpPerSecond }
            return LedSettings(
                textColor = color("textColor", legacyColor), backgroundColor = color("backgroundColor", defaults.backgroundColor),
                dotMatrixEnabled = boolean("dotMatrixEnabled", true), dotShape = choice("dotShape", "circle", "circle", "square"),
                dotRowsPerLine = number("dotRowsPerLine", legacyRows, 8f, 256f).roundToInt(),
                dotSizeFraction = number("dotSizeFraction", .58f, .1f, 1f), glowEnabled = boolean("glowEnabled", true),
                glowStrength = number("glowStrength", legacyGlow, 0f, 1f), displayHeightFraction = number("displayHeightFraction", .72f, .35f, 1f),
                fontScale = number("fontScale", 1f, .5f, 3f),
                adaptiveMultiLine = boolean("adaptiveMultiLine", false), scrollSpeedDpPerSecond = number("scrollSpeedDpPerSecond", legacySpeed, 24f, 1600f),
                scrollDirection = choice("scrollDirection", "left", "left", "right"), loopGapDp = number("loopGapDp", 96f, 24f, 1600f),
                shortTextAlignment = choice("shortTextAlignment", "center", "start", "center", "end"),
                quickSwipeOpensQuickText = boolean("quickSwipeOpensQuickText", true), keepScreenOn = boolean("keepScreenOn", true),
                followSystemBrightness = boolean("followSystemBrightness", false), screenBrightness = number("screenBrightness", 1f, .1f, 1f),
            )
        }
    }
}
