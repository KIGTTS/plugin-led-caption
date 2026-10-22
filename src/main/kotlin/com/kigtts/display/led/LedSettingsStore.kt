package com.kigtts.display.led

import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.util.Properties

internal class LedSettingsStore(private val file: File, private val renderer: File) {
    var value: LedSettings = load()
        private set
    init { publish() }
    private fun load(): LedSettings {
        val properties = Properties()
        if (file.isFile && file.length() in 1..8192) runCatching { file.reader(Charsets.UTF_8).use(properties::load) }
        return LedSettings.load(properties)
    }
    fun update(key: String, input: String): Boolean {
        if (key !in value.values()) return false
        value = LedSettings.from(value.values() + (key to input)); save(); return true
    }
    fun reset() { value = LedSettings(); save() }
    private fun save() {
        atomic(file) { temporary ->
            temporary.writer(Charsets.UTF_8).use { writer ->
                Properties().also { props -> value.values().forEach(props::setProperty) }.store(writer, "LED caption settings")
            }
        }
        publish()
    }
    private fun publish() = atomic(File(renderer, "renderer.json")) { it.writeText(value.json(), Charsets.UTF_8) }
    private fun atomic(destination: File, write: (File) -> Unit) {
        destination.parentFile.mkdirs()
        val temporary = File.createTempFile("led-settings-", ".tmp", destination.parentFile)
        try { write(temporary); Files.move(temporary.toPath(), destination.toPath(), StandardCopyOption.REPLACE_EXISTING) }
        finally { temporary.delete() }
    }
}
