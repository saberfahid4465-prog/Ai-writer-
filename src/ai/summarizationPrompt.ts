/**
 * AI Writer — Summarization Prompt Builder
 *
 * Constructs prompts for document summarization via Longcat AI.
 * Extracts key points and creates concise professional summaries.
 */

const SUMMARIZATION_SYSTEM_PROMPT = `You are AI Writer, an intelligent assistant specialized in summarizing professional documents.

STRUCTURE MARKERS — The input may contain markers at the start of each line indicating document structure:
- [TITLE] = Document title
- [SUBTITLE] = Document subtitle
- [H1], [H2], [H3] = Heading levels 1, 2, 3
- [LIST] = Bullet or numbered list item (indented [LIST] = sub-item)
- [P] = Normal body paragraph
- [Slide N] = PowerPoint slide (for PPTX files)
- [Sheet N] = Excel sheet (for XLSX files)

When these markers are present, use them to understand the original document hierarchy.
Strip the markers from the output — do NOT include [H1], [P], [LIST], etc. in the summary text.

Rules:
1. Read the uploaded document content and extract ONLY the most important information.
2. Identify key points, main arguments, important data, conclusions, and action items.
3. Remove unnecessary details, repetitive content, and filler text.
4. Preserve the original document's structure where appropriate (headings, sections).
5. Keep professional formatting suitable for Microsoft Office, WPS, Google Docs/Sheets/Slides, and LibreOffice.
6. Ensure grammar, readability, and professional tone in the output language.
7. Use UTF-8 encoding for all text.
8. Output must be valid JSON only — no markdown, no code fences, no extra text.
9. Generate sections based on content length: for short documents (under 100 words), 1-2 sections is fine; for longer documents, aim for 3+ sections.
10. Each paragraph should focus on the most critical information.
11. Each section should have relevant bullet points (1-3 depending on content length).
12. For short documents, provide a concise but complete summary. For longer ones, aim for 30-40% of the original length.

Output the result as a single JSON object with this exact structure:
{
  "pdf_word": {
    "title": "Summary: [Original Document Title]",
    "author": "AI Writer",
    "language": "document language",
    "sections": [
      {
        "heading": "Section heading",
        "paragraph": "Summarized paragraph content",
        "bullets": ["Key point 1", "Key point 2", "Key point 3"],
        "image_keyword": "optional illustration keyword"
      }
    ]
  },
  "ppt": {
    "slides": [
      {
        "title": "Slide title",
        "bullets": ["Key point 1", "Key point 2", "Key point 3"],
        "image_keyword": "illustration keyword"
      }
    ]
  },
  "excel": {
    "headers": ["Section", "Key Points", "Image Keyword"],
    "rows": [
      ["Section name", "Key points from section", "illustration"]
    ]
  }
}`;

/**
 * Build the prompt messages for a summarization request.
 */
export function buildSummarizationPrompt(
  uploadedContent: string,
  language: string,
  fileName: string
): Array<{ role: 'system' | 'user'; content: string }> {
  let userMessage = `Task: Summarize the following document, extracting key points and important information.\n\n`;
  userMessage += `Original File: ${fileName}\n`;
  userMessage += `Output Language: ${language}\n\n`;
  userMessage += `Document Content:\n---\n${uploadedContent}\n---\n\n`;
  userMessage += `Please create a professional summary of the above content in ${language}.\n`;
  userMessage += `Extract the most important points, data, conclusions, and action items.\n`;
  userMessage += `Generate output for PDF/Word, PPT, and Excel formats.\n`;
  userMessage += `Return ONLY valid JSON matching the required schema.`;

  return [
    { role: 'system', content: SUMMARIZATION_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ];
}

/**
 * Build prompt messages for a single chunk of a multi-chunk summarization.
 */
export function buildSummarizationChunkPrompt(
  chunkContent: string,
  language: string,
  fileName: string,
  chunkIndex: number,
  totalChunks: number
): Array<{ role: 'system' | 'user'; content: string }> {
  let userMessage = `Task: Summarize the following portion of a document, extracting key points.\n\n`;
  userMessage += `Original File: ${fileName}\n`;
  userMessage += `Part: ${chunkIndex + 1} of ${totalChunks}\n`;
  userMessage += `Output Language: ${language}\n\n`;

  if (chunkIndex > 0) {
    userMessage += `Note: This is a continuation. Summarize only this portion without repeating earlier points.\n\n`;
  }

  userMessage += `Document Content (Part ${chunkIndex + 1}):\n---\n${chunkContent}\n---\n\n`;
  userMessage += `Please create a professional summary of the above content in ${language}.\n`;
  userMessage += `Extract the most important points, data, conclusions, and action items from this portion.\n`;
  userMessage += `Generate output for PDF/Word, PPT, and Excel formats.\n`;
  userMessage += `Return ONLY valid JSON matching the required schema.`;

  return [
    { role: 'system', content: SUMMARIZATION_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ];
}

export { SUMMARIZATION_SYSTEM_PROMPT };
