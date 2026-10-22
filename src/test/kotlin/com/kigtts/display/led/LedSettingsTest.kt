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
        assertEquals(24f, value.scrollSpeedDpPerSecond); assertEquals(.92f, value.displayHeightFraction)
        assertEquals(18, value.values().size)
    }
    @Test fun namedPresetUpgradeSurvivesLaterChangesAndRestart() {
        val dir = temporary.newFolder(); val file = File(dir, "style.properties"); val renderer = File(dir, "renderer")
        file.writeText("color=cyan\ndensity=bold\nglow=soft\nspeed=slow", Charsets.UTF_8)
        val store = LedSettingsStore(file, renderer)
        assertEquals("#41CAF3", store.value.textColor); assertEquals(18, store.value.dotRowsPerLine)
        assertEquals(.2f, store.value.glowStrength); assertEquals(36f, store.value.scrollSpeedDpPerSecond)
        assertTrue(store.update("backgroundColor", "#038387"))
        assertEquals(store.value, LedSettingsStore(file, renderer).value)
        assertFalse(File(renderer, "renderer.json").readText().contains("\"color\""))
    }
    @Test fun controlsPersistPercentColorsChoicesAndScreenOptionsWithoutClosing() {
        val dir = temporary.newFolder(); val style = LedStyle(File(dir, "style.properties"), File(dir, "renderer"))
        fun change(key: String, value: String) = style.action("style/set/$key", mapOf("value" to value))
        assertEquals(PluginOutcome.NoAction, change("dotSizeFraction", "75"))
        assertEquals(PluginOutcome.NoAction, change("textColor", "4278420359"))
        assertEquals(PluginOutcome.NoAction, change("scrollDirection", "right"))
        assertEquals(PluginOutcome.NoAction, change("shortTextAlignment", "end"))
        assertEquals(PluginOutcome.NoAction, change("followSystemBrightness", "true"))
        assertEquals(PluginOutcome.NoAction, change("keepScreenOn", "false"))
        assertEquals(PluginOutcome.NoAction, change("quickSwipeOpensQuickText", "false"))
        val json = File(dir, "renderer/renderer.json").readText()
        assertTrue(json.contains("\"dotSizeFraction\":0.75")); assertTrue(json.contains("\"scrollDirection\":\"right\""))
        assertTrue(json.contains("\"followSystemBrightness\":true")); assertTrue(json.contains("\"keepScreenOn\":false"))
        assertTrue(style.controls().controls.filterIsInstance<PluginControl.Slider>().any { it.value == 75f && it.suffix == "%" })
    }
    @Test fun malformedCallbacksCannotInjectCodeOrEraseSavedValues() {
        val dir = temporary.newFolder(); val file = File(dir, "style.properties"); val renderer = File(dir, "renderer")
        val style = LedStyle(file, renderer); val before = File(renderer, "renderer.json").readText()
        for ((key, value) in listOf("textColor" to "<script>", "glowStrength" to "NaN", "dotShape" to "triangle", "keepScreenOn" to "yes", "../file" to "1")) {
            assertTrue(style.action("style/set/$key", mapOf("value" to value)) is PluginOutcome.Message)
        }
        assertEquals(before, File(renderer, "renderer.json").readText()); assertFalse(file.exists())
    }
    @Test fun resetPublishesAllDefaultsAndOversizedSettingsAreIgnored() {
        val dir = temporary.newFolder(); val file = File(dir, "style.properties"); val renderer = File(dir, "renderer")
        file.writeText("textColor=#038387\n" + "x".repeat(9000))
        val store = LedSettingsStore(file, renderer); assertEquals(LedSettings(), store.value)
        store.update("backgroundColor", "#AABBCC"); store.reset()
        assertEquals(LedSettings().json(), File(renderer, "renderer.json").readText())
        assertEquals(LedSettings(), LedSettingsStore(file, renderer).value)
        assertTrue(renderer.listFiles()!!.none { it.name.endsWith(".tmp") })
    }
}
