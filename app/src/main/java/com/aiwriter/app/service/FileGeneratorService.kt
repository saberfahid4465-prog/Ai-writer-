package com.aiwriter.app.service

import android.content.Context
import com.aiwriter.app.data.remote.AiWriterOutput
import com.aiwriter.app.data.remote.GeneratedFile
import com.aiwriter.app.util.FileUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext

object FileGeneratorService {

    /**
     * Generate selected file formats from AI output.
     * Returns list of generated files.
     */
    suspend fun generateFiles(
        context: Context,
        output: AiWriterOutput,
        formats: Set<String>,
        languageCode: String = "en",
        onProgress: (String) -> Unit = {}
    ): List<GeneratedFile> = withContext(Dispatchers.IO) {
        val files = mutableListOf<GeneratedFile>()
        val topic = output.pdfWord.title

        // Fetch images for sections that need them
        onProgress("Fetching images…")
        val images = fetchImages(output)

        // Generate each format
        if ("pdf" in formats) {
            onProgress("Generating PDF…")
            try {
                val bytes = PdfGenerator.generate(context, output, images)
                val fileName = FileUtils.generateFileName(topic, "pdf")
                val path = FileUtils.saveToInternalStorage(context, bytes, fileName)
                files.add(GeneratedFile("pdf", fileName, path, bytes.size.toLong()))
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        if ("docx" in formats) {
            onProgress("Generating Word document…")
            try {
                val bytes = DocxGenerator.generate(output, languageCode, images)
                val fileName = FileUtils.generateFileName(topic, "docx")
                val path = FileUtils.saveToInternalStorage(context, bytes, fileName)
                files.add(GeneratedFile("docx", fileName, path, bytes.size.toLong()))
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        if ("pptx" in formats) {
            onProgress("Generating PowerPoint…")
            try {
                val bytes = PptxGenerator.generate(output, languageCode, images)
                val fileName = FileUtils.generateFileName(topic, "pptx")
                val path = FileUtils.saveToInternalStorage(context, bytes, fileName)
                files.add(GeneratedFile("pptx", fileName, path, bytes.size.toLong()))
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        if ("xlsx" in formats) {
            onProgress("Generating Excel…")
            try {
                val bytes = XlsxGenerator.generate(output)
                val fileName = FileUtils.generateFileName(topic, "xlsx")
                val path = FileUtils.saveToInternalStorage(context, bytes, fileName)
                files.add(GeneratedFile("xlsx", fileName, path, bytes.size.toLong()))
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        files
    }

    private suspend fun fetchImages(output: AiWriterOutput): Map<String, ByteArray> =
        coroutineScope {
            val pdfKeywords = output.pdfWord.sections.mapNotNull { it.imageKeyword }
            val pptKeywords = output.ppt.slides.mapNotNull { it.imageKeyword }
            val keywords = (pdfKeywords + pptKeywords)
                .distinct()
                .take(10) // limit to avoid too many requests

            val results = keywords.map { keyword ->
                async(Dispatchers.IO) {
                    val url = AiService.fetchImageUrl(keyword)
                    if (url != null) {
                        val bytes = AiService.downloadImage(url)
                        if (bytes != null) keyword to bytes else null
                    } else null
                }
            }.awaitAll()

            results.filterNotNull().toMap()
        }
}
