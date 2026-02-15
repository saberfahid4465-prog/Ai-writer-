package com.aiwriter.app.util

import android.content.Context
import android.content.SharedPreferences
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class PreferencesManager private constructor(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("ai_writer_prefs", Context.MODE_PRIVATE)

    // ── Theme ──
    var themeMode: String
        get() = prefs.getString("theme_mode", "system") ?: "system"
        set(value) = prefs.edit().putString("theme_mode", value).apply()

    // ── Language ──
    var appLanguage: String
        get() = prefs.getString("app_language", "en") ?: "en"
        set(value) = prefs.edit().putString("app_language", value).apply()

    // ── Token Usage ──
    val dailyTokenLimit: Int get() = 5000
    private val backgroundBonus: Int get() = 500

    val effectiveTokenLimit: Int get() = dailyTokenLimit + backgroundBonus

    var tokensUsedToday: Int
        get() {
            checkDayReset()
            return prefs.getInt("tokens_used", 0)
        }
        set(value) = prefs.edit().putInt("tokens_used", value).apply()

    private var lastUsageDate: String
        get() = prefs.getString("last_usage_date", "") ?: ""
        set(value) = prefs.edit().putString("last_usage_date", value).apply()

    fun addTokenUsage(tokens: Int) {
        checkDayReset()
        tokensUsedToday = tokensUsedToday + tokens
    }

    fun hasTokenBudget(estimatedCost: Int): Boolean {
        return tokensUsedToday + estimatedCost <= effectiveTokenLimit
    }

    fun getRemainingTokens(): Int {
        return (effectiveTokenLimit - tokensUsedToday).coerceAtLeast(0)
    }

    private fun checkDayReset() {
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        if (lastUsageDate != today) {
            prefs.edit()
                .putInt("tokens_used", 0)
                .putString("last_usage_date", today)
                .apply()
        }
    }

    // ── History ──
    fun getHistoryJson(): String = prefs.getString("history", "[]") ?: "[]"
    fun setHistoryJson(json: String) = prefs.edit().putString("history", json).apply()

    companion object {
        @Volatile
        private var INSTANCE: PreferencesManager? = null

        fun getInstance(context: Context): PreferencesManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: PreferencesManager(context.applicationContext).also { INSTANCE = it }
            }
        }
    }
}
