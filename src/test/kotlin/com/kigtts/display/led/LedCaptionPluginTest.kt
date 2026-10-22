package com.kigtts.display.led

import com.kigtts.plugin.api.*
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class LedCaptionPluginTest {
    @get:Rule val temporary = TemporaryFolder()
    private fun environment(assets: File = File("src/main/assets")) = object : PluginEnvironment {
        override val storage = PluginStorage(temporary.newFolder())
        override val assets = assets
        override suspend fun download(url: String, relativePath: String, sha256: String?): File = error("LED must never use network")
    }
    @Test fun copiesCompleteOfflineRendererBeforeSelectingIt() = runBlocking {
        val environment = environment(); val plugin = LedCaptionPlugin(); plugin.attach(environment)
        LedCaptionPlugin.FILES.forEach {
            assertArrayEquals(File(environment.assets, "led/$it").readBytes(), environment.storage.file("${LedCaptionPlugin.ROOT}/$it").readBytes())
        }
        val outcome = plugin.execute(LedCaptionPlugin.TOGGLE, PluginContext("你好", "")) as PluginOutcome.SetSubtitleRenderer
        assertEquals(PluginResource(LedCaptionPlugin.ROOT), outcome.root)
        assertEquals("index.html", outcome.mainPage)
    }
    @Test fun iconSwitchPrecedesListeningAndDoesNotOpenASeparatePage() = runBlocking {
        val plugin = LedCaptionPlugin(); plugin.attach(environment())
        val action = plugin.contributions.actions.single()
        assertEquals(UiSlot.EDITOR_TOP_START, action.slot); assertTrue(action.order < 0)
        assertEquals(UiButtonStyle.ICON, action.buttonStyle); assertEquals("lightbulb_outline", action.symbol)
        assertTrue(plugin.contributions.drawerEntries.isEmpty())
        plugin.execute(action.id, PluginContext("", ""))
        assertEquals("lightbulb", plugin.contributions.actions.first { it.id == LedCaptionPlugin.TOGGLE }.symbol)
        assertNull((plugin.execute(action.id, PluginContext("", "")) as PluginOutcome.SetSubtitleRenderer).root)
    }
    @Test fun reattachAndCloseResetSessionInsteadOfPersistingAStaleToggle() = runBlocking {
        val plugin = LedCaptionPlugin(); val environment = environment(); plugin.attach(environment)
        plugin.execute(LedCaptionPlugin.TOGGLE, PluginContext("", "")); plugin.close()
        assertEquals("lightbulb_outline", plugin.contributions.actions.single().symbol)
        plugin.attach(environment)
        assertNotNull((plugin.execute(LedCaptionPlugin.TOGGLE, PluginContext("", "")) as PluginOutcome.SetSubtitleRenderer).root)
    }
    @Test fun missingAssetsFailWithoutSelectingARenderer() = runBlocking {
        val plugin = LedCaptionPlugin()
        try { plugin.attach(environment(temporary.newFolder())); fail("Missing page must not be selected") }
        catch (_: IllegalArgumentException) { }
        assertEquals("lightbulb_outline", plugin.contributions.actions.single().symbol)
    }
    @Test fun unrelatedActionNeverChangesTheSubtitle() = runBlocking {
        val plugin = LedCaptionPlugin(); plugin.attach(environment())
        assertTrue(plugin.execute("unknown", PluginContext("", "")) is PluginOutcome.Message)
        assertEquals("lightbulb_outline", plugin.contributions.actions.single().symbol)
    }
    @Test fun hostSelectionWinsAfterRecoveryOrAnotherRendererReplacesTheLed() = runBlocking {
        val plugin = LedCaptionPlugin(); plugin.attach(environment())
        plugin.execute(LedCaptionPlugin.TOGGLE, PluginContext("", ""))
        val recovered = PluginContext("", "", inputs = mapOf(LedCaptionPlugin.HOST_RENDERER to ""))
        assertEquals("lightbulb_outline", plugin.contributions(recovered).actions.single().symbol)
        assertNotNull((plugin.execute(LedCaptionPlugin.TOGGLE, recovered) as PluginOutcome.SetSubtitleRenderer).root)
        val selected = recovered.copy(inputs = mapOf(LedCaptionPlugin.HOST_RENDERER to "display.led"))
        assertEquals("lightbulb", plugin.contributions(selected).actions.first { it.id == LedCaptionPlugin.TOGGLE }.symbol)
        assertNull((plugin.execute(LedCaptionPlugin.TOGGLE, selected) as PluginOutcome.SetSubtitleRenderer).root)
    }
    @Test fun enabledRendererAddsStyleBeforeLampAndFullscreenAtReadingSide() = runBlocking {
        val plugin = LedCaptionPlugin(); plugin.attach(environment())
        val active = PluginContext("", "", inputs = mapOf(LedCaptionPlugin.HOST_RENDERER to "display.led"))
        val actions = plugin.contributions(active).actions
        val style = actions.first { it.id == LedStyle.OPEN }; val lamp = actions.first { it.id == LedCaptionPlugin.TOGGLE }
        val fullscreen = actions.first { it.id == LedCaptionPlugin.FULLSCREEN }
        assertEquals(UiSlot.EDITOR_TOP_START, style.slot); assertTrue(style.order < lamp.order)
        assertEquals(UiSlot.EDITOR_BOTTOM_END, fullscreen.slot); assertTrue(fullscreen.order < 0)
        assertEquals("fullscreen", fullscreen.symbol)
        val expanded = active.copy(inputs = active.inputs + (LedCaptionPlugin.HOST_FULLSCREEN to "true"))
        assertEquals("fullscreen_exit", plugin.contributions(expanded).actions.first { it.id == LedCaptionPlugin.FULLSCREEN }.symbol)
        assertEquals(HostCommand.TOGGLE_SUBTITLE_FULLSCREEN, (plugin.execute(LedCaptionPlugin.FULLSCREEN, active) as PluginOutcome.HostAction).command)
    }
    @Test fun settingsUseNativeDialogsAndPersistWithoutResettingCurrentCaption() = runBlocking {
        val environment = environment(); val plugin = LedCaptionPlugin(); plugin.attach(environment)
        val context = PluginContext("保留当前文字", "正在聆听")
        val menu = plugin.execute(LedStyle.OPEN, context) as PluginOutcome.Menu
        assertEquals(5, menu.items.size)
        val colors = plugin.execute("style/color", context) as PluginOutcome.Menu
        assertTrue(colors.items.any { it.id == "style/color/cyan" })
        assertTrue(plugin.execute("style/color/cyan", context) is PluginOutcome.Menu)
        assertTrue(plugin.execute("style/density/bold", context) is PluginOutcome.Menu)
        assertTrue(environment.storage.file("${LedCaptionPlugin.ROOT}/renderer.json").readText().contains("\"color\":\"cyan\""))
        val reloaded = LedCaptionPlugin(); reloaded.attach(environment)
        val restored = reloaded.execute(LedStyle.OPEN, context) as PluginOutcome.Menu
        assertTrue(restored.items.any { it.label.contains("冰蓝") }); assertTrue(restored.items.any { it.label.contains("大颗粒") })
        assertTrue(reloaded.execute("style/reset", context) is PluginOutcome.Menu)
        assertTrue(environment.storage.file("${LedCaptionPlugin.ROOT}/renderer.json").readText().contains("\"color\":\"amber\""))
    }
    @Test fun settingsRejectUnknownValuesAndRecoverFromCorruptedData() = runBlocking {
        val environment = environment()
        environment.storage.file("config/led-style.properties").apply { parentFile.mkdirs(); writeText("color=<script>\ndensity=other") }
        val plugin = LedCaptionPlugin(); plugin.attach(environment)
        val config = environment.storage.file("${LedCaptionPlugin.ROOT}/renderer.json").readText()
        assertTrue(config.contains("\"color\":\"amber\"")); assertFalse(config.contains("<script>"))
        assertTrue(plugin.execute("style/color/../red", PluginContext("", "")) is PluginOutcome.Message)
    }
}
