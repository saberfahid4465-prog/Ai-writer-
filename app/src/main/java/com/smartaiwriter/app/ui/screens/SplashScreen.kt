package com.smartaiwriter.app.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartaiwriter.app.R
import com.smartaiwriter.app.ui.theme.LocalAppColors
import com.smartaiwriter.app.ui.theme.LocalIsDarkTheme
import com.smartaiwriter.app.ui.theme.AccentTeal
import com.smartaiwriter.app.util.LocalStrings
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(
    onFinished: () -> Unit
) {
    val colors = LocalAppColors.current
    val isDark = LocalIsDarkTheme.current
    val s = LocalStrings.current
    val logoRes = if (isDark) R.drawable.app_logo_white else R.drawable.app_logo

    // Animations
    val logoScale = remember { Animatable(0.3f) }
    val contentAlpha = remember { Animatable(0f) }
    val buttonAlpha = remember { Animatable(0f) }

    // Sparkle animation
    val infiniteTransition = rememberInfiniteTransition(label = "sparkle")
    val sparkleAlpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = EaseInOutCubic),
            repeatMode = RepeatMode.Reverse
        ),
        label = "sparkle_alpha"
    )
    val sparkleScale by infiniteTransition.animateFloat(
        initialValue = 0.8f,
        targetValue = 1.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = EaseInOutCubic),
            repeatMode = RepeatMode.Reverse
        ),
        label = "sparkle_scale"
    )

    LaunchedEffect(Unit) {
        logoScale.animateTo(1f, animationSpec = spring(dampingRatio = 0.6f, stiffness = 200f))
        delay(200)
        contentAlpha.animateTo(1f, animationSpec = tween(600))
        delay(200)
        buttonAlpha.animateTo(1f, animationSpec = tween(400))
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(
                        colors.background,
                        colors.surfaceAlt,
                        colors.background
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(40.dp)
        ) {
            // Sparkle decorations
            Box(contentAlignment = Alignment.Center) {
                // Outer glow ring
                Box(
                    modifier = Modifier
                        .size(140.dp)
                        .scale(sparkleScale)
                        .alpha(sparkleAlpha * 0.15f)
                        .clip(CircleShape)
                        .background(colors.primary)
                )
                // Inner glow ring
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .scale(sparkleScale * 0.95f)
                        .alpha(sparkleAlpha * 0.1f)
                        .clip(CircleShape)
                        .background(colors.primary)
                )
                // Logo
                Image(
                    painter = painterResource(id = logoRes),
                    contentDescription = s.aiWriter,
                    modifier = Modifier
                        .size(90.dp)
                        .scale(logoScale.value)
                )
            }

            Spacer(Modifier.height(32.dp))

            // Title
            Text(
                s.aiWriter,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = colors.textPrimary,
                modifier = Modifier.alpha(contentAlpha.value)
            )

            Spacer(Modifier.height(8.dp))

            Text(
                s.splashSubtitle,
                fontSize = 16.sp,
                color = colors.textSecondary,
                textAlign = TextAlign.Center,
                lineHeight = 24.sp,
                modifier = Modifier.alpha(contentAlpha.value)
            )

            Spacer(Modifier.height(16.dp))

            // Feature chips
            Column(
                modifier = Modifier.alpha(contentAlpha.value),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(
                    s.splashFeature1,
                    s.splashFeature2,
                    s.splashFeature3
                ).forEach { feature ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(colors.primary.copy(alpha = 0.06f))
                            .padding(horizontal = 16.dp, vertical = 12.dp)
                    ) {
                        Icon(
                            Icons.Default.AutoAwesome,
                            "Feature",
                            tint = colors.primary,
                            modifier = Modifier
                                .size(18.dp)
                                .alpha(sparkleAlpha)
                        )
                        Spacer(Modifier.width(12.dp))
                        Text(
                            feature,
                            fontSize = 14.sp,
                            color = colors.textPrimary
                        )
                    }
                }
            }

            Spacer(Modifier.height(40.dp))

            // Get Started button
            Button(
                onClick = onFinished,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .alpha(buttonAlpha.value),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AccentTeal)
            ) {
                Icon(Icons.Default.AutoAwesome, s.getStarted, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text(
                    s.getStarted,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}
