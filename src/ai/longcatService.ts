/**
 * AI Writer — Longcat AI Service
 *
 * Handles communication with the Longcat AI API.
 * Supports three modes: Generate, Translate, Summarize.
 * Integrates daily 5K token limit tracking.
 */

import { buildPromptMessages } from './promptBuilder';
import { buildTranslationPrompt, buildTranslationChunkPrompt } from './translationPrompt';
import { buildSummarizationPrompt, buildSummarizationChunkPrompt } from './summarizationPrompt';
import { splitIntoChunks } from '../services/fileParserService';
import { parseAIResponse, AIWriterOutput } from './responseParser';
import {
  canMakeRequest,
  recordTokenUsage,
  estimateTokens,
  getRemainingTokens,
} from '../utils/tokenUsage';

// Configuration
const LONGCAT_API_URL = 'https://api.longcat.chat/openai/v1/chat/completions';
const LONGCAT_API_KEY = 'ak_1qL7Vt7Kv4FJ6FM3rS1iV4M76z15d';
const LONGCAT_MODEL = 'LongCat-Flash-Chat';

interface LongcatAPIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Core API call with token tracking and retry logic.
 */
async function callLongcatAPI(
  messages: Array<{ role: 'system' | 'user'; content: string }>
): Promise<AIWriterOutput> {
  // Check daily token limit (uses effective limit with bonus)
  const hasTokens = await canMakeRequest();
  if (!hasTokens) {
    const remaining = await getRemainingTokens();
    throw new Error(
      `Daily token limit reached. You have ${remaining} tokens remaining. Limit resets at midnight.`
    );
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(LONGCAT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LONGCAT_API_KEY}`,
        },
        body: JSON.stringify({
          model: LONGCAT_MODEL,
          messages,
          temperature: 0.5,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}: ${response.statusText}`);
      }

      const data: LongcatAPIResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('API returned no choices');
      }

      const rawContent = data.choices[0].message.content;

      // Track token usage
      const tokensUsed = data.usage?.total_tokens || estimateTokens(rawContent);
      await recordTokenUsage(tokensUsed);

      const parsed = parseAIResponse(rawContent);
      return parsed;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on token limit errors
      if (lastError.message.includes('Daily token limit')) {
        throw lastError;
      }

      console.warn(`Longcat AI attempt ${attempt}/${MAX_RETRIES} failed:`, lastError.message);

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw new Error(
    `Failed to generate content after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`
  );
}

/**
 * Generate new document content from a topic.
 */
export async function generateDocumentContent(
  userInput: string,
  language: string,
  uploadedContent?: string
): Promise<AIWriterOutput> {
  const messages = buildPromptMessages(userInput, language, uploadedContent);
  return callLongcatAPI(messages);
}

/**
 * Translate an uploaded document to another language.
 */
export async function translateDocument(
  uploadedContent: string,
  sourceLanguage: string,
  targetLanguage: string,
  fileName: string
): Promise<AIWriterOutput> {
  const messages = buildTranslationPrompt(
    uploadedContent,
    sourceLanguage,
    targetLanguage,
    fileName
  );
  return callLongcatAPI(messages);
}

/**
 * Summarize an uploaded document.
 */
export async function summarizeDocument(
  uploadedContent: string,
  language: string,
  fileName: string
): Promise<AIWriterOutput> {
  const messages = buildSummarizationPrompt(uploadedContent, language, fileName);
  return callLongcatAPI(messages);
}

// ─── Chunked Processing ─────────────────────────────────────────

/**
 * Merge multiple AI outputs into a single unified output.
 * Takes title/author/language from the first chunk,
 * concatenates all sections, slides, and rows.
 */
function mergeAIOutputs(outputs: AIWriterOutput[]): AIWriterOutput {
  if (outputs.length === 0) throw new Error('No AI outputs to merge.');
  if (outputs.length === 1) return outputs[0];

  return {
    pdf_word: {
      title: outputs[0].pdf_word.title,
      author: outputs[0].pdf_word.author,
      language: outputs[0].pdf_word.language,
      sections: outputs.flatMap(o => o.pdf_word.sections),
    },
    ppt: {
      slides: outputs.flatMap(o => o.ppt.slides),
    },
    excel: {
      headers: outputs[0].excel.headers,
      rows: outputs.flatMap(o => o.excel.rows),
    },
  };
}

/**
 * Translate a document in chunks, processing each chunk separately
 * and merging results into a single document.
 * For small documents (single chunk), falls back to single-call translation.
 *
 * @param onProgress - Called after each chunk with (currentChunk, totalChunks).
 * @param isCancelled - Optional callback to check if user cancelled.
 * @param onChunkComplete - Called after each chunk succeeds with (chunkIndex, output).
 * @param startFromChunk - Resume from this chunk index (skips already-completed chunks).
 * @param previousOutputs - Outputs from previously completed chunks (for checkpoint resume).
 */
export async function translateDocumentChunked(
  uploadedContent: string,
  sourceLanguage: string,
  targetLanguage: string,
  fileName: string,
  onProgress?: (current: number, total: number) => void,
  isCancelled?: () => boolean,
  onChunkComplete?: (chunkIndex: number, output: AIWriterOutput) => void,
  startFromChunk: number = 0,
  previousOutputs: AIWriterOutput[] = []
): Promise<AIWriterOutput> {
  const chunks = splitIntoChunks(uploadedContent);

  if (chunks.length === 1 && startFromChunk === 0) {
    onProgress?.(1, 1);
    return translateDocument(uploadedContent, sourceLanguage, targetLanguage, fileName);
  }

  const outputs: AIWriterOutput[] = [...previousOutputs];
  for (let i = startFromChunk; i < chunks.length; i++) {
    if (isCancelled?.()) throw new Error('Operation cancelled by user.');
    onProgress?.(i + 1, chunks.length);
    const messages = buildTranslationChunkPrompt(
      chunks[i], sourceLanguage, targetLanguage, fileName, i, chunks.length
    );
    const output = await callLongcatAPI(messages);
    outputs.push(output);
    onChunkComplete?.(i, output);
  }

  return mergeAIOutputs(outputs);
}

/**
 * Summarize a document in chunks, processing each chunk separately
 * and merging results into a single summary document.
 * For small documents (single chunk), falls back to single-call summarization.
 *
 * @param onProgress - Called after each chunk with (currentChunk, totalChunks).
 * @param isCancelled - Optional callback to check if user cancelled.
 * @param onChunkComplete - Called after each chunk succeeds with (chunkIndex, output).
 * @param startFromChunk - Resume from this chunk index (skips already-completed chunks).
 * @param previousOutputs - Outputs from previously completed chunks (for checkpoint resume).
 */
export async function summarizeDocumentChunked(
  uploadedContent: string,
  language: string,
  fileName: string,
  onProgress?: (current: number, total: number) => void,
  isCancelled?: () => boolean,
  onChunkComplete?: (chunkIndex: number, output: AIWriterOutput) => void,
  startFromChunk: number = 0,
  previousOutputs: AIWriterOutput[] = []
): Promise<AIWriterOutput> {
  const chunks = splitIntoChunks(uploadedContent);

  if (chunks.length === 1 && startFromChunk === 0) {
    onProgress?.(1, 1);
    return summarizeDocument(uploadedContent, language, fileName);
  }

  const outputs: AIWriterOutput[] = [...previousOutputs];
  for (let i = startFromChunk; i < chunks.length; i++) {
    if (isCancelled?.()) throw new Error('Operation cancelled by user.');
    onProgress?.(i + 1, chunks.length);
    const messages = buildSummarizationChunkPrompt(
      chunks[i], language, fileName, i, chunks.length
    );
    const output = await callLongcatAPI(messages);
    outputs.push(output);
    onChunkComplete?.(i, output);
  }

  return mergeAIOutputs(outputs);
}
