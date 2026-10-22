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
        assertEquals("lightbulb", plugin.contributions.actions.single().symbol)
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
        assertEquals("lightbulb", plugin.contributions(selected).actions.single().symbol)
        assertNull((plugin.execute(LedCaptionPlugin.TOGGLE, selected) as PluginOutcome.SetSubtitleRenderer).root)
    }
}
