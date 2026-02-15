package com.aiwriter.app.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiwriter.app.navigation.NavState
import com.aiwriter.app.ui.theme.*
import com.aiwriter.app.util.FileUtils

@Composable
fun ResultScreen(
    onCreateNew: () -> Unit
) {
    val colors = LocalAppColors.current
    val context = LocalContext.current
    val files = NavState.generatedFiles

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(32.dp))

        // Success icon
        Icon(
            Icons.Default.CheckCircle,
            "Success",
            tint = Success,
            modifier = Modifier.size(64.dp)
        )

        Spacer(Modifier.height(16.dp))

        Text(
            "Your Documents",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = colors.textPrimary
        )
        Text(
            "Your files are ready!",
            fontSize = 14.sp,
            color = colors.textMuted,
            modifier = Modifier.padding(top = 4.dp, bottom = 24.dp)
        )

        // File cards
        files.forEach { file ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp),
                colors = CardDefaults.cardColors(containerColor = colors.card),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        val icon = when (file.format) {
                            "pdf" -> Icons.Default.PictureAsPdf
                            "docx" -> Icons.Default.Description
                            "pptx" -> Icons.Default.Slideshow
                            "xlsx" -> Icons.Default.TableChart
                            else -> Icons.Default.InsertDriveFile
                        }
                        Icon(
                            icon, file.format,
                            tint = colors.primary,
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                file.fileName,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium,
                                color = colors.textPrimary,
                                maxLines = 1
                            )
                            Text(
                                "${file.format.uppercase()} • ${FileUtils.formatFileSize(file.sizeBytes)}",
                                fontSize = 12.sp,
                                color = colors.textMuted
                            )
                        }
                    }

                    Spacer(Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Download button
                        OutlinedButton(
                            onClick = {
                                val saved = FileUtils.saveToDownloads(context, file.filePath, file.fileName)
                                val msg = if (saved) "Saved to Downloads" else "Save failed"
                                Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(Icons.Default.Download, "Download", modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Download", fontSize = 13.sp)
                        }

                        // Share button
                        OutlinedButton(
                            onClick = {
                                FileUtils.shareFile(context, file.filePath, file.fileName)
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(Icons.Default.Share, "Share", modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Share", fontSize = 13.sp)
                        }
                    }
                }
            }
        }

        if (files.isEmpty()) {
            Text(
                "No files generated",
                color = colors.textMuted,
                fontSize = 16.sp
            )
        }

        Spacer(Modifier.height(24.dp))

        Button(
            onClick = onCreateNew,
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
        ) {
            Icon(Icons.Default.Add, "New", modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text("Create New", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }

        Spacer(Modifier.height(24.dp))
    }
}
