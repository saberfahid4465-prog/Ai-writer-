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
import { PdfWordData } from '../ai/responseParser';
import { DocumentImage } from '../services/pexelsService';

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

  // Embed fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // ─── Title Page ──────────────────────────────────────────
  const titlePage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const titleWidth = fontBold.widthOfTextAtSize(data.title, FONT_SIZE_TITLE);
  const titleX = Math.max(MARGIN, (PAGE_WIDTH - titleWidth) / 2);

  titlePage.drawText(data.title, {
    x: titleX,
    y: PAGE_HEIGHT / 2 + 40,
    size: FONT_SIZE_TITLE,
    font: fontBold,
    color: COLOR_TITLE,
    maxWidth: CONTENT_WIDTH,
  });

  const authorText = `By ${data.author || 'AI Writer'}`;
  const authorWidth = fontRegular.widthOfTextAtSize(authorText, FONT_SIZE_AUTHOR);
  titlePage.drawText(authorText, {
    x: (PAGE_WIDTH - authorWidth) / 2,
    y: PAGE_HEIGHT / 2 - 10,
    size: FONT_SIZE_AUTHOR,
    font: fontRegular,
    color: COLOR_AUTHOR,
  });

  const langText = `Language: ${data.language}`;
  const langWidth = fontRegular.widthOfTextAtSize(langText, FONT_SIZE_BODY);
  titlePage.drawText(langText, {
    x: (PAGE_WIDTH - langWidth) / 2,
    y: PAGE_HEIGHT / 2 - 40,
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
    currentPage.drawText(section.heading, {
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
    const lines = wrapText(section.paragraph, fontRegular, FONT_SIZE_BODY, CONTENT_WIDTH);
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
      const bulletLines = wrapText(bulletText, fontRegular, FONT_SIZE_BULLET, CONTENT_WIDTH - 20);

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
          const creditText = `Photo: ${img.photographer} / Pexels`;
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
 * Simple word-wrap utility for PDF text rendering.
 */
function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(' ');
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
