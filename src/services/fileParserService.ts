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
}

// ─── File Type Detection ────────────────────────────────────────

export function getFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const typeMap: Record<string, string> = {
    pdf: 'pdf',
    docx: 'docx',
    doc: 'docx',
    pptx: 'pptx',
    ppt: 'pptx',
    xlsx: 'xlsx',
    xls: 'xlsx',
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
  let text = stripXml(docXml);

  // Also extract headers/footers
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
    text += '\n\n--- Headers/Footers ---\n' + extras.join('\n');
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
  fileName: string
): Promise<ParsedFile> {
  const fileType = getFileType(fileName);
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  const sizeBytes = (fileInfo as any).size || 0;

  let content = '';

  try {
    if (fileType === 'pdf') {
      throw new Error('PDF text extraction is not supported. Please upload a Word (.docx), PowerPoint (.pptx), Excel (.xlsx), or text file instead.');
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
  const MAX_CHARS = 15000;
  let wasTruncated = false;
  if (content.length > MAX_CHARS) {
    content = content.substring(0, MAX_CHARS) + '\n\n[Content truncated for processing...]';
    wasTruncated = true;
  }

  return {
    content,
    fileName,
    fileType,
    sizeBytes,
    wasTruncated,
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
