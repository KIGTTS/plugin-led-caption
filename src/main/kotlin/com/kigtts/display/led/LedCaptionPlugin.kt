package com.kigtts.display.led

import com.kigtts.plugin.api.*
import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption

/** Session-only switch. Text stays in the host and is streamed into the selected local renderer. */
class LedCaptionPlugin : KigPlugin {
    override val descriptor = PluginDescriptor("display.led", "LED 灯珠字幕",
        "让输入、快捷短语与聆听字幕变成一块发光的灯板", version = "0.1.10", license = "MIT")
    override val localization = PluginLocalization("zh-CN", listOf("zh-CN", "zh-CN-x-casual", "en", "ko", "ja"))
    private var strings = PluginStrings(emptyMap())
    private lateinit var environment: PluginEnvironment
    @Volatile private var enabled = false
    private lateinit var style: LedStyle

    override suspend fun attach(environment: PluginEnvironment) {
        this.environment = environment
        enabled = false
        strings = PluginStrings.fromAssets(environment.assets)
        val root = environment.storage.directory(ROOT)
        // The entry document is copied last, after all of its dependencies are available.
        FILES.forEach { name ->
            val source = File(environment.assets, "led/$name")
            require(source.isFile) { strings.text("resource.missing", environment.locale, mapOf("name" to name)) }
            val destination = File(root, name)
            val temporary = File.createTempFile("led-", ".tmp", root)
            try {
                source.inputStream().use { input -> temporary.outputStream().use(input::copyTo) }
                Files.move(temporary.toPath(), destination.toPath(), StandardCopyOption.REPLACE_EXISTING)
            } finally { temporary.delete() }
        }
        style = LedStyle(environment.storage.file("config/led-style.properties"), root)
    }

    private fun active(context: PluginContext): Boolean = context.inputs[HOST_RENDERER]?.let { it == descriptor.id } ?: enabled
    private fun actions(active: Boolean, fullscreen: Boolean = false, locale: String = "zh-CN"): PluginContributions {
        fun copy(key: String, fallback: String) = strings.text(key, locale, fallback = fallback)
        return PluginContributions(actions = buildList {
            if (active) add(UiAction(LedStyle.OPEN, copy("style.title", "LED 样式"), UiSlot.EDITOR_TOP_END, PluginIcon.SETTINGS,
                order = -110, buttonStyle = UiButtonStyle.ICON, symbol = "tune"))
            add(UiAction(TOGGLE, if (active) copy("action.disable", "关闭 LED 字幕") else copy("action.enable", "开启 LED 字幕"), UiSlot.EDITOR_TOP_START,
                icon = PluginIcon.TEXT, order = -100, buttonStyle = UiButtonStyle.ICON,
                symbol = if (active) "lightbulb" else "lightbulb_outline"))
            if (active) add(UiAction(FULLSCREEN, if (fullscreen) copy("action.exit_fullscreen", "退出全屏字幕") else copy("action.fullscreen", "全屏字幕"), UiSlot.EDITOR_BOTTOM_END,
                PluginIcon.TEXT, order = -100, buttonStyle = UiButtonStyle.ICON,
                symbol = if (fullscreen) "fullscreen_exit" else "fullscreen"))
        })
    }
    override val contributions: PluginContributions get() = actions(enabled)
    override fun contributions(context: PluginContext) = actions(active(context), context.inputs[HOST_FULLSCREEN] == "true", context.locale)

    override suspend fun execute(actionId: String, context: PluginContext): PluginOutcome {
        fun copy(key: String, fallback: String) = strings.text(key, context.locale, fallback = fallback)
        check(::environment.isInitialized) { copy("resource.not_ready", "灯板尚未准备完成") }
        if (actionId == LedStyle.OPEN) return style.controls { key -> strings.text(key, context.locale) }
        style.action(actionId, context.inputs) { key -> strings.text(key, context.locale) }?.let { return it }
        if (actionId == FULLSCREEN) return PluginOutcome.HostAction(HostCommand.TOGGLE_SUBTITLE_FULLSCREEN)
        if (actionId != TOGGLE) return PluginOutcome.Message(copy("action.unknown", "未知操作"))
        if (active(context)) {
            enabled = false
            return PluginOutcome.SetSubtitleRenderer()
        }
        check(File(environment.storage.file(ROOT), "index.html").isFile) { copy("resource.unavailable", "灯板资源不可用，请重新启用插件") }
        enabled = true
        return PluginOutcome.SetSubtitleRenderer(PluginResource(ROOT), "index.html", PanelPresentation(0xff000000L, fadeControlsWhenIdle = true))
    }

    override suspend fun close() { enabled = false }

    companion object {
        const val ROOT = "renderers/led-v1"
        const val TOGGLE = "toggle-led"
        const val HOST_RENDERER = "host.subtitleRenderer"
        const val HOST_FULLSCREEN = "host.subtitleFullscreen"
        const val FULLSCREEN = "led-fullscreen"
        val FILES = listOf("layout.js", "style.js", "scene.js", "paint.js", "led.js", "led.css", "index.html")
    }
}
