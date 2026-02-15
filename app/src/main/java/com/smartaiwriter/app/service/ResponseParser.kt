package com.smartaiwriter.app.service

import com.smartaiwriter.app.data.remote.*
import com.google.gson.Gson
import com.google.gson.JsonParser

object ResponseParser {
    private val gson = Gson()

    fun parseAiOutput(raw: String): AiWriterOutput {
        val cleaned = stripMarkdownFences(raw)
        return try {
            val jsonElement = JsonParser.parseString(cleaned)
            if (!jsonElement.isJsonObject) return fallbackOutput(cleaned)

            val obj = jsonElement.asJsonObject
            val pdfWord = if (obj.has("pdf_word")) {
                parsePdfWord(obj.getAsJsonObject("pdf_word"))
            } else {
                PdfWordData(title = "Untitled Document", sections = mutableListOf(
                    DocSection(heading = "Content", paragraph = cleaned)
                ))
            }

            val ppt = if (obj.has("ppt")) {
                parsePpt(obj.getAsJsonObject("ppt"))
            } else {
                buildPptFromSections(pdfWord)
            }

            val excel = if (obj.has("excel")) {
                parseExcel(obj.getAsJsonObject("excel"))
            } else {
                buildExcelFromSections(pdfWord)
            }

            AiWriterOutput(pdfWord = pdfWord, ppt = ppt, excel = excel)
        } catch (e: Exception) {
            fallbackOutput(cleaned)
        }
    }

    fun stripMarkdownFences(text: String): String {
        var result = text.trim()
        // Remove ```json ... ``` or ``` ... ```
        if (result.startsWith("```")) {
            val firstNewline = result.indexOf('\n')
            if (firstNewline > 0) result = result.substring(firstNewline + 1)
        }
        if (result.endsWith("```")) {
            result = result.substring(0, result.length - 3)
        }
        return result.trim()
    }

    private fun parsePdfWord(obj: com.google.gson.JsonObject): PdfWordData {
        val title = obj.get("title")?.asString ?: "Untitled Document"
        val author = obj.get("author")?.asString ?: "AI Writer"
        val language = obj.get("language")?.asString ?: "English"
        val sections = mutableListOf<DocSection>()

        obj.getAsJsonArray("sections")?.forEach { elem ->
            val sec = elem.asJsonObject
            val heading = sec.get("heading")?.asString ?: ""
            val paragraph = sec.get("paragraph")?.asString ?: ""
            val bullets = mutableListOf<String>()
            sec.getAsJsonArray("bullets")?.forEach { b -> bullets.add(b.asString) }
            val imageKeyword = sec.get("image_keyword")?.asString
            sections.add(DocSection(heading, paragraph, bullets, imageKeyword))
        }

        if (sections.isEmpty()) {
            sections.add(DocSection("Introduction", "Content will be added here."))
        }

        return PdfWordData(title, author, language, sections)
    }

    private fun parsePpt(obj: com.google.gson.JsonObject): PptData {
        val slides = mutableListOf<PptSlide>()
        obj.getAsJsonArray("slides")?.forEach { elem ->
            val s = elem.asJsonObject
            val title = s.get("title")?.asString ?: ""
            val bullets = mutableListOf<String>()
            s.getAsJsonArray("bullets")?.forEach { b -> bullets.add(b.asString) }
            val imageKeyword = s.get("image_keyword")?.asString
            slides.add(PptSlide(title, bullets, imageKeyword))
        }
        return PptData(slides)
    }

    private fun parseExcel(obj: com.google.gson.JsonObject): ExcelData {
        val headers = mutableListOf<String>()
        obj.getAsJsonArray("headers")?.forEach { h -> headers.add(h.asString) }
        if (headers.isEmpty()) headers.addAll(listOf("Section", "Key Points", "Image Keyword"))

        val rows = mutableListOf<List<String>>()
        obj.getAsJsonArray("rows")?.forEach { rowElem ->
            val row = mutableListOf<String>()
            rowElem.asJsonArray?.forEach { cell -> row.add(cell.asString) }
            rows.add(row)
        }

        return ExcelData(headers, rows)
    }

    private fun buildPptFromSections(pdfWord: PdfWordData): PptData {
        val slides = pdfWord.sections.map { sec ->
            PptSlide(sec.heading, sec.bullets, sec.imageKeyword)
        }.toMutableList()
        return PptData(slides)
    }

    private fun buildExcelFromSections(pdfWord: PdfWordData): ExcelData {
        val rows = pdfWord.sections.map { sec ->
            listOf(sec.heading, sec.bullets.joinToString("; "), sec.imageKeyword ?: "")
        }
        return ExcelData(rows = rows)
    }

    private fun fallbackOutput(text: String): AiWriterOutput {
        return AiWriterOutput(
            pdfWord = PdfWordData(
                title = "Generated Document",
                sections = mutableListOf(
                    DocSection("Content", text, mutableListOf())
                )
            )
        )
    }
}
