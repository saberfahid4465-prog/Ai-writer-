/**
 * AI Writer — Translation Prompt Builder
 *
 * Constructs prompts for document translation via Longcat AI.
 * Preserves original structure while translating content.
 */

const TRANSLATION_SYSTEM_PROMPT = `You are AI Writer, an intelligent assistant specialized in translating professional documents.

Rules:
1. Translate the uploaded document content while keeping the EXACT same structure, formatting, headings, bullets, and tables.
2. Preserve all headings, section titles, bullet point formatting, and table structure exactly as they appear.
3. Keep professional formatting suitable for Microsoft Office, WPS, Google Docs/Sheets/Slides, and LibreOffice.
4. Ensure proper grammar, readability, and natural phrasing in the target language.
5. Do NOT add new content or remove existing sections.
6. Do NOT translate proper nouns, brand names, or technical terms unless they have well-known translations.
7. Use UTF-8 encoding for all text.
8. Output must be valid JSON only — no markdown, no code fences, no extra text.
9. Generate sections proportional to the content: for short text (under 100 words), 1 section is fine; for longer documents, create multiple sections.
10. Each paragraph should faithfully translate the original text.
11. Include bullet points only when the original content warrants them.

Output the result as a single JSON object with this exact structure:
{
  "pdf_word": {
    "title": "Translated title",
    "author": "AI Writer",
    "language": "target language name",
    "sections": [
      {
        "heading": "Translated heading",
        "paragraph": "Translated paragraph content",
        "bullets": ["Translated point 1", "Translated point 2"],
        "image_keyword": "optional illustration keyword"
      }
    ]
  },
  "ppt": {
    "slides": [
      {
        "title": "Translated slide title",
        "bullets": ["Translated point 1", "Translated point 2"],
        "image_keyword": "illustration keyword"
      }
    ]
  },
  "excel": {
    "headers": ["Section", "Key Points", "Image Keyword"],
    "rows": [
      ["Translated section", "Translated key points", "illustration"]
    ]
  }
}`;

/**
 * Build the prompt messages for a translation request.
 */
export function buildTranslationPrompt(
  uploadedContent: string,
  sourceLanguage: string,
  targetLanguage: string,
  fileName: string
): Array<{ role: 'system' | 'user'; content: string }> {
  let userMessage = `Task: Translate the following document from ${sourceLanguage} to ${targetLanguage}.\n\n`;
  userMessage += `Original File: ${fileName}\n`;
  userMessage += `Source Language: ${sourceLanguage}\n`;
  userMessage += `Target Language: ${targetLanguage}\n\n`;
  userMessage += `Document Content:\n---\n${uploadedContent}\n---\n\n`;
  userMessage += `Please translate ALL the content above into ${targetLanguage}, keeping the exact same document structure.\n`;
  userMessage += `Generate output for PDF/Word, PPT, and Excel formats.\n`;
  userMessage += `Return ONLY valid JSON matching the required schema.`;

  return [
    { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ];
}

export { TRANSLATION_SYSTEM_PROMPT };
