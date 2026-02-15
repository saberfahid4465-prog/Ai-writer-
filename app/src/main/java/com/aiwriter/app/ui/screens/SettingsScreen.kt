package com.aiwriter.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiwriter.app.ui.components.LanguagePicker
import com.aiwriter.app.ui.theme.*
import com.aiwriter.app.util.LanguageConfig
import com.aiwriter.app.util.PreferencesManager

@Composable
fun SettingsScreen() {
    val colors = LocalAppColors.current
    val context = LocalContext.current
    val prefs = PreferencesManager.getInstance(context)

    var themeMode by remember { mutableStateOf(prefs.themeMode) }
    var appLanguage by remember {
        mutableStateOf(
            LanguageConfig.appLanguages.find { it.code == prefs.appLanguage }
                ?: LanguageConfig.appLanguages[0]
        )
    }
    var showLanguagePicker by remember { mutableStateOf(false) }

    val tokensUsed = prefs.tokensUsedToday
    val tokenLimit = prefs.dailyTokenLimit
    val progress = (tokensUsed.toFloat() / tokenLimit).coerceIn(0f, 1f)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            "Settings",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = colors.textPrimary,
            modifier = Modifier.padding(bottom = 20.dp)
        )

        // Theme section
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = colors.card),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Theme", fontWeight = FontWeight.SemiBold, color = colors.textPrimary, fontSize = 16.sp)
                Spacer(Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf("light" to "Light", "dark" to "Dark", "system" to "System").forEach { (mode, label) ->
                        val isSelected = themeMode == mode
                        val bgColor = if (isSelected) colors.primaryLight else colors.surfaceAlt
                        val borderColor = if (isSelected) colors.primary else colors.border

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .border(1.5.dp, borderColor, RoundedCornerShape(10.dp))
                                .background(bgColor)
                                .clickable {
                                    themeMode = mode
                                    prefs.themeMode = mode
                                }
                                .padding(vertical = 12.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                label,
                                color = if (isSelected) colors.primary else colors.textSecondary,
                                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                fontSize = 14.sp
                            )
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        // App Language
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = colors.card),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("App Language", fontWeight = FontWeight.SemiBold, color = colors.textPrimary, fontSize = 16.sp)
                Spacer(Modifier.height(8.dp))
                LanguagePicker(
                    languages = LanguageConfig.appLanguages,
                    selected = appLanguage,
                    onSelected = {
                        appLanguage = it
                        prefs.appLanguage = it.code
                    }
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        // Token Usage
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = colors.card),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Token Usage", fontWeight = FontWeight.SemiBold, color = colors.textPrimary, fontSize = 16.sp)
                    Text("Resets at midnight", color = colors.textMuted, fontSize = 12.sp)
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
                    Text("$tokensUsed / $tokenLimit tokens", color = colors.textMuted, fontSize = 13.sp)
                    Text("${(progress * 100).toInt()}%", color = colors.textMuted, fontSize = 13.sp)
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        // Premium
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = colors.primaryLight),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Star, "Premium", tint = colors.primary, modifier = Modifier.size(24.dp))
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("Premium", fontWeight = FontWeight.SemiBold, color = colors.textPrimary,  fontSize = 16.sp)
                    Text("Coming Soon", color = colors.textMuted, fontSize = 13.sp)
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        // Legal
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = colors.card),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column {
                ListItem(
                    headlineContent = { Text("Privacy Policy", color = colors.textPrimary) },
                    leadingContent = { Icon(Icons.Default.PrivacyTip, "Privacy", tint = colors.textMuted) },
                    trailingContent = { Icon(Icons.Default.ChevronRight, "Go", tint = colors.textMuted) },
                    modifier = Modifier.clickable { /* Open privacy policy URL */ }
                )
                HorizontalDivider(color = colors.borderLight)
                ListItem(
                    headlineContent = { Text("Terms of Service", color = colors.textPrimary) },
                    leadingContent = { Icon(Icons.Default.Gavel, "Terms", tint = colors.textMuted) },
                    trailingContent = { Icon(Icons.Default.ChevronRight, "Go", tint = colors.textMuted) },
                    modifier = Modifier.clickable { /* Open terms URL */ }
                )
            }
        }

        Spacer(Modifier.height(24.dp))

        // Footer
        Text(
            "AI Writer v2.0.0 • Powered by Longcat AI",
            color = colors.textMuted,
            fontSize = 12.sp,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )

        Spacer(Modifier.height(24.dp))
    }
}
