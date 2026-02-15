package com.aiwriter.app.ui.screens

import android.app.Activity
import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
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
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiwriter.app.R
import com.aiwriter.app.service.FileParserService
import com.aiwriter.app.ui.components.FormatPicker
import com.aiwriter.app.ui.components.LanguagePicker
import com.aiwriter.app.ui.theme.LocalAppColors
import com.aiwriter.app.ui.theme.LocalIsDarkTheme
import com.aiwriter.app.util.LanguageConfig
import com.aiwriter.app.util.PreferencesManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun HomeScreen(
    onGenerate: (topic: String, language: String, languageCode: String, formats: Set<String>, content: String?, fileName: String?) -> Unit
) {
    val colors = LocalAppColors.current
    val isDark = LocalIsDarkTheme.current
    val context = LocalContext.current
    val prefs = PreferencesManager.getInstance(context)
    val scope = rememberCoroutineScope()

    var topic by remember { mutableStateOf("") }
    var selectedLanguage by remember { mutableStateOf(LanguageConfig.contentLanguages[0]) }
    var selectedFormats by remember { mutableStateOf(setOf("pdf", "docx")) }
    var uploadedContent by remember { mutableStateOf<String?>(null) }
    var uploadedFileName by remember { mutableStateOf<String?>(null) }
    var isParsingFile by remember { mutableStateOf(false) }

    // Subtle pulse animation for generate button
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val btnScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.02f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = EaseInOutCubic),
            repeatMode = RepeatMode.Reverse
        ),
        label = "btnPulse"
    )

    val filePicker = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            result.data?.data?.let { uri ->
                val name = uri.lastPathSegment ?: "uploaded_file"
                uploadedFileName = name
                isParsingFile = true
                scope.launch {
                    val parsed = withContext(Dispatchers.IO) {
                        FileParserService.parseFile(context, uri, name)
                    }
                    isParsingFile = false
                    parsed.onSuccess { uploadedContent = it }
                    parsed.onFailure { uploadedContent = null; uploadedFileName = null }
                }
            }
        }
    }

    val canSubmit = topic.length >= 3 || uploadedContent != null

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 16.dp)
    ) {
        // ── Header ──
        val logoRes = if (isDark) R.drawable.app_logo_white else R.drawable.app_logo
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(bottom = 2.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(if (isDark) Color(0xFF2A2A2A) else Color(0xFFF5F5F5)),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(id = logoRes),
                    contentDescription = "AI Writer",
                    modifier = Modifier.size(28.dp)
                )
            }
            Spacer(Modifier.width(12.dp))
            Column {
                Text(
                    "AI Writer",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textPrimary
                )
                Text(
                    "Create something amazing",
                    fontSize = 13.sp,
                    color = colors.textMuted,
                    lineHeight = 16.sp
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        // ── Token Usage Card ──
        val tokensUsed = prefs.tokensUsedToday
        val tokenLimit = prefs.dailyTokenLimit
        val progress = (tokensUsed.toFloat() / tokenLimit).coerceIn(0f, 1f)
        val remaining = tokenLimit - tokensUsed

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = if (isDark) Color(0xFF1E1E1E) else Color(0xFFF8F9FA)
            ),
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Circular progress
                Box(
                    modifier = Modifier.size(42.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(
                        progress = { progress },
                        modifier = Modifier.fillMaxSize(),
                        color = if (progress < 0.8f) colors.primary else Color(0xFFE57373),
                        trackColor = colors.borderLight,
                        strokeWidth = 4.dp
                    )
                    Text(
                        "${(progress * 100).toInt()}%",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )
                }
                Spacer(Modifier.width(14.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "Daily Credits",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.textPrimary
                    )
                    Text(
                        "$remaining tokens remaining",
                        fontSize = 12.sp,
                        color = colors.textMuted
                    )
                }
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = if (isDark) Color(0xFF2A2A2A) else Color(0xFFEEEEEE)
                ) {
                    Text(
                        "$tokensUsed / $tokenLimit",
                        fontSize = 11.sp,
                        color = colors.textMuted,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }
            }
        }

        Spacer(Modifier.height(20.dp))

        // ── Section: What to write ──
        SectionHeader(icon = Icons.Outlined.EditNote, title = "What to write", colors = colors)

        Spacer(Modifier.height(8.dp))

        OutlinedTextField(
            value = topic,
            onValueChange = { topic = it },
            placeholder = {
                Text(
                    "Describe your document topic, e.g.\n\"A business plan for an eco-friendly café\"",
                    color = colors.placeholder,
                    fontSize = 14.sp,
                    lineHeight = 20.sp
                )
            },
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 110.dp),
            shape = RoundedCornerShape(14.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = colors.primary,
                unfocusedBorderColor = if (isDark) Color(0xFF3A3A3A) else Color(0xFFE0E0E0),
                focusedContainerColor = colors.inputBg,
                unfocusedContainerColor = colors.inputBg,
                cursorColor = colors.primary
            )
        )

        Spacer(Modifier.height(14.dp))

        // ── File Upload ──
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clickable {
                    val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                        putExtra(
                            Intent.EXTRA_MIME_TYPES,
                            arrayOf(
                                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                "text/plain",
                                "text/csv"
                            )
                        )
                    }
                    filePicker.launch(intent)
                },
            shape = RoundedCornerShape(14.dp),
            color = Color.Transparent,
            border = ButtonDefaults.outlinedButtonBorder(true)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (isDark) Color(0xFF2A2A2A) else Color(0xFFF0F0F0)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        if (uploadedFileName != null) Icons.Default.InsertDriveFile else Icons.Outlined.CloudUpload,
                        contentDescription = "Upload",
                        tint = colors.primary,
                        modifier = Modifier.size(22.dp)
                    )
                }
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    if (isParsingFile) {
                        Text("Parsing file…", color = colors.textPrimary, fontSize = 14.sp)
                        LinearProgressIndicator(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 4.dp)
                                .height(2.dp)
                                .clip(RoundedCornerShape(1.dp)),
                            color = colors.primary
                        )
                    } else if (uploadedFileName != null) {
                        Text(
                            uploadedFileName!!,
                            color = colors.textPrimary,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            maxLines = 1
                        )
                        Text(
                            "${uploadedContent?.length ?: 0} characters extracted",
                            color = colors.textMuted,
                            fontSize = 12.sp
                        )
                    } else {
                        Text(
                            "Upload a file (optional)",
                            color = colors.textPrimary,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            "DOCX, PPTX, XLSX, TXT, CSV",
                            color = colors.textMuted,
                            fontSize = 12.sp
                        )
                    }
                }
                if (uploadedFileName != null && !isParsingFile) {
                    IconButton(onClick = {
                        uploadedContent = null
                        uploadedFileName = null
                    }, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.Close, "Remove", tint = colors.textMuted, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }

        Spacer(Modifier.height(22.dp))

        // ── Section: Output Format ──
        SectionHeader(icon = Icons.Outlined.FileCopy, title = "Output format", colors = colors)
        Spacer(Modifier.height(8.dp))
        FormatPicker(
            selectedFormats = selectedFormats,
            onFormatsChanged = { selectedFormats = it }
        )

        Spacer(Modifier.height(22.dp))

        // ── Section: Language ──
        SectionHeader(icon = Icons.Outlined.Language, title = "Language", colors = colors)
        Spacer(Modifier.height(8.dp))
        LanguagePicker(
            languages = LanguageConfig.contentLanguages,
            selected = selectedLanguage,
            onSelected = { selectedLanguage = it }
        )

        Spacer(Modifier.height(28.dp))

        // ── Generate Button ──
        Button(
            onClick = {
                if (canSubmit) {
                    onGenerate(
                        topic,
                        selectedLanguage.name,
                        selectedLanguage.code,
                        selectedFormats,
                        uploadedContent,
                        uploadedFileName
                    )
                }
            },
            enabled = canSubmit,
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp)
                .then(if (canSubmit) Modifier.scale(btnScale) else Modifier),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = colors.primary,
                disabledContainerColor = if (isDark) Color(0xFF2A2A2A) else Color(0xFFE0E0E0)
            ),
            elevation = ButtonDefaults.buttonElevation(
                defaultElevation = if (canSubmit) 4.dp else 0.dp,
                pressedElevation = 1.dp
            )
        ) {
            Icon(Icons.Default.AutoAwesome, "Generate", modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text(
                "Generate Documents",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
        }

        if (!canSubmit && topic.isNotEmpty()) {
            Text(
                "Enter at least 3 characters or upload a file",
                color = colors.textMuted,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 8.dp),
                textAlign = TextAlign.Center
            )
        }

        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun SectionHeader(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    colors: com.aiwriter.app.ui.theme.AiWriterColors
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            icon,
            contentDescription = null,
            tint = colors.textMuted,
            modifier = Modifier.size(18.dp)
        )
        Spacer(Modifier.width(6.dp))
        Text(
            title,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = colors.textSecondary,
            letterSpacing = 0.3.sp
        )
    }
}
