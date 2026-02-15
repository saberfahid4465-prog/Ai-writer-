package com.aiwriter.app.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiwriter.app.data.remote.AiWriterOutput
import com.aiwriter.app.navigation.NavState
import com.aiwriter.app.service.AiService
import com.aiwriter.app.ui.theme.*
import com.aiwriter.app.util.LocalStrings
import com.aiwriter.app.util.PreferencesManager
import kotlinx.coroutines.launch

data class ProcessingStep(
    val icon: ImageVector,
    val label: String,
    val status: StepStatus = StepStatus.PENDING
)

enum class StepStatus { PENDING, ACTIVE, DONE, ERROR }

@Composable
fun ProcessingScreen(
    onComplete: (AiWriterOutput) -> Unit,
    onCancel: () -> Unit
) {
    val colors = LocalAppColors.current
    val context = LocalContext.current
    val prefs = PreferencesManager.getInstance(context)
    val scope = rememberCoroutineScope()
    val s = LocalStrings.current

    var progress by remember { mutableFloatStateOf(0f) }
    var steps by remember {
        mutableStateOf(
            listOf(
                ProcessingStep(Icons.Default.Search, s.analyzingInput),
                ProcessingStep(Icons.Default.Token, s.checkingLimits),
                ProcessingStep(Icons.Default.AutoAwesome, s.generatingWithAi),
                ProcessingStep(Icons.Default.Edit, s.preparingEditor)
            )
        )
    }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isProcessing by remember { mutableStateOf(true) }

    // Animated progress
    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        animationSpec = tween(500),
        label = "progress"
    )

    fun updateStep(index: Int, status: StepStatus) {
        steps = steps.toMutableList().apply {
            this[index] = this[index].copy(status = status)
        }
    }

    LaunchedEffect(Unit) {
        scope.launch {
            try {
                // Step 1: Analyze input
                updateStep(0, StepStatus.ACTIVE)
                progress = 0.1f
                kotlinx.coroutines.delay(300)

                val mode = NavState.processingMode
                val content = NavState.uploadedContent
                val topic = NavState.topic
                val language = NavState.language

                updateStep(0, StepStatus.DONE)
                progress = 0.25f

                // Step 2: Check usage limits
                updateStep(1, StepStatus.ACTIVE)
                val contentLength = (content?.length ?: 0) + topic.length
                val estimatedCost = AiService.estimateTokenCost(contentLength)

                if (!prefs.hasTokenBudget(estimatedCost)) {
                    throw Exception(s.dailyLimitReached)
                }

                updateStep(1, StepStatus.DONE)
                progress = 0.4f

                // Step 3: Generate with AI
                updateStep(2, StepStatus.ACTIVE)
                progress = 0.5f

                val result = when (mode) {
                    "translate" -> AiService.translateContent(
                        content ?: topic,
                        NavState.sourceLanguage,
                        NavState.targetLanguage
                    )
                    "summarize" -> AiService.summarizeContent(
                        content ?: topic,
                        language
                    )
                    else -> AiService.generateContent(
                        topic,
                        language,
                        content
                    )
                }

                result.fold(
                    onSuccess = { (output, usage) ->
                        prefs.addTokenUsage(usage.totalTokens)
                        progress = 0.85f
                        updateStep(2, StepStatus.DONE)

                        // Step 4: Prepare editor
                        updateStep(3, StepStatus.ACTIVE)
                        progress = 1f
                        kotlinx.coroutines.delay(300)
                        updateStep(3, StepStatus.DONE)

                        isProcessing = false
                        onComplete(output)
                    },
                    onFailure = { error ->
                        updateStep(2, StepStatus.ERROR)
                        errorMessage = error.message ?: s.generationFailed
                        isProcessing = false
                    }
                )
            } catch (e: Exception) {
                errorMessage = e.message ?: s.errorOccurred
                isProcessing = false
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            s.generating,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = colors.textPrimary
        )

        Spacer(Modifier.height(32.dp))

        // Progress bar
        LinearProgressIndicator(
            progress = { animatedProgress },
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp)),
            color = colors.primary,
            trackColor = colors.borderLight
        )

        Text(
            "${(animatedProgress * 100).toInt()}%",
            color = colors.textMuted,
            fontSize = 14.sp,
            modifier = Modifier.padding(top = 8.dp)
        )

        Spacer(Modifier.height(32.dp))

        // Steps
        steps.forEachIndexed { _, step ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                val iconTint = when (step.status) {
                    StepStatus.DONE -> Success
                    StepStatus.ACTIVE -> colors.primary
                    StepStatus.ERROR -> Danger
                    else -> colors.textMuted
                }
                val statusIcon = when (step.status) {
                    StepStatus.DONE -> Icons.Default.CheckCircle
                    StepStatus.ERROR -> Icons.Default.Error
                    StepStatus.ACTIVE -> Icons.Default.HourglassTop
                    else -> step.icon
                }

                Icon(statusIcon, step.label, tint = iconTint, modifier = Modifier.size(24.dp))
                Spacer(Modifier.width(12.dp))
                Text(
                    step.label,
                    color = if (step.status == StepStatus.PENDING) colors.textMuted else colors.textPrimary,
                    fontSize = 16.sp,
                    fontWeight = if (step.status == StepStatus.ACTIVE) FontWeight.SemiBold else FontWeight.Normal
                )
                if (step.status == StepStatus.ACTIVE) {
                    Spacer(Modifier.width(8.dp))
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp,
                        color = colors.primary
                    )
                }
            }
        }

        // Error message
        if (errorMessage != null) {
            Spacer(Modifier.height(24.dp))
            Card(
                colors = CardDefaults.cardColors(containerColor = DangerLight),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    errorMessage!!,
                    color = Danger,
                    modifier = Modifier.padding(16.dp),
                    fontSize = 14.sp
                )
            }
        }

        Spacer(Modifier.height(32.dp))

        // Cancel / Retry buttons
        if (errorMessage != null) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = onCancel,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(s.goBack)
                }
            }
        } else if (isProcessing) {
            OutlinedButton(
                onClick = onCancel,
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(s.cancel, color = colors.textSecondary)
            }
        }
    }
}
