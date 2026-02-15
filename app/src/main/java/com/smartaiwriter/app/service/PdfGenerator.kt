package com.smartaiwriter.app.service

import android.content.Context
import android.graphics.*
import android.graphics.pdf.PdfDocument
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import com.smartaiwriter.app.data.remote.AiWriterOutput
import com.smartaiwriter.app.util.FileUtils
import java.io.ByteArrayOutputStream
import kotlin.math.min

object PdfGenerator {
    // A4 in points (72 dpi)
    private const val PAGE_WIDTH = 595
    private const val PAGE_HEIGHT = 842
    private const val MARGIN = 72f
    private const val CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN

    // Font sizes
    private const val TITLE_SIZE = 28f
    private const val HEADING_SIZE = 18f
    private const val BODY_SIZE = 12f
    private const val BULLET_SIZE = 11f
    private const val AUTHOR_SIZE = 14f

    // Colors — monochrome palette matching app logo
    private val TITLE_COLOR = Color.parseColor("#1A1A1B")
    private val BODY_COLOR = Color.parseColor("#1A1A1B")
    private val BULLET_COLOR = Color.parseColor("#353636")
    private val AUTHOR_COLOR = Color.parseColor("#808185")
    private val ACCENT_COLOR = Color.parseColor("#353636")

    fun generate(
        context: Context,
        output: AiWriterOutput,
        images: Map<String, ByteArray> = emptyMap()
    ): ByteArray {
        val doc = PdfDocument()
        var pageNum = 1

        // ── Title Page ──
        val titlePageInfo = PdfDocument.PageInfo.Builder(PAGE_WIDTH, PAGE_HEIGHT, pageNum++).create()
        val titlePage = doc.startPage(titlePageInfo)
        drawTitlePage(titlePage.canvas, output)
        doc.finishPage(titlePage)

        // ── Content Pages ──
        var canvas: android.graphics.Canvas
        var currentPage: PdfDocument.Page
        var yOffset = MARGIN

        fun startNewPage(): PdfDocument.Page {
            val info = PdfDocument.PageInfo.Builder(PAGE_WIDTH, PAGE_HEIGHT, pageNum++).create()
            val page = doc.startPage(info)
            yOffset = MARGIN
            return page
        }

        fun ensureSpace(needed: Float, page: PdfDocument.Page): PdfDocument.Page {
            return if (yOffset + needed > PAGE_HEIGHT - MARGIN) {
                doc.finishPage(page)
                startNewPage()
            } else page
        }

        currentPage = startNewPage()
        canvas = currentPage.canvas

        for (section in output.pdfWord.sections) {
            // Check if we need a new page for the heading
            currentPage = ensureSpace(80f, currentPage)
            canvas = currentPage.canvas

            // Heading
            val headingPaint = createPaint(HEADING_SIZE, TITLE_COLOR, true)
            val headingLayout = createTextLayout(section.heading, headingPaint, CONTENT_WIDTH)
            canvas.save()
            canvas.translate(MARGIN, yOffset)
            headingLayout.draw(canvas)
            canvas.restore()
            yOffset += headingLayout.height + 8f

            // Separator line
            val linePaint = Paint().apply {
                color = ACCENT_COLOR
                strokeWidth = 2f
            }
            canvas.drawLine(MARGIN, yOffset, MARGIN + CONTENT_WIDTH, yOffset, linePaint)
            yOffset += 12f

            // Paragraph
            if (section.paragraph.isNotBlank()) {
                currentPage = ensureSpace(60f, currentPage)
                canvas = currentPage.canvas

                val bodyPaint = createPaint(BODY_SIZE, BODY_COLOR, false)
                val bodyLayout = createTextLayout(section.paragraph, bodyPaint, CONTENT_WIDTH)
                canvas.save()
                canvas.translate(MARGIN, yOffset)
                bodyLayout.draw(canvas)
                canvas.restore()
                yOffset += bodyLayout.height + 12f
            }

            // Bullets
            for (bullet in section.bullets) {
                currentPage = ensureSpace(30f, currentPage)
                canvas = currentPage.canvas

                val bulletPaint = createPaint(BULLET_SIZE, BULLET_COLOR, false)
                val bulletText = "  •  $bullet"
                val bulletLayout = createTextLayout(bulletText, bulletPaint, CONTENT_WIDTH - 20f)
                canvas.save()
                canvas.translate(MARGIN + 10f, yOffset)
                bulletLayout.draw(canvas)
                canvas.restore()
                yOffset += bulletLayout.height + 4f
            }

            // Image
            val imgKey = section.imageKeyword
            if (imgKey != null && images.containsKey(imgKey)) {
                val imgBytes = images[imgKey]!!
                try {
                    val bitmap = BitmapFactory.decodeByteArray(imgBytes, 0, imgBytes.size)
                    if (bitmap != null) {
                        val maxImgHeight = 200f
                        val scale = min(CONTENT_WIDTH / bitmap.width, maxImgHeight / bitmap.height)
                        val imgWidth = bitmap.width * scale
                        val imgHeight = bitmap.height * scale

                        currentPage = ensureSpace(imgHeight + 16f, currentPage)
                        canvas = currentPage.canvas

                        val destRect = RectF(
                            MARGIN, yOffset,
                            MARGIN + imgWidth, yOffset + imgHeight
                        )
                        canvas.drawBitmap(bitmap, null, destRect, null)
                        yOffset += imgHeight + 16f
                        bitmap.recycle()
                    }
                } catch (_: Exception) { }
            }

            yOffset += 16f // spacing between sections
        }

        doc.finishPage(currentPage)

        // Write to bytes
        val baos = ByteArrayOutputStream()
        doc.writeTo(baos)
        doc.close()
        return baos.toByteArray()
    }

    private fun drawTitlePage(canvas: android.graphics.Canvas, output: AiWriterOutput) {
        val centerX = PAGE_WIDTH / 2f

        // Background header bar
        val headerPaint = Paint().apply { color = Color.parseColor("#353636") }
        canvas.drawRect(0f, 0f, PAGE_WIDTH.toFloat(), PAGE_HEIGHT.toFloat() / 3f, headerPaint)

        // Title
        val titlePaint = createPaint(TITLE_SIZE, Color.WHITE, true).apply {
            textAlign = Paint.Align.CENTER
        }
        val title = output.pdfWord.title
        val titleLayout = createTextLayout(title, titlePaint, CONTENT_WIDTH)
        val titleY = PAGE_HEIGHT / 6f - titleLayout.height / 2f
        canvas.save()
        canvas.translate(centerX, titleY)
        titleLayout.draw(canvas)
        canvas.restore()

        // Author
        val authorPaint = createPaint(AUTHOR_SIZE, AUTHOR_COLOR, false).apply {
            textAlign = Paint.Align.CENTER
        }
        canvas.drawText(output.pdfWord.author, centerX, PAGE_HEIGHT / 2f, authorPaint)

        // Language
        val langPaint = createPaint(BODY_SIZE, AUTHOR_COLOR, false).apply {
            textAlign = Paint.Align.CENTER
        }
        canvas.drawText(output.pdfWord.language, centerX, PAGE_HEIGHT / 2f + 30f, langPaint)

        // Accent line
        val accentPaint = Paint().apply {
            color = ACCENT_COLOR
            strokeWidth = 3f
        }
        canvas.drawLine(centerX - 60f, PAGE_HEIGHT / 2f - 30f, centerX + 60f, PAGE_HEIGHT / 2f - 30f, accentPaint)
    }

    private fun createPaint(size: Float, color: Int, bold: Boolean): TextPaint {
        return TextPaint().apply {
            textSize = size
            this.color = color
            isAntiAlias = true
            typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
        }
    }

    @Suppress("DEPRECATION")
    private fun createTextLayout(text: String, paint: TextPaint, width: Float): StaticLayout {
        return StaticLayout(
            text, paint, width.toInt(),
            Layout.Alignment.ALIGN_NORMAL,
            1.2f, 0f, false
        )
    }
}
