package com.smartaiwriter.app.service

import com.smartaiwriter.app.data.remote.AiWriterOutput
import com.smartaiwriter.app.util.LanguageConfig
import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

object DocxGenerator {

    private data class ImageEntry(
        val sectionIndex: Int,
        val imageNum: Int,
        val rId: String,
        val bytes: ByteArray,
        val ext: String
    )

    fun generate(
        output: AiWriterOutput,
        languageCode: String = "en",
        images: Map<String, ByteArray> = emptyMap()
    ): ByteArray {
        val isRtl = LanguageConfig.isRtlLanguage(languageCode)

        // Collect images for sections
        val imageEntries = mutableListOf<ImageEntry>()
        var imgNum = 0
        output.pdfWord.sections.forEachIndexed { idx, section ->
            val keyword = section.imageKeyword
            if (keyword != null && images.containsKey(keyword)) {
                imgNum++
                val bytes = images[keyword]!!
                val ext = if (isJpeg(bytes)) "jpeg" else "png"
                imageEntries.add(ImageEntry(idx, imgNum, "rId${2 + imgNum}", bytes, ext))
            }
        }
        val sectionImageMap = imageEntries.associateBy { it.sectionIndex }

        val baos = ByteArrayOutputStream()
        ZipOutputStream(baos).use { zip ->
            // [Content_Types].xml
            zip.putNextEntry(ZipEntry("[Content_Types].xml"))
            zip.write(contentTypesXml(imageEntries).toByteArray())
            zip.closeEntry()

            // _rels/.rels
            zip.putNextEntry(ZipEntry("_rels/.rels"))
            zip.write(relsXml().toByteArray())
            zip.closeEntry()

            // word/_rels/document.xml.rels
            zip.putNextEntry(ZipEntry("word/_rels/document.xml.rels"))
            zip.write(documentRelsXml(imageEntries).toByteArray())
            zip.closeEntry()

            // word/styles.xml
            zip.putNextEntry(ZipEntry("word/styles.xml"))
            zip.write(stylesXml().toByteArray())
            zip.closeEntry()

            // word/numbering.xml
            zip.putNextEntry(ZipEntry("word/numbering.xml"))
            zip.write(numberingXml().toByteArray())
            zip.closeEntry()

            // Image media files
            for (entry in imageEntries) {
                zip.putNextEntry(ZipEntry("word/media/image${entry.imageNum}.${entry.ext}"))
                zip.write(entry.bytes)
                zip.closeEntry()
            }

            // word/document.xml
            zip.putNextEntry(ZipEntry("word/document.xml"))
            zip.write(documentXml(output, isRtl, sectionImageMap).toByteArray())
            zip.closeEntry()
        }
        return baos.toByteArray()
    }

    private fun isJpeg(bytes: ByteArray): Boolean =
        bytes.size >= 2 && bytes[0] == 0xFF.toByte() && bytes[1] == 0xD8.toByte()

    private fun esc(text: String): String {
        return text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&apos;")
    }

    private fun contentTypesXml(imageEntries: List<ImageEntry>): String {
        val imgDefaults = StringBuilder()
        if (imageEntries.any { it.ext == "jpeg" })
            imgDefaults.append("\n  <Default Extension=\"jpeg\" ContentType=\"image/jpeg\"/>")
        if (imageEntries.any { it.ext == "png" })
            imgDefaults.append("\n  <Default Extension=\"png\" ContentType=\"image/png\"/>")

        return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>${imgDefaults}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>"""
    }

    private fun relsXml(): String = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

    private fun documentRelsXml(imageEntries: List<ImageEntry>): String {
        val imageRels = imageEntries.joinToString("") { entry ->
            "\n  <Relationship Id=\"${entry.rId}\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image\" Target=\"media/image${entry.imageNum}.${entry.ext}\"/>"
        }
        return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>${imageRels}
</Relationships>"""
    }

    private fun stylesXml(): String = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="56"/><w:color w:val="1A1A1B"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="36"/><w:color w:val="1A1A1B"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="24"/><w:color w:val="1A1A1B"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListBullet">
    <w:name w:val="List Bullet"/>
    <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="353636"/></w:rPr>
  </w:style>
</w:styles>"""

    private fun numberingXml(): String = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="0"/>
  </w:num>
</w:numbering>"""

    private fun documentXml(
        output: AiWriterOutput,
        isRtl: Boolean,
        sectionImageMap: Map<Int, ImageEntry>
    ): String {
        val bidi = if (isRtl) "<w:bidi/>" else ""
        val rtlRun = if (isRtl) "<w:rtl/>" else ""

        val sb = StringBuilder()
        sb.append("""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>""")

        // Title
        sb.append("""
<w:p><w:pPr><w:pStyle w:val="Title"/>${bidi}</w:pPr>
<w:r><w:rPr>${rtlRun}</w:rPr><w:t>${esc(output.pdfWord.title)}</w:t></w:r></w:p>""")

        // Author
        sb.append("""
<w:p><w:pPr><w:jc w:val="center"/>${bidi}</w:pPr>
<w:r><w:rPr><w:sz w:val="28"/><w:color w:val="6B6B75"/>${rtlRun}</w:rPr>
<w:t>${esc(output.pdfWord.author)}</w:t></w:r></w:p>""")

        // Spacer
        sb.append("""<w:p><w:pPr><w:spacing w:after="200"/></w:pPr></w:p>""")

        // Sections
        output.pdfWord.sections.forEachIndexed { idx, section ->
            // Heading
            sb.append("""
<w:p><w:pPr><w:pStyle w:val="Heading1"/>${bidi}</w:pPr>
<w:r><w:rPr>${rtlRun}</w:rPr><w:t>${esc(section.heading)}</w:t></w:r></w:p>""")

            // Paragraph
            if (section.paragraph.isNotBlank()) {
                sb.append("""
<w:p><w:pPr><w:pStyle w:val="Normal"/>${bidi}</w:pPr>
<w:r><w:rPr>${rtlRun}</w:rPr><w:t>${esc(section.paragraph)}</w:t></w:r></w:p>""")
            }

            // Bullets
            for (bullet in section.bullets) {
                sb.append("""
<w:p><w:pPr><w:pStyle w:val="ListBullet"/>${bidi}</w:pPr>
<w:r><w:rPr>${rtlRun}</w:rPr><w:t>${esc(bullet)}</w:t></w:r></w:p>""")
            }

            // Image (if available for this section)
            val imgEntry = sectionImageMap[idx]
            if (imgEntry != null) {
                val cx = 4572000L  // ~5 inches wide
                val cy = 2743200L  // ~3 inches tall
                sb.append("""
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:drawing>
<wp:inline distT="0" distB="0" distL="0" distR="0">
  <wp:extent cx="$cx" cy="$cy"/>
  <wp:docPr id="${imgEntry.imageNum}" name="Image ${imgEntry.imageNum}"/>
  <a:graphic>
    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
      <pic:pic>
        <pic:nvPicPr>
          <pic:cNvPr id="0" name="Image ${imgEntry.imageNum}"/>
          <pic:cNvPicPr/>
        </pic:nvPicPr>
        <pic:blipFill>
          <a:blip r:embed="${imgEntry.rId}"/>
          <a:stretch><a:fillRect/></a:stretch>
        </pic:blipFill>
        <pic:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="$cx" cy="$cy"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </pic:spPr>
      </pic:pic>
    </a:graphicData>
  </a:graphic>
</wp:inline>
</w:drawing></w:r></w:p>""")
            }

            // Spacing between sections
            sb.append("""<w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>""")
        }

        sb.append("""
<w:sectPr>
  <w:pgSz w:w="12240" w:h="15840"/>
  <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
</w:sectPr>
</w:body></w:document>""")

        return sb.toString()
    }
}
