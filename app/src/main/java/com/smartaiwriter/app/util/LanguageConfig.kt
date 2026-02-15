package com.smartaiwriter.app.util

data class LanguageItem(
    val code: String,
    val name: String,
    val nativeName: String,
    val isRtl: Boolean = false
)

object LanguageConfig {
    /** Languages available for content generation (32) */
    val contentLanguages = listOf(
        LanguageItem("en", "English", "English"),
        LanguageItem("es", "Spanish", "Español"),
        LanguageItem("fr", "French", "Français"),
        LanguageItem("de", "German", "Deutsch"),
        LanguageItem("zh", "Chinese", "中文"),
        LanguageItem("ja", "Japanese", "日本語"),
        LanguageItem("ko", "Korean", "한국어"),
        LanguageItem("ar", "Arabic", "العربية", isRtl = true),
        LanguageItem("ru", "Russian", "Русский"),
        LanguageItem("hi", "Hindi", "हिन्दी"),
        LanguageItem("pt", "Portuguese", "Português"),
        LanguageItem("it", "Italian", "Italiano"),
        LanguageItem("tr", "Turkish", "Türkçe"),
        LanguageItem("nl", "Dutch", "Nederlands"),
        LanguageItem("pl", "Polish", "Polski"),
        LanguageItem("sv", "Swedish", "Svenska"),
        LanguageItem("th", "Thai", "ไทย"),
        LanguageItem("vi", "Vietnamese", "Tiếng Việt"),
        LanguageItem("id", "Indonesian", "Bahasa Indonesia"),
        LanguageItem("he", "Hebrew", "עברית", isRtl = true),
        LanguageItem("ms", "Malay", "Bahasa Melayu"),
        LanguageItem("bn", "Bengali", "বাংলা"),
        LanguageItem("ur", "Urdu", "اردو", isRtl = true),
        LanguageItem("fa", "Persian", "فارسی", isRtl = true),
        LanguageItem("uk", "Ukrainian", "Українська"),
        LanguageItem("ro", "Romanian", "Română"),
        LanguageItem("cs", "Czech", "Čeština"),
        LanguageItem("el", "Greek", "Ελληνικά"),
        LanguageItem("hu", "Hungarian", "Magyar"),
        LanguageItem("fi", "Finnish", "Suomi"),
        LanguageItem("da", "Danish", "Dansk"),
        LanguageItem("no", "Norwegian", "Norsk")
    )

    /** Languages available for app UI (15) */
    val appLanguages = listOf(
        LanguageItem("en", "English", "English"),
        LanguageItem("ar", "Arabic", "العربية", isRtl = true),
        LanguageItem("es", "Spanish", "Español"),
        LanguageItem("fr", "French", "Français"),
        LanguageItem("de", "German", "Deutsch"),
        LanguageItem("zh", "Chinese", "中文"),
        LanguageItem("ja", "Japanese", "日本語"),
        LanguageItem("ko", "Korean", "한국어"),
        LanguageItem("ru", "Russian", "Русский"),
        LanguageItem("hi", "Hindi", "हिन्दी"),
        LanguageItem("pt", "Portuguese", "Português"),
        LanguageItem("tr", "Turkish", "Türkçe"),
        LanguageItem("it", "Italian", "Italiano"),
        LanguageItem("fa", "Persian", "فارسی", isRtl = true),
        LanguageItem("ur", "Urdu", "اردو", isRtl = true)
    )

    fun isRtlLanguage(code: String): Boolean {
        return contentLanguages.find { it.code == code }?.isRtl == true
    }

    fun getLanguageName(code: String): String {
        return contentLanguages.find { it.code == code }?.name ?: code
    }
}
