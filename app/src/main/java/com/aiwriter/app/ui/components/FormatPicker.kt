package com.aiwriter.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiwriter.app.ui.theme.LocalAppColors

data class FormatOption(
    val key: String,
    val label: String,
    val icon: String
)

val FORMAT_OPTIONS = listOf(
    FormatOption("pdf", "PDF", "\uD83D\uDCC4"),
    FormatOption("docx", "Word", "\uD83D\uDCDD"),
    FormatOption("pptx", "PPT", "\uD83D\uDCCA"),
    FormatOption("xlsx", "Excel", "\uD83D\uDCC8")
)

@Composable
fun FormatPicker(
    selectedFormats: Set<String>,
    onFormatsChanged: (Set<String>) -> Unit
) {
    val colors = LocalAppColors.current

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        FORMAT_OPTIONS.forEach { format ->
            val isSelected = format.key in selectedFormats
            val bgColor = if (isSelected) colors.primaryLight else colors.surfaceAlt
            val borderColor = if (isSelected) colors.primary else colors.border
            val textColor = if (isSelected) colors.primary else colors.textSecondary

            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(12.dp))
                    .border(1.5.dp, borderColor, RoundedCornerShape(12.dp))
                    .background(bgColor)
                    .clickable {
                        val newFormats = if (isSelected) {
                            if (selectedFormats.size > 1) selectedFormats - format.key
                            else selectedFormats // keep at least one
                        } else {
                            selectedFormats + format.key
                        }
                        onFormatsChanged(newFormats)
                    }
                    .padding(vertical = 14.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(format.icon, fontSize = 20.sp)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        format.label,
                        fontSize = 13.sp,
                        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                        color = textColor
                    )
                }
            }
        }
    }
}
