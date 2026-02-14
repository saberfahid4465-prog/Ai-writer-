/**
 * AI Writer — File Parser Service
 *
 * Reads uploaded documents (Word, PPT, Excel, TXT) and
 * extracts their text content for AI processing.
 *
 * Uses JSZip to properly parse OOXML (Office Open XML) formats:
 * - DOCX → word/document.xml
 * - PPTX → ppt/slides/slide*.xml
 * - XLSX → xl/sharedStrings.xml + xl/worksheets/sheet*.xml
 */

import * as FileSystem from 'expo-file-system';
import JSZip from 'jszip';
import { base64ToUint8Array } from '../utils/base64Polyfill';

export interface ParsedFile {
  content: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;
  wasTruncated?: boolean;
  /** Original character count before truncation (set only when wasTruncated is true). */
  originalLength?: number;
}

// ─── File Type Detection ────────────────────────────────────────

export function getFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const typeMap: Record<string, string> = {
    pdf: 'pdf',
    docx: 'docx',
    doc: 'doc_legacy',
    pptx: 'pptx',
    ppt: 'ppt_legacy',
    xlsx: 'xlsx',
    xls: 'xls_legacy',
    txt: 'txt',
    csv: 'csv',
    rtf: 'rtf',
    md: 'txt',
  };
  return typeMap[ext] || 'unknown';
}

export function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt: 'application/vnd.ms-powerpoint',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    txt: 'text/plain',
    csv: 'text/csv',
    rtf: 'application/rtf',
    md: 'text/markdown',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

// ─── XML Strip Utility ──────────────────────────────────────────

/**
 * Strip XML tags and decode common XML entities.
 * Returns clean text with line breaks between paragraphs.
 * Used for PPTX slides, headers/footers, and non-DOCX formats.
 */
function stripXml(xml: string): string {
  return xml
    .replace(/<\/w:p>/gi, '\n')
    .replace(/<\/a:p>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m: string, code: string) => String.fromCharCode(parseInt(code, 10)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0)
    .join('\n');
}

// ─── XML Entity Decoder ─────────────────────────────────────────

/**
 * Decode common XML entities in extracted text.
 */
function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m: string, code: string) => String.fromCharCode(parseInt(code, 10)));
}

// ─── Structured DOCX Parser ────────────────────────────────────

/**
 * Parse DOCX XML preserving document structure with markers.
 * Detects headings, lists, and normal paragraphs.
 *
 * Markers produced:
 * - [TITLE] Document title
 * - [SUBTITLE] Document subtitle
 * - [H1] / [H2] / [H3] Heading levels
 * - [LIST] Bullet or numbered list item
 * - [P] Normal paragraph
 */
function parseDocxStructured(docXml: string): string {
  // Extract all <w:p> paragraph blocks
  const paragraphs = docXml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [];
  const lines: string[] = [];

  for (const pXml of paragraphs) {
    // Extract text from <w:t> elements within this paragraph
    const textMatches = pXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    const text = decodeXmlEntities(
      textMatches.map((m: string) => m.replace(/<[^>]+>/g, '')).join('')
    ).trim();

    if (!text) continue;

    // Check for heading style: Heading1, heading 1, Heading2, etc.
    const headingMatch = pXml.match(/<w:pStyle\s+w:val="[Hh]eading\s*(\d)"/i);
    if (headingMatch) {
      lines.push(`[H${headingMatch[1]}] ${text}`);
      continue;
    }

    // Check for Title style
    if (/<w:pStyle\s+w:val="Title"/i.test(pXml)) {
      lines.push(`[TITLE] ${text}`);
      continue;
    }

    // Check for Subtitle style
    if (/<w:pStyle\s+w:val="Subtitle"/i.test(pXml)) {
      lines.push(`[SUBTITLE] ${text}`);
      continue;
    }

    // Check for TOC heading
    if (/<w:pStyle\s+w:val="TOC[Hh]eading"/i.test(pXml)) {
      lines.push(`[H1] ${text}`);
      continue;
    }

    // Check for other common heading-like styles (custom templates)
    if (/<w:pStyle\s+w:val="[^"]*(?:heading|titre|titulo|titolo|kapitel|rubrik)[^"]*"/i.test(pXml)) {
      lines.push(`[H1] ${text}`);
      continue;
    }

    // Check for list/bullet (numPr = numbering properties)
    if (/<w:numPr>/.test(pXml)) {
      const levelMatch = pXml.match(/<w:ilvl\s+w:val="(\d+)"/);
      const level = levelMatch ? parseInt(levelMatch[1], 10) : 0;
      const indent = level > 0 ? '  '.repeat(level) : '';
      lines.push(`${indent}[LIST] ${text}`);
      continue;
    }

    // Check for ListParagraph style (some docs use style instead of numPr)
    if (/<w:pStyle\s+w:val="ListParagraph"/i.test(pXml)) {
      lines.push(`[LIST] ${text}`);
      continue;
    }

    // Normal paragraph
    lines.push(`[P] ${text}`);
  }

  return lines.join('\n');
}

// ─── RTF Strip Utility ──────────────────────────────────────────

/**
 * Strip RTF formatting commands to extract plain text.
 * Handles control words, groups, and special characters.
 */
function stripRtf(rtf: string): string {
  // Remove RTF header info and font tables
  let text = rtf
    .replace(/\{\\fonttbl[^}]*\}/g, '')
    .replace(/\{\\colortbl[^}]*\}/g, '')
    .replace(/\{\\stylesheet[^}]*\}/g, '')
    .replace(/\{\\info[^}]*\}/g, '');
  // Convert RTF line breaks to newlines
  text = text.replace(/\\par\b/g, '\n').replace(/\\line\b/g, '\n');
  // Remove RTF control words (e.g., \b, \i, \fs24, \cf1)
  text = text.replace(/\\[a-z]+(-?\d+)?\s?/gi, '');
  // Remove curly braces
  text = text.replace(/[{}]/g, '');
  // Decode RTF special chars
  text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_m: string, hex: string) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n');
  return text
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0)
    .join('\n');
}

// base64ToUint8Array imported from ../utils/base64Polyfill

// ─── DOCX Parser ────────────────────────────────────────────────

async function parseDocx(base64Data: string): Promise<string> {
  const zip = await JSZip.loadAsync(base64ToUint8Array(base64Data));

  const docFile = zip.file('word/document.xml');
  if (!docFile) {
    throw new Error('Invalid DOCX: word/document.xml not found');
  }

  const docXml = await docFile.async('text');
  // Use structure-aware parser to preserve headings, lists, and paragraphs
  let text = parseDocxStructured(docXml);

  // Also extract headers/footers (use plain stripXml for these)
  const extras: string[] = [];
  for (const path of Object.keys(zip.files)) {
    if (
      (path.startsWith('word/header') || path.startsWith('word/footer')) &&
      path.endsWith('.xml')
    ) {
      try {
        const content = await zip.files[path].async('text');
        const cleaned = stripXml(content);
        if (cleaned.length > 5) extras.push(cleaned);
      } catch { /* skip */ }
    }
  }

  if (extras.length > 0) {
    text += '\n\n[HEADER/FOOTER]\n' + extras.join('\n');
  }

  return text;
}

// ─── PPTX Parser ────────────────────────────────────────────────

async function parsePptx(base64Data: string): Promise<string> {
  const zip = await JSZip.loadAsync(base64ToUint8Array(base64Data));

  const slideFiles = Object.keys(zip.files)
    .filter((p: string) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a: string, b: string) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0', 10);
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0', 10);
      return numA - numB;
    });

  if (slideFiles.length === 0) {
    throw new Error('Invalid PPTX: no slides found');
  }

  const slideTexts: string[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const slideXml = await zip.files[slideFiles[i]].async('text');
    const text = stripXml(slideXml);
    if (text.length > 0) {
      slideTexts.push(`[Slide ${i + 1}]\n${text}`);
    }
  }

  // Also check speaker notes
  for (const path of Object.keys(zip.files)) {
    if (/^ppt\/notesSlides\//.test(path) && path.endsWith('.xml')) {
      try {
        const noteXml = await zip.files[path].async('text');
        const text = stripXml(noteXml);
        if (text.length > 10) {
          slideTexts.push(`[Speaker Notes]\n${text}`);
        }
      } catch { /* skip */ }
    }
  }

  return slideTexts.join('\n\n');
}

// ─── XLSX Parser ────────────────────────────────────────────────

async function parseXlsx(base64Data: string): Promise<string> {
  const zip = await JSZip.loadAsync(base64ToUint8Array(base64Data));

  // Get shared strings (cells reference these by index)
  let sharedStrings: string[] = [];
  const ssFile = zip.file('xl/sharedStrings.xml');
  if (ssFile) {
    const ssXml = await ssFile.async('text');
    const matches = ssXml.match(/<t[^>]*>([^<]*)<\/t>/g) || [];
    sharedStrings = matches.map((m: string) =>
      m.replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
    );
  }

  // Parse each worksheet
  const sheetFiles = Object.keys(zip.files)
    .filter((p: string) => /^xl\/worksheets\/sheet\d+\.xml$/.test(p))
    .sort((a: string, b: string) => {
      const numA = parseInt(a.match(/sheet(\d+)/)?.[1] || '0', 10);
      const numB = parseInt(b.match(/sheet(\d+)/)?.[1] || '0', 10);
      return numA - numB;
    });

  const sheetTexts: string[] = [];
  for (let i = 0; i < sheetFiles.length; i++) {
    const sheetXml = await zip.files[sheetFiles[i]].async('text');

    const rows: string[][] = [];
    const rowMatches = sheetXml.match(/<row[^>]*>[\s\S]*?<\/row>/g) || [];

    for (const rowXml of rowMatches) {
      const cellValues: string[] = [];
      const cellMatches = rowXml.match(/<c[^>]*>[\s\S]*?<\/c>/g) || [];

      for (const cellXml of cellMatches) {
        const isShared = /t="s"/.test(cellXml);
        const valueMatch = cellXml.match(/<v>([^<]*)<\/v>/);
        if (valueMatch) {
          if (isShared && sharedStrings[parseInt(valueMatch[1], 10)]) {
            cellValues.push(sharedStrings[parseInt(valueMatch[1], 10)]);
          } else {
            cellValues.push(valueMatch[1]);
          }
        }
      }

      if (cellValues.length > 0) {
        rows.push(cellValues);
      }
    }

    if (rows.length > 0) {
      const tableText = rows.map((r: string[]) => r.join(' | ')).join('\n');
      sheetTexts.push(`[Sheet ${i + 1}]\n${tableText}`);
    }
  }

  if (sheetTexts.length > 0) {
    return sheetTexts.join('\n\n');
  }

  // Fallback: just return shared strings text
  return sharedStrings.join('\n');
}

// ─── Main Parser ────────────────────────────────────────────────

/**
 * Read a file and extract its text content.
 *
 * For text-based files, reads directly as UTF-8.
 * For Office formats, uses JSZip to extract XML text content.
 */
export async function parseUploadedFile(
  fileUri: string,
  fileName: string,
  options?: { maxChars?: number }
): Promise<ParsedFile> {
  const fileType = getFileType(fileName);
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  const sizeBytes = (fileInfo as any).size || 0;

  let content = '';

  try {
    if (fileType === 'pdf') {
      throw new Error('PDF text extraction is not supported. Please upload a Word (.docx), PowerPoint (.pptx), Excel (.xlsx), or text file instead.');
    } else if (fileType === 'doc_legacy' || fileType === 'ppt_legacy' || fileType === 'xls_legacy') {
      const extMap: Record<string, string> = { doc_legacy: '.docx', ppt_legacy: '.pptx', xls_legacy: '.xlsx' };
      throw new Error(`Old format "${fileName.split('.').pop()}" is not supported. Please save the file as ${extMap[fileType]} and try again.`);
    } else if (fileType === 'rtf') {
      const raw = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      // Strip RTF formatting commands to extract plain text
      content = stripRtf(raw);
    } else if (fileType === 'txt' || fileType === 'csv') {
      content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } else if (fileType === 'docx') {
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      content = await parseDocx(base64);
    } else if (fileType === 'pptx') {
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      content = await parsePptx(base64);
    } else if (fileType === 'xlsx') {
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      content = await parseXlsx(base64);
    } else {
      content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    // Mark parse failure so processing screens can detect and alert the user
    throw new Error(`Unable to read "${fileName}": ${errMsg}. The file may be corrupted or in an unsupported format.`);
  }

  // Validate we got meaningful content
  if (!content || content.trim().length < 2) {
    throw new Error(`File "${fileName}" (${formatSize(sizeBytes)}) has no extractable text content. Please try a different file or paste text directly.`);
  }

  // Truncate very large content to stay within token limits
  const MAX_CHARS = options?.maxChars ?? 25000;
  let wasTruncated = false;
  let originalLength: number | undefined;
  if (content.length > MAX_CHARS) {
    originalLength = content.length;
    content = content.substring(0, MAX_CHARS) + '\n\n[Content truncated for processing...]';
    wasTruncated = true;
  }

  return {
    content,
    fileName,
    fileType,
    sizeBytes,
    wasTruncated,
    originalLength,
  };
}

/**
 * Format file size for display.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Chunk Splitter ─────────────────────────────────────────────

/**
 * Split large content into chunks for individual AI calls.
 * Splits at paragraph or sentence boundaries to avoid cutting mid-sentence.
 *
 * @param content - Full text content.
 * @param maxChunkSize - Maximum characters per chunk (default 15,000).
 * @returns Array of content chunks.
 */
export function splitIntoChunks(content: string, maxChunkSize: number = 15000): string[] {
  if (content.length <= maxChunkSize) return [content];

  const chunks: string[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    if (remaining.length <= maxChunkSize) {
      chunks.push(remaining);
      break;
    }

    // Find a natural break point near maxChunkSize
    let breakPoint = remaining.lastIndexOf('\n\n', maxChunkSize);
    if (breakPoint < maxChunkSize * 0.5) {
      breakPoint = remaining.lastIndexOf('\n', maxChunkSize);
    }
    if (breakPoint < maxChunkSize * 0.5) {
      const sentenceEnd = remaining.lastIndexOf('. ', maxChunkSize);
      if (sentenceEnd > maxChunkSize * 0.3) {
        breakPoint = sentenceEnd + 1;
      }
    }
    if (breakPoint < maxChunkSize * 0.3) {
      // S42: Try additional sentence terminators before word boundary
      const questionEnd = remaining.lastIndexOf('? ', maxChunkSize);
      const exclaimEnd = remaining.lastIndexOf('! ', maxChunkSize);
      const semicolonEnd = remaining.lastIndexOf('; ', maxChunkSize);
      const bestSentence = Math.max(questionEnd, exclaimEnd, semicolonEnd);
      if (bestSentence > maxChunkSize * 0.3) {
        breakPoint = bestSentence + 1;
      } else {
        // Try word boundary (last space) before forcing a mid-word split
        const lastSpace = remaining.lastIndexOf(' ', maxChunkSize);
        if (lastSpace > maxChunkSize * 0.3) {
          breakPoint = lastSpace + 1;
        } else {
          breakPoint = maxChunkSize;
        }
      }
    }

    chunks.push(remaining.substring(0, breakPoint).trim());
    remaining = remaining.substring(breakPoint).trim();
  }

  return chunks.filter(c => c.length > 0);
}
