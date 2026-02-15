package com.smartaiwriter.app.service

import com.smartaiwriter.app.data.remote.AiWriterOutput
import com.smartaiwriter.app.util.LanguageConfig
import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

object PptxGenerator {
    // EMU units: 1 inch = 914400 EMU, slide is 10x7.5 inches (widescreen-ish)
    private const val SLIDE_W = 12192000L  // 13.333 inches in EMU (16:9)
    private const val SLIDE_H = 6858000L   // 7.5 inches in EMU

    private data class SlideData(
        val xml: String,
        val imageBytes: ByteArray? = null,
        val imageExt: String = "png"
    )

    fun generate(
        output: AiWriterOutput,
        languageCode: String = "en",
        images: Map<String, ByteArray> = emptyMap()
    ): ByteArray {
        val isRtl = LanguageConfig.isRtlLanguage(languageCode)
        val slideDataList = mutableListOf<SlideData>()
        val hasAnyImage = images.isNotEmpty()

        // Title slide (no image)
        slideDataList.add(SlideData(buildTitleSlide(output.pdfWord.title, output.pdfWord.author, isRtl)))

        // Content slides
        for (slide in output.ppt.slides) {
            val keyword = slide.imageKeyword
            val imgBytes = if (keyword != null) images[keyword] else null
            if (imgBytes != null) {
                val ext = if (isJpeg(imgBytes)) "jpeg" else "png"
                slideDataList.add(SlideData(
                    buildContentSlide(slide.title, slide.bullets, isRtl, hasImage = true),
                    imgBytes,
                    ext
                ))
            } else {
                slideDataList.add(SlideData(buildContentSlide(slide.title, slide.bullets, isRtl, hasImage = false)))
            }
        }

        // Thank You slide (no image)
        slideDataList.add(SlideData(buildThankYouSlide(isRtl)))

        return buildPptxZip(slideDataList, hasAnyImage)
    }

    private fun isJpeg(bytes: ByteArray): Boolean =
        bytes.size >= 2 && bytes[0] == 0xFF.toByte() && bytes[1] == 0xD8.toByte()

    private fun esc(text: String): String = text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")

    private fun buildPptxZip(slideDataList: List<SlideData>, hasAnyImage: Boolean): ByteArray {
        val baos = ByteArrayOutputStream()
        ZipOutputStream(baos).use { zip ->
            // [Content_Types].xml
            zip.putNextEntry(ZipEntry("[Content_Types].xml"))
            zip.write(contentTypes(slideDataList.size, hasAnyImage).toByteArray())
            zip.closeEntry()

            // _rels/.rels
            zip.putNextEntry(ZipEntry("_rels/.rels"))
            zip.write(rootRels().toByteArray())
            zip.closeEntry()

            // ppt/presentation.xml
            zip.putNextEntry(ZipEntry("ppt/presentation.xml"))
            zip.write(presentationXml(slideDataList.size).toByteArray())
            zip.closeEntry()

            // ppt/_rels/presentation.xml.rels
            zip.putNextEntry(ZipEntry("ppt/_rels/presentation.xml.rels"))
            zip.write(presentationRels(slideDataList.size).toByteArray())
            zip.closeEntry()

            // Slide layout & master (minimal)
            zip.putNextEntry(ZipEntry("ppt/slideMasters/slideMaster1.xml"))
            zip.write(slideMasterXml().toByteArray())
            zip.closeEntry()

            zip.putNextEntry(ZipEntry("ppt/slideMasters/_rels/slideMaster1.xml.rels"))
            zip.write(slideMasterRels().toByteArray())
            zip.closeEntry()

            zip.putNextEntry(ZipEntry("ppt/slideLayouts/slideLayout1.xml"))
            zip.write(slideLayoutXml().toByteArray())
            zip.closeEntry()

            zip.putNextEntry(ZipEntry("ppt/slideLayouts/_rels/slideLayout1.xml.rels"))
            zip.write(slideLayoutRels().toByteArray())
            zip.closeEntry()

            // Slides
            slideDataList.forEachIndexed { idx, slideData ->
                val num = idx + 1

                // Slide XML
                zip.putNextEntry(ZipEntry("ppt/slides/slide$num.xml"))
                zip.write(slideData.xml.toByteArray())
                zip.closeEntry()

                // Slide rels (with or without image)
                zip.putNextEntry(ZipEntry("ppt/slides/_rels/slide$num.xml.rels"))
                if (slideData.imageBytes != null) {
                    zip.write(slideRelsWithImage(num, slideData.imageExt).toByteArray())
                } else {
                    zip.write(slideRels().toByteArray())
                }
                zip.closeEntry()

                // Image media file
                if (slideData.imageBytes != null) {
                    zip.putNextEntry(ZipEntry("ppt/media/slide${num}.${slideData.imageExt}"))
                    zip.write(slideData.imageBytes)
                    zip.closeEntry()
                }
            }
        }
        return baos.toByteArray()
    }

    private fun buildTitleSlide(title: String, author: String, isRtl: Boolean): String {
        val algn = if (isRtl) "r" else "ctr"
        val rtlAttr = if (isRtl) " rtl=\"1\"" else ""
        return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<p:cSld>
  <p:bg><p:bgPr><a:solidFill><a:srgbClr val="353636"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
  <p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr/>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="914400" y="2286000"/><a:ext cx="10363200" cy="1371600"/></a:xfrm></p:spPr>
      <p:txBody>
        <a:bodyPr anchor="ctr"/>
        <a:p><a:pPr algn="$algn"$rtlAttr/><a:r><a:rPr lang="en-US" sz="4000" b="1" dirty="0"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${esc(title)}</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="3" name="Author"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="914400" y="3886200"/><a:ext cx="10363200" cy="457200"/></a:xfrm></p:spPr>
      <p:txBody>
        <a:bodyPr/>
        <a:p><a:pPr algn="$algn"$rtlAttr/><a:r><a:rPr lang="en-US" sz="1800" dirty="0"><a:solidFill><a:srgbClr val="808185"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${esc(author)}</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="4" name="Accent"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="4572000" y="3657600"/><a:ext cx="3048000" cy="36000"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:solidFill><a:srgbClr val="353636"/></a:solidFill>
      </p:spPr>
    </p:sp>
  </p:spTree>
</p:cSld>
</p:sld>"""
    }

    private fun buildContentSlide(
        title: String,
        bullets: List<String>,
        isRtl: Boolean,
        hasImage: Boolean = false
    ): String {
        val algn = if (isRtl) "r" else "l"
        val rtlAttr = if (isRtl) " rtl=\"1\"" else ""
        val fontSize = when {
            bullets.size > 12 -> 1100
            bullets.size > 8 -> 1300
            else -> 1600
        }

        val bulletParas = bullets.joinToString("") { b ->
            """<a:p><a:pPr marL="457200" indent="-228600" algn="$algn"$rtlAttr><a:buChar char="•"/></a:pPr><a:r><a:rPr lang="en-US" sz="$fontSize" dirty="0"><a:solidFill><a:srgbClr val="35373D"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${esc(b)}</a:t></a:r></a:p>"""
        }

        // Text body dimensions change when image is present
        val textOffX = 609600L
        val textOffY = 1371600L
        val textCx = if (hasImage) 5486400L else 10972800L  // ~6" or ~12"
        val textCy = 5029200L

        val imageElement = if (hasImage) {
            // Image on the right side of the slide
            val imgOffX = 6400800L   // starts at ~7"
            val imgOffY = 1600200L
            val imgCx = 5334000L     // ~5.83" wide
            val imgCy = 4572000L     // ~5" tall
            """
    <p:pic>
      <p:nvPicPr>
        <p:cNvPr id="4" name="SlideImage"/>
        <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
        <p:nvPr/>
      </p:nvPicPr>
      <p:blipFill>
        <a:blip r:embed="rId2"/>
        <a:stretch><a:fillRect/></a:stretch>
      </p:blipFill>
      <p:spPr>
        <a:xfrm><a:off x="$imgOffX" y="$imgOffY"/><a:ext cx="$imgCx" cy="$imgCy"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      </p:spPr>
    </p:pic>"""
        } else ""

        return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<p:cSld>
  <p:bg><p:bgPr><a:solidFill><a:srgbClr val="F7F7F8"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
  <p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr/>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="2" name="Header"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="0" y="0"/><a:ext cx="$SLIDE_W" cy="1143000"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:solidFill><a:srgbClr val="353636"/></a:solidFill>
      </p:spPr>
      <p:txBody>
        <a:bodyPr anchor="ctr"/>
        <a:p><a:pPr algn="$algn"$rtlAttr/><a:r><a:rPr lang="en-US" sz="2800" b="1" dirty="0"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${esc(title)}</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="3" name="Body"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="$textOffX" y="$textOffY"/><a:ext cx="$textCx" cy="$textCy"/></a:xfrm></p:spPr>
      <p:txBody>
        <a:bodyPr/>
        $bulletParas
      </p:txBody>
    </p:sp>$imageElement
  </p:spTree>
</p:cSld>
</p:sld>"""
    }

    private fun buildThankYouSlide(isRtl: Boolean): String {
        val algn = if (isRtl) "r" else "ctr"
        return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<p:cSld>
  <p:bg><p:bgPr><a:solidFill><a:srgbClr val="353636"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
  <p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr/>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="2" name="ThankYou"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="914400" y="2743200"/><a:ext cx="10363200" cy="1371600"/></a:xfrm></p:spPr>
      <p:txBody>
        <a:bodyPr anchor="ctr"/>
        <a:p><a:pPr algn="$algn"/><a:r><a:rPr lang="en-US" sz="4400" b="1" dirty="0"><a:solidFill><a:srgbClr val="353636"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>Thank You</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>
  </p:spTree>
</p:cSld>
</p:sld>"""
    }

    // ── OOXML scaffolding ──

    private fun contentTypes(slideCount: Int, hasImages: Boolean): String {
        val overrides = (1..slideCount).joinToString("") {
            """<Override PartName="/ppt/slides/slide$it.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>"""
        }
        val imgDefaults = if (hasImages) {
            """
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="png" ContentType="image/png"/>"""
        } else ""

        return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>${imgDefaults}
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  $overrides
</Types>"""
    }

    private fun rootRels(): String = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>"""

    private fun presentationXml(slideCount: Int): String {
        val slideList = (1..slideCount).joinToString("") {
            """<p:sldId id="${255 + it}" r:id="rId${it + 1}"/>"""
        }
        return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>$slideList</p:sldIdLst>
  <p:sldSz cx="$SLIDE_W" cy="$SLIDE_H"/>
  <p:notesSz cx="$SLIDE_H" cy="$SLIDE_W"/>
</p:presentation>"""
    }

    private fun presentationRels(slideCount: Int): String {
        val slideRels = (1..slideCount).joinToString("") {
            """<Relationship Id="rId${it + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide$it.xml"/>"""
        }
        return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  $slideRels
</Relationships>"""
    }

    private fun slideMasterXml(): String = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>"""

    private fun slideMasterRels(): String = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>"""

    private fun slideLayoutXml(): String = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
             type="blank">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
</p:sldLayout>"""

    private fun slideLayoutRels(): String = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>"""

    private fun slideRels(): String = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>"""

    private fun slideRelsWithImage(slideNum: Int, ext: String): String = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/slide${slideNum}.${ext}"/>
</Relationships>"""
}
