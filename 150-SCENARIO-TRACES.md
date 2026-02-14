# AI Writer — 150 Scenario Code Traces

**Date:** Phase 18  
**Scope:** 50 Generation + 50 Summarize + 50 Translation  
**Method:** Line-by-line code trace through actual source files  

---

## BUGS FOUND SUMMARY

| # | ID | Severity | File | Bug Description |
|---|-----|----------|------|-----------------|
| 1 | GEN-BUG-1 | **CRITICAL** | pdfGenerator.ts | `langNameToCode` missing 6 languages (Thai, Bengali, Hebrew, Greek, Vietnamese, Ukrainian) — all non-Latin text rendered as `?????` |
| 2 | GEN-BUG-2 | **CRITICAL** | EditorScreen.tsx | `sections.indexOf(s)` always returns -1 — slides state never used for PPT generation |
| 3 | GEN-BUG-3 | **HIGH** | pdfGenerator.ts | PDF section headings use `drawText(maxWidth)` which truncates — not wrapped like paragraphs |
| 4 | GEN-BUG-4 | **HIGH** | pdfGenerator.ts | Very long PDF titles overflow above visible page area |
| 5 | GEN-BUG-5 | **MEDIUM** | pexelsService.ts | Stores original photo dimensions but downloads 'small' — Word images blurry |
| 6 | GEN-BUG-6 | **MEDIUM** | EditorScreen.tsx | No validation if all sections cleared — generates near-empty documents |
| 7 | GEN-BUG-7 | **MEDIUM** | pptGenerator.ts | Title/subtitle hardcoded `align:'left'` ignoring RTL languages |
| 8 | GEN-BUG-8 | **LOW** | pptGenerator.ts | "Thank You" end slide hardcoded in English — not localized |
| 9 | GEN-BUG-9 | **LOW** | fontCacheService.ts | Inline `uint8ArrayToBase64` has incorrect padding — cached fonts may have trailing zeros |
| 10 | SUM-BUG-1 | **MEDIUM** | SummarizeProcessingScreen | `wasTruncated` flag from fileParserService never shown to user |
| 11 | TRANS-BUG-1 | **MEDIUM** | TranslateProcessingScreen | Same `wasTruncated` flag issue — user unaware of truncation |

---

## PART 1: GENERATION SCENARIOS (GEN-1 through GEN-50)

### GEN-1: Basic English topic, all 4 formats
**Input:** topic="Climate Change", language="English", formats=["pdf","docx","pptx","xlsx"]  
**Trace:**  
1. EditorScreen receives `aiOutput` with 3–5 sections, each having heading+paragraph+bullets  
2. `handleGenerateFiles()` → `validSections` filters: all have heading.trim() && paragraph.trim() → pass  
3. Bullets filtered, none empty → bullets arrays unchanged  
4. `validSlides` mapping: `sections.indexOf(s)` → **returns -1** (BUG GEN-BUG-2: `s` is a `.map()` clone, not original reference) → fallback `{ title: s.heading, bullets: s.bullets, image_keyword: s.image_keyword }`  
5. `editedOutput` assembled. `clearImageCache()` called. Images fetched via Pexels.  
6. PDF: `hasNonLatinText("Climate Change...")` → false → Helvetica used. `sanitizeForWinAnsi` active. Title wrapped via `wrapText`. Sections rendered. Images embedded as JPEG.  
7. Word: `isRTL` = false (English not in rtlLanguages). Sections + images rendered normally.  
8. PPT: `isRTL` = false. Title slide + content slides + "Thank You" slide created.  
9. Excel: `sanitizeSheetName("Climate Change")` → "Climate Change" (no illegal chars, 14 chars < 31). Data rows created. Images sheet if images exist.  
10. Files saved, history entry added, navigate to Result.  
**Result:** ✅ Pass (BUG-2 has no visible effect since fallback reconstructs same data)

### GEN-2: Title with colon character → Excel worksheet
**Input:** topic="Cristiano Ronaldo: A Legend of Modern Football", language="English"  
**Trace:**  
1. Title = "Cristiano Ronaldo: A Legend of Modern Football"  
2. Excel: `sanitizeSheetName("Cristiano Ronaldo: A Legend...")` → `:` replaced with space → "Cristiano Ronaldo  A Legend of Modern Football" → whitespace collapsed → "Cristiano Ronaldo A Legend of M" (31 chars)  
3. Worksheet created successfully  
**Result:** ✅ Pass (FIXED in previous commit)

### GEN-3: Title with asterisk, question mark, brackets
**Input:** topic="What is AI? [A Complete Guide]*", language="English"  
**Trace:**  
1. `sanitizeSheetName("What is AI? [A Complete Guide]*")` → `?`, `[`, `]`, `*` replaced with spaces → "What is AI   A Complete Guide  " → collapsed → "What is AI A Complete Guide" (26 chars)  
**Result:** ✅ Pass

### GEN-4: Title with backslash and forward slash
**Input:** topic="IT Security: Windows\\Linux/Mac Comparison", language="English"  
**Trace:**  
1. `sanitizeSheetName(...)` → `:`, `\\`, `/` replaced → "IT Security  Windows Linux Mac " → collapsed → "IT Security Windows Linux Mac C" (31 chars)  
**Result:** ✅ Pass

### GEN-5: Very long title exceeds 31 chars for Excel
**Input:** topic="The Comprehensive Guide to Understanding Artificial Intelligence and Machine Learning in Modern Healthcare Systems"  
**Trace:**  
1. `sanitizeSheetName(longTitle)` → no illegal chars → `.substring(0, 31)` = "The Comprehensive Guide to Unde"  
**Result:** ✅ Pass

### GEN-6: Empty title for Excel
**Input:** User clears title in editor to ""  
**Trace:**  
1. `sanitizeSheetName("")` → `.replace(...)` → `"".trim()` → `""` → `.substring(0,31)` → `""` → `|| 'Sheet'` → "Sheet"  
**Result:** ✅ Pass

### GEN-7: Arabic language — PDF font loading
**Input:** topic="التكنولوجيا", language="Arabic"  
**Trace:**  
1. PDF: `sampleText = "التكنولوجيا ..."` → `hasNonLatinText()` → Arabic chars > 0xFF → `nonLatin/total > 0.2` → true  
2. `langCode = "arabic"` → `langNameToCode["arabic"]` = `'ar'` → `getCachedFont('ar')` → `getFontKey('ar')` → `LANGUAGE_TO_FONT['ar']` = `'arabic'` → `FONT_URLS['arabic']` exists ✓  
3. Custom font downloaded/cached → `pdfDoc.embedFont(fontBytes, { subset: true })` → success  
4. `useCustomFont = true` → `safeText = (t) => t` (no sanitization)  
5. Title drawn with custom Arabic font ✓  
6. Word: `isRTL = true` (language "Arabic" includes 'arabic') → bidirectional + rightToLeft flags set ✓  
7. PPT: `isRTL = true` → `pptx.rtlMode = true` ✓ BUT title `align: 'left'` hardcoded (BUG GEN-BUG-7)  
**Result:** ⚠️ PDF/Word OK. PPT title alignment wrong for RTL.

### GEN-8: Thai language — PDF font loading  ← **CRITICAL BUG**
**Input:** topic="การเปลี่ยนแปลงสภาพภูมิอากาศ", language="Thai"  
**Trace:**  
1. PDF: `sampleText` contains Thai chars → `hasNonLatinText()` → true  
2. `langCode = "thai"` → `langNameToCode["thai"]` = **undefined** (NOT in the map!)  
3. `code = "thai".split(/[\s-]/)[0]` = `"thai"` → `getCachedFont("thai")`  
4. `getFontKey("thai")` → `LANGUAGE_TO_FONT["thai"]` = **undefined** → returns `''`  
5. `fontBytes = null` → falls back to Helvetica  
6. `useCustomFont = false` → `safeText = sanitizeForWinAnsi`  
7. All Thai characters → `sanitizeForWinAnsi` → replaced with `?`  
8. **Title page shows: "????????????????????????????"**  
**Result:** ❌ **BUG GEN-BUG-1: Thai PDF completely broken — all text is `?????`**

### GEN-9: Bengali language — PDF font loading  ← **CRITICAL BUG**
**Input:** topic="জলবায়ু পরিবর্তন", language="Bengali"  
**Trace:** Same flow as GEN-8. `langNameToCode["bengali"]` = undefined → falls back to Helvetica → `sanitizeForWinAnsi` → all `?`  
**Result:** ❌ **BUG GEN-BUG-1: Bengali PDF completely broken**

### GEN-10: Hebrew language — PDF font loading  ← **CRITICAL BUG**
**Input:** topic="שינויי אקלים", language="Hebrew"  
**Trace:**  
1. `langNameToCode["hebrew"]` = **undefined** → fallback to Helvetica  
2. Hebrew chars → `sanitizeForWinAnsi` → all `?`  
3. Additional issue: Word `isRTL` check: `rtlLanguages.some(lang => "hebrew".includes(lang))` → 'hebrew' is IN rtlLanguages → `isRTL = true` ✓  
4. PPT: 'hebrew' is in rtlLanguages → `isRTL = true` ✓ but alignment hardcoded  
**Result:** ❌ **BUG GEN-BUG-1: Hebrew PDF completely broken**

### GEN-11: Vietnamese language — PDF font loading
**Input:** topic="Biến đổi khí hậu", language="Vietnamese"  
**Trace:**  
1. `hasNonLatinText("Biến đổi...")` → Vietnamese diacritical chars (ế, ổ, etc.) have codes 0x1EBF, 0x1ED5 etc. which are > 0xFF  
2. `nonLatin/total` check: out of ~18 chars, ~4 have codes > 0xFF → 4/18 = 0.22 > 0.2 → **true** (enters custom font branch)  
3. `langNameToCode["vietnamese"]` = **undefined** → code = "vietnamese"  
4. `getCachedFont("vietnamese")` → `LANGUAGE_TO_FONT["vietnamese"]` = undefined → null  
5. Falls back to Helvetica. `sanitizeForWinAnsi` replaces ế, ổ with `?`  
6. **BUT: Most Vietnamese chars ARE in CP-1252 (Latin Supplement 0xA0-0xFF)**. Only the combining chars are not.  
**Result:** ❌ **BUG GEN-BUG-1: Vietnamese PDF partially broken — diacritical chars replaced with `?`**

### GEN-12: Greek language — PDF font loading
**Input:** topic="Κλιματική αλλαγή", language="Greek"  
**Trace:** `langNameToCode["greek"]` = undefined → code = "greek" → font not found. Greek chars (0x0391-0x03CE) → `sanitizeForWinAnsi` → `?`. **All Greek text becomes `?`.**  
**Result:** ❌ **BUG GEN-BUG-1: Greek PDF completely broken**

### GEN-13: Ukrainian language — PDF font loading
**Input:** topic="Зміни клімату", language="Ukrainian"  
**Trace:** `langNameToCode["ukrainian"]` = undefined. Ukrainian Cyrillic chars → `sanitizeForWinAnsi` → `?`. All text becomes `?????`.  
**Result:** ❌ **BUG GEN-BUG-1: Ukrainian PDF completely broken**

### GEN-14: Chinese language — PDF font loading (should work)
**Input:** topic="气候变化", language="Chinese"  
**Trace:**  
1. `langNameToCode["chinese"]` = `'zh'` ✓  
2. `getCachedFont('zh')` → `LANGUAGE_TO_FONT['zh']` = `'chinese'` → `FONT_URLS['chinese']` exists  
3. Custom font loaded. CJK wrapping via `wrapTextCJK`. Title renders correctly.  
**Result:** ✅ Pass

### GEN-15: Japanese language — PDF font (should work)
**Input:** topic="気候変動", language="Japanese"  
**Trace:** `langNameToCode["japanese"]` = `'ja'` → font loaded ✓. CJK wrapping ✓.  
**Result:** ✅ Pass

### GEN-16: Korean language — PDF font (should work)
**Input:** topic="기후 변화", language="Korean"  
**Trace:** `langNameToCode["korean"]` = `'ko'` → font loaded ✓.  
**Result:** ✅ Pass

### GEN-17: Hindi language — PDF font (should work)
**Input:** topic="जलवायु परिवर्तन", language="Hindi"  
**Trace:** `langNameToCode["hindi"]` = `'hi'` → `LANGUAGE_TO_FONT['hi']` = `'devanagari'` → font loaded ✓.  
**Result:** ✅ Pass

### GEN-18: Russian language — PDF font
**Input:** topic="Изменение климата", language="Russian"  
**Trace:**  
1. `langNameToCode["russian"]` = `'ru'` ✓  
2. `LANGUAGE_TO_FONT['ru']` = `'latin'` → Noto Sans Latin (includes Cyrillic) → font loaded  
3. Custom font renders Russian correctly ✓  
**Result:** ✅ Pass

### GEN-19: Turkish language — PDF font
**Input:** topic="İklim Değişikliği", language="Turkish"  
**Trace:** `langNameToCode["turkish"]` = `'tr'` → `LANGUAGE_TO_FONT['tr']` = `'turkish'` → same Noto Sans Latin URL → ✓.  
Special chars: İ (0x0130), ı (0x0131), ğ (0x011F), ş (0x015F). İ is > 0xFF → flagged non-Latin.  
Custom font handles these ✓.  
**Result:** ✅ Pass

### GEN-20: Persian/Farsi language — PDF font
**Input:** topic="تغییرات آب و هوایی", language="Persian"  
**Trace:** `langNameToCode["persian"]` = `'fa'` → `'persian'` font (same as Arabic) → ✓.  
Word: `isRTL` check for 'persian' → yes ✓. PPT: 'persian' → yes ✓.  
**Result:** ✅ Pass (same alignment issue as Arabic)

### GEN-21: Section with very long heading — PDF truncation ← **BUG**
**Input:** Section heading = "The Comprehensive Analysis of Global Climate Change Impacts on Agricultural Production Systems and Food Security in Developing Nations"  
**Trace:**  
1. PDF rendering: `currentPage.drawText(safeText(section.heading), { ..., maxWidth: CONTENT_WIDTH })`  
2. pdf-lib `drawText` with `maxWidth` **truncates** text that exceeds width — does NOT wrap  
3. At 18pt with Helvetica, this 138-char heading exceeds CONTENT_WIDTH (451.28pt)  
4. Text truncated mid-word, no continuation on next line  
5. Compare: paragraph text uses `wrapText()` which manually wraps → fully visible  
**Result:** ❌ **BUG GEN-BUG-3: PDF headings truncated, not wrapped**

### GEN-22: Very long title (15+ words) — PDF title page overflow ← **BUG**
**Input:** title = "A Comprehensive Study on the Environmental Social and Economic Impacts of Climate Change on Small Island Developing States in the Pacific Ocean"  
**Trace:**  
1. `wrapText(title, fontBold, 28, CONTENT_WIDTH)` → wraps into ~6 lines  
2. `titleLineHeight = 28 * 1.5 = 42pt`  
3. `totalTitleHeight = 6 * 42 = 252pt`  
4. `titleY = 841.89/2 + 252/2 = 420.9 + 126 = 546.9pt` → first line at 546.9  
5. Last line at `546.9 - 5*42 = 336.9` → still within page ✓  
6. BUT with 12+ lines: `totalTitleHeight = 12 * 42 = 504`. `titleY = 420.9 + 252 = 672.9` → still OK  
7. With 20+ lines (extreme): `totalTitleHeight = 840`. `titleY = 420.9 + 420 = 840.9` → **first line AT page top boundary**  
8. With 21+ lines: **titleY > PAGE_HEIGHT** → text drawn above visible area  
**Result:** ❌ **BUG GEN-BUG-4: Extreme title lengths overflow above page** (rare but possible)

### GEN-23: All sections have empty headings — user deletes all headings
**Input:** User edits all section headings to "" (empty), paragraphs still have content  
**Trace:**  
1. `validSections = sections.filter(s => s.heading.trim() && s.paragraph.trim())`  
2. `"".trim()` → `""` → falsy → ALL sections filtered out  
3. `validSections = []`  
4. `validSlides = [].map(...)` → `[]`  
5. `editedOutput.pdf_word.sections = []`  
6. PDF: title page only, no content pages  
7. Word: title + author + language only  
8. PPT: title slide + "Thank You" only  
9. Excel: `rows = []` (headers but no data)  
10. Files generated and saved (almost empty). History entry added.  
11. User sees 4 files but they contain no real content.  
**Result:** ❌ **BUG GEN-BUG-6: No validation — empty documents generated silently**

### GEN-24: All sections have empty paragraphs
**Input:** User clears all paragraphs but keeps headings  
**Trace:** Same as GEN-23 — `paragraph.trim()` is falsy → all filtered out → empty documents  
**Result:** ❌ **BUG GEN-BUG-6 (same)**

### GEN-25: One valid section + one empty section
**Input:** Section 1: heading="A", paragraph="Text". Section 2: heading="B", paragraph=""  
**Trace:**  
1. `validSections` filters: Section 1 passes, Section 2 filtered out  
2. Only Section 1 appears in all outputs  
3. `validSlides` maps 1 section → 1 slide  
**Result:** ✅ Pass (partial content works correctly)

### GEN-26: Section with empty bullets array
**Input:** Section has heading+paragraph but bullets=[] (user removed all bullets)  
**Trace:**  
1. After filter: section passes (heading+paragraph present)  
2. `.map(s => ({ ...s, bullets: s.bullets.filter(b => b.trim()) }))` → bullets = []  
3. `.map(s => (s.bullets.length === 0 ? { ...s, bullets: [s.heading] } : s))` → bullets = [heading]  
4. Fallback bullet is the heading text → appears as bullet in all formats  
**Result:** ✅ Pass (graceful fallback)

### GEN-27: Section with whitespace-only bullets
**Input:** bullets=["  ", "\t", "\n"]  
**Trace:**  
1. `bullets.filter(b => b.trim())` → "  ".trim()="" → falsy → filtered. All 3 filtered out.  
2. `bullets = []` → fallback to `[s.heading]`  
**Result:** ✅ Pass

### GEN-28: PDF image embedding — non-JPEG image data
**Input:** Pexels returns a PNG (rare but possible if CDN serves wrong format)  
**Trace:**  
1. `pdfDoc.embedJpg(img.imageBytes)` → pdf-lib checks JPEG magic bytes (0xFFD8)  
2. If not JPEG → throws Error  
3. Caught by try-catch: `console.warn('Failed to embed image in PDF:', e)` → image skipped  
4. PDF continues without image  
**Result:** ✅ Pass (graceful degradation)

### GEN-29: PDF image embedding — corrupt image bytes
**Input:** Network error mid-download → partial imageBytes  
**Trace:**  
1. `downloadImage()` — if response completes but content is partial, `response.arrayBuffer()` returns partial data  
2. `new Uint8Array(arrayBuffer)` → valid but truncated  
3. PDF: `embedJpg(truncatedBytes)` → likely throws (invalid JPEG structure)  
4. Caught by try-catch → image skipped  
**Result:** ✅ Pass

### GEN-30: Word image embedding — very large image
**Input:** Pexels returns 5000×3000 photo (original dimensions), small download at 300×200  
**Trace:**  
1. `img.width = 5000`, `img.height = 3000` (from PexelsPhoto, NOT from small image)  
2. Word: `scale = Math.min(460/5000, 280/3000, 1) = Math.min(0.092, 0.093, 1) = 0.092`  
3. `displayWidth = 460`, `displayHeight = 277`  
4. Image displayed at 460×277 in Word doc, but actual pixels are ~300×200  
5. **Image looks blurry/pixelated** when opened in Word  
**Result:** ⚠️ **BUG GEN-BUG-5: Image quality degraded — original dimensions used for scaling but small image downloaded**

### GEN-31: Excel image embedding
**Input:** Images Map has 3 entries  
**Trace:**  
1. `images.size > 0` → true → creates 'Images' sheet  
2. Hardcoded sheet name `'Images'` — no sanitization needed (safe name) ✓  
3. For each image: `uint8ArrayToBase64(img.imageBytes)` → base64 string  
4. `workbook.addImage({base64: imgBase64, extension: 'jpeg'})` → image ID  
5. `imgSheet.addImage(imageId, {tl: {col:2, row: imgRowNum-1}, ext: {width:250, height:150}})` → image placed  
6. Fixed dimensions 250×150 regardless of original → OK for thumbnails  
**Result:** ✅ Pass

### GEN-32: PPT image embedding — base64 format
**Input:** slideImage with imageBytes  
**Trace:**  
1. `uint8ArrayToBase64(slideImage.imageBytes)` → base64 string  
2. `data: \`image/jpeg;base64,${imgBase64}\``  
3. pptxgenjs splits on comma: `['image/jpeg;base64', base64Data]`  
4. Extracts type: `'image/jpeg;base64'.split(':')[1]` → undefined → fallback: `'image/jpeg;base64'.split(';')[0]` → `'image/jpeg'` ✓  
5. Image embedded correctly  
**Result:** ✅ Pass

### GEN-33: PPT RTL text alignment ← **BUG**
**Input:** language="Arabic"  
**Trace:**  
1. `isRTL = true` → `pptx.rtlMode = true`  
2. Title slide: `align: 'left'` (hardcoded) — **should be 'right'** for Arabic  
3. Subtitle: `align: 'left'` (hardcoded) — same issue  
4. Content slides: bullet text inherits from pptx.rtlMode which may or may not override align  
5. End slide "Thank You": `align: 'center'` — OK for centered text  
**Result:** ❌ **BUG GEN-BUG-7: Arabic PPT title left-aligned instead of right-aligned**

### GEN-34: PPT end slide in Japanese
**Input:** language="Japanese"  
**Trace:**  
1. End slide shows `"Thank You"` and `"Generated by AI Writer"` — both in English  
2. For a Japanese presentation, this is inconsistent  
**Result:** ⚠️ **BUG GEN-BUG-8: End slide not localized**

### GEN-35: Unicode filename generation
**Input:** topic="気候変動レポート" (Japanese)  
**Trace:**  
1. `sanitizeTopic("気候変動レポート")` → regex `/[^\p{L}\p{N}\s]/gu` keeps all CJK letters  
2. → "気候変動レポート" → `.replace(/\s+/g, '_')` → "気候変動レポート" (no spaces) → `substring(0,40)`  
3. `generateFileName(topic, 'pdf')` = `"気候変動レポート_20260214120000.pdf"`  
4. `saveFile(name, data)` → `FileSystem.writeAsStringAsync(OUTPUT_DIR + name, ...)` — Expo handles Unicode paths ✓  
**Result:** ✅ Pass

### GEN-36: Topic with only special characters
**Input:** topic="!!!@@@###$$$"  
**Trace:**  
1. `sanitizeTopic("!!!@@@###$$$")` → regex removes all → `""` → fallback `"ai_writer_doc"`  
2. `generateFileName` = `"ai_writer_doc_20260214120000.pdf"` ✓  
**Result:** ✅ Pass

### GEN-37: Parallel file generation — one format fails
**Input:** PDF generation throws (e.g., font download timeout), Word/PPT/Excel succeed  
**Trace:**  
1. `filePromises` has 4 promises  
2. PDF throws → `Promise.all` rejects with PDF error  
3. At rejection, `files[]` may contain 0-3 entries (whichever completed first)  
4. Catch block: `for (const f of files) { FileSystem.deleteAsync(f.path) }` — partial files cleaned up ✓  
5. User sees error Alert, no orphan files  
**Result:** ✅ Pass (cleanup works correctly)

### GEN-38: Parallel file generation — all succeed
**Input:** Normal case, all 4 formats  
**Trace:**  
1. All 4 promises push to `files[]`  
2. `files.push()` is synchronous in JS event loop — no race condition  
3. `addHistoryEntry()` saves 4 files  
4. Navigate to Result with all files  
**Result:** ✅ Pass

### GEN-39: addHistoryEntry with 50+ existing entries
**Input:** History already has 50 entries  
**Trace:**  
1. `history.unshift(newEntry)` → 51 entries  
2. `trimmed = history.slice(0, 50)` → keeps newest 50  
3. `removed = history.slice(50)` → 1 old entry  
4. Old entry's files deleted from disk  
5. `AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed))` — saves 50 entries  
**Result:** ✅ Pass

### GEN-40: Font download timeout (15s)
**Input:** Slow network, Thai font download takes >15s  
**Trace:**  
1. `getCachedFont` → `setTimeout(() => controller.abort(), 15000)`  
2. After 15s → `controller.abort()` → fetch throws AbortError  
3. `catch (error)` → `console.warn('Font cache error:')` → returns `null`  
4. PDF falls back to Helvetica  
5. For Thai: text becomes `?????` (same result as BUG GEN-BUG-1 but for different reason)  
**Result:** ⚠️ Expected fallback behavior (but Thai still broken due to BUG-1)

### GEN-41: Font cached from previous generation
**Input:** Second generation with Arabic language  
**Trace:**  
1. `getCachedFont('ar')` → `getFontKey('ar')` = `'arabic'`  
2. `cacheFile = FONT_CACHE_DIR + 'arabic.ttf'`  
3. `getInfoAsync(cacheFile)` → `exists: true` (cached from first run)  
4. `readAsStringAsync(cacheFile, Base64)` → `base64ToUint8Array(base64)` → font bytes  
5. Font embedded from cache — no network request needed  
**Result:** ✅ Pass (caching works)

### GEN-42: fontCacheService base64 encoding — 1-byte remainder ← **BUG**
**Input:** Font file with `bytes.length % 3 === 1` (e.g., 100 bytes)  
**Trace (inline uint8ArrayToBase64 in fontCacheService):**  
1. Processing last triplet: `i` points to last byte  
2. `a = binary.charCodeAt(i++)` → reads byte 99, i=100  
3. `b = i < binary.length ? ...` → `100 < 100` → false → `b = 0`  
4. `c = i < binary.length ? ...` → false → `c = 0`  
5. `bitsCount = i <= binary.length + 1 ? (i <= binary.length ? 3 : 2) : 1`  
6. `100 <= 101` → true. `100 <= 100` → true. `bitsCount = 3` ← **WRONG!** Only 1 byte read  
7. All 4 chars written (no `=` padding) instead of 2 chars + `==`  
8. Decoder reads back: `padding = 0` (no `=` at end) → `byteLength` too large → extra zero bytes  
**Result:** ❌ **BUG GEN-BUG-9: Incorrect base64 padding — cached fonts have trailing zero bytes**

### GEN-43: Image fetch fails entirely
**Input:** Pexels API is down (returns 500 for all requests)  
**Trace:**  
1. `fetchImagesForKeywords(keywords)` → each `fetchImageForKeyword` → `searchPhoto` → response.ok = false  
2. Returns `null` for each → `results` Map is empty  
3. `imageMap.size === 0`  
4. All generators skip image embedding (check `if (images && section.image_keyword)` → images is empty Map → `images.get(keyword)` returns `undefined` → skipped)  
**Result:** ✅ Pass (graceful degradation without images)

### GEN-44: Image fetch partial success
**Input:** 3 sections with keywords, Pexels returns images for 2 out of 3  
**Trace:**  
1. `fetchImagesForKeywords(['nature', 'technology', 'medicine'])` → parallel fetch  
2. 'medicine' fetch fails → `null` → not added to Map  
3. `imageMap` has 2 entries  
4. Generators: sections with 'nature' and 'technology' get images, 'medicine' section has no image  
5. No crash, no error  
**Result:** ✅ Pass

### GEN-45: Empty image keyword
**Input:** AI returns section with `image_keyword: ""`  
**Trace:**  
1. `extractImageKeywords` → `"".trim().length > 0` → false → keyword not added  
2. No Pexels fetch for empty keyword  
3. Generator: `images.get("")` → undefined → no image embedded  
**Result:** ✅ Pass

### GEN-46: Duplicate image keywords across sections
**Input:** 3 sections all with `image_keyword: "nature"`  
**Trace:**  
1. `extractImageKeywords` returns `['nature', 'nature', 'nature']`  
2. `fetchImagesForKeywords` deduplicates: `[...new Set(...)]` = `['nature']`  
3. Single Pexels fetch for 'nature'  
4. Result cached: `imageCache.set('nature', docImage)`  
5. All 3 sections get the same image from Map  
**Result:** ✅ Pass

### GEN-47: Special characters in bullet text — Word RTL
**Input:** language="Arabic", bullet text="• نقطة مهمة: التغيير ضروري!"  
**Trace:**  
1. Word: `TextRun({ text: bullet, rightToLeft: true })` ✓  
2. Arabic text with `:` and `!` — both valid in text content  
3. docx library handles UTF-8 ✓  
**Result:** ✅ Pass

### GEN-48: PDF bullet with very long text (500+ chars)
**Input:** Single bullet with 500 characters  
**Trace:**  
1. PDF: `bulletText = "  •  " + bullet` → 505 chars  
2. `wrapText(bulletText, fontRegular, 11, CONTENT_WIDTH - 20, safeText)` → wraps to ~25 lines  
3. Each line: checks `yPos < MARGIN + 20` → if page boundary reached, new page added  
4. Bullet renders across multiple lines, possibly multiple pages  
**Result:** ✅ Pass

### GEN-49: Single section with 1 bullet — minimum content
**Input:** 1 section, heading="Test", paragraph="Hello world.", bullets=["Point"]  
**Trace:**  
1. `validSections`: heading.trim() ✓, paragraph.trim() ✓ → passes  
2. `bullets.filter(b => b.trim())` → ["Point"] (1 bullet) → `bullets.length > 0` → no fallback  
3. All generators render 1 section with 1 bullet  
4. PPT: 1 content slide with 1 bullet  
5. Excel: 1 data row  
**Result:** ✅ Pass

### GEN-50: Sections reordered then generated — slide index mismatch
**Input:** User moves Section 2 to position 1, then generates  
**Trace:**  
1. `moveSection(1, 'up')` → swaps `sections[0]` and `sections[1]`; also swaps `slides[0]` and `slides[1]`  
2. Both arrays stay in sync ✓  
3. `handleGenerateFiles()`:  
   a. `validSections` maps sections (new objects after .filter/.map)  
   b. `sections.indexOf(s)` → **-1** (BUG GEN-BUG-2)  
   c. Fallback reconstructs slides from section data → correct order since sections are already reordered  
4. PPT slides match reordered sections ✓ (by coincidence, not by correct logic)  
**Result:** ⚠️ Works by coincidence due to BUG-2 fallback — but logically broken

---

## PART 2: SUMMARIZE SCENARIOS (SUM-1 through SUM-50)

### SUM-1: Basic DOCX file upload — happy path
**Input:** Upload "report.docx" (5KB), language="English"  
**Trace:**  
1. SummarizeScreen: `DocumentPicker.getDocumentAsync()` → user picks file  
2. `setUploadedFile(result)` → state updated  
3. User taps "Summarize AI" → `handleSummarize()`  
4. Navigates to SummarizeProcessing with: uri, name="report.docx", language="English"  
5. `runSummarization()`:  
   a. Step 0: `parseUploadedFile(uri, "report.docx")` → `getFileType` = 'docx'  
   b. `readAsStringAsync(uri, Base64)` → base64 data  
   c. `parseDocx(base64)` → JSZip.loadAsync → find word/document.xml → stripXml → text  
   d. Content length > 2 chars ✓. Content < 15000 → no truncation.  
   e. Step 1: `canMakeRequest()` → true ✓  
   f. Step 2: `summarizeDocument(content, "English", "report.docx")` → builds prompt → API call  
   g. API returns JSON → `parseAIResponse` validates → AIWriterOutput  
   h. Step 3: `navigation.replace('Editor', {...})`  
6. EditorScreen opens with summarized content for editing  
**Result:** ✅ Pass

### SUM-2: TXT file upload
**Input:** Upload "notes.txt" (2KB), language="Spanish"  
**Trace:**  
1. `getFileType("notes.txt")` = 'txt'  
2. `readAsStringAsync(uri, UTF8)` → raw text  
3. Content validated, not truncated  
4. AI summarizes in Spanish  
**Result:** ✅ Pass

### SUM-3: XLSX file upload
**Input:** Upload "data.xlsx" (10KB), language="English"  
**Trace:**  
1. `getFileType("data.xlsx")` = 'xlsx'  
2. `readAsStringAsync(uri, Base64)` → `parseXlsx(base64)`  
3. JSZip extracts xl/sharedStrings.xml + xl/worksheets/sheet1.xml  
4. Shared strings parsed, cell values extracted, rows joined with ` | `  
5. Content = "[Sheet 1]\nHeader1 | Header2\nRow1Val | Row2Val..."  
6. AI summarizes the tabular data  
**Result:** ✅ Pass

### SUM-4: PPTX file upload
**Input:** Upload "presentation.pptx" (50KB), language="French"  
**Trace:**  
1. `getFileType("presentation.pptx")` = 'pptx'  
2. `parsePptx(base64)` → JSZip finds ppt/slides/slide*.xml files  
3. Slides sorted numerically. stripXml extracts text from each.  
4. Content = "[Slide 1]\nTitle Text\n[Slide 2]\n..." + speaker notes  
5. AI summarizes in French  
**Result:** ✅ Pass

### SUM-5: PDF file upload — should error
**Input:** Upload "document.pdf"  
**Trace:**  
1. DocumentPicker MIME types don't include 'application/pdf' ✓ — PDF cannot be selected from picker  
2. On some Android devices with poor MIME filtering, a PDF might slip through  
3. `getFileType("document.pdf")` = 'pdf'  
4. In `parseUploadedFile`: `if (fileType === 'pdf') throw new Error('PDF text extraction is not supported...')`  
5. Error caught by SummarizeProcessingScreen try-catch → Alert shown  
**Result:** ✅ Pass (graceful error for edge case)

### SUM-6: Large file — content truncation ← **BUG**
**Input:** Upload "large_report.docx" with 30,000 characters of text  
**Trace:**  
1. `parseDocx` extracts full text (30,000 chars)  
2. `content.length > MAX_CHARS (15000)` → `content = content.substring(0, 15000) + '\n\n[Content truncated...]'`  
3. `wasTruncated = true`  
4. Returns `{content, wasTruncated: true, ...}`  
5. SummarizeProcessingScreen: `const parsed = await parseUploadedFile(...)`  
6. Uses `parsed.content` (truncated to 15K)  
7. **Never checks `parsed.wasTruncated`** — user has no idea half the document was cut off  
8. AI summarizes only the first half of the document  
**Result:** ❌ **BUG SUM-BUG-1: Truncation not communicated to user**

### SUM-7: Empty file upload
**Input:** Upload "empty.txt" (0 bytes)  
**Trace:**  
1. `readAsStringAsync(uri, UTF8)` → `""`  
2. `content.trim().length < 2` → `throw new Error('File "empty.txt" (0 B) has no extractable text...')`  
3. Error caught by SummarizeProcessingScreen → Alert shown with message  
**Result:** ✅ Pass

### SUM-8: Corrupt DOCX file
**Input:** Upload "corrupt.docx" (file is actually a renamed JPEG)  
**Trace:**  
1. `getFileType("corrupt.docx")` = 'docx'  
2. `readAsStringAsync(uri, Base64)` → base64 of JPEG data  
3. `parseDocx(base64)` → `JSZip.loadAsync(base64ToUint8Array(base64))` → throws "Is not a valid zip file"  
4. Caught by outer try-catch in `parseUploadedFile`:  
   `throw new Error('Unable to read "corrupt.docx": Is not a valid zip file. The file may be corrupted or in an unsupported format.')`  
5. SummarizeProcessingScreen catches → Alert shown  
**Result:** ✅ Pass

### SUM-9: DOCX with no word/document.xml
**Input:** Upload modified DOCX with document.xml deleted  
**Trace:**  
1. JSZip opens successfully (it's a valid ZIP)  
2. `zip.file('word/document.xml')` → null  
3. `throw new Error('Invalid DOCX: word/document.xml not found')`  
4. Caught and shown as alert  
**Result:** ✅ Pass

### SUM-10: PPTX with no slides
**Input:** Upload PPTX with all slides deleted (empty presentation)  
**Trace:**  
1. `Object.keys(zip.files).filter(...)` → no files matching `ppt/slides/slide*.xml`  
2. `slideFiles.length === 0` → `throw new Error('Invalid PPTX: no slides found')`  
3. Caught and alerted  
**Result:** ✅ Pass

### SUM-11: XLSX with no shared strings or worksheets
**Input:** Upload minimal XLSX with only empty sheets  
**Trace:**  
1. `ssFile = zip.file('xl/sharedStrings.xml')` → null → `sharedStrings = []`  
2. Sheet files found but rows have no `<c>` cells → `rows = []` for each  
3. `sheetTexts.length === 0` → falls back to `sharedStrings.join('\n')` → `""`  
4. Content = "" → `content.trim().length < 2` → throws empty file error  
**Result:** ✅ Pass

### SUM-12: File with XML entities in content
**Input:** DOCX containing `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`  
**Trace:**  
1. `stripXml(docXml)` → replaces `&amp;` → `&`, `&lt;` → `<`, etc.  
2. Clean text extracted correctly  
**Result:** ✅ Pass

### SUM-13: File with numeric XML entities
**Input:** DOCX containing `&#169;` (©), `&#8212;` (—)  
**Trace:**  
1. `stripXml` → `&#(\d+);` → `String.fromCharCode(parseInt('169', 10))` → ©  
2. `String.fromCharCode(8212)` → — (em dash)  
3. Characters preserved correctly  
**Result:** ✅ Pass

### SUM-14: DOCX with headers and footers
**Input:** DOCX containing header "Company Name" and footer "Page 1"  
**Trace:**  
1. `parseDocx`: main document.xml parsed  
2. Loop: finds `word/header1.xml`, `word/footer1.xml`  
3. Each extracted via `stripXml`, filtered (length > 5)  
4. Appended as `"\n\n--- Headers/Footers ---\nCompany Name\nPage 1"`  
5. AI receives full text including headers/footers  
**Result:** ✅ Pass

### SUM-15: PPTX with speaker notes
**Input:** PPTX with 3 slides and speaker notes on slide 2  
**Trace:**  
1. Slides parsed: `[Slide 1]`, `[Slide 2]`, `[Slide 3]`  
2. `ppt/notesSlides/notesSlide2.xml` found → text extracted → `[Speaker Notes]\n...`  
3. All content sent to AI  
**Result:** ✅ Pass

### SUM-16: Token limit exceeded before summarization
**Input:** User has 0 remaining tokens  
**Trace:**  
1. Step 0: File parsed successfully  
2. Step 1: `canMakeRequest()` → returns false  
3. `getRemainingTokens()` → 0  
4. Alert: "Daily token limit reached (5,000 tokens/day). You have 0 tokens remaining."  
5. Button: "Go Back" → navigates back  
**Result:** ✅ Pass

### SUM-17: Token limit exceeded during API call
**Input:** Processing screen checks tokens → OK. `callLongcatAPI` checks again → fails  
**Trace:**  
1. SummarizeProcessingScreen: `canMakeRequest()` → true (edge case: tokens very close to limit)  
2. `summarizeDocument` → `callLongcatAPI` → `canMakeRequest()` → false (consumed by another flow)  
3. Throws "Daily token limit reached" error  
4. Error has no retry (contains 'Daily token limit') → propagates to catch block  
5. Alert: "Summarization Failed" with "Try Again" and "Go Back"  
6. "Try Again" would hit same limit → **endless fail loop until midnight**  
**Result:** ⚠️ UX issue but not crash

### SUM-18: AI returns invalid JSON
**Input:** API returns malformed response  
**Trace:**  
1. `callLongcatAPI` → `response.json()` → `data.choices[0].message.content = "I can't do that"`  
2. `parseAIResponse("I can't do that")` → `JSON.parse(...)` → throws SyntaxError  
3. `throw new Error('Invalid JSON from AI: ...')`  
4. `callLongcatAPI` retries (attempt 2): if same issue → retries again  
5. After MAX_RETRIES=2, throws `"Failed to generate content after 2 attempts"`  
6. SummarizeProcessingScreen catches → Alert with "Try Again" / "Go Back"  
**Result:** ✅ Pass (retry + error handling works)

### SUM-19: AI returns JSON missing pdf_word
**Input:** API returns `{"ppt": {...}, "excel": {...}}`  
**Trace:**  
1. `parseAIResponse` → `validatePdfWord(obj.pdf_word)` → `obj.pdf_word` is undefined  
2. `throw new Error('Missing or invalid "pdf_word" in AI response')`  
3. Retry → same response → fails after 2 attempts  
**Result:** ✅ Pass

### SUM-20: AI returns empty sections array
**Input:** API returns `{"pdf_word": {"title": "...", "language": "...", "sections": []}}`  
**Trace:**  
1. `validatePdfWord` → `sections.length === 0` → `throw new Error('pdf_word.sections is missing or empty')`  
2. Retry + error  
**Result:** ✅ Pass

### SUM-21: User cancels during file parsing
**Input:** User taps Cancel while file is being parsed  
**Trace:**  
1. `handleCancel()` → `cancelledRef.current = true` → `navigation.goBack()`  
2. `runSummarization`:  
   a. `parseUploadedFile` still running (async)  
   b. After parse completes: `if (cancelledRef.current) return` → exits  
3. No further processing, no error  
**Result:** ✅ Pass

### SUM-22: User cancels during AI call
**Input:** User taps Cancel while AI is processing  
**Trace:**  
1. `cancelledRef.current = true`  
2. `summarizeDocument` is still running (fetch in progress)  
3. Note: the abort controller is INSIDE `callLongcatAPI`, not accessible from cancel  
4. The fetch continues but after completion: `if (cancelledRef.current) return`  
5. Navigation already went back — no further action  
6. Token usage still recorded (wasted tokens)  
**Result:** ⚠️ Minor — tokens wasted on cancelled request, but no crash

### SUM-23: Network timeout during AI call
**Input:** Network goes offline after starting  
**Trace:**  
1. `callLongcatAPI` → `setTimeout(() => controller.abort(), 30000)` → 30s timeout  
2. fetch aborted after 30s → AbortError  
3. Attempt 2: same timeout → same error  
4. After 2 attempts: `"Failed to generate content after 2 attempts. Last error: The operation was aborted."`  
5. Alert shown with retry option  
**Result:** ✅ Pass

### SUM-24: Summarize with Arabic output language
**Input:** English DOCX, output language="Arabic"  
**Trace:**  
1. File parsed → English text  
2. `summarizeDocument(content, "Arabic", fileName)` → prompt says "Output Language: Arabic"  
3. AI returns Arabic text in JSON  
4. Editor shows Arabic content  
5. On generate: PDF uses Arabic font (langNameToCode["arabic"] = 'ar' ✓)  
6. Word: isRTL = true ✓  
7. PPT: isRTL = true ✓ but alignment hardcoded (known bug)  
**Result:** ✅ Pass (except known PPT alignment bug)

### SUM-25: Summarize with Thai output language
**Input:** English DOCX, output language="Thai"  
**Trace:**  
1. AI returns Thai text  
2. Editor shows Thai content (React Native renders Thai fine)  
3. On generate: **PDF broken** (BUG GEN-BUG-1 — Thai font not loaded)  
4. Word: Thai text in Calibri — may not render perfectly but basic support exists  
5. Excel: Thai text as string values — rendered by host app's font  
**Result:** ⚠️ PDF broken due to GEN-BUG-1

### SUM-26: Very short document (single sentence)
**Input:** TXT file: "The quick brown fox jumps over the lazy dog."  
**Trace:**  
1. Content = "The quick brown fox..." (45 chars)  
2. Content > 2 chars ✓, no truncation  
3. Summarization prompt: "Generate sections based on content length: for short documents (under 100 words), 1-2 sections is fine"  
4. AI returns 1-2 sections → validates → Editor opens  
**Result:** ✅ Pass

### SUM-27: Document with HTML-like content
**Input:** TXT file containing `<h1>Title</h1><p>Paragraph</p>`  
**Trace:**  
1. `readAsStringAsync(uri, UTF8)` → raw text including HTML tags  
2. No HTML stripping for .txt files — HTML tags passed to AI as-is  
3. AI may or may not interpret HTML correctly  
**Result:** ✅ Pass (no crash, AI handles it reasonably)

### SUM-28: RTF file upload
**Input:** Upload "document.rtf"  
**Trace:**  
1. `getFileType("document.rtf")` = 'rtf'  
2. `readAsStringAsync(uri, UTF8)` → raw RTF content  
3. `stripRtf(raw)` → removes font tables, color tables, control words, braces  
4. Converts `\par` to `\n`, `\'XX` to characters  
5. Clean text extracted  
6. Content validated → AI processes  
**Result:** ✅ Pass

### SUM-29: RTF file with complex formatting
**Input:** RTF with nested groups `{\b bold {\i bold-italic}}`  
**Trace:**  
1. `stripRtf`: removes control words `\b`, `\i` via regex `\\[a-z]+(-?\d+)?\s?`  
2. Removes `{` and `}` braces  
3. Result: "bold bold-italic"  
4. Text structure intact  
**Result:** ✅ Pass

### SUM-30: File with Unicode BOM
**Input:** TXT file with UTF-8 BOM (0xEF 0xBB 0xBF) at start  
**Trace:**  
1. `readAsStringAsync(uri, UTF8)` → Expo/RN handles BOM correctly  
2. Content starts with BOM character (if not stripped by Expo)  
3. BOM is invisible whitespace — doesn't affect AI processing  
**Result:** ✅ Pass

### SUM-31: Summarize then generate PDF in same language
**Input:** Summarize English DOCX → edit → generate all formats  
**Trace:**  
1. Full pipeline: parse → summarize → Editor → generate  
2. Editor topic = "Summary: report.docx"  
3. `sanitizeTopic("Summary: report.docx")` → "summary reportdocx" (`:` and `.` stripped)  
4. Files named correctly  
**Result:** ✅ Pass

### SUM-32: XLSX with multiple sheets
**Input:** XLSX with 3 worksheets  
**Trace:**  
1. `parseXlsx`: finds sheet1.xml, sheet2.xml, sheet3.xml  
2. Each parsed with shared strings  
3. Content = "[Sheet 1]\n...\n\n[Sheet 2]\n...\n\n[Sheet 3]\n..."  
4. All sheet data sent to AI  
**Result:** ✅ Pass

### SUM-33: XLSX with cell references (formulas)
**Input:** XLSX with `=SUM(A1:A5)` formula cells  
**Trace:**  
1. Formula cells: `<c>` element type is NOT `t="s"` (shared string)  
2. `<v>` contains calculated value (e.g., "50")  
3. `isShared = false` → reads `valueMatch[1]` = "50" (the computed value)  
4. Formula result extracted, not the formula itself  
**Result:** ✅ Pass

### SUM-34: File picker cancellation
**Input:** User opens picker then cancels  
**Trace:**  
1. `DocumentPicker.getDocumentAsync()` → result.canceled = true  
2. `if (!result.canceled && result.assets...)` → false → `setUploadedFile` not called  
3. `uploadedFile` remains null  
4. If user taps Summarize: `!uploadedFile || uploadedFile.canceled` → true → Alert  
**Result:** ✅ Pass

### SUM-35: Re-upload different file without clearing first
**Input:** Upload file A, then upload file B  
**Trace:**  
1. Upload A: `setUploadedFile(resultA)` → state = resultA  
2. Upload B: `setUploadedFile(resultB)` → state = resultB (overrides A)  
3. Old cached file A remains on disk (no cleanup)  
4. UI shows file B name correctly  
5. Summarize uses file B  
**Result:** ⚠️ Minor — old cache file not cleaned up (known low-priority issue)

### SUM-36: Output language differs from document language
**Input:** Upload Chinese DOCX, output language="English"  
**Trace:**  
1. `parseDocx` extracts Chinese text  
2. Prompt: "Output Language: English" + Document Content: Chinese text  
3. AI reads Chinese and outputs English summary  
4. Editor shows English content  
5. Generation: English text → Helvetica ✓  
**Result:** ✅ Pass

### SUM-37: Markdown (.md) file upload
**Input:** Upload "README.md"  
**Trace:**  
1. `getFileType("README.md")` → checks extension 'md' → `typeMap['md'] = 'txt'`  
2. Read as UTF-8 text → markdown syntax included in content  
3. AI processes markdown (headings `#`, bullets `- `, etc.)  
4. AI should extract structure from markdown reasonably  
**Result:** ✅ Pass

### SUM-38: DocumentPicker permission denied
**Input:** User denies storage permission on Android  
**Trace:**  
1. `DocumentPicker.getDocumentAsync()` → throws error  
2. Caught: `Alert.alert(t('alert_error'), t('alert_file_pick_failed'))`  
**Result:** ✅ Pass

### SUM-39: File larger than storage allows
**Input:** 500MB XLSX file  
**Trace:**  
1. `copyToCacheDirectory: true` → Expo copies file to cache  
2. `readAsStringAsync(uri, Base64)` → may run out of memory  
3. If OOM: JavaScript error caught by try-catch → error alert  
4. App might crash on very large files (RN heap limit ~1.5GB)  
**Result:** ⚠️ Extreme edge case — large files may cause OOM crash (platform limitation)

### SUM-40: .doc file slipping through picker
**Input:** Legacy .doc file selected on Android with poor MIME filtering  
**Trace:**  
1. `getFileType("report.doc")` = 'docx' (mapped)  
2. `parseDocx(base64)` → `JSZip.loadAsync(...)` → .doc is OLE binary, not ZIP  
3. JSZip throws "Is not a valid zip file"  
4. Error caught: `Unable to read "report.doc": Is not a valid zip file. The file may be corrupted...`  
5. Alert shown  
**Result:** ✅ Pass (error handled, but message could be clearer)

### SUM-41: File with only whitespace content
**Input:** TXT file with "   \n\t  \n  " (only whitespace)  
**Trace:**  
1. `readAsStringAsync` → "   \n\t  \n  "  
2. `content.trim().length` = 0 → `< 2` → throws empty file error  
**Result:** ✅ Pass

### SUM-42: AI response with code fences
**Input:** AI returns `\`\`\`json\n{...}\n\`\`\``  
**Trace:**  
1. `parseAIResponse(rawContent)`:  
   a. `cleaned = rawContent.trim()` → starts with `\`\`\``  
   b. `cleaned.startsWith('\`\`\`')` → true  
   c. `cleaned.replace(/^\`\`\`(?:json)?\s*\n?/, '')` → strips opening  
   d. `.replace(/\n?\`\`\`\s*$/, '')` → strips closing  
   e. JSON.parse succeeds  
**Result:** ✅ Pass

### SUM-43: Language picker — auto-detect selects device language
**Input:** Device language is Japanese, user doesn't change it  
**Trace:**  
1. `detectDeviceLanguage()` → scans `SUPPORTED_LANGUAGES` for device locale  
2. If Japanese found → returns Japanese option  
3. `[outputLanguage, setOutputLanguage]` initialized to Japanese  
4. User taps Summarize → `language: "Japanese"` passed to processing  
**Result:** ✅ Pass

### SUM-44: Language picker — change language after file selection
**Input:** Select file, then change output language from English to Arabic  
**Trace:**  
1. File selected → state = fileResult  
2. Language changed → state = { ...arabicLang }  
3. Both states independent, no conflict  
4. On Summarize: file=selected, language=Arabic  
**Result:** ✅ Pass

### SUM-45: UI state — showLanguagePicker toggle
**Input:** Tap language picker open, then tap it again  
**Trace:**  
1. First tap: `setShowLanguagePicker(!showLanguagePicker)` → true → dropdown shown  
2. Second tap: `setShowLanguagePicker(!showLanguagePicker)` → false → dropdown hidden  
**Result:** ✅ Pass

### SUM-46: DOCX with images (no text in body)
**Input:** DOCX containing only embedded images, no text  
**Trace:**  
1. `parseDocx` → `stripXml(docXml)` → only image elements → XML stripped → empty or near-empty text  
2. After strip: content might be just whitespace  
3. `content.trim().length < 2` → throws empty file error  
**Result:** ✅ Pass (correct error for image-only docs)

### SUM-47: Rate limiting — Pexels API during generation
**Input:** After summarization → Editor → generate files with images  
**Trace:**  
1. `fetchImagesForKeywords` → parallel fetch for all keywords  
2. If Pexels rate limits (HTTP 429) → `searchPhoto` returns null  
3. Images Map empty or partial → generators skip images  
4. No crash  
**Result:** ✅ Pass

### SUM-48: Summarize processing — progress bar accuracy
**Input:** Normal flow  
**Trace:**  
1. Step 0: setProgress(10) → setProgress(25) — file parse  
2. Step 1: setProgress(35) — token check  
3. Step 2: setProgress(40) → (AI running...) → setProgress(85) — AI complete  
4. Step 3: setProgress(100) — navigate  
5. Progress jumps: 10→25→35→40→85→100 — big gap from 40 to 85 during AI call  
**Result:** ⚠️ Minor UX — progress bar doesn't update during AI call (stays at 40%)

### SUM-49: Summarize → Editor → change language → generate
**Input:** Summarize English file → Editor opens with English → user cannot change language in Editor  
**Trace:**  
1. Editor receives `language` from route params — it's read-only  
2. Editor has no language picker  
3. User can edit text but language used for generation is fixed  
4. If user writes Arabic text manually in the English editor, Word/PDF use English settings  
5. RTL detection would fail for manually-entered Arabic in "English" mode  
**Result:** ⚠️ Minor UX — can't change output language in Editor

### SUM-50: Summarize with extremely long filename
**Input:** File name with 500 characters  
**Trace:**  
1. `uploadedFileName` = "very_long_name_...500chars..."  
2. Processing screen displays: `📄 {uploadedFileName}` — may overflow UI  
3. `topic = \`Summary: ${uploadedFileName}\`` → very long topic  
4. `sanitizeTopic(topic)` → `.substring(0, 40)` — truncated safely  
5. File generation works fine  
**Result:** ✅ Pass (UI may overflow but no crash)

---

## PART 3: TRANSLATION SCENARIOS (TRANS-1 through TRANS-50)

### TRANS-1: Basic DOCX translation — English to Spanish
**Input:** "report.docx", source="English", target="Spanish"  
**Trace:**  
1. TranslateScreen: file picked, source=English, target=Spanish  
2. `sourceLanguage.code !== targetLanguage.code` → 'en' !== 'es' → OK ✓  
3. Navigate to TranslateProcessing  
4. `parseUploadedFile(uri, fileName)` → DOCX parsed successfully  
5. `canMakeRequest()` → true  
6. `translateDocument(content, "English", "Spanish", fileName)` → builds translation prompt  
7. Prompt: "Translate...from English to Spanish" + document content  
8. AI returns Spanish JSON → validates → Editor  
9. `topic = "report.docx → Spanish"`  
10. `language = "Spanish"` → used for all generators (correct language context)  
**Result:** ✅ Pass

### TRANS-2: Same language selected — validation
**Input:** source="English", target="English"  
**Trace:**  
1. `handleTranslate()`: `sourceLanguage.code === targetLanguage.code` → 'en' === 'en' → true  
2. `Alert.alert(t('alert_same_language_title'), t('alert_same_language_msg'))`  
3. Navigation blocked  
**Result:** ✅ Pass

### TRANS-3: Swap languages button
**Input:** source=English, target=Arabic → tap swap  
**Trace:**  
1. `handleSwapLanguages()`: `temp = sourceLanguage` (English)  
2. `setSourceLanguage(targetLanguage)` → Arabic  
3. `setTargetLanguage(temp)` → English  
4. Now source=Arabic, target=English  
**Result:** ✅ Pass

### TRANS-4: No file selected — validation
**Input:** User taps Translate without selecting file  
**Trace:**  
1. `uploadedFile` is null  
2. `!uploadedFile || uploadedFile.canceled` → true  
3. Alert: "File required" message  
**Result:** ✅ Pass

### TRANS-5: Translate to Arabic (RTL language)
**Input:** English DOCX → Arabic  
**Trace:**  
1. AI returns Arabic text  
2. `language = "Arabic"` passed to Editor  
3. On generate:  
   - PDF: `hasNonLatinText` → true → Arabic font loaded (langNameToCode['arabic']='ar') ✓  
   - Word: isRTL = true, bidirectional flags set ✓  
   - PPT: rtlMode = true ✓ (but align bug)  
**Result:** ✅ Pass (except known PPT align bug)

### TRANS-6: Translate to Thai ← **BUG**
**Input:** English DOCX → Thai  
**Trace:**  
1. AI returns Thai text  
2. On generate: PDF font loading fails for Thai (BUG GEN-BUG-1)  
3. All Thai text in PDF → `?????`  
**Result:** ❌ **PDF broken for Thai (same BUG GEN-BUG-1)**

### TRANS-7: Translate to Bengali ← **BUG**
**Input:** English DOCX → Bengali  
**Trace:** Same as TRANS-6. Bengali font not loaded. PDF broken.  
**Result:** ❌ **BUG GEN-BUG-1**

### TRANS-8: Translate to Hebrew ← **BUG**
**Input:** English DOCX → Hebrew  
**Trace:**  
1. PDF: font loading fails (langNameToCode missing 'hebrew')  
2. Word: isRTL = true ('hebrew' in rtlLanguages) → RTL flags set ✓  
3. PPT: not in rtlLanguages? Let me check... `rtlLanguages = ['arabic', 'hebrew', 'persian', 'farsi', 'urdu']` → **yes, 'hebrew' IS in the list** ✓  
4. PDF broken, Word+PPT OK for RTL  
**Result:** ❌ **PDF broken for Hebrew (BUG GEN-BUG-1)**

### TRANS-9: Large file — content truncation ← **BUG**
**Input:** Large DOCX (25K chars), translate English→French  
**Trace:**  
1. `parseUploadedFile` → content truncated to 15K + `[Content truncated...]`  
2. `wasTruncated = true`  
3. TranslateProcessingScreen: **never checks `wasTruncated`**  
4. AI translates only first ~15K chars, rest lost  
5. User not informed of truncation  
**Result:** ❌ **BUG TRANS-BUG-1: Truncation not communicated**

### TRANS-10: Translate with network error
**Input:** WiFi drops during AI call  
**Trace:**  
1. `callLongcatAPI` → fetch fails → retries  
2. After 2 retries → error thrown  
3. `TranslateProcessingScreen` catch → Alert with "Try Again" / "Go Back"  
**Result:** ✅ Pass

### TRANS-11: User cancels during translation
**Input:** User taps Cancel during AI processing  
**Trace:**  
1. `cancelledRef.current = true` → `navigation.goBack()`  
2. `runTranslation` continues async but checks `cancelledRef.current` after each step → returns  
3. No navigation occurs (user already went back)  
**Result:** ✅ Pass

### TRANS-12: Translate TXT file
**Input:** "notes.txt" English → German  
**Trace:**  
1. `getFileType("notes.txt")` = 'txt'  
2. `readAsStringAsync(uri, UTF8)` → text  
3. AI translates to German  
**Result:** ✅ Pass

### TRANS-13: Translate XLSX file
**Input:** "data.xlsx" English → Chinese  
**Trace:**  
1. `parseXlsx` extracts tabular text with `|` separators  
2. AI receives: "[Sheet 1]\nName | Age | City\nJohn | 25 | NYC..."  
3. AI translates column contents: "姓名 | 年龄 | 城市\n约翰 | 25 | 纽约..."  
4. Editor shows Chinese content  
5. PDF: Chinese font loaded (langNameToCode['chinese']='zh') ✓  
**Result:** ✅ Pass

### TRANS-14: Translate PPTX with speaker notes
**Input:** English PPTX → Japanese  
**Trace:**  
1. `parsePptx` extracts slides + speaker notes  
2. All text sent to AI with `[Slide N]` and `[Speaker Notes]` markers  
3. AI translates everything  
4. Note: speaker notes are translated but output is standard section format (notes not preserved as notes)  
**Result:** ✅ Pass (content correct, but notes not specifically marked in output)

### TRANS-15: Translate RTF file
**Input:** "document.rtf" English → French  
**Trace:**  
1. `getFileType("document.rtf")` = 'rtf'  
2. `stripRtf(raw)` extracts plain text  
3. AI translates to French  
**Result:** ✅ Pass

### TRANS-16: Translate from Arabic to English (RTL → LTR)
**Input:** Arabic DOCX → English  
**Trace:**  
1. File parsed → Arabic text extracted  
2. AI translates to English  
3. `language = "English"` → used for generation  
4. PDF: `hasNonLatinText("The impact of...")` → false → Helvetica ✓  
5. Word: isRTL for "English" → false ✓ (no RTL)  
**Result:** ✅ Pass

### TRANS-17: Token limit check — both layers
**Input:** User has 100 tokens remaining (close to limit)  
**Trace:**  
1. TranslateProcessingScreen: `canMakeRequest()` → true (100 > 0)  
2. `callLongcatAPI` → `canMakeRequest()` → true  
3. API call made, response received  
4. `recordTokenUsage(500)` → remaining = -400 (over limit)  
5. Next request will be blocked  
**Result:** ✅ Pass (current request goes through, next one blocked)

### TRANS-18: AI loses sections during translation
**Input:** English file with 5 well-defined sections → translate to Arabic  
**Trace:**  
1. Original text has 5 sections  
2. AI returns only 3 sections (summarized during translation)  
3. `parseAIResponse` validates: `sections.length > 0` → 3 > 0 → passes  
4. No check that section count matches original  
5. User lost 2 sections without knowing  
6. Translation prompt says "Do NOT add new content or remove existing sections" but AI may not comply  
**Result:** ⚠️ Known issue — AI may reduce sections (can't be fixed in code, only in prompts)

### TRANS-19: Translate direction display
**Input:** English → Arabic  
**Trace:**  
1. TranslateProcessingScreen shows: `t('trans_processing_direction', { source: "English", target: "Arabic" })`  
2. Displays: "English → Arabic" ✓  
**Result:** ✅ Pass

### TRANS-20: Both language pickers open simultaneously
**Input:** User taps source picker then immediately taps target picker  
**Trace:**  
1. Source picker tap: `setShowSourcePicker(!showSourcePicker); setShowTargetPicker(false)`  
2. Source picker opens, target closes  
3. Target picker tap: `setShowTargetPicker(!showTargetPicker); setShowSourcePicker(false)`  
4. Target picker opens, source closes  
5. Only one picker visible at a time ✓  
**Result:** ✅ Pass

### TRANS-21: Translate CSV file
**Input:** "data.csv" English → Spanish  
**Trace:**  
1. `getFileType("data.csv")` = 'csv'  
2. `readAsStringAsync(uri, UTF8)` → raw CSV text  
3. AI receives CSV format, translates content  
**Result:** ✅ Pass

### TRANS-22: Translate to Greek ← **BUG**
**Input:** English DOCX → Greek  
**Trace:**  
1. AI returns Greek text  
2. PDF: `hasNonLatinText(greekText)` → Greek chars (Α-ω, 0x0391-0x03C9) > 0xFF → true  
3. `langNameToCode["greek"]` = undefined → code = "greek" → font not found  
4. Falls back to Helvetica → `sanitizeForWinAnsi` replaces Greek chars with `?`  
5. **PDF completely broken for Greek**  
**Result:** ❌ **BUG GEN-BUG-1 (Greek)**

### TRANS-23: Translate to Ukrainian ← **BUG**
**Input:** English DOCX → Ukrainian  
**Trace:** Same as TRANS-22. Ukrainian Cyrillic not in langNameToCode → `?????` in PDF.  
**Result:** ❌ **BUG GEN-BUG-1 (Ukrainian)**

### TRANS-24: Translate to Vietnamese ← **BUG**
**Input:** English DOCX → Vietnamese  
**Trace:** Vietnamese diacriticals (ế, ổ, etc.) > 0xFF → flagged non-Latin → font not found → partially broken.  
**Result:** ❌ **BUG GEN-BUG-1 (Vietnamese)**

### TRANS-25: Translate empty file
**Input:** Upload empty.txt → translate  
**Trace:**  
1. `parseUploadedFile` → `content.trim().length < 2` → throws  
2. TranslateProcessingScreen catches → Alert  
**Result:** ✅ Pass

### TRANS-26: Translate corrupt XLSX
**Input:** Renamed JPEG as "data.xlsx"  
**Trace:**  
1. `parseXlsx(base64)` → JSZip.loadAsync → "Is not a valid zip file"  
2. Error caught → Alert  
**Result:** ✅ Pass

### TRANS-27: Translate file with special Unicode chars
**Input:** TXT with emojis 🎉🌍🔥, translate to Japanese  
**Trace:**  
1. Text content includes emojis → sent to AI  
2. AI translates text, may preserve or ignore emojis  
3. Generated files: emojis in PDF (custom Japanese font) → CJK range doesn't include emojis  
4. `sanitizeForWinAnsi` → emojis become `?` (if Latin mode) OR font might not have emoji glyphs  
**Result:** ⚠️ Minor — emojis may not render in PDF regardless of font

### TRANS-28: Translate to Russian (Cyrillic)
**Input:** English DOCX → Russian  
**Trace:**  
1. `langNameToCode["russian"]` = 'ru' ✓  
2. `LANGUAGE_TO_FONT['ru']` = 'latin' → Noto Sans (includes Cyrillic) → font loaded  
3. Russian text renders correctly in PDF  
**Result:** ✅ Pass

### TRANS-29: Translate to Turkish
**Input:** English DOCX → Turkish  
**Trace:**  
1. `langNameToCode["turkish"]` = 'tr' ✓  
2. Turkish special chars (İ, ş, ğ, ç, ö, ü) → Noto Sans Latin → renders ✓  
**Result:** ✅ Pass

### TRANS-30: Translate to Urdu (RTL)
**Input:** English DOCX → Urdu  
**Trace:**  
1. `langNameToCode["urdu"]` = 'ur' → `LANGUAGE_TO_FONT['ur']` = 'arabic' → Arabic font → ✓  
2. Word: isRTL = true ('urdu' in rtlLanguages) ✓  
3. PPT: isRTL = true ✓  
**Result:** ✅ Pass

### TRANS-31: Translate between non-English languages
**Input:** Arabic DOCX → Chinese  
**Trace:**  
1. Arabic text extracted from DOCX  
2. Prompt: "Translate from Arabic to Chinese" + Arabic content  
3. AI returns Chinese output  
4. `language = "Chinese"` → PDF uses Chinese font ✓  
5. Word: isRTL for Chinese → false (correct) ✓  
**Result:** ✅ Pass

### TRANS-32: Translate file with tab-separated values
**Input:** TXT file with tab-separated data  
**Trace:**  
1. `readAsStringAsync` → text with tabs  
2. AI receives tabular data, translates content cells  
3. Output structured as sections  
**Result:** ✅ Pass

### TRANS-33: Translation processing — step display
**Input:** Normal translation flow  
**Trace:**  
1. STEPS_KEYS = ['trans_processing_step_0', ..., 'trans_processing_step_3']  
2. Each step renders with dot indicators (gray/green/blue)  
3. Current step highlighted, previous steps marked green  
4. Progress bar: 10→25→35→40→85→100  
**Result:** ✅ Pass

### TRANS-34: File name in result topic
**Input:** fileName="quarterly_report.docx", target="French"  
**Trace:**  
1. `topic = "quarterly_report.docx → French"`  
2. `sanitizeTopic("quarterly_report.docx → French")` → arrow char stripped → "quarterly_reportdocx  french" → underscores → "quarterly_reportdocx__french" → substring(0,40) → OK  
3. Files named with sanitized topic  
**Result:** ✅ Pass

### TRANS-35: Translate then edit — add new section
**Input:** After translation → Editor → user adds new section  
**Trace:**  
1. `addSection()` creates new section with i18n default text  
2. New slide added at matching index  
3. `sections.length` increases  
4. On generate: new section included in all formats  
**Result:** ✅ Pass

### TRANS-36: Translate then edit — delete all but one section
**Input:** Translation returns 4 sections → user deletes 3  
**Trace:**  
1. `removeSection` checks `sections.length <= 1` → blocks last deletion ✓  
2. User can delete down to 1 section  
3. Generation works with 1 section  
**Result:** ✅ Pass

### TRANS-37: Translate then edit — AI improve section
**Input:** In Editor, user taps AI improve on section 0  
**Trace:**  
1. `handleAIAction(0, 'improve')` → `aiEditSection('improve', section, language, title)`  
2. `canMakeRequest()` checked → OK  
3. API call with section content + improvement instructions  
4. Result: updated heading, paragraph, bullets  
5. `setSections` updated at index 0  
6. `setSlides` updated at index 0 (synced)  
7. `recordTokenUsage` tracks tokens  
**Result:** ✅ Pass

### TRANS-38: Translate then edit — AI expand section
**Input:** AI expand on short section  
**Trace:** Similar to TRANS-37. Expand instruction says "Make paragraph at least 2x longer. Add 2-3 more bullet points."  
AI returns expanded content → section updated.  
**Result:** ✅ Pass

### TRANS-39: Translate then edit — AI shorten section
**Input:** AI shorten on long section  
**Trace:** Shorten instruction: "Reduce paragraph to 2-3 sentences max. Keep only top 3 bullet points."  
AI returns condensed content → section updated.  
**Result:** ✅ Pass

### TRANS-40: Translate then edit — AI regenerate section
**Input:** AI regenerate section  
**Trace:**  
1. `temperature: 0.9` (higher for regenerate vs 0.6 for others)  
2. AI completely rewrites section  
3. Updated in both sections and slides states  
**Result:** ✅ Pass

### TRANS-41: AI section edit — parsing failure
**Input:** AI returns non-JSON for section edit  
**Trace:**  
1. `aiEditSection` → API returns plain text  
2. `JSON.parse(cleaned)` → throws SyntaxError  
3. Error propagates to `handleAIAction` catch:  
   `Alert.alert(t('alert_ai_error_title'), msg)`  
4. Section unchanged  
**Result:** ✅ Pass

### TRANS-42: AI section edit — empty/missing fields
**Input:** AI returns `{"heading": "", "paragraph": "...", "bullets": []}`  
**Trace:**  
1. `parsed.heading` = "" → `parsed.heading || section.heading` → falls back to original heading  
2. `parsed.bullets` = [] → `Array.isArray([]) && [].length > 0` → false → falls back to original bullets  
3. Only paragraph updated  
**Result:** ✅ Pass

### TRANS-43: DOCX with rich formatting (tables, shapes)
**Input:** DOCX containing tables  
**Trace:**  
1. `parseDocx` → `stripXml` removes all XML tags  
2. Table cell content extracted as text (structure lost)  
3. AI receives flattened text without table structure  
4. Translation may lose table context  
**Result:** ⚠️ Minor — table structure lost during parsing (inherent limitation)

### TRANS-44: XLSX with merged cells
**Input:** XLSX with merged cells in data  
**Trace:**  
1. `parseXlsx` → `<c>` cells extracted from `<row>` elements  
2. Merged cells: only first cell has `<v>` value, others empty  
3. Not all cells extracted for merged ranges  
4. Some data may be missing in parsed text  
**Result:** ⚠️ Minor — merged cell data partially lost (inherent limitation)

### TRANS-45: Default language selection
**Input:** Device locale is 'de' (German)  
**Trace:**  
1. `detectDeviceLanguage()` → finds German in SUPPORTED_LANGUAGES  
2. `sourceLanguage` = German  
3. `targetLanguage` = first language that's not German  
4. `SUPPORTED_LANGUAGES.find(l => l.code !== 'de')` → English (likely first in list)  
5. Default: German → English  
**Result:** ✅ Pass

### TRANS-46: Language with unsupported device locale
**Input:** Device locale is 'sw' (Swahili) — not in SUPPORTED_LANGUAGES  
**Trace:**  
1. `detectDeviceLanguage()` → no match → falls back to English  
2. `sourceLanguage` = English  
**Result:** ✅ Pass

### TRANS-47: Translate result → download → SAF on Android
**Input:** Generated files → user taps Download  
**Trace:**  
1. ResultScreen: `handleDownload(file)`  
2. `FileSystem.getInfoAsync(file.path)` → exists ✓  
3. `StorageAccessFramework.requestDirectoryPermissionsAsync()` → user grants  
4. `readAsStringAsync(file.path, Base64)` → base64 content  
5. `createFileAsync(dirUri, file.name, mimeType)` → creates file in chosen dir  
6. `writeAsStringAsync(newUri, base64, Base64)` → writes file  
7. Success alert  
**Result:** ✅ Pass

### TRANS-48: Download — file not found (deleted from cache)
**Input:** User navigates back, cache cleared, comes back to Result  
**Trace:**  
1. `FileSystem.getInfoAsync(file.path)` → `exists: false`  
2. `Alert.alert(t('alert_error'), t('alert_file_not_found'))`  
**Result:** ✅ Pass

### TRANS-49: Share — Sharing not available
**Input:** Device doesn't support sharing  
**Trace:**  
1. `Sharing.isAvailableAsync()` → false  
2. `Alert.alert(t('alert_sharing_not_available_title'), ...)`  
**Result:** ✅ Pass

### TRANS-50: Translate long DOCX and generate all formats
**Input:** 14000 char DOCX, English → Korean  
**Trace:**  
1. Content not truncated (14000 < 15000) ✓  
2. `translateDocument(content, "English", "Korean", ...)` → large prompt ~16K tokens  
3. API `max_tokens: 2048` for response → may be insufficient for 14K char translation  
4. AI returns truncated response with fewer sections than original  
5. `parseAIResponse` validates basic structure → passes  
6. Editor shows partial translation  
7. PDF: `langNameToCode["korean"]` = 'ko' → Korean font loaded ✓  
8. All formats generated  
**Result:** ⚠️ AI response may be truncated (max_tokens is 2048 for output), losing content

---

## COMPREHENSIVE BUG FIX PLAN

### Fix 1: PDF langNameToCode — Add missing 6 languages
**File:** `src/generators/pdfGenerator.ts`  
**Action:** Add `thai: 'th', bengali: 'bn', hebrew: 'he', greek: 'el', vietnamese: 'vi', ukrainian: 'uk'` to `langNameToCode`  
**Impact:** Fixes PDFs for Thai, Bengali, Hebrew, Greek, Vietnamese, Ukrainian  

### Fix 2: sections.indexOf always returns -1
**File:** `src/screens/EditorScreen.tsx`  
**Action:** Track original index through filter/map chain  
**Impact:** PPT generation uses actual slide state  

### Fix 3: PDF section headings — wrap instead of truncate
**File:** `src/generators/pdfGenerator.ts`  
**Action:** Use `wrapText()` for headings like paragraphs  
**Impact:** Long headings fully visible  

### Fix 4: PDF title page overflow
**File:** `src/generators/pdfGenerator.ts`  
**Action:** Clamp titleY to MAX(titleY, MARGIN)  
**Impact:** Very long titles stay within page bounds  

### Fix 5: Empty validSections validation
**File:** `src/screens/EditorScreen.tsx`  
**Action:** Check if validSections is empty, show Alert before generation  
**Impact:** Prevents generating empty documents  

### Fix 6: PPT RTL alignment
**File:** `src/generators/pptGenerator.ts`  
**Action:** Use `isRTL ? 'right' : 'left'` for title slide text  
**Impact:** Arabic/Hebrew PPT titles properly aligned  

### Fix 7: fontCacheService base64 padding
**File:** `src/services/fontCacheService.ts`  
**Action:** Fix `bitsCount` calculation in inline encoder  
**Impact:** Correct base64 encoding for cached fonts  

### Fix 8: Truncation warning for Summarize/Translate
**File:** `src/screens/SummarizeProcessingScreen.tsx` + `TranslateProcessingScreen.tsx`  
**Action:** Check `parsed.wasTruncated` and show Alert with option to continue  
**Impact:** Users informed when large files are truncated  
