package com.kigtts.display.led

import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.util.Properties

internal class LedSettingsStore(private val file: File) {
    var value: LedSettings = load()
        private set
    private fun load(): LedSettings {
        val properties = Properties()
        if (file.isFile && file.length() in 1..8192) runCatching { file.reader(Charsets.UTF_8).use(properties::load) }
        return LedSettings.load(properties)
    }
    fun update(key: String, input: String): Boolean {
        if (key !in value.values()) return false
        val next = LedSettings.from(value.values() + (key to input))
        if (next != value) save(next)
        return true
    }
    fun reset() { save(LedSettings()) }
    private fun save(next: LedSettings) {
        atomic(file) { temporary ->
            temporary.writer(Charsets.UTF_8).use { writer ->
                Properties().also { props -> next.values().forEach(props::setProperty) }.store(writer, "LED caption settings")
            }
        }
        value = next
    }
    private fun atomic(destination: File, write: (File) -> Unit) {
        destination.parentFile.mkdirs()
        val temporary = File.createTempFile("led-settings-", ".tmp", destination.parentFile)
        try { write(temporary); Files.move(temporary.toPath(), destination.toPath(), StandardCopyOption.REPLACE_EXISTING) }
        finally { temporary.delete() }
    }
}
