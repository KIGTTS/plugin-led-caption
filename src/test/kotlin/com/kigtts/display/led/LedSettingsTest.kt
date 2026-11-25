package com.kigtts.display.led

import com.kigtts.plugin.api.*
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class LedSettingsTest {
    @get:Rule val temporary = TemporaryFolder()
    @Test fun parametersMatchLegacyRangesAndRejectNonFiniteNumbers() {
        val value = LedSettings.from(mapOf("dotRowsPerLine" to "999", "dotSizeFraction" to "-1", "glowStrength" to "Infinity", "screenBrightness" to "NaN", "scrollSpeedDpPerSecond" to "0", "displayHeightFraction" to "5"))
        assertEquals(256, value.dotRowsPerLine); assertEquals(.1f, value.dotSizeFraction)
        assertEquals(.42f, value.glowStrength); assertEquals(1f, value.screenBrightness)
        assertEquals(24f, value.scrollSpeedDpPerSecond); assertEquals(1f, value.displayHeightFraction)
        assertEquals(19, value.values().size)
    }
    @Test fun namedPresetUpgradeSurvivesLaterChangesAndRestart() {
        val dir = temporary.newFolder(); val file = File(dir, "style.properties")
        file.writeText("color=cyan\ndensity=bold\nglow=soft\nspeed=slow", Charsets.UTF_8)
        val store = LedSettingsStore(file)
        assertEquals("#41CAF3", store.value.textColor); assertEquals(18, store.value.dotRowsPerLine)
        assertEquals(.2f, store.value.glowStrength); assertEquals(36f, store.value.scrollSpeedDpPerSecond)
        assertTrue(store.update("backgroundColor", "#038387"))
        assertEquals(store.value, LedSettingsStore(file).value)
    }
    @Test fun controlsPersistPercentColorsChoicesAndScreenOptionsWithoutClosing() {
        val dir = temporary.newFolder(); val style = LedStyle(File(dir, "style.properties"))
        fun change(key: String, value: String) = style.action("style/set/$key", mapOf("value" to value)) { it }
        assertEquals(PluginOutcome.NoAction, change("dotSizeFraction", "75"))
        assertEquals(PluginOutcome.NoAction, change("textColor", "4278420359"))
        assertEquals(PluginOutcome.NoAction, change("scrollDirection", "right"))
        assertEquals(PluginOutcome.NoAction, change("shortTextAlignment", "end"))
        assertEquals(PluginOutcome.NoAction, change("followSystemBrightness", "true"))
        assertEquals(PluginOutcome.NoAction, change("keepScreenOn", "false"))
        assertEquals(PluginOutcome.NoAction, change("quickSwipeOpensQuickText", "false"))
        val display = style.renderer()
        assertEquals(.75f, display.dotSize)
        assertTrue(display.scrollRight)
        assertNull(display.screenBrightness)
        assertFalse(display.keepScreenOn)
        assertTrue(style.controls { it }.controls.filterIsInstance<PluginControl.Slider>().any { it.value == 75f && it.suffix == "%" })
    }
    @Test fun malformedCallbacksCannotInjectCodeOrEraseSavedValues() {
        val dir = temporary.newFolder(); val file = File(dir, "style.properties")
        val style = LedStyle(file); val before = style.renderer()
        for ((key, value) in listOf("textColor" to "<script>", "glowStrength" to "NaN", "dotShape" to "triangle", "keepScreenOn" to "yes", "../file" to "1")) {
            assertTrue(style.action("style/set/$key", mapOf("value" to value)) { it } is PluginOutcome.Message)
        }
        assertEquals(before, style.renderer()); assertFalse(file.exists())
    }
    @Test fun resetPublishesAllDefaultsAndOversizedSettingsAreIgnored() {
        val dir = temporary.newFolder(); val file = File(dir, "style.properties")
        file.writeText("textColor=#038387\n" + "x".repeat(9000))
        val store = LedSettingsStore(file); assertEquals(LedSettings(), store.value)
        store.update("backgroundColor", "#AABBCC"); store.reset()
        assertEquals(LedSettings(), LedSettingsStore(file).value)
    }
    @Test fun largerFontHasIndependentSliderAndSurvivesRestart() {
        val dir = temporary.newFolder(); val file = File(dir, "settings.properties")
        val style = LedStyle(file)
        assertEquals(PluginOutcome.NoAction, style.action("style/set/fontScale", mapOf("value" to "250")) { it })
        assertEquals(2.5f, LedSettingsStore(file).value.fontScale)
        val slider = style.controls { it }.controls.filterIsInstance<PluginControl.Slider>().single { it.actionId.endsWith("fontScale") }
        assertEquals(300f, slider.max); assertEquals(250f, slider.value)
        assertEquals(3f, LedSettings.from(mapOf("fontScale" to "99")).fontScale)
        assertEquals(1f, LedSettings.from(mapOf("fontScale" to "NaN")).fontScale)
    }
}
