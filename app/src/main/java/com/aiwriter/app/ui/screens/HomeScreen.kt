package com.aiwriter.app.ui.screens

import android.app.Activity
import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiwriter.app.R
import com.aiwriter.app.service.FileParserService
import com.aiwriter.app.ui.components.FormatPicker
import com.aiwriter.app.ui.components.LanguagePicker
import com.aiwriter.app.ui.theme.LocalAppColors
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
    val context = LocalContext.current
    val prefs = PreferencesManager.getInstance(context)
    val scope = rememberCoroutineScope()

    var topic by remember { mutableStateOf("") }
    var selectedLanguage by remember { mutableStateOf(LanguageConfig.contentLanguages[0]) }
    var selectedFormats by remember { mutableStateOf(setOf("pdf", "docx")) }
    var uploadedContent by remember { mutableStateOf<String?>(null) }
    var uploadedFileName by remember { mutableStateOf<String?>(null) }
    var isParsingFile by remember { mutableStateOf(false) }

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
            .padding(16.dp)
    ) {
        // Header with logo
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(bottom = 4.dp)
        ) {
            Image(
                painter = painterResource(id = R.drawable.app_logo),
                contentDescription = "AI Writer",
                modifier = Modifier.size(40.dp)
            )
            Spacer(Modifier.width(12.dp))
            Text(
                "AI Writer",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = colors.textPrimary
            )
        }
        Text(
            "Create professional documents with AI",
            fontSize = 14.sp,
            color = colors.textMuted,
            modifier = Modifier.padding(bottom = 20.dp)
        )

        // Token Usage
        val tokensUsed = prefs.tokensUsedToday
        val tokenLimit = prefs.dailyTokenLimit
        val progress = (tokensUsed.toFloat() / tokenLimit).coerceIn(0f, 1f)

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
                    Text("Daily Usage", fontSize = 13.sp, color = colors.textMuted)
                    Text("$tokensUsed / $tokenLimit tokens", fontSize = 13.sp, color = colors.textMuted)
                }
                Spacer(Modifier.height(8.dp))
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp)),
                    color = colors.primary,
                    trackColor = colors.borderLight
                )
            }
        }

        Spacer(Modifier.height(20.dp))

        // Topic Input
        OutlinedTextField(
            value = topic,
            onValueChange = { topic = it },
            label = { Text("Topic or Instructions") },
            placeholder = { Text("Enter your topic or instructions…", color = colors.placeholder) },
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp),
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = colors.primary,
                unfocusedBorderColor = colors.inputBorder,
                focusedContainerColor = colors.inputBg,
                unfocusedContainerColor = colors.inputBg,
                cursorColor = colors.primary
            )
        )

        Spacer(Modifier.height(16.dp))

        // File Upload
        Card(
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
            colors = CardDefaults.cardColors(containerColor = colors.surfaceAlt),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.UploadFile,
                    contentDescription = "Upload",
                    tint = colors.primary,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    if (isParsingFile) {
                        Text("Parsing file…", color = colors.textPrimary, fontSize = 14.sp)
                    } else if (uploadedFileName != null) {
                        Text(uploadedFileName!!, color = colors.textPrimary, fontSize = 14.sp)
                        Text(
                            "${uploadedContent?.length ?: 0} characters",
                            color = colors.textMuted,
                            fontSize = 12.sp
                        )
                    } else {
                        Text("Upload File", color = colors.textPrimary, fontSize = 14.sp)
                        Text(
                            "Supported: DOCX, PPTX, XLSX, TXT",
                            color = colors.textMuted,
                            fontSize = 12.sp
                        )
                    }
                }
                if (uploadedFileName != null && !isParsingFile) {
                    IconButton(onClick = {
                        uploadedContent = null
                        uploadedFileName = null
                    }) {
                        Icon(Icons.Default.Close, "Remove file", tint = colors.textMuted)
                    }
                }
            }
        }

        Spacer(Modifier.height(20.dp))

        // Output Format
        Text(
            "Output Format",
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            color = colors.textPrimary,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        FormatPicker(
            selectedFormats = selectedFormats,
            onFormatsChanged = { selectedFormats = it }
        )

        Spacer(Modifier.height(20.dp))

        // Language
        Text(
            "Language",
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            color = colors.textPrimary,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        LanguagePicker(
            languages = LanguageConfig.contentLanguages,
            selected = selectedLanguage,
            onSelected = { selectedLanguage = it }
        )

        Spacer(Modifier.height(24.dp))

        // Generate Button
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
                .height(52.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = colors.primary,
                disabledContainerColor = colors.border
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
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        Spacer(Modifier.height(24.dp))
    }
}
