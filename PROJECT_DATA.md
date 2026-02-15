# AI Writer — Project Data & Signing Reference

> **Last Updated:** February 15, 2026  
> **Platform:** Android (Native Kotlin + Jetpack Compose)

---

## 1. App Identity

| Key               | Value                              |
|-------------------|------------------------------------|
| App Name          | AI Writer                          |
| Package / App ID  | `com.aiwriter.app`                 |
| Version Name      | `2.0.0`                            |
| Version Code      | `3`                                |
| Min SDK           | 26 (Android 8.0 Oreo)             |
| Target SDK        | 35 (Android 15)                    |
| Compile SDK       | 35                                 |
| Default Language  | English (en-US)                    |
| Play Store Category | Productivity                     |

---

## 2. Signing / Keystore

| Key               | Value                              |
|-------------------|------------------------------------|
| Keystore File     | `keystore/ai-writer.keystore`      |
| Key Algorithm     | RSA 2048-bit                       |
| Validity          | 10 000 days                        |
| Key Alias         | `ai-writer`                        |
| Store Password    | `ai-writer-2024`                   |
| Key Password      | `ai-writer-2024`                   |
| DN                | CN=AI Writer, O=AI Writer, L=Internet, ST=Cloud, C=US |

> The keystore is **generated at build time** in CI (GitHub Actions).  
> For local builds, place the keystore at `keystore/ai-writer.keystore`.

### Environment Variables (optional overrides)

```
KEYSTORE_PASSWORD=ai-writer-2024
KEY_ALIAS=ai-writer
KEY_PASSWORD=ai-writer-2024
```

---

## 3. API Keys & Services

### Longcat AI (Document Generation)

| Key          | Value                                              |
|--------------|----------------------------------------------------|
| Base URL     | `https://api.longcat.chat/openai/v1/`              |
| API Key      | `ak_1qL7Vt7Kv4FJ6FM3rS1iV4M76z15d`               |
| Model        | gpt-4o-mini (via Longcat proxy)                    |
| Used for     | Content generation, translation, summarization, section editing |

### Pexels (Stock Images)

| Key          | Value                                              |
|--------------|----------------------------------------------------|
| Base URL     | `https://api.pexels.com/v1/`                       |
| API Key      | `0d2c1eWervvFsosDO8VA1TXdi0z0lVlUmqHCrWo2CLWP0YT2249f9fvf` |
| Used for     | Fetching relevant stock photos for generated documents |

> Keys are stored in `app/src/main/java/com/aiwriter/app/service/AiService.kt`

---

## 4. GitHub Repository

| Key               | Value                                          |
|-------------------|------------------------------------------------|
| Repository        | `saberfahid4465-prog/Ai-writer-`               |
| URL               | https://github.com/saberfahid4465-prog/Ai-writer- |
| Branch            | `main`                                         |
| PAT (Push)        | `[STORED LOCALLY - DO NOT COMMIT]`    |
| CI Workflow       | `.github/workflows/build.yml`                  |
| Owner Email       | `saberfahid4465@gmail.com`                     |

### Push Command (with PAT)

```
git push https://<YOUR_PAT>@github.com/saberfahid4465-prog/Ai-writer-.git main
```

---

## 5. Build System

| Key               | Value               |
|-------------------|---------------------|
| AGP               | 8.7.3               |
| Kotlin            | 2.1.0               |
| Gradle            | 8.11.1              |
| Java              | 17 (Temurin)        |
| Compose BOM       | 2024.12.01          |
| Compose Compiler  | Kotlin plugin 2.1.0 |
| ProGuard          | Enabled (minify + shrink resources) |

### Build Outputs

| Output | CI Artifact Name           | Local Path                                              |
|--------|----------------------------|---------------------------------------------------------|
| AAB    | `ai-writer-play-store-aab`| `app/build/outputs/bundle/release/app-release.aab`      |
| APK    | `ai-writer-release-apk`   | `app/build/outputs/apk/release/app-release.apk`         |

### Desktop Download Location

```
%USERPROFILE%\Desktop\AI-Writer-Build\
```

---

## 6. Dependencies

### Compose & UI
- `androidx.compose:compose-bom:2024.12.01`
- `androidx.compose.material3:material3`
- `androidx.compose.material:material-icons-extended`
- `androidx.activity:activity-compose:1.9.3`
- `androidx.navigation:navigation-compose:2.8.5`

### Lifecycle
- `androidx.lifecycle:lifecycle-runtime-compose:2.8.7`
- `androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7`

### Data
- `androidx.datastore:datastore-preferences:1.1.1`
- `androidx.room:room-runtime:2.6.1`
- `androidx.room:room-ktx:2.6.1`

### Networking
- `com.squareup.retrofit2:retrofit:2.11.0`
- `com.squareup.retrofit2:converter-gson:2.11.0`
- `com.squareup.okhttp3:okhttp:4.12.0`
- `com.squareup.okhttp3:logging-interceptor:4.12.0`
- `com.google.code.gson:gson:2.11.0`

### Other
- `org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0`
- `androidx.core:core-ktx:1.15.0`
- `androidx.documentfile:documentfile:1.0.1`

---

## 7. Android Permissions

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

No camera, location, storage, or contacts permissions.

---

## 8. Website & Legal Pages

| Page             | URL                                                                    |
|------------------|------------------------------------------------------------------------|
| Privacy Policy   | https://saberfahid4465-prog.github.io/Ai-writer-/privacy              |
| Terms of Service | https://saberfahid4465-prog.github.io/Ai-writer-/terms                |
| Copyright        | https://saberfahid4465-prog.github.io/Ai-writer-/copyright            |
| Landing Page     | https://saberfahid4465-prog.github.io/Ai-writer-/                     |

Source files: `website/` directory.

---

## 9. Key Source File Locations

```
app/src/main/java/com/aiwriter/app/
├── MainActivity.kt                        — App entry point
├── data/
│   ├── local/
│   │   ├── AppDatabase.kt                — Room database
│   │   ├── DocumentDao.kt                — DAO for documents
│   │   └── DocumentEntity.kt             — Entity
│   └── remote/
│       ├── LongcatApi.kt                 — Retrofit interface (AI)
│       ├── PexelsApi.kt                  — Retrofit interface (images)
│       └── Models.kt                     — API data classes
├── navigation/
│   ├── Screen.kt                         — Route definitions
│   └── NavGraph.kt                       — Navigation graph + NavState
├── service/
│   ├── AiService.kt                      — AI + Pexels API calls
│   ├── FileGeneratorService.kt           — Orchestrates file generation
│   ├── FileParserService.kt              — Parses uploaded files
│   ├── PdfGenerator.kt                   — PDF builder
│   ├── DocxGenerator.kt                  — DOCX builder
│   ├── PptxGenerator.kt                  — PPTX builder
│   └── XlsxGenerator.kt                  — XLSX builder
├── ui/
│   ├── components/
│   │   ├── FormatPicker.kt               — Format selection chips
│   │   └── LanguagePicker.kt             — Language selector
│   ├── screens/
│   │   ├── HomeScreen.kt                 — Main generation screen
│   │   ├── TranslateScreen.kt            — Translation screen
│   │   ├── SummarizeScreen.kt            — Summarization screen
│   │   ├── ProcessingScreen.kt           — Loading/progress screen
│   │   ├── EditorScreen.kt               — Document editor
│   │   ├── ResultScreen.kt               — File preview/download
│   │   ├── HistoryScreen.kt              — Saved documents
│   │   ├── SettingsScreen.kt             — App settings
│   │   └── SplashScreen.kt              — Onboarding splash
│   └── theme/
│       ├── Theme.kt                      — ThemeState + AiWriterTheme
│       └── Color.kt                      — Color palette
└── util/
    ├── PreferencesManager.kt             — SharedPreferences wrapper
    ├── LanguageConfig.kt                 — Language definitions (32 content + 15 UI)
    └── FileUtils.kt                      — Save/share file helpers

app/src/main/res/
├── drawable/                             — app_logo.png, app_logo_white.png
├── drawable-night/                       — app_logo.png (white variant)
├── drawable-{mdpi..xxxhdpi}/             — ic_launcher_foreground.png
├── mipmap-{mdpi..xxxhdpi}/              — ic_launcher.png, ic_launcher_round.png
├── mipmap-anydpi-v26/                   — ic_launcher.xml, ic_launcher_round.xml
├── values/
│   ├── colors.xml
│   ├── strings.xml
│   ├── themes.xml
│   └── ic_launcher_background.xml        — #000000 (black)
└── xml/
    └── file_paths.xml
```

---

## 10. Play Store Declarations

| Declaration           | Value                                       |
|-----------------------|---------------------------------------------|
| App Access            | All functionality without special access    |
| Content Rating        | Everyone / PEGI 3                           |
| Ads                   | No ads                                      |
| Data Collected        | No personal data collected                  |
| Data Encrypted        | Yes (HTTPS)                                 |
| Target Audience       | General (18+, not for children under 13)    |
| Advertising ID        | Not used                                    |
| Financial Features    | None                                        |

---

## 11. Design System

| Token           | Light Mode  | Dark Mode   |
|-----------------|-------------|-------------|
| Primary         | `#353636`   | `#FFFFFF`   |
| Background      | `#FFFFFF`   | `#121212`   |
| Surface         | `#FFFFFF`   | `#1E1E1E`   |
| Card            | `#F8F9FA`   | `#252525`   |
| Text Primary    | `#1A1A1A`   | `#F5F5F5`   |
| Text Secondary  | `#4A4A4A`   | `#CCCCCC`   |
| Text Muted      | `#8E8E93`   | `#8E8E93`   |
| Launcher Icon   | Black background (`#000000`) + White pen    |

Theme modes: Light / Dark / System (auto)

---

## 12. App Features

- AI document generation (articles, reports, plans, etc.)
- Translation (32 languages)
- Summarization
- Section-level editing (improve, expand, shorten, regenerate)
- Multi-format export: PDF, DOCX, PPTX, XLSX
- Pexels stock image embedding
- File upload & parsing (DOCX, PPTX, XLSX, TXT, CSV)
- Document history (Room database)
- Dark mode with instant switching
- Animated onboarding splash screen
- Daily token usage tracking

---
