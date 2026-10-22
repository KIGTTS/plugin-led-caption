package com.kigtts.display.led

import com.kigtts.plugin.api.PageAction
import com.kigtts.plugin.api.PluginIcon
import com.kigtts.plugin.api.PluginOutcome
import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.util.Properties

/** Small named presets keep the native dialog understandable and the persisted data bounded. */
internal class LedStyle(private val file: File, private val renderer: File) {
    data class Choice(val id: String, val label: String)
    data class Field(val key: String, val label: String, val symbol: String, val options: List<Choice>, val default: String)
    private val values = Properties()
    init {
        if (file.isFile && file.length() < 4096) runCatching { file.reader(Charsets.UTF_8).use(values::load) }
        fields.forEach { field -> if (values.getProperty(field.key) !in field.options.map { it.id }) values.setProperty(field.key, field.default) }
        writeRenderer()
    }
    fun menu(): PluginOutcome.Menu = PluginOutcome.Menu("LED 样式", fields.map { field ->
        PageAction("style/${field.key}", "${field.label} · ${field.options.first { it.id == values.getProperty(field.key) }.label}", PluginIcon.SETTINGS, field.symbol)
    } + PageAction("style/reset", "恢复默认样式", PluginIcon.SETTINGS, "restart_alt"))
    fun action(action: String): PluginOutcome? {
        val pieces = action.split('/')
        if (pieces.firstOrNull() != "style") return null
        if (pieces.size == 2 && pieces[1] == "reset") {
            fields.forEach { values.setProperty(it.key, it.default) }; save(); return menu()
        }
        val field = fields.firstOrNull { it.key == pieces.getOrNull(1) } ?: return PluginOutcome.Message("未知样式选项")
        if (pieces.size == 2) return PluginOutcome.Menu(field.label, field.options.map { option ->
            PageAction("style/${field.key}/${option.id}", option.label + if (values.getProperty(field.key) == option.id) " ✓" else "", PluginIcon.SETTINGS, field.symbol)
        } + PageAction(OPEN, "返回 LED 样式", PluginIcon.CLOSE, "arrow_back"))
        val option = field.options.firstOrNull { it.id == pieces.getOrNull(2) } ?: return PluginOutcome.Message("未知样式选项")
        if (pieces.size != 3) return PluginOutcome.Message("未知样式选项")
        values.setProperty(field.key, option.id); save(); return menu()
    }
    private fun save() {
        file.parentFile.mkdirs()
        val temporary = File.createTempFile("led-style-", ".tmp", file.parentFile)
        try {
            temporary.writer(Charsets.UTF_8).use { values.store(it, "LED caption style") }
            Files.move(temporary.toPath(), file.toPath(), StandardCopyOption.REPLACE_EXISTING)
        } finally { temporary.delete() }
        writeRenderer()
    }
    private fun writeRenderer() {
        // Values come exclusively from the allowlisted preset IDs; no text or paths enter this file.
        val json = fields.joinToString(",", "{", "}") { "\"${it.key}\":\"${values.getProperty(it.key)}\"" }
        renderer.mkdirs()
        val temporary = File.createTempFile("led-settings-", ".tmp", renderer)
        try {
            temporary.writeText(json, Charsets.UTF_8)
            Files.move(temporary.toPath(), File(renderer, "renderer.json").toPath(), StandardCopyOption.REPLACE_EXISTING)
        } finally { temporary.delete() }
    }
    companion object {
        const val OPEN = "led-style"
        val fields = listOf(
            Field("color", "灯光颜色", "palette", listOf(Choice("amber", "暖金"), Choice("white", "月白"), Choice("green", "青绿"), Choice("cyan", "冰蓝"), Choice("rose", "玫红")), "amber"),
            Field("density", "灯珠大小与间距", "blur_on", listOf(Choice("fine", "细密"), Choice("balanced", "均衡"), Choice("bold", "大颗粒")), "balanced"),
            Field("glow", "辉光", "flare", listOf(Choice("soft", "柔和"), Choice("standard", "标准"), Choice("bright", "明亮")), "standard"),
            Field("speed", "滚动速度", "speed", listOf(Choice("slow", "舒缓"), Choice("standard", "标准"), Choice("fast", "轻快")), "standard"),
        )
    }
}
