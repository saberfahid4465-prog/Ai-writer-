package com.aiwriter.app.navigation

import androidx.compose.animation.*
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.*
import com.aiwriter.app.data.remote.AiWriterOutput
import com.aiwriter.app.data.remote.GeneratedFile
import com.aiwriter.app.ui.screens.*
import com.aiwriter.app.ui.theme.LocalAppColors
import com.aiwriter.app.util.PreferencesManager

data class BottomNavItem(
    val screen: Screen,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
    val label: String
)

// Shared state holders for navigation
object NavState {
    var aiOutput: AiWriterOutput? = null
    var generatedFiles: List<GeneratedFile> = emptyList()
    var processingMode: String = "generate"
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
    val context = LocalContext.current
    val prefs = PreferencesManager.getInstance(context)
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    // Check if first launch for splash
    val hasSeenSplash = prefs.hasSeenOnboarding

    val bottomNavItems = listOf(
        BottomNavItem(Screen.Home, Icons.Filled.EditNote, Icons.Outlined.EditNote, "Create"),
        BottomNavItem(Screen.Summarize, Icons.Filled.Summarize, Icons.Outlined.Summarize, "Summary"),
        BottomNavItem(Screen.Translate, Icons.Filled.Translate, Icons.Outlined.Translate, "Translate"),
        BottomNavItem(Screen.History, Icons.Filled.FolderOpen, Icons.Outlined.FolderOpen, "History"),
        BottomNavItem(Screen.Settings, Icons.Filled.Tune, Icons.Outlined.Tune, "Settings")
    )

    val showBottomBar = currentRoute in bottomNavItems.map { it.screen.route }

    Scaffold(
        containerColor = colors.background,
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(
                    containerColor = colors.surface,
                    contentColor = colors.textPrimary,
                    tonalElevation = 0.dp,
                    modifier = Modifier.clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
                ) {
                    bottomNavItems.forEach { item ->
                        val isSelected = currentRoute == item.screen.route
                        NavigationBarItem(
                            selected = isSelected,
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
                                Icon(
                                    if (isSelected) item.selectedIcon else item.unselectedIcon,
                                    contentDescription = item.label,
                                    modifier = Modifier.size(22.dp)
                                )
                            },
                            label = {
                                Text(
                                    item.label,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                    maxLines = 1
                                )
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = colors.primary,
                                selectedTextColor = colors.primary,
                                unselectedIconColor = colors.textMuted,
                                unselectedTextColor = colors.textMuted,
                                indicatorColor = colors.primary.copy(alpha = 0.1f)
                            )
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = if (hasSeenSplash) Screen.Home.route else Screen.Splash.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            // Splash / Onboarding
            composable(Screen.Splash.route) {
                SplashScreen(
                    onFinished = {
                        prefs.hasSeenOnboarding = true
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    }
                )
            }

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
                        // Go to Result/Preview page directly
                        navController.navigate(Screen.Result.route) {
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
                    },
                    onEditDocument = {
                        navController.navigate(Screen.Editor.route)
                    }
                )
            }
        }
    }
}

