/**
 * AI Writer — PDF Generator
 *
 * Generates a professional PDF document from the AI-structured
 * pdf_word data using pdf-lib.
 *
 * Features:
 * - Title page
 * - Section headings, paragraphs, bullet lists
 * - UTF-8 text support
 * - A4 page size with proper margins
 * - Compatible with all PDF readers
 */

import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { PdfWordData } from '../ai/responseParser';
import { DocumentImage } from '../services/pexelsService';
import { getCachedFont, hasNonLatinText } from '../services/fontCacheService';

// ─── Constants ──────────────────────────────────────────────────

const PAGE_WIDTH = 595.28; // A4 width in points
const PAGE_HEIGHT = 841.89; // A4 height in points
const MARGIN = 72; // 1 inch = 72 points
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const FONT_SIZE_TITLE = 28;
const FONT_SIZE_HEADING = 18;
const FONT_SIZE_BODY = 12;
const FONT_SIZE_BULLET = 11;
const FONT_SIZE_AUTHOR = 14;
const LINE_HEIGHT = 1.5;

const COLOR_TITLE = rgb(0.17, 0.18, 0.2);
const COLOR_HEADING = rgb(0.17, 0.18, 0.2);
const COLOR_BODY = rgb(0.12, 0.12, 0.14);
const COLOR_BULLET = rgb(0.21, 0.22, 0.24);
const COLOR_AUTHOR = rgb(0.42, 0.42, 0.46);

// ─── Generator ──────────────────────────────────────────────────

/**
 * Generate a PDF document from structured AI data.
 *
 * @param data - The pdf_word section of the AI response.
 * @returns Uint8Array of the PDF file bytes.
 */
export async function generatePDF(
  data: PdfWordData,
  images?: Map<string, DocumentImage>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Set document metadata
  pdfDoc.setTitle(data.title);
  pdfDoc.setAuthor(data.author || 'AI Writer');
  pdfDoc.setCreator('AI Writer');
  pdfDoc.setProducer('AI Writer - pdf-lib');
  pdfDoc.setCreationDate(new Date());

  // Determine if we need a custom Unicode font
  const sampleText = data.title + ' ' + (data.sections[0]?.paragraph || '');
  const isNonLatin = hasNonLatinText(sampleText);
  let useCustomFont = false;
  let fontRegular: PDFFont;
  let fontBold: PDFFont;

  if (isNonLatin) {
    // Try to load custom Unicode font for non-Latin languages
    try {
      const langCode = data.language?.toLowerCase() || '';
      // Map common language names to codes
      const langNameToCode: Record<string, string> = {
        arabic: 'ar', chinese: 'zh', japanese: 'ja', korean: 'ko',
        hindi: 'hi', urdu: 'ur', persian: 'fa', farsi: 'fa',
        turkish: 'tr', russian: 'ru',
      };
      const code = langNameToCode[langCode] || langCode.split(/[\s-]/)[0] || 'ar';
      const fontBytes = await getCachedFont(code);
      if (fontBytes) {
        pdfDoc.registerFontkit(fontkit);
        const customFont = await pdfDoc.embedFont(fontBytes, { subset: true });
        fontRegular = customFont;
        fontBold = customFont; // Custom fonts don't have bold variant; use same
        useCustomFont = true;
      } else {
        // Fallback to Helvetica + sanitization
        fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      }
    } catch (e) {
      console.warn('Custom font embedding failed, using Helvetica:', e);
      fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }
  } else {
    // Latin-based: standard Helvetica is fine
    fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  // Text sanitizer: use raw text for custom fonts, sanitize for Helvetica
  const safeText = useCustomFont
    ? (t: string) => t
    : (t: string) => sanitizeForWinAnsi(t);

  // ─── Title Page ──────────────────────────────────────────
  const titlePage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const safeTitle = safeText(data.title);

  // Wrap title text to fit within content width
  const titleLines = wrapText(safeTitle, fontBold, FONT_SIZE_TITLE, CONTENT_WIDTH, (t) => t);
  const titleLineHeight = FONT_SIZE_TITLE * LINE_HEIGHT;
  const totalTitleHeight = titleLines.length * titleLineHeight;
  let titleY = PAGE_HEIGHT / 2 + totalTitleHeight / 2;

  for (const line of titleLines) {
    const lineWidth = fontBold.widthOfTextAtSize(line, FONT_SIZE_TITLE);
    const lineX = Math.max(MARGIN, (PAGE_WIDTH - lineWidth) / 2);
    titlePage.drawText(line, {
      x: lineX,
      y: titleY,
      size: FONT_SIZE_TITLE,
      font: fontBold,
      color: COLOR_TITLE,
    });
    titleY -= titleLineHeight;
  }

  const authorText = safeText(`By ${data.author || 'AI Writer'}`);
  const authorWidth = fontRegular.widthOfTextAtSize(authorText, FONT_SIZE_AUTHOR);
  titlePage.drawText(authorText, {
    x: (PAGE_WIDTH - authorWidth) / 2,
    y: titleY - 20,
    size: FONT_SIZE_AUTHOR,
    font: fontRegular,
    color: COLOR_AUTHOR,
  });

  const langText = safeText(`Language: ${data.language}`);
  const langWidth = fontRegular.widthOfTextAtSize(langText, FONT_SIZE_BODY);
  titlePage.drawText(langText, {
    x: (PAGE_WIDTH - langWidth) / 2,
    y: titleY - 50,
    size: FONT_SIZE_BODY,
    font: fontRegular,
    color: COLOR_AUTHOR,
  });

  // ─── Content Pages ───────────────────────────────────────
  let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let yPos = PAGE_HEIGHT - MARGIN;

  for (const section of data.sections) {
    // Check if we need a new page (at least 150pt needed for heading + content)
    if (yPos < MARGIN + 150) {
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      yPos = PAGE_HEIGHT - MARGIN;
    }

    // Section heading
    yPos -= FONT_SIZE_HEADING * LINE_HEIGHT;
    currentPage.drawText(safeText(section.heading), {
      x: MARGIN,
      y: yPos,
      size: FONT_SIZE_HEADING,
      font: fontBold,
      color: COLOR_HEADING,
      maxWidth: CONTENT_WIDTH,
    });
    yPos -= 8; // Extra spacing after heading

    // Draw a subtle line under heading
    currentPage.drawLine({
      start: { x: MARGIN, y: yPos },
      end: { x: MARGIN + CONTENT_WIDTH, y: yPos },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    yPos -= 16;

    // Paragraph — wrap text manually
    const lines = wrapText(section.paragraph, fontRegular, FONT_SIZE_BODY, CONTENT_WIDTH, safeText);
    for (const line of lines) {
      if (yPos < MARGIN + 20) {
        currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        yPos = PAGE_HEIGHT - MARGIN;
      }
      currentPage.drawText(line, {
        x: MARGIN,
        y: yPos,
        size: FONT_SIZE_BODY,
        font: fontRegular,
        color: COLOR_BODY,
      });
      yPos -= FONT_SIZE_BODY * LINE_HEIGHT;
    }

    yPos -= 10; // Space before bullets

    // Bullet points
    for (const bullet of section.bullets) {
      if (yPos < MARGIN + 20) {
        currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        yPos = PAGE_HEIGHT - MARGIN;
      }

      const bulletText = `  •  ${bullet}`;
      const bulletLines = wrapText(bulletText, fontRegular, FONT_SIZE_BULLET, CONTENT_WIDTH - 20, safeText);

      for (const bLine of bulletLines) {
        currentPage.drawText(bLine, {
          x: MARGIN + 10,
          y: yPos,
          size: FONT_SIZE_BULLET,
          font: fontRegular,
          color: COLOR_BULLET,
        });
        yPos -= FONT_SIZE_BULLET * LINE_HEIGHT;
      }
    }

    yPos -= 20; // Space between sections

    // ─── Section Image ───────────────────────────────────
    if (images && section.image_keyword) {
      const img = images.get(section.image_keyword);
      if (img) {
        try {
          const embeddedImg = await pdfDoc.embedJpg(img.imageBytes);
          const imgMaxWidth = CONTENT_WIDTH;
          const imgMaxHeight = 200;
          const scale = Math.min(
            imgMaxWidth / embeddedImg.width,
            imgMaxHeight / embeddedImg.height
          );
          const imgWidth = embeddedImg.width * scale;
          const imgHeight = embeddedImg.height * scale;

          // Check if image fits on current page
          if (yPos - imgHeight - 30 < MARGIN) {
            currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            yPos = PAGE_HEIGHT - MARGIN;
          }

          yPos -= 10;
          currentPage.drawImage(embeddedImg, {
            x: MARGIN + (CONTENT_WIDTH - imgWidth) / 2,
            y: yPos - imgHeight,
            width: imgWidth,
            height: imgHeight,
          });
          yPos -= imgHeight + 6;

          // Photo credit
          const creditText = safeText(`Photo: ${img.photographer} / Pexels`);
          const creditWidth = fontRegular.widthOfTextAtSize(creditText, 8);
          currentPage.drawText(creditText, {
            x: MARGIN + (CONTENT_WIDTH - creditWidth) / 2,
            y: yPos,
            size: 8,
            font: fontRegular,
            color: rgb(0.6, 0.6, 0.6),
          });
          yPos -= 20;
        } catch (e) {
          console.warn('Failed to embed image in PDF:', e);
        }
      }
    }
  }

  // Save and return PDF bytes
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// ─── Utilities ──────────────────────────────────────────────────

/**
 * Sanitize text for WinAnsi encoding.
 * StandardFonts in pdf-lib only support WinAnsi (code-page 1252).
 * Characters outside that range (Chinese, Arabic, Hindi, etc.) will
 * throw "WinAnsi cannot encode" errors.
 *
 * Strategy: keep all WinAnsi-safe codepoints; replace everything else
 * with a transliterated form when possible, otherwise "?".
 */
function sanitizeForWinAnsi(text: string): string {
  // WinAnsi (CP-1252) supports: 0x20-0x7E (Basic Latin), plus
  // 0x80-0xFF (Latin Supplement) with a few gaps filled by special chars.
  // Safe set: U+0020..U+007E, U+00A0..U+00FF, plus the CP-1252 extras.
  const CP1252_EXTRAS = new Set([
    0x20AC, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021,
    0x02C6, 0x2030, 0x0160, 0x2039, 0x0152, 0x017D,
    0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014,
    0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x017E, 0x0178,
  ]);

  let result = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (
      (code >= 0x20 && code <= 0x7E) ||
      (code >= 0xA0 && code <= 0xFF) ||
      code === 0x09 || code === 0x0A || code === 0x0D ||
      CP1252_EXTRAS.has(code)
    ) {
      result += text[i];
    } else {
      // Replace common Unicode punctuation / symbols
      result += replaceFallback(code, text, i);
    }
  }
  return result;
}

/** Best-effort fallback for non-WinAnsi characters. */
function replaceFallback(code: number, _src: string, _idx: number): string {
  // Smart quotes, dashes, bullets
  if (code === 0x2018 || code === 0x2019) return "'";
  if (code === 0x201C || code === 0x201D) return '"';
  if (code === 0x2013 || code === 0x2014) return '-';
  if (code === 0x2022) return '*';
  if (code === 0x2026) return '...';
  if (code === 0x00AB || code === 0x00BB) return '"';
  // For anything else (CJK, Arabic, Devanagari, etc.) use space or ?
  // This preserves layout without crashing.
  return '?';
}

/**
 * Check if a character is a CJK ideograph or fullwidth character
 * that should allow line-breaking before or after it.
 */
function isCJKChar(code: number): boolean {
  return (
    (code >= 0x4E00 && code <= 0x9FFF) ||   // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4DBF) ||   // CJK Extension A
    (code >= 0x3000 && code <= 0x303F) ||   // CJK Symbols & Punctuation
    (code >= 0x3040 && code <= 0x309F) ||   // Hiragana
    (code >= 0x30A0 && code <= 0x30FF) ||   // Katakana
    (code >= 0xFF00 && code <= 0xFFEF) ||   // Fullwidth Forms
    (code >= 0xAC00 && code <= 0xD7AF) ||   // Hangul Syllables
    (code >= 0x20000 && code <= 0x2A6DF)    // CJK Extension B
  );
}

/**
 * Detect if text contains CJK characters (no-space scripts).
 */
function hasCJKText(text: string): boolean {
  for (let i = 0; i < Math.min(text.length, 200); i++) {
    if (isCJKChar(text.charCodeAt(i))) return true;
  }
  return false;
}

/**
 * Word-wrap utility for PDF text rendering.
 * Supports both space-separated languages (English, Arabic, Hindi, etc.)
 * and CJK languages (Chinese, Japanese, Korean) that have no spaces.
 */
function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  sanitizer?: (t: string) => string
): string[] {
  const safe = sanitizer ? sanitizer(text) : sanitizeForWinAnsi(text);

  // For CJK text: split character-by-character
  if (hasCJKText(safe)) {
    return wrapTextCJK(safe, font, fontSize, maxWidth);
  }

  // For space-separated text: split on spaces
  const words = safe.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine.length > 0 ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Character-level word wrap for CJK text (Chinese, Japanese, Korean).
 * These scripts don't use spaces between words, so we break at any character boundary.
 */
function wrapTextCJK(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const testLine = currentLine + char;

    try {
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    } catch {
      // If font can't measure this char, just append it
      currentLine = testLine;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}
