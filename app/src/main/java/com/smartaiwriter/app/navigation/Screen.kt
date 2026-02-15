package com.smartaiwriter.app.navigation

sealed class Screen(val route: String) {
    data object Splash : Screen("splash")
    data object Home : Screen("home")
    data object Translate : Screen("translate")
    data object Summarize : Screen("summarize")
    data object History : Screen("history")
    data object Settings : Screen("settings")
    data object Processing : Screen("processing")
    data object Editor : Screen("editor")
    data object Result : Screen("result")
    data object Privacy : Screen("privacy")
    data object Terms : Screen("terms")
}
