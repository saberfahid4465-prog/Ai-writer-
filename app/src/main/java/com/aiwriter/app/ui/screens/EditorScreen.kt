package com.aiwriter.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import com.aiwriter.app.data.remote.AiWriterOutput
import com.aiwriter.app.data.remote.DocSection
import com.aiwriter.app.data.remote.GeneratedFile
import com.aiwriter.app.navigation.NavState
import com.aiwriter.app.service.AiService
import com.aiwriter.app.service.FileGeneratorService
import com.aiwriter.app.ui.theme.*
import com.aiwriter.app.util.PreferencesManager
import com.google.gson.Gson
import kotlinx.coroutines.launch

@Composable
fun EditorScreen(
    onGenerateFiles: (List<GeneratedFile>) -> Unit,
    onBack: () -> Unit
) {
    val colors = LocalAppColors.current
    val context = LocalContext.current
    val prefs = PreferencesManager.getInstance(context)
    val scope = rememberCoroutineScope()
    val gson = Gson()

    val aiOutput = NavState.aiOutput ?: return

    var title by remember { mutableStateOf(aiOutput.pdfWord.title) }
    var sections by remember { mutableStateOf(aiOutput.pdfWord.sections.toMutableList()) }
    var isPreviewMode by remember { mutableStateOf(false) }
    var isGenerating by remember { mutableStateOf(false) }
    var generatingStatus by remember { mutableStateOf("") }
    var expandedSections by remember { mutableStateOf(sections.indices.toSet()) }
    var editingSection by remember { mutableStateOf<Int?>(null) }
    var aiEditingSection by remember { mutableStateOf<Int?>(null) }

    val totalWords = sections.sumOf { sec ->
        sec.heading.split("\\s+".toRegex()).size +
        sec.paragraph.split("\\s+".toRegex()).size +
        sec.bullets.sumOf { it.split("\\s+".toRegex()).size }
    }

    fun generateFiles() {
        isGenerating = true
        scope.launch {
            // Rebuild output with edited sections
            val editedOutput = AiWriterOutput(
                pdfWord = aiOutput.pdfWord.copy(title = title, sections = sections.toMutableList()),
                ppt = aiOutput.ppt.copy(
                    slides = sections.map { s ->
                        com.aiwriter.app.data.remote.PptSlide(s.heading, s.bullets, s.imageKeyword)
                    }.toMutableList()
                ),
                excel = aiOutput.excel.copy(
                    rows = sections.map { s ->
                        listOf(s.heading, s.bullets.joinToString("; "), s.imageKeyword ?: "")
                    }
                )
            )

            val files = FileGeneratorService.generateFiles(
                context = context,
                output = editedOutput,
                formats = NavState.outputFormats,
                languageCode = NavState.languageCode,
                onProgress = { generatingStatus = it }
            )

            // Save to history
            val historyEntry = com.aiwriter.app.data.remote.HistoryEntry(
                id = System.currentTimeMillis().toString(),
                topic = title,
                language = NavState.language,
                timestamp = System.currentTimeMillis(),
                files = files
            )
            val history = try {
                val existing = gson.fromJson(prefs.getHistoryJson(), Array<com.aiwriter.app.data.remote.HistoryEntry>::class.java)?.toMutableList() ?: mutableListOf()
                existing.add(0, historyEntry)
                if (existing.size > 50) existing.subList(0, 50) else existing
            } catch (e: Exception) {
                mutableListOf(historyEntry)
            }
            prefs.setHistoryJson(gson.toJson(history))

            isGenerating = false
            onGenerateFiles(files)
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Top bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.headerBg)
                .padding(horizontal = 8.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Default.ArrowBack, "Back", tint = colors.headerText)
            }
            Text(
                "Edit Document",
                color = colors.headerText,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.weight(1f)
            )
            // Edit/Preview toggle
            Row {
                FilterChip(
                    selected = !isPreviewMode,
                    onClick = { isPreviewMode = false },
                    label = { Text("Edit", fontSize = 12.sp) },
                    modifier = Modifier.height(32.dp)
                )
                Spacer(Modifier.width(4.dp))
                FilterChip(
                    selected = isPreviewMode,
                    onClick = { isPreviewMode = true },
                    label = { Text("Preview", fontSize = 12.sp) },
                    modifier = Modifier.height(32.dp)
                )
            }
        }

        // Word count bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.surfaceAlt)
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("${sections.size} sections", color = colors.textMuted, fontSize = 13.sp)
            Text("$totalWords words", color = colors.textMuted, fontSize = 13.sp)
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // Document title
            if (isPreviewMode) {
                Text(title, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                Spacer(Modifier.height(16.dp))
            } else {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Document Title") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = colors.primary,
                        unfocusedBorderColor = colors.inputBorder,
                        focusedContainerColor = colors.inputBg,
                        unfocusedContainerColor = colors.inputBg
                    )
                )
                Spacer(Modifier.height(16.dp))
            }

            // Sections
            sections.forEachIndexed { index, section ->
                val isExpanded = index in expandedSections
                val isAiEditing = aiEditingSection == index

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                    colors = CardDefaults.cardColors(containerColor = colors.card),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        // Section header
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            IconButton(
                                onClick = {
                                    expandedSections = if (isExpanded) expandedSections - index
                                    else expandedSections + index
                                },
                                modifier = Modifier.size(28.dp)
                            ) {
                                Icon(
                                    if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                    "Toggle",
                                    tint = colors.textMuted,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Text(
                                "Section ${index + 1}",
                                fontSize = 13.sp,
                                color = colors.textMuted,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.weight(1f)
                            )

                            if (!isPreviewMode) {
                                // Section actions
                                if (index > 0) {
                                    IconButton(
                                        onClick = {
                                            sections = sections.toMutableList().apply {
                                                val item = removeAt(index)
                                                add(index - 1, item)
                                            }
                                        },
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Icon(Icons.Default.ArrowUpward, "Move up", tint = colors.textMuted, modifier = Modifier.size(16.dp))
                                    }
                                }
                                if (index < sections.size - 1) {
                                    IconButton(
                                        onClick = {
                                            sections = sections.toMutableList().apply {
                                                val item = removeAt(index)
                                                add(index + 1, item)
                                            }
                                        },
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Icon(Icons.Default.ArrowDownward, "Move down", tint = colors.textMuted, modifier = Modifier.size(16.dp))
                                    }
                                }
                                IconButton(
                                    onClick = {
                                        sections = sections.toMutableList().apply {
                                            add(index + 1, section.copy())
                                        }
                                    },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(Icons.Default.ContentCopy, "Duplicate", tint = colors.textMuted, modifier = Modifier.size(16.dp))
                                }
                                if (sections.size > 1) {
                                    IconButton(
                                        onClick = {
                                            sections = sections.toMutableList().apply { removeAt(index) }
                                        },
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Icon(Icons.Default.Delete, "Delete", tint = Danger, modifier = Modifier.size(16.dp))
                                    }
                                }
                            }
                        }

                        AnimatedVisibility(visible = isExpanded) {
                            Column {
                                if (isPreviewMode) {
                                    // Preview
                                    Text(
                                        section.heading,
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.textPrimary,
                                        modifier = Modifier.padding(bottom = 8.dp)
                                    )
                                    if (section.paragraph.isNotBlank()) {
                                        Text(
                                            section.paragraph,
                                            fontSize = 14.sp,
                                            color = colors.textSecondary,
                                            modifier = Modifier.padding(bottom = 8.dp)
                                        )
                                    }
                                    section.bullets.forEach { bullet ->
                                        Text(
                                            "  •  $bullet",
                                            fontSize = 13.sp,
                                            color = colors.textSecondary,
                                            modifier = Modifier.padding(vertical = 2.dp, horizontal = 8.dp)
                                        )
                                    }
                                } else {
                                    // Edit fields
                                    OutlinedTextField(
                                        value = section.heading,
                                        onValueChange = {
                                            sections = sections.toMutableList().apply {
                                                this[index] = this[index].copy(heading = it)
                                            }
                                        },
                                        label = { Text("Heading") },
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(8.dp),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = colors.primary,
                                            unfocusedBorderColor = colors.borderLight
                                        )
                                    )
                                    Spacer(Modifier.height(8.dp))

                                    OutlinedTextField(
                                        value = section.paragraph,
                                        onValueChange = {
                                            sections = sections.toMutableList().apply {
                                                this[index] = this[index].copy(paragraph = it)
                                            }
                                        },
                                        label = { Text("Paragraph") },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(100.dp),
                                        shape = RoundedCornerShape(8.dp),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = colors.primary,
                                            unfocusedBorderColor = colors.borderLight
                                        )
                                    )
                                    Spacer(Modifier.height(8.dp))

                                    Text("Bullets", fontSize = 13.sp, color = colors.textMuted)
                                    section.bullets.forEachIndexed { bIdx, bullet ->
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.padding(vertical = 2.dp)
                                        ) {
                                            Text("•", color = colors.textMuted, modifier = Modifier.padding(end = 8.dp))
                                            OutlinedTextField(
                                                value = bullet,
                                                onValueChange = { newVal ->
                                                    sections = sections.toMutableList().apply {
                                                        val newBullets = this[index].bullets.toMutableList()
                                                        newBullets[bIdx] = newVal
                                                        this[index] = this[index].copy(bullets = newBullets)
                                                    }
                                                },
                                                modifier = Modifier
                                                    .weight(1f)
                                                    .height(48.dp),
                                                shape = RoundedCornerShape(8.dp),
                                                colors = OutlinedTextFieldDefaults.colors(
                                                    focusedBorderColor = colors.primary,
                                                    unfocusedBorderColor = colors.borderLight
                                                ),
                                                textStyle = LocalTextStyle.current.copy(fontSize = 13.sp)
                                            )
                                        }
                                    }

                                    Spacer(Modifier.height(8.dp))

                                    // AI Tools
                                    if (!isAiEditing) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            listOf("Improve" to "improve", "Expand" to "expand", "Shorten" to "shorten", "Regenerate" to "regenerate").forEach { (label, action) ->
                                                AssistChip(
                                                    onClick = {
                                                        aiEditingSection = index
                                                        scope.launch {
                                                            val result = AiService.editSection(
                                                                section, action, NavState.language
                                                            )
                                                            result.onSuccess { (editResult, usage) ->
                                                                prefs.addTokenUsage(usage.totalTokens)
                                                                sections = sections.toMutableList().apply {
                                                                    this[index] = DocSection(
                                                                        heading = editResult.heading.ifBlank { section.heading },
                                                                        paragraph = editResult.paragraph,
                                                                        bullets = editResult.bullets.toMutableList(),
                                                                        imageKeyword = section.imageKeyword
                                                                    )
                                                                }
                                                            }
                                                            aiEditingSection = null
                                                        }
                                                    },
                                                    label = { Text(label, fontSize = 11.sp) },
                                                    modifier = Modifier.height(28.dp)
                                                )
                                            }
                                        }
                                    } else {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.Center
                                        ) {
                                            CircularProgressIndicator(
                                                modifier = Modifier.size(20.dp),
                                                strokeWidth = 2.dp,
                                                color = colors.primary
                                            )
                                            Spacer(Modifier.width(8.dp))
                                            Text("AI editing…", color = colors.textMuted, fontSize = 13.sp)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Add section button (edit mode only)
            if (!isPreviewMode) {
                OutlinedButton(
                    onClick = {
                        sections = sections.toMutableList().apply {
                            add(DocSection("New Section", "", mutableListOf("Point 1")))
                        }
                        expandedSections = expandedSections + sections.lastIndex
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Add, "Add", modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Add Section")
                }
            }

            Spacer(Modifier.height(16.dp))
        }

        // Bottom action bar
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = colors.surface,
            shadowElevation = 8.dp
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                if (isGenerating) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                            color = colors.primary
                        )
                        Spacer(Modifier.width(12.dp))
                        Text(generatingStatus, color = colors.textSecondary, fontSize = 14.sp)
                    }
                } else {
                    Button(
                        onClick = { generateFiles() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
                    ) {
                        Icon(Icons.Default.FileDownload, "Generate", modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Generate Final Files", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}
