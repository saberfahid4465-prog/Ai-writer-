/**
 * AI Writer — Base64 Polyfill
 *
 * Provides btoa/atob equivalent functions that work reliably
 * on all React Native engines (Hermes, JSC, V8).
 *
 * Hermes does NOT have btoa/atob, so we implement them manually.
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encode a binary string to base64.
 * Equivalent to window.btoa() but works on Hermes.
 */
export function encodeBinaryToBase64(binaryString: string): string {
  let result = '';
  const len = binaryString.length;

  for (let i = 0; i < len; i += 3) {
    const a = binaryString.charCodeAt(i);
    const b = i + 1 < len ? binaryString.charCodeAt(i + 1) : 0;
    const c = i + 2 < len ? binaryString.charCodeAt(i + 2) : 0;

    const triplet = (a << 16) | (b << 8) | c;

    result += CHARS[(triplet >> 18) & 0x3F];
    result += CHARS[(triplet >> 12) & 0x3F];
    result += i + 1 < len ? CHARS[(triplet >> 6) & 0x3F] : '=';
    result += i + 2 < len ? CHARS[triplet & 0x3F] : '=';
  }

  return result;
}

/**
 * Decode a base64 string to a binary string.
 * Equivalent to window.atob() but works on Hermes.
 */
export function decodeBase64ToBinary(base64: string): string {
  // Build lookup table
  const lookup: Record<string, number> = {};
  for (let i = 0; i < CHARS.length; i++) {
    lookup[CHARS[i]] = i;
  }

  // Remove padding
  const cleaned = base64.replace(/=+$/, '');
  let result = '';

  for (let i = 0; i < cleaned.length; i += 4) {
    const a = lookup[cleaned[i]] || 0;
    const b = lookup[cleaned[i + 1]] || 0;
    const c = lookup[cleaned[i + 2]] || 0;
    const d = lookup[cleaned[i + 3]] || 0;

    const triplet = (a << 18) | (b << 12) | (c << 6) | d;

    result += String.fromCharCode((triplet >> 16) & 0xFF);
    if (i + 2 < cleaned.length) result += String.fromCharCode((triplet >> 8) & 0xFF);
    if (i + 3 < cleaned.length) result += String.fromCharCode(triplet & 0xFF);
  }

  return result;
}

/**
 * Convert a Uint8Array to a base64 string.
 * Use this instead of btoa(String.fromCharCode(...)).
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return encodeBinaryToBase64(binary);
}

/**
 * Convert a base64 string to a Uint8Array.
 * Use this instead of atob().
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = decodeBase64ToBinary(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
