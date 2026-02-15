package com.smartaiwriter.app.ui.screens

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
import com.smartaiwriter.app.ui.theme.LocalAppColors
import com.smartaiwriter.app.util.LocalStrings

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TermsScreen(onBack: () -> Unit) {
    val colors = LocalAppColors.current
    val s = LocalStrings.current

    Scaffold(
        containerColor = colors.background,
        topBar = {
            TopAppBar(
                title = { Text(s.termsOfService, fontWeight = FontWeight.SemiBold) },
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
            SectionTitle("1. Acceptance of Terms")
            Body("By downloading, installing, or using AI Writer, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.")

            SectionTitle("2. Description of Service")
            Body("AI Writer is an AI-powered document creation tool that allows you to:\n\n• Generate documents (PDF, DOCX, PPTX, XLSX) from text prompts\n• Translate text between multiple languages\n• Summarize text content\n• Edit and customize generated documents")

            SectionTitle("3. Usage Limits")
            Body("• Free users receive a daily token allowance that resets at midnight.\n• Token usage varies based on document complexity and length.\n• We reserve the right to modify usage limits with reasonable notice.\n• Premium features may be offered in the future with separate terms.")

            SectionTitle("4. User Responsibilities")
            Body("You agree to:\n\n• Use the service only for lawful purposes\n• Not generate content that is harmful, abusive, or violates others' rights\n• Not attempt to reverse-engineer, hack, or disrupt the service\n• Not use the service to generate spam, malware, or deceptive content\n• Take responsibility for all content you generate using the service")

            SectionTitle("5. Intellectual Property")
            Body("• Documents you generate using AI Writer belong to you.\n• The AI Writer app, its code, design, and branding are property of the developer.\n• AI-generated content should be reviewed for accuracy before professional use.\n• You may not claim AI Writer's interface or branding as your own.")

            SectionTitle("6. Disclaimer of Warranties")
            Body("AI Writer is provided \"as is\" without warranties of any kind. We do not guarantee:\n\n• The accuracy or completeness of generated content\n• Uninterrupted or error-free service\n• That the service will meet all your requirements\n• The quality of translations or summaries")

            SectionTitle("7. Limitation of Liability")
            Body("To the maximum extent permitted by law, AI Writer and its developers shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.")

            SectionTitle("8. Modifications to Terms")
            Body("We reserve the right to modify these terms at any time. Changes will be effective upon the next app update. Continued use of the app after changes constitutes acceptance of the new terms.")

            SectionTitle("9. Termination")
            Body("We may suspend or terminate your access to AI Writer at any time if you violate these terms or for any other reason at our discretion.")

            SectionTitle("10. Contact")
            Body("For questions about these Terms of Service, please reach out through the app's support channels or at our GitHub repository.")

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
