package com.smartaiwriter.app.service

import android.content.Context
import android.net.Uri
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.zip.ZipInputStream

object FileParserService {
    private const val MAX_CONTENT_LENGTH = 25000

    fun parseFile(context: Context, uri: Uri, fileName: String): Result<String> {
        return try {
            val ext = fileName.substringAfterLast('.', "").lowercase()
            val text = when (ext) {
                "txt", "csv", "text" -> readTextFile(context, uri)
                "rtf" -> readRtfFile(context, uri)
                "docx" -> readDocxFile(context, uri)
                "pptx" -> readPptxFile(context, uri)
                "xlsx" -> readXlsxFile(context, uri)
                "pdf" -> return Result.failure(Exception("PDF reading is not supported. Please use DOCX, PPTX, XLSX, or TXT format."))
                "doc", "ppt", "xls" -> return Result.failure(Exception("Legacy Office formats (.${ext}) are not supported. Please use .docx, .pptx, or .xlsx format."))
                else -> return Result.failure(Exception("Unsupported file format: .$ext"))
            }
            val truncated = if (text.length > MAX_CONTENT_LENGTH) {
                text.substring(0, MAX_CONTENT_LENGTH) + "\n\n[Content truncated at $MAX_CONTENT_LENGTH characters]"
            } else text
            Result.success(truncated)
        } catch (e: Exception) {
            Result.failure(Exception("Failed to read file: ${e.message}"))
        }
    }

    private fun readTextFile(context: Context, uri: Uri): String {
        context.contentResolver.openInputStream(uri)?.use { stream ->
            return BufferedReader(InputStreamReader(stream, "UTF-8")).readText()
        }
        return ""
    }

    private fun readRtfFile(context: Context, uri: Uri): String {
        val raw = readTextFile(context, uri)
        // Strip RTF control words and braces
        return raw
            .replace(Regex("\\\\[a-z]+\\d*\\s?"), " ")
            .replace(Regex("[{}]"), "")
            .replace(Regex("\\\\[\\\\{}]"), "")
            .replace(Regex("\\s+"), " ")
            .trim()
    }

    private fun readDocxFile(context: Context, uri: Uri): String {
        val sb = StringBuilder()
        context.contentResolver.openInputStream(uri)?.use { stream ->
            ZipInputStream(stream).use { zip ->
                var entry = zip.nextEntry
                while (entry != null) {
                    if (entry.name == "word/document.xml") {
                        val xml = zip.bufferedReader(Charsets.UTF_8).readText()
                        sb.append(parseDocxXml(xml))
                    }
                    zip.closeEntry()
                    entry = zip.nextEntry
                }
            }
        }
        return sb.toString().ifBlank { "Empty document" }
    }

    private fun parseDocxXml(xml: String): String {
        val sb = StringBuilder()
        // Extract text from <w:t> tags
        val textPattern = Regex("<w:t[^>]*>(.*?)</w:t>", RegexOption.DOT_MATCHES_ALL)
        val paragraphPattern = Regex("<w:p[\\s>].*?</w:p>", RegexOption.DOT_MATCHES_ALL)

        paragraphPattern.findAll(xml).forEach { pMatch ->
            val paraText = StringBuilder()
            textPattern.findAll(pMatch.value).forEach { tMatch ->
                paraText.append(tMatch.groupValues[1])
            }
            if (paraText.isNotBlank()) {
                sb.append(paraText).append("\n")
            }
        }
        return sb.toString()
    }

    private fun readPptxFile(context: Context, uri: Uri): String {
        val slides = mutableMapOf<Int, String>()
        context.contentResolver.openInputStream(uri)?.use { stream ->
            ZipInputStream(stream).use { zip ->
                var entry = zip.nextEntry
                while (entry != null) {
                    val name = entry.name
                    if (name.startsWith("ppt/slides/slide") && name.endsWith(".xml")) {
                        val num = Regex("slide(\\d+)\\.xml").find(name)?.groupValues?.get(1)?.toIntOrNull() ?: 0
                        val xml = zip.bufferedReader(Charsets.UTF_8).readText()
                        slides[num] = parsePptxSlideXml(xml)
                    }
                    zip.closeEntry()
                    entry = zip.nextEntry
                }
            }
        }
        val sb = StringBuilder()
        slides.keys.sorted().forEach { num ->
            sb.append("[Slide $num]\n${slides[num]}\n\n")
        }
        return sb.toString().ifBlank { "Empty presentation" }
    }

    private fun parsePptxSlideXml(xml: String): String {
        val sb = StringBuilder()
        val textPattern = Regex("<a:t>(.*?)</a:t>", RegexOption.DOT_MATCHES_ALL)
        val paraPattern = Regex("<a:p>.*?</a:p>", RegexOption.DOT_MATCHES_ALL)

        paraPattern.findAll(xml).forEach { pMatch ->
            val line = StringBuilder()
            textPattern.findAll(pMatch.value).forEach { t ->
                line.append(t.groupValues[1])
            }
            if (line.isNotBlank()) sb.append(line).append("\n")
        }
        return sb.toString().trim()
    }

    private fun readXlsxFile(context: Context, uri: Uri): String {
        var sharedStrings = listOf<String>()
        val sheets = mutableMapOf<Int, String>()

        context.contentResolver.openInputStream(uri)?.use { stream ->
            ZipInputStream(stream).use { zip ->
                var entry = zip.nextEntry
                while (entry != null) {
                    val name = entry.name
                    when {
                        name == "xl/sharedStrings.xml" -> {
                            val xml = zip.bufferedReader(Charsets.UTF_8).readText()
                            sharedStrings = parseSharedStrings(xml)
                        }
                        name.startsWith("xl/worksheets/sheet") && name.endsWith(".xml") -> {
                            val num = Regex("sheet(\\d+)\\.xml").find(name)?.groupValues?.get(1)?.toIntOrNull() ?: 0
                            val xml = zip.bufferedReader(Charsets.UTF_8).readText()
                            sheets[num] = xml
                        }
                    }
                    zip.closeEntry()
                    entry = zip.nextEntry
                }
            }
        }

        val sb = StringBuilder()
        sheets.keys.sorted().forEach { num ->
            sb.append("[Sheet $num]\n")
            sb.append(parseXlsxSheetXml(sheets[num]!!, sharedStrings))
            sb.append("\n")
        }
        return sb.toString().ifBlank { "Empty spreadsheet" }
    }

    private fun parseSharedStrings(xml: String): List<String> {
        val strings = mutableListOf<String>()
        val pattern = Regex("<t[^>]*>(.*?)</t>", RegexOption.DOT_MATCHES_ALL)
        pattern.findAll(xml).forEach { match ->
            strings.add(match.groupValues[1])
        }
        return strings
    }

    private fun parseXlsxSheetXml(xml: String, sharedStrings: List<String>): String {
        val sb = StringBuilder()
        val rowPattern = Regex("<row[\\s>].*?</row>", RegexOption.DOT_MATCHES_ALL)
        val cellPattern = Regex("<c[\\s][^>]*>.*?</c>", RegexOption.DOT_MATCHES_ALL)
        val valuePattern = Regex("<v>(.*?)</v>")
        val typePattern = Regex("t=\"s\"")

        rowPattern.findAll(xml).forEach { rowMatch ->
            val cells = mutableListOf<String>()
            cellPattern.findAll(rowMatch.value).forEach { cellMatch ->
                val cellXml = cellMatch.value
                val value = valuePattern.find(cellXml)?.groupValues?.get(1) ?: ""
                val isSharedString = typePattern.containsMatchIn(cellXml)
                val text = if (isSharedString) {
                    val idx = value.toIntOrNull() ?: 0
                    sharedStrings.getOrElse(idx) { value }
                } else value
                cells.add(text)
            }
            if (cells.any { it.isNotBlank() }) {
                sb.append(cells.joinToString("\t")).append("\n")
            }
        }
        return sb.toString()
    }

    // ── Split long content into chunks ──
    fun splitIntoChunks(text: String, maxChunkSize: Int = 15000): List<String> {
        if (text.length <= maxChunkSize) return listOf(text)
        val chunks = mutableListOf<String>()
        var remaining = text
        while (remaining.length > maxChunkSize) {
            var splitIdx = remaining.lastIndexOf("\n\n", maxChunkSize)
            if (splitIdx < maxChunkSize / 2) splitIdx = remaining.lastIndexOf("\n", maxChunkSize)
            if (splitIdx < maxChunkSize / 2) splitIdx = remaining.lastIndexOf(". ", maxChunkSize)
            if (splitIdx < maxChunkSize / 2) splitIdx = remaining.lastIndexOf(" ", maxChunkSize)
            if (splitIdx < maxChunkSize / 2) splitIdx = maxChunkSize
            chunks.add(remaining.substring(0, splitIdx))
            remaining = remaining.substring(splitIdx).trimStart()
        }
        if (remaining.isNotBlank()) chunks.add(remaining)
        return chunks
    }
}
