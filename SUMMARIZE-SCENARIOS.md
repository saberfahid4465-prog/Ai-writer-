# AI Writer — 50 Summarize Scenario Tests

## Input Validation

### S01 — No file selected
- **Input:** User taps Summarize without uploading file
- **Expected:** Alert "File Required" shown, no navigation

### S02 — Valid file uploaded
- **Input:** .docx file selected
- **Expected:** Navigates to SummarizeProcessing

### S03 — TXT file upload
- **Input:** .txt file selected
- **Expected:** File accepted, shows filename with ✅

### S04 — DOCX file upload
- **Input:** .docx file selected
- **Expected:** File accepted, shows filename

### S05 — XLSX file upload
- **Input:** .xlsx file selected
- **Expected:** File accepted

### S06 — PPTX file upload
- **Input:** .pptx file selected
- **Expected:** File accepted

### S07 — PDF file rejected
- **Input:** User tries to select .pdf
- **Expected:** File picker doesn't show PDF or shows error

### S08 — Cancel file picker
- **Input:** User opens picker then cancels
- **Expected:** No file selected, placeholder text remains

### S09 — Replace uploaded file
- **Input:** Upload file A, then upload file B
- **Expected:** File B shown, file A discarded

### S10 — Long filename truncation
- **Input:** File "very_long_filename_with_many_words.docx"
- **Expected:** Filename truncated with ellipsis

---

## Format Selection

### S11 — Default format is PDF
- **Input:** Open Summarize screen
- **Expected:** PDF format pre-selected

### S12 — Select single format (Word)
- **Input:** Deselect PDF, select Word
- **Expected:** Only Word checked

### S13 — Select multiple formats
- **Input:** Select PDF + Word + Excel
- **Expected:** All three checked

### S14 — Cannot deselect all formats
- **Input:** Try to deselect last remaining format
- **Expected:** At least one format stays selected

### S15 — Select all four formats
- **Input:** Tap all format cards
- **Expected:** All four show checkmarks

### S16 — Toggle format on/off
- **Input:** Select PPT, then tap again
- **Expected:** PPT unchecked (if others selected)

### S17 — Format icons display correctly
- **Input:** View format grid
- **Expected:** 📕 PDF, 📘 Word, 📙 PPT, 📗 Excel

### S18 — Selected format has border highlight
- **Input:** Select Word format
- **Expected:** Word card has primary color border

---

## Language Selection

### S19 — Device language auto-detected
- **Input:** Device set to German, open Summarize
- **Expected:** Output language shows German

### S20 — Change output language
- **Input:** Tap language picker, select Korean
- **Expected:** Language shows Korean

### S21 — Picker shows all 15 languages
- **Input:** Open language picker
- **Expected:** 15 languages visible (scrollable)

### S22 — Selected language highlighted
- **Input:** Open picker, current = Japanese
- **Expected:** Japanese row has highlight

### S23 — Close picker on selection
- **Input:** Tap a language in picker
- **Expected:** Picker closes, selection updates

### S24 — Language shows native name
- **Input:** View language display
- **Expected:** "Japanese (日本語)" format shown

---

## Token Calculation

### S25 — Token calculator shown
- **Input:** Valid file, tap Summarize
- **Expected:** Alert shows cost and balance

### S26 — Sufficient tokens — proceed
- **Input:** Cost=800, Balance=2000
- **Expected:** Alert shows ✅, Continue button works

### S27 — Insufficient tokens — blocked
- **Input:** Cost=4000, Balance=300
- **Expected:** Alert shows ❌, only Go Back button

### S28 — User cancels at token alert
- **Input:** Tap "Go Back" on token alert
- **Expected:** Returns to Summarize screen

### S29 — User confirms token alert
- **Input:** Tap "Continue" when sufficient
- **Expected:** Processing starts

### S30 — Simplified alert message
- **Input:** View token alert
- **Expected:** Shows "Cost: ~X tokens\nBalance: Y / 5,000"

---

## Processing Flow

### S31 — Progress steps update
- **Input:** Start summarization
- **Expected:** Steps 0→1→2→3 update progressively

### S32 — Progress bar fills
- **Input:** During processing
- **Expected:** Progress 0%→100% smoothly

### S33 — Cancel during processing
- **Input:** Tap Cancel while processing
- **Expected:** Confirm dialog appears

### S34 — Confirm cancel (no partial)
- **Input:** Cancel with 0 chunks done
- **Expected:** Returns to Summarize screen

### S35 — Cancel with partial data
- **Input:** Cancel with 1/3 chunks done
- **Expected:** Option to keep partial results

### S36 — Keep partial results
- **Input:** Tap "Keep Partial" on cancel
- **Expected:** Editor opens with partial content

### S37 — Discard partial results
- **Input:** Tap "Discard" on cancel
- **Expected:** Returns to Summarize screen

### S38 — Network error during summarization
- **Input:** Network fails mid-process
- **Expected:** Error alert with retry option

### S39 — Retry after error
- **Input:** Tap "Try Again" on error
- **Expected:** Processing restarts

### S40 — Go back after error
- **Input:** Tap "Go Back" on error
- **Expected:** Returns to Summarize screen

---

## Editor Navigation

### S41 — Editor receives correct topic
- **Input:** Summarize "annual_report.docx"
- **Expected:** Editor shows "Summary: annual_report.docx"

### S42 — Editor receives output language
- **Input:** Language = Portuguese
- **Expected:** Editor language = Portuguese

### S43 — Editor receives selected formats
- **Input:** Selected = [Word, PPT]
- **Expected:** Editor outputFormats = ['docx', 'pptx']

### S44 — AI output passed to Editor
- **Input:** Successful summarization
- **Expected:** Editor has pdf_word, ppt, excel data

---

## Edge Cases

### S45 — Empty file
- **Input:** 0-byte .txt file
- **Expected:** Error "File is empty"

### S46 — Very large file (500KB+)
- **Input:** Large document
- **Expected:** Token calculator blocks or warns

### S47 — File with only whitespace
- **Input:** .txt with only spaces/newlines
- **Expected:** Error "No content to summarize"

### S48 — Spreadsheet with numbers only
- **Input:** .xlsx with numeric data only
- **Expected:** Summary generated for data patterns

### S49 — Presentation with images only
- **Input:** .pptx with no text, just images
- **Expected:** Summary indicates "no text content"

### S50 — Mixed content document
- **Input:** .docx with text, tables, lists
- **Expected:** Summary captures all content types
