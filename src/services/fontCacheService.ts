/**
 * AI Writer — Font Cache Service
 *
 * Downloads and caches Google Noto Sans fonts for PDF generation.
 * Supports non-Latin scripts: Arabic, CJK, Devanagari, etc.
 * Fonts are cached in the app's document directory for reuse.
 */

import * as FileSystem from 'expo-file-system';

const FONT_CACHE_DIR = `${FileSystem.documentDirectory}font-cache/`;

// Google Fonts static CDN URLs for Noto Sans variants (Regular weight, TTF)
// These are stable Google-hosted URLs that serve TTF files directly.
const FONT_URLS: Record<string, string> = {
  // Covers: Latin, Cyrillic, Greek, Vietnamese
  latin: 'https://fonts.gstatic.com/s/notosans/v36/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A99d.ttf',
  // Arabic script
  arabic: 'https://fonts.gstatic.com/s/notosansarabic/v18/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyGyvu3CBFQLaig.ttf',
  // Devanagari (Hindi, Marathi, Sanskrit)
  devanagari: 'https://fonts.gstatic.com/s/notosansdevanagari/v26/TuGoUVpzXI5FBtUq5a8bjKYTZjtRU6Sgv3NaV_SNmI0b6w.ttf',
  // Japanese (includes CJK ideographs + Hiragana/Katakana)
  japanese: 'https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEi75vY0rw-oME.ttf',
  // Korean (Hangul + CJK)
  korean: 'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLTq8H4hfeE.ttf',
  // Simplified Chinese
  chinese: 'https://fonts.gstatic.com/s/notosanssc/v37/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_EnYxNbPzS5HE.ttf',
  // Persian/Farsi (uses Arabic script)
  persian: 'https://fonts.gstatic.com/s/notosansarabic/v18/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyGyvu3CBFQLaig.ttf',
  // Turkish (Latin Extended)
  turkish: 'https://fonts.gstatic.com/s/notosans/v36/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A99d.ttf',
  // Thai
  thai: 'https://fonts.gstatic.com/s/notosansthai/v25/iJWnBXeUZi_OHPqn4wq6hQ2_hbJ1xyN9wd43SofNWcd1MKVQt_So_9CdU5RspzF-QRvzzXg.ttf',
  // Hebrew
  hebrew: 'https://fonts.gstatic.com/s/notosanshebrew/v46/or3HQ7v33eiDljA1IufXTtVf7V6RvEEdhQlk0LlGo77Q8PMDeL-BDhUttKNDuoHAT700kqUO.ttf',
  // Bengali
  bengali: 'https://fonts.gstatic.com/s/notosansbengali/v26/Cn-SJsCGWQxOjaGwMQ6fIiMywrNJIky6nvd8BjzVMvJx2mcSPVFpVEqE-6KmsolKudCk8izI0lc.ttf',
};

// Map language codes to font keys
const LANGUAGE_TO_FONT: Record<string, string> = {
  ar: 'arabic',
  fa: 'persian',
  ur: 'arabic',
  hi: 'devanagari',
  ja: 'japanese',
  ko: 'korean',
  zh: 'chinese',
  'zh-CN': 'chinese',
  'zh-TW': 'chinese',
  tr: 'turkish',
  ru: 'latin', // Cyrillic is in Noto Sans Latin
  th: 'thai',
  he: 'hebrew',
  bn: 'bengali',
  el: 'latin', // Greek is in Noto Sans Latin
  vi: 'latin', // Vietnamese is in Noto Sans Latin
  uk: 'latin', // Ukrainian Cyrillic is in Noto Sans Latin
  // Latin-based languages use Helvetica (no custom font needed)
  en: '',
  es: '',
  fr: '',
  de: '',
  pt: '',
  it: '',
};

/**
 * Check if a language requires a custom font for PDF generation.
 */
export function needsCustomFont(languageCode: string): boolean {
  const code = languageCode.toLowerCase().split('-')[0];
  const fontKey = LANGUAGE_TO_FONT[code];
  return fontKey !== undefined && fontKey !== '';
}

/**
 * Detect if text contains significant non-Latin characters.
 */
export function hasNonLatinText(text: string): boolean {
  let nonLatin = 0;
  let total = 0;
  for (let i = 0; i < Math.min(text.length, 500); i++) {
    const code = text.charCodeAt(i);
    if (code > 0x20) {
      total++;
      if (code > 0xFF) nonLatin++;
    }
  }
  return total > 0 && (nonLatin / total) > 0.2;
}

/**
 * Get the font key for a given language code.
 */
function getFontKey(languageCode: string): string {
  const code = languageCode.toLowerCase().split('-')[0];
  return LANGUAGE_TO_FONT[code] || '';
}

/**
 * Download and cache a font file. Returns the font bytes as Uint8Array.
 * Returns null if download fails (caller should fall back to Helvetica).
 */
export async function getCachedFont(languageCode: string): Promise<Uint8Array | null> {
  const fontKey = getFontKey(languageCode);
  if (!fontKey || !FONT_URLS[fontKey]) return null;

  try {
    // Ensure cache directory exists
    const dirInfo = await FileSystem.getInfoAsync(FONT_CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(FONT_CACHE_DIR, { intermediates: true });
    }

    const cacheFile = `${FONT_CACHE_DIR}${fontKey}.ttf`;
    const cacheInfo = await FileSystem.getInfoAsync(cacheFile);

    if (cacheInfo.exists) {
      // Read from cache
      const base64 = await FileSystem.readAsStringAsync(cacheFile, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64ToUint8Array(base64);
    }

    // Download font
    const url = FONT_URLS[fontKey];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Font download failed: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Save to cache
    const base64Data = uint8ArrayToBase64(bytes);
    await FileSystem.writeAsStringAsync(cacheFile, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return bytes;
  } catch (error) {
    console.warn('Font cache error:', error);
    return null;
  }
}

// ─── Base64 helpers (inline to avoid circular deps) ─────────

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    const chars: string[] = [];
    for (let j = 0; j < chunk.length; j++) {
      chars.push(String.fromCharCode(chunk[j]));
    }
    binary += chars.join('');
  }

  // Use a lookup table approach for environments without btoa
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  while (i < binary.length) {
    const a = binary.charCodeAt(i++);
    const b = i < binary.length ? binary.charCodeAt(i++) : 0;
    const c = i < binary.length ? binary.charCodeAt(i++) : 0;
    const bitsCount = i <= binary.length + 1 ? (i <= binary.length ? 3 : 2) : 1;

    const triplet = (a << 16) | (b << 8) | c;
    result += CHARS[(triplet >> 18) & 0x3F];
    result += CHARS[(triplet >> 12) & 0x3F];
    result += bitsCount > 1 ? CHARS[(triplet >> 6) & 0x3F] : '=';
    result += bitsCount > 2 ? CHARS[triplet & 0x3F] : '=';
  }
  return result;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < CHARS.length; i++) {
    lookup[CHARS.charCodeAt(i)] = i;
  }

  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const byteLength = (clean.length * 3) / 4 - padding;
  const bytes = new Uint8Array(byteLength);

  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = lookup[clean.charCodeAt(i)];
    const b = lookup[clean.charCodeAt(i + 1)];
    const c = lookup[clean.charCodeAt(i + 2)];
    const d = lookup[clean.charCodeAt(i + 3)];

    bytes[p++] = (a << 2) | (b >> 4);
    if (p < byteLength) bytes[p++] = ((b & 15) << 4) | (c >> 2);
    if (p < byteLength) bytes[p++] = ((c & 3) << 6) | d;
  }

  return bytes;
}
