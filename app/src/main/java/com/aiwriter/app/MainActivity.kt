package com.aiwriter.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.aiwriter.app.navigation.AppNavHost
import com.aiwriter.app.ui.theme.AiWriterTheme
import com.aiwriter.app.ui.theme.ThemeState
import com.aiwriter.app.util.AppLanguageState
import com.aiwriter.app.util.PreferencesManager

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Initialize theme from saved preference
        val prefs = PreferencesManager.getInstance(this)
        ThemeState.themeMode = prefs.themeMode
        AppLanguageState.languageCode = prefs.appLanguage

        setContent {
            AiWriterTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AppNavHost()
                }
            }
        }
    }
}
