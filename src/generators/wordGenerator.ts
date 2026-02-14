/**
 * AI Writer — Word (.docx) Generator
 *
 * Generates a professional Word document from the AI-structured
 * pdf_word data using the `docx` npm package.
 *
 * Features:
 * - Title and author metadata
 * - Heading1 for section headings
 * - Normal paragraphs
 * - Bullet lists
 * - UTF-8 support
 * - Compatible with Office 2007+, WPS, Google Docs, LibreOffice
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  ImageRun,
} from 'docx';
import { PdfWordData } from '../ai/responseParser';
import { DocumentImage } from '../services/pexelsService';

// ─── Constants ──────────────────────────────────────────────────

const THEME_COLOR_PRIMARY = '2C2E33'; // Charcoal heading color
const THEME_COLOR_BODY = '1E1F23'; // Near-black body text
const FONT_FAMILY = 'Calibri';

// ─── Generator ──────────────────────────────────────────────────

/**
 * Generate a Word (.docx) document from structured AI data.
 *
 * @param data - The pdf_word section of the AI response.
 * @returns Base64 string of the .docx file.
 */
export async function generateWord(
  data: PdfWordData,
  images?: Map<string, DocumentImage>
): Promise<string> {
  // Defensive checks for required parameters
  if (!data || typeof data !== 'object') {
    throw new Error('Word generation failed: Invalid data');
  }

  const children: Paragraph[] = [];

  // Safe property access with fallbacks
  const safeTitle = typeof data.title === 'string' ? data.title : 'Untitled';
  const safeAuthor = typeof data.author === 'string' ? data.author : 'AI Writer';
  const safeLanguage = typeof data.language === 'string' ? data.language : 'English';
  const safeSections = Array.isArray(data.sections) ? data.sections : [];

  // Detect RTL languages
  const rtlLanguages = ['arabic', 'hebrew', 'persian', 'farsi', 'urdu'];
  const isRTL = rtlLanguages.some(lang => safeLanguage.toLowerCase().includes(lang));

  // ─── Title ───────────────────────────────────────────────
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      bidirectional: isRTL,
      children: [
        new TextRun({
          text: safeTitle,
          bold: true,
          size: 56, // 28pt
          color: THEME_COLOR_PRIMARY,
          font: FONT_FAMILY,
          rightToLeft: isRTL,
        }),
      ],
    })
  );

  // Author line
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `By ${safeAuthor}`,
          size: 28, // 14pt
          color: '666666',
          font: FONT_FAMILY,
        }),
      ],
    })
  );

  // Language line
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [
        new TextRun({
          text: `Language: ${safeLanguage}`,
          size: 24, // 12pt
          color: '999999',
          font: FONT_FAMILY,
          italics: true,
        }),
      ],
    })
  );

  // Separator
  children.push(
    new Paragraph({
      spacing: { after: 400 },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: 'CCCCCC',
        },
      },
      children: [],
    })
  );

  // ─── Sections ────────────────────────────────────────────
  for (const section of safeSections) {
    if (!section || typeof section !== 'object') continue;

    // Safe property access for section
    const sectionHeading = typeof section.heading === 'string' ? section.heading : 'Section';
    const sectionParagraph = typeof section.paragraph === 'string' ? section.paragraph : '';
    const sectionBullets = Array.isArray(section.bullets) ? section.bullets : [];

    // Section heading
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        bidirectional: isRTL,
        children: [
          new TextRun({
            text: sectionHeading,
            bold: true,
            size: 36, // 18pt
            color: THEME_COLOR_PRIMARY,
            font: FONT_FAMILY,
            rightToLeft: isRTL,
          }),
        ],
      })
    );

    // Paragraph content — W38 fix: split on newlines for proper line breaks
    const paraLines = sectionParagraph.split('\n').filter(l => l.length > 0);
    const paraChildren: TextRun[] = [];
    paraLines.forEach((line, idx) => {
      if (idx > 0) {
        paraChildren.push(new TextRun({ break: 1, text: '' }));
      }
      paraChildren.push(
        new TextRun({
          text: line,
          size: 24, // 12pt
          color: THEME_COLOR_BODY,
          font: FONT_FAMILY,
          rightToLeft: isRTL,
        })
      );
    });
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        bidirectional: isRTL,
        children: paraChildren.length > 0 ? paraChildren : [
          new TextRun({
            text: sectionParagraph,
            size: 24,
            color: THEME_COLOR_BODY,
            font: FONT_FAMILY,
            rightToLeft: isRTL,
          }),
        ],
      })
    );

    // Bullet points
    for (const bullet of sectionBullets) {
      if (typeof bullet !== 'string' || !bullet.trim()) continue;
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 80 },
          indent: {
            left: convertInchesToTwip(0.5),
          },
          bidirectional: isRTL,
          children: [
            new TextRun({
              text: bullet,
              size: 22, // 11pt
              color: THEME_COLOR_BODY,
              font: FONT_FAMILY,
              rightToLeft: isRTL,
            }),
          ],
        })
      );
    }

    // Space after section
    children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

    // ─── Section Image ───────────────────────────────────
    if (images && section.image_keyword) {
      const img = images.get(section.image_keyword);
      if (img) {
        try {
          // Calculate dimensions to fit within page width (~6 inches)
          const maxWidth = 460;
          const maxHeight = 280;
          const scale = Math.min(
            maxWidth / img.width,
            maxHeight / img.height,
            1
          );
          const displayWidth = Math.round(img.width * scale);
          const displayHeight = Math.round(img.height * scale);

          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 100, after: 60 },
              children: [
                new ImageRun({
                  data: img.imageBytes,
                  transformation: {
                    width: displayWidth,
                    height: displayHeight,
                  },
                }),
              ],
            })
          );

          // Photo credit
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: `Photo: ${img.photographer} / Pexels`,
                  size: 16,
                  color: '999999',
                  font: FONT_FAMILY,
                  italics: true,
                }),
              ],
            })
          );
        } catch (e) {
          console.warn('Failed to embed image in Word:', e);
        }
      }
    }
  }

  // ─── Create Document ─────────────────────────────────────
  const doc = new Document({
    creator: 'AI Writer',
    title: data.title,
    description: `Generated by AI Writer in ${data.language}`,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  });

  // Pack and return as base64 string (safe for React Native)
  const base64String = await Packer.toBase64String(doc);
  return base64String;
}
