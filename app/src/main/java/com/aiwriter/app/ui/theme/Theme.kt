package com.aiwriter.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import com.aiwriter.app.util.AppLanguageState
import com.aiwriter.app.util.LocalStrings
import com.aiwriter.app.util.getStringsForLanguage

private val LightColorScheme = lightColorScheme(
    primary = BrandCharcoal,
    onPrimary = Color.White,
    surface = LightSurface,
    onSurface = LightTextPrimary,
    background = LightBackground,
    onBackground = LightTextPrimary,
    surfaceVariant = LightSurfaceAlt,
    outline = LightBorder
)

private val DarkColorScheme = darkColorScheme(
    primary = Color.White,
    onPrimary = DarkBackground,
    surface = DarkSurface,
    onSurface = DarkTextPrimary,
    background = DarkBackground,
    onBackground = DarkTextPrimary,
    surfaceVariant = DarkSurfaceAlt,
    outline = DarkBorder
)

val LocalAppColors = staticCompositionLocalOf { LightColors }
val LocalIsDarkTheme = compositionLocalOf { false }

/** Mutable global so Settings toggles trigger instant recomposition */
object ThemeState {
    var themeMode by mutableStateOf("system")
}

@Composable
fun AiWriterTheme(
    content: @Composable () -> Unit
) {
    val isDark = when (ThemeState.themeMode) {
        "dark" -> true
        "light" -> false
        else -> isSystemInDarkTheme()
    }

    val colorScheme = if (isDark) DarkColorScheme else LightColorScheme
    val appColors = if (isDark) DarkColors else LightColors
    val strings = getStringsForLanguage(AppLanguageState.languageCode)

    CompositionLocalProvider(
        LocalAppColors provides appColors,
        LocalIsDarkTheme provides isDark,
        LocalStrings provides strings
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            content = content
        )
    }
}
