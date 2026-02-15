package com.aiwriter.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiwriter.app.ui.theme.LocalAppColors
import com.aiwriter.app.util.LocalStrings

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrivacyScreen(onBack: () -> Unit) {
    val colors = LocalAppColors.current
    val s = LocalStrings.current

    Scaffold(
        containerColor = colors.background,
        topBar = {
            TopAppBar(
                title = { Text(s.privacyPolicy, fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = colors.surface,
                    titleContentColor = colors.textPrimary,
                    navigationIconContentColor = colors.textPrimary
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(20.dp)
        ) {
            SectionTitle("1. Information We Collect")
            Body("AI Writer collects minimal information needed to provide the service:\n\n• Device language and theme preferences (stored locally on your device)\n• Document content you provide for AI processing (sent to our AI service, not permanently stored)\n• Daily token usage counts (stored locally)\n• Crash reports and basic analytics (anonymous)")

            SectionTitle("2. How We Use Your Information")
            Body("Your information is used solely to:\n\n• Generate documents, translations, and summaries as requested\n• Track daily usage limits\n• Improve app stability and performance\n• Maintain your app preferences (theme, language)")

            SectionTitle("3. Data Storage & Security")
            Body("• All preferences and history are stored locally on your device.\n• Document content is sent to Longcat AI servers for processing and is not permanently retained.\n• We use HTTPS encryption for all data in transit.\n• We do not sell, rent, or share your personal data with third parties.")

            SectionTitle("4. Third-Party Services")
            Body("AI Writer uses the following third-party services:\n\n• Longcat AI — for document generation and AI processing\n• Pexels — for stock images in presentations\n\nThese services have their own privacy policies governing data usage.")

            SectionTitle("5. Your Rights")
            Body("You can:\n\n• Delete all local data by clearing the app's storage or uninstalling\n• Opt out of analytics by disabling usage data in device settings\n• Request information about any data we may have processed")

            SectionTitle("6. Children's Privacy")
            Body("AI Writer is not intended for children under 13. We do not knowingly collect personal information from children.")

            SectionTitle("7. Changes to This Policy")
            Body("We may update this privacy policy from time to time. Changes will be reflected in app updates. Continued use of the app constitutes acceptance of the updated policy.")

            SectionTitle("8. Contact Us")
            Body("If you have questions about this privacy policy, please contact us through the app's support channels or at our GitHub repository.")

            Spacer(Modifier.height(32.dp))
            Text(
                "Last updated: January 2025",
                fontSize = 12.sp,
                color = colors.textMuted
            )
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun SectionTitle(text: String) {
    val colors = LocalAppColors.current
    Spacer(Modifier.height(20.dp))
    Text(
        text,
        fontSize = 16.sp,
        fontWeight = FontWeight.SemiBold,
        color = colors.textPrimary
    )
    Spacer(Modifier.height(8.dp))
}

@Composable
private fun Body(text: String) {
    val colors = LocalAppColors.current
    Text(
        text,
        fontSize = 14.sp,
        color = colors.textSecondary,
        lineHeight = 22.sp
    )
}
