/**
 * AI Writer — Response Parser
 *
 * Parses and validates the JSON response from Longcat AI.
 * Ensures it matches the expected schema before passing
 * to file generators.
 */

// ─── Type Definitions ───────────────────────────────────────────

export interface PdfWordSection {
  heading: string;
  paragraph: string;
  bullets: string[];
  image_keyword?: string;
}

export interface PdfWordData {
  title: string;
  author: string;
  language: string;
  sections: PdfWordSection[];
}

export interface PptSlide {
  title: string;
  bullets: string[];
  image_keyword?: string;
}

export interface PptData {
  slides: PptSlide[];
}

export interface ExcelData {
  headers: string[];
  rows: string[][];
}

export interface AIWriterOutput {
  pdf_word: PdfWordData;
  ppt: PptData;
  excel: ExcelData;
}

// ─── Parser ─────────────────────────────────────────────────────

/**
 * Parse the raw AI response string into a validated AIWriterOutput object.
 *
 * @param rawContent - The raw JSON string from the AI.
 * @returns Validated and typed output structure.
 * @throws Error if the JSON is invalid or doesn't match the schema.
 */
export function parseAIResponse(rawContent: string): AIWriterOutput {
  // Step 1: Clean the response (strip code fences if present)
  let cleaned = rawContent.trim();

  // Remove markdown code fences if the AI accidentally included them
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  // Step 2: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Invalid JSON from AI: ${cleaned.substring(0, 200)}...`);
  }

  // Step 3: Validate structure
  const obj = parsed as Record<string, unknown>;
  validatePdfWord(obj.pdf_word);
  validatePpt(obj.ppt);
  validateExcel(obj.excel);

  return parsed as AIWriterOutput;
}

// ─── Validators ─────────────────────────────────────────────────

function validatePdfWord(data: unknown): asserts data is PdfWordData {
  if (!data || typeof data !== 'object') {
    throw new Error('Missing or invalid "pdf_word" in AI response');
  }

  const d = data as Record<string, unknown>;

  if (typeof d.title !== 'string' || d.title.length === 0) {
    throw new Error('pdf_word.title is missing or empty');
  }
  if (typeof d.language !== 'string' || d.language.length === 0) {
    throw new Error('pdf_word.language is missing or empty');
  }
  if (!Array.isArray(d.sections) || d.sections.length === 0) {
    throw new Error('pdf_word.sections is missing or empty');
  }

  for (let i = 0; i < d.sections.length; i++) {
    const section = d.sections[i] as Record<string, unknown>;
    if (typeof section.heading !== 'string' || section.heading.length === 0) {
      throw new Error(`pdf_word.sections[${i}].heading is missing or empty`);
    }
    if (typeof section.paragraph !== 'string' || section.paragraph.length === 0) {
      throw new Error(`pdf_word.sections[${i}].paragraph is missing or empty`);
    }
    if (!Array.isArray(section.bullets) || section.bullets.length === 0) {
      throw new Error(`pdf_word.sections[${i}].bullets is missing or empty`);
    }
  }
}

function validatePpt(data: unknown): asserts data is PptData {
  if (!data || typeof data !== 'object') {
    throw new Error('Missing or invalid "ppt" in AI response');
  }

  const d = data as Record<string, unknown>;

  if (!Array.isArray(d.slides) || d.slides.length === 0) {
    throw new Error('ppt.slides is missing or empty');
  }

  for (let i = 0; i < d.slides.length; i++) {
    const slide = d.slides[i] as Record<string, unknown>;
    if (typeof slide.title !== 'string' || slide.title.length === 0) {
      throw new Error(`ppt.slides[${i}].title is missing or empty`);
    }
    if (!Array.isArray(slide.bullets) || slide.bullets.length === 0) {
      throw new Error(`ppt.slides[${i}].bullets is missing or empty`);
    }
  }
}

function validateExcel(data: unknown): asserts data is ExcelData {
  if (!data || typeof data !== 'object') {
    throw new Error('Missing or invalid "excel" in AI response');
  }

  const d = data as Record<string, unknown>;

  if (!Array.isArray(d.headers) || d.headers.length === 0) {
    throw new Error('excel.headers is missing or empty');
  }
  if (!Array.isArray(d.rows) || d.rows.length === 0) {
    throw new Error('excel.rows is missing or empty');
  }
}
