package com.aiwriter.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiwriter.app.ui.theme.*
import com.aiwriter.app.util.AppLanguageState
import com.aiwriter.app.util.LanguageConfig
import com.aiwriter.app.util.LocalStrings
import com.aiwriter.app.util.PreferencesManager

@Composable
fun SettingsScreen(
    onNavigateToPrivacy: () -> Unit = {},
    onNavigateToTerms: () -> Unit = {}
) {
    val colors = LocalAppColors.current
    val context = LocalContext.current
    val prefs = PreferencesManager.getInstance(context)
    val s = LocalStrings.current

    var themeMode by remember { mutableStateOf(ThemeState.themeMode) }
    var appLanguage by remember {
        mutableStateOf(
            LanguageConfig.appLanguages.find { it.code == prefs.appLanguage }
                ?: LanguageConfig.appLanguages[0]
        )
    }

    val tokensUsed = prefs.tokensUsedToday
    val tokenLimit = prefs.dailyTokenLimit
    val progress = (tokensUsed.toFloat() / tokenLimit).coerceIn(0f, 1f)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        // Header
        Text(
            s.settings,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = colors.textPrimary
        )
        Text(
            s.customizeExperience,
            fontSize = 14.sp,
            color = colors.textMuted,
            modifier = Modifier.padding(top = 4.dp, bottom = 24.dp)
        )

        // ── Appearance ──
        SettingsSectionHeader(icon = Icons.Outlined.Palette, title = s.appearance, colors = colors)
        Spacer(Modifier.height(8.dp))
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = colors.card),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(s.theme, fontWeight = FontWeight.Medium, color = colors.textPrimary, fontSize = 15.sp)
                Spacer(Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    data class ThemeOption(val mode: String, val label: String, val icon: ImageVector)
                    listOf(
                        ThemeOption("light", s.light, Icons.Outlined.LightMode),
                        ThemeOption("dark", s.dark, Icons.Outlined.DarkMode),
                        ThemeOption("system", s.auto, Icons.Outlined.SettingsBrightness)
                    ).forEach { option ->
                        val isSelected = themeMode == option.mode
                        val bgColor = if (isSelected) colors.primary.copy(alpha = 0.12f) else colors.surfaceAlt
                        val borderColor = if (isSelected) colors.primary else colors.borderLight
                        val contentColor = if (isSelected) colors.primary else colors.textSecondary

                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(14.dp))
                                .border(1.5.dp, borderColor, RoundedCornerShape(14.dp))
                                .background(bgColor)
                                .clickable {
                                    themeMode = option.mode
                                    prefs.themeMode = option.mode
                                    ThemeState.themeMode = option.mode
                                }
                                .padding(vertical = 16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                option.icon,
                                option.label,
                                tint = contentColor,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(Modifier.height(6.dp))
                            Text(
                                option.label,
                                color = contentColor,
                                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                fontSize = 13.sp
                            )
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(20.dp))

        // ── Language ──
        SettingsSectionHeader(icon = Icons.Outlined.Language, title = s.language, colors = colors)
        Spacer(Modifier.height(8.dp))
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = colors.card),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(s.appLanguage, fontWeight = FontWeight.Medium, color = colors.textPrimary, fontSize = 15.sp)
                Text(
                    s.languageHint,
                    color = colors.textMuted,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 2.dp, bottom = 12.dp)
                )

                // Language dropdown
                var expanded by remember { mutableStateOf(false) }
                val languages = LanguageConfig.appLanguages

                Box(modifier = Modifier.fillMaxWidth()) {
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .border(1.dp, colors.borderLight, RoundedCornerShape(12.dp))
                            .clickable { expanded = true },
                        color = colors.surfaceAlt
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    appLanguage.nativeName,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = colors.textPrimary
                                )
                                Text(
                                    appLanguage.name,
                                    fontSize = 12.sp,
                                    color = colors.textMuted
                                )
                            }
                            Icon(
                                if (expanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                "Select",
                                tint = colors.textMuted
                            )
                        }
                    }

                    DropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false },
                        modifier = Modifier
                            .fillMaxWidth(0.85f)
                            .heightIn(max = 350.dp)
                    ) {
                        languages.forEach { lang ->
                            val isSelected = lang.code == appLanguage.code
                            DropdownMenuItem(
                                text = {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text(
                                                lang.nativeName,
                                                fontSize = 14.sp,
                                                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                                color = if (isSelected) colors.primary else colors.textPrimary
                                            )
                                            Text(
                                                lang.name,
                                                fontSize = 11.sp,
                                                color = colors.textMuted
                                            )
                                        }
                                        if (isSelected) {
                                            Icon(
                                                Icons.Default.Check,
                                                "Selected",
                                                tint = AccentTeal,
                                                modifier = Modifier.size(20.dp)
                                            )
                                        }
                                    }
                                },
                                onClick = {
                                    appLanguage = lang
                                    prefs.appLanguage = lang.code
                                    AppLanguageState.languageCode = lang.code
                                    expanded = false
                                }
                            )
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(20.dp))

        // ── Usage ──
        SettingsSectionHeader(icon = Icons.Outlined.DataUsage, title = s.usage, colors = colors)
        Spacer(Modifier.height(8.dp))
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = colors.card),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(s.dailyTokenUsage, fontWeight = FontWeight.Medium, color = colors.textPrimary, fontSize = 15.sp)
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = if (progress > 0.9f) Danger.copy(alpha = 0.15f) else colors.primary.copy(alpha = 0.1f)
                    ) {
                        Text(
                            "${(progress * 100).toInt()}%",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (progress > 0.9f) Danger else colors.primary,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                }
                Spacer(Modifier.height(12.dp))
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    color = if (progress > 0.9f) Danger else colors.primary,
                    trackColor = colors.borderLight
                )
                Spacer(Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("$tokensUsed / $tokenLimit", color = colors.textMuted, fontSize = 12.sp)
                    Text(s.resetsAtMidnight, color = colors.textMuted, fontSize = 12.sp)
                }
            }
        }

        Spacer(Modifier.height(20.dp))

        // ── Premium ──
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = colors.primary.copy(alpha = 0.08f)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(colors.primary.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Star, s.premium, tint = colors.primary, modifier = Modifier.size(24.dp))
                }
                Spacer(Modifier.width(14.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(s.premium, fontWeight = FontWeight.SemiBold, color = colors.textPrimary, fontSize = 16.sp)
                    Text(s.premiumDesc, color = colors.textMuted, fontSize = 13.sp)
                }
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = colors.primary.copy(alpha = 0.15f)
                ) {
                    Text(
                        s.soon,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.primary,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }
            }
        }

        Spacer(Modifier.height(20.dp))

        // ── Legal ──
        SettingsSectionHeader(icon = Icons.Outlined.Policy, title = s.legal, colors = colors)
        Spacer(Modifier.height(8.dp))
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = colors.card),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column {
                ListItem(
                    headlineContent = { Text(s.privacyPolicy, color = colors.textPrimary, fontSize = 15.sp) },
                    supportingContent = { Text(s.privacyDesc, color = colors.textMuted, fontSize = 12.sp) },
                    leadingContent = {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(colors.surfaceAlt),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Outlined.PrivacyTip, s.privacyPolicy, tint = colors.textMuted, modifier = Modifier.size(18.dp))
                        }
                    },
                    trailingContent = { Icon(Icons.Default.ChevronRight, "Go", tint = colors.textMuted) },
                    modifier = Modifier.clickable { onNavigateToPrivacy() }
                )
                HorizontalDivider(color = colors.borderLight, modifier = Modifier.padding(horizontal = 16.dp))
                ListItem(
                    headlineContent = { Text(s.termsOfService, color = colors.textPrimary, fontSize = 15.sp) },
                    supportingContent = { Text(s.termsDesc, color = colors.textMuted, fontSize = 12.sp) },
                    leadingContent = {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(colors.surfaceAlt),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Outlined.Gavel, s.termsOfService, tint = colors.textMuted, modifier = Modifier.size(18.dp))
                        }
                    },
                    trailingContent = { Icon(Icons.Default.ChevronRight, "Go", tint = colors.textMuted) },
                    modifier = Modifier.clickable { onNavigateToTerms() }
                )
            }
        }

        Spacer(Modifier.height(32.dp))

        // Footer
        Text(
            s.appVersion,
            color = colors.textMuted,
            fontSize = 12.sp,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )
        Text(
            s.poweredBy,
            color = colors.textMuted.copy(alpha = 0.6f),
            fontSize = 11.sp,
            modifier = Modifier.align(Alignment.CenterHorizontally).padding(top = 2.dp)
        )

        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun SettingsSectionHeader(icon: ImageVector, title: String, colors: AiWriterColors) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, title, tint = colors.primary, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text(
            title.uppercase(),
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = colors.textMuted,
            letterSpacing = 1.sp
        )
    }
}
