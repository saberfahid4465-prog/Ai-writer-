/**
 * AI Writer — PowerPoint (.pptx) Generator
 *
 * Generates a professional PowerPoint presentation from the
 * AI-structured ppt data using pptxgenjs.
 *
 * Features:
 * - Title slide
 * - Content slides with bullets (one per section)
 * - Professional color theme
 * - Widescreen 16:9 layout
 * - UTF-8 support
 * - Compatible with Office 2007+, WPS, Google Slides, LibreOffice
 */

import PptxGenJS from 'pptxgenjs';
import { PptData, PdfWordData } from '../ai/responseParser';
import { DocumentImage } from '../services/pexelsService';
import { uint8ArrayToBase64 } from '../utils/base64Polyfill';

// ─── Theme Constants ────────────────────────────────────────────

const THEME = {
  PRIMARY_BG: '2C2E33', // Dark charcoal
  SECONDARY_BG: 'FFFFFF', // White
  ACCENT: 'C8A961', // Gold accent
  TITLE_COLOR: 'FFFFFF', // White text on dark backgrounds
  BODY_COLOR: '1E1F23', // Near-black text on light backgrounds
  SUBTITLE_COLOR: '9D9EA2', // Light gray subtext
  BULLET_COLOR: '35373D', // Dark gray bullet text
  SLIDE_BG: 'F4F4F6', // Light gray slide background
  FONT: 'Calibri',
};

// ─── Generator ──────────────────────────────────────────────────

/**
 * Generate a PowerPoint (.pptx) presentation from structured AI data.
 *
 * @param pptData - The ppt section of the AI response.
 * @param metaData - The pdf_word section (for title/author/language metadata).
 * @returns Base64 string of the .pptx file.
 */
export async function generatePPT(
  pptData: PptData,
  metaData: PdfWordData,
  images?: Map<string, DocumentImage>
): Promise<string> {
  const pptx = new PptxGenJS();

  // Set presentation metadata
  pptx.author = metaData.author || 'AI Writer';
  pptx.title = metaData.title;
  pptx.company = 'AI Writer';
  pptx.layout = 'LAYOUT_WIDE'; // 16:9 widescreen

  // Detect RTL languages
  const rtlLanguages = ['arabic', 'hebrew', 'persian', 'farsi', 'urdu'];
  const isRTL = rtlLanguages.some(lang => metaData.language.toLowerCase().includes(lang));
  if (isRTL) {
    pptx.rtlMode = true;
  }

  // ─── Title Slide ─────────────────────────────────────────
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: THEME.PRIMARY_BG };

  // Title text
  titleSlide.addText(metaData.title, {
    x: 0.8,
    y: 1.8,
    w: 8.4,
    h: 1.5,
    fontSize: 36,
    fontFace: THEME.FONT,
    color: THEME.TITLE_COLOR,
    bold: true,
    align: isRTL ? 'right' : 'left',
    valign: 'middle',
  });

  // Subtitle / author
  titleSlide.addText(`By ${metaData.author || 'AI Writer'}  |  ${metaData.language}`, {
    x: 0.8,
    y: 3.4,
    w: 8.4,
    h: 0.6,
    fontSize: 16,
    fontFace: THEME.FONT,
    color: THEME.SUBTITLE_COLOR,
    align: isRTL ? 'right' : 'left',
  });

  // Accent bar
  titleSlide.addShape('rect' as any, {
    x: 0.8,
    y: 3.2,
    w: 2.0,
    h: 0.05,
    fill: { color: THEME.ACCENT },
  });

  // ─── Content Slides ──────────────────────────────────────
  for (const slide of pptData.slides) {
    const contentSlide = pptx.addSlide();
    contentSlide.background = { color: THEME.SLIDE_BG };

    // Slide title bar
    contentSlide.addShape('rect' as any, {
      x: 0,
      y: 0,
      w: 10,
      h: 1.2,
      fill: { color: THEME.PRIMARY_BG },
    });

    // Slide title
    contentSlide.addText(slide.title, {
      x: 0.8,
      y: 0.15,
      w: 8.4,
      h: 0.9,
      fontSize: 24,
      fontFace: THEME.FONT,
      color: THEME.TITLE_COLOR,
      bold: true,
      align: isRTL ? 'right' : 'left',
      valign: 'middle',
    });

    // Bullet points — PP21 fix: auto-shrink font if many bullets
    const bulletFontSize = slide.bullets.length > 8 ? 13 : slide.bullets.length > 12 ? 11 : 16;
    const bulletSpacing = slide.bullets.length > 8 ? 4 : 8;
    const bulletItems = slide.bullets.map((bullet) => ({
      text: bullet,
      options: {
        fontSize: bulletFontSize,
        fontFace: THEME.FONT,
        color: THEME.BULLET_COLOR,
        bullet: { code: '2022' }, // Unicode bullet character •
        paraSpaceBefore: bulletSpacing,
        paraSpaceAfter: bulletSpacing,
      },
    }));

    // Check if we have an image for this slide
    const slideImage = images && slide.image_keyword
      ? images.get(slide.image_keyword)
      : null;

    // PP11 fix: try image embed first, decide bullet width based on success
    let imageEmbedded = false;
    if (slideImage) {
      try {
        const imgBase64 = uint8ArrayToBase64(slideImage.imageBytes);

        contentSlide.addImage({
          data: `image/jpeg;base64,${imgBase64}`,
          x: 6.0,
          y: 1.6,
          w: 3.5,
          h: 2.6,
          rounding: true,
        });

        // Photo credit below image
        contentSlide.addText(`Photo: ${slideImage.photographer} / Pexels`, {
          x: 6.0,
          y: 4.3,
          w: 3.5,
          h: 0.3,
          fontSize: 8,
          fontFace: THEME.FONT,
          color: '999999',
          align: 'center',
        });
        imageEmbedded = true;
      } catch (e) {
        console.warn('Failed to embed image in PPT slide:', e);
      }
    }

    // Add bullets: half-width if image succeeded, full-width otherwise
    contentSlide.addText(bulletItems as any, {
      x: 0.8,
      y: 1.6,
      w: imageEmbedded ? 4.8 : 8.4,
      h: 4.5,
      valign: 'top',
    });

    // Accent line under header
    contentSlide.addShape('rect' as any, {
      x: 0.8,
      y: 1.25,
      w: 2.0,
      h: 0.04,
      fill: { color: THEME.ACCENT },
    });
  }

  // ─── Thank You / End Slide ───────────────────────────────
  const endSlide = pptx.addSlide();
  endSlide.background = { color: THEME.PRIMARY_BG };

  endSlide.addText('Thank You', {
    x: 0,
    y: 2.0,
    w: 10,
    h: 1.5,
    fontSize: 40,
    fontFace: THEME.FONT,
    color: THEME.TITLE_COLOR,
    bold: true,
    align: 'center',
    valign: 'middle',
  });

  endSlide.addText('Generated by AI Writer', {
    x: 0,
    y: 3.6,
    w: 10,
    h: 0.6,
    fontSize: 14,
    fontFace: THEME.FONT,
    color: THEME.SUBTITLE_COLOR,
    align: 'center',
  });

  // ─── Export ──────────────────────────────────────────────
  const output = await pptx.write({ outputType: 'base64' });
  return output as string;
}
