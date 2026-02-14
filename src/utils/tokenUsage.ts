/**
 * AI Writer — Daily Token Usage Tracker
 *
 * Tracks daily token usage with a 5,000 token per day limit.
 * Resets automatically each calendar day.
 * Uses AsyncStorage for persistence.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_USAGE_KEY = '@ai_writer_token_usage';
const DAILY_TOKEN_LIMIT = 15000;

/**
 * Background bonus: extra buffer so in-progress chunks can finish.
 */
const BACKGROUND_BONUS = 2000;

interface TokenUsageData {
  date: string; // YYYY-MM-DD
  tokensUsed: number;
}

/**
 * Get today's date string in YYYY-MM-DD format.
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Load current token usage from storage.
 * Automatically resets if the stored date is not today.
 */
export async function getTokenUsage(): Promise<TokenUsageData> {
  try {
    const raw = await AsyncStorage.getItem(TOKEN_USAGE_KEY);
    if (raw) {
      const data: TokenUsageData = JSON.parse(raw);
      if (data.date === getTodayString()) {
        return data;
      }
    }
  } catch (error) {
    console.warn('Failed to load token usage:', error);
  }

  // New day or no data — return fresh
  return { date: getTodayString(), tokensUsed: 0 };
}

/**
 * Get the number of tokens remaining today (visible to user = hard limit).
 */
export async function getRemainingTokens(): Promise<number> {
  const usage = await getTokenUsage();
  return Math.max(0, DAILY_TOKEN_LIMIT - usage.tokensUsed);
}

/**
 * Get the effective remaining tokens including background bonus.
 * Used internally by canMakeRequest so large operations can finish.
 */
export async function getEffectiveRemainingTokens(): Promise<number> {
  const usage = await getTokenUsage();
  return Math.max(0, DAILY_TOKEN_LIMIT + BACKGROUND_BONUS - usage.tokensUsed);
}

/**
 * Check if the user can make a request.
 * Uses effective limit (with bonus) so chunked operations can complete.
 */
export async function canMakeRequest(): Promise<boolean> {
  const remaining = await getEffectiveRemainingTokens();
  return remaining > 0;
}

/**
 * Record token usage after an AI call.
 *
 * @param tokensUsed - Number of tokens consumed (estimated from response length).
 */
export async function recordTokenUsage(tokensUsed: number): Promise<void> {
  const usage = await getTokenUsage();
  usage.tokensUsed += tokensUsed;
  await AsyncStorage.setItem(TOKEN_USAGE_KEY, JSON.stringify(usage));
}

/**
 * Estimate token count from text (rough: ~4 chars per token).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate the total token cost of an AI request based on content length.
 * Accounts for system prompt (~400 tokens) + content + expected output (~4096 max).
 */
export function estimateRequestCost(contentLength: number): number {
  const inputTokens = 400 + Math.ceil(contentLength / 4);
  // Assume AI uses ~40% of max_tokens on average
  const estimatedOutputTokens = Math.round(4096 * 0.4);
  return inputTokens + estimatedOutputTokens;
}

/**
 * Calculate detailed token analysis for a file before processing.
 * Returns all info needed for the token calculator alert.
 */
export function calculateTokenAnalysis(
  contentLength: number,
  chunkCount: number
): {
  totalChars: number;
  chunks: number;
  tokensPerChunk: number;
  totalTokensNeeded: number;
} {
  const tokensPerChunk = estimateRequestCost(Math.ceil(contentLength / chunkCount));
  const totalTokensNeeded = tokensPerChunk * chunkCount;
  return {
    totalChars: contentLength,
    chunks: chunkCount,
    tokensPerChunk,
    totalTokensNeeded,
  };
}

/**
 * Get a formatted usage string for display.
 */
export async function getUsageDisplay(): Promise<{
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
}> {
  const usage = await getTokenUsage();
  const remaining = Math.max(0, DAILY_TOKEN_LIMIT - usage.tokensUsed);
  const percentage = Math.min(100, Math.round((usage.tokensUsed / DAILY_TOKEN_LIMIT) * 100));

  return {
    used: usage.tokensUsed,
    limit: DAILY_TOKEN_LIMIT,
    remaining,
    percentage,
  };
}

export { DAILY_TOKEN_LIMIT };
