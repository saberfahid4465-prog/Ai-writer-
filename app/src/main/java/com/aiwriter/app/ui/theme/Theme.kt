package com.aiwriter.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import com.aiwriter.app.util.PreferencesManager

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

@Composable
fun AiWriterTheme(
    preferencesManager: PreferencesManager,
    content: @Composable () -> Unit
) {
    val themeMode = preferencesManager.themeMode
    val isDark = when (themeMode) {
        "dark" -> true
        "light" -> false
        else -> isSystemInDarkTheme()
    }

    val colorScheme = if (isDark) DarkColorScheme else LightColorScheme
    val appColors = if (isDark) DarkColors else LightColors

    CompositionLocalProvider(LocalAppColors provides appColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            content = content
        )
    }
}
