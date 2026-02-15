package com.aiwriter.app.ui.screens

import android.app.Activity
import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiwriter.app.service.FileParserService
import com.aiwriter.app.ui.components.FormatPicker
import com.aiwriter.app.ui.components.LanguagePicker
import com.aiwriter.app.ui.theme.LocalAppColors
import com.aiwriter.app.util.LanguageConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun TranslateScreen(
    onTranslate: (text: String, sourceLang: String, targetLang: String, formats: Set<String>) -> Unit
) {
    val colors = LocalAppColors.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var inputText by remember { mutableStateOf("") }
    var sourceLang by remember { mutableStateOf(LanguageConfig.contentLanguages[0]) }
    var targetLang by remember { mutableStateOf(LanguageConfig.contentLanguages[1]) }
    var selectedFormats by remember { mutableStateOf(setOf("pdf", "docx")) }
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
                    parsed.onSuccess { inputText = it }
                    parsed.onFailure { uploadedFileName = null }
                }
            }
        }
    }

    val canSubmit = inputText.length >= 3

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            "AI Translator",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = colors.textPrimary
        )
        Text(
            "Translate documents or text with AI",
            fontSize = 14.sp,
            color = colors.textMuted,
            modifier = Modifier.padding(bottom = 20.dp)
        )

        // Source/Target Language with swap
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("From", fontSize = 13.sp, color = colors.textMuted)
                Spacer(Modifier.height(4.dp))
                LanguagePicker(
                    languages = LanguageConfig.contentLanguages,
                    selected = sourceLang,
                    onSelected = { sourceLang = it }
                )
            }

            IconButton(
                onClick = {
                    val temp = sourceLang
                    sourceLang = targetLang
                    targetLang = temp
                },
                modifier = Modifier.padding(horizontal = 4.dp, vertical = 16.dp)
            ) {
                Icon(Icons.Default.SwapHoriz, "Swap", tint = colors.primary, modifier = Modifier.size(28.dp))
            }

            Column(modifier = Modifier.weight(1f)) {
                Text("To", fontSize = 13.sp, color = colors.textMuted)
                Spacer(Modifier.height(4.dp))
                LanguagePicker(
                    languages = LanguageConfig.contentLanguages,
                    selected = targetLang,
                    onSelected = { targetLang = it }
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        // Text input
        OutlinedTextField(
            value = inputText,
            onValueChange = { inputText = it },
            label = { Text("Text to translate") },
            placeholder = { Text("Enter text to translate…", color = colors.placeholder) },
            modifier = Modifier
                .fillMaxWidth()
                .height(160.dp),
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = colors.primary,
                unfocusedBorderColor = colors.inputBorder,
                focusedContainerColor = colors.inputBg,
                unfocusedContainerColor = colors.inputBg
            )
        )

        Spacer(Modifier.height(12.dp))

        // Upload button
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
                                "text/plain"
                            )
                        )
                    }
                    filePicker.launch(intent)
                },
            colors = CardDefaults.cardColors(containerColor = colors.surfaceAlt),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier.padding(14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.UploadFile, "Upload", tint = colors.primary)
                Spacer(Modifier.width(12.dp))
                if (isParsingFile) {
                    Text("Parsing file…", color = colors.textPrimary, fontSize = 14.sp)
                } else {
                    Text(
                        uploadedFileName ?: "Upload file (DOCX, PPTX, XLSX, TXT)",
                        color = colors.textPrimary,
                        fontSize = 14.sp
                    )
                }
            }
        }

        Spacer(Modifier.height(20.dp))

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

        Spacer(Modifier.height(24.dp))

        Button(
            onClick = {
                if (canSubmit) onTranslate(inputText, sourceLang.name, targetLang.name, selectedFormats)
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
            Icon(Icons.Default.Translate, "Translate", modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text("Translate", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }

        Spacer(Modifier.height(24.dp))
    }
}
