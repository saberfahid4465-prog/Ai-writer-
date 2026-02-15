package com.smartaiwriter.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartaiwriter.app.ui.theme.LocalAppColors
import com.smartaiwriter.app.util.LanguageItem

@Composable
fun LanguagePicker(
    languages: List<LanguageItem>,
    selected: LanguageItem,
    onSelected: (LanguageItem) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = LocalAppColors.current
    var expanded by remember { mutableStateOf(false) }

    Box(modifier = modifier) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .border(1.dp, colors.inputBorder, RoundedCornerShape(12.dp))
                .background(colors.inputBg)
                .clickable { expanded = true }
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "${selected.nativeName} (${selected.name})",
                color = colors.textPrimary,
                fontSize = 15.sp,
                modifier = Modifier.weight(1f)
            )
            Icon(
                Icons.Default.KeyboardArrowDown,
                "Select",
                tint = colors.textMuted
            )
        }

        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .heightIn(max = 400.dp)
                .background(colors.surface)
        ) {
            languages.forEach { lang ->
                DropdownMenuItem(
                    text = {
                        Text(
                            "${lang.nativeName} (${lang.name})",
                            color = if (lang.code == selected.code) colors.primary else colors.textPrimary,
                            fontSize = 14.sp
                        )
                    },
                    onClick = {
                        onSelected(lang)
                        expanded = false
                    }
                )
            }
        }
    }
}
