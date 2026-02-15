package com.aiwriter.app.ui.theme

import androidx.compose.ui.graphics.Color

// ── Brand — derived from logo's #353636 monochrome palette ──
val BrandCharcoal = Color(0xFF353636)       // Logo's primary solid color
val BrandCharcoalLight = Color(0xFF4A4B4C)  // Lighter variant for dark mode accent
val BrandHighlight = Color(0xFFE8E8EA)      // Light tint for selection states

// ── Light Theme ──
val LightBackground = Color(0xFFF7F7F8)
val LightSurface = Color(0xFFFFFFFF)
val LightSurfaceAlt = Color(0xFFF0F0F2)
val LightCard = Color(0xFFFFFFFF)
val LightTextPrimary = Color(0xFF1A1A1B)
val LightTextSecondary = Color(0xFF3D3E40)
val LightTextMuted = Color(0xFF808185)
val LightBorder = Color(0xFFD8D8DC)
val LightBorderLight = Color(0xFFEDEDF0)
val LightPlaceholder = Color(0xFFA0A1A5)
val LightHeaderBg = Color(0xFF353636)

// ── Dark Theme ──
val DarkBackground = Color(0xFF141415)
val DarkSurface = Color(0xFF1E1F20)
val DarkSurfaceAlt = Color(0xFF272829)
val DarkCard = Color(0xFF1E1F20)
val DarkTextPrimary = Color(0xFFF0F0F2)
val DarkTextSecondary = Color(0xFFCACBCE)
val DarkTextMuted = Color(0xFF808185)
val DarkBorder = Color(0xFF3D3E40)
val DarkBorderLight = Color(0xFF303132)
val DarkPlaceholder = Color(0xFF6B6D70)
val DarkHeaderBg = Color(0xFF1E1F20)

// ── Status ──
val Success = Color(0xFF22C55E)
val SuccessLight = Color(0xFFE8FAF0)
val Warning = Color(0xFFDD6B20)
val WarningLight = Color(0xFFFFF3E0)
val Danger = Color(0xFFE53E3E)
val DangerLight = Color(0xFFFFF0F0)

// ── App color scheme holder ──
data class AiWriterColors(
    val background: Color,
    val surface: Color,
    val surfaceAlt: Color,
    val card: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val textInverse: Color,
    val border: Color,
    val borderLight: Color,
    val primary: Color,
    val primaryLight: Color,
    val placeholder: Color,
    val headerBg: Color,
    val headerText: Color,
    val inputBg: Color,
    val inputBorder: Color
)

val LightColors = AiWriterColors(
    background = LightBackground,
    surface = LightSurface,
    surfaceAlt = LightSurfaceAlt,
    card = LightCard,
    textPrimary = LightTextPrimary,
    textSecondary = LightTextSecondary,
    textMuted = LightTextMuted,
    textInverse = Color.White,
    border = LightBorder,
    borderLight = LightBorderLight,
    primary = BrandCharcoal,
    primaryLight = BrandHighlight,
    placeholder = LightPlaceholder,
    headerBg = LightHeaderBg,
    headerText = Color.White,
    inputBg = LightSurface,
    inputBorder = LightBorder
)

val DarkColors = AiWriterColors(
    background = DarkBackground,
    surface = DarkSurface,
    surfaceAlt = DarkSurfaceAlt,
    card = DarkCard,
    textPrimary = DarkTextPrimary,
    textSecondary = DarkTextSecondary,
    textMuted = DarkTextMuted,
    textInverse = LightTextPrimary,
    border = DarkBorder,
    borderLight = DarkBorderLight,
    primary = Color.White,
    primaryLight = Color(0xFF2A2B2C),
    placeholder = DarkPlaceholder,
    headerBg = DarkHeaderBg,
    headerText = Color.White,
    inputBg = DarkSurface,
    inputBorder = DarkBorder
)
