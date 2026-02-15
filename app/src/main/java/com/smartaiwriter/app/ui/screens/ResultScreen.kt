package com.smartaiwriter.app.ui.screens

import android.content.Intent
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartaiwriter.app.navigation.NavState
import com.smartaiwriter.app.ui.theme.*
import com.smartaiwriter.app.util.FileUtils
import com.smartaiwriter.app.util.LocalStrings

@Composable
fun ResultScreen(
    onCreateNew: () -> Unit,
    onEditDocument: () -> Unit = {}
) {
    val colors = LocalAppColors.current
    val context = LocalContext.current
    val files = NavState.generatedFiles
    val s = LocalStrings.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(32.dp))

        // Success icon with accent color ring
        Box(
            modifier = Modifier
                .size(80.dp)
                .clip(CircleShape)
                .background(AccentTeal.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.CheckCircle,
                "Success",
                tint = AccentTeal,
                modifier = Modifier.size(48.dp)
            )
        }

        Spacer(Modifier.height(16.dp))

        Text(
            s.yourDocuments,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = colors.textPrimary
        )
        Text(
            s.filesReady,
            fontSize = 14.sp,
            color = colors.textMuted,
            modifier = Modifier.padding(top = 4.dp, bottom = 24.dp)
        )

        // ── File cards ──
        files.forEach { file ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 10.dp),
                colors = CardDefaults.cardColors(containerColor = colors.card),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val icon = when (file.format) {
                        "pdf" -> Icons.Default.PictureAsPdf
                        "docx" -> Icons.Default.Description
                        "pptx" -> Icons.Default.Slideshow
                        "xlsx" -> Icons.Default.TableChart
                        else -> Icons.Default.InsertDriveFile
                    }
                    val formatColor = when (file.format) {
                        "pdf" -> AccentCoral
                        "docx" -> AccentSkyBlue
                        "pptx" -> AccentPeach
                        "xlsx" -> AccentTeal
                        else -> colors.primary
                    }
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(formatColor.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(icon, file.format, tint = formatColor, modifier = Modifier.size(24.dp))
                    }
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
                    // Share button per file
                    IconButton(
                        onClick = { FileUtils.shareFile(context, file.filePath, file.fileName) },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(Icons.Default.Share, s.share, tint = colors.textMuted, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }

        if (files.isEmpty()) {
            Text(s.noFiles, color = colors.textMuted, fontSize = 16.sp)
        }

        Spacer(Modifier.height(28.dp))

        // ══════════════════════════════
        // ── THREE MAIN ACTION BUTTONS ──
        // ══════════════════════════════

        // 1. Download All
        Button(
            onClick = {
                var allSaved = true
                files.forEach { file ->
                    val saved = FileUtils.saveToDownloads(context, file.filePath, file.fileName)
                    if (!saved) allSaved = false
                }
                val msg = if (allSaved) s.savedToDownloads else s.saveFailed
                Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = AccentTeal)
        ) {
            Icon(Icons.Default.Download, s.downloadAll, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(10.dp))
            Text(s.downloadAll, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }

        Spacer(Modifier.height(12.dp))

        // 2. Preview
        OutlinedButton(
            onClick = {
                val file = files.firstOrNull() ?: return@OutlinedButton
                try {
                    val uri = FileUtils.getShareUri(context, file.filePath)
                    val mime = FileUtils.getMimeType(file.fileName)
                    val intent = Intent(Intent.ACTION_VIEW).apply {
                        setDataAndType(uri, mime)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    context.startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(context, "No app available to preview this file", Toast.LENGTH_SHORT).show()
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(14.dp),
            border = ButtonDefaults.outlinedButtonBorder(true)
        ) {
            Icon(Icons.Default.Visibility, s.preview, tint = AccentSkyBlue, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(10.dp))
            Text(s.preview, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
        }

        Spacer(Modifier.height(12.dp))

        // 3. Edit Document
        OutlinedButton(
            onClick = onEditDocument,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(14.dp),
            border = ButtonDefaults.outlinedButtonBorder(true)
        ) {
            Icon(Icons.Default.Edit, s.editDocument, tint = AccentLavender, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(10.dp))
            Text(s.editDocument, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
        }

        Spacer(Modifier.height(20.dp))

        // Create New (secondary action)
        TextButton(
            onClick = onCreateNew,
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Default.Add, s.createNew, tint = colors.primary, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(6.dp))
            Text(s.createNew, fontSize = 14.sp, color = colors.primary)
        }

        Spacer(Modifier.height(24.dp))
    }
}
