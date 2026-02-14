/**
 * AI Writer — Longcat AI Service
 *
 * Handles communication with the Longcat AI API.
 * Supports three modes: Generate, Translate, Summarize.
 * Integrates daily 5K token limit tracking.
 */

import { buildPromptMessages } from './promptBuilder';
import { buildTranslationPrompt } from './translationPrompt';
import { buildSummarizationPrompt } from './summarizationPrompt';
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

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Core API call with token tracking and retry logic.
 */
async function callLongcatAPI(
  messages: Array<{ role: 'system' | 'user'; content: string }>
): Promise<AIWriterOutput> {
  // Check daily token limit
  const hasTokens = await canMakeRequest();
  if (!hasTokens) {
    const remaining = await getRemainingTokens();
    throw new Error(
      `Daily token limit reached (5,000 tokens/day). You have ${remaining} tokens remaining. Limit resets at midnight.`
    );
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(LONGCAT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LONGCAT_API_KEY}`,
        },
        body: JSON.stringify({
          model: LONGCAT_MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

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
