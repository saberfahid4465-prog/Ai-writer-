# 📱 AI Writer — Automated Multi-Format Document Generator

AI Writer is a fully automated mobile app that generates professional documents (PDF, Word, PPT, Excel) from a user-provided topic or uploaded content, powered by Longcat AI.

## Features

- **Topic-to-Document**: Enter a topic → AI generates structured content → Outputs professional files
- **File Upload**: Upload PDF, Word, Excel, PPT, or TXT → AI summarizes/rewrites → Outputs new files
- **Multi-Format Output**: PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx)
- **Multi-Language**: English, Spanish, French, German, Chinese, Japanese, Korean, Arabic, Russian, Hindi, and more
- **In-App Preview**: Preview all generated files before downloading
- **Office Compatible**: Files work with Microsoft Office, WPS Office, Google Docs/Sheets/Slides, LibreOffice

## Project Structure

```
ai-writer/
├── docs/                        # Documentation & blueprints
│   ├── AI_INSTRUCTION_BLUEPRINT.md
│   ├── USER_FLOW.md
│   └── IMPLEMENTATION_NOTES.md
├── templates/                   # JSON templates for AI output
│   ├── combined_template.json
│   ├── pdf_word_template.json
│   ├── ppt_template.json
│   └── excel_template.json
├── src/
│   ├── ai/                      # AI service layer
│   │   ├── longcatService.ts
│   │   ├── promptBuilder.ts
│   │   └── responseParser.ts
│   ├── generators/              # File generation modules
│   │   ├── pdfGenerator.ts
│   │   ├── wordGenerator.ts
│   │   ├── pptGenerator.ts
│   │   └── excelGenerator.ts
│   ├── screens/                 # React Native screens
│   │   ├── HomeScreen.tsx
│   │   ├── ProcessingScreen.tsx
│   │   ├── ResultScreen.tsx
│   │   └── HistoryScreen.tsx
│   ├── components/              # Shared UI components
│   │   ├── FileCard.tsx
│   │   ├── FilePreview.tsx
│   │   ├── LanguagePicker.tsx
│   │   └── UploadButton.tsx
│   ├── utils/                   # Utility functions
│   │   ├── fileStorage.ts
│   │   └── languageConfig.ts
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   └── App.tsx
├── package.json
├── tsconfig.json
├── app.json
└── README.md
```

## Quick Start

```bash
# Install dependencies
npm install

# Start the development server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React Native (Expo)               |
| AI Engine  | Longcat AI API                    |
| PDF        | pdf-lib / jspdf                   |
| Word       | docx                              |
| PPT        | pptxgenjs                         |
| Excel      | ExcelJS                           |
| Storage    | AsyncStorage / expo-file-system   |
| Images     | Pexels API (optional)             |

## License

MIT
