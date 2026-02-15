package com.aiwriter.app.service

import com.aiwriter.app.data.remote.AiWriterOutput
import com.aiwriter.app.util.LanguageConfig
import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

object DocxGenerator {
    fun generate(output: AiWriterOutput, languageCode: String = "en"): ByteArray {
        val isRtl = LanguageConfig.isRtlLanguage(languageCode)
        val baos = ByteArrayOutputStream()
        ZipOutputStream(baos).use { zip ->
            // [Content_Types].xml
            zip.putNextEntry(ZipEntry("[Content_Types].xml"))
            zip.write(contentTypesXml().toByteArray())
            zip.closeEntry()

            // _rels/.rels
            zip.putNextEntry(ZipEntry("_rels/.rels"))
            zip.write(relsXml().toByteArray())
            zip.closeEntry()

            // word/_rels/document.xml.rels
            zip.putNextEntry(ZipEntry("word/_rels/document.xml.rels"))
            zip.write(documentRelsXml().toByteArray())
            zip.closeEntry()

            // word/styles.xml
            zip.putNextEntry(ZipEntry("word/styles.xml"))
            zip.write(stylesXml().toByteArray())
            zip.closeEntry()

            // word/numbering.xml
            zip.putNextEntry(ZipEntry("word/numbering.xml"))
            zip.write(numberingXml().toByteArray())
            zip.closeEntry()

            // word/document.xml
            zip.putNextEntry(ZipEntry("word/document.xml"))
            zip.write(documentXml(output, isRtl).toByteArray())
            zip.closeEntry()
        }
        return baos.toByteArray()
    }

    private fun esc(text: String): String {
        return text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&apos;")
    }

    private fun contentTypesXml(): String = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>"""

    private fun relsXml(): String = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

    private fun documentRelsXml(): String = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>"""

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

    private fun documentXml(output: AiWriterOutput, isRtl: Boolean): String {
        val bidi = if (isRtl) "<w:bidi/>" else ""
        val rtlRun = if (isRtl) "<w:rtl/>" else ""

        val sb = StringBuilder()
        sb.append("""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
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
        for (section in output.pdfWord.sections) {
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
