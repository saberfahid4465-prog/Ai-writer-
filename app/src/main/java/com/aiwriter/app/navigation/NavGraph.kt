package com.aiwriter.app.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.*
import com.aiwriter.app.data.remote.AiWriterOutput
import com.aiwriter.app.data.remote.GeneratedFile
import com.aiwriter.app.ui.screens.*
import com.aiwriter.app.ui.theme.LocalAppColors

data class BottomNavItem(
    val screen: Screen,
    val icon: ImageVector,
    val label: String
)

// Shared state holders for navigation
object NavState {
    var aiOutput: AiWriterOutput? = null
    var generatedFiles: List<GeneratedFile> = emptyList()
    var processingMode: String = "generate"  // "generate", "translate", "summarize"
    var topic: String = ""
    var language: String = "English"
    var languageCode: String = "en"
    var outputFormats: Set<String> = setOf("pdf", "docx")
    var uploadedContent: String? = null
    var uploadedFileName: String? = null
    var sourceLanguage: String = "English"
    var targetLanguage: String = "Spanish"
}

@Composable
fun AppNavHost() {
    val navController = rememberNavController()
    val colors = LocalAppColors.current
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val bottomNavItems = listOf(
        BottomNavItem(Screen.Home, Icons.Default.Edit, "Generate"),
        BottomNavItem(Screen.Summarize, Icons.Default.Description, "Summarize"),
        BottomNavItem(Screen.Translate, Icons.Default.Translate, "Translate"),
        BottomNavItem(Screen.History, Icons.Default.History, "History"),
        BottomNavItem(Screen.Settings, Icons.Default.Settings, "Settings")
    )

    val showBottomBar = currentRoute in bottomNavItems.map { it.screen.route }

    Scaffold(
        containerColor = colors.background,
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(
                    containerColor = colors.surface,
                    contentColor = colors.textPrimary
                ) {
                    bottomNavItems.forEach { item ->
                        NavigationBarItem(
                            selected = currentRoute == item.screen.route,
                            onClick = {
                                navController.navigate(item.screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                Icon(item.icon, contentDescription = item.label)
                            },
                            label = { Text(item.label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = colors.primary,
                                selectedTextColor = colors.primary,
                                unselectedIconColor = colors.textMuted,
                                unselectedTextColor = colors.textMuted,
                                indicatorColor = colors.primaryLight
                            )
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Home.route) {
                HomeScreen(
                    onGenerate = { topic, lang, langCode, formats, content, fileName ->
                        NavState.processingMode = "generate"
                        NavState.topic = topic
                        NavState.language = lang
                        NavState.languageCode = langCode
                        NavState.outputFormats = formats
                        NavState.uploadedContent = content
                        NavState.uploadedFileName = fileName
                        navController.navigate(Screen.Processing.route)
                    }
                )
            }

            composable(Screen.Translate.route) {
                TranslateScreen(
                    onTranslate = { text, srcLang, tgtLang, formats ->
                        NavState.processingMode = "translate"
                        NavState.uploadedContent = text
                        NavState.sourceLanguage = srcLang
                        NavState.targetLanguage = tgtLang
                        NavState.language = tgtLang
                        NavState.outputFormats = formats
                        NavState.topic = "Translation: $srcLang → $tgtLang"
                        navController.navigate(Screen.Processing.route)
                    }
                )
            }

            composable(Screen.Summarize.route) {
                SummarizeScreen(
                    onSummarize = { text, lang, langCode, formats ->
                        NavState.processingMode = "summarize"
                        NavState.uploadedContent = text
                        NavState.language = lang
                        NavState.languageCode = langCode
                        NavState.outputFormats = formats
                        NavState.topic = "Summary"
                        navController.navigate(Screen.Processing.route)
                    }
                )
            }

            composable(Screen.History.route) {
                HistoryScreen()
            }

            composable(Screen.Settings.route) {
                SettingsScreen()
            }

            composable(Screen.Processing.route) {
                ProcessingScreen(
                    onComplete = { output ->
                        NavState.aiOutput = output
                        navController.navigate(Screen.Editor.route) {
                            popUpTo(Screen.Processing.route) { inclusive = true }
                        }
                    },
                    onCancel = {
                        navController.popBackStack()
                    }
                )
            }

            composable(Screen.Editor.route) {
                EditorScreen(
                    onGenerateFiles = { files ->
                        NavState.generatedFiles = files
                        navController.navigate(Screen.Result.route) {
                            popUpTo(Screen.Editor.route) { inclusive = true }
                        }
                    },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Result.route) {
                ResultScreen(
                    onCreateNew = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Home.route) { inclusive = true }
                        }
                    }
                )
            }
        }
    }
}
