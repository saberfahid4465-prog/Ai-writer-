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

  // Step 3: Validate structure with defaults for missing sections
  const obj = parsed as Record<string, unknown>;
  
  // Provide default structures if missing
  if (!obj.pdf_word || typeof obj.pdf_word !== 'object') {
    obj.pdf_word = {
      title: 'Untitled Document',
      author: 'AI Writer',
      language: 'English',
      sections: [{ heading: 'Content', paragraph: 'Content generation in progress...', bullets: [] }]
    };
  }
  
  if (!obj.ppt || typeof obj.ppt !== 'object') {
    obj.ppt = {
      slides: [{ title: 'Presentation', bullets: ['Content generation in progress...'] }]
    };
  }
  
  if (!obj.excel || typeof obj.excel !== 'object') {
    obj.excel = {
      headers: ['Item', 'Description'],
      rows: [['1', 'Content generation in progress...']]
    };
  }
  
  validatePdfWord(obj.pdf_word);
  validatePpt(obj.ppt);
  validateExcel(obj.excel);

  return obj as unknown as AIWriterOutput;
}

// ─── Validators ─────────────────────────────────────────────────

function validatePdfWord(data: unknown): asserts data is PdfWordData {
  if (!data || typeof data !== 'object') {
    // Should not happen as we provide defaults above, but just in case
    throw new Error('Missing or invalid "pdf_word" in AI response');
  }

  const d = data as Record<string, unknown>;

  // Provide defaults for missing fields instead of throwing
  if (typeof d.title !== 'string' || d.title.length === 0) {
    d.title = 'Untitled Document';
  }
  if (typeof d.author !== 'string') {
    d.author = 'AI Writer';
  }
  if (typeof d.language !== 'string' || d.language.length === 0) {
    d.language = 'English';
  }
  if (!Array.isArray(d.sections) || d.sections.length === 0) {
    d.sections = [{ heading: 'Content', paragraph: 'No content generated.', bullets: [] }];
  }

  const sections = d.sections as Array<Record<string, unknown>>;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (typeof section.heading !== 'string' || section.heading.length === 0) {
      section.heading = `Section ${i + 1}`;
    }
    if (typeof section.paragraph !== 'string' || section.paragraph.length === 0) {
      section.paragraph = ' ';
    }
    if (!Array.isArray(section.bullets)) {
      section.bullets = [];
    }
  }
}

function validatePpt(data: unknown): asserts data is PptData {
  if (!data || typeof data !== 'object') {
    throw new Error('Missing or invalid "ppt" in AI response');
  }

  const d = data as Record<string, unknown>;

  // Provide defaults for missing slides
  if (!Array.isArray(d.slides) || d.slides.length === 0) {
    d.slides = [{ title: 'Slide 1', bullets: ['No content generated.'] }];
  }

  const slides = d.slides as Array<Record<string, unknown>>;
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    if (typeof slide.title !== 'string' || slide.title.length === 0) {
      slide.title = `Slide ${i + 1}`;
    }
    if (!Array.isArray(slide.bullets)) {
      slide.bullets = [];
    }
  }
}

function validateExcel(data: unknown): asserts data is ExcelData {
  if (!data || typeof data !== 'object') {
    throw new Error('Missing or invalid "excel" in AI response');
  }

  const d = data as Record<string, unknown>;

  // Provide defaults for missing headers
  if (!Array.isArray(d.headers) || d.headers.length === 0) {
    d.headers = ['Column 1'];
  }
  if (!Array.isArray(d.rows)) {
    d.rows = [];
  }
}
