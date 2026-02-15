package com.smartaiwriter.app.ui.screens

import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.smartaiwriter.app.data.remote.GeneratedFile
import com.smartaiwriter.app.data.remote.HistoryEntry
import com.smartaiwriter.app.ui.theme.*
import com.smartaiwriter.app.util.FileUtils
import com.smartaiwriter.app.util.LocalStrings
import com.smartaiwriter.app.util.PreferencesManager
import com.google.gson.Gson
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun HistoryScreen() {
    val colors = LocalAppColors.current
    val context = LocalContext.current
    val prefs = PreferencesManager.getInstance(context)
    val gson = Gson()
    val s = LocalStrings.current

    var history by remember {
        mutableStateOf(
            try {
                gson.fromJson(prefs.getHistoryJson(), Array<HistoryEntry>::class.java)?.toList() ?: emptyList()
            } catch (e: Exception) {
                emptyList()
            }
        )
    }
    var showClearDialog by remember { mutableStateOf(false) }

    if (showClearDialog) {
        AlertDialog(
            onDismissRequest = { showClearDialog = false },
            title = { Text(s.clearHistory) },
            text = { Text(s.clearHistoryConfirm) },
            confirmButton = {
                TextButton(onClick = {
                    history = emptyList()
                    prefs.setHistoryJson("[]")
                    showClearDialog = false
                }) {
                    Text(s.clear, color = Danger)
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearDialog = false }) {
                    Text(s.cancel)
                }
            }
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                s.history,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = colors.textPrimary
            )
            if (history.isNotEmpty()) {
                TextButton(onClick = { showClearDialog = true }) {
                    Text(s.clearAll, color = Danger, fontSize = 14.sp)
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        if (history.isEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    Icons.Default.History,
                    "Empty",
                    tint = colors.textMuted,
                    modifier = Modifier.size(64.dp)
                )
                Spacer(Modifier.height(16.dp))
                Text(s.noHistory, fontSize = 18.sp, color = colors.textPrimary, fontWeight = FontWeight.SemiBold)
                Text(s.historyEmpty, fontSize = 14.sp, color = colors.textMuted)
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(history) { entry ->
                    HistoryCard(
                        entry = entry,
                        colors = colors,
                        onDelete = {
                            val updated = history.filter { it.id != entry.id }
                            history = updated
                            prefs.setHistoryJson(gson.toJson(updated))
                        },
                        onShare = { file ->
                            FileUtils.shareFile(context, file.filePath, file.fileName)
                        },
                        onDownload = { file ->
                            val saved = FileUtils.saveToDownloads(context, file.filePath, file.fileName)
                            val msg = if (saved) s.savedToDownloads else s.saveFailed
                            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun HistoryCard(
    entry: HistoryEntry,
    colors: AiWriterColors,
    onDelete: () -> Unit,
    onShare: (GeneratedFile) -> Unit,
    onDownload: (GeneratedFile) -> Unit
) {
    val dateFormat = SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.getDefault())
    val dateStr = dateFormat.format(Date(entry.timestamp))

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = colors.card),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        entry.topic,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.textPrimary,
                        fontSize = 15.sp,
                        maxLines = 2
                    )
                    Text(
                        "$dateStr • ${entry.language}",
                        color = colors.textMuted,
                        fontSize = 12.sp
                    )
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, "Delete", tint = Danger, modifier = Modifier.size(20.dp))
                }
            }

            if (entry.files.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    entry.files.forEach { file ->
                        AssistChip(
                            onClick = { onDownload(file) },
                            label = {
                                Text(
                                    file.format.uppercase(),
                                    fontSize = 11.sp
                                )
                            },
                            modifier = Modifier.height(28.dp),
                            trailingIcon = {
                                Icon(
                                    Icons.Default.Download,
                                    "Download",
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        )
                    }
                }
            }
        }
    }
}
