/**
 * AI Writer — Pexels Image Service
 *
 * Fetches high-quality, royalty-free images from the Pexels API
 * based on keywords from the AI-generated content.
 * Images are used to enhance generated documents (PDF, Word, PPT, Excel).
 *
 * API: https://www.pexels.com/api/documentation/
 */

const PEXELS_API_KEY = '0d2c1eWervvFsosDO8VA1TXdi0z0lVlUmqHCrWo2CLWP0YT2249f9fvf';
const PEXELS_BASE_URL = 'https://api.pexels.com/v1';

// ─── Types ──────────────────────────────────────────────────────

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  alt: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
}

/**
 * Image data ready to embed in documents.
 * Contains the raw image bytes and metadata.
 */
export interface DocumentImage {
  keyword: string;
  imageBytes: Uint8Array;
  width: number;
  height: number;
  photographer: string;
  alt: string;
  mimeType: 'image/jpeg';
}

// ─── Image Cache ────────────────────────────────────────────────

const imageCache = new Map<string, DocumentImage>();

// ─── API Functions ──────────────────────────────────────────────

/**
 * Search Pexels for a photo matching the given keyword.
 * Returns the best match (first result, landscape orientation preferred).
 */
async function searchPhoto(keyword: string): Promise<PexelsPhoto | null> {
  try {
    const query = encodeURIComponent(keyword);
    const response = await fetch(
      `${PEXELS_BASE_URL}/search?query=${query}&per_page=5&orientation=landscape`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.warn(`Pexels API error for "${keyword}": ${response.status}`);
      return null;
    }

    const data: PexelsSearchResponse = await response.json();

    if (!data.photos || data.photos.length === 0) {
      console.warn(`No Pexels images found for "${keyword}"`);
      return null;
    }

    // Return first landscape-oriented result
    return data.photos[0];
  } catch (error) {
    console.warn(`Pexels search failed for "${keyword}":`, error);
    return null;
  }
}

/**
 * Download an image from a URL and return it as Uint8Array.
 * Uses the 'medium' size for a good balance of quality and file size.
 */
async function downloadImage(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Image download failed: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.warn('Image download error:', error);
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Fetch a single image for a keyword. Returns null if not found.
 * Results are cached to avoid duplicate API calls.
 */
export async function fetchImageForKeyword(
  keyword: string
): Promise<DocumentImage | null> {
  if (!keyword || keyword.trim().length === 0) return null;

  const cacheKey = keyword.toLowerCase().trim();
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }

  const photo = await searchPhoto(keyword);
  if (!photo) return null;

  // Use 'medium' size — good quality at ~350x250 px, keeps file sizes small
  const imageBytes = await downloadImage(photo.src.medium);
  if (!imageBytes) return null;

  const docImage: DocumentImage = {
    keyword,
    imageBytes,
    width: photo.width,
    height: photo.height,
    photographer: photo.photographer,
    alt: photo.alt || keyword,
    mimeType: 'image/jpeg',
  };

  imageCache.set(cacheKey, docImage);
  return docImage;
}

/**
 * Fetch images for multiple keywords in parallel.
 * Returns a Map<keyword, DocumentImage> for successful fetches.
 * Failed or missing images are silently skipped.
 *
 * @param keywords - Array of image keywords from AI content.
 * @param maxConcurrent - Maximum parallel downloads (default: 3).
 * @returns Map of keyword → DocumentImage for successfully fetched images.
 */
export async function fetchImagesForKeywords(
  keywords: string[]
): Promise<Map<string, DocumentImage>> {
  const results = new Map<string, DocumentImage>();

  // Deduplicate keywords
  const uniqueKeywords = [...new Set(
    keywords
      .filter((k) => k && k.trim().length > 0)
      .map((k) => k.trim())
  )];

  if (uniqueKeywords.length === 0) return results;

  // Fetch in batches of 3 to respect rate limits
  const BATCH_SIZE = 3;
  for (let i = 0; i < uniqueKeywords.length; i += BATCH_SIZE) {
    const batch = uniqueKeywords.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (keyword) => {
      const image = await fetchImageForKeyword(keyword);
      if (image) {
        results.set(keyword, image);
      }
    });
    await Promise.all(promises);
  }

  return results;
}

/**
 * Extract all image_keyword values from the AI output sections.
 */
export function extractImageKeywords(
  sections: Array<{ image_keyword?: string }>,
  slides?: Array<{ image_keyword?: string }>
): string[] {
  const keywords: string[] = [];

  for (const section of sections) {
    if (section.image_keyword && section.image_keyword.trim().length > 0) {
      keywords.push(section.image_keyword.trim());
    }
  }

  if (slides) {
    for (const slide of slides) {
      if (slide.image_keyword && slide.image_keyword.trim().length > 0) {
        keywords.push(slide.image_keyword.trim());
      }
    }
  }

  return [...new Set(keywords)];
}

/**
 * Clear the image cache. Call this when starting a new generation.
 */
export function clearImageCache(): void {
  imageCache.clear();
}
