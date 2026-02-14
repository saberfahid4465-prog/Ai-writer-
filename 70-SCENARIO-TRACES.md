# 70 Scenario Traces — Excel (30) + Upload-Generate (20) + Design/UI (20)

## Methodology
Each scenario traces the **exact code path** through the real source files, identifies variable states, edge cases, and potential bugs. Severity: CRITICAL / HIGH / MEDIUM / LOW.

---

# PART A: EXCEL GENERATION — 30 Scenarios

---

## E01: sanitizeSheetName with title containing colon `:`
**Input:** `metaData.title = "AI: The Future"`
**Trace:**
1. `sanitizeSheetName("AI: The Future")` in excelGenerator.ts
2. `.replace(/[*?:\\/\[\]]/g, ' ')` → `"AI  The Future"` (colon replaced with space)
3. `.replace(/\s+/g, ' ')` → `"AI The Future"`
4. `.trim()` → `"AI The Future"`
5. `.substring(0, 31)` → `"AI The Future"` (14 chars)
6. Fallback `|| 'Sheet'` skipped (non-empty)
7. Sheet name = `"AI The Future"` ✅

**Result:** PASS — Colon correctly sanitized.

---

## E02: sanitizeSheetName with ALL illegal characters `*?:\\/[]`
**Input:** `metaData.title = "Q*u?e:s\\t/i[o]n"`
**Trace:**
1. `.replace(/[*?:\\/\[\]]/g, ' ')` → `"Q u e s t i o n"`
2. `.replace(/\s+/g, ' ')` → `"Q u e s t i o n"`
3. `.trim()` → `"Q u e s t i o n"` (15 chars)
4. Result: `"Q u e s t i o n"` ✅

**Result:** PASS — All 7 illegal characters stripped.

---

## E03: sanitizeSheetName with title exactly 31 characters
**Input:** `metaData.title = "ABCDEFGHIJKLMNOPQRSTUVWXYZ12345"` (31 chars)
**Trace:**
1. No illegal chars → passes through replace unchanged
2. `.substring(0, 31)` → all 31 chars kept
3. Result: `"ABCDEFGHIJKLMNOPQRSTUVWXYZ12345"` ✅

**Result:** PASS — Exactly 31 chars preserved.

---

## E04: sanitizeSheetName with title 32+ characters
**Input:** `metaData.title = "This Is A Very Long Title That Exceeds The Excel Limit"` (55 chars)
**Trace:**
1. No illegal chars → no change
2. `.substring(0, 31)` → `"This Is A Very Long Title That "`
3. `.trim()` already happened BEFORE `.substring()` — wait, let me re-check order:
   - Actually: `.replace().replace().trim().substring(0, 31)`
   - `.trim()` → `"This Is A Very Long Title That Exceeds The Excel Limit"`
   - `.substring(0, 31)` → `"This Is A Very Long Title That "` (trailing space!)

**BUG FOUND — MEDIUM:** The `.trim()` runs BEFORE `.substring(0, 31)`. If the 31st character happens to be a space, the result has a trailing space. Excel may handle this but it looks unprofessional.

**Fix:** Add `.trim()` AFTER `substring(0, 31)` too, or reorder to `substring → trim`.

---

## E05: sanitizeSheetName with empty/whitespace-only title
**Input:** `metaData.title = "   "`
**Trace:**
1. `.replace(/[*?:\\/\[\]]/g, ' ')` → `"   "` (no illegal chars)
2. `.replace(/\s+/g, ' ')` → `" "` (single space)
3. `.trim()` → `""` (empty string)
4. `.substring(0, 31)` → `""`
5. `|| 'Sheet'` → `"Sheet"` ✅

**Result:** PASS — Fallback to "Sheet".

---

## E06: sanitizeSheetName with null/undefined title
**Input:** `metaData.title = undefined`
**Trace:**
1. `sanitizeSheetName(metaData.title || 'AI Writer Output')` in line ~69
2. `undefined || 'AI Writer Output'` → `"AI Writer Output"`
3. sanitizeSheetName processes normally → `"AI Writer Output"` ✅

**Result:** PASS — Default title used.

---

## E07: sanitizeSheetName with Unicode characters (Arabic/CJK)
**Input:** `metaData.title = "الذكاء الاصطناعي"`
**Trace:**
1. No `*?:\\/[]` chars → no replacement
2. Spaces already single → no collapse
3. `.trim()` → `"الذكاء الاصطناعي"` (17 chars)
4. `.substring(0, 31)` → full string (under 31)
5. ExcelJS: ExcelJS applies sheet name as-is.

**Result:** PASS — Unicode sheet names are valid in Excel.

---

## E08: Title row mergeCells when headers has only 1 column
**Input:** `excelData.headers = ['Section']` (1 header)
**Trace:**
1. `sheet.mergeCells(1, 1, 1, excelData.headers.length)` → `sheet.mergeCells(1, 1, 1, 1)`
2. Merging a single cell with itself — effectively a no-op
3. `titleRow.font = ...` sets font on one cell
4. Same for subtitle: `sheet.mergeCells(2, 1, 2, 1)` — single cell merge

**Result:** PASS — Works fine. Single column spreadsheet is unusual but valid.

---

## E09: Title row mergeCells when headers is empty array
**Input:** `excelData.headers = []` (0 headers)
**Trace:**
1. `sheet.mergeCells(1, 1, 1, 0)` — merge from column 1 to column 0!
2. ExcelJS behavior with 0 or negative column: **LIKELY CRASH or silent error**
3. Then `headerRow = sheet.addRow([])` → empty row
4. `headerRow.eachCell(...)` → no cells to iterate, no error
5. Data rows: `excelData.rows.forEach(...)` each row added but no headers
6. Auto-fit: `sheet.columns.forEach(...)` → no columns

**BUG FOUND — HIGH:** If AI returns `headers: []`, `mergeCells(1,1,1,0)` passes col=0 to ExcelJS. ExcelJS expects 1-based columns. This likely throws `"Index out of range"` or produces a corrupt file.

**Fix:** Guard: `if (excelData.headers.length > 0)` before merge operations.

---

## E10: Data rows with mismatched column count vs headers
**Input:** `headers = ['A', 'B', 'C']`, `rows = [['1', '2']]` (row has 2 values, 3 headers)
**Trace:**
1. `sheet.addRow(['1', '2'])` — ExcelJS adds row with 2 cells
2. `dataRow.eachCell(cell)` iterates 2 cells, applies styling
3. Third column in this row has no cell — no styling applied
4. Auto-fit: `column.width` for col 3: checks `excelData.rows[0][2]` = `undefined`
5. `undefined?.toString().length` → `0`
6. `Math.max(0 + 4, 15)` → `15`

**Result:** PASS — Short rows work, just have empty cells. Not a crash but may look odd.

---

## E11: Data row with very long cell text (1000+ characters)
**Input:** `rows = [["heading", "Very long text repeated x100...", "keyword"]]`
**Trace:**
1. Cell is added with full text, `wrapText: true` set in alignment
2. Row height fixed at `24` — long wrapped text won't be visible!
3. Auto-fit column width: `cellLength = 1000`, `Math.min(Math.max(1004, 15), 60)` → `60`
4. Column width capped at 60 characters
5. But row height stays at 24 — only ~1 line visible

**BUG FOUND — MEDIUM:** Row height is hardcoded to `24` for data rows. When `wrapText: true` is set but height is fixed, long text gets clipped visually. The user sees only the first line.

**Fix:** Either set dynamic row height or remove the fixed `dataRow.height = 24` to let Excel auto-size rows.

---

## E12: ExcelData with special characters in cell values (< > & " ')
**Input:** `rows = [["Tom & Jerry", "Speed > 100 km/h", "Price < $5"]]`
**Trace:**
1. ExcelJS handles & < > correctly in cell values — it's not XML-level
2. ExcelJS internally escapes when writing to OOXML
3. Cell values are stored as-is in the `sharedStrings.xml` with proper XML entity encoding

**Result:** PASS — ExcelJS handles XML escaping internally.

---

## E13: Alternating row colors — first data row (index 0)
**Input:** 3 data rows
**Trace:**
1. `excelData.rows.forEach((rowData, index) => ...)` where index starts at 0
2. Row 0: `index % 2 === 1` → `false` → NO fill color (white/default)
3. Row 1: `index % 2 === 1` → `true` → ALT_ROW_COLOR applied
4. Row 2: `index % 2 === 1` → `false` → NO fill color
5. Pattern: white, gray, white, gray...

**Result:** PASS — Alternation works correctly starting with no-fill on first data row.

---

## E14: Images sheet with no images (empty Map)
**Input:** `images = new Map()` (size = 0)
**Trace:**
1. `if (images && images.size > 0)` → `false` (size is 0)
2. Images sheet NOT created
3. Only the main data sheet exists in the workbook

**Result:** PASS — No crash, no empty sheet.

---

## E15: Images sheet with `images = undefined`
**Input:** `generateExcel(excelData, metaData, undefined)`
**Trace:**
1. `images` parameter is `undefined`
2. `if (images && images.size > 0)` → `false` (short-circuit on undefined)
3. Images sheet NOT created

**Result:** PASS — Optional parameter handled.

---

## E16: Image embedding with non-JPEG image data
**Input:** Image bytes are actually PNG, but extension set to `'jpeg'`
**Trace:**
1. `workbook.addImage({ base64: imgBase64, extension: 'jpeg' })`
2. ExcelJS writes the `extension: 'jpeg'` into the OOXML but stores the raw base64 as-is
3. When opened in Excel/Sheets, the image may render correctly if the viewer detects PNG magic bytes, or it may fail to display.

**BUG FOUND — LOW:** Pexels API returns JPEG images by default, so this is unlikely. BUT if another image source provides PNG, the hardcoded `extension: 'jpeg'` would be wrong.

**Fix Suggestion:** Detect image format from magic bytes (JPEG: `FF D8 FF`, PNG: `89 50 4E 47`) or make the extension configurable. Low priority since Pexels always gives JPEG.

---

## E17: Image embedding failure — try/catch behavior
**Input:** One image fails to embed (corrupt bytes)
**Trace:**
1. `uint8ArrayToBase64(img.imageBytes)` — if imageBytes is corrupt, base64 still generates
2. `workbook.addImage({ base64: corruptBase64 })` — ExcelJS may accept it
3. `imgSheet.addImage(imageId, ...)` — adds reference
4. But if `workbook.addImage` throws (e.g., empty imageBytes):
   - `catch (e) { console.warn('Failed to embed image in Excel:', e); }`
   - Continues to next image
5. Other images still get embedded, row counter still increments

**Result:** PASS — Individual image failure doesn't crash the whole sheet, but the row for the failed image still exists with empty image column.

---

## E18: `uint8ArrayToBase64` with large image (5MB)
**Input:** `img.imageBytes` = `Uint8Array(5242880)` (5MB)
**Trace:**
1. `uint8ArrayToBase64(bytes)` in base64Polyfill.ts
2. `let binary = ''; for (let i = 0; i < bytes.byteLength; i++) { binary += String.fromCharCode(bytes[i]); }`
3. This creates a string of 5,242,880 characters by concatenation
4. String concatenation in a loop is O(n²) for some JS engines
5. `encodeBinaryToBase64(binary)` → processes in 3-byte chunks
6. Output is ~7MB base64 string

**BUG FOUND — MEDIUM:** String concatenation in a loop (`binary += ...`) for 5MB of data creates O(n²) performance on some JS engines. Hermes may handle this OK, but for very large images it could cause freezing.

**Fix Suggestion:** Use `String.fromCharCode.apply(null, chunk)` in batches or build an array and join. Low priority since Pexels 'small' images are typically < 100KB.

---

## E19: Excel auto-fit with column width exactly at boundaries
**Input:** `maxLength = 56` (so 56 + 4 = 60, exactly at cap)
**Trace:**
1. `Math.min(Math.max(60, 15), 60)` → `Math.min(60, 60)` → `60`
2. Column width = 60 ✅

**Input:** `maxLength = 0` (empty cells)
1. `Math.min(Math.max(0 + 4, 15), 60)` → `Math.min(15, 60)` → `15`
2. Column width = 15 (minimum) ✅

**Result:** PASS — Boundary values handled correctly.

---

## E20: Excel with RTL text (Arabic) in cells
**Input:** `rows = [["مقدمة", "النقاط الرئيسية", "كلمة"]]`
**Trace:**
1. Cell alignment: `horizontal: 'left'` for data rows
2. Arabic text is RTL but alignment is forced 'left'
3. In Excel desktop, the cell respects text direction based on content
4. But in some viewers, left-aligned Arabic looks wrong

**BUG FOUND — MEDIUM:** Data cells use hardcoded `horizontal: 'left'` alignment. For RTL languages (Arabic, Hebrew, Urdu), text should be right-aligned in cells.

**Fix:** Detect RTL from the `metaData.language` and set `horizontal: isRTL ? 'right' : 'left'` for data row cells. (Same fix we did for PPT.)

---

## E21: Header row styling with very long header names
**Input:** `headers = ["Detailed Section Heading Information", "Key Points and Summary Details", "Image Search Keyword"]`
**Trace:**
1. Header row: height = 28, `wrapText: true`
2. With `wrapText: true` and height 28, long headers may wrap to 2 lines but get clipped
3. Auto-fit: column widths based on max of header and data lengths
4. Header "Detailed Section Heading Information" = 38 chars
5. `38 + 4 = 42`, `Math.min(42, 60)` → `42` width
6. At width 42, the header text may fit on one line

**Result:** PASS — Headers have wrapText and reasonable widths.

---

## E22: Excel generation with 0 data rows
**Input:** `excelData = { headers: ['A', 'B', 'C'], rows: [] }`
**Trace:**
1. Title row added → row 1
2. Subtitle row added → row 2
3. Spacer row → row 3
4. Header row added → row 4
5. `excelData.rows.forEach(...)` — empty array, no iteration
6. Auto-fit: `excelData.rows.forEach(row => ...)` — no data to check
7. `maxLength = excelData.headers[i]?.length || 10` → uses header lengths only
8. Workbook writes successfully with only headers

**Result:** PASS — Empty data is valid (just headers shown).

---

## E23: EditorScreen building Excel data from sections
**Input:** 3 sections, each with heading, bullets, image_keyword
**Trace:**
1. EditorScreen.tsx `handleGenerateFiles()`:
2. `validSections` filtered → let's say all 3 valid
3. `editedOutput.excel = { headers: ['Section', 'Key Points', 'Image Keyword'], rows: sectionData.map(s => [s.heading, s.bullets.join('; '), s.image_keyword || '']) }`
4. Section 1: `["Climate Change", "Rising temps; Melting ice; CO2 levels", "climate earth"]`
5. Section 2: `["Solutions", "Solar energy; Wind power; Conservation", "solar panel"]`
6. Section 3: `["Future", "Green tech; Policy; Education", "green city"]`
7. `generateExcel(editedOutput.excel, editedOutput.pdf_word, imageMap)` called

**Result:** PASS — Excel data correctly constructed from editor state.

---

## E24: EditorScreen building Excel data with empty bullets (all filtered)
**Input:** Section with `bullets: ["", "  ", ""]` (all empty/whitespace)
**Trace:**
1. `validSections` filter: `s.bullets.filter(b => b.trim())` → `[]` (empty)
2. Then: `s.bullets.length === 0 ? { ...s, bullets: [s.heading] } : s`
3. Bullets become `[s.heading]` — the heading is used as sole bullet
4. Excel row: `[heading, heading, image_keyword]` — "Key Points" is just the heading

**Result:** PASS — Graceful fallback, but the Key Points column just repeats the heading (slightly odd UX).

---

## E25: Excel writeBuffer → Uint8Array → base64 chain
**Input:** Generated workbook
**Trace:**
1. `workbook.xlsx.writeBuffer()` → returns `ArrayBuffer`
2. `new Uint8Array(arrayBuffer as ArrayBuffer)` → typed array
3. `uint8ArrayToBase64(bytes)` → calls `encodeBinaryToBase64(binary)` from base64Polyfill
4. Returns base64 string
5. In EditorScreen: `const excelBase64 = await generateExcel(...)` 
6. `saveFile(excelFileName, excelBase64)` → writes to `FileSystem.documentDirectory`

**Result:** PASS — Conversion chain is solid.

---

## E26: Excel with workbook metadata
**Input:** `metaData.author = "AI Writer"`, `metaData.title = "Climate Report"`
**Trace:**
1. `workbook.creator = 'AI Writer'`
2. `workbook.created = new Date()` — current timestamp
3. `workbook.modified = new Date()` — same timestamp
4. `workbook.lastModifiedBy = 'AI Writer'`
5. These end up in `docProps/core.xml` in the OOXML package

**Result:** PASS — Standard OOXML metadata set correctly.

---

## E27: Images sheet row numbering accuracy
**Input:** 3 images in the Map
**Trace:**
1. `imgRowNum = 4` (starts at row 4 — after title, spacer, header rows)
2. First image: `imgSheet.addRow([keyword, photographer, ''])` → row 4
3. `imgSheet.addImage(imageId, { tl: { col: 2, row: imgRowNum - 1 } })` → `row: 3` (0-indexed!)
4. `imgRowNum++` → 5
5. Second image: row 5, image at `row: 4` (0-indexed)
6. Third image: row 6, image at `row: 5` (0-indexed)

Wait — ExcelJS `addImage` uses 0-based row/col in the `tl` (top-left) position. Row 4 in 1-based = row 3 in 0-based. ✅

**Result:** PASS — Image positioning correct with 0-based indexing.

---

## E28: sanitizeSheetName with tab/newline characters in title
**Input:** `metaData.title = "Hello\tWorld\nTest"`
**Trace:**
1. `.replace(/[*?:\\/\[\]]/g, ' ')` — tab/newline NOT in the char class, so NOT replaced
2. `.replace(/\s+/g, ' ')` — `\t` and `\n` ARE whitespace, so replaced with single space
3. Result: `"Hello World Test"` ✅

**Result:** PASS — Whitespace normalization handles tabs and newlines.

---

## E29: Excel generation when ExcelJS throws during writeBuffer
**Input:** Somehow workbook.xlsx.writeBuffer() throws
**Trace:**
1. In EditorScreen.tsx `handleGenerateFiles()`:
2. Excel is in a Promise inside `Promise.all`
3. If `generateExcel()` throws, the promise rejects
4. `Promise.all(filePromises)` rejects immediately
5. `catch (error)` block: cleanup partial files with `for (const f of files)...deleteAsync`
6. Shows Alert with error message
7. `finally { setIsGenerating(false) }`

**Result:** PASS — Error handling covers Excel generation failure.

---

## E30: Excel with consecutive data rows having the same alternating color logic
**Input:** 100 data rows
**Trace:**
1. Rows 0, 2, 4, ...98 (even indices): NO fill → default white background
2. Rows 1, 3, 5, ...99 (odd indices): `ALT_ROW_COLOR = 'F0F0F2'` fill
3. Even rows: no `cell.fill` set. ExcelJS default: transparent/white
4. Odd rows: `cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F2' } }`
5. But wait — even rows NEVER get `cell.fill` set at all. If the cell previously had a fill from a copy/template, it would persist. In this case, fresh cells have no fill, so this is fine.

**Result:** PASS — Alternating colors work for large datasets.

---

# PART B: GENERATE BY UPLOAD FILE — 20 Scenarios

---

## U01: Upload DOCX file + topic text → ProcessingScreen
**Input:** User types "Analyze this report" + attaches `report.docx`
**Trace:**
1. HomeScreen: `topic = "Analyze this report"`, `uploadedFile = { canceled: false, assets: [{ uri: '...', name: 'report.docx' }] }`
2. `handleGenerate()`: `trimmed = "Analyze this report"`, length 19 >= 3 ✅
3. Navigation: `{ topic: "Analyze this report", uploadedFileUri: "file://cache/report.docx", uploadedFileName: "report.docx", ... }`
4. ProcessingScreen: `uploadedFileUri` is truthy → parse file
5. `parseUploadedFile(uri, 'report.docx')` → `getFileType('report.docx')` → `'docx'`
6. Reads as base64, calls `parseDocx(base64)` → JSZip → extracts `word/document.xml`
7. `uploadedContent = parsed.content`
8. `generateDocumentContent("Analyze this report", language, uploadedContent)` called
9. `buildPromptMessages()` includes `"Uploaded Content:\n---\n${uploadedContent}\n---\n"`
10. AI receives both topic and file content

**Result:** PASS — Full topic + file flow works.

---

## U02: Upload file WITHOUT topic text (topic < 3 chars)
**Input:** User leaves topic empty, attaches `data.xlsx`
**Trace:**
1. HomeScreen: `topic = ""`, `uploadedFile` is set
2. `handleGenerate()`: `trimmed = ""`, `trimmed.length < 3` = true
3. BUT `!uploadedFile` = false (file exists)
4. Condition: `trimmed.length < 3 && !uploadedFile` → `true && false` → `false`
5. Passes validation ✅
6. Navigation: `topic: '' || 'Uploaded Document'` → `topic: 'Uploaded Document'`
7. ProcessingScreen receives `topic = "Uploaded Document"`

**Result:** PASS — File-only upload uses "Uploaded Document" as topic.

---

## U03: Upload PDF file (unsupported format)
**Input:** User attaches `paper.pdf`
**Trace:**
1. HomeScreen `handleFileUpload()`: DocumentPicker type includes `'application/pdf'`
2. File picker allows PDF selection → `setUploadedFile(result)` ✅
3. User hits Generate → navigates to ProcessingScreen
4. ProcessingScreen: `parseUploadedFile(uri, 'paper.pdf')`
5. `getFileType('paper.pdf')` → `'pdf'`
6. Code: `if (fileType === 'pdf') throw new Error('PDF text extraction is not supported...')`
7. `catch (parseError)` in ProcessingScreen:
8. Alert shown: "PDF text extraction is not supported..." with "Go Back / Continue Without File"
9. If "Continue" → `uploadedContent` stays `undefined` → AI generates from topic alone

**Result:** PASS — PDF rejection handled with Alert choice.

---

## U04: Upload corrupt DOCX (not a valid ZIP)
**Input:** File named `report.docx` but content is random bytes
**Trace:**
1. ProcessingScreen: `parseUploadedFile(uri, 'report.docx')`
2. `FileSystem.readAsStringAsync(uri, { encoding: 'Base64' })` → base64 of random data
3. `parseDocx(base64)` → `JSZip.loadAsync(base64ToUint8Array(data))`
4. JSZip fails: "Not a valid zip file" or similar error
5. `catch (error)` in `parseDocx` — error propagates up
6. `parseUploadedFile` catch: `throw new Error('Unable to read "report.docx": Not a valid zip file...')`
7. ProcessingScreen catch: Alert with error → "Go Back / Continue Without File"

**Result:** PASS — Corrupt file handled gracefully.

---

## U05: Upload empty text file (0 bytes)
**Input:** `empty.txt` with 0 bytes
**Trace:**
1. `parseUploadedFile(uri, 'empty.txt')`
2. `getFileType('empty.txt')` → `'txt'`
3. `FileSystem.readAsStringAsync(uri, { encoding: 'UTF8' })` → `""`
4. Content = `""`
5. Validation: `if (!content || content.trim().length < 2)` → `true`
6. Throws: `'File "empty.txt" (0 B) has no extractable text content. Please try a different file...'`
7. ProcessingScreen catches → Alert shown

**Result:** PASS — Empty file detected.

---

## U06: Upload large DOCX (text > 15,000 chars) → truncation
**Input:** `bigdoc.docx` with 50,000 characters of text
**Trace:**
1. `parseDocx(base64)` extracts 50,000 chars
2. `content.length > MAX_CHARS` → `50000 > 15000` → `true`
3. `content = content.substring(0, 15000) + '\n\n[Content truncated for processing...]'`
4. `wasTruncated = true`
5. Returns `{ content: truncated, wasTruncated: true }`
6. **ProcessingScreen does NOT check `wasTruncated`!**

**BUG FOUND — MEDIUM:** ProcessingScreen.tsx uses `parsed.content` but does NOT check `parsed.wasTruncated` to warn the user. The `wasTruncated` flag is only checked in SummarizeProcessingScreen and TranslateProcessingScreen (we added those alerts in previous fixes), but NOT in the main generate ProcessingScreen.

**Fix:** Add truncation Alert in ProcessingScreen similar to the one we added for Summarize/Translate.

---

## U07: Upload file then cancel (DocumentPicker canceled)
**Input:** User taps upload button but cancels the picker
**Trace:**
1. `DocumentPicker.getDocumentAsync(...)` returns `{ canceled: true }`
2. `if (!result.canceled && result.assets && result.assets.length > 0)` → `false`
3. `setUploadedFile` NOT called — previous state preserved (null or previous file)
4. If no previous file, `uploadedFile` stays `null`

**Result:** PASS — Cancel is handled correctly.

---

## U08: Upload file, then upload a different file (replacement)
**Input:** User uploads `file1.docx`, then taps upload button again
**Trace:**
1. First upload: `setUploadedFile(result1)` — state set
2. Upload button shows file with ✕ to clear
3. User taps the ✕ → `clearFile()` → `setUploadedFile(null)`
4. But wait — the button onPress is: `uploadedFile && !uploadedFile.canceled ? clearFile : handleFileUpload`
5. So tapping with a file shown calls `clearFile` (removes file), NOT `handleFileUpload`
6. User must tap AGAIN to upload new file (two taps to replace)

**BUG FOUND — LOW:** Replacing a file requires 2 taps (clear first, then upload). This is by design but slightly inconvenient UX. Not a code bug.

**Result:** PASS (design choice, not a bug).

---

## U09: Upload XLSX file → parseXlsx flow
**Input:** `data.xlsx` with 2 sheets, shared strings
**Trace:**
1. `getFileType('data.xlsx')` → `'xlsx'`
2. `FileSystem.readAsStringAsync(uri, { encoding: 'Base64' })`
3. `parseXlsx(base64)`:
   - JSZip loads the file
   - Reads `xl/sharedStrings.xml` → extracts `<t>` tag contents
   - Reads `xl/worksheets/sheet1.xml`, `sheet2.xml`
   - For each sheet: matches `<row>` tags → `<c>` cells → `<v>` values
   - Shared string reference (`t="s"`) resolved via index
4. Returns text formatted as `[Sheet 1]\nA | B | C\n1 | 2 | 3\n\n[Sheet 2]\n...`
5. ProcessingScreen passes to AI as uploadedContent

**Result:** PASS — XLSX parsing works with multiple sheets.

---

## U10: Upload PPTX file → parsePptx flow  
**Input:** `presentation.pptx` with 5 slides + speaker notes
**Trace:**
1. `parsePptx(base64)`:
   - JSZip loaded
   - Filters `ppt/slides/slide\d+.xml` → sorts by slide number
   - For each slide: strips XML tags, adds `[Slide N]\n` prefix
   - Also processes `ppt/notesSlides/` for speaker notes
2. Returns: `"[Slide 1]\nTitle text\nBody text\n\n[Slide 2]\n..."` + notes
3. This text becomes `uploadedContent`

**Result:** PASS — PPTX parsing includes speaker notes.

---

## U11: Upload RTF file → stripRtf flow
**Input:** `document.rtf` with RTF formatting
**Trace:**
1. `getFileType('document.rtf')` → `'rtf'`
2. `FileSystem.readAsStringAsync(uri, { encoding: 'UTF8' })` — reads raw RTF text
3. `stripRtf(raw)`:
   - Removes `{\fonttbl...}`, `{\colortbl...}`, etc.
   - Converts `\par` to newlines
   - Strips control words like `\b`, `\i`, `\fs24`
   - Removes `{}` braces
   - Decodes `\'XX` hex chars
4. Returns cleaned text

**Result:** PASS — RTF parsing handles common formatting.

---

## U12: Upload file with unknown extension (e.g., `.json`)
**Input:** `data.json`
**Trace:**
1. HomeScreen DocumentPicker: `type` array doesn't include `application/json`
2. The OS file picker may or may not show `.json` files depending on platform
3. IF the file somehow gets through (e.g., renamed):
   - `getFileType('data.json')` → ext='json', not in typeMap → `'unknown'`
   - Falls to else branch: `FileSystem.readAsStringAsync(uri, { encoding: 'UTF8' })` — reads as plain text
   - JSON content is valid text, so it works

**Result:** PASS — Unknown types fall back to plain text reading.

---

## U13: File parse fails → "Continue Without File" path
**Input:** Corrupt file, user chooses "Continue Without File"
**Trace:**
1. `parseUploadedFile` throws
2. ProcessingScreen Alert: "Go Back / Continue Without File"
3. "Continue Without File" `onPress: () => {}` — does nothing, execution continues
4. BUT — the Alert is shown inside the catch block. After showing Alert, execution continues immediately (Alert is non-blocking!)
5. `uploadedContent` stays `undefined` (never assigned)
6. Code continues to Step 1 (token check) without waiting for user's Alert choice!

**BUG FOUND — HIGH:** `Alert.alert()` is non-blocking in React Native. After showing the parse error Alert, the code immediately continues to the next step. If the user chooses "Go Back", `navigation.goBack()` fires, but by then the AI call may have already started. The code doesn't `await` the Alert response.

**Looking more carefully:**
```js
} catch (parseError) {
  Alert.alert(..., [
    { text: t('alert_go_back'), onPress: () => navigation.goBack(), style: 'cancel' },
    { text: t('alert_continue_without_file'), onPress: () => {} },
  ]);
}
// Code continues HERE immediately, doesn't wait for user's choice!
```

After the catch block, execution falls through to Step 1 (token check) and Step 2 (AI call) with `uploadedContent = undefined`. The Alert is just displayed but not awaited. If user taps "Go Back", they get navigated back, BUT the async generation continues in the background (only stopped by `cancelledRef` on unmount).

This means the generation ALWAYS proceeds after a parse error, regardless of user choice. The "Go Back" option causes an unnecessary AI API call that wastes tokens.

**Fix:** Wrap the Alert in a Promise and await it, or use a flag to prevent further execution until user responds.

---

## U14: Upload file + empty topic → prompt construction
**Input:** `topic = ""`, `uploadedFile = report.docx`
**Trace:**
1. HomeScreen: `trimmed = ""`, navigation sends `topic: '' || 'Uploaded Document'` = `"Uploaded Document"`
2. ProcessingScreen: `uploadedContent` = parsed text
3. `generateDocumentContent("Uploaded Document", language, uploadedContent)`
4. `buildPromptMessages("Uploaded Document", language, uploadedContent)`:
   - `userMessage = "Topic / Instructions: Uploaded Document\n"`
   - `userMessage += "Output Language: English\n"`
   - `uploadedContent.trim().length > 0` → true
   - `userMessage += "\nUploaded Content:\n---\n${uploadedContent}\n---\n"`
   - `userMessage += "Please summarize and restructure the uploaded content..."`
5. AI receives the uploaded content + instruction to restructure

**Result:** PASS — But the prompt says "summarize and restructure" even for the Generate flow, which might confuse the AI. The prompt uses "summarize" wording even though this is the Generate tab. Minor semantic issue.

---

## U15: Upload file with `wasTruncated` flag + file name very long
**Input:** `my_very_long_filename_that_goes_on_and_on_for_many_chars.docx`
**Trace:**
1. HomeScreen: `uploadedFile.assets[0].name` stored as-is
2. Display: `<Text numberOfLines={1}>` truncates with ellipsis in UI ✅
3. Navigation: `uploadedFileName: "my_very_long_filename..."` passed to ProcessingScreen
4. `parseUploadedFile(uri, longName)` — name used only in error messages
5. No filename length limit issue

**Result:** PASS — Long filenames handled by UI truncation and don't affect parsing.

---

## U16: Upload file with special chars in filename (`report (1).docx`)
**Input:** File named `report (1).docx` with spaces and parentheses
**Trace:**
1. `DocumentPicker.getDocumentAsync()` returns `uri: "file://cache/report%20(1).docx"`
2. `FileSystem.readAsStringAsync` handles URL-encoded paths
3. `getFileType("report (1).docx")` → `.pop()` on split('.') → `"docx"` ✅
4. Parsing proceeds normally

**Result:** PASS — Expo's cache directory handles special chars in filenames.

---

## U17: Cancel ProcessingScreen during file parse
**Input:** User hits Cancel while file is being parsed
**Trace:**
1. `handleCancel()` → `cancelledRef.current = true` → `navigation.goBack()`
2. `useEffect` cleanup: `cancelledRef.current = true`
3. After `parseUploadedFile` completes, code checks `if (cancelledRef.current) return;`
4. Returns early before AI call ✅
5. No token usage wasted

**Result:** PASS — Cancel during parse works.

---

## U18: Upload CSV file → plain text path
**Input:** `data.csv`
**Trace:**
1. HomeScreen DocumentPicker: type array doesn't include `text/csv`
2. BUT `text/plain` is in the type list
3. Depending on the OS, `.csv` files may be detected as `text/csv` or `text/plain`
4. If the picker shows it: `getFileType('data.csv')` → ext='csv' → `'csv'`
5. `fileType === 'csv'` not matched by any specific branch → falls to else
6. `FileSystem.readAsStringAsync(uri, { encoding: 'UTF8' })` — reads raw CSV text
7. CSV content like `"Name,Age,City\nAlice,30,NYC\nBob,25,LA"` → valid text

**Result:** PASS — CSV read as plain text, content is usable.

---

## U19: Multiple formats selected + upload file
**Input:** User selects PDF + XLSX, uploads a file
**Trace:**
1. HomeScreen: `selectedFormats = Set(['pdf', 'xlsx'])`
2. `handleGenerate()`: `outputFormats: ['pdf', 'xlsx']`
3. ProcessingScreen parses file, calls AI
4. AI returns full output (pdf_word, ppt, excel sections)
5. Navigates to Editor with `outputFormats: ['pdf', 'xlsx']`
6. EditorScreen `handleGenerateFiles()`:
   - `if (outputFormats.includes('pdf'))` → yes → generates PDF
   - `if (outputFormats.includes('docx'))` → no → skipped
   - `if (outputFormats.includes('pptx'))` → no → skipped
   - `if (outputFormats.includes('xlsx'))` → yes → generates Excel
7. Only 2 files saved and shown in Result

**Result:** PASS — Format selection respected in file generation.

---

## U20: Upload file with `doc` extension (old Word format)
**Input:** `old_document.doc`
**Trace:**
1. HomeScreen DocumentPicker: type doesn't include `application/msword` but includes `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
2. OS file picker may or may not show `.doc` files
3. IF it gets through: `getFileType('old_document.doc')` → ext='doc' → typeMap returns `'docx'`
4. Code treats `.doc` as `.docx` → tries to parse as OOXML with JSZip
5. But `.doc` is the old binary OLE format, NOT ZIP/OOXML
6. `JSZip.loadAsync(...)` fails: "Not a valid zip file"
7. Error thrown and caught → Alert shown

**BUG FOUND — MEDIUM:** `getFileType()` maps `'doc'` → `'docx'`, which makes it try to parse a binary `.doc` file as if it were OOXML (ZIP). This always fails. The error message is generic ("Unable to read...corrupted or unsupported format") rather than explaining that `.doc` (old format) isn't supported — only `.docx` is.

**Fix:** Either (a) add a specific check for `.doc`/`.ppt`/`.xls` to throw a clear error message like "Old format .doc is not supported. Please save as .docx", or (b) remove `doc`/`ppt`/`xls` from the typeMap to let them fall to the unknown/text path (which would also fail but with different error).

---

# PART C: DESIGN / UI — 20 Scenarios

---

## D01: Dark mode → Light mode transition (theme flash prevention)
**Input:** User changes theme from dark to light in SettingsScreen
**Trace:**
1. SettingsScreen: `setMode('light')` → themeContext.tsx
2. `setModeState('light')` → React re-render
3. `AsyncStorage.setItem(THEME_STORAGE_KEY, 'light')` — persisted
4. `isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark')` → `false`
5. `colors = isDark ? DarkTheme : LightTheme` → `LightTheme`
6. All screens re-render with new colors
7. `loaded` gate: `if (!loaded) return null` — only relevant on initial mount
8. On theme change, `loaded` is already `true`, so no flash

**Result:** PASS — Theme switch is immediate, no flash.

---

## D02: App cold start with persisted "dark" theme
**Input:** User previously set theme to "dark", app restarts
**Trace:**
1. ThemeProvider mounts: `loaded = false`
2. `useEffect`: `AsyncStorage.getItem(THEME_STORAGE_KEY)` → `"dark"`
3. `setModeState('dark')`, `setLoaded(true)`
4. Before loaded: `return null` — nothing rendered (prevents light flash)
5. After loaded: children render with `colors = DarkTheme`
6. StatusBar: `statusBarStyle: 'light-content'`

**Result:** PASS — No white flash on dark-mode cold start.

---

## D03: System theme mode with OS switching dark/light
**Input:** User selects "System" theme, OS is currently dark, then OS switches to light
**Trace:**
1. `mode = 'system'`
2. `const systemScheme = useColorScheme()` — React listens for OS changes
3. Initially `systemScheme = 'dark'` → `isDark = true` → DarkTheme
4. OS switches to light → `systemScheme = 'light'`
5. `isDark = mode === 'system' && systemScheme === 'dark'` → `false`
6. `colors = LightTheme` — app re-renders in light mode

**Result:** PASS — System theme auto-switches work.

---

## D04: AsyncStorage theme load fails (first install)
**Input:** Fresh install, no stored theme
**Trace:**
1. `AsyncStorage.getItem(THEME_STORAGE_KEY)` → `null`
2. `if (stored === 'light' || stored === 'dark' || stored === 'system')` → all false
3. `setModeState` NOT called — stays default `'system'`
4. `setLoaded(true)` — proceed
5. `isDark` depends on `systemScheme` (OS setting)

**Result:** PASS — Fresh install defaults to system theme.

---

## D05: HomeScreen logo switching (dark vs light)
**Input:** Theme change between dark and light
**Trace:**
1. `const { isDark, colors } = useTheme()`
2. `<Image source={isDark ? require('../../assets/logo.png') : require('../../assets/logo-light.png')} />`
3. Dark mode: `logo.png` used
4. Light mode: `logo-light.png` used
5. `resizeMode="contain"`, `width: 72, height: 72, borderRadius: 18`

**Result:** PASS — Logo correctly switches.

---

## D06: PremiumScreen logo switching
**Input:** Theme = light
**Trace:**
1. PremiumScreen.tsx: `const { isDark, colors } = useTheme()`
2. `<Image source={isDark ? require('../../assets/logo.png') : require('../../assets/logo-light.png')} />`
3. `style={styles.heroLogo}` → `width: 64, height: 64, borderRadius: 16`

**Result:** PASS — Both screens switch logo correctly.

---

## D07: KeyboardAvoidingView behavior on Android vs iOS
**Input:** User opens keyboard on Android
**Trace:**
1. HomeScreen: `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>`
2. Android: `behavior={undefined}` — KeyboardAvoidingView does nothing extra
3. Android handles keyboard with `windowSoftInputMode: adjustResize` (Expo default)
4. ScrollView's `keyboardShouldPersistTaps="handled"` allows tapping buttons while keyboard is up

**Result:** PASS — Platform-appropriate keyboard handling.

---

## D08: RTL layout with Arabic UI language
**Input:** User selects Arabic in app language settings
**Trace:**
1. SettingsScreen: `setLanguage('ar')` → i18nContext
2. i18nContext checks if language is RTL
3. `I18nManager.forceRTL(true)` should be called
4. **Looking at i18nContext code** — need to check if RTL forcing is implemented...

**After code review:** i18nContext.tsx DOES implement RTL correctly:
```
useEffect(() => {
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.forceRTL(isRTL);
    I18nManager.allowRTL(isRTL);
  }
}, [isRTL]);
```
Direction is determined from `APP_LANGUAGES` which marks Arabic, Persian, Urdu as `direction: 'rtl'`. The effect runs on language change.

**Note:** `I18nManager.forceRTL()` requires an app restart on Android to take full effect. The app doesn't trigger a restart, so the layout change only applies after the user restarts manually. This is standard React Native behavior — NOT a fixable bug.

**Result:** PASS — RTL is correctly implemented.

---

## D09: Format selector — minimum 1 format required
**Input:** User tries to deselect the only remaining format
**Trace:**
1. HomeScreen `toggleFormat()`:
2. `if (next.has(fmt)) { if (next.size > 1) next.delete(fmt); }`
3. If only 1 format selected and user taps it: `next.size > 1` → `false` → NOT deleted
4. Format stays selected
5. User always has at least 1 format

**Result:** PASS — Can't deselect all formats.

---

## D10: Language picker scroll behavior with 32 languages
**Input:** User opens language picker on HomeScreen
**Trace:**
1. `<ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>`
2. 32 languages in the list
3. Each item: `paddingVertical: 12, paddingHorizontal: 16`
4. ~48px per item → 32 items = ~1536px total height
5. `maxHeight: 200` → ScrollView scrollable within 200px window
6. `nestedScrollEnabled` allows scrolling inside the outer ScrollView

**Result:** PASS — Scrollable nested language list works.

---

## D11: SettingsScreen token usage bar at 100%
**Input:** User has used exactly 5000/5000 tokens
**Trace:**
1. `tokenUsage.percentage = 100`
2. `width: '100%'` → fill bar takes full width
3. `tokenUsage.percentage > 80` → `true` → `backgroundColor: colors.danger` (red)
4. `remaining = 0`
5. Text: "0 tokens remaining"

**Result:** PASS — 100% usage shows full red bar.

---

## D12: EditorScreen edit mode vs preview mode toggle
**Input:** User switches from edit to preview mode
**Trace:**
1. `setViewMode('preview')`
2. `viewMode === 'preview'` → renders preview card with title + preview sections
3. Each section: numbered heading, paragraph, bullets with dots, word count
4. No TextInputs shown — read-only view
5. Generate button still visible at bottom

**Result:** PASS — Mode toggle works correctly.

---

## D13: EditorScreen section accordion (expand/collapse)
**Input:** User taps section §2 header
**Trace:**
1. `expandedSection = 0` (section 1 expanded initially)
2. User taps §2 header: `setExpandedSection(1)`
3. §1 collapses (no body rendered), §2 expands (shows all fields)
4. Only ONE section expanded at a time
5. Tapping same section again: `setExpandedSection(null)` — all collapsed

**Result:** PASS — Accordion behavior correct.

---

## D14: ResultScreen file card actions layout
**Input:** 4 generated files (PDF, DOCX, PPTX, XLSX)
**Trace:**
1. `files.map(...)` → 4 file cards  
2. Each card: `fileHeader` (icon + name) + `fileActions` (3 buttons in row)
3. Actions: Preview, Download, Share — each `flex: 1` in a `flexDirection: 'row'` container
4. Buttons equally divided: `gap: 8` between them
5. Card shadow: `elevation: 3` on Android

**Result:** PASS — File cards render with proper 3-button layout.

---

## D15: HistoryScreen empty state
**Input:** No history entries exist
**Trace:**
1. `loadHistory()` returns `[]`
2. `history.length === 0` → FlatList shows `ListEmptyComponent`
3. `renderEmpty()`: 📁 icon + "No Generations Yet" title + subtitle + "Create Your First" button
4. Button navigates to `'HomeTabs'`
5. `listEmpty` style: `flex: 1, justifyContent: 'center'` — centered on screen

**Result:** PASS — Empty state properly displayed.

---

## D16: Token usage bar color transition at 80% threshold
**Input:** Usage at 79% vs 81%
**Trace:**
1. HomeScreen + SettingsScreen both use same logic:
2. `backgroundColor: tokenUsage.percentage > 80 ? colors.danger : colors.primary`
3. At 79%: `79 > 80` → `false` → primary color (gold)
4. At 80%: `80 > 80` → `false` → primary color (gold)
5. At 81%: `81 > 80` → `true` → danger color (red)

**Result:** PASS — Threshold is >80 (strictly greater), so 80% stays gold, 81% turns red.

---

## D17: PremiumScreen premium card hardcoded dark colors
**Input:** App is in light mode
**Trace:**
1. PremiumScreen premium card: `backgroundColor: '#2C2E33'` — hardcoded dark
2. `borderColor: '#C8A961'` — hardcoded gold
3. Plan name: `color: '#FFFFFF'` — hardcoded white
4. Features: `color: '#D5D5DA'` — hardcoded light gray
5. This is intentional — the premium card always looks "dark" for visual emphasis

**Result:** PASS — Premium card dark styling is a design choice, not a bug.

---

## D18: EditorScreen AI tools horizontal scroll
**Input:** All 4 AI action buttons
**Trace:**
1. `<ScrollView horizontal showsHorizontalScrollIndicator={false}>`
2. Four buttons: Improve (green), Expand (blue), Shorten (orange), Regenerate (red)
3. Each: `paddingHorizontal: 12, marginRight: 8, borderRadius: 16`
4. Colors are hardcoded (not from theme): `backgroundColor: '#E8F5E9'` etc.

**BUG FOUND — MEDIUM:** AI tool button backgrounds use hardcoded light-mode colors (`#E8F5E9`, `#E3F2FD`, `#FFF3E0`, `#FCE4EC`) and text colors (`#2E7D32`, `#1565C0`, etc.). In dark mode, these pastel backgrounds look out of place against the dark surface. The buttons should use theme-aware colors.

Similarly, the management bar delete button uses hardcoded `backgroundColor: '#FFEBEE'` and `color: '#D32F2F'` — also not theme-aware.

**Fix:** Replace hardcoded colors with theme-token equivalents (e.g., `colors.successLight`, `colors.primaryLight`, `colors.warningLight`, `colors.dangerLight`).

---

## D19: EditorScreen AI tools bar bottom border in dark mode
**Input:** Dark mode
**Trace:**
1. `aiToolsBar` style: `borderBottomColor: '#E0E0E0'`
2. This is hardcoded light gray — visible on light background
3. In dark mode with `surface: '#2C2E33'`, the `#E0E0E0` border is jarring
4. Also `mgmtBtn`: `borderColor: '#E0E0E0'` — same issue

**BUG FOUND — MEDIUM:** Multiple hardcoded border colors in EditorScreen (`#E0E0E0`) that don't adapt to dark mode. Should use `colors.border` or `colors.borderLight`.

**Fix:** Replace `borderBottomColor: '#E0E0E0'` with `{ borderBottomColor: colors.borderLight }` in the relevant style arrays, and similarly for `mgmtBtn`.

---

## D20: SummarizeScreen/TranslateScreen upload button border color feedback
**Input:** User uploads a file on SummarizeScreen
**Trace:**
1. `borderColor: uploadedFile && !uploadedFile.canceled ? colors.success : colors.border`
2. After successful upload: border turns `colors.success` (green) — visual feedback ✅
3. Icon changes from 📎 to ✅
4. File name shown with 📄 prefix
5. `numberOfLines={2}` — allows 2-line file names

**Result:** PASS — Good upload feedback via border color and icon change.

---

# BUG SUMMARY

| # | Scenario | Severity | Description |
|---|----------|----------|-------------|
| 1 | E04 | MEDIUM | `sanitizeSheetName`: `.trim()` before `.substring(31)` may leave trailing space |
| 2 | E09 | HIGH | Empty `headers: []` causes `mergeCells(1,1,1,0)` — column 0 is invalid in ExcelJS |
| 3 | E11 | MEDIUM | Data row height hardcoded to 24 — long wrapped text clipped |
| 4 | E18 | LOW | `uint8ArrayToBase64` string concatenation loop is O(n²) for large data (perf, not crash) |
| 5 | E20 | MEDIUM | Excel data cells hardcoded `horizontal: 'left'` — wrong for RTL languages |
| 6 | U06 | MEDIUM | ProcessingScreen doesn't check `wasTruncated` flag (only Summarize/Translate do) |
| 7 | U13 | HIGH | `Alert.alert()` is non-blocking — parse error Alert doesn't pause execution, AI call proceeds regardless |
| 8 | U20 | MEDIUM | `.doc`/`.ppt`/`.xls` mapped to OOXML parsers but they're binary formats → always fail with confusing error |
| 9 | D08 | — | RTL IS correctly implemented (verified) — NOT a bug |
| 10 | D18 | MEDIUM | AI tool buttons use hardcoded light-mode colors — look wrong in dark mode |
| 11 | D19 | MEDIUM | EditorScreen border colors (`#E0E0E0`) hardcoded — don't adapt to dark mode |

**Total: 10 bugs found (2 HIGH, 7 MEDIUM, 1 LOW)**
