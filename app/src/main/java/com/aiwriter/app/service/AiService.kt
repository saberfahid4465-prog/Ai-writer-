package com.aiwriter.app.service

import com.aiwriter.app.data.remote.*
import com.google.gson.Gson
import kotlinx.coroutines.delay
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object AiService {
    private const val API_URL = "https://api.longcat.chat/openai/v1/"
    private const val API_KEY = "ak_1qL7Vt7Kv4FJ6FM3rS1iV4M76z15d"
    private const val PEXELS_URL = "https://api.pexels.com/v1/"
    private const val PEXELS_KEY = "0d2c1eWervvFsosDO8VA1TXdi0z0lVlUmqHCrWo2CLWP0YT2249f9fvf"
    private const val MAX_RETRIES = 2
    private val gson = Gson()

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val longcatApi: LongcatApi = Retrofit.Builder()
        .baseUrl(API_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(LongcatApi::class.java)

    private val pexelsApi: PexelsApi = Retrofit.Builder()
        .baseUrl(PEXELS_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(PexelsApi::class.java)

    // ── Generate Document Content ──
    suspend fun generateContent(
        topic: String,
        language: String,
        uploadedContent: String? = null
    ): Result<Pair<AiWriterOutput, Usage>> {
        val systemPrompt = buildGenerateSystemPrompt()
        val userMessage = buildGenerateUserMessage(topic, language, uploadedContent)
        return callAiAndParse(systemPrompt, userMessage, 0.5, 4096)
    }

    // ── Translate Content ──
    suspend fun translateContent(
        text: String,
        sourceLanguage: String,
        targetLanguage: String
    ): Result<Pair<AiWriterOutput, Usage>> {
        val systemPrompt = buildTranslateSystemPrompt(sourceLanguage, targetLanguage)
        val userMessage = "Translate the following content from $sourceLanguage to $targetLanguage:\n\n$text"
        return callAiAndParse(systemPrompt, userMessage, 0.5, 4096)
    }

    // ── Summarize Content ──
    suspend fun summarizeContent(
        text: String,
        language: String
    ): Result<Pair<AiWriterOutput, Usage>> {
        val systemPrompt = buildSummarizeSystemPrompt(language)
        val userMessage = "Summarize the following content:\n\n$text"
        return callAiAndParse(systemPrompt, userMessage, 0.5, 4096)
    }

    // ── Section AI Edit ──
    suspend fun editSection(
        section: DocSection,
        action: String,
        language: String
    ): Result<Pair<SectionEditResponse, Usage>> {
        val instruction = when (action) {
            "improve" -> "Enhance the grammar, clarity, and professional tone of this section. Keep the same meaning but make it more polished."
            "expand" -> "Make the paragraph 2x longer with more detail. Add 2-3 more bullet points."
            "shorten" -> "Reduce the paragraph to 2-3 sentences. Keep only the top 3 bullet points."
            "regenerate" -> "Completely rewrite this section from scratch with a fresh perspective."
            else -> return Result.failure(Exception("Unknown action: $action"))
        }

        val temperature = if (action == "regenerate") 0.9 else 0.6

        val systemPrompt = """You are a professional document editor. $instruction
Output language: $language
Return ONLY a valid JSON object with these keys:
- "heading": string
- "paragraph": string
- "bullets": string[]
No markdown fences. No extra text."""

        val userMessage = """Section to edit:
Heading: ${section.heading}
Paragraph: ${section.paragraph}
Bullets: ${section.bullets.joinToString("\n")}"""

        return callAiForSectionEdit(systemPrompt, userMessage, temperature)
    }

    // ── Fetch Pexels Image URL ──
    suspend fun fetchImageUrl(keyword: String): String? {
        return try {
            val response = pexelsApi.searchPhotos(apiKey = PEXELS_KEY, query = keyword)
            if (response.isSuccessful) {
                response.body()?.photos?.firstOrNull()?.src?.small
            } else null
        } catch (e: Exception) {
            null
        }
    }

    // ── Download image bytes ──
    suspend fun downloadImage(url: String): ByteArray? {
        return try {
            val request = okhttp3.Request.Builder().url(url).build()
            val response = okHttpClient.newCall(request).execute()
            if (response.isSuccessful) response.body?.bytes() else null
        } catch (e: Exception) {
            null
        }
    }

    // ── Private: Call AI and parse full output ──
    private suspend fun callAiAndParse(
        systemPrompt: String,
        userMessage: String,
        temperature: Double,
        maxTokens: Int
    ): Result<Pair<AiWriterOutput, Usage>> {
        for (attempt in 1..MAX_RETRIES) {
            try {
                val request = ChatRequest(
                    messages = listOf(
                        ChatMessage("system", systemPrompt),
                        ChatMessage("user", userMessage)
                    ),
                    temperature = temperature,
                    maxTokens = maxTokens
                )
                val response = longcatApi.chatCompletion("Bearer $API_KEY", request)
                if (response.isSuccessful) {
                    val body = response.body() ?: return Result.failure(Exception("Empty response"))
                    val content = body.choices?.firstOrNull()?.message?.content
                        ?: return Result.failure(Exception("No content in response"))
                    val usage = body.usage ?: Usage()
                    val parsed = ResponseParser.parseAiOutput(content)
                    return Result.success(Pair(parsed, usage))
                } else {
                    if (attempt == MAX_RETRIES) {
                        return Result.failure(Exception("API error: ${response.code()} ${response.message()}"))
                    }
                }
            } catch (e: Exception) {
                if (attempt == MAX_RETRIES) return Result.failure(e)
            }
            delay(500L * attempt)
        }
        return Result.failure(Exception("Max retries exceeded"))
    }

    // ── Private: Call AI for section edit ──
    private suspend fun callAiForSectionEdit(
        systemPrompt: String,
        userMessage: String,
        temperature: Double
    ): Result<Pair<SectionEditResponse, Usage>> {
        for (attempt in 1..MAX_RETRIES) {
            try {
                val request = ChatRequest(
                    messages = listOf(
                        ChatMessage("system", systemPrompt),
                        ChatMessage("user", userMessage)
                    ),
                    temperature = temperature,
                    maxTokens = 1500
                )
                val response = longcatApi.chatCompletion("Bearer $API_KEY", request)
                if (response.isSuccessful) {
                    val body = response.body() ?: return Result.failure(Exception("Empty response"))
                    val content = body.choices?.firstOrNull()?.message?.content
                        ?: return Result.failure(Exception("No content"))
                    val usage = body.usage ?: Usage()
                    val cleaned = ResponseParser.stripMarkdownFences(content)
                    val parsed = try {
                        gson.fromJson(cleaned, SectionEditResponse::class.java)
                    } catch (e: Exception) {
                        SectionEditResponse(heading = "Section", paragraph = cleaned)
                    }
                    return Result.success(Pair(parsed, usage))
                }
            } catch (e: Exception) {
                if (attempt == MAX_RETRIES) return Result.failure(e)
            }
            delay(500L * attempt)
        }
        return Result.failure(Exception("Max retries exceeded"))
    }

    // ── Prompt builders ──

    private fun buildGenerateSystemPrompt(): String = """You are a professional document generator AI. Generate comprehensive content and return ONLY a valid JSON object (no markdown fences, no extra text) with three top-level keys:

1. "pdf_word" — for PDF and Word documents:
   {
     "title": "string",
     "author": "AI Writer",
     "language": "string",
     "sections": [
       {
         "heading": "string",
         "paragraph": "string (2-3 sentences)",
         "bullets": ["string", "string", "string"],
         "image_keyword": "string (one word for image search)"
       }
     ]
   }
   Requirements: 3-5 sections minimum. Each paragraph: 2-3 sentences. Each section: 3 bullet points.

2. "ppt" — for PowerPoint:
   {
     "slides": [
       {
         "title": "string",
         "bullets": ["string", "string", "string"],
         "image_keyword": "string"
       }
     ]
   }

3. "excel" — for Excel:
   {
     "headers": ["Section", "Key Points", "Image Keyword"],
     "rows": [["string", "string", "string"]]
   }

CRITICAL: Return ONLY valid JSON. No markdown code fences. No explanatory text."""

    private fun buildGenerateUserMessage(
        topic: String,
        language: String,
        uploadedContent: String?
    ): String {
        val sb = StringBuilder()
        sb.append("Topic / Instructions: $topic\n")
        sb.append("Output Language: $language\n")
        if (!uploadedContent.isNullOrBlank()) {
            sb.append("Uploaded Content:\n---\n$uploadedContent\n---\n")
        }
        sb.append("Please generate comprehensive professional documents about this topic.\n")
        sb.append("Generate all output formats: PDF/Word, PPT, and Excel.\n")
        sb.append("Return ONLY valid JSON matching the required schema.")
        return sb.toString()
    }

    private fun buildTranslateSystemPrompt(source: String, target: String): String = """You are a professional translator AI. Translate content from $source to $target.

You understand structure markers: [TITLE], [H1], [H2], [H3], [P], [LIST], [Slide N], [Sheet N].
Preserve all markers exactly. Only translate text after markers.

After translating, return ONLY a valid JSON object with the same structure as the document generator:
{
  "pdf_word": { "title": "...", "author": "AI Writer", "language": "$target", "sections": [...] },
  "ppt": { "slides": [...] },
  "excel": { "headers": [...], "rows": [...] }
}

CRITICAL: Return ONLY valid JSON. No markdown code fences."""

    private fun buildSummarizeSystemPrompt(language: String): String = """You are a professional summarization AI. Extract key points from the given content.
Target: 30-40% of original length for longer documents, 1-2 sections for short documents.
Output language: $language

Return ONLY a valid JSON object:
{
  "pdf_word": { "title": "Summary: ...", "author": "AI Writer", "language": "$language", "sections": [...] },
  "ppt": { "slides": [...] },
  "excel": { "headers": ["Section", "Key Points", "Image Keyword"], "rows": [...] }
}

CRITICAL: Return ONLY valid JSON. No markdown code fences."""

    // ── Token cost estimation ──
    fun estimateTokenCost(contentLength: Int): Int {
        val systemPromptTokens = 400
        val inputTokens = (contentLength + 3) / 4
        val outputTokens = (4096 * 0.4).toInt()
        return systemPromptTokens + inputTokens + outputTokens
    }
}
