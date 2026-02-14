/**
 * AI Writer — File Parser Service
 *
 * Reads uploaded documents (PDF, Word, PPT, Excel, TXT) and
 * extracts their text content for AI processing.
 * Uses expo-file-system for file access.
 */

import * as FileSystem from 'expo-file-system';

export interface ParsedFile {
  content: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;
}

/**
 * Detect file type from extension.
 */
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

/**
 * Get MIME type for a file extension.
 */
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

/**
 * Read a file and extract its text content.
 *
 * For text-based files, reads directly as UTF-8.
 * For binary formats, reads as base64 and sends metadata to AI.
 *
 * @param fileUri - Local URI of the file (from DocumentPicker)
 * @param fileName - Original file name with extension
 * @returns Parsed file data with extracted content
 */
export async function parseUploadedFile(
  fileUri: string,
  fileName: string
): Promise<ParsedFile> {
  const fileType = getFileType(fileName);
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  const sizeBytes = (fileInfo as any).size || 0;

  let content = '';

  if (fileType === 'txt' || fileType === 'csv' || fileType === 'rtf') {
    // Text-based files: read directly
    try {
      content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch {
      content = '[Unable to read text content from this file]';
    }
  } else {
    // Binary files (PDF, DOCX, PPTX, XLSX): read as text attempt
    // In React Native, we attempt UTF-8 read which works for many formats
    // that have readable XML/text layers
    try {
      content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // If content is mostly binary garbage, truncate and note it
      const printableRatio = countPrintable(content) / content.length;
      if (printableRatio < 0.3) {
        // Mostly binary — extract what readable text we can
        content = extractReadableText(content);
        if (content.length < 50) {
          content = `[Binary ${fileType.toUpperCase()} file uploaded: ${fileName}, size: ${formatSize(sizeBytes)}. Unable to extract full text — AI will work with the file name and context.]`;
        }
      }
    } catch {
      content = `[${fileType.toUpperCase()} file uploaded: ${fileName}, size: ${formatSize(sizeBytes)}. Content will be processed by AI based on available context.]`;
    }
  }

  // Truncate very large content to stay within token limits
  const MAX_CHARS = 15000; // ~3750 tokens
  if (content.length > MAX_CHARS) {
    content = content.substring(0, MAX_CHARS) + '\n\n[Content truncated for processing...]';
  }

  return {
    content,
    fileName,
    fileType,
    sizeBytes,
  };
}

/**
 * Count printable ASCII characters in a string.
 */
function countPrintable(text: string): number {
  let count = 0;
  for (let i = 0; i < Math.min(text.length, 1000); i++) {
    const code = text.charCodeAt(i);
    if ((code >= 32 && code < 127) || code === 10 || code === 13 || code === 9) {
      count++;
    }
  }
  return count;
}

/**
 * Extract readable text segments from binary content.
 */
function extractReadableText(content: string): string {
  // Find sequences of printable characters (min 4 chars long)
  const matches = content.match(/[\x20-\x7E\n\r\t]{4,}/g) || [];
  return matches
    .filter((m) => m.trim().length >= 4)
    .join('\n')
    .substring(0, 10000);
}

/**
 * Format file size for display.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
