# AI Writer — 50 Translate Scenario Tests

## Input Validation

### T01 — No file selected
- **Input:** User taps Translate without uploading file
- **Expected:** Alert "File Required" shown, no navigation

### T02 — Same source and target language
- **Input:** Source=English, Target=English, file uploaded
- **Expected:** Alert "Languages must be different"

### T03 — Valid file + different languages
- **Input:** .docx file, Source=English, Target=Spanish
- **Expected:** Navigates to TranslateProcessing

### T04 — TXT file upload
- **Input:** .txt file selected
- **Expected:** File accepted, shows filename with ✅

### T05 — DOCX file upload
- **Input:** .docx file selected
- **Expected:** File accepted, shows filename

### T06 — XLSX file upload
- **Input:** .xlsx file selected
- **Expected:** File accepted

### T07 — PPTX file upload
- **Input:** .pptx file selected
- **Expected:** File accepted

### T08 — PDF file rejected
- **Input:** User tries to select .pdf
- **Expected:** File picker doesn't show PDF or shows error

### T09 — Cancel file picker
- **Input:** User opens picker then cancels
- **Expected:** No file selected, placeholder text remains

### T10 — Replace uploaded file
- **Input:** Upload file A, then upload file B
- **Expected:** File B shown, file A discarded

---

## Format Selection

### T11 — Default format is PDF
- **Input:** Open Translate screen
- **Expected:** PDF format pre-selected

### T12 — Select single format (Word)
- **Input:** Deselect PDF, select Word
- **Expected:** Only Word checked

### T13 — Select multiple formats
- **Input:** Select PDF + Word + PPT
- **Expected:** All three checked

### T14 — Cannot deselect all formats
- **Input:** Try to deselect last remaining format
- **Expected:** At least one format stays selected

### T15 — Select all four formats
- **Input:** Tap all format cards
- **Expected:** All four show checkmarks

### T16 — Toggle format on/off
- **Input:** Select Excel, then tap again
- **Expected:** Excel unchecked (if others selected)

---

## Language Selection

### T17 — Device language auto-detected as source
- **Input:** Device set to French, open Translate
- **Expected:** Source language shows French

### T18 — Change source language
- **Input:** Tap source picker, select German
- **Expected:** Source shows German

### T19 — Change target language
- **Input:** Tap target picker, select Japanese
- **Expected:** Target shows Japanese

### T20 — Swap languages
- **Input:** Source=English, Target=Spanish, tap swap
- **Expected:** Source=Spanish, Target=English

### T21 — Picker shows all 15 languages
- **Input:** Open source language picker
- **Expected:** 15 languages visible (scrollable)

### T22 — Selected language highlighted
- **Input:** Open picker, current selection = Arabic
- **Expected:** Arabic row has highlight background

### T23 — Close picker on selection
- **Input:** Tap a language in picker
- **Expected:** Picker closes, selection updates

### T24 — Only one picker open at a time
- **Input:** Open source picker, then tap target
- **Expected:** Source closes, target opens

---

## Token Calculation

### T25 — Token calculator shown
- **Input:** Valid file, tap Translate
- **Expected:** Alert shows cost and balance

### T26 — Sufficient tokens — proceed
- **Input:** Cost=1000, Balance=3000
- **Expected:** Alert shows ✅, Continue button works

### T27 — Insufficient tokens — blocked
- **Input:** Cost=3000, Balance=500
- **Expected:** Alert shows ❌, only Go Back button

### T28 — User cancels at token alert
- **Input:** Tap "Go Back" on token alert
- **Expected:** Returns to Translate screen

### T29 — User confirms token alert
- **Input:** Tap "Continue" when sufficient
- **Expected:** Processing starts

### T30 — Large file shows chunk count
- **Input:** 50,000 char file
- **Expected:** Multiple chunks calculated

---

## Processing Flow

### T31 — Progress steps update
- **Input:** Start translation
- **Expected:** Steps 0→1→2→3 update progressively

### T32 — Progress bar fills
- **Input:** During processing
- **Expected:** Progress 0%→100% smoothly

### T33 — Cancel during processing
- **Input:** Tap Cancel while processing
- **Expected:** Confirm dialog appears

### T34 — Confirm cancel (no partial)
- **Input:** Cancel with 0 chunks done
- **Expected:** Returns to Translate screen

### T35 — Cancel with partial data
- **Input:** Cancel with 2/5 chunks done
- **Expected:** Option to keep partial results

### T36 — Keep partial results
- **Input:** Tap "Keep Partial" on cancel
- **Expected:** Editor opens with partial content

### T37 — Discard partial results
- **Input:** Tap "Discard" on cancel
- **Expected:** Returns to Translate screen

### T38 — Network error during translation
- **Input:** Network fails mid-process
- **Expected:** Error alert with retry option

### T39 — Retry after error
- **Input:** Tap "Try Again" on error
- **Expected:** Processing restarts

### T40 — Go back after error
- **Input:** Tap "Go Back" on error
- **Expected:** Returns to Translate screen

---

## Editor Navigation

### T41 — Editor receives correct topic
- **Input:** Translate "report.docx" to Spanish
- **Expected:** Editor shows "report.docx → Spanish"

### T42 — Editor receives target language
- **Input:** Target = French
- **Expected:** Editor language = French

### T43 — Editor receives selected formats
- **Input:** Selected = [PDF, Excel]
- **Expected:** Editor outputFormats = ['pdf', 'xlsx']

### T44 — AI output passed to Editor
- **Input:** Successful translation
- **Expected:** Editor has pdf_word, ppt, excel data

---

## Edge Cases

### T45 — Empty file
- **Input:** 0-byte .txt file
- **Expected:** Error "File is empty"

### T46 — Very large file (500KB+)
- **Input:** Large document
- **Expected:** Token calculator blocks or warns

### T47 — File with special characters in name
- **Input:** "résumé_新文档.docx"
- **Expected:** Filename displays correctly

### T48 — Corrupt file
- **Input:** Invalid .docx structure
- **Expected:** Error "Could not read file"

### T49 — RTL language (Arabic) as target
- **Input:** Target = Arabic
- **Expected:** Translation completes, RTL text in output

### T50 — CJK language (Chinese) as target
- **Input:** Target = Chinese
- **Expected:** Translation completes, Chinese characters in output
