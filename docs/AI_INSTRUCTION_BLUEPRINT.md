# 📱 AI Writer — Complete AI Instruction & JSON Blueprint

## 1. Core Purpose

AI Writer is a **fully automated mobile app**:

- Users **enter a topic** or **upload content** (PDF, Word, Excel, PPT, TXT).
- **Longcat AI** automatically:
  - Summarizes or rewrites the content
  - Generates professional documents in **PDF, Word, PPT, Excel**
  - Maintains correct structure, headings, bullets, tables, slides
- Files are fully **compatible with Microsoft Office, WPS Office, Google Docs/Sheets/Slides, LibreOffice**.
- Supports **all major languages** (English, Spanish, French, German, Chinese, Arabic, Russian, Hindi, Japanese, Korean, etc.).
- Users can **preview files in-app** or **download for external use**.

---

## 2. User Flow

1. **Home Screen**
   - Topic input field: "Enter your topic here…"
   - Optional file upload button
   - Language selector dropdown

2. **Processing Screen**
   - AI working animation / progress bar
   - Status text ("Generating content…", "Building PDF…", etc.)

3. **Result Screen**
   - List of generated files (PDF, Word, PPT, Excel)
   - **Preview** each file in-app
   - **Download / Share** buttons

4. **History Screen**
   - List of previously generated files
   - Re-download or view
   - Delete old files

---

## 3. AI Instruction Prompt for Longcat AI

```
You are AI Writer, an intelligent assistant specialized in creating professional multi-format documents.

Input:
- User Topic / Instructions: {user_input}
- Optional Uploaded Content: {uploaded_content}
- Output Language: {user_language} (any major language)
- Output Formats: PDF, Word, PPT, Excel

Rules:
1. Generate professional content ONLY based on the topic or uploaded content.
2. Do NOT produce random or unrelated content.
3. Preserve grammar, spelling, punctuation, and formatting for the selected language.
4. Always structure output for each file type:

PDF & Word:
- Title
- Author
- Sections
- Each section: Heading, Paragraph, Bulleted Key Points, optional Image Keyword

PPT:
- Each section becomes a slide
- Each slide: Title, Bullets, optional Image Keyword

Excel:
- Table format
- Headers: Section, Key Points, Image Keyword
- Rows: content for each section

5. Use UTF-8 encoding for all text.
6. Include all content necessary for the requested formats.
7. Do NOT skip sections or produce empty content.
8. Generate a MINIMUM of 5 sections for any topic.
9. Each paragraph must be at least 3 sentences long.
10. Each section must have at least 3 bullet points.

Output:
- Structured JSON containing all file formats.
- Must be valid, parseable JSON.
- All strings must be properly escaped.
```

---

## 4. JSON Output Schema

### Combined Output (Full Response)

```json
{
  "pdf_word": {
    "title": "Document Title",
    "author": "AI Writer",
    "language": "{user_language}",
    "sections": [
      {
        "heading": "Section Heading",
        "paragraph": "Professional paragraph content (minimum 3 sentences).",
        "bullets": ["Key Point 1", "Key Point 2", "Key Point 3"],
        "image_keyword": "relevant illustration keyword"
      }
    ]
  },
  "ppt": {
    "slides": [
      {
        "title": "Slide Title",
        "bullets": ["Key Point 1", "Key Point 2", "Key Point 3"],
        "image_keyword": "relevant illustration keyword"
      }
    ]
  },
  "excel": {
    "headers": ["Section", "Key Points", "Image Keyword"],
    "rows": [
      ["Section Name", "Summarized key points", "illustration keyword"]
    ]
  }
}
```

---

## 5. File Format Specifications

### PDF
- **Library**: `pdf-lib` or `jspdf`
- **Structure**: Title page → Table of Contents → Sections with headings, paragraphs, bullets
- **Font**: Embedded Unicode font (supports all languages)
- **Page Size**: A4 (210mm × 297mm)
- **Margins**: 25mm all sides
- **Encoding**: UTF-8

### Word (.docx)
- **Library**: `docx` (npm package)
- **Structure**: Title, Author metadata, Heading1 for sections, Normal for paragraphs, List Bullet for bullets
- **Compatibility**: Office 2007+ (.docx format)
- **Encoding**: UTF-8

### PowerPoint (.pptx)
- **Library**: `pptxgenjs`
- **Structure**: Title slide → Content slides (one per section)
- **Slide Size**: Widescreen 16:9
- **Template**: Professional theme with consistent colors
- **Encoding**: UTF-8

### Excel (.xlsx)
- **Library**: `ExcelJS`
- **Structure**: Header row (bold) → Data rows
- **Column Widths**: Auto-fit to content
- **Compatibility**: Office 2007+ (.xlsx format)
- **Encoding**: UTF-8

---

## 6. Multi-Language Support

### Supported Languages
| Code  | Language   | Direction |
|-------|-----------|-----------|
| en    | English   | LTR       |
| es    | Spanish   | LTR       |
| fr    | French    | LTR       |
| de    | German    | LTR       |
| zh    | Chinese   | LTR       |
| ja    | Japanese  | LTR       |
| ko    | Korean    | LTR       |
| ar    | Arabic    | RTL       |
| ru    | Russian   | LTR       |
| hi    | Hindi     | LTR       |
| pt    | Portuguese| LTR       |
| it    | Italian   | LTR       |
| tr    | Turkish   | LTR       |
| nl    | Dutch     | LTR       |
| pl    | Polish    | LTR       |

### RTL Language Handling
- Arabic and Hebrew content must maintain **Right-to-Left** text direction
- PDF: Set text alignment to right, paragraph direction RTL
- Word: Set `BiDi` property on paragraphs
- PPT: Set `rtl` property on text boxes
- Excel: Set cell alignment to right

---

## 7. Error Handling Rules

1. If AI returns invalid JSON → retry up to 3 times
2. If AI returns empty sections → reject and retry
3. If file generation fails → show error with retry option
4. If uploaded file is corrupt → show "Unable to read file" message
5. If network fails → cache input, retry when connected
6. Never show raw error messages to the user

---

## 8. Quality Checklist

- [ ] All generated files open correctly in target applications
- [ ] Content matches the requested topic
- [ ] Language is correct throughout all files
- [ ] No empty sections or placeholder text
- [ ] PDF has proper page breaks and formatting
- [ ] Word document has correct heading hierarchy
- [ ] PPT slides are readable and properly laid out
- [ ] Excel data is properly aligned in columns
- [ ] UTF-8 characters display correctly
- [ ] RTL languages display correctly where applicable
