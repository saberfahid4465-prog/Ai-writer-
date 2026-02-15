package com.smartaiwriter.app.util

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.widget.Toast
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.*

object FileUtils {

    fun sanitizeFileName(name: String): String {
        return name.replace(Regex("[^a-zA-Z0-9\\s-]"), "")
            .replace(Regex("\\s+"), "_")
            .take(50)
    }

    fun generateFileName(topic: String, extension: String): String {
        val sanitized = sanitizeFileName(topic)
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val random = (1000..9999).random()
        return "${sanitized}_${timestamp}_$random.$extension"
    }

    /** Save bytes to app's internal files directory and return the path */
    fun saveToInternalStorage(context: Context, bytes: ByteArray, fileName: String): String {
        val dir = File(context.filesDir, "ai-writer-output")
        if (!dir.exists()) dir.mkdirs()
        val file = File(dir, fileName)
        FileOutputStream(file).use { it.write(bytes) }
        return file.absolutePath
    }

    /** Copy file to public Downloads via MediaStore (API 29+) or direct write */
    fun saveToDownloads(context: Context, filePath: String, fileName: String): Boolean {
        return try {
            val sourceFile = File(filePath)
            val sourceBytes = sourceFile.readBytes()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val contentValues = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                    put(MediaStore.Downloads.MIME_TYPE, getMimeType(fileName))
                    put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/AI Writer")
                }
                val uri = context.contentResolver.insert(
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues
                )
                uri?.let {
                    context.contentResolver.openOutputStream(it)?.use { os ->
                        os.write(sourceBytes)
                    }
                }
            } else {
                @Suppress("DEPRECATION")
                val downloadsDir = File(
                    Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                    "AI Writer"
                )
                if (!downloadsDir.exists()) downloadsDir.mkdirs()
                val destFile = File(downloadsDir, fileName)
                FileOutputStream(destFile).use { it.write(sourceBytes) }
            }
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    /** Get a shareable URI for the file */
    fun getShareUri(context: Context, filePath: String): Uri {
        val file = File(filePath)
        return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    }

    /** Share a file via system share sheet */
    fun shareFile(context: Context, filePath: String, fileName: String) {
        val uri = getShareUri(context, filePath)
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = getMimeType(fileName)
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Share $fileName"))
    }

    fun getMimeType(fileName: String): String {
        return when (fileName.substringAfterLast('.').lowercase()) {
            "pdf" -> "application/pdf"
            "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            "pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            "txt" -> "text/plain"
            else -> "application/octet-stream"
        }
    }

    fun formatFileSize(bytes: Long): String {
        return when {
            bytes < 1024 -> "$bytes B"
            bytes < 1024 * 1024 -> "${bytes / 1024} KB"
            else -> String.format("%.1f MB", bytes.toDouble() / (1024 * 1024))
        }
    }
}
