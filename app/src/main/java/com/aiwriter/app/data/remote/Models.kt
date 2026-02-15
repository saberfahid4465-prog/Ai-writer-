package com.aiwriter.app.data.remote

import com.google.gson.annotations.SerializedName

// === Longcat API Request/Response ===

data class ChatRequest(
    val model: String = "LongCat-Flash-Chat",
    val messages: List<ChatMessage>,
    val temperature: Double = 0.5,
    @SerializedName("max_tokens") val maxTokens: Int = 4096
)

data class ChatMessage(
    val role: String,
    val content: String
)

data class ChatResponse(
    val choices: List<Choice>?,
    val usage: Usage?
)

data class Choice(
    val message: ChatMessage?
)

data class Usage(
    @SerializedName("prompt_tokens") val promptTokens: Int = 0,
    @SerializedName("completion_tokens") val completionTokens: Int = 0,
    @SerializedName("total_tokens") val totalTokens: Int = 0
)

// === Pexels API ===

data class PexelsSearchResponse(
    val photos: List<PexelsPhoto>?
)

data class PexelsPhoto(
    val src: PexelsPhotoSrc?
)

data class PexelsPhotoSrc(
    val small: String?,
    val medium: String?,
    val large: String?
)

// === AI Writer Output Schema ===

data class AiWriterOutput(
    @SerializedName("pdf_word") val pdfWord: PdfWordData = PdfWordData(),
    val ppt: PptData = PptData(),
    val excel: ExcelData = ExcelData()
)

data class PdfWordData(
    val title: String = "Untitled Document",
    val author: String = "AI Writer",
    val language: String = "English",
    val sections: MutableList<DocSection> = mutableListOf()
)

data class DocSection(
    var heading: String = "",
    var paragraph: String = "",
    var bullets: MutableList<String> = mutableListOf(),
    @SerializedName("image_keyword") var imageKeyword: String? = null
)

data class PptData(
    val slides: MutableList<PptSlide> = mutableListOf()
)

data class PptSlide(
    val title: String = "",
    val bullets: List<String> = emptyList(),
    @SerializedName("image_keyword") val imageKeyword: String? = null
)

data class ExcelData(
    val headers: List<String> = listOf("Section", "Key Points", "Image Keyword"),
    val rows: List<List<String>> = emptyList()
)

// === Section AI Edit Response ===

data class SectionEditResponse(
    val heading: String = "",
    val paragraph: String = "",
    val bullets: List<String> = emptyList()
)

// === Generated File Info ===

data class GeneratedFile(
    val format: String,       // "pdf", "docx", "pptx", "xlsx"
    val fileName: String,
    val filePath: String,
    val sizeBytes: Long = 0
)

// === History Entry ===

data class HistoryEntry(
    val id: String = "",
    val topic: String = "",
    val language: String = "",
    val timestamp: Long = System.currentTimeMillis(),
    val files: List<GeneratedFile> = emptyList()
)
