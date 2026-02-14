# AI Writer — Implementation Notes

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    React Native App                  │
│                                                     │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────┐ │
│  │  Home   │  │Processing│  │ Result  │  │History│ │
│  │ Screen  │  │  Screen  │  │ Screen  │  │Screen │ │
│  └────┬────┘  └────┬─────┘  └────┬────┘  └───┬──┘ │
│       │            │             │            │     │
│  ┌────▼────────────▼─────────────▼────────────▼──┐  │
│  │              Navigation + State               │  │
│  └───────────────────┬───────────────────────────┘  │
│                      │                              │
│  ┌───────────────────▼───────────────────────────┐  │
│  │              AI Service Layer                  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────────┐ │  │
│  │  │  Prompt  │ │ Longcat  │ │   Response    │ │  │
│  │  │ Builder  │ │ API Call │ │   Parser      │ │  │
│  │  └──────────┘ └──────────┘ └───────────────┘ │  │
│  └───────────────────┬───────────────────────────┘  │
│                      │                              │
│  ┌───────────────────▼───────────────────────────┐  │
│  │            File Generator Layer                │  │
│  │  ┌─────┐ ┌──────┐ ┌─────┐ ┌───────┐         │  │
│  │  │ PDF │ │ Word │ │ PPT │ │ Excel │         │  │
│  │  └─────┘ └──────┘ └─────┘ └───────┘         │  │
│  └───────────────────┬───────────────────────────┘  │
│                      │                              │
│  ┌───────────────────▼───────────────────────────┐  │
│  │          Storage & File System                 │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer             | Technology                      | Purpose                          |
|-------------------|---------------------------------|----------------------------------|
| Framework         | React Native + Expo             | Cross-platform mobile app        |
| Language          | TypeScript                      | Type-safe development            |
| Navigation        | React Navigation                | Screen routing                   |
| State Management  | React Context / Zustand         | App state management             |
| AI Provider       | Longcat AI API                  | Content generation               |
| PDF Generation    | pdf-lib                         | Create PDF files                 |
| Word Generation   | docx                            | Create .docx files               |
| PPT Generation    | pptxgenjs                       | Create .pptx files               |
| Excel Generation  | ExcelJS                         | Create .xlsx files               |
| File Storage      | expo-file-system                | Save generated files             |
| File Sharing      | expo-sharing                    | Share files externally           |
| File Upload       | expo-document-picker            | Upload user documents            |
| PDF Viewer        | react-native-pdf                | In-app PDF preview               |
| HTTP Client       | axios / fetch                   | API communication                |
| Images (optional) | Pexels API                      | Stock illustrations in documents |

## Key Dependencies (package.json)

```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "react": "18.2.0",
    "react-native": "0.73.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/native-stack": "^6.9.0",
    "react-native-screens": "~3.29.0",
    "react-native-safe-area-context": "4.8.2",
    "expo-file-system": "~16.0.0",
    "expo-sharing": "~11.10.0",
    "expo-document-picker": "~11.10.0",
    "pdf-lib": "^1.17.1",
    "docx": "^8.5.0",
    "pptxgenjs": "^3.12.0",
    "exceljs": "^4.4.0",
    "react-native-pdf": "^6.7.0",
    "axios": "^1.6.0"
  }
}
```

## API Integration

### Longcat AI Request Format
```typescript
interface AIRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user';
    content: string;
  }>;
  temperature: number;
  max_tokens: number;
  response_format: { type: 'json_object' };
}
```

### Expected Response
The AI returns structured JSON matching the combined template schema (see templates/combined_template.json).

## File Naming Convention

Generated files follow this pattern:
```
{sanitized_topic}_{timestamp}.{extension}
```
Example:
- `climate_change_20260214_143022.pdf`
- `climate_change_20260214_143022.docx`
- `climate_change_20260214_143022.pptx`
- `climate_change_20260214_143022.xlsx`

## Storage Strategy

- **Generated files**: Stored in app's document directory via `expo-file-system`
- **History metadata**: Stored in AsyncStorage as JSON array
- **Settings (language preference)**: Stored in AsyncStorage

## Error Handling Strategy

1. **AI API Failure**: Retry up to 3 times with exponential backoff
2. **Invalid JSON Response**: Attempt to extract valid JSON, retry if failed
3. **File Generation Error**: Skip failed format, generate others, show partial results
4. **Network Offline**: Queue request, notify user, retry when online
5. **File Upload Failure**: Show specific error (unsupported format, too large, corrupt)

## Performance Considerations

- Generate files in parallel (Promise.all) after receiving AI response
- Lazy-load file viewers (only load when user taps Preview)
- Limit history to last 50 entries by default
- Compress generated files where possible
- Use streaming for large file uploads
