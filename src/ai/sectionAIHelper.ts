/**
 * AI Writer — Section AI Helper
 *
 * Provides per-section AI operations for the Editor:
 * - Improve: Enhance grammar, clarity, and professionalism
 * - Expand: Add more detail and depth
 * - Shorten: Make more concise
 * - Regenerate: Completely rewrite the section
 */

const LONGCAT_API_URL = 'https://api.longcat.chat/openai/v1/chat/completions';
const LONGCAT_API_KEY = 'ak_1qL7Vt7Kv4FJ6FM3rS1iV4M76z15d';
const LONGCAT_MODEL = 'LongCat-Flash-Chat';

import { recordTokenUsage, estimateTokens, canMakeRequest, getRemainingTokens } from '../utils/tokenUsage';

export interface SectionContent {
  heading: string;
  paragraph: string;
  bullets: string[];
}

type AIAction = 'improve' | 'expand' | 'shorten' | 'regenerate';

const ACTION_INSTRUCTIONS: Record<AIAction, string> = {
  improve: `Improve this section by enhancing grammar, clarity, professional tone, and readability. Keep the same meaning and structure but make it polished and professional. Fix any errors.`,
  expand: `Expand this section by adding more detail, examples, and depth. Keep the heading. Make the paragraph at least 2x longer. Add 2-3 more bullet points with useful information.`,
  shorten: `Make this section more concise. Keep only the most important information. Reduce the paragraph to 2-3 sentences max. Keep only the top 3 bullet points.`,
  regenerate: `Completely rewrite this section from scratch. Keep the same topic/heading theme but generate entirely new content. Be creative, professional, and informative.`,
};

/**
 * Run an AI action on a single section.
 */
export async function aiEditSection(
  action: AIAction,
  section: SectionContent,
  language: string,
  documentTitle: string
): Promise<SectionContent> {
  const hasTokens = await canMakeRequest();
  if (!hasTokens) {
    const remaining = await getRemainingTokens();
    throw new Error(`Daily limit reached. ${remaining} tokens remaining.`);
  }

  const systemPrompt = `You are AI Writer, a professional document editor. You must return ONLY valid JSON with this exact structure:
{
  "heading": "string",
  "paragraph": "string (minimum 2 sentences)",
  "bullets": ["string", "string", "string"]
}

Rules:
- Write in ${language}
- Keep professional tone
- Minimum 3 bullet points
- No markdown, no code fences, just raw JSON`;

  const userPrompt = `Document: "${documentTitle}"

${ACTION_INSTRUCTIONS[action]}

Current Section:
Heading: ${section.heading}
Paragraph: ${section.paragraph}
Bullets:
${section.bullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}

Return ONLY the improved JSON.`;

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
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: action === 'regenerate' ? 0.9 : 0.6,
      max_tokens: 1500,
    }),
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || '';
  const tokensUsed = data.usage?.total_tokens || estimateTokens(rawContent);
  await recordTokenUsage(tokensUsed);

  // Parse the JSON response
  let cleaned = rawContent.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const parsed = JSON.parse(cleaned);

  return {
    heading: parsed.heading || section.heading,
    paragraph: parsed.paragraph || section.paragraph,
    bullets: Array.isArray(parsed.bullets) && parsed.bullets.length > 0
      ? parsed.bullets
      : section.bullets,
  };
}
