/**
 * AI Writer — Translation Prompt Builder
 *
 * Constructs prompts for document translation via Longcat AI.
 * Preserves original structure while translating content.
 */

const TRANSLATION_SYSTEM_PROMPT = `You are AI Writer, a professional document translator that produces 1:1 faithful translations preserving the exact document structure.

STRUCTURE MARKERS — The input uses markers at the start of each line to indicate document structure:
- [TITLE] = Document title
- [SUBTITLE] = Document subtitle
- [H1], [H2], [H3] = Heading levels 1, 2, 3
- [LIST] = Bullet or numbered list item (indented [LIST] = sub-item)
- [P] = Normal body paragraph
- [Slide N] = PowerPoint slide (for PPTX files)
- [Sheet N] = Excel sheet (for XLSX files)

CRITICAL RULES — Structure Preservation:
1. PRESERVE every marker EXACTLY as it appears. A [H1] line must become a [H1] line, a [P] line must become a [P] line.
2. Translate ONLY the text AFTER each marker. Never remove, change, or reorder markers.
3. The output must have the SAME number of lines with the SAME markers in the SAME order as the input.
4. Do NOT merge paragraphs, split paragraphs, or skip any line.
5. Each translated line must be the SAME approximate length as the original — do not summarize or shorten.
6. Preserve all indentation on [LIST] items (sub-items).

If the input has NO structure markers (plain text), treat each paragraph as a separate section and translate faithfully.

Translation Quality:
7. Ensure proper grammar, natural phrasing, and professional tone in the target language.
8. Do NOT translate proper nouns, brand names, or technical terms unless they have standard translations.
9. Use UTF-8 encoding for all text.

Output Format:
10. Output must be valid JSON only — no markdown, no code fences, no extra text.
11. Map each [H1]/[H2]/[H3]/[TITLE] line to a section heading.
12. Map each [P] line following a heading to that section's paragraph.
13. Map each [LIST] line to a bullet in the current section's bullets array.
14. If multiple [P] lines appear under the same heading, concatenate them into one paragraph separated by newlines.
15. If no heading precedes [P] or [LIST] lines, use a generic heading like "Content" in the target language.

Output the result as a single JSON object:
{
  "pdf_word": {
    "title": "Translated title",
    "author": "AI Writer",
    "language": "target language name",
    "sections": [
      {
        "heading": "Translated heading (from [H1]/[H2]/[H3]/[TITLE])",
        "paragraph": "FULL translated paragraph(s) from [P] lines — same length as original",
        "bullets": ["Translated [LIST] item 1", "Translated [LIST] item 2"],
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
    "headers": ["Section", "Content", "Key Points"],
    "rows": [
      ["Translated heading", "First 200 chars of translated paragraph", "Key points"]
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
  let userMessage = `TASK: Translate this document from ${sourceLanguage} to ${targetLanguage}.\n`;
  userMessage += `IMPORTANT: Preserve the structure markers ([H1], [H2], [P], [LIST], [TITLE], etc.) exactly. Translate ONLY the text after each marker.\n`;
  userMessage += `The output sections must mirror the input structure: same headings, same paragraphs, same bullets, same order.\n\n`;
  userMessage += `File: ${fileName}\n`;
  userMessage += `From: ${sourceLanguage} → To: ${targetLanguage}\n\n`;
  userMessage += `--- ORIGINAL CONTENT ---\n${uploadedContent}\n--- END ---\n\n`;
  userMessage += `Map [H1]/[H2]/[H3]/[TITLE] → section headings, [P] → paragraphs, [LIST] → bullets. Same count, same order.\n`;
  userMessage += `Return ONLY valid JSON.`;

  return [
    { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ];
}

/**
 * Build prompt messages for a single chunk of a multi-chunk translation.
 */
export function buildTranslationChunkPrompt(
  chunkContent: string,
  sourceLanguage: string,
  targetLanguage: string,
  fileName: string,
  chunkIndex: number,
  totalChunks: number
): Array<{ role: 'system' | 'user'; content: string }> {
  let userMessage = `TASK: Translate PART ${chunkIndex + 1} of ${totalChunks} from ${sourceLanguage} to ${targetLanguage}.\n`;
  userMessage += `File: ${fileName}\n`;
  userMessage += `IMPORTANT: Preserve structure markers ([H1], [H2], [P], [LIST], etc.) exactly. Translate ONLY the text after each marker.\n\n`;

  if (chunkIndex > 0) {
    userMessage += `This is a CONTINUATION. Do not add introduction or title — translate this portion directly.\n\n`;
  }

  userMessage += `--- PART ${chunkIndex + 1} CONTENT ---\n${chunkContent}\n--- END ---\n\n`;
  userMessage += `Map [H1]/[H2]/[H3]/[TITLE] → section headings, [P] → paragraphs, [LIST] → bullets. Same count, same order.\n`;
  userMessage += `Return ONLY valid JSON.`;

  return [
    { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ];
}

export { TRANSLATION_SYSTEM_PROMPT };
